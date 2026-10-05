// Снимок раздела «Обо мне» во всех вариантах (проверка фото-вырезки).
import { chromium } from 'playwright';
import sharp from 'sharp';
const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const bufs = [];
for (const v of (process.argv[2] || 'a,b,c,d').split(',')) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(`http://127.0.0.1:5180/${v}.html`, { waitUntil: 'load' });
  await page.waitForTimeout(2500);
  await page.evaluate(() => { const el = document.querySelector('.s-about-grid'); scrollTo(0, el.getBoundingClientRect().top + scrollY - 120); });
  await page.waitForTimeout(Number(process.env.WAIT || 2200));
  bufs.push(await sharp(await page.screenshot()).resize(720).toBuffer());
  await page.close();
}
await browser.close();
await sharp({ create: { width: 1446, height: 906, channels: 3, background: '#777' } })
  .composite(bufs.map((b, i) => ({ input: b, left: (i % 2) * 726, top: Math.floor(i / 2) * 456 })))
  .jpeg({ quality: 85 }).toFile('_shots/about-all.jpg');
console.log('ok');
