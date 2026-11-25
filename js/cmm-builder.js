import * as cmmTres from 'three';
import { CMMTableroBuilder } from './cmm-builder-tablero.js';
import { CMM_COSTE_PISTA } from './cmm-juego.js';
import { CMM_SISTEMAS } from './cmm-datos.js';
import { CMMVistasCatalogo } from './cmm-builder-vistas.js';
import { cmmDesafioDiario, cmmEstadoCampana, cmmEstadosRegiones, cmmLogrosBuilder, cmmRachaDiaria } from './cmm-builder-campana.js';
import { CMM_REGIONES } from './cmm-regiones.js';
import { CMM_DOCENTE_MAXIMO, cmmExportarDocente, cmmFichaDocente, cmmImportarDocente, cmmMisionDocente } from './cmm-builder-docente.js';
import { CMM_EXAMEN_PRACTICO, cmmCrearExamenPractico } from './cmm-builder-examen.js';
import { cmmGuardarHistorialBuilder, cmmLeerHistorialBuilder } from './cmm-builder-persistencia.js';
import {
  CMM_DIFICULTADES, cmmCatalogoBuilder, cmmLeerBuilder, cmmCargarBloquesBuilder, cmmMallaBuilder,
  cmmCrearPiezaBuilder, cmmEvaluarEncaje, cmmPoseBuilder, cmmDistribuirBuilder
} from './cmm-builder-piezas.js';

const CMM_BUILDER_AHORA = () => performance.now();
const CMM_BUILDER_PIEZAS_POR_PAGINA = 8;

export class CMMRelojBuilder {
  constructor(cmmAhora = CMM_BUILDER_AHORA) {
    this.cmmAhora = cmmAhora;
    this.cmmAcumulado = 0;
    this.cmmInicio = null;
  }

  cmmReanudar() {
    this.cmmInicio ??= this.cmmAhora();
  }

  cmmPausar() {
    this.cmmAcumulado = this.cmmTiempo();
    this.cmmInicio = null;
  }

  cmmTiempo() {
    return this.cmmAcumulado + (this.cmmInicio === null ? 0 : this.cmmAhora() - this.cmmInicio);
  }
}

const CMM_MODOS = {
  clasico: 'Reconstrucción clásica',
  libre: 'Laboratorio libre',
  detective: 'Detective anatómico',
  memoria: 'Memoria espacial',
  diseccion: 'Disección inversa',
  capas: 'Reconstrucción por capas',
  'cmm-parcial': 'Reconstrucción parcial',
  'cmm-intrusa': 'Pieza intrusa',
  'cmm-espejo': 'Anatomía espejo',
  'cmm-contrarreloj': 'Contrarreloj',
  'cmm-conexiones': 'Conexiones óseas',
  [CMM_EXAMEN_PRACTICO]: 'Examen práctico'
};

const CMM_OBJETIVOS_ESPECIALES = {
  'cmm-parcial': 'Completa las piezas ausentes alrededor de la referencia inmóvil.',
  'cmm-intrusa': 'Reconstruye la región. Deja en la bandeja la pieza que pertenece a otra región.',
  'cmm-espejo': 'Reconoce qué pieza corresponde al lado izquierdo y cuál al derecho.',
  'cmm-conexiones': 'Coloca cada disco junto a la vértebra indicada por su nombre en el atlas.'
};

export function cmmCapaPendiente(cmmReto, cmmCorrectas) {
  return cmmReto?.cmmCapas?.find((cmmCapa) => cmmCapa.cmmIds.some((cmmId) => !cmmCorrectas.has(cmmId)));
}

const CMM_GUIA = [
  ['seleccionar', 'Selecciona la pieza resaltada en el tablero o en la bandeja.'],
  ['arrastre', 'Arrastra la pieza por el tablero y suéltala.'],
  ['objetivo', 'Pulsa el círculo sobre la silueta azul para identificar el destino.'],
  ['encaje', 'Lleva la pieza a su silueta. Cuando el borde se ponga verde, suéltala para encajar.']
];

export function cmmAvanceTutorial(cmmPaso, cmmAccion) {
  return CMM_GUIA[cmmPaso]?.[0] === cmmAccion ? cmmPaso + 1 : cmmPaso;
}

function cmmTiempoTexto(cmmMs) {
  const cmmSeg = Math.floor(cmmMs / 1000);
  return [Math.floor(cmmSeg / 60), cmmSeg % 60].map((cmmN) => String(cmmN).padStart(2, '0')).join(':');
}

export class CMMAnatomyBuilder {
  constructor(cmmDialogo, cmmAbrir, cmmPiezas, cmmEventos, cmmJuego) {
    this.cmmJuego = cmmJuego;
    this.cmmDialogo = cmmDialogo;
    this.cmmDatosAtlas = cmmPiezas;
    this.cmmEventos = cmmEventos;
    this.cmmHistorial = cmmLeerHistorialBuilder(globalThis.localStorage);
    this.cmmAtlas = null;
    this.cmmEscena = null;
    this.cmmSesion = null;
    this.cmmCarga = null;
    this.cmmCatalogo = [];
    this.cmmVistasCatalogo = new CMMVistasCatalogo();
    this.cmmUI = new Map(Array.from(cmmDialogo.querySelectorAll('[id^="cmm-builder-"]'), (cmmEl) => [cmmEl.id.slice(12), cmmEl]));
    this.cmmAcciones = new Map(Array.from(cmmDialogo.querySelectorAll('[data-cmm-builder]'), (cmmEl) => [cmmEl.dataset.cmmBuilder, cmmEl]));
    for (const cmmCampo of ['modo', 'dificultad', 'layout']) {
      const cmmSelect = this.cmmUI.get(cmmCampo);
      const cmmGuardado = this.cmmHistorial.cmmAjustes[cmmCampo];
      if (Array.from(cmmSelect.options).some((cmmOpcion) => cmmOpcion.value === cmmGuardado)) cmmSelect.value = cmmGuardado;
      cmmSelect.addEventListener('change', () => {
        this.cmmGuardar();
        this.cmmPintarCatalogo();
      });
    }
    for (const cmmCampo of ['region', 'sistema', 'cantidad']) {
      this.cmmUI.get(cmmCampo).addEventListener('change', () => this.cmmPintarCatalogo());
    }
    cmmAbrir.disabled = false;
    cmmAbrir.addEventListener('click', async () => {
      cmmDialogo.showModal();
      cmmEventos.cmmAlAbrir();
      this.cmmMostrarCatalogo();
      if (!this.cmmAtlas) await this.cmmCargarCatalogo();
    });
    cmmDialogo.addEventListener('cancel', (cmmEv) => {
      cmmEv.preventDefault();
      this.cmmEscape();
    });
    cmmDialogo.addEventListener('close', () => {
      this.cmmLimpiar();
      cmmEventos.cmmAlCerrar();
    });
    cmmDialogo.addEventListener('click', (cmmEv) => this.cmmClic(cmmEv));
    cmmDialogo.addEventListener('keydown', (cmmEv) => this.cmmTecla(cmmEv));
    this.cmmUI.get('eje').addEventListener('change', () => this.cmmActualizarHerramienta());
    for (const cmmCampo of ['reducir', 'sensibilidad', 'texto']) {
      const cmmControl = this.cmmUI.get(cmmCampo);
      if (!cmmControl) continue;
      const cmmValor = this.cmmHistorial.cmmAjustes[cmmCampo];
      if (cmmCampo === 'reducir') cmmControl.checked = cmmValor === true;
      else if ([...cmmControl.options].some((cmmO) => cmmO.value === cmmValor)) cmmControl.value = cmmValor;
      cmmControl.addEventListener('change', () => { this.cmmAjustarInterfaz(); this.cmmGuardar(); });
    }
    this.cmmAjustarInterfaz();
    this.cmmUI.get('docente')?.addEventListener('toggle', () => this.cmmPrepararDocente());
    this.cmmUI.get('docente-lista')?.addEventListener('change', () => this.cmmCargarFichaDocente(this.cmmUI.get('docente-lista').value));
    this.cmmUI.get('docente-archivo')?.addEventListener('change', (cmmEvento) => void this.cmmLeerArchivoDocente(cmmEvento.target));
    const cmmControl = this.cmmUI.get('profundidad');
    if (cmmControl) {
      cmmControl.addEventListener('input', () => this.cmmDeslizarProfundidad(Number(cmmControl.value)));
      cmmControl.addEventListener('change', () => {
        if (this.cmmSesion?.cmmOrigen === 'profundidad') this.cmmSoltar(false);
        cmmControl.value = '0';
      });
      cmmControl.addEventListener('pointercancel', () => this.cmmCancelarAjuste());
      cmmControl.addEventListener('blur', () => this.cmmCancelarAjuste());
    }
  }

  cmmTexto(cmmCampo, cmmTexto) {
    this.cmmUI.get(cmmCampo).textContent = cmmTexto;
  }

  cmmOcultar(cmmEl, cmmValor) {
    cmmEl.classList.toggle('cmm-oculto', cmmValor);
  }

  cmmGuardar() {
    this.cmmHistorial.cmmAjustes = Object.fromEntries(['modo', 'dificultad', 'layout', 'sensibilidad', 'texto', 'reducir']
      .filter((cmmCampo) => this.cmmUI.has(cmmCampo)).map((cmmCampo) => [cmmCampo, cmmCampo === 'reducir' ? this.cmmUI.get(cmmCampo).checked : this.cmmUI.get(cmmCampo).value]));
    try {
      if (this.cmmHistorial.cmmSoloLectura) throw new Error('El contenido original requiere recuperación.');
      cmmGuardarHistorialBuilder(globalThis.localStorage, this.cmmHistorial);
      return true;
    } catch {
      this.cmmTexto(this.cmmSesion ? 'aviso' : 'carga', 'El almacenamiento local no está disponible.');
      return false;
    }
  }

  cmmAjustarInterfaz() {
    const cmmReducir = this.cmmUI.get('reducir')?.checked === true;
    this.cmmDialogo?.classList?.toggle('cmm-builder-movimiento-reducido', cmmReducir);
    this.cmmDialogo?.style?.setProperty('--cmm-builder-escala-texto', this.cmmUI.get('texto')?.value ?? '1');
    if (this.cmmEscena?.cmmOrbita) {
      this.cmmEscena.cmmReducir = cmmReducir;
      this.cmmEscena.cmmOrbita.rotateSpeed = Number(this.cmmUI.get('sensibilidad')?.value ?? '1');
    }
  }

  async cmmCargarCatalogo() {
    const cmmCarga = new AbortController();
    this.cmmCarga = cmmCarga;
    this.cmmTexto('carga', 'Preparando desafíos…');
    try {
      const [cmmAtlas, cmmInventario] = await Promise.all(['datos/atlas.json', 'datos/cmm-builder-inventario.json'].map(
        async (cmmRuta) => (await cmmLeerBuilder(cmmRuta, cmmCarga.signal)).json()
      ));
      if (cmmCarga.signal.aborted) return;
      this.cmmCatalogo = cmmCatalogoBuilder(cmmAtlas, this.cmmDatosAtlas, cmmInventario,
        (cmmId, cmmMotivos) => console.warn(`Anatomy Builder descartó ${cmmId}. ${cmmMotivos.join(' ')}`));
      this.cmmAtlas = cmmAtlas;
      this.cmmInventario = cmmInventario;
      this.cmmPrepararDocente();
      this.cmmTexto('carga', this.cmmCatalogo.length ? this.cmmHistorial.cmmAviso ?? '' : 'No hay desafíos con geometría disponible.');
      this.cmmPintarCatalogo();
    } catch {
      if (!cmmCarga.signal.aborted) this.cmmTexto('carga', 'No se pudo leer el catálogo anatómico. Vuelve al atlas y abre el laboratorio para reintentar.');
    } finally {
      if (this.cmmCarga === cmmCarga) this.cmmCarga = null;
    }
  }

  cmmRecord(cmmId, cmmNivel, cmmLayout, cmmModo = 'clasico', cmmDia = null) {
    return this.cmmHistorial.cmmPartidas.filter((cmmP) => cmmP.cmmId === cmmId && cmmP.cmmNivel === cmmNivel && cmmP.cmmLayout === cmmLayout && (cmmP.cmmModo ?? 'clasico') === cmmModo && (cmmP.cmmDia ?? null) === cmmDia && !cmmP.cmmPractica)
      .reduce((cmmMejor, cmmP) => Math.min(cmmMejor, cmmP.cmmTiempo), Infinity);
  }

  cmmOpcionesCatalogo(cmmCampo, cmmOpciones) {
    const cmmSelect = this.cmmUI.get(cmmCampo);
    const cmmAnterior = cmmSelect.value;
    while (cmmSelect.options.length > 1) cmmSelect.remove(1);
    for (const [cmmValor, cmmNombre] of cmmOpciones) cmmSelect.add(new Option(cmmNombre, cmmValor));
    if (cmmOpciones.has(cmmAnterior)) cmmSelect.value = cmmAnterior;
    return cmmSelect.value;
  }

  cmmCantidadMision(cmmReto, cmmModo, cmmNivel) {
    const cmmTotal = cmmReto.cmmRequeridas.length;
    if (cmmModo === 'detective') return Math.min(cmmTotal - 1, cmmNivel + 2);
    if (cmmModo === 'libre' || cmmReto.cmmCapas || cmmReto.cmmVista === undefined) return cmmTotal;
    return Math.min(cmmTotal, CMM_DIFICULTADES[cmmNivel].cmmMaximo);
  }

