// Проверка ленты варианта C: подпись работы меняется вместе с кадром в центре.
import { chromium } from 'playwright';
const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://127.0.0.1:5180/c.html', { waitUntil: 'load' });
await page.waitForTimeout(3000);
const top = await page.evaluate(() => document.querySelector('.c-reel').getBoundingClientRect().top + scrollY);
const h = await page.evaluate(() => document.querySelector('.c-reel').offsetHeight - innerHeight);
for (const f of [0, 0.25, 0.5, 0.75, 1]) {
  /* Скролл колесом малыми шагами — как человек, а не прыжком. */
  await page.evaluate((y) => window.scrollTo(0, y), top + h * f - 400);
  await page.mouse.move(700, 450);
  for (let i = 0; i < 4; i++) { await page.mouse.wheel(0, 100); await page.waitForTimeout(80); }
  await page.waitForTimeout(1500);
  const cap = await page.evaluate(() => document.querySelector('.c-reel-caption .s-work-name')?.textContent);
  console.log(f, cap);
  await page.screenshot({ path: `_shots/reel-${f}.png` });
}
await browser.close();
