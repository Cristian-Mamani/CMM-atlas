import { CMMAnatomyBuilder } from './cmm-builder.js';
import { cmmBorrarDatosLocales, cmmExportarDatosLocales } from './cmm-datos-locales.js';
import { cmmCargarAtlas, CMM_SISTEMAS, CMM_SISTEMAS_INICIALES, CMM_ORGANOS, cmmSinTildes } from './cmm-datos.js';
import { CMMEscenaExplosion } from './cmm-escena-explosion.js';
import { CMMProgreso } from './cmm-progreso.js';
import { CMMEtiquetas } from './cmm-etiquetas.js';
import { CMMEtiquetasLamina, cmmRegistrarTramosEtiquetas } from './cmm-etiquetas-lamina.js';
import { CMMExamen } from './cmm-examen.js';
import { CMMJuego } from './cmm-juego.js';
import { CMMNiveles } from './cmm-niveles.js';
import { CMMTarjetas } from './cmm-tarjetas.js';
import { CMMVistas, cmmCamaraValida } from './cmm-vistas.js';
import { CMMPaleta } from './cmm-paleta.js';
import { CMMRepaso } from './cmm-repaso.js';
import { CMM_REGIONES, cmmUbicacion } from './cmm-regiones.js';

const cmmPor = (cmmId) => document.getElementById(cmmId);
const cmmTodos = (cmmSel) => Array.from(document.querySelectorAll(cmmSel));