  cmmPintarCatalogo() {
    const cmmNivel = Number(this.cmmUI.get('dificultad').value);
    const cmmDificultad = CMM_DIFICULTADES[cmmNivel];
    const cmmModo = this.cmmUI.get('modo').value;
    const cmmLibre = cmmModo === 'libre';
    this.cmmUI.get('dificultad').disabled = cmmLibre;
    this.cmmUI.get('layout').disabled = ['detective', 'diseccion'].includes(cmmModo);
    const cmmLayout = this.cmmUI.get('layout').value;
    const cmmDisponibles = this.cmmCatalogo.filter((cmmR) => this.cmmModoAdmiteMision(cmmR, cmmModo, cmmNivel));
    const cmmRegiones = [...new Set(cmmDisponibles.map((cmmR) => cmmR.cmmRegion))].sort((cmmA, cmmB) => cmmA.localeCompare(cmmB, 'es'));
    const cmmSistemas = new Map(CMM_SISTEMAS.map((cmmS) => [cmmS.cmmId, cmmS.cmmNombre]));
    cmmSistemas.set('multisistema', 'Varios sistemas');
    const cmmRegion = this.cmmOpcionesCatalogo('region', new Map(cmmRegiones.map((cmmR) => [cmmR, cmmR])));
    const cmmSistema = this.cmmOpcionesCatalogo('sistema', new Map([...new Set(cmmDisponibles.map((cmmR) => cmmR.cmmSistema))]
      .map((cmmS) => [cmmS, cmmSistemas.get(cmmS) ?? cmmS]).sort((cmmA, cmmB) => cmmA[1].localeCompare(cmmB[1], 'es'))));
    const cmmCantidades = [...new Set(cmmDisponibles.map((cmmR) => this.cmmCantidadMision(cmmR, cmmModo, cmmNivel)))].sort((cmmA, cmmB) => cmmA - cmmB);
    const cmmFiltroCantidad = this.cmmOpcionesCatalogo('cantidad', new Map(cmmCantidades.map((cmmN) => [String(cmmN), String(cmmN)])));
    const cmmRetos = cmmDisponibles.filter((cmmR) => (!cmmRegion || cmmR.cmmRegion === cmmRegion) && (!cmmSistema || cmmR.cmmSistema === cmmSistema) &&
      (!cmmFiltroCantidad || this.cmmCantidadMision(cmmR, cmmModo, cmmNivel) === Number(cmmFiltroCantidad))).map((cmmReto) => {
      const cmmRegistros = this.cmmHistorial.cmmPartidas.filter((cmmP) => cmmP.cmmId === cmmReto.cmmId && (cmmP.cmmModo ?? 'clasico') === cmmModo && !cmmP.cmmDia && !cmmP.cmmPractica);
      const cmmRecord = this.cmmRecord(cmmReto.cmmId, cmmNivel, this.cmmUI.get('layout').disabled ? 'propio' : cmmLayout, cmmModo);
      const cmmCantidad = this.cmmCantidadMision(cmmReto, cmmModo, cmmNivel);
      const cmmVista = `<div class="cmm-builder-miniatura"><img alt="" data-cmm-builder-miniatura="${cmmReto.cmmId}"></div>`;
      return `<article class="cmm-builder-tarjeta cmm-panel">${cmmVista}<p class="cmm-sobretitulo">${cmmReto.cmmRegion}</p><h4>${cmmReto.cmmNombre}</h4><p>${cmmCantidad} ${cmmModo === 'detective' ? 'errores por encontrar' : 'piezas'} · ${cmmLibre ? CMM_MODOS.libre : cmmDificultad.cmmNombre}</p>${cmmReto.cmmVista === undefined ? `<p>${cmmReto.cmmDescripcion}</p>` : ''}<p>${cmmRegistros.length ? Math.max(...cmmRegistros.map((cmmP) => cmmP.cmmMedalla)) + ' de 3 estrellas' : 'Por completar'}${Number.isFinite(cmmRecord) ? ' · Récord ' + cmmTiempoTexto(cmmRecord) : ''}</p><button data-cmm-builder-reto="${cmmReto.cmmId}" class="cmm-builder-primario">Abrir en 3D</button></article>`;
    });
    const cmmRaiz = this.cmmUI.get('retos');
    cmmRaiz.innerHTML = cmmRetos.join('') || (this.cmmAtlas ? '<p>Ningún desafío coincide con estos filtros.</p>' : '');
    if (this.cmmAtlas) {
      this.cmmVistasCatalogo.cmmObservar(cmmRaiz, this.cmmAtlas, cmmDisponibles);
      this.cmmPintarRutas();
      const cmmClasicas = this.cmmCatalogo.filter((cmmR) => cmmR.cmmModo === 'clasico');
      this.cmmOpcionesCatalogo('examen-region', new Map(cmmClasicas.map((cmmR) => [cmmR.cmmRegion, cmmR.cmmRegion])));
      this.cmmOpcionesCatalogo('examen-sistema', new Map(cmmClasicas.map((cmmR) => [cmmR.cmmSistema, cmmSistemas.get(cmmR.cmmSistema) ?? cmmR.cmmSistema])));
      const cmmExamenes = this.cmmHistorial.cmmPartidas.filter((cmmP) => cmmP.cmmModo === CMM_EXAMEN_PRACTICO);
      this.cmmTexto('examen-historial', cmmExamenes.length ? `${cmmExamenes.length} exámenes registrados · Último resultado ${cmmExamenes[0].cmmPiezas.length}/${cmmExamenes[0].cmmTotal} · ${cmmTiempoTexto(cmmExamenes[0].cmmTiempo)}` : 'Sin exámenes registrados.');
    }
  }

  cmmPintarRutas() {
    const cmmPartidas = this.cmmHistorial.cmmPartidas.filter((cmmP) => cmmP.cmmModo !== CMM_EXAMEN_PRACTICO);
    const cmmCapitulos = cmmEstadoCampana(cmmPartidas, this.cmmCatalogo);
    const cmmCampana = cmmCapitulos.map((cmmCapitulo, cmmIndice) => `<section><h4>Capítulo ${cmmIndice + 1} · ${cmmCapitulo.cmmNombre}</h4>${cmmCapitulo.cmmPendiente ? `<p>Próximamente. ${cmmCapitulo.cmmPendiente}</p>` : `<ul>${cmmCapitulo.cmmEtapas.map((cmmEtapa) => {
      const cmmEstado = cmmEtapa.cmmBloqueada ? `Bloqueada · ${cmmEtapa.cmmMotivo}` : cmmEtapa.cmmCompletada ? 'Completada' : 'Disponible';
      const cmmNombre = cmmEtapa.cmmReto?.cmmNombre ?? cmmEtapa.cmmId;
      return `<li><strong>${cmmNombre}</strong> · ${cmmEstado} ${cmmEtapa.cmmBloqueada ? '' : ` · Premios del juego por encajes y final <button data-cmm-builder-campana="${cmmEtapa.cmmId}">Jugar</button>`}</li>`;
    }).join('')}</ul>`}</section>`).join('');
    const cmmDiario = cmmDesafioDiario(this.cmmCatalogo);
    const cmmRecord = cmmDiario ? this.cmmRecord(cmmDiario.cmmReto.cmmId, 0, 'radial', 'clasico', cmmDiario.cmmFecha) : Infinity;
    const cmmLogros = cmmLogrosBuilder(cmmPartidas);
    const cmmLogrosTexto = cmmLogros.length ? cmmLogros.join(' · ') : 'Completa tu primera reconstrucción.';
    this.cmmUI.get('rutas').innerHTML = `${cmmCampana}${cmmDiario ? `<section><h4>Desafío diario · ${cmmDiario.cmmFecha}</h4><p>${cmmDiario.cmmReto.cmmNombre} · ${cmmDiario.cmmReto.cmmRegion} · Racha de ${cmmRachaDiaria(cmmPartidas)} días${Number.isFinite(cmmRecord) ? ` · Récord ${cmmTiempoTexto(cmmRecord)}` : ''}</p><button data-cmm-builder="cmm-diario">Jugar el desafío de hoy</button></section>` : ''}<section><h4>Logros</h4><p>${cmmLogrosTexto}</p></section>${this.cmmPasaporte(cmmCapitulos, cmmPartidas)}`;
  }

  cmmPrepararExamen() {
    if (!this.cmmAtlas) return;
    try {
      const cmmSemilla = crypto.getRandomValues(new Uint32Array(1))[0];
      const cmmNivel = Number(this.cmmUI.get('examen-nivel').value);
      const cmmReto = cmmCrearExamenPractico(this.cmmCatalogo, {
        cmmRegion: this.cmmUI.get('examen-region').value, cmmSistema: this.cmmUI.get('examen-sistema').value,
        cmmCantidad: this.cmmUI.get('examen-cantidad').valueAsNumber, cmmTiempo: this.cmmUI.get('examen-tiempo').valueAsNumber,
        cmmAyudas: this.cmmUI.get('examen-ayuda').checked, cmmDificultad: cmmNivel
      }, cmmSemilla);
      const [cmmMision] = cmmCatalogoBuilder(this.cmmAtlas, this.cmmDatosAtlas, this.cmmInventario, undefined, [cmmReto]);
      if (!cmmMision) throw new Error('Faltan modelos válidos para este examen.');
      this.cmmTexto('examen-aviso', '');
      this.cmmIniciar(cmmMision, null, false, { cmmModo: CMM_EXAMEN_PRACTICO, cmmNivel, cmmSemilla });
    } catch (cmmError) {
      this.cmmTexto('examen-aviso', cmmError.message);
    }
  }

  cmmPasaporte(cmmCapitulos, cmmHistorial) {
    const cmmRegiones = cmmEstadosRegiones(cmmCapitulos);
    const cmmNombres = new Map(CMM_REGIONES.map((cmmRegion) => [cmmRegion.cmmId, cmmRegion.cmmNombre]));
    const cmmInfo = this.cmmEventos.cmmResumenPractica?.();
    const cmmRepaso = this.cmmEventos.cmmProximoRepaso?.();
    const cmmPartidas = cmmHistorial.filter((cmmP) => !cmmP.cmmPractica);
    const cmmMisiones = new Set(cmmPartidas.map((cmmP) => cmmP.cmmId));
    const cmmTiempo = cmmPartidas.reduce((cmmTotal, cmmP) => cmmTotal + (cmmP.cmmTiempo ?? 0), 0);
    const cmmPrecision = cmmInfo?.cmmIntentos ? `Distancia media ${cmmInfo.cmmMm.toFixed(1)} mm` : 'Sin intentos medidos.';
    const cmmEstados = cmmInfo ? ['dominada', 'familiar', 'en aprendizaje', 'necesita repaso', 'no estudiada']
      .map((cmmEstado) => `${cmmInfo.cmmEstados.get(cmmEstado) ?? 0} · ${cmmEstado}`).join(' / ') : '';
    const cmmUltima = cmmPartidas[0];
    const cmmRetoActual = cmmUltima && this.cmmCatalogo.find((cmmReto) => cmmReto.cmmId === cmmUltima.cmmId);
    const cmmMejor = cmmUltima && this.cmmRecord(cmmUltima.cmmId, cmmUltima.cmmNivel, cmmUltima.cmmLayout, cmmUltima.cmmModo, cmmUltima.cmmDia ?? null);
    return `<section><h4>Pasaporte anatómico</h4><p>Indicadores de práctica de este juego. La competencia clínica queda fuera de esta evaluación.</p><p>${cmmMisiones.size} misiones completadas · ${cmmRegiones.filter((cmmR) => cmmR.cmmHechas > 0).length} regiones de campaña · ${cmmTiempoTexto(cmmTiempo)} de partidas terminadas</p>${cmmRetoActual ? `<p>Última partida · ${cmmRetoActual.cmmNombre} · ${cmmUltima.cmmPrecision} % de precisión · Récord ${cmmTiempoTexto(cmmMejor)}</p>` : ''}<p>${cmmPrecision}</p><p>${cmmEstados}</p><p>Repasos vencidos ${cmmRepaso?.cmmHoy ?? 0}${cmmRepaso?.cmmProxima ? ` · Próximo ${new Date(cmmRepaso.cmmProxima).toLocaleDateString('es')}` : ''}</p><ul>${cmmRegiones.map((cmmR) => `<li><button data-cmm-builder-region="${cmmR.cmmId}">${cmmNombres.get(cmmR.cmmId)}</button> · ${cmmR.cmmEstado} (${cmmR.cmmHechas}/${cmmR.cmmTotales})</li>`).join('')}</ul></section>`;
  }

  cmmPrepararDocente() {
    if (!this.cmmAtlas || !this.cmmUI.get('docente')?.open) return;
    const cmmNombres = new Map(this.cmmDatosAtlas.map((cmmP) => [cmmP.cmmId, cmmP.cmmNombre]));
    const cmmLista = this.cmmUI.get('docente-inventario');
    if (!cmmLista.childElementCount) cmmLista.append(...this.cmmInventario.cmmMallas.filter((cmmP) => !cmmP.cmmIncidencias.length).map((cmmP) => {
      const cmmOpcion = document.createElement('option');
      cmmOpcion.value = cmmP.cmmId;
      cmmOpcion.label = cmmNombres.get(cmmP.cmmId) ?? cmmP.cmmNombre;
      return cmmOpcion;
    }));
    this.cmmOpcionesCatalogo('docente-lista', new Map(this.cmmHistorial.cmmDocentes.map((cmmReto) => [cmmReto.cmmId, cmmReto.cmmNombre])));
  }

