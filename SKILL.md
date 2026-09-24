---
name: litis
description: Analiza un expediente judicial chileno —el "ebook" o cuaderno completo descargado de la Oficina Judicial Virtual— o un expediente arbitral del CAM, y entrega estrategia con respaldo en el propio expediente: cual es el problema de verdad, que teoria del caso tiene cada lado, cual es el punto que decide, que debilidades de argumentacion y que debilidades legales hay, por donde atacar, que prueba falta, que se puede hacer todavia y si conviene litigar, transar o cobrar. Usala cuando alguien suba o apunte a un expediente, ebook, cuaderno, carpeta electronica o expediente del CAM, y cuando pida evaluar un caso, medir el riesgo de un juicio, preparar una estrategia, escribir observaciones a la prueba, preparar un recurso o alegatos, decidir si transar, o saber como viene el pleito.
---

# Analizar un expediente y decir donde se gana

Un analisis bueno describe. Uno excelente **decide**: dice que hacer, que no hacer y por que, y se hace cargo de lo que pasa si se equivoca.

Todo lo que sigue apunta a eso. La diferencia entre las dos cosas no esta en saber mas derecho: esta en concentrarse en el punto que decide el caso, apoyar cada afirmacion en el expediente y llegar hasta la recomendacion en vez de detenerse en el diagnostico.

## Que te pidieron, exactamente

Antes de nada, mira que clase de encargo es. Cambia el trabajo entero:

| Te piden | Lo que hay que entregar |
|---|---|
| **Evaluar el caso** | El informe completo de mas abajo. |
| **Una duda puntual** ("¿opusieron excepciones?") | La respuesta, con su folio, en dos parrafos. Nada mas. |
| **Preparar un escrito** | El escrito, con la forma de `referencias/escritos.md`. El analisis va por dentro, no por delante. |
| **Decidir si transar** | La cuenta de `referencias/decision.md`, arriba y sin rodeos. |
| **Preparar un recurso** | El mapa de `referencias/sentencia-y-recursos.md`: agravio, via, plazo. |
| **Que salio mal** | Reconstruccion cronologica con los puntos de quiebre y que se pudo hacer distinto. |

Si la peticion es ambigua, haz la parte que es comun a todas las lecturas —indexar, entender el problema, identificar el punto que decide— y pregunta al final, no al principio.

## Primero se indexa. Nunca se lee el PDF a ciegas

Un cuaderno de la Oficina Judicial Virtual trae entre cien y dos mil paginas. Volcarlo entero es imposible, y leerlo "por encima" es peor: se retiene la demanda, que va primero y esta escrita para convencer, y se pierde la prueba, que va al final y es la que decide.

```bash
litis indexar "/ruta/al/cuaderno.pdf"
```

**Si `litis` no existe en el PATH**, es lo mismo que escribir la ruta completa, y asi funciona siempre:

```bash
node ~/.claude/skills/litis/scripts/expediente.mjs indexar "/ruta/al/cuaderno.pdf"
```

`indexar` reconoce solo el formato y lo dice: **ebook del Poder Judicial** (usa su propia tabla de contenidos), **expediente del CAM** (lee la ficha del formulario de solicitud y corta las piezas por patrones) o **cualquier otro PDF** (corta por patrones y declara con cuanta confianza).

Con el indice a la vista se elige que leer:

```bash
litis piezas                          # el indice completo, por cuaderno
litis piezas --cuaderno apremio       # un cuaderno
litis piezas --clase escrito          # solo lo que presentaron las partes
litis partes                          # quien es quien, con su rol procesal
litis ver "#12"                       # una pieza entera
litis buscar "excepcion de pago"
litis cronologia
litis revisar                         # que tan fiable quedo el indexado
```

**Corre `revisar` antes de empezar y di en el informe lo que devuelva.** Un expediente con paginas que no se pueden leer es un expediente que no leiste entero, y una conclusion sacada de ahi —"no hay prueba del pago"— puede ser exactamente al reves. Hay dos clases, y `revisar` las separa:

- **Imagen sin OCR**: documentos escaneados. Se arreglan con `ocrmypdf --skip-text`.
- **Texto ilegible**: la pagina tiene capa de texto, pero es basura porque la fuente no trae mapa de caracteres. Es la mas traicionera, porque parece revisada. `--skip-text` la salta; necesita `ocrmypdf --force-ocr`.

