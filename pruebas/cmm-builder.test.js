import cmmPrueba from 'node:test';
import cmmAfirmar from 'node:assert/strict';
import { readFileSync as cmmLeer } from 'node:fs';
import * as cmmTres from 'three';
import { CMMAnatomyBuilder, CMMRelojBuilder, cmmAvanceTutorial, cmmCapaPendiente } from '../js/cmm-builder.js';
import { CMMTableroBuilder } from '../js/cmm-builder-tablero.js';
import { CMMJuego } from '../js/cmm-juego.js';
import { CMM_EXAMEN_PRACTICO, cmmCrearExamenPractico } from '../js/cmm-builder-examen.js';
import { cmmSimularAlmacenamiento } from './cmm-almacenamiento-prueba.js';
import {
  CMM_DIFICULTADES, cmmCatalogoBuilder, cmmCrearPiezaBuilder, cmmDistribuirBuilder, cmmEvaluarEncaje, cmmMallaBuilder, cmmPoseBuilder
} from '../js/cmm-builder-piezas.js';

const cmmAtlas = JSON.parse(cmmLeer(new URL('../datos/atlas.json', import.meta.url), 'utf8'));
const cmmCatalogo = cmmCatalogoBuilder(cmmAtlas, []);
const cmmBloques = new Map();

function cmmLeerBloquePrueba(cmmNombre) {
  if (!cmmBloques.has(cmmNombre)) {
    const cmmBuffer = cmmLeer(new URL('../datos/' + cmmNombre, import.meta.url));
    cmmBloques.set(cmmNombre, cmmBuffer.buffer.slice(cmmBuffer.byteOffset, cmmBuffer.byteOffset + cmmBuffer.byteLength));
  }
  return cmmBloques.get(cmmNombre);
}

function cmmPreparar(cmmReto, cmmNivel = 0, cmmTablero = new cmmTres.Group()) {
  const cmmCaja = new cmmTres.Box3();
  const cmmDificultad = CMM_DIFICULTADES[cmmNivel];
  const cmmGeometrias = cmmReto.cmmPiezas.map((cmmPieza) => {
    const cmmNombre = cmmAtlas.chunks[cmmPieza.cmmDato.chunk].url.split('/').pop();
    const cmmMalla = cmmMallaBuilder(cmmPieza, cmmLeerBloquePrueba(cmmNombre), new cmmTres.MeshBasicMaterial());
    cmmCaja.union(cmmMalla.geometry.boundingBox);
    return { cmmPieza, cmmMalla };
  });
  const cmmRadio = cmmCaja.getBoundingSphere(new cmmTres.Sphere()).radius;
  const cmmPiezas = cmmGeometrias.map(({ cmmPieza, cmmMalla }) => cmmCrearPiezaBuilder(cmmTablero, cmmPieza, cmmMalla, cmmDificultad, cmmRadio));
  return { cmmTablero, cmmCaja, cmmPiezas, cmmDificultad };
}

async function cmmIniciarPrueba(cmmContexto, cmmReto, cmmOpciones = {}) {
  const { cmmModo = 'clasico', cmmNivel = 0, cmmTutorial = false, cmmSaldo = 0 } = cmmOpciones;
  cmmSimularAlmacenamiento(cmmContexto);
  cmmContexto.mock.method(globalThis, 'fetch', async (cmmRuta) => new Response(cmmLeerBloquePrueba(cmmRuta.split('/').pop())));
  const cmmB = Object.create(CMMAnatomyBuilder.prototype);
  cmmB.cmmAtlas = cmmAtlas;
  cmmB.cmmJuego = new CMMJuego();
  if (cmmSaldo) cmmB.cmmJuego.cmmGanar(cmmSaldo);
  cmmB.cmmEventos = {};
  cmmB.cmmHistorial = { cmmPartidas: [] };
  cmmB.cmmUI = new Map([
    ['modo', { value: cmmModo }], ['dificultad', { value: String(cmmNivel) }],
    ['layout', { value: 'radial' }], ['eje', { value: 'libre' }], ['paso', { querySelector: () => ({}), classList: { remove() {} } }]
  ]);
  const cmmSinVista = () => {};
  cmmB.cmmAcciones = new Map([['catalogo', { focus: cmmSinVista }]]);
  for (const cmmMetodo of ['cmmTexto', 'cmmOcultar', 'cmmPintarPartida', 'cmmPintarHud', 'cmmPaso', 'cmmIndicador', 'cmmActualizarHerramienta']) cmmB[cmmMetodo] = cmmSinVista;
  cmmB.cmmCrearTablero = () => ({
    cmmTablero: new cmmTres.Group(), cmmCamara: new cmmTres.PerspectiveCamera(), cmmPiezas: [], cmmCancelar: cmmSinVista, cmmCerrar: cmmSinVista,
    cmmSombras: cmmSinVista, cmmEncuadrar: cmmSinVista, cmmMiniaturas: cmmSinVista, cmmPresentar: cmmSinVista
  });
  cmmB.cmmAnimar = (cmmTransiciones, cmmDuracion, cmmFin) => {
    for (const { cmmPieza, cmmDestino } of cmmTransiciones) cmmB.cmmAplicarPose(cmmPieza, cmmDestino);
    cmmFin();
  };
  cmmContexto.after(() => {
    clearInterval(cmmB.cmmSesion?.cmmLatido);
    clearTimeout(cmmB.cmmSesion?.cmmPistaId);
  });
  await cmmB.cmmIniciar(cmmReto, null, cmmTutorial);
  cmmAfirmar(cmmB.cmmSesion);
  if (cmmB.cmmSesion.cmmFase === 'estudio') cmmB.cmmDesmontar();
  cmmAfirmar.equal(cmmB.cmmSesion.cmmFase, 'jugando');
  return cmmB;
}

function cmmPulsarPrueba(cmmBuilder, cmmAccion) {
  cmmBuilder.cmmClic({ target: { closest: () => ({ dataset: { cmmBuilder: cmmAccion } }) } });
}

cmmPrueba('catálogo y binarios reales de los siete desafíos', () => {
  cmmAfirmar.deepEqual(cmmCatalogo.slice(0, 7).map((cmmReto) => [cmmReto.cmmId, cmmReto.cmmPiezas.length]), [
    ['abdomen', 6], ['craneo', 9], ['pelvis', 3], ['cuello', 7], ['mano', 5], ['pierna', 4], ['pectoral', 5]
  ]);
  for (const cmmReto of cmmCatalogo) {
    const { cmmPiezas } = cmmPreparar(cmmReto);
    for (const cmmP of cmmPiezas) {
      cmmAfirmar(cmmP.cmmMalla.geometry.index.count > 0);
      cmmAfirmar(cmmP.cmmTolerancia > 0);
    }
  }
  const cmmSinPieza = { ...cmmAtlas, parts: cmmAtlas.parts.filter((cmmP) => cmmP.id !== 'FJ2564') };
  const cmmDescartados = new Map();
  cmmAfirmar(!cmmCatalogoBuilder(cmmSinPieza, [], undefined, (cmmId, cmmMotivos) => cmmDescartados.set(cmmId, cmmMotivos))
    .some((cmmReto) => cmmReto.cmmId === 'abdomen'));
  cmmAfirmar.deepEqual(cmmDescartados.get('abdomen'), ['ID inexistente: FJ2564.']);
});

