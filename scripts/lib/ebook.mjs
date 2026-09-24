/**
 * El "ebook" del Poder Judicial: leerlo por lo que trae, no adivinarlo.
 *
 * Cuando uno descarga la causa completa desde la Oficina Judicial Virtual, el
 * PDF no es un monton de documentos pegados: es un libro armado por el sistema,
 * con ficha de la causa, tabla de litigantes con el rol procesal de cada uno y
 * una TABLA DE CONTENIDOS que nombra cada pieza con su cuaderno, su tipo, su
 * fecha, su numero de folio y la pagina donde empieza.
 *
 * Ese indice es la fuente de verdad y hay que usarlo. Segmentar por patrones
 * cuando el propio documento trae su indice es adivinar teniendo la respuesta
 * delante: la heuristica de `piezas.mjs` queda para los expedientes que no son
 * ebooks —los del CAM, los armados a mano— y para los ebooks a los que les
 * falte la tabla.
 *
 * Formato de una entrada del indice, tal como sale del PDF:
 *
 *   1.1. Resolucion: Apercibimiento poder y/o titulo - 14/03/2024 (Folio 2) 1
 *   1.1.1. Escrito: Ingreso demanda - 13/03/2024 (Folio 1) 2
 *   1.11. [NULO] Resolucion: Mero tramite - 14/07/2026 (Folio 22) 23
 *
 * El nivel 1 es el cuaderno. El ultimo numero es la pagina DEL EBOOK, que no es
 * la del PDF: hay portada e indice antes. El desfase se lee del pie de pagina.
 * Y el escrito va anidado bajo la resolucion que lo provee, que es justo la
 * relacion que interesa para leer el expediente.
 */
import { plano } from './patrones.mjs';

/** Un ebook se reconoce por su tabla de contenidos y su ficha. */
export function esEbook(paginas) {
  const cabeza = paginas.slice(0, 6).join('\n');
  return /tabla de contenidos/i.test(cabeza) && /\(folio\s+\d+\)/i.test(cabeza);
}

/* ─────────────────────────── La ficha ─────────────────────────── */

/**
 * Los datos de la causa, de la primera pagina.
 *
 * "Etapa" y "Estado Procesal" son los dos que mas cambian un analisis y los que
 * mas se pasan por alto: un expediente "Terminada / Concluido" no admite la
 * misma conversacion que uno en tramitacion.
 */
export function leerFicha(paginas) {
  const p1 = paginas[0] || '';

  // Las etiquetas vienen varias por linea, separadas por un solo espacio:
  //   "Etapa: Terminada Estado Procesal: Concluido"
  // Cortar en el siguiente espacio doble, o en la siguiente palabra con
  // mayuscula, parte los valores por la mitad. Se corta en la siguiente
  // ETIQUETA CONOCIDA, que es lo unico que no falla.
  const ETIQUETAS = [
    'ROL', 'Fecha Ingreso', 'Caratulado', 'Procedimiento', 'Materia',
    'Estado Administrativo', 'Ubicacion', 'Ubicación', 'Cuaderno', 'Etapa',
    'Estado Procesal', 'Fecha Impresion', 'Fecha Impresin', 'Tipo causa',
  ];
  const corte = ETIQUETAS.map((e) => e.replace(/ /g, '\\s+')).join('|');
  const campo = (etiqueta) => {
    const re = new RegExp(`\\b${etiqueta.replace(/ /g, '\\s+')}\\s*:\\s*(.*?)(?=\\s+(?:${corte})\\s*:|\\n|$)`, 'i');
    const m = p1.match(re);
    const v = m ? m[1].trim() : null;
    return v || null;
  };

  const primeraLinea = p1.split('\n')[0]?.trim() || null;
  return {
    tribunal: /juzgado|corte|tribunal/i.test(primeraLinea || '') ? primeraLinea : null,
    rol: campo('ROL'),
    ingreso: campo('Fecha Ingreso'),
    caratula: campo('Caratulado'),
    procedimiento: campo('Procedimiento'),
    materia: campo('Materia'),
    cuaderno: campo('Cuaderno'),
    etapa: campo('Etapa'),
    estadoProcesal: campo('Estado Procesal'),
    estadoAdministrativo: campo('Estado Administrativo'),
  };
}

