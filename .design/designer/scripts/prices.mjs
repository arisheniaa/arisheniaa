// Снимок цен-переписки во всех вариантах: середина сцены («печатает») и конец.
import { chromium } from 'playwright';
import sharp from 'sharp';
const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const w = Number(process.argv[2] || 1440);
const bufs = [];
for (const v of ['a', 'b', 'c', 'd']) {
  const page = await browser.newPage({ viewport: { width: w, height: 900 }, deviceScaleFactor: w < 768 ? 2 : 1 });
  await page.goto(`http://127.0.0.1:5180/${v}.html`, { waitUntil: 'load' });
  await page.waitForTimeout(2500);
  await page.evaluate(() => { const el = document.querySelector('.tg'); scrollTo(0, el.getBoundingClientRect().top + scrollY - 140); });
  await page.waitForTimeout(2600);
  const mid = await page.screenshot();
  await page.waitForTimeout(7000);
  const end = await page.screenshot();
  for (const b of [mid, end]) bufs.push(await sharp(b).resize(w < 768 ? 300 : 720).toBuffer());
  await page.close();
}
await browser.close();
const m = await sharp(bufs[0]).metadata();
await sharp({ create: { width: m.width * 4 + 18, height: m.height * 2 + 6, channels: 3, background: '#777' } })
  .composite(bufs.map((b, i) => ({ input: b, left: (Math.floor(i / 2) % 4) * (m.width + 6), top: (i % 2) * (m.height + 6) })))
  .jpeg({ quality: 85 }).toFile(`_shots/prices-${w}.jpg`);
console.log('ok');
