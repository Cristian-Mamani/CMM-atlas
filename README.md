# Atlas Anatómico CMM

Aplicación de escritorio para explorar anatomía humana en 3D, identificar estructuras y reconstruir regiones con **Anatomy Builder**. Incluye 2.234 piezas modeladas, cortes anatómicos, medición, tarjetas y rompecabezas. El modelo representa un cuerpo adulto masculino y está destinado al estudio.

## Descargar y abrir en Windows

Descarga `Atlas-Anatomico-CMM-1.0.0-Windows-x64.exe` en **Releases**. Ábrelo en Windows 10 u 11 de 64 bits, con .NET Framework 4.8 y gráficos compatibles con WebGL 2. Node.js se usa para ejecutar el código fuente y compilar.

En el primer uso, el ejecutable prepara el programa en `%LOCALAPPDATA%\AtlasAnatomicoCMM\versiones` y abre el atlas. Las siguientes aperturas reutilizan los archivos preparados. El ejecutable funciona sin internet, se ejecuta con tu cuenta de Windows y carece de firma digital. Puedes comparar su huella SHA-256 con la publicada junto a la descarga.

## Ejecutar desde el código

Abre PowerShell en la carpeta que contiene `package.json`. Con Node.js 22 o posterior, ejecuta:

```powershell
npm ci
npm start
```

La instalación inicial de dependencias puede requerir internet. El atlas funciona localmente después de instalarlas.

## Usar el atlas

- Arrastra sobre el visor para girar la cámara y usa la rueda para acercarte. Selecciona una pieza o escribe su nombre en **Buscar estructura**.
- Abre **Herramientas** para usar cortes, etiquetas, estudio y vistas guardadas.
- En **Anatomy Builder**, abre **Aprender en una partida guiada** para practicar con la pelvis.
- En **Créditos**, usa **Exportar datos** para guardar una copia de los registros de estudio de este equipo. El editor docente permite intercambiar sus propias misiones en JSON.

## Pruebas y compilación

```powershell
node --test --test-reporter=tap pruebas/*.test.js pruebas/*.test.cjs
npm run dist
```

`npm run dist` usa el compilador de .NET Framework de Windows x64 y genera el ejecutable y su archivo `.sha256` en `salida/descargas/`. El código fuente se guarda en Git y el ejecutable se adjunta a la publicación `v1.0.0` en Releases.

## Créditos

Geometría de [BodyParts3D y DBCLS](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html), bajo [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Las traducciones al español son una adaptación educativa. three.js se distribuye bajo MIT. Consulta [los avisos de terceros](THIRD-PARTY-NOTICES.md).
