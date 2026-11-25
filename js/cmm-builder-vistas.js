import * as cmmTres from 'three';
import { cmmCargarBloquesBuilder, cmmMallaBuilder } from './cmm-builder-piezas.js';

const CMM_MAXIMO_VISTAS_CATALOGO = 32;

export class CMMVistasCatalogo {
  cmmImagenes = new Map();
  cmmObservador = null;
  cmmCarga = null;
  cmmRender = null;

  cmmObservar(cmmRaiz, cmmAtlas, cmmRetos) {
    this.cmmDetener();
    const cmmPorId = new Map(cmmRetos.map((cmmReto) => [cmmReto.cmmId, cmmReto]));
    const cmmPendientes = [];
    const cmmCarga = new AbortController();
    const { signal: cmmSignal } = cmmCarga;
    this.cmmCarga = cmmCarga;
    let cmmOcupado = false;
    const cmmProcesar = async () => {
      if (cmmOcupado) return;
      cmmOcupado = true;
      while (!cmmSignal.aborted && cmmPendientes.length) {
        const cmmImagen = cmmPendientes.shift();
        const cmmId = cmmImagen.dataset.cmmBuilderMiniatura;
        try {
          if (!this.cmmImagenes.has(cmmId)) {
            const cmmReto = cmmPorId.get(cmmId);
            const cmmBloques = await cmmCargarBloquesBuilder(cmmAtlas, cmmReto.cmmPiezas, cmmSignal);
            if (cmmSignal.aborted) break;
            this.cmmImagenes.set(cmmId, this.cmmDibujar(cmmReto, cmmBloques));
            if (this.cmmImagenes.size > CMM_MAXIMO_VISTAS_CATALOGO) this.cmmImagenes.delete(this.cmmImagenes.keys().next().value);
          }
          cmmImagen.src = this.cmmImagenes.get(cmmId);
        } catch (cmmError) {
          if (!cmmSignal.aborted) console.warn('Miniatura del Builder no disponible para ' + cmmId, cmmError);
        }
      }
      cmmOcupado = false;
    };
    this.cmmObservador = new IntersectionObserver((cmmEntradas, cmmObservador) => {
      for (const cmmEntrada of cmmEntradas) {
        if (!cmmEntrada.isIntersecting) continue;
        cmmObservador.unobserve(cmmEntrada.target);
        cmmPendientes.push(cmmEntrada.target);
      }
      void cmmProcesar();
    });
    for (const cmmImagen of cmmRaiz.querySelectorAll('[data-cmm-builder-miniatura]')) this.cmmObservador.observe(cmmImagen);
  }

  cmmDibujar(cmmReto, cmmBloques) {
    this.cmmRender ??= new cmmTres.WebGLRenderer({ antialias: true });
    const cmmRender = this.cmmRender;
    cmmRender.setSize(220, 110, false);
    cmmRender.setClearColor('#eaf0f3');
    const cmmEscena = new cmmTres.Scene();
    cmmEscena.add(new cmmTres.HemisphereLight(0xffffff, 0x75869d, 2.2));
    const cmmLuz = new cmmTres.DirectionalLight(0xffffff, 2);
    cmmLuz.position.set(0, 1, 4);
    cmmEscena.add(cmmLuz);
    const cmmMallas = new cmmTres.Group();
    cmmEscena.add(cmmMallas);
    try {
      for (const cmmPieza of cmmReto.cmmPiezas.filter((cmmPieza) => !cmmPieza.cmmEsIntrusa)) {
        const cmmMaterial = new cmmTres.MeshStandardMaterial({ color: cmmPieza.cmmSistema?.cmmColor ?? '#ccc', roughness: .62, side: cmmTres.DoubleSide });
        cmmMallas.add(cmmMallaBuilder(cmmPieza, cmmBloques.get(cmmPieza.cmmDato.chunk), cmmMaterial));
      }
      const cmmEsfera = new cmmTres.Box3().setFromObject(cmmMallas).getBoundingSphere(new cmmTres.Sphere());
      const cmmCamara = new cmmTres.PerspectiveCamera(34, 2, .0001, 20);
      cmmCamara.position.set(.27, .1, 1).setLength(cmmEsfera.radius * 4.1).add(cmmEsfera.center);
      cmmCamara.lookAt(cmmEsfera.center);
      cmmRender.render(cmmEscena, cmmCamara);
      return cmmRender.domElement.toDataURL('image/png');
    } finally {
      for (const cmmMalla of cmmMallas.children) {
        cmmMalla.geometry.dispose();
        cmmMalla.material.dispose();
      }
    }
  }

  cmmDetener() {
    this.cmmObservador?.disconnect();
    this.cmmCarga?.abort();
    this.cmmObservador = null;
    this.cmmCarga = null;
  }

  cmmCerrar() {
    this.cmmDetener();
    this.cmmRender?.dispose();
    this.cmmRender?.forceContextLoss();
    this.cmmRender = null;
  }
}
