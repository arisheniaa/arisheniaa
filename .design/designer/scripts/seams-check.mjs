// Крупно хвостики сообщений + кадры на бывших стыках блоков (полос быть не должно)
// и финал с ссылками. Нужен `npx vite preview --port 5181`.
import { chromium } from 'playwright';
import sharp from 'sharp';
const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 947 } });
await page.goto('http://127.0.0.1:5181/a.html#prices', { waitUntil: 'load' });
await page.waitForSelector('#contacts', { state: 'attached', timeout: 20000 });
await page.evaluate(() => document.getElementById('prices').scrollIntoView());
await page.waitForTimeout(9000);
const b = await page.evaluate(() => { const r = document.querySelector('.tg-body').getBoundingClientRect(); return { x: r.x, y: r.y + r.height - 330, w: r.width, h: 330 }; });
await page.screenshot({ path: '_shots/tails.png', clip: { x: b.x, y: b.y, width: b.w, height: b.h } });
const shots = [];
for (const id of ['works', 'about', 'prices', 'contacts']) {
  await page.evaluate((id) => { const el = document.getElementById(id); scrollTo(0, el.getBoundingClientRect().top + scrollY - innerHeight / 2); }, id);
  await page.waitForTimeout(1800);
  shots.push(await sharp(await page.screenshot()).resize(640).toBuffer());
}
await page.evaluate(() => document.getElementById('contacts').scrollIntoView());
await page.waitForTimeout(3500);
shots.push(await sharp(await page.screenshot()).resize(640).toBuffer());
await browser.close();
const m = await sharp(shots[0]).metadata();
await sharp({ create: { width: 640 * 3 + 12, height: m.height * 2 + 6, channels: 3, background: '#777' } })
  .composite(shots.map((s, i) => ({ input: s, left: (i % 3) * 646, top: Math.floor(i / 3) * (m.height + 6) })))
  .jpeg({ quality: 85 }).toFile('_shots/seams.jpg');
console.log('ok');
