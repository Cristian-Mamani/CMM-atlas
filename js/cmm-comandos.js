import * as cmmTres from 'three';
import { CMM_SISTEMAS, CMM_SISTEMAS_INICIALES, CMM_ORGANOS, cmmSinTildes } from './cmm-datos.js';
import { CMM_REGIONES, cmmUbicacion } from './cmm-regiones.js';

const CMM_RELLENO = new Set(['el', 'la', 'los', 'las', 'lo', 'de', 'del', 'al', 'a', 'en', 'y', 'un', 'una', 'unos', 'unas', 'por', 'favor', 'me', 'mi', 'que', 'se', 'es', 'con', 'para', 'todo', 'todos', 'todas', 'solo', 'sola', 'solos', 'solas', 'hay', 'tiene', 'tienen', 'cuerpo', 'sistema']);

const CMM_FRASES = [
  ['miembro superior', 'brazo'],
  ['miembros superiores', 'brazo'],
  ['miembro inferior', 'pierna'],
  ['miembros inferiores', 'pierna'],
  ['cabeza y cuello', 'cabeza'],
  ['sistema nervioso', 'nervios'],
  ['tejido conectivo', 'conectivo'],
  ['organos sensoriales', 'sensoriales'],
  ['organos de los sentidos', 'sensoriales'],
  ['superficie corporal', 'piel'],
  ['tres cuartos', 'tresc'],
  ['rayos x', 'rayosx'],
  ['por ciento', '%'],
  ['cada pieza', 'cadapieza']
];

const CMM_PALABRAS_SISTEMA = [
  { cmmId: 'skeletal', cmmPalabras: ['esqueleto', 'hueso', 'oseo', 'osea', 'oseos', 'oseas', 'esqueletico'] },
  { cmmId: 'muscular', cmmPalabras: ['musculo', 'muscular', 'musculatura'] },
  { cmmId: 'cardiac', cmmPalabras: ['corazon'] },
  { cmmId: 'sensory', cmmPalabras: ['sensorial', 'sensoriales', 'sentido'] },
  { cmmId: 'arterial', cmmPalabras: ['arteria', 'arterial', 'arteriales'] },
  { cmmId: 'venous', cmmPalabras: ['vena', 'venoso', 'venosa', 'venosos'] },
  { cmmId: 'nervous', cmmPalabras: ['nervio', 'nervios', 'nervioso', 'neurologico'] },
  { cmmId: 'respiratory', cmmPalabras: ['respiratorio', 'respiratoria', 'respiracion'] },
  { cmmId: 'digestive', cmmPalabras: ['digestivo', 'digestiva', 'digestion'] },
  { cmmId: 'urinary', cmmPalabras: ['urinario', 'urinaria'] },
  { cmmId: 'lymphatic', cmmPalabras: ['linfatico', 'linfatica', 'linfa'] },
  { cmmId: 'endocrine', cmmPalabras: ['endocrino', 'endocrina', 'hormonal'] },
  { cmmId: 'reproductive', cmmPalabras: ['reproductor', 'reproductora', 'reproductivo'] },
  { cmmId: 'integumentary', cmmPalabras: ['piel', 'cutaneo', 'tegumentario'] },
  { cmmId: 'connective', cmmPalabras: ['conectivo', 'ligamento', 'cartilago', 'tendon'] }
];

const CMM_PALABRAS_REGION = [
  { cmmId: 'cabeza', cmmPalabras: ['cabeza', 'cuello'] },
  { cmmId: 'torax', cmmPalabras: ['torax', 'pecho', 'toracico', 'toracica'] },
  { cmmId: 'abdomen', cmmPalabras: ['abdomen', 'vientre', 'abdominal'] },
  { cmmId: 'pelvis', cmmPalabras: ['pelvis', 'cadera', 'pelvico', 'pelvica'] },
  { cmmId: 'superior', cmmPalabras: ['brazo', 'brazos', 'mano', 'manos'] },
  { cmmId: 'inferior', cmmPalabras: ['pierna', 'piernas', 'pie', 'pies', 'muslo'] }
];

const CMM_REFERENCIAS_ALTURA = {
  cuello: 1.5,
  hombros: 1.42,
  hombro: 1.42,
  pecho: 1.3,
  torax: 1.28,
  ombligo: 1.02,
  cintura: 1.05,
  cadera: 0.92,
  pelvis: 0.92,
  muslo: 0.7,
  rodilla: 0.5,
  pantorrilla: 0.3,
  tobillo: 0.08
};

const CMM_EJES_CORTE = {
  transversal: ['transversal', 'horizontal', 'axial'],
  sagital: ['sagital', 'vertical', 'longitudinal'],
  coronal: ['coronal', 'frontal']
};

const CMM_CATEGORIAS_ESTUDIO = [
  { cmmExamen: 'huesos', cmmMazo: 'skeletal', cmmPalabras: ['hueso', 'huesos', 'esqueleto', 'oseo'] },
  { cmmExamen: 'musculos', cmmMazo: 'muscular', cmmPalabras: ['musculo', 'musculos'] },
  { cmmExamen: 'organos', cmmMazo: 'organos', cmmPalabras: ['organo', 'organos'] },
  { cmmExamen: 'nervios', cmmMazo: 'nervous', cmmPalabras: ['nervio', 'nervios'] }
];

const CMM_SISTEMAS_DE_APOYO = new Set(['arterial', 'venous', 'nervous', 'lymphatic', 'connective']);
const CMM_RAIZ_SISTEMA = new Map();
const CMM_RAIZ_REGION = new Map();

const CMM_ETIQUETAS_SISTEMA = new Map(CMM_SISTEMAS.map((cmmS) => [cmmS.cmmId, cmmS.cmmNombre]));

