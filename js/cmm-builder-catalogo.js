import { cmmDefinirMision } from './cmm-builder-misiones.js';

const CMM_SECUENCIA_PECTORAL = [
  { cmmNombre: 'Base costal · costillas 3 a 5', cmmIds: ['FJ3338', 'FJ3340', 'FJ3342'] },
  { cmmNombre: 'Capa profunda · pectoral menor', cmmIds: ['FJ1456'] },
  { cmmNombre: 'Capa superficial · porción esternocostal del pectoral mayor', cmmIds: ['FJ1464'] }
].map((cmmCapa) => ({ ...cmmCapa, cmmFuente: 'secuencia pedagógica CMM' }));

const CMM_RETOS_ORIGINALES = [
  ['abdomen', 'Órganos abdominales', 'Abdomen', 'multisistema', 'Reconstruye seis órganos abdominales.', ['FJ2564', 'FJ2561', 'FJ3145', 'FJ3147', 'FJ1895', 'FJ2817']],
  ['craneo', 'Huesos del cráneo', 'Cabeza', 'skeletal', 'Reconstruye el cráneo y la mandíbula.', ['FJ3200', 'FJ3289', 'FJ3309', 'FJ3274', 'FJ3380', 'FJ3281', 'FJ3386', 'FJ3269', 'FJ3375']],
  ['pelvis', 'Pelvis ósea', 'Pelvis', 'skeletal', 'Ubica el sacro y los dos huesos coxales.', ['FJ3152', 'FJ3288', 'FJ3393']],
  ['cuello', 'Columna cervical', 'Cuello', 'skeletal', 'Reconstruye la columna cervical.', ['FJ3176', 'FJ3177', 'FJ3161', 'FJ3164', 'FJ3167', 'FJ3170', 'FJ3172']],
  ['mano', 'Metacarpo izquierdo', 'Mano', 'skeletal', 'Coloca los cinco metacarpianos izquierdos.', ['FJ3240', 'FJ3243', 'FJ3246', 'FJ3249', 'FJ3252']],
  ['pierna', 'Huesos de la rodilla', 'Extremidad inferior derecha', 'skeletal', 'Coloca los modelos óseos de la rodilla derecha.', ['FJ3365', 'FJ3381', 'FJ3387', 'FJ3366']],
  ['pectoral', 'Capas de la pared pectoral', 'Tórax derecho', 'multisistema', 'Sigue la secuencia pedagógica de la base costal a los pectorales.', CMM_SECUENCIA_PECTORAL.flatMap((cmmCapa) => cmmCapa.cmmIds), CMM_SECUENCIA_PECTORAL]
].map(([cmmId, cmmNombre, cmmRegion, cmmSistema, cmmDescripcion, cmmRequeridas, cmmSecuencia], cmmVista) => ({
  ...cmmDefinirMision({ cmmId, cmmNombre, cmmRegion, cmmSistema, cmmDescripcion, cmmRequeridas, cmmSecuencia,
    cmmModo: cmmSecuencia ? 'capas' : 'clasico', cmmDificultad: 0 }),
  cmmVista
}));

