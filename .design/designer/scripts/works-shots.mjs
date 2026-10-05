// Снимки экранов работ (по центру каждой) — сравнить раскладку скринов.
// node scripts/works-shots.mjs <имя> [ширина] [высота]; нужен preview на 5181.
import { chromium } from 'playwright';
import sharp from 'sharp';
const name = process.argv[2] || 'works';
const W = Number(process.argv[3] || 1920);
const H = Number(process.argv[4] || 947);
const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: W, height: H } });
await page.goto('http://127.0.0.1:5181/a.html#works', { waitUntil: 'load' });
await page.waitForSelector('.a-par', { state: 'attached', timeout: 20000 });
await page.waitForTimeout(1500);
const n = await page.evaluate(() => document.querySelectorAll('.a-par').length);
const shots = [];
for (let i = 0; i < n; i++) {
  await page.evaluate((i) => { const el = document.querySelectorAll('.a-par')[i]; scrollTo(0, el.getBoundingClientRect().top + scrollY + el.offsetHeight / 2 - innerHeight / 2); }, i);
  await page.waitForTimeout(2200);
  shots.push(await sharp(await page.screenshot()).resize(Math.round(W / 3)).toBuffer());
}
await browser.close();
const m = await sharp(shots[0]).metadata();
await sharp({ create: { width: (m.width + 6) * 2, height: (m.height + 6) * Math.ceil(n / 2), channels: 3, background: '#777' } })
  .composite(shots.map((s, i) => ({ input: s, left: (i % 2) * (m.width + 6), top: Math.floor(i / 2) * (m.height + 6) })))
  .jpeg({ quality: 85 }).toFile(`_shots/${name}.jpg`);
console.log('ok', n);
