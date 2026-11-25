import * as cmmTres from 'three';
import { CMM_SISTEMAS } from './cmm-datos.js';
import { CMM_CATALOGO_MISIONES } from './cmm-builder-catalogo.js';
import { cmmValidarMision } from './cmm-builder-misiones.js';

export const CMM_DIFICULTADES = [
  { cmmNombre: 'Principiante', cmmFactor: 1.25, cmmMaximo: 6, cmmPistas: Infinity, cmmPlanoObjetivo: true },
  { cmmNombre: 'Intermedio', cmmFactor: 1.05, cmmMaximo: 7, cmmPistas: 4, cmmPlanoObjetivo: true },
  { cmmNombre: 'Avanzado', cmmFactor: .85, cmmMaximo: 8, cmmPistas: 2, cmmPlanoObjetivo: true },
  { cmmNombre: 'Experto', cmmFactor: .7, cmmMaximo: Infinity, cmmPistas: 1, cmmPlanoObjetivo: true }
];

export function cmmCatalogoBuilder(cmmAtlas, cmmPiezas, cmmManifiesto, cmmRechazar = () => {}, cmmMisiones = CMM_CATALOGO_MISIONES) {
  const cmmPorId = new Map(cmmAtlas.parts.map((cmmPieza) => [cmmPieza.id, cmmPieza]));
  const cmmPorNombre = new Map(cmmPiezas.map((cmmPieza) => [cmmPieza.cmmId, cmmPieza.cmmNombre]));
  const cmmVistos = new Set();
  return cmmMisiones.flatMap((cmmReto) => {
    const cmmMotivos = cmmValidarMision(cmmReto, cmmAtlas, cmmManifiesto);
    if (cmmVistos.has(cmmReto.cmmId)) cmmMotivos.push('El ID de misión ya existe en el catálogo.');
    if (cmmMotivos.length) {
      cmmRechazar(cmmReto.cmmId, cmmMotivos);
      return [];
    }
    cmmVistos.add(cmmReto.cmmId);
    return [{
      ...cmmReto,
      cmmCapas: cmmReto.cmmSecuencia,
      cmmPiezas: [...cmmReto.cmmRequeridas, ...cmmReto.cmmReferencia, ...(cmmReto.cmmIntrusas ?? [])].map((cmmId) => {
        const cmmDato = cmmPorId.get(cmmId);
        return {
          cmmDato,
          cmmId,
          cmmEsIntrusa: cmmReto.cmmIntrusas?.includes(cmmId) ?? false,
          cmmInstancia: cmmReto.cmmId + '/' + cmmId,
          cmmRegion: cmmReto.cmmRegion,
          cmmNombre: cmmPorNombre.get(cmmId) ?? cmmDato.name,
          cmmLado: /\bleft\b/i.test(cmmDato.name) ? 'Izquierda' : /\bright\b/i.test(cmmDato.name) ? 'Derecha' : null,
          cmmSistema: CMM_SISTEMAS.find((cmmS) => cmmS.cmmId === cmmDato.system)
        };
      })
    }];
  });
}

export async function cmmLeerBuilder(cmmRuta, cmmSignal) {
  const cmmRespuesta = await fetch(cmmRuta, { signal: cmmSignal });
  if (!cmmRespuesta.ok) throw new Error('No se pudo cargar ' + cmmRuta);
  return cmmRespuesta;
}

export async function cmmCargarBloquesBuilder(cmmAtlas, cmmPiezas, cmmSignal) {
  const cmmChunks = new Set(cmmPiezas.map((cmmPieza) => cmmPieza.cmmDato.chunk));
  return new Map(await Promise.all(Array.from(cmmChunks, async (cmmChunk) => {
    const cmmNombre = cmmAtlas.chunks[cmmChunk].url.split('/').pop();
    const cmmRespuesta = await cmmLeerBuilder('datos/' + cmmNombre, cmmSignal);
    return [cmmChunk, await cmmRespuesta.arrayBuffer()];
  })));
}

export function cmmMallaBuilder(cmmPieza, cmmBloque, cmmMaterial) {
  const cmmDato = cmmPieza.cmmDato;
  const cmmGeometria = new cmmTres.BufferGeometry();
  const cmmPos = new Float32Array(cmmBloque, cmmDato.positions, cmmDato.vertexCount * 3).slice();
  const cmmNormal = new Int16Array(cmmBloque, cmmDato.normals, cmmDato.vertexCount * 3).slice();
  const cmmIndice = new Uint32Array(cmmBloque, cmmDato.indices, cmmDato.indexCount).slice();
  cmmGeometria.setAttribute('position', new cmmTres.BufferAttribute(cmmPos, 3));
  cmmGeometria.setAttribute('normal', new cmmTres.BufferAttribute(cmmNormal, 3, true));
  cmmGeometria.setIndex(new cmmTres.BufferAttribute(cmmIndice, 1));
  cmmGeometria.computeBoundingBox();
  return new cmmTres.Mesh(cmmGeometria, cmmMaterial);
}

