# Instala (o actualiza) litis en Windows, sin necesitar git. En PowerShell:
#
#   irm https://raw.githubusercontent.com/djlarrix/litis/main/instalar.ps1 | iex
#
# Baja la ultima version desde GitHub, la deja en %USERPROFILE%\.claude\skills\litis
# —donde Claude Code busca sus skills— e instala su unica dependencia.
$ErrorActionPreference = 'Stop'

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host ""
  Write-Host "  Falta Node.js, que es lo que hace funcionar la herramienta."
  Write-Host "  Descargalo de https://nodejs.org (la version LTS), instalalo,"
  Write-Host "  abre una ventana nueva de PowerShell y vuelve a correr esto."
  Write-Host ""
  return
}

$destino = Join-Path $HOME '.claude\skills\litis'
$temporal = Join-Path ([IO.Path]::GetTempPath()) ('litis-' + [guid]::NewGuid())
New-Item -ItemType Directory -Path $temporal | Out-Null
try {
  Write-Host 'Descargando litis...'
  $zip = Join-Path $temporal 'litis.zip'
  Invoke-WebRequest 'https://github.com/djlarrix/litis/archive/refs/heads/main.zip' -OutFile $zip -UseBasicParsing
  Expand-Archive $zip -DestinationPath $temporal
  New-Item -ItemType Directory -Force -Path $destino | Out-Null
  Copy-Item -Recurse -Force (Join-Path $temporal 'litis-main\*') $destino
} finally {
  Remove-Item -Recurse -Force $temporal -ErrorAction SilentlyContinue
}

node (Join-Path $destino 'instalar.mjs')
