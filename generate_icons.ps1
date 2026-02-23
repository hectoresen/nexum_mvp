# Script para generar iconos PNG desde SVG
# Requiere: PowerShell con capacidades .NET

param(
    [string]$SvgPath = "client\src-tauri\icons\app-icon.svg",
    [string]$OutputDir = "client\src-tauri\icons"
)

Write-Host "🎨 Generando iconos desde SVG..." -ForegroundColor Cyan

# Tamaños necesarios para Tauri
$sizes = @(32, 64, 128, 256, 512)

Write-Host ""
Write-Host "⚠️  NOTA: PowerShell no puede convertir SVG nativamente." -ForegroundColor Yellow
Write-Host ""
Write-Host "Por favor, usa una de estas opciones para convertir el SVG:" -ForegroundColor White
Write-Host ""
Write-Host "📌 Opción 1 - Herramienta Online (Más fácil):" -ForegroundColor Green
Write-Host "   1. Abre: https://cloudconvert.com/svg-to-png" -ForegroundColor Gray
Write-Host "   2. Sube el archivo: $SvgPath" -ForegroundColor Gray
Write-Host "   3. Genera estos tamaños: 32x32, 64x64, 128x128, 256x256, 512x512" -ForegroundColor Gray
Write-Host "   4. Descarga y reemplaza en: $OutputDir" -ForegroundColor Gray
Write-Host ""
Write-Host "📌 Opción 2 - Instalar ImageMagick (Línea de comandos):" -ForegroundColor Green
Write-Host "   1. Instala ImageMagick: winget install ImageMagick.ImageMagick" -ForegroundColor Gray
Write-Host "   2. Ejecuta este script de nuevo" -ForegroundColor Gray
Write-Host ""
Write-Host "📌 Opción 3 - Inkscape (Herramienta gráfica):" -ForegroundColor Green
Write-Host "   1. Instala Inkscape: winget install Inkscape.Inkscape" -ForegroundColor Gray
Write-Host "   2. Abre $SvgPath" -ForegroundColor Gray
Write-Host "   3. Exporta como PNG en diferentes tamaños" -ForegroundColor Gray
Write-Host ""
Write-Host "📋 Archivos que necesitas generar:" -ForegroundColor Cyan
Write-Host "   - 32x32.png" -ForegroundColor Gray
Write-Host "   - 64x64.png" -ForegroundColor Gray  
Write-Host "   - 128x128.png" -ForegroundColor Gray
Write-Host "   - 128x128@2x.png (256x256)" -ForegroundColor Gray
Write-Host "   - icon.png (512x512)" -ForegroundColor Gray
Write-Host "   - icon.ico (multi-size ICO)" -ForegroundColor Gray
Write-Host ""
Write-Host "💡 Tip: Usa https://realfavicongenerator.net/ para generar todos los tamaños automáticamente" -ForegroundColor Blue
Write-Host ""
