import { useEffect, useRef } from 'react';

/**
 * Звёзды: неровные, несуразные, НЕ пятиугольные, жёлтые и белые.
 * Формулировка владелицы (BRIEF «Интерактив»). Эталона в picked/ нет намеренно —
 * форма выведена из брифа и из кадров: рваный контур, ни одной оси симметрии.
 *
 * Графика кодом: canvas + rAF, ни одного изображения.
 *
 * Физика — по apple-design:
 *  · пружина критически задемпфирована (damping 1.0, response 0.42 c) для возврата;
 *  · при импульсе от пальца демпфирование 0.72 — овершут разрешён только там,
 *    где жесту предшествовал импульс;
 *  · X и Y — независимые пружины (2D-пружина рассинхронизируется);
 *  · путь входа и возврата один и тот же (симметрия), звезда возвращается домой.
 *
 * На телефоне курсора нет. Поэтому реакций три, и две из них не курсорные:
 *  1) курсор отталкивает (десктоп);
 *  2) тап даёт импульс ближайшим звёздам (тач);
 *  3) звёзды отстают от скролла на величину скорости прокрутки и пружиной
 *     догоняют страницу — это работает и без единого касания.
 */

type Star = {
  hx: number; // дом, доля ширины
  hy: number; // дом, доля высоты сцены
  r: number;
  path: Path2D;
  fill: string;
  alpha: number;
  rot: number;
  sx: number; // сплющивание по оси X
  sy: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  vr: number;
  rr: number; // текущий доворот
  bounceUntil: number;
};

const TAU = Math.PI * 2;

// Детерминированный шум: одна и та же россыпь при каждой загрузке,
// иначе критик и владелица смотрят разные страницы.
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Рваная звезда: 4–9 лучей, каждый луч со своим радиусом и своим углом.
 *  Правка третьего захода: раньше звёзды выходили слишком складные — почти
 *  симметричные искорки. Владелица просила «неровные, несуразные». Поэтому
 *  разброс углов увеличен вдвое, длина луча гуляет от 0.42 до 1.0 R,
 *  и каждая звезда вдобавок сплющена по случайной оси (см. sx/sy в draw). */
function makeStarPath(rand: () => number, R: number): Path2D {
  const n = 4 + Math.floor(rand() * 6); // 4..9 лучей
  const p = new Path2D();
  for (let i = 0; i < n; i++) {
    const base = (i / n) * TAU;
    // угол луча гуляет — правильного многоугольника не получается никогда
    const aOut = base + (rand() - 0.5) * 0.95;
    const aIn = base + TAU / (2 * n) + (rand() - 0.5) * 0.8;
    const rOut = R * (0.42 + rand() * 0.58);
    const rIn = R * (0.12 + rand() * 0.3);
    const ox = Math.cos(aOut) * rOut;
    const oy = Math.sin(aOut) * rOut;
    const ix = Math.cos(aIn) * rIn;
    const iy = Math.sin(aIn) * rIn;
    if (i === 0) p.moveTo(ox, oy);
    else p.lineTo(ox, oy);
    p.lineTo(ix, iy);
  }
  p.closePath();
  return p;
}