  cmmIdsFormulario(cmmCampo) {
    return this.cmmUI.get(cmmCampo).value.split(/[\s,]+/).filter(Boolean);
  }

  cmmCargarFichaDocente(cmmId) {
    const cmmReto = this.cmmHistorial.cmmDocentes.find((cmmMision) => cmmMision.cmmId === cmmId);
    const cmmFicha = cmmReto ? cmmFichaDocente(cmmReto) : {};
    this.cmmUI.get('docente-nombre').value = cmmFicha.cmmNombre ?? '';
    this.cmmUI.get('docente-instrucciones').value = cmmFicha.cmmDescripcion ?? '';
    this.cmmUI.get('docente-nivel').value = cmmFicha.cmmDificultad ?? 0;
    this.cmmUI.get('docente-pistas').value = cmmFicha.cmmPistas ?? 0;
    this.cmmUI.get('docente-requeridas').value = cmmFicha.cmmRequeridas?.join(', ') ?? '';
    this.cmmUI.get('docente-fijas').value = cmmFicha.cmmReferencia?.join(', ') ?? '';
  }

  cmmGuardarDocente(cmmReto, cmmId) {
    const cmmAnterior = this.cmmHistorial.cmmDocentes;
    this.cmmHistorial.cmmDocentes = cmmAnterior.filter((cmmR) => cmmR.cmmId !== cmmId);
    if (cmmReto) this.cmmHistorial.cmmDocentes.push(cmmReto);
    if (!this.cmmGuardar()) {
      this.cmmHistorial.cmmDocentes = cmmAnterior;
      throw new Error('No se pudo guardar la lista de misiones docentes.');
    }
    this.cmmPrepararDocente();
    this.cmmUI.get('docente-lista').value = cmmReto?.cmmId ?? '';
    this.cmmCargarFichaDocente(cmmReto?.cmmId);
  }

  async cmmLeerArchivoDocente(cmmControl) {
    const [cmmArchivo] = cmmControl.files;
    if (!cmmArchivo || !this.cmmAtlas) return;
    try {
      if (cmmArchivo.size > CMM_DOCENTE_MAXIMO) throw new Error('El archivo supera el límite de 16 KiB.');
      const cmmTexto = await cmmArchivo.text();
      const cmmReto = cmmImportarDocente(cmmTexto, 'cmm-docente-' + crypto.randomUUID(), this.cmmAtlas, this.cmmInventario);
      this.cmmGuardarDocente(cmmReto, cmmReto.cmmId);
      this.cmmTexto('docente-aviso', 'Misión importada.');
    } catch (cmmError) {
      this.cmmTexto('docente-aviso', cmmError.message);
    } finally {
      cmmControl.value = '';
    }
  }

  cmmAccionDocente(cmmAccion) {
    if (!this.cmmAtlas) return;
    const cmmId = this.cmmUI.get('docente-lista').value;
    const cmmGuardada = this.cmmHistorial.cmmDocentes.find((cmmR) => cmmR.cmmId === cmmId);
    try {
      if (['cmm-docente-requerida', 'cmm-docente-referencia'].includes(cmmAccion)) {
        const cmmBuscar = this.cmmUI.get('docente-buscar');
        const cmmConsulta = cmmBuscar.value.trim().toLocaleLowerCase('es');
        const cmmPieza = [...this.cmmUI.get('docente-inventario').options].find((cmmO) => cmmO.value.toLowerCase() === cmmConsulta || cmmO.label.toLocaleLowerCase('es') === cmmConsulta);
        if (!cmmPieza) throw new Error('Elige una estructura del inventario.');
        const cmmCampo = cmmAccion === 'cmm-docente-requerida' ? 'docente-requeridas' : 'docente-fijas';
        this.cmmUI.get(cmmCampo).value = [...new Set([...this.cmmIdsFormulario(cmmCampo), cmmPieza.value])].join(', ');
        cmmBuscar.value = '';
        this.cmmTexto('docente-aviso', cmmPieza.label + ' añadida.');
        return;
      }
      if (cmmAccion === 'cmm-docente-eliminar') {
        if (!cmmGuardada) throw new Error('Selecciona una misión guardada.');
        if (window.confirm('¿Eliminar la misión «' + cmmGuardada.cmmNombre + '»?')) {
          this.cmmGuardarDocente(null, cmmId);
          this.cmmTexto('docente-aviso', 'Misión eliminada.');
        }
        return;
      }
      const cmmFicha = ['cmm-docente-exportar', 'cmm-docente-jugar', 'cmm-docente-duplicar'].includes(cmmAccion) ? cmmGuardada && cmmFichaDocente(cmmGuardada) : {
        cmmNombre: this.cmmUI.get('docente-nombre').value, cmmDescripcion: this.cmmUI.get('docente-instrucciones').value,
        cmmDificultad: Number(this.cmmUI.get('docente-nivel').value), cmmPistas: this.cmmUI.get('docente-pistas').valueAsNumber,
        cmmRequeridas: this.cmmIdsFormulario('docente-requeridas'), cmmReferencia: this.cmmIdsFormulario('docente-fijas')
      };
      if (!cmmFicha) throw new Error('Selecciona una misión guardada.');
      const cmmNuevoId = cmmAccion === 'cmm-docente-duplicar' || !cmmId ? 'cmm-docente-' + crypto.randomUUID() : cmmId;
      const cmmReto = cmmMisionDocente(cmmFicha, cmmNuevoId, this.cmmAtlas, this.cmmInventario);
      if (cmmAccion === 'cmm-docente-exportar') {
        const cmmUrl = URL.createObjectURL(new Blob([cmmExportarDocente(cmmReto)], { type: 'application/json' }));
        const cmmEnlace = document.createElement('a');
        cmmEnlace.href = cmmUrl;
        cmmEnlace.download = 'cmm-mision-docente.json';
        cmmEnlace.click();
        setTimeout(() => URL.revokeObjectURL(cmmUrl), 2000);
        this.cmmTexto('docente-aviso', 'Archivo JSON preparado para descargar.');
      } else if (['cmm-docente-jugar', 'cmm-docente-vista'].includes(cmmAccion)) {
        const [cmmMision] = cmmCatalogoBuilder(this.cmmAtlas, this.cmmDatosAtlas, this.cmmInventario, undefined, [cmmReto]);
        this.cmmIniciar(cmmMision, null, false, { cmmNivel: cmmReto.cmmDificultad, cmmDocente: true, cmmVistaDocente: cmmAccion === 'cmm-docente-vista' });
      } else {
        this.cmmGuardarDocente(cmmReto, cmmNuevoId);
        this.cmmTexto('docente-aviso', cmmAccion === 'cmm-docente-duplicar' ? 'Misión duplicada.' : 'Misión guardada.');
      }
    } catch (cmmError) {
      this.cmmTexto('docente-aviso', cmmError.message);
    }
  }

  cmmLimpiar() {
    this.cmmVistasCatalogo?.cmmCerrar();
    this.cmmCarga?.abort();
    this.cmmCarga = null;
    const cmmS = this.cmmSesion;
    if (cmmS) {
      if (cmmS.cmmModo === CMM_EXAMEN_PRACTICO) cmmS.cmmReloj.cmmPausar();
      this.cmmInformarPractica();
      clearInterval(cmmS.cmmLatido);
      clearTimeout(cmmS.cmmPistaId);
      clearTimeout(cmmS.cmmSolucionId);
      if (cmmS.cmmAnimacion != null) cancelAnimationFrame(cmmS.cmmAnimacion);
    }
    this.cmmSesion = null;
    this.cmmEscena?.cmmCerrar();
    this.cmmEscena = null;
  }

  cmmMostrarCatalogo() {
    const cmmSesion = this.cmmSesion;
    const cmmId = cmmSesion?.cmmReto.cmmId;
    this.cmmLimpiar();
    this.cmmOcultar(this.cmmUI.get('inicio'), false);
    this.cmmOcultar(this.cmmUI.get('partida'), true);
    this.cmmOcultar(this.cmmUI.get('hud'), true);
    this.cmmOcultar(this.cmmAcciones.get('catalogo'), true);
    this.cmmOcultar(this.cmmAcciones.get('pausa'), true);
    this.cmmUI.get('paso').replaceChildren();
    if (this.cmmAtlas) this.cmmTexto('carga', this.cmmHistorial.cmmAviso ?? '');
    this.cmmPintarCatalogo();
    const cmmTarjeta = cmmId && !cmmSesion.cmmContexto && !cmmSesion.cmmTutorial &&
      Array.from(this.cmmUI.get('retos').querySelectorAll('[data-cmm-builder-reto]'))
        .find((cmmBoton) => cmmBoton.dataset.cmmBuilderReto === cmmId);
    (cmmTarjeta || this.cmmUI.get('modo')).focus();
  }

  cmmCrearTablero(cmmEventos) {
    return new CMMTableroBuilder(this.cmmUI.get('lienzo'), cmmEventos);
  }

  cmmModoAdmiteMision(cmmReto, cmmModo, cmmNivel) {
    if (cmmReto.cmmVista === undefined) return cmmModo === cmmReto.cmmModo && cmmNivel >= cmmReto.cmmDificultad;
    if (cmmReto.cmmCapas) return cmmModo === 'capas';
    return ['clasico', 'libre', 'detective', 'memoria', 'diseccion'].includes(cmmModo);
  }

