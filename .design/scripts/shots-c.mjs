import { chromium } from 'playwright';
import fs from 'fs';

const OUT = 'C:/Users/Аришения/OneDrive/Рабочий стол/Claude Projects/Мой сайт/.design/directions/c/shots';
fs.mkdirSync(OUT, { recursive: true });
const URL = 'http://127.0.0.1:5175/';

const widths = [
  { w: 390,  h: 844,  name: '390',  mobile: true },
  { w: 768,  h: 1024, name: '768',  mobile: false },
  { w: 1280, h: 900,  name: '1280', mobile: false },
  { w: 1920, h: 1080, name: '1920', mobile: false },
];

/** ScrollTrigger раскрывает элементы по прокрутке. Полностраничный снимок
 *  без прохода по странице ловит их в стартовом состоянии и врёт. */
/** Lenis держит свою цель прокрутки: window.scrollTo он отматывает назад
 *  на следующем кадре. Поэтому прыгаем через его же API (ручка __lenis
 *  выставлена только в dev), с падением на нативный scrollTo. */
const jump = (page, y) =>
  page.evaluate((py) => {
    const l = window.__lenis;
    if (l) l.scrollTo(py, { immediate: true, force: true });
    else window.scrollTo(0, py);
  }, y);

async function walk(page) {
  const h = await page.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y < h; y += 420) {
    await jump(page, y);
    await page.waitForTimeout(90);
  }
  await page.waitForTimeout(700);
  await jump(page, 0);
  await page.waitForTimeout(700);
}

const browser = await chromium.launch();

for (const { w, h, name, mobile } of widths) {
  const ctx = await browser.newContext({
    viewport: { width: w, height: h },
    deviceScaleFactor: 2, hasTouch: mobile, isMobile: mobile, locale: 'ru-RU',
  });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2600); // морфинг отработал: 1400 мс + 340 + шлейф 224
  await page.screenshot({ path: `${OUT}/${name}-hero.png` });

  await walk(page);
  await page.screenshot({ path: `${OUT}/${name}-full.png`, fullPage: true });

  // плотная секция на каждой ширине — она главная проверка направления
  const offerTop = await page.evaluate(
    () => window.scrollY + document.querySelector('#offer').getBoundingClientRect().top
  );
  await jump(page, offerTop);
  await page.waitForTimeout(1100);
  await page.locator('#offer').screenshot({ path: `${OUT}/${name}-offer.png` });

  // сцена регистров: три фазы на каждой ширине
  const dist = w >= 768 ? 1800 : 1100;
  /* Пинованная секция едет внутри своего pin-spacer: её собственный rect
     врёт, если мерить из уже прокрученного положения. Мерим от нуля и
     берём спейсер — его верх и есть начало сцены. */
  await jump(page, 0);
  await page.waitForTimeout(500);
  const sceneTop = await page.evaluate(() => {
    const el = document.querySelector('[data-scene]');
    const box = el.parentElement?.classList.contains('pin-spacer') ? el.parentElement : el;
    return window.scrollY + box.getBoundingClientRect().top;
  });
  const phases = [0.08, 0.5, 0.92];
  for (let i = 0; i < phases.length; i++) {
    await jump(page, sceneTop + dist * phases[i]);
    await page.waitForTimeout(950);
    await page.screenshot({ path: `${OUT}/${name}-scene-${i + 1}.png` });
  }
  await ctx.close();
}

/* ---- имя: три стадии перехода ---- */
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 400 }, deviceScaleFactor: 3, locale: 'ru-RU' });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: 'networkidle' });
  const clip = { x: 60, y: 20, width: 440, height: 70 };
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/name-01-latin.png`, clip });      // до
  await page.waitForTimeout(1230);
  await page.screenshot({ path: `${OUT}/name-02-mid.png`, clip });        // в переходе
  await page.waitForTimeout(1400);
  await page.screenshot({ path: `${OUT}/name-03-cyrillic.png`, clip });   // после
  await ctx.close();
}

/* ---- звёзды под курсором: без указателя и с указателем ---- */
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2, locale: 'ru-RU' });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2600);
  const clip = { x: 40, y: 480, width: 700, height: 400 };
  await page.screenshot({ path: `${OUT}/stars-01-rest.png`, clip });
  for (let i = 0; i < 14; i++) { await page.mouse.move(300 + i * 8, 640 + i * 3); await page.waitForTimeout(40); }
  await page.waitForTimeout(320);
  await page.screenshot({ path: `${OUT}/stars-02-cursor.png`, clip });
  await ctx.close();
}

/* ---- reduced motion: движения нет, контент цел ---- */
{
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2,
    reducedMotion: 'reduce', locale: 'ru-RU',
  });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1800);
  await page.screenshot({ path: `${OUT}/reduced-motion-full.png`, fullPage: true });
  await ctx.close();
}

await browser.close();
console.log('shots:', fs.readdirSync(OUT).length);
