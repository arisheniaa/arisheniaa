import { useEffect, useRef } from 'react';

/**
 * Звёзды — выбранный владелицей интерактив.
 * Дословно: «неровные, несуразные, НЕ пятиугольные, жёлтые и белые».
 *
 * Эталона в refs/picked/ нет намеренно (GATE2: наивный вектор — ноль,
 * источники были не те). Форма выведена из брифа и из характера кадров:
 * лучи разной длины, углы неровные, ни одна звезда не повторяет другую.
 *
 * Реагируют на курсор И на палец: pointermove покрывает оба.
 * prefers-reduced-motion — рисуются один раз статично, rAF не запускается.
 */

type Star = {
  x: number; y: number;           // доля от ширины/высоты, чтобы переживать resize
  r: number;                      // радиус, px
  pts: { a: number; ro: number; ri: number }[];
  rot: number; spin: number;
  vx: number; vy: number;         // дрейф, px/с
  ox: number; oy: number;         // смещение от курсора
  warm: boolean;                  // жёлтая или белая
  base: number;                   // базовая непрозрачность
  glow: number;                   // 0..1, отклик на указатель
};

const rnd = (a: number, b: number) => a + Math.random() * (b - a);

function makeStar(narrow = false): Star {
  const n = Math.floor(rnd(4, 8)); // 4..7 лучей — пятиугольник исключён формулой
  const pts = [];
  for (let i = 0; i < n; i++) {
    pts.push({
      a: (i / n) * Math.PI * 2 + rnd(-0.22, 0.22), // неровные углы
      ro: rnd(0.66, 1.0),                          // лучи разной длины
      ri: rnd(0.2, 0.44),                          // впадины разной глубины
    });
  }
  return {
    x: Math.random(), y: Math.random(),
    r: narrow ? rnd(5, 15) : rnd(7, 26),
    pts, rot: rnd(0, 6.28), spin: rnd(-0.06, 0.06),
    vx: rnd(-3.5, 3.5), vy: rnd(-3.5, 3.5),
    ox: 0, oy: 0,
    warm: Math.random() > 0.38,
    base: rnd(0.3, 0.85),
    glow: 0,
  };
}

export default function Stars({ count = 26, className = '' }: { count?: number; className?: string }) {
  const cv = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = cv.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* На 390 та же плотность даёт кашу поверх заголовка: звёзд вдвое
       меньше и они мельче. Приём остаётся, шум уходит. */
    const narrow = window.matchMedia('(max-width: 767px)').matches;
    const n = narrow ? Math.max(6, Math.round(count * 0.5)) : count;
    const stars = Array.from({ length: n }, () => makeStar(narrow));
    const ptr = { x: -9999, y: -9999, on: false };
    let w = 0, h = 0, dpr = 1, raf = 0, last = performance.now();

    const size = () => {
      const rect = c.parentElement!.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = rect.width; h = rect.height;
      c.width = w * dpr; c.height = h * dpr;
      c.style.width = w + 'px'; c.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const path = (s: Star, px: number, py: number, scale: number) => {
      ctx.beginPath();
      for (let i = 0; i < s.pts.length; i++) {
        const p = s.pts[i];
        const nx = s.pts[(i + 1) % s.pts.length];
        const ao = p.a + s.rot;
        const ai = (p.a + nx.a) / 2 + s.rot + (nx.a < p.a ? Math.PI : 0);
        const ro = s.r * p.ro * scale;
        const ri = s.r * p.ri * scale;
        if (i === 0) ctx.moveTo(px + Math.cos(ao) * ro, py + Math.sin(ao) * ro);
        else ctx.lineTo(px + Math.cos(ao) * ro, py + Math.sin(ao) * ro);
        ctx.lineTo(px + Math.cos(ai) * ri, py + Math.sin(ai) * ri);
      }
      ctx.closePath();
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      for (const s of stars) {
        const px = s.x * w + s.ox;
        const py = s.y * h + s.oy;
        const scale = 1 + s.glow * 0.55;
        const alpha = Math.min(1, s.base + s.glow * 0.5);
        ctx.fillStyle = s.warm ? '#F5C842' : '#F2EBDC';
        ctx.globalAlpha = alpha;
        if (s.glow > 0.02) {
          ctx.shadowBlur = 22 * s.glow;
          ctx.shadowColor = s.warm ? '#F5C842' : '#F2EBDC';
        } else ctx.shadowBlur = 0;
        path(s, px, py, scale);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
    };

    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const R = 170;
      for (const s of stars) {
        // дрейф
        s.x += (s.vx * dt) / w;
        s.y += (s.vy * dt) / h;
        if (s.x < -0.05) s.x = 1.05; if (s.x > 1.05) s.x = -0.05;
        if (s.y < -0.05) s.y = 1.05; if (s.y > 1.05) s.y = -0.05;
        s.rot += s.spin * dt;

        // отклик на указатель: отталкивание + свечение
        let tx = 0, ty = 0, tg = 0;
        if (ptr.on) {
          const dx = s.x * w - ptr.x;
          const dy = s.y * h - ptr.y;
          const d = Math.hypot(dx, dy);
          if (d < R) {
            const f = (1 - d / R) ** 2;
            tx = (dx / (d || 1)) * f * 52;
            ty = (dy / (d || 1)) * f * 52;
            tg = f;
          }
        }
        // пружина 8/с — возврат заметен, но не резиновый
        s.ox += (tx - s.ox) * Math.min(1, dt * 8);
        s.oy += (ty - s.oy) * Math.min(1, dt * 8);
        s.glow += (tg - s.glow) * Math.min(1, dt * 7);
      }
      draw();
      raf = requestAnimationFrame(tick);
    };

    const onPtr = (e: PointerEvent) => {
      const rect = c.getBoundingClientRect();
      ptr.x = e.clientX - rect.left;
      ptr.y = e.clientY - rect.top;
      ptr.on = true;
    };
    const offPtr = () => { ptr.on = false; };

    size();
    if (reduce) {
      draw();
    } else {
      const host = c.parentElement!;
      host.addEventListener('pointermove', onPtr, { passive: true });
      host.addEventListener('pointerdown', onPtr, { passive: true });
      host.addEventListener('pointerleave', offPtr, { passive: true });
      host.addEventListener('pointercancel', offPtr, { passive: true });
      raf = requestAnimationFrame(tick);
    }
    const ro = new ResizeObserver(() => { size(); draw(); });
    ro.observe(c.parentElement!);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      const host = c.parentElement;
      host?.removeEventListener('pointermove', onPtr);
      host?.removeEventListener('pointerdown', onPtr);
      host?.removeEventListener('pointerleave', offPtr);
      host?.removeEventListener('pointercancel', offPtr);
    };
  }, [count]);

  return <canvas ref={cv} aria-hidden="true" className={`absolute inset-0 ${className}`} />;
}
