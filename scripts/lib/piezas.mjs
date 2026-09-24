/**
 * Convierte un monton de paginas en un expediente con forma: piezas, fechas,
 * partes e hitos.
 *
 * Es el modulo que decide donde termina un escrito y empieza el siguiente. Se
 * equivoca a veces, y por eso cada pieza declara con que senales se abrio y con
 * cuanto puntaje: una pieza que entro con lo justo hay que mirarla antes de
 * fiarse de ella. Un detector que no confiesa sus dudas es peor que uno malo.
 */
import { plano, INICIOS, CIERRES, TIPOS, HITOS, UMBRAL, LINEAS_ENCABEZADO } from './patrones.mjs';
import { esEscaneada, esIlegible } from './pdf.mjs';

/* ─────────────────────────── Fechas ─────────────────────────── */

const MESES = {
  enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6,
  julio: 7, agosto: 8, septiembre: 9, setiembre: 9, octubre: 10,
  noviembre: 11, diciembre: 12,
};

// Las resoluciones se fechan con letras: "Santiago, trece de agosto de dos mil
// veinticinco". Sin esto la cronologia se queda solo con los escritos, que son
// los que traen la fecha en numeros, y el expediente pierde justo el esqueleto.
const UNIDADES = {
  uno: 1, primero: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7,
  ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12, trece: 13, catorce: 14,
  quince: 15, dieciseis: 16, diecisiete: 17, dieciocho: 18, diecinueve: 19,
  veinte: 20, veintiuno: 21, veintidos: 22, veintitres: 23, veinticuatro: 24,
  veinticinco: 25, veintiseis: 26, veintisiete: 27, veintiocho: 28,
  veintinueve: 29, treinta: 30,
};

function diaEnPalabras(txt) {
  const t = txt.trim();
  if (UNIDADES[t] !== undefined) return UNIDADES[t];
  const m = t.match(/^treinta\s+y\s+uno$/);
  return m ? 31 : null;
}

function anioEnPalabras(txt) {
  const t = txt.trim();
  const m = t.match(/^dos\s+mil(?:\s+(.+))?$/);
  if (!m) return null;
  if (!m[1]) return 2000;
  const resto = m[1].trim();
  if (UNIDADES[resto] !== undefined) return 2000 + UNIDADES[resto];
  const compuesto = resto.match(/^(treinta|cuarenta|cincuenta)(?:\s+y\s+(\w+))?$/);
  if (compuesto) {
    const decenas = { treinta: 30, cuarenta: 40, cincuenta: 50 }[compuesto[1]];
    return 2000 + decenas + (compuesto[2] ? UNIDADES[compuesto[2]] || 0 : 0);
  }
  return null;
}

