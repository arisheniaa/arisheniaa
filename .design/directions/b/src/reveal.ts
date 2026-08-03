import { useEffect } from 'react';

/**
 * Вход сцены — «наводка на резкость». Одно движение на всё направление.
 *
 * Средство выбрано по лестнице от дешёвого к дорогому:
 * IntersectionObserver + CSS-переход. GSAP/ScrollTrigger не нужен —
 * здесь нет ни пиннинга, ни таймлайна, ни скраба по нескольким целям.
 * Отклонение от стека зафиксировано в README.
 *
 * Правило П7: движения в первом кадре нет. Всё, что видно при загрузке,
 * помечается is-instant и переходом не сопровождается.
 */
export function useReveal() {
  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>('.reveal'));

    // 1) первый кадр — то, что уже видно, ставим резким без перехода
    const vh = window.innerHeight;
    for (const n of nodes) {
      const r = n.getBoundingClientRect();
      if (r.top < vh * 0.94) n.classList.add('is-instant', 'is-sharp');
    }
    // снять запрет перехода после первого кадра, чтобы остальное анимировалось
    requestAnimationFrame(() =>
      requestAnimationFrame(() => nodes.forEach((n) => n.classList.remove('is-instant'))),
    );

    // 2) остальное — по входу в кадр
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('is-sharp');
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.05 },
    );
    nodes.forEach((n) => {
      if (!n.classList.contains('is-sharp')) io.observe(n);
    });
    return () => io.disconnect();
  }, []);
}

/**
 * Скролл как режиссура: кадр физически наводится на резкость по мере прохода
 * через экран. rAF + getBoundingClientRect, без Lenis.
 *
 * Правка третьего захода: элементы, видимые в первом кадре, из скраба
 * исключаются целиком. В прошлой версии кадр hero приходил расфокусированным
 * на 7 px при загрузке — это и П7 нарушало, и работало ровно на названный
 * риск направления («интерфейс съест фотографию»). Теперь фотография при
 * загрузке резкая всегда, а скраб живёт только ниже первого экрана.
 *
 * [data-focus="in"]  — приходит расфокусированным, читатель наводит его скроллом
 * [data-focus="out"] — уходит, теряя резкость (объектив упускает предмет)
 */
export function useFocusScrub() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const vh0 = window.innerHeight;
    const els = Array.from(document.querySelectorAll<HTMLElement>('[data-focus]')).filter(
      (el) => el.getBoundingClientRect().top > vh0 * 0.94,
    );
    if (!els.length) return;

    let raf = 0;
    const tick = () => {
      const vh = window.innerHeight;
      for (const el of els) {
        const r = el.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) continue; // за экраном не считаем
        if (el.dataset.focus === 'in') {
          // 0 когда верх кадра на уровне 100% высоты экрана, 1 — на уровне 70%.
          // Диапазон короткий и максимум расфокуса 4.5 px: кадр обязан быть резким
          // почти всю свою жизнь на экране. Числа снижены после съёмки на 390 px:
          // 7 px на кадре шириной 440 px — это уже не наводка, а каша, а один
          // из кадров сам снят в движении, и расфокус на нём удваивался.
          const p = clamp01((1 - r.top / vh) / 0.3);
          el.style.filter = `blur(${((1 - p) * 4.5).toFixed(2)}px)`;
          el.style.transform = `scale(${(1 + (1 - p) * 0.016).toFixed(4)})`;
        } else {
          // уход: теряет резкость, когда низ кадра поднялся выше 62% экрана
          const p = clamp01((0.62 - r.bottom / vh) / 0.62);
          el.style.filter = `blur(${(p * 9).toFixed(2)}px)`;
          el.style.opacity = String(1 - p * 0.45);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
}

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
