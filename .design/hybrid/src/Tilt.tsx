import { useRef, useState } from 'react';
import type { ReactNode } from 'react';

/**
 * 3D-ТИЛТ КАРТОЧЕК УСЛУГ (Ф29 п.3, FACTS.md — синтез `RESEARCH-COMPETITORS.md`
 * § 1, «card tilt / trading card hover»; НЕ лок, решение владелицы поверх уже
 * принятого макета услуг: «фиксируем, делай!»). Диапазон 4–6°, середина 5° —
 * пожелание владелицы дало вилку, не точку, и середина безопаснее любого края.
 *
 * Наклон — на самом КАДРЕ (Р4: «кадр — объект»), не на карточке-обёртке:
 * приём не добавляет ни рамки, ни скругления, ни тени-кнопки, только поворот
 * в перспективе и блик, как если бы отпечаток наклоняли в руке. Это и есть
 * граница из README § 3: «сетка одинаковых карточек — механизм уплощения»,
 * поэтому тилт не превращает фото в интерфейсную карточку, а подчёркивает,
 * что это предмет.
 *
 * ПОЧЕМУ ROTATЕ ЖИВЁТ НА ЭТОМ УЗЛЕ, А НЕ НА `[data-focus]`. Внутри уже стоит
 * `useFocusScrub` (`reveal.ts`), который каждый кадр пишет `el.style.transform
 * = scale(...)` ПРЯМО в инлайн-стиль элемента с `data-focus="in"`. Если тилт
 * тоже вращал бы этот же узел через инлайн-стиль, оба писали бы в одно и то же
 * свойство и одно стирало бы другое. Поэтому тилт — на ОТДЕЛЬНОМ родительском
 * узле: он крутится через CSS-класс и переменные (`--tilt-x`/`--tilt-y`,
 * не `style.transform` напрямую), а `[data-focus]` внутри как и раньше сам
 * пишет свой `scale`/`blur` — вложенные трансформы двух разных узлов
 * складываются визуально сами, конфликта нет.
 *
 * ФИЗИКА: во время наведения — слежение 1:1 без задержки (тот же принцип, что
 * у рэка при перетаскивании: «палец ведёт, пружина молчит»), при уходе курсора
 * CSS-переход возвращает наклон в ноль — тот же паттерн «мгновенный контроль +
 * пружинный возврат», что у `useRack.ts`, только возврат здесь не JS-пружина
 * (одна цель — плоское положение, а не бросок с импульсом), а CSS-переход на
 * кубической кривой с перелётом (`--ease-spring`, styles.css), так и получается
 * «пружина» без второй копии физического цикла ради одной цели.
 *
 * prefers-reduced-motion: обработчики не вешаются вовсе (не только гасятся
 * CSS-переходом) — наклон, завязанный на позицию курсора, для человека,
 * попросившего убрать движение, лучше не считать вовсе, чем считать и прятать.
 */
const MAX_DEG = 5; // середина запрошенного диапазона 4–6°

export function TiltFrame({ className = '', children }: { className?: string; children: ReactNode }) {
  const host = useRef<HTMLDivElement>(null);
  const [reduceMotion] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  if (reduceMotion) {
    return <div className={`tilt-frame ${className}`}>{children}</div>;
  }

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse') return; // тач не наводит — тилту нечем управлять
    const el = host.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    const dx = Math.min(1, Math.max(0, px)) - 0.5;
    const dy = Math.min(1, Math.max(0, py)) - 0.5;
    el.style.setProperty('--tilt-x', (-dy * MAX_DEG * 2).toFixed(2));
    el.style.setProperty('--tilt-y', (dx * MAX_DEG * 2).toFixed(2));
    el.style.setProperty('--glint-x', `${(px * 100).toFixed(1)}%`);
    el.style.setProperty('--glint-y', `${(py * 100).toFixed(1)}%`);
    el.classList.add('is-tilting');
  };

  const onLeave = () => {
    const el = host.current;
    if (!el) return;
    el.style.setProperty('--tilt-x', '0');
    el.style.setProperty('--tilt-y', '0');
    el.classList.remove('is-tilting');
  };

  return (
    <div
      ref={host}
      className={`tilt-frame ${className}`}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      onPointerCancel={onLeave}
    >
      {children}
      <span className="tilt-glint" aria-hidden="true" />
    </div>
  );
}
