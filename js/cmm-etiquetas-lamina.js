import * as cmmTres from 'three';
import { CMM_SISTEMAS, cmmSinTildes } from './cmm-datos.js';

const CMM_ANCHO_MINIATURA = 160;
const CMM_ALTO_MINIATURA = 108;

export function cmmRegistrarTramosEtiquetas(cmmPiezas) {
  let cmmInicio = 0;
  return new Map(cmmPiezas.map(cmmPieza => {
    const cmmCantidad = cmmPieza.cmmIndices.length;
    const cmmTramo = { cmmInicio, cmmCantidad };
    cmmInicio += cmmCantidad;
    return [cmmPieza.cmmId, cmmTramo];
  }));
}

class CMMMiniaturasEtiquetas {
  constructor(cmmVisor, cmmTramos) {
    this.cmmRender = cmmVisor.cmmRender;
    this.cmmTramos = cmmTramos;
    this.cmmObjetivo = new cmmTres.WebGLRenderTarget(CMM_ANCHO_MINIATURA, CMM_ALTO_MINIATURA);
    this.cmmObjetivo.texture.colorSpace = cmmTres.SRGBColorSpace;
    this.cmmPixeles = new Uint8Array(CMM_ANCHO_MINIATURA * CMM_ALTO_MINIATURA * 4);
    this.cmmLienzo = document.createElement('canvas');
    this.cmmLienzo.width = CMM_ANCHO_MINIATURA;
    this.cmmLienzo.height = CMM_ALTO_MINIATURA;
    this.cmmContexto = this.cmmLienzo.getContext('2d');
    this.cmmImagen = this.cmmContexto.createImageData(CMM_ANCHO_MINIATURA, CMM_ALTO_MINIATURA);
    this.cmmCamara = new cmmTres.OrthographicCamera(-1, 1, 1, -1, .00001, 12);
    this.cmmEscena = new cmmTres.Scene();
    this.cmmEscena.add(new cmmTres.HemisphereLight(0xffffff, 0x939ca8, 1.9));
    const cmmLuz = new cmmTres.DirectionalLight(0xfff5e9, 2.1);
    cmmLuz.position.set(-2, 3, 4);
    this.cmmEscena.add(cmmLuz);
    const cmmMaterial = new cmmTres.MeshStandardMaterial({ roughness: .68, side: cmmTres.DoubleSide });
    this.cmmMalla = new cmmTres.Mesh(cmmVisor.cmmLote.cmmGeometria, cmmMaterial);
    this.cmmMalla.frustumCulled = false;
    this.cmmEscena.add(this.cmmMalla);
  }

  cmmDibujar(cmmPieza, cmmColor) {
    const cmmGeometria = this.cmmMalla.geometry;
    const { start: cmmInicioPrevio, count: cmmCantidadPrevia } = cmmGeometria.drawRange;
    const { cmmInicio, cmmCantidad } = this.cmmTramos.get(cmmPieza.cmmId);
    const cmmRender = this.cmmRender;
    const cmmObjetivoAnterior = cmmRender.getRenderTarget();
    const cmmColorAnterior = cmmRender.getClearColor(new cmmTres.Color());
    const cmmAlfaAnterior = cmmRender.getClearAlpha();
    const cmmRadio = Math.max(cmmPieza.cmmTamano / 2, .001);
    const cmmMitadAlto = cmmRadio * 1.08;
    const cmmMitadAncho = cmmMitadAlto * CMM_ANCHO_MINIATURA / CMM_ALTO_MINIATURA;
    this.cmmCamara.left = -cmmMitadAncho;
    this.cmmCamara.right = cmmMitadAncho;
    this.cmmCamara.top = cmmMitadAlto;
    this.cmmCamara.bottom = -cmmMitadAlto;
    this.cmmCamara.position.set(.22, .10, 1).setLength(cmmRadio * 3).add(cmmPieza.cmmCentro);
    this.cmmCamara.lookAt(cmmPieza.cmmCentro);
    this.cmmCamara.updateProjectionMatrix();
    this.cmmMalla.material.color.set(cmmColor);
    try {
      cmmGeometria.setDrawRange(cmmInicio, cmmCantidad);
      cmmRender.setRenderTarget(this.cmmObjetivo);
      cmmRender.setClearColor('#eaf0f3', 1);
      cmmRender.clear();
      cmmRender.render(this.cmmEscena, this.cmmCamara);
      cmmRender.readRenderTargetPixels(this.cmmObjetivo, 0, 0, CMM_ANCHO_MINIATURA, CMM_ALTO_MINIATURA, this.cmmPixeles);
    } finally {
      cmmGeometria.setDrawRange(cmmInicioPrevio, cmmCantidadPrevia);
      cmmRender.setRenderTarget(cmmObjetivoAnterior);
      cmmRender.setClearColor(cmmColorAnterior, cmmAlfaAnterior);
    }
    const cmmFila = CMM_ANCHO_MINIATURA * 4;
    for (let cmmY = 0; cmmY < CMM_ALTO_MINIATURA; cmmY++) {
      const cmmOrigen = (CMM_ALTO_MINIATURA - 1 - cmmY) * cmmFila;
      this.cmmImagen.data.set(this.cmmPixeles.subarray(cmmOrigen, cmmOrigen + cmmFila), cmmY * cmmFila);
    }
    this.cmmContexto.putImageData(this.cmmImagen, 0, 0);
    return this.cmmLienzo.toDataURL('image/png');
  }
}

