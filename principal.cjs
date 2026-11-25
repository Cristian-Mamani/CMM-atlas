const { app: cmmApp, BrowserWindow: cmmVentana, protocol: cmmProtocolo, Menu: cmmMenu, shell: cmmShell } = require('electron');
const cmmRuta = require('path');
const cmmFs = require('fs');
const { cmmResolverRutaProtocolo, cmmRutaPublicaProtocolo, cmmEsLicenciaExterna } = require('./js/cmm-ruta-protocolo.cjs');

const cmmRaiz = __dirname;
const cmmTipos = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.bin': 'application/octet-stream',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.txt': 'text/plain; charset=utf-8'
};

cmmProtocolo.registerSchemesAsPrivileged([
  { scheme: 'cmm', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } }
]);

async function cmmAtender(cmmPeticion) {
  if (cmmPeticion.method !== 'GET') return new Response('', { status: 405 });
  const cmmArchivo = cmmRutaPublicaProtocolo(cmmRaiz, cmmPeticion.url);
  if (cmmArchivo === null) {
    return new Response('', { status: 403 });
  }
  try {
    const cmmReal = await cmmFs.promises.realpath(cmmArchivo);
    if (cmmResolverRutaProtocolo(cmmRaiz, cmmRuta.relative(cmmRaiz, cmmReal)) === null) return new Response('', { status: 403 });
    const cmmContenido = await cmmFs.promises.readFile(cmmReal);
    const cmmTipo = cmmTipos[cmmRuta.extname(cmmArchivo).toLowerCase()] || 'application/octet-stream';
    return new Response(cmmContenido, { headers: { 'content-type': cmmTipo, 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' } });
  } catch (cmmError) {
    return new Response('', { status: 404 });
  }
}

function cmmCrearVentana() {
  const cmmPrincipal = new cmmVentana({
    width: 1440,
    height: 900,
    minWidth: 1000,
    minHeight: 640,
    title: 'Atlas Anatomico CMM',
    backgroundColor: '#13262c',
    autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true }
  });
  cmmMenu.setApplicationMenu(null);
  cmmPrincipal.webContents.setWindowOpenHandler((cmmDatos) => {
    if (cmmEsLicenciaExterna(cmmDatos.url)) void cmmShell.openExternal(cmmDatos.url).catch(() => {});
    return { action: 'deny' };
  });
  cmmPrincipal.webContents.on('will-navigate', (cmmEvento, cmmDireccion) => {
    if (cmmDireccion !== 'cmm://app/index.html') cmmEvento.preventDefault();
  });
  cmmPrincipal.webContents.session.setPermissionRequestHandler((cmmWeb, cmmPermiso, cmmResponder) => cmmResponder(false));
  cmmPrincipal.maximize();
  cmmPrincipal.loadURL('cmm://app/index.html');
}

cmmApp.whenReady().then(() => {
  cmmProtocolo.handle('cmm', cmmAtender);
  cmmCrearVentana();
});

cmmApp.on('window-all-closed', () => cmmApp.quit());