## Entender el problema antes que los escritos

El error de fondo no es equivocarse en un articulo: es analizar con precision el pleito equivocado. Antes de leer una sola alegacion, contesta cinco preguntas con el indice y la ficha de la causa delante:

1. **¿Que se pide, contra quien y por cuanto?** El petitorio, no el relato.
2. **¿En que procedimiento?** La ficha lo dice (`Procedimiento: Ejecutivo Obligacion de Dar`, `Ordinario`, `Sumario`). **Cambia todo**: plazos, que se puede alegar, cuando precluye, que prueba se admite, que recursos quedan. Ficha: `referencias/procedimientos.md`.
3. **¿En que estado esta?** Si la ficha dice **Terminada / Concluido**, la pregunta ya no es como ganar: es que paso, que quedo pendiente —cumplimiento, costas, honorarios, alzamientos— y si algo es todavia atacable.
4. **¿Cuantos cuadernos hay, y estan todos?** Un ejecutivo tiene principal y apremio, y puede tener tercerias por cuerda separada. Si el PDF trae uno solo, falta media historia.
5. **¿Quien es quien?** `litis partes`. Ojo con los **terceros**: un tercerista que aparece a mitad del expediente suele ser el verdadero problema, y no esta en la caratula.

## La regla que manda sobre todas

**Cada afirmacion sobre el expediente va con su referencia, pegada.** No al final del parrafo ni en una lista de fuentes: entre parentesis, ahi mismo.

La cita que sirve en un expediente chileno es **el folio** —asi lo busca el abogado en la Oficina Judicial Virtual— y, cuando consta, **la foja**, que es como se cita ante el tribunal. Agrega la pagina del PDF para comprobarlo ahora mismo:

> La ejecutada no opuso excepciones dentro de plazo (folio 12, fojas 31, p. 17).

En un expediente sin folio —el del CAM, uno armado a mano— se cita por fecha y pagina.

Y nunca afirmes lo que no leiste. El indice dice que la pieza 15 es un "Informe"; eso no te autoriza a decir que concluye. **Si no abriste la pieza, no opinas sobre su contenido.** Lo mismo con la columna `menciona:`: dice que esas palabras aparecen ahi, no que el tramite haya ocurrido.

### Alegado, probado, asentado: no son lo mismo

Es el error que hunde estos analisis, y es dificil de ver porque el texto resultante suena bien. Se lee la demanda —escrita para que su version parezca la unica posible— y se reproduce su relato como si fueran los hechos del caso.

- **Alegado** — una parte lo afirmo. Vale como postura, no como hecho.
- **Probado** — hay prueba rendida que lo sostiene. Di cual, y si fue objetada o tachada.
- **Asentado** — el tribunal lo tuvo por acreditado. Ya no se discute salvo por via de recurso.

Cuando dudes entre los tres, usa el mas debil.

## Leer un ebook del Poder Judicial

Cuando el PDF es un ebook, `litis` usa la tabla de contenidos que el propio sistema escribio. Eso da cuatro cosas que hay que aprovechar:

- **El folio y la foja de cada pieza**, que son las citas que sirven.
- **El cuaderno al que pertenece.** Un hecho del cuaderno de apremio no prueba lo mismo que uno del principal.
- **La relacion resolucion - escrito.** El indice anida cada escrito bajo la resolucion que lo provee. Leerlos juntos ahorra la mitad del trabajo: el escrito pide, la resolucion concede o niega, y ahi esta el resultado real de cada gestion.
- **Las piezas marcadas `[NULO]`**, que el sistema anulo. **No las cites como vigentes**, y averigua por que se anularon: una nulidad a mitad del expediente casi siempre explica el resto.

Ojo con las fechas: la del indice es la del tramite, no la de su notificacion. **Los plazos corren desde la notificacion.**

## Leer un expediente del CAM

El expediente del Centro de Arbitraje y Mediacion no trae indice, pero trae algo que en un arbitraje vale mas: **el formulario de solicitud**, que el centro estructura en campos. `litis indexar` lo lee y lo muestra; `litis partes` agrega la descripcion del conflicto.

