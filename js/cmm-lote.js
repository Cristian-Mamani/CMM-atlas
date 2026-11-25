import * as cmmTres from 'three';

const CMM_FILAS = 3;

const CMM_VERTICE_ELEGIR = `
attribute float cmmIdx;
uniform sampler2D cmmTex;
uniform vec4 cmmCorte;
varying float cmmVNumero;
varying float cmmVProfundo;
void main() {
  int cmmI = int(cmmIdx + 0.5);
  vec4 cmmA = texelFetch(cmmTex, ivec2(cmmI, 0), 0);
  vec3 cmmP = position + cmmA.xyz;
  vec4 cmmV = modelViewMatrix * vec4(cmmP, 1.0);
  gl_Position = projectionMatrix * cmmV;
  bool cmmFuera = cmmA.w < 0.3 || dot(cmmCorte.xyz, cmmP) + cmmCorte.w < 0.0;
  if (cmmFuera) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
  cmmVNumero = float(cmmI + 1);
  cmmVProfundo = -cmmV.z;
}
`;

const CMM_FRAGMENTO_ELEGIR = `
varying float cmmVNumero;
varying float cmmVProfundo;
void main() {
  gl_FragColor = vec4(floor(cmmVNumero + 0.5), cmmVProfundo, 0.0, 1.0);
}
`;

const CMM_VERTICE_CONTORNO = `
attribute float cmmIdx;
uniform sampler2D cmmTex;
uniform vec2 cmmPixel;
uniform float cmmGrosor;
uniform vec4 cmmCorte;
varying vec3 cmmVTono;
void main() {
  int cmmI = int(cmmIdx + 0.5);
  vec4 cmmA = texelFetch(cmmTex, ivec2(cmmI, 0), 0);
  vec4 cmmB = texelFetch(cmmTex, ivec2(cmmI, 1), 0);
  vec3 cmmP = position + cmmA.xyz;
  vec4 cmmClip = projectionMatrix * modelViewMatrix * vec4(cmmP, 1.0);
  vec3 cmmN = normalize(normalMatrix * normal);
  vec2 cmmD = (projectionMatrix * vec4(cmmN, 0.0)).xy;
  cmmD = cmmD / max(length(cmmD), 0.0001);
  cmmClip.xy += cmmD * cmmPixel * cmmGrosor * cmmClip.w;
  bool cmmFuera = cmmB.w < 0.5 || cmmA.w < 0.03 || dot(cmmCorte.xyz, cmmP) + cmmCorte.w < 0.0;
  gl_Position = cmmFuera ? vec4(2.0, 2.0, 2.0, 1.0) : cmmClip;
  cmmVTono = cmmB.w > 1.5 ? vec3(0.1, 0.72, 1.0) : vec3(1.0, 0.5, 0.0);
}
`;

const CMM_FRAGMENTO_CONTORNO = `
varying vec3 cmmVTono;
void main() {
  gl_FragColor = vec4(cmmVTono, 1.0);
}
`;

export class CMMLote {
  constructor(cmmPiezas) {
    this.cmmTotal = cmmPiezas.length;
    this.cmmDatos = new Float32Array(this.cmmTotal * CMM_FILAS * 4);
    this.cmmTextura = new cmmTres.DataTexture(this.cmmDatos, this.cmmTotal, CMM_FILAS, cmmTres.RGBAFormat, cmmTres.FloatType);
    this.cmmTextura.minFilter = cmmTres.NearestFilter;
    this.cmmTextura.magFilter = cmmTres.NearestFilter;
    this.cmmTextura.generateMipmaps = false;
    this.cmmTextura.needsUpdate = true;
    this.cmmPlanoCorte = new cmmTres.Plane(new cmmTres.Vector3(0, 1, 0), 1000000);
    this.cmmUniformeCorte = { value: new cmmTres.Vector4(0, 1, 0, 1000000) };
    this.cmmGeometria = this.cmmFusionar(cmmPiezas);
    this.cmmOpaca = this.cmmCrearMalla(0);
    this.cmmTranslucida = this.cmmCrearMalla(1);
    this.cmmTranslucida.renderOrder = 2;
    this.cmmUniformePixel = { value: new cmmTres.Vector2(0.002, 0.002) };
    this.cmmContorno = new cmmTres.Mesh(this.cmmGeometria, new cmmTres.ShaderMaterial({
      vertexShader: CMM_VERTICE_CONTORNO,
      fragmentShader: CMM_FRAGMENTO_CONTORNO,
      uniforms: { cmmTex: { value: this.cmmTextura }, cmmCorte: this.cmmUniformeCorte, cmmPixel: this.cmmUniformePixel, cmmGrosor: { value: 3 } },
      side: cmmTres.BackSide,
      depthWrite: false
    }));
    this.cmmContorno.frustumCulled = false;
    this.cmmContorno.renderOrder = 1;
    this.cmmEscenaElegir = new cmmTres.Scene();
    const cmmMaterialElegir = new cmmTres.ShaderMaterial({
      vertexShader: CMM_VERTICE_ELEGIR,
      fragmentShader: CMM_FRAGMENTO_ELEGIR,
      uniforms: { cmmTex: { value: this.cmmTextura }, cmmCorte: this.cmmUniformeCorte },
      side: cmmTres.DoubleSide
    });
    const cmmMallaElegir = new cmmTres.Mesh(this.cmmGeometria, cmmMaterialElegir);
    cmmMallaElegir.frustumCulled = false;
    this.cmmEscenaElegir.add(cmmMallaElegir);
    this.cmmObjetivo = new cmmTres.WebGLRenderTarget(1, 1, {
      type: cmmTres.FloatType,
      format: cmmTres.RGBAFormat,
      minFilter: cmmTres.NearestFilter,
      magFilter: cmmTres.NearestFilter,
      depthBuffer: true
    });
    this.cmmPixel = new Float32Array(4);
    this.cmmColorPrevio = new cmmTres.Color();
  }

