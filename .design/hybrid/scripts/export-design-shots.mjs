/**
 * СКРИНШОТЫ ДЛЯ СТРАНИЦЫ «ДИЗАЙН» (Ф67, /design.html).
 *
 * Портфолио показывает три сайта, и все три кадра снимаются отсюда, а не
 * собираются руками: скриншот, сделанный скриптом, можно переснять одной
 * командой, когда любой из сайтов изменится. Кадры — статические файлы в
 * `public/design/`, они ложатся в гит как обычные ассеты (11 МБ бюджета
 * сборки это не ломает: шесть webp суммарно меньше мегабайта).
 *
 * Запуск из корня репозитория, при поднятом dev-сервере гибрида на 5176
 * (npm run dev --prefix .design/hybrid) — остальные два сайта снимаются с
 * боевых адресов, локальный сервер им больше не нужен:
 *   node .design/hybrid/scripts/export-design-shots.mjs
 *
 * Три источника:
 *   · arisheniaa  — локальный dev на 5176. НЕ боевой адрес: кадр должен
 *     совпадать с тем, что выкладывается из ЭТОГО коммита, а не с тем, что
 *     стояло на сервере в момент съёмки;
 *   · totoshiroph.ru — боевой адрес: исходников Алёниного сайта в этом
 *     репозитории нет, единственная правда о нём — то, что выложено;
 *   · elegia-tula.ru — боевой адрес, по той же причине, что у Алёниного:
 *     исходников этого сайта в репозитории нет и не будет, показывать надо
 *     то, что человек увидит, перейдя по ссылке. Он живёт своей жизнью и
 *     ещё будет меняться — пересъёмка стоит одной команды.
 *
 * `sessionStorage` развилки ставится ДО загрузки (addInitScript): иначе кадр
 * главной снимал бы гейт Ф67 поверх сайта — портфолио показывает сайт, а не
 * дверь в него.
 *
 * Плейтформа кадра: десктоп 1440×900 (типовой ноутбук), телефон 390×844
 * (типовой iPhone). deviceScaleFactor 2 и уменьшение до 1600/640 px по
 * ширине — тот же приём, что в `export-photos.mjs`: пересжатый вдвое кадр
 * прячет шум рендера, а webp q80 держит текст читаемым.
 */
import { chromium } from 'playwright';
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(HERE, '../public/design');
fs.mkdirSync(OUT, { recursive: true });

const SITES = [
  { key: 'arisheniaa', url: 'http://127.0.0.1:5176/' },
  { key: 'toto', url: 'https://totoshiroph.ru/' },
  { key: 'elegia', url: 'https://elegia-tula.ru/' },
];

const browser = await chromium.launch();
const made = [];

async function shoot(site, kind, viewport, targetWidth) {
  const ctx = await browser.newContext({
    viewport,
    deviceScaleFactor: 2,
    /* НЕ `reducedMotion: 'reduce'`. Первая версия скрипта ставила reduce,
       чтобы не поймать анимацию на полпути, — и сняла ДРУГОЙ сайт: у гибрида
       под reduce рэк раскладывается в статичную сетку, а входные reveal
       первого экрана на этом кадре вовсе не показали текст. Портфолио
       обязано показывать сайт таким, каким его видит обычный посетитель;
       от «анимации на полпути» защищает выдержка ниже. */
    reducedMotion: 'no-preference',
    isMobile: viewport.width < 500,
  });
  const page = await ctx.newPage();
  // см. шапку файла — гейт Ф67 не должен попасть в кадр главной
  await page.addInitScript(() => {
    try {
      sessionStorage.setItem('gate-f67', 'photo');
    } catch {}
  });
  await page.goto(site.url, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  // запас на ленивые картинки первого экрана и завершение входных переходов
  // (самый долгий на гибриде — reveal 620 мс + лестница задержек)
  await page.waitForTimeout(2500);
  const png = await page.screenshot({ type: 'png' });
  await ctx.close();

  const name = `${site.key}-${kind}.webp`;
  await sharp(png)
    .resize({ width: targetWidth })
    .webp({ quality: 80 })
    .toFile(path.join(OUT, name));
  made.push(name);
}

for (const site of SITES) {
  await shoot(site, 'desktop', { width: 1440, height: 900 }, 1600);
  await shoot(site, 'phone', { width: 390, height: 844 }, 640);
}

await browser.close();

for (const n of made) {
  const size = fs.statSync(path.join(OUT, n)).size;
  console.log(`${n}\t${(size / 1024).toFixed(0)} КБ`);
}