- **Partes, cuantia y moneda.** La cuantia fija lo que se discute y pesa en los costos del arbitraje.
- **Ley aplicable y normas que el solicitante invoca.** Es el mapa de su teoria del caso, dicho por el. Contrastala temprano con la contestacion: si la demandada discute la ley aplicable, ese es muchas veces el punto que decide.
- **La clausula arbitral.** La competencia del tribunal se mide contra ella. Leela entera —esta en el contrato acompanado— antes de opinar sobre el fondo.
- **Si es internacional.** El formulario lo dice en su titulo. Un arbitraje comercial internacional tiene su propia ley y un regimen de nulidad del laudo distinto del interno: no lo analices con las reglas de un arbitraje domestico. Ficha: `referencias/arbitraje-cam.md`.

**La descripcion del conflicto y las normas invocadas son la version del solicitante**, escrita para iniciar el arbitraje: alegado, no probado.

Las piezas se cortan por patrones. La herramienta usa la paginacion propia de cada escrito para no partirlo, y separa los anexos escaneados, pero **mira las piezas que `revisar` marca como debiles** antes de apoyarte en ellas. Y como aqui no hay folio, **se cita por fecha y pagina**: *"resolucion de 31/07/2025, p. 260"*; *"contestacion, p. 285"*.

## El orden de lectura que rinde

No leas en orden cronologico: lee en orden de utilidad.

1. **La ficha y las partes.**
2. **La demanda, y dentro de ella el petitorio antes que los hechos.** En un ejecutivo, ademas: **cual es el titulo** y si trae aparejada ejecucion.
3. **La primera resolucion que la provee.** Dice si el tribunal la acogio tal como venia o le puso condiciones.
4. **La defensa** —contestacion en el ordinario, **oposicion de excepciones** en el ejecutivo—, buscando tres cosas: que niega, **que reconoce** —lo reconocido no se prueba, y es el regalo mas grande que se hace en un juicio— y que excepciones opone.
5. **La resolucion que recibe la causa a prueba.** Sus hechos sustanciales, pertinentes y controvertidos son el temario sobre el que se gana. Si no la hay, averigua por que: puede que no hubiera oposicion, y eso es la noticia.
6. **La prueba rendida, punto por punto**, no documento por documento.
7. **Las observaciones a la prueba de ambos.** Ahi cada abogado dice donde cree que esta debil el otro. Es inteligencia gratuita.
8. **La sentencia o la resolucion que termino el asunto.**
9. **El resto, por busqueda.**

## Las dos teorias del caso

Un expediente no es una pila de documentos: son dos relatos que compiten por explicar los mismos hechos, y **gana el que explica mas cosas con menos supuestos.**

Reconstruye las dos —proposicion factica, calificacion juridica, respaldo probatorio, petitorio— y sometelas a las mismas seis pruebas: completitud, coherencia interna, cobertura probatoria, explicacion de la prueba adversa, plausibilidad y economia. El metodo completo, con el test de las dos teorias y las alegaciones que se destruyen entre si, esta en **`referencias/teoria-del-caso.md`**.

Dos cosas que salen de ahi y valen el trabajo:

- **Las alegaciones incompatibles del contrario**, que se sostienen con sus propios escritos y no requieren prueba nueva.
- **El cambio de teoria a mitad del juicio**, que se detecta comparando la demanda con las observaciones a la prueba.

## El punto que decide

Casi todo caso se juega en **una sola cuestion**. El resto son acompanamiento. Un analisis que reparte atencion pareja entre ocho temas no ayuda a decidir: obliga al abogado a hacer el trabajo de jerarquizar, que es justamente lo que vino a buscar.

Encuentralo con esta pregunta: **¿que tendria que cambiar para que el resultado se diera vuelta?** Si cambiar un supuesto no mueve nada, ese supuesto no es el punto. Si cambiarlo cambia todo, ahi esta.

Dilo explicito, temprano y en una frase: *"esto se decide en si el requerimiento de pago fue valido; todo lo demas es secundario"*. Y despues **concentra el analisis ahi**, que es lo que lo hace util.

## El mapa: pretension, elementos, prueba

Por cada pretension y por cada excepcion, descomponla en los elementos que la ley exige, y por cada elemento responde tres preguntas:

| | |
|---|---|
| **Quien lo debe probar** | Por regla general, quien lo alega. Antes de afirmarlo, leelo en la norma. |
| **Que prueba hay** | Con su folio y pagina. Si no hay ninguna, dilo con esas palabras: no hay prueba. |
| **Cuanto aguanta** | Si el otro lado la objeto, la tacho o la contradijo con prueba propia. |