export const CMM_EJEMPLOS_COMANDO = [
  'Aísla el hígado',
  'Muestra solo los huesos',
  'Muestra los músculos del brazo derecho',
  'Corta a la altura del corazón',
  'Mide el fémur',
  'Separa el esqueleto',
  'Qué es el páncreas',
  'Examen de huesos'
];

const CMM_SINONIMOS = [
  [/\bbiceps\b(?! braquial| femoral| crural)/g, 'biceps braquial'],
  [/\btriceps\b(?! braquial| sural)/g, 'triceps braquial'],
  [/\bcerebro\b/g, 'encefalo'],
  [/\b(orejas?|pabellon auricular|pabellon de la oreja)\b/g, 'oido externo']
];

function cmmNormalizar(cmmTexto) {
  let cmmN = cmmSinTildes(cmmTexto).replace(/[^a-z0-9%\s]/g, ' ').replace(/\s+/g, ' ').trim();
  for (const [cmmEr, cmmA] of CMM_SINONIMOS) cmmN = cmmN.replace(cmmEr, cmmA);
  for (const [cmmDe, cmmA] of CMM_FRASES) cmmN = cmmN.split(cmmDe).join(cmmA);
  return cmmN;
}

function cmmRaiz(cmmPalabra) {
  let cmmR = cmmPalabra;
  if (cmmR.length > 4 && cmmR.endsWith('es')) cmmR = cmmR.slice(0, -2);
  else if (cmmR.length > 3 && cmmR.endsWith('s')) cmmR = cmmR.slice(0, -1);
  if (cmmR.length > 3 && /[oa]$/.test(cmmR)) cmmR = cmmR.slice(0, -1);
  return cmmR;
}

for (const cmmS of CMM_PALABRAS_SISTEMA) for (const cmmW of cmmS.cmmPalabras) CMM_RAIZ_SISTEMA.set(cmmRaiz(cmmW), cmmS.cmmId);
for (const cmmR of CMM_PALABRAS_REGION) for (const cmmW of cmmR.cmmPalabras) CMM_RAIZ_REGION.set(cmmRaiz(cmmW), cmmR.cmmId);

function cmmFormatoLongitud(cmmMetros) {
  if (cmmMetros < 1) return (cmmMetros * 100).toFixed(1).replace('.', ',') + ' cm';
  return cmmMetros.toFixed(2).replace('.', ',') + ' m';
}

export class CMMComandos {
  constructor(cmmEscena, cmmApi) {
    this.cmmEscena = cmmEscena;
    this.cmmApi = cmmApi;
    this.cmmGrupos = this.cmmConstruirGrupos();
  }

  cmmCrearGrupo(cmmNombreEn, cmmNombre, cmmPiezas) {
    const cmmNorm = cmmNormalizar(cmmNombre);
    const cmmPartes = cmmNorm.split(' ');
    const cmmConteo = new Map();
    for (const cmmP of cmmPiezas) cmmConteo.set(cmmP.cmmSistema, (cmmConteo.get(cmmP.cmmSistema) || 0) + 1);
    let cmmSistema = cmmPiezas[0].cmmSistema;
    let cmmMayor = 0;
    for (const [cmmId, cmmN] of cmmConteo) {
      const cmmPeso = cmmN * (CMM_SISTEMAS_DE_APOYO.has(cmmId) ? 0.3 : 1);
      if (cmmPeso > cmmMayor) {
        cmmMayor = cmmPeso;
        cmmSistema = cmmId;
      }
    }
    return {
      cmmNombreEn,
      cmmNombre,
      cmmSistema,
      cmmNorm,
      cmmRaices: new Set(cmmPartes.map(cmmRaiz)),
      cmmBase: cmmPartes.filter((cmmX) => !/^(izquierd|derech)/.test(cmmX)).join(' '),
      cmmPiezas
    };
  }

  cmmConstruirGrupos() {
    const cmmMapa = new Map();
    const cmmPorNombre = new Map();
    for (const cmmP of this.cmmEscena.cmmPiezas) {
      if (!cmmPorNombre.has(cmmP.cmmNombreEn)) cmmPorNombre.set(cmmP.cmmNombreEn, { cmmNombre: cmmP.cmmNombre, cmmPiezas: [] });
      cmmPorNombre.get(cmmP.cmmNombreEn).cmmPiezas.push(cmmP);
    }
    for (const [cmmNombreEn, cmmDatos] of cmmPorNombre) cmmMapa.set(cmmNombreEn, this.cmmCrearGrupo(cmmNombreEn, cmmDatos.cmmNombre, cmmDatos.cmmPiezas));
    for (const cmmC of this.cmmEscena.cmmPiezas.cmmConceptos || []) {
      const cmmPiezas = cmmC.cmmIds.map((cmmId) => this.cmmEscena.cmmPorId.get(cmmId)).filter(Boolean);
      if (!cmmPiezas.length) continue;
      const cmmExistente = cmmMapa.get(cmmC.cmmNombreEn);
      if (cmmExistente && cmmExistente.cmmPiezas.length >= cmmPiezas.length) continue;
      cmmMapa.set(cmmC.cmmNombreEn, this.cmmCrearGrupo(cmmC.cmmNombreEn, cmmC.cmmNombre, cmmPiezas));
    }
    return Array.from(cmmMapa.values());
  }

