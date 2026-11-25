const cmmAfirmar = require('node:assert/strict');
const cmmFs = require('node:fs');
const cmmRuta = require('node:path');

async function cmmVerificarCatalogo(cmmEvaluar) {
  return cmmEvaluar(`(() => {
    const cmmBuilder = cmmPruebaBuilder;
    const cmmControl = cmmId => document.getElementById('cmm-builder-' + cmmId);
    const cmmFijar = (cmmCampo, cmmValor) => {
      const cmmSelect = cmmControl(cmmCampo);
      cmmSelect.value = cmmValor;
      cmmSelect.dispatchEvent(new Event('change', { bubbles: true }));
    };
    const cmmLeer = () => [...cmmControl('retos').querySelectorAll('[data-cmm-builder-reto]')]
      .map(cmmBoton => cmmBoton.dataset.cmmBuilderReto);
    const cmmIgualar = (cmmActuales, cmmEsperados, cmmContexto) => {
      if (JSON.stringify(cmmActuales) !== JSON.stringify(cmmEsperados)) throw Error(cmmContexto + ': ' + cmmActuales.join(', '));
    };
    const cmmModos = [...cmmControl('modo').options].map(cmmOpcion => cmmOpcion.value);
    const cmmNiveles = [...cmmControl('dificultad').options].map(cmmOpcion => cmmOpcion.value);
    const cmmFormatos = [...cmmControl('layout').options].map(cmmOpcion => cmmOpcion.value);
    const cmmOriginal = ['modo', 'dificultad', 'layout', 'region', 'sistema', 'cantidad'].map(cmmId => [cmmId, cmmControl(cmmId).value]);
    const cmmPorId = new Map(cmmBuilder.cmmCatalogo.map(cmmReto => [cmmReto.cmmId, cmmReto]));
    let cmmCasos = 0;
    let cmmFiltros = 0;
    let cmmSinResultados = 0;
    for (const cmmModo of cmmModos) {
      cmmFijar('modo', cmmModo);
      for (const cmmNivel of cmmNiveles) {
        cmmFijar('dificultad', cmmNivel);
        for (const cmmFormato of cmmFormatos) {
          cmmFijar('layout', cmmFormato);
          const cmmContexto = [cmmModo, cmmNivel, cmmFormato].join(' / ');
          const cmmEsperados = cmmBuilder.cmmCatalogo.filter(cmmReto => cmmBuilder.cmmModoAdmiteMision(cmmReto, cmmModo, Number(cmmNivel)));
          cmmIgualar(cmmLeer(), cmmEsperados.map(cmmReto => cmmReto.cmmId), cmmContexto);
          if (cmmControl('layout').disabled !== ['detective', 'diseccion'].includes(cmmModo)) throw Error(cmmContexto + ' distribución');
          if (cmmControl('dificultad').disabled !== (cmmModo === 'libre')) throw Error(cmmContexto + ' dificultad');
          if (!cmmEsperados.length) {
            if (!cmmControl('retos').textContent.includes('Ningún desafío')) throw Error(cmmContexto + ' catálogo vacío');
            cmmSinResultados++;
          }
          cmmCasos++;
          for (const [cmmCampo, cmmValorDe] of [
            ['region', cmmReto => cmmReto.cmmRegion],
            ['sistema', cmmReto => cmmReto.cmmSistema],
            ['cantidad', cmmReto => String(cmmBuilder.cmmCantidadMision(cmmReto, cmmModo, Number(cmmNivel)))]
          ]) {
            for (const cmmValor of [...cmmControl(cmmCampo).options].map(cmmOpcion => cmmOpcion.value).slice(1)) {
              cmmFijar(cmmCampo, cmmValor);
              cmmIgualar(cmmLeer(), cmmEsperados.filter(cmmReto => cmmValorDe(cmmReto) === cmmValor).map(cmmReto => cmmReto.cmmId), cmmContexto + ' ' + cmmCampo + ' ' + cmmValor);
              cmmFiltros++;
            }
            cmmFijar(cmmCampo, '');
          }
          const cmmPrimero = cmmPorId.get(cmmLeer()[0]);
          if (cmmPrimero) {
            cmmFijar('region', cmmPrimero.cmmRegion);
            cmmFijar('sistema', cmmPrimero.cmmSistema);
            cmmFijar('cantidad', String(cmmBuilder.cmmCantidadMision(cmmPrimero, cmmModo, Number(cmmNivel))));
            if (!cmmLeer().includes(cmmPrimero.cmmId)) throw Error(cmmContexto + ' filtros combinados');
            for (const cmmCampo of ['region', 'sistema', 'cantidad']) cmmFijar(cmmCampo, '');
            cmmFiltros++;
          }
        }
      }
    }
    for (const [cmmCampo, cmmValor] of cmmOriginal) cmmFijar(cmmCampo, cmmValor);
    cmmFijar('modo', 'clasico');
    cmmFijar('dificultad', '0');
    cmmFijar('region', 'Pelvis');
    cmmFijar('sistema', 'digestive');
    cmmIgualar(cmmLeer(), [], 'Pelvis / Digestivo');
    if (!cmmControl('retos').textContent.includes('Ningún desafío')) throw Error('Falta el aviso de catálogo vacío.');
    cmmFiltros++;
    cmmSinResultados++;
    for (const [cmmCampo, cmmValor] of cmmOriginal) cmmFijar(cmmCampo, cmmValor);
    return { cmmCasos, cmmFiltros, cmmSinResultados };
  })()`);
}

