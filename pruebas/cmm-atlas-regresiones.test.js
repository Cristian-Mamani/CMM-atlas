import cmmPrueba from 'node:test';
import cmmAfirmar from 'node:assert/strict';
import { readFileSync as cmmLeer } from 'node:fs';
import { Vector3 as CMMVector } from 'three';
import { CMMVistas } from '../js/cmm-vistas.js';
import { CMMProgreso } from '../js/cmm-progreso.js';
import { CMMTarjetas } from '../js/cmm-tarjetas.js';
import { CMMExamen, cmmGruposDe } from '../js/cmm-examen.js';
import { CMMJuego } from '../js/cmm-juego.js';
import { CMMComandos } from '../js/cmm-comandos.js';
import { CMMEscenaExplosion } from '../js/cmm-escena-explosion.js';
import { cmmSimularAlmacenamiento } from './cmm-almacenamiento-prueba.js';

const CMM_ATLAS = JSON.parse(cmmLeer(new URL('../datos/atlas.json', import.meta.url), 'utf8'));
const CMM_NOMBRES = JSON.parse(cmmLeer(new URL('../datos/nombres-es.json', import.meta.url), 'utf8'));

cmmPrueba('las vistas válidas se conservan aunque haya registros incompletos o falle un guardado', cmmContexto => {
  const cmmAlmacen = cmmSimularAlmacenamiento(cmmContexto);
  cmmAlmacen.set('cmm.vistas.v1', 'null');
  cmmAfirmar.deepEqual(new CMMVistas().cmmLista, []);
  const cmmVista = { cmmNombre: 'Pelvis', cmmContenido: { cmmCamara: { cmmPos: [1, 2, 3], cmmObj: [0, 1, 0] } } };
  cmmAlmacen.set('cmm.vistas.v1', JSON.stringify([null, cmmVista, { cmmNombre: 'Sin cámara', cmmContenido: {} }]));
  const cmmVistas = new CMMVistas();
  cmmAfirmar.deepEqual(cmmVistas.cmmLista, [cmmVista]);
  cmmContexto.mock.method(localStorage, 'setItem', () => { throw new Error('Almacenamiento lleno'); });
  cmmAfirmar.equal(cmmVistas.cmmAgregar('Otra vista', cmmVista.cmmContenido), false);
  cmmAfirmar.equal(cmmVistas.cmmQuitar(0), false);
  cmmAfirmar.deepEqual(cmmVistas.cmmLista, [cmmVista]);
});

cmmPrueba('el repaso y el mapa usan el mismo dominio y toleran progreso dañado', cmmContexto => {
  const cmmAlmacen = cmmSimularAlmacenamiento(cmmContexto);
  cmmAlmacen.set('cmm.progreso.v1', 'null');
  cmmAfirmar.equal(new CMMProgreso().cmmResumenRepaso().cmmHoy, 0);
  const cmmClave = CMM_ATLAS.parts.find(cmmPieza => cmmPieza.id === 'FJ3152').name;
  cmmAlmacen.set('cmm.progreso.v1', JSON.stringify({ [cmmClave]: { cmmAciertos: 2, cmmRacha: 2 }, cmmInvalido: null }));
  const cmmProgreso = new CMMProgreso();
  cmmProgreso.cmmRelojPrueba = 1000;
  cmmAfirmar.equal(cmmProgreso.cmmEstado(cmmClave), 'practica');
  cmmAfirmar.equal(cmmProgreso.cmmDominioBuilder(cmmClave), 'familiar');
  cmmProgreso.cmmRegistrar(cmmClave, true);
  cmmProgreso.cmmRegistrar(cmmClave, true);
  cmmAfirmar.equal(cmmProgreso.cmmEstado(cmmClave), 'dominada');
  cmmAfirmar.equal(cmmProgreso.cmmResumenRepaso().cmmDominadas, 1);
  cmmProgreso.cmmRelojPrueba = cmmProgreso.cmmDatos[cmmClave].cmmProximo;
  cmmAfirmar.equal(cmmProgreso.cmmDominioBuilder(cmmClave), 'necesita repaso');
  cmmAfirmar.equal(cmmProgreso.cmmEstado(cmmClave), 'practica');
  cmmAfirmar.equal(cmmProgreso.cmmResumenRepaso().cmmDominadas, 0);
});