for (const [cmmId, cmmCantidad] of [['cmm-columna-lumbar', 5], ['cmm-abdomen-digestivo', 3], ['cmm-musculos-brazo', 3]]) {
  cmmPrueba(`${cmmId} tiene una ruta completa de inicio a victoria`, async (cmmContexto) => {
    const cmmReto = cmmCatalogo.find((cmmMision) => cmmMision.cmmId === cmmId);
    const cmmB = await cmmIniciarPrueba(cmmContexto, cmmReto);
    const cmmS = cmmB.cmmSesion;
    cmmAfirmar.equal(cmmS.cmmPiezas.length, cmmCantidad);
    for (const cmmPieza of cmmS.cmmPiezas) {
      cmmAfirmar.equal(cmmEvaluarEncaje(cmmPieza, cmmPieza.cmmObjetivo, cmmPoseBuilder(cmmPieza, cmmB.cmmEscena.cmmTablero)).cmmValido, false);
      cmmB.cmmElegir(cmmPieza);
      cmmB.cmmAplicarPose(cmmPieza, cmmPieza.cmmObjetivo);
      cmmPulsarPrueba(cmmB, 'encajar');
    }
    cmmAfirmar.equal(cmmS.cmmCorrectas.size, cmmCantidad);
    cmmAfirmar.match(cmmS.cmmResultado, /Reconstrucción completa/);
    cmmAfirmar.equal(cmmB.cmmHistorial.cmmPartidas[0].cmmId, cmmId);
  });
}

for (const [cmmModo, cmmId, cmmCantidad] of [
  ['cmm-parcial', 'cmm-pelvis-parcial', 2], ['cmm-intrusa', 'cmm-pelvis-intrusa', 3],
  ['cmm-espejo', 'cmm-coxales-espejo', 2], ['cmm-contrarreloj', 'cmm-pelvis-contrarreloj', 3],
  ['cmm-conexiones', 'cmm-conexiones-lumbares', 5]
]) {
  cmmPrueba(`${cmmModo} conserva el objetivo y permite terminar la reconstrucción`, async (cmmContexto) => {
    const cmmReto = cmmCatalogo.find((cmmMision) => cmmMision.cmmId === cmmId);
    const cmmB = await cmmIniciarPrueba(cmmContexto, cmmReto, { cmmModo });
    const cmmS = cmmB.cmmSesion;
    cmmAfirmar.equal(cmmS.cmmPiezas.length, cmmCantidad);
    if (cmmReto.cmmReferencia.length) {
      const cmmAncla = cmmB.cmmEscena.cmmPiezas.find((cmmPieza) => cmmReto.cmmReferencia.includes(cmmPieza.cmmId));
      cmmAfirmar.equal(cmmB.cmmElegir(cmmAncla), false);
      cmmAfirmar.equal(cmmS.cmmSeleccion?.cmmId, cmmAncla.cmmId);
      cmmAfirmar.equal(cmmB.cmmEditable(), false);
      cmmPulsarPrueba(cmmB, 'acercar');
      cmmPulsarPrueba(cmmB, 'encajar');
      cmmAfirmar.equal(cmmB.cmmJuego.cmmVidas, 3);
      cmmAfirmar.equal(cmmS.cmmCorrectas.size, 0);
      cmmAfirmar(cmmAncla.cmmPivote.position.equals(cmmAncla.cmmObjetivo.cmmPosicion));
      const [cmmDerecho, cmmIzquierdo] = cmmS.cmmPiezas;
      cmmAfirmar.equal(cmmEvaluarEncaje(cmmIzquierdo, cmmDerecho.cmmObjetivo, cmmDerecho.cmmObjetivo).cmmValido, false);
    }
    if (cmmReto.cmmIntrusas) {
      const cmmIntrusa = cmmS.cmmManipulables.find((cmmPieza) => cmmPieza.cmmEsIntrusa);
      cmmAfirmar(cmmB.cmmElegir(cmmIntrusa));
      cmmB.cmmAplicarPose(cmmIntrusa, cmmIntrusa.cmmObjetivo);
      cmmPulsarPrueba(cmmB, 'encajar');
      cmmAfirmar.equal(cmmS.cmmCorrectas.size, 0);
      cmmAfirmar.equal(cmmB.cmmJuego.cmmMonedas, 0);
      cmmAfirmar.equal(cmmB.cmmJuego.cmmVidas, 2);
    }
    for (const cmmPieza of cmmS.cmmPiezas) {
      cmmB.cmmElegir(cmmPieza);
      cmmB.cmmAplicarPose(cmmPieza, cmmPieza.cmmObjetivo);
      cmmPulsarPrueba(cmmB, 'encajar');
      cmmPulsarPrueba(cmmB, 'encajar');
    }
    cmmAfirmar.equal(cmmS.cmmCorrectas.size, cmmCantidad);
    cmmAfirmar.match(cmmS.cmmResultado, /Reconstrucción completa/);
    cmmAfirmar.equal(cmmB.cmmHistorial.cmmPartidas.length, 1);
  });
}

cmmPrueba('un contrarreloj vencido conserva las vidas y bloquea encajes y el bono', async (cmmContexto) => {
  const cmmReto = cmmCatalogo.find((cmmMision) => cmmMision.cmmId === 'cmm-pelvis-contrarreloj');
  const cmmB = await cmmIniciarPrueba(cmmContexto, cmmReto, { cmmModo: 'cmm-contrarreloj' });
  const cmmS = cmmB.cmmSesion;
  clearInterval(cmmS.cmmLatido);
  let cmmAhora = 0;
  cmmS.cmmReloj = new CMMRelojBuilder(() => cmmAhora);
  cmmS.cmmReloj.cmmReanudar();
  cmmAfirmar.equal(cmmB.cmmTiempoDisponible(), 120000);
  cmmAhora = 250;
  cmmS.cmmReloj.cmmPausar();
  cmmAhora = 200000;
  cmmAfirmar.equal(cmmB.cmmTiempoDisponible(), 119750);
  cmmS.cmmReloj.cmmReanudar();
  cmmAhora += 119750;
  const [cmmPieza] = cmmS.cmmPiezas;
  cmmB.cmmElegir(cmmPieza);
  cmmB.cmmAplicarPose(cmmPieza, cmmPieza.cmmObjetivo);
  cmmPulsarPrueba(cmmB, 'encajar');
  cmmAfirmar.match(cmmS.cmmResultado, /Se agotó el tiempo/);
  cmmAfirmar.equal(cmmS.cmmCorrectas.size, 0);
  cmmAfirmar.equal(cmmB.cmmJuego.cmmVidas, 3);
  cmmAfirmar.equal(cmmB.cmmJuego.cmmMonedas, 0);
  cmmAfirmar.equal(cmmB.cmmHistorial.cmmPartidas.length, 0);
});

for (const cmmAccion of ['pista', 'pausa']) {
  cmmPrueba(`el contrarreloj vencido finaliza al pulsar ${cmmAccion} antes del siguiente latido`, async (cmmContexto) => {
    const cmmReto = cmmCatalogo.find((cmmMision) => cmmMision.cmmId === 'cmm-pelvis-contrarreloj');
    const cmmB = await cmmIniciarPrueba(cmmContexto, cmmReto, { cmmModo: 'cmm-contrarreloj', cmmNivel: 1, cmmSaldo: 20 });
    const cmmS = cmmB.cmmSesion;
    clearInterval(cmmS.cmmLatido);
    let cmmAhora = 0;
    cmmS.cmmReloj = new CMMRelojBuilder(() => cmmAhora);
    cmmS.cmmReloj.cmmReanudar();
    cmmB.cmmElegir(cmmS.cmmPiezas[0]);
    cmmAhora = cmmReto.cmmTiempo * 1000;
    cmmPulsarPrueba(cmmB, cmmAccion);
    cmmAfirmar.equal(cmmB.cmmJuego.cmmMonedas, 20);
    cmmAfirmar.equal(cmmB.cmmJuego.cmmVidas, 3);
    cmmAfirmar.equal(cmmS.cmmPistas, 0);
    cmmAfirmar.equal(cmmS.cmmFase, 'finalizado');
    cmmAfirmar.match(cmmS.cmmResultado, /Se agotó el tiempo/);
  });
}

