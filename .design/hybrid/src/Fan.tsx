import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * КАРТОЧНЫЙ ВЕЕР — общий компонент двух страниц.
 *
 * Появился в раскадровке (Ф33, `STORYBOARD.md` § 13), где владелица описала
 * его дословно: «анимация в виде карточного веера, чтобы когда наводишь
 * курсор на этот веер, он раскрывался фотографиями в ряд, а при наведении
 * курсора на конкретную фотографию — она увеличивалась в размере». Три
 * состояния курсорной версии:
 *
 *  1. ПОКОЙ — фотографии сложены стопкой внахлёст, некрупно.
 *  2. НАВЕДЕНИЕ НА ВЕСЬ ВЕЕР — раскрывается в ряд, каждая видна целиком.
 *  3. НАВЕДЕНИЕ НА ОДНУ ФОТОГРАФИЮ ВНУТРИ РЯДА — она увеличивается.
 *
 * ВЫНЕСЕН ИЗ `storyboard/PhotoFan.tsx` в Ф40: «в творческой добавь побольше
 * фотографий и сделай анимацию веером, как в интерактиве придумать съемку».
 * «Как в интерактиве» — значит ТОТ ЖЕ веер, а не второй такой же: правило
 * «общее раньше частного». Здесь живёт вся механика, `PhotoFan` остался
 * тонкой обёрткой, которая знает про `StoryboardPhoto` и вешает на карточки
 * свои `data-*` для самопроверки, а главная зовёт `Fan` напрямую.
 *
 * ТРИ РЕЖИМА ВВОДА. `computeFanMode()` разводит две независимые причины —
 * каким указателем читают и разрешено ли движение:
 *
 *  · курсор точный, движение разрешено — `'stack'`: ряд раскрывается по
 *    наведению, кадр под указателем растёт. Без изменений с самого начала;
 *  · грубый указатель (тач, планшет), движение разрешено — `'tap'`: кадры
 *    лежат веером и видны все сразу, нажатие раскрывает выбранный кадр в
 *    центре экрана (`FanTap` ниже);
 *  · движение выключено (`prefers-reduced-motion: reduce`), НЕЗАВИСИМО от
 *    типа ввода — `'flat'`: статичная сетка, все кадры разом, без жеста.
 *
 * ИСТОРИЯ ТАЧ-РЕЖИМА, ЧТОБЫ ОНА НЕ ПОВТОРИЛАСЬ ПО КРУГУ. Сначала тач попадал
 * в `'flat'` вместе с выключенным движением — одна ветка на две разные
 * причины. Ф53 развела их и сделала для тача `'drag'`: стопка, которую
 * листают пальцем, по просьбе владелицы «стопку можно листать пальцем, как
 * фото на главной». Ф55 заменила `'drag'` на `'tap'` — её же правкой, уже
 * после того, как она увидела варианты показа кадров: «давай сделаем веером
 * всё-таки на мобильной версии, но с возможностью нажать на определённую
 * фотографию». Стопка ушла вместе с рэковской физикой: в стопке видно один
 * кадр, и «нажать на определённую фотографию» в ней не на что.
 *
 * Правило «нет контента без движения» не нарушено ни в одном режиме:
 * `'stack'` показывает все кадры по наведению, `'tap'` держит их на виду
 * сразу и раскрывает нажатием, `'flat'` показывает все разом статично.
 *
 * ПОЧЕМУ `FanTap` — ОТДЕЛЬНЫЙ КОМПОНЕНТ, А НЕ ВЕТКА ВНУТРИ ОДНОГО. Правило
 * хуков: у режимов разные наборы состояний (`FanStack` держит «ряд раскрыт»
 * и «кадр под курсором», `FanTap` — «какой кадр открыт» и ссылку на кнопку
 * для возврата фокуса), и звать их условно внутри одного компонента значило
 * бы менять порядок хуков между рендерами. `Fan()` вызывает только
 * `useFanMode()` — один хук, значение стабильно на весь жизненный цикл
 * экземпляра (см. ниже про ленивый инициализатор) — и рендерит ОДИН из двух
 * самостоятельных компонентов, у каждого свой стабильный набор хуков.
 *
 * Клавиатура: `'stack'`/`'flat'` — контейнер фокусируем (`tabIndex=0`),
 * `onFocus` раскрывает ряд так же, как наведение. `'tap'` — каждый кадр сам
 * по себе кнопка, то есть попадает в порядок табуляции и отвечает на
 * Enter/Space без единой особой строки; в раскрытом кадре работают стрелки
 * и Esc (см. `FanLightbox`).
 *
 * Классы `.sb-fan`/`.sb-fan-item` остались с приставкой `sb-`, хотя жить
 * они переехали в общий `styles.css`. Это НЕ недосмотр: по этим именам
 * `scripts/selfcheck-storyboard.mjs` меряет веер в четырнадцати местах, и
 * переименование ради красоты стоило бы правки проверочного скрипта без
 * единого выигрыша на экране. Имя — контракт с самопроверкой. `'tap'` этот
 * контракт не ломает, а продолжает: веер-нажатие использует ТУ ЖЕ
 * flex-раскладку внахлёст, что и `'stack'`, и потому берёт те же
 * `.sb-fan`/`.sb-fan-item`, добавляя к ним только `.sb-fan--tap` с иной
 * геометрией покоя. Драг-разметка (`.sb-fan-drag-*`, `data-layer`) снята
 * вместе с режимом. Тач-раздел самопроверки (5b) переписан под нажатие —
 * см. комментарий там же.
 */

