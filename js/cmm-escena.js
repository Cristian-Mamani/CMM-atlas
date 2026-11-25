import * as cmmTres from 'three';
import { OrbitControls as CMMOrbita } from 'three/addons/controls/OrbitControls.js';
import { CMM_SISTEMAS, CMM_SISTEMAS_INICIALES, CMM_CAPAS_EXTERNAS } from './cmm-datos.js';
import { CMMLote } from './cmm-lote.js';
import { cmmCalcularDisposicion } from './cmm-disposicion.js';

const CMM_TONOS_DOMINIO = {
  dominada: new cmmTres.Color('#3f9d6a'),
  practica: new cmmTres.Color('#e0a526'),
  pendiente: new cmmTres.Color('#9aa5ad')
};
const CMM_EMISION_NULA = new cmmTres.Color(0x000000);
const CMM_EMISION_SELECCION = new cmmTres.Color(0xff7a00);
const CMM_EMISION_RESALTE = new cmmTres.Color(0x00a8ff);
const CMM_OBJETIVO_CAMARA = new cmmTres.Vector3(0, 0.74, 0);
const CMM_LIMITES_CORTE = {
  transversal: { cmmNormal: [0, 1, 0], cmmMin: -0.02, cmmMax: 1.8 },
  sagital: { cmmNormal: [1, 0, 0], cmmMin: -0.9, cmmMax: 0.9 },
  coronal: { cmmNormal: [0, 0, 1], cmmMin: -0.3, cmmMax: 0.3 }
};
const CMM_PUNTOS_VISTA = {
  tres: [1.7, 1.0, 4.2],
  frente: [0, 0.9, 4.6],
  lado: [4.6, 0.9, 0],
  espalda: [0, 0.9, -4.6]
};

function cmmCrearHalo(cmmInterior, cmmExterior) {
  const cmmLienzo = document.createElement('canvas');
  cmmLienzo.width = 256;
  cmmLienzo.height = 256;
  const cmmCtx = cmmLienzo.getContext('2d');
  const cmmGradiente = cmmCtx.createRadialGradient(128, 128, 0, 128, 128, 128);
  cmmGradiente.addColorStop(0, cmmInterior);
  cmmGradiente.addColorStop(1, cmmExterior);
  cmmCtx.fillStyle = cmmGradiente;
  cmmCtx.fillRect(0, 0, 256, 256);
  const cmmTextura = new cmmTres.CanvasTexture(cmmLienzo);
  cmmTextura.colorSpace = cmmTres.SRGBColorSpace;
  return cmmTextura;
}

function cmmCrearPlanoHalo(cmmLado, cmmTextura, cmmAltura, cmmOrden) {
  const cmmPlano = new cmmTres.Mesh(
    new cmmTres.PlaneGeometry(cmmLado, cmmLado),
    new cmmTres.MeshBasicMaterial({ map: cmmTextura, transparent: true, depthWrite: false })
  );
  cmmPlano.rotation.x = -Math.PI / 2;
  cmmPlano.position.y = cmmAltura;
  cmmPlano.renderOrder = cmmOrden;
  return cmmPlano;
}

