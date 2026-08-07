/**
 * САМОПРОВЕРКА ФИЧИ «ПРИДУМАТЬ СЪЁМКУ» (`BRIEF-STORYBOARD.md`,
 * `.design/hybrid/STORYBOARD.md`). Отдельный скрипт от `selfcheck.mjs`
 * (тот проверяет главную) — но РЕДАКЦИЯ 4 (Ф33/Ф34) добавила фиче кусок
 * интерфейса НА ГЛАВНОЙ (стрелка-подсказка `NavHint.tsx`), поэтому этот
 * скрипт теперь открывает ОБА адреса: `BASE` (сама фича) и `MAIN` (для
 * стрелки — она смотрит на главную, не на `storyboard.html`).
 *
 * Печатает измерения, не мнения, выходит кодом 1 при любом провале.
 * Проба на красноту — флаг `--redproof`, как в `selfcheck.mjs`.
 *
 * РЕДАКЦИЯ 4 переписывает бо́льшую часть этого файла: дерево вопросов стало
 * ветвящимся (`questions.ts`, `nextQuestionInTree`), поэтому старый помощник
 * `answerQuiz(page, [...])`, кликавший по фиксированному списку значений в
 * фиксированном порядке, для дерева не подходит — ветки расходятся уже на
 * первом вопросе. Новый помощник `clickTile` кликает ОДИН тайл по видимому
 * тексту и ничего не предполагает про то, какой вопрос идёт дальше.
 *
 * Проверяет:
 *  1. нет горизонтальной прокрутки на 360/375/390/768/1280/1920 — на входе,
 *     в середине САМОГО ГЛУБОКОГО пути дерева (вайб→одиночку→пол, 6 вопросов)
 *     и на результате; лендмарки по одному;
 *  2. дословность текста: nav «Придумать съёмку», заголовок и Pinterest-фраза
 *     экрана-входа (Ф33/Ф34), вопрос-дерево «Какой у вас повод посниматься?»
 *     с тремя новыми ответами, приписка внизу результата (Ф34);
 *  3. АЛГОРИТМ ДЕЙСТВИТЕЛЬНО ФИЛЬТРУЕТ ПО ОТВЕТАМ ПО ВСЕМ ВЕТКАМ ДЕРЕВА —
 *     не мнение, а измерение `data-*` атрибутов на карточках веера:
 *     3.1 формат+материал+бонус места (парная+цифра+студия, реюз таблицы
 *         STORYBOARD.md §5, детерминировано);
 *     3.2 МАТЕРИАЛ НЕ ОСЛАБЛЯЕТСЯ (Ф37, отменяет прежнее поведение): творческая
 *         +плёнка = 0 в архиве → честный пустой результат, не подмена цифрой;
 *     3.3 ЧЕСТНОЕ ослабление фильтра «парень» на плёнке (2 файла на плёнку из
 *         6 во всём архиве — Ф37, была папка «мужская, город» на 2 файла,
 *         теперь `парень/` на 6, из них только 2 плёночных), плюс граничный
 *         случай (материал не ограничен — ровно 6, MIN_POOL, НЕ ослабляется);
 *     3.4 ветка «Запечатлеть любовь» — формат жёстко «парная», без вопроса
 *         про формат/пол;
 *     3.5 ветка «Скоро день рождения» — обход формата, материал фильтрует
 *         строго/ослабляется по тем же правилам, место/образ честно не
 *         влияют (сообщение на экране);
 *     3.6 «Творческая» — тайл СНЯТ (Ф39 п.11), проверка перевёрнута: его не
 *         должно быть, вопрос о формате вернулся к двум ответам дерева Ф33.
 *         Вместе с тайлом из квиза ушёл единственный путь к нулевому
 *         результату — потеря покрытия записана у самой проверки (3.2);
 *     3.7 огрубление места «дома»/«на улице»/«в студии» → реальные категории
 *         архива (`pick.ts`, `placeMatches`);
 *  4. ДОСКИ PINTEREST НАКАПЛИВАЮТСЯ ПО ПУТИ (правка Ф34) — не шесть вкладок
 *     на одном вопросе, а список, зависящий от ответов, с проверкой на
 *     нескольких ветках, включая «без Pinterest вовсе» у дня рождения;
 *  5. КАРТОЧНЫЙ ВЕЕР — три состояния через computed geometry, не «элемент
 *     есть в DOM»: покой (перекрытие), разворот по наведению на контейнер,
 *     увеличение конкретной карточки; плюс тач/reduced-motion — веер
 *     показывает все фото сразу, без потери контента;
 *  6. СТРЕЛКА-ПОДСКАЗКА (Ф33 п.3, главная страница) — не видна на нулевом
 *     скролле, появляется после прокрутки, гаснет у контактов, не создаёт
 *     третий `<nav>`;
 *  7. скачанный файл действительно несёт подпись-ссылку (перехват `fillText`);
 *  8. `prefers-reduced-motion` не теряет контента на экране результата;
 *  9. плитки вопроса управляются с клавиатуры (Tab + Enter), лестница растёт.
 */
import { chromium } from 'playwright';
import fs from 'node:fs';

const BASE = 'http://127.0.0.1:5176/storyboard.html';
const MAIN = 'http://127.0.0.1:5176/';
const RED = process.argv.includes('--redproof');
const WIDTHS = [360, 375, 390, 768, 1280, 1920];

const fails = [];
const note = (ok, msg) => {
  console.log((ok ? '  ok   ' : '  FAIL ') + msg);
  if (!ok) fails.push(msg);
};

/** Оборачивает один раздел проверки: необработанное исключение внутри
 *  (например Playwright-таймаут одиночного `getAttribute`/`textContent` на
 *  локаторе, который не резолвится) раньше УБИВАЛО ВЕСЬ СКРИПТ целиком —
 *  зелёные проверки других 20+ разделов терялись из-за одной гонки в одном.
 *  Теперь исключение ловится, раздел считается проваленным ОДНОЙ строкой
 *  (не тихо пропускается), а следующие разделы всё равно выполняются. */
async function section(name, fn) {
  try {
    await fn();
  } catch (err) {
    note(false, `раздел «${name}» упал с необработанным исключением (не гейт, а сигнал разобраться): ${err.message.split('\n')[0]}`);
  }
}

