// Кадры сайта Насти Нико (arisheniaa.github.io/nastyanico) для портфолио —
// её правка «добавь сайт для фотографа Насти Нико в портфолио к лендингам».
// Четыре страницы, прокрутка ступенями: блоки проявляются при входе в кадр.
// Сначала все кадры — в _shots/niko-raw/, лучшие отбираются руками в
// public/works/ (niko-*.webp, niko-m*.webp) тем же форматом, что у других
// сайтов: ноутбук 1440×900 ×2 → 1200×750, телефон 390×694 ×3 → 620×1103.
// node scripts/capture-niko.mjs
import { chromium } from 'playwright';
import sharp from 'sharp';
import fs from 'node:fs';
const BASE = 'https://arisheniaa.github.io/nastyanico/';
const PAGES = ['', 'portret/', 'para/', 'svadba/'];
const RAW = '_shots/niko-raw';
fs.mkdirSync(RAW, { recursive: true });
const browser = await chromium.launch();
for (const [kind, ctx, w] of [
  ['d', { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 }, 1200],
  ['m', { viewport: { width: 390, height: 694 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true }, 620],
]) {
  const page = await browser.newPage(ctx);
  for (const p of PAGES) {
    await page.goto(BASE + p, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(2000);
    const H = await page.evaluate(() => document.documentElement.scrollHeight);
    const tag = p.replace('/', '') || 'main';
    let n = 0;
    for (let y = 0; y < H; y += Math.round(ctx.viewport.height * 0.8)) {
      await page.evaluate((v) => scrollTo(0, v), y);
      await page.waitForTimeout(1300);
      await sharp(await page.screenshot()).resize(w).webp({ quality: 84 }).toFile(`${RAW}/${kind}-${tag}-${String(n++).padStart(2, '0')}.webp`);
    }
    console.log(kind, tag, 'кадров', n, 'высота', H);
  }
  await page.close();
}
await browser.close();
