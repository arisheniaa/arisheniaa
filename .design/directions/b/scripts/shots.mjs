// Съёмка доказательств направления B. Playwright из корня проекта.
// Запуск:  node .design/directions/b/scripts/shots.mjs [only]
//   only = 390 | 768 | 1280 | 1920 | name | stars | rack | rm   (по умолчанию всё)
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../shots');
fs.mkdirSync(OUT, { recursive: true });
const URL_ = 'http://127.0.0.1:5174/';
const only = process.argv[2] || '';
const want = (k) => !only || only === k;

const widths = [
  { w: 390, h: 844, name: '390', mobile: true },
  { w: 768, h: 1024, name: '768', mobile: false },
  { w: 1280, h: 900, name: '1280', mobile: false },
  { w: 1920, h: 1080, name: '1920', mobile: false },
];

/** Вход по IntersectionObserver: полностраничный снимок без прохода по странице
 *  поймал бы половину зон нерезкими и наврал бы. Проходим страницу до конца. */
async function walk(page) {
  const h = await page.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y < h; y += 400) {
    await page.evaluate((py) => window.scrollTo(0, py), y);
    await page.waitForTimeout(80);
  }
  await page.waitForTimeout(900);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(700);
}

const browser = await chromium.launch();
const ctxOpts = (w, h, mobile, extra = {}) => ({
  viewport: { width: w, height: h },
  deviceScaleFactor: 2,
  hasTouch: mobile,
  isMobile: mobile,
  locale: 'ru-RU',
  ...extra,
});

