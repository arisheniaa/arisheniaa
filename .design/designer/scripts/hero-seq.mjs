// Первый экран по шагам прокрутки: ноутбук целиком на компьютере, телефон
// на телефоне. Нужен `vite preview` на 5181. node scripts/hero-seq.mjs
import { chromium } from 'playwright';
import sharp from 'sharp';
const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu'] });
const rows = [];
for (const [w, h, dpr] of [[1920, 950, 1], [390, 844, 2]]) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: dpr, isMobile: w < 768, hasTouch: w < 768 });
  await page.goto('http://127.0.0.1:5181/index.html', { waitUntil: 'load' });
  await page.waitForTimeout(2000);
  const row = [];
  for (const f of [0, 0.25, 0.45, 0.6, 0.75, 0.95, 1.15]) {
    await page.evaluate((y) => scrollTo(0, y), Math.round(h * 1.7 * f));
    await page.waitForTimeout(700);
    row.push(await sharp(await page.screenshot()).resize(w < 768 ? 180 : 380).toBuffer());
  }
  rows.push(row);
  await page.close();
}
await browser.close();
const ms = await Promise.all(rows.map((r) => sharp(r[0]).metadata()));
let y = 0;
const comp = [];
rows.forEach((r, i) => { r.forEach((b, j) => comp.push({ input: b, left: j * (ms[i].width + 6), top: y })); y += ms[i].height + 6; });
await sharp({ create: { width: 7 * (380 + 6), height: y, channels: 3, background: '#777' } }).composite(comp).jpeg({ quality: 85 }).toFile('_shots/hero-seq.jpg');
console.log('ok');
