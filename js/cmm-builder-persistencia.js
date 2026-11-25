export const CMM_CLAVE_BUILDER_V1 = 'cmm.builder.v1';
export const CMM_CLAVE_BUILDER_V2 = 'cmm.builder.v2';
const CMM_RESPALDO_BUILDER = 'cmm.builder.v2.respaldo';

function cmmObjeto(cmmDato) {
  return cmmDato !== null && typeof cmmDato === 'object' && !Array.isArray(cmmDato);
}

function cmmListaValidada(cmmLista, cmmComprobar) {
  if (cmmLista === undefined) return [];
  if (!Array.isArray(cmmLista) || !cmmLista.every(cmmComprobar)) throw new Error('Registros de Builder inválidos.');
  return cmmLista;
}

function cmmPartidaValida(cmmPartida) {
  return cmmObjeto(cmmPartida) && typeof cmmPartida.cmmId === 'string' && cmmPartida.cmmId.length > 0 &&
    Number.isFinite(cmmPartida.cmmTiempo) && cmmPartida.cmmTiempo >= 0 &&
    (cmmPartida.cmmModo !== 'cmm-examen-practico' || Array.isArray(cmmPartida.cmmPiezas) && Number.isSafeInteger(cmmPartida.cmmTotal));
}

function cmmDocenteValida(cmmDocente) {
  return cmmObjeto(cmmDocente) && /^cmm-docente-[a-f0-9-]{36}$/.test(cmmDocente.cmmId) &&
    typeof cmmDocente.cmmNombre === 'string' && typeof cmmDocente.cmmDescripcion === 'string' &&
    Array.isArray(cmmDocente.cmmRequeridas) && Array.isArray(cmmDocente.cmmReferencia) && cmmObjeto(cmmDocente.cmmPistas);
}

function cmmNormalizarHistorial(cmmDato, cmmVersion) {
  if (!cmmObjeto(cmmDato) || cmmVersion === 2 && cmmDato.cmmVersion !== 2) throw new Error('Versión de historial no disponible.');
  const cmmPartidas = cmmListaValidada(cmmVersion === 2 ? cmmDato.cmmHistorial : cmmDato.cmmPartidas, cmmPartidaValida);
  return { cmmAjustes: cmmObjeto(cmmDato.cmmAjustes) ? cmmDato.cmmAjustes : {}, cmmPartidas,
    cmmDocentes: cmmListaValidada(cmmDato.cmmDocentes, cmmDocenteValida) };
}

export function cmmGuardarHistorialBuilder(cmmAlmacen, cmmHistorial) {
  const cmmPartidas = cmmHistorial.cmmPartidas ?? [];
  const cmmContenedor = {
    cmmVersion: 2,
    cmmAjustes: cmmHistorial.cmmAjustes ?? {},
    cmmHistorial: cmmPartidas,
    cmmDocentes: cmmHistorial.cmmDocentes ?? [],
    cmmMisiones: [...new Set(cmmPartidas.map((cmmP) => cmmP.cmmId))],
    cmmCampana: 'cmmHistorial', cmmDominio: 'cmm.progreso.v1', cmmExamenes: 'cmmHistorial', cmmLogros: 'cmmHistorial', cmmRecords: 'cmmHistorial'
  };
  cmmNormalizarHistorial(cmmContenedor, 2);
  const cmmJson = JSON.stringify(cmmContenedor);
  cmmAlmacen.setItem(CMM_CLAVE_BUILDER_V2, cmmJson);
}

export function cmmLeerHistorialBuilder(cmmAlmacen) {
  const cmmVacio = { cmmAjustes: {}, cmmPartidas: [], cmmDocentes: [] };
  let cmmClave = CMM_CLAVE_BUILDER_V2;
  let cmmCrudo;
  try {
    cmmCrudo = cmmAlmacen.getItem(cmmClave);
    if (cmmCrudo == null) {
      cmmClave = CMM_CLAVE_BUILDER_V1;
      cmmCrudo = cmmAlmacen.getItem(cmmClave);
    }
  } catch {
    return { ...cmmVacio, cmmSoloLectura: true, cmmAviso: 'No se pudo leer el historial normalmente.' };
  }
  if (cmmCrudo == null) return cmmVacio;
  let cmmHistorial;
  try {
    cmmHistorial = cmmNormalizarHistorial(JSON.parse(cmmCrudo), cmmClave === CMM_CLAVE_BUILDER_V2 ? 2 : 1);
  } catch {
    try {
      const cmmCopia = JSON.stringify({ cmmClave, cmmContenido: cmmCrudo });
      let cmmNombre = CMM_RESPALDO_BUILDER;
      let cmmNumero = 1;
      let cmmRespaldo = cmmAlmacen.getItem(cmmNombre);
      while (cmmRespaldo != null && cmmRespaldo !== cmmCopia && cmmNumero <= 32) {
        cmmNombre = CMM_RESPALDO_BUILDER + '.' + cmmNumero++;
        cmmRespaldo = cmmAlmacen.getItem(cmmNombre);
      }
      if (cmmRespaldo != null && cmmRespaldo !== cmmCopia) throw new Error('No hay espacio reservado para otro respaldo.');
      cmmAlmacen.setItem(cmmNombre, cmmCopia);
      return { ...cmmVacio, cmmAviso: 'El historial estaba dañado. Se guardó un respaldo local del original.' };
    } catch {
      return { ...cmmVacio, cmmSoloLectura: true, cmmAviso: 'El historial estaba dañado y no se pudo respaldar. Se conserva el original.' };
    }
  }
  if (cmmClave === CMM_CLAVE_BUILDER_V1) {
    try { cmmGuardarHistorialBuilder(cmmAlmacen, cmmHistorial); }
    catch { cmmHistorial.cmmAviso = 'Se leyó el historial anterior. Falta espacio o permiso para migrarlo.'; }
  }
  return cmmHistorial;
}