export class CMMEscena {
  constructor(cmmContenedor, cmmPiezas, cmmProgreso) {
    this.cmmContenedor = cmmContenedor;
    this.cmmPiezas = cmmPiezas;
    this.cmmProgreso = cmmProgreso;
    this.cmmPorId = new Map();
    this.cmmPorNombre = new Map();
    this.cmmColores = new Map(CMM_SISTEMAS.map((cmmS) => [cmmS.cmmId, new cmmTres.Color(cmmS.cmmColor)]));
    this.cmmEstado = {
      cmmSistemas: new Set(CMM_SISTEMAS_INICIALES),
      cmmRayosX: false,
      cmmNivelRayosX: 0.16,
      cmmSeleccion: new Set(),
      cmmAislar: false,
      cmmContexto: false,
      cmmRegion: null,
      cmmDominio: false,
      cmmResalte: new Set(),
      cmmAtenuar: false,
      cmmExplosionSistema: 'todo',
      cmmExplosionValor: 0
    };
    this.cmmSucio = true;
    this.cmmAlTocar = null;
    this.cmmAlPasar = null;
    this.cmmAlRenderizar = null;
    this.cmmAlAplicar = null;
    this.cmmTween = null;
    this.cmmInicioPuntero = null;
    this.cmmUltimoHover = 0;
    this.cmmCorte = { cmmEje: 'ninguno', cmmValor: 0.5, cmmInvertido: false };
    this.cmmMedicion = { cmmActiva: false, cmmPuntos: [], cmmDistancia: null };
    this.cmmAlMedir = null;
    this.cmmZoomResto = 0;
    this.cmmZoomPunto = new cmmTres.Vector3();
    this.cmmRayoZoom = new cmmTres.Raycaster();
    this.cmmDisposicion = null;
    this.cmmClaveDisposicion = '';

    cmmPiezas.forEach((cmmP, cmmK) => {
      this.cmmPorId.set(cmmP.cmmId, cmmP);
      if (!this.cmmPorNombre.has(cmmP.cmmNombreEn)) this.cmmPorNombre.set(cmmP.cmmNombreEn, []);
      this.cmmPorNombre.get(cmmP.cmmNombreEn).push(cmmP);
    });
    this.cmmOpacidades = new Float32Array(cmmPiezas.length);
    this.cmmDesplazamientos = new Float32Array(cmmPiezas.length * 3);

    this.cmmRender = new cmmTres.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.cmmRender.setPixelRatio(Math.min(Math.max(window.devicePixelRatio, 1.5), 2));
    this.cmmRender.setClearColor('#eff1f2');
    this.cmmRender.localClippingEnabled = true;
    this.cmmRender.outputColorSpace = cmmTres.SRGBColorSpace;
    this.cmmRender.toneMapping = cmmTres.ACESFilmicToneMapping;
    this.cmmRender.toneMappingExposure = 1.1;
    cmmContenedor.appendChild(this.cmmRender.domElement);

    this.cmmEscena = new cmmTres.Scene();
    this.cmmCamara = new cmmTres.PerspectiveCamera(32, 1, 0.01, 80);
    this.cmmCamara.position.fromArray(CMM_PUNTOS_VISTA.tres);
    this.cmmControles = new CMMOrbita(this.cmmCamara, this.cmmRender.domElement);
    this.cmmControles.target.copy(CMM_OBJETIVO_CAMARA);
    this.cmmControles.enableDamping = true;
    this.cmmControles.dampingFactor = 0.08;
    this.cmmControles.minDistance = 0.08;
    this.cmmControles.maxDistance = 30;
    this.cmmControles.autoRotateSpeed = 1.4;
    this.cmmControles.update();

    this.cmmPrepararEntorno();
    this.cmmPrepararLuces();
    this.cmmPrepararEscenario();

    this.cmmLote = new CMMLote(cmmPiezas);
    this.cmmEscena.add(this.cmmLote.cmmOpaca);
    this.cmmEscena.add(this.cmmLote.cmmTranslucida);
    this.cmmEscena.add(this.cmmLote.cmmContorno);

    this.cmmPrepararCorte();
    this.cmmPrepararMedicion();
    this.cmmEnlazarEntradas();
    this.cmmEnlazarRueda();
    this.cmmObservador = new ResizeObserver(() => this.cmmAjustarTamano());
    this.cmmObservador.observe(cmmContenedor);
    this.cmmAjustarTamano();
    this.cmmAplicar();
    this.cmmBucle = this.cmmBucle.bind(this);
    requestAnimationFrame(this.cmmBucle);
  }

  cmmPrepararEntorno() {
    const cmmEstudio = new cmmTres.Scene();
    const cmmCupula = new cmmTres.SphereGeometry(12, 32, 18);
    const cmmPosiciones = cmmCupula.attributes.position;
    const cmmTonos = new Float32Array(cmmPosiciones.count * 3);
    const cmmArriba = new cmmTres.Color('#fbfcfd');
    const cmmHorizonte = new cmmTres.Color('#dde3e7');
    const cmmAbajo = new cmmTres.Color('#7f878d');
    const cmmMezcla = new cmmTres.Color();
    for (let cmmI = 0; cmmI < cmmPosiciones.count; cmmI++) {
      const cmmAltura = cmmPosiciones.getY(cmmI) / 12;
      if (cmmAltura >= 0) cmmMezcla.copy(cmmHorizonte).lerp(cmmArriba, cmmAltura);
      else cmmMezcla.copy(cmmHorizonte).lerp(cmmAbajo, -cmmAltura);
      cmmMezcla.toArray(cmmTonos, cmmI * 3);
    }
    cmmCupula.setAttribute('color', new cmmTres.BufferAttribute(cmmTonos, 3));
    cmmEstudio.add(new cmmTres.Mesh(cmmCupula, new cmmTres.MeshBasicMaterial({ vertexColors: true, side: cmmTres.BackSide })));
    const cmmPantallas = [
      { cmmPos: [-5, 5, 6], cmmTam: [6, 4], cmmBrillo: 7 },
      { cmmPos: [6, 2.5, 4], cmmTam: [3, 5], cmmBrillo: 3 },
      { cmmPos: [0, 6, -6], cmmTam: [7, 2], cmmBrillo: 4 }
    ];
    for (const cmmD of cmmPantallas) {
      const cmmMat = new cmmTres.MeshBasicMaterial({ side: cmmTres.DoubleSide });
      cmmMat.color.setScalar(cmmD.cmmBrillo);
      const cmmPantalla = new cmmTres.Mesh(new cmmTres.PlaneGeometry(cmmD.cmmTam[0], cmmD.cmmTam[1]), cmmMat);
      cmmPantalla.position.fromArray(cmmD.cmmPos);
      cmmPantalla.lookAt(0, 1, 0);
      cmmEstudio.add(cmmPantalla);
    }
    const cmmGenerador = new cmmTres.PMREMGenerator(this.cmmRender);
    this.cmmEscena.environment = cmmGenerador.fromScene(cmmEstudio, 0.03).texture;
    this.cmmEscena.environmentIntensity = 0.55;
    cmmGenerador.dispose();
  }

