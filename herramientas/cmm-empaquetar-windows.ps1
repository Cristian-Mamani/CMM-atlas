param([string] $CmmDestino)

$ErrorActionPreference = 'Stop'
function cmmCalcularHuella([string] $cmmArchivo) {
    $cmmLector = [IO.File]::OpenRead($cmmArchivo)
    $cmmAlgoritmo = [Security.Cryptography.SHA256]::Create()
    try { return [BitConverter]::ToString($cmmAlgoritmo.ComputeHash($cmmLector)).Replace('-', '').ToLowerInvariant() }
    finally { $cmmLector.Dispose(); $cmmAlgoritmo.Dispose() }
}

$cmmRaiz = Split-Path -Parent $PSScriptRoot
if (-not $CmmDestino) { $CmmDestino = Join-Path $cmmRaiz 'salida/descargas' }
$CmmDestino = [IO.Path]::GetFullPath($CmmDestino)
$cmmProyecto = Get-Content -LiteralPath (Join-Path $cmmRaiz 'package.json') -Raw | ConvertFrom-Json
$cmmCompilador = Join-Path $env:SystemRoot 'Microsoft.NET/Framework64/v4.0.30319/csc.exe'
$cmmConstructor = Join-Path $cmmRaiz 'node_modules/.bin/electron-builder.cmd'
if (-not (Test-Path -LiteralPath $cmmConstructor)) { throw 'Ejecuta npm ci primero.' }
if (-not (Test-Path -LiteralPath $cmmCompilador)) { throw 'Se requiere .NET Framework 4.8 en Windows x64.' }

$cmmTrabajo = Join-Path $cmmRaiz ('salida/cmm-compilacion-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Force -Path @($cmmTrabajo, $CmmDestino) | Out-Null
$cmmDist = Join-Path $cmmRaiz 'node_modules/electron/dist'
Push-Location -LiteralPath $cmmRaiz
try {
    & $cmmConstructor --win dir --x64 "-c.directories.output=$cmmTrabajo" "-c.electronDist=$cmmDist" '-c.win.signAndEditExecutable=false' '-c.npmRebuild=false'
    if ($LASTEXITCODE -ne 0) { throw "Electron no generó el paquete de carpeta ($LASTEXITCODE)." }
} finally {
    Pop-Location
}

Add-Type -AssemblyName System.IO.Compression.FileSystem
$cmmZip = Join-Path $cmmTrabajo 'cmm-aplicacion.zip'
[IO.Compression.ZipFile]::CreateFromDirectory((Join-Path $cmmTrabajo 'win-unpacked'), $cmmZip, [IO.Compression.CompressionLevel]::Optimal, $false)
$cmmHuella = cmmCalcularHuella $cmmZip
$cmmIdentidad = Join-Path $cmmTrabajo 'cmm-identidad.txt'
Set-Content -LiteralPath $cmmIdentidad -Encoding ascii -Value ($cmmProyecto.version + '-' + $cmmHuella.Substring(0, 16))
$cmmTemporal = Join-Path $cmmTrabajo 'cmm-lanzador.exe'
$cmmCodigo = Join-Path $PSScriptRoot 'cmm-distribucion.cs'
& $cmmCompilador '/nologo' '/target:winexe' '/platform:x64' '/optimize+' '/codepage:65001' "/out:$cmmTemporal" "/resource:$cmmZip,cmm-aplicacion" "/resource:$cmmIdentidad,cmm-identidad" '/reference:System.IO.Compression.dll' '/reference:System.IO.Compression.FileSystem.dll' '/reference:System.Windows.Forms.dll' $cmmCodigo
if ($LASTEXITCODE -ne 0) { throw "No se pudo generar el ejecutable de descarga ($LASTEXITCODE)." }

$cmmNombre = "Atlas-Anatomico-CMM-$($cmmProyecto.version)-Windows-x64.exe"
$cmmFinal = Join-Path $CmmDestino $cmmNombre
Copy-Item -LiteralPath $cmmTemporal -Destination $cmmFinal
$cmmSha = cmmCalcularHuella $cmmFinal
Set-Content -LiteralPath ($cmmFinal + '.sha256') -Encoding ascii -Value "$cmmSha  $cmmNombre"
Write-Output $cmmFinal
