import { useEffect, useRef, useState } from 'react';

/**
 * arisheniaa → аришения. Механика 1 «послойное растворение» (FACTS.md Ф15).
 *
 * Спецификация владелицы соблюдена числом в число:
 *   340 мс на букву · ступень 28 мс · blur 7px→0 · translateY ∓0.14em
 *   scale .94 / 1.06 · easing ease · ширину держит КИРИЛЛИЦА.
 *
 * Правило П8: оба написания в DOM. Визуальный слой aria-hidden,
 * читаемый текст — один чистый узел «аришения» для поиска и скринридера.
 * Пояснения «читается так-то» на экране нет (Ф12).
 */

const LAT = 'arisheniaa';
const CYR = 'аришения';

type Trigger = 'delay' | 'hover' | 'scroll';

export default function NameMorph({
  className = '',
  trigger = 'delay',
  delay = 1400,
  id,
}: {
  className?: string;
  trigger?: Trigger;
  delay?: number;
  id?: string;
}) {
  const [on, setOn] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    // П7: морфинг не участвует в первом кадре — он отложен.
    if (trigger !== 'delay') return;
    const t = window.setTimeout(() => setOn(true), delay);
    return () => window.clearTimeout(t);
  }, [trigger, delay]);

  useEffect(() => {
    if (trigger !== 'scroll' || !ref.current) return;
    const el = ref.current;
    const io = new IntersectionObserver(
      ([e]) => e.isIntersecting && setOn(true),
      { threshold: 0.6 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [trigger]);

  const letter = (ch: string, i: number, dir: 1 | -1) => (
    <span
      key={i}
      className="inline-block will-change-[transform,opacity,filter]"
      style={{
        transition:
          'opacity var(--t-morph-letter) ease, filter var(--t-morph-letter) ease, transform var(--t-morph-letter) ease',
        transitionDelay: `calc(${i} * var(--t-morph-step))`,
        ...(dir === -1
          ? on
            ? { opacity: 0, filter: 'blur(7px)', transform: 'translateY(-0.14em) scale(0.94)' }
            : { opacity: 1, filter: 'blur(0)', transform: 'none' }
          : on
            ? { opacity: 1, filter: 'blur(0)', transform: 'none' }
            : { opacity: 0, filter: 'blur(7px)', transform: 'translateY(0.14em) scale(1.06)' }),
      }}
    >
      {ch}
    </span>
  );

  return (
    <span
      ref={ref}
      id={id}
      className={`relative inline-block whitespace-nowrap ${className}`}
      onMouseEnter={trigger === 'hover' ? () => setOn(true) : undefined}
      onMouseLeave={trigger === 'hover' ? () => setOn(false) : undefined}
      onClick={() => setOn((v) => !v)}
    >
      {/* Визуальный слой. Ширину держит кириллица — она в потоке,
          латиница лежит поверх абсолютом. Иначе имя дёрнется после перехода. */}
      <span aria-hidden="true" className="relative inline-block">
        <span className="inline-block">{[...CYR].map((c, i) => letter(c, i, 1))}</span>
        <span className="absolute left-0 top-0 inline-block whitespace-nowrap">
          {[...LAT].map((c, i) => letter(c, i, -1))}
        </span>
      </span>
      {/* Читаемый узел: кириллица доступна поиску и скринридеру всегда. */}
      <span className="sr-only">аришения</span>
    </span>
  );
}