export interface FanPhoto {
  /** стабильный ключ (в раскадровке — id кадра, на главной — имя файла) */
  key: string;
  src: string;
  alt: string;
  w: number;
  h: number;
  /** необязательные `data-*` для этой карточки (раскадровка меряет по ним подбор) */
  data?: Record<string, string>;
}

type FanMode = 'stack' | 'flat' | 'tap';

interface FanRenderProps {
  photos: FanPhoto[];
  label: string;
  loading: 'lazy' | 'eager';
  variant: 'full' | 'compact';
}

function computeFanMode(): FanMode {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return 'flat';
  const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  return canHover ? 'stack' : 'tap';
}

/* Ленивый инициализатор `useState(computeFanMode)` — тот же приём и по той же
   причине, что в `NavHint.tsx` (`measureTarget`): значение считается СИНХРОННО
   на первом рендере, а не в эффекте после первой отрисовки. Иначе на каждой
   загрузке веер на один кадр рисовался бы в режиме по умолчанию, пока эффект
   его не поправит, — заметный слом раскладки, а не вопрос чистоты кода. */
function useFanMode(): FanMode {
  const [mode] = useState(computeFanMode);
  return mode;
}

export function Fan({
  photos,
  label,
  /**
   * Когда грузить кадры. НАХОДКА Ф41, поймана замером `performance
   * .getEntriesByType('resource')` после жалобы «сайт прогружается с
   * небольшой задержкой»: на главной оказалось 13 картинок с `loading="eager"`,
   * и десять из них — кадры вееров услуг, то есть примерно на третьем экране
   * вниз. Они запрашивались наперегонки с первым экраном и отбирали у него
   * и соединения, и декодирование.
   *
   * `eager` здесь стоял с рождения компонента и был ПРАВ в раскадровке:
   * там веер появляется по нажатию «Начать» уже после прохода квиза, экран
   * результата рисуется сразу с кадрами, и ленивая загрузка дала бы пустые
   * рамки в момент показа. На главной веер лежит глубоко внизу, и то же
   * значение из правильного стало вредным.
   *
   * Поэтому не «поправил на lazy», а вынес в параметр со значением по
   * умолчанию `lazy`: у нового места использования поведение безопасное,
   * а раскадровка просит `eager` явно и с причиной (`PhotoFan.tsx`).
   */
  loading = 'lazy',
  /** `compact` — вариант для карточки услуги на главной: те же состояния,
   *  меньше размеры (см. `.sb-fan--compact` в `styles.css`). Веер там стоит
   *  рядом с текстом внутри карточки, а не один на всю ширину экрана
   *  результата, и в полном размере развёрнутый ряд из шести кадров не
   *  помещался бы в отведённую ему половину. */
  variant = 'full',
}: {
  photos: FanPhoto[];
  label: string;
  loading?: 'lazy' | 'eager';
  variant?: 'full' | 'compact';
}) {
  const mode = useFanMode();
  const props: FanRenderProps = { photos, label, loading, variant };

  if (mode === 'tap') {
    return <FanTap {...props} />;
  }
  return <FanStack {...props} mode={mode} />;
}

/* ═══ 'stack' / 'flat' — НАВЕДЕНИЕ КУРСОРОМ ИЛИ СТАТИЧНАЯ СЕТКА ════════════
   Прежнее тело `Fan()` целиком, без изменений в логике — сдвинулось в
   отдельный компонент, потому что режим `'drag'` теперь решает раньше, до
   вызова `useState` этого компонента (см. пояснение про порядок хуков
   выше по файлу). */
