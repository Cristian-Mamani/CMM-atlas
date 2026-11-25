import * as cmmTres from 'three';
import { OrbitControls as CMMOrbita } from 'three/addons/controls/OrbitControls.js';
import { TransformControls as CMMTransformar } from 'three/addons/controls/TransformControls.js';

const CMM_VERTICE_BORDE = `
uniform vec2 cmmPixel;
void main() {
  vec4 cmmClip = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  vec3 cmmNormal = normalize(normalMatrix * normal);
  vec2 cmmDir = (projectionMatrix * vec4(cmmNormal, 0.0)).xy;
  cmmClip.xy += cmmDir / max(length(cmmDir), 0.001) * cmmPixel * cmmClip.w;
  gl_Position = cmmClip;
}
`;

const CMM_FRAGMENTO_BORDE = `
uniform vec3 cmmColor;
void main() {
  gl_FragColor = vec4(cmmColor, 1.0);
  #include <colorspace_fragment>
}
`;

export class CMMTableroBuilder {
  constructor(cmmContenedor, cmmEventos) {
    this.cmmEventos = cmmEventos;
    this.cmmRender = new cmmTres.WebGLRenderer({ antialias: true, alpha: false });
    this.cmmRender.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    this.cmmRender.setClearColor('#e3eaf0');
    this.cmmRender.shadowMap.enabled = true;
    this.cmmRender.shadowMap.type = cmmTres.PCFSoftShadowMap;
    this.cmmRender.toneMapping = cmmTres.ACESFilmicToneMapping;
    this.cmmLienzo = this.cmmRender.domElement;
    this.cmmLienzo.setAttribute('aria-label', 'Tablero anatómico 3D');
    cmmContenedor.appendChild(this.cmmLienzo);
    this.cmmEscena = new cmmTres.Scene();
    this.cmmEscena.add(new cmmTres.HemisphereLight(0xf1f7ff, 0x7f7785, 2.0));
    this.cmmLuz = new cmmTres.DirectionalLight(0xfff1e3, 2.45);
    this.cmmLuz.castShadow = true;
    this.cmmLuz.shadow.mapSize.set(512, 512);
    this.cmmLuz.shadow.bias = -.0003;
    this.cmmEscena.add(this.cmmLuz, this.cmmLuz.target);
    const cmmRelleno = new cmmTres.DirectionalLight(0xb4ddff, .85);
    cmmRelleno.position.set(2, 1, -3);
    this.cmmEscena.add(cmmRelleno);
    this.cmmBase = new cmmTres.Mesh(new cmmTres.PlaneGeometry(1, 1), new cmmTres.ShadowMaterial({ opacity: .19 }));
    this.cmmBase.receiveShadow = true;
    this.cmmEscena.add(this.cmmBase);
    this.cmmFlecha = new cmmTres.ArrowHelper(new cmmTres.Vector3(1, 0, 0), new cmmTres.Vector3(), 1, 0x166a8c);
    this.cmmFlecha.visible = false;
    this.cmmProyeccion = new cmmTres.Group();
    this.cmmProyeccion.visible = false;
    this.cmmMallaProyectada = new cmmTres.Mesh(undefined, new cmmTres.MeshBasicMaterial({
      color: 0x2a658b, wireframe: true, transparent: true, opacity: .22, depthWrite: false
    }));
    this.cmmProyeccion.add(this.cmmMallaProyectada);
    this.cmmEscena.add(this.cmmFlecha, this.cmmProyeccion);
    this.cmmMaterialBorde = new cmmTres.ShaderMaterial({
      vertexShader: CMM_VERTICE_BORDE, fragmentShader: CMM_FRAGMENTO_BORDE, side: cmmTres.BackSide,
      depthWrite: false, uniforms: { cmmPixel: { value: new cmmTres.Vector2() }, cmmColor: { value: new cmmTres.Color() } }
    });
    this.cmmBorde = null;
    this.cmmTablero = new cmmTres.Group();
    this.cmmEscena.add(this.cmmTablero);
    this.cmmCamara = new cmmTres.PerspectiveCamera(35, 1, .001, 100);
    this.cmmCamara.position.set(0, 0, 2);
    this.cmmGizmo = new CMMTransformar(this.cmmCamara, this.cmmLienzo);
    this.cmmGizmo.setMode('translate');
    this.cmmGizmo.setSpace('world');
    this.cmmGizmo.setSize(.75);
    this.cmmGizmo.enabled = false;
    this.cmmEscena.add(this.cmmGizmo.getHelper());
    this.cmmRayo = new cmmTres.Raycaster();
    this.cmmNdc = new cmmTres.Vector2();
    this.cmmAbortar = new AbortController();
    this.cmmPiezas = [];
    this.cmmMovimiento = null;
    this.cmmModificable = false;
    this.cmmModo = 'arrastre';
    this.cmmRaf = null;
    this.cmmPresentacion = null;
    this.cmmVuelo = null;
    this.cmmMarcas = [];
    this.cmmEnlazar();
    this.cmmOrbita = new CMMOrbita(this.cmmCamara, this.cmmLienzo);
    this.cmmOrbita.enablePan = false;
    this.cmmOrbita.addEventListener('change', () => this.cmmDibujar());
    this.cmmResize = new ResizeObserver(() => {
      const cmmAncho = Math.max(1, cmmContenedor.clientWidth);
      const cmmAlto = Math.max(1, cmmContenedor.clientHeight);
      this.cmmMaterialBorde.uniforms.cmmPixel.value.set(4 / cmmAncho, 4 / cmmAlto);
      this.cmmCamara.aspect = cmmAncho / cmmAlto;
      this.cmmCamara.updateProjectionMatrix();
      this.cmmRender.setSize(cmmAncho, cmmAlto, false);
      this.cmmDibujar();
    });
    this.cmmResize.observe(cmmContenedor);
  }

