import { chromium } from 'playwright';

async function runE2ETests() {
  console.log('🚀 启动 E2E 功能测试...\n');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  const results = {
    passed: [],
    failed: [],
    warnings: []
  };

  async function closeOverlays() {
    // 尝试关闭所有可能的遮罩层
    const closeSelectors = [
      '.mm-confirm-overlay button:has-text("取消")',
      '.mm-confirm-overlay button:has-text("关闭")',
      '.mm-confirm-overlay .close-btn',
      '.overlay .close-btn',
      'button[aria-label="Close"]',
      '.modal .close',
      '[role="dialog"] button:has-text("取消")'
    ];

    for (const selector of closeSelectors) {
      try {
        const btn = page.locator(selector).first();
        if (await btn.isVisible({ timeout: 500 })) {
          await btn.click();
          await page.waitForTimeout(300);
        }
      } catch (e) {
        // 忽略
      }
    }

    // 按 ESC 键关闭弹窗
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
  }

  try {
    // 1. 访问首页
    console.log('📋 测试 1: 访问首页');
    await page.goto('http://127.0.0.1:5173', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    const title = await page.title();
    console.log(`  页面标题: ${title}`);

    // 检查侧边栏
    const sidebar = await page.locator('.sidebar').isVisible();
    if (sidebar) {
      results.passed.push('侧边栏显示正常');
      console.log('  ✅ 侧边栏显示正常');
    } else {
      results.failed.push('侧边栏不显示');
      console.log('  ❌ 侧边栏不显示');
    }

    // 检查控制台错误
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // 2. 测试项目管理页面
    console.log('\n📋 测试 2: 项目管理功能');
    await page.locator('button:has-text("项目管理")').first().click();
    await page.waitForTimeout(1000);

    // 截图保存
    await page.screenshot({ path: 'test-screenshots/02-project-management.png' });

    // 检查项目卡片
    const projectCards = await page.locator('.project-card').count();
    console.log(`  项目卡片数量: ${projectCards}`);
    if (projectCards > 0) {
      results.passed.push(`显示 ${projectCards} 个项目卡片`);
    } else {
      // 尝试其他选择器
      const altCards = await page.locator('[class*="project"], [class*="card"]').count();
      console.log(`  备用卡片选择器数量: ${altCards}`);

      if (altCards === 0) {
        results.failed.push('项目管理页面没有显示任何卡片');
        console.log('  ❌ 项目管理页面没有显示项目卡片');
      }
    }

    // 检查新增项目按钮
    const addProjectBtn = await page.locator('button:has-text("新增"), button:has-text("创建"), button:has-text("添加项目")').first().isVisible();
    if (addProjectBtn) {
      console.log('  ✅ 新增/创建按钮存在');
      results.passed.push('新增项目按钮存在');

      try {
        await page.locator('button:has-text("新增"), button:has-text("创建"), button:has-text("添加项目")').first().click();
        await page.waitForTimeout(500);

        // 检查弹窗
        const dialogVisible = await page.locator('[role="dialog"], .overlay, .modal').isVisible();
        if (dialogVisible) {
          console.log('  ✅ 新增项目弹窗显示');
          results.passed.push('新增项目弹窗正常');

          // 截图
          await page.screenshot({ path: 'test-screenshots/02-add-project-dialog.png' });
          await closeOverlays();
        } else {
          console.log('  ❌ 新增项目弹窗未显示');
          results.failed.push('新增项目弹窗未显示');
        }
      } catch (e) {
        console.log('  ❌ 新增项目按钮点击失败');
        results.failed.push('新增项目按钮点击失败');
      }
    } else {
      console.log('  ❌ 新增项目按钮不存在');
      results.failed.push('新增项目按钮不存在');
    }

    // 3. 测试流程管理页面
    console.log('\n📋 测试 3: 流程管理功能');
    await page.locator('button:has-text("流程管理")').first().click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'test-screenshots/03-workflow.png' });

    // 检查工作流相关元素
    const workflowElements = await page.locator('[class*="workflow"], [class*="canvas"]').count();
    console.log(`  工作流相关元素数量: ${workflowElements}`);

    // 检查是否有工作流模板或步骤
    const workflowTemplates = await page.locator('.workflow-template, .template-item, [class*="template"]').count();
    console.log(`  模板元素数量: ${workflowTemplates}`);

    if (workflowElements === 0 && workflowTemplates === 0) {
      results.warnings.push('流程管理页面可能缺少内容');
      console.log('  ⚠️ 流程管理页面可能缺少内容');
    } else {
      results.passed.push('流程管理页面有元素显示');
      console.log('  ✅ 流程管理页面有元素显示');
    }

    // 4. 测试记忆管理页面
    console.log('\n📋 测试 4: 记忆管理功能');
    await page.locator('button:has-text("记忆管理")').first().click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'test-screenshots/04-memory.png' });

    // 检查记忆相关元素
    const memoryElements = await page.locator('[class*="memory"]').count();
    console.log(`  记忆相关元素数量: ${memoryElements}`);

    // 检查新增记忆按钮
    const addMemoryBtn = await page.locator('button:has-text("新增记忆")').first();
    if (await addMemoryBtn.isVisible({ timeout: 2000 })) {
      console.log('  ✅ 新增记忆按钮存在');
      results.passed.push('新增记忆按钮存在');

      try {
        await addMemoryBtn.click();
        await page.waitForTimeout(500);
        await page.screenshot({ path: 'test-screenshots/04-add-memory.png' });

        // 检查弹窗
        const overlayVisible = await page.locator('.mm-confirm-overlay, [role="dialog"], .overlay').isVisible();
        if (overlayVisible) {
          console.log('  ✅ 新增记忆弹窗显示');
          results.passed.push('新增记忆弹窗正常');

          // 尝试填写表单
          const titleInput = page.locator('input[placeholder*="标题"], input[type="text"]').first();
          const contentInput = page.locator('textarea').first();

          if (await titleInput.isVisible({ timeout: 1000 })) {
            await titleInput.fill('测试记忆标题');
            await contentInput.fill('测试记忆内容');
            console.log('  ✅ 记忆表单可填写');
            results.passed.push('记忆表单可填写');
          }

          await closeOverlays();
        } else {
          console.log('  ❌ 新增记忆弹窗未显示');
          results.failed.push('新增记忆弹窗未显示');
        }
      } catch (e) {
        console.log(`  ❌ 新增记忆按钮点击失败: ${e.message}`);
        results.failed.push('新增记忆按钮点击失败');
      }
    } else {
      console.log('  ❌ 新增记忆按钮不存在');
      results.failed.push('新增记忆按钮不存在');
    }

    // 5. 测试设置中心
    console.log('\n📋 测试 5: 设置中心功能');
    await closeOverlays();
    await page.waitForTimeout(300);
    await page.locator('button:has-text("设置中心")').first().click({ force: true });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'test-screenshots/05-settings.png' });

    // 检查设置页面标签页
    const tabButtons = await page.locator('[role="tab"], .tab-btn, button[class*="tab"]').count();
    console.log(`  标签页按钮数量: ${tabButtons}`);

    // 检查模型配置区域
    const modelConfig = await page.locator('[class*="model"], [class*="provider"]').count();
    console.log(`  模型配置相关元素: ${modelConfig}`);

    if (modelConfig > 0 || tabButtons > 0) {
      console.log('  ✅ 设置中心有内容显示');
      results.passed.push('设置中心有内容');
    } else {
      console.log('  ❌ 设置中心内容为空');
      results.failed.push('设置中心内容为空');
    }

    // 6. 测试工作台（AI 助手）
    console.log('\n📋 测试 6: 工作台/AI助手功能');
    await page.locator('button:has-text("工作台")').first().click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'test-screenshots/06-workbench.png' });

    // 检查 AI 助手面板
    const aiPanel = await page.locator('[class*="ai"], [class*="chat"], [class*="assistant"]').count();
    console.log(`  AI助手相关元素: ${aiPanel}`);

    // 检查输入框
    const inputElements = await page.locator('input[type="text"], textarea, [contenteditable="true"]').count();
    console.log(`  输入元素数量: ${inputElements}`);

    if (aiPanel > 0 || inputElements > 0) {
      console.log('  ✅ 工作台有内容显示');
      results.passed.push('工作台有内容显示');
    } else {
      console.log('  ⚠️ 工作台内容可能缺失');
      results.warnings.push('工作台内容可能缺失');
    }

    // 7. API 连接测试
    console.log('\n📋 测试 7: API 连接测试');
    const apiEndpoints = [
      '/api/projects',
      '/api/settings',
      '/api/memory',
      '/api/runners'
    ];

    for (const endpoint of apiEndpoints) {
      try {
        const response = await page.evaluate(async (url) => {
          try {
            const res = await fetch(url);
            const data = await res.json().catch(() => ({}));
            return { status: res.status, data };
          } catch (e) {
            return { error: e.message };
          }
        }, endpoint);

        if (response.status === 200) {
          console.log(`  ✅ ${endpoint} 正常 (${JSON.stringify(response.data).substring(0, 50)}...)`);
          results.passed.push(`API ${endpoint} 正常`);
        } else if (response.error) {
          console.log(`  ❌ ${endpoint} 错误: ${response.error}`);
          results.failed.push(`API ${endpoint} 错误`);
        } else {
          console.log(`  ⚠️ ${endpoint} 状态码: ${response.status}`);
          results.warnings.push(`API ${endpoint} 状态 ${response.status}`);
        }
      } catch (e) {
        console.log(`  ❌ ${endpoint} 测试失败`);
        results.failed.push(`API ${endpoint} 测试失败`);
      }
    }

    // 8. 检查控制台错误
    console.log('\n📋 测试 8: 控制台错误检查');
    if (consoleErrors.length > 0) {
      console.log(`  ❌ 发现 ${consoleErrors.length} 个控制台错误:`);
      consoleErrors.slice(0, 5).forEach(err => console.log(`     - ${err.substring(0, 100)}`));
      results.failed.push(`发现 ${consoleErrors.length} 个控制台错误`);
    } else {
      console.log('  ✅ 没有控制台错误');
      results.passed.push('没有控制台错误');
    }

  } catch (e) {
    console.log(`\n❌ 测试执行错误: ${e.message}`);
    results.failed.push(`测试执行错误: ${e.message}`);
  }

  // 输出总结
  console.log('\n' + '='.repeat(60));
  console.log('📊 E2E 功能测试结果汇总');
  console.log('='.repeat(60));
  console.log(`\n✅ 通过: ${results.passed.length} 个`);
  results.passed.forEach(r => console.log(`   - ${r}`));

  console.log(`\n❌ 失败: ${results.failed.length} 个`);
  results.failed.forEach(r => console.log(`   - ${r}`));

  console.log(`\n⚠️ 警告: ${results.warnings.length} 个`);
  results.warnings.forEach(r => console.log(`   - ${r}`));

  const total = results.passed.length + results.failed.length + results.warnings.length;
  const passRate = total > 0 ? ((results.passed.length / total) * 100).toFixed(1) : 0;
  console.log(`\n📈 通过率: ${passRate}%`);
  console.log('\n');

  await browser.close();

  return results;
}

runE2ETests().catch(console.error);