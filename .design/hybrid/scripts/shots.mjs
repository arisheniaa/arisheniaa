/**
 * КОМПЛЕКТ ДОКАЗАТЕЛЬСТВ (правило П5). Снимает то, что нельзя доказать словами.
 *
 * Запуск из корня проекта, при поднятом dev-сервере на 5176:
 *   node .design/hybrid/scripts/shots.mjs
 *
 * РЕДАКЦИЯ 2 — комплект переснят под правки Ф28. Что изменилось в самом
 * комплекте, а не только в кадрах:
 *
 *  · снята вся розовая половина (было 8 кадров первого экрана вместо 4, две
 *    пары папок, две полных страницы). Тема одна — снимать «оба переключаемых
 *    варианта» больше нечего;
 *  · снят морфинг имени в трёх точках (`?morph=slow`): механики нет. Вместо
 *    трёх кадров процесса — два кадра шапки с выдержкой 11 с, то есть больше
 *    прежнего автозапуска на 10 000 мс. Доказательство ОТСУТСТВИЯ движения —
 *    это пара кадров с выдержкой, а не один кадр;
 *  · добавлены кадры, которых комплект не требовал раньше: навигация в шапке
 *    (широкая и узкая, закрытая и раскрытая), звёзды крупно со свечением,
 *    подвал после чистки, блок CTA с контактами, все четыре карточки услуг;
 *  · добавлен кадр «секции „Шесть кадров“ нет»: отсутствие снимается только
 *    как целая страница — на любом вырезанном фрагменте его не видно.
 *
 * Кадры считаются ЧЕРНОВЫМИ: это dev-сборка для критика. Финальный бандл
 * снимает `dp-auditor` с прод-сборки одним координированным проходом.
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = 'http://127.0.0.1:5176/';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(HERE, '../shots');
fs.mkdirSync(OUT, { recursive: true });

const made = [];
const browser = await chromium.launch();

/** Один кадр. `full` — вся страница, иначе вьюпорт. `clip` — область по селектору. */
async function shot(
  name,
  {
    url = BASE,
    width = 1280,
    height = 900,
    reduce = false,
    full = false,
    clip = null,
    wait = 900,
    act = null,
  } = {},
) {
  const ctx = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 2,
    reducedMotion: reduce ? 'reduce' : 'no-preference',
  });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'networkidle' });
  // шрифты обязаны быть на месте: кадр с фолбэком доказывает не тот шрифт
  await page.evaluate(() => document.fonts.ready);
  if (act) await act(page);
  await page.waitForTimeout(wait);
  const file = path.join(OUT, name + '.png');
  if (clip) {
    await page.locator(clip).first().screenshot({ path: file });
  } else {
    await page.screenshot({ path: file, fullPage: full });
  }
  await ctx.close();
  const kb = Math.round(fs.statSync(file).size / 1024);
  made.push(`${name}.png · ${kb} КБ`);
  console.log('  ' + name + '.png (' + kb + ' КБ)');
}

/**
 * Кадр СЕКЦИИ целиком. Отдельная функция, потому что первый прогон снял услуги
 * и CTA негодным способом, и это стоит записать, чтобы не повторить:
 *
 *   `clip: '#uslugi'` на секции высотой 2000 px при вьюпорте 900 px заставляет
 *   Playwright сшивать кадр прокруткой. Получилось два дефекта сразу: половина
 *   блоков осталась в состоянии `.reveal` (расфокус до появления) и в состоянии
 *   `useFocusScrub` (наводка резкости по положению на экране), то есть размытой;
 *   а фиксированная шапка впечаталась ПОСЕРЕДИНЕ кадра, потому что при каждом
 *   шаге сшивки она рисуется на своём месте относительно прокрутки.
 *   Такой кадр доказывает не композицию, а способ съёмки.
 *
 * Как правильно: вьюпорт высотой под всю секцию — сшивать нечего; выдержка
 * `prefers-reduced-motion`, при которой `reveal` и наводка резкости выключены
 * целиком, — все кадры резкие и на местах; и прокрутка так, чтобы секция стояла
 * на 130 px ниже верха, где шапка её не накрывает.
 *
 * Что кадр при этом НЕ показывает: вход блоков движением. Он и не должен —
 * движение доказывают отдельные кадры папок, рэка и звёзд.
 */
