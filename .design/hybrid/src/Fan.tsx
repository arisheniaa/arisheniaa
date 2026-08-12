import { useState } from 'react';
import { useRack } from './useRack';

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
 * ТРИ РЕЖИМА ВВОДА (правка билдера, не в `FACTS.md` — см. сообщение
 * коммита). Раньше `computeFanMode()` сводил ДВЕ разные причины к одному
 * `'flat'`: «нет точного курсора» ИЛИ «движение выключено». Владелица,
 * отвечая на предложенный вариант (сетку миниатюр) для тач-экрана: «Стопку
 * можно листать пальцем, как фото на главной» — то есть для тача с
 * разрешённым движением нужен ТРЕТИЙ, отдельный режим, не «сетка» и не
 * «раскрыть в ряд по тапу», а рэковская механика перетаскивания. Причины
 * развелись:
 *
 *  · курсор точный, движение разрешено — `'stack'`, три состояния выше,
 *    БЕЗ ИЗМЕНЕНИЙ;
 *  · грубый указатель (тач/планшет), движение разрешено — НОВОЕ, `'drag'`:
 *    та же физика, что у `Rack.tsx` (`useRack()`), см. `FanDrag` ниже;
 *  · движение выключено (`prefers-reduced-motion: reduce`), НЕЗАВИСИМО от
 *    типа ввода — `'flat'`, как и было: статичная сетка, все кадры видны
 *    разом без жеста. Это не сузилось до «только мышь с reduced-motion» —
 *    любой ввод при выключенном движении по-прежнему даёт `'flat'`, просто
 *    теперь «тач» сам по себе больше не подразумевает «выключено».
 *
 * Так и должно быть: драг-жест ТРЕБУЕТ движения (пружина, инерция броска),
 * а `prefers-reduced-motion: reduce` запрещает именно движение — значит
 * жеста на этом сочетании быть не должно вовсе, и `'flat'` (статичная сетка
 * без жеста) остаётся единственно верным состоянием для него, тач это или
 * мышь. Правило «нет контента без движения» не нарушено ни в одном из трёх
 * режимов: `'stack'` показывает все кадры по наведению, `'drag'` — по
 * перетаскиванию и кнопке/клавиатуре, `'flat'` — сразу все разом.
 *
 * ПОЧЕМУ `FanDrag` — ОТДЕЛЬНЫЙ КОМПОНЕНТ, А НЕ ВЕТКА ВНУТРИ ОДНОГО. Правило
 * хуков: `useRack()` внутри себя вызывает `useEffect`/`useRef`/`useState`
 * пружинного цикла, и звать его условно («если режим drag») внутри ОДНОГО
 * компонента значило бы вызывать хук то тут, то не тут — нарушение порядка
 * хуков между рендерами. `Fan()` сам вызывает только `useFanMode()` (один
 * хук, значение стабильно на весь жизненный цикл экземпляра — читай ниже
 * про ленивый инициализатор) и рендерит ОДИН из двух самостоятельных
 * компонентов, у каждого свой набор хуков, стабильный по построению.
 *
 * Клавиатура: `'stack'`/`'flat'` — контейнер фокусируем (`tabIndex=0`),
 * `onFocus` раскрывает ряд так же, как наведение. `'drag'` — своя раскладка
 * клавиатуры внутри `FanDrag` (стрелка вправо/пробел — «следующий кадр»,
 * тот же приём, что в `Rack.tsx`).
 *
 * Классы `.sb-fan`/`.sb-fan-item` остались с приставкой `sb-`, хотя жить
 * они переехали в общий `styles.css`. Это НЕ недосмотр: по этим именам
 * `scripts/selfcheck-storyboard.mjs` меряет веер (режимы `'stack'`/`'flat'`)
 * в четырнадцати местах, и переименование ради красоты стоило бы правки
 * проверочного скрипта без единого выигрыша на экране. Имя — контракт с
 * самопроверкой. `'drag'` этот контракт не трогает: у него своя разметка
 * (`.sb-fan-drag-*`, `data-layer`) — раскладка рэка и раскладка веера-в-ряд
 * устроены принципиально по-разному (абсолютные слои против flex-стопки),
 * натягивать одно имя класса на оба означало бы держать в одном селекторе
 * два конфликтующих набора правил позиционирования. Тач-раздел самопроверки
 * (5b) адаптирован под новый режим отдельно — см. комментарий там же.
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