  cmmBuscarEstructura(cmmPalabras) {
    const cmmRaices = cmmPalabras.map(cmmRaiz);
    const cmmCandidatos = [];
    for (const cmmG of this.cmmGrupos) {
      let cmmTodas = true;
      for (const cmmR of cmmRaices) {
        let cmmEsta = cmmG.cmmRaices.has(cmmR);
        if (!cmmEsta && cmmR.length >= 5) {
          for (const cmmX of cmmG.cmmRaices) {
            if (cmmX.startsWith(cmmR)) {
              cmmEsta = true;
              break;
            }
          }
        }
        if (!cmmEsta) {
          cmmTodas = false;
          break;
        }
      }
      if (cmmTodas) cmmCandidatos.push(cmmG);
    }
    if (!cmmCandidatos.length) return [];
    const cmmExacto = (cmmG) => (cmmRaices.every((cmmR) => cmmG.cmmRaices.has(cmmR)) ? 0 : 1);
    cmmCandidatos.sort((cmmA, cmmB) => (cmmExacto(cmmA) - cmmExacto(cmmB)) || (cmmA.cmmRaices.size - cmmB.cmmRaices.size) || (cmmA.cmmNorm.length - cmmB.cmmNorm.length));
    const cmmMejor = cmmCandidatos[0];
    return cmmCandidatos.filter((cmmG) => cmmG.cmmBase === cmmMejor.cmmBase && cmmG.cmmSistema === cmmMejor.cmmSistema);
  }

  cmmAnalizarObjetivo(cmmPalabras) {
    const cmmSistemas = [];
    const cmmRegiones = [];
    const cmmResto = [];
    const cmmPalabrasClave = [];
    let cmmLado = null;
    for (const cmmW of cmmPalabras) {
      const cmmRz = cmmRaiz(cmmW);
      if (cmmRz === 'organ') {
        for (const cmmId of CMM_ORGANOS) cmmSistemas.push(cmmId);
        cmmPalabrasClave.push(cmmW);
      } else if (CMM_RAIZ_SISTEMA.has(cmmRz)) {
        cmmSistemas.push(CMM_RAIZ_SISTEMA.get(cmmRz));
        cmmPalabrasClave.push(cmmW);
      } else if (CMM_RAIZ_REGION.has(cmmRz)) {
        cmmRegiones.push(CMM_RAIZ_REGION.get(cmmRz));
        cmmPalabrasClave.push(cmmW);
      } else if (/^izquierd/.test(cmmW)) {
        cmmLado = 'izquierdo';
      } else if (/^derech/.test(cmmW)) {
        cmmLado = 'derecho';
      } else if (!CMM_RELLENO.has(cmmW) && !/^\d+%?$/.test(cmmW) && cmmW !== '%') {
        cmmResto.push(cmmW);
      }
    }
    return { cmmSistemas, cmmRegiones, cmmResto, cmmLado, cmmPalabrasClave };
  }

  cmmResolverObjetivo(cmmPalabras) {
    const cmmA = this.cmmAnalizarObjetivo(cmmPalabras);
    if (!cmmA.cmmResto.length && (cmmA.cmmSistemas.length || cmmA.cmmRegiones.length)) {
      const cmmPartesRegion = cmmA.cmmRegiones.map((cmmId) => CMM_REGIONES.find((cmmR) => cmmR.cmmId === cmmId));
      const cmmCoincide = (cmmP) => {
        if (cmmA.cmmSistemas.length && !cmmA.cmmSistemas.includes(cmmP.cmmSistema)) return false;
        if (cmmPartesRegion.length && !cmmPartesRegion.some((cmmR) => cmmR.cmmContiene(cmmP))) return false;
        if (cmmA.cmmLado === 'izquierdo' && cmmP.cmmCentro.x <= 0.012) return false;
        if (cmmA.cmmLado === 'derecho' && cmmP.cmmCentro.x >= -0.012) return false;
        return true;
      };
      const cmmPiezas = this.cmmEscena.cmmPiezas.filter(cmmCoincide);
      const cmmNombres = [];
      if (cmmA.cmmSistemas.length) cmmNombres.push((cmmA.cmmSistemas.length >= CMM_ORGANOS.length ? ['Órganos'] : cmmA.cmmSistemas.map((cmmId) => CMM_ETIQUETAS_SISTEMA.get(cmmId))).join(' y '));
      if (cmmPartesRegion.length) cmmNombres.push(cmmPartesRegion.map((cmmR) => cmmR.cmmNombre.toLowerCase()).join(' y '));
      if (cmmA.cmmLado) cmmNombres.push('lado ' + cmmA.cmmLado);
      return { cmmTipo: 'coleccion', cmmA, cmmPiezas, cmmNombre: cmmNombres.join(' · '), cmmRegion: cmmPartesRegion.length === 1 ? cmmPartesRegion[0] : null, cmmCoincide };
    }
    const cmmLadoPalabra = cmmA.cmmLado ? [cmmA.cmmLado] : [];
    if (!cmmA.cmmResto.length) return null;
    let cmmGrupos = this.cmmBuscarEstructura(cmmA.cmmResto.concat(cmmA.cmmPalabrasClave, cmmLadoPalabra));
    if (!cmmGrupos.length) cmmGrupos = this.cmmBuscarEstructura(cmmA.cmmResto.concat(cmmLadoPalabra));
    if (cmmGrupos.length) {
      if (cmmGrupos.some((cmmG) => /\b(izquierd|derech)/.test(cmmG.cmmNorm))) cmmGrupos = cmmGrupos.filter((cmmG) => /\b(izquierd|derech)/.test(cmmG.cmmNorm));
      const cmmPorNombre = new Map();
      for (const cmmG of cmmGrupos) {
        const cmmPrevio = cmmPorNombre.get(cmmG.cmmNombre);
        if (!cmmPrevio || cmmPrevio.cmmPiezas.length < cmmG.cmmPiezas.length) cmmPorNombre.set(cmmG.cmmNombre, cmmG);
      }
      cmmGrupos = Array.from(cmmPorNombre.values());
      const cmmUnicas = new Map();
      for (const cmmG of cmmGrupos) for (const cmmP of cmmG.cmmPiezas) cmmUnicas.set(cmmP.cmmId, cmmP);
      return { cmmTipo: 'estructura', cmmA, cmmGrupos, cmmPiezas: Array.from(cmmUnicas.values()).sort((cmmX, cmmY) => cmmY.cmmTamano - cmmX.cmmTamano), cmmNombre: Array.from(new Set(cmmGrupos.map((cmmG) => cmmG.cmmNombre))).join(' y ') };
    }
    return null;
  }

