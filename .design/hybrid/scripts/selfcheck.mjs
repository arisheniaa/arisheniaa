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
 *  · ошибки консоли и pageerror.
 *
 * Выход кодом 1 при любом провале. Проба на «умеет ли краснеть» — флаг
 * `--redproof`: подставляет заведомо отсутствующую строку в список дословных,
 * заведомо неверный порог скролла и заведомо невыполнимый запрет.
 */
import { chromium } from 'playwright';

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

await browser.close();

console.log('');
if (fails.length) {
  console.log(`ПРОВАЛОВ: ${fails.length}`);
  process.exit(1);
}
console.log('САМОПРОВЕРКА ЗЕЛЁНАЯ — все проверки выполнены и все прошли');
