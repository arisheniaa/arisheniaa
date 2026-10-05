// Проверка боевого сайта после выкладки: главная (сайт дизайнера), услуги
// и скрин крупно, приглашение в рамке телефона, фото-сайт /ph/, старая
// ссылка /#uslugi → /ph/#uslugi. Ловит нарушения CSP, ошибки и 404.
// node scripts/live-check.mjs [https://arisheniaa.ru]
import { chromium } from 'playwright';
import sharp from 'sharp';
const B = process.argv[2] || 'https://arisheniaa.ru';
const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu'] });
const problems = [];
const shots = [];
const watch = (page, label) => {
  page.on('console', (m) => { if (m.type() === 'error' || /Content Security Policy|Refused/.test(m.text())) problems.push(`${label}: ${m.text().slice(0, 200)}`); });
  page.on('pageerror', (e) => problems.push(`${label}: ${String(e).slice(0, 200)}`));
  page.on('response', (r) => { if (r.status() >= 400) problems.push(`${label}: ${r.status()} ${r.url()}`); });
};
let page = await browser.newPage({ viewport: { width: 1536, height: 730 } });
watch(page, 'главная');
await page.goto(B + '/', { waitUntil: 'load' });
await page.waitForTimeout(2500);
shots.push(await page.screenshot());
for (let y = 0; y < 12000; y += 600) { await page.evaluate((v) => scrollTo(0, v), y); await page.waitForTimeout(120); }
await page.evaluate(() => document.getElementById('works').scrollIntoView());
await page.waitForTimeout(3000);
shots.push(await page.screenshot());
await page.locator('.svc-col').nth(0).click();
await page.waitForTimeout(1800);
shots.push(await page.screenshot());
await page.locator('.svc-over .p-btn img').first().click();
await page.waitForTimeout(1200);
const cap = await page.evaluate(() => document.querySelector('.lb-cap')?.innerText.replace(/\s+/g, ' '));
await page.close();

page = await browser.newPage({ viewport: { width: 1536, height: 730 } });
watch(page, 'приглашение');
await page.goto(B + '/invite/', { waitUntil: 'load' });
await page.waitForTimeout(3000);
const fr = page.frames().find((f) => f.url().endsWith('/invite/m.html'));
const inFrame = fr ? await fr.evaluate(() => !!document.getElementById('stage')) : false;
shots.push(await page.screenshot());
await page.close();

page = await browser.newPage({ viewport: { width: 1536, height: 730 } });
watch(page, '/ph/');
await page.goto(B + '/ph/', { waitUntil: 'load' });
await page.waitForTimeout(2500);
shots.push(await page.screenshot());
await page.goto(B + '/#uslugi', { waitUntil: 'load' });
await page.waitForTimeout(2500);
const old = page.url();
await page.close();
await browser.close();

const bufs = await Promise.all(shots.map((s) => sharp(s).resize(640).toBuffer()));
const m = await sharp(bufs[0]).metadata();
await sharp({ create: { width: 646 * bufs.length, height: m.height, channels: 3, background: '#777' } })
  .composite(bufs.map((b, i) => ({ input: b, left: i * 646, top: 0 }))).jpeg({ quality: 85 }).toFile('_shots/live.jpg');
console.log(JSON.stringify({ подпись: cap, приглашениеВРамке: inFrame, старая_ссылка: old }, null, 1));
console.log(problems.length ? 'ПРОБЛЕМЫ:\n' + [...new Set(problems)].join('\n') : 'проблем нет');
