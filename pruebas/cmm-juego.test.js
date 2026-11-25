import cmmPrueba from 'node:test';
import cmmAfirmar from 'node:assert/strict';
import { CMM_COSTE_PISTA, CMMJuego } from '../js/cmm-juego.js';
import { cmmSimularAlmacenamiento } from './cmm-almacenamiento-prueba.js';

cmmPrueba('tres vidas, derrota al llegar a cero y reinicio de partida', (cmmContexto) => {
  cmmSimularAlmacenamiento(cmmContexto);
  const cmmJuego = new CMMJuego();
  cmmAfirmar.equal(cmmJuego.cmmVidas, 3);
  cmmAfirmar.equal(cmmJuego.cmmPerderVida(), 2);
  cmmAfirmar.equal(cmmJuego.cmmPerderVida(), 1);
  cmmAfirmar.equal(cmmJuego.cmmSinVidas(), false);
  cmmAfirmar.equal(cmmJuego.cmmPerderVida(), 0);
  cmmAfirmar.equal(cmmJuego.cmmSinVidas(), true);
  cmmAfirmar.equal(cmmJuego.cmmPerderVida(), 0);
  cmmJuego.cmmNuevaPartida();
  cmmAfirmar.equal(cmmJuego.cmmVidas, 3);
});

cmmPrueba('premio por racha y bono por completar con y sin fallos', (cmmContexto) => {
  cmmSimularAlmacenamiento(cmmContexto);
  const cmmJuego = new CMMJuego();
  const cmmRachas = [0, 1, 2, 3, 4, 5, 6, 20];
  cmmAfirmar.deepEqual(cmmRachas.map((cmmRacha) => cmmJuego.cmmPremioPregunta(cmmRacha)), [5, 6, 7, 8, 9, 10, 10, 10]);
  cmmAfirmar.equal(cmmJuego.cmmPremioFinal(0, true), 30);
  cmmAfirmar.equal(cmmJuego.cmmPremioFinal(1, true), 10);
  cmmAfirmar.equal(cmmJuego.cmmPremioFinal(0, false), 0);
});

cmmPrueba('una pista cuesta 10 y cmm.juego.v1 conserva el saldo al reconstruir el juego', (cmmContexto) => {
  const cmmValores = cmmSimularAlmacenamiento(cmmContexto);
  const cmmJuego = new CMMJuego();
  cmmAfirmar.equal(CMM_COSTE_PISTA, 10);
  cmmJuego.cmmGanar(27);
  cmmAfirmar.equal(cmmJuego.cmmGastar(CMM_COSTE_PISTA), true);
  cmmAfirmar.equal(cmmJuego.cmmGastar(18), false);
  cmmAfirmar.equal(cmmJuego.cmmGastadasPartida, 10);
  cmmAfirmar.deepEqual([...cmmValores.keys()], ['cmm.juego.v1']);
  cmmAfirmar.deepEqual(JSON.parse(cmmValores.get('cmm.juego.v1')), { cmmMonedas: 17 });
  cmmJuego.cmmPerderVida();
  const cmmRecargado = new CMMJuego();
  cmmAfirmar.equal(cmmRecargado.cmmMonedas, 17);
  cmmAfirmar.equal(cmmRecargado.cmmVidas, 3);
  cmmRecargado.cmmNuevaPartida();
  cmmAfirmar.equal(cmmRecargado.cmmMonedas, 17);
});

cmmPrueba('las sumas y los cargos inválidos conservan saldo y registro', cmmContexto => {
  cmmSimularAlmacenamiento(cmmContexto);
  const cmmJuego = new CMMJuego();
  cmmJuego.cmmGanar(20);
  for (const cmmMonto of [-10, 0.5, Infinity, NaN]) cmmAfirmar.equal(cmmJuego.cmmGastar(cmmMonto), false);
  cmmAfirmar.equal(cmmJuego.cmmGanar(Infinity), 0);
  cmmAfirmar.equal(cmmJuego.cmmGanar(NaN), 0);
  cmmAfirmar.equal(cmmJuego.cmmMonedas, 20);
  cmmAfirmar.equal(cmmJuego.cmmGastadasPartida, 0);
});
