import { useState } from 'react';
import type { StoryboardPhoto } from './types';
import { normalizeOccasionTags } from './pick';

/**
 * КАРТОЧНЫЙ ВЕЕР — РЕДАКЦИЯ 4 (Ф33, `STORYBOARD.md` § 13). Заменяет
 * асимметричную сетку результата (`RESULT_LAYOUT` редакций 1–3). Владелица
 * дословно: «референсы из моих съемок [не должны] выглядеть такими крупными…
 * анимация в виде карточного веера, чтобы когда наводишь курсор на этот веер,
 * он раскрывался фотографиями в ряд, а при наведении курсора на конкретную
 * фотографию — она увеличивалась в размере». Три состояния:
 *
 *  1. ПОКОЙ — фотографии сложены стопкой внахлёст, некрупно.
 *  2. НАВЕДЕНИЕ НА ВЕСЬ ВЕЕР — раскрывается в ряд, каждая видна целиком.
 *  3. НАВЕДЕНИЕ НА ОДНУ ФОТОГРАФИЮ ВНУТРИ РЯДА — она увеличивается.
 *
 * Эстетически родственно `Rack.tsx` главной (стопка кадров, `.frame` без
 * рамок/теней) — физика другая: там перетаскивание пальцем/мышью в любую
 * сторону, здесь реакция на курсор без перетаскивания, разворот ВСЕЙ стопки
 * в ряд. Код `useRack.ts` намеренно не переиспользован дословно — та пружинная
 * система заточена под жест захвата/броска, здесь его нет вовсе.
 *
 * ТАЧ / REDUCED-MOTION — правило «фан должен показывать все фото читаемо и
 * без потери контента»: `useFanMode()` определяет, доступен ли настоящий
 * hover тонким указателем (`(hover: hover) and (pointer: fine)`) и не выключено
 * ли движение (`prefers-reduced-motion: reduce`). Если НЕТ (тач-экран без
 * hover, ИЛИ reduce-motion) — веер рендерится СРАЗУ развёрнутым в ряд
 * (`data-expanded` стоит перманентно), без обязательного жеста: это и есть
 * деградация «разворот по тапу вместо hover, или сразу разложенный ряд» —
 * выбран второй вариант (проще, надёжнее, ни один кадр не спрятан за жестом,
 * которого может не быть). На таких устройствах отдельное увеличение по
 * наведению на одну фотографию просто не происходит (у тача нет hover) — это
 * не потеря контента (все фото уже видны целиком), только отсутствие одной
 * микро-анимации, для которой на тач-экране и нет физического действия.
 *
 * Клавиатура: контейнер фокусируем (`tabIndex=0`), `:focus`/`onFocus`
 * разворачивает веер так же, как наведение курсора — веер доступен и без
 * мыши.
 *
 * Атрибуты `data-*` на каждой карточке — те же, что были у `ResultFrame`
 * редакций 1–3 (`data-format`/`data-material`/`data-place-category`/
 * `data-look`/`data-occasion`), плюс НОВЫЙ `data-place-raw` (редакция 4,
 * нужен самопроверке ловить бонус/ослабление фильтра «мужская» — метка живёт
 * в сыром `место`, не в `местоКатегория`, см. `pick.ts`). Не декоративны: по
 * ним самопроверка меряет, что подбор действительно фильтрует по ответам.
 */

function computeFanMode(): 'stack' | 'flat' {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  return reduce || !canHover ? 'flat' : 'stack';
}

/* Ленивый инициализатор `useState(computeFanMode)` — тот же приём и по той же
   причине, что в `NavHint.tsx` (`measureTarget`): значение считается СИНХРОННО
   на первом рендере, а не в эффекте после первой отрисовки. Иначе на каждой
   загрузке экрана результата веер на один кадр рисовался бы в РЕЖИМЕ ПО
   УМОЛЧАНИЮ до того, как эффект успевал бы его поправить — заметный слом
   раскладки, а не просто «мнение о чистоте кода». */
function useFanMode(): 'stack' | 'flat' {
  const [mode] = useState(computeFanMode);
  return mode;
}

export function PhotoFan({ photos }: { photos: StoryboardPhoto[] }) {
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
      className="sb-fan"
      role="group"
      aria-label={`Фотографии из моих съёмок, ${photos.length} штук — наведите курсор или сфокусируйте, чтобы увидеть все целиком`}
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
          key={p.id}
          p={p}
          index={i}
          total={photos.length}
          hot={hot === p.id}
          canHot={expanded || alwaysExpanded}
          onHot={(v) => setHot(v ? p.id : (cur) => (cur === p.id ? null : cur))}
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
  p: StoryboardPhoto;
  index: number;
  total: number;
  hot: boolean;
  canHot: boolean;
  onHot: (v: boolean) => void;
}) {
  const [broken, setBroken] = useState(false);
  const caption = [p.формат, p.материал, p.место].filter(Boolean).join(' · ');

  return (
    <figure
      className="sb-fan-item"
      style={{ ['--i' as string]: index, ['--z' as string]: total - index }}
      data-hot={hot ? '' : undefined}
      data-format={p.формат ?? ''}
      data-material={p.материал ?? ''}
      data-place-category={p.местоКатегория ?? ''}
      data-place-raw={p.место ?? ''}
      data-look={p.образ.join(',')}
      data-occasion={normalizeOccasionTags(p.настроение).join(',')}
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
      {caption && (
        <figcaption className="t-mono mt-[0.5rem] text-[color:var(--ink-mute)]">{caption}</figcaption>
      )}
    </figure>
  );
}
