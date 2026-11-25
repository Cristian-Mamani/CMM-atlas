import { CMM_ORGANOS, CMM_SISTEMAS } from './cmm-datos.js';
import { cmmUbicacion } from './cmm-regiones.js';
import { CMM_COSTE_PISTA } from './cmm-juego.js';

const CMM_CATEGORIAS = {
  huesos: ['skeletal'],
  musculos: ['muscular'],
  organos: CMM_ORGANOS,
  nervios: ['nervous'],
  todo: ['skeletal', 'muscular', 'nervous'].concat(CMM_ORGANOS)
};

export function cmmGruposDe(cmmPiezas, cmmSistemas) {
  const cmmMapa = new Map();
  for (const cmmP of cmmPiezas) {
    if (!cmmSistemas.includes(cmmP.cmmSistema)) continue;
    if (!cmmMapa.has(cmmP.cmmNombreEn)) {
      cmmMapa.set(cmmP.cmmNombreEn, { cmmNombreEn: cmmP.cmmNombreEn, cmmNombre: cmmP.cmmNombre, cmmSistema: cmmP.cmmSistema, cmmPiezas: [], cmmCentro: cmmP.cmmCentro.clone() });
    }
    cmmMapa.get(cmmP.cmmNombreEn).cmmPiezas.push(cmmP);
  }
  return Array.from(cmmMapa.values());
}

export function cmmMezclar(cmmLista) {
  const cmmCopia = cmmLista.slice();
  for (let cmmI = cmmCopia.length - 1; cmmI > 0; cmmI--) {
    const cmmJ = Math.floor(Math.random() * (cmmI + 1));
    const cmmT = cmmCopia[cmmI];
    cmmCopia[cmmI] = cmmCopia[cmmJ];
    cmmCopia[cmmJ] = cmmT;
  }
  return cmmCopia;
}

function cmmDescartarOpciones(cmmBotones, cmmCantidad) {
  cmmMezclar(cmmBotones).slice(0, cmmCantidad).forEach((cmmB) => {
    cmmB.disabled = true;
    cmmB.classList.add('cmm-descartada');
  });
}

export class CMMExamen {
  constructor(cmmEscena, cmmProgreso, cmmPanel, cmmEventos, cmmJuego) {
    this.cmmJuego = cmmJuego;
    this.cmmEscena = cmmEscena;
    this.cmmProgreso = cmmProgreso;
    this.cmmPanel = cmmPanel;
    this.cmmEventos = cmmEventos;
    this.cmmActivo = false;
    this.cmmReloj = null;
    this.cmmPanel.addEventListener('click', (cmmEv) => this.cmmClicPanel(cmmEv));
  }

  cmmIniciar(cmmConfig) {
    const cmmPropias = typeof cmmConfig.cmmFabrica === 'function';
    const cmmGrupos = cmmPropias ? cmmConfig.cmmFabrica(this.cmmEscena.cmmPiezas) : cmmGruposDe(this.cmmEscena.cmmPiezas, CMM_CATEGORIAS[cmmConfig.cmmCategoria]).filter((cmmG) => cmmG.cmmNombre.length < 60);
    if (cmmGrupos.length < (cmmPropias ? 1 : 6)) return;
    this.cmmConfig = cmmConfig;
    this.cmmTodos = cmmGrupos;
    this.cmmPreguntas = cmmPropias ? cmmGrupos : cmmMezclar(cmmGrupos).slice(0, cmmConfig.cmmTotal);
    this.cmmIndice = 0;
    this.cmmPuntos = 0;
    this.cmmRacha = 0;
    this.cmmMejorRacha = 0;
    this.cmmResultados = [];
    this.cmmSinVidas = false;
    this.cmmPistaUsada = false;
    this.cmmPiezasSeparadas = false;
    this.cmmJuego.cmmNuevaPartida();
    this.cmmActivo = true;
    this.cmmEscena.cmmEstado.cmmRegion = null;
    this.cmmEscena.cmmEstado.cmmAislar = false;
    this.cmmEscena.cmmEstado.cmmContexto = false;
    this.cmmEscena.cmmEstado.cmmSistemas = new Set(cmmConfig.cmmSistemas || CMM_CATEGORIAS[cmmConfig.cmmCategoria]);
    this.cmmEscena.cmmSeleccionar([]);
    this.cmmEventos.cmmAlEmpezar();
    this.cmmMostrar();
  }

