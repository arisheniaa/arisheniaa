import { useEffect } from 'react';
import { onFrame } from './raf';

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

    /* ═══ ПОЛОЖЕНИЕ КЭШИРУЕТСЯ (Ф43) — «сайт ещё виснет» ═════════════════
       Прежний цикл вызывал `getBoundingClientRect()` для КАЖДОГО кадра
       страницы на КАЖДОМ кадре анимации, а следом писал этим же элементам
       `filter` и `transform`. Чтение после записи — принудительный пересчёт
       раскладки; десять фотографий давали десять пересчётов за кадр, и это
       поверх шести полей звёзд, писавших в DOM в том же кадре.

       Позиция кадра В ДОКУМЕНТЕ не меняется от прокрутки — меняется только
       `scrollY`. Меряем один раз, обновляем по `ResizeObserver` (догрузка
       картинок, поворот экрана, смена раскладки), а положение на экране
       считаем вычитанием. Ноль обращений к раскладке в кадре.

       Плюс ранний выход, когда страница стоит: скраб — реакция на прокрутку,
       и без прокрутки ему нечего пересчитывать. */
    const spots = els.map((el) => {
      const r = el.getBoundingClientRect();
      return { el, top: r.top + window.scrollY, h: r.height };
    });
    const remeasure = () => {
      for (const s of spots) {
        const r = s.el.getBoundingClientRect();
        s.top = r.top + window.scrollY;
        s.h = r.height;
      }
    };
    const ro = new ResizeObserver(remeasure);
    ro.observe(document.body);

    let lastScroll = -1;
    const tick = () => {
      const sy = window.scrollY;
      if (sy === lastScroll) return;
      lastScroll = sy;

      const vh = window.innerHeight;
      for (const spot of spots) {
        const el = spot.el;
        const r = { top: spot.top - sy, bottom: spot.top + spot.h - sy };
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
    };

    const stopFrames = onFrame(tick);
    return () => {
      stopFrames();
      ro.disconnect();
    };
  }, []);
}

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/**
 * ПЛАШКА ЦЕНЫ НА ТАЧ — ДВУСТОРОННИЙ REVEAL ПО СКРОЛЛУ. Правка билдера,
 * отвечает на прямой запрос в чате (не в `FACTS.md` — см. сообщение
 * коммита): «чтобы она появлялась в моменте, когда услуга будет вся на
 * экране. затем, когда прокручиваешь вниз — она исчезала».
 *
 * ДО ЭТОЙ ПРАВКИ на вводе без курсора (`@media (hover: none)`,
 * `PricePlate.tsx`/`styles.css`) плашка стояла видна ВСЕГДА и статично —
 * единственный способ показать цену там, где нет курсора, которым можно
 * навести. Теперь у тача появился свой триггер: не курсор, а факт
 * «карточка услуги целиком в кадре».
 *
 * ПОЧЕМУ НЕ `useReveal()` ВЫШЕ. Тот `IntersectionObserver` ставит класс
 * ОДИН РАЗ и снимает наблюдение (`io.unobserve`) сразу после первого
 * срабатывания — устроен под «появился и остался», не под «появляется и
 * прячется на каждом пересечении границы экрана». Здесь нужен именно
 * двусторонний переключатель.
 *
 * ПОЧЕМУ НЕ ПРОСТО `IntersectionObserver` С `threshold: 1` НА САМОЙ
 * КАРТОЧКЕ — НАХОДКА, поймана не мнением, а замером `getComputedStyle` во
 * время живого перехода на 390 px. Первая редакция ровно так и была
 * написана (обсервер напрямую на `.offer-card`, `threshold: 1`), и
 * `grid-template-rows` у `.offer-price` при прокрутке до определённых
 * позиций дёргался между долями пикселя (0.05px, 7px, 6px) вместо того
 * чтобы дойти до `1fr`, — классическая ПЕТЛЯ ОБРАТНОЙ СВЯЗИ между
 * геометрией, которую меряют, и геометрией, которую меняет сам факт
 * измерения:
 *
 *   1. карточка становится видна целиком → обсервер ставит `data-in-view`;
 *   2. плашка раскрывает место под собой (`.offer-price`,
 *      `grid-template-rows: 0fr → 1fr`) — карточка становится ВЫШЕ;
 *   3. если новый нижний край съезжает за нижнюю границу экрана — карточка
 *      снова «не видна целиком», обсервер снимает `data-in-view`;
 *   4. плашка гасится, карточка укорачивается обратно, снова видна целиком
 *      → обсервер ставит атрибут заново → шаг 2 повторяется.
 *
 * Единственный выход из петли — не мерить карточку в её ЖИВОМ, меняющемся
 * состоянии. Решение — тот же приём, что `useFocusScrub()` выше в этом
 * файле (Ф43, «сайт ещё виснет»): позиция и высота КАЖДОЙ карточки меряются
 * `getBoundingClientRect()` ОДИН РАЗ до первого переключения — в этот
 * момент ни одна плашка ещё не открыта (эффект ещё не успел поставить
 * `data-in-view`), поэтому измерение застаёт именно ЗАКРЫТУЮ, «схлопнутую»
 * высоту, — и кэшируется. Дальше «видна целиком» решается ПО ЭТОЙ
 * стабильной высоте на каждом кадре скролла, а не по живой: плашка не может
 * вырасти и вытолкнуть саму себя из критерия собственной видимости, потому
 * что критерий её роста не видит вовсе. `ResizeObserver` на `document.body`
 * актуализирует кэш при смене раскладки (поворот экрана, догрузка шрифта),
 * но ПРОПУСКАЕТ карточки, которые в этот момент открыты — их живая высота
 * сейчас не «закрытая», её нельзя принять за новую базу, не воспроизведя
 * ту же петлю.
 *
 * `data-in-view` ставится на `.offer-card` — тот же узел, что уже служит
 * областью наведения десктопной версии (Ф40, комментарий у `.offer-card`
 * в `App.tsx`). CSS follow-up в `styles.css` («ТАЧ — ТА ЖЕ АНИМАЦИЯ,
 * ТРИГГЕР ДРУГОЙ») даёт этому атрибуту РОВНО ТЕ ЖЕ переходы, что `:hover`
 * даёт на десктопе — тайминги, задержки, кривая `--ease-soft` скопированы,
 * не переизобретены.
 *
 * ДВЕ РАННИЕ ОСТАНОВКИ:
 *  · `(hover: none)` не совпадает — цикл не нужен, десктопная версия
 *    работает через `:hover`, этот хук её не касается;
 *  · `prefers-reduced-motion: reduce` — цикл не подключается вовсе,
 *    `data-in-view` никогда не появится. CSS (блок «ТАЧ ПРИ ВЫКЛЮЧЕННОМ
 *    ДВИЖЕНИИ» в `styles.css`) на этот случай возвращает плашку к «видна
 *    всегда»: правило «нет контента без движения» не нарушено — движения
 *    нет, а не нет цены.
 */
