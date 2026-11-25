import { CMM_ORGANOS, CMM_SISTEMAS } from './cmm-datos.js';
import { cmmGruposDe, cmmMezclar } from './cmm-examen.js';
import { cmmUbicacion } from './cmm-regiones.js';

const CMM_SISTEMAS_TARJETAS = CMM_SISTEMAS.map(cmmSistema => cmmSistema.cmmId);
const CMM_MAZOS_GENERALES = new Set(['todo', 'confusas', 'forzado', 'hoy']);

export class CMMTarjetas {
  constructor(cmmEscena, cmmProgreso, cmmPanel, cmmEventos) {
    this.cmmEscena = cmmEscena;
    this.cmmProgreso = cmmProgreso;
    this.cmmPanel = cmmPanel;
    this.cmmEventos = cmmEventos;
    this.cmmActivo = false;
    this.cmmMazo = [];
    this.cmmIndice = 0;
    this.cmmRevelada = false;
    this.cmmPanel.addEventListener('click', (cmmEv) => this.cmmClicPanel(cmmEv));
  }

  cmmArmar(cmmClave, cmmNombresForzados) {
    let cmmGrupos = cmmGruposDe(this.cmmEscena.cmmPiezas, this.cmmSistemasVisibles(cmmClave));
    if (cmmClave === 'hoy') return this.cmmArmarHoy(cmmGrupos);
    if (cmmClave === 'forzado') {
      cmmGrupos = cmmGrupos.filter((cmmG) => cmmNombresForzados.includes(cmmG.cmmNombreEn));
    } else if (cmmClave === 'confusas') {
      cmmGrupos = cmmGrupos.filter((cmmG) => this.cmmProgreso.cmmErrores(cmmG.cmmNombreEn) > 0 || this.cmmProgreso.cmmEstado(cmmG.cmmNombreEn) === 'practica');
      cmmGrupos.sort((cmmA, cmmB) => this.cmmProgreso.cmmErrores(cmmB.cmmNombreEn) - this.cmmProgreso.cmmErrores(cmmA.cmmNombreEn));
    } else {
      const cmmPeso = { pendiente: 0, practica: 1, dominada: 2 };
      cmmGrupos = cmmMezclar(cmmGrupos).sort((cmmA, cmmB) => cmmPeso[this.cmmProgreso.cmmEstado(cmmA.cmmNombreEn)] - cmmPeso[this.cmmProgreso.cmmEstado(cmmB.cmmNombreEn)]);
    }
    return cmmGrupos.slice(0, 60);
  }

  cmmArmarHoy(cmmGrupos) {
    const cmmPorNombre = new Map(cmmGrupos.map((cmmG) => [cmmG.cmmNombreEn, cmmG]));
    const cmmVencidas = this.cmmProgreso.cmmVencidas(new Set(cmmPorNombre.keys())).map((cmmClave) => cmmPorNombre.get(cmmClave));
    const cmmNuevas = cmmMezclar(cmmGrupos.filter((cmmG) => !this.cmmProgreso.cmmDatos[cmmG.cmmNombreEn])).slice(0, this.cmmProgreso.cmmCantidadNuevas());
    return cmmVencidas.concat(cmmNuevas);
  }

  cmmSistemasVisibles(cmmClave) {
    if (cmmClave === 'organos') return CMM_ORGANOS;
    if (CMM_MAZOS_GENERALES.has(cmmClave)) return CMM_SISTEMAS_TARJETAS;
    return [cmmClave];
  }

  cmmIniciar(cmmClave, cmmNombresForzados) {
    this.cmmMazo = this.cmmArmar(cmmClave, cmmNombresForzados);
    this.cmmIndice = 0;
    this.cmmActivo = true;
    this.cmmEscena.cmmEstado.cmmRegion = null;
    this.cmmEscena.cmmEstado.cmmAislar = false;
    this.cmmEscena.cmmEstado.cmmContexto = false;
    this.cmmEscena.cmmEstado.cmmSistemas = new Set(this.cmmMazo.map(cmmGrupo => cmmGrupo.cmmSistema));
    this.cmmEscena.cmmSeleccionar([]);
    this.cmmEventos.cmmAlEmpezar();
    this.cmmMostrar();
  }