function FanStack({ photos, label, loading, variant, mode }: FanRenderProps & { mode: 'stack' | 'flat' }) {
  const [expanded, setExpanded] = useState(false);
  const [hot, setHot] = useState<string | null>(null);
  const alwaysExpanded = mode === 'flat';

  const openByMouse = (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    setExpanded(true);
  };
  const closeByMouse = (e: React.PointerEvent) => {
    if (alwaysExpanded) return;
    if (e.pointerType !== 'mouse') return;
    setExpanded(false);
    setHot(null);
  };

  return (
    <div
      className={`sb-fan${variant === 'compact' ? ' sb-fan--compact' : ''}`}
      role="group"
      aria-label={label}
      tabIndex={0}
      data-mode={mode}
      data-expanded={expanded || alwaysExpanded ? '' : undefined}
      onPointerEnter={openByMouse}
      onPointerLeave={closeByMouse}
      onFocus={() => setExpanded(true)}
      onBlur={(e) => {
        if (alwaysExpanded) return;
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setExpanded(false);
          setHot(null);
        }
      }}
    >
      {photos.map((p, i) => (
        <FanItem
          key={p.key}
          p={p}
          index={i}
          total={photos.length}
          loading={loading}
          hot={hot === p.key}
          canHot={expanded || alwaysExpanded}
          onHot={(v) => setHot(v ? p.key : (cur) => (cur === p.key ? null : cur))}
        />
      ))}
    </div>
  );
}

function FanItem({
  p,
  index,
  total,
  loading,
  hot,
  canHot,
  onHot,
}: {
  p: FanPhoto;
  index: number;
  total: number;
  loading: 'lazy' | 'eager';
  hot: boolean;
  canHot: boolean;
  onHot: (v: boolean) => void;
}) {
  const [broken, setBroken] = useState(false);

  return (
    <figure
      className="sb-fan-item"
      style={{ ['--i' as string]: index, ['--z' as string]: total - index }}
      data-hot={hot ? '' : undefined}
      {...(p.data ?? {})}
      onPointerEnter={(e) => {
        if (e.pointerType === 'mouse' && canHot) onHot(true);
      }}
      onPointerLeave={(e) => {
        if (e.pointerType === 'mouse') onHot(false);
      }}
    >
      <div className="frame overflow-hidden" style={{ minHeight: broken ? 120 : undefined }}>
        {!broken ? (
          <img
            src={p.src}
            width={p.w}
            height={p.h}
            alt={p.alt}
            className="block w-full"
            loading={loading}
            decoding="async"
            onError={() => setBroken(true)}
          />
        ) : (
          <p className="t-mono p-3 text-[color:var(--ink-mute)]">Кадр временно недоступен</p>
        )}
      </div>
      {/* Видимой подписи под кадром намеренно нет (Ф37, дословно: «не подписывай
          фотографии. пусть под снимками-референсами будет пусто»). Те же факты
          остаются в `data-*` на этом узле и в `alt` у `<img>` — не удалены
          вместе с подписью, потому что доказательство самопроверки («подбор
          реально фильтрует по ответам») и текст для читателя — разные вещи;
          первое не должно пострадать из-за решения про второе. */}
    </figure>
  );
}

/* ═══ 'tap' — ВЕЕР НА ТАЧ-ЭКРАНЕ, КАДР РАСКРЫВАЕТСЯ ПО НАЖАТИЮ ═════════════
   Владелица, ОТМЕНЯЯ собственное решение Ф53 («стопку можно листать пальцем,
   как фото на главной») после того, как увидела варианты показа кадров:
   «давай сделаем веером всё-таки на мобильной версии, но с возможностью
   нажать на определённую фотографию, чтобы она раскрывалась и выходила в
   центр для рассмотрения».

   ЧТО ЭТО МЕНЯЕТ ПО СУЩЕСТВУ. Ф53 показывала на тач СТОПКУ: виден верхний
   кадр, остальные под ним, палец их перелистывает. «Нажать на определённую
   фотографию» в стопке физически не на что — значит меняется не жест, а сама
   раскладка: кадры лежат ВЕЕРОМ и видны все сразу, каждый со своей полосой
   под палец. Поэтому рэковская физика (`useRack`) здесь не приглушена
   флагом, а не нужна вовсе: перелистывать больше нечего, кадры уже на виду.
   Драг-режим снят целиком вместе с разметкой и стилями — держать мёртвую
   ветку «на случай, если передумает» значило бы оставить в проекте код,
   который никто не исполняет и никто не проверяет.

   ПОЛОСА ПОД ПАЛЕЦ СЧИТАЕТСЯ, А НЕ ПОДБИРАЕТСЯ НА ГЛАЗ. Ширина видимой
   части каждого кадра зависит от того, сколько их в вейере: у карточки
   услуги это 3–5 кадров, у экрана результата — 5–7. Число кадров уезжает в
   CSS переменной `--n`, и `styles.css` сам делит на неё доступную ширину
   (блок «ВЕЕР НА ТАЧ — НАЖАТИЕ РАСКРЫВАЕТ КАДР»). Там же стоит нижняя
   граница полосы: если кадров столько, что каждому не остаётся зоны касания
   в 44 px из блока «ЗОНЫ КАСАНИЯ», веер не сжимается дальше, а начинает
   прокручиваться вбок — правило зоны касания сильнее желания уместить всё
   в один экран.

   `--n` отдаётся как `max(2, …)`: при одном кадре делитель `n − 1` обратился
   бы в ноль и вся формула стала бы невалидной. Одиночному кадру наложение
   всё равно не нужно — `:first-child` не получает отрицательного отступа.

   КАЖДЫЙ КАДР — `<button>`, А НЕ `<figure>` С ОБРАБОТЧИКОМ. Это то же
   правило, по которому в проекте живёт `.rack-next`: то, что нажимают,
   обязано быть кнопкой — иначе оно не попадает в порядок табуляции, не
   отвечает на Enter/Space и не объявляется скринридером как нажимаемое.
   `data-*` факты кадра (`p.data`) остаются на `<figure>`, ровно как в
   стопке и в сетке: контракт самопроверки про подбор кадров завязан на сами
   атрибуты, не на то, чем обёрнут кадр. */
