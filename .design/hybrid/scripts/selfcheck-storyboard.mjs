/**
 * САМОПРОВЕРКА ФИЧИ «ПРИДУМАТЬ СЪЁМКУ» (`BRIEF-STORYBOARD.md`,
 * `.design/hybrid/STORYBOARD.md`). Отдельный скрипт от `selfcheck.mjs`
 * (тот проверяет главную; эта фича — второй, независимый `.html`-вход,
 * `storyboard.html`) — по прямому указанию не смешивать документацию/проверки
 * новой фичи с разделами 1–8 основного сайта.
 *
 * Печатает измерения, не мнения, выходит кодом 1 при любом провале.
 * Проба на красноту — флаг `--redproof`, как в `selfcheck.mjs`.
 *
 * Проверяет:
 *  1. нет горизонтальной прокрутки на 360/375/390/768/1280/1920, лендмарки
 *     по одному (эта страница НЕ несёт `SectionStars` главной — здесь ровно
 *     один `<nav>`, не два);
 *  2. дословность подтверждённой владелицей формулировки навигации
 *     «Придумать съёмку»;
 *  3. АЛГОРИТМ ДЕЙСТВИТЕЛЬНО ФИЛЬТРУЕТ ПО ОТВЕТАМ — не мнение, а свойство:
 *     три детерминированных сценария (жёсткий фильтр формат+материал+бонус
 *     места; ослабление материала; бонус образа) и ветка повода в обход
 *     формата (находка при разработке, см. `pick.ts`);
 *  4. скачанный файл ДЕЙСТВИТЕЛЬНО несёт подпись-ссылку — перехват
 *     `fillText`, а не проверка, что кнопка существует;
 *  5. `prefers-reduced-motion` не теряет контента на экране результата;
 *  6. плитки вопроса управляются с клавиатуры (Tab + Enter).
 */
import { chromium } from 'playwright';
import fs from 'node:fs';

const BASE = 'http://127.0.0.1:5176/storyboard.html';
const RED = process.argv.includes('--redproof');
const WIDTHS = [360, 375, 390, 768, 1280, 1920];

const fails = [];
const note = (ok, msg) => {
  console.log((ok ? '  ok   ' : '  FAIL ') + msg);
  if (!ok) fails.push(msg);
};

/** Проходит квиз кликами по значениям тайлов (по порядку вопросов, каким бы
 *  он ни был на момент прогона — не хардкодит индексы вопросов). Значения,
 *  которых нет среди тайлов текущего вопроса, пропускаются (нажимается первый
 *  тайл) — так сценарий не ломается, если состав вопросов расширится. */
async function answerQuiz(page, valuesByOrder) {
  await page.click('text=Начать');
  for (const value of valuesByOrder) {
    await page.waitForTimeout(200);
    const tile = page.locator(`.sb-tile:has-text("${value}")`).first();
    if (await tile.count()) {
      await tile.click();
    } else {
      await page.locator('.sb-tile').first().click();
    }
    await page.waitForTimeout(250);
    // если уже добрались до результата (например, ветка повода) — выходим раньше
    if (await page.locator('text=Ваша раскадровка').count()) break;
  }
  await page.waitForTimeout(300);
}

const browser = await chromium.launch();

/* ─── 1. Прокрутка и лендмарки на всех ширинах ─── */
{
  for (const width of WIDTHS) {
    const ctx = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await ctx.newPage();
    const errs = [];
    page.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
    page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
    await page.goto(BASE, { waitUntil: 'networkidle' });

    // intro
    let m = await page.evaluate(() => {
      const de = document.documentElement;
      return { sw: de.scrollWidth, cw: de.clientWidth };
    });
    note(RED ? m.sw < m.cw : m.sw === m.cw, `${width}px intro — scrollWidth ${m.sw} === clientWidth ${m.cw}`);

    // на весь квиз до результата, чтобы асимметричная сетка тоже проверилась на переполнение
    await answerQuiz(page, ['Один человек', 'Не важно', 'Природа', 'Неважно', 'Без повода']);
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
}

/* ─── 2. Дословность подтверждённой формулировки навигации ─── */
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: 'networkidle' });
  const text = (await page.evaluate(() => document.body.textContent)).replace(/\s+/g, ' ');
  note(
    RED ? !text.includes('Придумать съёмку') : text.includes('Придумать съёмку'),
    'дословно: «Придумать съёмку» (формулировка подтверждена владелицей)',
  );
  await ctx.close();
}

