const CMM_CLAVE_PROGRESO = 'cmm.progreso.v1';
const CMM_DIA = 24 * 60 * 60 * 1000;
const CMM_INTERVALOS_DIAS = [0, 1, 3, 7, 14, 30];
const CMM_ESPERA_FALLO = 10 * 60 * 1000;
const CMM_NUEVAS_POR_SESION = 5;
const CMM_MAXIMO_VENCIDAS = 40;
const CMM_CAJA_DOMINADA = 4;

function cmmNormalizarRegistro(cmmRegistro) {
  const cmmDatos = { ...cmmRegistro };
  for (const cmmCampo of ['cmmAciertos', 'cmmErrores', 'cmmRacha']) {
    const cmmValor = cmmDatos[cmmCampo];
    cmmDatos[cmmCampo] = Number.isSafeInteger(cmmValor) && cmmValor >= 0 ? cmmValor : 0;
  }
  if (Number.isSafeInteger(cmmDatos.cmmCaja)) cmmDatos.cmmCaja = Math.min(CMM_INTERVALOS_DIAS.length - 1, Math.max(0, cmmDatos.cmmCaja));
  else delete cmmDatos.cmmCaja;
  if (!Number.isFinite(cmmDatos.cmmProximo)) delete cmmDatos.cmmProximo;
  if (cmmDatos.cmmBuilder && typeof cmmDatos.cmmBuilder === 'object' && !Array.isArray(cmmDatos.cmmBuilder)) {
    cmmDatos.cmmBuilder = Object.fromEntries(Object.entries(cmmDatos.cmmBuilder)
      .filter(([, cmmValor]) => Number.isFinite(cmmValor) && cmmValor >= 0));
  } else delete cmmDatos.cmmBuilder;
  return cmmDatos;
}

export class CMMProgreso {
  constructor() {
    this.cmmDatos = Object.create(null);
    this.cmmOyentes = [];
    this.cmmRelojPrueba = null;
    try {
      const cmmDatos = JSON.parse(localStorage.getItem(CMM_CLAVE_PROGRESO) || '{}');
      if (cmmDatos && typeof cmmDatos === 'object' && !Array.isArray(cmmDatos)) {
        for (const [cmmClave, cmmRegistro] of Object.entries(cmmDatos)) {
          if (cmmRegistro && typeof cmmRegistro === 'object' && !Array.isArray(cmmRegistro)) {
            this.cmmDatos[cmmClave] = cmmNormalizarRegistro(cmmRegistro);
          }
        }
      }
    } catch (cmmFallo) {
      this.cmmDatos = Object.create(null);
    }
  }

  cmmAhora() {
    return this.cmmRelojPrueba === null ? Date.now() : this.cmmRelojPrueba;
  }

  cmmSuscribir(cmmOyente) {
    this.cmmOyentes.push(cmmOyente);
  }

  cmmAvisar() {
    for (const cmmO of this.cmmOyentes) cmmO();
  }

  cmmGuardar() {
    try {
      localStorage.setItem(CMM_CLAVE_PROGRESO, JSON.stringify(this.cmmDatos));
    } catch (cmmFallo) {
      return;
    }
  }

  cmmRegistro(cmmClave) {
    if (!this.cmmDatos[cmmClave]) this.cmmDatos[cmmClave] = { cmmAciertos: 0, cmmErrores: 0, cmmRacha: 0 };
    return this.cmmDatos[cmmClave];
  }

  cmmCajaDe(cmmClave) {
    const cmmR = this.cmmDatos[cmmClave];
    if (!cmmR) return 0;
    if (typeof cmmR.cmmCaja === 'number') return cmmR.cmmCaja;
    return Math.min(cmmR.cmmRacha || 0, 3);
  }

  cmmRegistrar(cmmClave, cmmAcierto, cmmPublicar = true) {
    const cmmR = this.cmmRegistro(cmmClave);
    const cmmCajaPrevia = this.cmmCajaDe(cmmClave);
    if (cmmAcierto) {
      cmmR.cmmAciertos += 1;
      cmmR.cmmRacha += 1;
      cmmR.cmmCaja = Math.min(cmmCajaPrevia + 1, CMM_INTERVALOS_DIAS.length - 1);
      cmmR.cmmProximo = this.cmmAhora() + CMM_INTERVALOS_DIAS[cmmR.cmmCaja] * CMM_DIA;
    } else {
      cmmR.cmmErrores += 1;
      cmmR.cmmRacha = 0;
      cmmR.cmmCaja = 0;
      cmmR.cmmProximo = this.cmmAhora() + CMM_ESPERA_FALLO;
    }
    cmmR.cmmUltima = this.cmmAhora();
    if (cmmPublicar) {
      this.cmmGuardar();
      this.cmmAvisar();
    }
  }

  cmmRegistrarBuilder(cmmRegistros) {
    if (!cmmRegistros.length) return;
    for (const { cmmClave, cmmCorrecta, cmmFallos, cmmMedidas } of cmmRegistros) {
      const cmmR = this.cmmRegistro(cmmClave);
      const cmmB = cmmR.cmmBuilder ??= { cmmPartidas: 0, cmmAciertos: 0 };
      for (const [cmmCampo, cmmValor] of Object.entries(cmmMedidas)) cmmB[cmmCampo] = (cmmB[cmmCampo] ?? 0) + cmmValor;
      cmmB.cmmPartidas = (cmmB.cmmPartidas ?? 0) + 1;
      cmmB.cmmAciertos = (cmmB.cmmAciertos ?? 0) + Number(cmmCorrecta);
      cmmB.cmmUltima = this.cmmAhora();
      if (cmmCorrecta || cmmFallos) this.cmmRegistrar(cmmClave, cmmCorrecta, false);
    }
    this.cmmGuardar();
    this.cmmAvisar();
  }

