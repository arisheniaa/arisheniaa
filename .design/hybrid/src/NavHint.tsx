import { useEffect, useLayoutEffect, useRef, useState } from 'react';

/**
 * СТРЕЛКА-ПОДСКАЗКА НА «ПРИДУМАТЬ СЪЁМКУ» — задание редакции 4 фичи
 * «Придумать съёмку» (`FACTS.md` Ф33 п.3), стоит здесь, на ГЛАВНОЙ странице,
 * не на самой странице квиза. Владелица: «появляющаяся стрелка, указывающая
 * на "придумать съемку" в навигации при прокручивании сайта вниз, перед
 * контактами, чтобы привлечь внимание посетителя сайта к этому интерактиву».
 * Форма/анимация/точный момент триггера — на усмотрение исполнителя (задание
 * дословно), доказывается экраном.
 *
 * ТРИГГЕР — ДВА IntersectionObserver, не пиксельные пороги на глаз:
 *  1. `#hero` (первый экран, `App.tsx`) — пока он виден, подсказка молчит.
 *     Как только он уходит из вьюпорта (читатель прокрутил вниз), подсказка
 *     разрешена. Это и есть П7 в действии: ничего не движется в первом
 *     экране, стрелка появляется только ПОСЛЕ скролла, не при загрузке.
 *  2. `#kontakt` (секция контактов, `Cta()` в `App.tsx`) — как только ЛЮБАЯ
 *     её часть входит во вьюпорт, подсказка гаснет: «перед контактами» —
 *     это окно между первым экраном и секцией контактов, не после нее.
 *
 * Условие показа — `pastHero && !reachedContacts`. Оба флага независимы от
 * пиксельных чисел, поэтому работают одинаково честно на 360 и на 1920.
 *
 * НЕ ЛЕНДМАРК. На странице уже есть счётчик лендмарков `nav` (ровно 2 —
 * шапка + боковой индикатор разделов, `SectionStars.tsx`, `selfcheck.mjs`).
 * Стрелка — простой `<a>` внутри `<div>`, не `<nav>`: она не список разделов,
 * а разовая подсказка к ОДНОМУ уже существующему пункту шапки. Третий `<nav>`
 * увеличил бы этот счётчик и потребовал бы разбирать это как дубль на
 * следующем прогоне — не нужно, когда есть более простое и точное решение.
 *
 * УКАЗЫВАЕТ НА КОНКРЕТНЫЙ ПУНКТ. `App.tsx` даёт ссылке «Придумать съёмку» в
 * шапке `id="nav-link-storyboard"`, чтобы эта подсказка могла измерить её
 * реальное положение (`getBoundingClientRect`) и встать под ней стрелкой
 * вверх. На узком экране, где шапка сворачивает навигацию в раскрывающийся
 * список («Разделы», `nav-toggle`), сама ссылка скрыта (`display:none` через
 * `hidden md:flex`) — тогда подсказка указывает на КНОПКУ «Разделы» вместо
 * неё: с ней читатель всё равно попадёт на ту же ссылку через один клик, а
 * указывать стрелкой в пустоту (`getBoundingClientRect` скрытого узла — нули)
 * было бы враньём об адресе.
 *
 * НЕ ИНТЕРАКТИВНА В ЗАКРЫТОМ СОСТОЯНИИ. Компонент условно НЕ монтируется,
 * пока не выполнены оба условия показа (`{visible && <NavHintTag/>}`), а не
 * скрывается CSS-видимостью — скрытый, но смонтированный `<a>` ловил бы Tab
 * и фокус там, где глазом его не видно (правило «фокус видимый» работает и в
 * обратную сторону: невидимый элемент не должен быть в порядке табуляции).
 *
 * `prefers-reduced-motion`: подсказка всё равно появляется/исчезает (это не
 * шум, а единственный способ её вообще увидеть), но без входной анимации —
 * `is-in` ставится сразу, без задержки в два кадра.
 */
