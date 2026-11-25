export const CMM_REGIONES = [
  { cmmId: 'cuerpo', cmmNombre: 'Cuerpo completo', cmmContiene: () => true },
  { cmmId: 'cabeza', cmmNombre: 'Cabeza y cuello', cmmContiene: (cmmP) => cmmP.cmmCentro.y >= 1.4 && Math.abs(cmmP.cmmCentro.x) < 0.17 },
  { cmmId: 'torax', cmmNombre: 'Tórax', cmmContiene: (cmmP) => cmmP.cmmCentro.y >= 1.17 && cmmP.cmmCentro.y < 1.4 && Math.abs(cmmP.cmmCentro.x) < 0.17 },
  { cmmId: 'abdomen', cmmNombre: 'Abdomen', cmmContiene: (cmmP) => cmmP.cmmCentro.y >= 0.96 && cmmP.cmmCentro.y < 1.17 && Math.abs(cmmP.cmmCentro.x) < 0.17 },
  { cmmId: 'pelvis', cmmNombre: 'Pelvis', cmmContiene: (cmmP) => cmmP.cmmCentro.y >= 0.84 && cmmP.cmmCentro.y < 0.96 && Math.abs(cmmP.cmmCentro.x) < 0.17 },
  { cmmId: 'superior', cmmNombre: 'Miembro superior', cmmContiene: (cmmP) => Math.abs(cmmP.cmmCentro.x) >= 0.17 && cmmP.cmmCentro.y >= 0.6 },
  { cmmId: 'inferior', cmmNombre: 'Miembro inferior', cmmContiene: (cmmP) => cmmP.cmmCentro.y < 0.84 && Math.abs(cmmP.cmmCentro.x) < 0.17 }
];

export function cmmRegionDe(cmmPieza) {
  for (const cmmR of CMM_REGIONES.slice(1)) {
    if (cmmR.cmmContiene(cmmPieza)) return cmmR;
  }
  return CMM_REGIONES[0];
}

export function cmmLado(cmmPieza) {
  if (cmmPieza.cmmCentro.x > 0.012) return 'lado izquierdo';
  if (cmmPieza.cmmCentro.x < -0.012) return 'lado derecho';
  return 'línea media';
}

export function cmmUbicacion(cmmPieza) {
  const cmmR = cmmRegionDe(cmmPieza);
  return cmmR.cmmNombre + ', ' + cmmLado(cmmPieza);
}
