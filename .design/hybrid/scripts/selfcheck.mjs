/**
 * САМОПРОВЕРКА перед критиком. Печатает измерения, не мнения.
 *
 * Проверяет то, что нельзя увидеть на кадре:
 *  · горизонтальный скролл на каждой ширине;
 *  · дубли лендмарков (`main`, `header`, `footer`, `h1`, `nav`) — два лендмарка
 *    на кадре выглядят ровно как один, ловится только замером;
 *  · иерархия заголовков без дыр;
 *  · боевой текст дословно: строки из `copy.ts` ищутся в текстовом слое DOM;
 *  · СНЯТОЕ действительно снято (Ф28) — отдельным разделом, см. ниже. Это не
 *    зеркало предыдущей проверки: «текст есть» и «текста нет» ловят разные
 *    дефекты, и правка по показу состоит в основном из вторых;
 *  · reduced-motion не теряет контента — сравнивается длина текста и число
 *    картинок с обычным режимом;
 *  · ошибки консоли и pageerror;
 *  · РЕДАКЦИЯ 3 (Ф29, раздел 5 ниже) — семь новых измеримых проверок, по одной
 *    на пункт: тилт карточек реально поворачивает кадр, цена реально скрыта и
 *    реально появляется по клику, курсор-метка реально меняет видимость и не
 *    более системный grab/grabbing, боковой индикатор реально светится на
 *    активной секции, EXIF-подпись реально появляется и не несёт выдуманных
 *    технических деталей, папки отдачи реально раскрываются несимметрично,
 *    настроение полотна реально меняется непрерывно при проходе диптиха, и
 *    в src/ нет ни одного звукового API (владелица прямо попросила «без
 *    звуков» — прежний черновой пакет включал звук затвора).
 *
 * Выход кодом 1 при любом провале. Проба на «умеет ли краснеть» — флаг
 * `--redproof`: подставляет заведомо отсутствующую строку в список дословных,
 * заведомо неверный порог скролла и заведомо невыполнимый запрет.
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = 'http://127.0.0.1:5176/';
const RED = process.argv.includes('--redproof');
/* 360 — самый узкий реальный телефон, на нём ломается длинное русское слово.
   375 — названа координатором как ширина, где он вживую увидел прокрутку.
   390 — мобильный первым по локу. Дальше планшет и два десктопа. */
const WIDTHS = [360, 375, 390, 768, 1280, 1920];
/* Тема одна (Ф28, закрывает OQ-18). Прогон по двум темам снят вместе с розовой:
   проверять `?theme=pink` теперь значит проверять, что параметр ни на что не
   влияет, — а это проверка кода, которого нет. */

/** Дословные строки, которые обязаны быть в текстовом слое. */
const VERBATIM = [
  // COPY ред. 6
  'Создаю ваше кино',
  'Снимаю в Москве и Туле',
  'Как получается кино',
  'Придумано заранее',
  'Найдено на месте',
  'нажми на меня',
  'на цифру',
  'на плёнку',
  'Творческая',
  'Помогу подготовиться к съёмке',
  'Вы всегда можете связаться со мной, кликнув сюда.',
  // Ф28: навигация, состав и подписи дословно
  'Главная',
  'Работы',
  'Обо мне',
  'Что снимаю',
  'Подготовка к съёмке',
  'Контакты',
  // Ф28: два слова контактов
  'телеграм',
  'инстаграм',
  // Ф28: новое пояснение к демонстрации отдачи, дословно владелицы
  'Пришлю ссылочку на папку, где будут ваши фотографии. Если у вас была ещё плёнка, то папки будет две.',
  // имя — только латиница (Ф28)
  'arisheniaa',
  ...(RED ? ['ТАКОЙ СТРОКИ В COPY НЕТ'] : []),
];

/** Ф28 сняла это со страницы. Каждая строка — с причиной снятия. */
const FORBIDDEN = [
  ['Пишите, даже если ещё не решили', 'home:cta.title — снят Ф28'],
  ['самозанят', 'юрстатус — запрещён Ф17, дефект сборки по Ф28'],
  ['ИП,', 'юрстатус — запрещён Ф17'],
  ['Серия «', 'навигация по фотографиям в подвале — снята Ф28'],
  ['VK', 'заглушка контактов — снята Ф28, «больше ничего добавлять не нужно»'],
  ['Шесть кадров', 'секция home:grid — выключена Ф28'],
  ['аришения', 'кириллическое имя на экране — снято Ф28, «оставь его на латинице»'],
  ...(RED ? [['Создаю ваше кино', 'ПРОБА КРАСНОТЫ: H1 обязан быть на странице']] : []),
];