  cmmPrepararLuces() {
    this.cmmEscena.add(new cmmTres.HemisphereLight(0xf5f8fb, 0x98a0a7, 0.5));
    const cmmPrincipal = new cmmTres.DirectionalLight(0xfff2e4, 2.5);
    cmmPrincipal.position.set(-1.8, 3.4, 3.6);
    this.cmmEscena.add(cmmPrincipal);
    const cmmRelleno = new cmmTres.DirectionalLight(0xdce8f6, 0.7);
    cmmRelleno.position.set(2.8, 1.4, 2.4);
    this.cmmEscena.add(cmmRelleno);
    const cmmBorde = new cmmTres.DirectionalLight(0xffffff, 1.5);
    cmmBorde.position.set(0.6, 2.6, -3.4);
    this.cmmEscena.add(cmmBorde);
  }

  cmmPrepararEscenario() {
    this.cmmEscenario = new cmmTres.Group();
    this.cmmEscena.add(this.cmmEscenario);
    this.cmmEscenario.add(cmmCrearPlanoHalo(16, cmmCrearHalo('rgba(255,255,255,0.9)', 'rgba(255,255,255,0)'), -0.03, -3));
    this.cmmEscenario.add(cmmCrearPlanoHalo(1.5, cmmCrearHalo('rgba(70,80,90,0.2)', 'rgba(70,80,90,0)'), -0.012, -2));
    const cmmPlataforma = new cmmTres.Mesh(
      new cmmTres.CylinderGeometry(0.64, 0.66, 0.018, 96),
      new cmmTres.MeshStandardMaterial({ color: 0xf3f4f4, roughness: 0.8, metalness: 0.04 })
    );
    cmmPlataforma.position.y = -0.011;
    this.cmmEscenario.add(cmmPlataforma);
    const cmmAro = new cmmTres.Mesh(
      new cmmTres.RingGeometry(0.585, 0.59, 128),
      new cmmTres.MeshBasicMaterial({ color: 0x9aa3ab, transparent: true, opacity: 0.35, side: cmmTres.DoubleSide })
    );
    cmmAro.rotation.x = -Math.PI / 2;
    cmmAro.position.y = 0.0005;
    this.cmmEscenario.add(cmmAro);
  }

  cmmAjustarTamano() {
    const cmmAncho = Math.max(this.cmmContenedor.clientWidth, 10);
    const cmmAlto = Math.max(this.cmmContenedor.clientHeight, 10);
    this.cmmRender.setSize(cmmAncho, cmmAlto, false);
    const cmmBufer = this.cmmRender.getDrawingBufferSize(new cmmTres.Vector2());
    this.cmmLote.cmmFijarPixel(cmmBufer.x, cmmBufer.y);
    this.cmmCamara.aspect = cmmAncho / cmmAlto;
    this.cmmCamara.updateProjectionMatrix();
    this.cmmSucio = true;
  }

  cmmMarcar() {
    this.cmmSucio = true;
  }

  cmmOpacidadDe(cmmPieza) {
    return this.cmmOpacidades[cmmPieza.cmmOrden];
  }

  cmmPosicionMundo(cmmPieza) {
    const cmmD = cmmPieza.cmmOrden * 3;
    return cmmPieza.cmmCentro.clone().add(new cmmTres.Vector3(this.cmmDesplazamientos[cmmD], this.cmmDesplazamientos[cmmD + 1], this.cmmDesplazamientos[cmmD + 2]));
  }

  cmmVecinos() {
    const cmmCaja = new cmmTres.Box3();
    for (const cmmId of this.cmmEstado.cmmSeleccion) {
      const cmmP = this.cmmPorId.get(cmmId);
      if (cmmP) cmmCaja.union(cmmP.cmmCaja);
    }
    cmmCaja.expandByScalar(0.012);
    const cmmSalida = new Set();
    for (const cmmP of this.cmmPiezas) {
      if (!this.cmmEstado.cmmSeleccion.has(cmmP.cmmId) && cmmP.cmmCaja.intersectsBox(cmmCaja)) cmmSalida.add(cmmP.cmmId);
    }
    return cmmSalida;
  }

