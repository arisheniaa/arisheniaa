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
 *  · РЕДАКЦИЯ 3 (Ф29, раздел 5 ниже) — семь измеримых проверок, по одной на
 *    пункт: тилт карточек реально поворачивает кадр, цена — см. правку ниже,
 *    курсор-метка реально меняет видимость и не более системный grab/
 *    grabbing, боковой индикатор реально светится на активной секции,
 *    EXIF-подпись реально появляется и не несёт выдуманных технических
 *    деталей, папки отдачи реально раскрываются несимметрично, настроение
 *    полотна реально меняется непрерывно при проходе диптиха, и в src/ нет
 *    ни одного звукового API (владелица прямо попросила «без звуков» —
 *    прежний черновой пакет включал звук затвора);
 *  · РЕДАКЦИЯ 5 (Ф36 п.8, раздел 5.2 ниже, ОТМЕНА Ф29 п.6) — цена плашки
 *    больше НЕ ждёт клика: закрыта до попадания в кадр, «дверца» реально
 *    открывается один раз при скролле (clip-path на `.reveal`/`is-sharp`,
 *    не blur за клик-гейтом), текст дословно в DOM независимо от состояния,
 *    формат «город — цена/час» реально на странице.
 *
 * Выход кодом 1 при любом провале. Проба на «умеет ли краснеть» — флаг
 * `--redproof`: подставляет заведомо отсутствующую строку в список дословных,
 * заведомо неверный порог скролла и заведомо невыполнимый запрет.
 */
import { chromium } from 'playwright';
import sharp from 'sharp';
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
  'Нажми на меня',
  'на цифру',
  'на плёнку',
  'Творческая',
  'Вы всегда можете связаться со мной, кликнув сюда.',
  // Ф28: навигация, состав и подписи дословно (Ф36 п.1 правит состав — см. ниже)
  'Главная',
  'Обо мне',
  'Что снимаю',
  'Контакты',
  // Ф28: два слова контактов
  'телеграм',
  'инстаграм',
  // Ф28: новое пояснение к демонстрации отдачи, дословно владелицы
  'Пришлю ссылочку на папку, где будут ваши фотографии. Если у вас была ещё плёнка, то папки будет две.',
  // имя — только латиница (Ф28)
  'arisheniaa',
  // РЕДАКЦИЯ 5 (Ф36 п.1) — навигация правлена
  'С чего начать',
  // Ф36 п.2 — второе предложение лида, переписанное под её пример
  'Создадим ваше кино',
  'запечатлим его в статичных кадрах',
  // Ф36 п.5 — новый текст диптиха «Как получается кино», дословно, строчными
  'Иногда образ и реквизит собирается необычным способом',
  'взяла у деда шапку-ушанку и бабушкину шаль',
  'А для эльфийской съемки даже сшила платье!',
  'По планам утром должен быть туман',
  'вот где рождается настоящая киношность...',
  // Ф36 п.7 — новая вводная строка блока услуг
  'На ваш выбор классика и творчество',
  // Ф36 п.8 — карточки услуг переименованы, новая подпись, новая 4-я карточка
  'Индивидуальная',
  'Парная',
  '30 снимков за час в авторской обработке',
  'Плёночная',
  'сделаем пленочные воспоминания',
  // Ф36 п.9 + Ф37 п.1–2 — новый заголовок и текст всех четырёх шагов
  'С чего начать и как это всё устроено',
  'Начните с самого простого',
  'может создадим идею вместе',
  // новый факт — размер предоплаты 2 000 ₽ (Ф36 п.9, впервые назван)
  'внесете предоплату в размере 2 000 рублей',
  'Во время съемки я подскажу как встать',
  'Отбираю кадры самостоятельно',
  'Фотографии на Диске хранятся месяц',
  ...(RED ? ['ТАКОЙ СТРОКИ В COPY НЕТ'] : []),
];