/**
 * Que significa cada sigla de la tabla de sujetos.
 *
 * Solo se traducen las que se saben. Las demas se dejan tal cual: inventar la
 * traduccion de una sigla convierte a un tercerista en demandado, y con eso el
 * analisis entero apunta a la persona equivocada.
 */
const SUJETOS = {
  'DTE.': 'demandante',
  DTE: 'demandante',
  'DDO.': 'demandado',
  DDO: 'demandado',
  'AB.DTE': 'abogado del demandante',
  'AB.DDO': 'abogado del demandado',
  'AP.DTE': 'apoderado del demandante',
  'AP.DDO': 'apoderado del demandado',
};

/** Quien es quien, con su RUT y su rol procesal, de la tabla de la portada. */
export function leerLitigantes(paginas) {
  const lineas = (paginas[0] || '').split('\n');
  const salida = [];
  for (const cruda of lineas) {
    const linea = cruda.trim();
    const m = linea.match(/^([A-Z]{2,6}(?:\.[A-Z]{1,4})?\.?)\s+(\d{6,9}-[\dkK])\s+(NATURAL|JURIDICA)\s*(.*)$/);
    if (m) {
      salida.push({
        codigo: m[1],
        rol: SUJETOS[m[1]] || SUJETOS[m[1].replace(/\.$/, '')] || null,
        rut: m[2],
        tipo: m[3].toLowerCase(),
        nombre: m[4].trim(),
      });
      continue;
    }
    // El nombre sigue en la linea de abajo cuando no cabe en la columna.
    const ultimo = salida[salida.length - 1];
    if (ultimo && linea && /^[A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s.]{3,}$/.test(linea) && !/^(SUJETO|RUT|PERSONA)/.test(linea)) {
      ultimo.nombre = (ultimo.nombre + ' ' + linea).trim();
    }
  }
  return salida;
}

/* ─────────────────────── La tabla de contenidos ─────────────────────── */

const MES_NUM = (f) => {
  const m = f.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : null;
};

/**
 * Lee el indice completo.
 *
 * Tolerante a proposito: una entrada que no case con el formato se ignora en
 * silencio, pero si se pierden muchas el llamador lo nota porque el numero de
 * piezas no cuadra con las paginas, y entonces cae en la heuristica.
 */
