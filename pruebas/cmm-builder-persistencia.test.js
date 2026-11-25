import cmmPrueba from 'node:test';
import cmmAfirmar from 'node:assert/strict';
import { CMM_CLAVE_BUILDER_V1, CMM_CLAVE_BUILDER_V2, cmmGuardarHistorialBuilder, cmmLeerHistorialBuilder } from '../js/cmm-builder-persistencia.js';
import { cmmSimularAlmacenamiento } from './cmm-almacenamiento-prueba.js';

const CMM_V1_PRUEBA = { cmmAjustes: { layout: 'mesa' }, cmmPartidas: [{ cmmId: 'abdomen', cmmNivel: 0, cmmTiempo: 72000 }] };

cmmPrueba('la migración conserva la versión anterior, las victorias y el récord sin duplicarlos', (cmmContexto) => {
  cmmSimularAlmacenamiento(cmmContexto);
  localStorage.setItem(CMM_CLAVE_BUILDER_V1, JSON.stringify(CMM_V1_PRUEBA));
  localStorage.setItem('cmm.juego.v1', '{"cmmMonedas":90}');
  const cmmHistorial = cmmLeerHistorialBuilder(localStorage);
  const cmmDatos = localStorage.getItem(CMM_CLAVE_BUILDER_V2);
  cmmAfirmar.equal(cmmHistorial.cmmPartidas[0].cmmTiempo, 72000);
  cmmAfirmar.deepEqual(cmmLeerHistorialBuilder(localStorage), cmmHistorial);
  cmmAfirmar.equal(localStorage.getItem(CMM_CLAVE_BUILDER_V2), cmmDatos);
  cmmAfirmar.deepEqual(JSON.parse(localStorage.getItem(CMM_CLAVE_BUILDER_V1)), CMM_V1_PRUEBA);
  cmmAfirmar.equal(localStorage.getItem('cmm.juego.v1'), '{"cmmMonedas":90}');
});

cmmPrueba('un JSON dañado se conserva y se respalda antes de permitir nuevos guardados', (cmmContexto) => {
  cmmSimularAlmacenamiento(cmmContexto);
  const cmmCorrupto = '{"cmmVersion":2,';
  localStorage.setItem(CMM_CLAVE_BUILDER_V2, cmmCorrupto);
  const cmmDatos = cmmLeerHistorialBuilder(localStorage);
  cmmAfirmar.deepEqual(cmmDatos.cmmPartidas, []);
  cmmAfirmar.match(cmmDatos.cmmAviso, /respaldo/);
  cmmAfirmar.equal(localStorage.getItem(CMM_CLAVE_BUILDER_V2), cmmCorrupto);
  cmmAfirmar.equal(JSON.parse(localStorage.getItem('cmm.builder.v2.respaldo')).cmmContenido, cmmCorrupto);
  const cmmSoloLectura = cmmLeerHistorialBuilder({ getItem: () => cmmCorrupto, setItem: () => { throw new Error('Cuota'); } });
  cmmAfirmar.equal(cmmSoloLectura.cmmSoloLectura, true);
});

cmmPrueba('si el guardado falla, el registro previo sigue siendo legible', (cmmContexto) => {
  cmmSimularAlmacenamiento(cmmContexto);
  cmmGuardarHistorialBuilder(localStorage, CMM_V1_PRUEBA);
  const cmmPrevio = localStorage.getItem(CMM_CLAVE_BUILDER_V2);
  const cmmCuota = { setItem: () => { throw new Error('Cuota'); } };
  cmmAfirmar.throws(() => cmmGuardarHistorialBuilder(cmmCuota, { ...CMM_V1_PRUEBA, cmmPartidas: [] }), /Cuota/);
  cmmAfirmar.equal(localStorage.getItem(CMM_CLAVE_BUILDER_V2), cmmPrevio);
  cmmAfirmar.deepEqual(cmmLeerHistorialBuilder(localStorage).cmmPartidas, CMM_V1_PRUEBA.cmmPartidas);
});
