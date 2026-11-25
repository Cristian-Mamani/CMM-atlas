const CMM_CLAVE_VISTAS = 'cmm.vistas.v1';

function cmmVectorValido(cmmVector) {
  return Array.isArray(cmmVector) && cmmVector.length === 3 && cmmVector.every(Number.isFinite);
}

export function cmmCamaraValida(cmmCamara) {
  return cmmVectorValido(cmmCamara?.cmmPos) && cmmVectorValido(cmmCamara?.cmmObj);
}

function cmmVistaValida(cmmVista) {
  return typeof cmmVista?.cmmNombre === 'string' && cmmCamaraValida(cmmVista.cmmContenido?.cmmCamara);
}

export class CMMVistas {
  constructor() {
    this.cmmLista = [];
    try {
      const cmmDatos = JSON.parse(localStorage.getItem(CMM_CLAVE_VISTAS) || '[]');
      if (Array.isArray(cmmDatos)) this.cmmLista = cmmDatos.filter(cmmVistaValida).slice(0, 30);
    } catch (cmmFallo) {
      this.cmmLista = [];
    }
  }

  cmmGuardar(cmmLista) {
    try {
      localStorage.setItem(CMM_CLAVE_VISTAS, JSON.stringify(cmmLista));
      this.cmmLista = cmmLista;
      return true;
    } catch (cmmFallo) {
      return false;
    }
  }

  cmmAgregar(cmmNombre, cmmContenido) {
    const cmmVista = { cmmNombre, cmmFecha: new Date().toLocaleString('es-PE'), cmmContenido };
    return cmmVistaValida(cmmVista) && this.cmmGuardar([cmmVista, ...this.cmmLista].slice(0, 30));
  }

  cmmQuitar(cmmIndice) {
    if (!Number.isInteger(cmmIndice) || !this.cmmLista[cmmIndice]) return false;
    return this.cmmGuardar(this.cmmLista.filter((cmmVista, cmmI) => cmmI !== cmmIndice));
  }
}