  async cmmIniciar(cmmReto, cmmPractica = null, cmmTutorial = false, cmmContexto = null) {
    if (!cmmReto || this.cmmCarga) return;
    const cmmModo = cmmContexto?.cmmModo ?? (cmmTutorial || cmmContexto ? 'clasico' : this.cmmUI.get('modo').value);
    const cmmLibre = cmmModo === 'libre';
    const cmmNivel = cmmContexto?.cmmNivel ?? (cmmTutorial || cmmContexto ? 0 : Number(this.cmmUI.get('dificultad').value));
    if (!this.cmmModoAdmiteMision(cmmReto, cmmModo, cmmNivel)) return;
    if (cmmPractica && !cmmReto.cmmCapas) {
      cmmPractica = cmmPractica.filter((cmmId) => cmmReto.cmmRequeridas.includes(cmmId));
      if (!cmmPractica.length) return;
    }
    this.cmmLimpiar();
    const cmmAjusteFino = this.cmmUI.get('ajuste-fino');
    if (cmmAjusteFino) cmmAjusteFino.open = false;
    const cmmCarga = new AbortController();
    this.cmmCarga = cmmCarga;
    const cmmDificultad = CMM_DIFICULTADES[cmmLibre ? 0 : cmmNivel];
    const cmmSemilla = cmmContexto?.cmmSemilla ?? crypto.getRandomValues(new Uint32Array(1))[0];
    const cmmLayout = ['detective', 'diseccion'].includes(cmmModo) ? 'propio' : cmmContexto?.cmmFecha ? 'radial' : this.cmmUI.get('layout').value;
    const cmmIds = [...cmmReto.cmmRequeridas];
    if (cmmModo === 'detective' && !cmmPractica) {
      const cmmInicio = cmmSemilla % cmmIds.length;
      cmmIds.push(...cmmIds.splice(0, cmmInicio));
    }
    const cmmCantidad = this.cmmCantidadMision(cmmReto, cmmModo, cmmNivel);
    const cmmIdPractica = cmmReto.cmmCapas ? null : cmmPractica;
    const cmmActivas = new Set(cmmTutorial ? [cmmIds[0]] : cmmIdPractica ?? cmmIds.slice(0, cmmCantidad));
    this.cmmTexto('carga', 'Cargando geometría de ' + cmmReto.cmmNombre + '…');
    try {
      const cmmBloques = await cmmCargarBloquesBuilder(this.cmmAtlas, cmmReto.cmmPiezas, cmmCarga.signal);
      if (cmmCarga.signal.aborted) return;
      this.cmmOcultar(this.cmmUI.get('inicio'), true);
      this.cmmOcultar(this.cmmUI.get('partida'), false);
      this.cmmOcultar(this.cmmUI.get('hud'), false);
      this.cmmOcultar(this.cmmAcciones.get('catalogo'), false);
      this.cmmEscena = this.cmmCrearTablero({
        cmmElegir: (cmmPieza) => this.cmmElegir(cmmPieza),
        cmmTomar: (cmmOrigen) => this.cmmTomar(cmmOrigen),
        cmmObjetivo: (cmmRayo) => this.cmmIdentificarObjetivo(cmmRayo),
        cmmAlDibujar: () => this.cmmPintarReticula(),
        cmmMover: () => this.cmmIndicador(),
        cmmSoltar: (cmmCancelar) => this.cmmSoltar(cmmCancelar),
        cmmProfundidad: (cmmDir) => this.cmmProfundidad(cmmDir),
        cmmContextoPerdido: () => queueMicrotask(() => {
          if (this.cmmEscena !== cmmEscena) return;
          this.cmmMostrarCatalogo();
          this.cmmTexto('carga', 'Se perdió la vista 3D. Vuelve a abrir el desafío para recuperar el tablero.');
        })
      });
      const cmmEscena = this.cmmEscena;
      this.cmmAjustarInterfaz();
      const cmmCaja = new cmmTres.Box3();
      for (const cmmPieza of cmmReto.cmmPiezas) {
        if (cmmPieza.cmmEsIntrusa) continue;
        cmmCaja.expandByPoint(new cmmTres.Vector3().fromArray(cmmPieza.cmmDato.bounds[0]));
        cmmCaja.expandByPoint(new cmmTres.Vector3().fromArray(cmmPieza.cmmDato.bounds[1]));
      }
      const cmmRadio = cmmCaja.getBoundingSphere(new cmmTres.Sphere()).radius;
      for (const cmmMeta of cmmReto.cmmPiezas) {
        const cmmMaterial = new cmmTres.MeshStandardMaterial({ color: cmmMeta.cmmSistema?.cmmColor || '#ccc', roughness: .62, side: cmmTres.DoubleSide });
        const cmmMalla = cmmMallaBuilder(cmmMeta, cmmBloques.get(cmmMeta.cmmDato.chunk), cmmMaterial);
        const cmmPieza = cmmCrearPiezaBuilder(cmmEscena.cmmTablero, cmmMeta, cmmMalla, cmmDificultad, cmmRadio);
        cmmPieza.cmmMalla.userData.cmmPieza = cmmPieza;
        cmmMalla.castShadow = true;
        cmmPieza.cmmFantasma = new cmmTres.Mesh(cmmMalla.geometry, new cmmTres.MeshBasicMaterial({
          color: '#3d87b3', transparent: true, opacity: .27, depthWrite: false, side: cmmTres.DoubleSide
        }));
        cmmPieza.cmmFantasma.visible = false;
        cmmEscena.cmmTablero.add(cmmPieza.cmmFantasma);
        cmmEscena.cmmPiezas.push(cmmPieza);
      }
      const cmmPiezas = cmmEscena.cmmPiezas.filter((cmmP) => cmmActivas.has(cmmP.cmmId));
      const cmmManipulables = cmmEscena.cmmPiezas.filter((cmmP) => cmmActivas.has(cmmP.cmmId) || cmmP.cmmEsIntrusa);
      const cmmDestinos = cmmDistribuirBuilder(cmmManipulables, cmmCaja, cmmDificultad, cmmSemilla, cmmLayout);
      if (cmmTutorial) {
        const cmmArranque = cmmDestinos.get(cmmPiezas[0].cmmId);
        cmmArranque.cmmPosicion.z += cmmRadio * .12;
      }
      this.cmmSesion = {
        cmmGuia: cmmTutorial ? 0 : null, cmmTutorial, cmmModo, cmmContexto,
        cmmReto, cmmPractica, cmmLibre, cmmNivel, cmmDificultad, cmmLayout, cmmPiezas, cmmManipulables, cmmCaja, cmmRadio, cmmSemilla, cmmDestinos,
        cmmFase: cmmLibre ? 'jugando' : cmmModo === 'diseccion' ? 'diseccion' : 'estudio', cmmSeleccion: null, cmmHerramienta: 'arrastre', cmmAntes: null,
        cmmFallos: new Map(), cmmCorrectas: new Map(), cmmHistorial: [], cmmRehechas: [], cmmPistas: 0, cmmPagina: 0, cmmAnimacion: null,
        cmmReloj: new CMMRelojBuilder(), cmmLatido: null, cmmRacha: 0,
        cmmUsaVidas: !cmmLibre && !cmmTutorial && !cmmContexto?.cmmVistaDocente && !cmmPractica,
        cmmMonedasGanadas: 0, cmmPiezasPremiadas: new Set()
      };
      if (this.cmmSesion.cmmUsaVidas) this.cmmJuego.cmmNuevaPartida();
      this.cmmUI.get('eje').value = 'libre';
      this.cmmTexto('carga', '');
      this.cmmTexto('reto', cmmReto.cmmNombre + ' · ' + (cmmLibre ? CMM_MODOS.libre : CMM_MODOS[cmmModo] + ' · ' + cmmDificultad.cmmNombre));
      this.cmmTexto('aviso', cmmLibre ? 'Explora el modelo armado o desmonta sus piezas.' : 'Gira el modelo para estudiar cómo se relacionan las piezas.');
      this.cmmOcultar(this.cmmAcciones.get('pausa'), cmmLibre);
      cmmEscena.cmmSombras(cmmCaja);
      cmmEscena.cmmEncuadrar(cmmCaja);
      cmmEscena.cmmMiniaturas(cmmModo === 'detective' ? cmmEscena.cmmPiezas : cmmManipulables);
      this.cmmPintarPartida();
      if (cmmModo === 'detective') {
        this.cmmPrepararDetective();
      } else if (cmmModo === 'diseccion') {
        this.cmmPaso('');
        this.cmmTexto('aviso', 'Separa manualmente todas las piezas activas arrastrándolas fuera de su posición.');
      } else if (cmmTutorial) {
        this.cmmDesmontar();
      } else if (cmmModo === CMM_EXAMEN_PRACTICO) {
        this.cmmPaso('<h3>Examen preparado</h3><p>La cuenta regresiva empieza cuando aparezcan las piezas.</p><button class="cmm-builder-primario" data-cmm-builder="desmontar">Empezar examen</button>');
      } else if (!cmmLibre) {
        const cmmTexto = cmmModo === 'memoria' ? 'Estudia las formas, nombres y posiciones. Durante la reconstrucción tendrás solo las piezas.' :
          cmmModo === 'capas' ? 'Observa el orden de la pared pectoral. Montarás primero las costillas, después el pectoral menor y por último la porción esternocostal del mayor.' :
          CMM_OBJETIVOS_ESPECIALES[cmmModo] ?? 'Gira el modelo. Desmonta las piezas cuando estés listo.';
        const cmmEmpezar = cmmModo === 'cmm-parcial' ? 'Mostrar las piezas y empezar' : 'Desmontar y empezar';
        this.cmmPaso('<h3>Estudia la región</h3><p>' + cmmTexto + '</p><button class="cmm-builder-primario" data-cmm-builder="desmontar">' + cmmEmpezar + '</button>');
        if (cmmContexto?.cmmDocente) this.cmmUI.get('paso').querySelector('p').textContent = cmmReto.cmmDescripcion;
      } else {
        this.cmmPaso('');
        this.cmmAcciones.get('catalogo').focus();
      }
    } catch (cmmError) {
      if (!cmmCarga.signal.aborted) {
        console.error(cmmError);
        this.cmmMostrarCatalogo();
        this.cmmTexto('carga', 'No se pudo iniciar el desafío 3D. Comprueba que WebGL y los datos del atlas estén disponibles.');
      }
    } finally {
      if (this.cmmCarga === cmmCarga) this.cmmCarga = null;
    }
  }

  cmmPaso(cmmHtml) {
    const cmmPaso = this.cmmUI.get('paso');
    cmmPaso.classList.toggle('cmm-builder-victoria', this.cmmSesion?.cmmFase === 'finalizado');
    cmmPaso.innerHTML = cmmHtml;
    this.cmmOcultar(cmmPaso, !cmmHtml);
    cmmPaso.querySelector('button')?.focus();
  }

  cmmAplicarPose(cmmPieza, cmmPose) {
    cmmPieza.cmmPivote.position.copy(cmmPose.cmmPosicion);
  }

  cmmAnimar(cmmTransiciones, cmmDuracion, cmmFin) {
    const cmmS = this.cmmSesion;
    const cmmInicio = performance.now();
    const cmmDuracionReal = this.cmmUI.get('reducir')?.checked || matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : cmmDuracion;
    const cmmAnimar = (cmmAhora) => {
      const cmmT = cmmDuracionReal ? cmmTres.MathUtils.clamp((cmmAhora - cmmInicio) / cmmDuracionReal, 0, 1) : 1;
      const cmmCurva = 1 - (1 - cmmT) ** 3;
      for (const [cmmI, { cmmPieza, cmmOrigen, cmmDestino }] of cmmTransiciones.entries()) {
        const cmmK = cmmTransiciones.length === 1 ? cmmCurva : 1 - (1 - cmmTres.MathUtils.clamp(cmmT * 1.22 - cmmI * .22 / Math.max(1, cmmTransiciones.length - 1), 0, 1)) ** 3;
        cmmPieza.cmmPivote.position.lerpVectors(cmmOrigen.cmmPosicion, cmmDestino.cmmPosicion, cmmK);
      }
      this.cmmEscena.cmmDibujar();
      if (cmmT < 1) {
        cmmS.cmmAnimacion = requestAnimationFrame(cmmAnimar);
      } else {
        cmmS.cmmAnimacion = null;
        cmmFin();
      }
    };
    cmmS.cmmAnimacion = requestAnimationFrame(cmmAnimar);
  }

  cmmDesmontar() {
    const cmmS = this.cmmSesion;
    if (cmmS.cmmAnimacion || (cmmS.cmmFase !== 'estudio' && !(cmmS.cmmLibre && cmmS.cmmFase === 'jugando'))) return;
    this.cmmEscena.cmmCancelar();
    cmmS.cmmFase = 'desmontando';
    if (cmmS.cmmLibre) {
      cmmS.cmmHistorial.length = 0;
      cmmS.cmmRehechas.length = 0;
    }
    this.cmmPaso('');
    const cmmTransiciones = (cmmS.cmmManipulables ?? cmmS.cmmPiezas).map((cmmPieza) => ({
      cmmPieza, cmmOrigen: cmmPoseBuilder(cmmPieza, this.cmmEscena.cmmTablero), cmmDestino: cmmS.cmmDestinos.get(cmmPieza.cmmId)
    }));
    const cmmCaja = cmmS.cmmCaja.clone();
    for (const { cmmPieza, cmmDestino } of cmmTransiciones) {
      const cmmMargen = new cmmTres.Vector3().setScalar(cmmPieza.cmmRadio);
      cmmCaja.expandByPoint(cmmDestino.cmmPosicion.clone().sub(cmmMargen));
      cmmCaja.expandByPoint(cmmDestino.cmmPosicion.clone().add(cmmMargen));
    }
    this.cmmEscena.cmmSombras(cmmCaja);
    this.cmmEscena.cmmEncuadrar(cmmCaja, undefined, true);
    this.cmmPintarPartida();
    this.cmmAnimar(cmmTransiciones, 720, () => {
      this.cmmTexto('aviso', 'Arrastra la pieza hasta su silueta. Se encaja al soltarla cerca.');
      this.cmmEmpezarJuego();
    });
  }

  cmmEmpezarJuego() {
    const cmmS = this.cmmSesion;
    cmmS.cmmFase = 'jugando';
    if (!cmmS.cmmLibre && !cmmS.cmmTutorial) {
      cmmS.cmmReloj.cmmReanudar();
      cmmS.cmmLatido = setInterval(() => this.cmmActualizarTiempo(), 250);
    }
    this.cmmPintarPartida();
  }

  cmmTiempoDisponible() {
    const cmmS = this.cmmSesion;
    return ['cmm-contrarreloj', CMM_EXAMEN_PRACTICO].includes(cmmS.cmmModo) ? Math.max(0, cmmS.cmmReto.cmmTiempo * 1000 - cmmS.cmmReloj.cmmTiempo()) : Infinity;
  }

  cmmResolverVencimiento() {
    const cmmS = this.cmmSesion;
    if (cmmS?.cmmFase !== 'jugando' || cmmS.cmmAnimacion || this.cmmTiempoDisponible() !== 0) return false;
    this.cmmEscena.cmmCancelar();
    this.cmmCancelarAjuste();
    this.cmmSinVidas('Se agotó el tiempo');
    return true;
  }

  cmmActualizarTiempo() {
    if (!this.cmmResolverVencimiento()) this.cmmPintarHud();
  }

  cmmPrepararDetective() {
    const cmmS = this.cmmSesion;
    const cmmCentro = cmmS.cmmCaja.getCenter(new cmmTres.Vector3());
    const cmmCaja = cmmS.cmmCaja.clone();
    for (const [cmmI, cmmPieza] of cmmS.cmmPiezas.entries()) {
      const cmmDir = cmmPieza.cmmObjetivo.cmmPosicion.clone().sub(cmmCentro);
      cmmDir.z = 0;
      if (cmmDir.lengthSq() < 1e-8) cmmDir.set(cmmI % 2 ? -1 : 1, .5, 0);
      cmmPieza.cmmPivote.position.addScaledVector(cmmDir.normalize(), cmmPieza.cmmTolerancia * (2.6 + cmmI % 3));
      cmmS.cmmDestinos.set(cmmPieza.cmmId, cmmPoseBuilder(cmmPieza, this.cmmEscena.cmmTablero));
      const cmmMargen = new cmmTres.Vector3().setScalar(cmmPieza.cmmRadio);
      cmmCaja.expandByPoint(cmmPieza.cmmPivote.position.clone().sub(cmmMargen));
      cmmCaja.expandByPoint(cmmPieza.cmmPivote.position.clone().add(cmmMargen));
    }
    this.cmmEscena.cmmSombras(cmmCaja);
    this.cmmEscena.cmmEncuadrar(cmmCaja);
    this.cmmPaso('');
    this.cmmTexto('aviso', 'Examina el modelo. Algunas estructuras ya están bien colocadas. Corrige las alteradas.');
    this.cmmEmpezarJuego();
  }

  cmmContarSeparadas() {
    const cmmS = this.cmmSesion;
    return cmmS.cmmPiezas.filter((cmmP) => cmmP.cmmPivote.position.distanceTo(cmmP.cmmObjetivo.cmmPosicion) >= cmmP.cmmTolerancia * 1.8).length;
  }

