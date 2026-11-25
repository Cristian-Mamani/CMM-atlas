const { app: cmmApp } = require('electron');
const cmmFs = require('node:fs');
const cmmRuta = require('node:path');
const cmmOs = require('node:os');
const cmmAfirmar = require('node:assert/strict');
const { cmmVerificarCatalogo, cmmVerificarNiveles, cmmVerificarReapertura } = require('./cmm-verificacion-atlas.cjs');
const cmmReapertura = process.env.CMM_REAPERTURA_ELECTRON === '1';
const cmmIntegral = process.env.CMM_VERIFICACION_INTEGRAL === '1';
const cmmSoloNiveles = process.env.CMM_NIVELES_ELECTRON === '1';
const cmmPerfil = process.env.CMM_PERFIL_ELECTRON
  ? cmmRuta.resolve(process.env.CMM_PERFIL_ELECTRON) : cmmFs.mkdtempSync(cmmRuta.join(cmmOs.tmpdir(), 'cmm-builder-electron-'));
if (cmmReapertura) {
  const cmmRaizPrueba = cmmRuta.resolve(__dirname, '..', 'salida');
  if (cmmRuta.dirname(cmmPerfil) !== cmmRaizPrueba || !cmmRuta.basename(cmmPerfil).startsWith('.cmm-verificacion-')) {
    throw new Error('La reapertura requiere un perfil aislado de pruebas dentro de salida.');
  }
}
cmmApp.setPath('userData', cmmPerfil);
cmmApp.commandLine.appendSwitch('disable-backgrounding-occluded-windows');

const cmmInforme = { cmmElectron: process.versions.electron, cmmPasos: [], cmmErrores: [], cmmMediciones: {} };
const cmmSalida = cmmRuta.join(__dirname, cmmReapertura ? '.cmm-reapertura-electron.json'
  : cmmSoloNiveles ? '.cmm-niveles-electron.json' : '.cmm-builder-electron.json');
const cmmGuardar = () => cmmFs.writeFileSync(cmmSalida, JSON.stringify(cmmInforme, null, 2));
const cmmRegistrar = (cmmPaso) => { cmmInforme.cmmPasos.push(cmmPaso); cmmGuardar(); };
const cmmPausa = (cmmMs = 75) => new Promise((cmmResolver) => setTimeout(cmmResolver, cmmMs));

