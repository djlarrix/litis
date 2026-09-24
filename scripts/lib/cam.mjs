/**
 * El expediente del Centro de Arbitraje y Mediacion (CAM Santiago).
 *
 * No trae indice como el ebook del Poder Judicial, pero trae algo que en un
 * arbitraje vale mas: el FORMULARIO DE SOLICITUD con que se inicio, que el
 * propio centro estructura en campos. Ahi estan las partes, la cuantia, la ley
 * aplicable, las normas que el solicitante invoca, la clausula arbitral y una
 * descripcion del conflicto escrita por quien lo inicio.
 *
 * Es la ficha del arbitraje, y el analisis empieza por ella: la competencia del
 * tribunal arbitral se mide contra la clausula, la ley aplicable decide que
 * normas rigen el fondo, y la cuantia y la pretension fijan que se discute.
 *
 * Criterio: se devuelve solo lo que se lee con seguridad. El formulario sale
 * del PDF con las columnas aplanadas, y asignar un valor a la columna
 * equivocada —la nacionalidad como tipo de persona, el monto como moneda— es
 * un dato falso con apariencia de ficha oficial. Cuando la linea no se deja
 * partir con certeza, se devuelve entera.
 */
import { plano } from './patrones.mjs';

/** Un expediente del CAM se reconoce por su pie y por su formulario. */
export function esCAM(paginas) {
  const cabeza = plano(paginas.slice(0, 8).join('\n'));
  return /centro de arbitraje y mediacion|camsantiago|solicitud de arbitraje/.test(cabeza);
}

/** Las lineas que siguen a una etiqueta, hasta la proxima etiqueta conocida. */
function tras(lineas, etiqueta, { max = 8, hasta = [] } = {}) {
  const i = lineas.findIndex((l) => plano(l).startsWith(plano(etiqueta)));
  if (i < 0) return null;
  const salida = [];
  for (let k = i + 1; k < lineas.length && salida.length < max; k++) {
    const l = lineas[k];
    if (hasta.some((h) => plano(l).startsWith(plano(h)))) break;
    if (/^centro de arbitraje y mediacion|^san sebastian 2812|^monjitas 392|^camsantiago@/i.test(plano(l))) continue;
    salida.push(l);
  }
  return salida.length ? salida.join(' ').replace(/\s+/g, ' ').trim() : null;
}

/** La primera linea bajo una cabecera de columnas, dentro de un bloque. */
function filaBajo(lineas, bloque, cabecera) {
  const i = lineas.findIndex((l) => plano(l).startsWith(plano(bloque)));
  if (i < 0) return null;
  for (let k = i + 1; k < Math.min(lineas.length, i + 6); k++) {
    if (plano(lineas[k]).startsWith(plano(cabecera))) return lineas[k + 1]?.trim() || null;
  }
  return null;
}

/**
 * La ficha del arbitraje, del formulario de solicitud.
 * @returns {object|null}
 */
export function leerSolicitud(paginas) {
  const lineas = paginas
    .slice(0, 8)
    .join('\n')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  const todo = paginas.join('\n');

  const titulo = lineas.find((l) => /^solicitud de arbitraje/i.test(plano(l))) || null;
  const rol = todo.match(/\bRol\s+CAM\s*:?\s*([A-Z]-\d{1,6}-\d{4})/i)?.[1] || null;

  const cuantia = (() => {
    const i = lineas.findIndex((l) => /^cuantia\s+monto\s+moneda/.test(plano(l)));
    if (i < 0) return null;
    const m = (lineas[i + 1] || '').match(/^(Determinada|Indeterminada)\s+([\d.,]+)?\s*([A-Z]{2,4}|UF|CLP|Pesos)?/i);
    return m ? { clase: m[1], monto: m[2] || null, moneda: m[3] || null } : { texto: lineas[i + 1] || null };
  })();

  // "Sede / Ley aplicable / Normas juridicas aplicables al fondo": la cabecera
  // ocupa dos lineas y los valores otras dos. Se lee sobre el texto corrido:
  // dos palabras (sede y ley, casi siempre un pais) y despues las normas, que
  // terminan en el cuerpo legal que citan.
  const derecho = (() => {
    const corrido = lineas.join(' ');
    const m = corrido.match(
      /fondo de la controversia\s+(\S+)\s+(\S+)\s+(Arts?\.?\s[\s\S]*?(?:C[o\u00f3]digo\s+\S+|Ley\s+N?[\u00ba\u00b0]?\s*[\d.]+|Convenci[o\u00f3]n[^.]*?))(?=\s+Idioma|\s+Consorcio|$)/i,
    );
    if (!m) return null;
    return { sedeArbitraje: m[1], leyAplicable: m[2], normasInvocadas: m[3].replace(/\s+/g, ' ').trim() };
  })();

  /**
   * "Proveedora Norte Ltd. Juridica Canada" -> nombre, tipo, nacionalidad.
   * Se puede partir con seguridad porque el tipo de persona es un conjunto
   * cerrado: lo que va antes es el nombre y lo que va despues la nacionalidad.
   */
  const parte = (fila) => {
    if (!fila) return null;
    const m = fila.match(/^(.*?)\s+(Natural|Jur[i\u00ed]dica)\s+(.+)$/i);
    return m ? { nombre: m[1].trim(), tipo: m[2].toLowerCase(), nacionalidad: m[3].trim() } : { nombre: fila };
  };

  return {
    sede: 'CAM Santiago',
    titulo,
    internacional: titulo ? /internacional/i.test(titulo) : null,
    id: todo.match(/\bID\s*N[°º]?\s*(\d+)/i)?.[1] || null,
    ingreso: todo.match(/Fecha Ingreso\s*:\s*(\d{1,2}\/\d{1,2}\/\d{4})/i)?.[1] || null,
    rol,
    solicitante: parte(filaBajo(lineas, 'Datos Parte Solicitante', 'Nombres o Razón Social')),
    solicitada: parte(filaBajo(lineas, 'Datos Parte Solicitada', 'Nombres o Razón Social')),
    cuantia,
    sedeArbitraje: derecho?.sedeArbitraje || null,
    leyAplicable: derecho?.leyAplicable || null,
    normasInvocadas: derecho?.normasInvocadas || null,
    // La etiqueta ocupa dos lineas y su final ("controversia") se colaba al
    // comienzo del valor.
    contrato: tras(lineas, 'Referencia al contrato', { max: 4, hasta: ['Referencia del acuerdo'] })?.replace(/^controversia\s+/i, '') || null,
    clausula: tras(lineas, 'Referencia del acuerdo de arbitraje', { max: 5, hasta: ['Descripción general'] }),
    conflicto: tras(lineas, 'Descripción general de la naturaleza del conflicto', { max: 12, hasta: ['Industria'] }),
  };
}
