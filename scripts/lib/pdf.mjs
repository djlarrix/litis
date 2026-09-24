/**
 * Extraccion de texto de un PDF, PAGINA POR PAGINA.
 *
 * La pagina es lo que hace comprobable una afirmacion sobre el expediente.
 * "La demandada reconocio la deuda" no se puede verificar; "la demandada
 * reconocio la deuda (contestacion, p. 34)" se comprueba en diez segundos.
 * Por eso nunca se aplana el expediente a un texto corrido: cada fragmento
 * viaja con el numero de pagina del que salio.
 *
 * Se usa pdfjs-dist, que es JavaScript puro. Un expediente se revisa en el
 * computador del estudio, no en un servidor, y ahi no hay compilador ni
 * Homebrew: cualquier dependencia nativa convierte la instalacion en una tarde
 * perdida.
 */
import { readFileSync } from 'node:fs';

/** pdfjs escribe avisos por consola que ensucian la salida del comando. */
function silenciar() {
  const original = { log: console.log, warn: console.warn, error: console.error };
  console.log = () => {};
  console.warn = () => {};
  console.error = () => {};
  return () => Object.assign(console, original);
}

let pdfjs;
async function cargar() {
  if (pdfjs) return pdfjs;
  const restaurar = silenciar();
  try {
    pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  } finally {
    restaurar();
  }
  return pdfjs;
}

/**
 * Un caracter acentuado suelto, emitido aparte del resto de su palabra.
 *
 * Los PDF del Poder Judicial lo hacen constantemente: la palabra se dibuja con
 * un hueco donde va la tilde ("Mero tr mite") y la tilde se dibuja despues,
 * como un item propio, encima de ese hueco. Concatenar los items en el orden en
 * que vienen produce "Mero tr mite a" con la tilde al final de la linea, y con
 * eso la busqueda de "tramite" no encuentra nada.
 */
const ACENTO_SUELTO = /^[\u00e1\u00e9\u00ed\u00f3\u00fa\u00c1\u00c9\u00cd\u00d3\u00da\u00f1\u00d1\u00fc\u00dc\u00e0\u00e8\u00ec\u00f2\u00f9\u00e4\u00eb\u00ef\u00f6]$/;

/**
 * Anchos relativos aproximados por caracter, para fuentes proporcionales.
 *
 * Repartir el ancho del fragmento en partes iguales erraba el hueco por cuatro
 * o cinco caracteres en las lineas largas, y el acento terminaba en la palabra
 * de al lado o se descartaba. No hace falta la metrica real de la fuente: basta
 * distinguir una "i" de una "m" para que la estimacion caiga donde debe.
 */