/** Кликает "Начать" на экране-входе. */
/* НАХОДКА САМОПРОВЕРКИ (Ф40, при первом прогоне после Ф36–Ф39).
   Было `page.click('text=Начать')` — поиск по подстроке. Ф36 п.1
   переименовала пункт навигации «Подготовка к съёмке» → «С ЧЕГО НАЧАТЬ»,
   и с того момента подстрока «Начать» стала находить ДВА узла: кнопку
   экрана-входа и этот пункт меню. `.first()` в порядке документа — это
   пункт меню (шапка выше контента), а на 360 px он спрятан за кнопкой
   «Разделы», то есть невидим. Playwright послушно ждал 30 секунд, пока
   невидимый элемент станет видимым, и валился по таймауту — а следом
   рушились все разделы, которые зовут `start()`, то есть почти весь файл.
   Тринадцать «провалов» были одной опечаткой в селекторе.

   Тест молчал об этом с Ф36: пока никто не запускал самопроверку, поломка
   не проявлялась. Записано подробно, потому что это ровно тот случай, где
   отчёт «13 провалов» выглядит катастрофой, а причина — одна строка.

   Теперь роль + точное имя: кнопка ищется как кнопка, а пункт меню — ссылка
   и под этот селектор не попадает ни при каком совпадении текста. */
async function start(page) {
  await page.getByRole('button', { name: 'Начать', exact: true }).click();
  await page.waitForTimeout(200);
}

/** Кликает ОДИН тайл по видимому тексту (первое совпадение). Не предполагает
 *  ничего про то, какой вопрос сейчас показан — дерево решает это само. */
async function clickTile(page, text) {
  await page.waitForTimeout(150);
  await page.locator('.sb-tile', { hasText: text }).first().click();
  await page.waitForTimeout(220);
}

/** Проходит путь по массиву тайлов (по видимому тексту, в заданном порядке)
 *  до экрана результата. */
async function walkPath(page, tiles) {
  await start(page);
  for (const t of tiles) await clickTile(page, t);
  await page.waitForTimeout(300);
}

const browser = await chromium.launch();

/* ─── 1. Прокрутка и лендмарки на всех ширинах — вход / середина самого
   глубокого пути / результат ─── */
await section('1. ширины/лендмарки', async () => {
  // самый глубокий путь дерева: повод(вайб) → формат(одиночку) → пол → …
  const DEEP_START = ['Вайб имеется', 'В одиночку', 'Парень'];
  const DEEP_REST = ['Всё сразу', 'Пока не знаю', 'Ещё думаю'];

  for (const width of WIDTHS) {
    const ctx = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await ctx.newPage();
    const errs = [];
    page.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
    page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
    await page.goto(BASE, { waitUntil: 'networkidle' });

    let m = await page.evaluate(() => {
      const de = document.documentElement;
      return { sw: de.scrollWidth, cw: de.clientWidth };
    });
    note(RED ? m.sw < m.cw : m.sw === m.cw, `${width}px intro — scrollWidth ${m.sw} === clientWidth ${m.cw}`);

    await start(page);
    for (const t of DEEP_START) await clickTile(page, t);
    m = await page.evaluate(() => {
      const de = document.documentElement;
      return { sw: de.scrollWidth, cw: de.clientWidth };
    });
    note(
      RED ? m.sw < m.cw : m.sw === m.cw,
      `${width}px середина самого глубокого пути (лестница из 3 отвеченных вопросов) — scrollWidth ${m.sw} === clientWidth ${m.cw}`,
    );

    for (const t of DEEP_REST) await clickTile(page, t);
    await page.waitForTimeout(300);
    const toggle = page.locator('.nav-toggle');
    if (await toggle.isVisible()) await toggle.click();

    m = await page.evaluate(() => {
      const de = document.documentElement;
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
        h1: document.querySelectorAll('h1').length,
        levels: [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].map((h) => Number(h.tagName[1])),
      };
    });
    const ok = RED ? m.sw < m.cw : m.sw === m.cw;
    note(ok, `${width}px result — scrollWidth ${m.sw} === clientWidth ${m.cw}` + (ok ? '' : ` · вылезают: ${m.over.join(', ')}`));
    note(
      m.main === 1 && m.header === 1 && m.footer === 1 && m.nav === 1 && m.h1 === 1,
      `${width}px — лендмарки по одному (main ${m.main}, header ${m.header}, footer ${m.footer}, nav ${m.nav}, h1 ${m.h1})`,
    );
    let holes = [];
    for (let i = 1; i < m.levels.length; i++) {
      if (m.levels[i] - m.levels[i - 1] > 1) holes.push(`h${m.levels[i - 1]}→h${m.levels[i]}`);
    }
    note(holes.length === 0, `${width}px — иерархия заголовков без дыр${holes.length ? ': ' + holes.join(', ') : ''}`);
    note(errs.length === 0, `${width}px — консоль чиста${errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''}`);
    await ctx.close();
  }
});

