import * as cmmTres from 'three';
import { CMM_ORGANOS, cmmSinTildes } from './cmm-datos.js';
import { CMM_REGIONES, cmmLado } from './cmm-regiones.js';
import { cmmGruposDe, cmmMezclar } from './cmm-examen.js';

const CMM_CLAVE_NIVELES = 'cmm.niveles.v1';
const CMM_PREGUNTAS_NIVEL = 8;

const CMM_REGIONES_JUEGO = [
  { cmmRegion: 'cabeza', cmmLado: null, cmmNombre: 'Cabeza y cuello' },
  { cmmRegion: 'torax', cmmLado: null, cmmNombre: 'Tórax' },
  { cmmRegion: 'abdomen', cmmLado: null, cmmNombre: 'Abdomen' },
  { cmmRegion: 'pelvis', cmmLado: null, cmmNombre: 'Pelvis' },
  { cmmRegion: 'superior', cmmLado: 'lado derecho', cmmNombre: 'Miembro superior derecho' },
  { cmmRegion: 'superior', cmmLado: 'lado izquierdo', cmmNombre: 'Miembro superior izquierdo' },
  { cmmRegion: 'inferior', cmmLado: 'lado derecho', cmmNombre: 'Miembro inferior derecho' },
  { cmmRegion: 'inferior', cmmLado: 'lado izquierdo', cmmNombre: 'Miembro inferior izquierdo' }
];

const CMM_NIVELES = [
  {
    cmmId: 'pollito',
    cmmNombre: 'Pollito',
    cmmIcono: '🐣',
    cmmDescripcion: 'Toca la región del cuerpo que te piden.',
    cmmLimite: 45000,
    cmmSistemas: ['skeletal', 'muscular'],
    cmmRequiere: null
  },
  {
    cmmId: 'aprendiz',
    cmmNombre: 'Aprendiz',
    cmmIcono: '🐥',
    cmmDescripcion: 'Encuentra huesos, músculos y órganos grandes.',
    cmmLimite: 35000,
    cmmSistemas: ['skeletal', 'muscular'].concat(CMM_ORGANOS),
    cmmRequiere: 'pollito'
  },
  {
    cmmId: 'experto',
    cmmNombre: 'Experto',
    cmmIcono: '🦉',
    cmmDescripcion: 'Huesos y músculos pequeños, uno por uno.',
    cmmLimite: 30000,
    cmmSistemas: ['skeletal', 'muscular'],
    cmmRequiere: 'aprendiz'
  }
];

export function cmmTamanoGrupo(cmmGrupo) {
  return cmmGrupo.cmmPiezas.reduce((cmmM, cmmP) => {
    const cmmD = cmmP.cmmCaja.getSize(new cmmTres.Vector3());
    return Math.max(cmmM, cmmD.x * cmmD.y * cmmD.z);
  }, 0);
}

function cmmCentroDe(cmmPiezas) {
  const cmmC = new cmmTres.Vector3();
  cmmPiezas.forEach((cmmP) => cmmC.add(cmmP.cmmCentro));
  return cmmC.divideScalar(Math.max(cmmPiezas.length, 1));
}

function cmmCoincideRegion(cmmDef, cmmPieza) {
  const cmmR = CMM_REGIONES.find((cmmX) => cmmX.cmmId === cmmDef.cmmRegion);
  if (!cmmR || !cmmR.cmmContiene(cmmPieza)) return false;
  return cmmDef.cmmLado === null || cmmLado(cmmPieza) === cmmDef.cmmLado;
}

