import fs from 'fs';
import path from 'path';
import { Resvg } from '@resvg/resvg-js';

const svgBuffer = fs.readFileSync('extension/icon.svg');

const sizes = [16, 32, 48, 128];

for (const size of sizes) {
  const resvg = new Resvg(svgBuffer, {
    fitTo: {
      mode: 'width',
      value: size,
    },
  });
  const image = resvg.render();
  const pngBuffer = image.asPng();

  const fileName = size === 128 ? 'icon128.png' : `icon${size}.png`;
  fs.writeFileSync(path.join('extension', fileName), pngBuffer);
  console.log(`Generated extension/${fileName} (${size}x${size})`);
}

// Copy icon128.png to icon.png
fs.copyFileSync('extension/icon128.png', 'extension/icon.png');
console.log('Copied icon128.png to icon.png');
