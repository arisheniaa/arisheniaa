// Влезает ли переписка в окно: Full HD при 100 % (окно ~1920×947),
// Full HD при 125 % (~1536×730), «голый» 1920×1080 и телефон. Плюс снимки
// стыков между блоками — проверить, что полос больше нет.
// Нужен `npx vite preview --port 5181`.
import { chromium } from 'playwright';
import sharp from 'sharp';
const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const sizes = [[1920, 947], [1536, 730], [1920, 1080], [390, 844]];
const out = [];
for (const [w, h] of sizes) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  await page.goto('http://127.0.0.1:5181/a.html#prices', { waitUntil: 'load' });
  await page.waitForSelector('#prices', { state: 'attached', timeout: 20000 });
  await page.evaluate(() => document.getElementById('prices').scrollIntoView());
  await page.waitForTimeout(9000);
  const r = await page.evaluate(() => {
    const win = document.querySelector('.tg-win').getBoundingClientRect();
    const body = document.querySelector('.tg-body');
    const first = body.querySelector('.tg-out')?.getBoundingClientRect();
    const b = body.getBoundingClientRect();
    return { top: Math.round(win.top), bottom: Math.round(win.bottom), vh: innerHeight, clipped: first ? Math.round(first.top - b.top) : null };
  });
  console.log(w, h, JSON.stringify(r));
  out.push(await sharp(await page.screenshot()).resize(w < 768 ? 260 : 760).toBuffer());
  await page.close();
}
await browser.close();
let x = 0;
const metas = await Promise.all(out.map((b) => sharp(b).metadata()));
const H = Math.max(...metas.map((m) => m.height));
const W = metas.reduce((a, m) => a + m.width + 8, 0);
await sharp({ create: { width: W, height: H, channels: 3, background: '#777' } })
  .composite(out.map((b, i) => { const r = { input: b, left: x, top: 0 }; x += metas[i].width + 8; return r; }))
  .jpeg({ quality: 85 }).toFile('_shots/fit.jpg');
console.log('ok');
