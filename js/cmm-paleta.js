import { CMMComandos, CMM_EJEMPLOS_COMANDO } from './cmm-comandos.js';

const CMM_ESTILOS_PALETA = `
.cmm-paleta { position: fixed; inset: 0; z-index: 40; display: flex; justify-content: center; align-items: flex-start; padding-top: 13vh; background: rgb(15 23 42 / 34%); backdrop-filter: blur(3px); }
.cmm-paleta.cmm-oculto { display: none; }
.cmm-paleta-caja { width: min(660px, 92vw); padding: 0; overflow: hidden; border-radius: 16px; box-shadow: 0 24px 70px rgb(15 23 42 / 30%); }
.cmm-paleta-campo { display: flex; align-items: center; gap: 12px; padding: 16px 18px; border-bottom: 1px solid var(--cmm-linea, #dde3e7); }
.cmm-paleta-campo span { font-size: 18px; opacity: .6; }
.cmm-paleta-campo input { flex: 1; border: 0; outline: 0; background: transparent; font-size: 17px; color: inherit; }
.cmm-paleta-vista { min-height: 22px; padding: 10px 20px 0; font-size: 12.5px; color: var(--cmm-suave, #5d6b75); }
.cmm-paleta-vista strong { color: var(--cmm-acento, #1f3a5f); }
.cmm-paleta-respuesta { margin: 8px 18px 4px; padding: 11px 14px; border-radius: 11px; background: #f3f6f9; font-size: 13.5px; line-height: 1.5; }
.cmm-paleta-respuesta.cmm-error { background: #fdf1f1; color: #8a2f2f; }
.cmm-paleta-ejemplos { display: flex; flex-wrap: wrap; gap: 7px; padding: 12px 18px 6px; }
.cmm-paleta-ejemplos button { padding: 6px 11px; border-radius: 999px; border: 1px solid var(--cmm-linea, #dde3e7); background: #fff; font-size: 12.5px; cursor: pointer; }
.cmm-paleta-ejemplos button:hover { background: #eef3f8; }
.cmm-paleta-pie { display: flex; justify-content: space-between; padding: 10px 20px 14px; font-size: 11.5px; color: var(--cmm-suave, #5d6b75); }
#cmm-paleta-abrir { position: absolute; top: calc(var(--cmm-margen, 20px) + 56px); right: var(--cmm-margen, 20px); z-index: 7; display: flex; align-items: center; gap: 8px; padding: 8px 13px; font-weight: 650; font-size: 12.5px; cursor: pointer; }
#cmm-paleta-abrir kbd { padding: 2px 6px; border-radius: 6px; border: 1px solid var(--cmm-linea, #dde3e7); background: #f6f8fa; font: inherit; font-size: 11px; font-weight: 600; }
`;

export class CMMPaleta {
  constructor(cmmEscena, cmmApi) {
    this.cmmComandos = new CMMComandos(cmmEscena, cmmApi);
    this.cmmHistorial = [];
    this.cmmPosicionHistorial = 0;
    this.cmmPlan = null;
    this.cmmConstruir();
    this.cmmEnlazar();
  }

  cmmConstruir() {
    const cmmEstilo = document.createElement('style');
    cmmEstilo.textContent = CMM_ESTILOS_PALETA;
    document.head.appendChild(cmmEstilo);

    this.cmmBoton = document.createElement('button');
    this.cmmBoton.id = 'cmm-paleta-abrir';
    this.cmmBoton.className = 'cmm-panel';
    this.cmmBoton.title = 'Escribe una orden en español';
    this.cmmBoton.innerHTML = '<span aria-hidden="true">✦</span> Preguntar <kbd>Ctrl K</kbd>';
    document.getElementById('cmm-raiz').appendChild(this.cmmBoton);

    this.cmmCapa = document.createElement('div');
    this.cmmCapa.className = 'cmm-paleta cmm-oculto';
    this.cmmCapa.innerHTML = `<div class="cmm-panel cmm-paleta-caja" role="dialog" aria-label="Órdenes en español">
      <div class="cmm-paleta-campo"><span aria-hidden="true">✦</span><input type="text" id="cmm-paleta-entrada" placeholder="Pídele algo al atlas: «aísla el hígado», «corta a la altura del corazón»…" autocomplete="off" spellcheck="false"></div>
      <div class="cmm-paleta-vista" id="cmm-paleta-vista"></div>
      <div class="cmm-paleta-respuesta" id="cmm-paleta-respuesta" hidden></div>
      <div class="cmm-paleta-ejemplos" id="cmm-paleta-ejemplos"></div>
      <div class="cmm-paleta-pie"><span>Enter ejecuta · Esc cierra · ↑ ↓ historial</span><span>Funciona sin internet</span></div>
    </div>`;
    document.getElementById('cmm-raiz').appendChild(this.cmmCapa);
    this.cmmEntrada = this.cmmCapa.querySelector('#cmm-paleta-entrada');
    this.cmmVista = this.cmmCapa.querySelector('#cmm-paleta-vista');
    this.cmmRespuesta = this.cmmCapa.querySelector('#cmm-paleta-respuesta');
    const cmmEjemplos = this.cmmCapa.querySelector('#cmm-paleta-ejemplos');
    for (const cmmTexto of CMM_EJEMPLOS_COMANDO) {
      const cmmB = document.createElement('button');
      cmmB.type = 'button';
      cmmB.textContent = cmmTexto;
      cmmB.addEventListener('click', () => {
        this.cmmEntrada.value = cmmTexto;
        this.cmmPrevisualizar();
        this.cmmEjecutar();
      });
      cmmEjemplos.appendChild(cmmB);
    }
  }