export function Stars({ count = 16, seed = 7 }: { count?: number; seed?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;

    const rand = rng(seed);
    const stars: Star[] = [];
    for (let i = 0; i < count; i++) {
      const R = 7 + rand() * 15; // 7..22 px
      stars.push({
        hx: 0.03 + rand() * 0.94,
        hy: 0.02 + rand() * 0.96,
        r: R,
        path: makeStarPath(rand, R),
        fill: rand() < 0.58 ? '#f2c13c' : '#fffcf0',
        alpha: 0.42 + rand() * 0.5,
        rot: rand() * TAU,
        sx: 0.72 + rand() * 0.56,
        sy: 0.72 + rand() * 0.56,
        x: 0, y: 0, vx: 0, vy: 0, vr: 0, rr: 0,
        bounceUntil: 0,
      });
    }

    let W = 0, H = 0, dpr = 1;
    const resize = () => {
      const p = cv.parentElement!;
      W = p.clientWidth;
      H = p.clientHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(H * dpr);
      cv.style.width = W + 'px';
      cv.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(cv.parentElement!);

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      for (const s of stars) {
        ctx.save();
        ctx.translate(s.hx * W + s.x, s.hy * H + s.y);
        ctx.rotate(s.rot + s.rr);
        ctx.scale(s.sx, s.sy);
        ctx.globalAlpha = s.alpha;
        ctx.fillStyle = s.fill;
        ctx.fill(s.path);
        ctx.restore();
      }
    };

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (reduce.matches) {
      draw();
      return () => ro.disconnect();
    }

    // ——— ввод ———
    let px = -9999, py = -9999, hasPointer = false;

    /* Крючок для съёмки доказательств: ?pointer=x,y ставит виртуальный курсор
       в фиксированную точку — headless-браузер мышь не двигает. На поведение
       продукта не влияет, параметра в продуктовом пути нет. */
    const demo = new URLSearchParams(location.search).get('pointer');
    if (demo) {
      const [dx, dy] = demo.split(',').map(Number);
      if (Number.isFinite(dx) && Number.isFinite(dy)) {
        const b = cv.getBoundingClientRect();
        px = dx - b.left; py = dy - b.top; hasPointer = true;
      }
    }

    const REACH = 180; // px — радиус отталкивания курсором
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return; // на тач-вводе курсора нет
      const b = cv.getBoundingClientRect();
      px = e.clientX - b.left;
      py = e.clientY - b.top;
      hasPointer = true;
    };
    const onLeave = () => { hasPointer = false; px = py = -9999; };

    // тап: импульс ближайшим звёздам вместо несуществующего наведения
    const onDown = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') return;
      const b = cv.getBoundingClientRect();
      const tx = e.clientX - b.left, ty = e.clientY - b.top;
      const now = performance.now();
      for (const s of stars) {
        const dx = s.hx * W + s.x - tx;
        const dy = s.hy * H + s.y - ty;
        const d = Math.hypot(dx, dy) || 1;
        if (d > 260) continue;
        const k = (1 - d / 260) * 620; // px/s
        s.vx += (dx / d) * k;
        s.vy += (dy / d) * k;
        s.vr += (dx / d) * 0.0065 * k;
        s.bounceUntil = now + 700; // овершут разрешён: жесту предшествовал импульс
      }
    };

    // скролл: звёзды отстают от страницы и пружиной догоняют.
    // Это и есть «реакция на палец» там, где пальца на экране нет.
    let lastScroll = window.scrollY, scrollVel = 0;

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onDown, { passive: true });
    window.addEventListener('pointerleave', onLeave);

    let raf = 0, prev = performance.now();
    const loop = (t: number) => {
      const dt = Math.min((t - prev) / 1000, 1 / 30);
      prev = t;

      const sy = window.scrollY;
      scrollVel = scrollVel * 0.82 + (sy - lastScroll) * 0.18;
      lastScroll = sy;
      const drag = Math.max(-20, Math.min(20, -scrollVel * 1.4));

      for (const s of stars) {
        // цель = дом + отставание от скролла + отталкивание курсором
        let tx = 0, ty = drag;
        if (hasPointer) {
          const dx = s.hx * W + s.x - px;
          const dy = s.hy * H + s.y - py;
          const d = Math.hypot(dx, dy);
          if (d < REACH && d > 0.001) {
            const push = (1 - d / REACH) * 62;
            tx += (dx / d) * push;
            ty += (dy / d) * push;
          }
        }

        // критически задемпфированная пружина; с овершутом только после импульса
        const bouncing = t < s.bounceUntil;
        const response = bouncing ? 0.36 : 0.42;
        const damping = bouncing ? 0.72 : 1.0;
        const w = TAU / response;

        // X и Y — независимые пружины
        s.vx += (w * w * (tx - s.x) - 2 * w * damping * s.vx) * dt;
        s.vy += (w * w * (ty - s.y) - 2 * w * damping * s.vy) * dt;
        s.x += s.vx * dt;
        s.y += s.vy * dt;

        // доворот — своя пружина, цель всегда 0 (звезда возвращается ровно домой)
        const wr = TAU / 0.55;
        s.vr += (wr * wr * (0 - s.rr) - 2 * wr * 1.0 * s.vr) * dt;
        s.rr += s.vr * dt;
      }

      draw();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerleave', onLeave);
    };
  }, [count, seed]);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0"
    />
  );
}
