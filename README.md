# litis

**Lee el expediente completo y te dice dónde se gana.**

Una skill para [Claude Code](https://claude.com/claude-code) que analiza un expediente judicial chileno —el *ebook* que se descarga de la Oficina Judicial Virtual— o un expediente arbitral del CAM Santiago, y entrega estrategia con cada afirmación respaldada en su folio y su página.

## Para qué sirve

Un expediente trae entre cien y dos mil páginas. Nadie lo lee entero con la atención que merece, y lo que se lee primero —la demanda, escrita para convencer— no es lo que decide: lo que decide está en la prueba, en una resolución de mero trámite o en lo que la contraparte dejó de contestar.

Le pasas el PDF a Claude y litis hace dos cosas:

1. **Ordena el expediente.** Lo parte en piezas —demanda, contestación, resoluciones, prueba, sentencia— con su folio, su fecha, su cuaderno y quién la presentó. En un ebook del Poder Judicial usa el índice que trae el propio sistema; en un expediente del CAM lee la ficha del formulario de solicitud.
2. **Lo analiza como un litigante.** Reconstruye la teoría del caso de cada lado, identifica **el punto que decide**, busca las debilidades de argumentación y las debilidades legales, dice por dónde atacar y qué se puede hacer todavía, y cierra con lo que el cliente de verdad pregunta: **¿litigar, transar o cobrar?**

Cada afirmación va con su cita —*"folio 14, fojas 37, p. 41"*— para que se compruebe en diez segundos.

## Un ejemplo

*(Ilustrativo: el caso es inventado.)*

```
Tú:      analiza este expediente: ~/Descargas/C-1234-2025.pdf

Claude:  [ebook del Poder Judicial · 412 páginas · 2 cuadernos · 88 piezas]

         ## Marcador
         El punto que decide es uno solo: la ejecutada fue requerida de pago
         (folio 14, p. 37) y opuso excepciones fuera de plazo (folio 16, p. 41).
         Si la oposición es extemporánea, la discusión de fondo terminó ahí.

         ## Lo que casi nadie vio
         La ejecutada pagó el capital demandado (folio 31, p. 88), pero el pago
         se imputa primero a intereses (art. 1595 del Código Civil, verificado
         en Ley Chile): quedó debiendo capital, y el juicio siguió.
         ...
```

## Instalación

Necesitas **Claude Code** —en la terminal o en la pestaña *Code* de la app de escritorio de Claude— y **[Node.js](https://nodejs.org) 18 o superior** (la versión LTS).

**Mac o Linux** — en la Terminal:

```bash
curl -fsSL https://raw.githubusercontent.com/djlarrix/litis/main/instalar.sh | sh
```

**Windows** — en PowerShell:

```powershell
irm https://raw.githubusercontent.com/djlarrix/litis/main/instalar.ps1 | iex
```

**Con git**, si lo prefieres:

```bash
git clone https://github.com/djlarrix/litis ~/.claude/skills/litis && node ~/.claude/skills/litis/instalar.mjs
```

Después **cierra y vuelve a abrir Claude Code**. Para actualizar, repite el mismo comando. Para desinstalar, borra la carpeta `~/.claude/skills/litis` (y `~/.litis`, si quieres borrar también lo que indexaste).

## Cómo se usa

Descarga el expediente como PDF y pídeselo a Claude con tus palabras:

- *"Analiza este expediente: ~/Descargas/ebook.pdf"*
- *"¿Cómo estamos parados en esta causa?"*
- *"¿Cuál es el punto que decide este arbitraje?"*
- *"¿Opusieron excepciones? ¿Cuándo?"*
- *"Prepárame las observaciones a la prueba."*
- *"¿Conviene transar? Haz la cuenta."*
- *"¿Qué recurso procede contra esta sentencia, y hasta cuándo?"*

Claude reconoce el encargo y adapta la respuesta: una duda puntual se contesta en dos párrafos con su folio; una evaluación del caso, con el informe completo.

## Qué expedientes lee

| | Cómo lo lee |
|---|---|
| **Ebook del Poder Judicial** (Oficina Judicial Virtual) | Usa la tabla de contenidos del propio ebook: cada pieza con su cuaderno, folio, fecha y foja; la ficha de la causa (procedimiento, etapa, estado); quién es quién; las resoluciones anuladas `[NULO]` |
| **Expediente del CAM Santiago** | Lee el formulario de solicitud —partes, cuantía, ley aplicable, normas invocadas, cláusula arbitral— y corta las piezas por patrones, respetando la paginación propia de cada escrito |
| **Cualquier otro PDF** | Corta por patrones y declara con cuánta confianza abrió cada pieza |

Calibrado contra expedientes reales de los dos tipos.

### Además, repara el texto

Estos PDF salen mal de cualquier extractor, y cada defecto rompe la búsqueda sin avisar:

- **La tilde se dibuja aparte de su palabra.** El texto sale `Mero tr mite á` y buscar "trámite" no encuentra nada. litis devuelve cada tilde a su hueco usando las coordenadas del PDF.
- **Los escritos vienen de a una o dos letras.** Una demanda salía como `D e m and a e je c u t i v a`. La separación se decide midiendo el hueco real entre fragmentos.
- **Páginas que no se pueden leer**, de dos clases: imágenes escaneadas sin OCR, y páginas con **texto ilegible** —la fuente no trae mapa de caracteres—, que parecen revisadas y no lo están. litis las cuenta, las lista una por una y dice cómo arreglar cada clase.

## El método

Un análisis bueno describe. Uno excelente **decide**. [`SKILL.md`](SKILL.md) es lo que Claude sigue:

- **Entender el problema antes que los escritos**: qué se pide, en qué procedimiento, en qué estado, cuántos cuadernos, quién es quién.
- **Alegado, probado, asentado**: para que el relato de la demanda no entre al informe como si fueran hechos.
- **Las dos teorías del caso**, sometidas a las mismas seis pruebas. Gana la que explica más hechos con menos supuestos.
- **El punto que decide**, dicho en una frase.
- **Debilidades de argumentación**: el salto de premisa a conclusión, la calificación forzada, la norma que no dice lo que se le atribuye, la contradicción interna, el argumento que prueba demasiado, el silencio elocuente.
- **Debilidades legales**: título, legitimación, prescripción, vicios y su preclusión.
- **Dos jugadas adelante**: cada ataque se mide por lo que queda de él después de la mejor respuesta del contrario.
- **Litigar, transar o cobrar**, incluida la parte que casi todos omiten: ganar un juicio incobrable.

Con fichas de apoyo en [`referencias/`](referencias/):

| | |
|---|---|
| [`teoria-del-caso.md`](referencias/teoria-del-caso.md) | Cómo se arma y cómo se destruye una teoría del caso |
| [`procedimientos.md`](referencias/procedimientos.md) | Ejecutivo, ordinario, sumario, laboral: qué cambia en cada uno |
| [`prueba.md`](referencias/prueba.md) | Cómo se mide la prueba y por dónde se ataca cada medio |
| [`procesal-civil.md`](referencias/procesal-civil.md) | Plazos, preclusión, nulidad, recursos, abandono |
| [`decision.md`](referencias/decision.md) | Litigar, transar o cobrar; cobrabilidad y ventana de acuerdo |
| [`sentencia-y-recursos.md`](referencias/sentencia-y-recursos.md) | Leer una sentencia para recurrirla; elegir la vía |
| [`escritos.md`](referencias/escritos.md) | Cómo se redacta el escrito que gana |
| [`arbitraje-cam.md`](referencias/arbitraje-cam.md) | Lo que cambia en un arbitraje |

**Normas y fallos, solo verificados.** litis no cita de memoria. Si en tu Claude hay un conector de fuentes jurídicas chilenas —legislación, jurisprudencia, dictámenes; por ejemplo, Responsa—, lo usa para leer el texto vigente de la norma y comprobar los fallos que invocan las partes. Si no lo hay, lo dice y no rellena: el análisis del expediente se sostiene igual, porque los hechos y la prueba salen del propio PDF.

## Qué no hace

- **No reemplaza al abogado.** Es un análisis del expediente, no una opinión legal. Lo que no quedó escrito —lo que contó el cliente, lo que se habló con la contraparte— no está en el PDF, y muchas veces es lo que decide.
- **No entra a la Oficina Judicial Virtual ni al CAM.** Trabaja sobre el PDF que le das.
- **No hace OCR.** Te dice qué páginas no pudo leer y cómo arreglarlas: `ocrmypdf --skip-text` para las escaneadas, `ocrmypdf --force-ocr` para las de texto ilegible.

## Privacidad

El PDF se procesa en tu computador. El texto extraído queda en `~/.litis`, con permisos solo para tu usuario, y se borra con `litis olvidar <nombre>`.

Ten presente que el análisis lo hace Claude, un modelo de Anthropic: **los fragmentos que Claude lee viajan como parte de la conversación**. Si el asunto es reservado, decídelo antes de indexar, según la política de tu estudio y la configuración de tu cuenta.

## La herramienta, desde la terminal

Claude la usa sola, pero también funciona directo:

```bash
litis indexar "ebook.pdf"           # extrae el texto y arma el índice
litis piezas                        # el índice, por cuaderno
litis piezas --cuaderno apremio     # un cuaderno
litis piezas --clase escrito        # solo lo que presentaron las partes
litis partes                        # quién es quién
litis ver "#12"                     # una pieza completa
litis ver 96-118                    # un rango de páginas
litis buscar "excepción de pago"    # tolerante a tildes y palabras partidas
litis cronologia
litis revisar                       # qué tan fiable quedó el indexado
litis casos                         # qué hay indexado
litis olvidar <nombre>              # borrarlo
```

Si `litis` no está en tu `PATH`, es lo mismo que `node ~/.claude/skills/litis/scripts/expediente.mjs`.

## Para quien quiera mejorarla

```bash
npm test
```

Las pruebas usan texto inventado —nunca expedientes reales— y cada una reproduce un defecto que apareció al calibrar la herramienta contra causas de verdad.

Si tu expediente sale mal cortado, `litis revisar` dice dónde. Las reglas de segmentación están en [`scripts/lib/patrones.mjs`](scripts/lib/patrones.mjs), comentadas una por una: cada señal suma puntos y la pieza se abre al pasar el umbral. Si encuentras un patrón que funciona bien en tu tribunal, un *pull request* es bienvenido. **Nunca subas un expediente real** al repositorio ni a un issue.

## Licencia

MIT.