const fails = [];
const note = (ok, msg) => {
  console.log((ok ? '  ok   ' : '  FAIL ') + msg);
  if (!ok) fails.push(msg);
};

/** Прокрутить так, чтобы элемент оказался НИЖЕ фиксированной шапки (~90 px):
 *  `scrollIntoViewIfNeeded()` подводит элемент к самому краю вьюпорта, а
 *  край — под шапкой (`z-50`, перекрывает контент `z-10`). Первый прогон
 *  проверки тилта (редакция 3) поймал это ровно так: наведение попадало в
 *  шапку, а не в кадр, и «тилт не работает» на самом деле означало «клик
 *  промахнулся». Тот же класс дефекта, о котором предупреждает методология:
 *  число/результат замера значил не то, что казалось.
 *
 *  ВТОРАЯ НАХОДКА В ЭТОЙ ЖЕ ФУНКЦИИ: `window.scrollTo(0, y)` (два числовых
 *  аргумента) — это `behavior: 'auto'`, а «auto» само по себе означает
 *  «столько же, сколько задаёт CSS `scroll-behavior` элемента», а на `html`
 *  стоит `scroll-behavior: smooth` (styles.css). Значит прыжок на большое
 *  расстояние (например, к кадру плёнки в самом низу секции услуг) ехал
 *  плавно и не успевал доехать за фиксированную паузу — проверка EXIF-
 *  подписи мерила прямоугольник в СТАРОМ месте. Явный `behavior: 'instant'`
 *  переопределяет CSS и не зависит от расстояния прокрутки. */
async function clearHeader(locator, offset = 160) {
  await locator.evaluate((el, off) => {
    const y = el.getBoundingClientRect().top + window.scrollY - off;
    window.scrollTo({ top: Math.max(0, y), left: 0, behavior: 'instant' });
  }, offset);
  await locator.page().waitForTimeout(280);
}

const browser = await chromium.launch();

/* ─── 1. Горизонтальный скролл и лендмарки на всех ширинах ─── */
{
  for (const width of WIDTHS) {
    const theme = 'green'; // единственная (Ф28)
    const ctx = await browser.newContext({
      viewport: { width, height: 900 },
      deviceScaleFactor: 1,
    });
    const page = await ctx.newPage();
    const errs = [];
    page.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
    page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
    await page.goto(BASE, { waitUntil: 'networkidle' });
    /* Навигация на узком экране сложена в список: если её не раскрыть, шесть
       подписей не участвуют в замере переполнения, и «прокрутки нет» будет
       правдой только про закрытое меню. Раскрываем, когда кнопка видна. */
    const toggle = page.locator('.nav-toggle');
    if (await toggle.isVisible()) await toggle.click();
    await page.waitForTimeout(250);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(400);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(200);

    const m = await page.evaluate(() => {
      const de = document.documentElement;
      // виновники переполнения, если оно есть
      const over = [...document.querySelectorAll('body *')]
        .filter((el) => el.getBoundingClientRect().right > de.clientWidth + 1)
        .slice(0, 4)
        .map((el) => el.tagName + '.' + (el.className || '').toString().slice(0, 40));
      return {
        sw: de.scrollWidth,
        cw: de.clientWidth,
        over,
        main: document.querySelectorAll('main').length,
        header: document.querySelectorAll('header').length,
        footer: document.querySelectorAll('footer').length,
        nav: document.querySelectorAll('nav').length,
        navLabels: new Set(
          [...document.querySelectorAll('nav')].map((n) => n.getAttribute('aria-label') || ''),
        ).size,
        h1: document.querySelectorAll('h1').length,
        levels: [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].map((h) =>
          Number(h.tagName[1]),
        ),
      };
    });

    /* Порог 0, а не «примерно»: требование сформулировано как равенство
       scrollWidth === clientWidth, и мерить надо его, а не «почти».
       Виновники печатаются ТОЛЬКО при провале: элементы, вылезающие за
       clientWidth, есть и в норме (полотно вылезает намеренно и обрезано),
       и в зелёном отчёте их список читался бы как невылеченная болезнь. */
    const ok = RED ? m.sw < m.cw : m.sw === m.cw;
    note(
      ok,
      `${theme} ${width}px — scrollWidth ${m.sw} === clientWidth ${m.cw}` +
        (ok ? '' : ` · вылезают: ${m.over.join(', ')}`),
    );
    /* `nav` добавлен в замер вместе с переездом навигации в шапку: если
       подвальный список забыть удалить, на кадре это выглядит ровно как одна
       навигация, а скринридер получит два одноимённых лендмарка.

       ПОРОГ ИЗМЕНЁН НА 2 (Ф29 п.4, `SectionStars.tsx`): боковой индикатор
       разделов — второй, ОСОЗНАННЫЙ `<nav>`, не случайный дубль. Проверка
       переписана так, чтобы ловить именно дубль, а не любое число: два
       лендмарка допустимы, только если у них РАЗНЫЕ `aria-label`
       («Разделы сайта» у шапки, «Прогресс по разделам» у индикатора) —
       `navLabels` считает Set уникальных подписей, и если он меньше числа
       `<nav>`, это два одинаковых, то есть ровно тот дубль, от которого
       предупреждает методология. */
    note(
      m.main === 1 &&
        m.header === 1 &&
        m.footer === 1 &&
        m.nav === 2 &&
        m.navLabels === 2 &&
        m.h1 === 1,
      `${theme} ${width}px — лендмарки по одному, кроме nav=2 с разными подписями (main ${m.main}, header ${m.header}, footer ${m.footer}, nav ${m.nav}, navLabels ${m.navLabels}, h1 ${m.h1})`,
    );
    let holes = [];
    for (let i = 1; i < m.levels.length; i++) {
      if (m.levels[i] - m.levels[i - 1] > 1) holes.push(`h${m.levels[i - 1]}→h${m.levels[i]}`);
    }
    note(holes.length === 0, `${theme} ${width}px — иерархия заголовков без дыр${holes.length ? ': ' + holes.join(', ') : ''}`);
    note(errs.length === 0, `${theme} ${width}px — консоль чиста${errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''}`);
    await ctx.close();
  }
}

