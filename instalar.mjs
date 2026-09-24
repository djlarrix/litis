#!/usr/bin/env node
/**
 * Instala litis como skill de Claude Code.
 *
 *   node instalar.mjs
 *
 * Deja la skill en ~/.claude/skills/litis, que es donde Claude Code la busca, e
 * instala ahi su unica dependencia. Si este repo YA esta clonado en esa ruta,
 * no copia nada: solo instala.
 *
 * Tambien intenta dejar el comando `litis` en ~/.local/bin. Si esa carpeta no
 * esta en el PATH lo dice, y no pasa nada: los comandos funcionan igual
 * escribiendo la ruta completa, que es como estan en SKILL.md.
 */
import { existsSync, mkdirSync, cpSync, writeFileSync, chmodSync, realpathSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { homedir, platform } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const c = { ok: '\x1b[32m', aviso: '\x1b[33m', mal: '\x1b[31m', tenue: '\x1b[90m', fin: '\x1b[0m' };
const paso = (t) => console.log(`\n${t}`);
const bien = (t) => console.log(`  ${c.ok}ok${c.fin}    ${t}`);
const nota = (t) => console.log(`        ${c.tenue}${t}${c.fin}`);
let errores = 0;
const mal = (t) => { console.log(`  ${c.mal}!${c.fin}     ${t}`); errores++; };

const origen = dirname(fileURLToPath(import.meta.url));
const destino = join(homedir(), '.claude', 'skills', 'litis');

console.log('\nlitis — analisis de expedientes para Claude Code\n' + '─'.repeat(48));

/* 1. Node */
paso('1. Node.js');
const version = Number(process.versions.node.split('.')[0]);
if (version >= 18) bien(`v${process.versions.node}`);
else mal(`Node ${process.versions.node} es muy antiguo. Hace falta 18 o superior (nodejs.org, version LTS).`);

/* 2. La skill en su sitio */
paso('2. La skill');
const mismoSitio = existsSync(destino) && realpathSync(destino) === realpathSync(origen);
if (mismoSitio) {
  bien('ya esta en ~/.claude/skills/litis');
} else {
  try {
    mkdirSync(dirname(destino), { recursive: true });
    for (const cosa of ['SKILL.md', 'referencias', 'scripts', 'package.json', 'README.md', 'LICENSE', 'instalar.mjs']) {
      const de = join(origen, cosa);
      if (existsSync(de)) cpSync(de, join(destino, cosa), { recursive: true });
    }
    bien(`copiada a ~/.claude/skills/litis`);
  } catch (e) {
    mal(`no se pudo copiar: ${e.message}`);
  }
}

/* 3. Dependencias */
paso('3. Dependencias');
if (existsSync(join(destino, 'node_modules', 'pdfjs-dist'))) {
  bien('pdfjs-dist ya esta');
} else {
  try {
    // --omit=optional deja fuera @napi-rs/canvas, 25 MB que pdfjs solo usa para
    // dibujar paginas como imagen. Aqui nunca se dibuja nada: se extrae texto.
    execSync('npm install --omit=dev --omit=optional --silent', { cwd: destino, stdio: 'ignore' });
    bien('pdfjs-dist instalado');
  } catch {
    mal('fallo `npm install`. Corrigelo a mano en ~/.claude/skills/litis');
  }
}

/* 4. El comando, si se puede */
paso('4. El comando litis');
if (platform() === 'win32') {
  // En Windows no se deja atajo: Claude usa la ruta completa, que es la que
  // trae SKILL.md, y funciona igual.
  bien('no hace falta: Claude usa la ruta completa');
} else {
  const bin = join(homedir(), '.local', 'bin');
  try {
    mkdirSync(bin, { recursive: true });
    const atajo = join(bin, 'litis');
    writeFileSync(atajo, `#!/bin/sh\nexec "${process.execPath}" "${join(destino, 'scripts', 'expediente.mjs')}" "$@"\n`);
    chmodSync(atajo, 0o755);
    if ((process.env.PATH || '').split(':').includes(bin)) {
      bien('disponible como `litis`');
    } else {
      bien('creado en ~/.local/bin/litis');
      nota('No hace falta para usarlo desde Claude. Si ademas lo quieres en tu terminal,');
      nota('agrega esta linea a ~/.zshrc:  export PATH="$HOME/.local/bin:$PATH"');
    }
  } catch (e) {
    nota(`no se pudo crear el atajo (${e.message}). No es necesario.`);
  }
}

/* 5. Comprobacion */
paso('5. Comprobacion');
try {
  execSync(`"${process.execPath}" "${join(destino, 'scripts', 'expediente.mjs')}" casos`, { stdio: 'ignore' });
  bien('la herramienta responde');
} catch {
  mal('la herramienta no corrio. Prueba a mano: node ~/.claude/skills/litis/scripts/expediente.mjs ayuda');
}

console.log('\n' + '─'.repeat(48));
if (errores) {
  console.log(`${c.mal}Quedaron ${errores} cosa(s) por resolver.${c.fin}\n`);
  process.exit(1);
}
console.log(`${c.ok}Listo.${c.fin} Si Claude Code estaba abierto, cierralo y abrelo de nuevo. Despues dile:\n`);
console.log(`  ${c.tenue}"analiza este expediente: /ruta/al/ebook.pdf"${c.fin}\n`);
console.log(`${c.tenue}Para actualizar, vuelve a correr el mismo comando con que instalaste.${c.fin}\n`);