cmmPrueba('el repaso recupera estructuras vasculares y filtra claves ajenas antes del límite diario', cmmContexto => {
  const cmmAlmacen = cmmSimularAlmacenamiento(cmmContexto);
  const cmmDatos = CMM_ATLAS.parts.filter(cmmPieza => ['arterial', 'venous', 'integumentary'].includes(cmmPieza.system));
  const cmmDisponibles = cmmDatos.filter((cmmPieza, cmmI) => cmmDatos.findIndex(cmmOtra => cmmPieza.system === cmmOtra.system) === cmmI);
  const cmmPiezas = cmmDisponibles.map(cmmPieza => ({ cmmId: cmmPieza.id, cmmNombreEn: cmmPieza.name,
    cmmNombre: cmmPieza.name, cmmSistema: cmmPieza.system, cmmCentro: new CMMVector().fromArray(cmmPieza.bounds[0]) }));
  const cmmNombres = new Set(cmmPiezas.map(cmmPieza => cmmPieza.cmmNombreEn));
  const cmmAjenos = [...new Set(CMM_ATLAS.parts.filter(cmmPieza => !cmmNombres.has(cmmPieza.name)).map(cmmPieza => cmmPieza.name))].slice(0, 40);
  cmmAlmacen.set('cmm.progreso.v1', JSON.stringify(Object.fromEntries([...cmmAjenos, ...cmmNombres].map((cmmNombre, cmmI) =>
    [cmmNombre, { cmmErrores: 1, cmmProximo: cmmI }]))));
  const cmmProgreso = new CMMProgreso();
  const cmmTarjetas = new CMMTarjetas({ cmmPiezas }, cmmProgreso, { addEventListener() {} }, {});
  cmmAfirmar.deepEqual(new Set(cmmTarjetas.cmmArmar('hoy', []).map(cmmGrupo => cmmGrupo.cmmNombreEn)), cmmNombres);
  cmmAfirmar.deepEqual(new Set(cmmTarjetas.cmmArmar('forzado', [...cmmNombres]).map(cmmGrupo => cmmGrupo.cmmNombreEn)), cmmNombres);
  cmmAfirmar.equal(cmmProgreso.cmmResumenRepaso(cmmNombres).cmmHoy, cmmNombres.size);
});