  cmmDetenerReloj() {
    if (this.cmmReloj) clearInterval(this.cmmReloj);
    this.cmmReloj = null;
  }

  cmmOpciones(cmmObjetivo) {
    const cmmNombres = new Set([cmmObjetivo.cmmNombre]);
    const cmmOtros = this.cmmTodos
      .filter(cmmGrupo => cmmGrupo.cmmNombreEn !== cmmObjetivo.cmmNombreEn)
      .sort((cmmA, cmmB) => cmmA.cmmCentro.distanceTo(cmmObjetivo.cmmCentro) - cmmB.cmmCentro.distanceTo(cmmObjetivo.cmmCentro))
      .filter(cmmGrupo => {
        if (cmmNombres.has(cmmGrupo.cmmNombre)) return false;
        cmmNombres.add(cmmGrupo.cmmNombre);
        return true;
      })
      .slice(0, 12);
    const cmmElegidos = cmmMezclar(cmmOtros).slice(0, 3);
    return cmmMezclar(cmmElegidos.concat([cmmObjetivo]));
  }

  cmmMostrar() {
    this.cmmDetenerReloj();
    this.cmmRestaurarPiezas();
    const cmmG = this.cmmPreguntas[this.cmmIndice];
    this.cmmRespondida = false;
    this.cmmPistaUsada = false;
    this.cmmInicioPregunta = performance.now();
    const cmmIds = cmmG.cmmPiezas.map((cmmP) => cmmP.cmmId);
    const cmmEncontrar = this.cmmConfig.cmmModo === 'encontrar';
    if (cmmEncontrar) {
      this.cmmEscena.cmmResaltar([], false);
      this.cmmEscena.cmmVistaFija('tres');
    } else {
      this.cmmEscena.cmmResaltar(cmmIds, true);
      this.cmmEscena.cmmEnfocar(cmmIds, 700);
    }
    if (cmmG.cmmSistemasVisibles) {
      this.cmmEscena.cmmEstado.cmmSistemas = new Set(cmmG.cmmSistemasVisibles);
      this.cmmEscena.cmmAplicar();
    }
    this.cmmOpcionesActuales = cmmEncontrar ? [] : this.cmmOpciones(cmmG);
    this.cmmLimite = cmmEncontrar ? (this.cmmConfig.cmmLimite || 30000) : 0;
    const cmmCab = `<div class="cmm-cabecera-examen"><span>Pregunta <strong>${this.cmmIndice + 1}/${this.cmmPreguntas.length}</strong></span><span>Puntos <strong id="cmm-ex-puntos">${this.cmmPuntos}</strong></span><span>Racha <strong>${this.cmmRacha}</strong></span></div><div class="cmm-cabecera-juego"><span class="cmm-vidas" id="cmm-ex-vidas">${this.cmmJuego.cmmCorazones()}</span><span class="cmm-monedas">&#9679; <strong id="cmm-ex-monedas">${this.cmmJuego.cmmMonedas}</strong> monedas</span></div>`;
    const cmmBarra = cmmEncontrar ? '<div class="cmm-barra"><i id="cmm-ex-tiempo" style="width:100%"></i></div>' : '';
    let cmmCuerpo;
    if (cmmEncontrar) {
      cmmCuerpo = `<h2>Encuentra: <strong>${cmmG.cmmNombre}</strong></h2><p class="cmm-vacio">Haz clic sobre esa estructura en el cuerpo 3D. Puedes girar y acercar la cámara. Tienes ${Math.round(this.cmmLimite / 1000)} segundos.</p>`;
    } else {
      cmmCuerpo = '<h2>¿Cómo se llama la estructura resaltada?</h2><div class="cmm-opciones">' + this.cmmOpcionesActuales.map((cmmO, cmmI) => `<button data-cmm-op="${cmmI}">${cmmO.cmmNombre}</button>`).join('') + '</div>';
    }
    const cmmVistaPiezas = cmmEncontrar && !cmmG.cmmSinRegistro && this.cmmEventos.cmmAlVistaPiezas
      ? '<button data-cmm-ex="vista-piezas" aria-pressed="false">Ver piezas separadas</button>' : '';
    this.cmmPanel.innerHTML = cmmCab + cmmBarra + cmmCuerpo + '<div id="cmm-ex-aviso"></div><div class="cmm-acciones">'
      + cmmVistaPiezas + '<button data-cmm-ex="pista" id="cmm-ex-pista">Pista (' + CMM_COSTE_PISTA + ' monedas)</button><button data-cmm-ex="salir">Salir del examen</button></div>';
    this.cmmRefrescarPista();
    if (cmmEncontrar) {
      this.cmmReloj = setInterval(() => this.cmmLatido(), 200);
    }
  }

