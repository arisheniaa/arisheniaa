import { useMemo, useRef } from 'react';
import { motion, useScroll, useTransform, type MotionValue } from 'motion/react';
import { useLightbox } from '../shared/Lightbox';

/**
 * ВЕЕР ЭКРАНОВ — замена ленты «все экраны · тяните» (второй грилл, вопрос 3).
 *
 * Стопка телефонных скриншотов её сайтов — просто скрины, без рамок
 * айфона (её правка: «веер не хочу телефонами — сделай просто скриншотами»). Пока блок «прилип» к экрану, прокрутка
 * раскрывает стопку веером, как карты в руке: каждый телефон поворачивается
 * вокруг низа и уходит в сторону, крайние — ниже. Наведение приподнимает
 * телефон, нажатие открывает экран крупно (`Lightbox.tsx`).
 *
 * Почему не прежняя лента: она была отдельной WebGL-сценой с шестнадцатью
 * текстурами сразу — самый тяжёлый блок страницы, — а тянуть мышью было
 * неудобно. Здесь только CSS-трансформы девяти картинок.
 */
export function PhoneFan({ shots, label }: { shots: { src: string; alt?: string }[]; label?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  /* Раскрытие занимает середину прохода: в начале стопка, в конце — веер
     держится, чтобы его успели рассмотреть. */
  const p = useTransform(scrollYProgress, [0.08, 0.6], [0, 1], { clamp: true });
  const open = useLightbox();
  const mobile = useMemo(() => window.matchMedia('(max-width: 767px)').matches, []);
  const mid = (shots.length - 1) / 2;
  return (
    <div ref={ref} className="fan" style={{ height: mobile ? '200svh' : '230svh' }}>
      <div className="fan-pin">
        {label && <p className="fan-label">{label}</p>}
        <div className="fan-hand">
          {shots.map((s, i) => (
            <Phone key={s.src} i={i} mid={mid} p={p} mobile={mobile} src={s.src} alt={s.alt} onOpen={(el) => open(shots, i, el)} />
          ))}
        </div>
      </div>
    </div>
  );
}

function Phone({
  i,
  mid,
  p,
  mobile,
  src,
  alt,
  onOpen,
}: {
  i: number;
  mid: number;
  p: MotionValue<number>;
  mobile: boolean;
  src: string;
  alt?: string;
  onOpen: (el: HTMLElement) => void;
}) {
  const d = i - mid;
  /* В стопке телефоны чуть разъехались и повёрнуты — видно, что их много. */
  const rest = { r: d * 1.6, x: d * 3, y: Math.abs(d) * 2 };
  const spread = mobile ? { r: 7, x: 30, y: 7 } : { r: 9, x: 120, y: 9 };
  const rot = useTransform(p, [0, 1], [rest.r, d * spread.r]);
  const x = useTransform(p, [0, 1], [rest.x, d * spread.x]);
  const y = useTransform(p, [0, 1], [rest.y, d * d * spread.y]);
  return (
    /* Два слоя: внешний ведёт прокрутка (веер), внутренний — наведение
       (приподнять). На одном элементе они бы перебивали друг друга. */
    <motion.div className="fan-slot" style={{ rotate: rot, x, y, zIndex: 100 - Math.round(Math.abs(d) * 2) }}>
      <motion.button
        type="button"
        className="fan-phone"
        aria-label="Открыть экран крупно"
        whileHover={{ y: -28 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        onClick={(e) => onOpen(e.currentTarget.querySelector('img') ?? e.currentTarget)}
      >
        <img src={src} alt={alt ?? ''} loading="lazy" decoding="async" draggable={false} />
      </motion.button>
    </motion.div>
  );
}
