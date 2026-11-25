const CMM_SVG = 'http://www.w3.org/2000/svg';
const CMM_CONTROLES_ETIQUETAS = '#cmm-cabecera, #cmm-sistemas, #cmm-lateral, #cmm-camara, #cmm-derecha, #cmm-separar, '
  + '#cmm-herramientas-abrir, #cmm-reiniciar-todo, #cmm-repaso-hoy, #cmm-paleta-abrir, #cmm-resultados, #cmm-medir-aviso';

function cmmSolapa(cmmA, cmmB) {
  return cmmA.cmmIzq < cmmB.cmmDer && cmmA.cmmDer > cmmB.cmmIzq
    && cmmA.cmmArriba < cmmB.cmmAbajo && cmmA.cmmAbajo > cmmB.cmmArriba;
}

function cmmProbarHueco(cmmAncla, cmmMedida, cmmArea, cmmOcupados) {
  const { cmmX, cmmY } = cmmAncla;
  const { cmmAncho, cmmAlto } = cmmMedida;
  const cmmLado = cmmX < cmmArea.cmmAncho / 2 ? -1 : 1;
  const cmmDirecciones = [[cmmLado, 0], [-cmmLado, 0], [0, -1], [0, 1],
    [cmmLado, -1], [-cmmLado, -1], [cmmLado, 1], [-cmmLado, 1]];
  for (const cmmDistancia of [16, 34]) {
    for (const [cmmDirX, cmmDirY] of cmmDirecciones) {
      const cmmIzq = cmmX + cmmDirX * cmmDistancia - (1 - cmmDirX) * cmmAncho / 2;
      const cmmArriba = cmmY + cmmDirY * cmmDistancia - (1 - cmmDirY) * cmmAlto / 2;
      const cmmCaja = { cmmIzq, cmmArriba, cmmDer: cmmIzq + cmmAncho, cmmAbajo: cmmArriba + cmmAlto };
      if (cmmCaja.cmmIzq < 8 || cmmCaja.cmmDer > cmmArea.cmmAncho - 8
          || cmmCaja.cmmArriba < 8 || cmmCaja.cmmAbajo > cmmArea.cmmAlto - 8) continue;
      const cmmFinX = Math.max(cmmCaja.cmmIzq, Math.min(cmmX, cmmCaja.cmmDer));
      const cmmFinY = Math.max(cmmCaja.cmmArriba, Math.min(cmmY, cmmCaja.cmmAbajo));
      const cmmTramo = {
        cmmIzq: Math.min(cmmX, cmmFinX) - 3, cmmDer: Math.max(cmmX, cmmFinX) + 3,
        cmmArriba: Math.min(cmmY, cmmFinY) - 3, cmmAbajo: Math.max(cmmY, cmmFinY) + 3
      };
      if (cmmOcupados.some(cmmOtro => cmmSolapa(cmmCaja, cmmOtro) || cmmSolapa(cmmTramo, cmmOtro))) continue;
      return { cmmCaja, cmmTramo, cmmFinX, cmmFinY };
    }
  }
  return null;
}

export class CMMEtiquetas {
  constructor(cmmEscena, cmmCapa) {
    this.cmmEscena = cmmEscena;
    this.cmmCapa = cmmCapa;
    this.cmmActivas = false;
    this.cmmCantidad = 14;
    this.cmmPendiente = true;
    this.cmmCandidatas = [];
    this.cmmElementos = [];
    this.cmmMedidas = new Map();
    this.cmmControles = [];
    this.cmmSvg = document.createElementNS(CMM_SVG, 'svg');
    this.cmmSvg.setAttribute('aria-hidden', 'true');
    this.cmmMedidor = document.createElement('span');
    this.cmmMedidor.className = 'cmm-medidor-etiqueta';
    this.cmmMedidor.setAttribute('aria-hidden', 'true');
    this.cmmCapa.append(this.cmmSvg, this.cmmMedidor);
    this.cmmObservador = new ResizeObserver(() => this.cmmEscena.cmmMarcar());
  }

  cmmConfigurar(cmmActivas, cmmCantidad = this.cmmCantidad) {
    if (cmmActivas && !this.cmmActivas) {
      this.cmmControles = Array.from(document.querySelectorAll(CMM_CONTROLES_ETIQUETAS));
      this.cmmObservador.observe(this.cmmCapa);
      for (const cmmControl of this.cmmControles) this.cmmObservador.observe(cmmControl);
    }
    this.cmmActivas = cmmActivas;
    this.cmmCantidad = cmmCantidad;
    this.cmmEscena.cmmMarcar();
    if (!cmmActivas) {
      this.cmmObservador.disconnect();
      this.cmmLimpiar();
    }
  }

  cmmMarcarPendiente() {
    this.cmmPendiente = true;
  }

  cmmLimpiar() {
    for (const cmmE of this.cmmElementos) cmmE.cmmDiv.remove();
    this.cmmSvg.replaceChildren();
    this.cmmElementos = [];
    this.cmmPendiente = true;
  }

  cmmElegir() {
    const cmmSeleccion = this.cmmEscena.cmmEstado.cmmSeleccion;
    this.cmmCandidatas = this.cmmEscena.cmmPiezas
      .filter(cmmPieza => this.cmmEscena.cmmOpacidadDe(cmmPieza) >= 0.5)
      .sort((cmmA, cmmB) => Number(cmmSeleccion.has(cmmB.cmmId)) - Number(cmmSeleccion.has(cmmA.cmmId))
        || cmmB.cmmTamano - cmmA.cmmTamano);
    this.cmmPendiente = false;
  }

