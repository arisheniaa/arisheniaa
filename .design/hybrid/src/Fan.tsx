import { useState } from 'react';

/**
 * КАРТОЧНЫЙ ВЕЕР — общий компонент двух страниц.
 *
 * Появился в раскадровке (Ф33, `STORYBOARD.md` § 13), где владелица описала
 * его дословно: «анимация в виде карточного веера, чтобы когда наводишь
 * курсор на этот веер, он раскрывался фотографиями в ряд, а при наведении
 * курсора на конкретную фотографию — она увеличивалась в размере». Три
 * состояния:
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
 * Эстетически родственно `Rack.tsx` (стопка кадров, `.frame` без рамок и
 * теней) — физика другая: там перетаскивание пальцем/мышью в любую сторону,
 * здесь реакция на курсор без перетаскивания, разворот ВСЕЙ стопки в ряд.
 * `useRack.ts` намеренно не переиспользован: та пружинная система заточена
 * под жест захвата и броска, здесь его нет вовсе.
 *
 * ТАЧ / REDUCED-MOTION — правило «веер должен показывать все фото читаемо и
 * без потери контента»: `useFanMode()` проверяет, доступно ли настоящее
 * наведение тонким указателем (`(hover: hover) and (pointer: fine)`) и не
 * выключено ли движение. Если НЕТ — веер рендерится СРАЗУ развёрнутым в ряд
 * (`data-expanded` стоит перманентно), без обязательного жеста. Отдельное
 * увеличение одной фотографии на таком вводе просто не происходит — это не
 * потеря контента (все кадры уже видны целиком), а отсутствие одной
 * микро-анимации, для которой на тач-экране нет физического действия.
 *
 * Клавиатура: контейнер фокусируем (`tabIndex=0`), `onFocus` разворачивает
 * веер так же, как наведение, — он доступен и без мыши.
 *
 * Классы остались с приставкой `sb-` (`.sb-fan`, `.sb-fan-item`), хотя жить
 * они переехали в общий `styles.css`. Это НЕ недосмотр: по этим именам
 * `scripts/selfcheck-storyboard.mjs` меряет веер в четырнадцати местах, и
 * переименование ради красоты стоило бы правки проверочного скрипта без
 * единого выигрыша на экране. Имя — контракт с самопроверкой.
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

function computeFanMode(): 'stack' | 'flat' {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  return reduce || !canHover ? 'flat' : 'stack';
}

/* Ленивый инициализатор `useState(computeFanMode)` — тот же приём и по той же
   причине, что в `NavHint.tsx` (`measureTarget`): значение считается СИНХРОННО
   на первом рендере, а не в эффекте после первой отрисовки. Иначе на каждой
   загрузке веер на один кадр рисовался бы в режиме по умолчанию, пока эффект
   его не поправит, — заметный слом раскладки, а не вопрос чистоты кода. */
function useFanMode(): 'stack' | 'flat' {
  const [mode] = useState(computeFanMode);
  return mode;
}

export function Fan({
  photos,
  label,
  /** `compact` — вариант для карточки услуги на главной: те же три состояния,
   *  меньше размеры (см. `.sb-fan--compact` в `styles.css`). Веер там стоит
   *  рядом с текстом внутри карточки, а не один на всю ширину экрана
   *  результата, и в полном размере развёрнутый ряд из шести кадров не
   *  помещался бы в отведённую ему половину. */
  variant = 'full',
}: {
  photos: FanPhoto[];
  label: string;
  variant?: 'full' | 'compact';
}) {
  const mode = useFanMode();
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
  hot,
  canHot,
  onHot,
}: {
  p: FanPhoto;
  index: number;
  total: number;
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
            loading="eager"
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