  cmmAplicar() {
    const cmmE = this.cmmEstado;
    const cmmHaySel = cmmE.cmmSeleccion.size > 0;
    const cmmHayRes = cmmE.cmmResalte.size > 0;
    const cmmVecinos = cmmHaySel && cmmE.cmmContexto && !cmmE.cmmAislar ? this.cmmVecinos() : null;
    for (const cmmP of this.cmmPiezas) {
      const cmmSel = cmmE.cmmSeleccion.has(cmmP.cmmId);
      const cmmRes = cmmE.cmmResalte.has(cmmP.cmmId);
      let cmmVisible = cmmE.cmmSistemas.has(cmmP.cmmSistema);
      let cmmOp = 1;
      if (cmmVisible && cmmE.cmmRegion && !cmmE.cmmRegion.cmmContiene(cmmP)) cmmOp = 0.05;
      if (cmmE.cmmRayosX && CMM_CAPAS_EXTERNAS.has(cmmP.cmmSistema)) cmmOp = Math.min(cmmOp, cmmE.cmmNivelRayosX);
      if (cmmHaySel && !cmmSel) {
        if (cmmE.cmmAislar) cmmVisible = false;
        else if (cmmE.cmmContexto) cmmOp = Math.min(cmmOp, cmmVecinos.has(cmmP.cmmId) ? 0.5 : 0.07);
      }
      if (cmmSel) {
        cmmVisible = true;
        cmmOp = 1;
      }
      if (cmmHayRes) {
        if (cmmRes) {
          cmmVisible = true;
          cmmOp = 1;
        } else if (cmmE.cmmAtenuar) {
          cmmOp = Math.min(cmmOp, 0.07);
        }
      }
      const cmmFinal = cmmVisible && cmmOp > 0.03 ? cmmOp : 0;
      this.cmmOpacidades[cmmP.cmmOrden] = cmmFinal;
      const cmmTono = cmmE.cmmDominio ? CMM_TONOS_DOMINIO[this.cmmProgreso.cmmEstado(cmmP.cmmNombreEn)] : this.cmmColores.get(cmmP.cmmSistema);
      let cmmEmision = CMM_EMISION_NULA;
      let cmmFuerza = 0;
      let cmmMarca = 0;
      if (cmmSel) {
        cmmEmision = CMM_EMISION_SELECCION;
        cmmFuerza = 0.95;
        cmmMarca = 1;
      } else if (cmmRes) {
        cmmEmision = CMM_EMISION_RESALTE;
        cmmFuerza = 0.85;
        cmmMarca = 2;
      }
      this.cmmLote.cmmFijarAspecto(cmmP.cmmOrden, cmmFinal, cmmTono, cmmEmision, cmmFuerza, cmmMarca);
    }
    this.cmmAplicarExplosion();
    if (this.cmmAlAplicar) this.cmmAlAplicar();
    this.cmmMarcar();
  }

  cmmAsegurarDisposicion() {
    const cmmE = this.cmmEstado;
    const cmmClave = cmmE.cmmExplosionSistema + '|' + Array.from(cmmE.cmmSistemas).sort().join(',');
    if (this.cmmDisposicion && cmmClave === this.cmmClaveDisposicion) return;
    this.cmmClaveDisposicion = cmmClave;
    this.cmmDisposicion = cmmCalcularDisposicion(this.cmmPiezas, (cmmP) => cmmE.cmmSistemas.has(cmmP.cmmSistema) && (cmmE.cmmExplosionSistema === 'todo' || cmmE.cmmExplosionSistema === cmmP.cmmSistema));
  }

  cmmAplicarExplosion() {
    const cmmE = this.cmmEstado;
    const cmmV = cmmE.cmmExplosionValor;
    const cmmRadial = Math.min(cmmV / 0.5, 1);
    const cmmLineal = Math.max((cmmV - 0.5) / 0.5, 0);
    const cmmPlano = cmmLineal * cmmLineal * (3 - 2 * cmmLineal);
    if (cmmPlano > 0) this.cmmAsegurarDisposicion();
    const cmmDestino = cmmPlano > 0 ? this.cmmDisposicion.cmmDesp : null;
    for (const cmmP of this.cmmPiezas) {
      const cmmK = cmmP.cmmOrden * 3;
      let cmmX = 0;
      let cmmY = 0;
      let cmmZ = 0;
      const cmmActiva = cmmV > 0 && (cmmE.cmmExplosionSistema === 'todo' || cmmE.cmmExplosionSistema === cmmP.cmmSistema);
      if (cmmActiva) {
        const cmmEscala = 0.45 * cmmRadial;
        cmmX = cmmP.cmmDireccion.x * cmmEscala;
        cmmY = cmmP.cmmDireccion.y * cmmEscala;
        cmmZ = cmmP.cmmDireccion.z * cmmEscala;
        if (cmmDestino && cmmE.cmmSistemas.has(cmmP.cmmSistema)) {
          cmmX += (cmmDestino[cmmK] - cmmX) * cmmPlano;
          cmmY += (cmmDestino[cmmK + 1] - cmmY) * cmmPlano;
          cmmZ += (cmmDestino[cmmK + 2] - cmmZ) * cmmPlano;
        }
      }
      this.cmmDesplazamientos[cmmK] = cmmX;
      this.cmmDesplazamientos[cmmK + 1] = cmmY;
      this.cmmDesplazamientos[cmmK + 2] = cmmZ;
      this.cmmLote.cmmFijarDesplazamiento(cmmP.cmmOrden, cmmX, cmmY, cmmZ);
    }
    this.cmmLote.cmmSubir();
    this.cmmEscenario.visible = cmmV < 0.5;
    if (cmmPlano > 0) this.cmmAlejarSiHaceFalta(cmmPlano);
    this.cmmMarcar();
  }

