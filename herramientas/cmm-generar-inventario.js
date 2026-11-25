import { readFile as cmmLeer, writeFile as cmmEscribir } from 'node:fs/promises';
import { basename as cmmNombreBase } from 'node:path';
import { cmmCrearInventarioBuilder } from '../js/cmm-builder-inventario.js';

const cmmDatos = new URL('../datos/', import.meta.url);
const cmmAtlas = JSON.parse(await cmmLeer(new URL('atlas.json', cmmDatos), 'utf8'));
const cmmNombres = JSON.parse(await cmmLeer(new URL('nombres-es.json', cmmDatos), 'utf8'));
const cmmBloques = new Map();
for (const [cmmIndice, cmmBloque] of cmmAtlas.chunks.entries()) {
  try {
    const cmmBytes = await cmmLeer(new URL(cmmNombreBase(cmmBloque.url), cmmDatos));
    cmmBloques.set(cmmIndice, cmmBytes);
  } catch (cmmError) {
    if (cmmError.code !== 'ENOENT') throw cmmError;
  }
}
const cmmInventario = cmmCrearInventarioBuilder(cmmAtlas, cmmNombres, cmmBloques);
const cmmCampos = Object.entries(cmmInventario).map(([cmmClave, cmmValor]) => {
  const cmmTexto = Array.isArray(cmmValor) && cmmValor.length > 20
    ? '[\n    ' + cmmValor.map((cmmFila) => JSON.stringify(cmmFila)).join(',\n    ') + '\n  ]'
    : JSON.stringify(cmmValor);
  return '  ' + JSON.stringify(cmmClave) + ': ' + cmmTexto;
});
const cmmJson = '{\n' + cmmCampos.join(',\n') + '\n}\n';
if (process.argv.includes('--cmm-comprobar')) {
  const cmmGuardado = await cmmLeer(new URL('cmm-builder-inventario.json', cmmDatos), 'utf8');
  if (cmmGuardado !== cmmJson) throw new Error('El manifiesto guardado no coincide con las fuentes del atlas.');
} else {
  await cmmEscribir(new URL('cmm-builder-inventario.json', cmmDatos), cmmJson);
}
console.log(`${cmmInventario.cmmMallas.length} mallas, ${cmmInventario.cmmConceptos.length} conceptos, ${cmmInventario.cmmCandidatas.length} candidatas individuales`);
const cmmConteos = new Map();
for (const { cmmIncidencias } of cmmInventario.cmmMallas) {
  for (const cmmIncidencia of cmmIncidencias) cmmConteos.set(cmmIncidencia, (cmmConteos.get(cmmIncidencia) ?? 0) + 1);
}
console.log(`Incidencias por tipo: ${JSON.stringify(Object.fromEntries(cmmConteos))}`);
console.log(`Nombres de malla compartidos: ${cmmInventario.cmmNombresCompartidos.length}; traducciones faltantes: ${cmmInventario.cmmTraduccionesFaltantes.length}`);