cmmPrueba('las opciones del examen tienen etiquetas únicas y una variante tipográfica identifica la misma estructura', () => {
  const cmmClave = 'external intercostal muscle';
  const cmmOrigen = CMM_ATLAS.parts.filter(cmmPieza => cmmPieza.name.toLowerCase() === cmmClave);
  const cmmOtros = [...new Map(CMM_ATLAS.parts.filter(cmmPieza => cmmPieza.system === 'skeletal')
    .map(cmmPieza => [CMM_NOMBRES[cmmPieza.name.toLowerCase()], cmmPieza])).values()].slice(0, 3);
  const cmmPiezas = [...cmmOrigen, ...cmmOtros].map(cmmPieza => ({
    cmmId: cmmPieza.id, cmmNombreEn: cmmPieza.name, cmmNombre: CMM_NOMBRES[cmmPieza.name.toLowerCase()],
    cmmSistema: cmmPieza.system, cmmCentro: new CMMVector()
  }));
  const cmmExamen = Object.create(CMMExamen.prototype);
  cmmExamen.cmmTodos = cmmGruposDe(cmmPiezas, ['muscular', 'skeletal']);
  const cmmOpciones = cmmExamen.cmmOpciones(cmmExamen.cmmTodos.find(cmmGrupo => cmmGrupo.cmmSistema === 'skeletal'));
  cmmAfirmar.equal(cmmOpciones.length, 4);
  cmmAfirmar.equal(new Set(cmmOpciones.map(cmmGrupo => cmmGrupo.cmmNombre)).size, 4);
  cmmExamen.cmmActivo = true;
  cmmExamen.cmmConfig = { cmmModo: 'encontrar' };
  cmmExamen.cmmInicioPregunta = performance.now();
  cmmExamen.cmmLimite = 30000;
  cmmExamen.cmmIndice = 0;
  cmmExamen.cmmPreguntas = [cmmExamen.cmmTodos.find(cmmGrupo => cmmGrupo.cmmNombreEn === cmmClave)];
  cmmExamen.cmmEscena = { cmmPorId: new Map(cmmPiezas.map(cmmPieza => [cmmPieza.cmmId, cmmPieza])) };
  let cmmResultado;
  cmmExamen.cmmCerrarPregunta = cmmAcierto => { cmmResultado = cmmAcierto; };
  const cmmVariante = cmmPiezas.find(cmmPieza => cmmPieza.cmmNombreEn === 'External intercostal muscle');
  cmmExamen.cmmTocar(cmmVariante.cmmId);
  cmmAfirmar.equal(cmmResultado, true);
});

cmmPrueba('el examen de identificación respeta el vencimiento entre dos actualizaciones del reloj', () => {
  const cmmExamen = Object.create(CMMExamen.prototype);
  cmmExamen.cmmActivo = true;
  cmmExamen.cmmConfig = { cmmModo: 'encontrar' };
  cmmExamen.cmmInicioPregunta = performance.now() - 30200;
  cmmExamen.cmmLimite = 30000;
  let cmmResultado;
  cmmExamen.cmmCerrarPregunta = cmmAcierto => { cmmResultado = cmmAcierto; };
  cmmExamen.cmmTocar(CMM_ATLAS.parts[0].id);
  cmmAfirmar.equal(cmmResultado, false);
});

cmmPrueba('pedir una pista al vencer el cronómetro cierra la pregunta sin cobrar monedas', cmmContexto => {
  const cmmAlmacen = cmmSimularAlmacenamiento(cmmContexto);
  cmmAlmacen.set('cmm.juego.v1', JSON.stringify({ cmmMonedas: 15 }));
  const cmmJuego = new CMMJuego();
  const cmmExamen = new CMMExamen({}, {}, { addEventListener() {}, querySelector() { return {}; } }, {}, cmmJuego);
  const cmmPieza = CMM_ATLAS.parts.find(cmmParte => cmmParte.id === 'FJ3152');
  Object.assign(cmmExamen, {
    cmmActivo: true,
    cmmConfig: { cmmModo: 'encontrar' },
    cmmInicioPregunta: performance.now() - 30001,
    cmmLimite: 30000,
    cmmIndice: 0,
    cmmPreguntas: [{ cmmPiezas: [cmmPieza], cmmPista: 'Busca en la pelvis.' }]
  });
  const cmmCierre = cmmContexto.mock.method(cmmExamen, 'cmmCerrarPregunta', () => {});
  cmmExamen.cmmPedirPista();
  cmmAfirmar.equal(cmmJuego.cmmMonedas, 15);
  cmmAfirmar.equal(cmmJuego.cmmGastadasPartida, 0);
  cmmAfirmar.equal(cmmCierre.mock.callCount(), 1);
  cmmAfirmar.deepEqual(cmmCierre.mock.calls[0].arguments, [false, null]);
  cmmExamen.cmmInicioPregunta = performance.now();
  cmmExamen.cmmPedirPista();
  cmmAfirmar.equal(cmmJuego.cmmMonedas, 5);
  cmmAfirmar.equal(cmmJuego.cmmGastadasPartida, 10);
  cmmAfirmar.equal(cmmCierre.mock.callCount(), 1);
});