  cmmAlejarSiHaceFalta(cmmPlano) {
    const cmmD = this.cmmDisposicion;
    const cmmMitadAncho = 0.75 + (cmmD.cmmMedioAncho * 1.3 - 0.75) * cmmPlano;
    const cmmMitadAlto = 1 + (cmmD.cmmMedioAlto * 1.3 - 1) * cmmPlano;
    const cmmTangente = Math.tan((this.cmmCamara.fov * Math.PI) / 360);
    const cmmNecesaria = Math.max(cmmMitadAlto / cmmTangente, cmmMitadAncho / (cmmTangente * this.cmmCamara.aspect));
    const cmmDir = this.cmmCamara.position.clone().sub(this.cmmControles.target);
    if (cmmDir.length() < cmmNecesaria) this.cmmCamara.position.copy(this.cmmControles.target).add(cmmDir.normalize().multiplyScalar(cmmNecesaria));
  }

  cmmSeleccionar(cmmIds) {
    this.cmmEstado.cmmSeleccion = new Set(cmmIds);
    this.cmmEstado.cmmFicha = null;
    this.cmmAplicar();
  }

  cmmResaltar(cmmIds, cmmAtenuar) {
    this.cmmEstado.cmmResalte = new Set(cmmIds);
    this.cmmEstado.cmmAtenuar = cmmAtenuar;
    this.cmmAplicar();
  }

  cmmAnimar(cmmPosicion, cmmObjetivo, cmmDuracion) {
    this.cmmZoomResto = 0;
    this.cmmTween = {
      cmmP0: this.cmmCamara.position.clone(),
      cmmO0: this.cmmControles.target.clone(),
      cmmP1: cmmPosicion,
      cmmO1: cmmObjetivo,
      cmmInicio: performance.now(),
      cmmDuracion: cmmDuracion
    };
  }

  cmmEnfocar(cmmIds, cmmDuracion) {
    const cmmCaja = new cmmTres.Box3();
    let cmmHay = false;
    for (const cmmId of cmmIds) {
      const cmmP = this.cmmPorId.get(cmmId);
      if (!cmmP) continue;
      const cmmD = cmmP.cmmOrden * 3;
      cmmCaja.union(cmmP.cmmCaja.clone().translate(new cmmTres.Vector3(this.cmmDesplazamientos[cmmD], this.cmmDesplazamientos[cmmD + 1], this.cmmDesplazamientos[cmmD + 2])));
      cmmHay = true;
    }
    if (!cmmHay) return;
    const cmmCentro = cmmCaja.getCenter(new cmmTres.Vector3());
    const cmmTam = cmmCaja.getSize(new cmmTres.Vector3()).length();
    const cmmFov = (this.cmmCamara.fov * Math.PI) / 180;
    const cmmDist = Math.max((cmmTam / 2 / Math.tan(cmmFov / 2)) * 1.25, 0.22);
    const cmmDir = this.cmmCamara.position.clone().sub(this.cmmControles.target).normalize();
    this.cmmAnimar(cmmCentro.clone().add(cmmDir.multiplyScalar(cmmDist)), cmmCentro, cmmDuracion === undefined ? 750 : cmmDuracion);
  }

  cmmEnfocarRegion(cmmRegion) {
    const cmmIds = this.cmmPiezas.filter((cmmP) => this.cmmOpacidades[cmmP.cmmOrden] > 0 && cmmRegion.cmmContiene(cmmP)).map((cmmP) => cmmP.cmmId);
    if (cmmIds.length) this.cmmEnfocar(cmmIds, 800);
  }

  cmmVistaFija(cmmNombre) {
    this.cmmAnimar(new cmmTres.Vector3().fromArray(CMM_PUNTOS_VISTA[cmmNombre]), CMM_OBJETIVO_CAMARA.clone(), 800);
  }

  cmmGiro(cmmActivo) {
    this.cmmControles.autoRotate = cmmActivo;
  }