/* ─── 2. Дословность текста (Ф33/Ф34) ─── */
await section('2. дословность текста', async () => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: 'networkidle' });
  let text = (await page.evaluate(() => document.body.textContent)).replace(/\s+/g, ' ');

  note(
    RED ? !text.includes('Придумать съёмку') : text.includes('Придумать съёмку'),
    'дословно: «Придумать съёмку» (формулировка подтверждена владелицей)',
  );
  /* Ф39 п.9 правит регистр («Соберем…»), слова не тронуты. Проверка ждёт
     именно прописную: строчная здесь была осознанным решением до Ф39, и
     если она когда-нибудь вернётся сама собой — это регресс, а не мелочь. */
  note(
    RED
      ? !text.includes('Соберем для вас референсы к вашей съемке')
      : text.includes('Соберем для вас референсы к вашей съемке'),
    'дословно (Ф33, регистр Ф39 п.9): заголовок экрана-входа «Соберем для вас референсы к вашей съемке»',
  );
  /* Ф39 п.10 заменяет «вдохновляясь» → «подвохновляемся», следующим
     сообщением она же поправила на «повдохновляемся». Ждём последнее. */
  note(
    RED
      ? !text.includes('и немного повдохновляемся моими уже собранными досками на Pinterest')
      : text.includes('и немного повдохновляемся моими уже собранными досками на Pinterest'),
    'дословно (Ф39 п.10, заменяет Ф34): «…и немного повдохновляемся моими уже собранными досками на Pinterest»',
  );

  await start(page);
  const q0title = await page.locator('h2').first().textContent();
  note(
    RED ? q0title !== 'Какой у вас повод посниматься?' : q0title === 'Какой у вас повод посниматься?',
    `дословно (Ф33): первый вопрос «Какой у вас повод посниматься?» (получено: «${q0title}»)`,
  );
  const q0tiles = await page.locator('.sb-tile').allTextContents();
  const expectedQ0 = ['Скоро день рождения', 'Вайб имеется', 'Запечатлеть любовь'];
  const hasAllQ0 = expectedQ0.every((t) => q0tiles.includes(t));
  note(
    RED ? !hasAllQ0 : hasAllQ0,
    `дословно (Ф33): три ответа первого вопроса — ${expectedQ0.join(' / ')} (получено: ${q0tiles.join(' | ')})`,
  );
  note(
    RED ? q0tiles.includes('День рождения') : !q0tiles.includes('День рождения'),
    'старая формулировка «День рождения» (редакция 1–3) больше не предлагается тайлом',
  );

  await clickTile(page, 'Вайб имеется');
  await clickTile(page, 'В одиночку');
  await clickTile(page, 'Парень');
  await clickTile(page, 'Всё сразу');
  await clickTile(page, 'Пока не знаю');
  await clickTile(page, 'Ещё думаю');
  await page.waitForTimeout(400);
  text = (await page.evaluate(() => document.body.textContent)).replace(/\s+/g, ' ');
  /* Регистр правлен Ф39 (п.6 «все в одной стилистике» + п.7 про прописные в
     начале предложений): «естественно» → «Естественно». Слова, смайлик и
     отсутствие «ё» — как были у владелицы. */
  const zapiska = 'Естественно это лишь наброски, еще больше идей может родиться в процессе обсуждения и переписки:)';
  note(RED ? !text.includes(zapiska) : text.includes(zapiska), `дословно (Ф34, регистр Ф39): приписка внизу результата — «${zapiska}»`);

  await ctx.close();
});