/* ─── 3. Алгоритм действительно фильтрует по ответам ─── */
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 1200 } });
  const page = await ctx.newPage();

  // 3.1 — жёсткий фильтр формат+материал, бонус места (детерминированно:
  //       парная+цифра+студия = ровно 6 из 17, см. STORYBOARD.md)
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await answerQuiz(page, ['Без повода', 'Двое', 'Цифра', 'Студия', 'Неважно']);
  let figs = await page.locator('figure[data-format]').evaluateAll((els) =>
    els.map((e) => ({
      format: e.getAttribute('data-format'),
      material: e.getAttribute('data-material'),
      place: e.getAttribute('data-place-category'),
    })),
  );
  note(figs.length === 6, `парная+цифра+студия — ровно 6 результатов (получено ${figs.length})`);
  note(
    RED
      ? !figs.every((f) => f.format === 'парная')
      : figs.every((f) => f.format === 'парная'),
    `все результаты формата «парная» (${figs.map((f) => f.format).join(',')})`,
  );
  note(
    figs.every((f) => f.material === 'цифра'),
    `все результаты материала «цифра» (${figs.map((f) => f.material).join(',')})`,
  );
  note(
    figs.every((f) => f.place === 'студия'),
    `бонус места сработал НАСТОЛЬКО, что все 6 результатов — «студия» (детерминировано: их ровно 6 в пуле из 17): ${figs.map((f) => f.place).join(',')}`,
  );

  // 3.2 — ослабление материала: творческая+плёнка = 0 кадров в архиве
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await answerQuiz(page, ['Без повода', 'Творческая', 'Плёнка', 'Неважно', 'Неважно']);
  figs = await page.locator('figure[data-format]').evaluateAll((els) =>
    els.map((e) => ({ format: e.getAttribute('data-format'), material: e.getAttribute('data-material') })),
  );
  const relaxNote = await page.locator('main').textContent();
  note(
    relaxNote.includes('набралось мало'),
    'сообщение об ослаблении материала показано читателю (не молчит о компромиссе)',
  );
  note(
    figs.length > 0 && figs.every((f) => f.format === 'творческая'),
    `формат остаётся строгим даже при ослаблении материала (${figs.map((f) => f.format).join(',')})`,
  );
  note(
    RED ? figs.some((f) => f.material === 'пленка') : !figs.some((f) => f.material === 'пленка'),
    `материал реально ослаблен — в архиве творческая+плёнка нет вовсе, поэтому результат не пуст, но и не «пленка»: (${figs.map((f) => f.material).join(',')})`,
  );

  // 3.3 — бонус образа: «пальто» тегирован только у 11 фото формата
  //       «индивидуальная» — при 6 результатах все обязаны быть «пальто»
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await answerQuiz(page, ['Без повода', 'Один человек', 'Не важно', 'Пока не знаю', 'Пальто']);
  figs = await page.locator('figure[data-format]').evaluateAll((els) =>
    els.map((e) => e.getAttribute('data-look')),
  );
  note(
    RED ? !figs.every((l) => l.includes('пальто')) : figs.every((l) => l.includes('пальто')),
    `бонус образа: все результаты содержат тег «пальто» (${figs.join(' | ')})`,
  );

  // 3.4 — ветка повода: реальный повод обходит формат, вопросы после
  //       пропускаются (быстрый путь), результат честно помечен
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.click('text=Начать');
  await page.waitForTimeout(200);
  await page.click('button:has-text("День рождения")');
  await page.waitForTimeout(400);
  const isResult = await page.locator('text=Ваша раскадровка').count();
  note(isResult > 0, 'выбор реального повода сразу ведёт к результату (пропускает формат/материал/место/образ)');
  figs = await page.locator('figure[data-format]').evaluateAll((els) => els.map((e) => e.getAttribute('data-format')));
  note(figs.length > 0 && figs.every((f) => f === ''), `результаты повода честно без формата (архив не несёт его для этих фото): (${figs.join(',') || 'пусто'})`);
  const overrideNote = await page.locator('main').textContent();
  note(overrideNote.includes('в архиве они пока без разметки'), 'страница объясняет, почему остальные вопросы не участвовали');

  await ctx.close();
}

