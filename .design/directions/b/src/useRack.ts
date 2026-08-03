import { useCallback, useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';

/**
 * РЭК — механика удержания внимания первого экрана (правило П13).
 *
 * Два кадра лежат в одной руке: тихое сверху, странное под ним, нижний
 * выглядывает из-под верхнего на 15 px — это статичная подсказка, что стопка
 * настоящая, и она не требует ни движения при загрузке, ни строчки пояснения.
 * Верхний кадр берётся пальцем или курсором и тянется 1:1. Отпустили слабо —
 * пружина возвращает домой; бросили — импульс проецируется вперёд, кадр уходит
 * за край и возвращается уже снизу стопки, а сверху оказывается второй.
 *
 * Зачем именно это: гейт 1 требует, чтобы оба регистра автора существовали
 * с первого экрана. Здесь они существуют не как два заголовка, а как один
 * предмет, который читатель держит и переворачивает сам.
 *
 * Физика — по apple-design, числами:
 *  · слежение 1:1 с сохранением точки захвата (Pointer Events + setPointerCapture);
 *  · вертикаль следует на 0.35 с резиновым сопротивлением (rubberband, c = 0.55);
 *  · проекция импульса — экспоненциальная, decelerationRate 0.996
 *    (не 0.998: бросок здесь длиной в карточку, а не в страницу);
 *  · порог переворота — проекция за 34 % ширины карточки, решает знак скорости;
 *  · возврат домой — пружина damping 1.00, response 0.40 c (без овершута);
 *  · бросок — damping 0.80, response 0.38 c (овершут разрешён: был импульс);
 *  · возврат из-за стопки — damping 1.00, response 0.52 c;
 *  · X и Y — независимые пружины;
 *  · перехват в любой момент: новый захват читает текущее положение,
 *    скорость не обрывается, направление можно развернуть на полпути.
 */

export type RackApi = {
  /** индекс кадра, лежащего сверху */
  top: number;
  /** мышь/палец держит стопку прямо сейчас */
  held: boolean;
  /** ref на контейнер стопки */
  ref: RefObject<HTMLDivElement | null>;
  /** положить наверх конкретный кадр (кнопки «Тихое» / «Странное», клавиатура) */
  bring: (i: number) => void;
  /** движение выключено пользователем — рисуем стопку как два кадра рядом */
  still: boolean;
};

type Layer = { x: number; y: number; vx: number; vy: number; damp: number; resp: number; tx: number };

const PEEK_X = 15; // px, насколько нижний кадр выглядывает вправо
const PEEK_Y = 15; // px, и вниз
const BACK_S = 0.955; // масштаб нижнего кадра
const DECEL = 0.996;
const THRESH = 0.34; // доля ширины карточки

/** Проекция импульса по Apple (Designing Fluid Interfaces), px */
const project = (v: number) => (v / 1000) * DECEL / (1 - DECEL);

/** Резиновое сопротивление за границей */
const rubber = (over: number, dim: number, c = 0.55) =>
  (over * dim * c) / (dim + c * Math.abs(over));

/* Крючок для съёмки доказательств: ?rack=-96 держит верхний кадр вытянутым на
   96 px влево, чтобы кадр поймал механику в середине жеста — headless-браузер
   палец не приставляет. На продукт не влияет, в продуктовом пути параметра нет. */
const DEMO_X = (() => {
  if (typeof location === 'undefined') return null;
  const v = new URLSearchParams(location.search).get('rack');
  const n = v === null ? NaN : Number(v);
  return Number.isFinite(n) ? n : null;
})();

export function useRack(count = 2): RackApi {
  const ref = useRef<HTMLDivElement>(null);
  const [top, setTop] = useState(0);
  const [held, setHeld] = useState(false);
  const [still, setStill] = useState(false);

  const L = useRef<Layer[]>(
    Array.from({ length: count }, () => ({ x: 0, y: 0, vx: 0, vy: 0, damp: 1, resp: 0.4, tx: 0 })),
  );
  const topRef = useRef(0);
  const drag = useRef<{ id: number; sx: number; sy: number; ox: number; oy: number } | null>(null);
  const flying = useRef<number | null>(null);

  /* ——— применение состояния к DOM: один раз за кадр, без ре-рендера React ——— */
  const paint = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const W = el.clientWidth || 1;
    const t = topRef.current;
    const k = Math.min(1, Math.abs(L.current[t].x) / (W * THRESH));
    for (let i = 0; i < count; i++) {
      const node = el.querySelector<HTMLElement>(`[data-layer="${i}"]`);
      if (!node) continue;
      const l = L.current[i];
      if (i === t) {
        node.style.zIndex = '2';
        node.style.transform =
          `translate3d(${l.x.toFixed(2)}px,${l.y.toFixed(2)}px,0) rotate(${(l.x / 34).toFixed(3)}deg)`;
      } else {
        // нижний: статичный выступ + своя пружина (после переворота он
        // возвращается из-за края) + подсказка в сторону жеста — только масштабом
        node.style.zIndex = '1';
        const s = BACK_S + (1 - BACK_S) * k;
        node.style.transform =
          `translate3d(${(PEEK_X + l.x).toFixed(2)}px,${(PEEK_Y + l.y).toFixed(2)}px,0) scale(${s.toFixed(4)})`;
      }
    }
  }, [count]);

  /* ——— пружинный цикл ——— */
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setStill(true);
      return;
    }
    if (DEMO_X !== null) {
      L.current[0].x = DEMO_X;
      L.current[0].y = DEMO_X * 0.06;
      setHeld(true);
      paint();
      return;
    }
    paint();
    let raf = 0;
    let prev = performance.now();
    const loop = (now: number) => {
      const dt = Math.min((now - prev) / 1000, 1 / 30);
      prev = now;
      const el = ref.current;
      const W = el?.clientWidth || 1;

      for (let i = 0; i < count; i++) {
        const l = L.current[i];
        if (drag.current && i === topRef.current) continue; // палец держит — пружина молчит
        const w = (Math.PI * 2) / l.resp;
        l.vx += (w * w * (l.tx - l.x) - 2 * w * l.damp * l.vx) * dt;
        l.vy += (w * w * (0 - l.y) - 2 * w * l.damp * l.vy) * dt;
        l.x += l.vx * dt;
        l.y += l.vy * dt;

        // переворот совершается, когда улетающий кадр ушёл за 62 % ширины:
        // дальше он всё равно не виден, а второй уже полностью сверху
        if (flying.current === i && Math.abs(l.x) > W * 0.62) {
          flying.current = null;
          const next = (i + 1) % count;
          topRef.current = next;
          setTop(next);
          L.current[next].x = 0;
          L.current[next].y = 0;
          L.current[next].vx = 0;
          L.current[next].vy = 0;
          L.current[next].tx = 0;
          // улетевший теперь нижний: возвращается из-за края под стопку
          l.tx = 0;
          l.damp = 1;
          l.resp = 0.52;
        }
      }
      paint();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [count, paint]);

  /* ——— ввод: один код на мышь, палец и стилус ——— */
  useEffect(() => {
    const el = ref.current;
    if (!el || still) return;

    const onDown = (e: PointerEvent) => {
      if (e.button !== undefined && e.button !== 0) return;
      const t = topRef.current;
      const l = L.current[t];
      // перехват на лету: отсчёт от текущего экранного положения,
      // скорость не обнуляется — разворот на полпути не даёт «кирпичной стены»
      drag.current = { id: e.pointerId, sx: e.clientX, sy: e.clientY, ox: l.x, oy: l.y };
      flying.current = null;
      el.setPointerCapture(e.pointerId);
      setHeld(true);
    };

    let lastT = 0;
    let lastX = 0;
    let vel = 0;
    const onMove = (e: PointerEvent) => {
      const d = drag.current;
      if (!d || d.id !== e.pointerId) return;
      const l = L.current[topRef.current];
      const H = el.clientHeight || 1;
      l.x = d.ox + (e.clientX - d.sx); // 1:1 по горизонтали
      const rawY = d.oy + (e.clientY - d.sy) * 0.35;
      l.y = Math.abs(rawY) > 60 ? Math.sign(rawY) * (60 + rubber(Math.abs(rawY) - 60, H)) : rawY;
      const now = performance.now();
      if (now > lastT) {
        const inst = ((e.clientX - lastX) / (now - lastT)) * 1000;
        vel = vel * 0.6 + inst * 0.4; // сглаженная скорость пальца, px/s
      }
      lastT = now;
      lastX = e.clientX;
      paint();
    };

    const onUp = (e: PointerEvent) => {
      const d = drag.current;
      if (!d || d.id !== e.pointerId) return;
      drag.current = null;
      setHeld(false);
      const t = topRef.current;
      const l = L.current[t];
      const W = el.clientWidth || 1;
      l.vx = vel;
      l.vy = 0;
      const projected = l.x + project(vel);
      if (Math.abs(projected) > W * THRESH) {
        // бросок: летит туда, куда шёл жест
        const dir = Math.sign(projected || l.x || 1);
        l.tx = dir * W * 1.5;
        l.damp = 0.8;
        l.resp = 0.38;
        flying.current = t;
      } else {
        l.tx = 0;
        l.damp = 1;
        l.resp = 0.4;
      }
      vel = 0;
    };

    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onUp);
    return () => {
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onUp);
    };
  }, [paint, still]);

  /* ——— тот же переворот без жеста: кнопки регистров и клавиатура ——— */
  const bring = useCallback(
    (i: number) => {
      if (i === topRef.current) return;
      if (still) {
        topRef.current = i;
        setTop(i);
        return;
      }
      const el = ref.current;
      const W = el?.clientWidth || 300;
      const t = topRef.current;
      const l = L.current[t];
      l.tx = -W * 1.5; // без жеста направление задаём мы: влево, как листают
      l.damp = 0.8;
      l.resp = 0.38;
      l.vx = -320;
      flying.current = t;
    },
    [still],
  );

  return { top, held, ref, bring, still };
}
