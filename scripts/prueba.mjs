#!/usr/bin/env node
/**
 * Pruebas de litis, sin PDF y sin datos reales.
 *
 *   npm test
 *
 * Cada caso reproduce, con texto inventado, un defecto que aparecio al
 * calibrar la herramienta contra expedientes de verdad. Si alguno vuelve a
 * fallar, el analisis que sale de ahi se equivoca sin que nadie lo note: una
 * fecha falsa, un escrito partido en dos, una resolucion leida como sentencia.
 */
import assert from 'node:assert/strict';
import { _unir, _meterAcento, esEscaneada, esIlegible } from './lib/pdf.mjs';
import { segmentar, fechasDe, numerosImpresos } from './lib/piezas.mjs';
import { esEbook, leerFicha, leerLitigantes, leerTablaContenidos, piezasDeEbook, desfase, atribuir } from './lib/ebook.mjs';
import { esCAM, leerSolicitud } from './lib/cam.mjs';

let ok = 0;
const fallas = [];
function caso(nombre, fn) {
  try {
    fn();
    ok++;
    console.log(`  \x1b[32mok\x1b[0m  ${nombre}`);
  } catch (e) {
    fallas.push(nombre);
    console.log(`  \x1b[31m!!\x1b[0m  ${nombre}\n      ${e.message.split('\n')[0]}`);
  }
}

/** Un fragmento como los que devuelve pdfjs. */
const frag = (str, x, y, width, { eol = false, height = 12 } = {}) => ({ str, transform: [1, 0, 0, 1, x, y], width, height, hasEOL: eol });

console.log('\nExtraccion de texto');

caso('devuelve la tilde a su hueco ("Mero tr mite" + "á")', () => {
  const texto = _unir([frag(': 1. [445]Mero tr mite', 226.9, 800, 121), frag('á', 327.7, 800, 6)]);
  assert.equal(texto, ': 1. [445]Mero trámite');
});

caso('no mete la tilde si no hay un hueco plausible', () => {
  assert.equal(_meterAcento('palabra', 0, 50, 25, 'á'), null);
});

caso('une fragmentos de una letra sin inventar espacios ("D e m anda")', () => {
  const texto = _unir([frag('Cédula', 79, 700, 38.1), frag(' ', 117.1, 700, 3.3), frag('d', 120.4, 700, 6.7), frag('e Identidad:', 127.1, 700, 62.7)]);
  assert.equal(texto, 'Cédula de Identidad:');
});

caso('separa cuando hay un hueco real entre fragmentos', () => {
  assert.equal(_unir([frag('Hola', 10, 700, 20), frag('mundo', 40, 700, 30)]), 'Hola mundo');
});

caso('una resolucion de una linea no es una imagen', () => {
  assert.equal(esEscaneada('En Santiago de Chile, a 3 de marzo de 2025.\nTengase presente.\npagina 12'), false);
  assert.equal(esEscaneada('pagina 12'), true);
});

caso('detecta la capa de texto basura, sin confundirla con una tabla de numeros', () => {
  const basura = '\u0000\u0002\u0003\u0004\u0005\u0005\u0006\n\u0007\b \u000e\u000f\u0010!\"#$%&()*+,-./0123'.repeat(4);
  assert.equal(esIlegible(basura), true);
  assert.equal(esIlegible('Capital Intereses\n4.500.000$\n02-01-2021\n10-06-2022\n215\n28,10 %\n1.210.400$\n3.289.600'), false);
  assert.equal(esIlegible('Que vengo en contestar la demanda solicitando su total rechazo con costas por las razones'), false);
});

console.log('\nFechas');

caso('lee fechas escritas en palabras', () => {
  assert.equal(fechasDe('Santiago, trece de agosto de dos mil veinticinco.')[0].fecha, '2025-08-13');
});

caso('la demanda no toma la fecha del contrato que reclama', () => {
  const [pieza] = segmentar(['S.J.L.\nEN LO PRINCIPAL: demanda\nCon fecha 10 de enero de 2023 se celebro el contrato']);
  assert.equal(pieza.fecha, null);
  assert.ok(pieza.fechasMencionadas.includes('2023-01-10'));
});

caso('la resolucion si toma su fecha de encabezado', () => {
  const piezas = segmentar(['S.J.L.\nEN LO PRINCIPAL: demanda', 'Santiago, veinte de marzo de dos mil veinticuatro.\nA lo principal: traslado.\nNotifiquese.']);
  assert.equal(piezas[1].fecha, '2024-03-20');
});

console.log('\nSegmentacion por patrones');

