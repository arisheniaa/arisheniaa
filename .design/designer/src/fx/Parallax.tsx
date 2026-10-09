import { memo, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useLightbox, type Cap } from '../shared/Lightbox';
import { motion, useMotionValue, useScroll, useSpring, useTransform, type MotionValue } from 'motion/react';

/**
 * PARALLAX HERO IMAGES (aceternity) под работы.
 *
 * Оригинал — до 8 картинок вокруг заголовка, ведёт мышь. Что добавлено:
 *   · два вида кадров: ноутбучный (16:10) и телефонный (9:16) — на одном
 *     экране рядом читаются как «сайт работает везде»;
 *   · ТЕЛЕФОН (мыши нет, вопрос 10). Всегда: кадры расходятся по глубине при
 *     скролле. В полном режиме (`tilt`) — ещё и от наклона телефона; iOS
 *     спрашивает разрешение, поэтому там появляется кнопка «включить наклон»;
 *   · появление не при загрузке, а когда блок въехал в экран — иначе на
 *     длинной странице анимация отыгрывала бы за кадром;
 *   · дети в центре — заголовок работы, текст, ссылка.
 *
 * ПРАВКИ ПОСЛЕ ВЫБОРА ВАРИАНТА A (её слова: «скрины вразброс, чтобы не было
 * пустых окон… и справа и слева скрины с ноутбука и с телефона»; «при
 * нажатии на скрины открывались они глубже, чётче, перед названием»):
 *   · раскладка — по слотам с заданным видом кадра: с каждой стороны и
 *     ноутбучные, и телефонные. Работа только с телефонными кадрами
 *     (приглашение) получает свою раскладку из шести телефонов;
 *   · на телефоне кадры уходят в полосы над и под карточкой, а не за неё;
 *   · нажатие на кадр открывает его крупно (`Lightbox.tsx`);
 *   · без размытия дальних кадров и без размытия при появлении — оба
 *     фильтра пересчитывались на каждом кадре прокрутки (облегчение).
 */
/** `cap` — подпись в просмотре крупно (чей сайт и ссылка); `ph` — вместо
 *  скрина пустая рамка-заглушка с этой надписью (работы ещё готовятся);
 *  `before` — прежний вид экрана для переключателя «До / После». */
export type PItem = { src: string; kind: 'wide' | 'phone'; alt?: string; cap?: Cap; ph?: string; before?: string };

/** `c: true` — `top`/`left` задают ЦЕНТР кадра, а не его угол (раскладка
 *  по овалу вокруг карточки во вкладке услуг). */
export type Pos = { top: string; left?: string; right?: string; k: 'wide' | 'phone'; c?: boolean };
export const W = 'wide' as const;
export const P = 'phone' as const;
/* Слоты в процентах блока. Центр (≈38–62% по ширине) — под карточкой.
   Кучно вокруг неё (её правка: «сделай скриншоты кучнее к центру»): кадры
   держатся в полосе 12–88% ширины, а не у самых краёв окна. */
const DESK_MIX: Pos[] = [
  { k: W, top: '7%', left: '13%' },
  { k: P, top: '5%', right: '22%' },
  { k: P, top: '31%', left: '28%' },
  { k: W, top: '30%', right: '12%' },
  { k: P, top: '41%', left: '14%' },
  { k: W, top: '67%', right: '21%' },
  { k: W, top: '69%', left: '15%' },
  { k: P, top: '58%', right: '12%' },
];
const DESK_PHONES: Pos[] = [
  { k: P, top: '3%', left: '25%' },
  { k: P, top: '38%', left: '12%' },
  { k: P, top: '55%', left: '27%' },
  { k: P, top: '5%', right: '24%' },
  { k: P, top: '34%', right: '11%' },
  { k: P, top: '57%', right: '27%' },
];
const MOB_MIX: Pos[] = [
  { k: W, top: '3%', left: '3%' },
  { k: P, top: '2%', right: '5%' },
  { k: P, top: '74%', left: '5%' },
  { k: W, top: '79%', right: '3%' },
  { k: W, top: '14%', left: '30%' },
  { k: P, top: '70%', right: '36%' },
];
export const MOB_PHONES: Pos[] = [
  { k: P, top: '3%', left: '4%' },
  { k: P, top: '6%', left: '38%' },
  { k: P, top: '2%', right: '4%' },
  { k: P, top: '72%', left: '5%' },
  { k: P, top: '75%', left: '39%' },
  { k: P, top: '71%', right: '5%' },
];

