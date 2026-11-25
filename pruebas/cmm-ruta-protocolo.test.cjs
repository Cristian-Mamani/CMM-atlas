const cmmPrueba = require('node:test');
const cmmAfirmar = require('node:assert/strict');
const cmmRuta = require('node:path');
const { cmmResolverRutaProtocolo, cmmRutaPublicaProtocolo, cmmEsLicenciaExterna } = require('../js/cmm-ruta-protocolo.cjs');

const cmmRaiz = cmmRuta.resolve('cmm-atlas');

cmmPrueba('resuelve una ruta válida dentro del atlas', () => {
  cmmAfirmar.equal(cmmResolverRutaProtocolo(cmmRaiz, '/datos/atlas.json'), cmmRuta.join(cmmRaiz, 'datos', 'atlas.json'));
});

cmmPrueba('rechaza una ruta que sube por encima de la raíz con ../', () => {
  cmmAfirmar.equal(cmmResolverRutaProtocolo(cmmRaiz, '../datos/atlas.json'), null);
});

cmmPrueba('rechaza la carpeta hermana cmm-atlas-otro aunque comparta el prefijo', () => {
  cmmAfirmar.equal(cmmResolverRutaProtocolo(cmmRaiz, '../cmm-atlas-otro/index.html'), null);
});

cmmPrueba('el protocolo solo sirve recursos públicos y el host local del atlas', () => {
  cmmAfirmar.equal(cmmRutaPublicaProtocolo(cmmRaiz, 'cmm://app/'), cmmRuta.join(cmmRaiz, 'index.html'));
  cmmAfirmar.equal(cmmRutaPublicaProtocolo(cmmRaiz, 'cmm://app/node_modules/three/build/three.module.js'), cmmRuta.join(cmmRaiz, 'node_modules', 'three', 'build', 'three.module.js'));
  for (const cmmDireccion of ['cmm://app/.git/config', 'cmm://app/pruebas/cmm-builder.test.js', 'cmm://privado/datos/atlas.json', 'cmm://app/datos/%FF']) {
    cmmAfirmar.equal(cmmRutaPublicaProtocolo(cmmRaiz, cmmDireccion), null);
  }
});

cmmPrueba('el enlace externo acordado es solo el de atribución publicado en la app', () => {
  cmmAfirmar.equal(cmmEsLicenciaExterna('https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html'), true);
  cmmAfirmar.equal(cmmEsLicenciaExterna('file:///index.html'), false);
});
