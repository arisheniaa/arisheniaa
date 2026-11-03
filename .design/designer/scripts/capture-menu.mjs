// Кадры домашнего меню (arisheniaa.ru/menu) для айдентики — её правка
// 3 ноября: «подтяни недавно созданное меню и добавь его в портфолио к
// айдентике». Компьютер: лист раскрыт (`?open=2`) и обратная сторона
// (`?side=out`), 1440×900 ×2 → 1200×750. Телефон: шесть панелей по стрелке
// и панель с карандашным овалом после «выбери за меня», 390×694 ×3 →
// 620×1103. Всё — в _shots/menu-raw/, отбор руками в public/works/menu-*.
// node scripts/capture-menu.mjs
import { chromium } from 'playwright';
import sharp from 'sharp';
import fs from 'node:fs';
const URL = 'https://arisheniaa.ru/menu/';
const RAW = '_shots/menu-raw';
fs.mkdirSync(RAW, { recursive: true });
const browser = await chromium.launch();
const shot = async (page, name, w) => sharp(await page.screenshot()).resize(w).webp({ quality: 86 }).toFile(`${RAW}/${name}.webp`);

const desk = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
for (const [q, name] of [['', 'd-cover'], ['?open=1', 'd-half'], ['?open=2', 'd-open'], ['?side=out', 'd-out']]) {
  await desk.goto(URL + q, { waitUntil: 'networkidle' });
  await desk.waitForTimeout(2500);
  await shot(desk, name, 1200);
}
await desk.close();

const phone = await browser.newPage({ viewport: { width: 390, height: 694 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
await phone.goto(URL, { waitUntil: 'networkidle' });
await phone.waitForTimeout(2500);
for (let i = 0; i < 6; i++) {
  await shot(phone, `m-${i}`, 620);
  await phone.keyboard.press('ArrowRight');
  await phone.waitForTimeout(1400);
}
// карандашный овал: назад к «горячему» и «выбери за меня»
for (let i = 0; i < 6; i++) { await phone.keyboard.press('ArrowLeft'); await phone.waitForTimeout(500); }
await phone.keyboard.press('ArrowRight'); await phone.waitForTimeout(900);
await phone.keyboard.press('ArrowRight'); await phone.waitForTimeout(1400);
await phone.evaluate(() => [...document.querySelectorAll('.pick')].find((b) => b.getBoundingClientRect().left >= 0 && b.getBoundingClientRect().right <= innerWidth)?.click());
await phone.waitForTimeout(3500);
await shot(phone, 'm-pick', 620);
await phone.close();
await browser.close();
console.log(fs.readdirSync(RAW).join(' '));