  cmmReconstruirDiseccion() {
    const cmmS = this.cmmSesion;
    if (cmmS.cmmFase !== 'diseccion' || cmmS.cmmAntes || this.cmmContarSeparadas() < cmmS.cmmPiezas.length) return;
    cmmS.cmmHistorial.length = 0;
    cmmS.cmmRehechas.length = 0;
    for (const cmmPieza of cmmS.cmmPiezas) cmmS.cmmDestinos.set(cmmPieza.cmmId, cmmPoseBuilder(cmmPieza, this.cmmEscena.cmmTablero));
    this.cmmTexto('aviso', 'Reconstruye la región desde las posiciones que elegiste al desmontarla.');
    this.cmmEmpezarJuego();
  }

  cmmEnsamblarLibre() {
    const cmmS = this.cmmSesion;
    if (!cmmS.cmmLibre || cmmS.cmmFase !== 'jugando' || cmmS.cmmAnimacion) return;
    this.cmmEscena.cmmCancelar();
    cmmS.cmmFase = 'desmontando';
    this.cmmPintarPartida();
    const cmmTransiciones = cmmS.cmmPiezas.map((cmmPieza) => ({
      cmmPieza, cmmOrigen: cmmPoseBuilder(cmmPieza, this.cmmEscena.cmmTablero), cmmDestino: cmmPieza.cmmObjetivo
    }));
    this.cmmAnimar(cmmTransiciones, 400, () => {
      cmmS.cmmFase = 'jugando';
      cmmS.cmmHistorial.length = 0;
      cmmS.cmmRehechas.length = 0;
      this.cmmEscena.cmmEncuadrar(cmmS.cmmCaja);
      this.cmmPintarPartida();
    });
  }

  cmmEditable() {
    const cmmS = this.cmmSesion;
    const cmmPieza = cmmS?.cmmSeleccion;
    return Boolean(cmmPieza && this.cmmEsMovible(cmmPieza) && cmmPieza.cmmEstado !== 'ensamblada' &&
      ['jugando', 'diseccion'].includes(cmmS.cmmFase) && !cmmS.cmmAnimacion && !cmmS.cmmVistaSolucion);
  }

  cmmEsMovible(cmmPieza) {
    return (this.cmmSesion.cmmManipulables ?? this.cmmSesion.cmmPiezas).includes(cmmPieza);
  }

  cmmElegir(cmmPieza) {
    const cmmS = this.cmmSesion;
    if (!cmmS || !['estudio', 'jugando', 'diseccion'].includes(cmmS.cmmFase) || cmmS.cmmAntes || cmmS.cmmAnimacion) return;
    cmmS.cmmSeleccion = cmmPieza?.cmmMalla.visible ? cmmPieza : null;
    const cmmReferencia = cmmS.cmmSeleccion && !this.cmmEsMovible(cmmPieza);
    this.cmmTexto('aviso', cmmReferencia ? 'Esta pieza conserva su posición anatómica y permanece fija.' : '');
    if (cmmS.cmmSeleccion && !cmmReferencia) this.cmmRegistrarGuia('seleccionar');
    this.cmmPintarPartida();
    return cmmS.cmmSeleccion === cmmPieza && this.cmmEditable();
  }

  cmmTomar(cmmOrigen = 'gizmo') {
    const cmmS = this.cmmSesion;
    if (!this.cmmEditable() || !cmmS.cmmSeleccion || cmmS.cmmAntes) return;
    cmmS.cmmOrigen = cmmOrigen;
    cmmS.cmmAntes = cmmPoseBuilder(cmmS.cmmSeleccion, this.cmmEscena.cmmTablero);
    cmmS.cmmInicioAjuste = cmmS.cmmReloj?.cmmTiempo?.() ?? 0;
    cmmS.cmmSeleccion.cmmEstado = 'en-movimiento';
  }

  cmmSoltar(cmmCancelar, cmmIntentar = true) {
    const cmmS = this.cmmSesion;
    if (!cmmS?.cmmAntes) return;
    const cmmPieza = cmmS.cmmSeleccion;
    const cmmAntes = cmmS.cmmAntes;
    cmmS.cmmAntes = null;
    cmmPieza.cmmEstado = 'disponible';
    const cmmDespues = cmmPoseBuilder(cmmPieza, this.cmmEscena.cmmTablero);
    if (cmmCancelar) {
      this.cmmAplicarPose(cmmPieza, cmmAntes);
    } else if (cmmAntes.cmmPosicion.distanceToSquared(cmmDespues.cmmPosicion) > 1e-12) {
      const cmmMedida = this.cmmMedidaPieza(cmmPieza);
      if (cmmMedida) cmmMedida.cmmTiempo += Math.max(0, cmmS.cmmReloj.cmmTiempo() - cmmS.cmmInicioAjuste);
      this.cmmRegistrarCambio({ cmmPieza, cmmAntes, cmmDespues });
      this.cmmRegistrarGuia(cmmS.cmmOrigen);
      if (cmmIntentar && !cmmS.cmmLibre) this.cmmIntentar(false);
    }
    this.cmmIndicador();
    this.cmmPintarHud();
  }

  cmmMedidaPieza(cmmPieza) {
    const cmmS = this.cmmSesion;
    if (cmmS.cmmTutorial || cmmS.cmmLibre || cmmS.cmmContexto?.cmmVistaDocente || cmmS.cmmModo === CMM_EXAMEN_PRACTICO || cmmPieza.cmmEsIntrusa || cmmS.cmmFase !== 'jugando') return null;
    const cmmRegistros = cmmS.cmmMedidas ??= new Map();
    if (!cmmRegistros.has(cmmPieza.cmmId)) cmmRegistros.set(cmmPieza.cmmId, {
      cmmIntentos: 0, cmmErroresPosicion: 0, cmmPistas: 0, cmmDistancia: 0, cmmTiempo: 0
    });
    return cmmRegistros.get(cmmPieza.cmmId);
  }

  cmmInformarPractica() {
    const cmmS = this.cmmSesion;
    if (!cmmS?.cmmMedidas?.size || cmmS.cmmPracticaInformada) return;
    cmmS.cmmPracticaInformada = true;
    this.cmmEventos?.cmmAlPracticar?.(cmmS.cmmPiezas.flatMap((cmmPieza) => {
      const cmmMedidas = cmmS.cmmMedidas.get(cmmPieza.cmmId);
      return cmmMedidas ? [{ cmmClave: cmmPieza.cmmDato.name, cmmCorrecta: cmmS.cmmCorrectas.has(cmmPieza.cmmId),
        cmmFallos: cmmS.cmmFallos.get(cmmPieza.cmmId) ?? 0, cmmMedidas }] : [];
    }));
  }

  cmmRegistrarCambio(cmmCambio) {
    const cmmS = this.cmmSesion;
    cmmS.cmmHistorial.push(cmmCambio);
    if (cmmS.cmmHistorial.length > 140) cmmS.cmmHistorial.shift();
    cmmS.cmmRehechas.length = 0;
  }

  cmmCancelarAjuste() {
    const cmmS = this.cmmSesion;
    if (!cmmS?.cmmAntes || cmmS.cmmOrigen !== 'profundidad') return;
    this.cmmSoltar(true);
    const cmmControl = this.cmmUI.get('profundidad');
    if (cmmControl) cmmControl.value = '0';
  }

  cmmDeshacer(cmmRehacer) {
    const cmmS = this.cmmSesion;
    if (!['jugando', 'diseccion'].includes(cmmS.cmmFase) || cmmS.cmmAnimacion || cmmS.cmmAntes) return;
    if (this.cmmResolverVencimiento()) return;
    const cmmOrigen = cmmRehacer ? cmmS.cmmRehechas : cmmS.cmmHistorial;
    const cmmDestino = cmmRehacer ? cmmS.cmmHistorial : cmmS.cmmRehechas;
    const cmmCambio = cmmOrigen.pop();
    if (!cmmCambio) return;
    const { cmmPieza, cmmAntes, cmmDespues, cmmCorrecta } = cmmCambio;
    this.cmmAplicarPose(cmmPieza, cmmRehacer ? cmmDespues : cmmAntes);
    if (cmmCorrecta) {
      if (cmmRehacer) cmmS.cmmCorrectas.set(cmmPieza.cmmId, cmmCorrecta);
      else cmmS.cmmCorrectas.delete(cmmPieza.cmmId);
      cmmPieza.cmmEstado = cmmRehacer ? 'ensamblada' : 'disponible';
      cmmS.cmmRacha = Math.max(0, cmmS.cmmRacha + (cmmRehacer ? 1 : -1));
    }
    cmmDestino.push(cmmCambio);
    this.cmmElegir(cmmPieza);
  }

  cmmPremiarEncaje(cmmId) {
    const cmmS = this.cmmSesion;
    if (!cmmS.cmmUsaVidas || cmmS.cmmPiezasPremiadas.has(cmmId)) return;
    cmmS.cmmPiezasPremiadas.add(cmmId);
    cmmS.cmmMonedasGanadas += this.cmmJuego.cmmGanar(this.cmmJuego.cmmPremioPregunta(cmmS.cmmRacha - 1));
  }

  cmmAjustar(cmmFuncion, cmmIntentar = true, cmmOrigen = 'ajuste') {
    if (!this.cmmEditable() || !this.cmmSesion.cmmSeleccion || this.cmmSesion.cmmAntes) return;
    this.cmmTomar(cmmOrigen);
    cmmFuncion(this.cmmSesion.cmmSeleccion);
    this.cmmSoltar(false, cmmIntentar);
  }

  cmmProfundidad(cmmDireccion) {
    const cmmVec = this.cmmEscena.cmmCamara.getWorldDirection(new cmmTres.Vector3());
    this.cmmAjustar((cmmP) => cmmP.cmmPivote.position.addScaledVector(cmmVec, this.cmmSesion.cmmRadio * .06 * cmmDireccion), true, 'profundidad');
  }

  cmmDeslizarProfundidad(cmmValor) {
    const cmmS = this.cmmSesion;
    if (!this.cmmEditable() || (cmmS.cmmAntes && cmmS.cmmOrigen !== 'profundidad')) return;
    if (!cmmS.cmmAntes) this.cmmTomar('profundidad');
    const cmmDir = this.cmmEscena.cmmCamara.getWorldDirection(new cmmTres.Vector3());
    cmmS.cmmSeleccion.cmmPivote.position.copy(cmmS.cmmAntes.cmmPosicion).addScaledVector(cmmDir, cmmValor / 100 * cmmS.cmmRadio * .85);
    this.cmmIndicador();
  }

  cmmRegistrarGuia(cmmAccion) {
    const cmmS = this.cmmSesion;
    if (!cmmS?.cmmTutorial) return;
    cmmS.cmmGuia = cmmAvanceTutorial(cmmS.cmmGuia, cmmAccion);
    this.cmmPintarGuia();
  }

  cmmPintarGuia() {
    const cmmS = this.cmmSesion;
    const cmmVisible = cmmS?.cmmTutorial && cmmS.cmmFase === 'jugando' && cmmS.cmmGuia < CMM_GUIA.length;
    this.cmmOcultar(this.cmmUI.get('guia'), !cmmVisible);
    if (!cmmVisible) return;
    this.cmmTexto('guia-paso', 'Partida guiada · ' + (cmmS.cmmGuia + 1) + ' de ' + CMM_GUIA.length);
    this.cmmTexto('guia-texto', CMM_GUIA[cmmS.cmmGuia][1]);
  }

  cmmPintarReticula() {
    const cmmS = this.cmmSesion;
    const cmmPunto = cmmS?.cmmTutorial && CMM_GUIA[cmmS.cmmGuia]?.[0] === 'objetivo' && cmmS.cmmFase === 'jugando' ?
      this.cmmEscena.cmmProyectar(cmmS.cmmPiezas[0].cmmObjetivo.cmmPosicion) : null;
    const cmmEl = this.cmmUI.get('reticula');
    this.cmmOcultar(cmmEl, !cmmPunto);
    if (cmmPunto) {
      cmmEl.style.left = cmmPunto.cmmX + 'px';
      cmmEl.style.top = cmmPunto.cmmY + 'px';
    }
  }

  cmmIdentificarObjetivo(cmmRayo) {
    const cmmS = this.cmmSesion;
    if (!cmmS?.cmmTutorial || cmmS.cmmFase !== 'jugando' || CMM_GUIA[cmmS.cmmGuia]?.[0] !== 'objetivo') return false;
    const cmmPieza = cmmS.cmmPiezas[0];
    const cmmZona = new cmmTres.Sphere(cmmPieza.cmmObjetivo.cmmPosicion, cmmPieza.cmmRadio * .38);
    if (!cmmRayo.ray.intersectsSphere(cmmZona) && !cmmRayo.intersectObject(cmmPieza.cmmFantasma, false).length) return false;
    this.cmmRegistrarGuia('objetivo');
    this.cmmIndicador();
    return true;
  }

  cmmVistaSolucion() {
    const cmmS = this.cmmSesion;
    if (!cmmS || ['memoria', 'detective', 'capas', CMM_EXAMEN_PRACTICO].includes(cmmS.cmmModo) || cmmS.cmmFase !== 'jugando' || cmmS.cmmNivel > 1 || cmmS.cmmAntes || cmmS.cmmTutorial || cmmS.cmmLibre) return;
    if (this.cmmResolverVencimiento()) return;
    cmmS.cmmVistaSolucion = true;
    clearTimeout(cmmS.cmmSolucionId);
    this.cmmTexto('aviso', 'Montaje de referencia visible por cuatro segundos.');
    this.cmmActualizarHerramienta();
    this.cmmIndicador();
    cmmS.cmmSolucionId = setTimeout(() => {
      cmmS.cmmVistaSolucion = false;
      this.cmmActualizarHerramienta();
      this.cmmIndicador();
    }, 4000);
  }