export class CMMEtiquetasLamina {
  constructor(cmmVisor, cmmTramos, cmmDialogo, cmmVerPieza) {
    this.cmmVisor = cmmVisor;
    this.cmmTramos = cmmTramos;
    this.cmmDialogo = cmmDialogo;
    this.cmmSistema = cmmDialogo.querySelector('#cmm-et-lamina-sistema');
    this.cmmBusqueda = cmmDialogo.querySelector('#cmm-et-lamina-busqueda');
    this.cmmTotal = cmmDialogo.querySelector('#cmm-et-lamina-total');
    this.cmmLista = cmmDialogo.querySelector('#cmm-et-lamina-lista');
    this.cmmPendientes = new Set();
    this.cmmFrame = 0;
    this.cmmMiniaturas = null;
    const cmmNombres = new Set();
    this.cmmRepetidos = new Set();
    for (const cmmPieza of cmmVisor.cmmPiezas) {
      if (cmmNombres.has(cmmPieza.cmmNombre)) this.cmmRepetidos.add(cmmPieza.cmmNombre);
      cmmNombres.add(cmmPieza.cmmNombre);
    }
    const cmmComparar = new Intl.Collator('es', { numeric: true });
    this.cmmGrupos = CMM_SISTEMAS.map(cmmSistema => ({
      ...cmmSistema,
      cmmPiezas: cmmVisor.cmmPiezas.filter(cmmPieza => cmmPieza.cmmSistema === cmmSistema.cmmId)
        .sort((cmmA, cmmB) => cmmComparar.compare(cmmA.cmmNombre, cmmB.cmmNombre))
    })).filter(cmmGrupo => cmmGrupo.cmmPiezas.length);
    const cmmOpciones = this.cmmGrupos.map(cmmGrupo => new Option(cmmGrupo.cmmNombre, cmmGrupo.cmmId));
    this.cmmSistema.append(...cmmOpciones);
    this.cmmObservador = new IntersectionObserver(cmmEntradas => {
      for (const cmmEntrada of cmmEntradas) {
        if (cmmEntrada.isIntersecting) this.cmmPendientes.add(cmmEntrada.target);
        else this.cmmPendientes.delete(cmmEntrada.target);
      }
      this.cmmProgramar();
    }, { root: this.cmmLista });
    this.cmmSistema.addEventListener('change', () => this.cmmPintar());
    this.cmmBusqueda.addEventListener('input', () => this.cmmPintar());
    cmmDialogo.querySelector('#cmm-et-lamina-cerrar').addEventListener('click', () => cmmDialogo.close());
    cmmDialogo.addEventListener('close', () => {
      if (!cmmDialogo.open) this.cmmDetener();
    });
    this.cmmLista.addEventListener('click', cmmEvento => {
      const cmmBoton = cmmEvento.target.closest('[data-cmm-et-lamina-pieza]');
      if (!cmmBoton) return;
      cmmDialogo.close();
      cmmVerPieza(cmmVisor.cmmPorId.get(cmmBoton.dataset.cmmEtLaminaPieza));
    });
  }

