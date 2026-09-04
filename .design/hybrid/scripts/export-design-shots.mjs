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
 * Развилка Ф67 пропускается якорем `#main` в адресе своего сайта — иначе
 * кадр главной снимал бы дверь вместо сайта. Подробности у места вызова.
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

/* СЕРИЯ КАДРОВ НА КАЖДЫЙ САЙТ (её правка: «сделай по 3-4 скриншотов с
   каждого сайта дополнительно к уже имеющимся. возьми самые интересные
   анимации»).

   `ряд` — места, до которых надо доскроллить, и что там сделать. Позиции
   взяты не на глаз: сайты обойдены заранее, у каждого сняты положения
   заголовков, и кадр ставится на смысловой блок, а не на случайный
   пиксель. Где анимация ждёт курсора (веер услуг, папки отдачи), курсор
   подводится и кадр снимается в РАСКРЫТОМ состоянии — иначе в портфолио
   попала бы не анимация, а её исходное положение.

   Прокрутка ступенями, а не прыжком: сайты проявляют секции по мере
   попадания в кадр, и прыжок в конец оставил бы половину блоков
   непроявленными (эта грабля уже ловилась при съёмке своей же главной). */
const SITES = [
  // `свой` — только у своего сайта: якорь нужен, чтобы пропустить развилку,
  // а на чужих сайтах его добавлять незачем и некуда.
  {
    key: 'arisheniaa',
    url: 'http://127.0.0.1:5176/',
    свой: true,
    ряд: [
      { имя: 'uslugi', до: '#uslugi', навести: '.sb-fan', пауза: 900 },
      { имя: 'raskadrovka', до: '#raskadrovka', пауза: 700 },
      /* Папки отдачи: цель прокрутки — сама папка, а не секция. По секции
         кадр вставал так, что папка оказывалась у нижнего края и обрезалась,
         а наведение не успевало её раскрыть (поймано на первом прогоне). */
      { имя: 'papki', до: '.folder-parent', нажать: '.folder-parent', пауза: 900 },
      { имя: 'o-mne', до: '#o-mne', пауза: 700 },
    ],
  },
  {
    key: 'toto',
    url: 'https://totoshiroph.ru/',
    ряд: [
      { имя: 'snimayu', текст: 'Что я снимаю' },
      { имя: 'kto-ya', текст: 'Кто я и почему свет' },
      { имя: 'ceny', текст: 'Цены и услуги' },
      { имя: 'obuchenie', текст: 'Учу фотографии' },
    ],
  },
  {
    key: 'elegia',
    url: 'https://elegia-tula.ru/',
    ряд: [
      { имя: 'maket', текст: 'Соберите его сами' },
      { имя: 'chto-delaem', текст: 'Что мы делаем' },
      { имя: 'ceny-kamen', текст: 'Сколько стоит камень' },
      { имя: 'makety', текст: 'Макеты собираются вручную' },
    ],
  },
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
  /* Развилка не должна попасть в кадр портфолио: показывать надо сайт, а не
     дверь в него. Пропускается ЯКОРЕМ в адресе — `#main` означает «веду в
     место на странице», и развилка себя пропускает (правило в `Gate.tsx`).
     Раньше здесь стояла запись в `sessionStorage`, но ключ выбора удалён
     вместе с правилом «в одной сессии не переспрашивать»: владелица просила
     показывать развилку при каждом заходе. Якорь работает и проще — он
     часть адреса, а не состояние браузера. */
  await page.goto(site.свой ? site.url + '#main' : site.url, { waitUntil: 'networkidle' });
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

/** Серия кадров по сайту: прокрутка до места, при нужде наведение курсора,
 *  снимок вьюпорта. Всё в одном контексте браузера — сайт грузится один
 *  раз, а не по разу на кадр. */
async function серия(site, ширина) {
  if (!site.ряд) return;
  const телефон = ширина === 'phone';
  const ctx = await browser.newContext({
    viewport: телефон ? { width: 390, height: 844 } : { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    reducedMotion: 'no-preference',
    isMobile: телефон,
  });
  const page = await ctx.newPage();
  await page.goto(site.свой ? site.url + '#main' : site.url, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(2000);

  /* Ступенчатый проход по всей странице: чужие сайты (и свой) проявляют
     секции по мере входа в кадр, и прыжок сразу к нужному месту оставил бы
     блок непроявленным — в портфолио попал бы пустой экран. */
  await page.evaluate(async () => {
    const шаг = Math.round(innerHeight * 0.5);
    for (let y = 0; y <= document.documentElement.scrollHeight; y += шаг) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 180));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(700);

  for (const кадр of site.ряд) {
    if (кадр.до) {
      /* `behavior: instant` обязателен: на сайте включена плавная прокрутка
         (`scroll-behavior: smooth`), и обычный `scrollIntoView` едет
         анимацией. Кадр снимался на полпути, а нажатие попадало мимо цели —
         папка отдачи уезжала в портфолио закрытой и обрезанной. */
      await page.evaluate((s) => {
        const el = document.querySelector(s);
        if (el) el.scrollIntoView({ block: 'center', behavior: 'instant' });
      }, кадр.до);
      await page.waitForTimeout(400);
    } else if (кадр.текст) {
      /* ПОИСК МЕСТА ПО ТЕКСТУ ЗАГОЛОВКА, а не по пикселю. Пиксель верен
         ровно для той ширины, на которой его замерили: на телефоне та же
         страница вдвое длиннее, и кадр уехал бы мимо блока. Заголовок
         стоит там же по смыслу на любой ширине. */
      await page.evaluate((текст) => {
        const el = [...document.querySelectorAll('h1, h2, h3')].find((x) =>
          x.textContent.trim().startsWith(текст),
        );
        if (el) el.scrollIntoView({ block: 'start', behavior: 'instant' });
        window.scrollBy(0, -Math.round(innerHeight * 0.08));
      }, кадр.текст);
      await page.waitForTimeout(400);
    } else {
      await page.evaluate((y) => window.scrollTo(0, y - innerHeight * 0.12), кадр.y);
    }
    await page.waitForTimeout(кадр.пауза ?? 600);

    /* Курсор подводится к тому, что оживает от наведения. Если узла нет
       (сайт изменился), кадр всё равно снимается — портфолио важнее
       конкретной анимации, и падать из-за неё скрипт не должен. */
    /* Наведение — только широкому экрану: у телефона курсора нет, и веер
       услуг там раскрывается другим способом (`FanTap`). Нажатие нужно
       обеим ширинам: папка отдачи открывается им и там, и там. */
    if (кадр.навести && !телефон) {
      const el = await page.$(кадр.навести);
      if (el) {
        await el.hover().catch(() => {});
        await page.waitForTimeout(700);
      }
    }
    /* Что открывается НАЖАТИЕМ, а не наведением, — нажимаем. Папки отдачи
       подписаны «нажми на меня» и раскрываются кликом (`Folders.tsx`);
       наведение их не трогает, и в портфолио уезжала закрытая папка. */
    if (кадр.нажать) {
      await page.click(кадр.нажать, { timeout: 3000 }).catch(() => {});
      await page.waitForTimeout(900);
    }

    const png = await page.screenshot({ type: 'png' });
    const name = `${site.key}-${кадр.имя}${телефон ? '-m' : ''}.webp`;
    await sharp(png)
      .resize({ width: телефон ? 640 : 1200 })
      .webp({ quality: 78 })
      .toFile(path.join(OUT, name));
    made.push(name);
  }
  await ctx.close();
}

/* ТОЛЬКО ШИРОКИЕ КАДРЫ. Телефонные снимал этот же скрипт, пока их не
   заменили настоящие снимки с телефона владелицы (Ф79,
   `export-phone-shots.mjs`). Эмуляция узкой ширины в браузере — не то же
   самое, что телефон: другой шрифтовой рендер, свои поля, нет статусной
   строки. Ветка 'phone' убрана целиком, а не оставлена про запас: код,
   который никто не зовёт, тихо расходится с жизнью. */
for (const site of SITES) {
  await shoot(site, 'desktop', { width: 1440, height: 900 }, 1600);
  await серия(site, 'desktop');
}

await browser.close();

for (const n of made) {
  const size = fs.statSync(path.join(OUT, n)).size;
  console.log(`${n}\t${(size / 1024).toFixed(0)} КБ`);
}
