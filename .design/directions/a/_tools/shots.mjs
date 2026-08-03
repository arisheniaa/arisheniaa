import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = path.resolve(fileURLToPath(new URL('../shots', import.meta.url)));
fs.mkdirSync(OUT, { recursive: true });
const URL_ = 'http://localhost:5173/';
const widths = [390, 768, 1280, 1920];

const b = await chromium.launch();

for (const w of widths) {
  const p = await b.newPage({ viewport: { width: w, height: w === 390 ? 844 : 900 }, deviceScaleFactor: 1 });
  await p.goto(URL_, { waitUntil: 'networkidle' });
  await p.waitForTimeout(900);
  await p.screenshot({ path: `${OUT}/${w}-01-hero.png` });
  // прокрутить в реестр и дать плашкам приехать
  await p.mouse.wheel(0, w === 390 ? 1500 : 1400);
  await p.waitForTimeout(1400);
  await p.screenshot({ path: `${OUT}/${w}-02-offer.png` });
  await p.mouse.wheel(0, 1400);
  await p.waitForTimeout(1400);
  await p.screenshot({ path: `${OUT}/${w}-03-offer-end.png` });
  await p.close();
}

// кадр перехода имени: середина морфинга
{
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  await p.goto(URL_, { waitUntil: 'networkidle' });
  await p.waitForTimeout(700);
  await p.mouse.move(640, 400); // первый признак присутствия → триггер
  await p.waitForTimeout(260 + 170); // 260 мс пауза + ~половина 340 мс
  await p.screenshot({ path: `${OUT}/1280-04-name-mid.png` });
  await p.waitForTimeout(700);
  await p.screenshot({ path: `${OUT}/1280-05-name-after.png` });
  await p.close();
}

// кадр звёзд под курсором
{
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  await p.goto(URL_, { waitUntil: 'networkidle' });
  await p.waitForTimeout(600);
  for (let i = 0; i < 24; i++) {
    await p.mouse.move(300 + i * 22, 620 - i * 6);
    await p.waitForTimeout(16);
  }
  await p.waitForTimeout(120);
  await p.screenshot({ path: `${OUT}/1280-06-stars-cursor.png` });
  await p.close();
}

// reduced-motion: контент не теряется
{
  const p = await b.newPage({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
  await p.goto(URL_, { waitUntil: 'networkidle' });
  await p.waitForTimeout(700);
  await p.screenshot({ path: `${OUT}/1280-07-reduced-motion.png` });
  await p.mouse.wheel(0, 1400);
  await p.waitForTimeout(500);
  await p.screenshot({ path: `${OUT}/1280-08-reduced-offer.png` });
  await p.close();
}

await b.close();
console.log('ok', fs.readdirSync(OUT).length, 'shots');