cmmPrueba('practicar tras fallar la pieza intrusa requiere únicamente las piezas anatómicas falladas', async (cmmContexto) => {
  const cmmReto = cmmCatalogo.find((cmmMision) => cmmMision.cmmId === 'cmm-pelvis-intrusa');
  const cmmB = await cmmIniciarPrueba(cmmContexto, cmmReto, { cmmModo: 'cmm-intrusa' });
  const cmmPieza = cmmB.cmmSesion.cmmPiezas[0];
  const cmmIntrusa = cmmB.cmmSesion.cmmManipulables.find((cmmP) => cmmP.cmmEsIntrusa);
  for (const cmmFallada of [cmmIntrusa, cmmPieza, cmmPieza]) {
    cmmB.cmmElegir(cmmFallada);
    cmmPulsarPrueba(cmmB, 'encajar');
  }
  cmmAfirmar.match(cmmB.cmmSesion.cmmResultado, /Practicar falladas/);
  const cmmIniciar = cmmB.cmmIniciar.bind(cmmB);
  let cmmCarga;
  cmmB.cmmIniciar = (...cmmArgumentos) => { cmmCarga = cmmIniciar(...cmmArgumentos); };
  cmmPulsarPrueba(cmmB, 'practicar');
  await cmmCarga;
  cmmAfirmar.deepEqual(cmmB.cmmSesion.cmmPiezas.map((cmmP) => cmmP.cmmId), [cmmPieza.cmmId]);
  cmmPulsarPrueba(cmmB, 'desmontar');
  const [cmmPracticada] = cmmB.cmmSesion.cmmPiezas;
  cmmB.cmmElegir(cmmPracticada);
  cmmB.cmmAplicarPose(cmmPracticada, cmmPracticada.cmmObjetivo);
  cmmPulsarPrueba(cmmB, 'encajar');
  cmmAfirmar.match(cmmB.cmmSesion.cmmResultado, /Reconstrucción completa/);
  cmmAfirmar.equal(cmmB.cmmHistorial.cmmPartidas[0].cmmPractica, true);
});

cmmPrueba('el examen práctico selecciona piezas reales de la región y registra un resultado separado', async (cmmContexto) => {
  const cmmConfig = { cmmRegion: 'Pelvis', cmmSistema: 'skeletal', cmmCantidad: 2, cmmTiempo: 120, cmmDificultad: 0, cmmAyudas: false };
  const cmmDefinicion = cmmCrearExamenPractico(cmmCatalogo, cmmConfig, 823);
  cmmAfirmar.deepEqual(cmmDefinicion, cmmCrearExamenPractico(cmmCatalogo, cmmConfig, 823));
  cmmAfirmar.equal(cmmDefinicion.cmmReferencia.length, 1);
  cmmAfirmar.equal(cmmDefinicion.cmmPistas.cmmMaximo, 0);
  cmmAfirmar.throws(() => cmmCrearExamenPractico(cmmCatalogo, { ...cmmConfig, cmmCantidad: 10 }, 823), /Ninguna región/);
  const [cmmReto] = cmmCatalogoBuilder(cmmAtlas, [], undefined, undefined, [cmmDefinicion]);
  const cmmB = await cmmIniciarPrueba(cmmContexto, cmmReto, { cmmModo: CMM_EXAMEN_PRACTICO });
  for (const cmmPieza of cmmB.cmmSesion.cmmPiezas) {
    cmmB.cmmElegir(cmmPieza);
    cmmB.cmmAplicarPose(cmmPieza, cmmPieza.cmmObjetivo);
    cmmPulsarPrueba(cmmB, 'encajar');
  }
  cmmAfirmar.match(cmmB.cmmSesion.cmmResultado, /Examen práctico completado/);
  const [cmmResultado] = cmmB.cmmHistorial.cmmPartidas;
  cmmAfirmar.equal(cmmResultado.cmmModo, CMM_EXAMEN_PRACTICO);
  cmmAfirmar.equal(cmmResultado.cmmPiezas.length, 2);
  cmmAfirmar.equal(cmmResultado.cmmTotal, 2);
  cmmAfirmar.equal(cmmResultado.cmmCompletado, true);
});

cmmPrueba('diez entradas y salidas liberan el temporizador de partida y su tablero', async (cmmContexto) => {
  const cmmLatidos = new Set();
  const cmmFijar = globalThis.setInterval;
  const cmmQuitar = globalThis.clearInterval;
  cmmContexto.mock.method(globalThis, 'setInterval', (...cmmArgs) => {
    const cmmId = cmmFijar(...cmmArgs);
    cmmLatidos.add(cmmId);
    return cmmId;
  });
  cmmContexto.mock.method(globalThis, 'clearInterval', (cmmId) => { cmmLatidos.delete(cmmId); cmmQuitar(cmmId); });
  const cmmB = await cmmIniciarPrueba(cmmContexto, cmmCatalogo[2]);
  let cmmCierres = 0;
  for (let cmmI = 0; cmmI < 10; cmmI++) {
    if (cmmI) {
      await cmmB.cmmIniciar(cmmCatalogo[2]);
      cmmB.cmmDesmontar();
    }
    cmmB.cmmEscena.cmmCerrar = () => cmmCierres++;
    cmmAfirmar.equal(cmmLatidos.size, 1);
    cmmB.cmmLimpiar();
    cmmAfirmar.equal(cmmLatidos.size, 0);
    cmmAfirmar.equal(cmmB.cmmEscena, null);
  }
  cmmAfirmar.equal(cmmCierres, 10);
});

cmmPrueba('el pivote conserva vértices, tamaño y centro con tablero transformado', () => {
  const cmmPadre = new cmmTres.Group();
  cmmPadre.position.set(-1, .4, 3);
  cmmPadre.rotateX(.4);
  cmmPadre.scale.set(1.5, .8, 2.2);
  const cmmTablero = new cmmTres.Group();
  cmmTablero.position.set(2, -3, 5);
  cmmTablero.rotateY(.61);
  cmmTablero.scale.set(.7, 1.4, 1.1);
  cmmPadre.add(cmmTablero);
  const { cmmPiezas } = cmmPreparar(cmmCatalogo[0], 0, cmmTablero);
  const cmmP = cmmPiezas[0];
  cmmAfirmar.equal(cmmP.cmmPivote.parent, cmmTablero);
  cmmAfirmar.equal(cmmP.cmmMalla.parent, cmmP.cmmPivote);
  const cmmVertices = cmmP.cmmMalla.geometry.getAttribute('position');
  cmmTablero.updateWorldMatrix(true, true);
  for (let cmmI = 0; cmmI < cmmVertices.count; cmmI++) {
    const cmmVertice = new cmmTres.Vector3().fromBufferAttribute(cmmVertices, cmmI);
    const cmmOriginal = cmmVertice.clone().applyMatrix4(cmmTablero.matrixWorld);
    const cmmActual = cmmVertice.clone().applyMatrix4(cmmP.cmmMalla.matrixWorld);
    cmmAfirmar(cmmOriginal.distanceTo(cmmActual) < 1e-9);
  }
  const cmmV = new cmmTres.Vector3().fromBufferAttribute(cmmVertices, 0);
  const cmmCentro = cmmP.cmmCaja.getCenter(new cmmTres.Vector3());
  const cmmCentroGlobal = cmmTablero.localToWorld(cmmCentro.clone());
  cmmAfirmar(cmmP.cmmPivote.getWorldPosition(new cmmTres.Vector3()).distanceTo(cmmCentroGlobal) < 1e-9);
  cmmP.cmmPivote.rotateY(Math.PI / 2);
  const cmmRotado = cmmP.cmmMalla.localToWorld(cmmV.clone());
  const cmmEsperado = cmmV.clone().sub(cmmCentro).applyAxisAngle(new cmmTres.Vector3(0, 1, 0), Math.PI / 2).add(cmmCentro);
  cmmAfirmar(cmmRotado.distanceTo(cmmTablero.localToWorld(cmmEsperado)) < 1e-9);
  cmmAfirmar(cmmP.cmmPivote.getWorldPosition(new cmmTres.Vector3()).distanceTo(cmmCentroGlobal) < 1e-9);
  cmmAfirmar.deepEqual(cmmP.cmmPivote.scale.toArray(), [1, 1, 1]);
});

