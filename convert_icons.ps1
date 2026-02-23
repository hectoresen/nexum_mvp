# Script para generar todos los iconos necesarios para Tauri
# Usa ImageMagick para convertir SVG a PNG/ICO

$svgFile = "client\src-tauri\icons\app-icon.svg"
$iconDir = "client\src-tauri\icons"

# Buscar ejecutable de ImageMagick
$magickPaths = @(
    "C:\Program Files\ImageMagick-7.1.2-Q16\magick.exe",
    "C:\Program Files\ImageMagick*\magick.exe",
    "$env:ProgramFiles\ImageMagick*\magick.exe"
)

$magick = $null
foreach ($path in $magickPaths) {
    $found = Get-Item $path -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($found) {
        $magick = $found.FullName
        break
    }
}

if (-not $magick) {
    Write-Host "❌ Error: No se encontró ImageMagick" -ForegroundColor Red
    Write-Host "Por favor, reinstala ImageMagick o usa el script generate_icons.ps1 para instrucciones" -ForegroundColor Yellow
    exit 1
}

Write-Host "🎨 Generando iconos desde SVG..." -ForegroundColor Cyan
Write-Host "📁 Usando: $magick" -ForegroundColor Gray
Write-Host ""

# Crear iconos PNG en diferentes tamaños
$sizes = @(
    @{Size=32; Name="32x32.png"},
    @{Size=64; Name="64x64.png"},
    @{Size=128; Name="128x128.png"},
    @{Size=256; Name="128x128@2x.png"},
    @{Size=512; Name="icon.png"}
)

foreach ($icon in $sizes) {
    $output = Join-Path $iconDir $icon.Name
    Write-Host "  ✓ Generando $($icon.Name) ($($icon.Size)x$($icon.Size))..." -ForegroundColor Green
    
    & $magick -background none -density 300 $svgFile -resize "$($icon.Size)x$($icon.Size)" $output
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "    ❌ Error generando $($icon.Name)" -ForegroundColor Red
    }
}

# Generar icon.ico (multi-tamaño)
Write-Host ""
Write-Host "  ✓ Generando icon.ico (multi-tamaño: 16,32,48,256)..." -ForegroundColor Green
$icoOutput = Join-Path $iconDir "icon.ico"
& $magick -background none -density 300 $svgFile `
    -define icon:auto-resize="256,48,32,16" `
    $icoOutput

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Iconos generados exitosamente en: $iconDir" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Archivos creados:" -ForegroundColor Cyan
    Get-ChildItem $iconDir -Filter "*.png" | Where-Object { $_.Name -match "^(32x32|64x64|128x128|icon)" } | ForEach-Object {
        Write-Host "   - $($_.Name) ($([math]::Round($_.Length/1KB, 2)) KB)" -ForegroundColor Gray
    }
    $icoFile = Get-Item $icoOutput
    Write-Host "   - icon.ico ($([math]::Round($icoFile.Length/1KB, 2)) KB)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "🎯 Ahora puedes hacer build de la aplicación con los nuevos iconos" -ForegroundColor Blue
} else {
    Write-Host ""
    Write-Host "❌ Error al generar icon.ico" -ForegroundColor Red
}