export function leerTablaContenidos(paginas) {
  const entradas = [];
  const cuadernos = [];
  for (let i = 0; i < Math.min(paginas.length, 30); i++) {
    const pagina = paginas[i] || '';
    if (!/tabla de contenidos/i.test(pagina)) continue;
    for (const cruda of pagina.split('\n')) {
      const linea = cruda.trim();

      // La clase va antes de los dos puntos y no siempre es una de las
      // habituales: el ebook tambien etiqueta tramites con su codigo, como
      // "(REQ)Requerimiento de Pago: ...". Sin aceptarlos, esas piezas —que
      // suelen ser las que deciden, como el requerimiento— quedaban con el
      // codigo metido dentro del titulo y sin clase propia.
      const entrada = linea.match(
        /^(\d+(?:\.\d+)*)\.\s+(?:\[(NULO)\]\s*)?(?:(Resoluci[oó]n|Escrito|Documento|Acta|\([A-Z]{2,6}\)[^:\n]{0,40})\s*:\s*)?(.+?)\s*-\s*(\d{1,2}\/\d{1,2}\/\d{4})\s*\(Folio\s+(\d+)\)\s+(\d+)$/i,
      );
      if (entrada) {
        // "(REQ)Requerimiento de Pago" -> "requerimiento de pago".
        const clase = entrada[3]
          ? plano(entrada[3]).replace(/^\([a-z]{2,6}\)\s*/i, '').trim() || 'actuacion'
          : 'actuacion';
        entradas.push({
          indice: entrada[1],
          cuaderno: Number(entrada[1].split('.')[0]),
          nulo: !!entrada[2],
          clase,
          titulo: entrada[4].trim(),
          fecha: MES_NUM(entrada[5]),
          folio: Number(entrada[6]),
          paginaEbook: Number(entrada[7]),
          // Un escrito anidado (1.1.1) lo provee la resolucion de la que cuelga (1.1).
          proveidoPor: entrada[1].split('.').length > 2 ? entrada[1].split('.').slice(0, -1).join('.') : null,
        });
        continue;
      }

      // Cabecera de cuaderno: "2. Apremio Ejecutivo Obligacion de Dar 27"
      const cuaderno = linea.match(/^(\d+)\.\s+(.+?)\s+(\d+)$/);
      if (cuaderno && !/\(folio/i.test(linea)) {
        cuadernos.push({ numero: Number(cuaderno[1]), nombre: cuaderno[2].trim(), paginaEbook: Number(cuaderno[3]) });
      }
    }
  }
  return entradas.length ? { entradas, cuadernos } : null;
}

/* ─────────────────────── Paginas del ebook vs del PDF ─────────────────────── */

/**
 * El desfase entre la numeracion del ebook y la del PDF.
 *
 * El indice apunta a "pagina 15" y esa es la 19 del archivo, porque antes van
 * la ficha y el indice. En vez de contar las paginas de cortesia —que cambian
 * segun el tamano del indice— se lee el pie impreso, que es un dato del propio
 * documento. Se exige que varias paginas coincidan en el mismo desfase: un pie
 * suelto puede ser cualquier numero.
 */
export function desfase(paginas) {
  const votos = new Map();
  for (let i = 0; i < paginas.length; i++) {
    // El acento de "Pagina" se pierde a veces en la extraccion: "Pgina 14".
    const m = (paginas[i] || '').match(/P[aá]?gina\s+(\d+)\s*$/m);
    if (!m) continue;
    const d = i + 1 - Number(m[1]);
    votos.set(d, (votos.get(d) || 0) + 1);
  }
  let mejor = null;
  let max = 0;
  for (const [d, n] of votos) if (n > max) { max = n; mejor = d; }
  return max >= 3 ? { desfase: mejor, paginasConPie: max } : null;
}

/* ─────────────────────────── Las piezas ─────────────────────────── */

/**
 * Convierte el indice del ebook en piezas con paginas del PDF.
 *
 * @returns {{piezas: Array<object>, cuadernos: Array<object>, desfase: number}|null}
 */
export function piezasDeEbook(paginas) {
  const toc = leerTablaContenidos(paginas);
  if (!toc) return null;
  const d = desfase(paginas);
  if (!d) return null;

  const nombreCuaderno = new Map(toc.cuadernos.map((c) => [c.numero, c.nombre]));
  // El indice viene ordenado por pagina; aun asi se ordena, porque una entrada
  // mal leida desordena el calculo de donde termina cada pieza.
  const orden = [...toc.entradas].sort((a, b) => a.paginaEbook - b.paginaEbook);

  const piezas = orden.map((e, i) => {
    const desde = e.paginaEbook + d.desfase;
    const siguiente = orden[i + 1];
    const hasta = siguiente ? siguiente.paginaEbook + d.desfase - 1 : paginas.length;
    return {
      n: i + 1,
      desde,
      hasta: Math.max(desde, Math.min(hasta, paginas.length)),
      paginas: Math.max(1, Math.min(hasta, paginas.length) - desde + 1),
      cuaderno: nombreCuaderno.get(e.cuaderno) || `cuaderno ${e.cuaderno}`,
      indice: e.indice,
      clase: e.clase,
      titulo: e.titulo,
      fecha: e.fecha,
      folio: e.folio,
      nulo: e.nulo,
      proveidoPor: e.proveidoPor,
      // Lo que viene del indice del sistema no necesita confianza estimada.
      confianza: 'indice del ebook',
    };
  });

  return { piezas, cuadernos: toc.cuadernos, desfase: d.desfase, paginasConPie: d.paginasConPie };
}

/* ─────────────────────── Quien presenta cada escrito ─────────────────────── */

/** Apellidos utiles de un nombre, para casarlo con el texto de un escrito. */
function apellidos(nombre) {
  return plano(nombre)
    .split(/\s+/)
    .filter((p) => p.length > 3 && !['de', 'del', 'la', 'las', 'los', 'spa', 'ltda', 'limitada', 'sociedad'].includes(p));
}

/**
 * De la sigla del litigante a LA PARTE por la que actua.
 *
 * Para el analisis importa de que lado viene el escrito, no si lo firmo el
 * abogado o el apoderado: "abogado del demandado" y "demandado" son el mismo
 * lado del juicio. Las siglas de tercero se agrupan por lo que la propia sigla
 * dice —TERC, TER—, y cualquier otra se devuelve cruda antes que suponerla.
 */
export function ladoDe(codigo) {
  const c = (codigo || '').toUpperCase().replace(/\.$/, '');
  if (/(^|\.)DTE$/.test(c)) return 'demandante';
  if (/(^|\.)DDO$/.test(c)) return 'demandada';
  if (/^TERC|TER$/.test(c)) return 'tercero';
  return null;
}

/**
 * Atribuye cada pieza a una parte, por el nombre de quien firma.
 *
 * Es mucho mas fiable que buscar la palabra "demandada" en el texto: los
 * escritos nombran a las dos partes todo el tiempo, pero solo uno de los
 * litigantes de la tabla aparece como firmante. Y como la tabla dice a quien
 * representa cada abogado, el escrito queda atribuido a la PARTE, no al
 * abogado.
 *
 * Devuelve null cuando no hay coincidencia clara. Atribuir un escrito a la
 * parte equivocada da vuelta el analisis entero y no se nota al leerlo.
 */
export function atribuir(textoPieza, litigantes) {
  const t = plano(textoPieza);
  const marcas = litigantes
    .map((l) => {
      const partes = apellidos(l.nombre);
      if (partes.length < 1) return null;
      const aciertos = partes.filter((p) => t.includes(p)).length;
      return { litigante: l, aciertos, exigidos: Math.min(2, partes.length) };
    })
    .filter((m) => m && m.aciertos >= m.exigidos);

  if (!marcas.length) return null;
  // El que aparece primero en el texto manda: es quien encabeza el escrito.
  marcas.sort((a, b) => {
    const pa = Math.min(...apellidos(a.litigante.nombre).map((p) => (t.indexOf(p) < 0 ? 1e9 : t.indexOf(p))));
    const pb = Math.min(...apellidos(b.litigante.nombre).map((p) => (t.indexOf(p) < 0 ? 1e9 : t.indexOf(p))));
    return pa - pb;
  });
  const gana = marcas[0].litigante;
  return {
    quien: gana.nombre,
    codigo: gana.codigo,
    parte: ladoDe(gana.codigo) || gana.rol || gana.codigo,
  };
}

/**
 * La FOJA impresa en la pieza.
 *
 * En el expediente conviven tres numeraciones y no son intercambiables: la
 * pagina del PDF (para comprobarlo ahora), el FOLIO (el numero de tramite, que
 * es como se busca en la Oficina Judicial Virtual) y la FOJA, que es como se
 * cita ante el tribunal: "a fojas 73". Vienen de sitios distintos y conviene
 * tener las tres, porque el escrito se redacta con una y se comprueba con otra.
 */
export function leerFoja(pagina) {
  const m = (pagina || '').match(/\bFOJA\s*:?\s*(\d{1,5})\b/i);
  return m ? Number(m[1]) : null;
}