/** Раскладывает кадры по слотам: ноутбучные — в ноутбучные, телефонные — в телефонные. */
function place(items: PItem[], mobile: boolean, own?: { desk: Pos[]; mob: Pos[] }) {
  const phonesOnly = items.every((i) => i.kind === 'phone');
  const slots = own ? (mobile ? own.mob : own.desk) : mobile ? (phonesOnly ? MOB_PHONES : MOB_MIX) : phonesOnly ? DESK_PHONES : DESK_MIX;
  const wides = items.filter((i) => i.kind === 'wide');
  const phones = items.filter((i) => i.kind === 'phone');
  const out: { item: PItem; pos: Pos; index: number }[] = [];
  for (const pos of slots) {
    const item = (pos.k === W ? wides : phones).shift();
    if (item) out.push({ item, pos, index: items.indexOf(item) });
  }
  return out;
}

/* Глубина по номеру слота; раскладкам больше восьми кадров (услуги) —
   ещё шесть значений (айдентика на компьютере — четырнадцать кадров). */
const DEPTH = {
  default: [0.3, 0.35, 0.9, 0.85, 0.4, 0.45, 0.25, 0.2, 0.6, 0.55, 0.7, 0.5, 0.65, 0.4],
  'edge-focus': [0.85, 0.9, 0.3, 0.35, 0.8, 0.85, 0.4, 0.45, 0.6, 0.55, 0.7, 0.5, 0.65, 0.4],
};
const SPRING = { damping: 25, stiffness: 120 };

const coarse = () => window.matchMedia('(pointer: coarse)').matches;

/* НАКЛОН — ОДИН НА СТРАНИЦУ. Разрешение спрашивается один раз (iOS требует
   нажатия), а все параллаксы подписаны на общий источник: иначе кнопка
   «включить наклон» висела бы в каждой работе. */
type Tilt = { x: number; y: number };
const tiltSubs = new Set<(t: Tilt) => void>();
let tiltOn = false;
const tiltListeners = new Set<() => void>();
function startTilt() {
  if (tiltOn) return;
  tiltOn = true;
  window.addEventListener('deviceorientation', (e) => {
    const x = Math.max(-30, Math.min(30, e.gamma ?? 0)) / 30;
    const y = Math.max(-30, Math.min(30, (e.beta ?? 45) - 45)) / 30;
    tiltSubs.forEach((f) => f({ x, y }));
  });
  tiltListeners.forEach((f) => f());
}
const needsPermission = () =>
  typeof (window.DeviceOrientationEvent as unknown as { requestPermission?: unknown })?.requestPermission === 'function';
async function askTilt() {
  try {
    const r = await (window.DeviceOrientationEvent as unknown as { requestPermission: () => Promise<string> }).requestPermission();
    if (r === 'granted') startTilt();
  } catch {
    /* отказ — остаётся параллакс от скролла */
  }
}