/* ─── 3. Алгоритм — по всем веткам дерева ─── */
await section('3. алгоритм по ветвям дерева', async () => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 1400 } });
  const page = await ctx.newPage();

  const fanData = async () =>
    page.locator('.sb-fan-item').evaluateAll((els) =>
      els.map((e) => ({
        format: e.getAttribute('data-format'),
        material: e.getAttribute('data-material'),
        place: e.getAttribute('data-place-category'),
        placeRaw: e.getAttribute('data-place-raw'),
        look: e.getAttribute('data-look'),
      })),
    );

  // 3.1 — жёсткий фильтр формат+материал, бонус места (детерминированно:
  //       парная+цифра+студия = ровно 6 из 17, STORYBOARD.md §5)
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await walkPath(page, ['Вайб имеется', 'Вдвоём', 'Цифра', 'В студии', 'Да, уже есть']);
  let figs = await fanData();
  note(figs.length === 6, `парная+цифра+студия — ровно 6 результатов (получено ${figs.length})`);
  note(
    RED ? !figs.every((f) => f.format === 'парная') : figs.every((f) => f.format === 'парная'),
    `все результаты формата «парная» (${figs.map((f) => f.format).join(',')})`,
  );
  note(figs.every((f) => f.material === 'цифра'), `все результаты материала «цифра» (${figs.map((f) => f.material).join(',')})`);
  note(
    figs.every((f) => f.place === 'студия'),
    `бонус места «в студии» → студия: все 6 результатов студия (детерминировано, их ровно 6 в пуле из 17): ${figs.map((f) => f.place).join(',')}`,
  );
  // Ф37: «не подписывай фотографии, пусть под снимками-референсами будет пусто» —
  // видимой подписи под кадром больше нет, но data-* атрибуты (проверены выше
  // через fanData()) остаются, поэтому убираем именно текст, не измеримость.
  const visibleCaptionCount = await page.locator('.sb-fan-item figcaption').count();
  note(visibleCaptionCount === 0, `под кадрами результата нет видимой подписи (Ф37) — найдено figcaption: ${visibleCaptionCount}`);

  /* 3.2 — МАТЕРИАЛ НЕ ОСЛАБЛЯЕТСЯ (Ф37) НА МАЛОМ ПУЛЕ.
     ПЕРЕПИСАНО Ф39 п.11. Раньше проверка ходила «Вайб → Творческая →
     Плёнка»: творческая+плёнка = 0 кадров в архиве, и результат обязан был
     остаться честно пустым, а не подмениться цифрой. Тайл «Творческая»
     владелица сняла («в вопросе 2 при выборе "вайб имеется" убери вариант
     "творческая - на мое усмотрение"»), и вместе с ним из квиза ушёл
     ЕДИНСТВЕННЫЙ путь к нулевому результату: реальные пулы теперь
     индивидуальная+плёнка 50, +цифра 96, парная+плёнка 9, +цифра 17 —
     нуля не даёт ни один (посчитано по `manifest.json`).

     ЗАПИСАННАЯ ПОТЕРЯ ПОКРЫТИЯ: состояние «не нашлось подходящих кадров»
     через квиз больше недостижимо и этим скриптом не проверяется. Сам код
     состояния жив (`StoryboardApp.tsx`, ветка `result.photos.length === 0`)
     и снят намеренно не был — недостижим стал ПУТЬ, а не состояние.

     Что проверяется вместо этого: на самом малом достижимом пуле
     (парная+плёнка = 9, ближайший к порогу MIN_POOL) материал остаётся
     строгим и сообщения об ослаблении нет. Это и есть суть Ф37 — просто
     измеренная там, куда квиз ещё может привести. */
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await walkPath(page, ['Вайб имеется', 'Вдвоём', 'Плёнка', 'Пока не знаю', 'Ещё думаю']);
  figs = await fanData();
  let relaxNote = (await page.locator('main').textContent()).replace(/\s+/g, ' ');
  const hasRelaxMsg = relaxNote.includes('набралось мало');
  note(RED ? hasRelaxMsg : !hasRelaxMsg, 'сообщение об ослаблении материала НЕ показывается — материал больше не ослабляется (Ф37)');
  note(figs.length > 0, `самый малый достижимый пул (парная+плёнка, 9 в архиве) даёт непустой результат: ${figs.length} кадров`);
  note(
    RED ? !figs.every((f) => f.material === 'пленка') : figs.every((f) => f.material === 'пленка'),
    `материал не подменён цифрой ни в одном кадре (${figs.map((f) => f.material).join(',')})`,
  );

  /* 3.3 — ТАЙЛА «ТВОРЧЕСКАЯ» БОЛЬШЕ НЕТ (Ф39 п.11, дословно: «в вопросе 2
     при выборе "вайб имеется" убери вариант "творческая - на мое
     усмотрение"»). Проверка перевёрнута: раньше требовала, чтобы тайл БЫЛ
     (он был добавкой координатора), теперь требует, чтобы его НЕ БЫЛО и
     чтобы вопрос вернулся к двум ответам дерева Ф33 ровно. Держим её, а не
     удаляем: снятый по прямой просьбе вариант не должен вернуться сам. */
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await start(page);
  await clickTile(page, 'Вайб имеется');
  const creativeTiles = await page.locator('.sb-tile', { hasText: 'Творческая' }).count();
  note(RED ? creativeTiles > 0 : creativeTiles === 0, `тайл «Творческая — на моё усмотрение» СНЯТ (Ф39 п.11) — найдено: ${creativeTiles}`);
  const vibeTiles = await page.locator('.sb-ladder-step--active .sb-tile').allInnerTexts();
  note(
    vibeTiles.length === 2 && vibeTiles.join('|') === 'В одиночку|Вдвоём',
    `вопрос о формате вернулся к двум ответам дерева Ф33: ${vibeTiles.join(' / ')}`,
  );

  // 3.4 — честное ослабление фильтра «парень» на материале «плёнка» (архив
  //       несёт метку «мужская» у 6 файлов всего, но только у 2 на плёнку —
  //       материал больше не ослабляется (Ф37), а вот пол по-прежнему может:
  //       пул «индивидуальная+плёнка+мужская» = 2 < MIN_POOL(6), фильтр по
  //       полу снимается, бонус всё равно поднимает оба плёночных мужских
  //       кадра в топ-6 среди остальных плёночных индивидуальных)
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await walkPath(page, ['Вайб имеется', 'В одиночку', 'Парень', 'Плёнка', 'Пока не знаю', 'Ещё думаю']);
  figs = await fanData();
  const genderNote = (await page.locator('main').textContent()).replace(/\s+/g, ' ');
  note(
    RED ? !genderNote.includes('пометкой «мужская»') : genderNote.includes('пометкой «мужская»'),
    'честное сообщение об ослаблении фильтра «парень» показано (плёнка несёт метку «мужская» только у 2 файлов)',
  );
  note(figs.every((f) => f.format === 'индивидуальная'), `формат остаётся строгим при ослаблении пола (${figs.map((f) => f.format).join(',')})`);
  note(figs.every((f) => f.material === 'пленка'), `материал остаётся строгим даже когда пол ослаблен (${figs.map((f) => f.material).join(',')})`);
  const maleCount = figs.filter((f) => (f.placeRaw || '').includes('мужская')).length;
  note(
    RED ? maleCount !== 2 : maleCount === 2,
    `бонус «мужская» гарантированно поднимает ОБА плёночных мужских кадра в топ-6 даже при ослабленном фильтре (найдено ${maleCount} из 2 существующих на плёнке)`,
  );

  // 3.4c — «Всё сразу» (материал не ограничен) — 6 файлов с меткой «мужская»
  //        во всём архиве, РОВНО MIN_POOL — фильтр по полу НЕ ослабляется
  //        (граничный случай: 6 < 6 ложно), сообщение не показывается
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await walkPath(page, ['Вайб имеется', 'В одиночку', 'Парень', 'Всё сразу', 'Пока не знаю', 'Ещё думаю']);
  figs = await fanData();
  const boundaryNote = (await page.locator('main').textContent()).replace(/\s+/g, ' ');
  note(
    RED ? boundaryNote.includes('пометкой «мужская»') : !boundaryNote.includes('пометкой «мужская»'),
    'на границе MIN_POOL (ровно 6 файлов «мужская» без ограничения материала) фильтр по полу НЕ ослабляется',
  );
  const boundaryMaleCount = figs.filter((f) => (f.placeRaw || '').includes('мужская')).length;
  note(
    RED ? boundaryMaleCount !== 6 : boundaryMaleCount === 6,
    `без ослабления пул «мужская» и есть все 6 результатов (найдено ${boundaryMaleCount} из 6)`,
  );

  // 3.4b — «девушка» не несёт этого ограничения вовсе (решение координатора,
  //        FACTS.md Ф33: «для „девушка“ — та же система, без этого фильтра»)
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await walkPath(page, ['Вайб имеется', 'В одиночку', 'Девушка', 'Всё сразу', 'Пока не знаю', 'Ещё думаю']);
  const girlNote = (await page.locator('main').textContent()).replace(/\s+/g, ' ');
  note(
    RED ? girlNote.includes('пометкой «мужская»') : !girlNote.includes('пометкой «мужская»'),
    '«девушка» не показывает сообщение об ослаблении фильтра «мужская» (фильтр к ней вообще не применяется)',
  );

  // 3.5 — ветка «Запечатлеть любовь»: формат жёстко «парная», без вопроса о
  //       формате/поле (решение координатора, FACTS.md Ф33)
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await start(page);
  await clickTile(page, 'Запечатлеть любовь');
  const q1AfterLove = await page.locator('h2').last().textContent();
  note(
    RED ? q1AfterLove.includes('плёнку') === false : q1AfterLove.includes('плёнку'),
    `после «Запечатлеть любовь» сразу вопрос про материал, без вопроса о формате/поле (получено: «${q1AfterLove}»)`,
  );
  await clickTile(page, 'Цифра');
  await clickTile(page, 'На улице');
  await clickTile(page, 'Да, уже есть');
  await page.waitForTimeout(300);
  figs = await fanData();
  note(
    RED ? !figs.every((f) => f.format === 'парная') : figs.every((f) => f.format === 'парная'),
    `ветка «Запечатлеть любовь» — формат жёстко «парная»: ${figs.map((f) => f.format).join(',')}`,
  );

  // 3.6 — ветка «Скоро день рождения»: обход формата, материал фильтрует
  //       (строгий случай — «цифра», 15 из 20 — точное совпадение)
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await walkPath(page, ['Скоро день рождения', 'Цифра', 'В студии', 'Да, уже есть']);
  figs = await fanData();
  let occNote = (await page.locator('main').textContent()).replace(/\s+/g, ' ');
  note(figs.length > 0 && figs.every((f) => f.format === ''), `повод «день рождения» — результаты честно без формата (архив не несёт его): ${figs.map((f) => f.format).join(',') || 'пусто'}`);
  note(figs.every((f) => f.material === 'цифра'), `материал строго фильтрует и внутри ветки повода (15 из 20 — цифра): ${figs.map((f) => f.material).join(',')}`);
  note(
    RED ? !occNote.includes('Место и образ в архиве') : occNote.includes('Место и образ в архиве'),
    'страница честно объясняет, что место/образ не повлияли на выдачу повода',
  );
  note(
    RED ? occNote.includes('набралось мало') : !occNote.includes('набралось мало'),
    'при строгом совпадении материала (цифра, 15 из 20) сообщение об ослаблении НЕ показывается',
  );

  // 3.6b — тот же повод, материал «плёнка» — архив пополнился (Ф37), пул
  //        внутри повода вырос с 5 до 9 (≥ MIN_POOL), но даже если бы он был
  //        меньше — материал внутри повода тоже больше не ослабляется (Ф37):
  //        строго «плёнка», без подмены на «цифра», без сообщения
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await walkPath(page, ['Скоро день рождения', 'Плёнка', 'Дома', 'Ещё думаю']);
  figs = await fanData();
  occNote = (await page.locator('main').textContent()).replace(/\s+/g, ' ');
  note(
    RED ? occNote.includes('набралось мало') : !occNote.includes('набралось мало'),
    'материал «плёнка» внутри повода — сообщение об ослаблении НЕ показывается (Ф37, материал больше не ослабляется нигде)',
  );
  note(
    RED ? !figs.every((f) => f.material === 'пленка') : figs.every((f) => f.material === 'пленка'),
    `материал внутри повода остаётся строго «плёнка», не подменяется «цифрой»: ${figs.map((f) => f.material).join(',')}`,
  );

  // 3.7 — огрубление места: «дома»/«в студии» → студия (41 из 99 в
  //       формате «индивидуальная»), «на улице» → природа|город (58 из 99).
  //       И то и другое суммарно перевешивает случайный довесок (`rng()*0.75`
  //       максимум 0.75 против бонуса +2), поэтому результат детерминирован.
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await walkPath(page, ['Вайб имеется', 'В одиночку', 'Девушка', 'Всё сразу', 'Дома', 'Ещё думаю']);
  figs = await fanData();
  note(
    RED ? !figs.every((f) => f.place === 'студия') : figs.every((f) => f.place === 'студия'),
    `«Дома» огрубляется до бонуса за категорию «студия» (единственная крытая в архиве): ${figs.map((f) => f.place).join(',')}`,
  );

  await page.goto(BASE, { waitUntil: 'networkidle' });
  await walkPath(page, ['Вайб имеется', 'В одиночку', 'Девушка', 'Всё сразу', 'На улице', 'Ещё думаю']);
  figs = await fanData();
  note(
    RED ? figs.some((f) => f.place === 'студия') : figs.every((f) => f.place === 'природа' || f.place === 'город'),
    `«На улице» огрубляется до бонуса за «природа» ИЛИ «город» (не «студия»): ${figs.map((f) => f.place).join(',')}`,
  );

  await ctx.close();
});