export function NavHint() {
  const [pastHero, setPastHero] = useState(false);
  const [reachedContacts, setReachedContacts] = useState(false);

  useEffect(() => {
    const hero = document.getElementById('hero');
    const contacts = document.getElementById('kontakt');
    if (!hero || !contacts) return;

    const heroIo = new IntersectionObserver(([entry]) => setPastHero(!entry.isIntersecting), {
      threshold: 0,
    });
    const contactsIo = new IntersectionObserver(([entry]) => setReachedContacts(entry.isIntersecting), {
      threshold: 0,
    });
    heroIo.observe(hero);
    contactsIo.observe(contacts);
    return () => {
      heroIo.disconnect();
      contactsIo.disconnect();
    };
  }, []);

  const visible = pastHero && !reachedContacts;

  return visible ? <NavHintTag /> : null;
}

/** Реальное положение цели — ссылки «Придумать съёмку» в развёрнутой шапке,
 *  либо кнопки «Разделы», если навигация свёрнута (см. блок-комментарий
 *  вверху файла). Модульная функция, не хук: нужна и для ленивого начального
 *  значения состояния (синхронно, при первом рендере), и для пересчёта по
 *  скроллу/resize. */
function measureTarget(): { left: number; top: number } | null {
  const link = document.getElementById('nav-link-storyboard');
  const toggle = document.querySelector<HTMLElement>('.nav-toggle');
  const target =
    link && link.offsetParent !== null ? link : toggle && toggle.offsetParent !== null ? toggle : null;
  if (!target) return null;
  const r = target.getBoundingClientRect();
  return { left: r.left + r.width / 2, top: r.bottom };
}

function NavHintTag() {
  /* Ленивый инициализатор — значение считается СИНХРОННО на первом рендере,
     а не в эффекте после первой отрисовки. НАХОДКА (поймано измерением, не
     мнением): при `useState(null)` + условном `if (!pos) return null` на
     первом рендере компонент возвращал `null` — `<a>` ещё не существовал,
     `ref.current` был `null`, и эффект входной анимации (см. ниже, зависимости
     `[]`, схема «двойной rAF» из `FadeStep`/`LadderStep`) выполнялся ровно
     один раз именно в этот момент, тут же выходя по `if (!el) return`. Ко
     второму рендеру (когда положение наконец вычислялось и `<a>` монтировался
     по-настоящему) эффект с пустыми зависимостями уже не запускался снова —
     `data-show` не проставлялся НИКОГДА, стрелка молча оставалась с
     `opacity: 0` навсегда. Самопроверка ловила это как «элемент есть в DOM,
     но `data-show` — `null` даже через секунду». Синхронный расчёт здесь
     убирает первый, «пустой» рендер целиком: `<a>` существует и получает
     `ref` уже на первом рендере компонента. */
  const [pos, setPos] = useState(measureTarget);
  const ref = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.setAttribute('data-show', '');
      return;
    }
    const id = requestAnimationFrame(() => requestAnimationFrame(() => el.setAttribute('data-show', '')));
    return () => cancelAnimationFrame(id);
  }, []);

  /* `useLayoutEffect`, не `useEffect`: пересчёт положения должен произойти
     ДО того, как браузер нарисует кадр — иначе на resize/скролле стрелка на
     мгновение показалась бы в СТАРОЙ точке, а `useEffect` (после отрисовки)
     дал бы заметный скачок за кадром. */
  useLayoutEffect(() => {
    const place = () => setPos(measureTarget());
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, { passive: true });
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place);
    };
  }, []);

  if (!pos) return null;

  return (
    <a
      ref={ref}
      href="/storyboard.html"
      className="nav-hint"
      style={{ left: pos.left, top: pos.top }}
    >
      <svg viewBox="0 0 24 14" width="18" height="11" aria-hidden="true" focusable="false">
        <path d="M2 12 L12 2 L22 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="square" />
      </svg>
      <span>Загляните сюда</span>
    </a>
  );
}
