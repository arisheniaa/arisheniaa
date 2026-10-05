// Снимки приглашения на день рождения для портфолио.
// Источник — локальный файл `Приглашения/sayt/index.html`. Первый кадр —
// закрытый конверт, остальные — после клика по нему (страница открывается
// только так). Ответы гостей уходят лишь по кнопке теста, её не трогаем.
import { chromium } from 'playwright';
import sharp from 'sharp';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

// Картинки в приглашении — абсолютные `/assets/...`, с диска они не грузятся.
// Поэтому папку отдаёт крошечный локальный сервер.
const ROOT = 'C:/Users/Аришения/OneDrive/Рабочий стол/Claude Projects/Приглашения/sayt';
const TYPES = { '.html': 'text/html; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p);
  if (!fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
}).listen(5191, '127.0.0.1');
const OUT = 'public/works';
const url = 'http://127.0.0.1:5191/';

const browser = await chromium.launch();
async function shoot(viewport, name, stops, w) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 2 });
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForTimeout(2000);
  await sharp(await page.screenshot()).resize(w).webp({ quality: 82 }).toFile(`${OUT}/${name}-0.webp`);
  await page.click('#stage');
  await page.waitForTimeout(2600);
  const H = await page.evaluate(() => document.documentElement.scrollHeight);
  console.log(name, 'scrollHeight', H);
  for (let i = 0; i < stops.length; i++) {
    await page.evaluate((y) => window.scrollTo(0, y), Math.round(stops[i] * (H - viewport.height)));
    await page.waitForTimeout(1600);
    await sharp(await page.screenshot()).resize(w).webp({ quality: 82 }).toFile(`${OUT}/${name}-${i + 1}.webp`);
  }
  await page.close();
}
await shoot({ width: 1440, height: 900 }, 'invite-d', [0, 0.25, 0.5, 0.75, 1], 1600);
await shoot({ width: 390, height: 694 }, 'invite-m', [0, 0.25, 0.5, 0.75, 1], 620);
await browser.close();
server.close();
