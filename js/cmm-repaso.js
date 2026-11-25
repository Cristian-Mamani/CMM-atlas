const CMM_ESTILOS_REPASO = `
#cmm-repaso-hoy { position: absolute; bottom: 54px; left: calc(var(--cmm-margen, 20px) + 270px); z-index: 4; display: flex; align-items: center; gap: 8px; padding: 9px 13px; font-weight: 650; cursor: pointer; }
#cmm-repaso-hoy .cmm-repaso-cuenta { min-width: 22px; padding: 1px 7px; border-radius: 999px; background: #e8edf2; color: #425466; font-size: 12px; text-align: center; }
#cmm-repaso-hoy.cmm-repaso-pendiente .cmm-repaso-cuenta { background: #1f3a5f; color: #fff; }
.cmm-repaso-aviso { margin: 10px 0 0; font-size: 12px; color: #5d6b75; }
@media (max-width: 640px) { #cmm-repaso-hoy { bottom: 115px; left: var(--cmm-margen, 12px); margin-bottom: 44px; } }
`;

export class CMMRepaso {
  constructor(cmmProgreso, cmmClavesDisponibles) {
    this.cmmProgreso = cmmProgreso;
    this.cmmClavesDisponibles = cmmClavesDisponibles;
    this.cmmConstruir();
    this.cmmProgreso.cmmSuscribir(() => this.cmmActualizar());
    this.cmmActualizar();
    setInterval(() => this.cmmActualizar(), 60000);
  }

  cmmConstruir() {
    const cmmEstilo = document.createElement('style');
    cmmEstilo.textContent = CMM_ESTILOS_REPASO;
    document.head.appendChild(cmmEstilo);
    this.cmmBoton = document.createElement('button');
    this.cmmBoton.id = 'cmm-repaso-hoy';
    this.cmmBoton.className = 'cmm-panel';
    this.cmmBoton.innerHTML = '<span aria-hidden="true">◔</span> Repasar hoy <span class="cmm-repaso-cuenta">0</span>';
    this.cmmBoton.addEventListener('click', () => this.cmmIniciar());
    document.getElementById('cmm-raiz').appendChild(this.cmmBoton);
  }

  cmmIniciar() {
    const cmmMazo = document.getElementById('cmm-tar-mazo');
    cmmMazo.value = 'hoy';
    document.getElementById('cmm-tar-iniciar').click();
  }

  cmmFormatoProxima(cmmMarca) {
    if (cmmMarca === null) return '';
    const cmmMinutos = Math.max(Math.round((cmmMarca - this.cmmProgreso.cmmAhora()) / 60000), 1);
    if (cmmMinutos < 60) return 'Próximo repaso en ' + cmmMinutos + ' min.';
    const cmmHoras = Math.round(cmmMinutos / 60);
    if (cmmHoras < 48) return 'Próximo repaso en ' + cmmHoras + ' h.';
    return 'Próximo repaso en ' + Math.round(cmmHoras / 24) + ' días.';
  }

  cmmActualizar() {
    const cmmR = this.cmmProgreso.cmmResumenRepaso(this.cmmClavesDisponibles);
    this.cmmBoton.querySelector('.cmm-repaso-cuenta').textContent = cmmR.cmmHoy;
    this.cmmBoton.classList.toggle('cmm-repaso-pendiente', cmmR.cmmHoy > 0);
    const cmmLineas = [
      cmmR.cmmHoy > 0 ? 'Tienes ' + cmmR.cmmHoy + ' estructuras para repasar hoy.' : 'No tienes repasos vencidos. Puedes estudiar estructuras nuevas.',
      'En seguimiento: ' + cmmR.cmmSeguimiento + ' · Bien asentadas: ' + cmmR.cmmDominadas + '.'
    ];
    if (cmmR.cmmHoy === 0 && cmmR.cmmProxima !== null) cmmLineas.push(this.cmmFormatoProxima(cmmR.cmmProxima));
    this.cmmBoton.title = cmmLineas.join(' ');
  }
}