  cmmCapturarCamara() {
    return { cmmPos: this.cmmCamara.position.toArray(), cmmObj: this.cmmControles.target.toArray() };
  }

  cmmRestaurarCamara(cmmDatos) {
    this.cmmAnimar(new cmmTres.Vector3().fromArray(cmmDatos.cmmPos), new cmmTres.Vector3().fromArray(cmmDatos.cmmObj), 700);
  }

  cmmProyectar(cmmPunto) {
    const cmmV = cmmPunto.clone().project(this.cmmCamara);
    const cmmAncho = this.cmmContenedor.clientWidth;
    const cmmAlto = this.cmmContenedor.clientHeight;
    return { cmmX: ((cmmV.x + 1) / 2) * cmmAncho, cmmY: ((1 - cmmV.y) / 2) * cmmAlto, cmmZ: cmmV.z };
  }

  cmmPickearDetallado(cmmEvento) {
    const cmmRect = this.cmmRender.domElement.getBoundingClientRect();
    const cmmX = cmmEvento.clientX - cmmRect.left;
    const cmmY = cmmEvento.clientY - cmmRect.top;
    const cmmGolpe = this.cmmLote.cmmElegir(this.cmmRender, this.cmmCamara, cmmX, cmmY, cmmRect.width, cmmRect.height);
    if (!cmmGolpe) return null;
    const cmmNx = ((Math.floor(cmmX) + 0.5) / cmmRect.width) * 2 - 1;
    const cmmNy = -((Math.floor(cmmY) + 0.5) / cmmRect.height) * 2 + 1;
    const cmmDir = new cmmTres.Vector3(cmmNx, cmmNy, 0.5).unproject(this.cmmCamara).sub(this.cmmCamara.position).normalize();
    const cmmAdelante = this.cmmCamara.getWorldDirection(new cmmTres.Vector3());
    const cmmPunto = this.cmmCamara.position.clone().add(cmmDir.multiplyScalar(cmmGolpe.cmmProfundidad / cmmDir.dot(cmmAdelante)));
    return { cmmId: this.cmmPiezas[cmmGolpe.cmmK].cmmId, cmmPunto };
  }

  cmmPickear(cmmEvento) {
    const cmmGolpe = this.cmmPickearDetallado(cmmEvento);
    return cmmGolpe ? cmmGolpe.cmmId : null;
  }

  cmmPrepararCorte() {
    this.cmmPlanoVisual = new cmmTres.Mesh(
      new cmmTres.PlaneGeometry(1.9, 1.9),
      new cmmTres.MeshBasicMaterial({ color: 0x2f6fdd, transparent: true, opacity: 0.07, side: cmmTres.DoubleSide, depthWrite: false })
    );
    this.cmmPlanoVisual.renderOrder = 5;
    this.cmmPlanoVisual.visible = false;
    this.cmmEscena.add(this.cmmPlanoVisual);
  }

  cmmValorCorte(cmmEje, cmmCoordenada) {
    const cmmL = CMM_LIMITES_CORTE[cmmEje];
    return Math.min(Math.max((cmmCoordenada - cmmL.cmmMin) / (cmmL.cmmMax - cmmL.cmmMin), 0), 1);
  }

  cmmFijarCorte(cmmEje, cmmValor, cmmInvertido) {
    const cmmC = this.cmmCorte;
    cmmC.cmmEje = CMM_LIMITES_CORTE[cmmEje] ? cmmEje : 'ninguno';
    cmmC.cmmValor = Math.min(Math.max(cmmValor === undefined ? cmmC.cmmValor : cmmValor, 0), 1);
    cmmC.cmmInvertido = Boolean(cmmInvertido);
    if (cmmC.cmmEje === 'ninguno') {
      this.cmmLote.cmmFijarCorte(new cmmTres.Vector3(0, 1, 0), 1000000);
      this.cmmPlanoVisual.visible = false;
      this.cmmMarcar();
      return;
    }
    const cmmL = CMM_LIMITES_CORTE[cmmC.cmmEje];
    const cmmPos = cmmL.cmmMin + (cmmL.cmmMax - cmmL.cmmMin) * cmmC.cmmValor;
    const cmmSigno = cmmC.cmmInvertido ? 1 : -1;
    const cmmNormal = new cmmTres.Vector3().fromArray(cmmL.cmmNormal).multiplyScalar(cmmSigno);
    this.cmmLote.cmmFijarCorte(cmmNormal, -cmmSigno * cmmPos);
    this.cmmPlanoVisual.visible = true;
    const cmmEjeVector = new cmmTres.Vector3().fromArray(cmmL.cmmNormal);
    this.cmmPlanoVisual.position.set(0, cmmC.cmmEje === 'transversal' ? 0 : 0.86, 0).addScaledVector(cmmEjeVector, cmmPos);
    this.cmmPlanoVisual.quaternion.setFromUnitVectors(new cmmTres.Vector3(0, 0, 1), cmmEjeVector);
    this.cmmMarcar();
  }

