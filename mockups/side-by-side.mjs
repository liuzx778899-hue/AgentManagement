import pw from 'playwright';

const browser = await pw.chromium.launch({ headless: true });

// Page 1: Design image
const p1 = await browser.newPage();
await p1.goto('file:///D:/work/vibecode/AgentDevelop/docs/design/assets/ai-workflow-design-v1-final.png', { waitUntil: 'domcontentloaded' });
await p1.setViewportSize({ width: 1672, height: 941 });
await p1.screenshot({ path: 'mockups/_design.png' });

// Page 2: HTML implementation at matching dimensions
const p2 = await browser.newPage();
await p2.setViewportSize({ width: 1672, height: 941 });
await p2.goto('http://127.0.0.1:9999/ai-workflow-design.html', { waitUntil: 'networkidle' });
await new Promise(r => setTimeout(r, 2000));
await p2.screenshot({ path: 'mockups/_html.png' });

// Pixel diff
const { PNG } = await import('pngjs');
const { default: pixelmatch } = await import('pixelmatch');
const fs = await import('fs');

const img1 = PNG.sync.read(fs.readFileSync('mockups/_design.png'));
const img2 = PNG.sync.read(fs.readFileSync('mockups/_html.png'));

// Crop/resize img2 to match img1 dimensions
const w = Math.min(img1.width, img2.width);
const h = Math.min(img1.height, img2.height);
const diffPng = new PNG({ width: w, height: h });

const mismatch = pixelmatch(
  img1.data, img2.data, diffPng.data, w, h,
  { threshold: 0.3, includeAA: true }
);

fs.writeFileSync('mockups/_diff.png', PNG.sync.write(diffPng));
const pctDiff = (mismatch / (w * h) * 100).toFixed(2);
console.log('Pixels different: ' + mismatch + ' (' + pctDiff + '%)');

// Region analysis - sample key sections
const regions = await p2.evaluate(() => {
  const result = {};

  // Sidebar
  const sidebar = document.querySelector('.sidebar');
  if (sidebar) { const r = sidebar.getBoundingClientRect(); result.sidebar = {w: Math.round(r.width), h: Math.round(r.height)}; }

  // Columns
  const disc = document.querySelector('.col-discussion');
  if (disc) { const r = disc.getBoundingClientRect(); result.discussion = {w: Math.round(r.width), h: Math.round(r.height)}; }

  const apply = document.querySelector('.col-apply');
  if (apply) { const r = apply.getBoundingClientRect(); result.apply = {w: Math.round(r.width), h: Math.round(r.height)}; }

  const canvas = document.querySelector('.canvas-body');
  if (canvas) { const r = canvas.getBoundingClientRect(); result.canvas = {w: Math.round(r.width), h: Math.round(r.height)}; }

  // Steps
  const steps = [...document.querySelectorAll('.workflow-step')];
  if (steps.length) {
    const last = steps[steps.length - 1].getBoundingClientRect();
    result.stepsCount = steps.length;
    result.lastStepBottom = Math.round(last.bottom);
  }

  // Window
  result.viewport = {w: window.innerWidth, h: window.innerHeight};

  return result;
});

console.log('\n=== HTML REGIONS ===');
for (const [k, v] of Object.entries(regions)) {
  console.log(k + ': ' + JSON.stringify(v));
}

await browser.close();
console.log('\nScreenshots: _design.png, _html.png, _diff.png');
