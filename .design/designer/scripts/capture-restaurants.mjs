// Кадры редизайнов ресторанов для услуги «Многостраничник для компании» —
// её правка «пока временно также подтяни скрины с сайтов ресторанов,
// редизайны которых мы делали». Источник — витрина концепций
// `Claude Projects/Редизайн сайтов/showcase`: у каждого ресторана три
// направления (a/b/c). Берутся два — основное (первый экран и меню) и
// второе (первый экран), — чтобы было видно и размах, и страницы.
//
// Плашка макета «Концепция для … · не для публикации» на кадрах скрыта;
// что это концепция, сказано в подписи к скрину (works.ts).
//
// Формат — как у остальных кадров: ноутбук 1440×900 ×2 → 1200×750,
// телефон 390×694 ×3 → 620×1103 (webp 84).
// node scripts/capture-restaurants.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import sharp from 'sharp';

/* Папка «Claude Projects» — первая сверху, где лежит «Редизайн сайтов»
   (скрипт запускают и из основной копии, и из рабочих веток в .claude). */
let up = path.resolve('.');
while (!fs.existsSync(path.join(up, 'Редизайн сайтов')) && path.dirname(up) !== up) up = path.dirname(up);
const ROOT = path.join(up, 'Редизайн сайтов/showcase');
const OUT = 'public/works';
/* ресторан → [папка витрины, основное направление, второе] */
const RESTAURANTS = [
  ['chere-maman', 'chere-maman-7fd82df95c0a', 'c', 'a'],
  ['zhivago', 'dr-zhivago-4d5f58e1b4e2', 'c', 'a'],
  ['myaso-ryba', 'myaso-ryba-50ebfa454ecf', 'b', 'c'],
  ['probka', 'probka-68fda4dfb087', 'c', 'b'],
  ['uzbekistan', 'uzbekistan-3b779619dba3', 'a', 'b'],
];

const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.avif': 'image/avif', '.woff2': 'font/woff2', '.woff': 'font/woff', '.json': 'application/json' };
const srv = http
  .createServer((q, r) => {
    let p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]));
    if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, 'index.html');
    if (!fs.existsSync(p)) return r.writeHead(404).end();
    r.writeHead(200, { 'content-type': TYPES[path.extname(p).toLowerCase()] || 'application/octet-stream' });
    fs.createReadStream(p).pipe(r);
  })
  .listen(5191);

const browser = await chromium.launch();
const kinds = [
  { suffix: '', ctx: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 }, w: 1200 },
  { suffix: '-m', ctx: { viewport: { width: 390, height: 694 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true }, w: 620 },
];
for (const k of kinds) {
  const page = await browser.newPage(k.ctx);
  for (const [id, dir, main, second] of RESTAURANTS) {
    for (const [v, file, tag] of [[main, '', ''], [second, '', ''], [main, 'menu.html', '-menu']]) {
      await page.goto(`http://127.0.0.1:5191/${dir}/variants/${v}/${file}`, { waitUntil: 'networkidle', timeout: 60000 });
      await page.evaluate(() => {
        for (const el of document.querySelectorAll('[class*="watermark"]')) {
          if ([...el.classList].some((c) => c.endsWith('-has-watermark'))) el.classList.forEach((c) => c.endsWith('-has-watermark') && el.classList.remove(c));
          else el.remove();
        }
      });
      await page.waitForTimeout(1500);
      const name = `rest-${id}-${v}${tag}${k.suffix}`;
      await sharp(await page.screenshot()).resize(k.w).webp({ quality: 84 }).toFile(`${OUT}/${name}.webp`);
      console.log(name);
    }
  }
  await page.close();
}
await browser.close();
srv.close();