function FanTap({ photos, label, loading, variant }: FanRenderProps) {
  const [open, setOpen] = useState<number | null>(null);
  /* Кнопка, которой открыли просмотр: по закрытию фокус обязан вернуться
     именно на неё, а не в начало страницы. Ref, не состояние, — от неё не
     зависит ни один кадр отрисовки. */
  const opener = useRef<HTMLButtonElement | null>(null);

  const close = useCallback(() => {
    const btn = opener.current;
    setOpen(null);
    btn?.focus();
  }, []);

  return (
    <>
      <div
        className={`sb-fan sb-fan--tap${variant === 'compact' ? ' sb-fan--compact' : ''}`}
        role="group"
        aria-label={label}
        data-mode="tap"
        style={{ ['--n' as string]: Math.max(2, photos.length) }}
      >
        {photos.map((p, i) => (
          <FanTapItem
            key={p.key}
            p={p}
            index={i}
            total={photos.length}
            loading={loading}
            onOpen={(btn) => {
              opener.current = btn;
              setOpen(i);
            }}
          />
        ))}
      </div>
      {open !== null && <FanLightbox photos={photos} index={open} onIndex={setOpen} onClose={close} />}
    </>
  );
}

function FanTapItem({
  p,
  index,
  total,
  loading,
  onOpen,
}: {
  p: FanPhoto;
  index: number;
  total: number;
  loading: 'lazy' | 'eager';
  onOpen: (btn: HTMLButtonElement) => void;
}) {
  const [broken, setBroken] = useState(false);

  return (
    <figure
      className="sb-fan-item sb-fan-tap-item"
      style={{ ['--i' as string]: index, ['--z' as string]: total - index }}
      {...(p.data ?? {})}
    >
      <button
        type="button"
        className="sb-fan-tap-btn frame"
        /* Имя даётся номером, а не подписью к кадру: подписей под снимками на
           этом сайте нет по прямому решению Ф37, и придумывать их здесь ради
           доступности значило бы обойти это решение с чёрного хода. Номер —
           та же валюта, что у счётчика рэка. */
        aria-label={`Рассмотреть кадр ${index + 1} из ${total}`}
        onClick={(e) => onOpen(e.currentTarget)}
      >
        {!broken ? (
          <img
            src={p.src}
            width={p.w}
            height={p.h}
            alt={p.alt}
            className="block h-full w-full object-cover"
            loading={loading}
            decoding="async"
            draggable={false}
            onError={() => setBroken(true)}
          />
        ) : (
          <span className="t-mono block p-3 text-[color:var(--ink-mute)]">Кадр временно недоступен</span>
        )}
      </button>
    </figure>
  );
}

