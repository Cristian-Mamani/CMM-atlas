const CMM_CLAVES_LOCALES = new Set(['cmm.juego.v1', 'cmm.builder.v1', 'cmm.builder.v2', 'cmm.progreso.v1', 'cmm.niveles.v1', 'cmm.vistas.v1']);
const CMM_RESPALDO_LOCAL = /^cmm\.builder\.v2\.respaldo(?:\.\d+)?$/;

function cmmListarClavesLocales(cmmAlmacen) {
  const cmmClaves = [];
  for (let cmmI = 0; cmmI < cmmAlmacen.length; cmmI++) {
    const cmmClave = cmmAlmacen.key(cmmI);
    if (CMM_CLAVES_LOCALES.has(cmmClave) || CMM_RESPALDO_LOCAL.test(cmmClave)) cmmClaves.push(cmmClave);
  }
  return cmmClaves.sort();
}

export function cmmExportarDatosLocales(cmmAlmacen) {
  return JSON.stringify({ cmmVersion: 1, cmmDatos: Object.fromEntries(cmmListarClavesLocales(cmmAlmacen).map((cmmClave) => [cmmClave, cmmAlmacen.getItem(cmmClave)])) }, null, 2);
}

export function cmmBorrarDatosLocales(cmmAlmacen) {
  for (const cmmClave of cmmListarClavesLocales(cmmAlmacen)) cmmAlmacen.removeItem(cmmClave);
}
