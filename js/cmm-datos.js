import * as cmmTres from 'three';

export const CMM_SISTEMAS = [
  { cmmId: 'skeletal', cmmNombre: 'Esqueleto', cmmColor: '#dccfa8', cmmFuncion: 'Da forma y sostén al cuerpo, protege órganos delicados y ofrece palancas y puntos de anclaje a los músculos. En su interior almacena minerales y fabrica células sanguíneas.' },
  { cmmId: 'muscular', cmmNombre: 'Músculos', cmmColor: '#b3594d', cmmFuncion: 'Producen movimiento al contraerse y tirar de huesos a través de los tendones. También mantienen la postura y generan calor corporal.' },
  { cmmId: 'cardiac', cmmNombre: 'Corazón', cmmColor: '#c0645c', cmmFuncion: 'Bomba muscular de cuatro cavidades que impulsa la sangre hacia los pulmones y hacia el resto del organismo.' },
  { cmmId: 'sensory', cmmNombre: 'Órganos sensoriales', cmmColor: '#9fc3cc', cmmFuncion: 'Captan estímulos como la luz, el sonido y los cambios de posición, y envían esa información al sistema nervioso.', cmmLimite: 'El modelo no incluye el tímpano, los huesecillos, la cóclea ni los canales semicirculares.' },
  { cmmId: 'arterial', cmmNombre: 'Arterias', cmmColor: '#c9473b', cmmFuncion: 'Conducen la sangre desde el corazón hacia los tejidos, o hacia los pulmones en la circulación pulmonar.', cmmLimite: 'Las ramas más finas no están modeladas, sobre todo en la cabeza, las manos y los pies.' },
  { cmmId: 'venous', cmmNombre: 'Venas', cmmColor: '#4a78a3', cmmFuncion: 'Devuelven la sangre al corazón. Forman redes superficiales y profundas que recogen la sangre de los tejidos.', cmmLimite: 'Las venas finas de la cabeza (temporales, auriculares, faciales) no están modeladas; solo hay las yugulares internas.' },
  { cmmId: 'nervous', cmmNombre: 'Sistema nervioso', cmmColor: '#dcb85f', cmmFuncion: 'Recibe, procesa y transmite señales. Permite sentir, moverse, pensar y regular funciones automáticas del cuerpo.', cmmLimite: 'Solo aparecen los nervios y estructuras principales; las ramas más finas no están modeladas.' },
  { cmmId: 'respiratory', cmmNombre: 'Respiratorio', cmmColor: '#c58f98', cmmFuncion: 'Lleva el aire hasta los pulmones, donde el oxígeno pasa a la sangre y el dióxido de carbono sale del cuerpo.' },
  { cmmId: 'digestive', cmmNombre: 'Digestivo', cmmColor: '#c49a6a', cmmFuncion: 'Descompone los alimentos, absorbe nutrientes y agua, y elimina los desechos. Sus glándulas aportan bilis y enzimas.' },
  { cmmId: 'urinary', cmmNombre: 'Urinario', cmmColor: '#b8806a', cmmFuncion: 'Los riñones filtran la sangre y regulan líquidos y sales; la orina baja por los uréteres a la vejiga y sale por la uretra.' },
  { cmmId: 'lymphatic', cmmNombre: 'Linfático', cmmColor: '#8aa57e', cmmFuncion: 'Recupera el líquido que sale de los capilares y participa en la defensa inmunitaria del organismo.', cmmLimite: 'Solo hay unas pocas piezas; la red linfática completa no está modelada.' },
  { cmmId: 'endocrine', cmmNombre: 'Endocrino', cmmColor: '#cfa7a0', cmmFuncion: 'Libera hormonas a la sangre para coordinar el metabolismo, el crecimiento, la respuesta al estrés y la reproducción.', cmmLimite: 'Solo hay unas pocas glándulas representadas.' },
  { cmmId: 'reproductive', cmmNombre: 'Reproductor', cmmColor: '#c3a79f', cmmFuncion: 'Las estructuras masculinas representadas producen y transportan espermatozoides y fabrican hormonas sexuales.', cmmLimite: 'Solo se modela el aparato reproductor masculino.' },
  { cmmId: 'integumentary', cmmNombre: 'Superficie corporal', cmmColor: '#c2a283', cmmFuncion: 'La piel y sus anexos protegen el cuerpo, ayudan a regular la temperatura y aportan sensibilidad.' },
  { cmmId: 'connective', cmmNombre: 'Tejido conectivo', cmmColor: '#b0c8bf', cmmFuncion: 'Cartílagos, ligamentos y otros tejidos que unen, sostienen y separan estructuras, estabilizando las articulaciones.' }
];