for (const { w, h, name, mobile } of widths) {
  if (!want(name)) continue;
  const ctx = await browser.newContext(ctxOpts(w, h, mobile));
  const page = await ctx.newPage();
  await page.goto(URL_, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}/${name}-hero.png` });

  await walk(page);
  await page.screenshot({ path: `${OUT}/${name}-full.png`, fullPage: true });

  // плотная секция цен — главная проверка направления
  for (const [sel, tag] of [['#offer', 'offer']]) {
    const top = await page.evaluate(
      (s) => window.scrollY + document.querySelector(s).getBoundingClientRect().top,
      sel,
    );
    await page.evaluate((y) => window.scrollTo(0, y), top);
    await page.waitForTimeout(900);
    await page.locator(sel).screenshot({ path: `${OUT}/${name}-${tag}.png` });
  }
  await ctx.close();
  console.log(name, 'ok');
}

/* ---- имя: три стадии перехода. ?morph=mid растягивает время в 26 раз ---- */
if (want('name')) {
  const ctx = await browser.newContext(ctxOpts(900, 300, false, { deviceScaleFactor: 3 }));
  const page = await ctx.newPage();
  await page.goto(URL_ + '?morph=mid', { waitUntil: 'networkidle' });
  const clip = { x: 30, y: 12, width: 460, height: 78 };
  await page.waitForTimeout(60);
  await page.screenshot({ path: `${OUT}/name-01-latin.png`, clip });
  await page.waitForTimeout(4200);
  await page.screenshot({ path: `${OUT}/name-02-mid.png`, clip });
  await page.waitForTimeout(9000);
  await page.screenshot({ path: `${OUT}/name-03-cyrillic.png`, clip });
  await ctx.close();
  console.log('name ok');
}

/* ---- звёзды: покой и под курсором ---- */
if (want('stars')) {
  const ctx = await browser.newContext(ctxOpts(1280, 900, false));
  const page = await ctx.newPage();
  await page.goto(URL_, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1400);
  /* Курсор ведём НЕ куда попало: россыпь детерминирована по seed, поэтому
     точка (760, 400) выбрана так, что в её радиусе 180 px оказываются сразу
     три звезды. Прошлый прогон гнал курсор по пустому месту, и два кадра
     выходили идентичными — доказательство, которое ничего не доказывает. */
  const clip = { x: 700, y: 280, width: 470, height: 340 };
  await page.screenshot({ path: `${OUT}/stars-01-rest.png`, clip });
  for (let i = 0; i <= 20; i++) {
    await page.mouse.move(600 + i * 14, 250 + i * 11);
    await page.waitForTimeout(26);
  }
  await page.mouse.move(880, 470); // в 55 px от самой крупной звезды россыпи
  await page.waitForTimeout(420);
  await page.screenshot({ path: `${OUT}/stars-02-cursor.png`, clip });
  await ctx.close();
  console.log('stars ok');
}

/* ---- рэк: покой, середина жеста, после переворота. Тач-ввод, 390 px ---- */
if (want('rack')) {
  const ctx = await browser.newContext(ctxOpts(390, 844, true));
  const page = await ctx.newPage();
  await page.goto(URL_, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1400);
  const box = await page.locator('.rack-stack').boundingBox();
  const clip = {
    x: Math.max(0, box.x - 24),
    y: Math.max(0, box.y - 18),
    width: Math.min(390, box.width + 60),
    height: box.height + 76,
  };
  await page.screenshot({ path: `${OUT}/rack-01-rest.png`, clip });

  // середина жеста — фиксированный кадр через ?rack=
  const page2 = await ctx.newPage();
  await page2.goto(URL_ + '?rack=-118', { waitUntil: 'networkidle' });
  await page2.waitForTimeout(1000);
  await page2.screenshot({ path: `${OUT}/rack-02-held.png`, clip });
  await page2.close();

  // бросок пальцем и состояние после переворота
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  await page.touchscreen.tap(cx, cy);
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  for (let i = 1; i <= 8; i++) {
    await page.mouse.move(cx - i * 22, cy - i * 2);
    await page.waitForTimeout(16);
  }
  await page.mouse.up();
  await page.waitForTimeout(1400);
  await page.screenshot({ path: `${OUT}/rack-03-flipped.png`, clip });
  await page.screenshot({ path: `${OUT}/rack-04-hero-after-flip.png` });
  await ctx.close();
  console.log('rack ok');
}

/* ---- кириллица живьём: «д з к ъ я ж щ» в реальных словах страницы ---- */
if (want('type')) {
  const sharp = (await import('sharp')).default;
  const ctx = await browser.newContext(ctxOpts(1280, 900, false, { deviceScaleFactor: 3 }));
  const page = await ctx.newPage();
  await page.goto(URL_, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  // «затеи» (з), «ждётся» (ж, д), «съёмки» (ъ, к)
  const a = await page.screenshot({ clip: { x: 40, y: 150, width: 1180, height: 700 } });
  // «ещё» (щ), «обязывает» (я)
  const cta = await page.evaluate(
    () => window.scrollY + document.querySelector('#cta').getBoundingClientRect().top,
  );
  await page.evaluate((y) => window.scrollTo(0, y), cta);
  await page.waitForTimeout(1000);
  const b2 = await page.screenshot({ clip: { x: 300, y: 120, width: 680, height: 420 } });
  const ma = await sharp(a).metadata();
  const mb = await sharp(b2).metadata();
  await sharp({
    create: {
      width: Math.max(ma.width, mb.width),
      height: ma.height + mb.height + 24,
      channels: 3,
      background: '#f2efe4',
    },
  })
    .composite([
      { input: a, left: 0, top: 0 },
      { input: b2, left: 0, top: ma.height + 24 },
    ])
    .png()
    .toFile(`${OUT}/type-cyrillic.png`);
  await ctx.close();
  console.log('type ok');
}

/* ---- prefers-reduced-motion: движения нет, контент цел ---- */
if (want('rm')) {
  const ctx = await browser.newContext(ctxOpts(1280, 900, false, { reducedMotion: 'reduce' }));
  const page = await ctx.newPage();
  await page.goto(URL_, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1400);
  await page.screenshot({ path: `${OUT}/reduced-motion-hero.png` });
  await page.screenshot({ path: `${OUT}/reduced-motion-full.png`, fullPage: true });
  await ctx.close();
  console.log('rm ok');
}

await browser.close();
console.log('shots:', fs.readdirSync(OUT).length);