  cmmPalabrasDe(cmmN, cmmVerbos) {
    return cmmN.split(' ').filter((cmmW) => cmmW && !cmmVerbos.test(cmmW));
  }

  cmmInterpretar(cmmTexto) {
    const cmmN = cmmNormalizar(cmmTexto);
    if (!cmmN) return null;
    const cmmTiene = (cmmEr) => cmmEr.test(cmmN);

    if (cmmTiene(/\b(reinicia|reiniciar|reset|restablece|restablecer|limpia todo|empezar de nuevo)\b/)) return this.cmmPlanReiniciar();
    if (cmmTiene(/\b(quita|quitar|sin|elimina|borra|desactiva)\b.*\bcorte\b/) || /^sin corte/.test(cmmN)) return this.cmmPlanCorte(cmmN, true);
    if (cmmTiene(/\b(quita|quitar|borra|limpia|elimina)\b.*\bmedicion\b/)) return this.cmmPlanLimpiarMedicion();
    if (cmmTiene(/\b(quita|quitar|deselecciona|limpia|elimina)\b.*\bseleccion\b/)) return this.cmmPlanDeseleccionar();
    if (cmmTiene(/\b(rayosx|radiografia|transparenta|transparentar)\b/)) return this.cmmPlanRayos(cmmN);
    if (cmmTiene(/\b(examen|evaluame|evaluacion)\b/)) return this.cmmPlanExamen(cmmN);
    if (cmmTiene(/\b(tarjeta|tarjetas|repasar|repaso|repasa)\b/)) return this.cmmPlanTarjetas(cmmN);
    if (cmmTiene(/\b(mide|medir|medicion|cuanto mide|longitud)\b/)) return this.cmmPlanMedir(cmmN);
    if (cmmTiene(/\b(corta|cortar|corte|secciona|seccion)\b/)) return this.cmmPlanCorte(cmmN, false);
    if (cmmTiene(/\b(junta|juntar|ensambla|ensamblar|une|cierra)\b/) && !cmmTiene(/\bseparar?\b/)) return this.cmmPlanSeparar(cmmN, true);
    if (cmmTiene(/\b(separa|separar|explota|explosion|expande|despieza|despiezar)\b/)) return this.cmmPlanSeparar(cmmN, false);
    if (cmmTiene(/\b(cuantos|cuantas|numero)\b/)) return this.cmmPlanContar(cmmN);
    if (cmmTiene(/\b(que es|explica|explicame|sirve|informacion|cuentame|dime)\b/)) return this.cmmPlanInformar(cmmN);
    if (cmmTiene(/\b(etiqueta|etiquetas)\b/)) return this.cmmPlanEtiquetas(cmmN);
    if (cmmTiene(/\b(gira|girar|rota|rotar|giro)\b/)) return this.cmmPlanGiro();
    if (cmmTiene(/\b(aisla|aislar|aislame|aisle)\b/)) return this.cmmPlanAislar(cmmN);
    if (cmmTiene(/\b(ocultame|oculta|ocultar|esconde|escondeme|esconder|apaga|quita|quitame|quitar|elimina)\b/)) return this.cmmPlanOcultar(cmmN);
    const cmmVista = this.cmmPlanVista(cmmN);
    if (cmmVista) return cmmVista;
    if (cmmTiene(/\b(donde|resalta|resaltar|senala|selecciona|localiza|encuentra|busca|ubica)\b/)) return this.cmmPlanLocalizar(cmmN);
    return this.cmmPlanMostrar(cmmN);
  }

  cmmVerbos() {
    return /^(ocultame|escondeme|quitame|muestra|muestrame|mostrar|ver|ensena|ensename|enseñame|abre|ponme|pon|aisla|aislar|aislame|oculta|ocultar|esconde|quita|quitar|elimina|apaga|donde|esta|queda|resalta|resaltar|senala|selecciona|localiza|encuentra|busca|ubica|dame|quiero|puedes|podrias|dime|explica|explicame|informacion|sobre|cuentame|mide|medir|medicion|corta|cortar|corte|secciona|seccion|separa|separar|explota|explosion|expande|despieza|junta|juntar|ensambla|une|cierra|cuantos|cuantas|numero|piezas|estructuras|examen|tarjetas|tarjeta|repasar|repaso|vista|cadapieza|altura|cuanto|longitud|distancia)$/;
  }

  cmmObjetivoDe(cmmN) {
    return this.cmmResolverObjetivo(this.cmmPalabrasDe(cmmN, this.cmmVerbos()));
  }

  cmmSeleccionarPiezas(cmmPiezas, cmmEnfocar, cmmGrupo) {
    const cmmIds = cmmPiezas.map((cmmP) => cmmP.cmmId);
    this.cmmEscena.cmmEstado.cmmAislar = false;
    this.cmmApi.cmmMostrarPiezasSeleccionadas(cmmPiezas);
    this.cmmEscena.cmmSeleccionar(cmmIds);
    this.cmmFijarFicha(cmmGrupo);
    if (cmmEnfocar) this.cmmEscena.cmmEnfocar(cmmIds, 800);
    this.cmmApi.cmmPintarDetalle();
  }

  cmmFijarFicha(cmmGrupo) {
    this.cmmEscena.cmmEstado.cmmFicha = cmmGrupo ? { cmmNombre: cmmGrupo.cmmNombre, cmmNombreEn: cmmGrupo.cmmNombreEn, cmmSistema: cmmGrupo.cmmSistema } : null;
  }

  cmmFijarSistemas(cmmIds) {
    this.cmmEscena.cmmEstado.cmmSistemas = new Set(cmmIds);
    this.cmmEscena.cmmEstado.cmmAislar = false;
    this.cmmEscena.cmmEstado.cmmSeleccion = new Set();
    this.cmmEscena.cmmEstado.cmmFicha = null;
    this.cmmApi.cmmAplicarFiltroSistemas();
    this.cmmApi.cmmPintarDetalle();
  }