/** Строки, которых на странице быть не должно, с причиной снятия. */
const FORBIDDEN = [
  ['Пишите, даже если ещё не решили', 'home:cta.title — снят Ф28'],
  ['самозанят', 'юрстатус — запрещён Ф17, дефект сборки по Ф28'],
  ['ИП,', 'юрстатус — запрещён Ф17'],
  ['Серия «', 'навигация по фотографиям в подвале — снята Ф28'],
  ['VK', 'заглушка контактов — снята Ф28, «больше ничего добавлять не нужно»'],
  ['Шесть кадров', 'секция home:grid — выключена Ф28'],
  ['аришения', 'кириллическое имя на экране — снято Ф28, «оставь его на латинице»'],
  // РЕДАКЦИЯ 5 (Ф36/Ф37) — снятое этой правкой
  ['Работы', 'нав-пункт «Работы» снят Ф36 п.1'],
  ['Придумано заранее', 'метка-заголовок диптиха снята Ф36 п.5'],
  ['Найдено на месте', 'метка-заголовок диптиха снята Ф36 п.5'],
  ['Один человек', 'карточка переименована в «Индивидуальная» Ф36 п.8'],
  ['Весь прайс и условия', 'ссылка под карточками услуг снята Ф36 п.8'],
  ['Помогу подготовиться к съёмке', 'секция FAQ выключена Ф37 п.4'],
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
/* НАХОДКА, а не косметика (поймана диагностикой при провале, не рассуждением).
   Проверка 5.2 («плашка цены появляется при наведении») падала в полном
   прогоне и проходила в одиночном. Диагностика в момент провала показала
   картину, которую невозможно было увидеть по прежнему сообщению: точка
   курсора ВНУТРИ карточки, `elementFromPoint` возвращает её же потомка — и
   при этом `.offer-card:hover` не совпадает. То есть навели правильно, а к
   моменту чтения курсор оказался не там: карточка, которую `clearHeader`
   ставил на 160 px от верха, к концу ожидания стояла на 548 px.

   Причина не в сайте. Раскладка ещё ехала, когда мышь уже поставили:
   фотографии выше по странице грузятся лениво (Ф41) и досчитываются после
   прокрутки. А браузер НЕ пересчитывает `:hover` при сдвиге раскладки под
   неподвижным курсором — только на следующее движение мыши. Живой читатель
   в это не попадает: у него курсор двигается. Попадает тест, который водит
   мышью один раз и дальше считает страницу застывшей.

   Прежние 280 мс были той же ставкой на «наверное, успеет», что и
   фиксированные ожидания, уже дважды заменённые в этом файле на опрос
   реального состояния. Меняем и здесь: ждём не время, а ФАКТ — верх
   элемента перестал меняться пять кадров подряд. Потолок в 120 кадров (~2 с)
   на случай вечно едущей раскладки: лучше проверить на неустоявшейся
   странице и честно упасть, чем зависнуть. */
async function clearHeader(locator, offset = 160) {
  await locator.evaluate((el, off) => {
    const y = el.getBoundingClientRect().top + window.scrollY - off;
    window.scrollTo({ top: Math.max(0, y), left: 0, behavior: 'instant' });
  }, offset);
  await locator.evaluate(
    (el) =>
      new Promise((done) => {
        let prev = null;
        let stable = 0;
        let frames = 0;
        const tick = () => {
          const top = Math.round(el.getBoundingClientRect().top);
          if (top === prev) stable += 1;
          else {
            stable = 0;
            prev = top;
          }
          frames += 1;
          if (stable >= 5 || frames > 120) done();
          else requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }),
  );
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
  /* Ф40/Ф41: кадров услуг больше не четыре. Две карточки из четырёх
     («Творческая» и «Плёночная») показывают теперь не одиночный снимок, а
     веер — по пять кадров в каждом. Итого 2 одиночных + 5 + 5 = 12.
     Проверяем состав, а не одно число: одиночные кадры остались ровно у
     первых двух карточек, а веерные лежат в своих папках. Так проверка
     переживёт следующее изменение числа кадров в веере, но заметит, если
     карточка молча потеряет фотографию. */
  const has = (re) => shots.some((s) => re.test(s.src));
  const idea = shots.filter((s) => s.src.startsWith('/services/idea/')).length;
  const film = shots.filter((s) => s.src.startsWith('/services/film/')).length;
  note(
    has(/individualnaya/) && has(/parnaya/) && has(/tvorcheskaya/) && has(/plenka/),
    'все четыре карточки услуг показывают свой кадр (индивидуальная, парная, творческая, плёночная)',
  );
  /* Кадры вееров лежат в своих папках, а первым кадром каждого веера стоит
     прежний одиночный снимок карточки (`tvorcheskaya.webp`, `plenka.webp`) —
     поэтому 4 + 4 в папках плюс 4 на верхнем уровне = 12. Считаем папки, а
     не общее число: так проверка переживёт добавление кадра в веер, но
     заметит, если веер молча опустеет. */
  note(idea >= 4 && film >= 4, `в веерах творческой и плёночной по 4+ кадра (idea: ${idea}, film: ${film})`);
  note(shots.length === 12, `всего кадров услуг: ${shots.length} (2 карточки + 2 веера по 5)`);
  const widest = Math.max(0, ...shots.map((s) => s.w));
  note(
    RED ? widest < 10 : widest <= 304,
    `показ кадров услуг уменьшен: самый крупный ${widest} px при потолке 304 px`,
  );
  note(
    shots.some((s) => s.src.includes('plenka')),
    'слот «плёнка» на месте (services/plenka.webp)',
  );

  /* Звёзды светятся (Ф28). ПРОВЕРКА ПЕРЕВЕДЕНА НА ФИГУРУ (Ф58): раньше здесь
     читался вычисленный `filter` на группе звезды, и это было верно, пока
     свечение делалось `drop-shadow`. Теперь ореол — настоящий круг с
     градиентной заливкой, потому что WebKit обрезал фильтр по границам
     фигуры и на iPhone владелицы свечения не было вовсе. */
  const glow = await page.evaluate(() => {
    const g = document.querySelector('svg [data-star]');
    if (!g) return { есть: false };
    const c = g.querySelector('[data-glow]');
    return {
      есть: !!c,
      заливка: c?.getAttribute('fill') ?? '',
      радиус: Number(c?.getAttribute('r') ?? 0),
      всего: document.querySelectorAll('svg [data-star]').length,
      сОреолом: document.querySelectorAll('svg [data-star] [data-glow]').length,
    };
  });
  note(
    RED ? !glow.есть : glow.есть && /^url\(#/.test(glow.заливка) && glow.радиус > 50,
    `звёзды светятся: у звезды есть ореол-фигура (заливка ${glow.заливка || '—'}, радиус ${glow.радиус})`,
  );
  note(
    glow.всего > 0 && glow.всего === glow.сОреолом,
    `ореол у КАЖДОЙ звезды, а не у первой (звёзд ${glow.всего}, ореолов ${glow.сОреолом})`,
  );

  await ctx.close();
}

/* ─── 2b. Свечение звёзд не сделано фильтром, одинаково на всех вводах и
   не мигает (Ф55 → Ф56 → Ф57 → Ф58) ───────────────────────────────────────

   ЭТУ ПРОВЕРКУ ПЕРЕПИСЫВАЛИ ЧЕТЫРЕЖДЫ, И КАЖДАЯ РЕДАКЦИЯ — ОТДЕЛЬНЫЙ УРОК.
   Ф55 требовала, чтобы свечение КОЛЕБАЛОСЬ; Ф56 — чтобы было ровным и
   заметно бо́льшим по радиусу; Ф57 — чтобы рецепт на тач-вводе совпадал с
   курсорным. Все три зеленели, и всё это время на iPhone владелицы свечения
   не было ВООБЩЕ: оно делалось CSS-фильтром `drop-shadow` на SVG-группе, а
   WebKit обрезает такой фильтр по границам самой фигуры. Ни одна проверка
   этого не ловила, потому что все они спрашивали у CSSOM, ЧТО ЗАПИСАНО, а
   записано было правильно — не рисовалось.

   ОТСЮДА ПЕРВОЕ УТВЕРЖДЕНИЕ И ГЛАВНОЕ: свечение НЕ ДОЛЖНО быть фильтром.
   Это структурный сторож, а не измерение. Проверить «нарисовалось ли» из
   Chromium нельзя — дефект был только на iOS; но можно раз и навсегда
   запретить механизм, который на iOS не работает. Если фильтр вернётся,
   проверка покраснеет здесь, а не через неделю в переписке.

   Остальные два утверждения сохранены от прежних редакций: ореол одинаков
   для пальца и курсора (Ф57) и не мигает (Ф56). Обе ветки снимаются на
   ОДНОЙ ширине 390 px с подменённым `matchMedia` — одна и та же россыпь,
   отличается только ответ про наличие курсора. */
{
  const снять = async (hover) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await ctx.addInitScript((h) => {
      const real = window.matchMedia.bind(window);
      window.matchMedia = (q) =>
        q.includes('hover: hover') || q.includes('pointer: fine')
          ? { matches: h, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false }
          : real(q);
    }, hover);
    const page = await ctx.newPage();
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.evaluate(() => window.scrollTo({ top: window.innerHeight * 1.2, left: 0, behavior: 'instant' }));
    await page.waitForTimeout(900);

    const снимок = () =>
      page.evaluate(() => {
        const g = document.querySelector('svg [data-star]');
        const c = g?.querySelector('[data-glow]');
        return {
          радиус: Number(c?.getAttribute('r') ?? 0),
          плотность: c?.getAttribute('opacity') ?? '',
          заливка: c?.getAttribute('fill') ?? '',
          // фильтров на звёздах быть не должно ни одного
          сФильтром: [...document.querySelectorAll('svg [data-star]')].filter(
            (n) => getComputedStyle(n).filter !== 'none',
          ).length,
        };
      });

    const ряд = [];
    for (let i = 0; i < 6; i++) {
      ряд.push((await снимок()).радиус);
      if (i < 5) await page.waitForTimeout(400);
    }
    const итог = await снимок();
    await ctx.close();
    return { ...итог, ряд };
  };

  const тач = await снять(false);
  const курсор = await снять(true);

  note(
    RED ? тач.сФильтром > 0 : тач.сФильтром === 0,
    `свечение НЕ сделано CSS-фильтром — WebKit обрезает такой фильтр по фигуре (звёзд с filter: ${тач.сФильтром})`,
  );
  note(
    RED ? тач.радиус !== курсор.радиус : тач.радиус === курсор.радиус && тач.плотность === курсор.плотность,
    `ореол на тач-вводе тот же, что под курсором (радиус ${тач.радиус} против ${курсор.радиус}, плотность ${тач.плотность} против ${курсор.плотность})`,
  );

  const размах = Math.max(...тач.ряд) - Math.min(...тач.ряд);
  note(
    RED ? размах > 0.5 : размах <= 0.5,
    `свечение РОВНОЕ, не мигает: за 2 с радиус ореола изменился на ${размах.toFixed(1)} (${тач.ряд.join('/')})`,
  );
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
  const flat = await frame.evaluate((el) => getComputedStyle(el).transform);

  /* НАВЕДЕНИЕ С ПРОВЕРКОЙ ФАКТА, А НЕ «посчитали точку и поверили».
     Точка нужна именно смещённая от центра (12 % от угла): тилт зависит от
     положения курсора внутри карточки, и в центре он равен нулю — поэтому
     `locator.hover()`, целящийся в центр, здесь не годится и заменить им
     нельзя. Но координата, посчитанная заранее, устаревает, если раскладка
     шевельнётся: фотографии выше по странице догружаются лениво (Ф41), и
     курсор остаётся стоять там, где карточки уже нет. Браузер при этом НЕ
     пересчитывает `:hover` под неподвижной мышью — та же причина, по которой
     чинили `clearHeader` и проверку плашки цены.

     Поэтому здесь: замерили → навели → СПРОСИЛИ, попали ли. Не попали —
     замерили заново. Три попытки: больше одного промаха подряд означало бы
     не гонку, а по-настоящему едущую страницу, и тогда правильно упасть. */
  for (let попытка = 0; попытка < 3; попытка++) {
    const box = await frame.boundingBox();
    await page.mouse.move(box.x + box.width * 0.12, box.y + box.height * 0.12, { steps: 5 });
    await page.waitForTimeout(250);
    const попали = await frame.evaluate((el) => el.matches(':hover'));
    if (попали) break;
  }
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

/* ─── 5.2. Цена открыта сразу, «дверца» отыгрывает один раз (Ф36 п.8,
   ОТМЕНА Ф29 п.6). Владелица: «сделай плашку как дверцу, открывающуюся
   снизу вверх, чтобы было сразу видно стоимость и город, а не только
   город» — проверка перевёрнута против прежней (была: скрыта до клика). ─── */
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: 'networkidle' });
  const plate = page.locator('.price-plate').first();

  // Больше не кнопка: открывать по клику нечего.
  const tag = await plate.evaluate((el) => el.tagName);
  note(RED ? tag === 'BUTTON' : tag !== 'BUTTON', `.price-plate — не <button> (получен <${tag.toLowerCase()}>)`);
  const hasExpanded = await plate.evaluate((el) => el.hasAttribute('aria-expanded'));
  note(!hasExpanded, 'на плашке нет aria-expanded — открывать нечего, дверца не гейт');

  /* ═══ ПЕРЕПИСАНО Ф40 ═══════════════════════════════════════════════════
     Здесь проверялась «дверца» — `clip-path` на `.price-plate-digits`,
     открывавшаяся при входе секции в кадр. Ни узла, ни механики больше нет:
     владелица попросила прятать ПЛАШКУ ЦЕЛИКОМ, вместе с городом и «/час»,
     и показывать её при наведении на КАРТОЧКУ услуги. Разбор строки на
     «цифры» и «остальное» вместе с классом `price-plate-digits` снят —
     прятать внутренность того, что скрыто целиком, незачем.

     Проверка не удалена, а переведена на новую механику: скрыто в покое →
     видно при наведении на карточку → место под плашку схлопнуто в покое и
     раскрывается вместе с ней (описание стоит «вместо цены», Ф40).

     Старый прогон падал здесь ЖЁСТКО — `locator.evaluate` ждал
     несуществующий узел 30 секунд и валил весь скрипт, не добежав до
     оставшихся разделов. Это отдельная находка: проверка, привязанная к
     внутренней разметке, не просто устаревает, а глушит соседей. */
  const card = page.locator('.offer-card').first();
  const slot = card.locator('.offer-price').first();
  await clearHeader(card);
  await page.waitForTimeout(400);

  const idle = await slot.evaluate((el) => {
    const p = el.querySelector('.price-plate');
    const cs = getComputedStyle(p);
    return { h: Math.round(el.getBoundingClientRect().height), vis: cs.visibility, op: cs.opacity };
  });
  note(
    RED ? idle.vis === 'visible' : idle.vis === 'hidden' && idle.h === 0,
    `в покое плашка скрыта и места не занимает: visibility=${idle.vis}, высота слота ${idle.h}px`,
  );

  await card.hover();
  /* НАХОДКА, тот же класс, что уже пойман в `selfcheck-storyboard.mjs` §13.10
     (веер: гонка теста с CSS-переходом): фиксированный `waitForTimeout(1100)`
     после 620+180+460 мс перехода проходил в одиночном прогоне этого блока,
     но интермиттентно (замерено — 1 провал из 3 полных прогонов файла)
     проваливался, когда блок выполнялся ПОСЛЕ уже открытых/закрытых
     контекстов остальных разделов: под накопленной нагрузкой переход и
     фиксированное ожидание расходятся по времени, и проверка читает
     геометрию раньше, чем переход реально закончился — не дефект механики
     (изолированный прогон того же взаимодействия через тот же `card.hover()`
     всегда проходил зелёным), а гонка теста с анимацией. Исправлено тем же
     приёмом: `waitForFunction`, опрашивающий РЕАЛЬНОЕ состояние до
     устойчивого результата, с запасом 3000 мс, вместо гадания интервалом. */
  try {
    await page.waitForFunction(
      (prevH) => {
        const p = document.querySelector('.offer-card .price-plate');
        if (!p) return false;
        const cs = getComputedStyle(p);
        const h = Math.round(p.closest('.offer-price').getBoundingClientRect().height);
        return cs.visibility === 'visible' && Number(cs.opacity) > 0.9 && h > prevH;
      },
      idle.h,
      { timeout: 6000 },
    );
  } catch {
    /* таймаут — ниже читаем финальное состояние и note() честно провалит проверку.
       6000, не 3000: замерено, что 3000 мс под полной нагрузкой всего файла
       (30+ последовательных контекстов до этой точки) иногда не хватает —
       не гадание, а поднятый запас после наблюдения. */
  }

  /* ДИАГНОСТИКА ПРИ ПРОВАЛЕ. Проверка спотыкалась, и по сообщению
     «visibility=hidden» нельзя было понять, что именно не сработало:
     наведение не долетело, попало в другой элемент или переход не успел.
     Снимаем состояние наведения вместе с тем, ЧТО реально лежит под точкой
     курсора, — иначе следующий разбор начнётся с тех же догадок. */
  const диаг = await page.evaluate(() => {
    const c = document.querySelector('.offer-card');
    const r = c.getBoundingClientRect();
    const x = Math.round(r.left + r.width / 2);
    const y = Math.round(r.top + r.height / 2);
    const top = document.elementFromPoint(x, y);
    return {
      подHover: c.matches(':hover'),
      точка: x + ',' + y,
      карточка: Math.round(r.top) + '..' + Math.round(r.bottom),
      сверху: top ? top.tagName + '.' + (typeof top.className === 'string' ? top.className.split(' ').slice(0, 2).join('.') : '') : 'ничего',
      вКарточке: top ? c.contains(top) : false,
    };
  });

  const hot = await slot.evaluate((el) => {
    const p = el.querySelector('.price-plate');
    const cs = getComputedStyle(p);
    return { h: Math.round(el.getBoundingClientRect().height), vis: cs.visibility, op: cs.opacity };
  });
  note(
    RED ? hot.vis === 'hidden' : hot.vis === 'visible' && Number(hot.op) > 0.9,
    `при наведении на карточку плашка появляется: visibility=${hot.vis}, opacity=${hot.op}` + (hot.vis === 'visible' ? '' : ` · диагностика: :hover=${диаг.подHover}, точка ${диаг.точка}, карточка y ${диаг.карточка}, сверху ${диаг.сверху}, внутри карточки=${диаг.вКарточке}`),
  );
  note(
    RED ? hot.h === 0 : hot.h > idle.h,
    `место под плашку раскрывается, описание съезжает вниз: слот ${idle.h}px → ${hot.h}px`,
  );

  /* Дословность: полная строка цены стоит в DOM ВСЕГДА — «дверца» визуальная
     (clip-path), а не удаление текста, независимо от того, успела она
     открыться или нет. Проверяем на СОСЕДНЕЙ плашке (не той, к которой
     скроллили целенаправленно), тот же принцип доказательства, что был у
     прежнего blur: приглушение/дверца не должны прятать текст от DOM. */
  const closedPlateText = await page
    .locator('.price-plate')
    .nth(1)
    .evaluate((el) => el.textContent.replace(/\s+/g, ' ').trim());
  note(
    /\d[\d ]*₽/.test(closedPlateText),
    `цена целиком в DOM даже в закрытом состоянии (получено: «${closedPlateText}»)`,
  );

  // Новый формат — город впереди цены (Ф36 п.8): «Москва — ... ₽/час».
  note(
    /Москва.*₽\/час.*Тула.*₽\/час/.test(closedPlateText),
    `формат цены «город — цена/час» (получено: «${closedPlateText}»)`,
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

  /* Ждём ФАКТ появления индикатора, а не полагаемся на `networkidle`. Тот
     говорит только про сеть: разметка к этому моменту может быть ещё не
     смонтирована. Раньше успевало случайно, а с Ф58 у каждой звезды россыпи
     появился отдельный узел ореола (порядка пятисот на страницу), монтирование
     стало чуть длиннее — и проверка начала читать пустой DOM. Дефект был не в
     индикаторе, а в допущении «после networkidle всё нарисовано»; это третье
     такое место в файле, вылеченное одинаково — ожиданием факта. */
  await page.waitForFunction(() => document.querySelectorAll('.section-stars .section-star').length > 0, null, {
    timeout: 5000,
  });
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

/* ─── 5.5. EXIF-подпись плёночного кадра — СНЯТА С ЭКРАНА (Ф40) ─────────
   Подпись «плёнка» (Ф29 п.5) висела на плёночной карточке ровно потому, что
   её кадр был ЕДИНСТВЕННЫМ подтверждённым плёночным на сайте. Ф40 заменила
   одиночный кадр веером из пяти — плёночные теперь все, и одна подпись
   превратилась бы в пять одинаковых ярлыков.

   Проверка не удалена, а перевёрнута: узла быть не должно, а запрет на
   выдуманные технические детали (OQ-21) остаётся в силе и проверяется как
   прежде — он про весь текст страницы, а не про этот узел.

   Старый прогон падал здесь ЖЁСТКО: `clearHeader` ждал `.film-tag` тридцать
   секунд и валил скрипт, не добежав до разделов 5.6+. Второй случай той же
   болезни за один прогон (первый — `.price-plate-digits`), и вывод из него
   тот же: проверка, привязанная к внутренней разметке, при её изменении не
   просто устаревает, а глушит соседей. */
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 2400 } });
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: 'networkidle' });

  const tagCount = await page.locator('.film-tag').count();
  note(
    RED ? tagCount > 0 : tagCount === 0,
    `EXIF-подпись снята с экрана вместе с одиночным кадром плёночной (найдено узлов: ${tagCount})`,
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
      /* Ф45: переменная переехала с корня на `.canvas` — на корне её больше
         нет, и проверка читала бы пустую строку. Читаем там, где пишем. */
    page.evaluate(() =>
      Number(getComputedStyle(document.querySelector('.canvas')).getPropertyValue('--mood')),
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

/* ═══════════════════ 6. РЕДАКЦИЯ 5 (Ф36 + Ф37 п.1–4, FACTS.md) ═══════════
   Измеримые проверки структуры, не только текста: сколько кадров в рэке,
   порядок и состав навигации, позиция подписи у папок, и что якорь навигации
   не ведёт в никуда после выключения FAQ. */

/* ─── 5.8. В полотне нет прямых границ (Ф55) ─────────────────────────────
   ПОЧЕМУ ЭТА ПРОВЕРКА ПОЯВИЛАСЬ. Владелица прислала кадр с ноутбука, на
   котором в фоне видна прямая вертикаль во всю высоту экрана. Ни одна из
   133 проверок этого файла её не ловила: все они спрашивают у DOM про
   свойства узлов, а дефект был в ПИКСЕЛЯХ — край коробки слоя, уехавший
   `transform`ом в кадр, с градиентом, не дошедшим на этом краю до нуля.
   Свойства узлов при этом были совершенно правильные.

   ЧТО МЕРЯЕМ. Полотно — сумма радиальных пятен, то есть поле, обязанное
   меняться плавно. Любая прямая линия в нём — край слоя. Для каждой
   колонки берём медиану по строкам от разницы с соседней колонкой: у
   плавного поля это 0–1 единица, у края слоя — всплеск сразу по всей
   высоте, и медиана его показывает, а одиночные пиксели её не сдвинут.
   То же по строкам.

   ПОРОГ 3 ЕДИНИЦЫ на 8-битный канал. Он не «с запасом на глазок»: замер до
   правки давал одиночный всплеск в 14 единиц, замер после — ровные 1–3
   единицы по 350 колонкам из 389, то есть обычное квантование градиента
   без единого выброса. Три — верхняя граница этого шума, четыре и выше уже
   означают линию.

   ПРОВЕРЯЕМ ПРИ ПОЛНОЙ ПРОКРУТКЕ. Слои разъезжаются от `--sp`, и худший
   случай — низ страницы, где сдвиг максимален, а пятна `.mesh-b1`/`.mesh-b2`
   вдобавок выходят на полную непрозрачность. Именно там дефект и был виден.

   ОСТАЛЬНАЯ СТРАНИЦА СПРЯТАНА. Буквы и фотографии сами по себе дают резкие
   переходы, к градиенту не относящиеся; зерно ровно по всему экрану и
   одинаково сдвинуло бы обе стороны сравнения. */
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.addStyleTag({
    content: `body * { visibility: hidden !important; }
              .canvas, .canvas * { visibility: visible !important; }
              .grain-veil { display: none !important; }`,
  });
  await page.evaluate(() => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo({ top: max, left: 0, behavior: 'instant' });
  });
  await page.waitForTimeout(500);

  const buf = await page.screenshot();
  const { data, info } = await sharp(buf).raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H, channels: CH } = info;
  const at = (x, y, k) => data[(y * W + x) * CH + k];
  const шаг = (x1, y1, x2, y2) => Math.max(...[0, 1, 2].map((k) => Math.abs(at(x1, y1, k) - at(x2, y2, k))));
  const медиана = (a) => {
    const s = [...a].sort((x, y) => x - y);
    return s[Math.floor(s.length / 2)];
  };

  let худшая = 0;
  let где = '—';
  for (let x = 0; x < W - 1; x++) {
    const col = [];
    for (let y = 0; y < H; y += 3) col.push(шаг(x, y, x + 1, y));
    const m = медиана(col);
    if (m > худшая) (худшая = m), (где = `вертикаль на ${((x / W) * 100).toFixed(1)}% ширины`);
  }
  for (let y = 0; y < H - 1; y++) {
    const row = [];
    for (let x = 0; x < W; x += 3) row.push(шаг(x, y, x, y + 1));
    const m = медиана(row);
    if (m > худшая) (худшая = m), (где = `горизонталь на ${((y / H) * 100).toFixed(1)}% высоты`);
  }

  note(
    RED ? худшая > 3 : худшая <= 3,
    `в полотне нет прямых границ: самый резкий переход ${худшая} ед. при пороге 3 (${где})`,
  );
  await ctx.close();
}

