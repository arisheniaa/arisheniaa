/**
 * Пробник гротесков на РУССКОМ боевом тексте (правило typography-ru.md:
 * латинская панграмма не доказывает ничего). Строки взяты из COPY.md ред. 6:
 * H1, гео, лид, цена — то есть ровно то, что встанет в макет.
 *
 * Запуск из корня проекта: node .design/hybrid/scripts/font-proof.mjs
 * Кладёт .design/hybrid/shots/font-proof.png
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const OUT = path.join(ROOT, 'shots');
fs.mkdirSync(OUT, { recursive: true });

const FONTS = [
  ['Onest', 'onest/files/onest-cyrillic-wght-normal.woff2'],
  ['Unbounded', 'unbounded/files/unbounded-cyrillic-wght-normal.woff2'],
  ['Geologica', 'geologica/files/geologica-cyrillic-full-normal.woff2'],
  ['Manrope', 'manrope/files/manrope-cyrillic-wght-normal.woff2'],
  ['GolosText', 'golos-text/files/golos-text-cyrillic-wght-normal.woff2'],
];

const faces = FONTS.map(([name, rel]) => {
  const file = path.join(ROOT, 'node_modules/@fontsource-variable', rel);
  if (!fs.existsSync(file)) throw new Error('нет файла: ' + file);
  const b64 = fs.readFileSync(file).toString('base64');
  return `@font-face{font-family:'${name}';font-weight:100 900;font-display:block;
    src:url(data:font/woff2;base64,${b64}) format('woff2');}`;
}).join('\n');

const rows = FONTS.map(([name]) => `
  <section style="font-family:'${name}'">
    <p class="tag">${name}</p>
    <h1>Создаю ваше кино</h1>
    <p class="lead">Снимаю на цифру и на плёнку. Мандарин над снегом придумывается
      заранее, туман над полем&nbsp;— просто ждётся.</p>
    <p class="body">Придумано заранее · Найдено на месте · Помогу подготовиться
      к&nbsp;съёмке · 8&nbsp;000&nbsp;₽ за съёмку в&nbsp;Москве · щ ъ ы ж д з я ё Й Ц У</p>
  </section>`).join('');

const html = `<!doctype html><html lang="ru"><meta charset="utf-8"><style>
${faces}
body{margin:0;background:#EFE9D6;color:#14140F;padding:34px 40px 40px}
section{margin-bottom:26px;border-top:1px solid #14140f22;padding-top:12px}
.tag{font:600 11px/1 ui-monospace,monospace;letter-spacing:.14em;text-transform:uppercase;
  color:#7c7a6c;margin:0 0 8px}
h1{font-size:64px;font-weight:800;line-height:.94;letter-spacing:-.03em;margin:0 0 10px}
.lead{font-size:20px;font-weight:400;line-height:1.4;letter-spacing:-.008em;margin:0 0 8px;max-width:32em}
.body{font-size:16px;font-weight:400;line-height:1.55;margin:0;color:#45443a}
</style>${rows}</html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1100, height: 1600 }, deviceScaleFactor: 2 });
await page.setContent(html, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(400);
await page.screenshot({ path: path.join(OUT, 'font-proof.png'), fullPage: true });
await browser.close();
console.log('font-proof.png');