const CMM_RETOS_REGIONALES = [
  ['cmm-columna-lumbar', 'Columna lumbar', 'Abdomen', 'skeletal', 'Coloca las cinco vértebras lumbares.', ['FJ3157', 'FJ3159', 'FJ3162', 'FJ3165', 'FJ3168']],
  ['cmm-columna-toracica-superior', 'Columna torácica · T1 a T6', 'Tórax', 'skeletal', 'Coloca las seis primeras vértebras torácicas.', ['FJ3158', 'FJ3160', 'FJ3163', 'FJ3166', 'FJ3169', 'FJ3171']],
  ['cmm-columna-toracica-inferior', 'Columna torácica · T7 a T12', 'Tórax', 'skeletal', 'Coloca las seis últimas vértebras torácicas.', ['FJ3173', 'FJ3174', 'FJ3175', 'FJ3154', 'FJ3155', 'FJ3156']],
  ['cmm-torax-derecho-superior', 'Caja torácica derecha · costillas 1 a 6', 'Tórax derecho', 'skeletal', 'Coloca las seis primeras costillas derechas y las piezas del esternón.', ['FJ3334', 'FJ3336', 'FJ3338', 'FJ3340', 'FJ3342', 'FJ3344', 'FJ3290', 'FJ3178', 'FJ3153']],
  ['cmm-torax-derecho-inferior', 'Caja torácica derecha · costillas 7 a 12', 'Tórax derecho', 'skeletal', 'Coloca las seis últimas costillas derechas.', ['FJ3346', 'FJ3347', 'FJ3348', 'FJ3330', 'FJ3331', 'FJ3332']],
  ['cmm-torax-izquierdo-superior', 'Caja torácica izquierda · costillas 1 a 6', 'Tórax izquierdo', 'skeletal', 'Coloca las seis primeras costillas izquierdas y las piezas del esternón.', ['FJ3228', 'FJ3229', 'FJ3230', 'FJ3231', 'FJ3232', 'FJ3233', 'FJ3290', 'FJ3178', 'FJ3153']],
  ['cmm-torax-izquierdo-inferior', 'Caja torácica izquierda · costillas 7 a 12', 'Tórax izquierdo', 'skeletal', 'Coloca las seis últimas costillas izquierdas.', ['FJ3234', 'FJ3235', 'FJ3236', 'FJ3225', 'FJ3226', 'FJ3227']],
  ['cmm-mano-carpo', 'Mano izquierda · carpo', 'Mano', 'skeletal', 'Coloca los ocho huesos del carpo izquierdo.', ['FJ3278', 'FJ3268', 'FJ3276', 'FJ3283', 'FJ3284', 'FJ3257', 'FJ3261', 'FJ3285']],
  ['cmm-mano-dedos-radiales', 'Mano izquierda · pulgar, índice y medio', 'Mano', 'skeletal', 'Coloca las falanges de los tres dedos del lado radial.', ['FJ3318', 'FJ3188', 'FJ3313', 'FJ3296', 'FJ3183', 'FJ3316', 'FJ3299', 'FJ3186']],
  ['cmm-mano-dedos-cubitales', 'Mano izquierda · anular y meñique', 'Mano', 'skeletal', 'Coloca las falanges de los dos dedos del lado cubital.', ['FJ3317', 'FJ3291', 'FJ3187', 'FJ3314', 'FJ3297', 'FJ3184']],
  ['cmm-pie-tarso', 'Pie izquierdo · tarso', 'Pie', 'skeletal', 'Coloca los siete huesos del tarso izquierdo.', ['FJ3280', 'FJ3256', 'FJ3307', 'FJ3258', 'FJ3264', 'FJ3267', 'FJ3271']],
  ['cmm-pie-metatarso', 'Pie izquierdo · metatarso', 'Pie', 'skeletal', 'Coloca los cinco metatarsianos izquierdos.', ['FJ3241', 'FJ3244', 'FJ3247', 'FJ3250', 'FJ3253']],
  ['cmm-pie-dedos-mediales', 'Pie izquierdo · dedos 1 a 3', 'Pie', 'skeletal', 'Coloca las falanges del dedo gordo y de los dedos segundo y tercero.', ['FJ3329', 'FJ3182', 'FJ3328', 'FJ3293', 'FJ3179', 'FJ3311', 'FJ3294', 'FJ3180']],
  ['cmm-pie-dedos-laterales', 'Pie izquierdo · dedos 4 y 5', 'Pie', 'skeletal', 'Coloca las falanges de los dedos cuarto y quinto.', ['FJ3312', 'FJ3295', 'FJ3181', 'FJ3315', 'FJ3298', 'FJ3185']],
  ['cmm-extremidad-superior', 'Hombro, brazo y antebrazo izquierdos', 'Extremidad superior izquierda', 'skeletal', 'Coloca clavícula, escápula, húmero, radio y cúbito izquierdos.', ['FJ3237', 'FJ3279', 'FJ3262', 'FJ3277', 'FJ3286']],
  ['cmm-extremidad-inferior', 'Muslo, pierna y tobillo izquierdos', 'Extremidad inferior izquierda', 'skeletal', 'Coloca fémur, rótula, tibia, peroné y astrágalo izquierdos.', ['FJ3259', 'FJ3275', 'FJ3282', 'FJ3260', 'FJ3280']],
  ['cmm-torax-vias-aereas', 'Tráquea y bronquios principales', 'Tórax', 'respiratory', 'Reconstruye las vías respiratorias centrales con tres mallas del atlas.', ['FJ2541', 'FJ2450', 'FJ2539']],
  ['cmm-abdomen-digestivo', 'Estómago, páncreas y vesícula', 'Abdomen', 'digestive', 'Coloca tres órganos del sistema digestivo.', ['FJ2564', 'FJ1895', 'FJ2817']],
  ['cmm-musculos-brazo', 'Músculos anteriores del brazo derecho', 'Extremidad superior derecha', 'muscular', 'Coloca el braquial y las dos cabezas del bíceps braquial.', ['FJ1486', 'FJ1478', 'FJ1512']],
  ['cmm-musculos-brazo-posterior', 'Tríceps braquial derecho', 'Extremidad superior derecha', 'muscular', 'Coloca las tres cabezas del tríceps braquial.', ['FJ1477', 'FJ1479', 'FJ1480']]
].map(([cmmId, cmmNombre, cmmRegion, cmmSistema, cmmDescripcion, cmmRequeridas]) => cmmDefinirMision({
  cmmId, cmmNombre, cmmRegion, cmmSistema, cmmDescripcion, cmmRequeridas, cmmModo: 'clasico', cmmDificultad: 0
}));