function anchoDe(c) {
  if (/[iljt.,;:'|!\[\]()]/.test(c)) return 0.42;
  if (/[fr ]/.test(c)) return 0.55;
  if (/[mwMW]/.test(c)) return 1.45;
  if (/[A-Z0-9\u00c1\u00c9\u00cd\u00d3\u00da]/.test(c)) return 1.15;
  return 0.95;
}

/**
 * Devuelve el texto con el acento metido en su hueco, o null si no se encontro
 * uno plausible.
 *
 * Se estima donde cae la tilde recorriendo el fragmento con los anchos de
 * arriba, y solo se acepta un hueco con letras a ambos lados: una tilde cae
 * DENTRO de una palabra o al final de ella, nunca en un sitio donde separe dos.
 * Si la estimacion no cae cerca de un hueco asi, se devuelve null y el acento
 * se queda donde estaba: perder una tilde es un defecto, meterla en la palabra
 * equivocada es un dato falso, y este texto se usa para citar.
 */
function meterAcento(texto, x0, ancho, xAcento, acento) {
  if (!ancho || ancho <= 0 || texto.length < 2) return null;
  const esLetra = (c) => /\p{L}/u.test(c || '');

  // Posicion relativa (0..1) del comienzo de cada caracter.
  const pesos = [...texto].map(anchoDe);
  const total = pesos.reduce((a, b) => a + b, 0);
  const objetivo = (xAcento - x0) / ancho;

  let acumulado = 0;
  let mejor = -1;
  let distancia = Infinity;
  for (let i = 0; i < texto.length; i++) {
    const centro = (acumulado + pesos[i] / 2) / total;
    acumulado += pesos[i];
    if (texto[i] !== ' ') continue;
    if (i === 0 || i === texto.length - 1) continue;
    if (!esLetra(texto[i - 1]) || !esLetra(texto[i + 1])) continue;
    const d = Math.abs(centro - objetivo);
    if (d < distancia) {
      distancia = d;
      mejor = i;
    }
  }
  // Tolerancia: el equivalente a dos caracteres medios del fragmento.
  if (mejor < 0 || distancia > (2 / texto.length)) return null;
  return texto.slice(0, mejor) + acento + texto.slice(mejor + 1);
}

/**
 * Une los fragmentos de una pagina.
 *
 * pdfjs devuelve trozos sueltos con sus coordenadas, y CUANTO mide cada trozo
 * depende del PDF: en las resoluciones viene una linea entera por trozo, y en
 * los escritos de parte vienen de a una o dos letras. Decidir el separador por
 * el texto —"si no termina en espacio, pongo uno"— funciona en el primer caso y
 * destroza el segundo: la demanda salia como "D e m and a e je c u t i v a", que
 * no se puede leer ni buscar.
 *
 * Asi que el separador se decide por geometria: si entre el final de un trozo y
 * el comienzo del siguiente no hay hueco, van pegados; si lo hay, va un espacio.
 * El umbral se mide contra el alto de la fuente para que sirva igual en un
 * encabezado de catorce puntos que en una nota al pie.
 */
function unir(items) {
  /** @type {Array<{texto:string,x:number,y:number,ancho:number,alto:number,eol:boolean}>} */
  const trozos = [];
  for (const it of items) {
    if (typeof it.str !== 'string') continue;
    const x = it.transform?.[4] ?? 0;
    const y = it.transform?.[5] ?? 0;

    if (ACENTO_SUELTO.test(it.str)) {
      // Se busca hacia atras, dentro de la misma linea, el fragmento sobre el
      // que cae la tilde. Los acentos de una linea pueden venir todos juntos al
      // final, muy lejos de sus palabras, asi que se recorre la linea entera; y
      // un fragmento que contenga la x pero no sirva (un espacio ancho, que se
      // solapa con media linea) no interrumpe la busqueda: se sigue atras.
      let metido = false;
      for (let k = trozos.length - 1; k >= 0; k--) {
        const t = trozos[k];
        if (Math.abs(t.y - y) > 2) break;
        if (x < t.x || x > t.x + t.ancho) continue;
        const arreglado = meterAcento(t.texto, t.x, t.ancho, x, it.str);
        if (arreglado) {
          t.texto = arreglado;
          metido = true;
          break;
        }
      }
      if (metido) continue;
    }

    trozos.push({ texto: it.str, x, y, ancho: it.width ?? 0, alto: it.height ?? 0, eol: !!it.hasEOL });
  }

  let texto = '';
  let anterior = null;
  let saltoPendiente = false;
  for (const t of trozos) {
    // Los trozos vacios solo traen el fin de linea; no mueven la posicion.
    if (t.texto === '') {
      if (t.eol) saltoPendiente = true;
      continue;
    }
    if (anterior) {
      if (saltoPendiente || anterior.eol || Math.abs(t.y - anterior.y) > 2) {
        texto += '\n';
      } else {
        const hueco = t.x - (anterior.x + anterior.ancho);
        const alto = t.alto || anterior.alto || 10;
        const yaSeparado = /\s$/.test(texto) || /^\s/.test(t.texto);
        if (!yaSeparado && hueco > alto * 0.18) texto += ' ';
      }
    }
    saltoPendiente = false;
    texto += t.texto;
    anterior = t;
  }

  return texto
    .replace(/[ \t]+/g, ' ')
    // Palabras cortadas con guion al final de la linea: "responsabi-\nlidad".
    .replace(/(\p{L})-\n(\p{Ll})/gu, '$1$2')
    .replace(/\n{3,}/g, '\n\n')
    .split('\n')
    .map((l) => l.trim())
    .join('\n')
    .trim();
}

/**
 * Extrae el texto de todas las paginas.
 *
 * @param {string} ruta archivo PDF
 * @param {(hechas:number, total:number)=>void} [avisar] progreso; un cuaderno
 *   de mil paginas tarda minutos y sin senal de vida parece colgado
 * @returns {Promise<{paginas: string[], metadatos: object}>}
 */
export async function leerPdf(ruta, avisar) {
  const lib = await cargar();
  const restaurar = silenciar();
  let doc;
  try {
    doc = await lib.getDocument({
      data: new Uint8Array(readFileSync(ruta)),
      useSystemFonts: true,
      // Un expediente llega por correo desde el otro lado. No se ejecuta nada
      // que venga dentro del archivo.
      isEvalSupported: false,
    }).promise;
  } finally {
    restaurar();
  }

  const paginas = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const restaurar2 = silenciar();
    try {
      const pagina = await doc.getPage(i);
      const contenido = await pagina.getTextContent();
      paginas.push(unir(contenido.items));
      pagina.cleanup();
    } catch (e) {
      // Una pagina corrupta no puede tumbar el indexado de las otras 900.
      paginas.push('');
    } finally {
      restaurar2();
    }
    if (avisar && (i % 25 === 0 || i === doc.numPages)) avisar(i, doc.numPages);
  }

  let metadatos = {};
  try {
    const m = await doc.getMetadata();
    metadatos = { titulo: m?.info?.Title || null, creador: m?.info?.Creator || null };
  } catch {
    // Sin metadatos se sigue igual.
  }

  await doc.destroy();
  return { paginas, metadatos };
}

/**
 * Si una pagina es imagen sin capa de texto.
 *
 * Es el defecto mas comun y el mas peligroso de un expediente: los documentos
 * acompanados suelen ir escaneados, y un escaneo sin OCR es texto vacio. Quien
 * no lo advierte concluye que "no hay prueba del pago" cuando el comprobante
 * estaba en la pagina 412, invisible para la busqueda.
 *
 * No se mide por largo sino por letras, descontando lo que el sistema estampa
 * encima de la imagen ("pagina 261", el folio, un numero suelto). Medir por
 * largo confundia una resolucion de una linea —"Tengase presente."— con una
 * imagen, y la sacaba del analisis.
 */
export function esEscaneada(texto) {
  const util = (texto || '')
    .split('\n')
    .filter((l) => !/^\s*(p[a\u00e1]?gina\s+\d+|\d{1,4}|foja\s*:?.*)\s*$/i.test(l))
    .join(' ');
  return (util.match(/\p{L}/gu) || []).length < 25;
}

/**
 * Si una pagina tiene capa de texto, pero es basura.
 *
 * Pasa con los PDF que usan fuentes sin mapa de caracteres: el extractor
 * devuelve los codigos internos de los glifos, que salen como caracteres de
 * control. La pagina "tiene texto" y por eso ningun contador la marca, pero no
 * se puede leer ni buscar: es tan invisible como un escaneo, y mas traicionera,
 * porque parece que se reviso.
 *
 * Se distingue con dos medidas juntas. Casi nada de la pagina son palabras
 * —las legibles rondan entre la mitad y el ochenta y cinco por ciento; estas,
 * menos del tres— y hay caracteres de control. Lo segundo es lo que evita
 * confundirlas con una tabla de numeros, como una liquidacion de credito, que
 * tambien tiene pocas palabras pero ningun caracter de control.
 */
export function esIlegible(texto) {
  const s = (texto || '').replace(/p[a\u00e1]?gina\s+\d+/gi, '');
  const util = s.replace(/\s/g, '');
  if (util.length < 40) return false;
  const control = (util.match(/[\u0000-\u001f\ufffd]/g) || []).length;
  if (control / util.length < 0.03) return false;
  const palabras = s
    .split(/\s+/)
    .filter((w) => /^[A-Za-z\u00c0-\u017f]{3,}[.,;:]?$/.test(w) && /[aeiou\u00e1\u00e9\u00ed\u00f3\u00fa]/i.test(w));
  return palabras.join('').length / util.length < 0.2;
}

export function paginasIlegibles(paginas) {
  const salida = [];
  paginas.forEach((t, i) => {
    if (esIlegible(t)) salida.push(i + 1);
  });
  return salida;
}

export function paginasSinTexto(paginas) {
  const sueltas = [];
  paginas.forEach((t, i) => {
    if (esEscaneada(t)) sueltas.push(i + 1);
  });
  return sueltas;
}

/** Agrupa una lista de paginas en rangos legibles: [3,4,5,9] -> "3-5, 9". */
export function rangos(numeros) {
  if (!numeros.length) return '';
  const partes = [];
  let desde = numeros[0];
  let previo = numeros[0];
  for (const n of numeros.slice(1)) {
    if (n === previo + 1) { previo = n; continue; }
    partes.push(desde === previo ? `${desde}` : `${desde}-${previo}`);
    desde = previo = n;
  }
  partes.push(desde === previo ? `${desde}` : `${desde}-${previo}`);
  return partes.join(', ');
}

// Para las pruebas: se ejercitan con fragmentos armados a mano, sin PDF.
export { unir as _unir, meterAcento as _meterAcento };
