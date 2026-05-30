/**
 * GLM Coding 抢购监控脚本
 * 使用方法：在浏览器控制台(F12)运行此脚本
 * 当按钮可点击时会发出声音提醒
 */

(function() {
    console.log('🚀 GLM Coding 监控脚本已启动...');

    let lastButtonState = null;
    let checkCount = 0;

    function findMaxButton() {
        // 查找 Max 套餐的购买按钮
        const buttons = document.querySelectorAll('button, [class*="btn"], [class*="button"]');
        for (const btn of buttons) {
            const text = btn.innerText || btn.textContent;
            if (text && text.includes('Max')) {
                return btn;
            }
        }

        // 备用：查找469相关的按钮区域
        const allElements = document.querySelectorAll('*');
        for (const el of allElements) {
            if (el.textContent && el.textContent.includes('469') && el.textContent.includes('Max')) {
                const parent = el.closest('div[class*="card"], div[class*="plan"], div[class*="package"]');
                if (parent) {
                    const buyBtn = parent.querySelector('button');
                    if (buyBtn) return buyBtn;
                }
            }
        }
        return null;
    }

    function checkButton() {
        checkCount++;
        const btn = findMaxButton();

        if (!btn) {
            console.log(`[${checkCount}] 未找到 Max 按钮，继续搜索...`);
            return;
        }

        const isDisabled = btn.disabled ||
                          btn.classList.contains('disabled') ||
                          btn.getAttribute('disabled') !== null ||
                          getComputedStyle(btn).opacity < 0.5 ||
                          getComputedStyle(btn).cursor === 'not-allowed';

        const currentState = isDisabled ? 'disabled' : 'enabled';

        if (currentState !== lastButtonState) {
            lastButtonState = currentState;

            if (currentState === 'enabled') {
                console.log('🎉🎉🎉 按钮已启用！快去购买！🎉🎉🎉');
                // 播放提示音
                const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbsGEcBj2q1pxtYgAAAG');
                audio.play().catch(() => {});

                // 尝试自动点击（如果允许）
                try {
                    btn.click();
                    console.log('✅ 已自动点击购买按钮！');
                } catch (e) {
                    console.log('⚠️ 自动点击失败，请手动点击');
                }

                // 浏览器通知
                if (Notification.permission === 'granted') {
                    new Notification('GLM Coding Max 开售了！', { body: '快去购买！' });
                }
            } else {
                console.log(`[${checkCount}] 按钮状态：禁用`);
            }
        } else {
            console.log(`[${checkCount}] 按钮状态：${currentState}`);
        }
    }

    // 请求通知权限
    if (Notification.permission !== 'granted') {
        Notification.requestPermission();
    }

    // 每1秒检查一次
    const interval = setInterval(checkButton, 1000);

    console.log('📊 监控中... 按 Ctrl+C 停止');
    console.log('📝 如需停止监控，运行: clearInterval(' + interval + ')');

    // 暴露停止函数
    window.stopGLMMonitor = () => {
        clearInterval(interval);
        console.log('⏹️ 监控已停止');
    };
})();