/* ─── 2. Боевой текст дословно ─── */
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: 'networkidle' });
  /* textContent, а не innerText. Это не придирка: innerText возвращает текст
     ПОСЛЕ text-transform, а служебный слой .t-mono набран капителью. Первый
     прогон из-за этого показал провал на «Снимаю в Москве и Туле», «Придумано
     заранее» и «Найдено на месте» — в разметке они стоят дословно, капитель
     делает CSS. Проверять надо DOM: дословность — свойство разметки, именно её
     читают поиск и скринридер. Сам факт капители над текстом COPY — находка
     для гейта, она записана в README, но это не расхождение текста.
     Неразрывный пробел нормализуется в обычный: в copy.ts он подставлен
     осознанно по § 0.5, сравнивать надо слова, а не пробельные коды. */
  const norm = (s) => s.replace(/\s+/g, ' ').trim();
  const text = norm(await page.evaluate(() => document.body.textContent));
  for (const s of VERBATIM) {
    note(text.includes(norm(s)), `дословно: «${s}»`);
  }
  await ctx.close();
}

/* ─── 2б. Ф28: снятое действительно снято ───
   Ищется по всему текстовому слою, включая свёрнутую навигацию и закрытые
   папки: узел, скрытый стилем, из `textContent` не исчезает — и это ровно то,
   что нужно, потому что «убрать с показа» и «убрать из документа» на кадре
   различить нельзя, а скринридером — можно. */
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: 'networkidle' });
  const norm = (s) => s.replace(/\s+/g, ' ').trim();
  const text = norm(await page.evaluate(() => document.body.textContent));
  for (const [s, why] of FORBIDDEN) {
    note(!text.includes(norm(s)), `снято Ф28: «${s}» — ${why}`);
  }

  /* Кириллическое имя обязано остаться в `<title>`: решение Р2 гейта 1
     (брендовый вход кириллицей, Ф12) Ф28 не отменяла и прямо оговорила, что
     это машиночитаемое поле, а не экран. Проверка парная к запрету выше:
     без неё «убрал кириллицу» легко выполнить, снеся и то, что сносить нельзя. */
  const title = await page.title();
  note(
    RED ? title.includes('НЕТ ТАКОГО В TITLE') : title.includes('аришения'),
    `<title> держит кириллический дубль имени (Р2): «${title}»`,
  );

  /* Контакты — ровно два кликабельных слова и правильные адреса. Личный
     `@arisheniaa`, НЕ канал `@byarisheniaa` (Ф28 различает их прямо). */
  const links = await page.evaluate(() =>
    [...document.querySelectorAll('a[href^="http"]')].map((a) => ({
      t: a.textContent.trim(),
      h: a.getAttribute('href'),
    })),
  );
  const tg = links.find((l) => l.t === 'телеграм');
  const ig = links.find((l) => l.t === 'инстаграм');
  note(tg?.h === 'https://t.me/arisheniaa', `«телеграм» → t.me/arisheniaa (получено: ${tg?.h})`);
  note(
    ig?.h === 'https://instagram.com/arisheniaa',
    `«инстаграм» → instagram.com/arisheniaa (получено: ${ig?.h})`,
  );
  note(
    !links.some((l) => (l.h || '').includes('byarisheniaa')),
    'канал @byarisheniaa нигде не подставлен вместо личного контакта',
  );
  const suda = links.find((l) => l.t === 'сюда');
  note(suda?.h === 'https://t.me/arisheniaa', `слово «сюда» — ссылка в Telegram (получено: ${suda?.h})`);

  /* Кнопка «Написать в Telegram» снята из блока CTA (Ф28). Проверка ЗОНАЛЬНАЯ,
     а не по всей странице, и это не поблажка себе: те же слова стоят в первом
     экране как `home:hero.cta-primary` — отдельная зона COPY, которую Ф28 не
     называет. Общестраничный запрет провалился бы на ней и заставил бы снести
     заодно то, чего владелица не просила. Вопрос «относится ли отмена и к
     первому экрану» вынесен в `open` хендофа, а не решён здесь молча.
     Заодно проверяется, что кнопок в блоке нет вообще: Ф28 — «ниже уже
     контакты, без промежуточных кнопок». */
  const cta = await page.evaluate(() => {
    const s = document.querySelector('#kontakt');
    return {
      text: (s?.textContent || '').replace(/\s+/g, ' ').trim(),
      links: s ? s.querySelectorAll('a').length : -1,
    };
  });
  note(
    RED ? cta.text.includes('НЕТ ТАКОГО ТЕКСТА') : !cta.text.includes('Написать в'),
    `в блоке CTA нет кнопки «Написать в Telegram» (текст блока: «${cta.text}»)`,
  );
  // три ссылки: «сюда», «телеграм», «инстаграм». Больше — значит что-то вернулось
  note(cta.links === 3, `в блоке CTA ровно три ссылки: сюда + два контакта (найдено ${cta.links})`);

  /* Фотографии услуг: четыре кадра (Ф28 добавила слот «плёнка»), и ни один не
     показывается шире 19 rem = 304 px — «уменьши их в размере». Мерится показ,
     а не атрибут: атрибут врёт, показ нет.
     `offsetWidth`, а НЕ `getBoundingClientRect().width`. Разница здесь
     содержательная, а не стилистическая: `useFocusScrub` держит на кадрах
     `transform: scale(1…1.016)` как наводку резкости, и прямоугольник отдавал
     304 × 1.016 = 308 px. Первый прогон этой проверки на этом и провалился —
     мерился масштаб анимации, а не ширина показа. Порог остался 304. */
  const shots = await page.evaluate(() =>
    [...document.querySelectorAll('img[src^="/services/"]')].map((i) => ({
      src: i.getAttribute('src'),
      w: i.offsetWidth,
    })),
  );
  note(shots.length === 4, `кадров услуг четыре, включая плёнку (найдено ${shots.length})`);
  const widest = Math.max(0, ...shots.map((s) => s.w));
  note(
    RED ? widest < 10 : widest <= 304,
    `показ кадров услуг уменьшен: самый крупный ${widest} px при потолке 304 px`,
  );
  note(
    shots.some((s) => s.src.includes('plenka')),
    'слот «плёнка» на месте (services/plenka.webp)',
  );

  /* Звёзды светятся (Ф28). Проверяется вычисленный `filter` на группе звезды:
     «есть свечение» — это свойство в CSSOM, а не впечатление от скриншота. */
  const glow = await page.evaluate(() => {
    const g = document.querySelector('svg [data-star]');
    return g ? getComputedStyle(g).filter : 'нет звёзд в DOM';
  });
  note(
    RED ? glow === 'none' : /drop-shadow/.test(glow),
    `звёзды светятся: filter = ${glow.slice(0, 90)}`,
  );

  await ctx.close();
}

