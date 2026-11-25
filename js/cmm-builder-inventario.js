import { cmmRegionDe } from './cmm-regiones.js';

const CMM_DIAGONAL_MINIMA = .001;
const CMM_DIAGONAL_MAXIMA = 1;

function cmmAgrupar(cmmElementos, cmmClaveDe) {
  const cmmGrupos = new Map();
  for (const cmmElemento of cmmElementos) {
    const cmmClave = cmmClaveDe(cmmElemento);
    if (!cmmGrupos.has(cmmClave)) cmmGrupos.set(cmmClave, []);
    cmmGrupos.get(cmmClave).push(cmmElemento);
  }
  return cmmGrupos;
}

function cmmCajaInventario(cmmLimites) {
  if (!Array.isArray(cmmLimites) || cmmLimites.length !== 2) return null;
  const [cmmMinimo, cmmMaximo] = cmmLimites;
  if (![cmmMinimo, cmmMaximo].every((cmmExtremo) => Array.isArray(cmmExtremo) && cmmExtremo.length === 3 && cmmExtremo.every(Number.isFinite))) return null;
  const [cmmX, cmmY, cmmZ] = cmmMaximo.map((cmmValor, cmmEje) => cmmValor - cmmMinimo[cmmEje]);
  const cmmDiagonal = Math.hypot(cmmX, cmmY, cmmZ);
  if (!Number.isFinite(cmmDiagonal) || cmmX < 0 || cmmY < 0 || cmmZ < 0 || cmmDiagonal === 0) return null;
  return { cmmX, cmmY, cmmZ, cmmDiagonal };
}

function cmmTrianguloTieneArea(cmmVista, cmmInicio, cmmA, cmmB, cmmC) {
  const cmmLeer = (cmmIndice, cmmEje) => cmmVista.getFloat32(cmmInicio + cmmIndice * 12 + cmmEje * 4, true);
  const cmmAB = [0, 1, 2].map((cmmEje) => cmmLeer(cmmB, cmmEje) - cmmLeer(cmmA, cmmEje));
  const cmmAC = [0, 1, 2].map((cmmEje) => cmmLeer(cmmC, cmmEje) - cmmLeer(cmmA, cmmEje));
  return cmmAB[1] * cmmAC[2] !== cmmAB[2] * cmmAC[1] ||
    cmmAB[2] * cmmAC[0] !== cmmAB[0] * cmmAC[2] ||
    cmmAB[0] * cmmAC[1] !== cmmAB[1] * cmmAC[0];
}

function cmmRevisarGeometria(cmmPieza, cmmDescriptor, cmmVista) {
  const { vertexCount: cmmVertices, indexCount: cmmIndices, positions: cmmPos, normals: cmmNor, indices: cmmInd } = cmmPieza;
  if (cmmVertices === 0 || cmmIndices === 0) return 'cmm-geometria-vacia';
  if (!Number.isSafeInteger(cmmVertices) || cmmVertices < 3 || !Number.isSafeInteger(cmmIndices) || cmmIndices < 3 || cmmIndices % 3) return 'cmm-conteos-invalidos';
  if (!cmmDescriptor || !cmmVista || cmmVista.byteLength !== cmmDescriptor.bytes) return 'cmm-bloque-ausente-o-incompleto';
  const cmmTramos = [[cmmPos, cmmVertices * 12, 4], [cmmNor, cmmVertices * 6, 2], [cmmInd, cmmIndices * 4, 4]];
  if (cmmTramos.some(([cmmInicio, cmmLongitud, cmmAlineacion]) => !Number.isSafeInteger(cmmInicio) || cmmInicio < 0 || cmmInicio % cmmAlineacion || cmmInicio + cmmLongitud > cmmVista.byteLength)) return 'cmm-rango-invalido';
  cmmTramos.sort(([cmmA], [cmmB]) => cmmA - cmmB);
  if (cmmTramos.some(([cmmInicio, cmmLongitud], cmmI) => cmmI < cmmTramos.length - 1 && cmmInicio + cmmLongitud > cmmTramos[cmmI + 1][0])) return 'cmm-rangos-superpuestos';
  for (let cmmI = cmmPos; cmmI < cmmPos + cmmVertices * 12; cmmI += 4) {
    if (!Number.isFinite(cmmVista.getFloat32(cmmI, true))) return 'cmm-vertice-invalido';
  }
  let cmmTieneArea = false;
  for (let cmmI = cmmInd; cmmI < cmmInd + cmmIndices * 4; cmmI += 12) {
    const cmmA = cmmVista.getUint32(cmmI, true);
    const cmmB = cmmVista.getUint32(cmmI + 4, true);
    const cmmC = cmmVista.getUint32(cmmI + 8, true);
    if (Math.max(cmmA, cmmB, cmmC) >= cmmVertices) return 'cmm-indice-fuera-de-rango';
    if (!cmmTieneArea) cmmTieneArea = cmmTrianguloTieneArea(cmmVista, cmmPos, cmmA, cmmB, cmmC);
  }
  return cmmTieneArea ? null : 'cmm-geometria-sin-area';
}

function cmmClaveGeometria(cmmPieza) {
  return [cmmPieza.chunk, cmmPieza.positions, cmmPieza.normals, cmmPieza.indices, cmmPieza.vertexCount, cmmPieza.indexCount].join('/');
}

