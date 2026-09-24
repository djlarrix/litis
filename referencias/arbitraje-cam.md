# Arbitraje: expedientes del CAM y de arbitros ad hoc

> **Esta ficha no cita el reglamento del centro ni la ley.** Los reglamentos de arbitraje tienen versiones sucesivas y el aplicable es el vigente al momento que el propio reglamento determine, que no siempre es el de hoy. Lo que sigue es la lista de lo que hay que ir a leer en el expediente y en el reglamento aplicable, no un resumen de sus reglas.

## El molde del juicio ordinario no sirve aqui

En un arbitraje, el procedimiento no lo fija el Codigo de Procedimiento Civil por defecto: lo fijan **el convenio arbitral, el reglamento del centro y lo que las partes acordaron ante el tribunal arbitral**. Citar un plazo del CPC en un arbitraje que corre por reglamento es un error visible y caro.

Lo primero, entonces, no es leer la demanda: es leer las reglas del juego.

## El formulario de solicitud

En un expediente del CAM Santiago, las primeras paginas son el formulario con que se inicio el arbitraje. `litis indexar` lo lee: partes, cuantia, sede, ley aplicable, normas invocadas, la referencia a la clausula arbitral y una descripcion del conflicto.

Es un punto de partida excelente y una fuente peligrosa: **lo escribio el solicitante**. La descripcion del conflicto es su teoria del caso en un parrafo, y las normas que invoca son las que le convienen. Todo eso es alegado. Sirve para saber que va a sostener, no para saber que paso.

Dos datos del formulario cambian el analisis desde la primera linea:

- **Si es internacional.** El arbitraje comercial internacional tiene ley propia, y el laudo se ataca por un recurso de nulidad con causales tasadas, distinto del regimen del arbitraje interno. Antes de analizar cualquier via de impugnacion, comprueba en la ley aplicable cual rige.
- **La ley aplicable al fondo.** Si la contestacion la discute, esa discusion suele decidir el caso antes que cualquier hecho.

## Lo que se lee antes que nada

**1. El convenio arbitral.** Normalmente esta reproducido en la demanda o acompanado con ella.

```bash
litis buscar "clausula compromisoria"
litis buscar "convenio arbitral"
litis buscar "someten a arbitraje"
```

Comprueba tres cosas: **quienes lo firmaron** (una parte no firmante es una excepcion completa), **que materias abarca** (una pretension fuera del alcance de la clausula es atacable por esa sola razon, y es de lo poco que sobrevive al laudo) y **como designa al arbitro y con que calidad**.

**2. La calidad del arbitro.** Cambia todo lo demas:

- **Arbitro arbitrador** — falla conforme a lo que la prudencia y la equidad le dictaren, y tramita en la forma que las partes hayan acordado. Atacar su fallo por infraccion de ley normalmente no va a ninguna parte.
- **Arbitro de derecho** — se sujeta a la ley en el fallo y en la tramitacion, como un juez ordinario.
- **Arbitro mixto** — tramita como arbitrador y falla conforme a derecho.

Si el expediente no lo dice con todas sus letras, la clausula lo dice. Si la clausula tampoco, hay una regla supletoria que hay que ir a leer, y ahi conviene comprobarla en la ley y no suponerla.

**3. El acta de mision, las bases de procedimiento o el acta de la primera audiencia.** Ahi suelen quedar fijados el objeto del arbitraje, los plazos, la forma de rendir la prueba y a veces las renuncias a recursos. Es el documento mas util del expediente y el que mas se pasa por alto.

**4. El plazo del arbitro para fallar.** El encargo arbitral tiene duracion, y un laudo dictado fuera de plazo es atacable. Busca la fecha de aceptacion del cargo y compara.

## Como se analiza el fondo

Igual que un juicio: pretension, elementos, carga, prueba. El metodo de `SKILL.md` se aplica sin cambios. Lo que cambia es el marco:

- **La prueba suele ser mas flexible**: se admiten declaraciones escritas, informes de parte y documentos que en sede ordinaria tendrian mas problemas. No supongas que una objecion documental del CPC opera igual.
- **Los plazos son los del procedimiento acordado**, y muchas veces los fija el tribunal arbitral resolucion por resolucion.
- **Lo que las partes acordaron obliga al arbitro.** Un apartamiento de lo acordado es una via de ataque propia del arbitraje, sin equivalente en sede ordinaria.

## Si ya hay laudo

Aqui el arbitraje se separa del todo del juicio ordinario, y es donde mas se equivoca quien traslada su experiencia de tribunales.

**En los arbitrajes institucionales es habitual que las partes hayan renunciado a los recursos.** Lo primero es comprobar si esa renuncia esta, en el convenio o en las bases, y **con que alcance**: hay renuncias que no cubren todo.

Despues, ubicar la via que quede segun el caso, que depende de la calidad del arbitro, de lo pactado y de si el arbitraje es interno o comercial internacional —que se rige por su propia ley y tiene un regimen de nulidad distinto, con causales tasadas—. Antes de aconsejar una via, leela en la norma aplicable: es un terreno donde la intuicion falla.

Lo que si se puede decir de entrada: **un laudo no se revisa por estar mal razonado**. Las vias que quedan son estrechas y casi siempre pasan por la competencia del arbitro, por el procedimiento o por el debido proceso, no por el fondo. Si el agravio es que el arbitro valoro mal la prueba, hay que decirle al abogado que probablemente no hay nada que hacer, y decirselo pronto.

## Dos cosas que no son del fondo pero deciden

- **Confidencialidad.** Los arbitrajes institucionales suelen serlo. Eso afecta lo que se puede acompanar de este expediente en otro juicio, y conviene advertirlo si aparece la idea.
- **Costos.** Honorarios del arbitro y tasas del centro corren durante el procedimiento y su falta de pago tiene consecuencias procesales. Revisa si hay alguna resolucion sobre esto en el expediente: es una fuente habitual de sorpresas.

## Ejecucion

Un laudo favorable que no se puede ejecutar vale poco. El tribunal arbitral carece de imperio para hacer cumplir por la fuerza, de modo que la ejecucion pasa por la justicia ordinaria. Si el analisis termina en "hay que cobrar", esa parte hay que pensarla desde ya.