caso('una resolucion que provee la demanda es resolucion, no demanda', () => {
  const piezas = segmentar(['EN LO PRINCIPAL: interpone demanda ejecutiva\nS.J.L.', 'Santiago, cinco de marzo de dos mil veinticuatro.\nA la demanda de folio 1: despachese mandamiento.\nNotifiquese.']);
  assert.equal(piezas[1].tipo, 'resolucion');
});

caso('un escrito que sigue su propia paginacion no se parte por una cita', () => {
  const paginas = [
    '1\nEn lo principal: contestan demanda; en el otrosi: acompanan documentos.\nS.J.A.: Juan Perez, por la demandada',
    '2\nsegun se expuso en lo principal, la S.J.A. debe rechazar la demanda',
    '3\nS.J.A.\nEn lo principal de este escrito ya se dijo que no hay incumplimiento',
  ];
  const piezas = segmentar(paginas);
  assert.equal(piezas.length, 1);
  assert.equal(piezas[0].tipo, 'contestacion');
});

caso('una pagina escaneada abre y cierra su propia pieza', () => {
  const piezas = segmentar(['1\nEn lo principal: acompana documentos', 'pagina 2', 'pagina 3', 'Santiago, uno de junio de dos mil veinticinco.\nTengase presente.']);
  assert.deepEqual(piezas.map((p) => p.tipo), ['prueba-documental', 'escaneado', 'resolucion']);
});

caso('"vistos" y "considerando" en cuatro paginas no hacen sentencia', () => {
  const [p] = segmentar(['En Santiago de Chile, a 10 de agosto de 2026.\nVistos:\nConsiderando: que la reposicion no aporta antecedentes nuevos.\nSe resuelve: no ha lugar.']);
  assert.equal(p.tipo, 'resolucion');
});

caso('un escrito que abre con su suma es escrito, aunque cite la resolucion', () => {
  const [p] = segmentar(['Evacua traslado\nS.J.A.\nLa resolucion impugnada dice: "Vistos... se resuelve... notifiquese".']);
  assert.equal(p.tipo, 'escrito');
});

caso('la paginacion propia no confunde el pie "pagina N" del expediente', () => {
  const [n] = numerosImpresos(['texto del documento\npagina 261']);
  assert.equal(n.borde, null);
});

console.log('\nEbook del Poder Judicial');

const EBOOK = [
  [
    '9º Juzgado Civil de Santiago',
    'Litigantes',
    'ROL: C-1111-2025 Fecha Ingreso: 02/01/2025 10:00 - OJV',
    'Caratulado: ACME SPA/PEREZ',
    'Procedimiento: Ejecutivo Obligación de Dar',
    'Materia: [C07A] Pagaré, Cobro De',
    'Etapa: Terminada Estado Procesal: Concluido',
    'Sujeto RUT Persona Nombre o Razón Social',
    'DTE. 76000000-1 JURIDICA ACME SPA',
    'AB.DTE 11111111-1 NATURAL ANA MARIA',
    'SOTO ROJAS',
    'DDO. 22222222-2 NATURAL JUAN PEREZ DIAZ',
    'AB.DDO 33333333-3 NATURAL LUISA VERA MORA',
  ].join('\n'),
  [
    'Tabla de contenidos',
    '1. Principal 1',
    '1.1. Resolución: Ordena despachar mandamiento - 05/01/2025 (Folio 2) 1',
    '1.1.1. Escrito: Ingreso demanda - 02/01/2025 (Folio 1) 2',
    '2. Apremio Ejecutivo Obligación de Dar 4',
    '2.1. (REQ)Requerimiento de Pago: Requerimiento de pago - 10/02/2025 (Folio 3) 4',
    '2.2. [NULO] Resolución: Mero trámite - 01/03/2025 (Folio 4) 5',
  ].join('\n'),
  'NOMENCLATURA : 1. [67]Ordena despachar mandamiento\nSantiago, cinco de enero de dos mil veinticinco\nDespáchese.\nPágina 1',
  'Tribunal: 9° Juzgado Civil de Santiago\nEN LO PRINCIPAL: demanda ejecutiva\nAna Maria Soto Rojas, abogada, por ACME SpA\nPágina 2',
  'sigue la demanda\nPágina 3',
  'FOJA: 8 .- ocho .-\nNOMENCLATURA : 1. [68]Requerimiento de pago\nPágina 4',
  'NOMENCLATURA : 1. [445]Mero trámite\nPágina 5',
];

caso('reconoce el ebook por su tabla de contenidos', () => assert.ok(esEbook(EBOOK)));