  cmmRestaurarPiezas() {
    if (!this.cmmPiezasSeparadas) return;
    this.cmmPiezasSeparadas = false;
    this.cmmEventos.cmmAlVistaPiezas(null, false);
  }

  cmmAlternarVistaPiezas(cmmBoton) {
    if (this.cmmRespondida || this.cmmConfig.cmmModo !== 'encontrar') return;
    const cmmG = this.cmmPreguntas[this.cmmIndice];
    if (cmmG.cmmSinRegistro || !this.cmmEventos.cmmAlVistaPiezas) return;
    if (this.cmmCerrarSiVencio()) return;
    this.cmmPiezasSeparadas = !this.cmmPiezasSeparadas;
    this.cmmEventos.cmmAlVistaPiezas(this.cmmPiezasSeparadas ? cmmG.cmmSistema : null, true);
    cmmBoton.setAttribute('aria-pressed', this.cmmPiezasSeparadas);
    cmmBoton.textContent = this.cmmPiezasSeparadas ? 'Ver cuerpo ensamblado' : 'Ver piezas separadas';
  }

  cmmRefrescarPista() {
    const cmmBoton = this.cmmPanel.querySelector('#cmm-ex-pista');
    if (!cmmBoton) return;
    cmmBoton.disabled = this.cmmRespondida || this.cmmPistaUsada || !this.cmmJuego.cmmPuedePagar(CMM_COSTE_PISTA);
  }

  cmmPedirPista() {
    if (this.cmmRespondida || this.cmmPistaUsada) return;
    if (this.cmmCerrarSiVencio()) return;
    if (!this.cmmJuego.cmmGastar(CMM_COSTE_PISTA)) return;
    this.cmmPistaUsada = true;
    const cmmG = this.cmmPreguntas[this.cmmIndice];
    const cmmAviso = this.cmmPanel.querySelector('#cmm-ex-aviso');
    if (this.cmmConfig.cmmModo === 'nombrar') {
      const cmmIncorrectas = Array.from(this.cmmPanel.querySelectorAll('[data-cmm-op]')).filter((cmmB) => this.cmmOpcionesActuales[Number(cmmB.dataset.cmmOp)].cmmNombreEn !== cmmG.cmmNombreEn);
      cmmDescartarOpciones(cmmIncorrectas, 2);
      cmmAviso.innerHTML = '<div class="cmm-aviso-resultado">Pista: se descartaron dos opciones.</div>';
    } else {
      cmmAviso.innerHTML = '<div class="cmm-aviso-resultado">Pista: ' + (cmmG.cmmPista || 'se encuentra en <strong>' + cmmUbicacion(cmmG.cmmPiezas[0]) + '</strong>.') + '</div>';
    }
    const cmmMon = this.cmmPanel.querySelector('#cmm-ex-monedas');
    if (cmmMon) cmmMon.textContent = this.cmmJuego.cmmMonedas;
    this.cmmRefrescarPista();
  }

