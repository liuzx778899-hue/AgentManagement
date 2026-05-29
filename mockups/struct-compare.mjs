import pw from 'playwright';

const b = await pw.chromium.launch({ headless: true });

// ===== DESIGN IMAGE: Sample colors at key positions to find column boundaries =====
const p1 = await b.newPage();
await p1.goto('file:///D:/work/vibecode/AgentDevelop/docs/design/assets/ai-workflow-design-v1-final.png', { waitUntil: 'domcontentloaded' });

const designStruct = await p1.evaluate(() => {
  const img = document.querySelector('img');
  const c = document.createElement('canvas');
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const w = img.naturalWidth; // 1672
  const h = img.naturalHeight; // 941

  // Get average color per pixel column at y=300 (content area)
  const colColors = [];
  for (let x = 0; x < w; x++) {
    const p = ctx.getImageData(x, 300, 1, 1).data;
    colColors.push(p[0]); // just check R channel for transitions
  }

  // Find significant transitions (>25 brightness change)
  const transitions = [];
  let prev = colColors[0];
  for (let x = 1; x < w; x++) {
    if (Math.abs(colColors[x] - prev) > 20) {
      transitions.push({ x, from: prev, to: colColors[x] });
      prev = colColors[x];
    }
  }

  // Group nearby transitions to find major boundaries (within 30px = same boundary)
  const boundaries = [];
  let lastX = -100;
  for (const t of transitions) {
    if (t.x - lastX > 30) {
      boundaries.push(t.x);
      lastX = t.x;
    }
  }

  return { w, h, boundaries };
});

console.log('DESIGN IMAGE: ' + designStruct.w + 'x' + designStruct.h);
console.log('Column boundaries at y=300: ' + designStruct.boundaries.join(', '));

// Interpret boundaries as column widths
const bounds = designStruct.boundaries;
const significantBounds = bounds.filter(b => {
  // Check if this boundary has a consistent color difference
  const next = bounds[bounds.indexOf(b) + 1] || bounds[bounds.indexOf(b) + 2];
  return true;
});

// ===== HTML PAGE: Get actual column rects =====
const p2 = await b.newPage();
await p2.setViewportSize({ width: 1672, height: 960 });
await p2.goto('http://127.0.0.1:9999/ai-workflow-design.html', { waitUntil: 'networkidle' });
await new Promise(r => setTimeout(r, 2000));

const htmlStruct = await p2.evaluate(() => {
  const result = {};
  const els = {
    sidebar: '.sidebar',
    main: '.main-area',
    topbar: '.topbar',
    ctxHeader: '.context-header',
    discussion: '.col-discussion',
    canvasBody: '.canvas-body',
    apply: '.col-apply',
    genBar: '.gen-bar',
  };
  for (const [name, sel] of Object.entries(els)) {
    const el = document.querySelector(sel);
    if (el) {
      const r = el.getBoundingClientRect();
      result[name] = { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
    }
  }
  result.viewport = { w: window.innerWidth, h: window.innerHeight };
  return result;
});

console.log('\nHTML PAGE at 1672x960:');
for (const [k, v] of Object.entries(htmlStruct)) {
  if (typeof v === 'object') {
    console.log('  ' + k + ': x=' + v.x + ' y=' + v.y + ' w=' + v.w + ' h=' + v.h);
  }
}

console.log('\n=== STRUCTURAL COMPARISON ===');

// The design's first few boundaries should correspond to:
// 1. End of sidebar
// 2. End of discussion column
// 3. End of analysis column
// 4. End of apply column (right edge)
const designBounds = designStruct.boundaries;
const firstContentX = designBounds[0]; // where sidebar ends or first content begins

console.log('Design sidebar likely ends at x=' + (designBounds[0] || '?'));
console.log('HTML sidebar ends at x=' + (htmlStruct.sidebar ? htmlStruct.sidebar.x + htmlStruct.sidebar.w : '?'));

console.log('\nDesign major boundaries: ' + designBounds.slice(0, 10).join(', '));
console.log('HTML discussion ends at x=' + (htmlStruct.discussion ? htmlStruct.discussion.x + htmlStruct.discussion.w : '?'));
console.log('HTML canvas ends at x=' + (htmlStruct.canvasBody ? htmlStruct.canvasBody.x + htmlStruct.canvasBody.w : '?'));
console.log('HTML apply starts at x=' + (htmlStruct.apply ? htmlStruct.apply.x : '?'));

// Check if the discussion/composer area exists at the right positions
const discussionEnd = htmlStruct.discussion ? htmlStruct.discussion.x + htmlStruct.discussion.w : 0;
const applyStart = htmlStruct.apply ? htmlStruct.apply.x : 0;

console.log('\nLayout analysis:');
console.log('Sidebar width: ' + (htmlStruct.sidebar?.w || '?') + 'px');
console.log('Main area width: ' + (htmlStruct.main?.w || '?') + 'px');
console.log('Discussion width: ' + (htmlStruct.discussion?.w || '?') + 'px');
console.log('Canvas width: ' + (htmlStruct.canvasBody?.w || '?') + 'px');
console.log('Apply width: ' + (htmlStruct.apply?.w || '?') + 'px');
console.log('Topbar height: ' + (htmlStruct.topbar?.h || '?') + 'px');
console.log('Context header height: ' + (htmlStruct.ctxHeader?.h || '?') + 'px');

await b.close();
