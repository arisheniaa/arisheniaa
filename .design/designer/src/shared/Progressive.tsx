import { Children, useEffect, useState, type ReactNode } from 'react';

/**
 * ПОСТЕПЕННАЯ СБОРКА СТРАНИЦЫ (её правка: «сайт тяжело прогружается»).
 *
 * Замер на холодной загрузке (процессор замедлен в 4 раза, как средний
 * ноутбук) показал один кадр в 1,4 с — на самом старте: браузер строил всю
 * страницу разом — четыре экрана работ, веер, разделы. Первый экран
 * (ноутбук) от этого ждал вместе со всем остальным.
 *
 * Теперь сразу строится только то, что видно, а блоки ниже достраиваются
 * по одному в паузах браузера (`requestIdleCallback`), пока читатель
 * смотрит на ноутбук: до первого блока ниже ещё полтора экрана прокрутки
 * (раскрытие ноутбука). Если читатель листает быстрее, чем блоки готовы,
 * оставшиеся достраиваются сразу.
 */
const idle = (cb: () => void) =>
  typeof window.requestIdleCallback === 'function' ? window.requestIdleCallback(cb, { timeout: 400 }) : setTimeout(cb, 60);

export function Progressive({ children }: { children: ReactNode }) {
  const items = Children.toArray(children);
  const [n, setN] = useState(0);
  useEffect(() => {
    if (n >= items.length) return;
    /* Первый блок — после того как нарисован первый экран. `max`: если по
       якорю уже достроено всё, этот поздний кадр не должен свернуть обратно. */
    const id = n === 0 ? requestAnimationFrame(() => requestAnimationFrame(() => setN((v) => Math.max(v, 1)))) : idle(() => setN((v) => v + 1));
    return () => {
      if (n === 0) cancelAnimationFrame(id as number);
    };
  }, [n, items.length]);
  /* Быстрая прокрутка или переход по якорю — достроить всё сразу. Якорь
     мог сработать, когда цели ещё не было, — тогда после достройки к ней
     докручиваем сами. */
  useEffect(() => {
    if (n < items.length || !location.hash) return;
    document.getElementById(location.hash.slice(1))?.scrollIntoView();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n === items.length]);
  useEffect(() => {
    const all = () => setN(items.length);
    const onScroll = () => {
      if (window.scrollY > window.innerHeight * 1.2) all();
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('hashchange', all);
    if (location.hash) all();
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('hashchange', all);
    };
  }, [items.length]);
  return <>{items.slice(0, n)}</>;
}