export function usePriceReveal() {
  useEffect(() => {
    if (!window.matchMedia('(hover: none)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const cards = Array.from(document.querySelectorAll<HTMLElement>('.offer-card'));
    if (!cards.length) return;

    // измерено ДО первого переключения — все карточки ещё закрыты (см. выше)
    const spots = cards.map((card) => {
      const r = card.getBoundingClientRect();
      return { card, top: r.top + window.scrollY, height: r.height };
    });
    const remeasure = () => {
      for (const s of spots) {
        if (s.card.hasAttribute('data-in-view')) continue; // открыта — высота сейчас не «закрытая»
        const r = s.card.getBoundingClientRect();
        s.top = r.top + window.scrollY;
        s.height = r.height;
      }
    };
    const ro = new ResizeObserver(remeasure);
    ro.observe(document.body);

    // ранний выход, когда страница стоит — тот же приём, что у `useFocusScrub`
    let lastScroll = -1;
    const tick = () => {
      const sy = window.scrollY;
      if (sy === lastScroll) return;
      lastScroll = sy;
      const vh = window.innerHeight;
      for (const s of spots) {
        const top = s.top - sy;
        const bottom = top + s.height;
        s.card.toggleAttribute('data-in-view', top >= 0 && bottom <= vh);
      }
    };
    const stopFrames = onFrame(tick);
    return () => {
      stopFrames();
      ro.disconnect();
    };
  }, []);
}