  cmmIndicador() {
    const cmmS = this.cmmSesion;
    if (!cmmS) return;
    let cmmBorde = '#256185';
    let cmmIndicacion = null;
    const cmmCapa = cmmCapaPendiente(cmmS.cmmReto, cmmS.cmmCorrectas);
    for (const cmmP of cmmS.cmmManipulables ?? cmmS.cmmPiezas) {
      let cmmColor = cmmP.cmmEstado === 'ensamblada' ? '#276848' : '#000000';
      if (!cmmP.cmmEsIntrusa && cmmP === cmmS.cmmSeleccion && cmmP.cmmEstado !== 'ensamblada' && cmmS.cmmFase === 'jugando' && cmmS.cmmModo !== CMM_EXAMEN_PRACTICO) {
        const cmmEncaje = cmmEvaluarEncaje(cmmP, cmmP.cmmObjetivo, cmmPoseBuilder(cmmP, this.cmmEscena.cmmTablero));
        cmmIndicacion = cmmEncaje;
        cmmBorde = cmmEncaje.cmmValido && (!cmmCapa || cmmCapa.cmmIds.includes(cmmP.cmmId)) ? '#168455' : cmmEncaje.cmmCerca ? '#cb7619' : '#256185';
        cmmColor = cmmBorde;
      }
      cmmP.cmmMalla.material.emissive.set(cmmColor);
      cmmP.cmmMalla.material.emissiveIntensity = .52;
      cmmP.cmmMalla.visible = ((cmmS.cmmFase !== 'estudio' && !(cmmS.cmmFase === 'desmontando' && cmmS.cmmModo === CMM_EXAMEN_PRACTICO)) || (!cmmP.cmmEsIntrusa && !['cmm-parcial', CMM_EXAMEN_PRACTICO].includes(cmmS.cmmModo))) &&
        (!cmmS.cmmVistaSolucion || cmmP.cmmEstado === 'ensamblada') && (!cmmP.cmmEsIntrusa || cmmS.cmmFase !== 'finalizado');
      cmmP.cmmFantasma.visible = !cmmP.cmmEsIntrusa && cmmS.cmmFase === 'jugando' && !cmmS.cmmLibre && !['memoria', CMM_EXAMEN_PRACTICO].includes(cmmS.cmmModo) &&
        (!cmmCapa || cmmCapa.cmmIds.includes(cmmP.cmmId)) && cmmP.cmmEstado !== 'ensamblada' &&
        ((cmmS.cmmModo !== 'detective' && (cmmS.cmmNivel === 0 || (cmmS.cmmNivel === 1 && cmmP === cmmS.cmmSeleccion))) || Boolean(cmmP.cmmPista || cmmS.cmmVistaSolucion));
    }
    const cmmP = cmmS.cmmSeleccion;
    const cmmMostrarGuia = cmmP && cmmP.cmmEstado !== 'ensamblada' && cmmS.cmmFase === 'jugando' && !cmmS.cmmVistaSolucion &&
      (cmmP.cmmPista || (cmmS.cmmTutorial && CMM_GUIA[cmmS.cmmGuia]?.[0] === 'encaje'));
    this.cmmEscena.cmmGuiar(cmmMostrarGuia ? cmmP : null);
    const cmmMostrarDetalle = cmmIndicacion && !['memoria','detective'].includes(cmmS.cmmModo) && (!cmmCapa || cmmCapa.cmmIds.includes(cmmP.cmmId)) && (cmmS.cmmNivel < 2 || cmmP.cmmPista) && !cmmS.cmmVistaSolucion;
    this.cmmTexto('encaje-pos', cmmMostrarDetalle ? (cmmIndicacion.cmmValido ? 'Encaje listo · suelta para fijar' :
      'Distancia al destino: ' + Math.round(cmmIndicacion.cmmDistancia * 1000) + ' mm') : '');
    const cmmBordeVisible = ['jugando', 'estudio', 'diseccion'].includes(cmmS.cmmFase);
    this.cmmEscena.cmmResaltar(cmmBordeVisible ? cmmS.cmmSeleccion : null, cmmBorde);
    this.cmmEscena.cmmDibujar();
  }

  cmmIntentar(cmmExplicito) {
    const cmmS = this.cmmSesion;
    const cmmP = cmmS.cmmSeleccion;
    if (!cmmP || cmmS.cmmFase !== 'jugando' || !this.cmmEditable() || cmmS.cmmAntes || (cmmS.cmmTutorial && CMM_GUIA[cmmS.cmmGuia]?.[0] !== 'encaje')) return;
    if (this.cmmResolverVencimiento()) return;
    const cmmCapa = cmmCapaPendiente(cmmS.cmmReto, cmmS.cmmCorrectas);
    if (cmmCapa && !cmmCapa.cmmIds.includes(cmmP.cmmId)) {
      if (cmmExplicito) this.cmmTexto('aviso', 'Completa primero: ' + cmmCapa.cmmNombre + '.');
      return;
    }
    const cmmAntes = cmmPoseBuilder(cmmP, this.cmmEscena.cmmTablero);
    const cmmEncaje = cmmEvaluarEncaje(cmmP, cmmP.cmmObjetivo, cmmAntes);
    const cmmMedida = this.cmmMedidaPieza(cmmP);
    if (cmmMedida) {
      cmmMedida.cmmIntentos++;
      cmmMedida.cmmDistancia += cmmEncaje.cmmDistancia * 1000;
      cmmMedida.cmmErroresPosicion += Number(cmmEncaje.cmmDistancia > cmmP.cmmTolerancia);
    }
    if (!cmmEncaje.cmmValido) {
      if (!cmmExplicito) return;
      if (!cmmS.cmmLibre) {
        cmmS.cmmRacha = 0;
        cmmS.cmmFallos.set(cmmP.cmmId, (cmmS.cmmFallos.get(cmmP.cmmId) ?? 0) + 1);
        if (cmmS.cmmUsaVidas && this.cmmJuego.cmmPerderVida() === 0) {
          this.cmmSinVidas();
          return;
        }
      }
      this.cmmTexto('aviso', cmmS.cmmModo === CMM_EXAMEN_PRACTICO ? 'Intento incorrecto registrado.' : cmmP.cmmEsIntrusa ? 'Esta pieza pertenece a otra región.' : cmmEncaje.cmmCerca ?
        'Cerca del destino. Revisa la ubicación.' : 'La pieza sigue lejos de su posición anatómica.');
      this.cmmPintarHud();
      return;
    }
    cmmP.cmmEstado = 'encajando';
    const cmmUltima = !cmmS.cmmLibre && cmmS.cmmCorrectas.size + 1 === cmmS.cmmPiezas.length;
    if (cmmUltima) cmmS.cmmReloj.cmmPausar();
    const cmmCalidad = Math.max(0, Math.round(40 * (1 - cmmEncaje.cmmDistancia / cmmP.cmmTolerancia)));
    const cmmPuntos = (100 + cmmCalidad + Math.min(cmmS.cmmRacha, 4) * 5) * (cmmS.cmmNivel + 1);
    this.cmmAnimar([{ cmmPieza: cmmP, cmmOrigen: cmmAntes, cmmDestino: cmmP.cmmObjetivo }], 240, () => {
      this.cmmAplicarPose(cmmP, cmmP.cmmObjetivo);
      const cmmCorrecta = cmmS.cmmLibre ? null : { cmmPuntos, cmmCalidad };
      cmmP.cmmEstado = cmmCorrecta ? 'ensamblada' : 'disponible';
      if (cmmCorrecta) {
        cmmS.cmmCorrectas.set(cmmP.cmmId, cmmCorrecta);
        cmmS.cmmRacha += 1;
        this.cmmPremiarEncaje(cmmP.cmmId);
      }
      this.cmmRegistrarCambio({ cmmPieza: cmmP, cmmAntes, cmmDespues: cmmP.cmmObjetivo, cmmCorrecta });
      this.cmmTexto('aviso', cmmS.cmmModo === CMM_EXAMEN_PRACTICO ? 'Pieza colocada.' : cmmP.cmmNombre + ' encaja en su posición anatómica.');
      if (cmmUltima) {
        this.cmmRegistrarGuia('encaje');
        this.cmmFinalizar();
      }
      this.cmmPintarPartida();
    });
    this.cmmActualizarHerramienta();
  }

  cmmPista() {
    const cmmS = this.cmmSesion;
    const cmmP = cmmS.cmmSeleccion;
    if (!cmmP || cmmP.cmmEsIntrusa || !this.cmmEditable() || cmmS.cmmFase !== 'jugando' || cmmS.cmmModo === 'memoria') return;
    if (this.cmmResolverVencimiento()) return;
    const cmmCapa = cmmCapaPendiente(cmmS.cmmReto, cmmS.cmmCorrectas);
    if (cmmCapa && !cmmCapa.cmmIds.includes(cmmP.cmmId)) {
      this.cmmTexto('aviso', 'Trabaja primero en ' + cmmCapa.cmmNombre + '.');
      return;
    }
    if (!cmmS.cmmLibre && cmmS.cmmPistas >= this.cmmLimitePistas()) return;
    const cmmCoste = this.cmmCostePista();
    if (cmmCoste > 0 && !this.cmmJuego.cmmGastar(cmmCoste)) {
      this.cmmTexto('aviso', 'No tienes monedas suficientes para una pista.');
      return;
    }
    if (!cmmS.cmmLibre) cmmS.cmmPistas += 1;
    if (cmmS.cmmModo === CMM_EXAMEN_PRACTICO) {
      this.cmmTexto('aviso', 'Pista de nombre · ' + cmmP.cmmNombre);
      this.cmmPintarPartida();
      return;
    }
    const cmmMedida = this.cmmMedidaPieza(cmmP);
    if (cmmMedida) cmmMedida.cmmPistas++;
    if (cmmS.cmmPiezaPista) cmmS.cmmPiezaPista.cmmPista = false;
    cmmS.cmmPiezaPista = cmmP;
    cmmP.cmmPista = true;
    clearTimeout(cmmS.cmmPistaId);
    cmmP.cmmPistas = (cmmP.cmmPistas ?? 0) + 1;
    const cmmDatos = [cmmP.cmmNombre, cmmP.cmmLado, cmmS.cmmReto.cmmRegion].filter(Boolean).join(' · ');
    this.cmmTexto('aviso', cmmDatos + '. Busca la silueta azul.');
    cmmS.cmmPistaId = setTimeout(() => {
      cmmP.cmmPista = false;
      this.cmmIndicador();
    }, 5500);
    this.cmmPintarPartida();
  }

  cmmCostePista() {
    const cmmS = this.cmmSesion;
    return cmmS && cmmS.cmmUsaVidas && cmmS.cmmDificultad.cmmPistas !== Infinity ? CMM_COSTE_PISTA : 0;
  }

  cmmLimitePistas() {
    const cmmS = this.cmmSesion;
    return Math.min(cmmS.cmmDificultad.cmmPistas, cmmS.cmmReto?.cmmPistas?.cmmMaximo ?? Infinity);
  }

  cmmSinVidas(cmmTitulo = 'Te quedaste sin vidas') {
    const cmmS = this.cmmSesion;
    cmmS.cmmReloj.cmmPausar();
    clearInterval(cmmS.cmmLatido);
    this.cmmEscena.cmmCancelar();
    cmmS.cmmFase = 'finalizado';
    if (cmmS.cmmModo === CMM_EXAMEN_PRACTICO) {
      this.cmmResultadoExamen(cmmTitulo, false);
      return;
    }
    const cmmNombres = cmmS.cmmPiezas.filter((cmmP) => cmmS.cmmFallos.has(cmmP.cmmId))
      .sort((cmmA, cmmB) => cmmS.cmmFallos.get(cmmB.cmmId) - cmmS.cmmFallos.get(cmmA.cmmId));
    this.cmmInformarPractica();
    cmmS.cmmRepasar = cmmNombres.map((cmmP) => cmmP.cmmNombre);
    cmmS.cmmResultado = `<h3>${cmmTitulo}</h3><p>${cmmS.cmmCorrectas.size} de ${cmmS.cmmPiezas.length} piezas colocadas · ${cmmTiempoTexto(cmmS.cmmReloj.cmmTiempo())}</p><p>Monedas +${cmmS.cmmMonedasGanadas} · total ${this.cmmJuego.cmmMonedas}</p><p id="cmm-builder-repasar"></p><div class="cmm-builder-grupo"><button data-cmm-builder="repetir">Intentar de nuevo</button>${cmmNombres.length && !cmmS.cmmReto.cmmCapas ? '<button data-cmm-builder="practicar">Practicar falladas</button>' : ''}<button data-cmm-builder="catalogo">Elegir otro desafío</button></div>`;
    this.cmmMostrarResultado();
    this.cmmUI.get('paso').classList.remove('cmm-builder-victoria');
    this.cmmPintarPartida();
  }

  cmmErrores() {
    return [...this.cmmSesion.cmmFallos.values()].reduce((cmmA, cmmB) => cmmA + cmmB, 0);
  }