  cmmPrepararMedicion() {
    this.cmmMarcasPosiciones = new Float32Array(6);
    this.cmmMarcasGeometria = new cmmTres.BufferGeometry();
    this.cmmMarcasGeometria.setAttribute('position', new cmmTres.BufferAttribute(this.cmmMarcasPosiciones, 3));
    this.cmmMarcasGeometria.setDrawRange(0, 0);
    this.cmmMarcasPuntos = new cmmTres.Points(this.cmmMarcasGeometria, new cmmTres.PointsMaterial({ color: 0x1d4ed8, size: 11, sizeAttenuation: false, depthTest: false, transparent: true }));
    this.cmmMarcasLinea = new cmmTres.Line(this.cmmMarcasGeometria, new cmmTres.LineBasicMaterial({ color: 0x1d4ed8, depthTest: false, transparent: true }));
    for (const cmmO of [this.cmmMarcasPuntos, this.cmmMarcasLinea]) {
      cmmO.frustumCulled = false;
      cmmO.renderOrder = 10;
      this.cmmEscena.add(cmmO);
    }
  }

  cmmActivarMedicion(cmmActivo) {
    this.cmmMedicion.cmmActiva = Boolean(cmmActivo);
    this.cmmLimpiarMedicion();
    this.cmmRender.domElement.style.cursor = cmmActivo ? 'crosshair' : '';
  }

  cmmLimpiarMedicion() {
    this.cmmMedicion.cmmPuntos = [];
    this.cmmMedicion.cmmDistancia = null;
    this.cmmActualizarMarcas();
  }

  cmmAgregarPuntoMedicion(cmmPunto) {
    const cmmM = this.cmmMedicion;
    if (cmmM.cmmPuntos.length >= 2) cmmM.cmmPuntos = [];
    cmmM.cmmPuntos.push(cmmPunto);
    cmmM.cmmDistancia = cmmM.cmmPuntos.length === 2 ? cmmM.cmmPuntos[0].distanceTo(cmmM.cmmPuntos[1]) : null;
    this.cmmActualizarMarcas();
  }

  cmmActualizarMarcas() {
    const cmmPuntos = this.cmmMedicion.cmmPuntos;
    cmmPuntos.forEach((cmmP, cmmI) => cmmP.toArray(this.cmmMarcasPosiciones, cmmI * 3));
    this.cmmMarcasGeometria.attributes.position.needsUpdate = true;
    this.cmmMarcasGeometria.setDrawRange(0, cmmPuntos.length);
    this.cmmMarcasLinea.visible = cmmPuntos.length === 2;
    this.cmmMarcasPuntos.visible = cmmPuntos.length > 0;
    if (this.cmmAlMedir) this.cmmAlMedir({ cmmPuntos: cmmPuntos.map((cmmP) => cmmP.clone()), cmmDistancia: this.cmmMedicion.cmmDistancia });
    this.cmmMarcar();
  }

  cmmMedicionPantalla() {
    const cmmPuntos = this.cmmMedicion.cmmPuntos;
    if (cmmPuntos.length < 2) return null;
    return this.cmmProyectar(cmmPuntos[0].clone().add(cmmPuntos[1]).multiplyScalar(0.5));
  }

  cmmEnlazarEntradas() {
    const cmmEl = this.cmmRender.domElement;
    cmmEl.addEventListener('pointerdown', (cmmEv) => {
      this.cmmInicioPuntero = { cmmX: cmmEv.clientX, cmmY: cmmEv.clientY };
      this.cmmTween = null;
      this.cmmZoomResto = 0;
    });
    cmmEl.addEventListener('pointerup', (cmmEv) => {
      if (!this.cmmInicioPuntero) return;
      const cmmDx = cmmEv.clientX - this.cmmInicioPuntero.cmmX;
      const cmmDy = cmmEv.clientY - this.cmmInicioPuntero.cmmY;
      this.cmmInicioPuntero = null;
      if (Math.hypot(cmmDx, cmmDy) > 5) return;
      if (this.cmmMedicion.cmmActiva) {
        const cmmGolpe = this.cmmPickearDetallado(cmmEv);
        if (cmmGolpe) this.cmmAgregarPuntoMedicion(cmmGolpe.cmmPunto);
        return;
      }
      const cmmId = this.cmmPickear(cmmEv);
      if (this.cmmAlTocar) this.cmmAlTocar(cmmId, cmmEv);
    });
    cmmEl.addEventListener('pointermove', (cmmEv) => {
      if (cmmEv.buttons) return;
      const cmmAhora = performance.now();
      if (cmmAhora - this.cmmUltimoHover < 90) return;
      this.cmmUltimoHover = cmmAhora;
      const cmmId = this.cmmPickear(cmmEv);
      if (this.cmmAlPasar) this.cmmAlPasar(cmmId, cmmEv);
    });
    cmmEl.addEventListener('pointerleave', () => {
      if (this.cmmAlPasar) this.cmmAlPasar(null, null);
    });
  }