  cmmEnlazar() {
    const cmmOpciones = { signal: this.cmmAbortar.signal };
    this.cmmLienzo.addEventListener('webglcontextlost', (cmmEv) => {
      cmmEv.preventDefault();
      this.cmmCancelar();
      this.cmmEventos.cmmContextoPerdido?.();
    }, cmmOpciones);
    this.cmmLienzo.addEventListener('pointerdown', (cmmEv) => {
      this.cmmPresentacion = null;
      this.cmmVuelo = null;
      this.cmmAgarrar(cmmEv);
    }, cmmOpciones);
    this.cmmLienzo.addEventListener('pointermove', (cmmEv) => this.cmmArrastrar(cmmEv), cmmOpciones);
    this.cmmLienzo.addEventListener('wheel', () => { this.cmmVuelo = null; this.cmmPresentacion = null; }, cmmOpciones);
    this.cmmLienzo.addEventListener('pointerup', (cmmEv) => {
      if (this.cmmMovimiento?.cmmId === cmmEv.pointerId) this.cmmSoltar(false);
    }, cmmOpciones);
    for (const cmmEvento of ['pointercancel', 'lostpointercapture']) {
      this.cmmLienzo.addEventListener(cmmEvento, (cmmEv) => {
        if (this.cmmMovimiento?.cmmId === cmmEv.pointerId) this.cmmSoltar(true);
        if (this.cmmGizmo.dragging) this.cmmCancelar();
      }, cmmOpciones);
    }
    this.cmmLienzo.addEventListener('wheel', (cmmEv) => {
      if (!cmmEv.shiftKey || !this.cmmModificable) return;
      cmmEv.preventDefault();
      cmmEv.stopImmediatePropagation();
      this.cmmEventos.cmmProfundidad(cmmEv.deltaY < 0 ? -1 : 1);
    }, { ...cmmOpciones, passive: false });
    window.addEventListener('blur', () => this.cmmCancelar(), cmmOpciones);
    this.cmmGizmo.addEventListener('mouseDown', () => {
      this.cmmOrbita.enabled = false;
      this.cmmEventos.cmmTomar('gizmo');
    });
    this.cmmGizmo.addEventListener('objectChange', () => {
      this.cmmEventos.cmmMover();
      this.cmmDibujar();
    });
    this.cmmGizmo.addEventListener('mouseUp', () => {
      this.cmmOrbita.enabled = true;
      this.cmmEventos.cmmSoltar(false);
    });
  }

