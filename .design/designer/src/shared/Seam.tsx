import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'motion/react';

/**
 * ВОЛНА НА СТЫКЕ ЭКРАНОВ (второй грилл, вопрос 4: «фон каждого экрана
 * спокойный, а на границе проходит цветная градиентная волна»).
 *
 * Полоса высотой в половину экрана, наполовину заходит на соседние блоки
 * (отрицательные отступы), края растворены маской — поэтому цвет не
 * начинается линией, а перетекает. Внутри — пятна её цветов (оранжевый,
 * лаванда, бирюза) на широком слое, который при прокрутке плывёт вбок:
 * волна «проходит» через стык, пока его листают.
 *
 * Дёшево: один слой, двигается только `transform`. Порядок цветов у каждой
 * волны свой (`tone`), чтобы стыки не повторяли друг друга.
 */
const TONES = {
  warm: ['#ff810a', '#8da0ce', '#73bfc4'],
  cool: ['#73bfc4', '#8da0ce', '#ff810a'],
  dusk: ['#8da0ce', '#ff810a', '#73bfc4'],
} as const;

export function Seam({ tone = 'warm', flip = false }: { tone?: keyof typeof TONES; flip?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const x = useTransform(scrollYProgress, [0, 1], flip ? ['-30%', '0%'] : ['0%', '-30%']);
  const [a, b, c] = TONES[tone];
  return (
    <div ref={ref} className="seam" aria-hidden>
      <motion.div
        className="seam-wave"
        style={{
          x,
          background: `radial-gradient(ellipse 22% 60% at 18% 50%, ${a}, transparent 70%),
            radial-gradient(ellipse 20% 55% at 40% 46%, ${b}, transparent 70%),
            radial-gradient(ellipse 24% 62% at 62% 54%, ${c}, transparent 70%),
            radial-gradient(ellipse 20% 55% at 84% 48%, ${a}, transparent 70%)`,
        }}
      />
    </div>
  );
}