type FanMode = 'stack' | 'flat' | 'drag';

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
  return canHover ? 'stack' : 'drag';
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

  if (mode === 'drag') {
    return <FanDrag {...props} />;
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

/* ═══ 'drag' — ВЕЕР НА ТАЧ-ЭКРАНЕ, ПЕРЕЛИСТЫВАНИЕ ПАЛЬЦЕМ КАК У РЭКА ═══════
   Владелица, отвечая на предложенный вариант (сетку миниатюр): «Стопку
   можно листать пальцем, как фото на главной» — явный выбор рэковской
   механики, не сетки и не разворота в ряд по тапу.

   ФИЗИКА НЕ НОВАЯ. `useRack(count)` уже обобщена по числу кадров (лок,
   Ф19: «пул фотографий … не обязательно из одной серии») — здесь просто
   второй потребитель той же функции, кроме `Rack.tsx`. Разметка слоя — тот
   же приём: `data-layer` на каждом кадре, `rack.ref` на контейнер физики,
   `rack.top`/`rack.held`/`rack.advance()` определяют, что показывать и что
   слушать. `rack.still` (реакция `useRack` на `prefers-reduced-motion`) не
   обрабатывается здесь отдельной веткой: `FanDrag` монтируется только когда
   `computeFanMode()` уже решил, что движение разрешено, — та же самая
   проверка `matchMedia('(prefers-reduced-motion: reduce)')`, тем же кадром
   выполнения, что и внутри `useRack`. Держать вторую копию ветки «сетка при
   reduced-motion» здесь было бы дублированием одной и той же логики в двух
   местах — она уже есть в `FanStack`.

   РАЗМЕТКА СЛОЯ НЕ ПЕРЕИСПОЛЬЗУЕТ `.sb-fan-item`: тот класс несёт
   flex-раскладку стопки-внахлёст (margin-left/rotate/transition под
   разворот в ряд) — свойства, с которыми пришлось бы драться, натягивая
   поверх них абсолютное позиционирование рэка. Новый класс —
   `.sb-fan-drag-item`, `data-layer` вместо `--i`/`--z`. `data-*` факты
   кадра (`p.data`) переданы ТЕ ЖЕ, что и в стопке/сетке — контракт
   самопроверки про подбор кадров (`data-format`/`data-material`/…) завязан
   на сами атрибуты, не на имя класса-обёртки.

   РАЗМЕР ПОДОБРАН ЗАМЕРОМ, НЕ НА ГЛАЗ (Playwright, `.offer-card` на
   375/390 px): реальное место под веер в карточке услуги — 339/354 px
   (`getBoundingClientRect` контейнера `.reveal.grow` карточки). Кадр рэка
   в CSS — `min(74%, …)` этой ширины: узнаваемый кадр-объект с полями по
   бокам, не край в край (лок, таблица запретов: «фул-блид — не более чем
   одиночная кульминация»). Кап разный по варианту: компакту (карточка
   услуги, сосед текста) — 18rem, чтобы не спорить за место с текстом даже
   на широких тач-планшетах ниже `lg:`; полному (экран результата
   раскадровки, единственный крупный объект экрана) — 26rem. Проценты, а не
   `vw`: контейнер `.sb-fan` — прямой ребёнок `.reveal.grow`/`.sb-step`,
   у которого в потоке уже есть настоящая раскладочная ширина на любой
   ширине экрана, включая `lg:`-раскладку карточки «в ряд» — `vw`-подход
   потребовал бы отдельного числа на каждый порог, `%` считает сам.

   СЧЁТЧИК И КНОПКА — тот же узел, что у `Rack.tsx` (`.rack-next`, те же
   44×44 px зоны касания из блока «ЗОНЫ КАСАНИЯ» в `styles.css`, они уже
   покрывают этот класс). Доступность — как у рэка: `role="group"`,
   `aria-label`, `tabIndex`, `ArrowRight`/`Space` продвигают стопку с
   клавиатуры и скринридера так же, как палец. */
function FanDrag({ photos, label, loading, variant }: FanRenderProps) {
  const rack = useRack(photos.length);

  return (
    <div
      className={`sb-fan sb-fan-drag${variant === 'compact' ? ' sb-fan--compact' : ''}`}
      data-mode="drag"
    >
      <div
        ref={rack.ref}
        role="group"
        aria-label={label}
        tabIndex={0}
        className="sb-fan-drag-stack relative aspect-3/4 w-full touch-pan-y"
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') {
            e.preventDefault();
            rack.advance();
          }
        }}
      >
        {photos.map((p, i) => (
          <FanDragItem key={p.key} p={p} index={i} top={rack.top} loading={loading} />
        ))}
      </div>

      {/* Счётчик и кнопка — вне `role="group"` стопки, как в `Rack.tsx`:
          цифры, не подписи (подписей под кадрами по-прежнему нет, Ф37). */}
      <div className="sb-fan-drag-controls mt-[clamp(0.7rem,1.6vw,1.1rem)] flex items-center justify-between">
        <p className="t-mono text-[color:var(--ink-mute)]">
          {String(rack.top + 1).padStart(2, '0')}
          <span className="opacity-45"> / {String(photos.length).padStart(2, '0')}</span>
        </p>
        <button type="button" onClick={rack.advance} aria-label="Следующий кадр" className="rack-next">
          <svg viewBox="0 0 24 12" width="26" height="13" aria-hidden="true" focusable="false">
            <path
              d="M0 6h21M16 1l5 5-5 5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="square"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}

function FanDragItem({
  p,
  index,
  top,
  loading,
}: {
  p: FanPhoto;
  index: number;
  top: number;
  loading: 'lazy' | 'eager';
}) {
  const [broken, setBroken] = useState(false);

  return (
    <figure
      data-layer={index}
      className="sb-fan-drag-item absolute inset-0 will-change-transform"
      aria-hidden={index !== top}
      {...(p.data ?? {})}
    >
      <div className="frame h-full w-full overflow-hidden" style={{ minHeight: broken ? 120 : undefined }}>
        {!broken ? (
          <img
            src={p.src}
            width={p.w}
            height={p.h}
            alt={index === top ? p.alt : ''}
            className="block h-full w-full object-cover"
            loading={loading}
            decoding="async"
            draggable={false}
            onError={() => setBroken(true)}
          />
        ) : (
          <p className="t-mono p-3 text-[color:var(--ink-mute)]">Кадр временно недоступен</p>
        )}
      </div>
    </figure>
  );
}