  cmmLatido() {
    const cmmGastado = performance.now() - this.cmmInicioPregunta;
    const cmmBarra = this.cmmPanel.querySelector('#cmm-ex-tiempo');
    if (cmmBarra) cmmBarra.style.width = Math.max(0, 100 - (cmmGastado / this.cmmLimite) * 100) + '%';
    this.cmmCerrarSiVencio(cmmGastado);
  }

  cmmCerrarSiVencio(cmmGastado = performance.now() - this.cmmInicioPregunta) {
    if (this.cmmRespondida || this.cmmConfig.cmmModo !== 'encontrar' || cmmGastado < this.cmmLimite) return false;
    this.cmmCerrarPregunta(false, null);
    return true;
  }

  cmmPuntaje(cmmAcierto, cmmMs) {
    if (!cmmAcierto) return 0;
    const cmmTope = this.cmmConfig.cmmModo === 'encontrar' ? this.cmmLimite : 20000;
    const cmmBono = Math.round(50 * Math.max(0, 1 - cmmMs / cmmTope));
    const cmmMult = 1 + Math.min(this.cmmRacha, 5) * 0.1;
    return Math.round((100 + cmmBono) * cmmMult);
  }

  cmmCerrarPregunta(cmmAcierto, cmmElegida) {
    if (this.cmmRespondida) return;
    this.cmmRespondida = true;
    this.cmmDetenerReloj();
    const cmmG = this.cmmPreguntas[this.cmmIndice];
    const cmmMs = performance.now() - this.cmmInicioPregunta;
    if (cmmAcierto) {
      this.cmmRacha += 1;
      this.cmmMejorRacha = Math.max(this.cmmMejorRacha, this.cmmRacha);
    } else {
      this.cmmRacha = 0;
    }
    const cmmGanados = this.cmmPuntaje(cmmAcierto, cmmMs);
    let cmmMonedasGanadas = 0;
    if (cmmAcierto) cmmMonedasGanadas = this.cmmJuego.cmmGanar(this.cmmJuego.cmmPremioPregunta(this.cmmRacha - 1));
    else if (this.cmmJuego.cmmPerderVida() === 0) this.cmmSinVidas = true;
    this.cmmPuntos += cmmGanados;
    if (!cmmG.cmmSinRegistro) this.cmmProgreso.cmmRegistrar(cmmG.cmmNombreEn, cmmAcierto);
    this.cmmResultados.push({ cmmSinRegistro: Boolean(cmmG.cmmSinRegistro), cmmNombreEn: cmmG.cmmNombreEn, cmmNombre: cmmG.cmmNombre, cmmAcierto: cmmAcierto, cmmMs: cmmMs });
    const cmmIds = cmmG.cmmPiezas.map((cmmP) => cmmP.cmmId);
    this.cmmEscena.cmmResaltar(cmmIds, this.cmmConfig.cmmModo === 'nombrar');
    if (this.cmmConfig.cmmModo === 'encontrar') this.cmmEscena.cmmEnfocar(cmmIds, 700);
    this.cmmPanel.querySelectorAll('[data-cmm-op]').forEach((cmmB) => {
      cmmB.disabled = true;
      const cmmI = Number(cmmB.dataset.cmmOp);
      if (this.cmmOpcionesActuales[cmmI].cmmNombreEn === cmmG.cmmNombreEn) cmmB.classList.add('cmm-correcta');
      else if (cmmB === cmmElegida) cmmB.classList.add('cmm-incorrecta');
    });
    const cmmSegundos = (cmmMs / 1000).toFixed(1);
    const cmmUlt = this.cmmIndice === this.cmmPreguntas.length - 1;
    const cmmTexto = cmmAcierto
      ? `<strong>¡Correcto!</strong> +${cmmGanados} puntos · +${cmmMonedasGanadas} monedas · ${cmmSegundos} s`
      : `<strong>No era esa.</strong> Era <strong>${cmmG.cmmNombre}</strong>. Pierdes una vida.${this.cmmSinVidas ? ' Te quedaste sin vidas.' : ''}`;
    const cmmAviso = this.cmmPanel.querySelector('#cmm-ex-aviso');
    cmmAviso.innerHTML = `<div class="cmm-aviso-resultado ${cmmAcierto ? 'cmm-bien' : 'cmm-mal'}">${cmmTexto}<br><small>${cmmG.cmmSinRegistro ? '' : cmmUbicacion(cmmG.cmmPiezas[0])}</small></div><button class="cmm-boton-principal" data-cmm-ex="siguiente">${cmmUlt || this.cmmSinVidas ? 'Ver resultados' : 'Siguiente pregunta'}</button>`;
    const cmmVistaPiezas = this.cmmPanel.querySelector('[data-cmm-ex="vista-piezas"]');
    if (cmmVistaPiezas) cmmVistaPiezas.disabled = true;
    const cmmPuntos = this.cmmPanel.querySelector('#cmm-ex-puntos');
    if (cmmPuntos) cmmPuntos.textContent = this.cmmPuntos;
    const cmmVidas = this.cmmPanel.querySelector('#cmm-ex-vidas');
    if (cmmVidas) cmmVidas.innerHTML = this.cmmJuego.cmmCorazones();
    const cmmMon = this.cmmPanel.querySelector('#cmm-ex-monedas');
    if (cmmMon) cmmMon.textContent = this.cmmJuego.cmmMonedas;
    this.cmmRefrescarPista();
  }