  cmmApuntar(cmmEv) {
    const cmmRect = this.cmmLienzo.getBoundingClientRect();
    this.cmmNdc.set((cmmEv.clientX - cmmRect.left) / cmmRect.width * 2 - 1,
      1 - (cmmEv.clientY - cmmRect.top) / cmmRect.height * 2);
    this.cmmCamara.updateMatrixWorld();
    this.cmmRayo.setFromCamera(this.cmmNdc, this.cmmCamara);
  }

  cmmAgarrar(cmmEv) {
    if (cmmEv.button !== 0 || !cmmEv.isPrimary || this.cmmGizmo.dragging || this.cmmMovimiento) return;
    this.cmmApuntar(cmmEv);
    this.cmmTablero.updateMatrixWorld(true);
    if (this.cmmEventos.cmmObjetivo?.(this.cmmRayo)) return;
    const cmmMallas = this.cmmPiezas.filter((cmmPieza) => cmmPieza.cmmEstado !== 'encajando' && cmmPieza.cmmMalla.visible).map((cmmPieza) => cmmPieza.cmmMalla);
    const cmmImpacto = this.cmmRayo.intersectObjects(cmmMallas, false)[0];
    if (!cmmImpacto) return;
    const cmmPieza = cmmImpacto.object.userData.cmmPieza;
    const cmmElegida = this.cmmEventos.cmmElegir(cmmPieza);
    if (!cmmElegida || !this.cmmModificable || cmmPieza.cmmEstado === 'ensamblada' || this.cmmModo !== 'arrastre') return;
    const cmmNormal = this.cmmCamara.getWorldDirection(new cmmTres.Vector3());
    const cmmCentro = cmmPieza.cmmPivote.getWorldPosition(new cmmTres.Vector3());
    const cmmPlano = new cmmTres.Plane().setFromNormalAndCoplanarPoint(cmmNormal, cmmCentro);
    const cmmPunto = this.cmmRayo.ray.intersectPlane(cmmPlano, new cmmTres.Vector3());
    if (!cmmPunto) return;
    this.cmmMovimiento = { cmmId: cmmEv.pointerId, cmmPieza, cmmPlano, cmmAgarre: cmmCentro.clone().sub(cmmPunto) };
    this.cmmOrbita.enabled = false;
    this.cmmLienzo.classList.add('cmm-builder-agarrada');
    this.cmmLienzo.setPointerCapture(cmmEv.pointerId);
    this.cmmEventos.cmmTomar('arrastre');
  }

  cmmArrastrar(cmmEv) {
    const cmmA = this.cmmMovimiento;
    if (!cmmA || cmmA.cmmId !== cmmEv.pointerId) return;
    this.cmmApuntar(cmmEv);
    const cmmPunto = this.cmmRayo.ray.intersectPlane(cmmA.cmmPlano, new cmmTres.Vector3());
    if (!cmmPunto) return;
    cmmA.cmmPieza.cmmPivote.position.copy(this.cmmTablero.worldToLocal(cmmPunto.add(cmmA.cmmAgarre)));
    this.cmmEventos.cmmMover();
    this.cmmDibujar();
  }

  cmmSoltar(cmmCancelar) {
    const cmmId = this.cmmMovimiento.cmmId;
    this.cmmMovimiento = null;
    this.cmmLienzo.classList.remove('cmm-builder-agarrada');
    if (this.cmmLienzo.hasPointerCapture(cmmId)) this.cmmLienzo.releasePointerCapture(cmmId);
    this.cmmOrbita.enabled = true;
    this.cmmEventos.cmmSoltar(cmmCancelar);
  }

  cmmCancelar() {
    if (this.cmmMovimiento) this.cmmSoltar(true);
    if (this.cmmGizmo.dragging) {
      this.cmmGizmo.dragging = false;
      this.cmmGizmo.pointerUp(null);
      this.cmmGizmo.disconnect();
      this.cmmGizmo.connect();
      this.cmmOrbita.enabled = true;
      this.cmmEventos.cmmSoltar(true);
    }
  }

