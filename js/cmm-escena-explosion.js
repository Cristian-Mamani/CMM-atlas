import { Box3 as CMMCaja, Vector3 as CMMVector } from 'three';
import { CMMEscena } from './cmm-escena.js';

export class CMMEscenaExplosion extends CMMEscena {
  cmmPuntoDentroDelCorte(cmmPosicion) {
    return this.cmmCorte.cmmEje === 'ninguno' || this.cmmLote.cmmPlanoCorte.distanceToPoint(cmmPosicion) >= 0;
  }

  cmmSistemaSeparado() {
    const { cmmExplosionSistema, cmmExplosionValor } = this.cmmEstado;
    return cmmExplosionValor > 0 && cmmExplosionSistema !== 'todo' ? cmmExplosionSistema : null;
  }

  cmmAplicar() {
    const cmmSistema = this.cmmSistemaSeparado();
    if (!cmmSistema) {
      super.cmmAplicar();
      return;
    }

    const cmmOriginal = this.cmmEstado;
    const cmmAlAplicar = this.cmmAlAplicar;
    const cmmFiltrar = (cmmIds) => new Set(Array.from(cmmIds).filter(
      (cmmId) => this.cmmPorId.get(cmmId)?.cmmSistema === cmmSistema));
    const cmmSeleccion = cmmFiltrar(cmmOriginal.cmmSeleccion);
    this.cmmEstado = {
      ...cmmOriginal,
      cmmSistemas: new Set([cmmSistema]),
      cmmSeleccion,
      cmmAislar: cmmOriginal.cmmAislar && cmmSeleccion.size > 0,
      cmmResalte: cmmFiltrar(cmmOriginal.cmmResalte)
    };
    this.cmmAlAplicar = null;
    try {
      super.cmmAplicar();
    } finally {
      this.cmmEstado = cmmOriginal;
      this.cmmAlAplicar = cmmAlAplicar;
    }
    this.cmmAlAplicar?.();
  }

  cmmEncuadrarExplosion(cmmAncho, cmmAlto) {
    const cmmCaja = new CMMCaja();
    for (const cmmPieza of this.cmmPiezas) {
      if (this.cmmOpacidadDe(cmmPieza) === 0) continue;
      const cmmDesplazamiento = this.cmmPosicionMundo(cmmPieza).sub(cmmPieza.cmmCentro);
      cmmCaja.union(cmmPieza.cmmCaja.clone().translate(cmmDesplazamiento));
    }
    if (cmmCaja.isEmpty()) return;

    const cmmCentro = cmmCaja.getCenter(new CMMVector());
    const cmmTamano = cmmCaja.getSize(new CMMVector());
    const cmmLienzo = this.cmmContenedor;
    const cmmTangente = Math.tan(this.cmmCamara.fov * Math.PI / 360);
    const cmmFactor = cmmLienzo.clientHeight / (2 * cmmTangente);
    const cmmDistancia = Math.max(cmmTamano.x * cmmFactor / cmmAncho, cmmTamano.y * cmmFactor / cmmAlto)
      + cmmTamano.z / 2;
    const cmmPosicion = cmmCentro.clone();
    cmmPosicion.z += Math.max(cmmDistancia, 0.16);
    this.cmmAnimar(cmmPosicion, cmmCentro, 320);
  }
}
