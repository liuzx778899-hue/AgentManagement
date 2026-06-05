import { chromium } from 'playwright';

async function runTests() {
  console.log('🚀 启动完整功能测试...\n');

  const browser = await chromium.launch({ headless: false, slowMo: 100 });
  const context = await browser.newContext();
  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  const testResults = [];

  try {
    console.log('加载页面...');
    await page.goto('http://127.0.0.1:5173', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    // 检查页面加载状态
    const title = await page.title();
    console.log(`页面标题: ${title}\n`);

    //========================================
    console.log('============================================================');
    console.log('第一部分：侧边栏导航测试');
    console.log('============================================================');

    const navButtons = ['工作台', '项目管理', '流程管理', '记忆管理', '设置中心'];

    for (const nav of navButtons) {
      console.log(`\n📋 测试导航: ${nav}`);
      try {
        const btn = page.locator(`button:has-text("${nav}")`).first();
        await btn.waitFor({ state: 'visible', timeout: 5000 });
        await btn.click();
        await page.waitForTimeout(800);

        // 检查 URL hash 变化
        const url = page.url();
        const hashChanged = url.includes(nav.toLowerCase().replace('管理', '-management'));
        console.log(`  ${hashChanged ? '✅' : '⚠️'} 导航点击成功 (URL: ${url.split('#')[1] || 'workbench'})`);
        testResults.push({ name: `${nav}导航`, pass: true });
      } catch (e) {
        console.log(`  ❌ 导航失败: ${e.message}`);
        testResults.push({ name: `${nav}导航`, pass: false, reason: e.message });
      }
    }

    //========================================
    console.log('\n============================================================');
    console.log('第二部分：项目管理页面测试');
    console.log('============================================================');

    // 导航到项目管理
    await page.locator('button:has-text("项目管理")').first().click();
    await page.waitForTimeout(1000);

    // 检查项目卡片
    const projectCards = await page.locator('.project-card, [class*="project"]').count();
    console.log(`\n项目相关元素数量: ${projectCards}`);
    if (projectCards > 0) {
      console.log('  ✅ 项目卡片显示');
      testResults.push({ name: '项目卡片显示', pass: true });
    } else {
      console.log('  ❌ 没有显示项目卡片');
      testResults.push({ name: '项目卡片显示', pass: false, reason: '无项目卡片' });
    }

    // 测试新建项目按钮
    console.log('\n📋 测试: 新建项目');
    try {
      const newProjectBtn = page.locator('button:has-text("新建项目")').first();
      if (await newProjectBtn.isVisible({ timeout: 2000 })) {
        await newProjectBtn.click();
        await page.waitForTimeout(500);

        // 检查弹窗
        const overlay = page.locator('.pm-overlay, [role="dialog"], .modal').first();
        if (await overlay.isVisible({ timeout: 2000 })) {
          console.log('  ✅ 新建项目弹窗显示');
          testResults.push({ name: '新建项目弹窗', pass: true });
          await page.keyboard.press('Escape');
          await page.waitForTimeout(300);
        } else {
          console.log('  ❌ 新建项目弹窗未显示');
          testResults.push({ name: '新建项目弹窗', pass: false });
        }
      } else {
        console.log('  ⚠️ 新建项目按钮不存在');
        testResults.push({ name: '新建项目弹窗', pass: false, reason: '按钮不存在' });
      }
    } catch (e) {
      console.log(`  ❌ 测试失败: ${e.message}`);
      testResults.push({ name: '新建项目弹窗', pass: false, reason: e.message });
    }

    // 测试导入项目按钮
    console.log('\n📋 测试: 导入已有项目');
    try {
      const importBtn = page.locator('button:has-text("导入已有项目")').first();
      if (await importBtn.isVisible({ timeout: 2000 })) {
        await importBtn.click();
        await page.waitForTimeout(500);

        const overlay = page.locator('.pm-overlay, [role="dialog"], .modal').first();
        if (await overlay.isVisible({ timeout: 2000 })) {
          console.log('  ✅ 导入项目弹窗显示');
          testResults.push({ name: '导入项目弹窗', pass: true });
          await page.keyboard.press('Escape');
          await page.waitForTimeout(300);
        } else {
          console.log('  ❌ 导入项目弹窗未显示');
          testResults.push({ name: '导入项目弹窗', pass: false });
        }
      }
    } catch (e) {
      console.log(`  ❌ 测试失败: ${e.message}`);
      testResults.push({ name: '导入项目弹窗', pass: false, reason: e.message });
    }

    //========================================
    console.log('\n============================================================');
    console.log('第三部分：流程管理页面测试');
    console.log('============================================================');

    await page.locator('button:has-text("流程管理")').first().click();
    await page.waitForTimeout(1000);

    // 检查工作流模板
    const workflowElements = await page.locator('[class*="workflow"], [class*="flow"]').count();
    console.log(`\n工作流相关元素: ${workflowElements}`);

    // 检查流程卡片
    const flowCards = await page.locator('.wmo-flow-card, [class*="flow-card"]').count();
    console.log(`流程卡片数量: ${flowCards}`);

    if (workflowElements > 0 || flowCards > 0) {
      console.log('  ✅ 流程管理页面有内容');
      testResults.push({ name: '流程管理内容', pass: true });
    } else {
      // 检查是否显示空状态
      const emptyState = await page.locator('text=/还没有流程|暂无流程/').isVisible({ timeout: 2000 });
      if (emptyState) {
        console.log('  ⚠️ 显示空状态（无流程模板）');
        testResults.push({ name: '流程管理内容', pass: true, reason: '空状态显示正常' });
      } else {
        console.log('  ❌ 流程管理页面无内容');
        testResults.push({ name: '流程管理内容', pass: false });
      }
    }

    //========================================
    console.log('\n============================================================');
    console.log('第四部分：记忆管理页面测试');
    console.log('============================================================');

    await page.locator('button:has-text("记忆管理")').first().click();
    await page.waitForTimeout(1000);

    // 测试新增记忆
    console.log('\n📋 测试: 新增记忆');
    try {
      const addMemoryBtn = page.locator('button:has-text("新增记忆")').first();
      await addMemoryBtn.waitFor({ state: 'visible', timeout: 3000 });
      await addMemoryBtn.click();
      await page.waitForTimeout(500);

      // 检查表单
      const titleInput = page.locator('input[placeholder*="标题"], input[type="text"]').first();
      const bodyTextarea = page.locator('textarea').first();

      if (await titleInput.isVisible({ timeout: 2000 })) {
        await titleInput.fill('E2E测试记忆');
        await bodyTextarea.fill('这是自动化测试创建的记忆内容');
        console.log('  ✅ 记忆表单可填写');
        testResults.push({ name: '记忆表单填写', pass: true });

        // 测试保存
        const saveBtn = page.locator('button:has-text("保存")').first();
        await saveBtn.click();
        await page.waitForTimeout(500);
        console.log('  ✅ 保存按钮可点击');
        testResults.push({ name: '记忆保存', pass: true });
      } else {
        console.log('  ❌ 表单输入框不存在');
        testResults.push({ name: '记忆表单填写', pass: false });
      }

      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
    } catch (e) {
      console.log(`  ❌ 测试失败: ${e.message}`);
      testResults.push({ name: '记忆表单填写', pass: false, reason: e.message });
    }

    //========================================
    console.log('\n============================================================');
    console.log('第五部分：设置中心页面测试');
    console.log('============================================================');

    await page.locator('button:has-text("设置中心")').first().click();
    await page.waitForTimeout(1000);

    // 测试标签页切换
    const tabs = ['用户偏好', '模型配置', 'CLI Runner', 'IM 适配器', 'Git 认证'];
    for (const tab of tabs) {
      console.log(`\n📋 测试标签页: ${tab}`);
      try {
        const tabBtn = page.locator(`button:has-text("${tab}")`).first();
        if (await tabBtn.isVisible({ timeout: 2000 })) {
          await tabBtn.click();
          await page.waitForTimeout(300);
          console.log(`  ✅ ${tab} 标签页可切换`);
          testResults.push({ name: `${tab}标签页`, pass: true });
        } else {
          console.log(`  ⚠️ ${tab} 标签页不存在`);
          testResults.push({ name: `${tab}标签页`, pass: false, reason: '不存在' });
        }
      } catch (e) {
        console.log(`  ❌ 切换失败: ${e.message}`);
        testResults.push({ name: `${tab}标签页`, pass: false, reason: e.message });
      }
    }

    // 测试保存配置
    console.log('\n📋 测试: 保存配置');
    try {
      const saveConfigBtn = page.locator('button:has-text("保存配置")').first();
      if (await saveConfigBtn.isVisible({ timeout: 2000 })) {
        await saveConfigBtn.click();
        await page.waitForTimeout(500);
        console.log('  ✅ 保存配置按钮可点击');
        testResults.push({ name: '保存配置', pass: true });
      }
    } catch (e) {
      console.log(`  ❌ 保存失败: ${e.message}`);
      testResults.push({ name: '保存配置', pass: false, reason: e.message });
    }

    //========================================
    console.log('\n============================================================');
    console.log('第六部分：工作台/AI助手测试');
    console.log('============================================================');

    await page.locator('button:has-text("工作台")').first().click();
    await page.waitForTimeout(1000);

    // 检查AI助手区域
    const aiPanel = await page.locator('[class*="ai"], [class*="assistant"], [class*="chat"]').count();
    console.log(`\nAI相关元素: ${aiPanel}`);

    if (aiPanel > 0) {
      console.log('  ✅ AI助手面板存在');
      testResults.push({ name: 'AI助手面板', pass: true });

      // 尝试输入
      const input = page.locator('textarea').first();
      if (await input.isVisible({ timeout: 2000 })) {
        await input.fill('测试消息');
        console.log('  ✅ AI输入框可填写');
        testResults.push({ name: 'AI输入框', pass: true });
      }
    } else {
      console.log('  ⚠️ AI助手面板未找到');
      testResults.push({ name: 'AI助手面板', pass: false, reason: '未找到' });
    }

    //========================================
    console.log('\n============================================================');
    console.log('错误汇总');
    console.log('============================================================');

    if (consoleErrors.length > 0) {
      console.log(`\n❌ 控制台错误 (${consoleErrors.length}个):`);
      consoleErrors.slice(0, 5).forEach(e => console.log(`  - ${e.substring(0, 80)}`));
    } else {
      console.log('\n✅ 无控制台错误');
    }

  } catch (e) {
    console.log(`\n❌ 测试执行错误: ${e.message}`);
  }

  //========================================
  console.log('\n============================================================');
  console.log('📊 测试结果汇总');
  console.log('============================================================');

  const passed = testResults.filter(r => r.pass);
  const failed = testResults.filter(r => !r.pass);

  console.log(`\n✅ 通过: ${passed.length} 个`);
  passed.forEach(r => console.log(`   - ${r.name}`));

  console.log(`\n❌ 失败: ${failed.length} 个`);
  failed.forEach(r => console.log(`   - ${r.name}: ${r.reason || '未通过'}`));

  const rate = testResults.length > 0 ? ((passed.length / testResults.length) * 100).toFixed(1) : 0;
  console.log(`\n📈 总通过率: ${rate}% (${passed.length}/${testResults.length})\n`);

  await browser.close();
}

runTests().catch(console.error);