function cmmFabricarRegiones(cmmPiezas, cmmSistemas) {
  const cmmVisibles = cmmPiezas.filter((cmmP) => cmmSistemas.includes(cmmP.cmmSistema));
  const cmmPreguntas = CMM_REGIONES_JUEGO.map((cmmDef) => {
    const cmmDentro = cmmVisibles.filter((cmmP) => cmmCoincideRegion(cmmDef, cmmP));
    return {
      cmmNombre: cmmDef.cmmNombre,
      cmmNombreEn: 'region-' + cmmDef.cmmRegion + '-' + (cmmDef.cmmLado || 'central'),
      cmmSistema: 'skeletal',
      cmmPiezas: cmmDentro,
      cmmCentro: cmmCentroDe(cmmDentro),
      cmmSinRegistro: true,
      cmmPista: 'mira el cuerpo de frente: la izquierda y la derecha son las de la persona, no las tuyas.',
      cmmAcepta: (cmmP) => cmmCoincideRegion(cmmDef, cmmP)
    };
  }).filter((cmmQ) => cmmQ.cmmPiezas.length > 0);
  return cmmMezclar(cmmPreguntas).slice(0, CMM_PREGUNTAS_NIVEL);
}

function cmmRangoPorTamano(cmmPiezas, cmmSistemas, cmmDesde, cmmHasta) {
  const cmmGrupos = cmmGruposDe(cmmPiezas, cmmSistemas)
    .filter((cmmG) => cmmG.cmmNombre.length < 48)
    .map((cmmG) => ({ cmmGrupo: cmmG, cmmT: cmmTamanoGrupo(cmmG) }))
    .sort((cmmA, cmmB) => cmmB.cmmT - cmmA.cmmT);
  const cmmN = cmmGrupos.length;
  return cmmGrupos.slice(Math.floor(cmmN * cmmDesde), Math.floor(cmmN * cmmHasta)).map((cmmX) => cmmX.cmmGrupo);
}

const CMM_PALABRAS_SUELTAS = new Set(['derecho', 'derecha', 'izquierdo', 'izquierda', 'primer', 'primera', 'primero', 'segundo', 'segunda', 'tercer', 'tercera', 'tercero', 'cuarto', 'cuarta', 'quinto', 'quinta', 'sexto', 'sexta', 'septimo', 'septima', 'octavo', 'octava', 'noveno', 'novena', 'decimo', 'decima', 'undecimo', 'undecima', 'duodecimo', 'duodecima']);

export function cmmClaveGrupo(cmmGrupo) {
  return cmmSinTildes(cmmGrupo.cmmNombre).split(' ').filter((cmmW) => !CMM_PALABRAS_SUELTAS.has(cmmW)).join(' ');
}

function cmmFabricarPorTamano(cmmPiezas, cmmBloques, cmmDesde, cmmHasta) {
  const cmmElegidas = [];
  const cmmClaves = new Set();
  cmmBloques.forEach((cmmB) => {
    let cmmTomadas = 0;
    const cmmCandidatas = cmmMezclar(cmmRangoPorTamano(cmmPiezas, cmmB.cmmSistemas, cmmDesde, cmmB.cmmHasta || cmmHasta));
    for (const cmmG of cmmCandidatas) {
      if (cmmTomadas >= cmmB.cmmCantidad) break;
      const cmmK = cmmClaveGrupo(cmmG);
      if (cmmClaves.has(cmmK)) continue;
      cmmClaves.add(cmmK);
      cmmElegidas.push(cmmG);
      cmmTomadas += 1;
    }
  });
  return cmmMezclar(cmmElegidas).map((cmmG) => Object.assign(cmmG, { cmmSistemasVisibles: [cmmG.cmmSistema] }));
}

export class CMMNiveles {
  constructor(cmmExamen, cmmEscena, cmmContenedor) {
    this.cmmExamen = cmmExamen;
    this.cmmEscena = cmmEscena;
    this.cmmContenedor = cmmContenedor;
    this.cmmEstrellas = this.cmmLeer();
    this.cmmContenedor.addEventListener('click', (cmmEv) => {
      const cmmB = cmmEv.target.closest('[data-cmm-nivel]');
      if (cmmB && !cmmB.disabled) this.cmmEmpezar(cmmB.dataset.cmmNivel);
    });
    this.cmmPintar();
  }