async function section(name, sel, { width = 1280, height = 2200 } = {}) {
  await shot(name, {
    width,
    height,
    reduce: true,
    wait: 1200,
    act: async (page) => {
      await page.evaluate((s) => {
        const el = document.querySelector(s);
        const y = el.getBoundingClientRect().top + window.scrollY - 130;
        window.scrollTo(0, Math.max(0, y));
      }, sel);
      await page.waitForTimeout(500);
    },
  });
}

/** Прокрутить страницу целиком и вернуться: иначе lazy-кадры и reveal не сработают. */
const scrollThrough = async (page) => {
  await page.evaluate(async () => {
    const step = window.innerHeight * 0.8;
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 120));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(700);
};

/* ─── 1. Первый экран: четыре ширины, одна тема ─── */
console.log('первый экран:');
for (const [w, h] of [
  [390, 844],
  [768, 1024],
  [1280, 900],
  [1920, 1080],
]) {
  await shot(`hero-${w}`, { width: w, height: h });
}

/* ─── 2. Навигация в шапке (Ф28) ───
   Каждый кадр отвечает на свой вопрос: встали ли шесть подписей в строку на
   десктопе; что видно на 390 до нажатия; что после; и как шапка выглядит,
   уехав на контент, то есть с подложкой. */
console.log('навигация:');
await shot('nav-01-1280', { width: 1280, height: 900, clip: 'header' });
await shot('nav-02-1920', { width: 1920, height: 1080, clip: 'header' });
await shot('nav-03-390-closed', { width: 390, height: 844, clip: 'header' });
await shot('nav-04-390-open', {
  width: 390,
  height: 844,
  clip: 'header',
  act: async (page) => {
    await page.locator('.nav-toggle').click();
    await page.waitForTimeout(400);
  },
});
await shot('nav-05-1280-scrolled', {
  width: 1280,
  height: 900,
  clip: 'header',
  act: async (page) => {
    await page.evaluate(() => window.scrollTo(0, 1400));
    await page.waitForTimeout(500);
  },
});

/* ─── 3. Имя: статично (Ф28) ───
   Два кадра шапки с выдержкой 11 секунд. Если механика морфинга вернётся,
   второй кадр покажет кириллицу, и это будет видно глазом без замеров.
   Третий — крупно, чтобы читались гарнитура и семиугольная звезда из C. */
console.log('имя, статичное:');
await shot('name-01-t0', { clip: 'header', wait: 600 });
await shot('name-02-t11s', { clip: 'header', wait: 11_500 });
await shot('name-03-crop', { width: 900, height: 300, clip: 'header p' });

/* ─── 4. Звёзды со свечением (Ф28), три цвета пути крупным планом ─── */
console.log('звёзды со свечением:');
const TONE = { 0: 'chern', 1: 'zhelt', 2: 'bordo' };
for (const [id, ru] of Object.entries(TONE)) {
  await shot(`stars-${id}-${ru}`, {
    url: `${BASE}?startone=${id}`,
    width: 900,
    height: 700,
    clip: 'section:first-of-type',
  });
}
/* Свечение под курсором: `?pointer=` ставит виртуальный курсор в точку — у
   headless-браузера мыши нет, и без крючка курсорный доворот свечения (22 px
   из направления C) на кадр не попадёт вовсе. */
await shot('stars-3-glow-pointer', {
  url: `${BASE}?startone=1&pointer=450,350`,
  width: 900,
  height: 700,
  clip: 'section:first-of-type',
});

/* ─── 5. Рэк: покой / перетягивание / после переворота (Ф28 не тронула) ─── */
console.log('рэк:');
await shot('rack-01-rest', { clip: '.rack' });
await shot('rack-02-drag', { url: `${BASE}?rack=-96`, clip: '.rack' });
await shot('rack-03-flipped', {
  clip: '.rack',
  wait: 1400,
  act: async (page) => {
    await page.locator('.rack-next').click();
    await page.waitForTimeout(1200);
  },
});
await shot('rack-04-390', { width: 390, height: 844, clip: '.rack' });

/* ─── 6. Демонстрация отдачи: подпись на папке, новый текст (Ф28) ─── */
console.log('демонстрация отдачи:');
await shot('folders-01-closed', { clip: '.delivery', act: scrollThrough });
await shot('folders-02-open', {
  clip: '.delivery',
  wait: 900,
  act: async (page) => {
    await scrollThrough(page);
    await page.locator('.folder-parent').click();
    await page.waitForTimeout(700);
  },
});
/* Подпись крупно: доказательство, что «нажми на меня» лежит НА папке.
   `reduce: true` здесь обязателен и по той же причине, что у кадров секций:
   без него первый прогон снял ПУСТОЙ прямоугольник — папка ниже сгиба и до
   прокрутки лежит в состоянии `.reveal`, то есть с нулевой непрозрачностью.
   Кадр вышел «доказательством», на котором нет предмета. */