/* ─── 6.1. Рэк — 12 кадров, altar в числе первых видимых (Ф36 п.3 + Ф38) ─── */
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: 'networkidle' });
  const count = await page.evaluate(
    () => document.querySelector('.rack-stack')?.querySelectorAll('[data-layer]').length,
  );
  note(RED ? count !== 12 : count === 12, `в рэке 12 кадров (получено ${count})`);

  // счётчик рэка отражает то же число — «01 / 12», не старое «01 / 08»
  const counterText = await page.evaluate(() => {
    const stack = document.querySelector('.rack-stack');
    const counter = stack?.parentElement?.querySelector('.rack-next')?.parentElement;
    return (counter?.textContent || '').replace(/\s+/g, ' ').trim();
  });
  note(counterText.includes('/ 12'), `счётчик рэка показывает «/ 12» (получено «${counterText}»)`);

  // altar.webp — среди первых ДВУХ слоёв стопки (Ф38: «в первом
  // перелистывании снимков»), не в хвосте пула из двенадцати.
  const altarDepth = await page.evaluate(() => {
    const layers = [...document.querySelectorAll('.rack-stack [data-layer] img')];
    return layers.findIndex((img) => img.getAttribute('src')?.includes('altar'));
  });
  note(
    RED ? altarDepth < 0 || altarDepth > 1 : altarDepth >= 0 && altarDepth <= 1,
    `altar.webp среди первых двух кадров стопки (позиция ${altarDepth})`,
  );
  await ctx.close();
}