  cmmMostrar() {
    if (!this.cmmMazo.length) {
      this.cmmPanel.innerHTML = '<div class="cmm-vacio"><h2>Mazo vacío</h2><p>No hay estructuras para este mazo todavía. Haz un examen primero para que aparezcan las que más confundes.</p></div><div class="cmm-acciones"><button data-cmm-ta="salir">Cerrar</button></div>';
      return;
    }
    if (this.cmmIndice >= this.cmmMazo.length) {
      this.cmmPanel.innerHTML = '<div class="cmm-resumen-final"><h2>Mazo completado</h2><p>Revisaste todas las tarjetas de este mazo.</p></div><div class="cmm-acciones"><button data-cmm-ta="reiniciar">Repasar de nuevo</button><button data-cmm-ta="salir">Cerrar</button></div>';
      this.cmmEscena.cmmResaltar([], false);
      this.cmmEventos.cmmAlProgreso();
      return;
    }
    const cmmG = this.cmmMazo[this.cmmIndice];
    this.cmmRevelada = false;
    const cmmIds = cmmG.cmmPiezas.map((cmmP) => cmmP.cmmId);
    this.cmmEscena.cmmResaltar(cmmIds, true);
    this.cmmEscena.cmmEnfocar(cmmIds, 700);
    this.cmmPintar();
  }

  cmmPintar() {
    const cmmG = this.cmmMazo[this.cmmIndice];
    const cmmSis = CMM_SISTEMAS.find((cmmS) => cmmS.cmmId === cmmG.cmmSistema);
    let cmmCaja;
    if (this.cmmRevelada) {
      cmmCaja = `<span class="cmm-chip" style="background:${cmmSis.cmmColor}">${cmmSis.cmmNombre}</span><h2>${cmmG.cmmNombre}</h2><p class="cmm-ingles" style="color:#5d6b75;font-style:italic">${cmmG.cmmNombreEn}</p><p><strong>Ubicación:</strong> ${cmmUbicacion(cmmG.cmmPiezas[0])}</p><p><strong>Función del sistema:</strong> ${cmmSis.cmmFuncion}</p>`;
    } else {
      cmmCaja = '<h2>¿Qué estructura es la resaltada?</h2><p class="cmm-vacio">Piensa el nombre, su ubicación y a qué sistema pertenece. Luego revela la respuesta.</p>';
    }
    const cmmBotones = this.cmmRevelada
      ? '<div class="cmm-fila-doble"><button class="cmm-no" data-cmm-ta="repasar">Repasar</button><button class="cmm-si" data-cmm-ta="sabia">La sabía</button></div>'
      : '<div class="cmm-acciones"><button data-cmm-ta="revelar">Mostrar respuesta</button></div>';
    this.cmmPanel.innerHTML = `<div class="cmm-cabecera-examen"><span>Tarjeta <strong>${this.cmmIndice + 1}/${this.cmmMazo.length}</strong></span><span>Estado <strong>${this.cmmProgreso.cmmEstado(cmmG.cmmNombreEn)}</strong></span></div><div class="cmm-tarjeta-caja">${cmmCaja}${this.cmmRevelada ? '<p class="cmm-repaso-aviso">' + this.cmmProgreso.cmmAvisoProximo(cmmG.cmmNombreEn, true) + '</p>' : ''}</div>${cmmBotones}<div class="cmm-acciones"><button data-cmm-ta="salir">Salir de las tarjetas</button></div>`;
  }

  cmmClicPanel(cmmEv) {
    if (!this.cmmActivo) return;
    const cmmB = cmmEv.target.closest('[data-cmm-ta]');
    if (!cmmB) return;
    const cmmAccion = cmmB.dataset.cmmTa;
    const cmmG = this.cmmMazo[this.cmmIndice];
    if (cmmAccion === 'revelar') {
      this.cmmRevelada = true;
      this.cmmPintar();
    } else if (cmmAccion === 'sabia' || cmmAccion === 'repasar') {
      this.cmmProgreso.cmmRegistrar(cmmG.cmmNombreEn, cmmAccion === 'sabia');
      this.cmmIndice += 1;
      this.cmmMostrar();
    } else if (cmmAccion === 'reiniciar') {
      this.cmmIndice = 0;
      this.cmmMostrar();
    } else if (cmmAccion === 'salir') {
      this.cmmActivo = false;
      this.cmmEscena.cmmResaltar([], false);
      this.cmmEventos.cmmAlTerminar();
    }
  }
}
