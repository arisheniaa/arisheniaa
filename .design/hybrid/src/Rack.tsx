import { useRef, useState } from 'react';
import { useRack } from './useRack';
import { STAR_PATHS } from './star-paths';

/**
 * РЭК — механика удержания внимания первого экрана (П13). Физика — `useRack.ts`,
 * перенесена из направления B без изменения чисел (лок: «Параметры — как в
 * `directions/b/src/useRack.ts`»).
 *
 * Что расширено по локу (Ф19): пул кадров. В B их было два, здесь восемь, и они
 * НЕ из одной серии — источник `Рабочий стол\портфолио`, отбор сделан глазами
 * по контактному листу (`scripts/contact-sheet.mjs`, лист в `shots/contact-*.png`).
 * Восемь выбраны так, чтобы стопка не читалась как одна съёмка: зима и вода,
 * цвет и чёрно-белое, студийный красный и утренний туман.
 *
 * Подписей у кадров НЕТ, и это находка, а не забывчивость. В `COPY.md` ред. 6
 * § 1.3 две половины блока «Как получается кино» описаны как то, что «держит
 * две карточки рэка», — то есть текст рассчитан на стопку из двух. Восемь
 * подписей в COPY не существует, а придумывать экранный текст билдеру нельзя.
 * Конфликт вынесен в хендоф. Пока: кадры без подписей, положение в стопке
 * показывает счётчик цифрами.
 *
 * alt — по правилу COPY § 0.3 это зоны-заглушки: отбор кадров руками владелицы
 * не сделан. Написаны по фактическим пикселям, предметным словарём, без
 * «мягкого / нежного / воздушного света» (§ 0.14).
 *
 * КУРСОР-МЕТКА «ТЯНИ» (Ф29 п.2, FACTS.md — синтез `RESEARCH-COMPETITORS.md`
 * § 6, «курсор превращается в текстовую метку с действием... маленькая
 * метка-звезда с текстом «тяни» (без иконки-стрелки)»; НЕ лок). Раньше здесь
 * стоял инлайн-стиль `cursor: rack.held ? 'grabbing' : 'grab'` — заменён на
 * кастомную метку, которая следует за курсором: тот же силуэт `tiny8`, что у
 * фоновой россыпи звёзд (`star-paths.ts`), плюс слово «тяни» строчными — тот
 * же регистр, что у «нажми» / «нажми на меня» (`COPY.md` § 0.18). Слово
 * «тяни» дано дословно в задании на редакцию 3, а не сочинено билдером; само
 * ЯВЛЕНИЕ метки (не текст COPY) — новый служебный узел интерфейса, тот же
 * класс решения, что подпись «Разделы» у мобильного переключателя навигации
 * (`App.tsx`): в `COPY.md` такой зоны нет, записано в хендоф как долг
 * копирайтера, а не молча придумано под видом боевого текста.
 *
 * Системный курсор не переопределяется вовсе (никакого `cursor: none`):
 * требование — «не системный курсор» для СМЫСЛА «тяни», а не запрет на
 * обычную стрелку. Метка — второй, самостоятельный слой поверх обычного
 * курсора, а не его подмена.
 *
 * Видима только при наведении МЫШЬЮ (`pointerType === 'mouse'`) на верхний
 * кадр и гаснет при взятии (`rack.held`) или уводе курсора — «тянуть» нечего
 * объяснять, когда рэк уже держат. Позиция обновляется прямой записью в DOM
 * через ref, без React-состояния на каждое движение курсора: тот же приём
 * производительности, что у `useRack.ts` и `Stars.tsx` — состояние в React
 * только для видимости (низкая частота), координаты — в инлайн-стиль.
 */

