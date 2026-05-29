import pw from 'playwright';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import fs from 'fs';

// Read design image directly from PNG file (no browser)
const designPng = PNG.sync.read(fs.readFileSync('docs/design/assets/ai-workflow-design-v1-final.png'));
console.log('Design PNG: ' + designPng.width + 'x' + designPng.height);

// Get HTML screenshot via browser
const b = await pw.chromium.launch({ headless: true });
const p = await b.newPage();
await p.setViewportSize({ width: designPng.width, height: designPng.height });
await p.goto('http://127.0.0.1:9999/ai-workflow-design.html', { waitUntil: 'networkidle' });
await new Promise(r => setTimeout(r, 2000));
await p.screenshot({ path: 'mockups/_h.png' });
await b.close();
console.log('HTML screenshot saved');

// Pixel diff - resize HTML screenshot if needed
const h = PNG.sync.read(fs.readFileSync('mockups/_h.png'));
const w = Math.min(designPng.width, h.width);
const ht = Math.min(designPng.height, h.height);
const diff = new PNG({ width: w, height: ht });

const mismatch = pixelmatch(designPng.data, h.data, diff.data, w, ht, { threshold: 0.2 });
fs.writeFileSync('mockups/_diff.png', PNG.sync.write(diff));

console.log('\nPixel mismatch: ' + mismatch + ' / ' + (w * ht) + ' = ' + (mismatch / (w * ht) * 100).toFixed(1) + '%');
console.log('(Lower % = better match)\n');

// Band analysis
for (let y = 0; y < ht; y += 96) {
  let dcount = 0, total = 0;
  for (let row = y; row < Math.min(y + 96, ht); row++) {
    for (let x = 0; x < w; x++) {
      const i = (row * w + x) * 4;
      if (diff.data[i] > 0 || diff.data[i + 1] > 0 || diff.data[i + 2] > 0) dcount++;
      total++;
    }
  }
  console.log('y=' + String(y).padStart(4) + '-' + String(Math.min(y + 96, ht)).padStart(4) + ': ' + (dcount / total * 100).toFixed(1) + '%');
}
