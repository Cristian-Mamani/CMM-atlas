import cmmPrueba from 'node:test';
import cmmAfirmar from 'node:assert/strict';
import { CMM_CAPITULOS_BUILDER, cmmDesafioDiario, cmmEstadoCampana, cmmEstadosRegiones, cmmLogrosBuilder, cmmRachaDiaria } from '../js/cmm-builder-campana.js';
import { CMM_CATALOGO_MISIONES } from '../js/cmm-builder-catalogo.js';
import { CMMProgreso } from '../js/cmm-progreso.js';
import { cmmSimularAlmacenamiento } from './cmm-almacenamiento-prueba.js';

cmmPrueba('campaña sin ciclos con una etapa inicial y progreso derivado del historial existente', () => {
  const cmmHistorial = [{ cmmId: 'pelvis', cmmPractica: true }];
  const cmmAbiertas = () => cmmEstadoCampana(cmmHistorial, CMM_CATALOGO_MISIONES).flatMap((cmmC) => cmmC.cmmEtapas).filter((cmmE) => !cmmE.cmmBloqueada).map((cmmE) => cmmE.cmmId);
  cmmAfirmar.deepEqual(cmmAbiertas(), ['pelvis']);
  const cmmEtapas = CMM_CAPITULOS_BUILDER.flatMap((cmmC) => cmmC.cmmEtapas ?? []);
  for (const cmmEtapa of cmmEtapas) {
    cmmAfirmar(cmmAbiertas().includes(cmmEtapa.cmmId));
    cmmHistorial.push({ cmmId: cmmEtapa.cmmId, cmmModo: 'clasico' });
  }
  cmmAfirmar.equal(cmmEstadosRegiones(cmmEstadoCampana(cmmHistorial, CMM_CATALOGO_MISIONES)).every((cmmR) => cmmR.cmmEstado === 'Dominada'), true);
});

cmmPrueba('desafío diario local estable por fecha y catálogo con racha sin duplicados', () => {
  const cmmDia = '2026-11-24';
  const cmmFicha = cmmDesafioDiario(CMM_CATALOGO_MISIONES, cmmDia);
  cmmAfirmar.deepEqual(cmmFicha, cmmDesafioDiario([...CMM_CATALOGO_MISIONES].reverse(), cmmDia));
  cmmAfirmar.notEqual(cmmFicha.cmmSemilla, cmmDesafioDiario(CMM_CATALOGO_MISIONES, '2026-11-23').cmmSemilla);
  const cmmPartidas = [{ cmmDia }, { cmmDia }, { cmmDia: '2026-11-23' }, { cmmDia: '2026-11-22', cmmPractica: true }];
  cmmAfirmar.equal(cmmRachaDiaria(cmmPartidas, new Date(2026, 10, 24)), 2);
  cmmAfirmar.equal(cmmRachaDiaria(cmmPartidas, new Date(2026, 10, 26)), 0);
});

cmmPrueba('los logros requieren las acciones concretas y excluyen las sesiones de repaso de fallos', () => {
  const cmmPerfecta = { cmmId: 'craneo', cmmNivel: 3, cmmErrores: 0, cmmPistas: 0, cmmPrecision: 100 };
  cmmAfirmar.deepEqual(cmmLogrosBuilder([{ ...cmmPerfecta, cmmPractica: true }]), []);
  cmmAfirmar.deepEqual(cmmLogrosBuilder([{ cmmModo: 'cmm-examen-practico', cmmPistas: 0, cmmCompletado: false }]), []);
  cmmAfirmar.deepEqual(cmmLogrosBuilder([cmmPerfecta]), ['Primer ensamblaje', 'Sin pistas', 'Reconstrucción perfecta', 'Maestro del cráneo']);
  cmmAfirmar.deepEqual(cmmLogrosBuilder([{ cmmId: 'cmm-coxales-espejo', cmmModo: 'cmm-espejo', cmmPistas: 0, cmmErrores: 0 }]), ['Primer ensamblaje', 'Sin pistas', 'Dominio de lateralidad']);
});

cmmPrueba('el Builder conserva las cajas antiguas y registra intentos, aciertos y repaso compartido', (cmmContexto) => {
  cmmSimularAlmacenamiento(cmmContexto);
  const cmmProgreso = new CMMProgreso();
  const cmmClave = 'Right hip bone';
  const cmmSinPracticar = 'Left hip bone';
  cmmProgreso.cmmRelojPrueba = 1000;
  cmmAfirmar.equal(cmmProgreso.cmmDominioBuilder(cmmClave), 'no estudiada');
  cmmProgreso.cmmRegistrarBuilder([{ cmmClave, cmmCorrecta: false, cmmFallos: 0, cmmMedidas: { cmmIntentos: 1, cmmDistancia: 24, cmmAngulo: 30 } }]);
  cmmAfirmar.equal(cmmProgreso.cmmDominioBuilder(cmmClave), 'en aprendizaje');
  cmmAfirmar.equal(cmmProgreso.cmmDominioBuilder(cmmSinPracticar), 'no estudiada');
  cmmAfirmar.equal(cmmProgreso.cmmErrores(cmmClave), 0);
  for (let cmmN = 0; cmmN < 4; cmmN++) cmmProgreso.cmmRegistrarBuilder([{ cmmClave, cmmCorrecta: true, cmmFallos: 0, cmmMedidas: { cmmIntentos: 1, cmmDistancia: 0 } }]);
  const cmmRecarga = new CMMProgreso();
  cmmRecarga.cmmRelojPrueba = 1000;
  cmmAfirmar.equal(cmmRecarga.cmmDominioBuilder(cmmClave), 'dominada');
  cmmAfirmar.equal(cmmRecarga.cmmResumenBuilder([cmmClave, cmmClave]).cmmIntentos, 5);
  cmmAfirmar.equal(cmmRecarga.cmmResumenBuilder([cmmClave]).cmmMm, 4.8);
  cmmAfirmar.equal(cmmRecarga.cmmDatos[cmmClave].cmmBuilder.cmmAngulo, 30);
  cmmAfirmar(!Object.hasOwn(cmmRecarga.cmmResumenBuilder([cmmClave]), 'cmmGrados'));
  cmmRecarga.cmmRegistrarBuilder([{ cmmClave, cmmCorrecta: false, cmmFallos: 1, cmmMedidas: { cmmIntentos: 1 } }]);
  cmmRecarga.cmmRelojPrueba += 600001;
  cmmAfirmar.equal(cmmRecarga.cmmDominioBuilder(cmmClave), 'necesita repaso');
  cmmAfirmar.deepEqual(cmmRecarga.cmmVencidas(), [cmmClave]);
});