cmmGuardar();
cmmApp.on('browser-window-created', (cmmEvento, cmmVentana) => {
  cmmVentana.on('page-title-updated', (cmmEv) => cmmEv.preventDefault());
  cmmVentana.setTitle('Atlas CMM — prueba de Anatomy Builder');
  const cmmWeb = cmmVentana.webContents;
  cmmWeb.setBackgroundThrottling(false);
  cmmWeb.on('console-message', (cmmEv, cmmNivel, cmmMensaje) => {
    if (cmmNivel >= 3) { cmmInforme.cmmErrores.push(cmmMensaje); cmmGuardar(); }
  });
  cmmWeb.on('render-process-gone', (cmmEv, cmmDetalle) => {
    cmmInforme.cmmErrores.push(cmmDetalle);
    cmmGuardar();
  });
  cmmWeb.once('did-finish-load', async () => {
    const cmmEvaluar = (cmmCodigo) => cmmWeb.executeJavaScript(cmmCodigo, true);
    const cmmCapturar = async (cmmNombre) => {
      const cmmCapturas = (process.env.CMM_CAPTURAS_ELECTRON || '').split(',');
      if (!cmmCapturas.includes('1') && !cmmCapturas.includes(cmmNombre)) return;
      const cmmCarpeta = cmmRuta.resolve(__dirname, '..', 'docs', 'cmm-capturas');
      cmmFs.mkdirSync(cmmCarpeta, { recursive: true });
      const cmmImagen = await cmmWeb.capturePage();
      const cmmPng = cmmImagen.isEmpty()
        ? Buffer.from((await cmmWeb.debugger.sendCommand('Page.captureScreenshot', { format: 'png' })).data, 'base64')
        : cmmImagen.toPNG();
      cmmFs.writeFileSync(cmmRuta.join(cmmCarpeta, cmmNombre + '.png'), cmmPng);
    };
    const cmmEsperar = async (cmmCondicion, cmmDescripcion) => {
      const cmmLimite = Date.now() + 18000;
      while (Date.now() < cmmLimite) {
        if (await cmmEvaluar(cmmCondicion)) return;
        await cmmPausa(100);
      }
      throw new Error(cmmDescripcion + ' no respondió.');
    };
    const cmmClic = async (cmmSelector) => {
      const cmmP = await cmmEvaluar(`(() => { const cmmEl = document.querySelector(${JSON.stringify(cmmSelector)}); if (!cmmEl || cmmEl.disabled) return null; cmmEl.scrollIntoView({block:'nearest'}); const cmmR = cmmEl.getBoundingClientRect(); return [cmmR.x+cmmR.width/2,cmmR.y+cmmR.height/2]; })()`);
      cmmAfirmar(cmmP, cmmSelector);
      await cmmMover('mousePressed', cmmP);
      await cmmMover('mouseReleased', cmmP);
    };
    const cmmMover = (cmmTipo, [cmmX, cmmY]) => cmmWeb.debugger.sendCommand('Input.dispatchMouseEvent', {
      type: cmmTipo, x: cmmX, y: cmmY, button: 'left', buttons: cmmTipo === 'mousePressed' ? 1 : 0, clickCount: 1
    });
    const cmmEnviarArrastre = (cmmTipo, [cmmX, cmmY], cmmPulsado) => {
      cmmWeb.sendInputEvent({
        type: cmmTipo, x: Math.round(cmmX), y: Math.round(cmmY), button: 'left',
        clickCount: cmmTipo === 'mouseMove' ? 0 : 1,
        modifiers: cmmPulsado ? ['leftButtonDown'] : []
      });
    };
    try {
      cmmWeb.debugger.attach('1.3');
      await cmmEsperar('!document.querySelector("#cmm-builder-abrir").disabled', 'Atlas');
      cmmAfirmar(await cmmEvaluar('typeof require === "undefined" && typeof process === "undefined"'));
      cmmAfirmar.deepEqual(await cmmEvaluar(`Promise.all(['/datos/atlas.json', '/.git/config', '/pruebas/cmm-builder.test.js'].map(async cmmRuta => (await fetch(cmmRuta)).status))`), [200, 403, 403]);
      cmmRegistrar('Atlas abierto desde principal.cjs');
      if (cmmReapertura) {
        await cmmVerificarReapertura({ cmmEvaluar, cmmClic, cmmEsperar, cmmCapturar, cmmRegistrar, cmmWeb, cmmPerfil });
        cmmInforme.cmmResultado = 'correcto';
        return;
      }
      await cmmEvaluar(`(async () => {
        const { CMMAnatomyBuilder } = await import('./js/cmm-builder.js');
        const { CMMEscena } = await import('./js/cmm-escena.js');
        const { CMMExamen } = await import('./js/cmm-examen.js');
        globalThis.cmmPruebaAtlas = { cmmRender: 0 };
        const cmmMontar = CMMAnatomyBuilder.prototype.cmmMostrarCatalogo;
        const cmmGiro = CMMEscena.prototype.cmmGiro;
        CMMEscena.prototype.cmmGiro = function(cmmActivo) {
          if (!globalThis.cmmPruebaAtlas.cmmEscena) {
            globalThis.cmmPruebaAtlas.cmmEscena = this;
            const cmmDibujar = this.cmmRender.render.bind(this.cmmRender);
            this.cmmRender.render = (...cmmArgs) => {
              globalThis.cmmPruebaAtlas.cmmRender++;
              return cmmDibujar(...cmmArgs);
            };
          }
          return cmmGiro.call(this, cmmActivo);
        };
        CMMAnatomyBuilder.prototype.cmmMostrarCatalogo = function() {
          globalThis.cmmPruebaBuilder = this;
          return cmmMontar.call(this);
        };
        const cmmMostrarExamen = CMMExamen.prototype.cmmMostrar;
        CMMExamen.prototype.cmmMostrar = function() {
          cmmPruebaAtlas.cmmExamen = this;
          return cmmMostrarExamen.call(this);
        };
      })()`);
      await cmmClic('#cmm-giro');
      await cmmClic('#cmm-giro');
      if (cmmSoloNiveles) {
        cmmInforme.cmmMediciones.cmmNiveles = await cmmVerificarNiveles({ cmmEvaluar, cmmClic, cmmMover, cmmEsperar, cmmCapturar, cmmRegistrar, cmmWeb });
        cmmInforme.cmmResultado = 'correcto';
        return;
      }
      await cmmClic('#cmm-herramientas-abrir');
      const cmmTecla = async (cmmTeclaPulsada, cmmCodigo, cmmTexto = '') => {
        const cmmDatos = { key: cmmTeclaPulsada, windowsVirtualKeyCode: cmmCodigo };
        await cmmWeb.debugger.sendCommand('Input.dispatchKeyEvent', { ...cmmDatos, type: 'keyDown', text: cmmTexto });
        await cmmWeb.debugger.sendCommand('Input.dispatchKeyEvent', { ...cmmDatos, type: 'keyUp' });
      };
      const cmmLeerExplosion = (cmmSistema) => cmmEvaluar(`(() => {
        const cmmEscena = cmmPruebaAtlas.cmmEscena;
        const cmmVisibles = cmmEscena.cmmPiezas.filter(cmmP => cmmEscena.cmmOpacidadDe(cmmP) > 0);
        const cmmMovidas = cmmVisibles.filter(cmmP =>
          cmmEscena.cmmPosicionMundo(cmmP).distanceToSquared(cmmP.cmmCentro) > 0);
        return {
          cmmSistema: document.querySelector('#cmm-ex-sistema').value,
          cmmRangos: ['cmm-ex-valor', 'cmm-ex-valor-panel'].map(cmmId => document.getElementById(cmmId).valueAsNumber),
          cmmPorcentajes: ['cmm-ex-porcentaje', 'cmm-ex-porcentaje-panel'].map(cmmId => document.getElementById(cmmId).value),
          cmmCoinciden: cmmVisibles.every(cmmP => cmmP.cmmSistema === ${JSON.stringify(cmmSistema)}),
          cmmVisibles: cmmVisibles.length,
          cmmMovidas: cmmMovidas.length
        };
      })()`);
      const cmmComprobarExplosion = async (cmmSistema, cmmValor, cmmVisibles, cmmCoinciden) => {
        cmmAfirmar.deepEqual(await cmmLeerExplosion(cmmSistema), {
          cmmSistema, cmmRangos: [cmmValor, cmmValor],
          cmmPorcentajes: [cmmValor + ' %', cmmValor + ' %'], cmmCoinciden, cmmVisibles,
          cmmMovidas: cmmValor === 0 ? 0 : cmmVisibles
        });
      };
      const cmmEncuadre = async () => {
        await cmmEsperar('!cmmPruebaAtlas.cmmEscena.cmmTween', 'Encuadre de la separación');
        const cmmFuera = await cmmEvaluar(`(async () => {
          const { Vector3: CMMVector } = await import('three');
          const cmmE = cmmPruebaAtlas.cmmEscena;
          const cmmIzquierda = document.querySelector('#cmm-lateral').getBoundingClientRect().right;
          const cmmDerecha = document.querySelector('#cmm-camara').getBoundingClientRect().left;
          const cmmArriba = document.querySelector('#cmm-cabecera').getBoundingClientRect().bottom;
          const cmmAbajo = document.querySelector('#cmm-separar').getBoundingClientRect().top;
          return cmmE.cmmPiezas.filter(cmmP => cmmE.cmmOpacidadDe(cmmP) > 0).filter(cmmP => {
            const cmmD = cmmE.cmmPosicionMundo(cmmP).sub(cmmP.cmmCentro);
            for (const cmmX of [cmmP.cmmCaja.min.x, cmmP.cmmCaja.max.x]) {
              for (const cmmY of [cmmP.cmmCaja.min.y, cmmP.cmmCaja.max.y]) {
                for (const cmmZ of [cmmP.cmmCaja.min.z, cmmP.cmmCaja.max.z]) {
                  const cmmPunto = cmmE.cmmProyectar(new CMMVector(cmmX, cmmY, cmmZ).add(cmmD));
                  if (cmmPunto.cmmX < cmmIzquierda || cmmPunto.cmmX > cmmDerecha ||
                      cmmPunto.cmmY < cmmArriba || cmmPunto.cmmY > cmmAbajo) return true;
                }
              }
            }
            return false;
          }).map(cmmP => cmmP.cmmId);
        })()`);
        cmmAfirmar.deepEqual(cmmFuera, [], 'Piezas fuera del área útil');
      };
      const cmmCapasIniciales = (await cmmLeerExplosion('todo')).cmmVisibles;
      await cmmComprobarExplosion('todo', 0, cmmCapasIniciales, false);
      const cmmCamaraAntes = await cmmEvaluar('cmmPruebaAtlas.cmmEscena.cmmCapturarCamara()');
      await cmmEvaluar('document.querySelector("#cmm-ex-sistema").focus()');
      await cmmTecla('c', 67, 'c');
      await cmmComprobarExplosion('cardiac', 100, 23, true);
      cmmAfirmar.equal(await cmmEvaluar('document.querySelector("#cmm-titulo-separar").textContent'), 'Separar corazón');
      await cmmClic('#cmm-ex-restablecer');
      await cmmComprobarExplosion('cardiac', 0, cmmCapasIniciales, false);
      await cmmEsperar('!cmmPruebaAtlas.cmmEscena.cmmTween', 'Restablecer cámara del atlas');
      const cmmCamaraDespues = await cmmEvaluar('cmmPruebaAtlas.cmmEscena.cmmCapturarCamara()');
      cmmAfirmar(cmmCamaraAntes.cmmPos.every((cmmValor, cmmI) => Math.abs(cmmValor - cmmCamaraDespues.cmmPos[cmmI]) < 0.001));
      cmmAfirmar.deepEqual(cmmCamaraDespues.cmmObj, cmmCamaraAntes.cmmObj);
      const cmmSistemasExplosion = await cmmEvaluar(`Array.from(document.querySelector('#cmm-ex-sistema').options).slice(1)
        .map(cmmOpcion => [cmmOpcion.value, cmmPruebaAtlas.cmmEscena.cmmPiezas.filter(cmmP => cmmP.cmmSistema === cmmOpcion.value).length])`);
      cmmAfirmar.equal(cmmSistemasExplosion.length, 15);
      await cmmEvaluar(`(() => {
        const cmmSelector = document.querySelector('#cmm-ex-sistema');
        cmmSelector.scrollIntoView({ block: 'center' });
        cmmSelector.focus({ preventScroll: true });
      })()`);
      await cmmTecla('Home', 36);
      const cmmCapturasSistemas = new Map([
        ['skeletal', 'cmm-explosion-esqueleto-electron'],
        ['muscular', 'cmm-explosion-musculos-electron'],
        ['cardiac', 'cmm-explosion-corazon-electron'],
        ['digestive', 'cmm-explosion-digestivo-electron']
      ]);
      for (const [cmmSistema, cmmCantidad] of cmmSistemasExplosion) {
        await cmmTecla('ArrowDown', 40);
        await cmmComprobarExplosion(cmmSistema, 100, cmmCantidad, true);
        await cmmEncuadre();
        if (cmmCapturasSistemas.has(cmmSistema)) await cmmCapturar(cmmCapturasSistemas.get(cmmSistema));
      }
      await cmmTecla('Home', 36);
      await cmmComprobarExplosion('todo', 100, cmmCapasIniciales, false);
      await cmmEncuadre();
      await cmmCapturar('cmm-explosion-todos-electron');
      const cmmComprobarEtiquetas = async (cmmMaximas, cmmMinimas = 1, cmmSistema = null) => {
        await cmmEsperar(`[...document.querySelectorAll('#cmm-capa-etiquetas .cmm-etiqueta')]
          .some(cmmE => cmmE.getBoundingClientRect().width > 0)`, 'Etiquetas visibles');
        const cmmDatos = await cmmEvaluar(`(() => {
          const cmmCapa = document.querySelector('#cmm-capa-etiquetas');
          const cmmEtiquetas = [...cmmCapa.querySelectorAll('.cmm-etiqueta:not([hidden])')];
          const cmmRectangulos = cmmEtiquetas.map(cmmE => cmmE.getBoundingClientRect());
          const cmmLineas = [...cmmCapa.querySelectorAll('line:not([hidden])')];
          const cmmPaneles = [...document.querySelectorAll('#cmm-lateral, #cmm-sistemas, #cmm-camara, #cmm-derecha, #cmm-separar, #cmm-cabecera, #cmm-repaso-hoy')]
            .map(cmmE => cmmE.getBoundingClientRect()).filter(cmmR => cmmR.width > 0);
          const cmmSolapa = (cmmA, cmmB) => cmmA.left < cmmB.right && cmmA.right > cmmB.left &&
            cmmA.top < cmmB.bottom && cmmA.bottom > cmmB.top;
          const cmmEscena = cmmPruebaAtlas.cmmEscena;
          const cmmSistema = ${JSON.stringify(cmmSistema)};
          return {
            cmmCantidad: cmmRectangulos.length,
            cmmTapadas: cmmRectangulos.filter(cmmR => cmmPaneles.some(cmmP => cmmSolapa(cmmR, cmmP))).length,
            cmmSolapadas: cmmRectangulos.filter((cmmR, cmmI) =>
              cmmRectangulos.slice(0, cmmI).some(cmmP => cmmSolapa(cmmR, cmmP))).length,
            cmmLineasLargas: cmmLineas.filter(cmmL =>
              Math.hypot(cmmL.x1.baseVal.value - cmmL.x2.baseVal.value, cmmL.y1.baseVal.value - cmmL.y2.baseVal.value) > 50).length,
            cmmLineas: cmmLineas.length,
            cmmAnclasIncorrectas: cmmEtiquetas.filter((cmmE, cmmI) => {
              const cmmPieza = cmmEscena.cmmPorId.get(cmmE.dataset.cmmEtPieza);
              if (!cmmPieza || cmmEscena.cmmOpacidadDe(cmmPieza) < 0.5 || cmmE.textContent !== cmmPieza.cmmNombre
                  || (cmmSistema && cmmPieza.cmmSistema !== cmmSistema)) return true;
              const cmmAncla = cmmEscena.cmmProyectar(cmmEscena.cmmPosicionMundo(cmmPieza));
              const cmmL = cmmLineas[cmmI];
              return !cmmL || Math.hypot(cmmL.x1.baseVal.value - cmmAncla.cmmX, cmmL.y1.baseVal.value - cmmAncla.cmmY) > 0.5;
            }).length
          };
        })()`);
        cmmAfirmar(cmmDatos.cmmCantidad >= cmmMinimas && cmmDatos.cmmCantidad <= cmmMaximas, JSON.stringify(cmmDatos));
        cmmAfirmar.deepEqual(cmmDatos, { cmmCantidad: cmmDatos.cmmCantidad, cmmTapadas: 0, cmmSolapadas: 0,
          cmmLineasLargas: 0, cmmLineas: cmmDatos.cmmCantidad, cmmAnclasIncorrectas: 0 });
      };
      await cmmClic('#cmm-et-activo');
      const cmmComprobarLamina = async (cmmSistema) => {
        cmmAfirmar(await cmmEvaluar('document.querySelector("#cmm-et-lamina").open'));
        const cmmDatos = await cmmEvaluar(`(() => {
          const cmmSistema = ${JSON.stringify(cmmSistema)};
          const cmmPiezas = cmmPruebaAtlas.cmmEscena.cmmPiezas.filter(cmmPieza =>
            cmmSistema === 'todo' || cmmPieza.cmmSistema === cmmSistema);
          const cmmTarjetas = [...document.querySelectorAll('#cmm-et-lamina-lista [data-cmm-et-lamina-pieza]')];
          const cmmEsperadas = new Map(cmmPiezas.map(cmmPieza => [cmmPieza.cmmId, cmmPieza.cmmNombre]));
          return {
            cmmTotal: cmmPiezas.length,
            cmmActuales: cmmTarjetas.length,
            cmmUnicas: new Set(cmmTarjetas.map(cmmTarjeta => cmmTarjeta.dataset.cmmEtLaminaPieza)).size,
            cmmCorrectas: cmmTarjetas.every(cmmTarjeta =>
              cmmTarjeta.querySelector('.cmm-et-lamina-nombre').textContent === cmmEsperadas.get(cmmTarjeta.dataset.cmmEtLaminaPieza)),
            cmmCodigos: cmmTarjetas.every(cmmTarjeta => {
              const cmmCodigo = cmmTarjeta.querySelector('.cmm-et-lamina-codigo');
              return !cmmCodigo || cmmCodigo.textContent === cmmTarjeta.dataset.cmmEtLaminaPieza;
            })
          };
        })()`);
        cmmAfirmar.deepEqual(cmmDatos, { cmmTotal: cmmDatos.cmmTotal, cmmActuales: cmmDatos.cmmTotal,
          cmmUnicas: cmmDatos.cmmTotal, cmmCorrectas: true, cmmCodigos: true });
        return cmmDatos.cmmTotal;
      };
      const cmmMiniaturaLamina = async (cmmSelector) => {
        await cmmEsperar(`document.querySelector(${JSON.stringify(cmmSelector)})?.naturalWidth === 160`, 'Miniatura de la lámina');
        cmmAfirmar(await cmmEvaluar(`(() => {
          const cmmImagen = document.querySelector(${JSON.stringify(cmmSelector)});
          const cmmLienzo = document.createElement('canvas');
          cmmLienzo.width = cmmImagen.naturalWidth;
          cmmLienzo.height = cmmImagen.naturalHeight;
          const cmmContexto = cmmLienzo.getContext('2d');
          cmmContexto.drawImage(cmmImagen, 0, 0);
          const cmmDatos = cmmContexto.getImageData(0, 0, cmmLienzo.width, cmmLienzo.height).data;
          return cmmDatos.some((cmmValor, cmmI) => cmmI % 4 !== 3 && cmmValor !== cmmDatos[cmmI % 4]);
        })()`), 'La miniatura muestra geometría');
      };
      const cmmFichasPorIds = (cmmIds) => cmmEvaluar(`(() => {
        const cmmIds = ${JSON.stringify(cmmIds)};
        return [...document.querySelectorAll('#cmm-et-lamina-lista [data-cmm-et-lamina-pieza]')]
          .filter(cmmFicha => cmmIds.includes(cmmFicha.dataset.cmmEtLaminaPieza))
          .map(cmmFicha => cmmFicha.querySelector('.cmm-et-lamina-nombre').textContent).sort();
      })()`);
      const cmmBuscarEnLamina = async (cmmNombre) => {
        await cmmClic('#cmm-et-lamina-busqueda');
        await cmmEvaluar('document.querySelector("#cmm-et-lamina-busqueda").select()');
        if (cmmNombre) await cmmWeb.insertText(cmmNombre);
        else await cmmTecla('Backspace', 8);
      };
      const cmmComprobarParLamina = async (cmmNombre, cmmIds, cmmNombreCaptura) => {
        await cmmBuscarEnLamina(cmmNombre.toLowerCase());
        cmmAfirmar.deepEqual(await cmmFichasPorIds(cmmIds), [cmmNombre + ' derecho', cmmNombre + ' izquierdo']);
        cmmAfirmar.equal(await cmmEvaluar('document.querySelectorAll("#cmm-et-lamina-lista [data-cmm-et-lamina-pieza]").length'), 2);
        for (const cmmId of cmmIds) await cmmMiniaturaLamina(`[data-cmm-et-lamina-pieza="${cmmId}"] img`);
        await cmmCapturar(cmmNombreCaptura);
        await cmmBuscarEnLamina('');
      };
      cmmAfirmar.equal(await cmmComprobarLamina('todo'), 2234);
      await cmmMiniaturaLamina('#cmm-et-lamina-lista section:first-child button:first-child img');
      await cmmEsperar('Array.from(document.querySelectorAll("#cmm-et-lamina-lista section:first-child img")).slice(0, 12).every(cmmImagen => cmmImagen.naturalWidth === 160)', 'Primera fila de miniaturas');
      await cmmCapturar('cmm-etiquetas-lamina-todos-electron');
      await cmmEvaluar('document.querySelector("#cmm-et-lamina-sistema").focus()');
      await cmmTecla('ArrowDown', 40);
      cmmAfirmar.equal(await cmmComprobarLamina('skeletal'), 292);
      cmmAfirmar.deepEqual(await cmmFichasPorIds(['FJ1409', 'FJ1409M', 'FJ1423', 'FJ1423M']), []);
      await cmmMiniaturaLamina('#cmm-et-lamina-lista section:first-child button:first-child img');
      await cmmEsperar('Array.from(document.querySelectorAll("#cmm-et-lamina-lista img")).slice(0, 12).every(cmmImagen => cmmImagen.naturalWidth === 160)', 'Miniaturas de esqueleto');
      await cmmCapturar('cmm-etiquetas-lamina-esqueleto-electron');
      await cmmEvaluar('document.querySelector("#cmm-et-lamina-lista section:last-child button:last-child").scrollIntoView({block: "end"})');
      await cmmMiniaturaLamina('#cmm-et-lamina-lista section:last-child button:last-child img');
      await cmmEvaluar('document.querySelector("#cmm-et-lamina-busqueda").focus()');
      await cmmWeb.insertText('femur izquierdo');
      const cmmFemur = await cmmEvaluar('document.querySelector("[data-cmm-et-lamina-pieza]")?.dataset.cmmEtLaminaPieza');
      cmmAfirmar(cmmFemur);
      await cmmClic(`[data-cmm-et-lamina-pieza="${cmmFemur}"]`);
      await cmmEsperar('!document.querySelector("#cmm-et-lamina").open', 'Regreso al visor desde una etiqueta');
      cmmAfirmar.deepEqual(await cmmEvaluar('Array.from(cmmPruebaAtlas.cmmEscena.cmmEstado.cmmSeleccion)'), [cmmFemur]);
      await cmmClic('[data-cmm-det="quitar"]');
      await cmmClic('[data-cmm-vista="frente"]');
      await cmmEncuadre();
      cmmRegistrar('Lámina de etiquetas: 2234 piezas, 292 de Esqueleto, miniaturas, búsqueda y selección exacta en 3D');
      await cmmComprobarEtiquetas(14, 10);
      await cmmCapturar('cmm-etiquetas-explosion-electron');
      await cmmEvaluar('document.querySelector("#cmm-et-cantidad").focus()');
      await cmmTecla('Home', 36);
      await cmmPausa();
      await cmmComprobarEtiquetas(4, 4);
      await cmmTecla('End', 35);
      await cmmPausa();
      await cmmComprobarEtiquetas(40, 15);
      await cmmEvaluar('document.querySelector("#cmm-ex-sistema").focus()');
      await cmmTecla('ArrowDown', 40);
      cmmAfirmar.equal(await cmmComprobarLamina('skeletal'), 292);
      await cmmClic('#cmm-et-lamina-cerrar');
      await cmmEvaluar('document.querySelector("#cmm-ex-valor-panel").focus()');
      await cmmTecla('PageDown', 34);
      await cmmComprobarExplosion('skeletal', 90, 292, true);
      await cmmEvaluar('document.querySelector("#cmm-ex-valor").focus()');
      await cmmTecla('ArrowLeft', 37);
      await cmmComprobarExplosion('skeletal', 89, 292, true);
      await cmmEncuadre();
      await cmmEvaluar('document.querySelector("#cmm-ex-sistema").focus()');
      await cmmTecla('ArrowDown', 40);
      await cmmComprobarExplosion('muscular', 100, 404, true);
      cmmAfirmar.equal(await cmmComprobarLamina('muscular'), 404);
      await cmmComprobarParLamina('Fibular corto', ['FJ1409', 'FJ1409M'], 'cmm-clasificacion-fibular-corto');
      await cmmClic('#cmm-et-lamina-cerrar');
      cmmVentana.unmaximize();
      cmmVentana.setSize(1100, 720);
      await cmmEsperar('innerWidth < 1200 && innerHeight < 760', 'Ventana pequeña de Atlas');
      await cmmEncuadre();
      cmmAfirmar(await cmmEvaluar(`document.querySelector('#cmm-repaso-hoy').getBoundingClientRect().right <
        document.querySelector('#cmm-separar').getBoundingClientRect().left`), 'El control de separación queda libre de los otros botones');
      await cmmComprobarEtiquetas(40, 4, 'muscular');
      await cmmCapturar('cmm-etiquetas-musculos-ventana-electron');
      await cmmCapturar('cmm-explosion-musculos-ventana-pequena-electron');
      await cmmClic('#cmm-et-lamina-abrir');
      cmmAfirmar.equal(await cmmComprobarLamina('muscular'), 404);
      await cmmMiniaturaLamina('#cmm-et-lamina-lista section:first-child button:first-child img');
      cmmAfirmar(await cmmEvaluar(`(() => {
        const cmmLista = document.querySelector('#cmm-et-lamina-lista');
        return cmmLista.scrollHeight > cmmLista.clientHeight && cmmLista.scrollWidth === cmmLista.clientWidth;
      })()`), 'La lámina se desplaza sin recorte horizontal');
      await cmmCapturar('cmm-etiquetas-lamina-musculos-ventana-electron');
      await cmmClic('#cmm-et-lamina-cerrar');
      cmmVentana.maximize();
      await cmmPausa(350);
      await cmmClic('#cmm-ex-restablecer');
      await cmmComprobarExplosion('muscular', 0, cmmCapasIniciales, false);
      await cmmEsperar('!cmmPruebaAtlas.cmmEscena.cmmTween', 'Cámara del cuerpo ensamblado');
      await cmmComprobarEtiquetas(40, 6);
      await cmmCapturar('cmm-etiquetas-ensamblado-electron');
      await cmmClic('#cmm-herramientas-cerrar');
      await cmmPausa();
      await cmmComprobarEtiquetas(40, 6);
      await cmmClic('#cmm-herramientas-abrir');
      await cmmClic('#cmm-et-activo');
      await cmmEsperar('!document.querySelector("#cmm-capa-etiquetas .cmm-etiqueta, #cmm-capa-etiquetas line")', 'Ocultar etiquetas');
      await cmmClic('#cmm-et-lamina-abrir');
      cmmAfirmar.equal(await cmmComprobarLamina('todo'), 2234);
      await cmmTecla('Escape', 27);
      await cmmEsperar('!document.querySelector("#cmm-et-lamina").open', 'Cerrar la lámina con Escape');
      cmmRegistrar('Etiquetas cerca de sus piezas y libres de paneles en todos los sistemas, músculos y cuerpo ensamblado');
      cmmRegistrar('Explosión por sistema: 15 opciones aisladas y encuadradas, vista de todos y deslizadores sincronizados');
      await cmmEvaluar('document.querySelector("#cmm-ex-sistema").focus()');
      await cmmTecla('End', 35);
      await cmmComprobarExplosion('connective', 100, 42, true);
      await cmmClic('#cmm-et-lamina-abrir');
      cmmAfirmar.equal(await cmmComprobarLamina('connective'), 42);
      await cmmComprobarParLamina('Tracto iliotibial', ['FJ1423', 'FJ1423M'], 'cmm-clasificacion-tracto-iliotibial');
      await cmmClic('#cmm-et-lamina-cerrar');
      await cmmClic('#cmm-ex-restablecer');
      cmmRegistrar('Los fibulares cortos están en Músculos y los tractos iliotibiales en Tejido conectivo, con nombres y miniaturas de ambos lados');
      await cmmClic('#cmm-herramientas-cerrar');
      await cmmClic('[data-cmm-preset="esqueleto"]');
      await cmmClic('#cmm-herramientas-abrir');
      await cmmEvaluar('document.querySelector("#cmm-ex-sistema").focus()');
      await cmmTecla('c', 67, 'c');
      await cmmComprobarExplosion('cardiac', 100, 23, true);
      await cmmClic('#cmm-ex-restablecer');
      await cmmComprobarExplosion('cardiac', 0, 292, false);
      await cmmClic('#cmm-paleta-abrir');
      await cmmWeb.insertText('Separa el esqueleto al 20 %');
      await cmmTecla('Enter', 13);
      await cmmComprobarExplosion('skeletal', 20, 292, true);
      await cmmWeb.insertText('Aísla el estómago');
      await cmmTecla('Enter', 13);
      const cmmAislamiento = await cmmEvaluar(`(() => {
        const cmmEscena = cmmPruebaAtlas.cmmEscena;
        const cmmVisibles = cmmEscena.cmmPiezas.filter(cmmPieza => cmmEscena.cmmOpacidadDe(cmmPieza) > 0);
        return {
          cmmSistema: cmmEscena.cmmSistemaSeparado(), cmmSeparacion: cmmEscena.cmmEstado.cmmExplosionValor,
          cmmVisibles: cmmVisibles.length,
          cmmEstomago: cmmVisibles.every(cmmPieza => cmmPieza.cmmNombre === 'Estómago' &&
            cmmEscena.cmmEstado.cmmSeleccion.has(cmmPieza.cmmId))
        };
      })()`);
      cmmAfirmar.equal(cmmAislamiento.cmmSistema, 'digestive');
      cmmAfirmar.equal(cmmAislamiento.cmmSeparacion, 0.2);
      cmmAfirmar(cmmAislamiento.cmmEstomago && cmmAislamiento.cmmVisibles > 0);
      await cmmTecla('Escape', 27);
      await cmmCapturar('cmm-auditoria-orden-aislar-estomago');
      cmmRegistrar('Aísla el estómago cambia al sistema digestivo, conserva la separación y deja visible la estructura');
      await cmmClic('[data-cmm-vista="lado"]');
      await cmmClic('[data-cmm-vista="frente"]');
      await cmmEncuadre();
      await cmmClic('#cmm-herramientas-cerrar');
      await cmmClic('#cmm-reiniciar-todo');
      await cmmComprobarExplosion('todo', 0, cmmCapasIniciales, false);
      cmmRegistrar('Explosión por sistema: se recuperan filtros y cámara, se respeta una orden al 20 %');
      await cmmClic('#cmm-herramientas-abrir');
      await cmmEvaluar('document.querySelector("#cmm-ex-sistema").focus()');
      await cmmTecla('ArrowDown', 40);
      await cmmClic('#cmm-busqueda');
      await cmmWeb.insertText('estomago');
      await cmmClic('[data-cmm-res="0"]');
      cmmAfirmar(await cmmEvaluar(`(() => {
        const cmmE = cmmPruebaAtlas.cmmEscena;
        return cmmE.cmmSistemaSeparado() === 'digestive' && [...cmmE.cmmEstado.cmmSeleccion]
          .some(cmmId => cmmE.cmmOpacidadDe(cmmE.cmmPorId.get(cmmId)) > 0);
      })()`));
      await cmmClic('[data-cmm-det="quitar"]');
      await cmmClic('#cmm-reiniciar-todo');
      cmmRegistrar('La búsqueda muestra y selecciona Estómago desde una explosión de Esqueleto');
      await cmmClic('#cmm-rx-activo');
      await cmmEvaluar('document.querySelector("#cmm-corte-eje").focus()');
      await cmmTecla('ArrowDown', 40);
      await cmmClic('#cmm-corte-invertido');
      await cmmClic('#cmm-et-activo');
      await cmmClic('#cmm-mapa-dominio');
      await cmmClic('[data-cmm-pestana="vistas"]');
      await cmmClic('#cmm-vi-nombre');
      await cmmWeb.insertText('Vista <Pelvis> & Tórax');
      await cmmClic('#cmm-vi-guardar');
      cmmAfirmar(await cmmEvaluar(`(() => {
        const cmmBoton = document.querySelector('[data-cmm-vi="0"]');
        return cmmBoton?.textContent === 'Vista <Pelvis> & Tórax' && cmmBoton.children.length === 0;
      })()`));
      await cmmClic('#cmm-reiniciar-todo');
      await cmmClic('[data-cmm-vi="0"]');
      cmmAfirmar.deepEqual(await cmmEvaluar(`[
        document.querySelector('#cmm-corte-eje').value, ...['cmm-corte-invertido', 'cmm-rx-activo', 'cmm-et-activo', 'cmm-mapa-dominio']
          .map(cmmId => document.getElementById(cmmId).checked)
      ]`), ['transversal', true, true, true, true]);
      await cmmEsperar('!cmmPruebaAtlas.cmmEscena.cmmTween && !!document.querySelector(".cmm-etiqueta:not([hidden])")', 'Etiquetas de la vista recuperada');
      cmmAfirmar(await cmmEvaluar(`(() => {
        const cmmE = cmmPruebaAtlas.cmmEscena;
        return [...document.querySelectorAll('.cmm-etiqueta:not([hidden])')].every(cmmEtiqueta =>
          cmmE.cmmLote.cmmPlanoCorte.distanceToPoint(cmmE.cmmPosicionMundo(cmmE.cmmPorId.get(cmmEtiqueta.dataset.cmmEtPieza))) >= 0);
      })()`));
      await cmmCapturar('cmm-auditoria-vista-guardada-electron');
      cmmRegistrar('Una vista recupera corte invertido, etiquetas, rayos X y dominio y conserva el nombre literal');
      await cmmClic('[data-cmm-pestana="estudio"]');
      await cmmClic('#cmm-exa-iniciar');
      cmmAfirmar(await cmmEvaluar(`(() => {
        const cmmE = cmmPruebaAtlas.cmmEscena;
        return cmmPruebaAtlas.cmmExamen.cmmActivo && cmmE.cmmCorte.cmmEje === 'ninguno'
          && !cmmE.cmmEstado.cmmRayosX && !cmmE.cmmEstado.cmmDominio && document.querySelector('#cmm-separar').inert
          && ['cmm-builder-abrir', 'cmm-repaso-hoy', 'cmm-paleta-abrir', 'cmm-busqueda', 'cmm-herramientas-abrir'].every(cmmId => document.getElementById(cmmId).disabled);
      })()`));
      await cmmCapturar('cmm-auditoria-examen-electron');
      for (let cmmI = 0; cmmI < 3; cmmI++) {
        const cmmDistractor = await cmmEvaluar(`(() => {
          const cmmExamen = cmmPruebaAtlas.cmmExamen;
          return cmmExamen.cmmOpcionesActuales.findIndex(cmmOpcion =>
            cmmOpcion.cmmNombreEn !== cmmExamen.cmmPreguntas[cmmExamen.cmmIndice].cmmNombreEn);
        })()`);
        await cmmClic(`[data-cmm-op="${cmmDistractor}"]`);
        await cmmClic('[data-cmm-ex="siguiente"]');
      }
      cmmAfirmar(await cmmEvaluar('document.querySelector("#cmm-examen h2").textContent === "Te quedaste sin vidas"'));
      await cmmClic('[data-cmm-ex="repasar"]');
      await cmmClic('[data-cmm-ta="revelar"]');
      await cmmClic('[data-cmm-ta="sabia"]');
      await cmmClic('[data-cmm-ta="salir"]');
      cmmAfirmar(await cmmEvaluar('!document.querySelector("#cmm-builder-abrir").disabled && Object.keys(JSON.parse(localStorage.getItem("cmm.progreso.v1"))).length === 3'));
      await cmmClic('#cmm-herramientas-abrir');
      await cmmClic('[data-cmm-nivel="pollito"]');
      cmmAfirmar(await cmmEvaluar('cmmPruebaAtlas.cmmExamen.cmmConfig.cmmModo === "encontrar" && Boolean(document.querySelector("#cmm-ex-tiempo"))'));
      await cmmClic('[data-cmm-ex="salir"]');
      cmmRegistrar('Examen de identificación, derrota, repaso de las falladas y arranque del nivel Pollito conservan un modo de estudio activo');
      await cmmClic('#cmm-giro');
      await cmmClic('#cmm-builder-abrir');
      await cmmEsperar('document.querySelectorAll("[data-cmm-builder-reto]").length === 26', 'Catálogo');
      cmmAfirmar.deepEqual(await cmmEvaluar('Array.from(document.querySelectorAll("[data-cmm-builder-reto]"), cmmBoton => cmmBoton.dataset.cmmBuilderReto).slice(0, 6)'),
        ['abdomen', 'craneo', 'pelvis', 'cuello', 'mano', 'pierna']);
      const cmmFiltrar = async (cmmCampo, cmmValor) => cmmEvaluar(`(() => {
        const cmmSelect = document.getElementById(${JSON.stringify('cmm-builder-' + cmmCampo)});
        cmmSelect.value = ${JSON.stringify(cmmValor)};
        cmmSelect.dispatchEvent(new Event('change', { bubbles: true }));
        return Array.from(document.querySelectorAll('[data-cmm-builder-reto]'), cmmBoton => cmmBoton.dataset.cmmBuilderReto);
      })()`);
      await cmmFiltrar('region', 'Abdomen');
      await cmmFiltrar('sistema', 'digestive');
      cmmAfirmar.deepEqual(await cmmFiltrar('cantidad', '3'), ['cmm-abdomen-digestivo']);
      await cmmEvaluar('document.querySelector("[data-cmm-builder-miniatura=cmm-abdomen-digestivo]").scrollIntoView({ block: "nearest" })');
      try {
        await cmmEsperar('document.querySelector("[data-cmm-builder-miniatura=cmm-abdomen-digestivo]")?.naturalWidth === 220', 'Miniatura anatómica');
      } catch (cmmError) {
        cmmInforme.cmmMediciones.cmmMiniatura = await cmmEvaluar(`(() => {
          const cmmImg = document.querySelector('[data-cmm-builder-miniatura=cmm-abdomen-digestivo]');
          return { cmmTipo: cmmImg?.getAttribute('src')?.slice(0, 22), cmmAncho: cmmImg?.naturalWidth,
            cmmRect: cmmImg?.getBoundingClientRect().toJSON(), cmmVista: [innerWidth,innerHeight],
            cmmCache: cmmPruebaBuilder.cmmVistasCatalogo.cmmImagenes.has('cmm-abdomen-digestivo') };
        })()`);
        throw cmmError;
      }
      await cmmFiltrar('region', '');
      await cmmFiltrar('sistema', '');
      cmmAfirmar.equal((await cmmFiltrar('cantidad', '')).length, 26);
      if (cmmIntegral) {
        cmmInforme.cmmMediciones.cmmCatalogoCompleto = await cmmVerificarCatalogo(cmmEvaluar);
        cmmRegistrar('Matriz del catálogo validada con 11 modos, 4 dificultades y 2 distribuciones');
      }
      cmmRegistrar('Acceso a Builder, seis desafíos clásicos originales, veinte regionales y filtros combinados');
      await cmmClic('[data-cmm-builder-reto="pelvis"]');
      await cmmEsperar('globalThis.cmmPruebaBuilder?.cmmSesion?.cmmFase === "estudio"', 'Carga de pelvis');
      cmmRegistrar('Pelvis: tres modelos reales en WebGL');
      await cmmClic('[data-cmm-builder="desmontar"]');
      await cmmEsperar('cmmPruebaBuilder.cmmSesion.cmmFase === "jugando"', 'Desmontaje');
      cmmRegistrar('Desmontaje animado');
      await cmmEvaluar(`(async () => {
        const { Vector3: CMMVector3, Vector2: CMMVector2, Raycaster: CMMRaycaster } = await import('three');
        const cmmB = cmmPruebaBuilder;
        globalThis.cmmPruebaProyectar = (cmmV) => {
          const cmmE = cmmB.cmmEscena;
          cmmE.cmmCamara.updateMatrixWorld();
          const cmmN = cmmV.clone().project(cmmE.cmmCamara);
          const cmmR = cmmE.cmmLienzo.getBoundingClientRect();
          return [cmmR.x + (cmmN.x + 1) * cmmR.width / 2, cmmR.y + (1-cmmN.y) * cmmR.height/2];
        };
        globalThis.cmmPruebaArrastre = (cmmP) => {
          const cmmE = cmmB.cmmEscena;
          cmmE.cmmTablero.updateMatrixWorld(true);
          const cmmGeo = cmmP.cmmMalla.geometry;
          const cmmPos = cmmGeo.getAttribute('position');
          const cmmIndices = cmmGeo.index;
          const cmmRayo = new CMMRaycaster();
          for (let cmmI=0;cmmI<cmmIndices.count;cmmI+=3) {
            const cmmVertice = new CMMVector3().fromBufferAttribute(cmmPos,cmmIndices.getX(cmmI));
            cmmVertice.add(new CMMVector3().fromBufferAttribute(cmmPos,cmmIndices.getX(cmmI+1)));
            cmmVertice.add(new CMMVector3().fromBufferAttribute(cmmPos,cmmIndices.getX(cmmI+2))).multiplyScalar(1/3);
            cmmP.cmmMalla.localToWorld(cmmVertice);
            const cmmN = cmmVertice.clone().project(cmmE.cmmCamara);
            if (Math.abs(cmmN.x) > .85 || Math.abs(cmmN.y) > .85) continue;
            const cmmRect = cmmE.cmmLienzo.getBoundingClientRect();
            const [cmmPX, cmmPY] = cmmPruebaProyectar(cmmVertice).map(Math.round);
            const cmmMallas = cmmE.cmmPiezas.filter(cmmX=>cmmX.cmmMalla.visible).map(cmmX=>cmmX.cmmMalla);
            const cmmProbar = (cmmX,cmmY) => {
              cmmRayo.setFromCamera(new CMMVector2((cmmX-cmmRect.x)*2/cmmRect.width-1,1-(cmmY-cmmRect.y)*2/cmmRect.height),cmmE.cmmCamara);
              return cmmRayo.intersectObjects(cmmMallas,false)[0];
            };
            if (![[1,0],[-1,0],[0,1],[0,-1]].every(([cmmX,cmmY])=>cmmProbar(cmmPX+cmmX,cmmPY+cmmY)?.object === cmmP.cmmMalla)) continue;
            const cmmGolpe = cmmProbar(cmmPX,cmmPY);
            if (cmmGolpe?.object !== cmmP.cmmMalla) continue;
            const cmmDesplazamiento = cmmP.cmmObjetivo.cmmPosicion.clone().sub(cmmP.cmmPivote.position);
            const cmmDir = cmmE.cmmCamara.getWorldDirection(new CMMVector3());
            cmmDesplazamiento.addScaledVector(cmmDir,-cmmDir.dot(cmmDesplazamiento));
            return [cmmPruebaProyectar(cmmGolpe.point),cmmPruebaProyectar(cmmGolpe.point.clone().add(cmmDesplazamiento))];
          }
          return null;
        };
      })()`);
      const cmmId = await cmmEvaluar('cmmPruebaBuilder.cmmSesion.cmmPiezas[0].cmmId');
      await cmmClic(`[data-cmm-builder-pieza="${cmmId}"]`);
      cmmAfirmar(await cmmEvaluar(`!document.querySelector(
        '#cmm-builder-giro, #cmm-builder-encaje-giro, [data-cmm-builder-herramienta="rotate"], [data-cmm-builder^="giro-"]')`));
      cmmWeb.sendInputEvent({ type: 'keyDown', keyCode: 'R' });
      cmmWeb.sendInputEvent({ type: 'keyUp', keyCode: 'R' });
      cmmAfirmar.equal(await cmmEvaluar('cmmPruebaBuilder.cmmSesion.cmmHerramienta'), 'arrastre');
      await cmmClic('[data-cmm-builder-herramienta="translate"]');
      await cmmEsperar(`cmmPruebaBuilder.cmmEscena.cmmGizmo.enabled && cmmPruebaBuilder.cmmEscena.cmmGizmo.getMode() === 'translate'`, 'Flechas de traslación');
      await cmmClic('[data-cmm-builder-herramienta="arrastre"]');
      cmmAfirmar(await cmmEvaluar(`!cmmPruebaBuilder.cmmEscena.cmmGizmo.enabled && cmmPruebaBuilder.cmmSesion.cmmHerramienta === 'arrastre'`));
      cmmRegistrar('Sin controles ni atajo de giro de piezas. Las flechas de traslación se activan con Mover');
      const cmmAntes = await cmmEvaluar('cmmPruebaBuilder.cmmSesion.cmmSeleccion.cmmPivote.position.toArray()');
      await cmmEvaluar('cmmPruebaBuilder.cmmProfundidad(-1)');
      cmmAfirmar.notDeepEqual(await cmmEvaluar('cmmPruebaBuilder.cmmSesion.cmmSeleccion.cmmPivote.position.toArray()'), cmmAntes);
      await cmmClic('[data-cmm-builder="deshacer"]');
      cmmRegistrar('Ajuste fino y deshacer');
      const cmmArrastrar = async (cmmPieza, cmmFraccion = 1, cmmDesplazar = null, cmmReintentos = 2) => {
        cmmVentana.focus();
        await cmmEvaluar(`(() => {
          globalThis.cmmTrazaArrastre = [];
          const cmmLienzo = cmmPruebaBuilder.cmmEscena.cmmLienzo;
          if (cmmLienzo.dataset.cmmPruebaTraza) return;
          cmmLienzo.dataset.cmmPruebaTraza = '1';
          for (const cmmTipo of ['pointermove', 'pointerdown', 'pointerup', 'gotpointercapture', 'lostpointercapture', 'pointercancel']) {
            cmmLienzo.addEventListener(cmmTipo, (cmmEvento) => cmmTrazaArrastre.push([cmmTipo, cmmEvento.clientX, cmmEvento.clientY, cmmEvento.buttons]));
          }
        })()`);
        const cmmExtremos = await cmmEvaluar(`cmmPruebaArrastre(cmmPruebaBuilder.cmmSesion.cmmPiezas.find(cmmP=>cmmP.cmmId===${JSON.stringify(cmmPieza)}))`);
        cmmAfirmar(cmmExtremos, 'Pieza visible para arrastre: ' + cmmPieza);
        const [cmmOrigen, cmmFinal] = cmmExtremos;
        const cmmDestino = cmmOrigen.map((cmmV, cmmK) => cmmV + (cmmDesplazar ? cmmDesplazar[cmmK] : (cmmFinal[cmmK] - cmmV) * cmmFraccion));
        const cmmCamara = await cmmEvaluar('cmmPruebaBuilder.cmmEscena.cmmCamara.position.toArray()');
        cmmEnviarArrastre('mouseMove', cmmOrigen, false);
        cmmEnviarArrastre('mouseDown', cmmOrigen, true);
        await cmmEsperar(`cmmPruebaBuilder.cmmEscena.cmmMovimiento?.cmmPieza.cmmId === ${JSON.stringify(cmmPieza)}`, 'Agarre de ' + cmmPieza);
        const cmmLeerPose = () => cmmEvaluar('cmmPruebaBuilder.cmmSesion.cmmSeleccion.cmmPivote.position.toArray()');
        const cmmPosInicial = await cmmLeerPose();
        for (let cmmJ = 1; cmmJ <= 32; cmmJ++) {
          cmmEnviarArrastre('mouseMove', cmmOrigen.map((cmmV, cmmK) => cmmV + (cmmDestino[cmmK] - cmmV) * cmmJ / 32), true);
          await cmmPausa(15);
        }
        cmmAfirmar.deepEqual(await cmmEvaluar('cmmPruebaBuilder.cmmEscena.cmmCamara.position.toArray()'), cmmCamara);
        const cmmPosAntesDeSoltar = await cmmLeerPose();
        cmmEnviarArrastre('mouseUp', cmmDestino, false);
        await cmmEsperar('!cmmPruebaBuilder.cmmEscena.cmmMovimiento', 'Suelta de ' + cmmPieza);
        if (JSON.stringify(cmmPosAntesDeSoltar) === JSON.stringify(cmmPosInicial)) {
          cmmInforme.cmmMediciones.cmmArrastreSinMovimiento = { cmmPieza, cmmOrigen, cmmDestino, cmmPosInicial,
            ...await cmmEvaluar(`({ cmmSemilla: cmmPruebaBuilder.cmmSesion.cmmSemilla, cmmEventos: cmmTrazaArrastre.slice(0, 40),
              cmmFoco: document.hasFocus(), cmmVista: [innerWidth,innerHeight] })`) };
          const cmmTraza = cmmInforme.cmmMediciones.cmmArrastreSinMovimiento;
          if (cmmReintentos && !cmmTraza.cmmFoco && cmmTraza.cmmEventos.some(([cmmTipo, , , cmmBotones]) => cmmTipo === 'lostpointercapture' && cmmBotones === 1)) {
            cmmInforme.cmmMediciones.cmmPerdidasFoco = (cmmInforme.cmmMediciones.cmmPerdidasFoco ?? 0) + 1;
            await cmmPausa(180);
            return cmmArrastrar(cmmPieza, cmmFraccion, cmmDesplazar, cmmReintentos - 1);
          }
        }
        cmmAfirmar.notDeepEqual(cmmPosAntesDeSoltar, cmmPosInicial, 'El arrastre no movió la pieza ' + cmmPieza);
        return { cmmOrigen, cmmDestino, cmmPosInicial, cmmPosAntesDeSoltar };
      };
      const cmmIds = await cmmEvaluar('cmmPruebaBuilder.cmmSesion.cmmPiezas.map(cmmP => cmmP.cmmId)');
      const cmmFramesAtlas = await cmmEvaluar('cmmPruebaAtlas.cmmRender');
      for (const [cmmI, cmmPieza] of cmmIds.entries()) {
        const cmmArrastre = await cmmArrastrar(cmmPieza);
        try {
          await cmmEsperar(`cmmPruebaBuilder.cmmSesion.cmmCorrectas.size === ${cmmI + 1}`, 'Encaje por arrastre de ' + cmmPieza);
        } catch (cmmError) {
          cmmInforme.cmmMediciones.cmmUltimoEncaje = { ...cmmArrastre, ...await cmmEvaluar(`(() => {
            const cmmP = cmmPruebaBuilder.cmmSesion.cmmSeleccion;
            return { cmmId: cmmP.cmmId, cmmPos: cmmP.cmmPivote.position.toArray(), cmmObjetivo: cmmP.cmmObjetivo.cmmPosicion.toArray(), cmmTolerancia: cmmP.cmmTolerancia, cmmEstado: cmmP.cmmEstado };
          })()`) };
          throw cmmError;
        }
        cmmRegistrar('Pieza arrastrada y encajada con ratón: ' + cmmPieza);
      }
      await cmmEsperar('cmmPruebaBuilder.cmmSesion.cmmFase === "finalizado"', 'Resultado');
      cmmInforme.cmmMediciones.cmmRenderAtlasDuranteArrastres = await cmmEvaluar('cmmPruebaAtlas.cmmRender') - cmmFramesAtlas;
      cmmInforme.cmmMediciones.cmmTablero = await cmmEvaluar('cmmPruebaBuilder.cmmEscena.cmmRendimiento?.() ?? null');
      const cmmGpus = await cmmApp.getGPUInfo('complete');
      cmmInforme.cmmMediciones.cmmGPU = cmmGpus.auxAttributes?.glRenderer ?? cmmGpus.gpuDevice?.find((cmmGpu) => cmmGpu.active)?.deviceString;
      const cmmProcesos = cmmApp.getAppMetrics();
      cmmInforme.cmmMediciones.cmmProcesosKiB = cmmProcesos.map((cmmProceso) => ({ cmmTipo: cmmProceso.type, cmmMemoria: cmmProceso.memory.workingSetSize }));
      cmmRegistrar('Finalización y resultado');
      await cmmClic('[data-cmm-builder="catalogo"]');
      const cmmCambio = performance.now();
      await cmmClic('[data-cmm-builder-reto="craneo"]');
      await cmmEsperar('cmmPruebaBuilder.cmmSesion?.cmmReto.cmmId === "craneo"', 'Cambio de desafío');
      cmmInforme.cmmMediciones.cmmCambioMs = performance.now() - cmmCambio;
      cmmRegistrar('Cambio de pelvis a cráneo con otra escena');
      await cmmClic('[data-cmm-builder="catalogo"]');
      await cmmClic('[data-cmm-builder="tutorial"]');
      await cmmEsperar('cmmPruebaBuilder.cmmSesion?.cmmTutorial && cmmPruebaBuilder.cmmSesion.cmmFase === "jugando"', 'Tutorial');
      const cmmGuiada = await cmmEvaluar('cmmPruebaBuilder.cmmSesion.cmmPiezas[0].cmmId');
      await cmmClic(`[data-cmm-builder-pieza="${cmmGuiada}"]`);
      cmmAfirmar.equal(await cmmEvaluar('cmmPruebaBuilder.cmmSesion.cmmGuia'), 1);
      await cmmArrastrar(cmmGuiada, .48);
      cmmAfirmar.equal(await cmmEvaluar('cmmPruebaBuilder.cmmSesion.cmmGuia'), 2);
      await cmmEsperar('document.querySelector("#cmm-builder-reticula").getClientRects().length > 0', 'Círculo del destino del tutorial');
      await cmmClic('#cmm-builder-reticula');
      await cmmEsperar('cmmPruebaBuilder.cmmSesion.cmmGuia === 3', 'Selección del destino del tutorial');
      await cmmArrastrar(cmmGuiada);
      await cmmEsperar('cmmPruebaBuilder.cmmSesion.cmmFase === "finalizado"', 'Encaje y final del tutorial');
      cmmAfirmar.equal(await cmmEvaluar('cmmPruebaBuilder.cmmSesion.cmmGuia'), 4);
      cmmRegistrar('Tutorial completado en cuatro pasos con arrastre, destino y encaje');
      const cmmModo = async (cmmValor, cmmReto, cmmRegion = '', cmmSemilla = null) => {
        if (await cmmEvaluar('document.querySelector("#cmm-builder-inicio").classList.contains("cmm-oculto")')) {
          await cmmClic('header [data-cmm-builder="catalogo"]');
        }
        await cmmEvaluar(`(() => {
          const cmmSelect = document.querySelector('#cmm-builder-modo');
          cmmSelect.value = ${JSON.stringify(cmmValor)};
          cmmSelect.dispatchEvent(new Event('change', { bubbles: true }));
        })()`);
        await cmmFiltrar('region', cmmRegion);
        if (cmmValor.startsWith('cmm-')) {
          cmmAfirmar.deepEqual(await cmmEvaluar('Array.from(document.querySelectorAll("[data-cmm-builder-reto]"), cmmBoton => cmmBoton.dataset.cmmBuilderReto)'), [cmmReto]);
        }
        if (cmmSemilla !== null) await cmmEvaluar(`(() => {
          const cmmOriginal = crypto.getRandomValues;
          crypto.getRandomValues = (cmmValores) => {
            crypto.getRandomValues = cmmOriginal;
            cmmValores[0] = ${JSON.stringify(cmmSemilla)};
            return cmmValores;
          };
        })()`);
        await cmmClic(`[data-cmm-builder-reto="${cmmReto}"]`);
        await cmmEsperar(`cmmPruebaBuilder.cmmSesion?.cmmModo === ${JSON.stringify(cmmValor)}`, 'Carga de ' + cmmValor);
        await cmmPausa(120);
      };
      const cmmResolverPiezas = async () => {
        const cmmPiezas = await cmmEvaluar('cmmPruebaBuilder.cmmSesion.cmmPiezas.map(cmmP => cmmP.cmmId)');
        for (const [cmmI, cmmId] of cmmPiezas.entries()) {
          await cmmArrastrar(cmmId);
          await cmmEsperar(`cmmPruebaBuilder.cmmSesion.cmmCorrectas.size === ${cmmI + 1}`, 'Pieza de modo alternativo ' + cmmId);
        }
      };
      await cmmModo('memoria', 'pelvis');
      await cmmClic('[data-cmm-builder="desmontar"]');
      await cmmEsperar('cmmPruebaBuilder.cmmSesion.cmmFase === "jugando"', 'Partida de memoria');
      cmmAfirmar(await cmmEvaluar('cmmPruebaBuilder.cmmSesion.cmmPiezas.every(cmmP => !cmmP.cmmFantasma.visible) && document.querySelectorAll("#cmm-builder-fichas button")[0].textContent === "Pieza 1"'));
      await cmmResolverPiezas();
      cmmRegistrar('Memoria espacial completada sin siluetas ni nombres durante la reconstrucción');

      const cmmComprobarSeleccion = async (cmmId, cmmEditable, cmmEnBandeja = true) => {
        const cmmMarca = await cmmEvaluar(`(() => {
          const cmmB = cmmPruebaBuilder;
          const cmmPieza = cmmB.cmmSesion.cmmSeleccion;
          const cmmFicha = document.querySelector('[data-cmm-builder-pieza="' + ${JSON.stringify(cmmId)} + '"]');
          return {
            cmmId: cmmPieza?.cmmId ?? null,
            cmmBorde: Boolean(cmmPieza && cmmB.cmmEscena.cmmBorde?.parent === cmmPieza.cmmMalla),
            cmmInspector: document.querySelector('#cmm-builder-seleccion').textContent.includes(cmmPieza?.cmmNombre ?? 'sin selección'),
            cmmEditable: !document.querySelector('#cmm-builder-manipulacion').disabled,
            cmmMarca: cmmFicha?.getAttribute('aria-pressed') ?? null
          };
        })()`);
        cmmAfirmar.deepEqual(cmmMarca, {cmmId, cmmBorde: true, cmmInspector: true, cmmEditable, cmmMarca: cmmEnBandeja ? 'true' : null}, 'Marcado de ' + cmmId);
      };
      const cmmSeleccionarEnModelo = async (cmmId) => {
        const cmmPuntos = await cmmEvaluar(`cmmPruebaArrastre(cmmPruebaBuilder.cmmEscena.cmmPiezas.find(cmmP => cmmP.cmmId === ${JSON.stringify(cmmId)}))`);
        cmmAfirmar(cmmPuntos, 'Pieza visible para selección: ' + cmmId);
        await cmmMover('mousePressed', cmmPuntos[0]);
        await cmmMover('mouseReleased', cmmPuntos[0]);
      };
      await cmmModo('detective', 'abdomen', 'Abdomen', 0);
      const cmmFijasAbdomen = ['FJ3147', 'FJ1895', 'FJ2817'];
      cmmAfirmar(await cmmEvaluar('cmmPruebaBuilder.cmmSesion.cmmPiezas.length === 2 && cmmPruebaBuilder.cmmSesion.cmmPiezas.every(cmmP => !' + JSON.stringify(cmmFijasAbdomen) + '.includes(cmmP.cmmId))'));
      for (const cmmId of cmmFijasAbdomen) {
        await cmmClic(`[data-cmm-builder-pieza="${cmmId}"]`);
        await cmmComprobarSeleccion(cmmId, false);
        await cmmSeleccionarEnModelo('FJ2564');
        await cmmComprobarSeleccion('FJ2564', true);
        await cmmSeleccionarEnModelo(cmmId);
        await cmmComprobarSeleccion(cmmId, false);
      }
      cmmAfirmar(await cmmEvaluar('cmmPruebaBuilder.cmmJuego.cmmVidas === 3 && cmmPruebaBuilder.cmmSesion.cmmCorrectas.size === 0'));
      await cmmCapturar('cmm-detective-abdomen-seleccion-electron');
      cmmRegistrar('Riñón derecho, páncreas y vesícula se marcan desde la bandeja y el modelo en Detective, con las referencias inmóviles');
      cmmAfirmar.equal(await cmmEvaluar('document.querySelector("header [data-cmm-builder=catalogo]").textContent'), 'Atrás a desafíos');
      await cmmClic('header [data-cmm-builder="catalogo"]');
      cmmAfirmar(await cmmEvaluar(`document.querySelector('#cmm-builder').open && !cmmPruebaBuilder.cmmSesion &&
        document.querySelector('#cmm-builder-modo').value === 'detective' && document.querySelector('#cmm-builder-region').value === 'Abdomen' &&
        document.activeElement.dataset.cmmBuilderReto === 'abdomen'`));
      cmmRegistrar('Atrás a desafíos conserva modo y región y devuelve el foco a la tarjeta');

      await cmmModo('detective', 'craneo', '', 0);
      const cmmDetective = await cmmEvaluar('cmmPruebaBuilder.cmmSesion.cmmPiezas.map(cmmP => cmmP.cmmId)');
      cmmAfirmar.equal(cmmDetective.length, 2);
      cmmAfirmar(await cmmEvaluar('cmmPruebaBuilder.cmmEscena.cmmPiezas.length === 9 && cmmPruebaBuilder.cmmSesion.cmmPiezas.every(cmmP => !cmmP.cmmFantasma.visible)'));
      await cmmClic('[data-cmm-builder="cmm-pagina-siguiente"]');
      cmmAfirmar.equal(await cmmEvaluar('document.querySelector("#cmm-builder-pagina").textContent'), '2 de 2');
      const cmmIdsBandeja2 = await cmmEvaluar('Array.from(document.querySelectorAll("[data-cmm-builder-pieza]"), cmmP => cmmP.dataset.cmmBuilderPieza)');
      cmmAfirmar.deepEqual(cmmIdsBandeja2, ['FJ3375']);
      await cmmClic('[data-cmm-builder="cmm-pagina-anterior"]');
      const cmmFija = await cmmEvaluar('cmmPruebaBuilder.cmmEscena.cmmPiezas.slice(0, 8).find(cmmP => !cmmPruebaBuilder.cmmSesion.cmmPiezas.includes(cmmP)).cmmId');
      await cmmClic(`[data-cmm-builder-pieza="${cmmFija}"]`);
      await cmmComprobarSeleccion(cmmFija, false);
      await cmmResolverPiezas();
      cmmRegistrar('Cráneo en Detective completado desplazando dos piezas y conservando las referencias fijas');

      await cmmModo('detective', 'pierna', '', 3);
      cmmAfirmar(await cmmEvaluar(`cmmPruebaBuilder.cmmEscena.cmmPiezas.every(cmmP => cmmP.cmmPivote.quaternion.toArray().join(',') === '0,0,0,1')`));
      await cmmResolverPiezas();
      await cmmEsperar('cmmPruebaBuilder.cmmSesion.cmmFase === "finalizado"', 'Resultado de Detective en rodilla');
      cmmAfirmar.equal(await cmmEvaluar('cmmPruebaBuilder.cmmErrores()'), 0);
      await cmmEsperar('getComputedStyle(document.querySelector("#cmm-builder-paso")).opacity === "1"', 'Resumen visible de la rodilla');
      await cmmCapturar('cmm-detective-rodilla-sin-giro-electron');
      cmmRegistrar('Rodilla en Detective: 2 de 2 colocadas por arrastre con orientación anatómica');

      await cmmModo('diseccion', 'pelvis');
      cmmAfirmar(await cmmEvaluar('document.querySelector("[data-cmm-builder=reconstruir]").disabled'));
      const cmmDiseccion = await cmmEvaluar('cmmPruebaBuilder.cmmSesion.cmmPiezas.map(cmmP => cmmP.cmmId)');
      for (const [cmmI, cmmId] of cmmDiseccion.entries()) {
        const cmmOffset = cmmI === 2 ? [0, 175] : [cmmI === 0 ? -178 : 178, -60];
        await cmmArrastrar(cmmId, 1, cmmOffset);
      }
      await cmmEsperar('!document.querySelector("[data-cmm-builder=reconstruir]").disabled', 'Desmontaje manual de tres piezas');
      await cmmClic('[data-cmm-builder="reconstruir"]');
      await cmmResolverPiezas();
      cmmRegistrar('Disección inversa completada tras desmontar y volver a encajar manualmente');

      await cmmModo('capas', 'pectoral');
      await cmmClic('[data-cmm-builder="desmontar"]');
      await cmmEsperar('cmmPruebaBuilder.cmmSesion.cmmFase === "jugando"', 'Partida por capas');
      await cmmArrastrar('FJ1464');
      await cmmClic('[data-cmm-builder="encajar"]');
      cmmAfirmar.equal(await cmmEvaluar('cmmPruebaBuilder.cmmSesion.cmmCorrectas.size'), 0);
      cmmAfirmar(await cmmEvaluar('document.querySelector("#cmm-builder-aviso").textContent.includes("Completa primero")'));
      await cmmClic('[data-cmm-builder="restablecer"]');
      await cmmResolverPiezas();
      cmmRegistrar('Pared pectoral completada en orden; se rechazó encajar la capa superficial primero');

      for (const [cmmVariante, cmmReto] of [
        ['cmm-parcial', 'cmm-pelvis-parcial'], ['cmm-intrusa', 'cmm-pelvis-intrusa'],
        ['cmm-espejo', 'cmm-coxales-espejo'], ['cmm-contrarreloj', 'cmm-pelvis-contrarreloj'], ['cmm-conexiones', 'cmm-conexiones-lumbares']
      ]) {
        await cmmModo(cmmVariante, cmmReto);
        if (cmmVariante === 'cmm-parcial' || cmmVariante === 'cmm-espejo') {
          await cmmSeleccionarEnModelo('FJ3393');
          await cmmComprobarSeleccion('FJ3393', false, false);
        }
        if (cmmVariante === 'cmm-parcial') cmmAfirmar(await cmmEvaluar('cmmPruebaBuilder.cmmSesion.cmmPiezas.every(cmmP => !cmmP.cmmMalla.visible)'));
        await cmmClic('[data-cmm-builder="desmontar"]');
        await cmmEsperar('cmmPruebaBuilder.cmmSesion.cmmFase === "jugando"', 'Partida de ' + cmmVariante);
        if (cmmVariante === 'cmm-intrusa') {
          await cmmClic('[data-cmm-builder-pieza="FJ3237"]');
          await cmmClic('[data-cmm-builder="encajar"]');
          cmmAfirmar(await cmmEvaluar('cmmPruebaBuilder.cmmJuego.cmmVidas === 2 && cmmPruebaBuilder.cmmSesion.cmmCorrectas.size === 0 && !cmmPruebaBuilder.cmmSesion.cmmSeleccion.cmmFantasma.visible'));
        }
        if (cmmVariante === 'cmm-contrarreloj') cmmAfirmar(await cmmEvaluar('cmmPruebaBuilder.cmmTiempoDisponible() > 0 && cmmPruebaBuilder.cmmTiempoDisponible() <= 120000'));
        await cmmResolverPiezas();
        await cmmEsperar('cmmPruebaBuilder.cmmSesion.cmmFase === "finalizado"', 'Fin de ' + cmmVariante);
        cmmAfirmar(await cmmEvaluar('cmmPruebaBuilder.cmmSesion.cmmResultado.includes("Reconstrucción completa")'));
        cmmRegistrar('Inicio, arrastre y victoria de ' + cmmVariante);
      }

      await cmmClic('[data-cmm-builder="catalogo"]');
      await cmmClic('#cmm-builder-campana summary');
      cmmAfirmar(await cmmEvaluar('Boolean(document.querySelector("[data-cmm-builder-campana=cmm-columna-lumbar]"))'));
      cmmAfirmar(await cmmEvaluar('!document.querySelector("[data-cmm-builder-campana=cmm-torax-vias-aereas]")'));
      cmmAfirmar(await cmmEvaluar('document.querySelector("#cmm-builder-rutas").textContent.includes("Pasaporte anatómico")'));
      cmmAfirmar(await cmmEvaluar('Boolean(document.querySelector("[data-cmm-builder=cmm-diario]"))'));
      await cmmCapturar('cmm-campana-desbloqueo-electron');
      await cmmClic('[data-cmm-builder-campana="pelvis"]');
      await cmmEsperar('cmmPruebaBuilder.cmmSesion?.cmmContexto?.cmmCampana === true', 'Misión lanzada desde campaña');
      cmmRegistrar('Campaña desbloqueó la etapa siguiente y abrió una misión; pasaporte y desafío diario visibles');

      await cmmClic('[data-cmm-builder="catalogo"]');
      await cmmClic('#cmm-builder-docente summary');
      await cmmEvaluar(`(() => {
        for (const [cmmCampo, cmmValor] of [['nombre','Reto local de pelvis'], ['instrucciones','Coloca los coxales junto al sacro.'], ['requeridas','FJ3152, FJ3288'], ['fijas','FJ3393']])
          document.querySelector('#cmm-builder-docente-' + cmmCampo).value = cmmValor;
      })()`);
      await cmmClic('[data-cmm-builder="cmm-docente-guardar"]');
      await cmmEsperar('document.querySelector("#cmm-builder-docente-aviso").textContent === "Misión guardada."', 'Guardado docente');
      const cmmExportado = cmmRuta.join(cmmPerfil, 'cmm-mision-docente.json');
      const cmmDescarga = new Promise((cmmResolver, cmmRechazar) => {
        const cmmTemporizador = setTimeout(() => cmmRechazar(new Error('Descarga docente sin completar.')), 7000);
        cmmWeb.session.once('will-download', (cmmEvento, cmmItem) => {
          cmmItem.setSavePath(cmmExportado);
          cmmItem.once('done', (cmmEventoFin, cmmEstado) => {
            clearTimeout(cmmTemporizador);
            if (cmmEstado === 'completed') cmmResolver(cmmFs.readFileSync(cmmExportado, 'utf8'));
            else cmmRechazar(new Error('Descarga docente ' + cmmEstado));
          });
        });
      });
      await cmmClic('[data-cmm-builder="cmm-docente-exportar"]');
      const cmmTextoExportado = await cmmDescarga;
      cmmAfirmar.deepEqual(JSON.parse(cmmTextoExportado).cmmMision.cmmRequeridas, ['FJ3152', 'FJ3288']);
      await cmmEvaluar(`(() => {
        const cmmTransferencia = new DataTransfer();
        cmmTransferencia.items.add(new File([${JSON.stringify(cmmTextoExportado)}], 'cmm-mision-docente.json', { type:'application/json' }));
        const cmmInput = document.querySelector('#cmm-builder-docente-archivo');
        cmmInput.files = cmmTransferencia.files;
        cmmInput.dispatchEvent(new Event('change', { bubbles:true }));
      })()`);
      await cmmEsperar('cmmPruebaBuilder.cmmHistorial.cmmDocentes.length === 2', 'Importación docente');
      await cmmClic('[data-cmm-builder="cmm-docente-jugar"]');
      await cmmEsperar('cmmPruebaBuilder.cmmSesion?.cmmContexto?.cmmDocente === true', 'Carga docente');
      await cmmClic('[data-cmm-builder="desmontar"]');
      await cmmEsperar('cmmPruebaBuilder.cmmSesion.cmmFase === "jugando"', 'Partida docente');
      await cmmResolverPiezas();
      cmmRegistrar('Editor docente guardó, exportó, importó y completó una misión sobre el sacro fijo');
      await cmmCapturar('cmm-docente-resultado-electron');

      await cmmClic('[data-cmm-builder="catalogo"]');
      await cmmClic('summary:has(+ section #cmm-builder-examen-region)');
      await cmmEvaluar('document.querySelector("#cmm-builder-examen-region").value = "Pelvis"');
      await cmmClic('[data-cmm-builder="cmm-examen-iniciar"]');
      await cmmEsperar('cmmPruebaBuilder.cmmSesion?.cmmModo === "cmm-examen-practico"', 'Preparación de examen práctico');
      cmmAfirmar(await cmmEvaluar('cmmPruebaBuilder.cmmSesion.cmmPiezas.every(cmmP => !cmmP.cmmMalla.visible)'));
      await cmmClic('[data-cmm-builder="desmontar"]');
      await cmmEsperar('cmmPruebaBuilder.cmmSesion.cmmFase === "jugando"', 'Examen práctico en curso');
      cmmAfirmar(await cmmEvaluar('cmmPruebaBuilder.cmmSesion.cmmPiezas.every(cmmP => !cmmP.cmmFantasma.visible) && document.querySelector("[data-cmm-builder=solucion]").disabled'));
      await cmmResolverPiezas();
      cmmAfirmar(await cmmEvaluar('cmmPruebaBuilder.cmmSesion.cmmResultado.includes("Examen práctico completado") && cmmPruebaBuilder.cmmHistorial.cmmPartidas[0].cmmModo === "cmm-examen-practico"'));
      cmmRegistrar('Examen práctico de pelvis completado sin siluetas y con resultado separado');
      await cmmCapturar('cmm-examen-practico-resultado-electron');

      await cmmClic('[data-cmm-builder="salir"]');
      await cmmEsperar('!document.querySelector("#cmm-builder").open && cmmPruebaBuilder.cmmEscena === null', 'Regreso al atlas');
      cmmAfirmar.equal(await cmmEvaluar('document.querySelector("#cmm-giro").getAttribute("aria-pressed")'), 'true');
      cmmRegistrar('Regreso al atlas y giro anterior restaurado');

      await cmmClic('#cmm-builder-abrir');
      await cmmClic('summary:has(+ section #cmm-builder-reducir)');
      await cmmClic('#cmm-builder-reducir');
      await cmmEvaluar(`(() => {
        for (const [cmmId, cmmValor] of [['sensibilidad', '0.6'], ['texto', '1.3']]) {
          const cmmControl = document.querySelector('#cmm-builder-' + cmmId);
          cmmControl.value = cmmValor;
          cmmControl.dispatchEvent(new Event('change', { bubbles: true }));
        }
      })()`);
      await cmmClic('[data-cmm-builder="cmm-practica-libre"]');
      await cmmEsperar('cmmPruebaBuilder.cmmSesion?.cmmLibre === true', 'Práctica libre desde Controles');
      cmmAfirmar(await cmmEvaluar('cmmPruebaBuilder.cmmEscena.cmmReducir && cmmPruebaBuilder.cmmEscena.cmmOrbita.rotateSpeed === 0.6'));
      cmmAfirmar.equal(await cmmEvaluar('document.querySelector("#cmm-builder").style.getPropertyValue("--cmm-builder-escala-texto")'), '1.3');
      await cmmClic('[data-cmm-builder="separar"]');
      await cmmEsperar('cmmPruebaBuilder.cmmSesion.cmmFase === "jugando" && !cmmPruebaBuilder.cmmSesion.cmmAnimacion', 'Separación con movimiento reducido');
      await cmmCapturar('cmm-practica-texto-grande-electron');
      await cmmClic('[data-cmm-builder="salir"]');
      cmmRegistrar('Práctica libre desde Controles, movimiento reducido, sensibilidad y texto grande');
      cmmAfirmar(await cmmEvaluar('JSON.parse(localStorage.getItem("cmm.builder.v2")).cmmVersion === 2 && JSON.parse(localStorage.getItem("cmm.builder.v2")).cmmDocentes.length === 2'));
      await cmmClic('#cmm-creditos-abrir');
      cmmAfirmar(await cmmEvaluar('document.querySelector("#cmm-modal").textContent.includes("three.js 0.169.0")'));
      await cmmCapturar('cmm-creditos-licencias-electron');
      await cmmClic('#cmm-creditos-cerrar');
      cmmRegistrar('Protocolo restringido, renderer sin Node, persistencia v2 y créditos locales');
      if (cmmIntegral) {
        cmmInforme.cmmMediciones.cmmNiveles = await cmmVerificarNiveles({ cmmEvaluar, cmmClic, cmmMover, cmmEsperar, cmmCapturar, cmmRegistrar, cmmWeb });
        await cmmClic('#cmm-paleta-abrir');
        for (const [cmmOrden, cmmCondicion] of [
          ['Muestra solo los huesos', 'cmmPruebaAtlas.cmmEscena.cmmEstado.cmmSistemas.size === 1 && cmmPruebaAtlas.cmmEscena.cmmEstado.cmmSistemas.has("skeletal")'],
          ['Activa rayos X', 'cmmPruebaAtlas.cmmEscena.cmmEstado.cmmRayosX'],
          ['Quita rayos X', '!cmmPruebaAtlas.cmmEscena.cmmEstado.cmmRayosX'],
          ['Corta en plano sagital al 40 %', 'cmmPruebaAtlas.cmmEscena.cmmCorte.cmmEje === "sagital" && cmmPruebaAtlas.cmmEscena.cmmCorte.cmmValor === 0.4'],
          ['Quita el corte', 'cmmPruebaAtlas.cmmEscena.cmmCorte.cmmEje === "ninguno"'],
          ['Mide el fémur', 'cmmPruebaAtlas.cmmEscena.cmmMedicion.cmmDistancia > 0'],
          ['Quita la medición', 'cmmPruebaAtlas.cmmEscena.cmmMedicion.cmmPuntos.length === 0'],
          ['Qué es el páncreas', 'document.querySelector("#cmm-paleta-respuesta").textContent.includes("Páncreas")']
        ]) {
          await cmmWeb.insertText(cmmOrden);
          await cmmTecla('Enter', 13);
          cmmAfirmar(await cmmEvaluar(cmmCondicion), cmmOrden + ': ' + await cmmEvaluar('document.querySelector("#cmm-paleta-respuesta").textContent'));
        }
        await cmmTecla('Escape', 27);
        cmmRegistrar('Órdenes de visibilidad, rayos X, corte, medición e información en español');
      }
      cmmInforme.cmmResultado = 'correcto';
    } catch (cmmError) {
      cmmInforme.cmmResultado = 'fallo';
      cmmInforme.cmmErrores.push(String(cmmError.stack || cmmError));
    } finally {
      cmmGuardar();
      if (cmmWeb.debugger.isAttached()) cmmWeb.debugger.detach();
      cmmApp.exit(cmmInforme.cmmResultado === 'correcto' ? 0 : 1);
    }
  });
});

require(process.env.CMM_ENTRADA_ELECTRON ? cmmRuta.resolve(process.env.CMM_ENTRADA_ELECTRON) : '../principal.cjs');