cmmPrueba('el encaje mide la posición en el tablero bajo escala no uniforme', () => {
  const cmmPadre = new cmmTres.Group();
  cmmPadre.position.set(3, -2, 4);
  cmmPadre.rotateX(.4);
  cmmPadre.scale.set(4, .5, 2);
  const cmmTablero = new cmmTres.Group();
  cmmTablero.rotateY(.6);
  cmmPadre.add(cmmTablero);
  const { cmmPiezas } = cmmPreparar(cmmCatalogo[2], 3, cmmTablero);
  const [cmmPieza] = cmmPiezas;
  const cmmObjetivo = cmmPieza.cmmObjetivo;
  const cmmOffset = cmmPieza.cmmTolerancia / 2;
  cmmPieza.cmmPivote.position.copy(cmmObjetivo.cmmPosicion);
  cmmPieza.cmmPivote.position.x += cmmOffset;
  const cmmComprobarPose = () => {
    const cmmPose = cmmPoseBuilder(cmmPieza, cmmTablero);
    const cmmEncaje = cmmEvaluarEncaje(cmmPieza, cmmObjetivo, cmmPose);
    cmmAfirmar(cmmPose.cmmPosicion.distanceTo(cmmObjetivo.cmmPosicion.clone().add(new cmmTres.Vector3(cmmOffset, 0, 0))) < 1e-9);
    cmmAfirmar(Math.abs(cmmEncaje.cmmDistancia - cmmOffset) < 1e-9);
    cmmAfirmar.equal(cmmEncaje.cmmValido, true);
  };
  cmmComprobarPose();
  const cmmIntermedio = new cmmTres.Group();
  cmmIntermedio.position.set(.1, .2, -.3);
  cmmIntermedio.rotateZ(.25);
  cmmTablero.add(cmmIntermedio);
  cmmIntermedio.add(cmmPieza.cmmPivote);
  cmmPieza.cmmPivote.position.sub(cmmIntermedio.position).applyQuaternion(cmmIntermedio.quaternion.clone().invert());
  cmmComprobarPose();
  cmmPieza.cmmPivote.position.z += cmmPieza.cmmTolerancia * 2;
  cmmAfirmar.equal(cmmEvaluarEncaje(cmmPieza, cmmObjetivo, cmmPoseBuilder(cmmPieza, cmmTablero)).cmmValido, false);
});

cmmPrueba('el encaje valida identidad, lateralidad y distancia en los tres ejes', () => {
  const { cmmPiezas } = cmmPreparar(cmmCatalogo[2], 3);
  const [cmmDerecha, cmmIzquierda] = cmmPiezas;
  cmmAfirmar.equal(cmmIzquierda.cmmLado, 'Izquierda');
  cmmAfirmar.equal(cmmDerecha.cmmLado, 'Derecha');
  const cmmObjetivo = cmmIzquierda.cmmObjetivo;
  cmmAfirmar(cmmEvaluarEncaje(cmmIzquierda, cmmObjetivo, cmmObjetivo).cmmValido);
  const cmmAjeno = cmmEvaluarEncaje(cmmIzquierda, cmmDerecha.cmmObjetivo, cmmDerecha.cmmObjetivo);
  cmmAfirmar.equal(cmmAjeno.cmmDistancia, 0);
  cmmAfirmar.equal(cmmAjeno.cmmValido, false);
  const cmmOtroId = { ...cmmObjetivo, cmmId: cmmDerecha.cmmId };
  cmmAfirmar.equal(cmmEvaluarEncaje(cmmIzquierda, cmmOtroId, cmmObjetivo).cmmValido, false);
  cmmAfirmar(!cmmEvaluarEncaje({ ...cmmIzquierda, cmmLado: 'Derecha' }, cmmObjetivo, cmmObjetivo).cmmValido);
  for (const cmmEje of ['x', 'y', 'z']) {
    const cmmPosicion = cmmObjetivo.cmmPosicion.clone();
    cmmPosicion[cmmEje] += cmmIzquierda.cmmTolerancia * .99;
    cmmAfirmar(cmmEvaluarEncaje(cmmIzquierda, cmmObjetivo, { cmmPosicion }).cmmValido);
    cmmPosicion[cmmEje] += cmmIzquierda.cmmTolerancia * .02;
    cmmAfirmar(!cmmEvaluarEncaje(cmmIzquierda, cmmObjetivo, { cmmPosicion }).cmmValido);
  }
});

cmmPrueba('ambas distribuciones son deterministas y conservan separación inicial', () => {
  const { cmmPiezas, cmmCaja, cmmDificultad } = cmmPreparar(cmmCatalogo[1], 3);
  for (const cmmLayout of ['radial', 'mesa']) {
    const cmmA = cmmDistribuirBuilder(cmmPiezas, cmmCaja, cmmDificultad, 7342, cmmLayout);
    cmmAfirmar.deepEqual(cmmA, cmmDistribuirBuilder(cmmPiezas, cmmCaja, cmmDificultad, 7342, cmmLayout));
    cmmAfirmar.notDeepEqual(cmmA, cmmDistribuirBuilder(cmmPiezas, cmmCaja, cmmDificultad, 7343, cmmLayout));
    for (const [cmmI, cmmP] of cmmPiezas.entries()) {
      const cmmPose = cmmA.get(cmmP.cmmId);
      cmmAfirmar(!cmmEvaluarEncaje(cmmP, cmmP.cmmObjetivo, cmmPose).cmmValido);
      for (const cmmOtra of cmmPiezas.slice(cmmI + 1)) {
        cmmAfirmar(cmmPose.cmmPosicion.distanceTo(cmmA.get(cmmOtra.cmmId).cmmPosicion) > cmmP.cmmRadio + cmmOtra.cmmRadio);
      }
    }
    const cmmUna = cmmDistribuirBuilder(cmmPiezas.slice(0, 1), cmmCaja, cmmDificultad, 123, cmmLayout);
    cmmAfirmar(cmmUna.values().next().value.cmmPosicion.length() < 3);
  }
});

