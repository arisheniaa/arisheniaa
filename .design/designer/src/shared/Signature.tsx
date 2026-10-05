import { useEffect, useId, useRef } from 'react';
import { GLYPHS } from './signature-glyphs';

/**
 * ПОДПИСЬ «Arisheniaa» — эффект из соседней сессии (фото/signature-arisheniaa.html),
 * перенесён один в один: три слоя на букву.
 *   1) толстый белый штрих в маске постепенно открывает залитую букву;
 *   2) тонкий контур бежит впереди — перо;
 *   3) сама залитая буква, видна только сквозь маску.
 * Цвет — `currentColor`, поэтому подпись берёт цвет у родителя.
 *
 * `play` — запуск извне (ноутбук открылся). Повторный `true` после `false`
 * перезапускает прорисовку. При `prefers-reduced-motion` подпись сразу целая.
 */
export function Signature({
  play = true,
  className = '',
  duration = 1.5,
  stagger = 0.2,
  delay = 0.2,
  pen = true,
}: {
  play?: boolean;
  className?: string;
  duration?: number;
  stagger?: number;
  delay?: number;
  pen?: boolean;
}) {
  const id = useId().replace(/:/g, '');
  const svg = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const el = svg.current;
    if (!el) return;
    el.classList.remove('sig-play');
    if (play) {
      void el.getBoundingClientRect();
      el.classList.add('sig-play');
    }
  }, [play]);

  return (
    <svg
      ref={svg}
      viewBox="-20 -200 1305 330"
      fill="none"
      role="img"
      aria-label="Arisheniaa"
      className={`sig ${className}`}
      style={
        {
          '--sig-dur': `${duration}s`,
          '--sig-stagger': `${stagger}s`,
          '--sig-delay': `${delay}s`,
        } as React.CSSProperties
      }
    >
      <defs>
        <mask id={`m${id}`} maskUnits="userSpaceOnUse" x="-20" y="-200" width="1305" height="330">
          {GLYPHS.map((d, i) => (
            <path
              key={i}
              d={d}
              className="sig-draw"
              pathLength={1}
              stroke="white"
              strokeWidth={22}
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ '--i': i } as React.CSSProperties}
            />
          ))}
        </mask>
      </defs>
      {pen && (
        <g>
          {GLYPHS.map((d, i) => (
            <path
              key={i}
              d={d}
              className="sig-draw"
              pathLength={1}
              stroke="currentColor"
              strokeWidth={2}
              strokeLinejoin="round"
              style={{ '--i': i } as React.CSSProperties}
            />
          ))}
        </g>
      )}
      <g mask={`url(#m${id})`}>
        {GLYPHS.map((d, i) => (
          <path key={i} d={d} fill="currentColor" />
        ))}
      </g>
    </svg>
  );
}
