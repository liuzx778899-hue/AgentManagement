import { chromium } from 'playwright';

async function testWorkflowRoles() {
  console.log('🚀 测试工作流模板角色绑定...\n');

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    await page.goto('http://127.0.0.1:5173', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    // 导航到流程管理
    console.log('📋 导航到流程管理页面');
    await page.locator('button:has-text("流程管理")').first().click();
    await page.waitForTimeout(1000);

    // 检查流程卡片
    const flowCards = await page.locator('.wmo-flow-card').count();
    console.log(`\n流程卡片数量: ${flowCards}`);

    if (flowCards > 0) {
      // 检查第一个流程卡片
      const firstCard = page.locator('.wmo-flow-card').first();

      // 获取流程名称
      const flowName = await firstCard.locator('h3').innerText();
      console.log(`\n检查流程: ${flowName}`);

      // 检查角色覆盖显示
      const roleAvatars = await firstCard.locator('.wmo-avatar-dot').count();
      console.log(`  角色头像数量: ${roleAvatars}`);

      if (roleAvatars > 0) {
        const roleInitials = await firstCard.locator('.wmo-avatar-dot').allInnerTexts();
        console.log(`  角色缩写: ${roleInitials.join(', ')}`);
      }

      // 检查步骤显示
      const steps = await firstCard.locator('.wmo-step-pill').count();
      console.log(`  步骤数量: ${steps}`);

      if (steps > 0) {
        const stepNames = await firstCard.locator('.wmo-step-pill b').allInnerTexts();
        console.log(`  步骤名称: ${stepNames.join(' → ')}`);
      }

      // 截图
      await page.screenshot({ path: 'test-screenshots/workflow-roles.png' });
      console.log('\n  📸 截图已保存: test-screenshots/workflow-roles.png');

      // 点击进入设计
      console.log('\n📋 点击进入设计按钮');
      await firstCard.locator('button:has-text("进入设计")').click();
      await page.waitForTimeout(1000);

      // 检查工作流设计器
      const canvas = await page.locator('.workflow-canvas, [class*="canvas"]').count();
      console.log(`  画布元素: ${canvas}`);

      // 检查步骤节点
      const nodes = await page.locator('.workflow-node, [class*="node"]').count();
      console.log(`  流程节点: ${nodes}`);

      if (nodes > 0) {
        const nodeNames = await page.locator('.workflow-node h3, [class*="node"] h3').allInnerTexts();
        console.log(`  节点名称: ${nodeNames.join(', ')}`);
      }

      await page.screenshot({ path: 'test-screenshots/workflow-designer.png' });
      console.log('  📸 截图已保存: test-screenshots/workflow-designer.png');
    }

    console.log('\n✅ 测试完成');

  } catch (e) {
    console.log(`\n❌ 测试失败: ${e.message}`);
  }

  await browser.close();
}

testWorkflowRoles().catch(console.error);