  cmmFijarRegion(cmmRegion) {
    this.cmmEscena.cmmEstado.cmmRegion = cmmRegion;
    this.cmmEscena.cmmAplicar();
    this.cmmApi.cmmMarcarRegion();
    if (cmmRegion) this.cmmEscena.cmmEnfocarRegion(cmmRegion);
    else this.cmmEscena.cmmVistaFija('tres');
  }

  cmmPlanMostrar(cmmN) {
    const cmmObj = this.cmmObjetivoDe(cmmN);
    if (!cmmObj) return null;
    if (cmmObj.cmmTipo === 'estructura') {
      return {
        cmmEtiqueta: 'Mostrar: ' + cmmObj.cmmNombre,
        cmmEjecutar: () => {
          this.cmmSeleccionarPiezas(cmmObj.cmmPiezas, true, cmmObj.cmmGrupos[0]);
          return 'Te muestro ' + cmmObj.cmmNombre + ' (' + cmmObj.cmmPiezas.length + (cmmObj.cmmPiezas.length === 1 ? ' pieza' : ' piezas') + ').';
        }
      };
    }
    if (!cmmObj.cmmPiezas.length) return null;
    return {
      cmmEtiqueta: 'Mostrar solo: ' + cmmObj.cmmNombre,
      cmmEjecutar: () => {
        const cmmSistemas = cmmObj.cmmA.cmmSistemas.length ? cmmObj.cmmA.cmmSistemas : CMM_SISTEMAS_INICIALES;
        this.cmmFijarSistemas(cmmSistemas);
        const cmmCaso = cmmObj.cmmA.cmmRegiones.length || cmmObj.cmmA.cmmLado;
        if (cmmCaso) {
          this.cmmFijarRegion({ cmmId: 'personal', cmmNombre: cmmObj.cmmNombre, cmmContiene: cmmObj.cmmCoincide });
        } else {
          this.cmmFijarRegion(null);
        }
        return 'Muestro ' + cmmObj.cmmNombre + ': ' + cmmObj.cmmPiezas.length + ' piezas.';
      }
    };
  }

  cmmPlanAislar(cmmN) {
    const cmmObj = this.cmmObjetivoDe(cmmN);
    if (!cmmObj || !cmmObj.cmmPiezas.length) return null;
    return {
      cmmEtiqueta: 'Aislar: ' + cmmObj.cmmNombre,
      cmmEjecutar: () => {
        const cmmIds = cmmObj.cmmPiezas.map((cmmP) => cmmP.cmmId);
        this.cmmApi.cmmMostrarPiezasSeleccionadas(cmmObj.cmmPiezas);
        this.cmmEscena.cmmSeleccionar(cmmIds);
        this.cmmFijarFicha(cmmObj.cmmTipo === 'estructura' ? cmmObj.cmmGrupos[0] : null);
        this.cmmEscena.cmmEstado.cmmAislar = true;
        this.cmmEscena.cmmAplicar();
        this.cmmEscena.cmmEnfocar(cmmIds, 800);
        this.cmmApi.cmmPintarDetalle();
        return 'Aislé ' + cmmObj.cmmNombre + '. Pulsa «Mostrar el resto del cuerpo» o «Reiniciar todo» para volver.';
      }
    };
  }

  cmmPlanLocalizar(cmmN) {
    const cmmObj = this.cmmObjetivoDe(cmmN);
    if (!cmmObj || !cmmObj.cmmPiezas.length) return null;
    return {
      cmmEtiqueta: 'Localizar: ' + cmmObj.cmmNombre,
      cmmEjecutar: () => {
        this.cmmSeleccionarPiezas(cmmObj.cmmPiezas, true, cmmObj.cmmTipo === 'estructura' ? cmmObj.cmmGrupos[0] : null);
        const cmmPrimera = this.cmmReferenciaDe(cmmObj);
        return cmmObj.cmmNombre + ' está en ' + cmmUbicacion(cmmPrimera).toLowerCase() + '.';
      }
    };
  }

  cmmReferenciaDe(cmmObj) {
    const cmmCaja = new cmmTres.Box3();
    for (const cmmP of cmmObj.cmmPiezas) cmmCaja.union(cmmP.cmmCaja);
    return { cmmCentro: cmmCaja.getCenter(new cmmTres.Vector3()) };
  }

  cmmPlanOcultar(cmmN) {
    const cmmObj = this.cmmObjetivoDe(cmmN);
    if (!cmmObj) return null;
    const cmmSistemas = cmmObj.cmmTipo === 'coleccion' ? cmmObj.cmmA.cmmSistemas : [];
    if (!cmmSistemas.length) {
      return { cmmEtiqueta: 'Ocultar: ' + cmmObj.cmmNombre, cmmEjecutar: () => 'Solo puedo ocultar sistemas completos, por ejemplo «oculta los músculos». Para una estructura usa «aísla».' };
    }
    return {
      cmmEtiqueta: 'Ocultar: ' + cmmSistemas.map((cmmId) => CMM_ETIQUETAS_SISTEMA.get(cmmId)).join(' y '),
      cmmEjecutar: () => {
        const cmmRestantes = Array.from(this.cmmEscena.cmmEstado.cmmSistemas).filter((cmmId) => !cmmSistemas.includes(cmmId));
        this.cmmFijarSistemas(cmmRestantes);
        return 'Oculté ' + cmmSistemas.map((cmmId) => CMM_ETIQUETAS_SISTEMA.get(cmmId).toLowerCase()).join(' y ') + '.';
      }
    };
  }