  cmmTocar(cmmId) {
    if (!this.cmmActivo || this.cmmRespondida || this.cmmConfig.cmmModo !== 'encontrar') return;
    if (this.cmmCerrarSiVencio()) return;
    if (!cmmId) return;
    const cmmG = this.cmmPreguntas[this.cmmIndice];
    const cmmPieza = this.cmmEscena.cmmPorId.get(cmmId);
    if (!cmmPieza) return;
    const cmmAcepta = typeof cmmG.cmmAcepta === 'function' ? cmmG.cmmAcepta(cmmPieza)
      : cmmPieza.cmmSistema === cmmG.cmmSistema && cmmPieza.cmmNombreEn.toLowerCase() === cmmG.cmmNombreEn.toLowerCase();
    this.cmmCerrarPregunta(cmmAcepta, null);
  }

  cmmClicPanel(cmmEv) {
    if (!this.cmmActivo) return;
    const cmmOp = cmmEv.target.closest('[data-cmm-op]');
    if (cmmOp && !this.cmmRespondida) {
      const cmmG = this.cmmPreguntas[this.cmmIndice];
      const cmmEl = this.cmmOpcionesActuales[Number(cmmOp.dataset.cmmOp)];
      this.cmmCerrarPregunta(cmmEl.cmmNombreEn === cmmG.cmmNombreEn, cmmOp);
      return;
    }
    const cmmAccion = cmmEv.target.closest('[data-cmm-ex]');
    if (!cmmAccion) return;
    const cmmTipo = cmmAccion.dataset.cmmEx;
    if (cmmTipo === 'siguiente') {
      this.cmmIndice += 1;
      if (this.cmmSinVidas || this.cmmIndice >= this.cmmPreguntas.length) this.cmmResumen();
      else this.cmmMostrar();
    } else if (cmmTipo === 'pista') {
      this.cmmPedirPista();
    } else if (cmmTipo === 'vista-piezas') {
      this.cmmAlternarVistaPiezas(cmmAccion);
    } else if (cmmTipo === 'salir') {
      this.cmmSalir();
    } else if (cmmTipo === 'repetir') {
      this.cmmIniciar(this.cmmConfig);
    } else if (cmmTipo === 'repasar') {
      const cmmNombres = this.cmmResultados.filter((cmmR) => !cmmR.cmmAcierto && !cmmR.cmmSinRegistro).map((cmmR) => cmmR.cmmNombreEn);
      this.cmmSalir();
      this.cmmEventos.cmmRepasar(cmmNombres);
    }
  }

