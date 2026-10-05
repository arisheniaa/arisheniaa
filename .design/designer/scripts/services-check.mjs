// Проверка блока услуг: три колонки → услуга на весь экран → скрин крупно
// с подписью → крестик (назад к услуге) → крестик (назад к колонкам), плюс
// Esc. Компьютер (Full HD при 100 % и 125 %) и телефон.
// Нужен `vite preview` на 5181. node scripts/services-check.mjs
import { chromium } from 'playwright';
import sharp from 'sharp';
const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const rows = [];
const errors = [];
for (const [w, h, dpr] of [[1920, 947, 1], [1536, 730, 1], [390, 844, 2]]) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: dpr });
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('http://127.0.0.1:5181/a.html#works', { waitUntil: 'load' });
  await page.waitForSelector('.svc-col', { timeout: 20000 });
  await page.evaluate(() => document.getElementById('works').scrollIntoView());
  await page.waitForTimeout(3500);
  const shot = async () => sharp(await page.screenshot()).resize(w < 768 ? 260 : 640).toBuffer();
  const row = [await shot()];
  const fits = await page.evaluate(() => { const r = document.querySelector('.svc-grid').getBoundingClientRect(); return { bottom: Math.round(r.bottom), vh: innerHeight }; });
  await page.locator('.svc-col').nth(0).click();
  await page.waitForTimeout(450);
  row.push(await shot()); // середина раскрытия
  await page.waitForTimeout(1600);
  row.push(await shot());
  await page.locator('.svc-over .p-btn img').first().click();
  await page.waitForTimeout(1300);
  row.push(await shot());
  const cap = await page.evaluate(() => document.querySelector('.lb-cap')?.innerText.replace(/\s+/g, ' '));
  await page.locator('.lb-close').click();
  await page.waitForTimeout(900);
  const s1 = await page.evaluate(() => ({ lb: !!document.querySelector('.lb'), over: !!document.querySelector('.svc-over') }));
  await page.locator('.svc-close').click();
  await page.waitForTimeout(1300);
  const s2 = await page.evaluate(() => ({ over: !!document.querySelector('.svc-over'), scroll: getComputedStyle(document.documentElement).overflow }));
  // Esc по шагам: услуга 3 → скрин → Esc → Esc
  await page.locator('.svc-col').nth(2).click();
  await page.waitForTimeout(1600);
  row.push(await shot());
  await page.locator('.svc-over .p-btn img').first().click();
  await page.waitForTimeout(1000);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(800);
  const e1 = await page.evaluate(() => ({ lb: !!document.querySelector('.lb'), over: !!document.querySelector('.svc-over') }));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(1300);
  const e2 = await page.evaluate(() => !!document.querySelector('.svc-over'));
  await page.locator('.svc-col').nth(1).click();
  await page.waitForTimeout(1600);
  row.push(await shot());
  console.log(w, h, JSON.stringify({ fits, cap, afterX1: s1, afterX2: s2, esc1: e1, esc2over: e2 }));
  rows.push(row);
  await page.close();
}
await browser.close();
console.log('ошибки:', errors.length ? errors : 'нет');
const ms = await Promise.all(rows.map((r) => sharp(r[0]).metadata()));
const Wd = Math.max(...rows.map((r, i) => r.length * (ms[i].width + 6)));
const Hd = ms.reduce((a, m) => a + m.height + 6, 0);
let y = 0;
const comp = [];
rows.forEach((r, i) => { r.forEach((b, j) => comp.push({ input: b, left: j * (ms[i].width + 6), top: y })); y += ms[i].height + 6; });
await sharp({ create: { width: Wd, height: Hd, channels: 3, background: '#777' } }).composite(comp).jpeg({ quality: 85 }).toFile('_shots/services.jpg');
console.log('ok');