const CMM_RETOS_POR_MODO = [
  { cmmId: 'cmm-pelvis-parcial', cmmNombre: 'Coxales de la pelvis', cmmModo: 'cmm-parcial',
    cmmDescripcion: 'Completa las dos piezas ausentes usando el sacro como referencia.',
    cmmRequeridas: ['FJ3152', 'FJ3288'], cmmReferencia: ['FJ3393'] },
  { cmmId: 'cmm-pelvis-intrusa', cmmNombre: 'Pelvis con una pieza intrusa', cmmModo: 'cmm-intrusa',
    cmmDescripcion: 'Coloca las tres piezas de la pelvis y deja fuera la estructura de otra región.',
    cmmRequeridas: ['FJ3152', 'FJ3288', 'FJ3393'], cmmIntrusas: ['FJ3237'] },
  { cmmId: 'cmm-coxales-espejo', cmmNombre: 'Coxales izquierdo y derecho', cmmModo: 'cmm-espejo',
    cmmDescripcion: 'Distingue ambos lados del cuerpo usando el sacro como referencia.',
    cmmRequeridas: ['FJ3152', 'FJ3288'], cmmReferencia: ['FJ3393'] },
  { cmmId: 'cmm-pelvis-contrarreloj', cmmNombre: 'Pelvis en 120 segundos', cmmModo: 'cmm-contrarreloj',
    cmmDescripcion: 'Completa la pelvis antes de que se agote la cuenta regresiva.',
    cmmRequeridas: ['FJ3152', 'FJ3288', 'FJ3393'], cmmTiempo: 120 },
  { cmmId: 'cmm-conexiones-lumbares', cmmNombre: 'Discos y vértebras lumbares', cmmModo: 'cmm-conexiones', cmmRegion: 'Abdomen',
    cmmDescripcion: 'Relaciona cada disco con la vértebra de su nombre y colócalo en el modelo.',
    cmmRequeridas: ['FJ3212', 'FJ3214', 'FJ3215', 'FJ3216', 'FJ3217'],
    cmmReferencia: ['FJ3157', 'FJ3159', 'FJ3162', 'FJ3165', 'FJ3168'],
    cmmVinculos: [['FJ3212', 'FJ3157'], ['FJ3214', 'FJ3159'], ['FJ3215', 'FJ3162'], ['FJ3216', 'FJ3165'], ['FJ3217', 'FJ3168']]
      .map(([cmmId, cmmReferencia]) => ({ cmmId, cmmReferencia, cmmFuente: 'nombre de BodyParts3D' })) }
].map((cmmReto) => cmmDefinirMision({ cmmSistema: 'skeletal', cmmRegion: 'Pelvis', cmmDificultad: 0, ...cmmReto }));

export const CMM_CATALOGO_MISIONES = [...CMM_RETOS_ORIGINALES, ...CMM_RETOS_REGIONALES, ...CMM_RETOS_POR_MODO];
