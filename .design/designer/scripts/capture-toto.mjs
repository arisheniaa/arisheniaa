// Дополнительные кадры сайта Алёны (Toto Shiro, totoshiroph.ru) — её
// правка «добавь ещё скринов с сайта Алёны». Прокрутка ступенями: секции
// проявляются при входе в кадр. Сначала все кадры — в _shots/toto-raw/,
// лучшие отбираются руками в public/works/ (toto-x*.webp, toto-mx*.webp)
// тем же форматом, что и прежние: 1200×750 и 620×1102.
// node scripts/capture-toto.mjs
import { chromium } from 'playwright';
import sharp from 'sharp';
import fs from 'node:fs';
const URL = 'https://totoshiroph.ru/';
const RAW = '_shots/toto-raw';
fs.mkdirSync(RAW, { recursive: true });
const browser = await chromium.launch();
for (const [kind, vp, dpr, w] of [['d', { width: 1440, height: 900 }, 2, 1200], ['m', { width: 390, height: 694 }, 3, 620]]) {
  const page = await browser.newPage({ viewport: vp, deviceScaleFactor: dpr });
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(2500);
  const H = await page.evaluate(() => document.documentElement.scrollHeight);
  let n = 0;
  for (let y = 0; y < H; y += Math.round(vp.height * 0.8)) {
    await page.evaluate((v) => scrollTo(0, v), y);
    await page.waitForTimeout(1300);
    await sharp(await page.screenshot()).resize(w).webp({ quality: 84 }).toFile(`${RAW}/${kind}-${String(n++).padStart(2, '0')}.webp`);
  }
  console.log(kind, 'кадров', n, 'высота', H);
  await page.close();
}
await browser.close();