/* ─── 3. reduced-motion не теряет контента ─── */
{
  const read = async (reduce) => {
    const ctx = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      reducedMotion: reduce ? 'reduce' : 'no-preference',
    });
    const page = await ctx.newPage();
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    const r = await page.evaluate(() => ({
      len: document.body.innerText.replace(/\s+/g, ' ').trim().length,
      imgs: [...document.querySelectorAll('img')].length,
      h: document.querySelectorAll('h1,h2,h3').length,
    }));
    await ctx.close();
    return r;
  };
  const a = await read(false);
  const b = await read(true);
  note(
    b.h === a.h,
    `reduced-motion: заголовков столько же (${b.h} против ${a.h})`,
  );
  note(
    b.len >= a.len * 0.98,
    `reduced-motion: текста не меньше (${b.len} знаков против ${a.len})`,
  );
  note(
    b.imgs >= a.imgs,
    `reduced-motion: кадров не меньше (${b.imgs} против ${a.imgs}) — рэк разворачивается в сетку`,
  );
}

/* ─── 4. Имя статично (Ф28) ───
   Проверка перевёрнута. Была: «кириллица есть в DOM до срабатывания морфинга»
   (П8 при живой анимации). Стала: имя НЕ МЕНЯЕТСЯ и не кликабельно — Ф28
   сняла механику целиком, и сторожить надо ровно то, что сняли. Ловушка,
   из-за которой проверка нужна: у прежней механики был автозапуск через
   10 000 мс, то есть возврат морфинга не увидит ни один скриншот и ни один
   быстрый прогон — только замер спустя выдержку. */
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: 'networkidle' });
  const read = () =>
    page.evaluate(() => {
      const h = document.querySelector('header');
      return {
        text: (h?.textContent || '').replace(/\s+/g, ' ').trim(),
        // кликабельность имени: имя внутри ссылки или кнопки
        clickable: !!h?.querySelector('a .t-name, button .t-name, a.t-name, button.t-name'),
      };
    });
  const before = await read();
  // 11 секунд: заведомо больше прежнего автозапуска на 10 000 мс
  await page.waitForTimeout(11_000);
  const after = await read();

  note(before.text.includes('arisheniaa'), `имя латиницей в шапке: «${before.text}»`);
  note(
    RED ? before.text !== after.text : before.text === after.text,
    `имя не изменилось за 11 с (было «${before.text}», стало «${after.text}»)`,
  );
  note(!after.clickable, 'имя не кликабельно — не ссылка и не кнопка (Ф28)');
  await ctx.close();
}