async function cmmArrancar() {
  const cmmTextoCarga = cmmPor('cmm-carga-texto');
  const cmmBarraCarga = cmmPor('cmm-carga-barra');
  let cmmPiezas;
  try {
    cmmPiezas = await cmmCargarAtlas((cmmPorc) => {
      cmmTextoCarga.textContent = cmmPorc + ' %';
      cmmBarraCarga.style.width = cmmPorc + '%';
    });
  } catch (cmmFallo) {
    cmmTextoCarga.textContent = 'No se pudo cargar la anatomía.';
    return;
  }

  const cmmProgreso = new CMMProgreso();
  const cmmVistas = new CMMVistas();
  const cmmTramosEtiquetas = cmmRegistrarTramosEtiquetas(cmmPiezas);
  let cmmEscena;
  try {
    cmmEscena = new CMMEscenaExplosion(cmmPor('cmm-lienzo'), cmmPiezas, cmmProgreso);
  } catch (cmmFallo) {
    cmmTextoCarga.textContent = 'Este equipo no pudo iniciar el visor 3D (WebGL).';
    return;
  }
  const cmmEstado = cmmEscena.cmmEstado;
  const cmmClavesAnatomicas = new Set(cmmEscena.cmmPorNombre.keys());
  cmmEstado.cmmDominio = false;
  const cmmCamaraInicial = cmmEscena.cmmCapturarCamara();
  const cmmFormatoNumero = new Intl.NumberFormat('es-PE');
  cmmPor('cmm-fuente-modelo').textContent = `${cmmFormatoNumero.format(cmmPiezas.length)} piezas modeladas · BodyParts3D`;
  const cmmEtiquetas = new CMMEtiquetas(cmmEscena, cmmPor('cmm-capa-etiquetas'));
  const cmmLaminaEtiquetas = new CMMEtiquetasLamina(cmmEscena, cmmTramosEtiquetas, cmmPor('cmm-et-lamina'), cmmVerPiezaEtiqueta);
  cmmPor('cmm-carga').classList.add('cmm-oculto');

  const cmmPanelDetalle = cmmPor('cmm-detalle');
  const cmmPanelExamen = cmmPor('cmm-examen');
  const cmmPanelTarjetas = cmmPor('cmm-tarjetas');
  const cmmSugerencia = cmmPor('cmm-sugerencia');

  const cmmPanelDerecho = cmmPor('cmm-derecha');
  const cmmPanelHerramientas = cmmPor('cmm-lateral');
  const cmmAbrirHerramientas = cmmPor('cmm-herramientas-abrir');
  const cmmCerrarHerramientas = cmmPor('cmm-herramientas-cerrar');
  let cmmPaleta;

  function cmmMostrarHerramientas(cmmAbierto) {
    cmmPanelHerramientas.classList.toggle('cmm-oculto', !cmmAbierto);
    cmmAbrirHerramientas.setAttribute('aria-expanded', cmmAbierto);
    cmmPanelDetalle.querySelector('[data-cmm-det="herramientas"]')?.setAttribute('aria-expanded', cmmAbierto);
  }

  cmmAbrirHerramientas.addEventListener('click', () => {
    const cmmAbrir = cmmPanelHerramientas.classList.contains('cmm-oculto');
    cmmMostrarHerramientas(cmmAbrir);
    if (cmmAbrir) cmmCerrarHerramientas.focus();
  });
  cmmCerrarHerramientas.addEventListener('click', () => {
    cmmMostrarHerramientas(false);
    cmmAbrirHerramientas.focus();
  });

  function cmmMostrarDerecha(cmmCual) {
    cmmPanelDerecho.classList.toggle('cmm-oculto', !cmmCual);
    const cmmEstudiando = cmmCual === 'examen' || cmmCual === 'tarjetas';
    if (cmmEstudiando) cmmFijarMedicion(false);
    cmmBotonMedir.disabled = cmmEstudiando;
    for (const cmmId of ['cmm-builder-abrir', 'cmm-herramientas-abrir', 'cmm-busqueda', 'cmm-repaso-hoy', 'cmm-paleta-abrir']) {
      const cmmControl = cmmPor(cmmId);
      if (cmmControl) cmmControl.disabled = cmmEstudiando;
    }
    cmmPor('cmm-sistemas').inert = cmmEstudiando;
    cmmPor('cmm-separar').inert = cmmEstudiando;
    cmmPanelDetalle.classList.toggle('cmm-oculto', cmmCual !== 'detalle');
    cmmPanelExamen.classList.toggle('cmm-oculto', cmmCual !== 'examen');
    cmmPanelTarjetas.classList.toggle('cmm-oculto', cmmCual !== 'tarjetas');
  }

  const cmmBotonMedir = cmmPor('cmm-medir');
  const cmmLimpiarMedicion = cmmPor('cmm-medir-limpiar');
  const cmmDistancia = cmmPor('cmm-distancia');
  const cmmAvisoMedicion = cmmPor('cmm-medir-aviso');
  const cmmFormatoCm = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const cmmFormatoM = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  let cmmMidiendo = false;

  function cmmPosicionarDistancia() {
    const cmmPunto = cmmMidiendo && cmmDistancia.textContent ? cmmEscena.cmmMedicionPantalla() : null;
    const cmmVisible = cmmPunto && cmmPunto.cmmZ >= -1 && cmmPunto.cmmZ <= 1;
    cmmDistancia.classList.toggle('cmm-oculto', !cmmVisible);
    if (!cmmVisible) return;
    cmmDistancia.style.left = cmmPunto.cmmX + 'px';
    cmmDistancia.style.top = cmmPunto.cmmY + 'px';
  }

  cmmEscena.cmmAlMedir = ({ cmmPuntos, cmmDistancia: cmmMetros }) => {
    cmmLimpiarMedicion.disabled = !cmmPuntos.length;
    cmmDistancia.textContent = cmmMetros === null ? '' : cmmMetros < 1
      ? cmmFormatoCm.format(cmmMetros * 100) + ' cm'
      : cmmFormatoM.format(cmmMetros) + ' m';
    cmmPosicionarDistancia();
  };
  cmmEscena.cmmAlRenderizar = () => {
    cmmEtiquetas.cmmActualizar();
    cmmPosicionarDistancia();
  };

  function cmmFijarMedicion(cmmActiva) {
    if (cmmMidiendo === cmmActiva) return;
    cmmMidiendo = cmmActiva;
    cmmBotonMedir.setAttribute('aria-pressed', cmmActiva);
    cmmAvisoMedicion.classList.toggle('cmm-oculto', !cmmActiva);
    cmmLimpiarMedicion.classList.toggle('cmm-oculto', !cmmActiva);
    if (!cmmActiva && document.activeElement === cmmLimpiarMedicion) cmmBotonMedir.focus();
    cmmSugerencia.classList.add('cmm-oculto');
    cmmEscena.cmmActivarMedicion(cmmActiva);
    cmmPosicionarDistancia();
  }

  cmmBotonMedir.addEventListener('click', () => cmmFijarMedicion(!cmmMidiendo));
  cmmLimpiarMedicion.addEventListener('click', () => {
    cmmBotonMedir.focus();
    cmmEscena.cmmLimpiarMedicion();
  });

  function cmmPrepararEstudio(cmmPanel) {
    cmmEtiquetas.cmmConfigurar(false);
    cmmPor('cmm-et-activo').checked = false;
    cmmPlanoCorte.value = 'ninguno';
    cmmAplicarCorte();
    cmmEstado.cmmRayosX = false;
    cmmEstado.cmmDominio = false;
    cmmControlDominio.checked = false;
    cmmLeyendaDominio.hidden = true;
    cmmFijarExplosion('todo', 0);
    cmmFijarGiro(false);
    cmmResultados.classList.add('cmm-oculto');
    cmmSugerencia.classList.add('cmm-oculto');
    cmmSincronizarControles();
    cmmMostrarHerramientas(false);
    cmmMostrarDerecha(cmmPanel);
    cmmPaleta?.cmmCerrar();
  }

  const cmmEventosExamen = {
    cmmAlEmpezar: () => cmmPrepararEstudio('examen'),
    cmmAlVistaPiezas: (cmmSistema, cmmEncuadrar) => {
      cmmEstado.cmmExplosionSistema = cmmSistema ?? 'todo';
      cmmEstado.cmmExplosionValor = cmmSistema ? 1 : 0;
      cmmEscena.cmmAplicar();
      cmmActualizarSeparacion();
      if (cmmEncuadrar) cmmFijarVista('frente');
    },
    cmmAlTerminar: () => {
      cmmEstado.cmmSistemas = new Set(CMM_SISTEMAS_INICIALES);
      cmmEscena.cmmAplicar();
      cmmPintarDetalle();
      cmmEscena.cmmRestaurarCamara(cmmCamaraInicial);
    },
    cmmAlProgreso: () => {},
    cmmRepasar: (cmmNombres) => cmmTarjetas.cmmIniciar('forzado', cmmNombres)
  };
  const cmmEventosTarjetas = {
    cmmAlEmpezar: () => cmmPrepararEstudio('tarjetas'),
    cmmAlTerminar: () => {
      cmmEstado.cmmSistemas = new Set(CMM_SISTEMAS_INICIALES);
      cmmEscena.cmmAplicar();
      cmmPintarDetalle();
      cmmEscena.cmmRestaurarCamara(cmmCamaraInicial);
    },
    cmmAlProgreso: () => {}
  };
  const cmmJuego = new CMMJuego();
  const cmmExamen = new CMMExamen(cmmEscena, cmmProgreso, cmmPanelExamen, cmmEventosExamen, cmmJuego);
  new CMMNiveles(cmmExamen, cmmEscena, cmmPor('cmm-niveles-lista'));
  const cmmTarjetas = new CMMTarjetas(cmmEscena, cmmProgreso, cmmPanelTarjetas, cmmEventosTarjetas);

  function cmmEnModoEstudio() {
    return cmmExamen.cmmActivo || cmmTarjetas.cmmActivo;
  }

  function cmmSeleccionarGrupo(cmmNombreEn, cmmEnfocar) {
    const cmmLista = cmmEscena.cmmPorNombre.get(cmmNombreEn);
    if (!cmmLista) return;
    if (cmmEnfocar) cmmMostrarPiezasSeleccionadas(cmmLista);
    const cmmIds = cmmLista.map((cmmP) => cmmP.cmmId);
    cmmEscena.cmmSeleccionar(cmmIds);
    if (cmmEnfocar) cmmEscena.cmmEnfocar(cmmIds, 750);
    cmmPintarDetalle();
  }

  function cmmMostrarPiezasSeleccionadas(cmmLista) {
    const cmmSistemaSeparado = cmmEscena.cmmSistemaSeparado();
    if (!cmmSistemaSeparado || cmmLista.every(cmmPieza => cmmPieza.cmmSistema === cmmSistemaSeparado)) return;
    const cmmSistema = cmmLista[0]?.cmmSistema;
    cmmFijarExplosion(cmmSistema && cmmLista.every(cmmPieza => cmmPieza.cmmSistema === cmmSistema) ? cmmSistema : 'todo',
      cmmEstado.cmmExplosionValor * 100, false);
  }

  function cmmVerPiezaEtiqueta(cmmPieza) {
    const cmmSistemaSeparado = cmmEscena.cmmSistemaSeparado();
    if (cmmSistemaSeparado && cmmSistemaSeparado !== cmmPieza.cmmSistema) cmmFijarExplosion(cmmPieza.cmmSistema, 100, false);
    cmmEstado.cmmAislar = false;
    cmmEscena.cmmSeleccionar([cmmPieza.cmmId]);
    cmmPintarDetalle();
    cmmEscena.cmmEnfocar([cmmPieza.cmmId], 650);
  }

  function cmmPintarDetalle() {
    if (cmmEnModoEstudio()) return;
    const cmmIds = Array.from(cmmEstado.cmmSeleccion);
    const cmmPrimera = cmmEscena.cmmPorId.get(cmmIds[0]);
    cmmMostrarDerecha(cmmPrimera ? 'detalle' : null);
    if (!cmmPrimera) {
      cmmPanelDetalle.replaceChildren();
      return;
    }
    const cmmFicha = cmmEstado.cmmFicha || cmmPrimera;
    const cmmSis = CMM_SISTEMAS.find((cmmS) => cmmS.cmmId === cmmFicha.cmmSistema);
    cmmPanelDetalle.innerHTML = `<div class="cmm-ficha"><span class="cmm-chip" style="background:${cmmSis.cmmColor};color:#1d2a33">${cmmSis.cmmNombre}</span><h2>${cmmFicha.cmmNombre}</h2><p class="cmm-ingles">${cmmFicha.cmmNombreEn}</p><dl><dt>Ubicación</dt><dd>${cmmUbicacion(cmmPrimera)}</dd><dt>Piezas</dt><dd>${cmmIds.length}</dd></dl><p>${cmmSis.cmmFuncion}</p>${cmmSis.cmmLimite ? `<p class="cmm-limite"><strong>Límite del modelo:</strong> ${cmmSis.cmmLimite}</p>` : ''}<div class="cmm-acciones"><button data-cmm-det="aislar" class="${cmmEstado.cmmAislar ? 'cmm-activa' : ''}">${cmmEstado.cmmAislar ? 'Mostrar el resto del cuerpo' : 'Aislar esta estructura'}</button><button data-cmm-det="contexto" class="${cmmEstado.cmmContexto ? 'cmm-activa' : ''}">Contexto: resaltar vecinas</button><button data-cmm-det="enfocar">Centrar cámara</button><button data-cmm-det="herramientas" aria-controls="cmm-lateral" aria-expanded="${!cmmPanelHerramientas.classList.contains('cmm-oculto')}">Herramientas</button><button data-cmm-det="quitar">Quitar selección</button></div></div>`;
  }

  cmmPanelDetalle.addEventListener('click', (cmmEv) => {
    const cmmBoton = cmmEv.target.closest('[data-cmm-det]');
    if (!cmmBoton) return;
    const cmmAccion = cmmBoton.dataset.cmmDet;
    if (cmmAccion === 'herramientas') {
      const cmmAbrir = cmmPanelHerramientas.classList.contains('cmm-oculto');
      cmmMostrarHerramientas(cmmAbrir);
      if (cmmAbrir) cmmCerrarHerramientas.focus();
      return;
    }
    if (cmmAccion === 'aislar') {
      cmmEstado.cmmAislar = !cmmEstado.cmmAislar;
      cmmEscena.cmmAplicar();
      cmmEscena.cmmEnfocar(Array.from(cmmEstado.cmmSeleccion), 750);
    } else if (cmmAccion === 'contexto') {
      cmmEstado.cmmContexto = !cmmEstado.cmmContexto;
      cmmPor('cmm-ctx-activo').checked = cmmEstado.cmmContexto;
      cmmEscena.cmmAplicar();
    } else if (cmmAccion === 'enfocar') {
      cmmEscena.cmmEnfocar(Array.from(cmmEstado.cmmSeleccion), 750);
    } else if (cmmAccion === 'quitar') {
      cmmEstado.cmmAislar = false;
      cmmEscena.cmmSeleccionar([]);
    }
    cmmPintarDetalle();
  });

  cmmEscena.cmmAlTocar = (cmmId) => {
    if (cmmMidiendo) return;
    if (cmmExamen.cmmActivo) {
      cmmExamen.cmmTocar(cmmId);
      return;
    }
    if (cmmTarjetas.cmmActivo) return;
    if (!cmmId) {
      if (cmmEstado.cmmSeleccion.size) {
        cmmEstado.cmmAislar = false;
        cmmEscena.cmmSeleccionar([]);
        cmmPintarDetalle();
      }
      return;
    }
    cmmSeleccionarGrupo(cmmEscena.cmmPorId.get(cmmId).cmmNombreEn, false);
  };

  cmmEscena.cmmAlPasar = (cmmId, cmmEv) => {
    if (!cmmId || !cmmEv || cmmMidiendo || cmmEnModoEstudio()) {
      cmmSugerencia.classList.add('cmm-oculto');
      return;
    }
    const cmmRect = cmmPor('cmm-escenario').getBoundingClientRect();
    cmmSugerencia.textContent = cmmEscena.cmmPorId.get(cmmId).cmmNombre;
    cmmSugerencia.style.left = cmmEv.clientX - cmmRect.left + 'px';
    cmmSugerencia.style.top = cmmEv.clientY - cmmRect.top + 'px';
    cmmSugerencia.classList.remove('cmm-oculto');
  };

  const cmmListaSistemas = cmmPor('cmm-lista-sistemas');
  const cmmCuentas = {};
  for (const cmmP of cmmPiezas) cmmCuentas[cmmP.cmmSistema] = (cmmCuentas[cmmP.cmmSistema] || 0) + 1;
  const cmmSistemasActivos = CMM_SISTEMAS.filter((cmmS) => cmmCuentas[cmmS.cmmId]);
  cmmPor('cmm-total-sistemas').textContent = cmmSistemasActivos.length;
  const cmmPresets = new Map([
    ['todo', cmmSistemasActivos.map((cmmS) => cmmS.cmmId).filter((cmmId) => cmmId !== 'integumentary')],
    ['esqueleto', ['skeletal']],
    ['organos', CMM_ORGANOS]
  ]);
  const cmmBotonesPresets = cmmTodos('[data-cmm-preset]');
  const cmmContadorVisible = cmmPor('cmm-piezas-visibles');
  cmmListaSistemas.innerHTML = cmmSistemasActivos
    .map((cmmS) => `<div class="cmm-fila-sistema"><span class="cmm-punto" style="background:${cmmS.cmmColor}"></span><button class="cmm-nombre" data-cmm-solo="${cmmS.cmmId}">${cmmS.cmmNombre}</button><span class="cmm-cuenta">${cmmCuentas[cmmS.cmmId]}</span><input type="checkbox" role="switch" aria-label="Mostrar ${cmmS.cmmNombre}" data-cmm-sis="${cmmS.cmmId}"></div>`)
    .join('');

  function cmmSincronizarSistemas() {
    cmmTodos('[data-cmm-sis]').forEach((cmmC) => {
      cmmC.checked = cmmEstado.cmmSistemas.has(cmmC.dataset.cmmSis);
    });
    for (const cmmB of cmmBotonesPresets) {
      const cmmIds = cmmPresets.get(cmmB.dataset.cmmPreset);
      if (!cmmIds) continue;
      const cmmCoincide = cmmEstado.cmmSistemas.size === cmmIds.length
        && cmmIds.every((cmmId) => cmmEstado.cmmSistemas.has(cmmId));
      cmmB.setAttribute('aria-pressed', cmmCoincide);
    }
  }

  cmmListaSistemas.addEventListener('change', (cmmEv) => {
    const cmmC = cmmEv.target.closest('[data-cmm-sis]');
    if (!cmmC) return;
    if (cmmC.checked) cmmEstado.cmmSistemas.add(cmmC.dataset.cmmSis);
    else cmmEstado.cmmSistemas.delete(cmmC.dataset.cmmSis);
    cmmAplicarFiltroSistemas();
  });
  cmmListaSistemas.addEventListener('click', (cmmEv) => {
    const cmmB = cmmEv.target.closest('[data-cmm-solo]');
    if (!cmmB) return;
    cmmEstado.cmmSistemas = new Set([cmmB.dataset.cmmSolo]);
    cmmAplicarFiltroSistemas();
  });
  cmmBotonesPresets.forEach((cmmB) => {
    cmmB.addEventListener('click', () => {
      const cmmTipo = cmmB.dataset.cmmPreset;
      cmmEstado.cmmSistemas = new Set(cmmPresets.get(cmmTipo));
      if (cmmTipo === 'ninguno') {
        cmmEstado.cmmAislar = false;
        cmmEscena.cmmSeleccionar([]);
        cmmPintarDetalle();
      }
      cmmAplicarFiltroSistemas();
    });
  });

  const cmmListaRegiones = cmmPor('cmm-lista-regiones');
  cmmListaRegiones.innerHTML = CMM_REGIONES.map((cmmR) => `<button data-cmm-region="${cmmR.cmmId}" class="${cmmR.cmmId === 'cuerpo' ? 'cmm-activa' : ''}">${cmmR.cmmNombre}</button>`).join('');
  function cmmMarcarRegion() {
    const cmmId = cmmEstado.cmmRegion ? cmmEstado.cmmRegion.cmmId : 'cuerpo';
    cmmTodos('[data-cmm-region]').forEach((cmmB) => cmmB.classList.toggle('cmm-activa', cmmB.dataset.cmmRegion === cmmId));
  }
  const cmmControlDominio = cmmPor('cmm-mapa-dominio');
  const cmmLeyendaDominio = cmmPor('cmm-leyenda-dominio');
  function cmmFijarDominio(cmmActivo) {
    cmmEstado.cmmDominio = cmmActivo;
    cmmControlDominio.checked = cmmActivo;
    cmmLeyendaDominio.hidden = !cmmActivo;
    cmmEscena.cmmAplicar();
  }
  cmmControlDominio.addEventListener('change', () => cmmFijarDominio(cmmControlDominio.checked));
  cmmListaRegiones.addEventListener('click', (cmmEv) => {
    const cmmB = cmmEv.target.closest('[data-cmm-region]');
    if (!cmmB) return;
    const cmmR = CMM_REGIONES.find((cmmX) => cmmX.cmmId === cmmB.dataset.cmmRegion);
    cmmEstado.cmmRegion = cmmR.cmmId === 'cuerpo' ? null : cmmR;
    cmmEscena.cmmAplicar();
    cmmMarcarRegion();
    if (cmmEstado.cmmRegion) cmmEscena.cmmEnfocarRegion(cmmR);
    else cmmEscena.cmmVistaFija('tres');
  });

  function cmmFijarVista(cmmVista) {
    if (cmmVista === 'frente' && cmmExplosionNecesitaEncuadre()) cmmEncuadrarExplosion();
    else cmmEscena.cmmVistaFija(cmmVista);
  }
  cmmTodos('[data-cmm-vista]').forEach((cmmB) => cmmB.addEventListener('click', () => cmmFijarVista(cmmB.dataset.cmmVista)));
  const cmmBotonGiro = cmmPor('cmm-giro');
  function cmmFijarGiro(cmmActivo) {
    cmmBotonGiro.setAttribute('aria-pressed', cmmActivo);
    cmmEscena.cmmGiro(cmmActivo);
  }
  let cmmGiroAntesDelBuilder = false;
  new CMMAnatomyBuilder(cmmPor('cmm-builder'), cmmPor('cmm-builder-abrir'), cmmPiezas, {
    cmmAlAbrir: () => {
      cmmGiroAntesDelBuilder = cmmBotonGiro.getAttribute('aria-pressed') === 'true';
      if (cmmGiroAntesDelBuilder) cmmEscena.cmmGiro(false);
    },
    cmmAlCerrar: () => {
      if (cmmGiroAntesDelBuilder) cmmEscena.cmmGiro(true);
    },
    cmmAlPracticar: (cmmRegistros) => cmmProgreso.cmmRegistrarBuilder(cmmRegistros),
    cmmResumenPractica: () => cmmProgreso.cmmResumenBuilder(cmmPiezas.map((cmmP) => cmmP.cmmNombreEn)),
    cmmProximoRepaso: () => cmmProgreso.cmmResumenRepaso(cmmClavesAnatomicas),
    cmmMostrarDominio: (cmmId) => {
      cmmEstado.cmmRegion = CMM_REGIONES.find((cmmR) => cmmR.cmmId === cmmId) ?? null;
      cmmFijarDominio(true);
      cmmMarcarRegion();
      if (cmmEstado.cmmRegion) cmmEscena.cmmEnfocarRegion(cmmEstado.cmmRegion);
    }
  }, cmmJuego);
  cmmBotonGiro.addEventListener('click', () => cmmFijarGiro(cmmBotonGiro.getAttribute('aria-pressed') !== 'true'));
  cmmPor('cmm-camara-reiniciar').addEventListener('click', () => {
    cmmFijarGiro(false);
    if (cmmExplosionNecesitaEncuadre()) cmmEncuadrarExplosion();
    else cmmEscena.cmmRestaurarCamara(cmmCamaraInicial);
  });

  cmmTodos('.cmm-pestana').forEach((cmmP) => {
    cmmP.addEventListener('click', () => {
      cmmTodos('.cmm-pestana').forEach((cmmX) => {
        cmmX.classList.toggle('cmm-activa', cmmX === cmmP);
        cmmX.setAttribute('aria-pressed', cmmX === cmmP);
      });
      cmmTodos('.cmm-seccion').forEach((cmmS) => cmmS.classList.toggle('cmm-visible', cmmS.dataset.cmmSeccion === cmmP.dataset.cmmPestana));
    });
  });

  cmmPor('cmm-rx-activo').addEventListener('change', (cmmEv) => {
    cmmEstado.cmmRayosX = cmmEv.target.checked;
    cmmEscena.cmmAplicar();
  });
  cmmPor('cmm-rx-nivel').addEventListener('input', (cmmEv) => {
    cmmEstado.cmmNivelRayosX = Number(cmmEv.target.value) / 100;
    if (cmmEstado.cmmRayosX) cmmEscena.cmmAplicar();
  });
  const cmmSelectorExplosion = cmmPor('cmm-ex-sistema');
  cmmSelectorExplosion.innerHTML = '<option value="todo">Todos los sistemas</option>' + cmmSistemasActivos.map((cmmS) => `<option value="${cmmS.cmmId}">${cmmS.cmmNombre}</option>`).join('');
  const cmmSeparacion = cmmPor('cmm-ex-valor');
  const cmmSeparacionPanel = cmmPor('cmm-ex-valor-panel');
  const cmmPorcentaje = cmmPor('cmm-ex-porcentaje');
  const cmmPorcentajePanel = cmmPor('cmm-ex-porcentaje-panel');
  const cmmTituloSeparacion = cmmPor('cmm-titulo-separar');
  const cmmAvisoExplosion = cmmPor('cmm-explosion-aviso');
  let cmmCamaraAntesDeSeparar = null;
  function cmmActualizarSeparacion() {
    const cmmValor = Math.round(cmmEstado.cmmExplosionValor * 100);
    cmmSeparacion.value = cmmSeparacionPanel.value = cmmValor;
    cmmPorcentaje.value = cmmPorcentajePanel.value = cmmValor + ' %';
    cmmSelectorExplosion.value = cmmEstado.cmmExplosionSistema;
    const cmmNombre = cmmSelectorExplosion.selectedOptions[0]?.textContent.toLowerCase();
    cmmTituloSeparacion.textContent = cmmEstado.cmmExplosionSistema === 'todo' || !cmmNombre
      ? 'Separar anatomía' : 'Separar ' + cmmNombre;
  }
  function cmmExplosionNecesitaEncuadre() {
    return cmmEscena.cmmSistemaSeparado() !== null || cmmEstado.cmmExplosionValor > 0.5;
  }

  function cmmEncuadrarExplosion() {
    const cmmLienzo = cmmPor('cmm-lienzo').getBoundingClientRect();
    const cmmPanelIzquierdo = cmmPanelHerramientas.classList.contains('cmm-oculto') ? cmmPor('cmm-sistemas') : cmmPanelHerramientas;
    const cmmPanelDerechoVisible = cmmPanelDerecho.classList.contains('cmm-oculto') ? cmmPor('cmm-camara') : cmmPanelDerecho;
    const cmmMargenX = Math.max(cmmPanelIzquierdo.getBoundingClientRect().right - cmmLienzo.left,
      cmmLienzo.right - cmmPanelDerechoVisible.getBoundingClientRect().left);
    const cmmMargenY = Math.max(cmmPor('cmm-cabecera').getBoundingClientRect().bottom - cmmLienzo.top,
      cmmLienzo.bottom - cmmPor('cmm-separar').getBoundingClientRect().top);
    const cmmAncho = Math.max(cmmLienzo.width - 2 * (cmmMargenX + 18), cmmLienzo.width * 0.18);
    const cmmAlto = Math.max(cmmLienzo.height - 2 * (cmmMargenY + 18), cmmLienzo.height * 0.35);
    cmmEscena.cmmEncuadrarExplosion(cmmAncho, cmmAlto);
  }

  function cmmFijarExplosion(cmmSistema, cmmValor, cmmAjustarCamara = true) {
    if (cmmValor > 0 && cmmEnModoEstudio()) {
      cmmActualizarSeparacion();
      return;
    }
    if (cmmValor > 0 && cmmEstado.cmmExplosionValor === 0) cmmCamaraAntesDeSeparar = cmmEscena.cmmCapturarCamara();
    cmmEstado.cmmExplosionSistema = cmmSistema;
    cmmEstado.cmmExplosionValor = cmmValor / 100;
    cmmEscena.cmmAplicar();
    cmmActualizarSeparacion();
    cmmSugerencia.classList.add('cmm-oculto');
    if (cmmValor === 0 && cmmCamaraAntesDeSeparar) {
      cmmEscena.cmmRestaurarCamara(cmmCamaraAntesDeSeparar);
      cmmCamaraAntesDeSeparar = null;
    } else if (cmmAjustarCamara && cmmExplosionNecesitaEncuadre()) {
      cmmFijarGiro(false);
      cmmEncuadrarExplosion();
    }
  }
  function cmmAplicarFiltroSistemas() {
    if (cmmEscena.cmmSistemaSeparado()) cmmFijarExplosion('todo', 0);
    else cmmEscena.cmmAplicar();
  }
  cmmSelectorExplosion.addEventListener('change', (cmmEv) => {
    const cmmSistema = cmmEv.target.value;
    cmmFijarExplosion(cmmSistema, cmmSistema === 'todo' ? cmmSeparacion.valueAsNumber : 100);
    cmmAbrirLaminaSiSeparado();
  });
  for (const cmmRango of [cmmSeparacion, cmmSeparacionPanel]) {
    cmmRango.addEventListener('input', () => cmmFijarExplosion(cmmEstado.cmmExplosionSistema, cmmRango.valueAsNumber, false));
    cmmRango.addEventListener('change', () => {
      if (!cmmExplosionNecesitaEncuadre()) return;
      cmmFijarGiro(false);
      cmmEncuadrarExplosion();
      cmmAbrirLaminaSiSeparado();
    });
  }
  window.addEventListener('resize', () => {
    if (cmmExplosionNecesitaEncuadre()) cmmEncuadrarExplosion();
  });
  cmmPor('cmm-ex-restablecer').addEventListener('click', () => cmmFijarExplosion(cmmEstado.cmmExplosionSistema, 0));
  cmmPor('cmm-ctx-activo').addEventListener('change', (cmmEv) => {
    cmmEstado.cmmContexto = cmmEv.target.checked;
    cmmEscena.cmmAplicar();
    cmmPintarDetalle();
  });
  function cmmAbrirLaminaEtiquetas() {
    const cmmSistema = cmmEstado.cmmExplosionValor > 0 ? cmmEstado.cmmExplosionSistema : 'todo';
    cmmLaminaEtiquetas.cmmAbrir(cmmSistema);
  }
  function cmmAbrirLaminaSiSeparado() {
    if (cmmEtiquetas.cmmActivas && cmmEstado.cmmExplosionValor === 1) cmmAbrirLaminaEtiquetas();
  }
  cmmPor('cmm-et-lamina-abrir').addEventListener('click', cmmAbrirLaminaEtiquetas);
  cmmPor('cmm-et-activo').addEventListener('change', (cmmEv) => {
    cmmEtiquetas.cmmConfigurar(cmmEv.target.checked, cmmPor('cmm-et-cantidad').valueAsNumber);
    cmmAbrirLaminaSiSeparado();
  });
  cmmPor('cmm-et-cantidad').addEventListener('input', (cmmEv) => {
    if (cmmEtiquetas.cmmActivas) cmmEtiquetas.cmmConfigurar(true, Number(cmmEv.target.value));
  });
  const cmmPlanoCorte = cmmPor('cmm-corte-eje');
  const cmmPosicionCorte = cmmPor('cmm-corte-posicion');
  const cmmPorcentajeCorte = cmmPor('cmm-corte-porcentaje');
  const cmmInvertirCorte = cmmPor('cmm-corte-invertido');
  const cmmQuitarCorte = cmmPor('cmm-corte-quitar');

  function cmmAplicarCorte() {
    const cmmSinCorte = cmmPlanoCorte.value === 'ninguno';
    cmmPosicionCorte.disabled = cmmSinCorte;
    cmmInvertirCorte.disabled = cmmSinCorte;
    cmmQuitarCorte.disabled = cmmSinCorte;
    cmmPorcentajeCorte.value = cmmPosicionCorte.value + ' %';
    cmmEscena.cmmFijarCorte(cmmPlanoCorte.value, Number(cmmPosicionCorte.value) / 100, cmmInvertirCorte.checked);
  }

  cmmPlanoCorte.addEventListener('change', cmmAplicarCorte);
  cmmPosicionCorte.addEventListener('input', cmmAplicarCorte);
  cmmInvertirCorte.addEventListener('change', cmmAplicarCorte);
  cmmQuitarCorte.addEventListener('click', () => {
    cmmPlanoCorte.value = 'ninguno';
    cmmAplicarCorte();
    cmmPlanoCorte.focus();
  });

  const cmmSelectorMazo = cmmPor('cmm-tar-mazo');
  cmmSelectorMazo.innerHTML = '<option value="hoy">Repaso de hoy</option><option value="confusas">Las que más confundo</option><option value="skeletal">Huesos</option><option value="muscular">Músculos</option><option value="organos">Órganos</option><option value="nervous">Sistema nervioso</option><option value="todo">Todo mezclado</option>';
  cmmPor('cmm-exa-iniciar').addEventListener('click', () => {
    cmmExamen.cmmIniciar({ cmmModo: cmmPor('cmm-exa-modo').value, cmmCategoria: cmmPor('cmm-exa-categoria').value, cmmTotal: Number(cmmPor('cmm-exa-total').value) });
  });
  cmmPor('cmm-tar-iniciar').addEventListener('click', () => cmmTarjetas.cmmIniciar(cmmSelectorMazo.value, []));
  function cmmSincronizarControles() {
    cmmMarcarRegion();
    cmmPor('cmm-rx-activo').checked = cmmEstado.cmmRayosX;
    cmmPor('cmm-rx-nivel').value = Math.round(cmmEstado.cmmNivelRayosX * 100);
    cmmPor('cmm-ctx-activo').checked = cmmEstado.cmmContexto;
    cmmActualizarSeparacion();
  }

  function cmmReiniciarTodo() {
    if (cmmExamen.cmmActivo) cmmExamen.cmmSalir();
    if (cmmTarjetas.cmmActivo) {
      cmmTarjetas.cmmActivo = false;
      cmmEscena.cmmResaltar([], false);
    }
    cmmFijarMedicion(false);
    cmmEscena.cmmLimpiarMedicion();
    cmmPlanoCorte.value = 'ninguno';
    cmmPosicionCorte.value = 50;
    cmmInvertirCorte.checked = false;
    cmmAplicarCorte();
    cmmEstado.cmmSistemas = new Set(CMM_SISTEMAS_INICIALES);
    cmmEstado.cmmRayosX = false;
    cmmEstado.cmmNivelRayosX = 0.16;
    cmmEstado.cmmSeleccion = new Set();
    cmmEstado.cmmFicha = null;
    cmmEstado.cmmAislar = false;
    cmmEstado.cmmContexto = false;
    cmmEstado.cmmRegion = null;
    cmmFijarDominio(false);
    cmmEstado.cmmResalte = new Set();
    cmmEstado.cmmAtenuar = false;
    cmmEstado.cmmExplosionSistema = 'todo';
    cmmEstado.cmmExplosionValor = 0;
    cmmCamaraAntesDeSeparar = null;
    cmmEtiquetas.cmmConfigurar(false);
    cmmPor('cmm-et-activo').checked = false;
    cmmPor('cmm-et-cantidad').value = cmmPor('cmm-et-cantidad').defaultValue;
    cmmCampoBusqueda.value = '';
    cmmResultados.classList.add('cmm-oculto');
    cmmSugerencia.classList.add('cmm-oculto');
    cmmFijarGiro(false);
    cmmSincronizarControles();
    cmmEscena.cmmAplicar();
    cmmPintarDetalle();
    cmmEscena.cmmRestaurarCamara(cmmCamaraInicial);
  }
  cmmPor('cmm-reiniciar-todo').addEventListener('click', cmmReiniciarTodo);

  const cmmListaVistas = cmmPor('cmm-vi-lista');
  const cmmAvisoVista = cmmPor('cmm-vi-aviso');
  function cmmPintarVistas() {
    if (!cmmVistas.cmmLista.length) {
      cmmListaVistas.innerHTML = '<li><span class="cmm-vacio">Aún no guardaste vistas.</span></li>';
      return;
    }
    cmmListaVistas.replaceChildren(...cmmVistas.cmmLista.map((cmmVista, cmmI) => {
      const cmmFila = document.createElement('li');
      const cmmCargar = document.createElement('button');
      cmmCargar.className = 'cmm-vista-nombre';
      cmmCargar.dataset.cmmVi = cmmI;
      cmmCargar.textContent = cmmVista.cmmNombre;
      const cmmFecha = document.createElement('small');
      cmmFecha.textContent = cmmVista.cmmFecha ?? '';
      const cmmBorrar = document.createElement('button');
      cmmBorrar.className = 'cmm-borrar';
      cmmBorrar.dataset.cmmViBorrar = cmmI;
      cmmBorrar.textContent = '✕';
      cmmBorrar.setAttribute('aria-label', 'Quitar vista ' + cmmVista.cmmNombre);
      cmmFila.append(cmmCargar, cmmFecha, cmmBorrar);
      return cmmFila;
    }));
  }
  cmmPor('cmm-vi-guardar').addEventListener('click', () => {
    const cmmCampo = cmmPor('cmm-vi-nombre');
    const cmmNombre = cmmCampo.value.trim() || 'Vista ' + (cmmVistas.cmmLista.length + 1);
    const cmmGuardada = cmmVistas.cmmAgregar(cmmNombre, {
      cmmCamara: cmmEscena.cmmCapturarCamara(),
      cmmSistemas: Array.from(cmmEstado.cmmSistemas),
      cmmRayosX: cmmEstado.cmmRayosX,
      cmmNivel: cmmEstado.cmmNivelRayosX,
      cmmSel: Array.from(cmmEstado.cmmSeleccion),
      cmmAislar: cmmEstado.cmmAislar,
      cmmContexto: cmmEstado.cmmContexto,
      cmmRegion: cmmEstado.cmmRegion ? cmmEstado.cmmRegion.cmmId : null,
      cmmExpSis: cmmEstado.cmmExplosionSistema,
      cmmExpVal: cmmEstado.cmmExplosionValor,
      cmmCamaraAntesDeSeparar,
      cmmCorte: [cmmPlanoCorte.value, cmmPosicionCorte.valueAsNumber, cmmInvertirCorte.checked],
      cmmEtiquetas: [cmmEtiquetas.cmmActivas, cmmPor('cmm-et-cantidad').valueAsNumber],
      cmmDominio: cmmEstado.cmmDominio
    });
    cmmAvisoVista.textContent = cmmGuardada ? 'Vista guardada.' : 'No se pudo guardar la vista en este equipo.';
    if (cmmGuardada) cmmCampo.value = '';
    cmmPintarVistas();
  });
  cmmListaVistas.addEventListener('click', (cmmEv) => {
    const cmmBorrar = cmmEv.target.closest('[data-cmm-vi-borrar]');
    if (cmmBorrar) {
      cmmAvisoVista.textContent = cmmVistas.cmmQuitar(Number(cmmBorrar.dataset.cmmViBorrar))
        ? 'Vista quitada.' : 'No se pudo quitar la vista.';
      cmmPintarVistas();
      return;
    }
    const cmmCargar = cmmEv.target.closest('[data-cmm-vi]');
    if (!cmmCargar) return;
    const cmmC = cmmVistas.cmmLista[Number(cmmCargar.dataset.cmmVi)]?.cmmContenido;
    if (!cmmC) return;
    cmmEstado.cmmSistemas = new Set(Array.isArray(cmmC.cmmSistemas) ? cmmC.cmmSistemas.filter(cmmId => cmmCuentas[cmmId] > 0) : CMM_SISTEMAS_INICIALES);
    cmmEstado.cmmRayosX = cmmC.cmmRayosX === true;
    cmmEstado.cmmNivelRayosX = Number.isFinite(cmmC.cmmNivel) ? Math.min(.6, Math.max(.04, cmmC.cmmNivel)) : .16;
    cmmEstado.cmmSeleccion = new Set(Array.isArray(cmmC.cmmSel) ? cmmC.cmmSel.filter(cmmId => cmmEscena.cmmPorId.has(cmmId)) : []);
    cmmEstado.cmmFicha = null;
    cmmEstado.cmmAislar = cmmC.cmmAislar === true && cmmEstado.cmmSeleccion.size > 0;
    cmmEstado.cmmContexto = cmmC.cmmContexto === true;
    cmmEstado.cmmRegion = cmmC.cmmRegion ? CMM_REGIONES.find((cmmR) => cmmR.cmmId === cmmC.cmmRegion) : null;
    cmmEstado.cmmExplosionSistema = cmmCuentas[cmmC.cmmExpSis] > 0 ? cmmC.cmmExpSis : 'todo';
    cmmEstado.cmmExplosionValor = Number.isFinite(cmmC.cmmExpVal) ? Math.min(1, Math.max(0, cmmC.cmmExpVal)) : 0;
    cmmCamaraAntesDeSeparar = cmmEstado.cmmExplosionValor > 0
      ? (cmmCamaraValida(cmmC.cmmCamaraAntesDeSeparar) ? cmmC.cmmCamaraAntesDeSeparar : cmmCamaraInicial) : null;
    const [cmmEje, cmmPosicion, cmmInvertido] = Array.isArray(cmmC.cmmCorte) ? cmmC.cmmCorte : [];
    cmmPlanoCorte.value = [...cmmPlanoCorte.options].some(cmmOpcion => cmmOpcion.value === cmmEje) ? cmmEje : 'ninguno';
    cmmPosicionCorte.value = Number.isFinite(cmmPosicion) ? cmmPosicion : 50;
    cmmInvertirCorte.checked = cmmInvertido === true;
    cmmAplicarCorte();
    const [cmmFlotantes, cmmCantidad] = Array.isArray(cmmC.cmmEtiquetas) ? cmmC.cmmEtiquetas : [];
    cmmPor('cmm-et-activo').checked = cmmFlotantes === true;
    const cmmControlCantidad = cmmPor('cmm-et-cantidad');
    cmmControlCantidad.value = Number.isFinite(cmmCantidad) ? cmmCantidad : cmmControlCantidad.defaultValue;
    cmmEtiquetas.cmmConfigurar(cmmFlotantes === true, cmmControlCantidad.valueAsNumber);
    cmmEstado.cmmDominio = cmmC.cmmDominio === true;
    cmmControlDominio.checked = cmmEstado.cmmDominio;
    cmmLeyendaDominio.hidden = !cmmEstado.cmmDominio;
    cmmFijarGiro(false);
    cmmSincronizarControles();
    cmmEscena.cmmAplicar();
    cmmEscena.cmmRestaurarCamara(cmmC.cmmCamara);
    cmmPintarDetalle();
    cmmAvisoVista.textContent = 'Vista cargada.';
  });

  const cmmCampoBusqueda = cmmPor('cmm-busqueda');
  const cmmResultados = cmmPor('cmm-resultados');
  const cmmIndiceBusqueda = Array.from(cmmEscena.cmmPorNombre.keys()).map((cmmEn) => {
    const cmmP = cmmEscena.cmmPorNombre.get(cmmEn)[0];
    return { cmmEn: cmmEn, cmmNombre: cmmP.cmmNombre, cmmTexto: cmmSinTildes(cmmP.cmmNombre + ' ' + cmmEn), cmmSistema: cmmP.cmmSistema };
  });
  let cmmUltimosResultados = [];
  function cmmBuscar() {
    const cmmTermino = cmmSinTildes(cmmCampoBusqueda.value.trim());
    if (!cmmTermino) {
      cmmUltimosResultados = [];
      cmmResultados.classList.add('cmm-oculto');
      return;
    }
    cmmUltimosResultados = cmmIndiceBusqueda
      .filter((cmmI) => cmmI.cmmTexto.includes(cmmTermino))
      .sort((cmmA, cmmB) => cmmA.cmmNombre.length - cmmB.cmmNombre.length)
      .slice(0, 40);
    cmmResultados.innerHTML = cmmUltimosResultados.length
      ? cmmUltimosResultados.map((cmmI, cmmN) => `<li><button data-cmm-res="${cmmN}">${cmmI.cmmNombre}<small>${CMM_SISTEMAS.find((cmmS) => cmmS.cmmId === cmmI.cmmSistema).cmmNombre}</small></button></li>`).join('')
      : '<li><span>Sin resultados</span></li>';
    cmmResultados.classList.remove('cmm-oculto');
  }
  function cmmElegirResultado(cmmN) {
    const cmmR = cmmUltimosResultados[cmmN];
    if (!cmmR || cmmEnModoEstudio()) return;
    cmmEstado.cmmAislar = false;
    cmmSeleccionarGrupo(cmmR.cmmEn, true);
    cmmResultados.classList.add('cmm-oculto');
    cmmCampoBusqueda.blur();
  }
  cmmCampoBusqueda.addEventListener('input', cmmBuscar);
  cmmCampoBusqueda.addEventListener('keydown', (cmmEv) => {
    if (cmmEv.key === 'Enter' && !cmmResultados.classList.contains('cmm-oculto')) cmmElegirResultado(0);
    if (cmmEv.key === 'Escape') cmmResultados.classList.add('cmm-oculto');
  });
  cmmResultados.addEventListener('click', (cmmEv) => {
    const cmmLi = cmmEv.target.closest('[data-cmm-res]');
    if (cmmLi) cmmElegirResultado(Number(cmmLi.dataset.cmmRes));
  });
  document.addEventListener('click', (cmmEv) => {
    if (!cmmEv.target.closest('.cmm-buscador')) cmmResultados.classList.add('cmm-oculto');
  });
  document.addEventListener('keydown', (cmmEv) => {
    if (document.querySelector('dialog[open]') || cmmEv.defaultPrevented) return;
    if (cmmEv.key === 'Escape' && !cmmPanelHerramientas.classList.contains('cmm-oculto')) {
      cmmMostrarHerramientas(false);
      cmmAbrirHerramientas.focus();
    }
    if (cmmEv.key === '/' && !cmmEv.ctrlKey && !cmmEv.metaKey && !cmmEv.altKey
      && !cmmCampoBusqueda.disabled && !cmmEv.target.closest('input, textarea, select, [contenteditable]')) {
      cmmEv.preventDefault();
      cmmCampoBusqueda.focus();
    }
  });

  const cmmModal = cmmPor('cmm-modal');
  cmmPor('cmm-creditos-abrir').addEventListener('click', () => cmmModal.showModal());
  cmmPor('cmm-creditos-cerrar').addEventListener('click', () => cmmModal.close());
  cmmPor('cmm-local-exportar').addEventListener('click', () => {
    const cmmAviso = cmmPor('cmm-local-aviso');
    try {
      const cmmJson = cmmExportarDatosLocales(localStorage);
      const cmmUrl = URL.createObjectURL(new Blob([cmmJson], { type: 'application/json' }));
      const cmmEnlace = document.createElement('a');
      cmmEnlace.href = cmmUrl;
      cmmEnlace.download = 'cmm-datos-locales.json';
      cmmEnlace.click();
      setTimeout(() => URL.revokeObjectURL(cmmUrl), 2000);
      cmmAviso.textContent = 'Archivo de datos preparado para descargar.';
    } catch {
      cmmAviso.textContent = 'No se pudieron preparar los datos locales.';
    }
  });
  cmmPor('cmm-local-borrar').addEventListener('click', () => {
    if (!window.confirm('¿Borrar monedas, récords, repasos, vistas, misiones y respaldos locales de Atlas?')) return;
    try {
      cmmBorrarDatosLocales(localStorage);
      window.location.reload();
    } catch {
      cmmPor('cmm-local-aviso').textContent = 'No se completó el borrado. Revisa los permisos del almacenamiento.';
    }
  });

  function cmmActualizarVisibilidad() {
    cmmEtiquetas.cmmMarcarPendiente();
    cmmSincronizarSistemas();
    const cmmVisibles = cmmPiezas.reduce((cmmTotal, cmmP) => cmmTotal + Number(cmmEscena.cmmOpacidadDe(cmmP) > 0), 0);
    const cmmTexto = cmmFormatoNumero.format(cmmVisibles) + (cmmVisibles === 1 ? ' pieza visible' : ' piezas visibles');
    if (cmmContadorVisible.textContent !== cmmTexto) cmmContadorVisible.textContent = cmmTexto;
    const cmmAviso = cmmEscena.cmmSistemaSeparado() ? 'Se muestra solo este sistema. Vuelve a 0 % para recuperar las capas anteriores.' : '';
    if (cmmAvisoExplosion.textContent !== cmmAviso) cmmAvisoExplosion.textContent = cmmAviso;
  }

  cmmEscena.cmmAlAplicar = cmmActualizarVisibilidad;
  cmmActualizarVisibilidad();

  cmmSincronizarControles();
  cmmPintarVistas();
  cmmPintarDetalle();
  cmmPaleta = new CMMPaleta(cmmEscena, { cmmPintarDetalle, cmmMarcarRegion, cmmReiniciarTodo, cmmFijarExplosion, cmmFijarVista,
    cmmMostrarPiezasSeleccionadas, cmmAplicarFiltroSistemas });
  new CMMRepaso(cmmProgreso, cmmClavesAnatomicas);
}

cmmArrancar();