  cmmPuntos() {
    const cmmS = this.cmmSesion;
    const cmmBase = [...cmmS.cmmCorrectas.values()].reduce((cmmN, cmmP) => cmmN + cmmP.cmmPuntos, 0);
    const cmmCompletada = cmmS.cmmFase === 'finalizado' && cmmS.cmmCorrectas.size === cmmS.cmmPiezas.length;
    const cmmBono = cmmCompletada ? Math.max(0, 60 - Math.floor(cmmS.cmmReloj.cmmTiempo() / 1000)) : 0;
    return Math.max(0, cmmBase + cmmBono - this.cmmErrores() * 18 - cmmS.cmmPistas * 25);
  }

  cmmResultadoExamen(cmmTitulo, cmmCompletado) {
    const cmmS = this.cmmSesion;
    const cmmTiempo = cmmS.cmmReloj.cmmTiempo();
    const cmmErrores = this.cmmErrores();
    const cmmPiezas = [...cmmS.cmmCorrectas.keys()];
    const cmmTotal = cmmS.cmmPiezas.length;
    this.cmmHistorial.cmmPartidas.unshift({ cmmId: cmmS.cmmReto.cmmId, cmmModo: CMM_EXAMEN_PRACTICO, cmmRegion: cmmS.cmmReto.cmmRegion,
      cmmFecha: Date.now(), cmmNivel: cmmS.cmmNivel, cmmTiempo, cmmPiezas, cmmTotal, cmmPistas: cmmS.cmmPistas, cmmFalladas: [...cmmS.cmmFallos], cmmCompletado });
    this.cmmGuardar();
    const cmmBono = this.cmmJuego.cmmGanar(this.cmmJuego.cmmPremioFinal(cmmErrores, cmmCompletado));
    cmmS.cmmRepasar = cmmS.cmmPiezas.filter((cmmP) => cmmS.cmmFallos.has(cmmP.cmmId) || !cmmS.cmmCorrectas.has(cmmP.cmmId)).map((cmmP) => cmmP.cmmNombre);
    cmmS.cmmResultado = `<h3>${cmmTitulo}</h3><p>${cmmPiezas.length}/${cmmTotal} piezas · ${cmmTiempoTexto(cmmTiempo)} · Errores ${cmmErrores} · Pistas ${cmmS.cmmPistas}</p><p>Monedas +${cmmS.cmmMonedasGanadas + cmmBono} · Evaluación educativa interna</p><p id="cmm-builder-repasar"></p><div class="cmm-builder-grupo"><button data-cmm-builder="catalogo">Volver a desafíos</button></div>`;
    this.cmmMostrarResultado();
    this.cmmPintarPartida();
  }

  cmmFinalizar() {
    const cmmS = this.cmmSesion;
    cmmS.cmmReloj.cmmPausar();
    clearInterval(cmmS.cmmLatido);
    cmmS.cmmFase = 'finalizado';
    if (cmmS.cmmModo === CMM_EXAMEN_PRACTICO) {
      this.cmmResultadoExamen('Examen práctico completado', true);
      return;
    }
    const cmmTiempo = cmmS.cmmReloj.cmmTiempo();
    const cmmErrores = this.cmmErrores();
    const cmmPuntuacion = this.cmmPuntos();
    const cmmPrecision = Math.round([...cmmS.cmmCorrectas.values()].reduce((cmmN, cmmP) => cmmN + cmmP.cmmCalidad, 0) / (40 * cmmS.cmmPiezas.length) * 100);
    const cmmMedalla = cmmErrores === 0 && cmmS.cmmPistas === 0 ? 3 : cmmErrores + cmmS.cmmPistas <= 3 ? 2 : 1;
    if (cmmS.cmmTutorial) {
      this.cmmEscena.cmmEncuadrar(cmmS.cmmCaja, new cmmTres.Vector3(.28, .16, 1));
      this.cmmEscena.cmmPresentar();
      cmmS.cmmResultado = '<h3>Tutorial completado</h3><p>Ya puedes seleccionar, desplazar y encajar estructuras en su silueta.</p><button data-cmm-builder="catalogo">Elegir otro desafío</button>';
      cmmS.cmmRepasar = [];
      this.cmmMostrarResultado();
      return;
    }
    if (cmmS.cmmContexto?.cmmVistaDocente) {
      cmmS.cmmResultado = '<h3>Previsualización completada</h3><p>La misión está preparada para jugar.</p><button data-cmm-builder="catalogo">Volver al editor</button>';
      cmmS.cmmRepasar = [];
      this.cmmMostrarResultado();
      return;
    }
    const cmmBono = cmmS.cmmUsaVidas ? this.cmmJuego.cmmGanar(this.cmmJuego.cmmPremioFinal(cmmErrores, true)) : 0;
    const cmmDia = cmmS.cmmContexto?.cmmFecha ?? null;
    const cmmRecord = !cmmS.cmmPractica && cmmTiempo < this.cmmRecord(cmmS.cmmReto.cmmId, cmmS.cmmNivel, cmmS.cmmLayout, cmmS.cmmModo, cmmDia);
    this.cmmHistorial.cmmPartidas.unshift({
      cmmId: cmmS.cmmReto.cmmId, cmmRegion: cmmS.cmmReto.cmmRegion, cmmNivel: cmmS.cmmNivel, cmmLayout: cmmS.cmmLayout, cmmModo: cmmS.cmmModo,
      cmmTiempo, cmmPuntuacion, cmmMedalla, cmmPrecision, cmmErrores, cmmPistas: cmmS.cmmPistas,
      cmmFalladas: [...cmmS.cmmFallos], cmmPiezas: [...cmmS.cmmCorrectas.keys()], cmmPractica: Boolean(cmmS.cmmPractica),
      cmmFecha: Date.now(), cmmSemilla: cmmS.cmmSemilla, ...(cmmDia ? { cmmDia } : {})
    });
    this.cmmGuardar();
    const cmmNombres = cmmS.cmmPiezas.filter((cmmP) => cmmS.cmmFallos.has(cmmP.cmmId))
      .sort((cmmA, cmmB) => cmmS.cmmFallos.get(cmmB.cmmId) - cmmS.cmmFallos.get(cmmA.cmmId));
    this.cmmInformarPractica();
    this.cmmEscena.cmmEncuadrar(cmmS.cmmCaja, new cmmTres.Vector3(.28, .16, 1));
    this.cmmEscena.cmmPresentar();
    cmmS.cmmResultado = `<h3>Reconstrucción completa</h3><p aria-label="${cmmMedalla} de 3 estrellas">${'★'.repeat(cmmMedalla)}${'☆'.repeat(3 - cmmMedalla)} ${cmmRecord ? '· Nuevo récord' : ''}</p><p>${cmmS.cmmCorrectas.size} piezas · ${cmmTiempoTexto(cmmTiempo)} · ${cmmPuntuacion} puntos</p><p>${cmmErrores} errores · ${cmmS.cmmPistas} pistas · ${cmmPrecision} % de precisión</p>${cmmS.cmmUsaVidas ? '<p>Monedas +' + (cmmS.cmmMonedasGanadas + cmmBono) + ' (bono final +' + cmmBono + ') · total ' + this.cmmJuego.cmmMonedas + '</p>' : ''}<p id="cmm-builder-repasar"></p><div class="cmm-builder-grupo"><button data-cmm-builder="explorar">Explorar modelo</button><button data-cmm-builder="repetir">Repetir</button>${cmmNombres.length && !cmmS.cmmReto.cmmCapas ? '<button data-cmm-builder="practicar">Practicar falladas</button>' : ''}${cmmS.cmmNivel < 3 && !cmmS.cmmContexto ? '<button data-cmm-builder="avanzar">Subir dificultad</button>' : ''}</div>`;
    cmmS.cmmRepasar = cmmNombres.map((cmmP) => cmmP.cmmNombre);
    this.cmmMostrarResultado();
  }

  cmmMostrarResultado() {
    const cmmS = this.cmmSesion;
    this.cmmPaso(cmmS.cmmResultado);
    if (cmmS.cmmRepasar.length) this.cmmUI.get('paso').querySelector('#cmm-builder-repasar').textContent = 'Repasa ' + cmmS.cmmRepasar.join(', ') + '.';
  }

  cmmPintarHud() {
    const cmmS = this.cmmSesion;
    if (!cmmS) return;
    const cmmDiseccion = cmmS.cmmFase === 'diseccion';
    const cmmTiempo = ['cmm-contrarreloj', CMM_EXAMEN_PRACTICO].includes(cmmS.cmmModo) ? Math.ceil(this.cmmTiempoDisponible() / 1000) * 1000 : cmmS.cmmReloj.cmmTiempo();
    this.cmmTexto('tiempo', cmmDiseccion ? 'Desmontaje manual' : cmmS.cmmTutorial ? 'Partida guiada' : cmmS.cmmLibre ? 'Sin cronómetro' : cmmTiempoTexto(cmmTiempo));
    this.cmmTexto('progreso', cmmDiseccion ? this.cmmContarSeparadas() + '/' + cmmS.cmmPiezas.length + ' separadas' : cmmS.cmmLibre ? cmmS.cmmPiezas.length + ' piezas' : cmmS.cmmCorrectas.size + '/' + cmmS.cmmPiezas.length + ' colocadas');
    this.cmmTexto('puntos', cmmS.cmmLibre || cmmS.cmmTutorial ? '' : this.cmmPuntos() + ' puntos');
    const cmmVidas = this.cmmUI.get('vidas');
    if (cmmVidas) cmmVidas.innerHTML = cmmS.cmmUsaVidas && !cmmDiseccion ? this.cmmJuego.cmmCorazones() + '<span class="cmm-monedas">&#9679; ' + this.cmmJuego.cmmMonedas + '</span>' : '';
    this.cmmAcciones.get('pausa').disabled = cmmS.cmmFase !== 'jugando' || cmmS.cmmAnimacion !== null;
    this.cmmAcciones.get('deshacer').disabled = !['jugando','diseccion'].includes(cmmS.cmmFase) || !cmmS.cmmHistorial.length;
    this.cmmAcciones.get('rehacer').disabled = !['jugando','diseccion'].includes(cmmS.cmmFase) || !cmmS.cmmRehechas.length;
    this.cmmOcultar(this.cmmAcciones.get('separar'), !cmmS.cmmLibre);
    this.cmmOcultar(this.cmmAcciones.get('ensamblar'), !cmmS.cmmLibre);
    this.cmmAcciones.get('separar').disabled = cmmS.cmmFase !== 'jugando' || cmmS.cmmAnimacion !== null;
    this.cmmAcciones.get('ensamblar').disabled = this.cmmAcciones.get('separar').disabled;
    this.cmmOcultar(this.cmmAcciones.get('repetir'), cmmS.cmmLibre || cmmS.cmmFase !== 'jugando' || cmmS.cmmModo === CMM_EXAMEN_PRACTICO);
    this.cmmOcultar(this.cmmAcciones.get('resultado'), cmmS.cmmFase !== 'finalizado');
    this.cmmOcultar(this.cmmAcciones.get('reconstruir'), !cmmDiseccion);
    this.cmmAcciones.get('reconstruir').disabled = !cmmDiseccion || this.cmmContarSeparadas() !== cmmS.cmmPiezas.length;
    this.cmmAcciones.get('solucion').disabled = cmmS.cmmFase !== 'jugando' || cmmS.cmmNivel > 1 || cmmS.cmmTutorial || cmmS.cmmLibre || ['memoria', 'detective', 'capas', CMM_EXAMEN_PRACTICO].includes(cmmS.cmmModo);
  }

  cmmActualizarHerramienta() {
    const cmmS = this.cmmSesion;
    const cmmEditable = this.cmmEditable();
    this.cmmUI.get('manipulacion').disabled = !cmmEditable;
    this.cmmAcciones.get('encajar').disabled = cmmS.cmmFase !== 'jugando';
    const cmmCoste = this.cmmCostePista();
    this.cmmAcciones.get('pista').textContent = cmmCoste ? 'Pista (' + cmmCoste + ' monedas)' : 'Pista';
    this.cmmAcciones.get('pista').disabled = cmmS.cmmFase !== 'jugando' || cmmS.cmmSeleccion?.cmmEsIntrusa || cmmS.cmmModo === 'memoria' || !cmmS.cmmLibre && cmmS.cmmPistas >= this.cmmLimitePistas() || !this.cmmJuego.cmmPuedePagar(cmmCoste);
    for (const cmmBoton of this.cmmDialogo.querySelectorAll('[data-cmm-builder-herramienta]')) {
      cmmBoton.setAttribute('aria-pressed', cmmBoton.dataset.cmmBuilderHerramienta === cmmS.cmmHerramienta);
    }
    this.cmmEscena.cmmHerramienta(cmmS.cmmHerramienta, this.cmmUI.get('eje').value, cmmS.cmmSeleccion, cmmEditable);
  }

