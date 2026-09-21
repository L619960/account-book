// 调试脚本 - 查看 Vant 组件的 DOM 结构
import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const page = await browser.newPage();

async function dumpPage(url, label) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`页面: ${url} (${label})`);
  console.log('='.repeat(60));
  
  await page.goto(url);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  // 获取所有按钮
  const buttons = await page.evaluate(() => {
    const btns = document.querySelectorAll('button, [role="button"], .van-button, [class*="btn"]');
    return Array.from(btns).map(b => ({
      tag: b.tagName,
      text: b.textContent?.trim().substring(0, 30),
      classes: b.className?.substring(0, 80),
      type: b.type,
      id: b.id,
      innerHTML: b.innerHTML?.substring(0, 200)
    }));
  });
  
  console.log('\n所有可点击元素:');
  buttons.forEach((b, i) => {
    console.log(`  [${i}] <${b.tag}> "${b.text}" type=${b.type} class="${b.classes}"`);
  });

  // 获取所有输入框
  const inputs = await page.evaluate(() => {
    const inputEls = document.querySelectorAll('input, textarea, [contenteditable]');
    return Array.from(inputEls).map(el => ({
      tag: el.tagName,
      type: el.type,
      placeholder: el.placeholder,
      value: el.value,
      classes: el.className?.substring(0, 80)
    }));
  });
  
  console.log('\n所有输入元素:');
  inputs.forEach((el, i) => {
    console.log(`  [${i}] <${el.tag}> type=${el.type} placeholder="${el.placeholder}" value="${el.value}"`);
  });

  // 获取所有 van-field
  const fieldElements = await page.evaluate(() => {
    return document.querySelectorAll('[class*="field"]');
  });
  console.log(`\nField 元素数: ${fieldElements.length}`);

  // 截图
  await page.screenshot({ path: `test-results/screenshots/${label.replace(/\s+/g, '-')}.png`, fullPage: true });
  console.log(`截图已保存: test-results/screenshots/${label.replace(/\s+/g, '-')}.png`);
}

// 测试不同页面
await dumpPage('http://localhost:3004/', '首页');
await dumpPage('http://localhost:3004/record/add', '记账页面');
await dumpPage('http://localhost:3004/budget', '预算页面');
await dumpPage('http://localhost:3004/account', '我的页面');
await dumpPage('http://localhost:3004/category', '分类页面');

await browser.close();
console.log('\n调试完成！');
