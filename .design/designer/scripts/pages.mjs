// Снимки служебных страниц: оглавление и витрина эффектов (по экранам).
import { chromium } from 'playwright';

const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
for (const [p, w] of [['index', 1440], ['effects', 1440], ['index', 390]]) {
  const page = await browser.newPage({ viewport: { width: w, height: w < 768 ? 844 : 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto(`http://127.0.0.1:5180/${p}.html`, { waitUntil: 'load' });
  await page.waitForTimeout(3500);
  const H = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0, k = 1; y < H && k <= 9; y += 900, k++) {
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
    await page.mouse.move(600 + k * 40, 400);
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `_shots/${p}-${w}-${String(k).padStart(2, '0')}.png` });
  }
  console.log(p, w, errors.length ? 'ОШИБКИ: ' + [...new Set(errors)].join(' | ') : 'без ошибок');
  await page.close();
}
await browser.close();