**Una pretension vale lo que vale su elemento mas debil.** Cuatro elementos impecables y uno sin prueba no es una pretension fuerte con un detalle: es una pretension perdida.

Como se mide la prueba y por donde es fragil cada medio: `referencias/prueba.md`.

## Debilidades de argumentacion

Un escrito puede estar bien escrito, bien citado y aun asi no probar lo que pretende. Cuando encuentres una de estas, **citala**: transcribe la frase y di que le falta.

- **El salto de la premisa a la conclusion.** Acredita A y concluye B, sin la norma que convierte A en B. "De que el vehiculo estuviera a nombre de X no se sigue que X lo poseyera al momento del embargo."
- **La calificacion juridica forzada.** Los hechos son ciertos y el nombre que se les pone no. Atacar la calificacion rinde mas que discutir los hechos: cambia la norma aplicable y con ella los requisitos y los plazos.
- **La norma que no dice lo que se le atribuye.** Articulo real, vigente, citado para una consecuencia que no establece.
- **El hecho alegado que nadie probo.** Aparece en la demanda, se repite en la replica, se da por sentado en las observaciones. La repeticion no acredita.
- **La contradiccion interna**, entre escritos distintos del mismo lado.
- **El documento que desmiente a quien lo acompano.** Pasa seguido, porque los documentos se acompanan en bloque y nadie los relee.
- **La inversion de la carga.** Reprocha al contrario no haber probado algo que era carga propia.
- **El argumento que prueba demasiado.** Si fuera correcto, tambien haria ganar casos que evidentemente se pierden.
- **La jurisprudencia que no calza.** El fallo existe y dice lo que se transcribe, pero resolvio otro supuesto, o quedo superado. Y en Chile **el precedente no vincula**: se cita porque persuade.
- **El silencio elocuente.** Lo que el contrario no discute. Un punto no controvertido es un punto ganado, y casi nadie lo aprovecha.

## Debilidades legales

Aqui no falla el razonamiento sino el derecho invocado.

- **Falta de legitimacion**, activa o pasiva. Sobrevive a todo lo demas.
- **Falta de un requisito de la accion.** Si falta uno, no hay nada que discutir sobre la prueba.
- **El titulo.** En el ejecutivo es la pregunta central: si no trae aparejada ejecucion, o la obligacion no es liquida, actualmente exigible y no prescrita, la ejecucion se cae entera.
- **Prescripcion y caducidad.** Se cuentan sobre las fechas del caso, no sobre las del expediente. Revisalas siempre, aunque nadie las haya alegado.
- **Nulidad del acto de fondo** —del contrato, del pagare, de la notificacion del protesto— frente a la nulidad procesal, que es otra cosa y tiene otras reglas.
- **Vicios procesales**: emplazamiento, notificacion, competencia, capacidad, ineptitud del libelo. Pueden terminar el juicio sin discutir el fondo, pero **casi todos precluyen y se convalidan**. Ficha: `referencias/procesal-civil.md`.
- **Cosa juzgada y litispendencia**, si el expediente menciona otra causa entre las mismas partes.

## Pensar dos jugadas adelante

Un ataque no vale por lo bueno que suena, sino por lo que queda de el **despues de la mejor respuesta del contrario**. Por cada via que pienses proponer, escribe en una linea como la contestaria un buen abogado del otro lado, y decide entonces:

- **Si muere con la primera respuesta**, no la propongas. Anotala como descartada y por que: eso tambien es informacion, y evita que alguien la vuelva a proponer en dos semanas.
- **Si sobrevive pero da al contrario una oportunidad que hoy no tiene** —le abre un plazo, lo obliga a acompanar prueba que le conviene, lo alerta de un defecto que puede sanear—, dilo. Hay ataques que despiertan al muerto.
- **Si sobrevive limpia**, esa va primero.

Lo mismo con lo que se pide: **antes de pedir algo, piensa que hara el tribunal con la peticion** y que queda si la rechaza.

## Quien esta mejor parado

Contestalo derecho, sin refugiarse en que todo depende, y **por pretension, no en bloque**: los juicios rara vez se ganan enteros, y un "esta 60-40" no sirve para decidir.

Por cada pretension: quien esta mejor, **por que elemento concreto** y **que tendria que pasar para que se de vuelta**. Esa ultima parte convierte el pronostico en una lista de cosas que hacer.