cmmPrueba('la orden de aislar cambia la explosión al sistema de la estructura seleccionada', () => {
  const cmmPiezas = ['Stomach', 'Body of sternum'].map((cmmNombre, cmmOrden) => {
    const cmmPieza = CMM_ATLAS.parts.find(cmmParte => cmmParte.name === cmmNombre);
    return { cmmId: cmmPieza.id, cmmNombreEn: cmmPieza.name, cmmNombre: CMM_NOMBRES[cmmPieza.name.toLowerCase()],
      cmmSistema: cmmPieza.system, cmmOrden };
  });
  const [cmmEstomago, cmmEsternon] = cmmPiezas;
  const cmmEscena = Object.assign(Object.create(CMMEscenaExplosion.prototype), {
    cmmPiezas,
    cmmPorId: new Map(cmmPiezas.map(cmmPieza => [cmmPieza.cmmId, cmmPieza])),
    cmmEstado: { cmmExplosionSistema: 'skeletal', cmmExplosionValor: 0.5, cmmSistemas: new Set(['skeletal']),
      cmmSeleccion: new Set(), cmmResalte: new Set() },
    cmmOpacidades: [],
    cmmColores: new Map(),
    cmmLote: { cmmFijarAspecto() {} },
    cmmAplicarExplosion() {},
    cmmEnfocar() {}
  });
  const cmmComandos = new CMMComandos(cmmEscena, {
    cmmMostrarPiezasSeleccionadas(cmmElegidas) { cmmEscena.cmmEstado.cmmExplosionSistema = cmmElegidas[0].cmmSistema; },
    cmmPintarDetalle() {}
  });
  cmmEscena.cmmAplicar();
  cmmAfirmar.equal(cmmEscena.cmmOpacidadDe(cmmEstomago), 0);
  cmmAfirmar.equal(cmmEscena.cmmOpacidadDe(cmmEsternon), 1);
  cmmAfirmar.match(cmmComandos.cmmInterpretar('Aísla el estómago').cmmEjecutar(), /Aislé Estómago/i);
  cmmAfirmar.equal(cmmEscena.cmmOpacidadDe(cmmEstomago), 1);
  cmmAfirmar.equal(cmmEscena.cmmOpacidadDe(cmmEsternon), 0);
  cmmAfirmar.equal(cmmEscena.cmmEstado.cmmExplosionValor, 0.5);
});

cmmPrueba('la vista de piezas del examen conserva el reloj y se restaura al cambiar de pregunta', () => {
  const cmmDato = CMM_ATLAS.parts.find(cmmPieza => cmmPieza.id === 'FJ2569');
  const cmmExamen = Object.create(CMMExamen.prototype);
  const cmmCambios = [];
  cmmExamen.cmmEventos = { cmmAlVistaPiezas: (...cmmCambio) => cmmCambios.push(cmmCambio) };
  cmmExamen.cmmConfig = { cmmModo: 'encontrar' };
  cmmExamen.cmmPreguntas = [{ cmmSistema: cmmDato.system }];
  cmmExamen.cmmIndice = 0;
  const cmmInicio = performance.now();
  cmmExamen.cmmInicioPregunta = cmmInicio;
  cmmExamen.cmmLimite = 30000;
  const cmmBoton = { setAttribute() {} };
  cmmExamen.cmmAlternarVistaPiezas(cmmBoton);
  cmmAfirmar.equal(cmmBoton.textContent, 'Ver cuerpo ensamblado');
  cmmAfirmar.equal(cmmExamen.cmmInicioPregunta, cmmInicio);
  cmmExamen.cmmRestaurarPiezas();
  cmmAfirmar.deepEqual(cmmCambios, [[cmmDato.system, true], [null, false]]);
  cmmExamen.cmmPreguntas[0].cmmSinRegistro = true;
  cmmExamen.cmmAlternarVistaPiezas(cmmBoton);
  cmmAfirmar.equal(cmmCambios.length, 2);
});
