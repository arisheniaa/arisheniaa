import { STAR_PATHS } from '../star-paths';

/**
 * Прогресс брифа — «зажигающиеся звёзды» вместо линии (идея из
 * `RESEARCH-COMPETITORS.md`, названа готовой в `BRIEF-STORYBOARD.md` § 7 как
 * то, что можно взять на усмотрение исполнителя без нового грилла).
 *
 * Силуэт — `tiny8` из `star-paths.ts`, тот же путь, что у фоновой россыпи
 * звёзд и у бокового индикатора разделов главной (`SectionStars.tsx`): один
 * словарь форм на весь сайт, а не отдельная фигура для нового экрана.
 */
export function ProgressStars({ total, lit }: { total: number; lit: number }) {
  return (
    <div
      className="sb-progress"
      role="img"
      aria-label={`Отвечено вопросов: ${Math.min(lit, total)} из ${total}`}
    >
      {Array.from({ length: total }).map((_, i) => (
        <svg
          key={i}
          viewBox="0 0 100 100"
          className="sb-progress-star"
          data-lit={i < lit ? '' : undefined}
          aria-hidden="true"
          focusable="false"
        >
          <path d={STAR_PATHS.tiny8} fill="currentColor" />
        </svg>
      ))}
    </div>
  );
}