const iso = (a, m, d) =>
  `${a}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

/**
 * Todas las fechas de un texto, en ISO y en orden de aparicion.
 * @returns {Array<{fecha: string, como: string}>}
 */
export function fechasDe(texto) {
  const t = plano(texto);
  const salida = [];
  const visto = new Set();
  const anotar = (f, como) => {
    if (!f || visto.has(f + como)) return;
    visto.add(f + como);
    salida.push({ fecha: f, como });
  };

  for (const m of t.matchAll(/\b(\d{1,2})\s+de\s+([a-z]+)\s+de\s+(\d{4})\b/g)) {
    const mes = MESES[m[2]];
    if (mes) anotar(iso(+m[3], mes, +m[1]), m[0]);
  }
  for (const m of t.matchAll(/\b([a-z]+(?:\s+y\s+\w+)?)\s+de\s+([a-z]+)\s+de\s+(dos\s+mil(?:\s+\w+(?:\s+y\s+\w+)?)?)\b/g)) {
    const dia = diaEnPalabras(m[1]);
    const mes = MESES[m[2]];
    const anio = anioEnPalabras(m[3]);
    if (dia && mes && anio) anotar(iso(anio, mes, dia), m[0]);
  }
  for (const m of t.matchAll(/\b(\d{1,2})[/-](\d{1,2})[/-](\d{4})\b/g)) {
    const d = +m[1], mes = +m[2];
    if (d >= 1 && d <= 31 && mes >= 1 && mes <= 12) anotar(iso(+m[3], mes, d), m[0]);
  }
  return salida;
}

/* ─────────────────────────── Segmentacion ─────────────────────────── */

/**
 * La fecha PROPIA de la pieza, distinta de las fechas que la pieza menciona.
 *
 * Es la correccion que mas cambia el resultado. Tomar la primera fecha que
 * aparece en la primera pagina parece razonable y es falso: la demanda empieza
 * contando cuando se celebro el contrato, y la pieza quedaba fechada dos anios
 * antes de existir. Una cronologia asi no se nota que esta mal, y con ella se
 * calculan plazos.
 *
 * Aqui solo se acepta la fecha que ESTA PIEZA lleva como suya:
 *   - la del encabezado de una resolucion ("Santiago, trece de agosto de...");
 *   - la del timbre de ingreso, cuando el sistema lo estampa.
 *
 * Un escrito de parte normalmente no trae fecha propia en el texto: la de
 * presentacion la pone el tribunal al ingresarlo. En ese caso esto devuelve
 * null, que es la respuesta correcta, y la fecha se busca en el indice de
 * folios o en la resolucion que lo provee.
 */
function fechaPropia(pagina) {
  const lineas = (pagina || '').split('\n').slice(0, LINEAS_ENCABEZADO);
  for (const linea of lineas) {
    const t = plano(linea);
    const timbre = t.match(/\bingres\w*\s*:?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/);
    if (timbre) {
      const f = fechasDe(timbre[1])[0];
      if (f) return { fecha: f.fecha, origen: 'timbre de ingreso' };
    }
    // Ciudad y fecha al comienzo de la linea: el encabezamiento de toda resolucion.
    if (/^[a-z\u00f1 ]{4,22},\s+/.test(t) && /\bde\s+(dos\s+mil|\d{4})/.test(t)) {
      const f = fechasDe(linea)[0];
      if (f) return { fecha: f.fecha, origen: 'encabezado de resolucion' };
    }
  }
  return null;
}


const encabezadoDe = (texto) =>
  (texto || '').split('\n').slice(0, LINEAS_ENCABEZADO).join('\n');


/**
 * El numero de pagina IMPRESO por el propio documento, si lo trae.
 *
 * Un escrito de parte se pagina a si mismo: la contestacion empieza en su
 * pagina 1 aunque vaya en la 262 del expediente. Esa numeracion es el mejor
 * indicio que hay en un expediente sin indice, y sirve en las dos direcciones:
 *
 *   - **Vuelve a 1** -> empieza un documento nuevo.
 *   - **Sigue la cuenta** (5, 6, 7...) -> es LA MISMA pieza, aunque la pagina
 *     traiga formulas que parecen de encabezado. Sin esto, un escrito de
 *     cincuenta paginas se troceaba cada vez que un parrafo citaba "en lo
 *     principal" o transcribia una resolucion.
 *
 * Se lee del borde, arriba o abajo, y se descartan los numeros de cuatro
 * cifras: son anios, no paginas.
 *
 * Solo cuenta el numero SUELTO. El "pagina 261" que el CAM estampa en cada
 * hoja es la numeracion del expediente, no la del documento: corre seguida de
 * un documento al siguiente, y tomarla por paginacion propia pegaba escritos
 * distintos como si fueran uno.
 */
export function numerosImpresos(paginas) {
  return paginas.map((texto) => {
    const lineas = (texto || '').split('\n').map((l) => l.trim()).filter(Boolean);
    if (!lineas.length) return { borde: null, cerca: [] };
    const suelto = (l) => (l && /^\d{1,3}$/.test(l) ? Number(l) : null);
    const n = lineas.length;
    // El numero en la primera o la ultima linea es la paginacion con bastante
    // seguridad. En la segunda o la penultima puede serlo —cuando hay una nota
    // al pie o un encabezado que se extrae antes— pero tambien puede ser una
    // llamada de nota. Por eso esos solo sirven para confirmar continuidad,
    // nunca para declarar que un documento empieza.
    const borde = suelto(lineas[0]) ?? suelto(lineas[n - 1]);
    const cerca = [lineas[0], lineas[1], lineas[n - 2], lineas[n - 1]].map(suelto).filter((x) => x !== null);
    return { borde, cerca };
  });
}

function puntuar(pagina, previa, numeros = {}) {
  const cab = plano(encabezadoDe(pagina));
  const todo = plano(pagina);
  let puntaje = 0;
  const senales = [];

  // La numeracion propia del documento manda sobre cualquier formula. Un
  // escrito que va en su pagina 56 no empieza en la 56, por mucho que un
  // parrafo diga "segun se expuso en lo principal" o cite a "S.J.A.": restarle
  // puntos no bastaba, porque la cita y el tratamiento juntos sumaban mas que
  // el descuento y el escrito se partia igual. Es un veto.
  const { actual, anterior } = numeros;
  if (actual && anterior && actual.cerca.some((n) => anterior.cerca.includes(n - 1))) {
    return { puntaje: -Infinity, senales: ['sigue la paginacion propia'] };
  }
  // Vuelve a 1: empieza un documento nuevo. Solo se cree al numero del borde,
  // no a uno de la segunda linea, que puede ser una llamada de nota.
  const antes = anterior?.borde;
  if (actual?.borde === 1 && (antes === null || antes === undefined || antes > 1)) {
    puntaje += 8;
    senales.push('su paginacion vuelve a 1');
  }
  for (const p of INICIOS) {
    const donde = p.ambito === 'pagina' ? todo : cab;
    if (p.re.test(donde)) {
      puntaje += p.peso;
      senales.push(p.id);
    }
  }
  // Si la pagina anterior cerro, esta empieza algo aunque su encabezado sea
  // pobre: un documento que termina no continua en la pagina siguiente.
  if (previa) {
    const antes = plano(previa);
    for (const c of CIERRES) {
      if (c.re.test(antes)) {
        puntaje += 4;
        senales.push(`tras:${c.id}`);
        break;
      }
    }
  }
  return { puntaje, senales };
}

/**
 * Los verbos con que abre la suma de un escrito de parte. Si la primera linea
 * empieza asi, es un escrito aunque no calce con ningun tipo mas preciso.
 */
const ESCRITO = /^(solicita|acompana|cumple|tengase|se\s+tenga|delega|asume|reitera|interpone|deduce|evacua|formula|objeta|observa|repone|reposicion|apela|informa|da\s+cuenta|hace\s+presente|pide|propone|renuncia|designa|ratifica|rectifica|complementa|responde)/;

function clasificar(texto) {
  const t = plano(texto).slice(0, 4000);
  // Una pieza que abre con ciudad y fecha es una resolucion del tribunal. Hay
  // que decidirlo antes de recorrer los tipos, porque una resolucion que
  // provee una demanda contiene la palabra "demanda" y se clasificaba como
  // tal: el analisis la buscaba entre los escritos de la parte y no la
  // encontraba entre las resoluciones.
  const cabeza = t.split('\n').slice(0, 3).join('\n');

  // Un documento notarial acompanado tambien abre con lugar y fecha, pero no
  // es una resolucion: es prueba, y va con la prueba.
  if (/\bnotari[oa]\b|\brepertorio\b|\bcertifico que el presente documento\b/.test(t.split('\n').slice(0, 5).join('\n'))) {
    return 'documento notarial';
  }

  // Lo que va despues de "En lo principal:" ES el objeto del escrito, dicho
  // por quien lo presenta. Clasificar por ahi antes que por el cuerpo evita
  // que una contestacion que menciona las "bases de procedimiento" pase por
  // acta de mision.
  // Si no hay "en lo principal", la primera linea suele ser la suma del
  // escrito ("Evacua traslado", "Reposicion", "Delega poder"). Sin mirarla, un
  // escrito que transcribe la resolucion que impugna se clasificaba como la
  // resolucion misma.
  const objeto =
    t.slice(0, 1500).match(/\ben\s+lo\s+principal\s*:?\s*([^;\n]{3,160})/)?.[1] ||
    t.split('\n').find((l) => l.trim().length > 3)?.trim();
  if (objeto) {
    for (const { tipo, re } of TIPOS) if (tipo !== 'resolucion' && tipo !== 'sentencia' && re.test(objeto)) return tipo;
    if (ESCRITO.test(objeto)) return 'escrito';
  }

  if (/^(en\s+)?[a-z\u00f1 ]{4,26},\s+(a\s+)?([a-z\u00f1]+|\d{1,2})\s+de\s+[a-z]+\s+de\s+(dos\s+mil|\d{4})/m.test(cabeza)) {
    if (/\blaudo\b/.test(t.slice(0, 1500))) return 'laudo';
    // "Vistos" y "considerando" no hacen sentencia: el arbitro los usa para
    // resolver una reposicion en cuatro paginas. Se exige que lo diga, o que
    // tenga el largo de una sentencia de verdad; si no, es una resolucion
    // fundada, y confundirlas hace creer que el asunto ya se fallo.
    if (/\bsentencia\s+definitiva\b/.test(t.slice(0, 3000))) return 'sentencia';
    if (/^\s*vistos\s*[:;.]?\s*$[\s\S]*\bconsiderando\b/m.test(texto) && texto.length > 30000) return 'sentencia';
    return 'resolucion';
  }
  for (const { tipo, re } of TIPOS) if (re.test(t)) return tipo;
  return 'sin clasificar';
}

export function hitosDe(texto) {
  const t = plano(texto);
  return HITOS.filter((h) => h.re.test(t)).map((h) => h.hito);
}

/** La primera linea que parece un titulo y no un timbre ni un numero suelto. */
function titularDe(texto) {
  const lineas = (texto || '').split('\n').map((l) => l.trim()).filter(Boolean);
  for (const l of lineas.slice(0, LINEAS_ENCABEZADO)) {
    const p = plano(l);
    if (l.length < 8) continue;
    if (/^\d+$/.test(l)) continue;
    if (/^(foja|folio|pagina|fecha|rol|causa|hoja)\s*[:°º]/.test(p)) continue;
    if (/verificadoc|firma electronica|codigo de verificacion/.test(p)) continue;
    return l.length > 110 ? l.slice(0, 107) + '…' : l;
  }
  return lineas[0] || '(sin encabezado legible)';
}

/**
 * Quien presenta la pieza, cuando el propio texto lo dice.
 *
 * Devuelve null antes que adivinar. Atribuir un escrito a la parte equivocada
 * da vuelta el analisis entero, y es un error que despues nadie revisa porque
 * el informe se lee como si estuviera comprobado.
 */
function parteDe(texto) {
  const t = plano(texto).slice(0, 2500);
  const marcas = [
    [/\bpor\s+(la\s+parte\s+)?demandante\b|\ben\s+representacion\s+de\s+la\s+demandante\b/, 'demandante'],
    [/\bpor\s+(la\s+parte\s+)?demandad[ao]\b|\ben\s+representacion\s+de\s+la\s+demandada\b/, 'demandada'],
    [/\bejecutante\b/, 'ejecutante'],
    [/\bejecutad[ao]\b/, 'ejecutada'],
    [/\bpor\s+la\s+parte\s+querellante\b|\bquerellante\b/, 'querellante'],
    [/\bdenunciante\b/, 'denunciante'],
  ];
  const hallados = marcas.filter(([re]) => re.test(t)).map(([, etiqueta]) => etiqueta);
  // Dos etiquetas en el mismo encabezado significa que el escrito nombra a
  // ambas partes, no que sepamos cual lo presenta.
  return hallados.length === 1 ? hallados[0] : null;
}

/**
 * Parte el expediente en piezas.
 *
 * @param {string[]} paginas
 * @returns {Array<object>} piezas con sus paginas, tipo, fecha, parte e hitos
 */
export function segmentar(paginas) {
  const numeros = numerosImpresos(paginas);
  // Una pagina sin capa de texto es un documento escaneado, y un escaneado
  // nunca es la continuacion del escrito que lo acompana: donde empieza y
  // donde termina un bloque de esas paginas hay siempre un corte.
  // Imagen sin OCR o capa de texto basura: en los dos casos no se puede leer,
  // y en los dos casos es otro documento, no la continuacion del escrito.
  const ilegible = paginas.map(esIlegible);
  const escaneada = paginas.map((t, i) => ilegible[i] || esEscaneada(t));

  const cortes = [0];
  const detalles = new Map([[0, { puntaje: null, senales: ['primera pagina'] }]]);
  for (let i = 1; i < paginas.length; i++) {
    if (escaneada[i] !== escaneada[i - 1]) {
      cortes.push(i);
      detalles.set(i, {
        puntaje: null,
        senales: [escaneada[i] ? 'empieza un documento que no se puede leer' : 'vuelve el texto legible'],
      });
      continue;
    }
    const marca = puntuar(paginas[i], paginas[i - 1], { actual: numeros[i], anterior: numeros[i - 1] });
    if (marca.puntaje >= UMBRAL) {
      cortes.push(i);
      detalles.set(i, marca);
    }
  }

  const piezas = [];
  for (let k = 0; k < cortes.length; k++) {
    const desde = cortes[k];
    const hasta = k + 1 < cortes.length ? cortes[k + 1] - 1 : paginas.length - 1;
    const texto = paginas.slice(desde, hasta + 1).join('\n');
    const detalle = detalles.get(desde);
    const propia = fechaPropia(paginas[desde]);
    const mencionadas = fechasDe(paginas[desde]).map((f) => f.fecha);
    piezas.push({
      n: piezas.length + 1,
      desde: desde + 1,
      hasta: hasta + 1,
      paginas: hasta - desde + 1,
      tipo: ilegible[desde] ? 'texto ilegible' : escaneada[desde] ? 'escaneado' : clasificar(texto),
      titulo: ilegible[desde] ? '(capa de texto ilegible)' : titularDe(paginas[desde]),
      fecha: propia?.fecha || null,
      origenFecha: propia?.origen || null,
      // Las fechas que el texto NOMBRA: el contrato, el pago, el vencimiento.
      // Son material del caso, no la fecha de la pieza. Van aparte a proposito.
      fechasMencionadas: [...new Set(mencionadas)].slice(0, 8),
      parte: parteDe(texto),
      hitos: hitosDe(texto),
      // La confianza es parte del dato: una pieza abierta con lo justo merece
      // una mirada antes de citarla. El umbral para abrirla es 8, asi que
      // "baja" empieza ahi mismo y una sola senal fuerte ya es "media".
      confianza: detalle.puntaje === null ? 'inicio' : detalle.puntaje >= 12 ? 'alta' : detalle.puntaje >= 9 ? 'media' : 'baja',
      senales: detalle.senales,
    });
  }
  return piezas;
}

/* ─────────────────────────── Caratula ─────────────────────────── */

/**
 * Datos de la causa, leidos de las primeras paginas.
 *
 * Solo se devuelve lo que aparece escrito. Un rol inventado manda a comprobar
 * la causa equivocada.
 */
export function caratula(paginas) {
  const cabeza = paginas.slice(0, 12).join('\n');
  const t = plano(cabeza);
  const dato = (re, de = cabeza) => {
    const m = de.match(re);
    return m ? m[1].trim() : null;
  };

  let sede = 'desconocida';
  if (/centro\s+de\s+arbitraje\s+y\s+mediacion|cam\s+santiago|camsantiago/.test(plano(paginas.slice(0, 30).join('\n')))) {
    sede = 'cam';
  } else if (/poder\s+judicial|juzgado|verificadoc|oficina\s+judicial\s+virtual/.test(plano(paginas.slice(0, 30).join('\n')))) {
    sede = 'poder judicial';
  }

  return {
    sede,
    rol: dato(/\b((?:[A-Za-z]-)?\d{1,6}-\d{4})\b/) || dato(/[Rr]ol[^\n]{0,20}?([A-Za-z]?-?\s?\d{1,6}\s?-\s?\d{4})/),
    tribunal: dato(/^([^\n]*(?:JUZGADO|Juzgado|CORTE|Corte|TRIBUNAL ARBITRAL|Tribunal Arbitral)[^\n]*)$/m),
    caratula: dato(/\b(?:caratul\w+|caratula)\s*:?\s*([^\n]{4,80})/i) ||
      dato(/^([^\n]{3,60}\s+(?:con|c\/)\s+[^\n]{3,60})$/m),
    materia: dato(/\bmateria\s*:?\s*([^\n]{4,80})/i),
  };
}

/**
 * El indice de folios que algunos cuadernos traen en las primeras paginas.
 *
 * Cuando esta, es mejor que cualquier deteccion: lo escribio el sistema, no un
 * patron. Se lee tolerante porque la tabla pierde columnas al pasar a texto.
 */
export function indiceDeFolios(paginas) {
  const entradas = [];
  for (let i = 0; i < Math.min(paginas.length, 20); i++) {
    for (const linea of (paginas[i] || '').split('\n')) {
      const m = linea.match(/^\s*(\d{1,4})\s+(.{4,120}?)\s+(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\s*(\d{1,4})?\s*$/);
      if (m) entradas.push({ folio: +m[1], tramite: m[2].trim(), fecha: m[3], foja: m[4] ? +m[4] : null, paginaIndice: i + 1 });
    }
  }
  // Menos de cinco lineas no es una tabla, son coincidencias.
  return entradas.length >= 5 ? entradas : null;
}