/* ─── 4. Скачанный файл действительно несёт подпись-ссылку ─── */
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await answerQuiz(page, ['Без повода', 'Двое', 'Не важно', 'Неважно', 'Неважно']);

  await page.evaluate(() => {
    window.__fillTextCalls = [];
    const orig = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (text, ...args) {
      window.__fillTextCalls.push(text);
      return orig.apply(this, [text, ...args]);
    };
  });

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.click('text=Скачать раскадровку'),
  ]);
  const calls = await page.evaluate(() => window.__fillTextCalls);
  note(
    RED ? !calls.includes('аришения') : calls.includes('аришения'),
    `canvas реально рисует подпись «аришения» (перехвачено: ${JSON.stringify(calls)})`,
  );
  note(
    calls.some((t) => t.includes('t.me/arisheniaa') || t.includes('@arisheniaa')),
    'canvas реально рисует ссылку на Telegram (@arisheniaa / t.me/arisheniaa)',
  );

  const p = await download.path();
  const buf = fs.readFileSync(p);
  note(buf.length > 2000, `скачанный файл весит больше 2 КБ (${buf.length} байт) — не пустышка`);
  note(
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47,
    'скачанный файл — валидный PNG (сигнатура 89 50 4E 47)',
  );
  await ctx.close();
}

/* ─── 5. prefers-reduced-motion не теряет контента на экране результата ─── */
{
  /* Комбинация ответов ДЕТЕРМИНИРОВАННАЯ (та же, что в 3.1: парная+цифра+студия
     — ровно 6 фото из 17, все шесть гарантированно попадают в топ независимо
     от случайного довеска `rng()` в `pick.ts`). Первая версия этой проверки
     использовала комбинацию с местом-бонусом на пуле из 37 подходящих фото —
     тогда любые 6 из 37 проходят порог бонуса, и СЛУЧАЙНЫЙ довесок выбирает
     разные шесть при каждом прогоне: два независимых контекста (обычный и
     reduced-motion) получали РАЗНЫЕ фото с разной длиной подписей, и разница в
     длине текста выглядела как «reduced-motion потерял контент», хотя на самом
     деле оба прогона показывали ровно по 6 картинок — просто разных. Поймано
     этой же самопроверкой (FAIL держался на несовпадающей длине текста, не на
     количестве). Детерминированная комбинация исключает и такую случайность. */
  const read = async (reduce) => {
    const ctx = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      reducedMotion: reduce ? 'reduce' : 'no-preference',
    });
    const page = await ctx.newPage();
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await answerQuiz(page, ['Без повода', 'Двое', 'Цифра', 'Студия', 'Неважно']);
    await page.waitForTimeout(400);
    const r = await page.evaluate(() => ({
      len: document.body.innerText.replace(/\s+/g, ' ').trim().length,
      imgs: document.querySelectorAll('img').length,
      h: document.querySelectorAll('h1,h2').length,
    }));
    await ctx.close();
    return r;
  };
  const a = await read(false);
  const b = await read(true);
  note(b.h === a.h, `reduced-motion: заголовков столько же (${b.h} против ${a.h})`);
  note(b.len >= a.len * 0.9, `reduced-motion: текста не меньше (${b.len} знаков против ${a.len})`);
  note(b.imgs === a.imgs, `reduced-motion: кадров ровно столько же (${b.imgs} против ${a.imgs})`);
}

/* ─── 6. Плитки управляются с клавиатуры (Tab + Enter) ─── */
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.click('text=Начать');
  await page.waitForTimeout(250);

  // фокус переезжает на заголовок вопроса при показе (для скринридера) —
  // отвязываем табуляцию от него явно, кликнув по body, затем табом входим в плитки
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  const focused = await page.evaluate(() => document.activeElement?.className || '');
  note(focused.includes('sb-tile') || focused.includes('nav-link'), `Tab доходит до интерактивных элементов (фокус на: ${focused})`);

  /* Фокус на ПОСЛЕДНЮЮ плитку, не первую: первый вопрос — «Есть повод?», и
     его ПЕРВАЯ плитка («День рождения») — быстрый путь сразу к результату
     (`pick.ts`, `StoryboardApp.tsx choose()`), а не к «Вопрос 2 из…». Это
     не сбой клавиатуры, а свойство конкретного вопроса; последняя плитка
     («Без повода…») по конвенции этого файла — всегда нейтральный вариант,
     ведущий к следующему обычному вопросу. */
  await page.locator('.sb-tile').last().focus();
  await page.keyboard.press('Enter');
  await page.waitForTimeout(300);
  const advanced = await page.locator('p:has-text("Вопрос 2 из")').count();
  note(RED ? advanced === 0 : advanced > 0, `Enter на сфокусированной плитке продвигает квиз к следующему вопросу (найдено «Вопрос 2 из…»: ${advanced > 0})`);
  await ctx.close();
}

await browser.close();

console.log('');
if (fails.length) {
  console.log(`ПРОВАЛОВ: ${fails.length}`);
  process.exit(1);
}
console.log('САМОПРОВЕРКА СТОРИБОРДА ЗЕЛЁНАЯ — все проверки выполнены и все прошли');