cmmPrueba('arrastre con agarre conservado desde frente y lado', () => {
  const { cmmTablero, cmmPiezas } = cmmPreparar(cmmCatalogo[0]);
  const cmmP = cmmPiezas[0];
  const cmmCentro = cmmP.cmmObjetivo.cmmPosicion;
  for (const cmmDireccion of [new cmmTres.Vector3(0, 0, 1), new cmmTres.Vector3(1, .2, .1)]) {
    const cmmT = Object.create(CMMTableroBuilder.prototype);
    cmmT.cmmCamara = new cmmTres.PerspectiveCamera(35, 1, .001, 10);
    cmmT.cmmCamara.position.copy(cmmCentro).addScaledVector(cmmDireccion, 2);
    cmmT.cmmCamara.lookAt(cmmCentro);
    const cmmNormal = cmmT.cmmCamara.getWorldDirection(new cmmTres.Vector3());
    const cmmPunto = cmmCentro.clone().add(new cmmTres.Vector3(.004, .005, 0));
    cmmT.cmmLienzo = { getBoundingClientRect: () => ({ left: 0, top: 0, width: 1000, height: 1000 }) };
    cmmT.cmmTablero = cmmTablero;
    cmmT.cmmRayo = new cmmTres.Raycaster();
    cmmT.cmmNdc = new cmmTres.Vector2();
    cmmT.cmmEventos = { cmmMover() {} };
    cmmT.cmmDibujar = () => {};
    cmmT.cmmMovimiento = { cmmId: 1, cmmPieza: cmmP, cmmAgarre: cmmCentro.clone().sub(cmmPunto), cmmPlano: new cmmTres.Plane().setFromNormalAndCoplanarPoint(cmmNormal, cmmPunto) };
    const cmmDelta = new cmmTres.Vector3(1, 0, 0).applyQuaternion(cmmT.cmmCamara.quaternion).multiplyScalar(.035);
    const cmmPantalla = cmmPunto.clone().add(cmmDelta).project(cmmT.cmmCamara);
    cmmT.cmmArrastrar({ pointerId: 1, clientX: (cmmPantalla.x + 1) * 500, clientY: (1 - cmmPantalla.y) * 500 });
    cmmAfirmar(cmmP.cmmPivote.position.distanceTo(cmmCentro.clone().add(cmmDelta)) < 1e-8);
    cmmAfirmar(cmmP.cmmObjetivo.cmmPosicion.distanceTo(cmmCentro) < 1e-8);
  }
});

cmmPrueba('encaje exacto, duplicados, deshacer, rehacer, cancelación y profundidad', () => {
  const { cmmTablero, cmmPiezas } = cmmPreparar(cmmCatalogo[0]);
  const cmmB = Object.create(CMMAnatomyBuilder.prototype);
  const [cmmP] = cmmPiezas;
  const cmmReloj = new CMMRelojBuilder(() => 42);
  cmmB.cmmSesion = {
    cmmPiezas, cmmSeleccion: cmmP, cmmFase: 'jugando', cmmCorrectas: new Map(), cmmFallos: new Map(),
    cmmHistorial: [], cmmRehechas: [], cmmRacha: 0, cmmPistas: 0, cmmNivel: 0, cmmRadio: .25, cmmReloj
  };
  cmmB.cmmEscena = { cmmTablero, cmmCamara: new cmmTres.PerspectiveCamera() };
  for (const cmmNombre of ['cmmTexto', 'cmmActualizarHerramienta', 'cmmPintarPartida', 'cmmIndicador', 'cmmPintarHud']) cmmB[cmmNombre] = () => {};
  cmmB.cmmAnimar = (cmmTransiciones, cmmDuracion, cmmFin) => cmmFin();
  cmmP.cmmPivote.position.x += cmmP.cmmTolerancia / 2;
  const cmmAntes = cmmPoseBuilder(cmmP, cmmTablero);
  const cmmPuntosAntes = cmmB.cmmPuntos();
  cmmB.cmmIntentar(true);
  const cmmPuntosEncaje = cmmB.cmmPuntos();
  cmmAfirmar(cmmPuntosEncaje > cmmPuntosAntes);
  cmmB.cmmIntentar(true);
  cmmAfirmar.equal(cmmB.cmmSesion.cmmCorrectas.size, 1);
  cmmAfirmar.equal(cmmB.cmmSesion.cmmHistorial.length, 1);
  cmmAfirmar.equal(cmmB.cmmPuntos(), cmmPuntosEncaje);
  cmmAfirmar.deepEqual(cmmPoseBuilder(cmmP, cmmTablero).cmmPosicion.toArray(), cmmP.cmmObjetivo.cmmPosicion.toArray());
  cmmB.cmmElegir(cmmPiezas[1]);
  cmmAfirmar.equal(cmmB.cmmSesion.cmmSeleccion, cmmPiezas[1]);
  cmmB.cmmDeshacer(false);
  cmmAfirmar.equal(cmmB.cmmSesion.cmmCorrectas.size, 0);
  cmmAfirmar.deepEqual(cmmPoseBuilder(cmmP, cmmTablero), cmmAntes);
  cmmAfirmar.equal(cmmP.cmmEstado, 'disponible');
  cmmAfirmar.equal(cmmB.cmmPuntos(), cmmPuntosAntes);
  cmmAfirmar.equal(cmmB.cmmSesion.cmmRacha, 0);
  cmmAfirmar.equal(cmmB.cmmSesion.cmmSeleccion, cmmP);
  cmmB.cmmDeshacer(true);
  cmmAfirmar.equal(cmmB.cmmSesion.cmmCorrectas.size, 1);
  cmmAfirmar.equal(cmmP.cmmEstado, 'ensamblada');
  cmmAfirmar.equal(cmmB.cmmPuntos(), cmmPuntosEncaje);
  cmmAfirmar.equal(cmmB.cmmSesion.cmmRacha, 1);
  cmmB.cmmDeshacer(false);
  cmmB.cmmTomar();
  cmmP.cmmPivote.position.z += .2;
  cmmB.cmmSoltar(true);
  cmmAfirmar.equal(cmmP.cmmPivote.position.z, cmmAntes.cmmPosicion.z);
  cmmP.cmmPivote.position.x += .2;
  cmmB.cmmProfundidad(1);
  cmmAfirmar(Math.abs(cmmP.cmmPivote.position.z - (cmmAntes.cmmPosicion.z - .015)) < 1e-8);
});

cmmPrueba('cronómetro monotónico: pausa, reanudación y final', () => {
  let cmmAhora = 100;
  const cmmR = new CMMRelojBuilder(() => cmmAhora);
  cmmR.cmmReanudar();
  cmmAhora = 450;
  cmmR.cmmPausar();
  cmmAhora = 950;
  cmmAfirmar.equal(cmmR.cmmTiempo(), 350);
  cmmR.cmmReanudar();
  cmmAhora = 1125;
  cmmR.cmmPausar();
  cmmAhora = 4000;
  cmmAfirmar.equal(cmmR.cmmTiempo(), 525);
});