/* ═══════════════════ 5. РЕДАКЦИЯ 3 (Ф29, FACTS.md — не лок) ═══════════════
   Семь пунктов владелицы поверх редакции 2. Каждый — измеримая проверка,
   не скриншот: «написал» ≠ «работает». */

/* ─── 5.0. Нет звуковых API (явный запрет владелицы «без звуков») ─── */
{
  const HERE = path.dirname(fileURLToPath(import.meta.url));
  const SRC = path.resolve(HERE, '../src');
  const files = fs.readdirSync(SRC).filter((f) => /\.(tsx?|css)$/.test(f));
  const soundPattern = /\bAudio\(|AudioContext|\bHowl\b|\.play\(\s*\)|shutter.*\.(mp3|wav|ogg)/i;
  const hits = files.filter((f) => soundPattern.test(fs.readFileSync(path.join(SRC, f), 'utf8')));
  /* Проба на красноту ПРЯМО ЗДЕСЬ, не под --redproof: детектор гоняется по
     синтетической строке, заведомо содержащей нарушение, чтобы доказать, что
     регулярка не бутафорская (правило методологии: «зелёный отчёт ничего не
     значит, пока не доказано, что он умеет краснеть»). */
  const selfTest = soundPattern.test('const s = new Audio("shutter.mp3"); s.play();');
  note(selfTest, 'проверка на звук ловит синтетическое нарушение (проба на красноту детектора)');
  note(
    hits.length === 0,
    `нет звуковых API в src/ (${files.length} файлов проверено)${hits.length ? ': ' + hits.join(', ') : ''}`,
  );
}

/* ─── 5.1. Тилт карточек услуг реально поворачивает кадр (Ф29 п.3) ─── */
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: 'networkidle' });
  const frame = page.locator('.tilt-frame').first();
  await clearHeader(frame);
  const box = await frame.boundingBox();
  const flat = await frame.evaluate((el) => getComputedStyle(el).transform);

  await page.mouse.move(box.x + box.width * 0.12, box.y + box.height * 0.12, { steps: 5 });
  await page.waitForTimeout(250);
  const tilted = await frame.evaluate((el) => getComputedStyle(el).transform);
  note(
    RED ? tilted === flat : tilted !== flat,
    `тилт: наведение курсора меняет матрицу transform кадра (плоско: ${flat.slice(0, 36)}…, наклонено: ${tilted.slice(0, 36)}…)`,
  );

  const glintOn = Number(
    await page.locator('.tilt-glint').first().evaluate((el) => getComputedStyle(el).opacity),
  );
  note(glintOn > 0.5, `блик по краю кадра появляется при наведении (opacity ${glintOn})`);

  await page.mouse.move(4, 4);
  await page.waitForTimeout(450);
  const back = await frame.evaluate((el) => getComputedStyle(el).transform);
  /* Не строковое равенство: CSS-переход интерполирует `matrix3d` через
     тригонометрию и обратно, и «доехавшее» значение отличается от исходного
     на ~1e-4 из-за плавающей точки — глазом неотличимо, побитово не совпадает.
     Числовой допуск 0,01 — правильный инструмент здесь, а не строка. */
  const nums = (s) => (s.match(/-?[\d.e-]+/g) || []).map(Number);
  const closeEnough = (a, b, eps = 0.01) => {
    const na = nums(a);
    const nb = nums(b);
    return na.length === nb.length && na.every((v, i) => Math.abs(v - nb[i]) < eps);
  };
  note(
    closeEnough(back, flat),
    `тилт возвращается в плоское положение при уходе курсора (было ${flat.slice(0, 30)}…, стало ${back.slice(0, 30)}…)`,
  );
  await ctx.close();
}

