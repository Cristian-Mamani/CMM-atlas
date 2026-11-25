import cmmPrueba from 'node:test';
import cmmAfirmar from 'node:assert/strict';
import { cmmBorrarDatosLocales, cmmExportarDatosLocales } from '../js/cmm-datos-locales.js';

cmmPrueba('la exportación y el borrado se limitan a las claves de Atlas', () => {
  const cmmDatos = new Map([['cmm.juego.v1', '{"cmmMonedas":15}'], ['cmm.builder.v2.respaldo.2', 'copia'], ['cmm.ajeno.v1', 'conservar']]);
  const cmmAlmacen = { length: cmmDatos.size, key: (cmmI) => [...cmmDatos.keys()][cmmI], getItem: cmmDatos.get.bind(cmmDatos), removeItem: cmmDatos.delete.bind(cmmDatos) };
  const cmmInforme = JSON.parse(cmmExportarDatosLocales(cmmAlmacen));
  cmmAfirmar.deepEqual(Object.keys(cmmInforme.cmmDatos), ['cmm.builder.v2.respaldo.2', 'cmm.juego.v1']);
  cmmBorrarDatosLocales(cmmAlmacen);
  cmmAfirmar.deepEqual([...cmmDatos], [['cmm.ajeno.v1', 'conservar']]);
});