  cmmEnlazar() {
    this.cmmBoton.addEventListener('click', () => this.cmmAbrir());
    this.cmmCapa.addEventListener('mousedown', (cmmEv) => {
      if (cmmEv.target === this.cmmCapa) this.cmmCerrar();
    });
    this.cmmEntrada.addEventListener('input', () => this.cmmPrevisualizar());
    this.cmmEntrada.addEventListener('keydown', (cmmEv) => {
      if (cmmEv.key === 'Enter') {
        cmmEv.preventDefault();
        this.cmmEjecutar();
      } else if (cmmEv.key === 'Escape') {
        cmmEv.stopPropagation();
        this.cmmCerrar();
      } else if (cmmEv.key === 'ArrowUp' || cmmEv.key === 'ArrowDown') {
        cmmEv.preventDefault();
        this.cmmNavegarHistorial(cmmEv.key === 'ArrowUp' ? -1 : 1);
      }
    });
    document.addEventListener('keydown', (cmmEv) => {
      if ((cmmEv.ctrlKey || cmmEv.metaKey) && cmmEv.key.toLowerCase() === 'k') {
        cmmEv.preventDefault();
        if (this.cmmCapa.classList.contains('cmm-oculto')) this.cmmAbrir();
        else this.cmmCerrar();
      }
    });
  }

  cmmAbrir() {
    if (this.cmmBoton.disabled || document.querySelector('dialog[open]')) return;
    this.cmmCapa.classList.remove('cmm-oculto');
    this.cmmEntrada.focus();
    this.cmmEntrada.select();
  }

  cmmCerrar() {
    if (this.cmmCapa.classList.contains('cmm-oculto')) return;
    this.cmmCapa.classList.add('cmm-oculto');
    if (!this.cmmBoton.disabled) this.cmmBoton.focus();
  }

  cmmPrevisualizar() {
    const cmmTexto = this.cmmEntrada.value.trim();
    this.cmmPlan = cmmTexto ? this.cmmComandos.cmmInterpretar(cmmTexto) : null;
    if (!cmmTexto) {
      this.cmmVista.textContent = '';
    } else if (this.cmmPlan) {
      this.cmmVista.innerHTML = 'Entendí: <strong></strong>';
      this.cmmVista.querySelector('strong').textContent = this.cmmPlan.cmmEtiqueta;
    } else {
      this.cmmVista.textContent = 'Sigo escuchando…';
    }
  }

  cmmMostrarRespuesta(cmmTexto, cmmError) {
    this.cmmRespuesta.hidden = false;
    this.cmmRespuesta.classList.toggle('cmm-error', Boolean(cmmError));
    this.cmmRespuesta.textContent = cmmTexto;
  }

  cmmEjecutar() {
    const cmmTexto = this.cmmEntrada.value.trim();
    if (!cmmTexto) return;
    this.cmmPrevisualizar();
    if (!this.cmmPlan) {
      this.cmmMostrarRespuesta('No entendí esa orden. Prueba con «aísla el fémur», «muestra solo los órganos», «corta por la mitad» o «mide el húmero».', true);
      return;
    }
    const cmmRespuesta = this.cmmPlan.cmmEjecutar();
    this.cmmHistorial.push(cmmTexto);
    this.cmmPosicionHistorial = this.cmmHistorial.length;
    this.cmmMostrarRespuesta(cmmRespuesta, false);
    if (!this.cmmBoton.disabled) this.cmmEntrada.select();
  }

  cmmNavegarHistorial(cmmPaso) {
    if (!this.cmmHistorial.length) return;
    this.cmmPosicionHistorial = Math.min(Math.max(this.cmmPosicionHistorial + cmmPaso, 0), this.cmmHistorial.length);
    this.cmmEntrada.value = this.cmmHistorial[this.cmmPosicionHistorial] || '';
    this.cmmPrevisualizar();
  }
}