caso('lee la ficha aunque traiga varios campos por linea', () => {
  const f = leerFicha(EBOOK);
  assert.equal(f.rol, 'C-1111-2025');
  assert.equal(f.etapa, 'Terminada');
  assert.equal(f.estadoProcesal, 'Concluido');
  assert.equal(f.procedimiento, 'Ejecutivo Obligación de Dar');
});

caso('lee los litigantes, con nombres que siguen en la linea de abajo', () => {
  const l = leerLitigantes(EBOOK);
  assert.equal(l.find((x) => x.codigo === 'AB.DTE').nombre, 'ANA MARIA SOTO ROJAS');
  assert.equal(l.find((x) => x.codigo === 'DDO.').rol, 'demandado');
});

caso('lee el indice, con etiquetas de codigo como (REQ) y piezas [NULO]', () => {
  const { entradas, cuadernos } = leerTablaContenidos(EBOOK);
  assert.equal(cuadernos.length, 2);
  const req = entradas.find((e) => e.folio === 3);
  assert.equal(req.clase, 'requerimiento de pago');
  assert.equal(req.titulo, 'Requerimiento de pago');
  assert.ok(entradas.find((e) => e.folio === 4).nulo);
  assert.equal(entradas.find((e) => e.folio === 1).proveidoPor, '1.1');
});

caso('calcula el desfase entre pagina del ebook y pagina del PDF', () => {
  assert.equal(desfase(EBOOK).desfase, 2);
});

caso('ubica cada pieza en su pagina del PDF', () => {
  const { piezas } = piezasDeEbook(EBOOK);
  const demanda = piezas.find((p) => p.titulo === 'Ingreso demanda');
  assert.equal(demanda.desde, 4);
  assert.equal(demanda.hasta, 5);
  assert.equal(demanda.cuaderno, 'Principal');
});

caso('atribuye el escrito a la PARTE por la firma del abogado', () => {
  const a = atribuir(EBOOK[3], leerLitigantes(EBOOK));
  assert.equal(a.parte, 'demandante');
});

console.log('\nExpediente del CAM');

const CAM = [
  [
    'Solicitud de Arbitraje Internacional',
    'ID N°12',
    'Fecha Ingreso: 01/02/2025',
    'Datos Parte Solicitante',
    'Nombres o Razón Social Tipo de Persona Nacionalidad',
    'Proveedora Norte Ltd. Juridica Canada',
    'Datos Parte Solicitada',
    'Nombres o Razón Social Tipo de Persona Nacionalidad',
    'Constructora Sur SpA Juridica Chile',
    'CENTRO DE ARBITRAJE Y MEDIACIÓN (CAM) DE LA CÁMARA DE COMERCIO DE SANTIAGO (CCS)',
    'Referencia del acuerdo de arbitraje o cláusula arbitral en que se funda la solicitud',
    'Contrato de suministro de 2023. Cláusula 20 sobre arbitraje.',
    'Descripción general de la naturaleza del conflicto',
    'La solicitada no pago dos facturas.',
    'Industria Tipo contrato Pretensión',
    'Cuantía Monto Moneda',
    'Determinada 500000 US',
    'Sede Ley aplicable Normas jurídicas aplicables al',
    'fondo de la controversia',
    'Chile Chile Arts. 1489, 1556 del',
    'Código Civil',
    'Idioma del arbitraje',
  ].join('\n'),
  'En Santiago de Chile, a 3 de marzo de 2025.\nRol CAM : A-1234-2025\nTengase presente.',
];

caso('reconoce un expediente del CAM', () => assert.ok(esCAM(CAM)));

caso('lee la ficha del arbitraje desde el formulario de solicitud', () => {
  const s = leerSolicitud(CAM);
  assert.equal(s.rol, 'A-1234-2025');
  assert.equal(s.internacional, true);
  assert.deepEqual(s.solicitante, { nombre: 'Proveedora Norte Ltd.', tipo: 'juridica', nacionalidad: 'Canada' });
  assert.equal(s.solicitada.nombre, 'Constructora Sur SpA');
  assert.deepEqual(s.cuantia, { clase: 'Determinada', monto: '500000', moneda: 'US' });
  assert.equal(s.leyAplicable, 'Chile');
  assert.match(s.normasInvocadas, /1489, 1556 del Código Civil/);
  assert.match(s.clausula, /Cláusula 20/);
});

console.log(`\n${ok} de ${ok + fallas.length} pruebas pasaron.\n`);
process.exit(fallas.length ? 1 : 0);
