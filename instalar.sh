#!/bin/sh
# Instala (o actualiza) litis en Mac o Linux, sin necesitar git:
#
#   curl -fsSL https://raw.githubusercontent.com/djlarrix/litis/main/instalar.sh | sh
#
# Baja la ultima version desde GitHub, la deja en ~/.claude/skills/litis —que
# es donde Claude Code busca sus skills— e instala su unica dependencia.
# Volver a correrlo actualiza: reemplaza los archivos y conserva lo indexado,
# que vive aparte, en ~/.litis.
set -e

DESTINO="$HOME/.claude/skills/litis"
PAQUETE="https://github.com/djlarrix/litis/archive/refs/heads/main.tar.gz"

if ! command -v node >/dev/null 2>&1; then
  echo ""
  echo "  Falta Node.js, que es lo que hace funcionar la herramienta."
  echo "  Descargalo de https://nodejs.org (la version LTS), instalalo como"
  echo "  cualquier programa, abre una terminal nueva y vuelve a correr esto."
  echo ""
  exit 1
fi

TEMPORAL=$(mktemp -d)
trap 'rm -rf "$TEMPORAL"' EXIT

echo "Descargando litis..."
curl -fsSL "$PAQUETE" | tar -xz -C "$TEMPORAL"
mkdir -p "$DESTINO"
cp -R "$TEMPORAL"/litis-main/. "$DESTINO"/

node "$DESTINO/instalar.mjs"