/* ─── 4. Доски Pinterest накапливаются по пути (правка Ф34) ─── */
await section('4. Pinterest по ветвям', async () => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 1400 } });
  const page = await ctx.newPage();

  const tabsOf = async () => page.locator('.sb-pin-tab').allTextContents();

  // «в одиночку» → «парень»: мужские-съёмки (парень) + содержание+композиция
  // (одиночку) + inspiration+восхищает (вайб) = 5, В ЭТОМ ПОРЯДКЕ (Ф38: узкое
  // → общее), «Мужские съёмки» — первая и активная по умолчанию вкладка
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await walkPath(page, ['Вайб имеется', 'В одиночку', 'Парень', 'Всё сразу', 'Пока не знаю', 'Ещё думаю']);
  let tabs = await tabsOf();
  const expectMale = ['Мужские съёмки', 'Содержание', 'Композиция', 'Inspiration', 'Восхищает'];
  note(
    RED ? tabs.length !== 5 : tabs.length === expectMale.length && tabs.every((t, i) => t === expectMale[i]),
    `«в одиночку»→«парень»: 5 досок в порядке узкое→общее (получено: ${tabs.join(', ')})`,
  );
  const firstTabActive = (await page.locator('.sb-pin-tab').first().getAttribute('aria-selected')) === 'true';
  note(RED ? !firstTabActive : firstTabActive, 'первая вкладка (самая специфичная — «Мужские съёмки») активна по умолчанию');

  // «в одиночку» → «девушка»: макияж-вояж-образ + луки-на-съемку первыми
  // (узкие), «мужские-съёмки» НЕ подключается вовсе
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await walkPath(page, ['Вайб имеется', 'В одиночку', 'Девушка', 'Всё сразу', 'Пока не знаю', 'Ещё думаю']);
  tabs = await tabsOf();
  note(
    RED ? tabs.includes('Мужские съёмки') : !tabs.includes('Мужские съёмки'),
    `«девушка» НЕ получает доску «Мужские съёмки» (получено: ${tabs.join(', ')})`,
  );
  note(
    RED ? tabs[0] !== 'Макияж, вояж, образ' : tabs[0] === 'Макияж, вояж, образ' && tabs[1] === 'Луки на съёмку',
    `«девушка» получает «Макияж, вояж, образ» и «Луки на съёмку» первыми (получено: ${tabs.join(', ')})`,
  );

  /* «вдвоём» — ПЯТЬ досок (Ф39 п.12, отменяет запрет Ф34 «в парную не стоит
     это тоже добавлять»): «Запечатлеваем любовь» по-прежнему первая и
     активная по умолчанию (Ф38), общие «вайб»-доски за ней, а «Макияж,
     вояж, образ» и «Луки на съёмку» добавлены В САМЫЙ КОНЕЦ — дословно
     «убери в самый конец всех досок», то есть и после общих тоже.
     Проверяется весь порядок целиком, а не только длина: он и есть предмет
     обеих правок — Ф38 задала «узкое раньше общего», Ф39 п.12 приписала
     хвост, и любая из них могла бы молча съесть другую. */
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await walkPath(page, ['Вайб имеется', 'Вдвоём', 'Цифра', 'В студии', 'Да, уже есть']);
  tabs = await tabsOf();
  const expectDuo = [
    'Запечатлеваем любовь',
    'Inspiration',
    'Восхищает',
    'Макияж, вояж, образ',
    'Луки на съёмку',
  ];
  note(
    RED ? tabs.length !== 5 : tabs.length === 5 && tabs.every((t, i) => t === expectDuo[i]),
    `«вдвоём» — 5 досок, «Запечатлеваем любовь» первая (Ф38), макияж/луки в самом конце (Ф39 п.12) (получено: ${tabs.join(', ')})`,
  );
  const duoFirstActive = (await page.locator('.sb-pin-tab').first().getAttribute('aria-selected')) === 'true';
  note(RED ? !duoFirstActive : duoFirstActive, '«вдвоём»: первая вкладка («Запечатлеваем любовь») активна по умолчанию');

  // «Запечатлеть любовь» — только «запечатлеваем-любовь», ровно одна доска
  // (виджет рендерится без вкладок при единственной доске — .sb-pin-tab нет).
  //
  // НАХОДКА (STORYBOARD.md § 13.10): проверять здесь сырой `<a data-pin-do>`
  // напрямую нельзя — виджет ПО ДИЗАЙНУ заменяет этот узел на живую разметку
  // Pinterest после исполнения `pinit.js` (см. `PinterestBoards.tsx`), и чем
  // дольше уже крутится браузер (тёплые DNS/TLS к CDN), тем быстрее замена
  // происходит — тест на исчезающий узел был бы тем более хрупким, чем лучше
  // на самом деле работает интеграция. Сверяем slug по стабильному
  // `data-active-board` на обёртке `.sb-pin`, которую Pinterest не трогает.
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await walkPath(page, ['Запечатлеть любовь', 'Цифра', 'На улице', 'Да, уже есть']);
  const activeBoard = await page.locator('.sb-pin').getAttribute('data-active-board').catch(() => null);
  note(
    RED ? activeBoard !== 'запечатлеваем-любовь' : activeBoard === 'запечатлеваем-любовь',
    `ветка «Запечатлеть любовь» — единственная доска «запечатлеваем-любовь» (получено: ${activeBoard})`,
  );

  // «Скоро день рождения» — Pinterest не показывается ВООБЩЕ (не пустая
  // рамка — секции нет в разметке)
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await walkPath(page, ['Скоро день рождения', 'Цифра', 'В студии', 'Да, уже есть']);
  const pinSectionCount = await page.locator('.sb-pin').count();
  note(RED ? pinSectionCount > 0 : pinSectionCount === 0, `ветка «Скоро день рождения» — секции Pinterest нет вовсе в разметке (найдено узлов: ${pinSectionCount})`);
  const h3Texts = await page.locator('h3').allTextContents();
  note(
    RED ? h3Texts.includes('Вдохновение из Pinterest') : !h3Texts.includes('Вдохновение из Pinterest'),
    `заголовок «Вдохновение из Pinterest» не рендерится у дня рождения (получено h3: ${h3Texts.join(', ')})`,
  );

  await ctx.close();
});

