import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

/**
 * EXIF-ПОДПИСЬ НА ПЛЁНОЧНОМ КАДРЕ (Ф29 п.5, FACTS.md — синтез
 * `RESEARCH-COMPETITORS.md` § 1, «EXIF-подпись при наведении»; НЕ лок).
 *
 * СУЖЕНИЕ ФИЧИ — ЗАПИСАНО КАК НАХОДКА, НЕ РЕШЕНО МОЛЧА. Исходный приём в
 * исследовании — «тип плёнки, город, может — год». Проверка `sharp` на
 * исходниках портфолио дала `exif: false` на всех файлах (`FACTS.md`,
 * OQ-21): плёнка физически не пишет технический EXIF, а марка плёнки нигде
 * в проекте не названа как факт. Город КОНКРЕТНОГО кадра тоже не факт: § 0.11
 * `COPY.md` прямо оговаривает, что локации кадров не привязаны к городу ни в
 * одной зоне. Придумывать «Тула» или «Москва» для файла `IMG_1651.JPG` значило
 * бы делать ровно то, что запрещено, — то же нарушение, что и выдуманная
 * диафрагма, просто в другом поле. Поэтому подпись сейчас показывает только
 * то, что подтверждено: МАТЕРИАЛ. Слово «плёнка» — не изобретение билдера,
 * оно уже в боевом тексте (`copy.ts`: `offer.note`, `delivery.film`), здесь
 * используется то же слово, а не новый термин. Как только OQ-21 закрыт и/или
 * появляется факт про город конкретного кадра — подпись расширяется на
 * `«плёнка · <город>»` без изменения механики, только строки.
 *
 * Единственный подтверждённый факт «этот кадр — плёнка» — комментарий
 * `export-photos.mjs`: «плёнка — новый слот Ф28. Кадр снят на плёнку и
 * виден как плёночный» (IMG_1651.JPG → `services/plenka.webp`). Поэтому
 * подпись стоит только на этом кадре, не на всех кадрах рэка: чёрно-белый
 * кадр стопки (`chb.webp`) НЕ подтверждён как плёночный нигде в проекте,
 * подписывать его было бы той же выдумкой.
 *
 * НАВЕДЕНИЕ / ДОЛГИЙ ТАП. Мышь — сразу по `pointerenter`/`pointerleave`.
 * Тач — таймер 480 мс на `pointerdown` (короче — обычный тап промахнётся
 * мимо подписи), подпись остаётся ещё 1,8 с после отпускания: на тач-экране
 * иначе её физически не успеть прочитать, палец уже убран. Клавиатура —
 * `:focus`/`:blur` на самом узле (`tabIndex=0`), тот же принцип, что и у
 * системного `:focus-visible` по всему сайту.
 */
export function FilmCaption({ children }: { children: ReactNode }) {
  const [show, setShow] = useState(false);
  const holdTimer = useRef<number | null>(null);
  const hideTimer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (holdTimer.current) window.clearTimeout(holdTimer.current);
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
    },
    [],
  );

  const clearHold = () => {
    if (holdTimer.current) {
      window.clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
  };
  const clearHide = () => {
    if (hideTimer.current) {
      window.clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType !== 'touch') return;
    clearHide();
    holdTimer.current = window.setTimeout(() => setShow(true), 480);
  };
  const onPointerUpOrCancel = (e: React.PointerEvent) => {
    if (e.pointerType !== 'touch') return;
    clearHold();
    hideTimer.current = window.setTimeout(() => setShow(false), 1800);
  };

  return (
    <div
      className="film-tag"
      tabIndex={0}
      role="group"
      aria-label="Плёночный кадр"
      onPointerEnter={(e) => e.pointerType === 'mouse' && setShow(true)}
      onPointerLeave={(e) => e.pointerType === 'mouse' && setShow(false)}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUpOrCancel}
      onPointerCancel={onPointerUpOrCancel}
      onFocus={() => setShow(true)}
      onBlur={() => setShow(false)}
    >
      {children}
      <span className="film-tag-caption" data-show={show ? '' : undefined}>
        плёнка
      </span>
    </div>
  );
}
