import { useEffect } from 'react';

/**
 * ПОЛОТНО — меш-градиент на всю страницу. Лок, «Цвет»:
 *
 *  · не картинка-фон, а CSS-меш из радиальных слоёв. Цвета сняты пипеткой
 *    с файлов владелицы (значения и точки замера — в styles.css и README);
 *  · `position: fixed`, весь вьюпорт, слой под контентом;
 *  · реагирует на прокрутку: позиция и интенсивность слоёв идут за прогрессом;
 *  · зерно — SVG feTurbulence, тот же приём, что в B и C;
 *  · GSAP/Lenis в проект не возвращаются — прогресс считает один rAF на 40 строк.
 *
 * П7: при загрузке прогресс равен нулю и полотно стоит. Ни перехода, ни
 * проявления, ни мигания в первом кадре нет — движение начинается только
 * от прокрутки, то есть от действия читателя.
 *
 * prefers-reduced-motion: подписка на прокрутку не ставится вовсе, полотно
 * остаётся в стартовом положении. Контент от этого не теряется — полотно
 * декоративное и помечено aria-hidden.
 *
 * Почему rAF, а не обработчик scroll напрямую: обработчик стреляет чаще кадра
 * и заставляет перерисовывать полноэкранный слой по нескольку раз за кадр.
 * Значение округляется до 0.005 — при более мелком шаге браузер перекрашивает
 * полотно на каждый пиксель прокрутки без единого видимого изменения.
 *
 * ─── НАСТРОЕНИЕ ДИПТИХА (Ф29 п.1, FACTS.md — синтез
 * `RESEARCH-COMPETITORS.md` § 2, «не переключать секции резким блоком, а
 * вести CSS-переменные градиента непрерывно между «тихими» и «странными»
 * кадрами»; НЕ лок, расширение уже принятого решения). Вторая переменная,
 * `--mood`, — тот же принцип, что `--sp`, но ЛОКАЛЬНЫЙ прогресс: не всей
 * страницы, а прохода ОДНОЙ секции — диптиха «Как получается кино»
 * (`Cinema()` в `App.tsx`, помечен `data-mood-scope`). Если бы настроение
 * читало общий `--sp`, за короткий проход одной секции число почти не
 * сдвинулось бы (страница длинная, секция — её малая доля), и «переход между
 * тихим и странным именно здесь» на глаз не читался бы вовсе.
 *
 * 0 — верх диптиха ещё только показался у нижнего края экрана; 1 — низ
 * диптиха ушёл за верхний край. Слушатели — `.mesh-mood-a` / `.mesh-mood-b`
 * (styles.css): кроссфейд двух пятен вместо переключения, «свечение, а не
 * контраст» (`BRIEF.md`), тот же приём, что уже есть у свечения звёзд
 * (`Stars.tsx`), доведённый до света всей страницы.
 */
export function Gradient() {
  useEffect(() => {
    const root = document.documentElement;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const moodEl = document.querySelector<HTMLElement>('[data-mood-scope]');

    let raf = 0;
    let last = -1;
    let lastMood = -1;
    const tick = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      const q = Math.round(p * 200) / 200;
      if (q !== last) {
        last = q;
        root.style.setProperty('--sp', String(q));
      }

      if (moodEl) {
        const r = moodEl.getBoundingClientRect();
        const vh = window.innerHeight;
        const raw = (vh - r.top) / (vh + r.height);
        const mood = Math.min(1, Math.max(0, raw));
        const qm = Math.round(mood * 200) / 200;
        if (qm !== lastMood) {
          lastMood = qm;
          root.style.setProperty('--mood', String(qm));
        }
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="canvas" aria-hidden="true">
      <div className="mesh mesh-base" />
      <div className="mesh mesh-bloom" />
      <div className="mesh mesh-mood-a" />
      <div className="mesh mesh-mood-b" />
    </div>
  );
}

/**
 * Зерно. Отдельным фиксированным слоем ПОВЕРХ контента, а не по секциям, как
 * было в B: у нас под всем лежит одно непрерывное полотно, и зерно, нарезанное
 * по секциям, давало бы видимые швы на стыках. Лежит и на фотографиях тоже —
 * стерильных пикселей на этом сайте нет нигде.
 */
export function Grain() {
  return <div className="grain-veil" aria-hidden="true" />;
}
