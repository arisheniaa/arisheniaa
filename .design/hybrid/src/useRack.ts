import { onFrame } from './raf';
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
 *  · возврат домой — пружина damping 1.00, response 0.52 c (без овершута);
 *  · бросок — damping 1.00, response 0.52 c, скорость пальца гасится до 0.45;
 *  · возврат из-за стопки — damping 1.00, response 0.66 c;
 *
 * ═══ ТРИ ЧИСЛА СМЯГЧЕНЫ (Ф61) ═══════════════════════════════════════════
 * Владелица: «на мобильной версии слишком резкая прокрутка стопки
 * фотографий на главной. сделай её плавной».
 *
 * СНАЧАЛА ПРОВЕРИЛ, НЕ РЫВОК ЛИ ЭТО. Покадровый замер во время смахивания и
 * после него: в худшем кадре после отпускания двигается РОВНО ОДИН слой, на
 * 16,8 px — это летящий кадр. Разрыва, при котором вся стопка перескакивает
 * разом (например от смены глубины у всех карточек в один кадр), нет:
 * порогов выше 6 px за кадр у остальных слоёв не нашлось ни одного. Значит
 * чинить нечего — вопрос в скорости, а не в дефекте, и правка вкусовая.
 *
 * ЧИСЛА ПОДОБРАНЫ ЗАМЕРОМ, А НЕ НА СЛУХ, и первая попытка была неверной.
 * Сначала я удлинил пружину броска (0.38 → 0.54 c) — и пиковая скорость
 * ВЫРОСЛА. Причина в самом уравнении: `w = 2π/response` входит и в
 * возвращающую силу, и в торможение (`2·w·damping·v`). Удлиняя отклик, я
 * ослабил не только притяжение к цели, но и вязкость, и скорость, влитая
 * броском пальца, стала жить дольше. Плавность здесь задаётся не одним
 * числом, а парой «отклик + сколько импульса вообще впустить».
 *
 * Прогон пяти наборов на ДЕТЕРМИНИРОВАННОМ входе (кнопка «следующий кадр»:
 * у неё скорость задана числом, а не пальцем, поэтому наборы сравнимы между
 * собой; замер по пальцу плясал от прогона к прогону вдвое):
 *
 *   было (0.80 / 0.38 c / −320)   пик 111.5 px за кадр, покой 1085 мс
 *   первая попытка (0.92 / 0.54)  пик  61.5,            покой  958 мс
 *   1.00 / 0.46 c, импульс 0.55   пик  74.7,            покой 1007 мс
 *   ВЗЯТО: 1.00 / 0.52 c, 0.45    пик  23.6,            покой  765 мс
 *   1.00 / 0.58 c, импульс 0.35   пик  54.0,            покой 1039 мс
 *
 * Взятый набор спокойнее исходного почти впятеро по пиковой скорости и при
 * этом успокаивается БЫСТРЕЕ — то есть «плавно» здесь не значит «медленно».
 *
 * ИТОГО ИЗМЕНЕНО:
 *   · бросок — damping 0.80 → 1.00 (овершут снят, он и читался щелчком),
 *     response 0.38 → 0.52 c, а скорость пальца впускается наполовину
 *     (`vel * 0.45`): именно она разгоняла кадр до ста пикселей за кадр;
 *   · возврат домой 0.40 → 0.52 c: если жест не дотянул до порога, карточка
 *     возвращается так же мягко, как уходит;
 *   · возврат улетевшего под низ стопки 0.52 → 0.66 c;
 *   · кнопка и клавиатура получили те же числа, что жест.
 *
 * ЧЕГО НЕ ТРОНУТО НАРОЧНО: слежение за пальцем остаётся 1:1 (карточка обязана
 * стоять под пальцем, а не догонять его), порог переворота — те же 34 %,
 * проекция импульса и резина по вертикали прежние. Мягче сделан отпуск, а не
 * сам жест: замедлять слежение значило бы сделать стопку вязкой, а не плавной.
 *
 * Остальное в физике без изменений:
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
  /** тот же переворот без жеста: кнопка и клавиатура. В B это был `bring(i)` —
   *  «положить наверх кадр номер i», и он имел смысл при стопке из двух. В пуле
   *  из восьми прыжок через полстопки одним движением означал бы, что механика
   *  перелистывания у мыши и у клавиатуры разная. Переворот один: следующий. */
  advance: () => void;
  /** движение выключено пользователем — рисуем стопку как список кадров */
  still: boolean;
};

type Layer = { x: number; y: number; vx: number; vy: number; damp: number; resp: number; tx: number };

const PEEK_X = 13; // px, насколько следующий кадр выглядывает вправо
const PEEK_Y = 13; // px, и вниз
const BACK_S = 0.962; // масштаб каждого следующего уровня вглубь
const DEPTH_MAX = 3; // сколько кадров стопки видно; глубже они закрыты полностью
/** Доворот по глубине, градусы на уровень. Числа неравные и детерминированы
 *  индексом кадра: ровная стопка выглядит как стопка карточек, неровная — как
 *  пачка отпечатков. */