  cmmFusionar(cmmPiezas) {
    let cmmNv = 0;
    let cmmNi = 0;
    for (const cmmP of cmmPiezas) {
      cmmNv += cmmP.cmmVertices;
      cmmNi += cmmP.cmmIndices.length;
    }
    const cmmPos = new Float32Array(cmmNv * 3);
    const cmmNor = new Int16Array(cmmNv * 3);
    const cmmNum = new Uint16Array(cmmNv);
    const cmmInd = new Uint32Array(cmmNi);
    let cmmV = 0;
    let cmmI = 0;
    cmmPiezas.forEach((cmmP, cmmK) => {
      cmmPos.set(cmmP.cmmPos, cmmV * 3);
      cmmNor.set(cmmP.cmmNor, cmmV * 3);
      cmmNum.fill(cmmK, cmmV, cmmV + cmmP.cmmVertices);
      const cmmLocal = cmmP.cmmIndices;
      for (let cmmJ = 0; cmmJ < cmmLocal.length; cmmJ++) cmmInd[cmmI + cmmJ] = cmmLocal[cmmJ] + cmmV;
      cmmV += cmmP.cmmVertices;
      cmmI += cmmLocal.length;
      cmmP.cmmOrden = cmmK;
      cmmP.cmmPos = null;
      cmmP.cmmNor = null;
      cmmP.cmmIndices = null;
    });
    const cmmGeo = new cmmTres.BufferGeometry();
    cmmGeo.setAttribute('position', new cmmTres.BufferAttribute(cmmPos, 3));
    cmmGeo.setAttribute('normal', new cmmTres.BufferAttribute(cmmNor, 3, true));
    cmmGeo.setAttribute('cmmIdx', new cmmTres.BufferAttribute(cmmNum, 1));
    cmmGeo.setIndex(new cmmTres.BufferAttribute(cmmInd, 1));
    return cmmGeo;
  }

