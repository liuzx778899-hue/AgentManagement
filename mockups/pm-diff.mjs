import pw from 'playwright';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import fs from 'fs';

// Read design image directly from PNG file
const designPng = PNG.sync.read(fs.readFileSync('../docs/design/assets/project-management-overview-v1.png'));
console.log('Design PNG: ' + designPng.width + 'x' + designPng.height);

// Get HTML screenshot via browser - use scaled viewport
const b = await pw.chromium.launch({ headless: true });
const p = await b.newPage();
// HTML uses --page-scale: .8, so viewport should match design size
await p.setViewportSize({ width: designPng.width, height: designPng.height });
await p.goto('http://127.0.0.1:5173/mockups/project-management-overview-v2-final.html', { waitUntil: 'networkidle' });
await new Promise(r => setTimeout(r, 2000));
await p.screenshot({ path: 'mockups/pm-overview-html.png', fullPage: false });
await b.close();
console.log('HTML screenshot saved');

// Check screenshot size
const hPng = PNG.sync.read(fs.readFileSync('mockups/pm-overview-html.png'));
console.log('HTML PNG: ' + hPng.width + 'x' + hPng.height);

// Pixel diff - resize HTML screenshot if needed
const h = PNG.sync.read(fs.readFileSync('mockups/pm-overview-html.png'));
const w = Math.min(designPng.width, h.width);
const ht = Math.min(designPng.height, h.height);
const diff = new PNG({ width: w, height: ht });

const mismatch = pixelmatch(designPng.data, h.data, diff.data, w, ht, { threshold: 0.2 });
fs.writeFileSync('mockups/pm-overview-diff.png', PNG.sync.write(diff));

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