  cmmAbrir(cmmSistema) {
    this.cmmSistema.value = cmmSistema;
    this.cmmBusqueda.value = '';
    this.cmmDialogo.showModal();
    this.cmmPintar();
  }

  cmmDetener() {
    this.cmmObservador.disconnect();
    this.cmmPendientes.clear();
    cancelAnimationFrame(this.cmmFrame);
    this.cmmFrame = 0;
  }

  cmmPintar() {
    this.cmmDetener();
    const cmmConsulta = cmmSinTildes(this.cmmBusqueda.value.trim());
    const cmmContenido = document.createDocumentFragment();
    const cmmImagenes = [];
    let cmmCantidad = 0;
    for (const cmmGrupo of this.cmmGrupos) {
      if (this.cmmSistema.value !== 'todo' && this.cmmSistema.value !== cmmGrupo.cmmId) continue;
      const cmmPiezas = cmmGrupo.cmmPiezas.filter(cmmPieza => !cmmConsulta
        || cmmSinTildes(cmmPieza.cmmNombre).includes(cmmConsulta) || cmmSinTildes(cmmPieza.cmmId).includes(cmmConsulta));
      if (!cmmPiezas.length) continue;
      const cmmSeccion = document.createElement('section');
      const cmmTitulo = document.createElement('h3');
      cmmTitulo.textContent = cmmGrupo.cmmNombre + ' · ' + cmmPiezas.length.toLocaleString('es-PE');
      const cmmRejilla = document.createElement('div');
      cmmRejilla.className = 'cmm-et-lamina-rejilla';
      for (const cmmPieza of cmmPiezas) {
        const cmmBoton = document.createElement('button');
        cmmBoton.type = 'button';
        cmmBoton.className = 'cmm-et-lamina-pieza';
        cmmBoton.dataset.cmmEtLaminaPieza = cmmPieza.cmmId;
        const cmmImagen = document.createElement('img');
        cmmImagen.alt = '';
        cmmImagen.dataset.cmmEtLaminaColor = cmmGrupo.cmmColor;
        const cmmNombre = document.createElement('span');
        cmmNombre.className = 'cmm-et-lamina-nombre';
        cmmNombre.textContent = cmmPieza.cmmNombre;
        cmmBoton.append(cmmImagen, cmmNombre);
        if (this.cmmRepetidos.has(cmmPieza.cmmNombre)) {
          const cmmCodigo = document.createElement('small');
          cmmCodigo.className = 'cmm-et-lamina-codigo';
          cmmCodigo.textContent = cmmPieza.cmmId;
          cmmBoton.appendChild(cmmCodigo);
        }
        cmmRejilla.append(cmmBoton);
        cmmImagenes.push(cmmImagen);
      }
      cmmSeccion.append(cmmTitulo, cmmRejilla);
      cmmContenido.append(cmmSeccion);
      cmmCantidad += cmmPiezas.length;
    }
    this.cmmLista.replaceChildren(cmmContenido);
    this.cmmLista.scrollTop = 0;
    this.cmmTotal.value = cmmCantidad === 0 ? 'No hay piezas que coincidan' :
      cmmCantidad.toLocaleString('es-PE') + (cmmCantidad === 1 ? ' pieza etiquetada' : ' piezas etiquetadas');
    for (const cmmImagen of cmmImagenes) this.cmmObservador.observe(cmmImagen);
  }

  cmmProgramar() {
    if (this.cmmFrame || !this.cmmPendientes.size || !this.cmmDialogo.open) return;
    this.cmmFrame = requestAnimationFrame(() => {
      this.cmmFrame = 0;
      if (!this.cmmDialogo.open) return;
      this.cmmMiniaturas ??= new CMMMiniaturasEtiquetas(this.cmmVisor, this.cmmTramos);
      for (const cmmImagen of Array.from(this.cmmPendientes).slice(0, 3)) {
        const cmmPieza = this.cmmVisor.cmmPorId.get(cmmImagen.parentElement.dataset.cmmEtLaminaPieza);
        cmmImagen.src = this.cmmMiniaturas.cmmDibujar(cmmPieza, cmmImagen.dataset.cmmEtLaminaColor);
        this.cmmPendientes.delete(cmmImagen);
        this.cmmObservador.unobserve(cmmImagen);
      }
      this.cmmProgramar();
    });
  }
}