  cmmResaltar(cmmPieza, cmmColor) {
    if (!cmmPieza) {
      this.cmmBorde?.removeFromParent();
      return;
    }
    if (!this.cmmBorde) {
      this.cmmBorde = new cmmTres.Mesh(cmmPieza.cmmMalla.geometry, this.cmmMaterialBorde);
      this.cmmBorde.renderOrder = 1;
    }
    if (this.cmmBorde.parent !== cmmPieza.cmmMalla) {
      this.cmmBorde.geometry = cmmPieza.cmmMalla.geometry;
      cmmPieza.cmmMalla.add(this.cmmBorde);
    }
    this.cmmMaterialBorde.uniforms.cmmColor.value.set(cmmColor);
  }

  cmmHerramienta(cmmModo, cmmEje, cmmPieza, cmmModificable) {
    this.cmmModo = cmmModo;
    this.cmmModificable = cmmModificable;
    this.cmmGizmo.enabled = Boolean(cmmPieza && cmmModificable && cmmModo === 'translate');
    if (this.cmmGizmo.enabled) {
      this.cmmGizmo.showX = cmmEje === 'libre' || cmmEje === 'x';
      this.cmmGizmo.showY = cmmEje === 'libre' || cmmEje === 'y';
      this.cmmGizmo.showZ = cmmEje === 'libre' || cmmEje === 'z';
      this.cmmGizmo.attach(cmmPieza.cmmPivote);
    } else {
      this.cmmGizmo.detach();
    }
    this.cmmDibujar();
  }

  cmmGuiar(cmmPieza) {
    this.cmmFlecha.visible = Boolean(cmmPieza);
    this.cmmProyeccion.visible = Boolean(cmmPieza);
    if (!cmmPieza) return;
    const cmmObjetivo = cmmPieza.cmmObjetivo.cmmPosicion;
    this.cmmMallaProyectada.geometry = cmmPieza.cmmMalla.geometry;
    this.cmmMallaProyectada.position.copy(cmmPieza.cmmMalla.position);
    this.cmmProyeccion.position.copy(cmmObjetivo);
    const cmmCentro = cmmPieza.cmmPivote.position;
    const cmmDireccion = cmmObjetivo.clone().sub(cmmCentro);
    const cmmDistancia = cmmDireccion.length();
    this.cmmFlecha.visible = cmmDistancia > Math.max(.003, cmmPieza.cmmRadio * .2);
    if (!this.cmmFlecha.visible) return;
    this.cmmFlecha.position.copy(cmmCentro);
    this.cmmFlecha.setDirection(cmmDireccion.normalize());
    const cmmLargo = Math.min(cmmDistancia * .72, cmmPieza.cmmRadio * 2);
    this.cmmFlecha.setLength(cmmLargo, cmmLargo * .25, cmmLargo * .16);
  }

  cmmSombras(cmmCaja) {
    const cmmCentro = cmmCaja.getCenter(new cmmTres.Vector3());
    const cmmRadio = Math.max(.035, cmmCaja.getBoundingSphere(new cmmTres.Sphere()).radius);
    this.cmmLuz.position.copy(cmmCentro).addScaledVector(new cmmTres.Vector3(-.7, 1, 2), cmmRadio);
    this.cmmLuz.target.position.copy(cmmCentro);
    const cmmVista = this.cmmLuz.shadow.camera;
    cmmVista.left = cmmVista.bottom = -cmmRadio * 1.5;
    cmmVista.right = cmmVista.top = cmmRadio * 1.5;
    cmmVista.near = cmmRadio * .05;
    cmmVista.far = cmmRadio * 6;
    cmmVista.updateProjectionMatrix();
    this.cmmBase.position.set(cmmCentro.x, cmmCentro.y, cmmCaja.min.z - cmmRadio * .05);
    this.cmmBase.scale.setScalar(cmmRadio * 4);
  }

  cmmProyectar(cmmPunto) {
    this.cmmCamara.updateMatrixWorld();
    const cmmV = cmmPunto.clone().project(this.cmmCamara);
    if (Math.max(Math.abs(cmmV.x), Math.abs(cmmV.y), Math.abs(cmmV.z)) > 1) return null;
    return { cmmX: (cmmV.x + 1) * this.cmmLienzo.clientWidth / 2, cmmY: (1 - cmmV.y) * this.cmmLienzo.clientHeight / 2 };
  }

