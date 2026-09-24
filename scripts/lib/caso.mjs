/**
 * Donde queda lo indexado.
 *
 * Todo vive en el computador, en ~/.litis, y nada sale de ahi: un expediente
 * trae nombres, domicilios, rut y cifras de gente que no dio permiso para que
 * su juicio viaje a ninguna parte. El indexado es texto extraido del PDF, asi
 * que la carpeta merece el mismo cuidado que el expediente mismo. Se crea con
 * permisos 700 y se borra con `litis olvidar`.
 */
import { mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync, rmSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, basename } from 'node:path';

export const RAIZ = process.env.LITIS_DATOS || join(homedir(), '.litis');

export function slug(texto) {
  return (texto || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\.pdf$/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60) || 'expediente';
}

export function carpetaDe(nombre) {
  return join(RAIZ, slug(nombre));
}

export function guardar(nombre, { paginas, indice }) {
  const carpeta = carpetaDe(nombre);
  mkdirSync(RAIZ, { recursive: true, mode: 0o700 });
  mkdirSync(carpeta, { recursive: true, mode: 0o700 });
  writeFileSync(join(carpeta, 'paginas.json'), JSON.stringify(paginas), { mode: 0o600 });
  writeFileSync(join(carpeta, 'indice.json'), JSON.stringify(indice, null, 2), { mode: 0o600 });
  return carpeta;
}

export function cargar(nombre) {
  const carpeta = carpetaDe(nombre);
  const fIndice = join(carpeta, 'indice.json');
  const fPaginas = join(carpeta, 'paginas.json');
  if (!existsSync(fIndice) || !existsSync(fPaginas)) return null;
  return {
    carpeta,
    indice: JSON.parse(readFileSync(fIndice, 'utf8')),
    paginas: JSON.parse(readFileSync(fPaginas, 'utf8')),
  };
}

export function listar() {
  if (!existsSync(RAIZ)) return [];
  return readdirSync(RAIZ)
    .filter((d) => existsSync(join(RAIZ, d, 'indice.json')))
    .map((d) => {
      const indice = JSON.parse(readFileSync(join(RAIZ, d, 'indice.json'), 'utf8'));
      return {
        slug: d,
        archivo: basename(indice.archivo || ''),
        paginas: indice.totalPaginas,
        piezas: indice.piezas?.length || 0,
        indexado: indice.indexado,
      };
    })
    .sort((a, b) => String(b.indexado).localeCompare(String(a.indexado)));
}

export function olvidar(nombre) {
  const carpeta = carpetaDe(nombre);
  if (!existsSync(carpeta)) return false;
  rmSync(carpeta, { recursive: true, force: true });
  return true;
}

/**
 * El caso con el que trabajar cuando no se dijo cual.
 *
 * Si hay uno solo, es ese: obligar a escribir el nombre en cada comando solo
 * produce errores de tipeo. Si hay varios, se exige elegir.
 */
export function resolverCaso(pedido) {
  if (pedido) {
    const c = cargar(pedido);
    if (!c) throw new Error(`No hay ningun expediente indexado como "${slug(pedido)}". Mira cuales hay con: litis casos`);
    return c;
  }
  const casos = listar();
  if (casos.length === 0) throw new Error('No hay ningun expediente indexado todavia. Empieza con: litis indexar <archivo.pdf>');
  if (casos.length > 1) {
    throw new Error(
      'Hay varios expedientes indexados y no dijiste cual:\n  ' +
        casos.map((c) => `${c.slug} (${c.paginas} pp.)`).join('\n  ') +
        '\nAgrega --caso <nombre>.',
    );
  }
  return cargar(casos[0].slug);
}

export function tamano(ruta) {
  try {
    return statSync(ruta).size;
  } catch {
    return 0;
  }
}