/* ═══ ПРОСМОТР КАДРА КРУПНО ════════════════════════════════════════════════
   «Раскрывалась и выходила в центр для рассмотрения» — центр ЭКРАНА, а не
   центр веера: кадр в карточке услуги физически не может стать крупным,
   оставаясь внутри карточки шириной в треть экрана. Поэтому слой
   фиксированный, поверх всего.

   `z-index: 70` — выше зерна (оно на 60, `.grain-veil`): зерно лежит поверх
   всей страницы, и кадр, открытый «для рассмотрения», не должен смотреть
   сквозь него.

   ПРОКРУТКА СТРАНИЦЫ ГАСИТСЯ НА `<html>`, А НЕ НА `<body>`. Замер: у этого
   документа прокручивается именно корневой элемент (`document
   .scrollingElement` — `HTML`, у `body` собственный `overflow: hidden auto`
   от правила `overflow-x` в базовом слое). Гасить `body` было бы обычным
   рефлексом и не дало бы ничего: страница продолжила бы ехать под открытым
   кадром.

   ВОЗВРАТ ФОКУСА И ESC — обязательная часть, а не вежливость: слой
   перекрывает страницу целиком, и без Esc с клавиатуры из него нет выхода,
   а без возврата фокуса после закрытия чтение продолжится не с того места,
   где читатель был.

   Стрелки влево/вправо и кнопки листания добавлены сверх просьбы по простой
   причине: закрыть просмотр, попасть пальцем в следующую узкую полосу веера
   и открыть её снова — три действия там, где достаточно одного. */
function FanLightbox({
  photos,
  index,
  onIndex,
  onClose,
}: {
  photos: FanPhoto[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const p = photos[index];
  const many = photos.length > 1;

  useEffect(() => {
    closeRef.current?.focus();
    const root = document.documentElement;
    const было = root.style.overflow;
    root.style.overflow = 'hidden';
    return () => {
      root.style.overflow = было;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (many && (e.key === 'ArrowRight' || e.key === 'ArrowDown')) {
        e.preventDefault();
        onIndex((index + 1) % photos.length);
      } else if (many && (e.key === 'ArrowLeft' || e.key === 'ArrowUp')) {
        e.preventDefault();
        onIndex((index - 1 + photos.length) % photos.length);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [index, many, onClose, onIndex, photos.length]);

  /* ═══ ПОРТАЛ В `<body>` — НЕ УКРАШЕНИЕ, А ЕДИНСТВЕННЫЙ РАБОЧИЙ СПОСОБ ══════
     НАХОДКА (поймана кадром, не рассуждением): в первой редакции слой
     рендерился на месте, внутри веера, и на экране получалось, что
     затемнение накрывает только КАРТОЧКУ УСЛУГИ, а не страницу, а сам кадр
     вылезает за её края. Причина — `Tilt.tsx`: он держит на карточке
     `transform`, а элемент с `transform` становится точкой отсчёта для
     `position: fixed` внутри себя. То есть `inset: 0` честно раскрывался на
     весь «экран» — просто экраном для него была карточка.

     Лечится не подбором чисел и не `z-index`, а тем, что слой физически
     переносится в `<body>`, где никакого `transform` над ним нет. На экране
     результата раскадровки веер живёт без тилта, и там прежняя редакция
     работала бы — но держать поведение, зависящее от того, есть ли случайно
     трансформация у предка, нельзя: тилт добавят соседнему блоку, и слой
     сломается снова, молча. */
  return createPortal(
    <div
      className="fan-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label="Кадр крупно"
      /* Закрытие по фону — только когда нажали ИМЕННО фон, а не всплывший
         клик с самого кадра или кнопок. */
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <figure className="fan-lightbox-frame">
        <img src={p.src} width={p.w} height={p.h} alt={p.alt} decoding="async" draggable={false} />
      </figure>

      <button ref={closeRef} type="button" className="fan-lightbox-close" onClick={onClose} aria-label="Закрыть">
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
          <path d="M4 4l16 16M20 4L4 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="square" />
        </svg>
      </button>

      {many && (
        <>
          <button
            type="button"
            className="fan-lightbox-nav fan-lightbox-prev"
            onClick={() => onIndex((index - 1 + photos.length) % photos.length)}
            aria-label="Предыдущий кадр"
          >
            <svg viewBox="0 0 24 12" width="26" height="13" aria-hidden="true" focusable="false">
              <path d="M24 6H3M8 1L3 6l5 5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
            </svg>
          </button>
          <button
            type="button"
            className="fan-lightbox-nav fan-lightbox-next"
            onClick={() => onIndex((index + 1) % photos.length)}
            aria-label="Следующий кадр"
          >
            <svg viewBox="0 0 24 12" width="26" height="13" aria-hidden="true" focusable="false">
              <path d="M0 6h21M16 1l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
            </svg>
          </button>
          <p className="fan-lightbox-count t-mono" aria-live="polite">
            {String(index + 1).padStart(2, '0')}
            <span className="opacity-45"> / {String(photos.length).padStart(2, '0')}</span>
          </p>
        </>
      )}
    </div>,
    document.body,
  );
}
