/**
 * Типы фичи «Придумать съёмку» (`BRIEF-STORYBOARD.md`). Источник данных —
 * `.design/storyboard-manifest.json` (204 записи, `FACTS.md` Ф30), экспортированный
 * в `public/storyboard/manifest.json` скриптом `scripts/export-storyboard-photos.mjs`.
 *
 * Поля названы кириллицей, как и в исходном манифесте — это не стилевая
 * прихоть: так каждое поле здесь трассируется обратно к строке `FACTS.md` Ф30
 * без перевода имён туда-обратно.
 */

export type FormatBucket = 'индивидуальная' | 'парная' | 'творческая';
export type Material = 'цифра' | 'пленка';
export type PlaceCategory = 'природа' | 'город' | 'студия';

/** Один экспортированный кадр — ровно то, что лежит в `public/storyboard/manifest.json`. */
export interface StoryboardPhoto {
  id: string;
  src: string;
  /** реальные пиксельные размеры экспорта — чтобы `<img width height>` не давал прыжков вёрстки */
  w: number;
  h: number;
  alt: string;
  материал: Material | null;
  /** нормализовано (см. export-storyboard-photos.mjs, normalizeFormat):
   *  «индивидуальная съемка» и «индивидуальная» сведены к одному значению */
  формат: FormatBucket | null;
  /** сырая подпись места из архива, для подписи под кадром (например «город, зима») */
  место: string | null;
  /** огрубление места до трёх вариантов брифа — БОНУС для скоринга, не жёсткий фильтр */
  местоКатегория: PlaceCategory | null;
  /** кросс-тег «образ» — сырые значения, у большинства фото пусто (45/204 в исходнике) */
  образ: string[];
  /** кросс-тег «повод» (было «настроение» в исходном манифесте), уже нормализован
   *  до категории без под-папки материала (export-storyboard-photos.mjs, normalizeOccasion) */
  настроение: string[];
}

/** Ответы брифа. `образ` и `повод` — необязательные оси: `'неважно'`/`'без повода'`
 *  означают «не фильтровать», а не «фото без этого тега». */
export interface BriefAnswers {
  формат: FormatBucket;
  материал: Material | 'любой';
  место: PlaceCategory | 'неважно';
  образ: string;
  повод: string;
}

export const SKIP_LOOK = 'неважно';
export const OCCASION_NONE = 'без повода';
