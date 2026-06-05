/**
 * GLM Coding Max 套餐抢购脚本
 * 使用方法：
 * 1. 打开 https://bigmodel.cn/glm-coding 并登录
 * 2. 按 F12 打开开发者工具
 * 3. 切换到 Console（控制台）标签
 * 4. 复制粘贴整个脚本并回车运行
 */

(function() {
    'use strict';

    console.log('%c🚀 GLM Coding 抢购脚本已启动', 'color: #00ff00; font-size: 20px; font-weight: bold;');
    console.log('目标: Max 套餐 (469元/月)');
    console.log('监控中...');

    // 配置
    const CONFIG = {
        targetText: '469',        // 目标价格
        targetPlan: 'Max',        // 目标套餐
        checkInterval: 500,       // 检查间隔(毫秒)
        autoClick: true,          // 自动点击
        soundAlert: true          // 声音提醒
    };

    let checkCount = 0;
    let isRunning = true;

    // 播放提示音
    function playSound() {
        if (!CONFIG.soundAlert) return;

        try {
            const audio = new AudioContext();
            const oscillator = audio.createOscillator();
            const gain = audio.createGain();

            oscillator.connect(gain);
            gain.connect(audio.destination);

            oscillator.frequency.value = 800;
            oscillator.type = 'sine';
            gain.gain.value = 0.3;

            oscillator.start();
            setTimeout(() => {
                oscillator.stop();
                audio.close();
            }, 500);
        } catch (e) {}
    }

    // 发送通知
    function sendNotification() {
        if (Notification.permission === 'granted') {
            new Notification('🎉 GLM Coding Max 开售了！', {
                body: '立即购买！469元/月',
                icon: 'https://bigmodel.cn/favicon.ico'
            });
        } else if (Notification.permission !== 'denied') {
            Notification.requestPermission();
        }
    }

    // 查找 Max 购买按钮
    function findMaxButton() {
        // 方法1: 通过价格查找
        const priceElements = document.querySelectorAll('*');
        for (const el of priceElements) {
            if (el.textContent && el.textContent.includes('469') && el.textContent.includes('Max')) {
                // 向上查找包含按钮的父容器
                let parent = el;
                for (let i = 0; i < 10; i++) {
                    parent = parent.parentElement;
                    if (!parent) break;

                    const btn = parent.querySelector('button');
                    if (btn) return btn;
                }
            }
        }

        // 方法2: 直接查找按钮
        const buttons = document.querySelectorAll('button');
        for (const btn of buttons) {
            const text = btn.textContent || '';
            // 跳过其他套餐的按钮
            if (text.includes('49') && !text.includes('469')) continue;
            if (text.includes('99') && !text.includes('469')) continue;
            if (text.includes('199') && !text.includes('469')) continue;

            // 检查是否在 Max 区域
            let parent = btn;
            for (let i = 0; i < 10; i++) {
                parent = parent.parentElement;
                if (!parent) break;
                if (parent.textContent && parent.textContent.includes('Max')) {
                    return btn;
                }
            }
        }

        // 方法3: 查找所有可点击元素
        const clickables = document.querySelectorAll('[class*="button"], [class*="btn"], [role="button"]');
        for (const el of clickables) {
            let parent = el;
            for (let i = 0; i < 10; i++) {
                parent = parent.parentElement;
                if (!parent) break;
                if (parent.textContent && parent.textContent.includes('469')) {
                    return el;
                }
            }
        }

        return null;
    }

    // 检查按钮是否可用
    function isButtonEnabled(button) {
        if (!button) return false;

        const styles = getComputedStyle(button);
        const rect = button.getBoundingClientRect();

        // 多种方式判断按钮是否可用
        const checks = [
            !button.disabled,
            !button.hasAttribute('disabled'),
            !button.classList.contains('disabled'),
            styles.opacity > 0.5,
            styles.pointerEvents !== 'none',
            styles.cursor !== 'not-allowed',
            rect.width > 0 && rect.height > 0,
            styles.display !== 'none',
            styles.visibility !== 'hidden'
        ];

        // 至少满足大部分条件才算可用
        const passCount = checks.filter(Boolean).length;
        return passCount >= 6;
    }

    // 主检查函数
    function check() {
        if (!isRunning) return;

        checkCount++;
        const button = findMaxButton();

        if (!button) {
            if (checkCount % 10 === 0) {
                console.log(`[${checkCount}] 正在搜索按钮...`);
            }
            return;
        }

        const isEnabled = isButtonEnabled(button);
        const status = isEnabled ? '✅ 可购买' : '❌ 不可用';

        console.log(`[${checkCount}] 按钮: ${status}`, button);

        if (isEnabled) {
            console.log('%c🎉🎉🎉 发现可购买按钮！', 'color: #00ff00; font-size: 24px; font-weight: bold;');
            console.log('按钮元素:', button);

            playSound();
            sendNotification();

            if (CONFIG.autoClick) {
                console.log('正在自动点击...');
                try {
                    button.click();
                    console.log('%c✅ 已点击购买按钮！', 'color: #00ff00; font-size: 20px;');

                    // 等待一下再点击确认
                    setTimeout(() => {
                        // 尝试查找确认按钮
                        const confirmBtns = document.querySelectorAll('button');
                        for (const btn of confirmBtns) {
                            if (btn.textContent.includes('确认') || btn.textContent.includes('确定') || btn.textContent.includes('支付')) {
                                btn.click();
                                console.log('已点击确认按钮');
                                break;
                            }
                        }
                    }, 500);

                } catch (e) {
                    console.error('点击失败:', e);
                }
            }

            // 成功后停止监控
            isRunning = false;
        }
    }

    // 请求通知权限
    if (Notification.permission !== 'granted') {
        Notification.requestPermission();
    }

    // 启动监控
    const intervalId = setInterval(check, CONFIG.checkInterval);

    // 暴露控制接口
    window.GLM_MONITOR = {
        stop: () => {
            clearInterval(intervalId);
            isRunning = false;
            console.log('⏹️ 监控已停止');
        },
        start: () => {
            if (!isRunning) {
                isRunning = true;
                setInterval(check, CONFIG.checkInterval);
                console.log('▶️ 监控已重启');
            }
        },
        status: () => {
            console.log('监控状态:', isRunning ? '运行中' : '已停止');
            console.log('检查次数:', checkCount);
        }
    };

    console.log('%c按 GLM_MONITOR.stop() 停止监控', 'color: #888;');
    console.log('%c按 GLM_MONITOR.status() 查看状态', 'color: #888;');

})();
