import cmmPrueba from 'node:test';
import cmmAfirmar from 'node:assert/strict';
import { readFileSync as cmmLeer } from 'node:fs';
import { cmmCrearInventarioBuilder } from '../js/cmm-builder-inventario.js';
import { cmmRegionDe } from '../js/cmm-regiones.js';

const cmmDatos = new URL('../datos/', import.meta.url);
const cmmAtlas = JSON.parse(cmmLeer(new URL('atlas.json', cmmDatos), 'utf8'));
const cmmNombres = JSON.parse(cmmLeer(new URL('nombres-es.json', cmmDatos), 'utf8'));
const cmmPieza = cmmAtlas.parts.find((cmmFila) => cmmFila.id === 'FJ3288');

function cmmLeerBloque(cmmBloque) {
  return cmmLeer(new URL(cmmBloque.url.split('/').pop(), cmmDatos));
}

function cmmInventarioDePrueba(cmmPartes, cmmBloques) {
  const cmmConcepto = cmmAtlas.concepts.find((cmmFila) => cmmFila.id === cmmPieza.conceptId);
  return cmmCrearInventarioBuilder({ ...cmmAtlas, parts: cmmPartes, concepts: [cmmConcepto] }, {}, cmmBloques);
}

cmmPrueba('el inventario real conserva la diferencia entre mallas, conceptos y candidatas', () => {
  const cmmBloques = new Map(cmmAtlas.chunks.map((cmmBloque, cmmI) => [cmmI, cmmLeerBloque(cmmBloque)]));
  const cmmInventario = cmmCrearInventarioBuilder(cmmAtlas, cmmNombres, cmmBloques);
  const cmmGuardado = JSON.parse(cmmLeer(new URL('cmm-builder-inventario.json', cmmDatos), 'utf8'));
  cmmAfirmar.deepEqual(cmmInventario, cmmGuardado);
  cmmAfirmar.equal(cmmInventario.cmmMallas.length, 2234);
  cmmAfirmar.equal(cmmInventario.cmmConceptos.length, 3432);
  cmmAfirmar.deepEqual(cmmInventario.cmmTraduccionesFaltantes, []);
  const cmmPorId = new Map(cmmInventario.cmmMallas.map((cmmMalla) => [cmmMalla.cmmId, cmmMalla]));
  cmmAfirmar.equal(cmmPorId.size, cmmInventario.cmmMallas.length);
  cmmAfirmar(cmmInventario.cmmCandidatas.every((cmmId) => cmmPorId.get(cmmId)?.cmmTipo === 'cmm-malla-individual'));
  cmmAfirmar(cmmInventario.cmmCandidatas.every((cmmId) => !cmmPorId.get(cmmId).cmmIncidencias.length));
  cmmAfirmar(cmmInventario.cmmConceptos.every((cmmConcepto) => !cmmConcepto.cmmReferenciasNoResueltas.length));
  const cmmIzquierda = cmmPorId.get(cmmPieza.id);
  cmmAfirmar.equal(cmmIzquierda.cmmNombre, cmmNombres[cmmPieza.name.toLowerCase()]);
  cmmAfirmar.equal(cmmIzquierda.cmmSistema, cmmPieza.system);
  cmmAfirmar.equal(cmmIzquierda.cmmLado, 'izquierda');
  cmmAfirmar.equal(cmmPorId.get('FJ3152').cmmLado, 'derecha');
  const [cmmMin, cmmMax] = cmmPieza.bounds;
  const cmmCentro = { x: (cmmMin[0] + cmmMax[0]) / 2, y: (cmmMin[1] + cmmMax[1]) / 2, z: (cmmMin[2] + cmmMax[2]) / 2 };
  cmmAfirmar.equal(cmmIzquierda.cmmRegion, cmmRegionDe({ cmmCentro }).cmmId);
  cmmAfirmar.equal(cmmIzquierda.cmmCaja.cmmDiagonal, Math.hypot(...cmmMax.map((cmmValor, cmmI) => cmmValor - cmmMin[cmmI])));
  const cmmParcial = cmmPorId.get('FJ1285');
  const cmmAgrupacion = cmmInventario.cmmConceptos.find((cmmConcepto) => cmmConcepto.cmmId === cmmParcial.cmmConceptoId);
  cmmAfirmar(cmmAgrupacion.cmmMallas.includes('FJ1286'));
  cmmAfirmar.equal(cmmParcial.cmmTipo, 'cmm-parte-de-concepto');
  cmmAfirmar.equal(cmmInventario.cmmCandidatas.includes(cmmParcial.cmmId), false);
  cmmAfirmar.deepEqual(cmmPorId.get('FJ2810').cmmIncidencias, ['cmm-escala-por-revisar']);
});

