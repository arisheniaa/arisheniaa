// Снимки вариантов по кадрам скролла — для самопроверки и для владелицы.
// Headless идёт через настоящую видеокарту (ANGLE/D3D11): на программном
// SwiftShader шейдер во весь экран не успевал отдать кадр за 30 с.
//
//   node scripts/shots.mjs [страницы через запятую] [ширины через запятую]
//   node scripts/shots.mjs a,b 1440,390
//
// Нужен запущенный dev-сервер (`npm run dev`, порт 5180). Кадры: первый
// экран, середина раскрытия ноутбука, раскрытый фон, дальше — каждый раздел
// по его якорю. Шейдеру нужно время, чтобы догнать скролл, поэтому
// перед каждым снимком пауза.
import { chromium } from 'playwright';
import fs from 'node:fs';

const BASE = 'http://127.0.0.1:5180/';
const pages = (process.argv[2] || 'a,b,c,d').split(',');
const widths = (process.argv[3] || '1440,390').split(',').map(Number);
const OUT = '_shots';
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu'] });
for (const p of pages) {
  for (const w of widths) {
    const mobile = w < 768;
    const ctx = await browser.newContext({
      viewport: { width: w, height: mobile ? 844 : w >= 1920 ? 1080 : 900 },
      deviceScaleFactor: mobile ? 2 : 1,
      isMobile: mobile,
      hasTouch: mobile,
    });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    await page.goto(`${BASE}${p}.html${process.env.Q || ''}`, { waitUntil: 'load' });
    await page.waitForTimeout(5000);
    const H = await page.evaluate(() => innerHeight);
    const E = H * 1.7;
    const stops = [
      ['01-hero', 0],
      ['02-open', E * 0.3],
      ['03-grow', E * 0.62],
      ['04-bg', E * 1.0],
    ];
    const anchors = await page.evaluate(() =>
      ['works', 'about', 'prices', 'contacts'].filter((id) => document.getElementById(id)),
    );
    let n = 5;
    for (const [name, y] of stops) {
      await page.evaluate((yy) => window.scrollTo(0, yy), y);
      await page.waitForTimeout(1800);
      await page.screenshot({ path: `${OUT}/${p}-${w}-${name}.png` });
    }
    /* Работы: несколько экранов подряд от якоря. */
    const worksTop = await page.evaluate(() => document.getElementById('works')?.getBoundingClientRect().top + scrollY);
    if (worksTop) {
      for (let k = 0; k < 7; k++) {
        await page.evaluate((yy) => window.scrollTo(0, yy), worksTop + k * H * 1.0 + H * 0.5);
        await page.waitForTimeout(1600);
        await page.screenshot({ path: `${OUT}/${p}-${w}-${String(n++).padStart(2, '0')}-works${k}.png` });
      }
    }
    for (const a of anchors.slice(1)) {
      await page.evaluate((id) => document.getElementById(id).scrollIntoView({ behavior: 'instant' }), a);
      await page.waitForTimeout(1500);
      await page.screenshot({ path: `${OUT}/${p}-${w}-${String(n++).padStart(2, '0')}-${a}.png` });
    }
    console.log(p, w, errors.length ? 'ОШИБКИ: ' + [...new Set(errors)].join(' | ') : 'без ошибок');
    await ctx.close();
  }
}
await browser.close();
