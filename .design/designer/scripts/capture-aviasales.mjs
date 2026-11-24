// Кадры инициативного спецпроекта «Развлечения на борту» (arisheniaa.ru/aviasales)
// для айдентики (ее правка 24 ноября: «добавь проект в айдентику»).
// Компьютер 1440×900 ×2 → 1200×750, телефон 390×694 ×3 → 620×1103.
// Табло «Пристегните ремни» на кадрах спрятано. Снимает первый экран и каждую игру в результате: тест, посадочный, объяснительную,
// кошку под фонариком. Все в _shots/av-raw/, отбор руками в public/works/av-*.
// node scripts/capture-aviasales.mjs
import { chromium } from 'playwright';
import sharp from 'sharp';
import fs from 'node:fs';
const URL = 'https://arisheniaa.ru/aviasales/';
const RAW = '_shots/av-raw';
fs.mkdirSync(RAW, { recursive: true });
const browser = await chromium.launch();
const shot = async (page, name, w) => sharp(await page.screenshot()).resize(w).webp({ quality: 86 }).toFile(`${RAW}/${name}.webp`);
const top = (page, sel, off = 12) => page.evaluate(([s, o]) => { const el = document.querySelector(s); scrollTo(0, el.getBoundingClientRect().top + scrollY - o); }, [sel, off]);

async function run(page, p, w) {
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.addStyleTag({ content: '.shake-hint,.belt{display:none!important}' });
  await page.waitForTimeout(1500);
  await shot(page, `${p}-hero`, w);

  // тест: отвечаем до результата
  for (let i = 0; i < 20; i++) {
    const b = page.locator('#test .answer').first();
    if (!(await b.count())) break;
    await b.click(); await page.waitForTimeout(450);
  }
  await page.waitForTimeout(800);
  await top(page, '#test .share-card, #test .result, #test-title');
  await page.waitForTimeout(600);
  await shot(page, `${p}-quiz`, w);
  await top(page, '#test-title');
  await page.waitForTimeout(400);
  await shot(page, `${p}-quiz-top`, w);

  // курица или рыба: выбираем до посадочного
  for (let i = 0; i < 20; i++) {
    const b = page.locator('#chicken .tray').first();
    if (!(await b.count())) break;
    await b.click(); await page.waitForTimeout(500);
  }
  await page.waitForTimeout(1200);
  await top(page, '#chicken .bp');
  await page.waitForTimeout(600);
  await shot(page, `${p}-pass`, w);
  await top(page, '#chicken-title');
  await page.waitForTimeout(400);
  await shot(page, `${p}-pass-top`, w);

  // объяснительная
  await top(page, '#excuse-title');
  await page.click('#ex-spin');
  await page.waitForTimeout(4500);
  await shot(page, `${p}-excuse`, w);
  await top(page, '#memo', 20);
  await page.waitForTimeout(400);
  await shot(page, `${p}-excuse-2`, w);

  // кошка: включаем фонарик и наводим его рядом с кошкой
  await top(page, '#cat-title');
  await page.click('#cat-go');
  await top(page, '#cat-title');
  await page.waitForTimeout(800);
  await page.evaluate(() => {
    const st = document.getElementById('cat-stage'), r = st.getBoundingClientRect(), c = document.getElementById('cat-sprite').getBoundingClientRect();
    st.style.setProperty('--x', (c.left + c.right) / 2 - r.left + c.width * .2 + 'px');
    st.style.setProperty('--y', (c.top + c.bottom) / 2 - r.top + 'px');
  });
  await page.waitForTimeout(1500);
  await shot(page, `${p}-cat`, w);
  await top(page, '#cat-stage', 80);
  await page.waitForTimeout(600);
  await shot(page, `${p}-cat-2`, w);
}

const desk = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
await run(desk, 'd', 1200);
await desk.close();
const phone = await browser.newPage({ viewport: { width: 390, height: 694 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
await run(phone, 'm', 620);
await phone.close();
await browser.close();
console.log(fs.readdirSync(RAW).join(' '));