/* ─── 5.2. Цена скрыта по умолчанию и появляется по клику (Ф29 п.6) ─── */
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: 'networkidle' });
  const btn = page.locator('.price-plate').first();
  await clearHeader(btn);
  /* Одна плашка держит ДВЕ цифры (Москва и Тула — «6 000 ₽ ... 4 000 ₽ ...»),
     то есть два `.price-plate-digits` внутри одной кнопки. Проверяется первая
     — обе управляются одним и тем же `data-open`, поведение идентично. */
  const digits = btn.locator('.price-plate-digits').first();

  const blurBefore = await digits.evaluate((el) => getComputedStyle(el).filter);
  const expandedBefore = await btn.getAttribute('aria-expanded');
  note(
    RED ? !/blur\(/.test(blurBefore) : /blur\(/.test(blurBefore) && !/blur\(0/.test(blurBefore),
    `цифра приглушена ДО клика: filter=${blurBefore}, aria-expanded=${expandedBefore}`,
  );

  await btn.click();
  await page.waitForTimeout(500);
  const blurAfter = await digits.evaluate((el) => getComputedStyle(el).filter);
  const expandedAfter = await btn.getAttribute('aria-expanded');
  note(
    RED ? !/blur\(0/.test(blurAfter) : /blur\(0/.test(blurAfter),
    `цифра проявляется ПОСЛЕ клика: filter=${blurAfter}, aria-expanded=${expandedAfter}`,
  );
  note(expandedAfter === 'true', 'aria-expanded переключился в true после клика');

  /* Дословность: полная строка цены стоит в DOM ОБА раза — приглушение
     визуальное (filter), а не удаление текста. Проверяем на ЗАКРЫТОЙ плашке
     соседней карточки (не кликали), чтобы доказать «скрыто и всё равно там». */
  const closedPlateText = await page
    .locator('.price-plate')
    .nth(1)
    .evaluate((el) => el.textContent.replace(/\s+/g, ' ').trim());
  note(
    /\d[\d ]*₽/.test(closedPlateText),
    `цена целиком в DOM даже в закрытом состоянии (получено: «${closedPlateText}»)`,
  );
  await ctx.close();
}

/* ─── 5.3. Курсор-метка «тяни» вместо системного grab/grabbing (Ф29 п.2) ─── */
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: 'networkidle' });
  const stack = page.locator('.rack-stack');
  const box = await stack.boundingBox();

  const cursor = await stack.evaluate((el) => getComputedStyle(el).cursor);
  note(
    RED ? ['grab', 'grabbing'].includes(cursor) : !['grab', 'grabbing'].includes(cursor),
    `над рэком не системный grab/grabbing (computed cursor: ${cursor})`,
  );

  const hint = page.locator('.rack-hint');
  const hiddenAtStart = !(await hint.evaluate((el) => el.hasAttribute('data-show')));
  note(hiddenAtStart, 'метка «тяни» не показана, пока курсор не над рэком');

  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(150);
  const shown = await hint.evaluate((el) => el.hasAttribute('data-show'));
  const label = (await hint.textContent()).trim();
  note(RED ? !shown : shown, `метка появляется над верхним кадром рэка (data-show=${shown})`);
  note(label.includes('тяни'), `текст метки — «тяни» (получено: «${label}»)`);

  // взятие (held) гасит метку — «тянуть» нечего объяснять, когда уже тянут
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 - 30, box.y + box.height / 2, { steps: 4 });
  await page.waitForTimeout(120);
  const hiddenWhileHeld = !(await hint.evaluate((el) => el.hasAttribute('data-show')));
  note(hiddenWhileHeld, 'метка пропадает при взятии рэка (held)');
  await page.mouse.up();
  await page.waitForTimeout(300);

  await page.mouse.move(4, 4);
  await page.waitForTimeout(200);
  const hiddenAfterLeave = !(await hint.evaluate((el) => el.hasAttribute('data-show')));
  note(hiddenAfterLeave, 'метка пропадает при уводе курсора');

  /* Не путается со счётчиком рэка «01/08» (в этом же нормальном режиме
     движения счётчик и есть — под reduced-motion, где проверяется боковой
     индикатор разделов, § 5.4, рэк рисует статичную сетку и `.rack-next`
     не существует вовсе, поэтому проверка живёт здесь, а не там). */
  const rackCounterLabel = await page.locator('.rack-next').getAttribute('aria-label');
  note(
    rackCounterLabel === 'Следующий кадр',
    `счётчик рэка остаётся отдельным контролом («${rackCounterLabel}»), не конфликтует с индикатором разделов`,
  );
  await ctx.close();
}