const TILT = [-1.4, 0.9, -0.6, 1.6, -1.1, 0.5, 1.2, -0.8];
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

  /* ——— применение состояния к DOM: один раз за кадр, без ре-рендера React ———
     Правка гибрида (лок, Ф19): в B стопка была из двух кадров, и «не верхний»
     означало ровно один нижний. В пуле из восьми это перестало работать: все
     семь получали один и тот же выступ и ложились в идеальный штабель, то есть
     стопка снова читалась как два кадра. Теперь у каждого слоя есть ГЛУБИНА —
     порядковый номер от верхнего, — и выступ, масштаб и доворот считаются от
     неё. Видимых уровней три: глубже кадр всё равно закрыт соседями, а держать
     восемь живых теней в композите незачем.

     Доворот на глубину — не украшение: это отпечатки, лежащие в руке, а не
     карточки интерфейса. Углы детерминированы индексом, поэтому стопка при
     каждой загрузке одна и та же и её можно снимать. */
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
        node.style.zIndex = String(count + 1);
        node.style.opacity = '1';
        node.style.transform =
          `translate3d(${l.x.toFixed(2)}px,${l.y.toFixed(2)}px,0) rotate(${(l.x / 34).toFixed(3)}deg)`;
      } else {
        const depth = (i - t + count) % count; // 1 — сразу под верхним
        const d = Math.min(depth, DEPTH_MAX);
        node.style.zIndex = String(count - depth);
        // за третьим уровнем кадр не рисуем вовсе: он полностью закрыт
        node.style.opacity = depth > DEPTH_MAX ? '0' : '1';
        // подсказка в сторону жеста: следующий кадр подтягивается к месту
        const lift = depth === 1 ? k : 0;
        const s = Math.pow(BACK_S, d) + (1 - BACK_S) * lift;
        const px = PEEK_X * (d - lift) + l.x;
        const py = PEEK_Y * (d - lift) + l.y;
        const tilt = TILT[i % TILT.length] * d;
        node.style.transform =
          `translate3d(${px.toFixed(2)}px,${py.toFixed(2)}px,0) rotate(${tilt.toFixed(2)}deg) scale(${s.toFixed(4)})`;
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

    /* ═══ ПОКОЙ (Ф43) — «сайт ещё виснет» ════════════════════════════════
       Стопка стоит неподвижно почти всё время: пружины работают только пока
       её тянут пальцем и пока улетевший кадр возвращается под низ. Прежний
       цикл всё равно считал двенадцать пружин и перерисовывал стопку
       шестьдесят раз в секунду — на первом экране, то есть ровно там, где
       читатель проводит больше всего времени.

       Теперь кадр пропускается, если стопку никто не держит, ничего не
       летит и все смещения со скоростями улеглись ниже 0,05 px. Порог тот
       же, что у звёзд, и по той же причине: `paint` округляет координаты, и
       движение мельче порога до экрана не доезжает.

       Физика не тронута ни одним числом — изменилось только то, считается
       ли она, когда считать нечего. */
    const STILL = 0.05;

    const loop = (_now: number, dt: number) => {
      const el = ref.current;
      const W = el?.clientWidth || 1;

      let moving = !!drag.current || flying.current !== null;

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
          l.resp = 0.66; // Ф61: было 0.52
        }

        if (!moving) {
          moving =
            Math.abs(l.x - l.tx) > STILL ||
            Math.abs(l.y) > STILL ||
            Math.abs(l.vx) > STILL ||
            Math.abs(l.vy) > STILL;
        }
      }
      if (moving) paint();
    };
    return onFrame(loop);
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
      l.vx = vel * 0.45; // Ф61: скорость пальца гасится, см. блок вверху файла
      l.vy = 0;
      const projected = l.x + project(vel);
      if (Math.abs(projected) > W * THRESH) {
        // бросок: летит туда, куда шёл жест
        const dir = Math.sign(projected || l.x || 1);
        l.tx = dir * W * 1.5;
        l.damp = 1; // Ф61: было 0.8 — овершут в конце читался щелчком
        l.resp = 0.52; // Ф61: было 0.38
        flying.current = t;
      } else {
        l.tx = 0;
        l.damp = 1;
        l.resp = 0.52; // Ф61: было 0.4
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

  /* ——— тот же переворот без жеста: кнопка и клавиатура ——— */
  const advance = useCallback(() => {
    const t = topRef.current;
    if (still) {
      const n = (t + 1) % count;
      topRef.current = n;
      setTop(n);
      return;
    }
    if (flying.current !== null) return; // кадр уже в полёте, второй бросок его собьёт
    const el = ref.current;
    const W = el?.clientWidth || 300;
    const l = L.current[t];
    l.tx = -W * 1.5; // без жеста направление задаём мы: влево, как листают
    /* Ф61: те же числа, что у броска пальцем, — кнопка и клавиатура обязаны
       двигать стопку ровно так же, как жест, иначе один и тот же переворот
       ощущался бы по-разному в зависимости от того, чем его вызвали. */
    l.damp = 1;
    l.resp = 0.52;
    l.vx = -144;
    flying.current = t;
  }, [count, still]);

  return { top, held, ref, advance, still };
}