cmmPrueba('récords y ajustes sobreviven al reconstruir el controlador', () => {
  const cmmValores = new Map();
  globalThis.localStorage = { getItem: (cmmK) => cmmValores.get(cmmK), setItem: (cmmK, cmmV) => cmmValores.set(cmmK, cmmV) };
  const cmmSelect = (cmmId, cmmOpciones) => ({
    id: 'cmm-builder-' + cmmId, options: cmmOpciones.map((cmmValor) => ({ value: cmmValor })), value: cmmOpciones[0], addEventListener() {}
  });
  const cmmCrear = () => {
    const cmmUI = [
      cmmSelect('modo', ['clasico', 'libre']), cmmSelect('layout', ['radial', 'mesa']), cmmSelect('dificultad', ['0', '1']),
      cmmSelect('eje', ['libre']), ...['region', 'sistema', 'cantidad'].map((cmmCampo) => cmmSelect(cmmCampo, ['']))
    ];
    return new CMMAnatomyBuilder({ querySelectorAll: (cmmSel) => cmmSel.startsWith('[id') ? cmmUI : [], addEventListener() {} }, { addEventListener() {} }, [], {});
  };
  try {
    const cmmA = cmmCrear();
    cmmA.cmmUI.get('layout').value = 'mesa';
    cmmA.cmmHistorial.cmmPartidas.push(
      { cmmId: 'abdomen', cmmNivel: 1, cmmLayout: 'mesa', cmmTiempo: 4000 },
      { cmmId: 'abdomen', cmmNivel: 1, cmmLayout: 'mesa', cmmTiempo: 300, cmmPractica: true }
    );
    cmmA.cmmGuardar();
    const cmmB = cmmCrear();
    cmmAfirmar.equal(cmmB.cmmUI.get('layout').value, 'mesa');
    cmmAfirmar.equal(cmmB.cmmRecord('abdomen', 1, 'mesa'), 4000);
  } finally {
    delete globalThis.localStorage;
  }
});

cmmPrueba('cerrar repetidamente cancela la interacción y libera cada recurso compartido una vez', () => {
  for (let cmmI = 0; cmmI < 3; cmmI++) {
    const cmmT = Object.create(CMMTableroBuilder.prototype);
    const cmmLlamadas = [];
    const cmmRecurso = { dispose: () => cmmLlamadas.push('gizmo') };
    cmmT.cmmCancelar = () => cmmLlamadas.push('cancelar');
    cmmT.cmmAbortar = new AbortController();
    cmmT.cmmAbortar.signal.addEventListener('abort', () => cmmLlamadas.push('listeners'));
    cmmT.cmmResize = { disconnect: () => cmmLlamadas.push('resize') };
    cmmT.cmmRaf = null;
    cmmT.cmmOrbita = { dispose: () => cmmLlamadas.push('órbita') };
    cmmT.cmmGizmo = { disconnect() {}, getHelper: () => ({
      traverse: (cmmVisitar) => {
        cmmVisitar({ geometry: cmmRecurso });
        cmmVisitar({ material: cmmRecurso });
      }
    }) };
    cmmT.cmmPiezas = [];
    cmmT.cmmMaterialBorde = { dispose: () => cmmLlamadas.push('borde') };
    cmmT.cmmRender = { dispose: () => cmmLlamadas.push('render'), forceContextLoss: () => cmmLlamadas.push('contexto') };
    cmmT.cmmLienzo = { remove: () => cmmLlamadas.push('lienzo') };
    cmmT.cmmCerrar();
    cmmAfirmar.deepEqual(cmmLlamadas, ['cancelar', 'listeners', 'resize', 'órbita', 'gizmo', 'borde', 'render', 'contexto', 'lienzo']);
  }
});

cmmPrueba('mide preparación con binarios y validación de una pieza activa', (cmmContexto) => {
  for (const cmmReto of [...cmmCatalogo.slice(0, 2), cmmCatalogo.find((cmmR) => cmmR.cmmId === 'cmm-torax-derecho-superior')]) {
    const cmmInicio = performance.now();
    const { cmmPiezas, cmmTablero } = cmmPreparar(cmmReto, 3);
    const cmmPreparacion = performance.now() - cmmInicio;
    const [cmmP] = cmmPiezas;
    const cmmCantidad = 10000;
    const cmmBucle = performance.now();
    for (let cmmI = 0; cmmI < cmmCantidad; cmmI++) {
      cmmEvaluarEncaje(cmmP, cmmP.cmmObjetivo, cmmPoseBuilder(cmmP, cmmTablero));
    }
    const cmmPromedio = (performance.now() - cmmBucle) / cmmCantidad * 1000;
    const cmmTriangulos = cmmPiezas.reduce((cmmN, cmmPieza) => cmmN + cmmPieza.cmmDato.indexCount / 3, 0);
    const cmmBytes = cmmPiezas.reduce((cmmN, cmmPieza) => cmmN + cmmPieza.cmmDato.vertexCount * 18 + cmmPieza.cmmDato.indexCount * 4, 0);
    cmmContexto.diagnostic(`${cmmReto.cmmId}: ${cmmPiezas.length} mallas, ${cmmTriangulos} triángulos, ${cmmBytes} bytes de atributos, ${cmmPreparacion.toFixed(2)} ms de preparación con bloques en memoria y ${cmmPromedio.toFixed(2)} µs/validación`);
  }
});


cmmPrueba('el tutorial avanza solo por la acción esperada', () => {
  let cmmPaso = 0;
  for (const [cmmI, cmmAccion] of ['seleccionar', 'arrastre', 'objetivo', 'encaje'].entries()) {
    cmmAfirmar.equal(cmmAvanceTutorial(cmmPaso, 'no es la acción esperada'), cmmI);
    cmmPaso = cmmAvanceTutorial(cmmPaso, cmmAccion);
    cmmAfirmar.equal(cmmPaso, cmmI + 1);
  }
  cmmAfirmar.equal(cmmAvanceTutorial(cmmPaso, 'encaje'), 4);
});

cmmPrueba('las cuatro dificultades desplazan las piezas con su orientación anatómica', async (cmmContexto) => {
  const cmmReto = cmmCatalogo.find((cmmMision) => cmmMision.cmmId === 'pierna');
  const cmmB = await cmmIniciarPrueba(cmmContexto, cmmReto);
  for (const cmmModo of ['clasico', 'detective']) {
    cmmB.cmmUI.get('modo').value = cmmModo;
    for (const cmmNivel of CMM_DIFICULTADES.keys()) {
      cmmB.cmmUI.get('dificultad').value = String(cmmNivel);
      await cmmB.cmmIniciar(cmmReto);
      if (cmmB.cmmSesion.cmmFase === 'estudio') cmmB.cmmDesmontar();
      for (const cmmPieza of cmmB.cmmSesion.cmmPiezas) {
        cmmAfirmar(cmmPieza.cmmPivote.quaternion.equals(new cmmTres.Quaternion()), `${cmmModo} nivel ${cmmNivel}`);
        cmmAfirmar(cmmPieza.cmmPivote.position.distanceTo(cmmPieza.cmmObjetivo.cmmPosicion) > cmmPieza.cmmTolerancia);
      }
    }
  }
});

cmmPrueba('capas pectorales con IDs verificados y progresión obligatoria', () => {
  const cmmReto = cmmCatalogo.find((cmmR) => cmmR.cmmId === 'pectoral');
  const cmmListas = new Map();
  const [cmmBase, cmmProfundo, cmmSuperficial] = cmmReto.cmmCapas;
  cmmAfirmar.equal(cmmCapaPendiente(cmmReto, cmmListas), cmmBase);
  cmmBase.cmmIds.forEach((cmmId) => cmmListas.set(cmmId, true));
  cmmAfirmar.equal(cmmCapaPendiente(cmmReto, cmmListas), cmmProfundo);
  cmmProfundo.cmmIds.forEach((cmmId) => cmmListas.set(cmmId, true));
  cmmAfirmar.equal(cmmCapaPendiente(cmmReto, cmmListas), cmmSuperficial);
  cmmSuperficial.cmmIds.forEach((cmmId) => cmmListas.set(cmmId, true));
  cmmAfirmar.equal(cmmCapaPendiente(cmmReto, cmmListas), undefined);
});

