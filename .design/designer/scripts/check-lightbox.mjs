// Проверка просмотра скрина: нажать на кадр работы, снять раскрытый кадр,
// листнуть стрелкой, закрыть Esc.
import { chromium } from 'playwright';
const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu'] });
for (const [w, h] of [[1920, 1080], [390, 844]]) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: w < 768 ? 2 : 1, hasTouch: w < 768, isMobile: w < 768 });
  await page.goto('http://127.0.0.1:5180/a.html', { waitUntil: 'load' });
  await page.waitForTimeout(2500);
  await page.evaluate(() => { const el = document.querySelectorAll('.a-par')[1]; scrollTo(0, el.getBoundingClientRect().top + scrollY); });
  await page.waitForTimeout(1800);
  const btn = page.locator('.a-par').nth(1).locator('.p-btn').first();
  await btn.click({ force: true });
  await page.waitForTimeout(900);
  await page.screenshot({ path: `_shots/lb-${w}-open.png` });
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(700);
  await page.screenshot({ path: `_shots/lb-${w}-next.png` });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(800);
  const left = await page.locator('.lb').count();
  console.log(w, 'после Esc окон просмотра:', left);
  await page.close();
}
await browser.close();
