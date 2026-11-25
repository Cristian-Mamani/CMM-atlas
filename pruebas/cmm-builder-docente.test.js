import cmmPrueba from 'node:test';
import cmmAfirmar from 'node:assert/strict';
import { readFileSync as cmmLeer } from 'node:fs';
import { CMM_DOCENTE_MAXIMO, cmmExportarDocente, cmmImportarDocente, cmmMisionDocente } from '../js/cmm-builder-docente.js';

const CMM_ATLAS_DOCENTE = JSON.parse(cmmLeer(new URL('../datos/atlas.json', import.meta.url)));
const CMM_ID_DOCENTE = 'cmm-docente-6ff7f034-0ed3-468d-abc2-8df20066db00';
const CMM_FICHA_DOCENTE = { cmmNombre: 'Pelvis <A>', cmmDescripcion: 'Encaja el coxal.', cmmDificultad: 1,
  cmmRequeridas: ['FJ3152'], cmmReferencia: ['FJ3393'], cmmPistas: 2 };

cmmPrueba('el archivo docente es reproducible y contiene solo los IDs y reglas permitidos', () => {
  const cmmMision = cmmMisionDocente(CMM_FICHA_DOCENTE, CMM_ID_DOCENTE, CMM_ATLAS_DOCENTE);
  const cmmJson = cmmExportarDocente(cmmMision);
  cmmAfirmar.deepEqual(JSON.parse(cmmJson), { cmmVersion: 1, cmmMision: CMM_FICHA_DOCENTE });
  cmmAfirmar.deepEqual(cmmImportarDocente(cmmJson, CMM_ID_DOCENTE, CMM_ATLAS_DOCENTE), cmmMision);
});

cmmPrueba('el editor rechaza versión, tamaño, campos fuera del contrato y entradas incorrectas', () => {
  const cmmImportar = (cmmTexto) => cmmImportarDocente(cmmTexto, CMM_ID_DOCENTE, CMM_ATLAS_DOCENTE);
  cmmAfirmar.throws(() => cmmImportar('['), /JSON/);
  cmmAfirmar.throws(() => cmmImportar('á'.repeat(CMM_DOCENTE_MAXIMO)), /16 KiB/);
  cmmAfirmar.throws(() => cmmImportar(JSON.stringify({ cmmVersion: 10, cmmMision: CMM_FICHA_DOCENTE })), /Versión/);
  cmmAfirmar.throws(() => cmmImportar(JSON.stringify({ cmmVersion: 1, cmmMision: { ...CMM_FICHA_DOCENTE, cmmMalla: [] } })), /campos/);
  cmmAfirmar.throws(() => cmmImportar(JSON.stringify({ cmmVersion: 1, cmmMision: { ...CMM_FICHA_DOCENTE, cmmPistas: '2' } })), /pistas/);
  const cmmAtlasRecortado = { ...CMM_ATLAS_DOCENTE, parts: CMM_ATLAS_DOCENTE.parts.filter((cmmP) => cmmP.id !== 'FJ3152') };
  cmmAfirmar.throws(() => cmmImportarDocente(JSON.stringify({ cmmVersion: 1, cmmMision: CMM_FICHA_DOCENTE }), CMM_ID_DOCENTE, cmmAtlasRecortado), /ID inexistente/);
});
