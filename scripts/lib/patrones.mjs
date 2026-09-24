/**
 * Las senales que delatan donde empieza y termina cada pieza del expediente.
 *
 * ESTE ES EL ARCHIVO QUE HAY QUE CALIBRAR. Un cuaderno descargado de la Oficina
 * Judicial Virtual, uno armado por el propio estudio y un expediente del CAM no
 * se parecen en el detalle, y dentro del Poder Judicial el estampado cambia
 * entre competencias y entre anios. Las reglas viven aqui, aparte del motor,
 * para que ajustar una no obligue a entender el resto.
 *
 * Criterio de diseno: NINGUNA senal decide sola. Cada una suma puntos y la
 * pieza se abre cuando la pagina supera el umbral. Un unico patron infalible no
 * existe —"EN LO PRINCIPAL" aparece citado dentro de una sentencia que
 * transcribe la demanda— y un detector que se fia de uno solo trocea el
 * expediente en lugares absurdos.
 */

/** Sin acentos y en minusculas: el OCR y los timbres son irregulares con las tildes. */
export function plano(texto) {
  return (texto || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

/**
 * Senales de INICIO de pieza. Se buscan en el ENCABEZADO de la pagina (las
 * primeras lineas), porque un escrito empieza arriba: la misma formula a media
 * pagina casi siempre es una cita del escrito anterior.
 */
export const INICIOS = [
  // --- Escritos de parte ---------------------------------------------------
  // La formula canonica del escrito chileno. Si esta arriba de la pagina, ahi
  // empieza una presentacion.
  { id: 'en-lo-principal', re: /\ben lo principal\b/, peso: 10 },
  { id: 'otrosi-primero', re: /^\s*(primer|1er\.?)\s+otrosi\b/m, peso: 6 },
  // Encabezamiento dirigido al tribunal.
  // Anclados al comienzo de linea: "S.J.L.", "Excma. Corte" o "S.J.A." a
  // media frase son citas o tratamientos, no el encabezamiento de un escrito.
  { id: 'sjl', re: /^\s*(s\.?\s?j\.?\s?l\.?\b|senor\s+juez\b|s\.?\s?j\.?\s?civil\b)/m, peso: 8 },
  { id: 'corte', re: /^\s*(iltma\.?|excma\.?|ilustrisima)\s+corte\b/m, peso: 8 },
  // "S.J.A." (senor juez arbitro) es el encabezamiento de los escritos en el
  // CAM. Aparece tambien a media pagina ("la suma que S.J.A. estime"), pero
  // aqui solo cuenta en el encabezado, y la paginacion propia del escrito
  // impide que una mencion suelta lo parta.
  { id: 'arbitro', re: /^\s*(senor[a]?\s+(juez\s+)?arbitro\b|sr\.?\s+arbitro\b|tribunal\s+arbitral\b|s\.\s?j\.\s?a\.?(?=\s|$|:))/m, peso: 8 },
  // El bloque de caratula con que abren los escritos: "PROCEDIMIENTO : Arbitral",
  // "Procedimiento: Ejecutivo". Solo en las primeras lineas.
  { id: 'bloque-caratula', re: /^\s*procedimiento\s*:\s*\S/m, peso: 10 },
  { id: 'rol-cam', re: /\brol\s+cam\b/, peso: 3 },

  // --- Resoluciones y sentencias -------------------------------------------
  // Una resolucion empieza por ciudad y fecha. Anclado al comienzo de linea
  // para no confundirlo con la fecha citada dentro de un parrafo.
  // El dia va en numeros en los escritos y en palabras en las resoluciones
  // ("Santiago, trece de agosto de dos mil veinticinco"). Aceptar solo digitos
  // dejaba fuera justo las resoluciones, que son la mitad del cuaderno.
  {
    id: 'ciudad-fecha',
    re: /^[a-z\u00f1 ]{4,22},\s+(a\s+)?([a-z\u00f1]+(\s+y\s+[a-z\u00f1]+)?|\d{1,2})\s+de\s+[a-z]+\s+de\s+(dos\s+mil(\s+[a-z]+(\s+y\s+[a-z]+)?)?|\d{4})\s*\.?$/m,
    peso: 9,
  },
  // Formulas que solo aparecen en la parte resolutiva de una providencia. Solas
  // no abren nada; acompanando a la fecha confirman que hay resolucion nueva.
  { id: 'formula-resolutiva', re: /\bnotifiquese\b|\bproveyendo\b|\bcomo\s+se\s+pide\b|^\s*traslado\s*\.?\s*$/m, peso: 3 },
  { id: 'vistos', re: /^\s*vistos\s*[:;.]?\s*$/m, peso: 7 },
  // Esta mira la pagina entera: entre el "vistos" y el "considerando" de una
  // sentencia hay parrafos de por medio, no caben en el encabezado.
  { id: 'vistos-considerando', re: /\bvistos\b[\s\S]{0,4000}\bconsiderando\b/, peso: 3, ambito: 'pagina' },
  { id: 'sentencia-definitiva', re: /\bsentencia\s+definitiva\b/, peso: 5 },
  { id: 'laudo', re: /\blaudo\s+(arbitral|definitivo)?\b/, peso: 9 },
  { id: 'resolucion', re: /^\s*resolucion\s+(n|numero|que)/m, peso: 5 },

  // --- Actuaciones ---------------------------------------------------------
  { id: 'acta', re: /\bacta\s+de\s+(la\s+)?(audiencia|comparendo|conciliacion|prueba|inspeccion)/, peso: 9 },
  { id: 'notificacion', re: /\b(certificado|acta)\s+de\s+notificacion\b|\bnotificacion\s+(personal|por\s+cedula|subsidiaria)/, peso: 8 },
  { id: 'receptor', re: /\breceptor\s+judicial\b/, peso: 5 },
  { id: 'certificado', re: /^\s*certific(o|ado)\b/m, peso: 5 },
  { id: 'exhorto', re: /\bexhorto\b/, peso: 5 },
  { id: 'peritaje', re: /\binforme\s+pericial\b|\bperito\s+(judicial|designado)\b/, peso: 8 },
  { id: 'oficio', re: /^\s*oficio\s+(n|ord|reservado)/m, peso: 6 },

  // --- Marcas del sistema ---------------------------------------------------
  // El estampado de la carpeta electronica. "Foja: 1" es principio de documento
  // cuando el sistema numera cada pieza desde uno; cuando la foja es correlativa
  // del expediente completo este patron simplemente no dispara, y no estorba.
  { id: 'foja-uno', re: /\bfoja\s*:?\s*1\b(?!\d)/, peso: 6 },
  { id: 'rol-encabezado', re: /\b(rol|causa)\s*(n|nro|numero)?\s*[:°º]?\s*[a-z]?-?\d{1,6}\s*-\s*\d{4}\b/, peso: 2 },
  { id: 'ingreso', re: /\b(fecha\s+de\s+)?ingreso\s*:?\s*\d{1,2}[/-]\d{1,2}[/-]\d{2,4}/, peso: 3 },
];

/**
 * Senales de CIERRE. Marcan que la pieza termina en esta pagina, asi que la
 * siguiente abre una nueva aunque su encabezado sea tibio.
 *
 * El pie de firma electronica del Poder Judicial es la mas util de todas: cada
 * resolucion firmada lo lleva, y aparece exactamente una vez, al final.
 */
export const CIERRES = [
  { id: 'verificadoc', re: /verificadoc|verificar\s*doc|www\.pjud\.cl\/.*verifica/ },
  { id: 'firma-electronica', re: /firma\s+electronica(\s+avanzada)?[\s\S]{0,200}(validad|verific|codigo)/ },
  { id: 'codigo-verificacion', re: /codigo\s+de\s+verificacion\s*:?\s*[a-z0-9-]{6,}/ },
  { id: 'autorizo', re: /^\s*(autorizo|autoriza)\b[\s\S]{0,120}\b(secretari|ministro\s+de\s+fe)/m },
];

/**
 * Tipos de pieza, en orden de especificidad: gana el primero que casa. El orden
 * importa —una "contestacion de la demanda" contiene la palabra "demanda"— y es
 * la razon de que esto sea una lista y no un objeto.
 */
export const TIPOS = [
  // Va primera: la portada nombra todas las piezas del expediente, asi que
  // casa con el patron de cualquiera de ellas si se la deja para el final.
  { tipo: 'portada-indice', re: /\bhistoria\s+de\s+la\s+causa\b|\bindice\s+del?\s+(cuaderno|expediente)\b|\bdesc\.?\s*tramite\b|\betapa\s+tramite\b/ },
  { tipo: 'solicitud-arbitraje', re: /^\s*solicitud\s+de\s+arbitraje\b/m },
  { tipo: 'acta-de-mision', re: /^\s*(acta\s+de\s+mision|bases\s+de\s+procedimiento|terminos\s+de\s+referencia)\b/m },
  { tipo: 'laudo', re: /\blaudo\s+(arbitral|definitivo|parcial|final)\b|^\s*laudo\b/m },
  { tipo: 'sentencia', re: /^\s*sentencia\s+definitiva\b/m },
  { tipo: 'recurso', re: /^\s*(recurso\s+de\s+\w+|reposicion|apelacion)\b/m },
  { tipo: 'demanda', re: /\b(interpon|deduc|entabl)\w*\s+demanda\b|\bdemanda\s+(civil|ejecutiva|de\s+\w+)\b/ },
  { tipo: 'contestacion', re: /\bcontesta(cion|n|mos)?\s+(la\s+)?demanda\b|\bcontestando\s+la\s+demanda\b/ },
  { tipo: 'excepciones', re: /\bexcepcion(es)?\s+(dilatoria|perentoria|de\s+previo)/ },
  { tipo: 'duplica', re: /^\s*duplica\b|\ben\s+lo\s+principal\s*:\s*duplica\b|\bevacua\s+(el\s+)?tramite\s+de\s+duplica\b/m },
  { tipo: 'replica', re: /^\s*replica\b|\ben\s+lo\s+principal\s*:\s*replica\b|\bevacua\s+(el\s+)?tramite\s+de\s+replica\b/m },
  { tipo: 'reconvencion', re: /\bdemanda\s+reconvencional\b|\breconvien\w+\b/ },
  { tipo: 'incidente', re: /\bincidente\s+de\b|\bnulidad\s+de\s+todo\s+lo\s+obrado\b|\bincidental\w*\b/ },
  { tipo: 'recurso', re: /\brecurso\s+de\s+(apelacion|casacion|queja|proteccion|nulidad|reposicion|hecho)\b|\bapel[ao]\b/ },
  { tipo: 'prueba-documental', re: /\bacompan[ao]\s+documento|\bcustodia\b|\bbajo\s+apercibimiento\s+del\s+art\w*\s*346/ },
  { tipo: 'lista-testigos', re: /\blista\s+de\s+testigos\b|\bnomina\s+de\s+testigos\b/ },
  { tipo: 'peritaje', re: /\binforme\s+pericial\b|\bperito\b/ },
  { tipo: 'acta-audiencia', re: /\bacta\s+de\s+(la\s+)?(audiencia|comparendo)\b|\babsolucion\s+de\s+posiciones\b|\bpliego\s+de\s+posiciones\b/ },
  { tipo: 'observaciones-prueba', re: /\bobservaciones\s+a\s+la\s+prueba\b/ },
  { tipo: 'notificacion', re: /\bnotificacion\b|\breceptor\s+judicial\b/ },
  { tipo: 'oficio', re: /^\s*oficio\b/m },
  { tipo: 'exhorto', re: /\bexhorto\b/ },
  { tipo: 'transaccion', re: /\btransaccion\b|\bavenimiento\b|\bconciliacion\b/ },
  { tipo: 'mandato', re: /\b(asume[n]?\s+)?patrocinio\s+y\s+poder\b|\bconfiere\s+poder\b|\bdelega\s+poder\b/ },
  // Solo si ES el objeto del escrito. Una resolucion que provee un otrosi
  // tambien dice "tengase presente", y clasificarla asi la sacaba de las
  // resoluciones, que es donde el analisis la va a buscar.
  { tipo: 'tengase-presente', re: /\ben\s+lo\s+principal\s*:?\s*[^\n]{0,60}\btengase\s+presente\b|\bse\s+tenga\s+presente\b\s*$/m },
  { tipo: 'resolucion', re: /^\s*a\s+lo\s+principal\s*:|\bnotifiquese\b|\bproveyendo\b|\bcomo\s+se\s+pide\b|\btraslado\b|\bautos\b/m },
];

/**
 * Resoluciones que cambian el juego y hay que encontrar si o si.
 *
 * La que recibe la causa a prueba es la pieza mas rentable del expediente
 * entero: fija los hechos sustanciales, pertinentes y controvertidos, o sea el
 * temario sobre el que se gana o se pierde. La citacion a oir sentencia cierra
 * el debate. Estas se marcan aparte para que el analisis no las pase por alto.
 */
export const HITOS = [
  // --- Juicio ejecutivo ---------------------------------------------------
  // Un ejecutivo se lee por otros hitos que un ordinario: lo que decide no es
  // la prueba sino si hubo requerimiento valido, si se opusieron excepciones en
  // plazo y que paso con el embargo.
  { hito: 'mandamiento-ejecucion-embargo', re: /\bmandamiento\s+de\s+ejecucion\s+y\s+embargo\b|\bdespachese\s+mandamiento\b/ },
  { hito: 'requerimiento-de-pago', re: /\brequerimiento\s+de\s+pago\b|\brequerid[oa]\s+de\s+pago\b/ },
  { hito: 'excepciones-del-ejecutado', re: /\bopone\s+excepcion\w*\b|\bexcepciones\s+del\s+articulo\s*464\b/ },
  { hito: 'embargo', re: /\btrab[ao]\w*\s+embargo\b|\bacta\s+de\s+embargo\b|\bse\s+traba\s+embargo\b/ },
  { hito: 'retiro-de-especies', re: /\bretiro\s+de\s+especies\b|\bretiro\s+de\s+bienes\b/ },
  { hito: 'fuerza-publica', re: /\bfuerza\s+publica\b|\bauxilio\s+de\s+la\s+fuerza\b/ },
  { hito: 'terceria', re: /\bterceria\s+de\s+(dominio|posesion|prelacion|pago)\b|\btercerista\b/ },
  { hito: 'liquidacion-del-credito', re: /\bliquidacion\s+del?\s+credito\b|\bordena\s+liquidar\b/ },
  { hito: 'costas', re: /\btasacion\s+y?\s*regulacion\s+de\s+costas\b|\bregulense\s+costas\b|\bcostas\s+personales\b/ },
  { hito: 'remate', re: /\bremate\b|\bsubasta\b|\bbases\s+de\s+remate\b/ },
  { hito: 'credito-pagado', re: /\btiene\s+por\s+pagado\s+el\s+credito\b|\bse\s+da\s+por\s+pagad[oa]\b/ },
  { hito: 'alzamiento', re: /\balzamiento\b|\balzase\b|\bse\s+alza\s+el\s+embargo\b/ },

  // --- Juicio declarativo -------------------------------------------------
  { hito: 'recibe-causa-a-prueba', re: /\brecib\w+\s+la\s+causa\s+a\s+prueba\b|\bhechos\s+sustanciales,?\s+pertinentes\s+y\s+controvertidos\b/ },
  { hito: 'citacion-a-oir-sentencia', re: /\bcitase\s+a\s+(las\s+partes\s+a\s+)?oir\s+sentencia\b|\bcitacion\s+para\s+oir\s+sentencia\b/ },
  { hito: 'traslado', re: /^\s*traslado\s*\.?\s*$/m },
  { hito: 'termino-probatorio', re: /\btermino\s+probatorio\b/ },
  { hito: 'medida-precautoria', re: /\bmedida\s+precautoria\b|\bprohibicion\s+de\s+celebrar\s+actos\s+y\s+contratos\b/ },
  { hito: 'abandono', re: /\babandono\s+del\s+procedimiento\b/ },
  { hito: 'prescripcion', re: /\bprescripcion\s+(extintiva|adquisitiva|de\s+la\s+accion)\b/ },
  { hito: 'incompetencia', re: /\bincompetencia\s+del\s+tribunal\b|\bdeclinatoria\b|\binhibitoria\b/ },
  { hito: 'nulidad-obrado', re: /\bnulidad\s+de\s+todo\s+lo\s+obrado\b|\bfalta\s+de\s+emplazamiento\b/ },
  { hito: 'conciliacion', re: /\bllamado\s+a\s+conciliacion\b|\bbases\s+de\s+arreglo\b/ },
];

/** Umbral de puntaje para abrir pieza. Bajarlo trocea de mas; subirlo pega piezas. */
export const UMBRAL = 8;

/** Cuantas lineas del comienzo de la pagina cuentan como "encabezado". */
export const LINEAS_ENCABEZADO = 12;
