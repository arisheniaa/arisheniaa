import { useRack } from './useRack';

/**
 * Стопка из двух кадров на первом экране. Физика — в useRack.ts.
 *
 * Текст на экране только из COPY.md: подписи под стопкой — это
 * `home:registers.a.label` = «Тихое» и `home:registers.b.label` = «Странное».
 * Ни одной пояснительной строчки вроде «потяните кадр» здесь нет и быть
 * не должно: подсказка — сам выступающий из-под верхнего кадра нижний.
 *
 * alt обоих кадров — заглушки класса ⟦…⟧ (COPY § 0.3: отбор кадров владелицей
 * не сделан, alt описывает конкретные пиксели). Набраны предметным словарём,
 * без «мягкого / нежного / воздушного света» — § 0.14.
 */

const FRAMES = [
  {
    src: '/frames/lake.webp',
    w: 1600,
    h: 2133,
    label: 'Тихое',
    alt: 'Фигура в чёрном пальто на дальнем берегу пруда, охристое небо, лес отражается в воде',
  },
  {
    src: '/frames/blur.webp',
    w: 1400,
    h: 1866,
    label: 'Странное',
    alt: 'Чёрно-белый кадр: фигура уходит от объектива, смаз оставлен, зерно заметно',
  },
];

export function Rack() {
  const rack = useRack(FRAMES.length);

  if (rack.still) {
    // prefers-reduced-motion: жеста нет, но контента не теряется — оба кадра
    // лежат один под другим в полную ширину колонки и оба подписаны.
    // Не рядом в две колонки: на 390 px это дало бы два кадра по 100 px,
    // то есть контент формально сохранён, а фотография потеряна.
    return (
      <div className="ml-auto flex w-[clamp(12rem,56vw,20rem)] flex-col gap-[clamp(1.5rem,4vw,2.5rem)] lg:w-[clamp(13rem,19vw,17.5rem)]">
        {FRAMES.map((f) => (
          <figure key={f.src} className="m-0">
            <img src={f.src} width={f.w} height={f.h} alt={f.alt} className="frame block w-full" />
            <figcaption className="t-meta mt-3 text-[color:var(--color-ink-mute)]">
              {f.label}
            </figcaption>
          </figure>
        ))}
      </div>
    );
  }

  return (
    <div className="ml-auto w-[clamp(12rem,56vw,20rem)] select-none lg:w-[clamp(13rem,19vw,17.5rem)]">
      <div
        ref={rack.ref}
        className="rack-stack relative aspect-3/4 w-full touch-pan-y"
        style={{ cursor: rack.held ? 'grabbing' : 'grab' }}
      >
        {FRAMES.map((f, i) => (
          <div
            key={f.src}
            data-layer={i}
            className="absolute inset-0 will-change-transform"
            aria-hidden={i !== rack.top}
          >
            <img
              src={f.src}
              width={f.w}
              height={f.h}
              alt={i === rack.top ? f.alt : ''}
              className="frame block h-full w-full object-cover"
              loading="eager"
              decoding="async"
              draggable={false}
            />
          </div>
        ))}
      </div>

      {/* Подписи — они же управление без жеста: клавиатура и вспомогательные
          технологии получают ту же механику, что палец. */}
      <div className="mt-[clamp(0.9rem,1.6vw,1.4rem)] flex items-baseline gap-[1.6rem]">
        {FRAMES.map((f, i) => (
          <button
            key={f.label}
            type="button"
            onClick={() => rack.bring(i)}
            aria-pressed={i === rack.top}
            className={`t-meta bg-transparent p-0 ${
              i === rack.top
                ? 'text-[color:var(--color-ink)]'
                : 'cursor-pointer text-[color:var(--color-ink-mute)]'
            }`}
            style={{ border: 0 }}
          >
            {f.label}
          </button>
        ))}
      </div>
    </div>
  );
}