  cmmEnlazarRueda() {
    document.addEventListener('wheel', (cmmEv) => {
      if (cmmEv.target.closest('.cmm-panel, .cmm-paleta, dialog, select, input, textarea')) return;
      cmmEv.preventDefault();
      cmmEv.stopPropagation();
      const cmmEscala = cmmEv.deltaMode === 1 ? 33 : cmmEv.deltaMode === 2 ? 100 : 1;
      const cmmPaso = Math.max(-300, Math.min(300, cmmEv.deltaY * cmmEscala)) * 0.0016;
      const cmmRect = this.cmmRender.domElement.getBoundingClientRect();
      const cmmNdc = new cmmTres.Vector2(((cmmEv.clientX - cmmRect.left) / cmmRect.width) * 2 - 1, -((cmmEv.clientY - cmmRect.top) / cmmRect.height) * 2 + 1);
      this.cmmRayoZoom.setFromCamera(cmmNdc, this.cmmCamara);
      const cmmNormal = this.cmmCamara.getWorldDirection(new cmmTres.Vector3());
      const cmmPlano = new cmmTres.Plane().setFromNormalAndCoplanarPoint(cmmNormal, this.cmmControles.target);
      const cmmPunto = this.cmmRayoZoom.ray.intersectPlane(cmmPlano, new cmmTres.Vector3());
      if (cmmPunto) this.cmmZoomPunto.copy(cmmPunto);
      else this.cmmZoomPunto.copy(this.cmmControles.target);
      const cmmDistancia = this.cmmCamara.position.distanceTo(this.cmmControles.target);
      const cmmPrevisto = Math.min(Math.max(cmmDistancia * Math.exp(this.cmmZoomResto + cmmPaso), this.cmmControles.minDistance), this.cmmControles.maxDistance);
      this.cmmZoomResto = Math.log(cmmPrevisto / cmmDistancia);
      this.cmmTween = null;
      this.cmmSucio = true;
    }, { passive: false, capture: true });
  }

  cmmAvanzarRueda() {
    if (Math.abs(this.cmmZoomResto) < 0.0004) {
      this.cmmZoomResto = 0;
      return;
    }
    const cmmObjetivo = this.cmmControles.target;
    const cmmDir = this.cmmCamara.position.clone().sub(cmmObjetivo);
    const cmmActual = cmmDir.length();
    const cmmTramo = Math.abs(this.cmmZoomResto) < 0.01 ? this.cmmZoomResto : this.cmmZoomResto * 0.25;
    const cmmNueva = Math.min(Math.max(cmmActual * Math.exp(cmmTramo), this.cmmControles.minDistance), this.cmmControles.maxDistance);
    const cmmRazon = cmmNueva / cmmActual;
    if (cmmRazon < 1) {
      cmmObjetivo.addScaledVector(this.cmmZoomPunto.clone().sub(cmmObjetivo), 1 - cmmRazon);
    } else {
      cmmObjetivo.addScaledVector(CMM_OBJETIVO_CAMARA.clone().sub(cmmObjetivo), Math.min((cmmRazon - 1) * 3, 1));
    }
    this.cmmCamara.position.copy(cmmObjetivo).add(cmmDir.normalize().multiplyScalar(cmmNueva));
    this.cmmZoomResto -= cmmTramo;
    this.cmmSucio = true;
  }

  cmmBucle() {
    requestAnimationFrame(this.cmmBucle);
    if (this.cmmTween) {
      const cmmT = this.cmmTween;
      const cmmK = Math.min((performance.now() - cmmT.cmmInicio) / cmmT.cmmDuracion, 1);
      const cmmSuave = cmmK < 0.5 ? 2 * cmmK * cmmK : 1 - Math.pow(-2 * cmmK + 2, 2) / 2;
      this.cmmCamara.position.lerpVectors(cmmT.cmmP0, cmmT.cmmP1, cmmSuave);
      this.cmmControles.target.lerpVectors(cmmT.cmmO0, cmmT.cmmO1, cmmSuave);
      if (cmmK >= 1) this.cmmTween = null;
      this.cmmSucio = true;
    }
    this.cmmAvanzarRueda();
    const cmmCambio = this.cmmControles.update();
    if (cmmCambio || this.cmmSucio) {
      this.cmmRender.render(this.cmmEscena, this.cmmCamara);
      this.cmmSucio = false;
      if (this.cmmAlRenderizar) this.cmmAlRenderizar();
    }
  }
}