/* ─── 5. Карточный веер — три состояния через computed geometry ─── */
await section('5. веер — три состояния', async () => {
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await walkPath(page, ['Вайб имеется', 'Вдвоём', 'Цифра', 'В студии', 'Да, уже есть']);
  // мышь могла остаться над кнопкой, которую только что нажали — убираем её,
  // чтобы «покой» измерялся честно, без залипшего hover от клика
  await page.mouse.move(3, 3);
  await page.waitForTimeout(350);

  const items = page.locator('.sb-fan-item');
  const n = await items.count();
  note(n >= 4 && n <= 7, `веер несёт 4–7 карточек результата (получено ${n})`);

  const mode = await page.locator('.sb-fan').getAttribute('data-mode');
  note(RED ? mode !== 'stack' : mode === 'stack', `на обычном мышином десктопе веер в режиме «stack» (получено: ${mode})`);

  // ═ 1. ПОКОЙ — перекрытие: левые края соседних карточек ближе друг к другу,
  //      чем ширина карточки (иначе перекрытия нет вовсе) ═
  const restBoxes = await items.evaluateAll((els) => els.map((e) => e.getBoundingClientRect()));
  const overlapPx = restBoxes[0].width - (restBoxes[1].left - restBoxes[0].left);
  note(
    RED ? overlapPx <= 0 : overlapPx > 20,
    `покой: карточки перекрываются минимум на 20px (получено ${overlapPx.toFixed(1)}px)`,
  );

  // ═ 2. НАВЕДЕНИЕ НА ВЕСЬ ВЕЕР — раскрывается в ряд, карточки не перекрываются ═
  //
  // НАХОДКА (не мнение — поймано первым же прогоном всего файла целиком):
  // фиксированный `waitForTimeout(550)` после 460-мс CSS-перехода прошёл на
  // каждом отдельном прогоне этого блока, но ПРОВАЛИЛСЯ, когда весь файл
  // выполнялся целиком — под нагрузкой от уже открытых контекстов браузера
  // (это же самое System 30+ параллельных Chromium-процессов) 460-мс переход
  // и 550-мс ожидание успевают разойтись по времени, и проверка читает
  // геометрию ДО того, как переход реально завершился — не сбой механики, а
  // гонка между тестом и CSS-анимацией. Исправлено: `waitForFunction`,
  // опрашивающий РЕАЛЬНУЮ геометрию до устойчивого результата, с запасом по
  // времени, а не гадание с фиксированным числом миллисекунд.
  const fanBox = await page.locator('.sb-fan').boundingBox();
  await page.mouse.move(fanBox.x + 6, fanBox.y + 6);
  const expandedAttr = await page.locator('.sb-fan').getAttribute('data-expanded');
  note(RED ? expandedAttr !== '' : expandedAttr === '', 'наведение на весь веер — `data-expanded` реально проставлен');
  let expBoxes = [];
  let stillOverlaps = true;
  try {
    await page.waitForFunction(
      () => {
        const els = [...document.querySelectorAll('.sb-fan-item')];
        const boxes = els.map((e) => e.getBoundingClientRect());
        return boxes.every((b, i) => i === 0 || b.left >= boxes[i - 1].left + boxes[i - 1].width - 4);
      },
      { timeout: 3000 },
    );
    stillOverlaps = false;
  } catch {
    stillOverlaps = true;
  }
  expBoxes = await items.evaluateAll((els) => els.map((e) => e.getBoundingClientRect()));
  note(RED ? stillOverlaps : !stillOverlaps, `развёрнутый ряд — карточки НЕ перекрываются (координаты: ${expBoxes.map((b) => Math.round(b.left)).join(',')})`);

  // ═ 3. НАВЕДЕНИЕ НА КОНКРЕТНУЮ КАРТОЧКУ — она увеличивается относительно соседей ═
  const targetBox = await items.nth(1).boundingBox();
  await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2, { steps: 4 });
  let hotIsWidest = false;
  try {
    await page.waitForFunction(
      () => {
        const els = [...document.querySelectorAll('.sb-fan-item')];
        const w = els.map((e) => e.getBoundingClientRect().width);
        return w[1] > w[0] + 20 && w[1] > w[2] + 20;
      },
      { timeout: 3000 },
    );
    hotIsWidest = true;
  } catch {
    hotIsWidest = false;
  }
  const widths = await items.evaluateAll((els) => els.map((e) => e.getBoundingClientRect().width));
  note(RED ? !hotIsWidest : hotIsWidest, `наведённая карточка шире соседних минимум на 20px (ширины: ${widths.map((w) => w.toFixed(0)).join(',')})`);
  const hotAttr = await items.nth(1).getAttribute('data-hot');
  note(RED ? hotAttr !== '' : hotAttr === '', '`data-hot` реально проставлен на наведённой карточке');

  // уводим курсор — веер должен свернуться обратно (не залипать развёрнутым)
  await page.mouse.move(3, 3);
  let collapsedBack = false;
  try {
    await page.waitForFunction(() => !document.querySelector('.sb-fan')?.hasAttribute('data-expanded'), {
      timeout: 3000,
    });
    collapsedBack = true;
  } catch {
    collapsedBack = false;
  }
  note(RED ? !collapsedBack : collapsedBack, 'уводим курсор — веер сворачивается обратно в стопку');

  await ctx.close();
});

