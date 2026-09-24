# Estado procesal: que se puede hacer todavia

> **Los numeros de articulo son punteros, no citas.** Leelos en su texto vigente antes de usarlos. Y todo plazo que aparezca aqui se comprueba en la ley y en el expediente: esta ficha sirve para saber que preguntar, no para contestar.

## La pregunta que va antes de cualquier estrategia

**¿Esto todavia se puede hacer?** Una excepcion que debio oponerse como dilatoria hace ocho meses no es una estrategia; es una explicacion de por que el caso esta como esta. Util para el informe, inutil como propuesta.

Fija siempre tres datos antes de proponer nada:

1. **La ultima resolucion del expediente y su fecha.** `cronologia` te la da.
2. **Si esta notificada, y cuando.** Aqui esta el error que mas caro sale.
3. **Que tramite viene** segun el procedimiento de que se trate.

## Los plazos corren desde la notificacion

No desde la fecha de la resolucion. Una resolucion dictada el 3 de marzo y notificada por el estado diario el 10 hace correr el plazo desde el 10, y la notificacion por cedula puede ser bastante posterior.

Antes de contar un dia, busca en el expediente:

```bash
litis buscar "notificacion"
litis buscar "receptor"
litis buscar "estado diario"
```

Y recuerda dos cosas que cambian el calculo: en materia civil **los plazos de dias son de dias habiles** y los feriados no se cuentan (articulo 66 del CPC), y los plazos legales de dias son fatales para las partes (articulo 64). Comprueba ambas reglas antes de aplicarlas al procedimiento de que se trate: no todos los procedimientos se cuentan igual.

## El esqueleto del juicio ordinario

Sirve para ubicar en que punto esta el expediente y que precluyo:

```
demanda -> (excepciones dilatorias) -> contestacion -> replica -> duplica
  -> llamado a conciliacion -> resolucion que recibe la causa a prueba
  -> termino probatorio -> observaciones a la prueba
  -> citacion a oir sentencia -> sentencia definitiva
```

Cada flecha cierra una puerta. Lo que se podia alegar antes de contestar, despues de contestar ya no; la prueba que se podia rendir en el termino probatorio, vencido este ya no. **Esa es la razon de que el estado procesal decida mas que la calidad del argumento.**

## Lo que hay que revisar siempre, aunque nadie lo haya alegado

- **Emplazamiento y notificacion de la demanda.** Es el vicio mas grave y el que mas sobrevive: sin emplazamiento valido no hay juicio. Revisa la actuacion del receptor con detalle —domicilio, forma, constancias—.
- **Competencia del tribunal**, y en arbitraje, la del arbitro segun el convenio.
- **Personeria y patrocinio** de quien comparece por cada parte.
- **Abandono del procedimiento** (articulo 152 del CPC): seis meses sin gestion util hacen posible pedirlo. Recorre la cronologia buscando huecos largos; un hueco de mas de seis meses es un hallazgo de primer orden. Ojo con que **la gestion que lo reclama debe ser la primera** que se haga.
- **Prescripcion y caducidad.** Se cuentan sobre las fechas del caso, no sobre las del expediente.
- **Cosa juzgada y litispendencia**, si el expediente menciona otra causa entre las mismas partes.

## Nulidad procesal

Un vicio no se reclama en cualquier momento ni por cualquiera. Los articulos 83 y 84 del CPC fijan las condiciones: **plazo breve desde que se tuvo conocimiento del vicio**, perjuicio reparable solo con la nulidad, y no haber convalidado el acto actuando en el juicio despues de conocerlo.

La convalidacion es lo que mata la mayoria de estas alegaciones: quien comparecio y contesto sin reclamar la notificacion defectuosa normalmente ya no puede reclamarla. Comprueba en la cronologia que hizo la parte **despues** del vicio antes de proponerlo.

## Recursos

Cuando ya hay sentencia, la pregunta cambia: no es quien tiene mejores puntos, sino **que agravio concreto es recurrible y por que via**.

| | Contra que | Que se discute |
|---|---|---|
| **Reposicion** | Autos y decretos, y algunas interlocutorias | El mismo tribunal reconsidera |
| **Apelacion** | Sentencias definitivas e interlocutorias, segun el procedimiento | Hechos y derecho |
| **Casacion en la forma** | Vicios del procedimiento o de la sentencia | Solo las causales legales; exige preparacion del recurso |
| **Casacion en el fondo** | Infraccion de ley que influye sustancialmente en lo dispositivo | Solo derecho; los hechos asentados no se revisan |
| **Queja** | Falta o abuso grave | Excepcional |

Los plazos y las causales de cada uno se comprueban en la ley y son distintos segun el procedimiento. Dos reglas que conviene tener presentes al leer la sentencia:

- **La casacion en el fondo no sirve para rediscutir los hechos.** Si el agravio es que el tribunal valoro mal la prueba, la via normalmente es otra. Identificar mal esto pierde el recurso sin entrar al fondo.
- **La casacion en la forma suele exigir haber reclamado el vicio oportunamente** durante el juicio. Sin esa preparacion, el recurso se cae en admisibilidad.

## Medidas precautorias

Si hay riesgo de que la sentencia favorable sea inejecutable, eso es parte de la estrategia y casi nunca aparece en el expediente hasta que es tarde. Revisa si se pidieron, si estan vigentes y si el bien sigue ahi.
