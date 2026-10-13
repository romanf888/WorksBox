import fs from 'fs';
import path from 'path';
import { Resvg } from '@resvg/resvg-js';

const officialLogoSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
  <defs>
    <linearGradient id="iconBlueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#3b82f6"/>
      <stop offset="50%" stop-color="#2563eb"/>
      <stop offset="100%" stop-color="#1d4ed8"/>
    </linearGradient>
  </defs>
  
  <!-- App Icon Rounded Squircle -->
  <rect width="128" height="128" rx="30" fill="url(#iconBlueGrad)"/>

  <!-- Open Book with Pencil Spine -->
  <g fill="#ffffff" transform="translate(12, 12)">
    <!-- Left Page -->
    <path d="M 47,40 C 37,34 27,35 19,38 C 17.5,38.6 17,40 17,41.5 L 17,67.5 C 17,68.8 17.8,69.8 19,69.5 C 27,66.5 37,66.5 47,72.5 Z" />
    
    <!-- Right Page -->
    <path d="M 57,40 C 67,34 77,35 85,38 C 86.5,38.6 87,40 87,41.5 L 87,67.5 C 87,68.8 86.2,69.8 85,69.5 C 77,66.5 67,66.5 57,72.5 Z" />

    <!-- Pencil Body (Spine) -->
    <rect x="49" y="38" width="6" height="32" rx="1"/>

    <!-- Pencil Tip Pointing Up -->
    <polygon points="48,37 56,37 52,24" fill="#ffffff"/>
    <polygon points="50.5,29 53.5,29 52,24" fill="#1e3a8a"/>

    <!-- Pencil Lead / Base Detail -->
    <polygon points="49,71 55,71 52,76" fill="#ffffff"/>
  </g>
</svg>`;

async function buildIcons() {
  const sizes = [16, 32, 48, 128];
  
  // Save official logo SVG into extension/
  fs.writeFileSync('extension/logo.svg', officialLogoSvg);

  for (const size of sizes) {
    const resvg = new Resvg(officialLogoSvg, {
      fitTo: {
        mode: 'width',
        value: size
      }
    });
    const pngData = resvg.render().asPng();
    const fileName = size === 128 ? 'icon.png' : `icon${size}.png`;
    fs.writeFileSync(path.join('extension', fileName), pngData);
    if (size === 128) {
      fs.writeFileSync('extension/icon128.png', pngData);
    }
    console.log(`Generated extension/${fileName} (${size}x${size})`);
  }
}

buildIcons().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
