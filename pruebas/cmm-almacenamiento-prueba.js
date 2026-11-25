export function cmmSimularAlmacenamiento(cmmContexto) {
  const cmmAnterior = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const cmmValores = new Map();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (cmmClave) => cmmValores.get(String(cmmClave)) ?? null,
      setItem: (cmmClave, cmmValor) => cmmValores.set(String(cmmClave), String(cmmValor))
    }
  });
  cmmContexto.after(() => {
    if (cmmAnterior) Object.defineProperty(globalThis, 'localStorage', cmmAnterior);
    else delete globalThis.localStorage;
  });
  return cmmValores;
}
