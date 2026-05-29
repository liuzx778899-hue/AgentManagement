import pw from 'playwright';

const browser = await pw.chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setViewportSize({ width: 1920, height: 1080 });
await page.goto('file:///D:/work/vibecode/AgentDevelop/mockups/ai-workflow-design.html', { waitUntil: 'networkidle' });
await new Promise(r => setTimeout(r, 2000));

// Layout rects
const rects = await page.evaluate(() => {
  const keys = document.querySelectorAll('.sidebar, .main-area, .discussion-column, .analysis-column, .apply-column, .context-header, .topbar, .canvas-body, .workflow-step, .diff-card, .apply-checklist, .generate-draft-section, .composer');
  const result = {};
  keys.forEach(el => {
    const cls = el.className.toString().split(' ')[0] || el.tagName;
    const r = el.getBoundingClientRect();
    result[cls] = { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
  });
  return result;
});

console.log('=== LAYOUT RECTS ===');
for (const [k, v] of Object.entries(rects)) {
  console.log(`${k}: x=${v.x} y=${v.y} w=${v.w} h=${v.h}`);
}

// Page title
console.log('\n=== TITLE ===');
console.log(await page.title());

// Visible text
console.log('\n=== TEXT CONTENT ===');
const text = await page.evaluate(() => document.body.innerText.substring(0, 4000));
console.log(text);

// Icons
const svgs = await page.evaluate(() => [...document.querySelectorAll('svg')].length);
console.log(`\n=== SVG icons: ${svgs} ===`);

// Check specific elements exist
const checks = await page.evaluate(() => {
  return {
    sidebar: !!document.querySelector('.sidebar'),
    topbar: !!document.querySelector('.topbar'),
    discussionColumn: !!document.querySelector('.discussion-column'),
    analysisColumn: !!document.querySelector('.analysis-column'),
    applyColumn: !!document.querySelector('.apply-column'),
    contextHeader: !!document.querySelector('.context-header'),
    canvasBody: !!document.querySelector('.canvas-body'),
    workflowSteps: document.querySelectorAll('.workflow-step').length,
    chatMessages: document.querySelectorAll('.message').length,
    insightCards: document.querySelectorAll('.insight-card').length,
    diffCards: document.querySelectorAll('.diff-card').length,
    checklistItems: document.querySelectorAll('.checklist-item').length,
    btnPrimary: document.querySelectorAll('.btn-primary').length,
    composerTextarea: !!document.querySelector('.composer textarea'),
    materialsStrip: !!document.querySelector('.materials-strip'),
    headerActions: !!document.querySelector('.header-actions'),
    navActive: document.querySelector('.nav-item.active')?.textContent?.trim(),
  };
});
console.log('\n=== ELEMENT CHECKS ===');
for (const [k, v] of Object.entries(checks)) {
  console.log(`${k}: ${v}`);
}

await page.screenshot({ path: 'D:/work/vibecode/AgentDevelop/mockups/preview-v2.png', fullPage: true });
console.log('\nScreenshot saved to preview-v2.png');

await browser.close();
