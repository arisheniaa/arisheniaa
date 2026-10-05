import { useEffect, useRef } from 'react';

/**
 * ГРАДИЕНТ ВМЕСТО ШЕЙДЕРА (её правка: «варианты крутые, только тяжёлые
 * капец. Давай что-то более статичное, в тех же цветах, но как было на моём
 * сайте — при прокрутке цвет менялся»).
 *
 * Механика — та же, что у полотна фото-сайта (`../hybrid/src/Gradient.tsx`):
 * несколько мягких пятен, каждое на своём слое, а прокрутка пишет одно число
 * `--sp` (0…1). Пятна от него сдвигаются, масштабируются и перетекают —
 * только `transform` и `opacity`, то есть браузер двигает уже нарисованные
 * слои, ничего не перерисовывая. Без прокрутки ничего не шевелится.
 *
 * Цвета — из её настройки шейдера: бирюза #73bfc4, оранжевый #ff810a,
 * лаванда #8da0ce на чёрном. Вверху страницы тёплое (оранжевый ведёт),
 * к середине выходит бирюза, к низу — лаванда. Диагональная полоса света —
 * отсылка к блику на сфере шейдера.
 *
 * `--sp` пишется на сам градиент, а не на `<html>`: переменные наследуются,
 * и запись в корень заставляла бы браузер пересчитывать стиль всей
 * страницы (урок Ф45 фото-сайта). Шаг округлён до 1/200 — мельче глазом не
 * видно, а перекрашивать на каждый пиксель скролла незачем.
 */
export function Mesh({ className = '' }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let max = 1;
    const measure = () => {
      max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(document.body);
    let last = -1;
    let raf = 0;
    const tick = () => {
      raf = 0;
      const q = Math.round(Math.min(1, Math.max(0, window.scrollY / max)) * 200) / 200;
      if (q !== last) {
        last = q;
        el.style.setProperty('--sp', String(q));
      }
    };
    const on = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };
    tick();
    window.addEventListener('scroll', on, { passive: true });
    return () => {
      window.removeEventListener('scroll', on);
      ro.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);
  return (
    <div ref={ref} className={`mesh ${className}`} aria-hidden>
      <div className="mesh-spot m-orange" />
      <div className="mesh-spot m-ember" />
      <div className="mesh-spot m-teal" />
      <div className="mesh-spot m-lav" />
      <div className="mesh-spot m-teal2" />
      <div className="mesh-band" />
      <div className="mesh-grain" />
    </div>
  );
}
