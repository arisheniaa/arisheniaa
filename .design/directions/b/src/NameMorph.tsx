import { useEffect, useRef, useState } from 'react';

/**
 * arisheniaa → аришения.
 * Механика 1 «послойное растворение» — выбор владелицы (FACTS Ф15), зафиксирована.
 * Свободны гарнитура, размер, место и триггер — это и есть решение направления.
 *
 * Числа взяты из спецификации Ф15 дословно:
 *   340 мс на букву, ступень 28 мс, blur 7→0, translateY ∓0.14em, scale 0.94/1.06.
 *
 * Решения направления:
 *  · гарнитура — Literata 800, opsz 72: расфокус читается только на плотной
 *    засечке; на тонкой антикве blur съедает штрих и буква пропадает;
 *  · место — знак в шапке, он же единственный логотип. Отдельного «блока с именем»
 *    нет: имя работает в служебной позиции, где его и увидят;
 *  · триггер — ПЕРВЫЙ СКРОЛЛ (>24 px) или тап по имени. Не автозапуск:
 *    правило П7 запрещает движение в первом кадре, а apple-design требует, чтобы
 *    движение было ответом на действие человека, а не представлением до него.
 *    Повторный тап возвращает латиницу — путь входа и выхода один (симметрия).
 *
 * Правило П8: оба написания в DOM. Визуальный слой aria-hidden,
 * читаемый текст — один чистый узел «аришения»; ширину держит кириллица.
 */

const LAT = 'arisheniaa';
const CYR = 'аришения';
const STEP = 28; // мс, ступень между буквами
const DUR = 340; // мс на букву

/* Крючок для съёмки доказательств: ?morph=mid растягивает переход до 9 с,
   чтобы кадр поймал середину растворения. Значения свойств те же, меняется
   только шкала времени — apple-design прямо рекомендует смотреть движение
   в замедлении. В продуктовом пути параметра нет. */
const DEMO = typeof location !== 'undefined' && new URLSearchParams(location.search).get('morph');
const DEMO_SCALE = DEMO === 'mid' ? 26 : 1;

export function NameMorph({ className = '' }: { className?: string }) {
  const [to, setTo] = useState(false);
  const armed = useRef(false);

  useEffect(() => {
    if (DEMO) {
      const t = setTimeout(() => { armed.current = true; setTo(true); }, 120);
      return () => clearTimeout(t);
    }
  }, []);

  useEffect(() => {
    const onScroll = () => {
      if (armed.current) return;
      if (window.scrollY > 24) {
        armed.current = true;
        setTo(true);
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const letters = (word: string, dir: -1 | 1) =>
    [...word].map((ch, i) => (
      <span
        key={i}
        className="inline-block"
        style={{
          transitionProperty: 'opacity, filter, transform',
          transitionDuration: `${DUR * DEMO_SCALE}ms`,
          transitionTimingFunction: 'ease',
          transitionDelay: `${i * STEP * DEMO_SCALE}ms`,
          ...(dir === -1
            ? to
              ? { opacity: 0, filter: 'blur(7px)', transform: 'translateY(-0.14em) scale(0.94)' }
              : { opacity: 1, filter: 'blur(0)', transform: 'none' }
            : to
              ? { opacity: 1, filter: 'blur(0)', transform: 'none' }
              : { opacity: 0, filter: 'blur(7px)', transform: 'translateY(0.14em) scale(1.06)' }),
        }}
      >
        {ch}
      </span>
    ));

  return (
    <button
      type="button"
      onClick={() => { armed.current = true; setTo((v) => !v); }}
      className={`relative cursor-pointer border-0 bg-transparent p-0 text-left ${className}`}
      /* `font: inherit` тут стоять не может: шорткат сбрасывает кегль и вес
         на значения body, инлайном перебивает класс роли — и знак печатался
         текстовым кеглем в регуляре вместо Literata 800. Найдено съёмкой. */
      style={{ color: 'inherit' }}
    >
      {/* Визуальный слой. Ширину держит кириллица — иначе имя дёрнется после перехода. */}
      <span aria-hidden="true" className="relative inline-block whitespace-nowrap">
        <span className="inline-block">{letters(CYR, 1)}</span>
        <span className="absolute top-0 left-0 inline-block whitespace-nowrap">
          {letters(LAT, -1)}
        </span>
      </span>
      {/* Семантика: один чистый узел, доступный поиску и скринридеру всегда. */}
      <span className="sr-only">аришения</span>
    </button>
  );
}