  cmmPlanVista(cmmN) {
    const cmmMapa = [
      [/\b(frente|frontal|delante|anterior)\b/, 'frente', 'frontal'],
      [/\b(lado|lateral|perfil)\b/, 'lado', 'lateral'],
      [/\b(espalda|posterior|atras|trasera)\b/, 'espalda', 'posterior'],
      [/\b(tresc|3 4)\b/, 'tres', 'tres cuartos']
    ];
    if (!/\b(vista|mira|miralo|ponlo|de frente|de lado|de espalda|tresc)\b/.test(cmmN) && !/^(frente|lado|espalda|frontal|lateral|posterior)$/.test(cmmN)) return null;
    for (const [cmmEr, cmmId, cmmNombre] of cmmMapa) {
      if (cmmEr.test(cmmN)) {
        return {
          cmmEtiqueta: 'Vista ' + cmmNombre,
          cmmEjecutar: () => {
            this.cmmApi.cmmFijarVista(cmmId);
            return 'Vista ' + cmmNombre + '.';
          }
        };
      }
    }
    return null;
  }

  cmmPlanRayos(cmmN) {
    const cmmApagar = /\b(quita|quitar|apaga|desactiva|sin)\b/.test(cmmN);
    return {
      cmmEtiqueta: cmmApagar ? 'Desactivar rayos X' : 'Activar rayos X',
      cmmEjecutar: () => {
        const cmmCaja = document.getElementById('cmm-rx-activo');
        cmmCaja.checked = !cmmApagar;
        cmmCaja.dispatchEvent(new Event('change', { bubbles: true }));
        return cmmApagar ? 'Rayos X desactivados.' : 'Rayos X activados: huesos y músculos se vuelven transparentes.';
      }
    };
  }

  cmmPlanEtiquetas(cmmN) {
    const cmmApagar = /\b(quita|quitar|apaga|oculta|ocultar|desactiva|sin)\b/.test(cmmN);
    return {
      cmmEtiqueta: cmmApagar ? 'Ocultar etiquetas' : 'Mostrar etiquetas',
      cmmEjecutar: () => {
        const cmmCaja = document.getElementById('cmm-et-activo');
        cmmCaja.checked = !cmmApagar;
        cmmCaja.dispatchEvent(new Event('change', { bubbles: true }));
        return cmmApagar ? 'Etiquetas ocultas.' : 'Etiquetas flotantes activadas.';
      }
    };
  }

  cmmPlanGiro() {
    return {
      cmmEtiqueta: 'Alternar giro automático',
      cmmEjecutar: () => {
        document.getElementById('cmm-giro').click();
        return 'Giro automático alternado.';
      }
    };
  }

  cmmPlanReiniciar() {
    return {
      cmmEtiqueta: 'Reiniciar todo',
      cmmEjecutar: () => {
        this.cmmApi.cmmReiniciarTodo();
        return 'Todo vuelve al estado inicial.';
      }
    };
  }

  cmmPlanDeseleccionar() {
    return {
      cmmEtiqueta: 'Quitar selección',
      cmmEjecutar: () => {
        this.cmmEscena.cmmEstado.cmmAislar = false;
        this.cmmEscena.cmmSeleccionar([]);
        this.cmmApi.cmmPintarDetalle();
        return 'Selección quitada.';
      }
    };
  }

  cmmPlanLimpiarMedicion() {
    return {
      cmmEtiqueta: 'Quitar medición',
      cmmEjecutar: () => {
        this.cmmEscena.cmmLimpiarMedicion();
        return 'Medición borrada.';
      }
    };
  }

  cmmPorcentaje(cmmN) {
    const cmmCoincidencia = cmmN.match(/(\d{1,3})\s*%?/);
    if (!cmmCoincidencia) return null;
    if (!/%/.test(cmmN) && !/\b(al|a|en)\s+\d{1,3}\b/.test(cmmN)) return null;
    return Math.min(Math.max(Number(cmmCoincidencia[1]), 0), 100);
  }

  cmmPlanSeparar(cmmN, cmmJuntar) {
    const cmmObj = this.cmmObjetivoDe(cmmN);
    const cmmSistema = cmmObj && cmmObj.cmmTipo === 'coleccion' && cmmObj.cmmA.cmmSistemas.length === 1 ? cmmObj.cmmA.cmmSistemas[0] : 'todo';
    const cmmNombreSistema = cmmSistema === 'todo' ? 'todo el cuerpo' : CMM_ETIQUETAS_SISTEMA.get(cmmSistema).toLowerCase();
    let cmmValor = cmmJuntar ? 0 : this.cmmPorcentaje(cmmN);
    if (cmmValor === null) cmmValor = /\bcadapieza\b|\bcompleto\b|\btotal\b/.test(cmmN) ? 100 : 50;
    return {
      cmmEtiqueta: cmmJuntar ? 'Ensamblar ' + cmmNombreSistema : 'Separar ' + cmmNombreSistema + ' al ' + cmmValor + ' %',
      cmmEjecutar: () => {
        this.cmmApi.cmmFijarExplosion(cmmSistema, cmmValor);
        return cmmJuntar ? 'Anatomía ensamblada.' : 'Separé ' + cmmNombreSistema + ' al ' + cmmValor + ' %. Con 100 % cada pieza queda ordenada en una lámina.';
      }
    };
  }