  cmmPintarPartida() {
    const cmmS = this.cmmSesion;
    this.cmmPintarHud();
    this.cmmPintarGuia();
    this.cmmActualizarHerramienta();
    this.cmmIndicador();
    const cmmCapa = cmmCapaPendiente(cmmS.cmmReto, cmmS.cmmCorrectas);
    this.cmmTexto('objetivo', cmmS.cmmFase === 'diseccion' ? 'Desmonta todas las piezas activas alejándolas de su posición.' :
      cmmCapa ? 'Orden de montaje: ' + cmmCapa.cmmNombre : cmmS.cmmModo === 'detective' ? 'Detecta las estructuras desplazadas y devuélvelas a su sitio.' : cmmS.cmmLibre ? 'Selecciona, mueve y devuelve las piezas a su lugar.' : CMM_OBJETIVOS_ESPECIALES[cmmS.cmmModo] ?? 'Devuelve cada pieza a su posición anatómica.');
    const cmmFichas = [];
    const cmmLista = [];
    const cmmInventario = (cmmS.cmmModo === 'detective' ? this.cmmEscena.cmmPiezas : cmmS.cmmManipulables ?? cmmS.cmmPiezas)
      .filter((cmmPieza) => !cmmPieza.cmmEsIntrusa || !['estudio', 'finalizado'].includes(cmmS.cmmFase));
    const cmmPaginas = Math.max(1, Math.ceil(cmmInventario.length / CMM_BUILDER_PIEZAS_POR_PAGINA));
    cmmS.cmmPagina = Math.max(0, Math.min(cmmS.cmmPagina, cmmPaginas - 1));
    this.cmmOcultar(this.cmmUI.get('paginas'), cmmPaginas < 2);
    this.cmmTexto('pagina', `${cmmS.cmmPagina + 1} de ${cmmPaginas}`);
    this.cmmAcciones.get('cmm-pagina-anterior').disabled = cmmS.cmmPagina === 0;
    this.cmmAcciones.get('cmm-pagina-siguiente').disabled = cmmS.cmmPagina + 1 === cmmPaginas;
    this.cmmTexto('disponibles', (cmmS.cmmModo === 'detective' ? cmmS.cmmPiezas.length : cmmInventario.length) - cmmS.cmmCorrectas.size + ' disponibles');
    const cmmSeleccion = cmmS.cmmSeleccion;
    const cmmNombreReferencia = ['memoria', CMM_EXAMEN_PRACTICO].includes(cmmS.cmmModo) ? 'Referencia fija' : cmmSeleccion?.cmmNombre;
    this.cmmTexto('seleccion', cmmSeleccion ? cmmNombreReferencia : 'Selecciona una pieza en el tablero o la bandeja.');
    for (const [cmmI, cmmPieza] of cmmInventario.entries()) {
      const cmmColocada = cmmPieza.cmmEstado === 'ensamblada';
      const cmmMostrar = cmmS.cmmFase === 'finalizado' || cmmS.cmmModo !== CMM_EXAMEN_PRACTICO &&
        (cmmS.cmmLibre || cmmS.cmmFase === 'estudio' || cmmS.cmmModo !== 'memoria' && (cmmS.cmmNivel === 0 || cmmColocada || cmmPieza.cmmPistas || (cmmS.cmmNivel === 1 && cmmI % 2 === 0)));
      const cmmNombre = cmmMostrar ? cmmPieza.cmmNombre : 'Pieza ' + (cmmI + 1);
      const cmmFicha = document.createElement('button');
      cmmFicha.dataset.cmmBuilderPieza = cmmPieza.cmmId;
      cmmFicha.setAttribute('aria-pressed', cmmPieza === cmmS.cmmSeleccion);
      if (cmmColocada) cmmFicha.setAttribute('aria-label', cmmNombre + ' · colocada');
      const cmmImg = document.createElement('img');
      cmmImg.src = cmmPieza.cmmMiniatura;
      cmmImg.alt = '';
      cmmFicha.append(cmmImg, cmmNombre);
      if (cmmColocada) cmmFicha.classList.add('cmm-builder-colocada');
      if (Math.floor(cmmI / CMM_BUILDER_PIEZAS_POR_PAGINA) === cmmS.cmmPagina) cmmFichas.push(cmmFicha);
      const cmmItem = document.createElement('li');
      cmmItem.textContent = cmmNombre + (cmmColocada ? ' · colocada' : '');
      if (!cmmPieza.cmmEsIntrusa) cmmLista.push(cmmItem);
      if (cmmPieza === cmmS.cmmSeleccion) this.cmmTexto('seleccion', cmmNombre + (cmmMostrar && cmmPieza.cmmLado ? ' · ' + cmmPieza.cmmLado : ''));
    }
    const cmmBandeja = this.cmmUI.get('fichas');
    const cmmIdEnFoco = document.activeElement?.dataset.cmmBuilderPieza;
    cmmBandeja.replaceChildren(...cmmFichas);
    if (cmmIdEnFoco) cmmFichas.find((cmmFicha) => cmmFicha.dataset.cmmBuilderPieza === cmmIdEnFoco)?.focus();
    this.cmmUI.get('lista').replaceChildren(...cmmLista);
  }

  cmmPausa(cmmReanudar) {
    const cmmS = this.cmmSesion;
    if (cmmReanudar && cmmS.cmmFase === 'pausa') {
      cmmS.cmmFase = 'jugando';
      cmmS.cmmReloj.cmmReanudar();
      this.cmmPaso('');
      this.cmmAcciones.get('pausa').focus();
    } else if (!cmmReanudar && !cmmS.cmmLibre && cmmS.cmmFase === 'jugando' && !cmmS.cmmAnimacion) {
      if (this.cmmResolverVencimiento()) return;
      this.cmmEscena.cmmCancelar();
      this.cmmCancelarAjuste();
      cmmS.cmmFase = 'pausa';
      cmmS.cmmReloj.cmmPausar();
      this.cmmPaso('<h3>Partida en pausa</h3><button class="cmm-builder-primario" data-cmm-builder="reanudar">Continuar</button>');
    }
    this.cmmPintarPartida();
  }

  cmmEncuadrar(cmmFrente = false) {
    const cmmCaja = this.cmmSesion.cmmCaja.clone();
    cmmCaja.expandByObject(this.cmmEscena.cmmTablero);
    const cmmE = this.cmmEscena;
    const cmmDireccion = cmmFrente ? undefined : cmmE.cmmCamara.position.clone().sub(cmmE.cmmOrbita.target);
    cmmE.cmmEncuadrar(cmmCaja, cmmDireccion, true);
  }

  cmmEnfocarPieza() {
    const cmmP = this.cmmSesion.cmmSeleccion;
    if (!cmmP) return;
    const cmmE = this.cmmEscena;
    const cmmCaja = new cmmTres.Box3().setFromObject(cmmP.cmmMalla);
    const cmmDireccion = cmmE.cmmCamara.position.clone().sub(cmmE.cmmOrbita.target);
    cmmE.cmmEncuadrar(cmmCaja, cmmDireccion, true);
  }

  cmmEscape() {
    if (this.cmmSesion?.cmmAntes) {
      this.cmmEscena.cmmCancelar();
      this.cmmCancelarAjuste();
    }
    else if (this.cmmSesion?.cmmFase === 'pausa') this.cmmPausa(true);
    else if (this.cmmSesion?.cmmFase === 'jugando' && !this.cmmSesion.cmmLibre) this.cmmPausa(false);
    else this.cmmDialogo.close();
  }

  cmmTecla(cmmEv) {
    cmmEv.stopPropagation();
    const cmmS = this.cmmSesion;
    if (!cmmS || cmmEv.target.closest('input,select,textarea')) return;
    const cmmTecla = cmmEv.key.toLowerCase();
    if (cmmTecla === 'z' && (cmmEv.ctrlKey || cmmEv.metaKey)) {
      cmmEv.preventDefault();
      this.cmmDeshacer(cmmEv.shiftKey);
    } else if (['g', 'x', 'y', 'z'].includes(cmmTecla) && !cmmEv.altKey && !cmmEv.ctrlKey && !cmmEv.metaKey) {
      if (!['jugando','diseccion'].includes(cmmS.cmmFase) || cmmS.cmmAntes) return;
      cmmEv.preventDefault();
      if (cmmTecla === 'g') cmmS.cmmHerramienta = 'translate';
      else this.cmmUI.get('eje').value = this.cmmUI.get('eje').value === cmmTecla ? 'libre' : cmmTecla;
      this.cmmActualizarHerramienta();
    }
  }

  cmmClic(cmmEv) {
    const cmmBoton = cmmEv.target.closest('button');
    if (!cmmBoton) return;
    const cmmId = cmmBoton.dataset.cmmBuilderReto;
    if (cmmId) {
      this.cmmIniciar(this.cmmCatalogo.find((cmmReto) => cmmReto.cmmId === cmmId));
      return;
    }
    const cmmAccion = cmmBoton.dataset.cmmBuilder;
    if (cmmAccion === 'cmm-practica-libre') {
      this.cmmIniciar(this.cmmCatalogo.find((cmmR) => cmmR.cmmId === 'pelvis'), null, false, { cmmModo: 'libre' });
      return;
    }
    if (cmmAccion === 'cmm-examen-iniciar') {
      this.cmmPrepararExamen();
      return;
    }
    if (cmmAccion?.startsWith('cmm-docente-')) {
      this.cmmAccionDocente(cmmAccion);
      return;
    }
    const cmmRegion = cmmBoton.dataset.cmmBuilderRegion;
    if (cmmRegion) {
      this.cmmDialogo.close();
      this.cmmEventos.cmmMostrarDominio?.(cmmRegion);
      return;
    }
    if (cmmBoton.dataset.cmmBuilderCampana) {
      const cmmEtapa = cmmEstadoCampana(this.cmmHistorial.cmmPartidas, this.cmmCatalogo).flatMap((cmmC) => cmmC.cmmEtapas)
        .find((cmmE) => cmmE.cmmId === cmmBoton.dataset.cmmBuilderCampana);
      if (cmmEtapa && !cmmEtapa.cmmBloqueada) this.cmmIniciar(cmmEtapa.cmmReto, null, false, { cmmCampana: true });
      return;
    }
    if (cmmAccion === 'cmm-diario') {
      const cmmDiario = cmmDesafioDiario(this.cmmCatalogo);
      if (cmmDiario) this.cmmIniciar(cmmDiario.cmmReto, null, false, cmmDiario);
      return;
    }
    if (cmmAccion === 'tutorial') {
      this.cmmIniciar(this.cmmCatalogo.find((cmmReto) => cmmReto.cmmId === 'pelvis'), null, true);
      return;
    }
    if (cmmAccion === 'salir') this.cmmDialogo.close();
    else if (cmmAccion === 'catalogo') this.cmmMostrarCatalogo();
    const cmmS = this.cmmSesion;
    if (!cmmS) return;
    if (cmmBoton.dataset.cmmBuilderPieza) {
      const cmmPieza = this.cmmEscena.cmmPiezas.find((cmmP) => cmmP.cmmId === cmmBoton.dataset.cmmBuilderPieza);
      if (this.cmmElegir(cmmPieza) && cmmS.cmmFase === 'jugando' && cmmS.cmmNivel <= 1 &&
        cmmPieza.cmmRadio < cmmS.cmmRadio * .15) this.cmmEnfocarPieza();
    } else if (cmmBoton.dataset.cmmBuilderHerramienta) {
      cmmS.cmmHerramienta = cmmBoton.dataset.cmmBuilderHerramienta;
      this.cmmActualizarHerramienta();
    } else if (cmmAccion === 'cmm-pagina-anterior' || cmmAccion === 'cmm-pagina-siguiente') {
      cmmS.cmmPagina += cmmAccion === 'cmm-pagina-anterior' ? -1 : 1;
      this.cmmPintarPartida();
      if (cmmBoton.disabled) (cmmAccion === 'cmm-pagina-anterior' ? this.cmmAcciones.get('cmm-pagina-siguiente') : this.cmmAcciones.get('cmm-pagina-anterior')).focus();
    } else if (cmmAccion === 'repetir' || cmmAccion === 'practicar' || cmmAccion === 'avanzar') {
      if (cmmAccion === 'avanzar') {
        this.cmmUI.get('dificultad').value = cmmS.cmmNivel + 1;
        this.cmmGuardar();
      }
      this.cmmIniciar(cmmS.cmmReto, cmmAccion === 'practicar' ? [...cmmS.cmmFallos.keys()] : cmmAccion === 'repetir' ? cmmS.cmmPractica : null, cmmS.cmmTutorial, cmmS.cmmContexto);
    } else if (cmmAccion === 'desmontar' || cmmAccion === 'separar') this.cmmDesmontar();
    else if (cmmAccion === 'ensamblar') this.cmmEnsamblarLibre();
    else if (cmmAccion === 'resultado') this.cmmMostrarResultado();
    else if (cmmAccion === 'deshacer' || cmmAccion === 'rehacer') this.cmmDeshacer(cmmAccion === 'rehacer');
    else if (cmmAccion === 'encajar') this.cmmIntentar(true);
    else if (cmmAccion === 'pista') this.cmmPista();
    else if (cmmAccion === 'encuadrar' || cmmAccion === 'vista-frente') this.cmmEncuadrar(cmmAccion === 'vista-frente');
    else if (cmmAccion === 'reconstruir') this.cmmReconstruirDiseccion();
    else if (cmmAccion === 'solucion') this.cmmVistaSolucion();
    else if (cmmAccion === 'enfocar-pieza') this.cmmEnfocarPieza();
    else if (cmmAccion === 'pausa' || cmmAccion === 'reanudar') this.cmmPausa(cmmAccion === 'reanudar');
    else if (cmmAccion === 'acercar' || cmmAccion === 'alejar') this.cmmProfundidad(cmmAccion === 'acercar' ? -1 : 1);
    else if (cmmAccion === 'restablecer') {
      this.cmmAjustar((cmmP) => this.cmmAplicarPose(cmmP, cmmS.cmmLibre || cmmS.cmmFase === 'diseccion' ? cmmP.cmmObjetivo : cmmS.cmmDestinos.get(cmmP.cmmId)), false);
    } else if (cmmAccion === 'explorar') {
      this.cmmPaso('');
      this.cmmAcciones.get('encuadrar').focus();
    }
  }
}