/* ─── 5.4. Боковой индикатор разделов светится на активной секции (Ф29 п.4) ───
   `reducedMotion: 'reduce'` в контексте — не потому что проверяется reduced-
   motion сама по себе, а потому что делает ВСЮ прокрутку в этом блоке
   мгновенной без гонки со временем: `SectionStars.tsx` сам выбирает
   `behavior: 'auto'` вместо `'smooth'` при этом медиа-запросе (реальный код
   компонента, не костыль теста), а глобальный `html { scroll-behavior: auto }`
   под тем же медиа-запросом (styles.css) избавляет и мои собственные
   `scrollTo` от гонки с CSS-плавностью на очень длинной странице. Полотну
   (`Gradient.tsx`) это не мешает: его прогресс здесь не проверяется — для
   `--mood`/`--sp` есть отдельный блок 5.7 с обычным (не reduced) движением,
   потому что `Gradient.tsx` при reduced-motion не запускается вовсе. */
{
  const ctx = await browser.newContext({
    viewport: { width: 1400, height: 900 },
    reducedMotion: 'reduce',
  });
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: 'networkidle' });

  const counts = await page.evaluate(() => ({
    sections: document.querySelectorAll('main > section').length,
    stars: document.querySelectorAll('.section-stars .section-star').length,
  }));
  note(
    counts.stars === counts.sections && counts.sections > 1,
    `по звезде на секцию (${counts.stars} звёзд, ${counts.sections} секций)`,
  );

  const activeAtStart = await page.evaluate(
    () => document.querySelectorAll('.section-stars .section-star[data-active]').length,
  );
  note(activeAtStart === 1, `ровно одна активная звезда в начале (${activeAtStart})`);

  await page.evaluate(() =>
    window.scrollTo({ top: document.body.scrollHeight, left: 0, behavior: 'instant' }),
  );
  await page.waitForTimeout(500);
  const idxAtEnd = await page.evaluate(() =>
    [...document.querySelectorAll('.section-stars .section-star')].findIndex((s) =>
      s.hasAttribute('data-active'),
    ),
  );
  note(
    RED ? idxAtEnd !== counts.stars - 1 : idxAtEnd === counts.stars - 1,
    `после прокрутки в конец активна последняя звезда (индекс ${idxAtEnd} из ${counts.stars - 1})`,
  );

  await page.locator('.section-star').first().click();
  await page.waitForTimeout(500);
  const y = await page.evaluate(() => window.scrollY);
  note(y < 150, `клик по первой звезде возвращает к началу страницы (scrollY ${y})`);
  await ctx.close();
}

/* ─── 5.5. EXIF-подпись плёночного кадра (Ф29 п.5, сужена — OQ-21) ─── */
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 2400 } });
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: 'networkidle' });
  const tag = page.locator('.film-tag');
  await clearHeader(tag);
  const box = await tag.boundingBox();
  const caption = page.locator('.film-tag-caption');

  const before = Number(await caption.evaluate((el) => getComputedStyle(el).opacity));
  note(before < 0.2, `EXIF-подпись скрыта по умолчанию (opacity ${before})`);

  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 8 });
  /* 900 мс, не 200 (длительность самого CSS-перехода): в headless-хроме
     первая проба показала, что стили начинают ощутимо трогаться заметно
     позже реального времени перехода — вероятно, планировщик покраски
     под автоматизацией. Полторы секунды с запасом, не оптимизм. */
  await page.waitForTimeout(900);
  const after = Number(await caption.evaluate((el) => getComputedStyle(el).opacity));
  note(RED ? after < 0.2 : after > 0.8, `EXIF-подпись появляется при наведении (opacity ${after})`);

  const text = (await caption.textContent()).trim();
  note(
    text === 'плёнка',
    `подпись показывает только подтверждённый факт «плёнка», без выдуманного города/техданных (получено «${text}»)`,
  );

  const bodyText = await page.evaluate(() => document.body.textContent);
  note(
    !/f\s?\/\s?\d|ISO\s?\d|выдержка|диафрагма|kodak|portra|fuji|kentmere/i.test(bodyText),
    'на странице нет выдуманных технических EXIF-деталей (диафрагма/выдержка/ISO/марка плёнки — OQ-21)',
  );
  await ctx.close();
}