/* ─── 5b. Веер — тач/reduced-motion не теряет контента (Ф33 п.2) ─── */
await section('5b. веер — тач/reduced-motion', async () => {
  // симулируем устройство без hover тонким указателем (тач-экран): подменяем
  // matchMedia ДО загрузки страницы, чтобы `useFanMode()` увидел именно это
  const ctx = await browser.newContext({ viewport: { width: 390, height: 900 } });
  const page = await ctx.newPage();
  await page.addInitScript(() => {
    const orig = window.matchMedia.bind(window);
    window.matchMedia = (q) => {
      if (q.includes('hover: hover') || q.includes('pointer: fine')) {
        return {
          matches: false,
          media: q,
          addListener() {},
          removeListener() {},
          addEventListener() {},
          removeEventListener() {},
          onchange: null,
          dispatchEvent: () => true,
        };
      }
      return orig(q);
    };
  });
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await walkPath(page, ['Вайб имеется', 'Вдвоём', 'Цифра', 'В студии', 'Да, уже есть']);

  const mode = await page.locator('.sb-fan').getAttribute('data-mode');
  note(RED ? mode !== 'flat' : mode === 'flat', `тач-эмуляция (hover:none) — веер резолвится в режим «flat» (получено: ${mode})`);
  const expandedAttr = await page.locator('.sb-fan').getAttribute('data-expanded');
  note(RED ? expandedAttr !== '' : expandedAttr === '', 'тач: `data-expanded` стоит перманентно без жеста — все фото видны сразу');
  const de = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  note(RED ? de.sw < de.cw : de.sw === de.cw, `тач на 390px — страница НЕ уезжает вбок из-за развёрнутого веера (scrollWidth ${de.sw}, clientWidth ${de.cw})`);
  const visibleCount = await page.locator('.sb-fan-item').count();
  const imgCount = await page.locator('.sb-fan-item img').count();
  note(visibleCount === imgCount, `тач: все ${visibleCount} карточек несут реальное изображение, ни одна не спрятана`);
  await ctx.close();
});

/* ─── 6. Стрелка-подсказка на «Придумать съёмку» (главная страница) ─── */
await section('6. стрелка-подсказка', async () => {
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  await page.goto(MAIN, { waitUntil: 'networkidle' });

  let hintCount = await page.locator('.nav-hint').count();
  note(RED ? hintCount > 0 : hintCount === 0, `на нулевом скролле стрелка НЕ смонтирована (П7): найдено ${hintCount}`);

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.35));
  await page.waitForTimeout(700);
  hintCount = await page.locator('.nav-hint').count();
  note(RED ? hintCount === 0 : hintCount === 1, `после прокрутки вниз стрелка появляется (найдено ${hintCount})`);
  if (hintCount === 1) {
    const shown = await page.locator('.nav-hint').getAttribute('data-show');
    note(RED ? shown !== '' : shown === '', '`data-show` реально проставлен спустя время после появления (не просто «элемент есть в DOM»)');
    const href = await page.locator('.nav-hint').getAttribute('href');
    note(href === '/storyboard.html', `стрелка ведёт на страницу фичи (получено: ${href})`);
  }

  // форсируем мгновенный скролл (обходя `scroll-behavior: smooth` — иначе
  // тест зависит от длительности анимации плавного скролла, а не от логики)
  await page.evaluate(() => {
    document.documentElement.style.scrollBehavior = 'auto';
    document.getElementById('kontakt').scrollIntoView();
  });
  await page.waitForTimeout(400);
  hintCount = await page.locator('.nav-hint').count();
  note(RED ? hintCount === 1 : hintCount === 0, `у секции контактов стрелка гаснет (найдено ${hintCount})`);

  const navCount = await page.locator('nav').count();
  note(navCount === 2, `стрелка не создала третий лендмарк <nav> (найдено ${navCount}, ожидались те же 2, что и раньше)`);
  note(errs.length === 0, `консоль чиста на главной с учётом стрелки${errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''}`);

  await ctx.close();
});

