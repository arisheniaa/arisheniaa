import { useEffect, useMemo, useRef } from 'react';
import type { RefObject } from 'react';
import { onFrame } from './raf';
import { STAR_PATHS, STAR_TONES } from './star-paths';
import type { StarShape, StarTone } from './star-paths';

/**
 * ЗВЁЗДЫ — фоновая структура. Лок, раздел «Звёзды»:
 *
 *  · форма ЗАМЕНЕНА: SVG-путь по силуэтам из файлов владелицы (`star-paths.ts`),
 *    а не canvas со случайной генерацией лучей при каждой загрузке, как в B/C;
 *  · масштаб вариативный (три размерных ранга, как в `звезды.jpg`);
 *  · три цвета пути — чёрный / жёлтый / бордовый (`STAR_TONES`, значения в теме);
 *  · позиция — россыпь по композиции секции нерегулярной сеткой
 *    (`звезды на полу.jpg`), не одно пятно вокруг курсора;
 *  · курсорная и тактильная реакция СОХРАНЕНА из B/C — меняются силуэт и палитра,
 *    не отзывчивость;
 *  · СВЕЧЕНИЕ (Ф28: «звёзды должны светиться, как в варианте C»). Параметры
 *    взяты из `directions/c/src/Stars.tsx`, строки 100–107, где свечение было
 *    только откликом на курсор:
 *        ctx.shadowBlur  = 22 * glow;
 *        ctx.shadowColor = цвет самой звезды;
 *        scale = 1 + glow * 0.55;  alpha = base + glow * 0.5;
 *    Здесь то же самое, но два слоя: ПОСТОЯННОЕ базовое свечение (владелица
 *    сказала «должны светиться», а не «должны светиться под курсором») плюс
 *    прежний курсорный доворот до 22 px. Радиус базового — 0.32 от размера
 *    звезды: у C светились звёзды одного размера, у нас три ранга, и
 *    фиксированные 22 px на мелкой звезде в 9 px дают пятно вместо силуэта.
 *    Цвет свечения — цвет самой звезды, как в C, а не белый: белое свечение
 *    на кремовом полотне не видно вовсе.
 *
 * Почему `drop-shadow`, а не SVG-фильтр с `feGaussianBlur`: у нас три цвета
 * пути, фильтр пришлось бы объявлять трижды и держать в `<defs>`, а
 * `filter: drop-shadow` берёт цвет строкой и меняется одной записью в стиль.
 * Строка стиля переписывается только когда квантованное свечение изменилось
 * (шаг 0.08) — иначе браузер пересобирает фильтр на каждом кадре для каждой
 * звезды, а видимой разницы между 0.41 и 0.42 нет.
 *
 * Расстановка — нерегулярная сетка, а не чистый rand: чистый rand сбивается в
 * комки и оставляет дыры, и на 390 px комок садится ровно на заголовок.
 * Секция делится на ячейки, в каждой не больше одной звезды, точка внутри
 * ячейки смещена детерминированным шумом. Ровно так лежат звёзды на плитке
 * в `звезды на полу.jpg`: сетка чувствуется, регулярности нет.
 *
 * Физика — apple-design, теми же числами, что в B:
 *  · пружина критически задемпфирована (damping 1.0, response 0.42 c);
 *  · после импульса от пальца damping 0.72 — овершут разрешён только там,
 *    где жесту предшествовал импульс;
 *  · X и Y — независимые пружины;
 *  · цель доворота всегда 0: звезда возвращается ровно домой.
 *
 * П7: в первом кадре звёзды стоят на местах и не двигаются — движение только
 * в ответ на курсор, тап или прокрутку.
 * prefers-reduced-motion: рисуются один раз, rAF не запускается.
 */

type Star = {
  shape: StarShape;
  tone: StarTone;
  hx: number; // дом, доля ширины
  hy: number; // дом, доля высоты
  size: number; // px, сторона фигуры
  rot: number; // deg
  alpha: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rr: number;
  vr: number;
  bounceUntil: number;
  /** 0..1 — курсорный доворот свечения, поверх постоянного базового (C, `glow`) */
  glow: number;
  /** последнее записанное в DOM квантованное свечение, чтобы не трогать стиль зря */
  glowPainted: number;
};