  cmmCrearMalla(cmmPase) {
    const cmmMat = new cmmTres.MeshStandardMaterial({
      roughness: 0.55,
      metalness: 0.05,
      side: cmmTres.DoubleSide,
      transparent: cmmPase === 1,
      depthWrite: cmmPase === 0,
      clippingPlanes: [this.cmmPlanoCorte]
    });
    const cmmTextura = this.cmmTextura;
    cmmMat.onBeforeCompile = (cmmShader) => {
      cmmShader.uniforms.cmmTex = { value: cmmTextura };
      cmmShader.uniforms.cmmPase = { value: cmmPase };
      cmmShader.vertexShader = cmmShader.vertexShader
        .replace('#include <common>', `#include <common>
attribute float cmmIdx;
uniform sampler2D cmmTex;
uniform float cmmPase;
varying float cmmVOpaco;
varying vec3 cmmVColor;
varying vec4 cmmVEmision;`)
        .replace('#include <begin_vertex>', `#include <begin_vertex>
int cmmI = int(cmmIdx + 0.5);
vec4 cmmA = texelFetch(cmmTex, ivec2(cmmI, 0), 0);
vec4 cmmB = texelFetch(cmmTex, ivec2(cmmI, 1), 0);
vec4 cmmC = texelFetch(cmmTex, ivec2(cmmI, 2), 0);
transformed += cmmA.xyz;
cmmVOpaco = cmmA.w;
cmmVColor = cmmB.rgb;
cmmVEmision = cmmC;`)
        .replace('#include <project_vertex>', `#include <project_vertex>
bool cmmEsSolida = cmmA.w > 0.99;
bool cmmSeVe = cmmA.w > 0.03;
if (!cmmSeVe || ((cmmPase < 0.5) != cmmEsSolida)) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);`);
      cmmShader.fragmentShader = cmmShader.fragmentShader
        .replace('#include <common>', `#include <common>
varying float cmmVOpaco;
varying vec3 cmmVColor;
varying vec4 cmmVEmision;`)
        .replace('vec4 diffuseColor = vec4( diffuse, opacity );', 'vec4 diffuseColor = vec4( cmmVColor, cmmVOpaco );')
        .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
totalEmissiveRadiance = cmmVEmision.rgb * cmmVEmision.a;`);
    };
    cmmMat.customProgramCacheKey = () => 'cmm-pase-' + cmmPase;
    const cmmMalla = new cmmTres.Mesh(this.cmmGeometria, cmmMat);
    cmmMalla.frustumCulled = false;
    return cmmMalla;
  }

  cmmFijarCorte(cmmNormal, cmmConstante) {
    this.cmmPlanoCorte.normal.copy(cmmNormal);
    this.cmmPlanoCorte.constant = cmmConstante;
    this.cmmUniformeCorte.value.set(cmmNormal.x, cmmNormal.y, cmmNormal.z, cmmConstante);
  }

  cmmFijarDesplazamiento(cmmK, cmmX, cmmY, cmmZ) {
    const cmmD = cmmK * 4;
    this.cmmDatos[cmmD] = cmmX;
    this.cmmDatos[cmmD + 1] = cmmY;
    this.cmmDatos[cmmD + 2] = cmmZ;
  }

  cmmFijarPixel(cmmAncho, cmmAlto) {
    this.cmmUniformePixel.value.set(2 / cmmAncho, 2 / cmmAlto);
  }

  cmmFijarAspecto(cmmK, cmmOpacidad, cmmColor, cmmEmision, cmmIntensidad, cmmMarca) {
    const cmmFila0 = cmmK * 4;
    const cmmFila1 = (this.cmmTotal + cmmK) * 4;
    const cmmFila2 = (this.cmmTotal * 2 + cmmK) * 4;
    this.cmmDatos[cmmFila0 + 3] = cmmOpacidad;
    this.cmmDatos[cmmFila1] = cmmColor.r;
    this.cmmDatos[cmmFila1 + 1] = cmmColor.g;
    this.cmmDatos[cmmFila1 + 2] = cmmColor.b;
    this.cmmDatos[cmmFila1 + 3] = cmmMarca;
    this.cmmDatos[cmmFila2] = cmmEmision.r;
    this.cmmDatos[cmmFila2 + 1] = cmmEmision.g;
    this.cmmDatos[cmmFila2 + 2] = cmmEmision.b;
    this.cmmDatos[cmmFila2 + 3] = cmmIntensidad;
  }

  cmmSubir() {
    this.cmmTextura.needsUpdate = true;
  }

  cmmElegir(cmmRender, cmmCamara, cmmX, cmmY, cmmAncho, cmmAlto) {
    cmmCamara.setViewOffset(cmmAncho, cmmAlto, Math.floor(cmmX), Math.floor(cmmY), 1, 1);
    const cmmObjetivoPrevio = cmmRender.getRenderTarget();
    const cmmAlfaPrevia = cmmRender.getClearAlpha();
    cmmRender.getClearColor(this.cmmColorPrevio);
    cmmRender.setRenderTarget(this.cmmObjetivo);
    cmmRender.setClearColor(0x000000, 0);
    cmmRender.clear();
    cmmRender.render(this.cmmEscenaElegir, cmmCamara);
    cmmRender.readRenderTargetPixels(this.cmmObjetivo, 0, 0, 1, 1, this.cmmPixel);
    cmmRender.setRenderTarget(cmmObjetivoPrevio);
    cmmRender.setClearColor(this.cmmColorPrevio, cmmAlfaPrevia);
    cmmCamara.clearViewOffset();
    const cmmNumero = Math.round(this.cmmPixel[0]);
    if (cmmNumero <= 0) return null;
    return { cmmK: cmmNumero - 1, cmmProfundidad: this.cmmPixel[1] };
  }
}