Usa bandas —muy probable, probable, incierto, improbable— y no porcentajes de dos decimales, que fingen una precision que no existe.

## Por donde atacar

Ordenado por lo que rinde, que casi nunca coincide con lo que entusiasma:

1. **El elemento sin prueba.** Lo mas barato que existe: basta mostrar el vacio y que la carga era del otro.
2. **El defecto del titulo o de la legitimacion.** Termina el asunto sin entrar al fondo.
3. **La carga mal asignada.**
4. **La prueba objetable**: documento privado de un tercero no reconocido, testigo con interes o dependencia, perito sin razon de sus dichos, prueba fuera de plazo.
5. **La contradiccion interna** entre escritos del mismo lado.
6. **Los vicios procesales**, con la advertencia de preclusion y convalidacion.
7. **Las citas del contrario**: que la norma este vigente en la redaccion aplicable y que los fallos digan lo que se les atribuye.
8. **Prescripcion, caducidad, abandono del procedimiento.**

**Atacar todo es no atacar nada.** Tres lineas bien sostenidas valen mas que once enumeradas: el escrito que las lleva todas obliga al tribunal a elegir por ti, y elige la mas debil. Y cuando lo que se ataca son varias cosas incompatibles entre si, **van en subsidio y se dice**: ver `referencias/escritos.md`.

## Los puntos debiles propios van primero

Antes de una sola linea de estrategia, escribe **el mejor alegato posible del otro lado**. No una caricatura: el que haria un buen abogado con ese material.

Y despues di, sin adornos, donde esta debil el lado de quien te pregunta. **Un informe que solo trae buenas noticias es inutil**: lo bueno de su caso el abogado ya se lo sabe, lo trajo el. Lo que necesita es lo que no vio, y eso casi siempre es una mala noticia.

Cuando el caso esta perdido en un punto, dilo. Sirve para transar, para acotar la pretension o para preparar el recurso, y las tres cosas requieren saberlo a tiempo.

## Que se puede hacer todavia

Una estrategia sin estado procesal es literatura. La excepcion perfecta que debio oponerse hace ocho meses no es una estrategia: es una lamentacion.

- **En que etapa esta**, con la ultima resolucion y su fecha.
- **Que plazos corren, y desde cuando.** Corren **desde la notificacion**: busca la actuacion del receptor o el estado diario antes de contar un dia.
- **Que precluyo.** Dilo igual: a veces es la unica explicacion honesta de por que el caso esta como esta.

Despues propon, separando lo de **esta semana**, lo de **este tramite** y lo que hay que **conseguir fuera del expediente** (un documento, un testigo, un peritaje de parte).

## Litigar, transar o cobrar

El cliente no pregunta si tiene razon: pregunta que le conviene. Un analisis que termina en "esta mejor posicionado" no contesto nada.

Cierra siempre con esa cuenta, aunque sea en tres frases: **lo que se puede recuperar de verdad** —monto por probabilidad de ganar por probabilidad de cobrar, menos los costos de llegar al final y el riesgo de costas— contra lo que cuesta seguir.

Y no olvides la parte que casi todos omiten: **ganar un juicio incobrable**. Los embargos con resultado negativo, las tercerias y los exhortos devueltos sin cumplir estan en el propio expediente y cambian la conversacion entera. Metodo completo: **`referencias/decision.md`**.

## Si ya hay sentencia

La pregunta cambia: no es quien tiene mejores argumentos, sino **que agravio concreto es atacable, por que via y si el plazo esta corriendo.** Se lee desde la parte resolutiva hacia atras, amarrando cada decision a los considerandos que la fundan, y distinguiendo lo que es un hecho asentado de lo que es calificacion juridica: de eso depende la via y ahi se pierden la mayoria de los recursos. **`referencias/sentencia-y-recursos.md`**.

## Verificar lo que citan las partes

Si en la sesion hay herramientas de fuentes juridicas chilenas —legislacion, jurisprudencia, dictamenes; por ejemplo las de **Responsa**—, usalas para:

1. **Leer la norma aplicable en su texto vigente**, y comprobar que sea la que regia al tiempo de los hechos. Una reforma intermedia cambia el resultado y no aparece en ningun escrito.
2. **Comprobar los fallos que cita el contrario**: que existan, que el rol corresponda y que el considerando diga lo que se le atribuye. Una cita que no resiste la comprobacion es un ataque devastador y barato.
3. **Buscar como han resuelto los tribunales** el punto que decide el caso, que es lo unico que convierte un pronostico en algo mas que una impresion.