  cmmObtenerMedida(cmmNombre) {
    if (!this.cmmMedidas.has(cmmNombre)) {
      this.cmmMedidor.textContent = cmmNombre;
      const cmmRect = this.cmmMedidor.getBoundingClientRect();
      this.cmmMedidas.set(cmmNombre, { cmmAncho: cmmRect.width, cmmAlto: cmmRect.height });
    }
    return this.cmmMedidas.get(cmmNombre);
  }

  cmmDistribuir(cmmRect) {
    const cmmArea = { cmmAncho: cmmRect.width, cmmAlto: cmmRect.height };
    const cmmOcupados = [];
    for (const cmmControl of this.cmmControles) {
      const cmmR = cmmControl.getBoundingClientRect();
      if (!cmmR.width || !cmmR.height) continue;
      cmmOcupados.push({
        cmmIzq: cmmR.left - cmmRect.left - 6, cmmDer: cmmR.right - cmmRect.left + 6,
        cmmArriba: cmmR.top - cmmRect.top - 6, cmmAbajo: cmmR.bottom - cmmRect.top + 6
      });
    }

    const cmmNombres = new Set();
    const cmmColocadas = [];
    for (const cmmPieza of this.cmmCandidatas) {
      if (cmmColocadas.length >= this.cmmCantidad) break;
      if (cmmNombres.has(cmmPieza.cmmNombreEn)) continue;
      const cmmPosicion = this.cmmEscena.cmmPosicionMundo(cmmPieza);
      if (!this.cmmEscena.cmmPuntoDentroDelCorte(cmmPosicion)) continue;
      const cmmAncla = this.cmmEscena.cmmProyectar(cmmPosicion);
      if (cmmAncla.cmmZ < -1 || cmmAncla.cmmZ > 1 || cmmAncla.cmmX < 6 || cmmAncla.cmmX > cmmArea.cmmAncho - 6
          || cmmAncla.cmmY < 6 || cmmAncla.cmmY > cmmArea.cmmAlto - 6) continue;
      if (cmmColocadas.some(cmmE => Math.hypot(cmmAncla.cmmX - cmmE.cmmAncla.cmmX, cmmAncla.cmmY - cmmE.cmmAncla.cmmY) < 22)) continue;
      const cmmHueco = cmmProbarHueco(cmmAncla, this.cmmObtenerMedida(cmmPieza.cmmNombre), cmmArea, cmmOcupados);
      if (!cmmHueco) continue;
      cmmNombres.add(cmmPieza.cmmNombreEn);
      const { cmmCaja, cmmTramo } = cmmHueco;
      cmmOcupados.push({ cmmIzq: cmmCaja.cmmIzq - 4, cmmDer: cmmCaja.cmmDer + 4,
        cmmArriba: cmmCaja.cmmArriba - 4, cmmAbajo: cmmCaja.cmmAbajo + 4 }, cmmTramo);
      cmmColocadas.push({ cmmPieza, cmmAncla, ...cmmHueco });
    }
    return cmmColocadas;
  }

  cmmCrearElemento() {
    const cmmDiv = document.createElement('div');
    cmmDiv.className = 'cmm-etiqueta';
    const cmmLinea = document.createElementNS(CMM_SVG, 'line');
    const cmmPunto = document.createElementNS(CMM_SVG, 'circle');
    cmmPunto.setAttribute('r', '2.5');
    this.cmmCapa.appendChild(cmmDiv);
    this.cmmSvg.append(cmmLinea, cmmPunto);
    this.cmmElementos.push({ cmmDiv, cmmLinea, cmmPunto });
  }

  cmmActualizar() {
    if (!this.cmmActivas) return;
    if (this.cmmPendiente) this.cmmElegir();
    const cmmColocadas = this.cmmDistribuir(this.cmmCapa.getBoundingClientRect());
    while (this.cmmElementos.length < cmmColocadas.length) this.cmmCrearElemento();
    this.cmmElementos.forEach(({ cmmDiv, cmmLinea, cmmPunto }, cmmI) => {
      const cmmEtiqueta = cmmColocadas[cmmI];
      for (const cmmNodo of [cmmDiv, cmmLinea, cmmPunto]) cmmNodo.toggleAttribute('hidden', !cmmEtiqueta);
      if (!cmmEtiqueta) return;
      const { cmmPieza, cmmAncla, cmmCaja, cmmFinX, cmmFinY } = cmmEtiqueta;
      if (cmmDiv.textContent !== cmmPieza.cmmNombre) cmmDiv.textContent = cmmPieza.cmmNombre;
      cmmDiv.dataset.cmmEtPieza = cmmPieza.cmmId;
      cmmDiv.style.left = cmmCaja.cmmIzq + 'px';
      cmmDiv.style.top = cmmCaja.cmmArriba + 'px';
      cmmLinea.setAttribute('x1', cmmAncla.cmmX);
      cmmLinea.setAttribute('y1', cmmAncla.cmmY);
      cmmLinea.setAttribute('x2', cmmFinX);
      cmmLinea.setAttribute('y2', cmmFinY);
      cmmPunto.setAttribute('cx', cmmAncla.cmmX);
      cmmPunto.setAttribute('cy', cmmAncla.cmmY);
    });
  }
}