await shot('folders-03-label-crop', {
  width: 900,
  height: 900,
  reduce: true,
  clip: '.folder-parent',
});
await shot('folders-04-390-open', {
  width: 390,
  height: 844,
  clip: '.delivery',
  act: async (page) => {
    await scrollThrough(page);
    await page.locator('.folder-parent').click();
    await page.waitForTimeout(700);
  },
});

/* ─── 7. Карточки услуг: четыре кадра, уменьшенный показ (Ф28) ───
   Три ширины: на 390 разворот складывается в столбец, на 1920 проверяется, что
   уменьшенные кадры не растворились в воздухе широкого экрана. */
console.log('услуги:');
await section('services-01-1280', '#uslugi', { width: 1280, height: 2300 });
await section('services-02-390', '#uslugi', { width: 390, height: 3200 });
await section('services-03-1920', '#uslugi', { width: 1920, height: 2300 });

/* ─── 8. CTA и контакты (Ф28) ─── */
console.log('CTA и контакты:');
await section('cta-01-1280', '#kontakt', { width: 1280, height: 900 });
await section('cta-02-390', '#kontakt', { width: 390, height: 900 });

/* ─── 9. Подвал после чистки (Ф28) ───
   Снимается вместе с концом последней секции: пустой подвал сам по себе — это
   кадр волосяной линии, на котором ничего не видно. Смысл кадра в том, ЧЕМ
   страница кончается, и это надо показать целиком. */
console.log('подвал:');
const toBottom = async (page) => {
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(600);
};
/* Вьюпорт высокий (1000 px), а не 620: первый прогон снял 390 px кадром на
   620 px и получил 5 КБ пустого поля — формально подвал, фактически ничего.
   Пустой подвал надо показывать вместе с тем, что стоит НАД ним, иначе кадр не
   отличить от ошибки съёмки. `reduce: true` — чтобы контакты над линейкой были
   резкими и на месте, а не в состоянии входа. */
await shot('footer-01-1280', { width: 1280, height: 1000, reduce: true, act: toBottom });
await shot('footer-02-390', { width: 390, height: 1000, reduce: true, act: toBottom });

/* ─── 10. prefers-reduced-motion: ничего не потеряно ─── */
console.log('prefers-reduced-motion:');
await shot('reduced-motion-full-1280', {
  reduce: true,
  full: true,
  width: 1280,
  height: 900,
  wait: 1400,
});
await shot('reduced-motion-full-390', {
  reduce: true,
  full: true,
  width: 390,
  height: 844,
  wait: 1400,
});

/* ─── 11. Вся страница: связность, ритм и отсутствие «Шести кадров» ───
   Кадр полной страницы — единственное доказательство, что секции нет: на любом
   вырезанном фрагменте отсутствие невидимо. */
console.log('вся страница:');
for (const [w, h] of [
  [1280, 900],
  [390, 844],
  [1920, 1080],
]) {
  await shot(`page-full-${w}`, { full: true, width: w, height: h, wait: 1800, act: scrollThrough });
}

/* ─── 12. РЕДАКЦИЯ 3 (Ф29, FACTS.md — не лок) — семь новых пунктов ───
   Прокрутки внутри `act` используют `behavior: 'instant'` явно: числовая форма
   `scrollTo(x, y)` наследует CSS `scroll-behavior: smooth` (`html`, styles.css)
   и на длинных дистанциях просто не успевает доехать за паузу кадра —
   ровно та находка, что уже задокументирована в `scripts/selfcheck.mjs`. */
console.log('редакция 3 (Ф29):');

const clearHeaderShot = (sel, offset = 160) => async (page) => {
  await page.evaluate(
    ([s, off]) => {
      const el = document.querySelector(s);
      const y = el.getBoundingClientRect().top + window.scrollY - off;
      window.scrollTo({ top: Math.max(0, y), left: 0, behavior: 'instant' });
    },
    [sel, offset],
  );
  await page.waitForTimeout(350);
};

