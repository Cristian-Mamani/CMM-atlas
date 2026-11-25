import { CMM_COSTE_PISTA } from './cmm-juego.js';

export const CMM_LIMITES_MISION = Object.freeze([12, 18, 25, 25]);
const CMM_MODOS_MISION = new Set(['clasico', 'libre', 'detective', 'memoria', 'diseccion', 'capas', 'cmm-parcial', 'cmm-intrusa', 'cmm-espejo', 'cmm-contrarreloj', 'cmm-conexiones', 'cmm-examen-practico']);

export function cmmDefinirMision(cmmDatos) {
  const {
    cmmId, cmmNombre, cmmDescripcion, cmmRegion, cmmSistema, cmmRequeridas, cmmReferencia = [],
    cmmModo, cmmDificultad, cmmTiempo, cmmPistas, cmmVictoria, cmmDesbloqueo = [], cmmSecuencia, cmmIntrusas, cmmVinculos
  } = cmmDatos;
  const cmmLibre = cmmModo === 'libre';
  const cmmCoste = cmmLibre || cmmDificultad === 0 ? 0 : CMM_COSTE_PISTA;
  return structuredClone({
    cmmId, cmmNombre, cmmDescripcion, cmmRegion, cmmSistema, cmmRequeridas, cmmReferencia, cmmModo, cmmDificultad,
    ...(cmmTiempo === undefined ? {} : { cmmTiempo }),
    ...(cmmIntrusas === undefined ? {} : { cmmIntrusas }),
    ...(cmmVinculos === undefined ? {} : { cmmVinculos }),
    cmmPistas: { ...cmmPistas, cmmCoste },
    cmmVictoria: cmmVictoria ?? { cmmTipo: cmmLibre ? 'cmm-libre' : 'cmm-todas-requeridas' },
    cmmDesbloqueo,
    ...(cmmSecuencia === undefined ? {} : { cmmSecuencia }),
    cmmRecompensa: cmmLibre ? { cmmTipo: 'cmm-sin-monedas' } : {
      cmmTipo: 'cmm-juego', cmmPorPieza: 'cmmPremioPregunta', cmmBonoFinal: 'cmmPremioFinal'
    }
  });
}

function cmmEsObjeto(cmmValor) {
  return cmmValor !== null && typeof cmmValor === 'object' && !Array.isArray(cmmValor);
}

function cmmTieneTexto(cmmValor) {
  return typeof cmmValor === 'string' && cmmValor.trim().length > 0;
}

function cmmTieneGeometria(cmmPieza, cmmBloques) {
  const cmmBytes = cmmBloques[cmmPieza.chunk]?.bytes;
  const { vertexCount: cmmVertices, indexCount: cmmIndices } = cmmPieza;
  return Number.isSafeInteger(cmmBytes) && Number.isSafeInteger(cmmVertices) && cmmVertices >= 3 &&
    Number.isSafeInteger(cmmIndices) && cmmIndices >= 3 && cmmIndices % 3 === 0 &&
    [[cmmPieza.positions, 12 * cmmVertices, 4], [cmmPieza.normals, 6 * cmmVertices, 2], [cmmPieza.indices, 4 * cmmIndices, 4]]
      .every(([cmmInicio, cmmLongitud, cmmAlineacion]) => Number.isSafeInteger(cmmInicio) && cmmInicio >= 0 &&
        cmmInicio % cmmAlineacion === 0 && cmmInicio + cmmLongitud <= cmmBytes);
}