async function cmmVerificarNiveles(cmmPrueba) {
  const { cmmEvaluar, cmmClic, cmmMover, cmmEsperar, cmmCapturar, cmmRegistrar, cmmWeb } = cmmPrueba;
  await cmmEvaluar(`(async () => {
    const cmmTres = await import('three');
    const cmmE = cmmPruebaAtlas.cmmEscena;
    const cmmLienzo = cmmE.cmmRender.domElement;
    cmmPruebaAtlas.cmmPuntosMapa = (cmmPregunta, cmmDistanciaMinima = 0, cmmDesde = null, cmmEscala = .65) => {
      const cmmRect = cmmLienzo.getBoundingClientRect();
      const cmmAncho = Math.floor(cmmRect.width * cmmEscala);
      const cmmAlto = Math.floor(cmmRect.height * cmmEscala);
      const cmmDestino = new cmmTres.WebGLRenderTarget(cmmAncho, cmmAlto, {type: cmmTres.FloatType});
      const cmmDatos = new Float32Array(cmmAncho * cmmAlto * 4);
      const cmmR = cmmE.cmmRender;
      const cmmDestinoPrevio = cmmR.getRenderTarget();
      const cmmColor = cmmR.getClearColor(new cmmTres.Color());
      const cmmAlfa = cmmR.getClearAlpha();
      try {
        cmmR.setRenderTarget(cmmDestino);
        cmmR.setClearColor(0x000000, 0);
        cmmR.clear();
        cmmR.render(cmmE.cmmLote.cmmEscenaElegir, cmmE.cmmCamara);
        cmmR.readRenderTargetPixels(cmmDestino, 0, 0, cmmAncho, cmmAlto, cmmDatos);
      } finally {
        cmmR.setRenderTarget(cmmDestinoPrevio);
        cmmR.setClearColor(cmmColor, cmmAlfa);
        cmmDestino.dispose();
      }
      const cmmAceptadas = new Set(cmmE.cmmPiezas.filter(cmmPieza => !cmmPregunta ||
        (cmmPregunta.cmmAcepta ? cmmPregunta.cmmAcepta(cmmPieza) : cmmPieza.cmmNombreEn.toLowerCase() === cmmPregunta.cmmNombreEn.toLowerCase()
          && cmmPieza.cmmSistema === cmmPregunta.cmmSistema)).map(cmmPieza => cmmPieza.cmmOrden + 1));
      for (const cmmMargen of [2, 1]) {
        for (let cmmY = 2; cmmY < cmmAlto - 2; cmmY++) {
          for (let cmmX = 2; cmmX < cmmAncho - 2; cmmX++) {
            const cmmI = (cmmY * cmmAncho + cmmX) * 4;
            const cmmId = cmmDatos[cmmI];
            if (!cmmAceptadas.has(cmmId) || cmmDatos[cmmI + 4 * cmmMargen] !== cmmId || cmmDatos[cmmI - 4 * cmmMargen] !== cmmId
                || cmmDatos[cmmI + 4 * cmmAncho * cmmMargen] !== cmmId || cmmDatos[cmmI - 4 * cmmAncho * cmmMargen] !== cmmId) continue;
            const cmmPX = Math.round(cmmRect.left + (cmmX + .5) * cmmRect.width / cmmAncho);
            const cmmPY = Math.round(cmmRect.top + (cmmAlto - cmmY - .5) * cmmRect.height / cmmAlto);
            if (cmmDesde && Math.hypot(cmmPX - cmmDesde[0], cmmPY - cmmDesde[1]) < cmmDistanciaMinima) continue;
            if (document.elementFromPoint(cmmPX, cmmPY) !== cmmLienzo) continue;
            const cmmPieza = cmmE.cmmPorId.get(cmmE.cmmPickear({clientX: cmmPX, clientY: cmmPY}));
            if (cmmPieza && cmmAceptadas.has(cmmPieza.cmmOrden + 1)) return [cmmPX, cmmPY];
          }
        }
      }
      return null;
    };
  })()`);
  const cmmClicPunto = async cmmPunto => {
    await cmmMover('mousePressed', cmmPunto);
    await cmmMover('mouseReleased', cmmPunto);
  };
  const cmmBuscarPunto = async (cmmSeparar) => {
    const cmmPregunta = 'cmmPruebaAtlas.cmmExamen.cmmPreguntas[cmmPruebaAtlas.cmmExamen.cmmIndice]';
    if (cmmSeparar) {
      const cmmInicio = await cmmEvaluar('cmmPruebaAtlas.cmmExamen.cmmInicioPregunta');
      await cmmClic('[data-cmm-ex="vista-piezas"]');
      await cmmEsperar('!cmmPruebaAtlas.cmmEscena.cmmTween', 'Vista de piezas separadas');
      cmmAfirmar.equal(await cmmEvaluar('cmmPruebaAtlas.cmmExamen.cmmInicioPregunta'), cmmInicio);
      cmmAfirmar(await cmmEvaluar('!document.querySelector(".cmm-etiqueta:not([hidden])") && !cmmPruebaAtlas.cmmEscena.cmmEstado.cmmResalte.size'));
      await cmmCapturar('cmm-verificacion-experto-piezas-separadas');
      const cmmPunto = await cmmEvaluar(`cmmPruebaAtlas.cmmPuntosMapa(${cmmPregunta}, 0, null, 1)`);
      return cmmPunto && { cmmPunto, cmmSeparado: true };
    }
    for (const cmmVista of [null, 'frente', 'lado', 'espalda']) {
      if (cmmVista) await cmmClic(`[data-cmm-vista="${cmmVista}"]`);
      await cmmEsperar('!cmmPruebaAtlas.cmmEscena.cmmTween', 'Cámara de identificación');
      const cmmPunto = await cmmEvaluar(`cmmPruebaAtlas.cmmPuntosMapa(${cmmPregunta})`);
      if (cmmPunto) return { cmmPunto, cmmAcercado: false };
    }
    for (const cmmVista of ['frente', 'lado', 'espalda', 'tres']) {
      await cmmClic(`[data-cmm-vista="${cmmVista}"]`);
      await cmmEsperar('!cmmPruebaAtlas.cmmEscena.cmmTween', 'Vista para acercarse a la pieza');
      for (let cmmAcercamiento = 0; cmmAcercamiento < 2; cmmAcercamiento++) {
        const [cmmX, cmmY] = await cmmEvaluar(`(() => {
          const cmmProyectado = cmmPruebaAtlas.cmmEscena.cmmProyectar(${cmmPregunta}.cmmCentro);
          return [Math.round(cmmProyectado.cmmX), Math.round(cmmProyectado.cmmY)];
        })()`);
        await cmmWeb.debugger.sendCommand('Input.dispatchMouseEvent', { type: 'mouseWheel', x: cmmX, y: cmmY, deltaX: 0, deltaY: -450 });
        await cmmEsperar('Math.abs(cmmPruebaAtlas.cmmEscena.cmmZoomResto) < .01', 'Acercamiento de la cámara');
        const cmmPunto = await cmmEvaluar(`cmmPruebaAtlas.cmmPuntosMapa(${cmmPregunta}, 0, null, 1)`);
        if (cmmPunto) return { cmmPunto, cmmAcercado: true };
      }
    }
    const cmmDisponible = await cmmEvaluar(`!!document.querySelector('[data-cmm-ex="vista-piezas"]:not([disabled])')`);
    return cmmDisponible ? cmmBuscarPunto(true) : null;
  };
  const cmmNiveles = [];
  for (const [cmmNivel, cmmSemilla] of [['pollito', 1], ['aprendiz', 16], ['experto', 78]]) {
    await cmmClic('#cmm-herramientas-abrir');
    await cmmClic('[data-cmm-pestana="estudio"]');
    await cmmEvaluar(`(() => {
      cmmPruebaAtlas.cmmAzarOriginal = Math.random;
      let cmmEstado = ${cmmSemilla};
      Math.random = () => {
        cmmEstado = (Math.imul(cmmEstado, 1664525) + 1013904223) >>> 0;
        return cmmEstado / 4294967296;
      };
    })()`);
    try {
      await cmmClic(`[data-cmm-nivel="${cmmNivel}"]`);
    } finally {
      await cmmEvaluar('void (Math.random = cmmPruebaAtlas.cmmAzarOriginal)');
    }
    const cmmPreguntas = await cmmEvaluar('cmmPruebaAtlas.cmmExamen.cmmPreguntas.map(cmmPregunta => cmmPregunta.cmmNombre)');
    const cmmTotal = cmmPreguntas.length;
    cmmAfirmar.equal(cmmTotal, 8);
    if (cmmNivel === 'aprendiz') cmmAfirmar(cmmPreguntas.includes('Tenia mesocólica'));
    if (cmmNivel === 'experto') cmmAfirmar(cmmPreguntas.includes('Intertransverso lumbar lateral'));
    const cmmAcercadas = [];
    const cmmSeparadas = [];
    for (let cmmI = 0; cmmI < cmmTotal; cmmI++) {
      const cmmHallazgo = await cmmBuscarPunto(cmmNivel === 'experto' && cmmPreguntas[cmmI] === 'Intertransverso lumbar lateral');
      cmmAfirmar(cmmHallazgo, cmmNivel + ' sin pieza seleccionable: ' + cmmPreguntas[cmmI]);
      if (cmmHallazgo.cmmAcercado) cmmAcercadas.push(cmmPreguntas[cmmI]);
      if (cmmHallazgo.cmmSeparado) cmmSeparadas.push(cmmPreguntas[cmmI]);
      await cmmClicPunto(cmmHallazgo.cmmPunto);
      await cmmEsperar('cmmPruebaAtlas.cmmExamen.cmmRespondida', cmmNivel + ' pregunta ' + (cmmI + 1));
      cmmAfirmar.equal(await cmmEvaluar('cmmPruebaAtlas.cmmExamen.cmmResultados.at(-1).cmmAcierto'), true);
      await cmmClic('[data-cmm-ex="siguiente"]');
      cmmAfirmar.equal(await cmmEvaluar('cmmPruebaAtlas.cmmEscena.cmmEstado.cmmExplosionValor'), 0);
    }
    cmmAfirmar.equal(await cmmEvaluar(`JSON.parse(localStorage.getItem('cmm.niveles.v1'))[${JSON.stringify(cmmNivel)}]`), 3);
    await cmmCapturar('cmm-verificacion-nivel-' + cmmNivel);
    await cmmClic('[data-cmm-ex="salir"]');
    cmmNiveles.push({ cmmNivel, cmmTotal, cmmEstrellas: 3, cmmPreguntas, cmmAcercadas, cmmSeparadas });
    cmmRegistrar('Nivel ' + cmmNivel + ': 8 respuestas con ratón, 3 estrellas y regreso al atlas');
  }
  await cmmClic('#cmm-reiniciar-todo');
  await cmmEsperar('!cmmPruebaAtlas.cmmEscena.cmmTween', 'Cámara de medición');
  await cmmClic('#cmm-medir');
  const cmmPuntoA = await cmmEvaluar('cmmPruebaAtlas.cmmPuntosMapa(null)');
  const cmmPuntoB = await cmmEvaluar(`cmmPruebaAtlas.cmmPuntosMapa(null, 90, ${JSON.stringify(cmmPuntoA)})`);
  cmmAfirmar(cmmPuntoA && cmmPuntoB, 'Dos puntos distintos del modelo');
  await cmmClicPunto(cmmPuntoA);
  await cmmClicPunto(cmmPuntoB);
  await cmmEsperar('cmmPruebaAtlas.cmmEscena.cmmMedicion.cmmDistancia > 0 && !document.querySelector("#cmm-distancia").classList.contains("cmm-oculto")', 'Resultado de medición');
  await cmmCapturar('cmm-verificacion-medicion-electron');
  await cmmClic('#cmm-medir-limpiar');
  cmmAfirmar.equal(await cmmEvaluar('cmmPruebaAtlas.cmmEscena.cmmMedicion.cmmPuntos.length'), 0);
  await cmmClic('#cmm-medir');
  cmmRegistrar('Medición sobre dos puntos del modelo con ratón, resultado en centímetros y borrado');
  return cmmNiveles;
}