  cmmResumen() {
    this.cmmDetenerReloj();
    this.cmmRestaurarPiezas();
    this.cmmEscena.cmmResaltar([], false);
    this.cmmEscena.cmmVistaFija('tres');
    const cmmAciertos = this.cmmResultados.filter((cmmR) => cmmR.cmmAcierto).length;
    const cmmFallos = this.cmmResultados.filter((cmmR) => !cmmR.cmmAcierto);
    const cmmPromedio = this.cmmResultados.reduce((cmmS, cmmR) => cmmS + cmmR.cmmMs, 0) / this.cmmResultados.length / 1000;
    const cmmCompleto = !this.cmmSinVidas;
    const cmmEstrellas = cmmCompleto ? this.cmmJuego.cmmVidas : 0;
    if (typeof this.cmmConfig.cmmAlFinalizar === 'function') this.cmmConfig.cmmAlFinalizar(cmmEstrellas);
    const cmmPremio = this.cmmJuego.cmmGanar(this.cmmJuego.cmmPremioFinal(cmmFallos.length, cmmCompleto));
    const cmmLista = cmmFallos.length ? '<h3>Para repasar</h3><ul class="cmm-fallos">' + cmmFallos.map((cmmR) => `<li>${cmmR.cmmNombre}</li>`).join('') + '</ul>' : '<p>No fallaste ninguna. Excelente.</p>';
    this.cmmPanel.innerHTML = `<div class="cmm-resumen-final"><h2>${cmmCompleto ? (this.cmmConfig.cmmTitulo || 'Examen terminado') : 'Te quedaste sin vidas'}</h2>${this.cmmConfig.cmmAlFinalizar ? '<div class="cmm-estrellas">' + '&#9733;'.repeat(cmmEstrellas) + '<span>' + '&#9733;'.repeat(3 - cmmEstrellas) + '</span></div>' : ''}<div class="cmm-puntaje">${this.cmmPuntos}</div><p>puntos</p><div class="cmm-bolsa"><span>Monedas de esta partida <strong>+${this.cmmJuego.cmmGanadasPartida}</strong>${cmmPremio ? ' (incluye bono final +' + cmmPremio + ')' : ''}</span><span>Gastadas en pistas <strong>${this.cmmJuego.cmmGastadasPartida}</strong></span><span>Total <strong>${this.cmmJuego.cmmMonedas}</strong></span></div><p>${cmmAciertos} de ${this.cmmResultados.length} correctas · tiempo medio ${cmmPromedio.toFixed(1)} s · mejor racha ${this.cmmMejorRacha}</p></div>${cmmLista}<div class="cmm-acciones">${cmmFallos.some((cmmR) => !cmmR.cmmSinRegistro) ? '<button data-cmm-ex="repasar">Repasar las falladas con tarjetas</button>' : ''}<button data-cmm-ex="repetir">Repetir examen</button><button data-cmm-ex="salir">Cerrar</button></div>`;
    this.cmmEventos.cmmAlProgreso();
  }

  cmmSalir() {
    this.cmmDetenerReloj();
    this.cmmRestaurarPiezas();
    this.cmmActivo = false;
    this.cmmEscena.cmmResaltar([], false);
    this.cmmEventos.cmmAlTerminar();
  }
}