  cmmPlanCorte(cmmN, cmmQuitar) {
    if (cmmQuitar) {
      return {
        cmmEtiqueta: 'Quitar corte',
        cmmEjecutar: () => {
          this.cmmAplicarCorteDom('ninguno', 50);
          return 'Corte quitado.';
        }
      };
    }
    let cmmEje = null;
    for (const [cmmNombre, cmmSinonimos] of Object.entries(CMM_EJES_CORTE)) {
      if (cmmSinonimos.some((cmmS) => new RegExp('\\b' + cmmS + '\\b').test(cmmN))) cmmEje = cmmNombre;
    }
    const cmmPorcentaje = this.cmmPorcentaje(cmmN);
    const cmmPartes = cmmN.split(/\b(?:altura|nivel|por|en)\b/);
    let cmmValor = cmmPorcentaje;
    let cmmDescripcion = '';
    if (cmmValor === null && cmmPartes.length > 1) {
      const cmmReferencia = cmmPartes.slice(1).join(' ').split(' ').filter((cmmW) => cmmW && !CMM_RELLENO.has(cmmW));
      const cmmAltura = cmmReferencia.find((cmmW) => CMM_REFERENCIAS_ALTURA[cmmW] !== undefined);
      if (cmmAltura) {
        cmmEje = cmmEje || 'transversal';
        cmmValor = this.cmmEscena.cmmValorCorte('transversal', CMM_REFERENCIAS_ALTURA[cmmAltura]) * 100;
        cmmDescripcion = 'a la altura de ' + cmmAltura + ' (aproximada)';
      } else if (cmmReferencia.length) {
        const cmmGrupos = this.cmmBuscarEstructura(cmmReferencia);
        if (cmmGrupos.length) {
          const cmmCaja = new cmmTres.Box3();
          for (const cmmG of cmmGrupos) for (const cmmP of cmmG.cmmPiezas) cmmCaja.union(cmmP.cmmCaja);
          const cmmCentro = cmmCaja.getCenter(new cmmTres.Vector3());
          cmmEje = cmmEje || 'transversal';
          const cmmCoordenada = cmmEje === 'transversal' ? cmmCentro.y : cmmEje === 'sagital' ? cmmCentro.x : cmmCentro.z;
          cmmValor = this.cmmEscena.cmmValorCorte(cmmEje, cmmCoordenada) * 100;
          cmmDescripcion = 'a la altura de ' + cmmGrupos[0].cmmNombre.toLowerCase();
        }
      }
    }
    if (cmmValor === null) {
      cmmEje = cmmEje || 'coronal';
      cmmValor = 50;
      cmmDescripcion = 'por la mitad';
    }
    cmmEje = cmmEje || 'transversal';
    const cmmValorFinal = Math.round(Math.min(Math.max(cmmValor, 0), 100));
    return {
      cmmEtiqueta: 'Corte ' + cmmEje + ' ' + (cmmDescripcion || 'al ' + cmmValorFinal + ' %'),
      cmmEjecutar: () => {
        this.cmmAplicarCorteDom(cmmEje, cmmValorFinal);
        const cmmLado = cmmEje === 'transversal' ? 'Quedan las piezas por debajo del plano.' : cmmEje === 'sagital' ? 'Quedan las piezas del lado derecho del plano.' : 'Quedan las piezas de atrás; mira de frente para ver el interior.';
        return 'Corte ' + cmmEje + ' ' + cmmDescripcion + '. ' + cmmLado;
      }
    };
  }

  cmmAplicarCorteDom(cmmEje, cmmValor) {
    const cmmSelector = document.getElementById('cmm-corte-eje');
    cmmSelector.value = cmmEje;
    cmmSelector.dispatchEvent(new Event('change', { bubbles: true }));
    if (cmmEje === 'ninguno') return;
    const cmmDeslizador = document.getElementById('cmm-corte-posicion');
    cmmDeslizador.value = cmmValor;
    cmmDeslizador.dispatchEvent(new Event('input', { bubbles: true }));
    if (cmmEje === 'coronal') this.cmmEscena.cmmVistaFija('frente');
  }

  cmmDimensionesDe(cmmPiezas) {
    const cmmCaja = new cmmTres.Box3();
    for (const cmmP of cmmPiezas) cmmCaja.union(cmmP.cmmCaja);
    const cmmTam = cmmCaja.getSize(new cmmTres.Vector3());
    const cmmCentro = cmmCaja.getCenter(new cmmTres.Vector3());
    const cmmEje = cmmTam.x >= cmmTam.y && cmmTam.x >= cmmTam.z ? 'x' : cmmTam.y >= cmmTam.z ? 'y' : 'z';
    return { cmmCaja, cmmTam, cmmCentro, cmmEje, cmmLargo: cmmTam[cmmEje] };
  }

  cmmPlanMedir(cmmN) {
    const cmmPartes = cmmN.split(/\s(?:a|al|hasta|y|con|entre)\s/).map((cmmX) => cmmX.trim()).filter(Boolean);
    const cmmObjetos = cmmPartes.map((cmmX) => this.cmmObjetivoDe(cmmX)).filter((cmmO) => cmmO && cmmO.cmmPiezas.length);
    if (cmmObjetos.length >= 2) {
      const cmmA = this.cmmDimensionesDe(cmmObjetos[0].cmmPiezas);
      const cmmB = this.cmmDimensionesDe(cmmObjetos[1].cmmPiezas);
      const cmmDistancia = cmmA.cmmCentro.distanceTo(cmmB.cmmCentro);
      return {
        cmmEtiqueta: 'Medir: ' + cmmObjetos[0].cmmNombre + ' → ' + cmmObjetos[1].cmmNombre,
        cmmEjecutar: () => {
          this.cmmEscena.cmmLimpiarMedicion();
          this.cmmEscena.cmmAgregarPuntoMedicion(cmmA.cmmCentro.clone());
          this.cmmEscena.cmmAgregarPuntoMedicion(cmmB.cmmCentro.clone());
          return 'Entre los centros de ' + cmmObjetos[0].cmmNombre + ' y ' + cmmObjetos[1].cmmNombre + ' hay ' + cmmFormatoLongitud(cmmDistancia) + '.';
        }
      };
    }
    if (!cmmObjetos.length) return null;
    if (cmmPartes.length >= 2) {
      return {
        cmmEtiqueta: 'Medir entre dos estructuras',
        cmmEjecutar: () => 'Solo encontré una de las dos estructuras. Prueba con nombres anatómicos, por ejemplo «mide del húmero al radio».'
      };
    }
    const cmmObj = cmmObjetos[0];
    return {
      cmmEtiqueta: 'Medir: ' + cmmObj.cmmNombre,
      cmmEjecutar: () => {
        const cmmLineas = [];
        this.cmmEscena.cmmLimpiarMedicion();
        const cmmUnidades = cmmObj.cmmTipo === 'estructura' ? cmmObj.cmmGrupos.map((cmmG) => ({ cmmNombre: cmmG.cmmNombre, cmmPiezas: cmmG.cmmPiezas })) : [{ cmmNombre: cmmObj.cmmNombre, cmmPiezas: cmmObj.cmmPiezas }];
        for (const cmmU of cmmUnidades) {
          const cmmD = this.cmmDimensionesDe(cmmU.cmmPiezas);
          cmmLineas.push(cmmU.cmmNombre + ': ' + cmmFormatoLongitud(cmmD.cmmLargo) + ' de largo');
        }
        const cmmPrimera = this.cmmDimensionesDe(cmmUnidades[0].cmmPiezas);
        const cmmInicio = cmmPrimera.cmmCentro.clone();
        const cmmFin = cmmPrimera.cmmCentro.clone();
        cmmInicio[cmmPrimera.cmmEje] -= cmmPrimera.cmmLargo / 2;
        cmmFin[cmmPrimera.cmmEje] += cmmPrimera.cmmLargo / 2;
        this.cmmEscena.cmmAgregarPuntoMedicion(cmmInicio);
        this.cmmEscena.cmmAgregarPuntoMedicion(cmmFin);
        this.cmmSeleccionarPiezas(cmmObj.cmmPiezas, true);
        return cmmLineas.join(' · ') + '. Medida aproximada sobre el eje mayor de la estructura.';
      }
    };
  }

