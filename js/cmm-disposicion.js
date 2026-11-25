import * as cmmTres from 'three';
import { CMM_SISTEMAS, CMM_CENTRO_CUERPO } from './cmm-datos.js';

const CMM_RANGO_SISTEMA = new Map(CMM_SISTEMAS.map((cmmS, cmmI) => [cmmS.cmmId, cmmI]));
const CMM_HOLGURA = 0.014;

export function cmmCalcularDisposicion(cmmPiezas, cmmIncluir) {
  const cmmDesp = new Float32Array(cmmPiezas.length * 3);
  const cmmMedidas = [];
  let cmmSuperficie = 0;
  for (const cmmP of cmmPiezas) {
    if (!cmmIncluir(cmmP)) continue;
    const cmmTam = cmmP.cmmCaja.getSize(new cmmTres.Vector3());
    const cmmAncho = cmmTam.x + CMM_HOLGURA;
    const cmmAlto = cmmTam.y + CMM_HOLGURA;
    cmmSuperficie += cmmAncho * cmmAlto;
    cmmMedidas.push({ cmmP, cmmAncho, cmmAlto });
  }
  if (!cmmMedidas.length) return { cmmDesp, cmmMedioAncho: 0.8, cmmMedioAlto: 1 };

  cmmMedidas.sort((cmmA, cmmB) => {
    const cmmDif = CMM_RANGO_SISTEMA.get(cmmA.cmmP.cmmSistema) - CMM_RANGO_SISTEMA.get(cmmB.cmmP.cmmSistema);
    return cmmDif !== 0 ? cmmDif : cmmB.cmmAlto - cmmA.cmmAlto;
  });

  const cmmLimite = Math.max(Math.sqrt(cmmSuperficie * 1.7), 1.2);
  const cmmColocadas = [];
  let cmmX = 0;
  let cmmY = 0;
  let cmmFila = 0;
  let cmmMayorX = 0;
  for (const cmmM of cmmMedidas) {
    if (cmmX > 0 && cmmX + cmmM.cmmAncho > cmmLimite) {
      cmmY -= cmmFila;
      cmmX = 0;
      cmmFila = 0;
    }
    cmmColocadas.push({ cmmM, cmmCx: cmmX + cmmM.cmmAncho / 2, cmmCy: cmmY - cmmM.cmmAlto / 2 });
    cmmX += cmmM.cmmAncho;
    cmmFila = Math.max(cmmFila, cmmM.cmmAlto);
    cmmMayorX = Math.max(cmmMayorX, cmmX);
  }
  const cmmAltoTotal = -(cmmY - cmmFila);

  for (const cmmC of cmmColocadas) {
    const cmmP = cmmC.cmmM.cmmP;
    const cmmMundoX = cmmC.cmmCx - cmmMayorX / 2 + CMM_CENTRO_CUERPO.x;
    const cmmMundoY = cmmC.cmmCy + cmmAltoTotal / 2 + CMM_CENTRO_CUERPO.y;
    const cmmK = cmmP.cmmOrden * 3;
    cmmDesp[cmmK] = cmmMundoX - cmmP.cmmCentro.x;
    cmmDesp[cmmK + 1] = cmmMundoY - cmmP.cmmCentro.y;
    cmmDesp[cmmK + 2] = -cmmP.cmmCentro.z;
  }
  return { cmmDesp, cmmMedioAncho: cmmMayorX / 2, cmmMedioAlto: cmmAltoTotal / 2 };
}
