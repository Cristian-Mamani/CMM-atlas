import { cmmDefinirMision, cmmValidarMision } from './cmm-builder-misiones.js';

const CMM_DOCENTE_CAMPOS = ['cmmNombre', 'cmmDescripcion', 'cmmDificultad', 'cmmRequeridas', 'cmmReferencia', 'cmmPistas'];
export const CMM_DOCENTE_MAXIMO = 16384;

export function cmmMisionDocente(cmmFicha, cmmId, cmmAtlas, cmmInventario) {
  if (!cmmFicha || typeof cmmFicha !== 'object' || Array.isArray(cmmFicha) || !/^cmm-docente-[a-f0-9-]{36}$/.test(cmmId)) throw new Error('Formato de misión docente inválido.');
  if (typeof cmmFicha.cmmNombre !== 'string' || cmmFicha.cmmNombre.trim().length > 70 ||
    typeof cmmFicha.cmmDescripcion !== 'string' || cmmFicha.cmmDescripcion.trim().length > 300 ||
    ![0, 1, 2, 3, 4].includes(cmmFicha.cmmPistas) || !Array.isArray(cmmFicha.cmmRequeridas) || !Array.isArray(cmmFicha.cmmReferencia)) {
    throw new Error('Revisa nombre, instrucciones, número de pistas y listas de IDs.');
  }
  const cmmMision = cmmDefinirMision({
    cmmId, cmmNombre: cmmFicha.cmmNombre.trim(), cmmDescripcion: cmmFicha.cmmDescripcion.trim(), cmmDificultad: cmmFicha.cmmDificultad,
    cmmRequeridas: cmmFicha.cmmRequeridas, cmmReferencia: cmmFicha.cmmReferencia,
    cmmModo: 'clasico', cmmRegion: 'Personalizada', cmmSistema: 'multisistema', cmmPistas: { cmmMaximo: cmmFicha.cmmPistas }
  });
  const cmmMotivos = cmmValidarMision(cmmMision, cmmAtlas, cmmInventario);
  if (cmmMotivos.length) throw new Error(cmmMotivos.join(' '));
  return cmmMision;
}

export function cmmFichaDocente(cmmReto) {
  return Object.fromEntries(CMM_DOCENTE_CAMPOS.map((cmmCampo) => [cmmCampo,
    cmmCampo === 'cmmPistas' ? cmmReto.cmmPistas.cmmMaximo : cmmReto[cmmCampo]
  ]));
}

export function cmmExportarDocente(cmmReto) {
  return JSON.stringify({ cmmVersion: 1, cmmMision: cmmFichaDocente(cmmReto) }, null, 2);
}

export function cmmImportarDocente(cmmTexto, cmmId, cmmAtlas, cmmInventario) {
  if (typeof cmmTexto !== 'string' || new TextEncoder().encode(cmmTexto).length > CMM_DOCENTE_MAXIMO) throw new Error('El archivo supera el límite de 16 KiB.');
  let cmmArchivo;
  try { cmmArchivo = JSON.parse(cmmTexto); } catch { throw new Error('El archivo no contiene JSON válido.'); }
  if (cmmArchivo?.cmmVersion !== 1) throw new Error('Versión de archivo docente no disponible.');
  const cmmFicha = cmmArchivo.cmmMision;
  if (Object.keys(cmmArchivo).some((cmmCampo) => !['cmmVersion', 'cmmMision'].includes(cmmCampo)) ||
    !cmmFicha || Object.keys(cmmFicha).some((cmmCampo) => !CMM_DOCENTE_CAMPOS.includes(cmmCampo))) throw new Error('El archivo incluye campos no reconocidos.');
  return cmmMisionDocente(cmmFicha, cmmId, cmmAtlas, cmmInventario);
}