  cmmPlanContar(cmmN) {
    const cmmObj = this.cmmObjetivoDe(cmmN);
    if (!cmmObj) return null;
    return {
      cmmEtiqueta: 'Contar: ' + cmmObj.cmmNombre,
      cmmEjecutar: () => {
        const cmmNombres = new Set(cmmObj.cmmPiezas.map((cmmP) => cmmP.cmmNombreEn));
        return cmmObj.cmmNombre + ' tiene ' + cmmObj.cmmPiezas.length + ' piezas modeladas, agrupadas en ' + cmmNombres.size + ' estructuras con nombre.';
      }
    };
  }

  cmmPlanInformar(cmmN) {
    const cmmObj = this.cmmObjetivoDe(cmmN);
    if (!cmmObj || !cmmObj.cmmPiezas.length) return null;
    return {
      cmmEtiqueta: 'Explicar: ' + cmmObj.cmmNombre,
      cmmEjecutar: () => {
        const cmmGrupo = cmmObj.cmmTipo === 'estructura' ? cmmObj.cmmGrupos[0] : null;
        const cmmSistema = CMM_SISTEMAS.find((cmmS) => cmmS.cmmId === (cmmGrupo ? cmmGrupo.cmmSistema : cmmObj.cmmPiezas[0].cmmSistema));
        if (cmmObj.cmmTipo === 'estructura') {
          this.cmmSeleccionarPiezas(cmmObj.cmmPiezas, true, cmmGrupo);
          return cmmGrupo.cmmNombre + ' (' + cmmGrupo.cmmNombreEn + '). Pertenece al sistema ' + cmmSistema.cmmNombre.toLowerCase() + ' y está en ' + cmmUbicacion(this.cmmReferenciaDe(cmmObj)).toLowerCase() + '. ' + cmmSistema.cmmFuncion;
        }
        const cmmSis = cmmObj.cmmA.cmmSistemas.length === 1 ? CMM_SISTEMAS.find((cmmS) => cmmS.cmmId === cmmObj.cmmA.cmmSistemas[0]) : null;
        return cmmSis ? cmmSis.cmmNombre + ': ' + cmmSis.cmmFuncion : 'Esa región agrupa ' + cmmObj.cmmPiezas.length + ' piezas modeladas.';
      }
    };
  }

  cmmCategoriaDe(cmmN) {
    const cmmPalabras = cmmN.split(' ');
    return CMM_CATEGORIAS_ESTUDIO.find((cmmC) => cmmC.cmmPalabras.some((cmmW) => cmmPalabras.includes(cmmW)));
  }

  cmmPlanExamen(cmmN) {
    const cmmCategoria = this.cmmCategoriaDe(cmmN);
    const cmmModo = /\b(encuentra|buscar|busca|localiza|encontrar)\b/.test(cmmN) ? 'encontrar' : 'nombrar';
    const cmmTotal = (cmmN.match(/\b(5|10|20)\b/) || [null, '10'])[1];
    return {
      cmmEtiqueta: 'Examen de ' + (cmmCategoria ? cmmCategoria.cmmExamen : 'todo') + ' (' + cmmTotal + ' preguntas)',
      cmmEjecutar: () => {
        document.getElementById('cmm-exa-modo').value = cmmModo;
        document.getElementById('cmm-exa-categoria').value = cmmCategoria ? cmmCategoria.cmmExamen : 'todo';
        document.getElementById('cmm-exa-total').value = cmmTotal;
        document.getElementById('cmm-exa-iniciar').click();
        return 'Comenzó el examen.';
      }
    };
  }

  cmmPlanTarjetas(cmmN) {
    const cmmCategoria = this.cmmCategoriaDe(cmmN);
    const cmmMazo = /(hoy|pendiente|toca|vencid)/.test(cmmN) ? 'hoy' : /(confund|dificil|falle|fallo)/.test(cmmN) ? 'confusas' : cmmCategoria ? cmmCategoria.cmmMazo : 'todo';
    return {
      cmmEtiqueta: 'Tarjetas de estudio: ' + cmmMazo,
      cmmEjecutar: () => {
        document.getElementById('cmm-tar-mazo').value = cmmMazo;
        document.getElementById('cmm-tar-iniciar').click();
        return 'Abrí las tarjetas.';
      }
    };
  }
}