  cmmDominioBuilder(cmmClave) {
    const cmmRegistro = this.cmmDatos[cmmClave];
    if (!cmmRegistro || (!cmmRegistro.cmmBuilder && !cmmRegistro.cmmAciertos && !cmmRegistro.cmmErrores)) return 'no estudiada';
    if (typeof cmmRegistro.cmmProximo === 'number' && cmmRegistro.cmmProximo <= this.cmmAhora()) return 'necesita repaso';
    const cmmCaja = this.cmmCajaDe(cmmClave);
    return cmmCaja >= CMM_CAJA_DOMINADA ? 'dominada' : cmmCaja >= 2 ? 'familiar' : 'en aprendizaje';
  }

  cmmResumenBuilder(cmmClaves) {
    const cmmEstados = new Map();
    let cmmIntentos = 0;
    let cmmDistancia = 0;
    for (const cmmClave of new Set(cmmClaves)) {
      const cmmEstado = this.cmmDominioBuilder(cmmClave);
      cmmEstados.set(cmmEstado, (cmmEstados.get(cmmEstado) ?? 0) + 1);
      const cmmMedida = this.cmmDatos[cmmClave]?.cmmBuilder;
      cmmIntentos += cmmMedida?.cmmIntentos ?? 0;
      cmmDistancia += cmmMedida?.cmmDistancia ?? 0;
    }
    return { cmmEstados, cmmIntentos, cmmMm: cmmIntentos ? cmmDistancia / cmmIntentos : null };
  }

  cmmFijar(cmmClave, cmmEstado) {
    if (cmmEstado === 'pendiente') {
      delete this.cmmDatos[cmmClave];
    } else if (cmmEstado === 'dominada') {
      const cmmR = this.cmmRegistro(cmmClave);
      cmmR.cmmRacha = Math.max(cmmR.cmmRacha, 2);
      cmmR.cmmAciertos = Math.max(cmmR.cmmAciertos, 2);
      cmmR.cmmCaja = Math.max(this.cmmCajaDe(cmmClave), CMM_CAJA_DOMINADA);
      cmmR.cmmProximo = this.cmmAhora() + CMM_INTERVALOS_DIAS[cmmR.cmmCaja] * CMM_DIA;
    } else {
      const cmmR = this.cmmRegistro(cmmClave);
      cmmR.cmmRacha = 0;
      cmmR.cmmAciertos = Math.max(cmmR.cmmAciertos, 1);
      cmmR.cmmCaja = 0;
    }
    this.cmmGuardar();
    this.cmmAvisar();
  }

  cmmEstado(cmmClave) {
    const cmmDominio = this.cmmDominioBuilder(cmmClave);
    return cmmDominio === 'no estudiada' ? 'pendiente' : cmmDominio === 'dominada' ? 'dominada' : 'practica';
  }

  cmmErrores(cmmClave) {
    const cmmR = this.cmmDatos[cmmClave];
    return cmmR ? cmmR.cmmErrores : 0;
  }

  cmmResumen(cmmClaves) {
    const cmmCuenta = { dominada: 0, practica: 0, pendiente: 0 };
    for (const cmmC of cmmClaves) cmmCuenta[this.cmmEstado(cmmC)] += 1;
    return cmmCuenta;
  }

  cmmVencidas(cmmClavesDisponibles) {
    const cmmAhora = this.cmmAhora();
    return Object.keys(this.cmmDatos)
      .filter((cmmClave) => (!cmmClavesDisponibles || cmmClavesDisponibles.has(cmmClave))
        && typeof this.cmmDatos[cmmClave].cmmProximo === 'number' && this.cmmDatos[cmmClave].cmmProximo <= cmmAhora)
      .sort((cmmA, cmmB) => this.cmmDatos[cmmA].cmmProximo - this.cmmDatos[cmmB].cmmProximo)
      .slice(0, CMM_MAXIMO_VENCIDAS);
  }

  cmmCantidadNuevas() {
    return CMM_NUEVAS_POR_SESION;
  }

  cmmResumenRepaso(cmmClavesDisponibles) {
    const cmmAhora = this.cmmAhora();
    const cmmClaves = Object.keys(this.cmmDatos).filter(cmmClave => (!cmmClavesDisponibles || cmmClavesDisponibles.has(cmmClave))
      && Number.isFinite(this.cmmDatos[cmmClave].cmmProximo));
    let cmmHoy = 0;
    let cmmDominadas = 0;
    let cmmProxima = null;
    for (const cmmClave of cmmClaves) {
      const cmmR = this.cmmDatos[cmmClave];
      if (cmmR.cmmProximo <= cmmAhora) cmmHoy += 1;
      else if (cmmProxima === null || cmmR.cmmProximo < cmmProxima) cmmProxima = cmmR.cmmProximo;
      if (this.cmmDominioBuilder(cmmClave) === 'dominada') cmmDominadas += 1;
    }
    return { cmmSeguimiento: cmmClaves.length, cmmHoy, cmmDominadas, cmmProxima };
  }

  cmmAvisoProximo(cmmClave, cmmAcierto) {
    if (!cmmAcierto) return 'Si la fallas, volverás a verla en unos minutos.';
    const cmmCaja = Math.min(this.cmmCajaDe(cmmClave) + 1, CMM_INTERVALOS_DIAS.length - 1);
    const cmmDias = CMM_INTERVALOS_DIAS[cmmCaja];
    return 'Si la sabes, volverás a verla en ' + cmmDias + (cmmDias === 1 ? ' día.' : ' días.');
  }

  cmmBorrar() {
    this.cmmDatos = Object.create(null);
    this.cmmGuardar();
    this.cmmAvisar();
  }
}