cmmPrueba('los fibulares cortos y los tractos iliotibiales conservan su lado y categoría anatómica', () => {
  const cmmEsperadas = [
    ['FJ1409', 'FMA22554', 'Fibular corto derecho', 'muscular', 'derecha'],
    ['FJ1409M', 'FMA22555', 'Fibular corto izquierdo', 'muscular', 'izquierda'],
    ['FJ1423', 'FMA58776', 'Tracto iliotibial derecho', 'connective', 'derecha'],
    ['FJ1423M', 'FMA58777', 'Tracto iliotibial izquierdo', 'connective', 'izquierda']
  ];
  const cmmGuardado = JSON.parse(cmmLeer(new URL('cmm-builder-inventario.json', cmmDatos), 'utf8'));
  for (const [cmmId, cmmConcepto, cmmNombre, cmmSistema, cmmLado] of cmmEsperadas) {
    const cmmParte = cmmAtlas.parts.find((cmmFila) => cmmFila.id === cmmId);
    const cmmMalla = cmmGuardado.cmmMallas.find((cmmFila) => cmmFila.cmmId === cmmId);
    cmmAfirmar.equal(cmmParte.conceptId, cmmConcepto, cmmId);
    cmmAfirmar.equal(cmmParte.system, cmmSistema, cmmId);
    cmmAfirmar.equal(cmmMalla.cmmSistema, cmmSistema, cmmId);
    cmmAfirmar.equal(cmmMalla.cmmNombre, cmmNombre, cmmId);
    cmmAfirmar.equal(cmmMalla.cmmLado, cmmLado, cmmId);
    cmmAfirmar.deepEqual(cmmMalla.cmmIncidencias, [], cmmId);
  }
});

cmmPrueba('la traducción ausente usa el nombre de origen y se registra', () => {
  const cmmBloques = new Map([[cmmPieza.chunk, cmmLeerBloque(cmmAtlas.chunks[cmmPieza.chunk])]]);
  const cmmInventario = cmmInventarioDePrueba([cmmPieza], cmmBloques);
  cmmAfirmar.equal(cmmInventario.cmmMallas[0].cmmNombre, cmmPieza.name);
  cmmAfirmar(cmmInventario.cmmTraduccionesFaltantes.includes(cmmPieza.name));
});

cmmPrueba('los IDs y rangos geométricos duplicados quedan fuera de candidatas', () => {
  const cmmBloques = new Map([[cmmPieza.chunk, cmmLeerBloque(cmmAtlas.chunks[cmmPieza.chunk])]]);
  const cmmInventario = cmmInventarioDePrueba([cmmPieza, { ...cmmPieza }], cmmBloques);
  for (const cmmMalla of cmmInventario.cmmMallas) {
    cmmAfirmar(cmmMalla.cmmIncidencias.includes('cmm-id-duplicado'));
    cmmAfirmar(cmmMalla.cmmIncidencias.includes('cmm-rango-geometrico-compartido'));
  }
  cmmAfirmar.equal(cmmInventario.cmmCandidatas.length, 0);
  cmmAfirmar(cmmInventario.cmmConceptos[0].cmmReferenciasNoResueltas.includes(cmmPieza.id));
});

cmmPrueba('detecta malla vacía, bloque ausente, rango inválido e índices alterados', () => {
  const cmmBytes = cmmLeerBloque(cmmAtlas.chunks[cmmPieza.chunk]);
  const cmmBloques = new Map([[cmmPieza.chunk, cmmBytes]]);
  const cmmComprobar = (cmmParte, cmmFuente, cmmMotivo) => {
    const cmmInventario = cmmInventarioDePrueba([cmmParte], cmmFuente);
    cmmAfirmar(cmmInventario.cmmMallas[0].cmmIncidencias.includes(cmmMotivo));
    cmmAfirmar.equal(cmmInventario.cmmCandidatas.length, 0);
  };
  cmmComprobar({ ...cmmPieza, indexCount: 0 }, cmmBloques, 'cmm-geometria-vacia');
  cmmComprobar(cmmPieza, new Map(), 'cmm-bloque-ausente-o-incompleto');
  cmmComprobar({ ...cmmPieza, indices: cmmBytes.length }, cmmBloques, 'cmm-rango-invalido');
  cmmBytes.writeUInt32LE(cmmPieza.vertexCount, cmmPieza.indices);
  cmmComprobar(cmmPieza, cmmBloques, 'cmm-indice-fuera-de-rango');
  cmmBytes.fill(0, cmmPieza.indices, cmmPieza.indices + cmmPieza.indexCount * 4);
  cmmComprobar(cmmPieza, cmmBloques, 'cmm-geometria-sin-area');
});

cmmPrueba('una caja invertida y una escala fuera del intervalo quedan señaladas', () => {
  const cmmBloques = new Map([[cmmPieza.chunk, cmmLeerBloque(cmmAtlas.chunks[cmmPieza.chunk])]]);
  const cmmCajaInvalida = cmmInventarioDePrueba([{ ...cmmPieza, bounds: [...cmmPieza.bounds].reverse() }], cmmBloques);
  cmmAfirmar.deepEqual(cmmCajaInvalida.cmmMallas[0].cmmIncidencias, ['cmm-caja-invalida']);
  cmmAfirmar.equal(cmmCajaInvalida.cmmMallas[0].cmmRegion, null);
  const cmmCajaPequena = cmmPieza.bounds.map((cmmExtremo) => cmmExtremo.map((cmmCoord) => cmmCoord / 1000));
  const cmmEscala = cmmInventarioDePrueba([{ ...cmmPieza, bounds: cmmCajaPequena }], cmmBloques);
  cmmAfirmar.deepEqual(cmmEscala.cmmMallas[0].cmmIncidencias, ['cmm-escala-por-revisar']);
  cmmAfirmar.deepEqual(cmmEscala.cmmCandidatas, []);
});