/* ─── 5.6. Асимметричный разлёт папок отдачи (Ф29 п.7) ─── */
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 1600 } });
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await clearHeader(page.locator('.folder-parent'));

  const read = (el) => {
    const s = getComputedStyle(el);
    return { transform: s.transform, dur: s.transitionDuration, delay: s.transitionDelay };
  };
  const kids = page.locator('.delivery-children > .folder');
  const c1 = await kids.nth(0).evaluate(read);
  const c2 = await kids.nth(1).evaluate(read);

  note(
    RED ? c1.transform === c2.transform : c1.transform !== c2.transform,
    `разлёт асимметричен по углу/сдвигу (папка 1: ${c1.transform.slice(0, 46)}…; папка 2: ${c2.transform.slice(0, 46)}…)`,
  );
  note(c1.dur !== c2.dur, `разная скорость раскрытия (папка 1: ${c1.dur}, папка 2: ${c2.dur})`);
  note(c1.delay !== c2.delay, `разный тайминг раскрытия (папка 1: ${c1.delay}, папка 2: ${c2.delay})`);
  await ctx.close();
}

/* ─── 5.7. Настроение полотна меняется непрерывно при проходе диптиха (Ф29 п.1) ─── */
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: 'networkidle' });
  const readMood = () =>
    page.evaluate(() =>
      Number(getComputedStyle(document.documentElement).getPropertyValue('--mood')),
    );

  /* `behavior: 'instant'` явно — иначе `window.scrollTo(x, y)` (числовая
     форма) наследует `behavior: 'auto'`, а «auto» на этой странице означает
     CSS `scroll-behavior: smooth` (styles.css, `html`). Первый прогон именно
     здесь и поймал это: прыжок к концу диптиха ехал плавно, 250 мс не
     хватало на всю дистанцию, и `--mood` замерялся на середине пути
     (получалось ~0.56 вместо ~1) — не баг фичи, баг гонки в тесте. */
  // подвести верх диптиха к нижнему краю экрана — формула --mood даёт здесь ≈0
  await page.evaluate(() => {
    const el = document.querySelector('[data-mood-scope]');
    const r = el.getBoundingClientRect();
    window.scrollTo({ top: window.scrollY + r.top - window.innerHeight, left: 0, behavior: 'instant' });
  });
  await page.waitForTimeout(250);
  const atStart = await readMood();

  // подвести низ диптиха к верхнему краю экрана — формула --mood даёт здесь ≈1
  await page.evaluate(() => {
    const el = document.querySelector('[data-mood-scope]');
    const r = el.getBoundingClientRect();
    window.scrollTo({ top: window.scrollY + r.bottom, left: 0, behavior: 'instant' });
  });
  await page.waitForTimeout(250);
  const atEnd = await readMood();

  note(atStart < 0.15, `--mood у начала диптиха около 0 (получено ${atStart})`);
  note(atEnd > 0.85, `--mood у конца диптиха около 1 (получено ${atEnd})`);
  note(
    RED ? atEnd <= atStart : atEnd > atStart,
    `--mood растёт непрерывно со скроллом секции (${atStart} → ${atEnd})`,
  );

  // слои-слушатели реально читают переменную, а не мертвый код
  const opacities = await page.evaluate(() => {
    const a = document.querySelector('.mesh-mood-a');
    const b = document.querySelector('.mesh-mood-b');
    return { a: Number(getComputedStyle(a).opacity), b: Number(getComputedStyle(b).opacity) };
  });
  note(
    opacities.b > opacities.a,
    `у конца диптиха «странный» слой ярче «тихого» (a=${opacities.a}, b=${opacities.b})`,
  );
  await ctx.close();
}

await browser.close();

console.log('');
if (fails.length) {
  console.log(`ПРОВАЛОВ: ${fails.length}`);
  process.exit(1);
}
console.log('САМОПРОВЕРКА ЗЕЛЁНАЯ — все проверки выполнены и все прошли');
