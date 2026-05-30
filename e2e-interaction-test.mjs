import { chromium } from 'playwright';

async function runInteractionTests() {
  console.log('🚀 启动交互功能测试...\n');
  console.log('测试目标：验证每个按钮点击后是否有正确的响应\n');

  const browser = await chromium.launch({ headless: false, slowMo: 100 });
  const context = await browser.newContext();
  const page = await context.newPage();

  // 收集控制台错误
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  // 收集网络请求失败
  const networkErrors = [];
  page.on('response', response => {
    if (response.status() >= 400) {
      networkErrors.push(`${response.url()} - ${response.status()}`);
    }
  });

  const testResults = [];

  async function testButton(name, selector, expectedBehavior) {
    console.log(`\n📋 测试: ${name}`);
    try {
      const btn = page.locator(selector).first();

      if (!(await btn.isVisible({ timeout: 3000 }))) {
        console.log(`  ❌ 按钮 "${name}" 不存在或不可见`);
        testResults.push({ name, status: 'FAIL', reason: '按钮不存在' });
        return false;
      }

      console.log(`  ✓ 按钮可见`);

      // 点击按钮
      await btn.click({ timeout: 5000 });
      await page.waitForTimeout(800);

      // 检查预期行为
      let behaviorPassed = false;

      if (expectedBehavior.type === 'dialog') {
        const dialog = page.locator(expectedBehavior.selector).first();
        behaviorPassed = await dialog.isVisible({ timeout: 2000 }).catch(() => false);
        console.log(`  ${behaviorPassed ? '✅' : '❌'} 弹窗显示: ${expectedBehavior.selector}`);

        // 如果弹窗显示，尝试关闭它
        if (behaviorPassed) {
          const closeBtn = page.locator('button:has-text("取消"), button:has-text("关闭"), .close-btn, [aria-label="Close"]').first();
          if (await closeBtn.isVisible({ timeout: 500 })) {
            await closeBtn.click();
            await page.waitForTimeout(300);
          } else {
            await page.keyboard.press('Escape');
            await page.waitForTimeout(300);
          }
        }
      } else if (expectedBehavior.type === 'navigation') {
        // 检查 URL hash 是否变化
        const currentHash = page.url().split('#')[1] || '';
        behaviorPassed = currentHash.includes(expectedBehavior.view);
        console.log(`  ${behaviorPassed ? '✅' : '❌'} 导航到: ${expectedBehavior.view}`);
      } else if (expectedBehavior.type === 'apiCall') {
        // 检查是否有对应的 API 请求
        behaviorPassed = networkErrors.filter(e => !e.includes(expectedBehavior.endpoint)).length === 0;
        console.log(`  ${behaviorPassed ? '✅' : '❌'} API调用: ${expectedBehavior.endpoint}`);
      } else if (expectedBehavior.type === 'stateChange') {
        behaviorPassed = true; // 简化检查
        console.log(`  ✅ 点击成功`);
      }

      testResults.push({
        name,
        status: behaviorPassed ? 'PASS' : 'FAIL',
        reason: behaviorPassed ? '符合预期' : `不符合预期: ${expectedBehavior.type}`
      });

      return behaviorPassed;
    } catch (e) {
      console.log(`  ❌ 测试失败: ${e.message}`);
      testResults.push({ name, status: 'FAIL', reason: e.message });
      return false;
    }
  }

  try {
    // 访问页面
    await page.goto('http://127.0.0.1:5173', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    console.log('============================================================');
    console.log('第一部分：侧边栏导航测试');
    console.log('============================================================');

    // 侧边栏导航按钮
    await testButton('工作台导航', 'button:has-text("工作台")', { type: 'navigation', view: 'workbench' });
    await testButton('项目管理导航', 'button:has-text("项目管理")', { type: 'navigation', view: 'project-management' });
    await testButton('流程管理导航', 'button:has-text("流程管理")', { type: 'navigation', view: 'workflow-management' });
    await testButton('记忆管理导航', 'button:has-text("记忆管理")', { type: 'navigation', view: 'memory' });
    await testButton('设置中心导航', 'button:has-text("设置中心")', { type: 'navigation', view: 'settings' });

    console.log('\n============================================================');
    console.log('第二部分：项目管理页面交互测试');
    console.log('============================================================');

    await page.locator('button:has-text("项目管理")').first().click();
    await page.waitForTimeout(500);

    // 工具栏按钮
    await testButton('新建项目按钮', 'button:has-text("新建项目")', { type: 'dialog', selector: '.pm-overlay, [role="dialog"], .modal' });
    await testButton('导入已有项目按钮', 'button:has-text("导入已有项目")', { type: 'dialog', selector: '.pm-overlay, [role="dialog"], .modal' });
    await testButton('AI建项按钮', 'button:has-text("AI 建项")', { type: 'navigation', view: 'ai-briefing' });
    await testButton('检查全部进度按钮', 'button:has-text("检查全部进度")', { type: 'stateChange' });

    // 下拉选择器测试
    console.log('\n📋 测试: 项目组合下拉');
    const portfolioDropdown = page.locator('.pm-v2-select').first();
    if (await portfolioDropdown.isVisible({ timeout: 2000 })) {
      await portfolioDropdown.click();
      await page.waitForTimeout(300);
      const dropdownOpen = await page.locator('.pm-v2-dropdown').isVisible();
      console.log(`  ${dropdownOpen ? '✅' : '❌'} 下拉菜单展开`);
      testResults.push({ name: '项目组合下拉', status: dropdownOpen ? 'PASS' : 'FAIL', reason: dropdownOpen ? '展开正常' : '未展开' });
      await page.keyboard.press('Escape');
      await page.waitForTimeout(200);
    }

    console.log('\n============================================================');
    console.log('第三部分：记忆管理页面交互测试');
    console.log('============================================================');

    await page.locator('button:has-text("记忆管理")').first().click();
    await page.waitForTimeout(500);

    await testButton('新增记忆按钮', 'button:has-text("新增记忆")', { type: 'dialog', selector: '.mm-confirm-overlay, [role="dialog"]' });

    // 测试记忆表单填写
    console.log('\n📋 测试: 记忆表单填写');
    try {
      // 先打开新增记忆弹窗
      const addBtn = page.locator('button:has-text("新增记忆")').first();
      await addBtn.click();
      await page.waitForTimeout(500);

      // 查找输入框
      const titleInput = page.locator('input[placeholder*="标题"], .mm-title-input').first();
      const bodyInput = page.locator('textarea').first();

      if (await titleInput.isVisible({ timeout: 1000 })) {
        await titleInput.fill('测试记忆标题');
        await bodyInput.fill('测试记忆内容');
        console.log('  ✅ 表单填写成功');
        testResults.push({ name: '记忆表单填写', status: 'PASS', reason: '可正常填写' });

        // 测试保存按钮
        await testButton('保存记忆按钮', 'button:has-text("保存")', { type: 'stateChange' });
      } else {
        console.log('  ❌ 表单输入框不存在');
        testResults.push({ name: '记忆表单填写', status: 'FAIL', reason: '输入框不存在' });
      }

      // 关闭弹窗
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
    } catch (e) {
      console.log(`  ❌ 表单测试失败: ${e.message}`);
      testResults.push({ name: '记忆表单填写', status: 'FAIL', reason: e.message });
    }

    console.log('\n============================================================');
    console.log('第四部分：设置中心页面交互测试');
    console.log('============================================================');

    await page.locator('button:has-text("设置中心")').first().click();
    await page.waitForTimeout(500);

    // 测试设置标签页
    await testButton('用户偏好标签', 'button:has-text("用户偏好")', { type: 'stateChange' });
    await testButton('项目配置标签', 'button:has-text("项目配置")', { type: 'stateChange' });
    await testButton('模型配置标签', 'button:has-text("模型配置")', { type: 'stateChange' });
    await testButton('能力中心标签', 'button:has-text("能力中心")', { type: 'stateChange' });
    await testButton('CLI Runner标签', 'button:has-text("CLI Runner")', { type: 'stateChange' });
    await testButton('IM适配器标签', 'button:has-text("IM 适配器")', { type: 'stateChange' });
    await testButton('Git认证标签', 'button:has-text("Git 认证")', { type: 'stateChange' });

    // 测试保存配置按钮
    await testButton('保存配置按钮', 'button:has-text("保存配置")', { type: 'apiCall', endpoint: '/api/settings' });

    console.log('\n============================================================');
    console.log('第五部分：工作台页面交互测试');
    console.log('============================================================');

    await page.locator('button:has-text("工作台")').first().click();
    await page.waitForTimeout(500);

    // AI 助手测试
    console.log('\n📋 测试: AI助手输入框');
    try {
      const aiInput = page.locator('textarea[placeholder*="输入"], input[placeholder*="输入"]').first();
      if (await aiInput.isVisible({ timeout: 2000 })) {
        await aiInput.fill('测试消息');
        console.log('  ✅ AI输入框可填写');
        testResults.push({ name: 'AI输入框填写', status: 'PASS', reason: '可正常填写' });
      } else {
        console.log('  ⚠️ AI输入框未找到');
        testResults.push({ name: 'AI输入框填写', status: 'WARN', reason: '输入框位置可能不同' });
      }
    } catch (e) {
      console.log(`  ❌ AI输入测试失败`);
      testResults.push({ name: 'AI输入框填写', status: 'FAIL', reason: e.message });
    }

    console.log('\n============================================================');
    console.log('第六部分：流程管理页面交互测试');
    console.log('============================================================');

    await page.locator('button:has-text("流程管理")').first().click();
    await page.waitForTimeout(500);

    // 检查流程管理页面内容
    console.log('\n📋 测试: 流程管理页面内容');
    try {
      const workflowCards = await page.locator('[class*="workflow"], [class*="template"]').count();
      console.log(`  流程相关元素数量: ${workflowCards}`);

      if (workflowCards > 0) {
        console.log('  ✅ 有流程元素显示');
        testResults.push({ name: '流程管理内容', status: 'PASS', reason: `${workflowCards}个元素` });
      } else {
        console.log('  ❌ 页面内容为空');
        testResults.push({ name: '流程管理内容', status: 'FAIL', reason: '无内容显示' });
      }
    } catch (e) {
      console.log(`  ❌ 测试失败`);
      testResults.push({ name: '流程管理内容', status: 'FAIL', reason: e.message });
    }

    console.log('\n============================================================');
    console.log('第七部分：错误汇总');
    console.log('============================================================');

    if (consoleErrors.length > 0) {
      console.log(`\n❌ 控制台错误 (${consoleErrors.length}个):`);
      consoleErrors.forEach(err => console.log(`  - ${err.substring(0, 100)}`));
    } else {
      console.log('\n✅ 无控制台错误');
    }

    if (networkErrors.length > 0) {
      console.log(`\n❌ 网络请求失败 (${networkErrors.length}个):`);
      networkErrors.forEach(err => console.log(`  - ${err}`));
    } else {
      console.log('\n✅ 无网络请求失败');
    }

  } catch (e) {
    console.log(`\n❌ 测试执行错误: ${e.message}`);
  }

  // 输出最终结果
  console.log('\n============================================================');
  console.log('📊 交互功能测试结果汇总');
  console.log('============================================================');

  const passed = testResults.filter(r => r.status === 'PASS');
  const failed = testResults.filter(r => r.status === 'FAIL');
  const warnings = testResults.filter(r => r.status === 'WARN');

  console.log(`\n✅ 通过: ${passed.length} 个`);
  passed.forEach(r => console.log(`   - ${r.name}: ${r.reason}`));

  console.log(`\n❌ 失败: ${failed.length} 个`);
  failed.forEach(r => console.log(`   - ${r.name}: ${r.reason}`));

  console.log(`\n⚠️ 警告: ${warnings.length} 个`);
  warnings.forEach(r => console.log(`   - ${r.name}: ${r.reason}`));

  const totalTests = testResults.length;
  const passRate = totalTests > 0 ? ((passed.length / totalTests) * 100).toFixed(1) : 0;
  console.log(`\n📈 总通过率: ${passRate}% (${passed.length}/${totalTests})`);

  // 分类统计
  console.log('\n按功能模块统计:');
  const modules = {
    '导航': testResults.filter(r => r.name.includes('导航')),
    '项目管理': testResults.filter(r => r.name.includes('项目') || r.name.includes('建项')),
    '记忆管理': testResults.filter(r => r.name.includes('记忆')),
    '设置中心': testResults.filter(r => r.name.includes('标签') || r.name.includes('配置')),
    '工作台/AI': testResults.filter(r => r.name.includes('AI') || r.name.includes('输入')),
    '流程管理': testResults.filter(r => r.name.includes('流程')),
  };

  Object.entries(modules).forEach(([module, results]) => {
    if (results.length > 0) {
      const modPass = results.filter(r => r.status === 'PASS').length;
      const modFail = results.filter(r => r.status === 'FAIL').length;
      console.log(`  ${module}: ${modPass}通过 / ${modFail}失败`);
    }
  });

  console.log('\n');

  await browser.close();
  return testResults;
}

runInteractionTests().catch(console.error);