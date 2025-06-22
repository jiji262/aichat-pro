#!/bin/bash

# Script to convert SVG logos to various PNG sizes
# Requires: librsvg (install with: brew install librsvg)

echo "🎨 Converting AIChat Pro logos to PNG formats..."

# Check if rsvg-convert is available
if ! command -v rsvg-convert &> /dev/null; then
    echo "❌ rsvg-convert not found. Please install librsvg:"
    echo "   brew install librsvg"
    exit 1
fi

# Create logos directory
mkdir -p logos

# Convert main design logo to various sizes
echo "🎨 Converting design logo (logos/logo-design.svg)..."
rsvg-convert -w 512 -h 512 logos/logo-design.svg > logos/logo-512.png
rsvg-convert -w 256 -h 256 logos/logo-design.svg > logos/logo-256.png
rsvg-convert -w 128 -h 128 logos/logo-design.svg > logos/logo-128.png
rsvg-convert -w 64 -h 64 logos/logo-design.svg > logos/logo-64.png
rsvg-convert -w 32 -h 32 logos/logo-design.svg > logos/logo-32.png

# Convert icon design version
echo "📱 Converting icon design logo (logos/logo-icon-design.svg)..."
rsvg-convert -w 512 -h 512 logos/logo-icon-design.svg > logos/icon-512.png
rsvg-convert -w 256 -h 256 logos/logo-icon-design.svg > logos/icon-256.png
rsvg-convert -w 128 -h 128 logos/logo-icon-design.svg > logos/icon-128.png
rsvg-convert -w 64 -h 64 logos/logo-icon-design.svg > logos/icon-64.png
rsvg-convert -w 32 -h 32 logos/logo-icon-design.svg > logos/icon-32.png

# Convert abstract version
echo "🌟 Converting abstract logo (logos/logo-abstract.svg)..."
rsvg-convert -w 512 -h 512 logos/logo-abstract.svg > logos/abstract-512.png
rsvg-convert -w 256 -h 256 logos/logo-abstract.svg > logos/abstract-256.png
rsvg-convert -w 128 -h 128 logos/logo-abstract.svg > logos/abstract-128.png

# Convert tech version
echo "⚡ Converting tech logo (logos/logo-tech.svg)..."
rsvg-convert -w 512 -h 512 logos/logo-tech.svg > logos/tech-512.png
rsvg-convert -w 256 -h 256 logos/logo-tech.svg > logos/tech-256.png
rsvg-convert -w 128 -h 128 logos/logo-tech.svg > logos/tech-128.png

# Convert horizontal logo
echo "📏 Converting horizontal logo (logo-horizontal-simple.svg)..."
rsvg-convert -w 600 -h 140 logo-horizontal-simple.svg > logos/logo-horizontal-600.png
rsvg-convert -w 300 -h 70 logo-horizontal-simple.svg > logos/logo-horizontal-300.png
rsvg-convert -w 150 -h 35 logo-horizontal-simple.svg > logos/logo-horizontal-150.png

# Copy to Tauri icons directory (replace existing icons)
echo "📂 Copying icons to Tauri directory..."
cp logos/icon-32.png src-tauri/icons/32x32.png
cp logos/icon-128.png src-tauri/icons/128x128.png
cp logos/icon-256.png src-tauri/icons/128x128@2x.png
cp logos/icon-512.png src-tauri/icons/icon.png

# Generate ICO file for Windows (if imagemagick is available)
if command -v convert &> /dev/null; then
    echo "🪟 Generating Windows ICO file..."
    convert logos/icon-32.png logos/icon-64.png logos/icon-128.png logos/icon-256.png src-tauri/icons/icon.ico
else
    echo "⚠️  ImageMagick not found. Skipping ICO generation."
    echo "   Install with: brew install imagemagick"
fi

# Generate ICNS file for macOS (if iconutil is available)
if command -v iconutil &> /dev/null; then
    echo "🍎 Generating macOS ICNS file..."
    mkdir -p temp.iconset
    cp logos/icon-32.png temp.iconset/icon_16x16@2x.png
    cp logos/icon-32.png temp.iconset/icon_32x32.png
    cp logos/icon-64.png temp.iconset/icon_32x32@2x.png
    cp logos/icon-128.png temp.iconset/icon_128x128.png
    cp logos/icon-256.png temp.iconset/icon_128x128@2x.png
    cp logos/icon-256.png temp.iconset/icon_256x256.png
    cp logos/icon-512.png temp.iconset/icon_256x256@2x.png
    cp logos/icon-512.png temp.iconset/icon_512x512.png
    iconutil -c icns temp.iconset -o src-tauri/icons/icon.icns
    rm -rf temp.iconset
else
    echo "⚠️  iconutil not found. Skipping ICNS generation."
fi

echo "✅ Logo conversion complete!"
echo "📁 Generated files:"
echo "   - logos/ directory with all PNG variants"
echo "   - Updated src-tauri/icons/ with new app icons"
echo ""
echo "🎯 Next steps:"
echo "   1. Update README.md to use the new logo"
echo "   2. Rebuild the app: pnpm tauri build"
echo "   3. Test the new icons in the built application"
