import cmmPrueba from 'node:test';
import cmmAfirmar from 'node:assert/strict';
import { readFileSync as cmmLeer } from 'node:fs';
import { CMM_CATALOGO_MISIONES } from '../js/cmm-builder-catalogo.js';
import { CMM_LIMITES_MISION, cmmDefinirMision, cmmValidarMision } from '../js/cmm-builder-misiones.js';
import { CMM_COSTE_PISTA, CMMJuego } from '../js/cmm-juego.js';

const CMM_MISION_PRUEBA = {
  cmmId: 'cmm-prueba-formato',
  cmmNombre: 'Prueba de formato',
  cmmDescripcion: 'Caso de prueba con mallas del catálogo existente',
  cmmRegion: 'pelvis',
  cmmSistema: 'skeletal',
  cmmRequeridas: ['FJ3288'],
  cmmReferencia: ['FJ3152'],
  cmmModo: 'clasico',
  cmmDificultad: 1
};

const CMM_ATLAS_PRUEBA = JSON.parse(cmmLeer(new URL('../datos/atlas.json', import.meta.url)));
const CMM_MANIFIESTO_PRUEBA = JSON.parse(cmmLeer(new URL('../datos/cmm-builder-inventario.json', import.meta.url)));

cmmPrueba('la misión se puede guardar como dato con los campos obligatorios', () => {
  const cmmMision = cmmDefinirMision(CMM_MISION_PRUEBA);
  cmmAfirmar.deepEqual(cmmMision, {
    ...CMM_MISION_PRUEBA,
    cmmPistas: { cmmCoste: CMM_COSTE_PISTA },
    cmmVictoria: { cmmTipo: 'cmm-todas-requeridas' },
    cmmDesbloqueo: [],
    cmmRecompensa: { cmmTipo: 'cmm-juego', cmmPorPieza: 'cmmPremioPregunta', cmmBonoFinal: 'cmmPremioFinal' }
  });
  cmmAfirmar.deepEqual(JSON.parse(JSON.stringify(cmmMision)), cmmMision);
  cmmAfirmar.deepEqual(CMM_LIMITES_MISION, [12, 18, 25, 25]);
});

cmmPrueba('los campos opcionales y conjuntos de IDs se copian como datos independientes', () => {
  const cmmEntrada = {
    ...CMM_MISION_PRUEBA,
    cmmTiempo: 90,
    cmmPistas: { cmmMaximo: 2 },
    cmmSecuencia: [{ cmmIds: ['FJ3288'], cmmFuente: 'secuencia pedagógica CMM' }]
  };
  const cmmMision = cmmDefinirMision(cmmEntrada);
  cmmAfirmar.equal(cmmMision.cmmTiempo, 90);
  cmmAfirmar.deepEqual(cmmMision.cmmPistas, { cmmMaximo: 2, cmmCoste: CMM_COSTE_PISTA });
  cmmAfirmar.deepEqual(cmmMision.cmmSecuencia, cmmEntrada.cmmSecuencia);
  cmmMision.cmmRequeridas.length = 0;
  cmmMision.cmmReferencia.length = 0;
  cmmMision.cmmSecuencia[0].cmmIds.length = 0;
  cmmAfirmar.deepEqual(cmmEntrada.cmmRequeridas, ['FJ3288']);
  cmmAfirmar.deepEqual(cmmEntrada.cmmReferencia, ['FJ3152']);
  cmmAfirmar.deepEqual(cmmEntrada.cmmSecuencia[0].cmmIds, ['FJ3288']);
});

cmmPrueba('la recompensa usa los métodos de CMMJuego y respeta Principiante y Libre', () => {
  const cmmPrincipiante = cmmDefinirMision({ ...CMM_MISION_PRUEBA, cmmDificultad: 0 });
  const cmmReglas = cmmPrincipiante.cmmRecompensa;
  cmmAfirmar.equal(cmmPrincipiante.cmmPistas.cmmCoste, 0);
  cmmAfirmar.equal(CMMJuego.prototype[cmmReglas.cmmPorPieza](0), 5);
  cmmAfirmar.equal(CMMJuego.prototype[cmmReglas.cmmBonoFinal](0, true), 30);
  const cmmLibre = cmmDefinirMision({ ...CMM_MISION_PRUEBA, cmmModo: 'libre', cmmReferencia: undefined });
  cmmAfirmar.equal(cmmLibre.cmmPistas.cmmCoste, 0);
  cmmAfirmar.deepEqual(cmmLibre.cmmReferencia, []);
  cmmAfirmar.deepEqual(cmmLibre.cmmVictoria, { cmmTipo: 'cmm-libre' });
  cmmAfirmar.deepEqual(cmmLibre.cmmRecompensa, { cmmTipo: 'cmm-sin-monedas' });
});

cmmPrueba('todas las misiones tienen IDs únicos y sus mallas pasan la validación contra el inventario', () => {
  cmmAfirmar.equal(new Set(CMM_CATALOGO_MISIONES.map((cmmReto) => cmmReto.cmmId)).size, CMM_CATALOGO_MISIONES.length);
  cmmAfirmar.equal(CMM_CATALOGO_MISIONES.filter((cmmReto) => !cmmReto.cmmModo.startsWith('cmm-')).length, 27);
  for (const cmmReto of CMM_CATALOGO_MISIONES) {
    cmmAfirmar.deepEqual(cmmValidarMision(cmmReto, CMM_ATLAS_PRUEBA, CMM_MANIFIESTO_PRUEBA), [], cmmReto.cmmId);
  }
});