/* 12.1 Настроение диптиха (п.1) — «тихое» начало и «странное» окончание
   прохода секции «Как получается кино»: полотно на глаз должно отличаться
   по цвету/интенсивности между двумя кадрами. */
const moodScroll = (frac) => async (page) => {
  await page.evaluate((f) => {
    const el = document.querySelector('[data-mood-scope]');
    const r = el.getBoundingClientRect();
    const vh = window.innerHeight;
    const start = window.scrollY + r.top - vh;
    const end = window.scrollY + r.bottom;
    window.scrollTo({ top: start + (end - start) * f, left: 0, behavior: 'instant' });
  }, frac);
  await page.waitForTimeout(500);
};
await shot('mood-01-quiet', { width: 1280, height: 900, act: moodScroll(0.02) });
await shot('mood-02-strange', { width: 1280, height: 900, act: moodScroll(0.98) });

/* 12.2 Курсор-метка «тяни» (п.2) — над верхним кадром рэка, вместо
   системного grab/grabbing. */
await shot('rack-hint-tyani', {
  clip: '.rack',
  act: async (page) => {
    const box = await page.locator('.rack-stack').boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 6 });
    await page.waitForTimeout(250);
  },
});

/* 12.3 3D-тилт карточки услуги (п.3) — наклон и блик по краю кадра под
   курсором, кроп по самому кадру. */
await shot('tilt-01-hover', {
  width: 1280,
  height: 900,
  act: async (page) => {
    await clearHeaderShot('#uslugi', 160)(page);
    const box = await page.locator('.tilt-frame').first().boundingBox();
    await page.mouse.move(box.x + box.width * 0.15, box.y + box.height * 0.15, { steps: 6 });
    await page.waitForTimeout(300);
  },
  clip: '.tilt-frame',
});

/* 12.4 Боковой индикатор разделов (п.4) — вверху страницы и после прокрутки
   к середине, чтобы было видно, что активная звезда переезжает. */
await shot('section-stars-01-top', { width: 1400, height: 900, clip: '.section-stars' });
await shot('section-stars-02-mid', {
  width: 1400,
  height: 900,
  clip: '.section-stars',
  act: async (page) => {
    await page.evaluate(() =>
      window.scrollTo({ top: document.body.scrollHeight * 0.55, left: 0, behavior: 'instant' }),
    );
    await page.waitForTimeout(500);
  },
});

/* 12.5 EXIF-подпись плёночного кадра (п.5) — только слово «плёнка»
   (сужение по OQ-21, см. `FilmCaption.tsx`). */
await shot('film-exif-caption', {
  width: 1280,
  height: 900,
  act: async (page) => {
    await clearHeaderShot('.film-tag', 160)(page);
    const box = await page.locator('.film-tag').boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 6 });
    await page.waitForTimeout(900);
  },
  clip: '.film-tag',
});

/* 12.6 Цена за кликом (п.6) — приглушённая цифра и разворот по клику,
   один и тот же кадр карточки в обоих состояниях. */
await shot('price-plate-01-closed', {
  width: 1280,
  height: 900,
  act: clearHeaderShot('.price-plate', 160),
  clip: '.price-plate',
});
await shot('price-plate-02-open', {
  width: 1280,
  height: 900,
  act: async (page) => {
    await clearHeaderShot('.price-plate', 160)(page);
    await page.locator('.price-plate').first().click();
    await page.waitForTimeout(500);
  },
  clip: '.price-plate',
});

/* 12.7 Асимметричный разлёт папок (п.7) — кадр СРЕДИ полёта (180 мс из
   400–470 мс перехода): обе дочерние папки уже видны, но под разными углами
   и на разном расстоянии от родителя — после полной остановки они лягут
   ровно, разница живёт в пути, не в покое (см. styles.css). */
await shot('folders-05-asymmetric-mid', {
  clip: '.delivery',
  // wait: 0 — `shot()` иначе добавляет свою паузу (по умолчанию 900 мс)
  // ПОСЛЕ `act`, и переход (400–470 мс) успел бы полностью осесть,
  // а кадр как раз обязан поймать его НА ЛЕТУ.
  wait: 0,
  act: async (page) => {
    await scrollThrough(page);
    await page.locator('.folder-parent').click();
    await page.waitForTimeout(180);
  },
});

await browser.close();
console.log(`\nснято кадров: ${made.length}, каталог: .design/hybrid/shots/`);
