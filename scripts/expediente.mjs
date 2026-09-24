#!/usr/bin/env node
/**
 * litis — el expediente, en piezas y por pagina.
 *
 * Un cuaderno de la Oficina Judicial Virtual trae entre cien y dos mil paginas.
 * Nadie lo lee entero, ni una persona ni un modelo: lo que hace falta es un
 * indice fiable para elegir QUE leer, y una forma de leer ese trozo con el
 * numero de pagina pegado, para que lo que despues se afirme se pueda
 * comprobar.
 *
 * Hay dos caminos para llegar a ese indice, y el programa elige solo:
 *
 *   - Si el PDF es un ebook del Poder Judicial, trae SU PROPIA tabla de
 *     contenidos, con el cuaderno, el folio, la fecha y la pagina de cada
 *     pieza. Se usa esa. Adivinar con patrones teniendo el indice delante es
 *     trabajar de mas y peor.
 *   - Si no lo es —un expediente del CAM, uno armado a mano—, se segmenta por
 *     patrones y cada pieza declara con cuanta confianza se abrio.
 *
 * Esto no opina sobre el caso: el analisis lo hace Claude siguiendo SKILL.md.
 * Aqui solo se entrega el expediente en un formato con el que se pueda trabajar.
 */
import { existsSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { leerPdf, paginasSinTexto, paginasIlegibles, esIlegible, rangos } from './lib/pdf.mjs';
import { segmentar, caratula, indiceDeFolios, hitosDe, numerosImpresos } from './lib/piezas.mjs';
import { plano } from './lib/patrones.mjs';
import { esEbook, leerFicha, leerLitigantes, piezasDeEbook, atribuir, leerFoja } from './lib/ebook.mjs';
import { esCAM, leerSolicitud } from './lib/cam.mjs';
import { guardar, listar, resolverCaso, olvidar, slug, RAIZ, tamano } from './lib/caso.mjs';

const C = process.stdout.isTTY
  ? { t: '\x1b[90m', n: '\x1b[1m', v: '\x1b[32m', a: '\x1b[33m', r: '\x1b[31m', f: '\x1b[0m' }
  : { t: '', n: '', v: '', a: '', r: '', f: '' };

/* ─────────────────────────── argumentos ─────────────────────────── */

const argv = process.argv.slice(2);
const comando = argv[0];
const sueltos = [];
const flags = {};
for (let i = 1; i < argv.length; i++) {
  const a = argv[i];
  if (a.startsWith('--')) {
    const [clave, valor] = a.slice(2).split('=');
    if (valor !== undefined) flags[clave] = valor;
    else if (argv[i + 1] && !argv[i + 1].startsWith('--')) flags[clave] = argv[++i];
    else flags[clave] = true;
  } else sueltos.push(a);
}

const morir = (mensaje) => {
  console.error(`${C.r}${mensaje}${C.f}`);
  process.exit(1);
};

/* ─────────────────────────── presentacion ─────────────────────────── */

const corta = (s, n) => (!s ? '' : s.length > n ? s.slice(0, n - 1) + '…' : s);
const col = (s, n) => corta(String(s ?? ''), n).padEnd(n);
const piezasN = (n) => `${n} ${n === 1 ? 'pieza' : 'piezas'}`;

/** Tabla de piezas, agrupada por cuaderno cuando el expediente trae varios. */
function tablaPiezas(piezas, { cuadernos = true } = {}) {
  const lineas = [];
  let cuadernoActual = null;
  const cabecera = `${C.t}  #    paginas    folio  clase            fecha        parte        titulo${C.f}`;

  for (const p of piezas) {
    if (cuadernos && p.cuaderno && p.cuaderno !== cuadernoActual) {
      cuadernoActual = p.cuaderno;
      lineas.push(`\n${C.n}── cuaderno ${cuadernoActual} ──${C.f}`);
      lineas.push(cabecera);
    } else if (!cuadernoActual && !lineas.length) {
      lineas.push(cabecera);
    }
    const marca = p.hitos?.length ? `${C.a}>${C.f}` : ' ';
    const dudosa = p.nulo ? `${C.r}N${C.f}` : p.confianza === 'baja' ? `${C.a}?${C.f}` : ' ';
    lineas.push(
      `${marca}${dudosa}${col(p.n, 5)}${col(`${p.desde}-${p.hasta}`, 11)}${col(p.folio ?? '—', 7)}` +
        `${col(p.clase || p.tipo || '', 17)}${col(p.fecha || '—', 13)}${col(p.parte || '—', 13)}${corta(p.titulo, 42)}`,
    );
    if (p.hitos?.length) lineas.push(`${C.a}       menciona: ${p.hitos.join(', ')}${C.f}`);
  }
  return lineas.join('\n');
}

function pie(indice) {
  const l = [`\n${C.t}  > la pieza MENCIONA un hito procesal; que haya ocurrido se comprueba leyendola${C.f}`];
  if (indice.formato === 'ebook') l.push(`${C.t}  N pieza marcada [NULO] en el indice del ebook: quedo sin efecto${C.f}`);
  else l.push(`${C.t}  ? deteccion de baja confianza: confirmala leyendola${C.f}`);
  return l.join('\n');
}

/* ─────────────────────────── indexar ─────────────────────────── */

async function indexar() {
  const ruta = sueltos[0] && resolve(sueltos[0]);
  if (!ruta) morir('Falta el archivo. Uso: litis indexar <archivo.pdf>');
  if (!existsSync(ruta)) morir(`No existe el archivo: ${ruta}`);
  const nombre = flags.nombre || basename(ruta);

  const mb = (tamano(ruta) / 1048576).toFixed(1);
  console.log(`\n${C.n}Indexando${C.f} ${basename(ruta)} ${C.t}(${mb} MB)${C.f}`);

  const { paginas, metadatos } = await leerPdf(ruta, (hechas, total) => {
    if (process.stdout.isTTY) process.stdout.write(`\r  ${hechas}/${total} paginas`);
  });
  if (process.stdout.isTTY) process.stdout.write('\r' + ' '.repeat(30) + '\r');

  const ilegibles = paginasIlegibles(paginas);
  const sinTexto = paginasSinTexto(paginas).filter((n) => !ilegibles.includes(n));
  const indice = {
    archivo: ruta,
    nombre,
    indexado: new Date().toISOString(),
    totalPaginas: paginas.length,
    metadatos,
    paginasSinTexto: sinTexto,
    paginasIlegibles: ilegibles,
  };

  const delEbook = esEbook(paginas) ? piezasDeEbook(paginas) : null;

  if (delEbook) {
    indice.formato = 'ebook';
    indice.ficha = leerFicha(paginas);
    indice.litigantes = leerLitigantes(paginas);
    indice.cuadernos = delEbook.cuadernos;
    indice.desfase = delEbook.desfase;
    indice.piezas = delEbook.piezas.map((p) => {
      const texto = paginas.slice(p.desde - 1, p.hasta).join('\n');
      const quien = atribuir(paginas[p.desde - 1] || '', indice.litigantes);
      return {
        ...p,
        foja: leerFoja(paginas[p.desde - 1]),
        // La parte se saca de quien firma, cruzado con la tabla de litigantes.
        // Las resoluciones no son de nadie: las dicta el tribunal.
        parte: p.clase === 'resolucion' ? null : quien?.parte || null,
        firma: p.clase === 'resolucion' ? null : quien?.quien || null,
        hitos: hitosDe(texto),
      };
    });
  } else if (esCAM(paginas)) {
    // El CAM no trae indice, pero trae el formulario de solicitud: la ficha del
    // arbitraje sale de ahi y las piezas se cortan por patrones.
    indice.formato = 'cam';
    indice.solicitud = leerSolicitud(paginas);
    const sol = indice.solicitud;
    indice.ficha = {
      caratula: [sol.solicitante?.nombre, sol.solicitada?.nombre].filter(Boolean).join(' con ') || null,
      rol: sol.rol,
      tribunal: `Tribunal arbitral · ${sol.sede}`,
      materia: sol.titulo,
      ingreso: sol.ingreso,
    };
    indice.piezas = segmentar(paginas);
  } else {
    indice.formato = 'heuristica';
    indice.caratula = caratula(paginas);
    indice.folios = indiceDeFolios(paginas);
    indice.piezas = segmentar(paginas);
  }

  const carpeta = guardar(nombre, { paginas, indice });

  /* ── lo que se imprime ── */
  const f = indice.ficha || indice.caratula || {};
  console.log(`\n${C.n}${f.caratula || nombre}${C.f}`);
  const linea = (k, v) => v && console.log(`${C.t}  ${k.padEnd(14)}${C.f}${corta(String(v), 66)}`);
  linea('rol', f.rol);
  linea('tribunal', f.tribunal);
  linea('materia', f.materia);
  linea('procedimiento', f.procedimiento);
  if (f.etapa || f.estadoProcesal) {
    const estado = [f.etapa, f.estadoProcesal].filter(Boolean).join(' · ');
    const alerta = /termin|conclu|archiv/i.test(estado) ? C.a : C.v;
    console.log(`${C.t}  ${'estado'.padEnd(14)}${C.f}${alerta}${estado}${C.f}`);
  }
  linea('ingreso', f.ingreso);
  console.log(
    `${C.t}  ${'paginas'.padEnd(14)}${C.f}${paginas.length}   ${C.t}piezas${C.f} ${indice.piezas.length}` +
      `   ${C.t}guardado en${C.f} ${carpeta.replace(process.env.HOME, '~')}`,
  );

  if (indice.formato === 'cam') {
    const sol = indice.solicitud;
    const cuantia = sol.cuantia?.monto ? `${sol.cuantia.moneda || ''} ${Number(sol.cuantia.monto).toLocaleString('es-CL')} (${sol.cuantia.clase?.toLowerCase()})`.trim() : sol.cuantia?.clase;
    linea('cuantia', cuantia);
    linea('ley aplicable', [sol.leyAplicable, sol.sedeArbitraje && `sede ${sol.sedeArbitraje}`].filter(Boolean).join(' · '));
    linea('invoca', sol.normasInvocadas);
    console.log(`\n${C.v}  Es un expediente del CAM Santiago: la ficha sale del formulario de solicitud.${C.f}`);
    if (sol.internacional) {
      console.log(`${C.a}    Arbitraje INTERNACIONAL: rige su propia ley, con un regimen de nulidad distinto del interno.${C.f}`);
    }
    if (sol.clausula) console.log(`${C.t}    clausula arbitral: ${corta(sol.clausula.replace(/^.*?(Cl[aá]usula)/i, '$1'), 90)}${C.f}`);
    console.log(`${C.t}    Las piezas se detectaron por patrones: confirma el corte con \`litis revisar\`.${C.f}`);
  } else if (indice.formato === 'ebook') {
    console.log(
      `\n${C.v}  Es un ebook del Poder Judicial: las piezas salen de su propia tabla de contenidos.${C.f}`,
    );
    console.log(`${C.t}    ${indice.cuadernos.length} cuaderno(s): ${indice.cuadernos.map((c) => c.nombre).join(' · ')}${C.f}`);
    const nulas = indice.piezas.filter((p) => p.nulo);
    if (nulas.length) {
      console.log(`${C.a}    ${piezasN(nulas.length)} con marca [NULO]: ${nulas.map((p) => p.n).join(', ')}${C.f}`);
    }
  } else {
    console.log(`\n${C.a}  No es un ebook del Poder Judicial: las piezas se detectaron por patrones.${C.f}`);
    console.log(`${C.t}    Confirma con \`litis revisar\` antes de fiarte del corte entre piezas.${C.f}`);
  }

  if (sinTexto.length) {
    const pct = Math.round((sinTexto.length / paginas.length) * 100);
    console.log(`\n${C.a}  ! ${sinTexto.length} paginas (${pct}%) no tienen texto: son imagen escaneada.${C.f}`);
    console.log(`${C.t}    ${corta(rangos(sinTexto), 200)}${C.f}`);
    console.log(`${C.t}    La busqueda no las ve. Si ahi hay prueba, pasales OCR antes de concluir nada:${C.f}`);
    console.log(`${C.t}    ocrmypdf --skip-text "${basename(ruta)}" con-ocr.pdf  (brew install ocrmypdf)${C.f}`);
  }
  if (ilegibles.length) {
    console.log(`\n${C.a}  ! ${ilegibles.length} paginas tienen capa de texto, pero ilegible: la fuente no trae mapa de caracteres.${C.f}`);
    console.log(`${C.t}    ${corta(rangos(ilegibles), 200)}${C.f}`);
    console.log(`${C.t}    Parecen revisadas y no lo estan: la busqueda tampoco las ve. A estas --skip-text las salta;${C.f}`);
    console.log(`${C.t}    hace falta forzar el OCR:  ocrmypdf --force-ocr "${basename(ruta)}" con-ocr.pdf${C.f}`);
  }

  if (indice.litigantes?.length) {
    console.log(`\n${C.n}Quien es quien${C.f}`);
    for (const l of indice.litigantes) {
      console.log(`${C.t}  ${col(l.codigo, 9)}${C.f}${col(l.rol || '(sigla sin traducir)', 26)}${corta(l.nombre, 44)}`);
    }
  }

  console.log(`\n${tablaPiezas(indice.piezas)}`);
  console.log(pie(indice));
}

/* ─────────────────────────── consultas ─────────────────────────── */

function filtrar(indice) {
  let lista = indice.piezas;
  if (flags.cuaderno) {
    const q = plano(String(flags.cuaderno));
    lista = lista.filter((p) => plano(p.cuaderno || '').includes(q));
  }
  if (flags.clase) lista = lista.filter((p) => plano(p.clase || p.tipo || '').includes(plano(String(flags.clase))));
  if (flags.tipo) lista = lista.filter((p) => plano(`${p.titulo} ${p.tipo || ''}`).includes(plano(String(flags.tipo))));
  if (flags.hitos) lista = lista.filter((p) => p.hitos?.length);
  return lista;
}

function piezas() {
  const { indice } = resolverCaso(flags.caso);
  const lista = filtrar(indice);
  if (flags.json) return console.log(JSON.stringify(lista, null, 2));
  const f = indice.ficha || indice.caratula || {};
  console.log(`\n${C.n}${f.caratula || indice.nombre}${C.f} ${C.t}· ${indice.totalPaginas} paginas · ${piezasN(indice.piezas.length)}${lista.length !== indice.piezas.length ? `, ${lista.length} mostradas` : ''}${C.f}`);
  console.log(tablaPiezas(lista));
  console.log(pie(indice));
}

function partes() {
  const { indice } = resolverCaso(flags.caso);
  if (indice.formato === 'cam') {
    const sol = indice.solicitud;
    if (flags.json) return console.log(JSON.stringify({ solicitante: sol.solicitante, solicitada: sol.solicitada }, null, 2));
    console.log(`\n${C.n}Partes del arbitraje${C.f} ${C.t}· del formulario de solicitud del CAM${C.f}\n`);
    for (const [rotulo, p] of [['solicitante', sol.solicitante], ['solicitada', sol.solicitada]]) {
      if (p) console.log(`  ${col(rotulo, 13)}${col(p.nombre, 40)}${C.t}${[p.tipo, p.nacionalidad].filter(Boolean).join(' · ')}${C.f}`);
    }
    if (sol.conflicto) console.log(`\n${C.n}El conflicto, segun quien lo inicio${C.f}\n  ${sol.conflicto}`);
    console.log(`\n${C.t}  Es la version del solicitante, escrita para iniciar el arbitraje: alegado, no probado.${C.f}`);
    return;
  }
  if (!indice.litigantes?.length) {
    return console.log(`\n${C.a}Este expediente no trae tabla de litigantes (solo la traen los ebooks del Poder Judicial y el formulario del CAM).${C.f}`);
  }
  if (flags.json) return console.log(JSON.stringify(indice.litigantes, null, 2));
  console.log(`\n${C.n}Quien es quien${C.f} ${C.t}· de la portada del ebook${C.f}\n`);
  for (const l of indice.litigantes) {
    console.log(`  ${col(l.codigo, 9)}${col(l.rol || '(sigla sin traducir)', 26)}${col(l.rut, 13)}${l.nombre}`);
  }
  const escritos = indice.piezas.filter((p) => p.firma);
  console.log(`\n${C.t}  ${escritos.length} de ${indice.piezas.length} piezas quedaron atribuidas por la firma.${C.f}`);
  console.log(`${C.t}  Las que no, o son resoluciones del tribunal o no nombran a un litigante conocido.${C.f}`);
}

function ver() {
  const { indice, paginas } = resolverCaso(flags.caso);
  const pedido = String(sueltos[0] || '');
  if (!pedido) morir('Falta que ver. Uso: litis ver 34-58   |   litis ver #7');

  let desde, hasta, cabecera;
  if (pedido.startsWith('#')) {
    const pieza = indice.piezas.find((p) => p.n === Number(pedido.slice(1)));
    if (!pieza) morir(`No hay pieza ${pedido} en este expediente.`);
    desde = pieza.desde;
    hasta = pieza.hasta;
    cabecera =
      `pieza ${pieza.n} · ${pieza.titulo} · ${pieza.clase || pieza.tipo} · ${pieza.fecha || 'sin fecha'}` +
      (pieza.folio ? ` · folio ${pieza.folio}` : '') +
      (pieza.foja ? ` · fojas ${pieza.foja}` : '') +
      (pieza.cuaderno ? ` · cuaderno ${pieza.cuaderno}` : '') +
      ` · pp. ${desde}-${hasta}` +
      (pieza.nulo ? ' · [NULO]' : '');
  } else {
    const m = pedido.match(/^(\d+)(?:\s*-\s*(\d+))?$/);
    if (!m) morir(`No entiendo "${pedido}". Usa 34, 34-58 o #7.`);
    desde = Number(m[1]);
    hasta = Number(m[2] || m[1]);
    cabecera = `pp. ${desde}-${hasta}`;
  }
  desde = Math.max(1, desde);
  hasta = Math.min(paginas.length, hasta);

  // Un rango enorme volcado de una vez llena el contexto de Claude con paginas
  // que nadie pidio y deja fuera el analisis. Se corta, y se dice que se corto.
  const TOPE = 40;
  let recorte = null;
  if (!flags.todo && hasta - desde + 1 > TOPE) {
    recorte = hasta;
    hasta = desde + TOPE - 1;
  }

  console.log(`${C.t}── ${cabecera} ──${C.f}`);
  for (let p = desde; p <= hasta; p++) {
    const texto = paginas[p - 1] || '';
    console.log(`\n${C.t}[p. ${p}]${C.f}`);
    if (esIlegible(texto)) console.log(`${C.a}(capa de texto ilegible: la fuente no trae mapa de caracteres. Hace falta OCR forzado.)${C.f}`);
    else console.log(texto.trim() || `${C.a}(pagina sin texto: imagen escaneada)${C.f}`);
  }
  if (recorte) {
    console.log(`\n${C.a}── cortado en la p. ${hasta}; el rango llegaba a la ${recorte}.${C.f}`);
    console.log(`${C.t}   Sigue con: litis ver ${hasta + 1}-${recorte}   (o --todo para volcarlo entero)${C.f}`);
  }
}

/**
 * Busqueda tolerante a como sale el texto de estos PDF.
 *
 * Los PDF del Poder Judicial dibujan la tilde aparte de su palabra, y aunque el
 * extractor devuelve la mayoria a su sitio, algunas se quedan sueltas ("se
 * notific o") y en la portada otras desaparecen ("Pgina"). Buscar "notifico"
 * sobre ese texto no encuentra nada, y el abogado concluye que no esta.
 *
 * Por eso, si la frase exacta no aparece, se reintenta permitiendo un espacio
 * entre cualquier par de caracteres y dejando opcionales las vocales que en la
 * consulta iban acentuadas, que son justo las que el PDF pierde o desplaza.
 */
function regexTolerante(consulta) {
  const partes = [...consulta.normalize('NFC')].map((c) => {
    if (/\s/.test(c)) return '\\s+';
    const base = c.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    const escapado = base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return base !== c.toLowerCase() ? `${escapado}?` : escapado;
  });
  return new RegExp(partes.join('\\s?'));
}

function buscar() {
  const { indice, paginas } = resolverCaso(flags.caso);
  const consulta = sueltos.join(' ').trim();
  if (!consulta) morir('Falta que buscar. Uso: litis buscar "termino de la busqueda"');
  const max = Number(flags.max || 25);
  const ancho = Number(flags.contexto || 320);

  const aguja = plano(consulta);
  const palabras = aguja.split(/\s+/).filter((p) => p.length > 2);
  const tolerante = regexTolerante(consulta);
  const piezaDe = (p) => indice.piezas.find((x) => p >= x.desde && p <= x.hasta);

  const hallazgos = [];
  paginas.forEach((texto, i) => {
    if (esIlegible(texto)) return;
    const t = plano(texto);
    let posicion = t.indexOf(aguja);
    let como = 'exacta';
    if (posicion < 0 && palabras.length > 1 && palabras.every((w) => t.includes(w))) {
      posicion = t.indexOf(palabras[0]);
      como = 'palabras sueltas, no la frase';
    }
    if (posicion < 0) {
      const m = t.match(tolerante);
      if (m) {
        posicion = m.index;
        como = 'coincidencia tolerante: el PDF trae la palabra partida';
      }
    }
    if (posicion < 0) return;
    const inicio = Math.max(0, posicion - Math.floor(ancho / 3));
    hallazgos.push({
      pagina: i + 1,
      pieza: piezaDe(i + 1),
      como,
      pasaje: (inicio > 0 ? '…' : '') + texto.slice(inicio, inicio + ancho).replace(/\n+/g, ' ') + '…',
    });
  });

  if (!hallazgos.length) {
    console.log(`\n${C.a}Sin coincidencias de "${consulta}".${C.f}`);
    const ciegas = [...(indice.paginasSinTexto || []), ...(indice.paginasIlegibles || [])].sort((a, b) => a - b);
    if (ciegas.length) {
      console.log(`${C.t}Ojo: ${ciegas.length} paginas de este expediente no se pueden leer —imagen sin OCR o texto ilegible— y la busqueda no las alcanza (${corta(rangos(ciegas), 90)}).${C.f}`);
      console.log(`${C.t}"No lo encontre" no es "no esta".${C.f}`);
    }
    return;
  }

  console.log(`\n${C.n}${hallazgos.length} coincidencia(s)${C.f} de "${consulta}"${hallazgos.length > max ? ` ${C.t}(se muestran ${max})${C.f}` : ''}\n`);
  for (const h of hallazgos.slice(0, max)) {
    const p = h.pieza;
    const donde = p
      ? `pieza ${p.n} · ${p.titulo || p.tipo}${p.parte ? ` · ${p.parte}` : ''}${p.folio ? ` · folio ${p.folio}` : ''}`
      : 'fuera de toda pieza';
    console.log(`${C.n}[p. ${h.pagina}]${C.f} ${C.t}${donde}${h.como === 'exacta' ? '' : ` · ${h.como}`}${C.f}`);
    console.log(`  ${h.pasaje}\n`);
  }
}

function cronologia() {
  const { indice } = resolverCaso(flags.caso);
  const lista = filtrar(indice);
  const conFecha = lista.filter((p) => p.fecha).sort((a, b) => a.fecha.localeCompare(b.fecha));
  const sinFecha = lista.filter((p) => !p.fecha);
  if (flags.json) return console.log(JSON.stringify({ conFecha, sinFecha }, null, 2));

  console.log(`\n${C.n}Cronologia${C.f} ${C.t}· ${indice.formato === 'ebook' ? 'fechas del indice del ebook' : 'solo las piezas con fecha propia'}${C.f}\n`);
  let anio = null;
  for (const h of conFecha) {
    const suyo = h.fecha.slice(0, 4);
    if (suyo !== anio) {
      anio = suyo;
      console.log(`${C.t}  ── ${anio} ──${C.f}`);
    }
    console.log(
      `${C.n}${h.fecha}${C.f}  ${col(h.clase || h.tipo, 12)}${col(corta(h.titulo, 34), 35)}` +
        `${C.t}p. ${h.desde}${h.folio ? `, folio ${h.folio}` : ''}${C.f}` +
        (h.nulo ? `  ${C.r}[NULO]${C.f}` : '') +
        (h.hitos?.length ? `  ${C.a}${h.hitos.join(', ')}${C.f}` : ''),
    );
  }
  if (sinFecha.length) console.log(`\n${C.t}Sin fecha: piezas ${sinFecha.map((p) => p.n).join(', ')}${C.f}`);

  console.log(`\n${C.t}La fecha de una resolucion no es la de su notificacion, y los plazos corren${C.f}`);
  console.log(`${C.t}desde la notificacion. Busca la actuacion del receptor o el estado diario.${C.f}`);
}

function revisar() {
  const { indice, paginas } = resolverCaso(flags.caso);
  const sinTexto = [...(indice.paginasSinTexto || []), ...(indice.paginasIlegibles || [])];
  const pct = Math.round(((paginas.length - sinTexto.length) / paginas.length) * 100);
  const marca = (bien) => (bien ? `${C.v}ok${C.f}` : `${C.a}! ${C.f}`);

  console.log(`\n${C.n}Estado del indexado${C.f} ${C.t}· ${indice.nombre}${C.f}\n`);
  console.log(`  ${marca(true)}  formato: ${{ ebook: 'ebook del Poder Judicial (indice propio)', cam: 'expediente del CAM (ficha del formulario, piezas por patrones)' }[indice.formato] || 'segmentado por patrones'}`);
  console.log(`  ${marca(pct >= 95)}  ${pct}% de las paginas se pueden leer (${paginas.length - sinTexto.length}/${paginas.length})`);
  if (indice.paginasSinTexto?.length) console.log(`  ${C.t}   imagen sin OCR: ${corta(rangos(indice.paginasSinTexto), 150)}${C.f}`);
  if (indice.paginasIlegibles?.length) console.log(`  ${C.t}   texto ilegible (OCR forzado): ${corta(rangos(indice.paginasIlegibles), 140)}${C.f}`);

  if (indice.formato === 'ebook') {
    const cubiertas = indice.piezas.reduce((a, p) => a + p.paginas, 0);
    console.log(`  ${marca(true)}  ${piezasN(indice.piezas.length)} del indice, sobre ${indice.cuadernos.length} cuaderno(s)`);
    console.log(`  ${C.t}   cubren ${cubiertas} de ${paginas.length} paginas (las primeras ${indice.desfase} son portada e indice)${C.f}`);
    const nulas = indice.piezas.filter((p) => p.nulo);
    if (nulas.length) console.log(`  ${C.a}!   ${piezasN(nulas.length)} con marca [NULO]: ${nulas.map((p) => p.n).join(', ')}${C.f}`);
    const sinParte = indice.piezas.filter((p) => p.clase === 'escrito' && !p.parte);
    if (sinParte.length) {
      console.log(`  ${C.a}!   ${piezasN(sinParte.length)} de parte sin atribuir: ${sinParte.map((p) => p.n).join(', ')}${C.f}`);
      console.log(`  ${C.t}   no nombran a ningun litigante de la portada; miralas antes de asignarlas${C.f}`);
    }
  } else {
    const dudosas = indice.piezas.filter((p) => p.confianza === 'baja');
    // Una pieza larga es sospechosa solo si su paginacion propia NO corre
    // seguida: una contestacion de setenta paginas numeradas del 1 al 70 es un
    // escrito, no varios pegados. Avisar igual entrena a ignorar el aviso.
    const numeros = numerosImpresos(paginas);
    const continua = (p) => {
      let seguidas = 0;
      for (let i = p.desde; i < p.hasta; i++) {
        if (numeros[i].cerca.some((n) => numeros[i - 1].cerca.includes(n - 1))) seguidas++;
      }
      return seguidas / Math.max(1, p.paginas - 1) >= 0.6;
    };
    const largas = indice.piezas.filter((p) => p.paginas > 60 && !continua(p));
    console.log(`  ${marca(!dudosas.length)}  ${piezasN(dudosas.length)} con senales debiles al abrirse`);
    if (dudosas.length) console.log(`  ${C.t}   piezas ${dudosas.map((p) => `${p.n} (pp. ${p.desde}-${p.hasta})`).join(', ')}${C.f}`);
    console.log(`  ${marca(!largas.length)}  ${piezasN(largas.length)} de mas de 60 paginas`);
    if (largas.length) {
      console.log(`  ${C.t}   piezas ${largas.map((p) => `${p.n} (${p.paginas} pp.)`).join(', ')}${C.f}`);
      console.log(`  ${C.t}   una pieza muy larga suele ser varias pegadas: el detector no vio el corte${C.f}`);
      console.log(`\n${C.t}  Los patrones estan en scripts/lib/patrones.mjs; ajustalos y vuelve a indexar.${C.f}`);
    }
  }
  const conHito = indice.piezas.filter((p) => p.hitos?.length);
  console.log(`  ${C.t}   ${piezasN(conHito.length)} con algun hito procesal marcado${C.f}`);
}

function casos() {
  const lista = listar();
  if (!lista.length) return console.log(`\n${C.t}No hay expedientes indexados. Empieza con: litis indexar <archivo.pdf>${C.f}`);
  console.log(`\n${C.n}Expedientes indexados${C.f} ${C.t}en ${RAIZ.replace(process.env.HOME, '~')}${C.f}\n`);
  for (const c of lista) {
    console.log(`  ${col(c.slug, 34)}${col(c.paginas + ' pp.', 10)}${col(c.piezas + ' piezas', 12)}${C.t}${String(c.indexado).slice(0, 10)}${C.f}`);
  }
  console.log(`\n${C.t}  Se borran con: litis olvidar <nombre>${C.f}`);
}

function borrar() {
  const nombre = sueltos[0];
  if (!nombre) morir('Falta cual. Uso: litis olvidar <nombre>');
  if (olvidar(nombre)) console.log(`${C.v}Borrado${C.f} ${slug(nombre)} y todo su texto extraido.`);
  else morir(`No hay nada indexado como "${slug(nombre)}".`);
}

function ayuda() {
  console.log(`
${C.n}litis${C.f} — el expediente, en piezas y por pagina

  ${C.n}litis indexar${C.f} <archivo.pdf> [--nombre alias]
      Extrae el texto y arma el indice. Si el PDF es un ebook del Poder
      Judicial, usa su propia tabla de contenidos.

  ${C.n}litis piezas${C.f} [--cuaderno apremio] [--clase escrito|resolucion] [--hitos] [--json]
  ${C.n}litis partes${C.f}                    quien es quien en la causa
  ${C.n}litis ver${C.f} <#3 | 34 | 34-58> [--todo]
  ${C.n}litis buscar${C.f} "termino" [--max 25] [--contexto 320]
  ${C.n}litis cronologia${C.f} [--cuaderno X] [--json]
  ${C.n}litis revisar${C.f}                   que tan fiable quedo el indexado
  ${C.n}litis casos${C.f}                     lo que hay indexado
  ${C.n}litis olvidar${C.f} <nombre>          borra el texto extraido

  Con varios expedientes indexados, agrega ${C.n}--caso <nombre>${C.f}.
  Todo queda en este computador, en ${RAIZ.replace(process.env.HOME || '', '~')}.
`);
}

/* ─────────────────────────── despacho ─────────────────────────── */

const comandos = { indexar, casos, piezas, partes, ver, buscar, cronologia, revisar, olvidar: borrar, ayuda };

try {
  const fn = comandos[comando];
  if (!fn) {
    if (comando) console.error(`${C.r}No conozco el comando "${comando}".${C.f}`);
    ayuda();
    process.exit(comando ? 1 : 0);
  }
  await fn();
} catch (e) {
  morir(e.message);
}