cmmPrueba('las cuatro dificultades parten a la profundidad anatómica', () => {
  const { cmmPiezas, cmmCaja } = cmmPreparar(cmmCatalogo[2]);
  for (const cmmNivel of CMM_DIFICULTADES.keys()) {
    const cmmPoses = cmmDistribuirBuilder(cmmPiezas, cmmCaja, CMM_DIFICULTADES[cmmNivel], 132, 'radial');
    for (const cmmPieza of cmmPiezas) cmmAfirmar.equal(cmmPoses.get(cmmPieza.cmmId).cmmPosicion.z, cmmPieza.cmmObjetivo.cmmPosicion.z);
  }
});

cmmPrueba('malla y silueta comparten geometría intacta tras mover, encajar y deshacer', async (cmmContexto) => {
  const cmmB = await cmmIniciarPrueba(cmmContexto, cmmCatalogo[2]);
  const [cmmPieza] = cmmB.cmmSesion.cmmPiezas;
  const cmmGeo = cmmPieza.cmmMalla.geometry;
  const cmmDato = cmmPieza.cmmDato;
  const cmmBloque = cmmLeerBloquePrueba(cmmAtlas.chunks[cmmDato.chunk].url.split('/').pop());
  const cmmVertices = new Float32Array(cmmBloque, cmmDato.positions, cmmDato.vertexCount * 3).slice();
  const cmmNormales = new Int16Array(cmmBloque, cmmDato.normals, cmmDato.vertexCount * 3).slice();
  const cmmIndices = new Uint32Array(cmmBloque, cmmDato.indices, cmmDato.indexCount).slice();
  const cmmCaja = cmmGeo.boundingBox.clone();
  const cmmOrigenFantasma = cmmPieza.cmmFantasma.getWorldPosition(new cmmTres.Vector3());
  const cmmOrientacionFantasma = cmmPieza.cmmFantasma.getWorldQuaternion(new cmmTres.Quaternion());
  const cmmOrientacionPieza = cmmPieza.cmmPivote.quaternion.clone();
  const cmmComprobarGeometria = () => {
    cmmAfirmar.equal(cmmPieza.cmmMalla.geometry, cmmGeo);
    cmmAfirmar.equal(cmmPieza.cmmFantasma.geometry, cmmGeo);
    cmmAfirmar.deepEqual(cmmGeo.getAttribute('position').array, cmmVertices);
    cmmAfirmar.deepEqual(cmmGeo.getAttribute('normal').array, cmmNormales);
    cmmAfirmar.deepEqual(cmmGeo.index.array, cmmIndices);
    cmmAfirmar(cmmGeo.boundingBox.equals(cmmCaja));
    cmmAfirmar(cmmPieza.cmmFantasma.getWorldPosition(new cmmTres.Vector3()).equals(cmmOrigenFantasma));
    cmmAfirmar(cmmPieza.cmmFantasma.getWorldQuaternion(new cmmTres.Quaternion()).equals(cmmOrientacionFantasma));
    cmmAfirmar(cmmPieza.cmmPivote.quaternion.equals(cmmOrientacionPieza));
  };
  cmmComprobarGeometria();
  cmmB.cmmElegir(cmmPieza);
  cmmB.cmmAjustar((cmmActiva) => { cmmActiva.cmmPivote.position.x += .4; }, false);
  cmmComprobarGeometria();
  cmmB.cmmAplicarPose(cmmPieza, cmmPieza.cmmObjetivo);
  cmmPulsarPrueba(cmmB, 'encajar');
  cmmAfirmar.equal(cmmPieza.cmmEstado, 'ensamblada');
  cmmComprobarGeometria();
  cmmPulsarPrueba(cmmB, 'deshacer');
  cmmAfirmar.equal(cmmPieza.cmmEstado, 'disponible');
  cmmComprobarGeometria();
});

cmmPrueba('el Builder cobra una vida por un intento explícito fallido, nunca al soltar o acertar', async (cmmContexto) => {
  const cmmB = await cmmIniciarPrueba(cmmContexto, cmmCatalogo[2]);
  const [cmmPieza] = cmmB.cmmSesion.cmmPiezas;
  cmmAfirmar.equal(cmmB.cmmJuego.cmmVidas, 3);
  cmmB.cmmElegir(cmmPieza);
  cmmB.cmmAplicarPose(cmmPieza, cmmPieza.cmmObjetivo);
  cmmB.cmmTomar('arrastre');
  cmmPieza.cmmPivote.position.x += cmmPieza.cmmTolerancia * 4;
  cmmB.cmmSoltar(false);
  cmmAfirmar.equal(cmmB.cmmSesion.cmmCorrectas.size, 0);
  cmmAfirmar.equal(cmmB.cmmErrores(), 0);
  cmmAfirmar.equal(cmmB.cmmJuego.cmmVidas, 3);
  cmmPulsarPrueba(cmmB, 'encajar');
  cmmAfirmar.equal(cmmB.cmmJuego.cmmVidas, 2);
  cmmAfirmar.equal(cmmB.cmmErrores(), 1);
  cmmB.cmmAplicarPose(cmmPieza, cmmPieza.cmmObjetivo);
  cmmPulsarPrueba(cmmB, 'encajar');
  cmmPulsarPrueba(cmmB, 'encajar');
  cmmAfirmar.equal(cmmB.cmmJuego.cmmVidas, 2);
  cmmAfirmar.equal(cmmB.cmmSesion.cmmCorrectas.size, 1);
  cmmAfirmar.equal(cmmB.cmmJuego.cmmMonedas, 5);
  const cmmSegunda = cmmB.cmmSesion.cmmPiezas[1];
  cmmB.cmmElegir(cmmSegunda);
  cmmPulsarPrueba(cmmB, 'encajar');
  cmmPulsarPrueba(cmmB, 'encajar');
  cmmAfirmar.equal(cmmB.cmmJuego.cmmVidas, 0);
  cmmAfirmar.equal(cmmB.cmmSesion.cmmFase, 'finalizado');
  cmmAfirmar.equal(cmmB.cmmPuntos(), cmmB.cmmSesion.cmmCorrectas.get(cmmPieza.cmmId).cmmPuntos - 54);
});

cmmPrueba('deshacer, volver a encajar y rehacer conservan un solo premio por pieza', async (cmmContexto) => {
  const cmmB = await cmmIniciarPrueba(cmmContexto, cmmCatalogo[2]);
  const [cmmPieza] = cmmB.cmmSesion.cmmPiezas;
  cmmB.cmmElegir(cmmPieza);
  cmmB.cmmAplicarPose(cmmPieza, cmmPieza.cmmObjetivo);
  cmmPulsarPrueba(cmmB, 'encajar');
  cmmAfirmar.equal(cmmB.cmmJuego.cmmMonedas, 5);
  cmmPulsarPrueba(cmmB, 'deshacer');
  cmmAfirmar.equal(cmmB.cmmSesion.cmmCorrectas.size, 0);
  cmmPulsarPrueba(cmmB, 'encajar');
  cmmAfirmar.equal(cmmB.cmmSesion.cmmCorrectas.size, 1);
  cmmAfirmar.equal(cmmB.cmmJuego.cmmMonedas, 5);
  cmmPulsarPrueba(cmmB, 'deshacer');
  cmmPulsarPrueba(cmmB, 'rehacer');
  cmmAfirmar.equal(cmmB.cmmJuego.cmmGanadasPartida, 5);
});