/* ─── 6b. Стрелка — reduced-motion всё равно появляется, без анимации входа ─── */
await section('6b. стрелка — reduced-motion', async () => {
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 }, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto(MAIN, { waitUntil: 'networkidle' });
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.35));
  await page.waitForTimeout(200);
  const shown = await page.locator('.nav-hint').getAttribute('data-show');
  note(RED ? shown !== '' : shown === '', `reduced-motion: подсказка видна почти сразу, без ожидания входной анимации (получено data-show: ${JSON.stringify(shown)})`);
  await ctx.close();
});

/* ─── 7. Скачанный файл действительно несёт подпись-ссылку ─── */
await section('7. скачанный PDF', async () => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await walkPath(page, ['Вайб имеется', 'Вдвоём', 'Цифра', 'Пока не знаю', 'Ещё думаю']);

  await page.evaluate(() => {
    window.__fillTextCalls = [];
    const orig = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (text, ...args) {
      window.__fillTextCalls.push(text);
      return orig.apply(this, [text, ...args]);
    };
  });

  const [download] = await Promise.all([page.waitForEvent('download'), page.click('text=Скачать раскадровку')]);
  const calls = await page.evaluate(() => window.__fillTextCalls);
  note(RED ? !calls.includes('аришения') : calls.includes('аришения'), `canvas реально рисует подпись «аришения» (перехвачено: ${JSON.stringify(calls)})`);
  note(
    calls.some((t) => t.includes('t.me/arisheniaa') || t.includes('@arisheniaa')),
    'canvas реально рисует ссылку на Telegram (@arisheniaa / t.me/arisheniaa)',
  );

  const p = await download.path();
  const buf = fs.readFileSync(p);
  note(buf.length > 2000, `скачанный файл весит больше 2 КБ (${buf.length} байт) — не пустышка`);
  const isPdfSignature = buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46 && buf[4] === 0x2d;
  note(RED ? !isPdfSignature : isPdfSignature, 'скачанный файл — валидный PDF (сигнатура %PDF-)');
  const name = download.suggestedFilename();
  note(RED ? !name.endsWith('.pdf') : name.endsWith('.pdf'), `имя файла оканчивается на .pdf (получено: ${name})`);
  await ctx.close();
});

/* ─── 8. prefers-reduced-motion не теряет контента на экране результата ─── */
await section('8. reduced-motion не теряет контента', async () => {
  // детерминированная комбинация (та же, что в 3.1) — исключает случайный
  // довесок алгоритма как источник ложной разницы между прогонами
  const read = async (reduce) => {
    const ctx = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      reducedMotion: reduce ? 'reduce' : 'no-preference',
    });
    const page = await ctx.newPage();
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await walkPath(page, ['Вайб имеется', 'Вдвоём', 'Цифра', 'В студии', 'Да, уже есть']);
    await page.waitForTimeout(400);
    const r = await page.evaluate(() => ({
      len: document.body.innerText.replace(/\s+/g, ' ').trim().length,
      imgs: document.querySelectorAll('img').length,
      h: document.querySelectorAll('h1,h2,h3').length,
    }));
    await ctx.close();
    return r;
  };
  const a = await read(false);
  const b = await read(true);
  note(b.h === a.h, `reduced-motion: заголовков столько же (${b.h} против ${a.h})`);
  note(b.len >= a.len * 0.9, `reduced-motion: текста не меньше (${b.len} знаков против ${a.len})`);
  note(b.imgs === a.imgs, `reduced-motion: кадров ровно столько же (${b.imgs} против ${a.imgs})`);
});

/* ─── 9. Плитки управляются с клавиатуры (Tab + Enter), лестница растёт ─── */
await section('9. клавиатура', async () => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await start(page);

  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  const focused = await page.evaluate(() => document.activeElement?.className || '');
  note(focused.includes('sb-tile') || focused.includes('nav-link'), `Tab доходит до интерактивных элементов (фокус на: ${focused})`);

  const stepsBefore = await page.locator('.sb-ladder-step').count();
  await page.locator('.sb-tile').last().focus();
  await page.keyboard.press('Enter');
  await page.waitForTimeout(350);
  const stepsAfter = await page.locator('.sb-ladder-step').count();
  note(
    RED ? stepsAfter <= stepsBefore : stepsAfter === stepsBefore + 1,
    `Enter на сфокусированной плитке продвигает дерево — лестница выросла с ${stepsBefore} до ${stepsAfter} шагов`,
  );
  const pastGhost = await page.locator('.sb-ladder-step--past .sb-tile--ghost').count();
  note(RED ? pastGhost === 0 : pastGhost === 1, `отвеченный вопрос ушёл в прошлое лестницы с видимым выбранным ответом (найдено ${pastGhost} плашки-«призрака»)`);
  const pastFilter = await page.locator('.sb-ladder-step--past').first().evaluate((e) => getComputedStyle(e).filter);
  note(RED ? pastFilter === 'none' : pastFilter.includes('blur'), `прошлый вопрос реально под блюром (computed filter: ${pastFilter})`);

  await ctx.close();
});

await browser.close();

console.log('');
if (fails.length) {
  console.log(`ПРОВАЛОВ: ${fails.length}`);
  process.exit(1);
}
console.log('САМОПРОВЕРКА СТОРИБОРДА ЗЕЛЁНАЯ — все проверки выполнены и все прошли');