**Sin esas herramientas, no cites normas ni fallos de memoria.** Un articulo con el numero cambiado dentro de un informe por lo demas correcto lo contamina entero, porque el lector no tiene como saber cual de las citas es la mala. Di "hay que comprobar el texto vigente de esto" y sigue: el analisis del expediente se sostiene igual, porque los hechos y la prueba salieron del cuaderno.

Los articulos de las fichas de `referencias/` son **punteros para ir a leer la norma**, no citas.

## Como se entrega el analisis

```markdown
## Marcador
Tres frases: quien esta mejor, en que pretension, por que elemento concreto.

## El punto que decide
Uno. En una frase.

## La causa en una pagina
Partes, procedimiento, materia, cuantia, cuadernos, etapa, ultima actuacion.

## Las dos teorias del caso
La de cada lado, en un parrafo, escritas en serio.

## Pretension por pretension
Elementos, quien carga con la prueba, que hay, cuanto aguanta.

## Debilidades de argumentacion
Las del contrario y las propias, con la frase citada.

## Debilidades legales
Titulo, legitimacion, prescripcion, vicios.

## Por donde atacar
Tres o cuatro vias, cada una con su folio y con la respuesta que va a recibir.

## Que falta conseguir
Prueba, documentos, testigos. Fuera del expediente.

## Plazos y proximos pasos
Que corre, desde cuando, que precluyo.

## Litigar, transar o cobrar
La cuenta, en tres frases.

## Limites de este analisis
Lo que no se pudo leer y lo que no consta.
```

Adaptala: si la consulta es acotada, contesta eso y nada mas.

Parrafos de tres o cuatro lineas, una idea cada uno. Negrita para lo que el lector va a buscar con la vista. Listas para requisitos, plazos y causales; prosa para el razonamiento.

## Antes de entregar: siete preguntas

Releelo como si lo hubiera escrito otro y fueras tu quien tiene que firmarlo:

1. **¿Cada afirmacion tiene su folio?** Las que no lo tengan, o se respaldan o se caen.
2. **¿Distingui alegado de probado de asentado**, o en algun parrafo se me colo el relato de la demanda como si fueran hechos?
3. **¿Dije cual es el punto que decide**, o reparti atencion pareja entre ocho cosas?
4. **¿Escribi el caso del contrario en serio?**
5. **¿Hay al menos una mala noticia para quien me pregunta?** Si no la hay, casi seguro no mire lo suficiente.
6. **¿Cada recomendacion sobrevive a la respuesta del otro lado?**
7. **¿Termina en una decision**, o termina en un diagnostico?

## Los limites se declaran siempre

- **Las paginas que no se pudieron leer** —imagen sin OCR o texto ilegible—, con sus numeros. Lo que hay ahi no lo leyo nadie, y "no lo encontre" no es "no esta".
- **Los cuadernos que faltan**, o las causas relacionadas que el expediente menciona y no estan.
- **Las piezas que no abriste.** Si algo se apoya en el titulo del indice y no en el texto, dilo.
- **Lo que no consta.** Si el resultado depende de un hecho que no esta en el cuaderno, esa es la conclusion.

Y una linea que no sobra nunca: **esto es un analisis del expediente, no una opinion legal.** Lo firma el abogado, que conoce el caso, al cliente y lo que no quedo escrito.

## Las fichas

| | |
|---|---|
| `referencias/teoria-del-caso.md` | Como se arma y como se destruye una teoria del caso |
| `referencias/procedimientos.md` | Ejecutivo, ordinario, sumario, laboral: que cambia en cada uno |
| `referencias/prueba.md` | Como se mide la prueba y por donde se ataca cada medio |
| `referencias/procesal-civil.md` | Plazos, preclusion, nulidad, recursos, abandono |
| `referencias/decision.md` | Litigar, transar o cobrar; cobrabilidad y ventana de acuerdo |
| `referencias/sentencia-y-recursos.md` | Leer una sentencia para recurrirla; elegir la via |
| `referencias/escritos.md` | Como se redacta el escrito que gana |
| `referencias/arbitraje-cam.md` | Lo que cambia en un arbitraje |
