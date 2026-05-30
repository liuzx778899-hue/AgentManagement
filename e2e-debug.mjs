import { chromium } from 'playwright';

async function debug() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  // 收集控制台消息
  page.on('console', msg => {
    console.log(`[Browser ${msg.type()}] ${msg.text()}`);
  });

  page.on('pageerror', error => {
    console.log(`[Page Error] ${error.message}`);
  });

  console.log('Loading page...');
  await page.goto('http://127.0.0.1:5173', { waitUntil: 'networkidle' });

  console.log('\nWaiting for page to render...');
  await page.waitForTimeout(5000);

  // 检查页面内容
  const bodyText = await page.locator('body').innerText();
  console.log(`\nBody text length: ${bodyText.length}`);
  console.log(`Body text preview: ${bodyText.substring(0, 200)}...`);

  // 检查根元素
  const rootContent = await page.locator('#root').innerHTML();
  console.log(`\n#root content length: ${rootContent.length}`);
  console.log(`#root preview: ${rootContent.substring(0, 300)}...`);

  // 截图
  await page.screenshot({ path: 'test-screenshots/debug-page.png' });
  console.log('\nScreenshot saved to test-screenshots/debug-page.png');

  // 检查是否有侧边栏
  const sidebar = await page.locator('.sidebar, nav, [class*="sidebar"]').count();
  console.log(`\nSidebar elements: ${sidebar}`);

  // 检查按钮
  const buttons = await page.locator('button').count();
  console.log(`Button count: ${buttons}`);

  if (buttons > 0) {
    const buttonTexts = await page.locator('button').allInnerTexts();
    console.log(`Button texts: ${buttonTexts.slice(0, 10).join(', ')}`);
  }

  await browser.close();
}

debug().catch(console.error);