  cmmEncuadrar(cmmCaja, cmmDireccion = new cmmTres.Vector3(0, 0, 1), cmmSuave = false) {
    const cmmTamano = cmmCaja.getSize(new cmmTres.Vector3());
    const cmmCentro = cmmCaja.getCenter(new cmmTres.Vector3());
    const cmmRect = this.cmmLienzo.getBoundingClientRect();
    const cmmAspecto = cmmRect.width / Math.max(1, cmmRect.height);
    const cmmApertura = Math.tan(cmmTres.MathUtils.degToRad(this.cmmCamara.fov / 2));
    const cmmAltura = cmmTamano.y / 2;
    const cmmAncho = cmmTamano.x / (2 * Math.max(.2, cmmAspecto));
    const cmmDistancia = Math.max(cmmAltura, cmmAncho, .025) / cmmApertura * 1.22 + cmmTamano.z / 2;
    const cmmDestino = cmmCentro.clone().addScaledVector(cmmDireccion.clone().normalize(), cmmDistancia);
    const cmmActual = this.cmmCamara.position.distanceTo(this.cmmOrbita.target);
    this.cmmOrbita.minDistance = Math.max(.0008, Math.min(cmmActual, cmmDistancia) * .075);
    this.cmmOrbita.maxDistance = Math.max(cmmActual, cmmDistancia) * 7;
    this.cmmPresentacion = null;
    this.cmmVuelo = null;
    if (cmmSuave && !this.cmmReducir && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.cmmVuelo = { cmmInicio: performance.now(), cmmOrigen: this.cmmCamara.position.clone(), cmmBlanco: this.cmmOrbita.target.clone(), cmmDestino, cmmCentro };
    } else {
      this.cmmCamara.position.copy(cmmDestino);
      this.cmmOrbita.target.copy(cmmCentro);
      this.cmmOrbita.update();
    }
    this.cmmDibujar();
  }