export function cmmValidarMision(cmmMision, cmmAtlas, cmmManifiesto) {
  if (!cmmEsObjeto(cmmMision)) return ['Debe proporcionarse un objeto de misión.'];
  const cmmMotivos = [];
  for (const cmmCampo of ['cmmId', 'cmmNombre', 'cmmDescripcion', 'cmmRegion', 'cmmSistema', 'cmmModo']) {
    if (!cmmTieneTexto(cmmMision[cmmCampo])) cmmMotivos.push(`${cmmCampo} debe contener texto.`);
  }
  if (cmmTieneTexto(cmmMision.cmmModo) && !CMM_MODOS_MISION.has(cmmMision.cmmModo)) cmmMotivos.push('cmmModo no está disponible.');
  const cmmLimite = Number.isInteger(cmmMision.cmmDificultad) ? CMM_LIMITES_MISION[cmmMision.cmmDificultad] : undefined;
  if (!cmmLimite) cmmMotivos.push('cmmDificultad debe ser un entero de 0 a 3.');
  if (cmmMision.cmmTiempo !== undefined && (!Number.isFinite(cmmMision.cmmTiempo) || cmmMision.cmmTiempo <= 0)) cmmMotivos.push('cmmTiempo debe ser un número positivo de segundos.');
  if (['cmm-contrarreloj', 'cmm-examen-practico'].includes(cmmMision.cmmModo) && cmmMision.cmmTiempo === undefined) cmmMotivos.push('Esta misión requiere cmmTiempo.');
  const { cmmPistas, cmmVictoria, cmmRecompensa } = cmmMision;
  const cmmLibre = cmmMision.cmmModo === 'libre';
  const cmmCoste = cmmLibre || cmmMision.cmmDificultad === 0 ? 0 : CMM_COSTE_PISTA;
  if (!cmmEsObjeto(cmmPistas) || cmmPistas.cmmCoste !== cmmCoste ||
    (cmmPistas.cmmMaximo !== undefined && (!Number.isSafeInteger(cmmPistas.cmmMaximo) || cmmPistas.cmmMaximo < 0))) {
    cmmMotivos.push('cmmPistas debe respetar el coste compartido y declarar un máximo entero no negativo cuando se indique.');
  }
  if (!cmmEsObjeto(cmmVictoria) || cmmVictoria.cmmTipo !== (cmmLibre ? 'cmm-libre' : 'cmm-todas-requeridas')) {
    cmmMotivos.push('cmmVictoria debe indicar la condición admitida por el modo.');
  }
  if (!cmmEsObjeto(cmmRecompensa) || (cmmLibre ? cmmRecompensa.cmmTipo !== 'cmm-sin-monedas' :
    cmmRecompensa.cmmTipo !== 'cmm-juego' || cmmRecompensa.cmmPorPieza !== 'cmmPremioPregunta' || cmmRecompensa.cmmBonoFinal !== 'cmmPremioFinal')) {
    cmmMotivos.push('cmmRecompensa debe usar la economía compartida del modo.');
  }
  if (!Array.isArray(cmmMision.cmmDesbloqueo)) cmmMotivos.push('cmmDesbloqueo debe ser una lista.');
  if (!Array.isArray(cmmMision.cmmRequeridas) || !cmmMision.cmmRequeridas.length) cmmMotivos.push('cmmRequeridas debe contener al menos un ID.');
  if (!Array.isArray(cmmMision.cmmReferencia)) cmmMotivos.push('cmmReferencia debe ser una lista.');
  const cmmRequeridas = Array.isArray(cmmMision.cmmRequeridas) ? cmmMision.cmmRequeridas : [];
  const cmmReferencia = Array.isArray(cmmMision.cmmReferencia) ? cmmMision.cmmReferencia : [];
  const cmmIntrusas = Array.isArray(cmmMision.cmmIntrusas) ? cmmMision.cmmIntrusas : [];
  if (cmmMision.cmmModo === 'cmm-intrusa' ? !cmmIntrusas.length : cmmMision.cmmIntrusas !== undefined) cmmMotivos.push('El modo Intrusa debe declarar las piezas ajenas en cmmIntrusas.');
  if (cmmLimite && cmmRequeridas.length + cmmReferencia.length + cmmIntrusas.length > cmmLimite) cmmMotivos.push(`El límite de esta dificultad es ${cmmLimite} piezas, incluidas las referencias.`);
  if ([cmmRequeridas, cmmReferencia, cmmIntrusas].some((cmmIds) => new Set(cmmIds).size !== cmmIds.length)) cmmMotivos.push('Hay IDs repetidos en una lista de piezas.');
  const cmmActivas = new Set(cmmRequeridas);
  if (cmmReferencia.some((cmmId) => cmmActivas.has(cmmId))) cmmMotivos.push('Las piezas manipulables y las referencias deben ser disjuntas.');
  const cmmConReferencia = new Set([...cmmRequeridas, ...cmmReferencia]);
  if (cmmIntrusas.some((cmmId) => cmmConReferencia.has(cmmId))) cmmMotivos.push('Las piezas intrusas deben ser ajenas a ambos conjuntos.');
  const cmmAtlasPorId = new Map(cmmAtlas.parts.map((cmmPieza) => [cmmPieza.id, cmmPieza]));
  const cmmMallas = new Map(cmmManifiesto?.cmmMallas.map((cmmMalla) => [cmmMalla.cmmId, cmmMalla]));
  for (const cmmId of new Set([...cmmConReferencia, ...cmmIntrusas])) {
    const cmmPieza = cmmAtlasPorId.get(cmmId);
    const cmmMalla = cmmMallas.get(cmmId);
    if (!cmmTieneTexto(cmmId)) cmmMotivos.push('Cada ID de pieza debe ser texto.');
    else if (!cmmPieza) cmmMotivos.push(`ID inexistente: ${cmmId}.`);
    else if (!cmmTieneGeometria(cmmPieza, cmmAtlas.chunks) || (cmmManifiesto && (!cmmMalla || cmmMalla.cmmIncidencias.length))) cmmMotivos.push(`Geometría ausente o marcada para revisión: ${cmmId}.`);
  }
  if (cmmMision.cmmModo === 'cmm-conexiones') {
    const cmmVinculos = cmmMision.cmmVinculos;
    const cmmIds = Array.isArray(cmmVinculos) ? cmmVinculos.map((cmmVinculo) => cmmVinculo?.cmmId) : [];
    if (cmmIds.length !== cmmActivas.size || new Set(cmmIds).size !== cmmActivas.size || cmmVinculos.some((cmmVinculo) => {
      const cmmDisco = cmmAtlasPorId.get(cmmVinculo?.cmmId)?.name.toLowerCase();
      const cmmVertebra = cmmAtlasPorId.get(cmmVinculo?.cmmReferencia)?.name.toLowerCase();
      return !cmmDisco || !cmmVertebra || !cmmActivas.has(cmmVinculo.cmmId) || !cmmReferencia.includes(cmmVinculo.cmmReferencia) ||
        cmmDisco !== 'intervertebral disk of ' + cmmVertebra || cmmVinculo.cmmFuente !== 'nombre de BodyParts3D';
    })) cmmMotivos.push('Cada disco debe vincularse a una vértebra de referencia por su nombre en BodyParts3D.');
  }
  if (cmmMision.cmmSecuencia !== undefined || cmmMision.cmmModo === 'capas') {
    const cmmCapas = cmmMision.cmmSecuencia;
    if (!Array.isArray(cmmCapas) || !cmmCapas.length || cmmCapas.some((cmmCapa) => !cmmTieneTexto(cmmCapa?.cmmFuente) ||
      !Array.isArray(cmmCapa.cmmIds) || !cmmCapa.cmmIds.length)) {
      cmmMotivos.push('cmmSecuencia debe contener capas con fuente e IDs.');
    } else {
      const cmmIds = cmmCapas.flatMap((cmmCapa) => cmmCapa.cmmIds);
      if (cmmIds.length !== cmmActivas.size || new Set(cmmIds).size !== cmmActivas.size || cmmIds.some((cmmId) => !cmmActivas.has(cmmId))) cmmMotivos.push('La secuencia debe incluir exactamente una vez cada pieza manipulable.');
    }
  }
  return cmmMotivos;
}