async function cmmVerificarReapertura(cmmPrueba) {
  const { cmmEvaluar, cmmClic, cmmEsperar, cmmCapturar, cmmRegistrar, cmmWeb, cmmPerfil } = cmmPrueba;
  const cmmClaves = ['cmm.builder.v2', 'cmm.juego.v1', 'cmm.niveles.v1', 'cmm.progreso.v1', 'cmm.vistas.v1'];
  await cmmClic('#cmm-herramientas-abrir');
  await cmmClic('[data-cmm-pestana="estudio"]');
  cmmAfirmar(await cmmEvaluar(`['pollito', 'aprendiz', 'experto'].every(cmmNivel => {
    const cmmBoton = document.querySelector('[data-cmm-nivel="' + cmmNivel + '"]');
    return !cmmBoton.disabled && cmmBoton.querySelector('.cmm-estrellas').textContent === '★★★';
  })`));
  await cmmCapturar('cmm-verificacion-estrellas-reapertura');
  await cmmClic('[data-cmm-pestana="vistas"]');
  await cmmClic('[data-cmm-vi="0"]');
  cmmAfirmar.equal(await cmmEvaluar('document.querySelector("#cmm-corte-eje").value'), 'transversal');
  await cmmClic('#cmm-herramientas-cerrar');
  await cmmClic('#cmm-builder-abrir');
  await cmmEsperar('document.querySelectorAll("[data-cmm-builder-reto]").length > 0', 'Catálogo al reabrir');
  cmmAfirmar(await cmmEvaluar('document.querySelector("[data-cmm-builder=\'cmm-docente-jugar\']") && JSON.parse(localStorage.getItem("cmm.builder.v2")).cmmDocentes.length === 2'));
  cmmAfirmar(await cmmEvaluar('document.querySelector("[data-cmm-builder-campana=\'cmm-columna-lumbar\']:not([disabled])")'));
  cmmAfirmar(await cmmEvaluar('document.querySelector("#cmm-builder-texto").value === "1.3" && document.querySelector("#cmm-builder-reducir").checked'));
  await cmmClic('[data-cmm-builder="salir"]');
  cmmRegistrar('Reapertura real: estrellas, corte guardado, campaña, docentes y ajustes disponibles');
  const cmmAnterior = await cmmEvaluar(`Object.fromEntries(${JSON.stringify(cmmClaves)}.map(cmmClave => [cmmClave, localStorage.getItem(cmmClave)]))`);
  cmmAfirmar(Object.values(cmmAnterior).every(Boolean));
  cmmAfirmar(JSON.parse(cmmAnterior['cmm.juego.v1']).cmmMonedas > 0);
  await cmmClic('#cmm-creditos-abrir');
  const cmmDetalles = await cmmEvaluar('document.querySelector("#cmm-modal details").open');
  if (!cmmDetalles) await cmmClic('#cmm-modal details summary');
  const cmmDescarga = new Promise((cmmResolver, cmmRechazar) => {
    const cmmTemporizador = setTimeout(() => cmmRechazar(Error('Exportación local sin completar')), 7000);
    cmmWeb.session.once('will-download', (cmmEvento, cmmArchivo) => {
      const cmmExportado = cmmRuta.join(cmmPerfil, 'cmm-datos-locales-verificados.json');
      cmmArchivo.setSavePath(cmmExportado);
      cmmArchivo.once('done', (cmmFin, cmmEstado) => {
        clearTimeout(cmmTemporizador);
        if (cmmEstado !== 'completed') cmmRechazar(Error(cmmEstado));
        else cmmResolver(JSON.parse(cmmFs.readFileSync(cmmExportado, 'utf8')));
      });
    });
  });
  await cmmClic('#cmm-local-exportar');
  const cmmCopia = await cmmDescarga;
  cmmAfirmar.equal(cmmCopia.cmmVersion, 1);
  for (const cmmClave of cmmClaves) cmmAfirmar.equal(cmmCopia.cmmDatos[cmmClave], cmmAnterior[cmmClave], cmmClave);
  await cmmEvaluar('void (window.confirm = () => false)');
  await cmmClic('#cmm-local-borrar');
  cmmAfirmar.equal(await cmmEvaluar('localStorage.getItem("cmm.juego.v1")'), cmmAnterior['cmm.juego.v1']);
  await cmmEvaluar('void (window.confirm = () => true)');
  const cmmRecarga = new Promise(cmmResolver => cmmWeb.once('did-finish-load', cmmResolver));
  await cmmClic('#cmm-local-borrar');
  await cmmRecarga;
  await cmmEsperar('!document.querySelector("#cmm-builder-abrir").disabled', 'Atlas limpio');
  cmmAfirmar(await cmmEvaluar(`${JSON.stringify(cmmClaves)}.every(cmmClave => localStorage.getItem(cmmClave) === null)`));
  cmmRegistrar('Exportación de los cinco registros y borrado confirmado solo en el perfil temporal');
}

module.exports = { cmmVerificarCatalogo, cmmVerificarNiveles, cmmVerificarReapertura };