export const CMM_SISTEMAS_INICIALES = CMM_SISTEMAS.map((cmmS) => cmmS.cmmId).filter((cmmId) => cmmId !== 'integumentary');
export const CMM_ORGANOS = ['cardiac', 'respiratory', 'digestive', 'urinary', 'endocrine', 'reproductive', 'sensory', 'lymphatic'];
export const CMM_CAPAS_EXTERNAS = new Set(['skeletal', 'muscular', 'connective', 'integumentary']);
export const CMM_CENTRO_CUERPO = new cmmTres.Vector3(0, 0.86, 0);

export async function cmmCargarAtlas(cmmAvance) {
  const cmmAtlas = await (await fetch('datos/atlas.json')).json();
  let cmmNombres = {};
  try {
    cmmNombres = await (await fetch('datos/nombres-es.json')).json();
  } catch (cmmFallo) {
    cmmNombres = {};
  }
  const cmmBloques = [];
  for (let cmmI = 0; cmmI < cmmAtlas.chunks.length; cmmI++) {
    const cmmArchivo = cmmAtlas.chunks[cmmI].url.split('/').pop();
    const cmmRespuesta = await fetch('datos/' + cmmArchivo);
    cmmBloques.push(await cmmRespuesta.arrayBuffer());
    cmmAvance(Math.round(((cmmI + 1) / cmmAtlas.chunks.length) * 100));
  }
  const cmmPiezas = cmmAtlas.parts.map((cmmP) => {
    const cmmBloque = cmmBloques[cmmP.chunk];
    const cmmNv = cmmP.vertexCount;
    const cmmCaja = new cmmTres.Box3(new cmmTres.Vector3().fromArray(cmmP.bounds[0]), new cmmTres.Vector3().fromArray(cmmP.bounds[1]));
    const cmmCentro = cmmCaja.getCenter(new cmmTres.Vector3());
    const cmmDireccion = cmmCentro.clone().sub(CMM_CENTRO_CUERPO);
    cmmDireccion.y *= 0.55;
    if (cmmDireccion.lengthSq() < 1e-8) cmmDireccion.set(0, 0, 1);
    cmmDireccion.normalize();
    return {
      cmmId: cmmP.id,
      cmmNombreEn: cmmP.name,
      cmmNombre: cmmNombres[cmmP.name.toLowerCase()] || cmmP.name,
      cmmSistema: cmmP.system,
      cmmVertices: cmmNv,
      cmmPos: new Float32Array(cmmBloque.slice(cmmP.positions, cmmP.positions + cmmNv * 12)),
      cmmNor: new Int16Array(cmmBloque.slice(cmmP.normals, cmmP.normals + cmmNv * 6)),
      cmmIndices: new Uint32Array(cmmBloque.slice(cmmP.indices, cmmP.indices + cmmP.indexCount * 4)),
      cmmCaja: cmmCaja,
      cmmCentro: cmmCentro,
      cmmDireccion: cmmDireccion,
      cmmTamano: cmmCaja.getSize(new cmmTres.Vector3()).length(),
      cmmOrden: 0
    };
  });
  cmmPiezas.cmmConceptos = cmmAtlas.concepts.map((cmmC) => ({ cmmNombreEn: cmmC.name, cmmNombre: cmmNombres[cmmC.name.toLowerCase()] || cmmC.name, cmmIds: cmmC.elements }));
  return cmmPiezas;
}

export function cmmSinTildes(cmmTexto) {
  return cmmTexto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}
