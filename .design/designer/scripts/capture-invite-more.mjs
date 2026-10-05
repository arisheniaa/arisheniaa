// Дополнительные кадры приглашения (её правка «добавь ещё скринов с
// приглашения») — в том же формате, что её скриншоты с айфона: экран
// 390×650 при ×3 (1170×1950), ужатые до 620 по ширине, как invite-m-*.
// Снимается «дежурная» копия без имён и мест (public/invite/m.html), по
// кадру на каждый смысловой блок. Нужен `vite preview` на 5181.
// node scripts/capture-invite-more.mjs
import { chromium } from 'playwright';
import sharp from 'sharp';
import fs from 'node:fs';
const RAW = '_shots/invite-raw';
fs.mkdirSync(RAW, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 650 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
await page.goto('http://127.0.0.1:5181/invite/m.html', { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);
const save = async (name) => sharp(await page.screenshot()).resize(620).webp({ quality: 86 }).toFile(`${RAW}/${name}.webp`);
await save('00-konvert');
await page.click('#stage');
await page.waitForTimeout(2800);
const stops = await page.evaluate(() => {
  const at = (sel, k = 0) => { const e = document.querySelector(sel); return e ? Math.round(e.getBoundingClientRect().top + scrollY + k) : null; };
  return {
    '01-shapka': 0,
    '02-kalendar': at('.kalendar', -260),
    '03-gde': at('.gde-kogda', -20),
    '04-dress': at('.dress-kod', -10),
    '05-dress-dop': at('#dressDop', -380),
    '06-cvety': at('.cvety-tekst', -420),
    '07-test': at('.test', 0),
    '07b-quiz': at('#quiz', -120),
    '08-vishlist': at('.vishlist', -40),
    '09-foot': at('.foot', -300),
  };
});
for (const [name, y] of Object.entries(stops)) {
  if (y == null) continue;
  await page.evaluate((v) => scrollTo(0, Math.max(0, v)), y);
  await page.waitForTimeout(1200);
  await save(name);
}
await browser.close();
console.log('ok', Object.keys(stops).length + 1);
