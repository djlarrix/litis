# Litigar, transar o cobrar

El cliente no pregunta si tiene razon. Pregunta que le conviene hacer. Un analisis que termina en "la demandante esta mejor posicionada" no contesto nada: le falta el paso que convierte el diagnostico en decision.

Esta ficha es para ese paso. No es aritmetica financiera ni prediccion: es ordenar lo que ya se sabe para que la decision se tome con los ojos abiertos. **La decide el abogado con su cliente**, y hay cosas que no estan en el expediente —la relacion comercial, el apetito de riesgo, lo que se hablo por telefono— que pueden darla vuelta entera.

## Las seis cifras que ordenan la decision

Ninguna es un numero exacto. Se estiman con lo que hay y se declara de donde salio cada una.

**1. La probabilidad, por pretension.** Nunca un porcentaje falsamente preciso. Bandas, y el motivo:

> Muy probable · Probable · Incierto · Improbable · Muy improbable

Y siempre la frase que la sostiene: "probable que se acoja el capital, porque el titulo no fue objetado y no se opusieron excepciones (folio 9, p. 21); improbable el lucro cesante, porque no se rindio prueba sobre ese punto".

**2. El monto en juego.** Capital, reajustes, intereses y costas, y en que unidad esta pactado —pesos, UF, UTM—, porque en un juicio largo el reajuste no es un detalle. Si estan las herramientas de Responsa, `valor_economico` da el valor de la UF y la UTM.

**3. Los costos de llegar hasta el final.** Honorarios, peritajes, receptores, publicaciones, tiempo del cliente. El cliente casi siempre subestima lo ultimo.

**4. El riesgo de costas.** Quien resulta totalmente vencido puede ser condenado en costas, y una pretension exagerada aumenta ese riesgo aunque se gane en lo principal. Pedir mucho no es gratis.

**5. El tiempo.** Cuanto falta, con el estado real del expediente. Si estan las herramientas de Responsa, `estadisticas_judiciales` da duraciones reales por tipo de causa y tribunal, que es mejor que la impresion de cualquiera.

**6. La cobrabilidad.** La que mas se omite y la que mas decide.

## Ganar un juicio incobrable

Es el desenlace mas frecuente de las cobranzas y el que nadie advierte a tiempo. Un titulo perfecto contra un deudor sin bienes vale el papel.

**El propio expediente lo dice, si se lee para eso.** Senales:

- Embargos que vuelven **con resultado negativo**, o actas donde no se encontraron bienes.
- Exhortos devueltos sin cumplir, o domicilios donde no vive nadie.
- **Tercerias de dominio o posesion**: alguien dice que el bien embargado no es del deudor. Si prospera, el embargo se cae; y su sola aparicion suele significar que era el unico bien que habia.
- Otros juicios ejecutivos contra el mismo deudor, o un procedimiento concursal.
- Bienes ya embargados por terceros con mejor preferencia.

```bash
litis buscar "resultado negativo"
litis buscar "no se encontraron bienes"
litis piezas --cuaderno apremio
```

Cuando la cobrabilidad es el problema, **dilo en el marcador, no en un anexo**. Cambia la conversacion completa: de "como ganamos" a "que garantia conseguimos, a quien mas podemos perseguir y cuanto cuesta seguir intentandolo".

## La cuenta, en voz alta

No para dar un numero, sino para que la decision quede a la vista:

```
lo que se puede recuperar de verdad
   = monto  ×  probabilidad de ganar  ×  probabilidad de cobrar
   −  costos de llegar hasta el final
   −  el riesgo de costas si se pierde
```

Si el resultado es parecido a lo que ofrecen por transar, **la decision es transar**, y hay que decirlo con esas palabras. Si es mucho mayor, hay caso. Si es negativo, la recomendacion honesta es no seguir, y eso tambien es un servicio: un abogado que avisa a tiempo vale mas que uno que acompana hasta el final una causa perdida.

## La ventana de transaccion

Existe cuando lo minimo que aceptaria uno es menor que lo maximo que pagaria el otro. Para estimar el borde del contrario hay que ponerse en su lugar con su informacion, no con la propia:

- ¿Que probabilidad ve el, con lo que sabe? Sus escritos lo delatan: quien esta seguro no ofrece conciliar.
- ¿Que le cuesta el tiempo? Una empresa con el bien embargado y paralizado tiene una urgencia que el demandante no tiene.
- ¿Que riesgo asimetrico corre? Un precedente, un tema reputacional, una contingencia que hay que provisionar.

**Los momentos en que se transa** suelen ser los mismos: antes de contestar, despues de que se recibe la causa a prueba, cuando la prueba salio mal para alguien, y en visperas de la sentencia. Si el expediente muestra un llamado a conciliacion y como reacciono cada uno, eso es informacion de primer orden.

## Los riesgos de cola

Lo que no aparece en el valor esperado y de todos modos hay que advertir:

- **Reconvencion** o demanda cruzada.
- **Condena en costas** por una pretension desmedida.
- **Responsabilidad por una precautoria** que despues resulta injustificada.
- **El precedente propio**: si el cliente tiene cien casos iguales, un fallo adverso no cuesta lo que este caso.
- **La prescripcion corriendo** sobre acciones relacionadas mientras se pelea esta.

## Como se escribe esto en el informe

Sin tablas de probabilidades falsas y sin decimales. Tres o cuatro frases, arriba, donde se leen:

> Con lo que hay en el expediente, lo que se discute ya esta practicamente decidido: no hubo oposicion y el titulo no fue objetado. El problema no es ganar, es cobrar: el embargo volvio sin bienes (folio 57, p. 140) y apareció una tercería sobre el unico vehiculo. Antes de gastar en un nuevo exhorto, conviene averiguar si queda algo que perseguir; si no queda, cualquier acuerdo razonable vale mas que una sentencia.
