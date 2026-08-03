import { useEffect, useRef, useState } from 'react';
import { STAR_PATHS, STAR_TONES } from './star-paths';

/**
 * БОКОВОЙ ИНДИКАТОР РАЗДЕЛОВ (Ф29 п.4, FACTS.md — синтез
 * `RESEARCH-COMPETITORS.md` § 4, «боковой прогресс-индикатор... превратить
 * точки в маленькие звёзды того же силуэта, что фоновые»; НЕ лок).
 * «Тот же силуэт, что фоновые (`star-paths.ts`), не отдельный UI-виджет
 * точек» — путь `tiny8`, тот же, что у мелкой фоновой россыпи («звёзды на
 * полу»), один визуальный словарь для атмосферы и для навигации, а не два.
 *
 * РАЗДЕЛЫ ЧИТАЮТСЯ ИЗ ЖИВОЙ РАЗМЕТКИ (`main > section`), а не из отдельного
 * захардкоженного списка id: список тогда не может разойтись со страницей —
 * например, если секция «Шесть кадров» (сейчас выключена Ф28) вернётся,
 * звезда появится сама, без правки этого файла.
 *
 * АКТИВНАЯ СЕКЦИЯ — IntersectionObserver с полосой по центру экрана
 * (`rootMargin` сжимает область обзора до горизонтальной ленты), тот же
 * приём, что уже в `reveal.ts`, а не опрос позиции на каждый кадр.
 *
 * ВТОРОЙ `<nav>` НА СТРАНИЦЕ — ОСОЗНАННО, НЕ ДУБЛЬ. Правило проекта требует
 * по одному лендмарку на тип, потому что дубль незаметен на кадре и ловится
 * только замером (`document.querySelectorAll('nav').length`). Тот случай был
 * про СЛУЧАЙНО оставленную вторую копию ОДНОЙ И ТОЙ ЖЕ навигации (подвал +
 * шапка, редакция 2). Здесь — другая по смыслу и по `aria-label` навигация
 * («Прогресс по разделам» против «Разделы сайта» у шапки): два лендмарка
 * `nav` с РАЗНЫМИ подписями — стандартная, различимая для скринридера
 * структура, а не дубль. `selfcheck.mjs` обновлён проверять именно это:
 * ровно два `<nav>` и ровно два РАЗНЫХ `aria-label` (не два одинаковых).
 *
 * НЕ ПУТАЕТСЯ СО СЧЁТЧИКОМ РЭКА «01/08» (`Rack.tsx`): тот считает кадры
 * внутри стопки первого экрана и стоит рядом с фотографией в потоке страницы;
 * этот считает СЕКЦИИ всей страницы и стоит `position: fixed` на кромке
 * вьюпорта — разные предметы, разные места, коллизии нет ни по смыслу, ни
 * по кадру.
 *
 * Скрыт до `lg` (1024px): в гаттере уже 360×гаттера просто нет места для ещё
 * одной колонки без риска наложиться на контент, а сам приём — украшение
 * поверх основной страницы, не обязательная функция (весь список разделов
 * уже есть в шапке).
 */
export function SectionStars() {
  const [count, setCount] = useState(0);
  const [active, setActive] = useState(0);
  const sectionsRef = useRef<HTMLElement[]>([]);

  useEffect(() => {
    const sections = Array.from(document.querySelectorAll<HTMLElement>('main > section'));
    sectionsRef.current = sections;
    setCount(sections.length);
    if (sections.length < 2) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            const idx = sections.indexOf(e.target as HTMLElement);
            if (idx !== -1) setActive(idx);
          }
        }
      },
      // полоса высотой ~8% экрана по центру: секция считается «текущей»,
      // когда её тело пересекает середину видимой области
      { rootMargin: '-46% 0px -46% 0px', threshold: 0 },
    );
    sections.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, []);

  if (count < 2) return null;

  const jump = (i: number) => {
    const el = sectionsRef.current[i];
    if (!el) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  };

  return (
    <nav aria-label="Прогресс по разделам" className="section-stars hidden lg:flex">
      {Array.from({ length: count }, (_, i) => (
        <button
          key={i}
          type="button"
          className="section-star"
          data-active={i === active ? '' : undefined}
          aria-current={i === active ? 'true' : undefined}
          aria-label={`Раздел ${i + 1} из ${count}`}
          onClick={() => jump(i)}
        >
          <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">
            <path d={STAR_PATHS.tiny8} fill={STAR_TONES[i === active ? 1 : 0]} />
          </svg>
        </button>
      ))}
    </nav>
  );
}
