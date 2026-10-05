// Обе сборки под заголовками сервера (server/Caddyfile): корень — сайт
// дизайнера, /ph/ — фото-сайт, CSP и X-Frame-Options те же, включая
// исключение для /invite/m.html. Ловит нарушения CSP в консоли, проверяет,
// что приглашение на компьютере открывается в рамке, а услуги — по нажатию.
// Перед запуском: `npm run build` здесь и в ../hybrid.
// node scripts/csp-check.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const ROOT = path.resolve('dist');
const PH = path.resolve('../hybrid/dist');
const CSP = (fa) => `default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' blob:; worker-src 'self' blob:; frame-ancestors ${fa}; base-uri 'self'; form-action 'self'`;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.woff': 'font/woff', '.xml': 'application/xml', '.txt': 'text/plain', '.hdr': 'application/octet-stream' };

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/ph') { res.writeHead(301, { location: '/ph/' }); return res.end(); }
  const base = p.startsWith('/ph/') ? PH : ROOT;
  if (p.startsWith('/ph/')) p = p.slice(3);
  if (p.endsWith('/')) p += 'index.html';
  const f = path.join(base, p);
  const framable = req.url.split('?')[0] === '/invite/m.html';
  const h = {
    'Content-Security-Policy': CSP(framable ? "'self'" : "'none'"),
    'X-Frame-Options': framable ? 'SAMEORIGIN' : 'DENY',
    'X-Content-Type-Options': 'nosniff',
  };
  if (!f.startsWith(base) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404, h); return res.end('404'); }
  res.writeHead(200, { ...h, 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
}).listen(5195, '127.0.0.1');

const B = 'http://127.0.0.1:5195';
const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu'] });
const problems = [];
const watch = (page, label) => {
  page.on('console', (m) => { if (m.type() === 'error' || /Content Security Policy|Refused/.test(m.text())) problems.push(`${label}: ${m.text().slice(0, 200)}`); });
  page.on('pageerror', (e) => problems.push(`${label}: ${String(e).slice(0, 200)}`));
  page.on('response', (r) => { if (r.status() >= 400) problems.push(`${label}: ${r.status()} ${r.url()}`); });
};

// 1. Главная: первый экран, прокрутка до конца, услуги, скрин крупно.
let page = await browser.newPage({ viewport: { width: 1536, height: 730 } });
watch(page, 'главная');
await page.goto(B + '/', { waitUntil: 'load' });
await page.waitForTimeout(1500);
for (let y = 0; y < 12000; y += 600) { await page.evaluate((v) => scrollTo(0, v), y); await page.waitForTimeout(120); }
await page.evaluate(() => document.getElementById('works').scrollIntoView());
await page.waitForTimeout(2500);
await page.locator('.svc-col').nth(0).click();
await page.waitForTimeout(1500);
await page.locator('.svc-over .p-btn img').first().click();
await page.waitForTimeout(1000);
const cap = await page.evaluate(() => !!document.querySelector('.lb-cap'));
await page.close();

// 2. Приглашение на компьютере — в рамке.
page = await browser.newPage({ viewport: { width: 1536, height: 730 } });
watch(page, 'приглашение');
await page.goto(B + '/invite/', { waitUntil: 'load' });
await page.waitForTimeout(2500);
const fr = page.frames().find((f) => f.url().endsWith('/invite/m.html'));
const inFrame = fr ? await fr.evaluate(() => !!document.getElementById('stage') && getComputedStyle(document.body).fontFamily) : null;
const fontOk = fr ? await fr.evaluate(async () => { await document.fonts.ready; return document.fonts.check('16px "Golos Text"'); }) : false;
await page.close();

// 3. Фото-сайт под /ph/.
page = await browser.newPage({ viewport: { width: 1536, height: 730 } });
watch(page, '/ph/');
await page.goto(B + '/ph/', { waitUntil: 'load' });
await page.waitForTimeout(2000);
const phTitle = await page.title();
await page.goto(B + '/ph/storyboard.html', { waitUntil: 'load' });
await page.waitForTimeout(1500);
await page.close();

await browser.close();
server.close();
console.log(JSON.stringify({ подписьСкрина: cap, приглашениеВРамке: inFrame, шрифтGolos: fontOk, ph: phTitle }, null, 1));
console.log(problems.length ? 'ПРОБЛЕМЫ:\n' + [...new Set(problems)].join('\n') : 'проблем нет: ни нарушений CSP, ни ошибок, ни 404');
