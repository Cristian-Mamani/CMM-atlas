import { CMM_EXAMEN_PRACTICO } from './cmm-builder-examen.js';

export const CMM_CAPITULOS_BUILDER = [
  { cmmNombre: 'Huesos', cmmEtapas: [
    { cmmId: 'pelvis', cmmRegion: 'pelvis', cmmPrevias: [] },
    { cmmId: 'cmm-columna-lumbar', cmmRegion: 'abdomen', cmmPrevias: ['pelvis'] },
    { cmmId: 'craneo', cmmRegion: 'cabeza', cmmPrevias: ['cmm-columna-lumbar'] }
  ] },
  { cmmNombre: 'Órganos', cmmEtapas: [
    { cmmId: 'cmm-abdomen-digestivo', cmmRegion: 'abdomen', cmmPrevias: ['craneo'] },
    { cmmId: 'cmm-torax-vias-aereas', cmmRegion: 'torax', cmmPrevias: ['cmm-abdomen-digestivo'] },
    { cmmId: 'abdomen', cmmRegion: 'abdomen', cmmPrevias: ['cmm-torax-vias-aereas'] }
  ] },
  { cmmNombre: 'Músculos', cmmPendiente: 'Las dos misiones de brazo están en el catálogo. Falta validar una ruta de campaña.' },
  { cmmNombre: 'Conexiones', cmmPendiente: 'Los discos lumbares están en Conexiones óseas. Faltan más vínculos de origen verificables para un capítulo.' },
  { cmmNombre: 'Integración regional', cmmPendiente: 'Falta verificar una secuencia que integre varios sistemas.' }
];

export function cmmEstadoCampana(cmmHistorial, cmmCatalogo) {
  const cmmCompletadas = new Set(cmmHistorial.filter((cmmP) => !cmmP.cmmPractica && (cmmP.cmmModo ?? 'clasico') === 'clasico').map((cmmP) => cmmP.cmmId));
  const cmmPorId = new Map(cmmCatalogo.map((cmmReto) => [cmmReto.cmmId, cmmReto]));
  return CMM_CAPITULOS_BUILDER.map((cmmCapitulo) => ({
    ...cmmCapitulo,
    cmmEtapas: (cmmCapitulo.cmmEtapas ?? []).map((cmmEtapa) => {
      const cmmReto = cmmPorId.get(cmmEtapa.cmmId);
      const cmmFaltantes = cmmEtapa.cmmPrevias.filter((cmmId) => !cmmCompletadas.has(cmmId));
      return {
        ...cmmEtapa, cmmReto, cmmCompletada: cmmCompletadas.has(cmmEtapa.cmmId), cmmBloqueada: !cmmReto || cmmFaltantes.length > 0,
        cmmMotivo: !cmmReto ? 'Misión sin datos disponibles.' : cmmFaltantes.map((cmmId) => cmmPorId.get(cmmId)?.cmmNombre ?? cmmId).join(', ')
      };
    })
  }));
}

export function cmmFechaBuilder(cmmFecha = new Date()) {
  return [cmmFecha.getFullYear(), cmmFecha.getMonth() + 1, cmmFecha.getDate()].map((cmmN) => String(cmmN).padStart(2, '0')).join('-');
}

export function cmmDesafioDiario(cmmCatalogo, cmmFecha = cmmFechaBuilder()) {
  const cmmMisiones = cmmCatalogo.filter((cmmR) => cmmR.cmmModo === 'clasico' && cmmR.cmmDificultad === 0).sort((cmmA, cmmB) => cmmA.cmmId.localeCompare(cmmB.cmmId, 'es'));
  if (!cmmMisiones.length) return null;
  let cmmSemilla = 2166136261;
  for (const cmmCaracter of `${cmmFecha}/${cmmMisiones.map((cmmR) => cmmR.cmmId).join('/')}`) cmmSemilla = Math.imul(cmmSemilla ^ cmmCaracter.charCodeAt(0), 16777619);
  cmmSemilla >>>= 0;
  return { cmmFecha, cmmSemilla, cmmReto: cmmMisiones[cmmSemilla % cmmMisiones.length] };
}

export function cmmRachaDiaria(cmmPartidas, cmmFecha = new Date()) {
  const cmmDias = new Set(cmmPartidas.filter((cmmP) => !cmmP.cmmPractica).map((cmmP) => cmmP.cmmDia));
  const cmmDia = new Date(cmmFecha);
  if (!cmmDias.has(cmmFechaBuilder(cmmDia))) cmmDia.setDate(cmmDia.getDate() - 1);
  let cmmRacha = 0;
  while (cmmDias.has(cmmFechaBuilder(cmmDia))) {
    cmmRacha++;
    cmmDia.setDate(cmmDia.getDate() - 1);
  }
  return cmmRacha;
}

export function cmmLogrosBuilder(cmmHistorial) {
  const cmmValidas = cmmHistorial.filter((cmmP) => !cmmP.cmmPractica && cmmP.cmmModo !== CMM_EXAMEN_PRACTICO);
  return [
    ['Primer ensamblaje', cmmValidas.length > 0],
    ['Sin pistas', cmmValidas.some((cmmP) => cmmP.cmmPistas === 0)],
    ['Reconstrucción perfecta', cmmValidas.some((cmmP) => cmmP.cmmErrores === 0 && cmmP.cmmPistas === 0 && cmmP.cmmPrecision === 100)],
    ['Maestro del cráneo', cmmValidas.some((cmmP) => cmmP.cmmId === 'craneo' && cmmP.cmmNivel === 3 && cmmP.cmmErrores === 0)],
    ['Dominio de lateralidad', cmmValidas.some((cmmP) => cmmP.cmmModo === 'cmm-espejo' && cmmP.cmmErrores === 0 && cmmP.cmmPistas === 0)]
  ].filter(([, cmmObtenido]) => cmmObtenido).map(([cmmNombre]) => cmmNombre);
}

export function cmmEstadosRegiones(cmmCapitulos) {
  const cmmRegiones = new Map();
  for (const cmmEtapa of cmmCapitulos.flatMap((cmmC) => cmmC.cmmEtapas)) {
    const cmmRegion = cmmRegiones.get(cmmEtapa.cmmRegion) ?? { cmmTotales: 0, cmmHechas: 0 };
    cmmRegion.cmmTotales++;
    cmmRegion.cmmHechas += Number(cmmEtapa.cmmCompletada);
    cmmRegiones.set(cmmEtapa.cmmRegion, cmmRegion);
  }
  return [...cmmRegiones].map(([cmmId, cmmR]) => ({ cmmId,
    cmmEstado: cmmR.cmmHechas === 0 ? 'Sin empezar' : cmmR.cmmHechas === cmmR.cmmTotales ? 'Dominada' : 'En progreso',
    ...cmmR }));
}