export function cmmCrearInventarioBuilder(cmmAtlas, cmmNombres, cmmBloques) {
  const cmmPorId = cmmAgrupar(cmmAtlas.parts, (cmmPieza) => cmmPieza.id);
  const cmmPorNombre = cmmAgrupar(cmmAtlas.parts, (cmmPieza) => cmmPieza.name.toLowerCase());
  const cmmPorGeometria = cmmAgrupar(cmmAtlas.parts, cmmClaveGeometria);
  const cmmPorConceptoDirecto = cmmAgrupar(cmmAtlas.parts, (cmmPieza) => cmmPieza.conceptId);
  const cmmPorConcepto = cmmAgrupar(cmmAtlas.concepts, (cmmConcepto) => cmmConcepto.id);
  const cmmVistas = new Map(Array.from(cmmBloques, ([cmmIndice, cmmBloque]) => [cmmIndice, new DataView(cmmBloque.buffer, cmmBloque.byteOffset, cmmBloque.byteLength)]));
  const cmmSinTraduccion = new Set();
  const cmmTraducir = (cmmNombre) => {
    const cmmClave = cmmNombre.toLowerCase();
    const cmmTraduccion = Object.hasOwn(cmmNombres, cmmClave) ? cmmNombres[cmmClave] : null;
    if (typeof cmmTraduccion === 'string' && cmmTraduccion.trim()) return cmmTraduccion;
    cmmSinTraduccion.add(cmmNombre);
    return cmmNombre;
  };
  const cmmMallas = cmmAtlas.parts.map((cmmPieza) => {
    const cmmCaja = cmmCajaInventario(cmmPieza.bounds);
    const cmmIncidencias = [];
    const cmmGeometria = cmmRevisarGeometria(cmmPieza, cmmAtlas.chunks[cmmPieza.chunk], cmmVistas.get(cmmPieza.chunk));
    if (cmmGeometria) cmmIncidencias.push(cmmGeometria);
    if (!cmmCaja) cmmIncidencias.push('cmm-caja-invalida');
    else if (cmmCaja.cmmDiagonal < CMM_DIAGONAL_MINIMA || cmmCaja.cmmDiagonal > CMM_DIAGONAL_MAXIMA) cmmIncidencias.push('cmm-escala-por-revisar');
    if (cmmPorId.get(cmmPieza.id).length > 1) cmmIncidencias.push('cmm-id-duplicado');
    if (cmmPorGeometria.get(cmmClaveGeometria(cmmPieza)).length > 1) cmmIncidencias.push('cmm-rango-geometrico-compartido');
    const [cmmConcepto] = cmmPorConcepto.get(cmmPieza.conceptId) ?? [];
    const cmmConceptoUnico = cmmConcepto && cmmPorConcepto.get(cmmPieza.conceptId).length === 1;
    let cmmTipo = 'cmm-concepto-no-resuelto';
    if (!cmmConceptoUnico || !cmmConcepto.elements.includes(cmmPieza.id)) cmmIncidencias.push('cmm-concepto-no-resuelto');
    else cmmTipo = cmmConcepto.elements.length === 1 && cmmPorConceptoDirecto.get(cmmPieza.conceptId).length === 1 ? 'cmm-malla-individual' : 'cmm-parte-de-concepto';
    const cmmCentro = cmmCaja && Object.fromEntries(['x', 'y', 'z'].map((cmmEje, cmmI) => [cmmEje, (cmmPieza.bounds[0][cmmI] + cmmPieza.bounds[1][cmmI]) / 2]));
    const cmmIzquierda = /\bleft\b/i.test(cmmPieza.name);
    const cmmDerecha = /\bright\b/i.test(cmmPieza.name);
    return {
      cmmId: cmmPieza.id,
      cmmNombre: cmmTraducir(cmmPieza.name),
      cmmSistema: cmmPieza.system,
      cmmRegion: cmmCentro ? cmmRegionDe({ cmmCentro }).cmmId : null,
      cmmLado: cmmIzquierda === cmmDerecha ? null : cmmIzquierda ? 'izquierda' : 'derecha',
      cmmCaja,
      cmmConceptoId: cmmPieza.conceptId,
      cmmTipo,
      cmmIncidencias
    };
  });
  const cmmConceptos = cmmAtlas.concepts.map((cmmConcepto) => ({
    cmmId: cmmConcepto.id,
    cmmNombre: cmmTraducir(cmmConcepto.name),
    cmmMallas: [...new Set(cmmConcepto.elements)],
    cmmReferenciasNoResueltas: cmmConcepto.elements.filter((cmmId) => cmmPorId.get(cmmId)?.length !== 1),
    cmmIdDuplicado: cmmPorConcepto.get(cmmConcepto.id).length > 1,
    cmmTieneElementosDuplicados: new Set(cmmConcepto.elements).size !== cmmConcepto.elements.length
  }));
  return {
    cmmFuente: cmmAtlas.version,
    cmmUnidadCaja: 'm',
    cmmRangoRevision: [CMM_DIAGONAL_MINIMA, CMM_DIAGONAL_MAXIMA],
    cmmMallas,
    cmmConceptos,
    cmmCandidatas: cmmMallas.filter((cmmMalla) => cmmMalla.cmmTipo === 'cmm-malla-individual' && !cmmMalla.cmmIncidencias.length).map((cmmMalla) => cmmMalla.cmmId),
    cmmNombresCompartidos: [...cmmPorNombre.values()].filter((cmmGrupo) => cmmGrupo.length > 1).map((cmmGrupo) => cmmGrupo.map((cmmPieza) => cmmPieza.id)),
    cmmTraduccionesFaltantes: [...cmmSinTraduccion]
  };
}