export const RACK_FRAMES = [
  {
    src: '/frames/pole.webp',
    alt: 'Фигура идёт по высокой траве утреннего поля, солнце за спиной, дальний край поля растворён в дымке',
  },
  {
    src: '/frames/mandarin.webp',
    alt: 'Зимний двор в снегопаде: мандарины подброшены в воздух, на голове ушанка и платок',
  },
  {
    src: '/frames/doroga.webp',
    alt: 'Фигура в длинном пальто стоит на мокрой дороге, по обе стороны осенние деревья',
  },
  {
    src: '/frames/kontra.webp',
    alt: 'Двое против сильного контрового света, воздух в дыму, лиц не видно — только силуэты',
  },
  {
    src: '/frames/krasnoe.webp',
    alt: 'Красный фон, чёрная перчатка и мундштук, взгляд уходит в сторону от объектива',
  },
  {
    src: '/frames/voda.webp',
    alt: 'Человек лежит в мелкой прозрачной воде поверх камней, руки заведены за голову',
  },
  {
    src: '/frames/perevernutyi.webp',
    alt: 'Кадр перевёрнут: рыжие волосы падают вниз, синее платье, за спиной тёмный лес',
  },
  {
    src: '/frames/chb.webp',
    alt: 'Чёрно-белый крупный кадр: прядь волос через лицо, улыбка, зерно заметно',
  },
];

const W = 1200;
const H = 1600;

export function Rack() {
  const rack = useRack(RACK_FRAMES.length);
  const hintRef = useRef<HTMLSpanElement>(null);
  const [hovering, setHovering] = useState(false);

  const moveHint = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse') return;
    setHovering(true);
    const el = hintRef.current;
    if (!el) return;
    const b = e.currentTarget.getBoundingClientRect();
    el.style.transform = `translate(${(e.clientX - b.left + 16).toFixed(1)}px, ${(
      e.clientY - b.top + 14
    ).toFixed(1)}px)`;
  };

  if (rack.still) {
    /* prefers-reduced-motion: жеста нет, но ни один кадр не потерян — вся
       стопка разворачивается в сетку. Не одна колонка: восемь кадров в
       колонку — это экран прокрутки вместо первого экрана. */
    return (
      <div className="grid grid-cols-2 gap-[clamp(0.6rem,2vw,1.1rem)]">
        {RACK_FRAMES.map((f) => (
          <img
            key={f.src}
            src={f.src}
            width={W}
            height={H}
            alt={f.alt}
            className="frame block w-full"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="rack ml-auto w-[clamp(13rem,62vw,21rem)] select-none lg:w-[clamp(14rem,21vw,19rem)]">
      <div
        ref={rack.ref}
        role="group"
        tabIndex={0}
        aria-label={`Стопка из ${RACK_FRAMES.length} кадров. Стрелка вправо — следующий`}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') {
            e.preventDefault();
            rack.advance();
          }
        }}
        className="rack-stack relative aspect-3/4 w-full touch-pan-y"
        onPointerMove={moveHint}
        onPointerEnter={moveHint}
        onPointerLeave={() => setHovering(false)}
      >
        {RACK_FRAMES.map((f, i) => (
          <div
            key={f.src}
            data-layer={i}
            className="absolute inset-0 will-change-transform"
            aria-hidden={i !== rack.top}
          >
            <img
              src={f.src}
              width={W}
              height={H}
              alt={i === rack.top ? f.alt : ''}
              className="frame block h-full w-full object-cover"
              loading={i < 3 ? 'eager' : 'lazy'}
              decoding="async"
              draggable={false}
            />
          </div>
        ))}

        {/* Метка-звезда «тяни» — см. блок-комментарий выше файла. */}
        <span
          ref={hintRef}
          aria-hidden="true"
          className="rack-hint"
          data-show={hovering && !rack.held ? '' : undefined}
        >
          <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">
            <path d={STAR_PATHS.tiny8} fill="currentColor" />
          </svg>
          тяни
        </span>
      </div>

      {/* Счётчик и кнопка. Цифры, а не подписи: восьми подписей в COPY нет.
          Кнопка даёт клавиатуре и вспомогательным технологиям ровно ту же
          механику, что палец, — переворот на следующий кадр. */}
      <div className="mt-[clamp(0.8rem,1.6vw,1.3rem)] flex items-center justify-between">
        <p className="t-mono text-[color:var(--ink-mute)]">
          {String(rack.top + 1).padStart(2, '0')}
          <span className="opacity-45"> / {String(RACK_FRAMES.length).padStart(2, '0')}</span>
        </p>
        <button
          type="button"
          onClick={rack.advance}
          aria-label="Следующий кадр"
          className="rack-next"
        >
          <svg viewBox="0 0 24 12" width="26" height="13" aria-hidden="true" focusable="false">
            <path
              d="M0 6h21M16 1l5 5-5 5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="square"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