export function Parallax({
  items,
  children,
  variant = 'default',
  tilt = false,
  className = '',
  frameClass = '',
  maxOffset = 40,
  tiltButton = true,
  slots,
  drift = true,
}: {
  items: PItem[];
  children?: ReactNode;
  variant?: keyof typeof DEPTH;
  tilt?: boolean;
  className?: string;
  frameClass?: string;
  maxOffset?: number;
  /** Показывать ли кнопку «включить наклон» (на странице она нужна одна). */
  tiltButton?: boolean;
  /** Своя раскладка слотов вместо стандартной (вкладка услуг). */
  slots?: { desk: Pos[]; mob: Pos[] };
  /** Сдвиг кадров от прокрутки страницы. Выключается в неподвижном слое
   *  (раскрытая услуга): там блок не едет по экрану, а прогресс прокрутки
   *  считался бы от места страницы под слоем — и все кадры уезжали вверх. */
  drift?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, SPRING);
  const sy = useSpring(my, SPRING);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const [needPermission, setNeedPermission] = useState(false);
  const isTouch = useMemo(coarse, []);
  const mobile = useMemo(() => window.matchMedia('(max-width: 767px)').matches, []);
  const placed = useMemo(() => place(items, mobile, slots), [items, mobile, slots]);
  /* Только телефонные кадры — их меньше, поэтому они крупнее. */
  const big = useMemo(() => items.every((i) => i.kind === 'phone'), [items]);
  const open = useLightbox();
  /* Листать в просмотре крупно — только настоящие скрины, без заглушек. */
  const real = useMemo(() => items.filter((i) => !i.ph), [items]);
  const shots = useMemo(() => real.map((i) => ({ src: i.src, alt: i.alt, cap: i.cap, before: i.before })), [real]);

  useEffect(() => {
    if (isTouch) return;
    const on = (e: MouseEvent) => {
      mx.set((e.clientX / window.innerWidth) * 2 - 1);
      my.set((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener('mousemove', on);
    return () => window.removeEventListener('mousemove', on);
  }, [isTouch, mx, my]);

  /* Наклон телефона: gamma — влево-вправо, beta — к себе. Нейтраль beta
     ~45° — так телефон держат в руке, а не кладут на стол. */
  useEffect(() => {
    if (!tilt || !isTouch) return;
    const sub = (t: Tilt) => {
      mx.set(t.x);
      my.set(t.y);
    };
    tiltSubs.add(sub);
    const sync = () => setNeedPermission(!tiltOn && needsPermission());
    tiltListeners.add(sync);
    if (needsPermission()) sync();
    else startTilt();
    return () => {
      tiltSubs.delete(sub);
      tiltListeners.delete(sync);
    };
  }, [tilt, isTouch, mx, my]);

  const depth = DEPTH[variant];
  return (
    <div ref={ref} className={`relative overflow-hidden ${className}`}>
      {placed.map(({ item: it, pos }, i) => (
        <Frame
          key={it.src + i}
          item={it}
          pos={pos}
          onOpen={(el) => open(shots, real.indexOf(it), el)}
          depth={depth[i]}
          delay={i * 0.1}
          sx={sx}
          sy={sy}
          scroll={scrollYProgress}
          maxOffset={maxOffset}
          scrollDrift={drift ? (isTouch ? 160 : 90) : 0}
          frameClass={big ? `${frameClass} is-big` : frameClass}
        />
      ))}
      {/* Слой с карточкой растянут на весь блок ради центровки — поэтому сам
          он клики пропускает к скринам под ним, а ловит их только карточка. */}
      <div className="pointer-events-none relative z-[20] flex h-full w-full items-center justify-center [&>*]:pointer-events-auto">{children}</div>
      {needPermission && tiltButton && (
        <button type="button" className="tilt-btn" onClick={askTilt}>
          включить наклон
        </button>
      )}
    </div>
  );
}

const Frame = memo(function Frame({
  item,
  pos,
  depth,
  delay,
  sx,
  sy,
  scroll,
  maxOffset,
  scrollDrift,
  frameClass,
  onOpen,
}: {
  onOpen: (el: HTMLElement) => void;
  item: PItem;
  pos: Pos;
  depth: number;
  delay: number;
  sx: MotionValue<number>;
  sy: MotionValue<number>;
  scroll: MotionValue<number>;
  maxOffset: number;
  scrollDrift: number;
  frameClass: string;
}) {
  const x = useTransform(sx, [-1, 1], [-maxOffset * depth, maxOffset * depth]);
  const yMouse = useTransform(sy, [-1, 1], [-maxOffset * depth, maxOffset * depth]);
  /* Скролл: ближние кадры (depth больше) обгоняют дальние. */
  const yScroll = useTransform(scroll, [0, 1], [scrollDrift * depth, -scrollDrift * depth]);
  const y = useTransform([yMouse, yScroll] as const, ([a, b]: number[]) => a + b);
  const wide = item.kind === 'wide';
  if (item.ph)
    return (
      <motion.div
        className={`p-btn absolute ${pos.c ? 'is-c' : ''}`}
        style={{ top: pos.top, left: pos.left, right: pos.right, x, y, zIndex: Math.round(depth * 10) }}
        initial={{ opacity: 0, scale: 0.9 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.8, delay, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <span className={`p-frame p-ph ${wide ? 'p-wide' : 'p-phone'} ${frameClass}`}>{item.ph}</span>
      </motion.div>
    );
  return (
    <motion.button
      type="button"
      aria-label="Открыть скрин крупно"
      className={`p-btn absolute ${pos.c ? 'is-c' : ''}`}
      onClick={(e) => onOpen(e.currentTarget.querySelector('img') ?? e.currentTarget)}
      style={{ top: pos.top, left: pos.left, right: pos.right, x, y, zIndex: Math.round(depth * 10) }}
      initial={{ opacity: 0, scale: 0.9 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.8, delay, ease: [0.25, 0.1, 0.25, 1] }}
    >
      <img
        src={item.src}
        alt={item.alt ?? ''}
        loading="lazy"
        decoding="async"
        draggable={false}
        className={`p-frame ${wide ? 'p-wide' : 'p-phone'} ${frameClass}`}
      />
    </motion.button>
  );
});