cmmPrueba('el validador detecta un ID ausente en el atlas', () => {
  const cmmAtlas = { ...CMM_ATLAS_PRUEBA, parts: CMM_ATLAS_PRUEBA.parts.filter((cmmP) => cmmP.id !== 'FJ3288') };
  cmmAfirmar.deepEqual(cmmValidarMision(cmmDefinirMision(CMM_MISION_PRUEBA), cmmAtlas), ['ID inexistente: FJ3288.']);
});

cmmPrueba('el validador detecta IDs repetidos y listas que se cruzan', () => {
  const cmmMision = cmmDefinirMision({ ...CMM_MISION_PRUEBA, cmmRequeridas: ['FJ3288', 'FJ3288', 'FJ3152'] });
  const cmmMotivos = cmmValidarMision(cmmMision, CMM_ATLAS_PRUEBA);
  cmmAfirmar.equal(cmmMotivos.length, 2);
  cmmAfirmar.match(cmmMotivos[0], /repetidos/);
  cmmAfirmar.match(cmmMotivos[1], /disjuntas/);
});

cmmPrueba('el validador cuenta las referencias fijas dentro del límite', () => {
  const cmmIds = CMM_MANIFIESTO_PRUEBA.cmmMallas.filter((cmmMalla) => !cmmMalla.cmmIncidencias.length).slice(0, 13).map((cmmMalla) => cmmMalla.cmmId);
  const cmmMision = cmmDefinirMision({ ...CMM_MISION_PRUEBA, cmmDificultad: 0, cmmRequeridas: cmmIds.slice(0, 12), cmmReferencia: cmmIds.slice(12) });
  cmmAfirmar.match(cmmValidarMision(cmmMision, CMM_ATLAS_PRUEBA)[0], /límite.*12/);
  cmmMision.cmmReferencia = [];
  cmmAfirmar.deepEqual(cmmValidarMision(cmmMision, CMM_ATLAS_PRUEBA), []);
});

cmmPrueba('el validador detecta índices vacíos, rangos imposibles y mallas ausentes del inventario', () => {
  const cmmMision = cmmDefinirMision(CMM_MISION_PRUEBA);
  for (const cmmCambio of [{ indexCount: 0 }, { positions: Number.MAX_SAFE_INTEGER }]) {
    const cmmAtlas = { ...CMM_ATLAS_PRUEBA, parts: CMM_ATLAS_PRUEBA.parts.map((cmmP) => cmmP.id === 'FJ3152' ? { ...cmmP, ...cmmCambio } : cmmP) };
    cmmAfirmar.match(cmmValidarMision(cmmMision, cmmAtlas)[0], /Geometría.*FJ3152/);
  }
  const cmmManifiesto = { cmmMallas: CMM_MANIFIESTO_PRUEBA.cmmMallas.filter((cmmP) => cmmP.cmmId !== 'FJ3152') };
  cmmAfirmar.match(cmmValidarMision(cmmMision, CMM_ATLAS_PRUEBA, cmmManifiesto)[0], /Geometría.*FJ3152/);
});

cmmPrueba('el validador comprueba ausencia de campos, tipos y coste de pistas', () => {
  const cmmMision = { ...cmmDefinirMision(CMM_MISION_PRUEBA), cmmNombre: undefined, cmmTiempo: '90', cmmPistas: { cmmCoste: 0 }, cmmReferencia: 'FJ3152' };
  const cmmMotivos = cmmValidarMision(cmmMision, CMM_ATLAS_PRUEBA);
  for (const cmmCampo of ['cmmNombre', 'cmmTiempo', 'cmmPistas', 'cmmReferencia']) cmmAfirmar(cmmMotivos.some((cmmMotivo) => cmmMotivo.includes(cmmCampo)));
});

cmmPrueba('el validador exige fuente y cobertura única en la secuencia por capas', () => {
  const cmmMision = cmmDefinirMision({ ...CMM_MISION_PRUEBA, cmmModo: 'capas', cmmSecuencia: [{ cmmIds: ['FJ3288'] }] });
  cmmAfirmar.match(cmmValidarMision(cmmMision, CMM_ATLAS_PRUEBA)[0], /fuente/);
  cmmMision.cmmSecuencia[0].cmmFuente = 'secuencia pedagógica CMM';
  cmmAfirmar.deepEqual(cmmValidarMision(cmmMision, CMM_ATLAS_PRUEBA), []);
  cmmMision.cmmSecuencia[0].cmmIds.push('FJ3288');
  cmmAfirmar.match(cmmValidarMision(cmmMision, CMM_ATLAS_PRUEBA)[0], /exactamente una vez/);
});

cmmPrueba('conexiones solo admite el enlace que indican los nombres de BodyParts3D', () => {
  const cmmMision = structuredClone(CMM_CATALOGO_MISIONES.find((cmmReto) => cmmReto.cmmModo === 'cmm-conexiones'));
  cmmAfirmar.deepEqual(cmmValidarMision(cmmMision, CMM_ATLAS_PRUEBA), []);
  cmmMision.cmmVinculos[0].cmmReferencia = cmmMision.cmmVinculos[1].cmmReferencia;
  cmmAfirmar.match(cmmValidarMision(cmmMision, CMM_ATLAS_PRUEBA)[0], /nombre.*BodyParts3D/);
});
