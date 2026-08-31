/**
 * РАЗВИЛКА «ДИЗАЙН / ФОТОГРАФИЯ» (Ф67).
 *
 * Владелица, постановка дословно: «при нажатии на ссылку arisheniaa.ru
 * пользователю открывается страница с моей фотографией и коротким описанием…
 * и две ссылки под ним… при нажатии на ссылку "Узнать больше про фотографию"
 * лендинг бы опускался вниз и показывался мой сайт с фото, который существует
 * сейчас. при нажатии "Узнать больше про дизайн" лендинг бы опускался вниз
 * также, как с фото, но лендинг был бы другой».
 *
 * КАК ЭТО УСТРОЕНО. Развилка — не отдельная страница, а полноэкранная штора
 * (`.gate`, styles.css) ПОВЕРХ уже отрисованного сайта. Сайт под ней стоит
 * целиком с первого кадра: для поисковика и скринридера главная осталась
 * главной, штора ничего не вынимает из документа. Выбор «фотография» просто
 * роняет штору вниз — под ней тот самый сайт, ноль переходов. Выбор «дизайн»
 * уводит на настоящую вторую страницу `/design.html` (отдельная точка входа
 * сборки, как `storyboard.html`), и штора падает уже ТАМ — первый кадр той
 * страницы выглядит ровно как развилка, поэтому переход читается как одно
 * движение, хотя между кликом и падением сменился документ.
 *
 * КОГДА РАЗВИЛКА НЕ ПОКАЗЫВАЕТСЯ — два случая, оба осознанные:
 *  · адрес с якорем (`/#uslugi`, `/#kontakt`…) — человек пришёл не «на
 *    сайт», а В МЕСТО на странице: по ссылке из навигации второй страницы,
 *    из закладки, из переписки. Ставить ему дверь поперёк дороги — значит
 *    сломать все внутренние ссылки сайта разом;
 *  · выбор уже сделан в этой сессии (`sessionStorage`) — иначе каждый клик
 *    «Главная» в навигации встречал бы гостя развилкой заново. Сессия, а не
 *    `localStorage`: владелица просила показывать развилку «при нажатии на
 *    ссылку arisheniaa.ru», то есть при входе, — новый визит начинается с
 *    неё, а внутри визита она не повторяется.
 *
 * ДОСТУПНОСТЬ. Пока штора стоит, остальным лендмаркам страницы ставится
 * `inert`: табом нельзя уйти в контент, которого не видно, скринридер не
 * читает два сайта разом. Прокрутка на это время заперта. При
 * `prefers-reduced-motion` штора снимается без полёта (см. styles.css).
 */
import { useEffect, useRef, useState } from 'react';
import { copy } from './copy';
/* `Stars` не импортируются с правки «убери звездочки» (второе сообщение
   Ф67) — развилка единственное место сайта, где россыпи быть не должно. */
import { Name } from './Name';

/* Ключи сессии. `KEY` — выбор сделан (значение — какой), `DROP` — просьба
   к странице дизайна уронить штору после перехода. Ключ читает и скрипт
   съёмки скриншотов (`export-design-shots.mjs`), чтобы в кадр портфолио
   не попала сама развилка, — при переименовании менять оба места. */
const KEY = 'gate-f67';
const DROP = 'gate-f67-drop';

/* `sessionStorage` за try/catch: в приватных режимах и при задранных
   настройках приватности само обращение к хранилищу кидает исключение, и
   без защиты развилка уронила бы весь рендер страницы. Ошибка чтения
   трактуется как «выбора не было» — показать развилку лишний раз безопаснее,
   чем не показать никогда. */
function read(k: string): string | null {
  try {
    return sessionStorage.getItem(k);
  } catch {
    return null;
  }
}
function write(k: string, v: string) {
  try {
    sessionStorage.setItem(k, v);
  } catch {}
}
function remove(k: string) {
  try {
    sessionStorage.removeItem(k);
  } catch {}
}

const reduceMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function Gate({ page }: { page: 'home' | 'design' }) {
  /* Начальное состояние считается один раз, до первого кадра — штора либо
     стоит с самого начала, либо её не было вовсе; мигнуть и исчезнуть она
     не может. На главной — по адресу и по сессии (см. шапку файла), на
     странице дизайна — только если сюда пришли с развилки (`DROP`). */
  const [state, setState] = useState<'up' | 'down' | 'gone'>(() => {
    if (page === 'home') {
      return !window.location.hash && read(KEY) === null ? 'up' : 'gone';
    }
    return read(DROP) === '1' ? 'up' : 'gone';
  });
  const node = useRef<HTMLDivElement>(null);

  /* Страница дизайна: штора уже стоит, просьба исполнена — флаг снимается
     сразу (перезагрузка не должна повторять падение), падение через два
     кадра: первый кадр страница обязана простоять КАК развилка, иначе
     переход с главной читается не «штора продолжила падать», а «что-то
     мигнуло». Задержка 350 мс даёт странице под шторой дорисоваться. */
  useEffect(() => {
    if (page !== 'design' || state !== 'up') return;
    remove(DROP);
    const t = window.setTimeout(() => {
      setState(reduceMotion() ? 'gone' : 'down');
    }, 350);
    return () => window.clearTimeout(t);
    // `state` в зависимостях не нужен: эффект стартует ровно один раз, из
    // начального 'up'; повторных подъёмов шторы не существует.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  /* Пока штора стоит — прокрутка заперта, остальные лендмарки inert.
     `inert` ставится руками на соседей по DOM, а не пропсом: штора живёт
     внутри того же дерева, что и сайт, и React-состояние сайта об этом
     знать не обязано — снятие шторы возвращает всё как было. */
  useEffect(() => {
    if (state !== 'up') return;
    const doc = document.documentElement;
    const prev = doc.style.overflow;
    doc.style.overflow = 'hidden';
    const others = Array.from(document.querySelectorAll('header, main, footer'));
    others.forEach((el) => el.setAttribute('inert', ''));
    return () => {
      doc.style.overflow = prev;
      others.forEach((el) => el.removeAttribute('inert'));
    };
  }, [state]);

  /* Снятие из дерева — по концу перехода transform, а не таймером той же
     длительности: таймер разойдётся с CSS при первой же правке 900 мс.
     Страховка на случай, когда `transitionend` не придёт вовсе (вкладка в
     фоне, старый браузер), — тоже есть, с запасом к CSS-длительности. */
  useEffect(() => {
    if (state !== 'down') return;
    const el = node.current;
    /* Фильтр по цели и свойству ОБЯЗАТЕЛЕН: `transitionend` всплывает, и
       без него первым до обработчика долетал конец перехода нажатой ссылки
       (у `.link-major` переход подчёркивания и нажатия) — штора снималась
       из дерева через десятки миллисекунд после клика, БЕЗ полёта. Поймано
       замером transform по таймлайну, не глазами: кадр «вроде упала» и кадр
       «исчезла мгновенно» на скриншоте неотличимы. */
    const done = (e?: TransitionEvent) => {
      if (e && (e.target !== el || e.propertyName !== 'transform')) return;
      setState('gone');
    };
    const fallback = () => setState('gone');
    el?.addEventListener('transitionend', done as EventListener);
    const t = window.setTimeout(fallback, 1400);
    return () => {
      el?.removeEventListener('transitionend', done as EventListener);
      window.clearTimeout(t);
    };
  }, [state]);

  if (state === 'gone') return null;

  const choosePhoto = (e: React.MouseEvent) => {
    /* Модифицированный клик (Ctrl/Cmd/Shift/средняя кнопка) не
       перехватывается: человек просил новую вкладку — ссылка настоящая
       (`/#main`), пусть браузер её и откроет. Выбор при этом записывается:
       в новой вкладке той же сессии развилка не нужна. */
    write(KEY, 'photo');
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    setState(reduceMotion() ? 'gone' : 'down');
  };

  const chooseDesign = () => {
    /* Переход НЕ перехватывается — уходим на настоящий адрес, а штора
       падает уже на странице дизайна (см. шапку файла). */
    write(KEY, 'design');
    write(DROP, '1');
  };

  return (
    <div ref={node} className={`gate ${state === 'down' ? 'is-down' : ''}`}>
      {/* Прокрутка ВНУТРИ шторы — на низком окне (телефон лёжа) контент
          выше экрана, и без неё ссылки оказались бы недосягаемы. */}
      <div className="relative h-full overflow-y-auto">
        {/* Имя — как в шапке сайта, той же строкой и с той же звездой:
            развилка закрывает шапку собой (z-index) и обязана вернуть
            странице подпись, кто это. Не ссылка — как и в шапке (Ф28). */}
        <div className="px-[var(--gutter)] py-[clamp(0.9rem,1.6vw,1.4rem)]">
          <Name />
        </div>

        {/* КОМПОЗИЦИЯ — правка владелицы вторым сообщением Ф67: «сделай
            страницу с разделением чуть более строгой: убери звездочки…
            текст сделай по середине, фотография пусть будет над текстом».
            Было: портрет слева, текст справа, россыпь `Stars` фоном.
            Стало: один центральный столбец — портрет, под ним приветствие,
            вопрос, две ссылки; звёзд нет совсем (снят и импорт — развилка
            единственное место сайта, где их не должно быть). */}
        <section
          aria-label="Дизайн или фотография"
          className="relative flex min-h-[calc(100svh-4.5rem)] items-center px-[var(--gutter)] pb-[clamp(2.5rem,8vh,5rem)]"
        >
          <div className="relative z-10 mx-auto flex w-full max-w-[44rem] flex-col items-center text-center">
            {/* Портрет — тот же кадр, что в «Кто снимает» (обоснование
                выбора — у зоны `copy.gate`). Потолок ширины умеренный:
                кадр стоит НАД текстом, и рослая фотография вытолкнула бы
                ссылки за нижний край невысокого окна. */}
            {/* Без `data-focus="in"`: скраб наводки на резкость считает
                позицию от прокрутки, а под шторой прокрутка заперта —
                кадр остался бы размытым навсегда (поймано на живой
                странице, не предугадано). Reveal-у это не мешает. */}
            <figure className="reveal m-0">
              <div className="overflow-hidden">
                <img
                  src={copy.about.photo}
                  width={1200}
                  height={800}
                  alt={copy.about.alt}
                  className="frame block w-full max-w-[min(21rem,72vw)]"
                  decoding="async"
                />
              </div>
            </figure>

            <p
              className="reveal t-h2 mt-[clamp(1.6rem,4vh,2.6rem)] max-w-[26ch] text-balance"
              style={{ ['--i' as string]: 1 }}
            >
              {copy.gate.hello}
            </p>
            <p
              className="reveal t-lead mt-[clamp(1rem,2.6vh,1.6rem)] text-[color:var(--ink-soft)]"
              style={{ ['--i' as string]: 2 }}
            >
              {copy.gate.question}
            </p>

            {/* Две ссылки столбиком, порядок её: дизайн, фотография.
                Стоят как ссылки первого экрана главной — `link-major` с
                зоной касания. Столбик, не строка: это две равные двери,
                и на одной строке их разделял бы только зазор, а глазу
                нужен отдельный «этаж» на каждую. */}
            <div
              className="reveal mt-[clamp(1.6rem,4vh,2.4rem)] flex flex-col items-center gap-y-[clamp(0.8rem,2.2vh,1.3rem)]"
              style={{ ['--i' as string]: 3 }}
            >
              <a className="link-major link-tap t-h3" href="/design.html" onClick={chooseDesign}>
                {copy.gate.design}
              </a>
              <a className="link-major link-tap t-h3" href="/#main" onClick={choosePhoto}>
                {copy.gate.photo}
              </a>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
