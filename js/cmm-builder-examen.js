import { CMM_LIMITES_MISION, cmmDefinirMision } from './cmm-builder-misiones.js';

export const CMM_EXAMEN_PRACTICO = 'cmm-examen-practico';

export function cmmCrearExamenPractico(cmmCatalogo, cmmConfig, cmmSemilla) {
  const { cmmRegion, cmmSistema, cmmCantidad, cmmTiempo, cmmDificultad, cmmAyudas } = cmmConfig;
  if (!Number.isInteger(cmmDificultad) || !CMM_LIMITES_MISION[cmmDificultad] || !Number.isInteger(cmmCantidad) || cmmCantidad < 2 ||
    cmmCantidad > CMM_LIMITES_MISION[cmmDificultad] || !Number.isInteger(cmmTiempo) || cmmTiempo < 30 || cmmTiempo > 900 || typeof cmmAyudas !== 'boolean') {
    throw new Error('Elige dificultad, entre 2 piezas y el límite permitido, y un tiempo de 30 a 900 segundos.');
  }
  const cmmDisponibles = cmmCatalogo.filter((cmmR) => cmmR.cmmModo === 'clasico' && cmmR.cmmRequeridas.length >= cmmCantidad &&
    (!cmmRegion || cmmR.cmmRegion === cmmRegion) && (!cmmSistema || cmmR.cmmSistema === cmmSistema));
  if (!cmmDisponibles.length) throw new Error('Ninguna región del catálogo ofrece esa cantidad para los filtros elegidos.');
  let cmmEstado = cmmSemilla >>> 0;
  const cmmSiguiente = () => {
    cmmEstado = (Math.imul(cmmEstado, 1664525) + 1013904223) >>> 0;
    return cmmEstado / 4294967296;
  };
  const cmmReto = cmmDisponibles[Math.floor(cmmSiguiente() * cmmDisponibles.length)];
  const cmmIds = [...cmmReto.cmmRequeridas];
  for (let cmmI = cmmIds.length - 1; cmmI > 0; cmmI--) {
    const cmmJ = Math.floor(cmmSiguiente() * (cmmI + 1));
    [cmmIds[cmmI], cmmIds[cmmJ]] = [cmmIds[cmmJ], cmmIds[cmmI]];
  }
  const cmmReferencia = cmmIds.slice(cmmCantidad, Math.min(cmmCantidad + 1, CMM_LIMITES_MISION[cmmDificultad]));
  return cmmDefinirMision({ cmmId: 'cmm-examen-' + cmmReto.cmmId, cmmNombre: 'Examen práctico · ' + cmmReto.cmmRegion,
    cmmDescripcion: 'Evaluación educativa interna de ensamblaje. No otorga certificación profesional.', cmmModo: CMM_EXAMEN_PRACTICO,
    cmmRegion: cmmReto.cmmRegion, cmmSistema: cmmReto.cmmSistema, cmmDificultad, cmmRequeridas: cmmIds.slice(0, cmmCantidad), cmmReferencia,
    cmmTiempo, cmmPistas: { cmmMaximo: cmmAyudas ? 1 : 0 } });
}