/** Детерминированный шум: одна и та же россыпь при каждой загрузке — иначе
 *  критик, владелица и скриншот смотрят три разные страницы. */
function rng(seed: number) {
  let s = (seed || 1) >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export type StarsProps = {
  /** сколько звёзд на широком экране; на узком число уменьшается втрое */
  count?: number;
  seed?: number;
  /** набор силуэтов этой секции */
  shapes?: StarShape[];
  /** размерный ранг: 'fine' — мелкая фоновая россыпь, 'mixed' — три размера, 'bold' — крупные */
  scale?: 'fine' | 'mixed' | 'bold';
  /**
   * Какие тона разрешены в этой секции. Тон выбирается РАВНОВЕРОЯТНО из
   * массива, поэтому повтор значения — это вес, а не опечатка: `[1, 1, 2]`
   * читается «жёлтых вдвое больше, чем бордовых». Ф39 п.8 просит именно
   * перевес («побольше желтых звездочек»), а не единственный тон, и заводить
   * ради этого отдельное поле весов было бы лишней сущностью — семантика
   * «список с повторами» здесь и есть список весов.
   */
  tones?: StarTone[];
  /**
   * Узел, вокруг которого звёзды расступаются (Ф39 п.2). Звезда, чей дом
   * попал в прямоугольник этого узла ИЛИ в полосу прямо под ним до низа
   * секции, выталкивается вбок — к ближнему свободному краю. «Убери
   * звёздочки из-под фотографии, лучше пусть они будут вокруг» — дословно.
   * Не задан (обычный случай) — россыпь как была, ни одной лишней операции.
   */
  avoid?: RefObject<HTMLElement | null>;
  className?: string;
};

/** Плотность тона подобрана по фону, а не по вкусу: чёрный на кремовом кричит,
 *  жёлтый на кремовом пропадает. Диапазоны — [мин, макс] непрозрачности. */
const TONE_ALPHA: Record<StarTone, [number, number]> = {
  0: [0.18, 0.4],
  1: [0.6, 0.95],
  2: [0.34, 0.62],
};

const ALL_SHAPES: StarShape[] = ['spark', 'needle8', 'starfish6', 'hands5', 'tiny8'];
const ALL_TONES: StarTone[] = [0, 1, 2];

export function Stars({
  count = 14,
  seed = 7,
  shapes = ALL_SHAPES,
  scale = 'mixed',
  tones = ALL_TONES,
  avoid,
  className = '',
}: StarsProps) {
  const host = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);

  /* Россыпь считается один раз: координаты — доли, поэтому resize её
     не пересобирает и звёзды не прыгают при повороте телефона. */
  const stars = useMemo<Star[]>(() => {
    /* Крючок для съёмки доказательств: ?startone=0|1|2 сводит всю россыпь к
       одному тону и крупному ранту, чтобы силуэт и цвет можно было снять
       крупным планом по отдельности — лок требует показать три цвета пути,
       а на живой странице тона намеренно перемешаны и мелкие. Влияет только
       на кадр: в продуктовом пути параметра нет. */
    const forced =
      typeof location === 'undefined'
        ? null
        : new URLSearchParams(location.search).get('startone');
    const demoTone = forced !== null && ['0', '1', '2'].includes(forced);
    const useTones: StarTone[] = demoTone ? [Number(forced) as StarTone] : tones;
    const useScale = demoTone ? 'bold' : scale;

    const rand = rng(seed);
    const narrow =
      typeof window !== 'undefined' && window.matchMedia('(max-width: 640px)').matches;
    const n = narrow ? Math.max(4, Math.round(count / 3)) : count;

    const cols = Math.max(2, Math.round(Math.sqrt(n * 1.6)));
    const rows = Math.max(2, Math.ceil(n / cols));
    const cells: [number, number][] = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) cells.push([c, r]);
    for (let i = cells.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [cells[i], cells[j]] = [cells[j], cells[i]];
    }

    const bands =
      useScale === 'fine' ? [9, 13, 18] : useScale === 'bold' ? [26, 38, 54] : [11, 20, 34];

    return cells.slice(0, n).map(([c, r]) => {
      const shape = shapes[Math.floor(rand() * shapes.length)];
      const tone = useTones[Math.floor(rand() * useTones.length)];
      const band = bands[Math.floor(rand() * bands.length)];
      const [a0, a1] = TONE_ALPHA[tone];
      return {
        shape,
        tone,
        // 0.10..0.90 внутри ячейки: звезда не липнет к границе кадра
        hx: (c + 0.1 + rand() * 0.8) / cols,
        hy: (r + 0.1 + rand() * 0.8) / rows,
        size: band * (0.82 + rand() * 0.42),
        rot: rand() * 360,
        alpha: a0 + rand() * (a1 - a0),
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        rr: 0,
        vr: 0,
        bounceUntil: 0,
        glow: 0,
        glowPainted: -1,
      };
    });
  }, [count, seed, scale, shapes, tones]);

  useEffect(() => {
    const box = host.current;
    const root = svg.current;
    if (!box || !root) return;

    const groups = Array.from(root.querySelectorAll<SVGGElement>('[data-star]'));
    let W = box.clientWidth || 1;
    let H = box.clientHeight || 1;

    /* ЗОНА ИСКЛЮЧЕНИЯ (Ф39 п.2) — «убери под моей фотографией звёздочки,
       лучше пусть они будут вокруг».

       Считается по ЖИВОМУ прямоугольнику узла, а не по доле от секции: доля
       была бы догадкой о раскладке, которая врёт на первой же смене колонок,
       а `getBoundingClientRect` знает, где фотография стоит на самом деле —
       и на 1920, и на 360, и после смены шрифта.

       Дом каждой звезды пересчитывается ОДИН РАЗ на раскладку (здесь и по
       `ResizeObserver`), а не каждый кадр: положение фотографии между
       кадрами не меняется, а `paint` крутится в rAF, и лишний
       `getBoundingClientRect` там стоил бы принудительного пересчёта
       раскладки на каждом кадре.

       Куда выталкиваем: к ближайшему краю зоны из четырёх, но только если
       за этим краем звезда останется внутри секции. Иначе берём следующее
       по дешевизне направление — так на широком экране звёзды уходят вбок
       (слева и справа от фотографии есть место), а на узком, где кадр во всю
       ширину, — вверх и вниз. Разброс вдоль края берётся из `rot` самой
       звезды: без него все вытолкнутые встали бы в одну линию по границе
       зоны, что заметнее исходной проблемы. `rot` уже детерминирован
       (`rng(seed)`), поэтому россыпь остаётся той же при каждой загрузке. */
    let homes = stars.map((s) => ({ x: s.hx, y: s.hy }));

    const relayout = () => {
      W = box.clientWidth || 1;
      H = box.clientHeight || 1;
      const node = avoid?.current ?? null;
      if (!node) {
        homes = stars.map((s) => ({ x: s.hx, y: s.hy }));
        return;
      }
      const b = box.getBoundingClientRect();
      const a = node.getBoundingClientRect();
      const PAD = 26;
      const x0 = a.left - b.left - PAD;
      const x1 = a.right - b.left + PAD;
      const y0 = a.top - b.top - PAD;
      /* Низ зоны — не низ фотографии, а ещё половина её высоты вниз: именно
         это место владелица назвала «под фотографией». Ниже звёзды снова
         разрешены — их же и просили оставить «вокруг». */
      const y1 = a.bottom - b.top + a.height * 0.5;

      homes = stars.map((s) => {
        const x = s.hx * W;
        const y = s.hy * H;
        if (x <= x0 || x >= x1 || y <= y0 || y >= y1) return { x: s.hx, y: s.hy };

        // разброс вдоль края, детерминированный: 0..1 из угла поворота звезды
        const j = s.rot / 360;
        const M = 4; // не липнем к самому краю секции
        const options = [
          { d: x - x0, nx: x0 - j * Math.max(0, x0 - M), ny: y },
          { d: x1 - x, nx: x1 + j * Math.max(0, W - M - x1), ny: y },
          { d: y - y0, nx: x, ny: y0 - j * Math.max(0, y0 - M) },
          { d: y1 - y, nx: x, ny: y1 + j * Math.max(0, H - M - y1) },
        ].sort((p, q) => p.d - q.d);

        for (const o of options) {
          if (o.nx >= M && o.nx <= W - M && o.ny >= M && o.ny <= H - M) {
            return { x: o.nx / W, y: o.ny / H };
          }
        }
        // некуда — оставляем дома, лучше звезда на месте, чем за краем секции
        return { x: s.hx, y: s.hy };
      });
    };
    relayout();

    const paint = () => {
      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        const g = groups[i];
        if (!g) continue;
        const home = homes[i];
        /* Курсорный доворот меняет и МАСШТАБ — ровно как в C (`scale = 1 +
           glow * 0.55`): там звезда под курсором не только светилась, но и
           подрастала. Здесь коэффициент мягче, 0.28: у C звёзды дрейфовали по
           тёмному полю, у нас лежат в композиции рядом с текстом, и рост на
           55 % сдвигает читаемую плотность секции. */
        const k = (s.size / 100) * (1 + s.glow * 0.28);
        g.setAttribute(
          'transform',
          `translate(${(home.x * W + s.x).toFixed(2)} ${(home.y * H + s.y).toFixed(2)}) ` +
            `rotate(${(s.rot + s.rr).toFixed(2)}) scale(${k.toFixed(4)}) translate(-50 -50)`,
        );

        /* Свечение. Базовый радиус — от размера звезды, курсорный — числом из C.
           Квант 0.08: ниже него фильтр переписывался бы каждый кадр без
           видимого изменения. */
        const q = Math.round(s.glow / 0.08) * 0.08;
        if (q !== s.glowPainted) {
          s.glowPainted = q;
          const base = s.size * 0.32;
          const blur = base + 22 * q;
          const color = STAR_TONES[s.tone];
          g.style.filter =
            `drop-shadow(0 0 ${blur.toFixed(1)}px ${color})` +
            // второй, короткий слой: ядро свечения. Один слой на большом
            // радиусе даёт ореол без плотного центра, и звезда выглядит
            // размытой, а не светящейся.
            ` drop-shadow(0 0 ${(blur * 0.34).toFixed(1)}px ${color})`;
          /* Непрозрачность живёт на ГРУППЕ, а не на пути: у C под курсором
             звезда прибавляла и в плотности (`alpha = base + glow * 0.5`),
             и это же число здесь. Если оставить alpha на `<path opacity>`,
             прибавку пришлось бы считать отношением, а не суммой. */
          g.style.opacity = String(Math.min(1, s.alpha + q * 0.5));
        }
      }
    };

    const ro = new ResizeObserver(() => {
      relayout();
      paint();
    });
    ro.observe(box);
    paint();

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return () => ro.disconnect();
    }

    /* Крючок для съёмки доказательств: ?pointer=x,y ставит виртуальный курсор
       в фиксированную точку — headless-браузер мышь не двигает. В продуктовом
       пути параметра нет. */
    let px = -9999;
    let py = -9999;
    let hasPointer = false;
    const demo = new URLSearchParams(location.search).get('pointer');
    if (demo) {
      const [dx, dy] = demo.split(',').map(Number);
      if (Number.isFinite(dx) && Number.isFinite(dy)) {
        const b = box.getBoundingClientRect();
        px = dx - b.left;
        py = dy - b.top;
        hasPointer = true;
      }
    }

    const REACH = 190; // px, радиус расступания
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return; // на тач-вводе курсора нет
      const b = box.getBoundingClientRect();
      px = e.clientX - b.left;
      py = e.clientY - b.top;
      hasPointer = true;
    };
    const onLeave = () => {
      hasPointer = false;
      px = py = -9999;
    };

    // тап: импульс ближайшим звёздам вместо несуществующего наведения
    const onDown = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') return;
      const b = box.getBoundingClientRect();
      const tx = e.clientX - b.left;
      const ty = e.clientY - b.top;
      const now = performance.now();
      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        const dx = homes[i].x * W + s.x - tx;
        const dy = homes[i].y * H + s.y - ty;
        const d = Math.hypot(dx, dy) || 1;
        if (d > 260) continue;
        const k = (1 - d / 260) * 600;
        s.vx += (dx / d) * k;
        s.vy += (dy / d) * k;
        s.vr += (dx / d) * 0.42 * k;
        s.bounceUntil = now + 700;
      }
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onDown, { passive: true });
    window.addEventListener('pointerleave', onLeave);

    // прокрутка: звёзды отстают от страницы и пружиной догоняют. Это «реакция
    // на палец» там, где пальца на экране нет вообще.
    let lastScroll = window.scrollY;
    let scrollVel = 0;

    /* ═══ ДВА ВЫКЛЮЧАТЕЛЯ (Ф43) — «сайт ещё виснет» ══════════════════════
       На главной шесть полей звёзд, и каждое до этой правки крутило свой
       `requestAnimationFrame` без остановки: считало пружины для 82 звёзд и
       переписывало атрибуты DOM шестьдесят раз в секунду. При высоте
       страницы 7000 px одновременно видно примерно один экран из девяти —
       пять полей из шести двигали то, чего читатель не видит.

       ПЕРВЫЙ ВЫКЛЮЧАТЕЛЬ — ВИДИМОСТЬ. Секция за экраном не считается вовсе.
       Запас `rootMargin: 25%` даёт полю ожить чуть раньше, чем оно въедет в
       кадр: иначе первый видимый кадр приходился бы на момент, когда
       пружины ещё стоят в позиции полугодовой давности, и звёзды дёрнулись
       бы уже на глазах.

       ВТОРОЙ — ПОКОЙ. Даже видимое поле почти всё время неподвижно: звёзды
       живут только от курсора, тапа и прокрутки, а цель пружины всегда
       «дом». Когда все скорости и смещения улеглись ниже порога заметности
       (0,05 px — это меньше трети пикселя после округления в `paint`), а
       курсора над секцией нет, кадр пропускается целиком: ни физики, ни
       записи в DOM. Страница, на которую просто смотрят, не тратит ничего.

       Порог не «на глаз»: `paint` пишет координаты с двумя знаками, а
       свечение квантовано шагом 0,08 — движение мельче порога всё равно не
       доехало бы до экрана.

       Оба выключателя — про КОГДА считать, а не про то, ЧТО считать. Ни
       одно число физики (жёсткость, демпфирование, радиус, тона) не
       тронуто: движение осталось тем же, исчезла работа впустую. */
    let visible = false;
    const vis = new IntersectionObserver(
      (entries) => {
        visible = entries[entries.length - 1].isIntersecting;
        // подхватываем прокрутку, случившуюся пока поле спало, — иначе
        // первый кадр после пробуждения увидел бы разом весь путь
        lastScroll = window.scrollY;
        scrollVel = 0;
      },
      { rootMargin: '25% 0px' },
    );
    vis.observe(box);

    /** Ниже этого порога движение уже не доезжает до экрана (см. выше). */
    const STILL = 0.05;

    const TAU = Math.PI * 2;
    const loop = (t: number, dt: number) => {
      if (!visible) {
        lastScroll = window.scrollY;
        return;
      }

      const sy = window.scrollY;
      scrollVel = scrollVel * 0.82 + (sy - lastScroll) * 0.18;
      lastScroll = sy;
      const drag = Math.max(-22, Math.min(22, -scrollVel * 1.4));

      /* Кадр можно пропустить, только если двигать нечего И нечему начать
         двигаться: нет курсора над полем, прокрутка улеглась, ни одна
         звезда не смещена и не имеет скорости. Проверяется ДО записи в DOM,
         но ПОСЛЕ физики — иначе пропустили бы последний кадр возвращения
         домой и звезда осталась бы в трети пикселя от места. */
      let moving = hasPointer || Math.abs(drag) > STILL;

      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        let tx = 0;
        let ty = drag;
        /* Цель свечения — как в C: квадрат близости к курсору, `f = (1 - d/R)²`.
           Затухание к цели тоже из C: `glow += (tg - glow) * min(1, dt * 7)`. */
        let tg = 0;
        if (hasPointer) {
          const dx = homes[i].x * W + s.x - px;
          const dy = homes[i].y * H + s.y - py;
          const d = Math.hypot(dx, dy);
          if (d < REACH && d > 0.001) {
            const push = (1 - d / REACH) * 64;
            tx += (dx / d) * push;
            ty += (dy / d) * push;
            tg = (1 - d / REACH) ** 2;
          }
        }
        s.glow += (tg - s.glow) * Math.min(1, dt * 7);

        const bouncing = t < s.bounceUntil;
        const response = bouncing ? 0.36 : 0.42;
        const damping = bouncing ? 0.72 : 1;
        const w = TAU / response;
        s.vx += (w * w * (tx - s.x) - 2 * w * damping * s.vx) * dt;
        s.vy += (w * w * (ty - s.y) - 2 * w * damping * s.vy) * dt;
        s.x += s.vx * dt;
        s.y += s.vy * dt;

        const wr = TAU / 0.55;
        s.vr += (wr * wr * (0 - s.rr) - 2 * wr * 1 * s.vr) * dt;
        s.rr += s.vr * dt;

        if (!moving) {
          moving =
            Math.abs(s.x) > STILL ||
            Math.abs(s.y) > STILL ||
            Math.abs(s.rr) > STILL ||
            Math.abs(s.vx) > STILL ||
            Math.abs(s.vy) > STILL ||
            Math.abs(s.vr) > STILL ||
            s.glow > 0.004; // квант свечения в `paint` — 0.08, это заведомо ниже
        }
      }
      if (moving) paint();
    };
    const stopFrames = onFrame(loop);

    return () => {
      stopFrames();
      vis.disconnect();
      ro.disconnect();
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerleave', onLeave);
    };
  }, [stars, avoid]);

  return (
    <div
      ref={host}
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 z-0 overflow-hidden ${className}`}
    >
      <svg ref={svg} width="100%" height="100%" focusable="false">
        {stars.map((s, i) => (
          /* Стартовые свечение и плотность стоят в разметке, а не появляются
             первым кадром rAF: при `prefers-reduced-motion` цикл не запускается
             вовсе, и без этого звёзды остались бы без свечения — то есть
             выключенное движение отняло бы у страницы содержание, чего делать
             нельзя. Дальше те же свойства переписывает `paint`. */
          <g
            key={i}
            data-star={i}
            style={{
              opacity: s.alpha,
              filter:
                `drop-shadow(0 0 ${(s.size * 0.32).toFixed(1)}px ${STAR_TONES[s.tone]})` +
                ` drop-shadow(0 0 ${(s.size * 0.32 * 0.34).toFixed(1)}px ${STAR_TONES[s.tone]})`,
            }}
          >
            <path d={STAR_PATHS[s.shape]} fill={STAR_TONES[s.tone]} />
          </g>
        ))}
      </svg>
    </div>
  );
}

/**
 * Звезда-компаньон имени в шапке.
 *
 * СИЛУЭТ ВЕРНУЛСЯ К C (правка Ф28). Первая сборка гибрида поставила здесь
 * спарк из `star-paths.ts`, рассудив, что «форма звезды на сайте одна, и знак
 * не может быть исключением». Ф28 закрывает этот вопрос словами владелицы:
 *
 *   «сделай имя в том же шрифте и такую же СЕМИУГОЛЬНУЮ звезду, что и в
 *    варианте C, который был ранее»
 *
 * и лок повторяет дословно: «Гарнитура и семиугольная звезда-компаньон — как в
 * C». Путь взят из `directions/c/src/Mark.tsx` без изменений, вместе с его
 * системой координат `viewBox 0 0 40 40` — пересчёт в сотую сетку сдвинул бы
 * центр, а вся суть фигуры в том, что центр смещён.
 *
 * Это НЕ противоречит Ф24: там заменялись звёзды-россыпь, генерировавшиеся
 * случайными лучами. Знак у имени назван отдельно и прямым одобрением.
 *
 * `glow` — свечение по Ф28. По умолчанию выключено: в шапке знак стоит на
 * подложке рядом с текстом, и ореол под ним читался бы как дефект набора.
 */
export function StarMark({
  size = 18,
  className = '',
  glow = false,
}: {
  size?: number;
  className?: string;
  glow?: boolean;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      className={className}
      aria-hidden="true"
      focusable="false"
      style={glow ? { filter: `drop-shadow(0 0 ${(size * 0.32).toFixed(1)}px currentColor)` } : undefined}
    >
      <path
        d="M20.5 1 L24.2 13.8 L36.5 10.4 L28.9 20.6 L39 26.3 L26.4 27.6 L28.2 39 L19.2 31.2 L10.4 38.4 L12.1 26.6 L1 23.4 L11.6 18.2 L6.2 8.1 L18.1 13.2 Z"
        fill="currentColor"
      />
    </svg>
  );
}