export function cmmCrearPiezaBuilder(cmmTablero, cmmPieza, cmmMalla, cmmDificultad, cmmRadioRegion) {
  cmmTablero.add(cmmMalla);
  const cmmCaja = cmmMalla.geometry.boundingBox.clone();
  const cmmCentro = cmmCaja.getCenter(new cmmTres.Vector3());
  const cmmRadio = cmmCaja.getBoundingSphere(new cmmTres.Sphere()).radius;
  const cmmPivote = new cmmTres.Group();
  cmmPivote.position.copy(cmmCentro);
  cmmTablero.add(cmmPivote);
  cmmPivote.attach(cmmMalla);
  return {
    ...cmmPieza, cmmMalla, cmmCaja, cmmRadio, cmmPivote,
    cmmObjetivo: { cmmId: cmmPieza.cmmId, cmmLado: cmmPieza.cmmLado, cmmPosicion: cmmCentro },
    cmmTolerancia: cmmTres.MathUtils.clamp(cmmRadio * .48, cmmRadioRegion * .025, cmmRadioRegion * .12) * cmmDificultad.cmmFactor,
    cmmEstado: 'disponible'
  };
}

export function cmmEvaluarEncaje(cmmPieza, cmmObjetivo, cmmPose) {
  const cmmDistancia = cmmPose.cmmPosicion.distanceTo(cmmObjetivo.cmmPosicion);
  const cmmMismaPieza = !cmmPieza.cmmEsIntrusa && cmmPieza.cmmId === cmmObjetivo.cmmId && cmmPieza.cmmLado === cmmObjetivo.cmmLado;
  return {
    cmmDistancia,
    cmmCerca: cmmMismaPieza && cmmDistancia <= cmmPieza.cmmTolerancia * 2.2,
    cmmValido: cmmMismaPieza && cmmDistancia <= cmmPieza.cmmTolerancia
  };
}

export function cmmPoseBuilder(cmmPieza, cmmTablero) {
  const cmmPivote = cmmPieza.cmmPivote;
  if (cmmPivote.parent === cmmTablero) {
    return { cmmPosicion: cmmPivote.position.clone() };
  }
  return { cmmPosicion: cmmTablero.worldToLocal(cmmPivote.getWorldPosition(new cmmTres.Vector3())) };
}

export function cmmDistribuirBuilder(cmmPiezas, cmmCaja, cmmDificultad, cmmSemilla, cmmLayout) {
  let cmmEstado = cmmSemilla >>> 0;
  const cmmAleatorio = () => {
    cmmEstado = (Math.imul(cmmEstado, 1664525) + 1013904223) >>> 0;
    return cmmEstado / 4294967296;
  };
  const cmmOrden = [...cmmPiezas];
  for (let cmmI = cmmOrden.length - 1; cmmI > 0; cmmI--) {
    const cmmJ = Math.floor(cmmAleatorio() * (cmmI + 1));
    [cmmOrden[cmmI], cmmOrden[cmmJ]] = [cmmOrden[cmmJ], cmmOrden[cmmI]];
  }
  const cmmCentro = cmmCaja.getCenter(new cmmTres.Vector3());
  const cmmTamano = cmmCaja.getSize(new cmmTres.Vector3());
  const cmmMax = Math.max(...cmmOrden.map((cmmPieza) => cmmPieza.cmmRadio));
  const cmmPaso = cmmMax * 2.3;
  const cmmRadio = cmmTamano.length() / 2 + cmmMax + cmmPaso / (2 * Math.sin(Math.PI / Math.max(2, cmmOrden.length)));
  const cmmFilas = Math.ceil(cmmOrden.length / 2);
  return new Map(cmmOrden.map((cmmPieza, cmmI) => {
    const cmmAngulo = Math.PI * 2 * cmmI / cmmOrden.length;
    const cmmX = cmmLayout === 'mesa' ? (cmmI % 2 ? 1 : -1) * (cmmTamano.x / 2 + cmmPaso * .8) : Math.cos(cmmAngulo) * cmmRadio;
    const cmmY = cmmLayout === 'mesa' ? ((cmmFilas - 1) / 2 - Math.floor(cmmI / 2)) * cmmPaso : Math.sin(cmmAngulo) * cmmRadio;
    return [cmmPieza.cmmId, {
      cmmPosicion: new cmmTres.Vector3(cmmCentro.x + cmmX, cmmCentro.y + cmmY, cmmDificultad.cmmPlanoObjetivo ? cmmPieza.cmmObjetivo.cmmPosicion.z : cmmCentro.z)
    }];
  }));
}