  cmmLeer() {
    try {
      const cmmD = JSON.parse(localStorage.getItem(CMM_CLAVE_NIVELES));
      if (cmmD && typeof cmmD === 'object') return cmmD;
    } catch (cmmFallo) {
      return {};
    }
    return {};
  }

  cmmGuardar() {
    try {
      localStorage.setItem(CMM_CLAVE_NIVELES, JSON.stringify(this.cmmEstrellas));
    } catch (cmmFallo) {
      return;
    }
  }

  cmmEstrellasDe(cmmId) {
    return Math.max(0, Math.min(3, Number(this.cmmEstrellas[cmmId]) || 0));
  }

  cmmDesbloqueado(cmmNivel) {
    return cmmNivel.cmmRequiere === null || this.cmmEstrellasDe(cmmNivel.cmmRequiere) >= 1;
  }

  cmmPintar() {
    this.cmmContenedor.innerHTML = CMM_NIVELES.map((cmmN) => {
      const cmmAbierto = this.cmmDesbloqueado(cmmN);
      const cmmE = this.cmmEstrellasDe(cmmN.cmmId);
      const cmmRelleno = '&#9733;'.repeat(cmmE) + '<span>' + '&#9733;'.repeat(3 - cmmE) + '</span>';
      const cmmPista = cmmAbierto ? cmmN.cmmDescripcion : 'Consigue una estrella en el nivel anterior.';
      return `<button class="cmm-nivel${cmmAbierto ? '' : ' cmm-nivel-cerrado'}" data-cmm-nivel="${cmmN.cmmId}" ${cmmAbierto ? '' : 'disabled'}><span class="cmm-nivel-icono">${cmmAbierto ? cmmN.cmmIcono : '🔒'}</span><span class="cmm-nivel-texto"><strong>${cmmN.cmmNombre}</strong><small>${cmmPista}</small></span><span class="cmm-estrellas cmm-estrellas-chica">${cmmRelleno}</span></button>`;
    }).join('');
  }

  cmmEmpezar(cmmId) {
    const cmmNivel = CMM_NIVELES.find((cmmN) => cmmN.cmmId === cmmId);
    if (!cmmNivel) return;
    let cmmFabrica;
    if (cmmId === 'pollito') cmmFabrica = (cmmPiezas) => cmmFabricarRegiones(cmmPiezas, cmmNivel.cmmSistemas);
    else if (cmmId === 'aprendiz') cmmFabrica = (cmmPiezas) => cmmFabricarPorTamano(cmmPiezas, [{ cmmSistemas: ['skeletal'], cmmCantidad: 3 }, { cmmSistemas: ['muscular'], cmmCantidad: 3 }, { cmmSistemas: CMM_ORGANOS, cmmCantidad: 2, cmmHasta: 0.12 }], 0, 0.3);
    else cmmFabrica = (cmmPiezas) => cmmFabricarPorTamano(cmmPiezas, [{ cmmSistemas: ['skeletal'], cmmCantidad: 4 }, { cmmSistemas: ['muscular'], cmmCantidad: 4 }], 0.45, 0.8);
    this.cmmExamen.cmmIniciar({
      cmmModo: 'encontrar',
      cmmTotal: CMM_PREGUNTAS_NIVEL,
      cmmCategoria: 'todo',
      cmmSistemas: cmmNivel.cmmSistemas,
      cmmLimite: cmmNivel.cmmLimite,
      cmmFabrica: cmmFabrica,
      cmmTitulo: 'Nivel ' + cmmNivel.cmmNombre + ' terminado',
      cmmAlFinalizar: (cmmEstrellas) => {
        if (cmmEstrellas > this.cmmEstrellasDe(cmmId)) {
          this.cmmEstrellas[cmmId] = cmmEstrellas;
          this.cmmGuardar();
        }
        this.cmmPintar();
      }
    });
  }
}
