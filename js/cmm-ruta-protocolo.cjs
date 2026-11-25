const cmmRuta = require('node:path');

function cmmResolverRutaProtocolo(cmmRaiz, cmmRutaSolicitada) {
  const cmmArchivo = cmmRuta.join(cmmRaiz, cmmRutaSolicitada);
  const cmmRelativa = cmmRuta.relative(cmmRaiz, cmmArchivo);
  if (cmmRuta.isAbsolute(cmmRelativa) || cmmRelativa.split(cmmRuta.sep, 1)[0] === '..') return null;
  return cmmArchivo;
}

function cmmRutaPublicaProtocolo(cmmRaiz, cmmDireccion) {
  let cmmUrl;
  let cmmRelativa;
  try {
    cmmUrl = new URL(cmmDireccion);
    cmmRelativa = decodeURIComponent(cmmUrl.pathname);
  } catch {
    return null;
  }
  if (cmmUrl.protocol !== 'cmm:' || cmmUrl.hostname !== 'app' || cmmUrl.port || cmmUrl.username || cmmUrl.password ||
    /[\\:\u0000-\u001f]/.test(cmmRelativa)) return null;
  if (cmmRelativa === '/') cmmRelativa = '/index.html';
  if (!/^\/(?:index\.html$|estilos\.css$|js\/|datos\/|node_modules\/three\/)/.test(cmmRelativa)) return null;
  if (cmmRelativa.split('/').some((cmmParte) => cmmParte === '..' || cmmParte.startsWith('.'))) return null;
  return cmmResolverRutaProtocolo(cmmRaiz, cmmRelativa);
}

function cmmEsLicenciaExterna(cmmDireccion) {
  return cmmDireccion === 'https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html';
}

module.exports = { cmmResolverRutaProtocolo, cmmRutaPublicaProtocolo, cmmEsLicenciaExterna };