cmmPrueba('practicar una pieza fallada registra práctica sin cobrar vidas ni pagar monedas', async cmmContexto => {
  const cmmReto = cmmCatalogo[2];
  const cmmB = await cmmIniciarPrueba(cmmContexto, cmmReto, { cmmSaldo: 19 });
  await cmmB.cmmIniciar(cmmReto, [cmmReto.cmmRequeridas[0]]);
  cmmB.cmmDesmontar();
  const [cmmPieza] = cmmB.cmmSesion.cmmPiezas;
  cmmB.cmmElegir(cmmPieza);
  cmmPulsarPrueba(cmmB, 'encajar');
  cmmAfirmar.equal(cmmB.cmmJuego.cmmVidas, 3);
  cmmB.cmmAplicarPose(cmmPieza, cmmPieza.cmmObjetivo);
  cmmPulsarPrueba(cmmB, 'encajar');
  cmmAfirmar.equal(cmmB.cmmJuego.cmmMonedas, 19);
  cmmAfirmar.equal(cmmB.cmmHistorial.cmmPartidas[0].cmmPractica, true);
});

for (const [cmmNombre, cmmOpciones] of [
  ['el laboratorio libre', { cmmModo: 'libre' }],
  ['el tutorial', { cmmTutorial: true }]
]) {
  cmmPrueba(`${cmmNombre} no pierde vidas ni paga premios`, async (cmmContexto) => {
    const cmmB = await cmmIniciarPrueba(cmmContexto, cmmCatalogo[2], cmmOpciones);
    const cmmS = cmmB.cmmSesion;
    const [cmmPieza] = cmmS.cmmPiezas;
    cmmAfirmar.equal(cmmS.cmmUsaVidas, false);
    cmmB.cmmElegir(cmmPieza);
    if (cmmOpciones.cmmTutorial) {
      for (const cmmAccion of ['arrastre', 'objetivo']) cmmB.cmmRegistrarGuia(cmmAccion);
      cmmAfirmar.equal(cmmS.cmmGuia, 3);
    }
    cmmPieza.cmmPivote.position.copy(cmmPieza.cmmObjetivo.cmmPosicion);
    cmmPieza.cmmPivote.position.x += cmmPieza.cmmTolerancia * 4;
    cmmPulsarPrueba(cmmB, 'encajar');
    cmmAfirmar.equal(cmmB.cmmErrores(), cmmOpciones.cmmTutorial ? 1 : 0);
    cmmAfirmar.equal(cmmB.cmmJuego.cmmVidas, 3);
    cmmB.cmmAplicarPose(cmmPieza, cmmPieza.cmmObjetivo);
    cmmPulsarPrueba(cmmB, 'encajar');
    cmmAfirmar.equal(cmmS.cmmFase, cmmOpciones.cmmTutorial ? 'finalizado' : 'jugando');
    if (cmmOpciones.cmmTutorial) cmmAfirmar.equal(cmmS.cmmGuia, 4);
    cmmAfirmar.equal(cmmB.cmmJuego.cmmMonedas, 0);
  });
}

for (const [cmmFallos, cmmBono] of [[0, 30], [1, 10]]) {
  cmmPrueba(`el Builder paga la racha y el bono de ${cmmBono} al terminar con ${cmmFallos} fallos`, async (cmmContexto) => {
    const cmmB = await cmmIniciarPrueba(cmmContexto, cmmCatalogo[1], { cmmNivel: 3 });
    const cmmS = cmmB.cmmSesion;
    const cmmPremios = cmmFallos ? [5, 6, 5, 6, 7, 8, 9, 10, 10] : [5, 6, 7, 8, 9, 10, 10, 10, 10];
    cmmAfirmar.equal(cmmS.cmmPiezas.length, cmmPremios.length);
    for (const [cmmI, cmmPieza] of cmmS.cmmPiezas.entries()) {
      const cmmAntes = cmmB.cmmJuego.cmmMonedas;
      cmmB.cmmElegir(cmmPieza);
      if (cmmFallos && cmmI === 2) {
        cmmPieza.cmmPivote.position.copy(cmmPieza.cmmObjetivo.cmmPosicion);
        cmmPieza.cmmPivote.position.x += cmmPieza.cmmTolerancia * 4;
        cmmPulsarPrueba(cmmB, 'encajar');
        cmmAfirmar.equal(cmmS.cmmRacha, 0);
      }
      cmmB.cmmAplicarPose(cmmPieza, cmmPieza.cmmObjetivo);
      cmmPulsarPrueba(cmmB, 'encajar');
      const cmmUltima = cmmI === cmmPremios.length - 1;
      cmmAfirmar.equal(cmmB.cmmJuego.cmmMonedas - cmmAntes, cmmPremios[cmmI] + (cmmUltima ? cmmBono : 0));
    }
    cmmAfirmar.equal(cmmS.cmmFase, 'finalizado');
    cmmAfirmar.equal(cmmB.cmmHistorial.cmmPartidas[0].cmmErrores, cmmFallos);
    const cmmTotal = cmmPremios.reduce((cmmSuma, cmmPremio) => cmmSuma + cmmPremio, cmmBono);
    cmmAfirmar.equal(new CMMJuego().cmmMonedas, cmmTotal);
  });
}

for (const [cmmNivel, cmmCoste] of [[0, 0], [1, 10]]) {
  cmmPrueba(`la pista del Builder cuesta ${cmmCoste} monedas en ${CMM_DIFICULTADES[cmmNivel].cmmNombre}`, async (cmmContexto) => {
    const cmmB = await cmmIniciarPrueba(cmmContexto, cmmCatalogo[2], { cmmNivel, cmmSaldo: 15 });
    const cmmS = cmmB.cmmSesion;
    const [cmmPieza] = cmmS.cmmPiezas;
    cmmB.cmmElegir(cmmPieza);
    cmmPulsarPrueba(cmmB, 'pista');
    cmmAfirmar.equal(cmmPieza.cmmPista, true);
    cmmAfirmar.equal(cmmS.cmmPistas, 1);
    cmmAfirmar.equal(cmmB.cmmJuego.cmmGastadasPartida, cmmCoste);
    cmmAfirmar.equal(new CMMJuego().cmmMonedas, 15 - cmmCoste);
    if (cmmCoste) {
      cmmPulsarPrueba(cmmB, 'pista');
      cmmAfirmar.equal(cmmS.cmmPistas, 1);
      cmmAfirmar.equal(cmmB.cmmJuego.cmmMonedas, 5);
    }
  });
}

cmmPrueba('Avanzado oculta las siluetas con un booleano y revela solo la pieza con pista', async (cmmContexto) => {
  const cmmB = await cmmIniciarPrueba(cmmContexto, cmmCatalogo[2], { cmmNivel: 2, cmmSaldo: 15 });
  const cmmS = cmmB.cmmSesion;
  const [cmmPieza] = cmmS.cmmPiezas;
  const cmmSinDibujar = () => {};
  Object.assign(cmmB.cmmEscena, { cmmGuiar: cmmSinDibujar, cmmResaltar: cmmSinDibujar, cmmDibujar: cmmSinDibujar });
  delete cmmB.cmmIndicador;
  cmmB.cmmElegir(cmmPieza);
  cmmB.cmmIndicador();
  cmmAfirmar(cmmS.cmmPiezas.every((cmmOtra) => cmmOtra.cmmFantasma.visible === false));
  cmmPulsarPrueba(cmmB, 'pista');
  cmmB.cmmIndicador();
  cmmAfirmar.equal(cmmPieza.cmmFantasma.visible, true);
  cmmAfirmar(cmmS.cmmPiezas.slice(1).every((cmmOtra) => cmmOtra.cmmFantasma.visible === false));
});
