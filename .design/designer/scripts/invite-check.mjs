// Проверка «дежурного» приглашения и раздела «Обо мне»: компьютер (рамка
// телефона + пометка), телефон (сразу приглашение, конверт-фото), раскрытие
// конверта. Нужен `vite preview` на 5181.
import { chromium } from 'playwright';
import sharp from 'sharp';
const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const out = [];
const errors = [];
const reqs = [];

let page = await browser.newPage({ viewport: { width: 1920, height: 947 } });
page.on('pageerror', (e) => errors.push(String(e)));
page.on('request', (r) => { if (!r.url().startsWith('http://127.0.0.1') && !/fonts\.(googleapis|gstatic)/.test(r.url())) reqs.push(r.url()); });
await page.goto('http://127.0.0.1:5181/invite/', { waitUntil: 'load' });
await page.waitForTimeout(2500);
out.push(await sharp(await page.screenshot()).resize(960).toBuffer());
const frame = page.frames().find((f) => f.url().endsWith('m.html'));
await frame.click('#stage');
await page.waitForTimeout(2500);
out.push(await sharp(await page.screenshot()).resize(960).toBuffer());
await page.close();

page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto('http://127.0.0.1:5181/invite/', { waitUntil: 'load' });
await page.waitForTimeout(2500);
console.log('телефон:', page.url());
out.push(await sharp(await page.screenshot()).resize(300).toBuffer());
await page.close();

page = await browser.newPage({ viewport: { width: 1920, height: 947 } });
await page.goto('http://127.0.0.1:5181/a.html#about', { waitUntil: 'load' });
await page.waitForSelector('#about', { state: 'attached' });
await page.evaluate(() => document.getElementById('about').scrollIntoView());
await page.waitForTimeout(2500);
out.push(await sharp(await page.screenshot()).resize(960).toBuffer());
await browser.close();

console.log('ошибки:', errors.length ? errors : 'нет', '| чужие запросы:', reqs.length ? reqs : 'нет');
let y = 0;
const metas = await Promise.all(out.map((b) => sharp(b).metadata()));
const Wd = Math.max(...metas.map((m) => m.width));
const Hd = metas.reduce((a, m) => a + m.height + 6, 0);
await sharp({ create: { width: Wd, height: Hd, channels: 3, background: '#777' } })
  .composite(out.map((b, i) => { const r = { input: b, left: 0, top: y }; y += metas[i].height + 6; return r; }))
  .jpeg({ quality: 85 }).toFile('_shots/invite-check.jpg');
console.log('ok');
