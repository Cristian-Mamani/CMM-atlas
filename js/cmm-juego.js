const CMM_CLAVE_JUEGO = 'cmm.juego.v1';

export const CMM_VIDAS_MAXIMAS = 3;
export const CMM_COSTE_PISTA = 10;

export class CMMJuego {
  constructor() {
    this.cmmMonedas = 0;
    this.cmmVidas = CMM_VIDAS_MAXIMAS;
    this.cmmGanadasPartida = 0;
    this.cmmGastadasPartida = 0;
    this.cmmOyentes = [];
    this.cmmCargar();
  }

  cmmCargar() {
    try {
      const cmmDatos = JSON.parse(localStorage.getItem(CMM_CLAVE_JUEGO));
      if (cmmDatos && Number.isFinite(cmmDatos.cmmMonedas)) this.cmmMonedas = Math.max(0, Math.floor(cmmDatos.cmmMonedas));
    } catch (cmmFallo) {
      this.cmmMonedas = 0;
    }
  }

  cmmGuardar() {
    try {
      localStorage.setItem(CMM_CLAVE_JUEGO, JSON.stringify({ cmmMonedas: this.cmmMonedas }));
    } catch (cmmFallo) {
      return;
    }
  }

  cmmSuscribir(cmmFuncion) {
    this.cmmOyentes.push(cmmFuncion);
  }

  cmmAvisar() {
    this.cmmOyentes.forEach((cmmF) => cmmF());
  }

  cmmNuevaPartida() {
    this.cmmVidas = CMM_VIDAS_MAXIMAS;
    this.cmmGanadasPartida = 0;
    this.cmmGastadasPartida = 0;
    this.cmmAvisar();
  }

  cmmGanar(cmmCantidad) {
    if (!Number.isFinite(cmmCantidad)) return 0;
    const cmmN = Math.max(0, Math.floor(cmmCantidad));
    this.cmmMonedas += cmmN;
    this.cmmGanadasPartida += cmmN;
    this.cmmGuardar();
    this.cmmAvisar();
    return cmmN;
  }

  cmmPuedePagar(cmmCantidad) {
    return Number.isSafeInteger(cmmCantidad) && cmmCantidad >= 0 && this.cmmMonedas >= cmmCantidad;
  }

  cmmGastar(cmmCantidad) {
    if (!this.cmmPuedePagar(cmmCantidad)) return false;
    this.cmmMonedas -= cmmCantidad;
    this.cmmGastadasPartida += cmmCantidad;
    this.cmmGuardar();
    this.cmmAvisar();
    return true;
  }

  cmmPerderVida() {
    this.cmmVidas = Math.max(0, this.cmmVidas - 1);
    this.cmmAvisar();
    return this.cmmVidas;
  }

  cmmSinVidas() {
    return this.cmmVidas <= 0;
  }

  cmmCorazones() {
    let cmmTexto = '';
    for (let cmmI = 0; cmmI < CMM_VIDAS_MAXIMAS; cmmI++) {
      cmmTexto += '<i class="cmm-corazon' + (cmmI < this.cmmVidas ? '' : ' cmm-corazon-perdido') + '">&#9829;</i>';
    }
    return cmmTexto;
  }

  cmmPremioPregunta(cmmRacha) {
    return 5 + Math.min(cmmRacha, 5);
  }

  cmmPremioFinal(cmmFallos, cmmCompleto) {
    if (!cmmCompleto) return 0;
    return cmmFallos === 0 ? 30 : 10;
  }
}