  cmmPresentar() {
    if (this.cmmReducir || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    this.cmmPresentacion = {
      cmmInicio: performance.now(),
      cmmBrazo: this.cmmCamara.position.clone().sub(this.cmmOrbita.target)
    };
    this.cmmDibujar();
  }

  cmmDibujar() {
    if (this.cmmRaf !== null) return;
    this.cmmRaf = requestAnimationFrame((cmmAhora) => {
      const cmmV = this.cmmVuelo;
      if (cmmV) {
        const cmmT = cmmTres.MathUtils.clamp((cmmAhora - cmmV.cmmInicio) / 400, 0, 1);
        const cmmF = cmmT * cmmT * (3 - 2 * cmmT);
        this.cmmCamara.position.lerpVectors(cmmV.cmmOrigen, cmmV.cmmDestino, cmmF);
        this.cmmOrbita.target.lerpVectors(cmmV.cmmBlanco, cmmV.cmmCentro, cmmF);
        this.cmmOrbita.update();
        if (cmmT === 1) this.cmmVuelo = null;
      }
      const cmmP = this.cmmPresentacion;
      if (cmmP) {
        const cmmT = cmmTres.MathUtils.clamp((cmmAhora - cmmP.cmmInicio) / 1400, 0, 1);
        const cmmAngulo = -.58 * Math.sin(Math.PI * cmmT / 2);
        this.cmmCamara.position.copy(cmmP.cmmBrazo).applyAxisAngle(new cmmTres.Vector3(0, 1, 0), cmmAngulo).add(this.cmmOrbita.target);
        this.cmmOrbita.update();
        if (cmmT === 1) this.cmmPresentacion = null;
      }
      this.cmmRaf = null;
      this.cmmRender.render(this.cmmEscena, this.cmmCamara);
      this.cmmMarcas.push(cmmAhora);
      if (this.cmmMarcas.length > 900) this.cmmMarcas.shift();
      this.cmmEventos.cmmAlDibujar?.();
      if (this.cmmPresentacion || this.cmmVuelo) this.cmmDibujar();
    });
  }

  cmmRendimiento() {
    const cmmIntervalos = this.cmmMarcas.slice(1).map((cmmT, cmmI) => cmmT - this.cmmMarcas[cmmI]).filter((cmmT) => cmmT > 0 && cmmT <= 100).sort((cmmA, cmmB) => cmmA - cmmB);
    const cmmPercentil = (cmmFraccion) => cmmIntervalos[Math.floor((cmmIntervalos.length - 1) * cmmFraccion)] ?? null;
    const cmmMediana = cmmPercentil(.5);
    const cmmAtributos = this.cmmPiezas.flatMap((cmmP) => [cmmP.cmmMalla.geometry.index, ...Object.values(cmmP.cmmMalla.geometry.attributes)]);
    return {
      cmmMuestras: cmmIntervalos.length, cmmMedianaMs: cmmMediana, cmmP95Ms: cmmPercentil(.95),
      cmmFPSMediana: cmmMediana ? 1000 / cmmMediana : null,
      cmmGeometriaBytes: cmmAtributos.reduce((cmmTotal, cmmAtributo) => cmmTotal + cmmAtributo.array.byteLength, 0),
      cmmGeometriasWebGL: this.cmmRender.info.memory.geometries, cmmTexturasWebGL: this.cmmRender.info.memory.textures
    };
  }

  cmmMiniaturas(cmmPiezas) {
    const cmmMiniEscena = new cmmTres.Scene();
    cmmMiniEscena.add(new cmmTres.HemisphereLight(0xffffff, 0x75869d, 2.2));
    const cmmLuz = new cmmTres.DirectionalLight(0xffffff, 2);
    cmmLuz.position.set(0, 1, 4);
    cmmMiniEscena.add(cmmLuz);
    const cmmCamara = new cmmTres.PerspectiveCamera(34, 1, .0001, 20);
    const cmmTamano = this.cmmRender.getSize(new cmmTres.Vector2());
    this.cmmRender.setSize(76, 76, false);
    for (const cmmPieza of cmmPiezas) {
      const cmmMalla = new cmmTres.Mesh(cmmPieza.cmmMalla.geometry, cmmPieza.cmmMalla.material);
      cmmMalla.position.copy(cmmPieza.cmmObjetivo.cmmPosicion).negate();
      cmmMiniEscena.add(cmmMalla);
      cmmCamara.position.set(.28, .15, 1).setLength(cmmPieza.cmmRadio * 4.1);
      cmmCamara.lookAt(0, 0, 0);
      this.cmmRender.render(cmmMiniEscena, cmmCamara);
      cmmPieza.cmmMiniatura = this.cmmLienzo.toDataURL('image/png');
      cmmMalla.removeFromParent();
    }
    this.cmmRender.setSize(cmmTamano.x, cmmTamano.y, false);
    this.cmmDibujar();
  }

  cmmCerrar() {
    this.cmmCancelar();
    this.cmmAbortar.abort();
    this.cmmResize.disconnect();
    if (this.cmmRaf !== null) cancelAnimationFrame(this.cmmRaf);
    this.cmmOrbita.dispose();
    this.cmmGizmo.disconnect();
    const cmmRecursos = new Set();
    this.cmmGizmo.getHelper().traverse((cmmNodo) => {
      if (cmmNodo.geometry) cmmRecursos.add(cmmNodo.geometry);
      if (cmmNodo.material) cmmRecursos.add(cmmNodo.material);
    });
    cmmRecursos.forEach((cmmRecurso) => cmmRecurso.dispose());
    for (const cmmPieza of this.cmmPiezas) {
      cmmPieza.cmmMalla.geometry.dispose();
      cmmPieza.cmmMalla.material.dispose();
      cmmPieza.cmmFantasma.material.dispose();
    }
    this.cmmMaterialBorde.dispose();
    this.cmmBase?.geometry.dispose();
    this.cmmBase?.material.dispose();
    this.cmmLuz?.shadow.dispose();
    this.cmmFlecha?.line.material.dispose();
    this.cmmFlecha?.cone.material.dispose();
    this.cmmMallaProyectada?.material.dispose();
    this.cmmRender.dispose();
    this.cmmRender.forceContextLoss();
    this.cmmLienzo.remove();
  }
}