/* ─── 6.2. Навигация: состав и порядок (Ф36 п.1) ─── */
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: 'networkidle' });
  const labels = await page.evaluate(() =>
    [...document.querySelectorAll('header nav[aria-label="Разделы сайта"] .nav-link')].map(
      (a) => a.textContent.trim(),
    ),
  );
  const expected = ['Главная', 'Обо мне', 'Что снимаю', 'Придумать съёмку', 'С чего начать', 'Контакты'];
  const matches = labels.join('|') === expected.join('|');
  note(
    RED ? !matches : matches,
    `навигация: состав и порядок дословно (получено: ${labels.join(' · ')})`,
  );
  note(!labels.includes('Работы'), '«Работы» в навигации нет (снята Ф36 п.1)');
  await ctx.close();
}

/* ─── 6.3. Якорь «С чего начать» ведёт на реальную секцию, не в никуда
   (находка координатора при выключении FAQ, README § 10) ─── */
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: 'networkidle' });
  const href = await page
    .locator('header nav[aria-label="Разделы сайта"] .nav-link', { hasText: 'С чего начать' })
    .getAttribute('href');
  const anchor = (href || '').split('#')[1];
  const targetExists = await page.evaluate(
    (id) => !!document.getElementById(id),
    anchor,
  );
  note(RED ? !targetExists : targetExists, `якорь «${href}» указывает на существующий узел (#${anchor})`);
  // Ровно один узел с этим id — не два одноимённых якоря (Faq() сохранил бы
  // мину, если бы не снял id при выключении).
  const dupeCount = await page.evaluate((id) => document.querySelectorAll(`#${id}`).length, anchor);
  note(dupeCount === 1, `#${anchor} встречается ровно один раз в документе (найдено ${dupeCount})`);
  await ctx.close();
}

/* ─── 6.4. Пояснение под папками отдачи стоит НАД папкой, не под (Ф37 п.3) ─── */
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: 'networkidle' });
  const order = await page.evaluate(() => {
    const root = document.querySelector('.delivery');
    if (!root) return null;
    const kids = [...root.children];
    const noteIdx = kids.findIndex((k) => k.tagName === 'P');
    const stageIdx = kids.findIndex((k) => k.classList.contains('delivery-stage'));
    return { noteIdx, stageIdx };
  });
  note(
    RED ? order.noteIdx > order.stageIdx : order.noteIdx < order.stageIdx,
    `пояснение (<p>) стоит в DOM раньше .delivery-stage (note=${order?.noteIdx}, stage=${order?.stageIdx})`,
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
