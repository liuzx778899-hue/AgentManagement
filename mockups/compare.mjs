import pw from 'playwright';

const dimg = 'file:///D:/work/vibecode/AgentDevelop/docs/design/assets/ai-workflow-design-v1-final.png';
const dhtml = 'file:///D:/work/vibecode/AgentDevelop/mockups/ai-workflow-design.html';

const browser = await pw.chromium.launch({ headless: true });

// 1. Open design image and get its natural size
const pageImg = await browser.newPage();
await pageImg.goto(dimg, { waitUntil: 'domcontentloaded' });
const imgInfo = await pageImg.evaluate(() => {
  const img = document.querySelector('img');
  return { w: img.naturalWidth, h: img.naturalHeight };
});
console.log('Design: ' + imgInfo.w + 'x' + imgInfo.h);

// Screenshot design at natural size
await pageImg.setViewportSize({ width: imgInfo.w, height: imgInfo.h + 20 });
await pageImg.goto(dimg, { waitUntil: 'domcontentloaded' });
await pageImg.screenshot({ path: 'mockups/_design.png', fullPage: false });
console.log('Design screenshot saved');

// 2. Open HTML - use viewport that matches the design aspect ratio
// Design is 1672x941, ratio ~1.78
// Let's use 1920x1080 as standard and compare sections
await pageImg.setViewportSize({ width: 1920, height: 1080 });
await pageImg.goto(dhtml, { waitUntil: 'networkidle' });
await new Promise(r => setTimeout(r, 2000));
await pageImg.screenshot({ path: 'mockups/_html_full.png', fullPage: false });
console.log('HTML screenshot saved (1920x1080)');

// 3. Now do regional comparisons - extract key sections from HTML
const sections = await pageImg.evaluate(() => {
  const result = {};
  const els = {
    contextHeader: '.context-header',
    leftColumn: '.col-discussion',
    canvasArea: '.canvas-body',
    rightColumn: '.col-apply',
    genBar: '.gen-bar',
    firstStep: '.workflow-step:first-child',
    diffCard: '.diff-card:first-child',
    composer: '.composer',
  };
  for (const [name, sel] of Object.entries(els)) {
    const el = document.querySelector(sel);
    if (el) {
      const r = el.getBoundingClientRect();
      result[name] = { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
    }
  }
  return result;
});

console.log('\n=== SECTION SIZES ===');
for (const [name, r] of Object.entries(sections)) {
  console.log(name + ': ' + r.w + 'x' + r.h + ' at (' + r.x + ',' + r.y + ')');
}

// 4. Count specific UI patterns
const uiDetail = await pageImg.evaluate(() => {
  return {
    // Sidebar nav items
    navItems: [...document.querySelectorAll('.nav-item')].map(e => e.textContent.trim()),

    // Context header content
    ctxTags: [...document.querySelectorAll('.ctx-tag')].map(e => e.textContent.trim()),
    ctxStatus: document.querySelector('.ctx-status')?.textContent.trim(),

    // Header buttons
    headerBtns: [...document.querySelectorAll('.hdr-actions .btn')].map(e => e.textContent.trim()),

    // Discussion column
    chatMessages: [...document.querySelectorAll('.msg-text')].map(e => e.textContent.trim()),
    matStrip: document.querySelector('.mat-btn')?.textContent.trim(),

    // Canvas toolbar
    toolbarHints: [...document.querySelectorAll('.canvas-toolbar-hint span')].map(e => e.textContent.trim()),

    // Gen bar stats
    genBarStats: [...document.querySelectorAll('.gen-bar-stat')].map(e => e.textContent.trim()),

    // Steps detail
    steps: [...document.querySelectorAll('.workflow-step')].map(el => {
      const name = el.querySelector('.step-name')?.textContent.trim();
      const num = el.querySelector('.step-num')?.textContent.trim();
      const badges = [...el.querySelectorAll('.badge')].map(b => b.textContent.trim());
      return num + ' ' + name + ' [' + badges.join(' | ') + ']';
    }),

    // Right column
    diffCards: [...document.querySelectorAll('.diff-card')].map(el => {
      const title = el.querySelector('.diff-card-hdr span:first-child')?.textContent.trim();
      const tag = el.querySelector('.diff-tag')?.textContent.trim();
      const items = [...el.querySelectorAll('.diff-row')].map(r => r.textContent.trim());
      return { title, tag, items };
    }),

    checkItems: [...document.querySelectorAll('.check-row')].map(el => ({
      text: el.querySelector('.check-label')?.textContent.trim(),
      done: el.classList.contains('completed'),
    })),

    applyBtns: [...document.querySelectorAll('.apply-footer .btn')].map(e => e.textContent.trim()),
  };
});

console.log('\n=== NAV ITEMS ===');
console.log(uiDetail.navItems.join(' | '));

console.log('\n=== CONTEXT HEADER ===');
console.log('Tags: ' + uiDetail.ctxTags.join(' | '));
console.log('Status: ' + uiDetail.ctxStatus);

console.log('\n=== HEADER BUTTONS ===');
console.log(uiDetail.headerBtns.join(' | '));

console.log('\n=== CHAT ===');
uiDetail.chatMessages.forEach((m, i) => console.log('Msg ' + i + ': ' + m.substring(0, 80)));
console.log('Materials: ' + uiDetail.matStrip);

console.log('\n=== CANVAS ===');
console.log('Toolbar: ' + uiDetail.toolbarHints.join(' | '));
console.log('GenBar: ' + uiDetail.genBarStats.join(' | '));

console.log('\n=== STEPS ===');
uiDetail.steps.forEach(s => console.log('  ' + s));

console.log('\n=== DIFF CARDS ===');
uiDetail.diffCards.forEach(c => {
  console.log('  [' + (c.tag || '-') + '] ' + c.title);
  c.items.forEach(i => console.log('    - ' + i));
});

console.log('\n=== CHECK LIST ===');
uiDetail.checkItems.forEach(c => console.log('  [' + (c.done ? 'x' : ' ') + '] ' + c.text));

console.log('\n=== APPLY ACTIONS ===');
console.log(uiDetail.applyBtns.join(' | '));

await browser.close();
