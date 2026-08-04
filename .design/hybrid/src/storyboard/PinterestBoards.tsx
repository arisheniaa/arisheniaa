import { useEffect, useRef, useState } from 'react';

/**
 * PINTEREST-ВИДЖЕТ НА ОСИ «ОБРАЗ» — правка Ф31/Ф32 (`FACTS.md`). Раздел 2
 * брифа называл виджет дополнением, не приоритетом («Приоритет — реальные
 * фото владелицы… Дополнение — референсы через официальный виджет
 * Pinterest»); первая версия фичи отложила его целиком (`STORYBOARD.md` § 7).
 * Владелица подтвердила прямо: «подключай Pinterest-виджет к оси «образ»» —
 * и назвала состав досок явно, шесть штук, не одна (Ф32):
 *
 *   макияж-вояж-образ, луки-на-съемку, композиция, восхищает, содержание,
 *   inspiration
 *
 * Две другие доски, «цвет» и «свет», владелица сама пометила как «пока не
 * придумала, с чем ассоциировать» (OQ-23) — здесь НЕ подключены; добавлять
 * их самовольной догадкой о смысле было бы подменой её решения своим.
 *
 * ОФИЦИАЛЬНЫЙ ВИДЖЕТ, НЕ СКРИНШОТ ДОСКИ. Раздел 2 брифа: «легально: виджет
 * тянет живые данные с серверов Pinterest с атрибуцией, не хостится у нас».
 * `//assets.pinterest.com/js/pinit.js` — официальный скрипт Pinterest,
 * `data-pin-do="embedBoard"` — официальный тип встраивания доски целиком.
 *
 * ПРЕДСТАВЛЕНИЕ — ВКЛАДКИ, НЕ ШЕСТЬ ВИДЖЕТОВ ПОДРЯД. Шесть полноразмерных
 * досок друг под другом растянули бы страницу вопроса «образ» на экраны —
 * читатель ищет ОДИН образ, ему нужен один активный источник вдохновения за
 * раз, не лента из шести. Названия вкладок — имена досок как есть, без
 * перевода/переименования: это чужие названия чужого интерфейса, не текст
 * сайта, редактировать их было бы неточностью, а не стилем.
 *
 * ВИДЖЕТ — ЧУЖОЙ ИНТЕРФЕЙС, ЗАКЛЮЧЁН В РАМКУ. Риск уже назван в брифе:
 * «может визуально выпадать из стиля сайта». Контейнер `.sb-pin` даёт ему
 * кадр-объект (тот же принцип `.frame`, что и у фотографий на сайте — край
 * на пустоте, без попытки перекрасить сам виджет в тему сайта, это чужой
 * код и перекрашивать его изнутри и рискованно, и нечестно по отношению к
 * первоисточнику).
 *
 * ЗАГРУЗКА НЕ БЛОКИРУЕТ КВИЗ. Скрипт Pinterest грузится асинхронно и лениво:
 * подключается только когда читатель ДОШЁЛ до вопроса «образ» (не при
 * старте страницы), и только один раз на всю сессию (module-level флаг —
 * повторные визиты на этот вопрос не грузят скрипт заново). Если скрипт не
 * загрузился (медленная сеть/блокировщик) — плитки-ответы уже отвечают на
 * вопрос сами по себе (раздел 2 брифа: «Приоритет — реальные фото»), виджет
 * не обязателен для работы квиза, поэтому на отсутствие сети здесь нет
 * отдельного состояния ошибки — просто пустая рамка, не сломанный экран.
 */

const BOARDS = [
  { slug: 'макияж-вояж-образ', label: 'Макияж, вояж, образ' },
  { slug: 'луки-на-съемку', label: 'Луки на съёмку' },
  { slug: 'композиция', label: 'Композиция' },
  { slug: 'восхищает', label: 'Восхищает' },
  { slug: 'содержание', label: 'Содержание' },
  { slug: 'inspiration', label: 'Inspiration' },
] as const;

let pinitRequested = false;

function ensurePinitScript() {
  if (pinitRequested) return;
  pinitRequested = true;
  if (document.querySelector('script[src*="pinit.js"]')) return;
  const s = document.createElement('script');
  s.async = true;
  s.defer = true;
  s.src = '//assets.pinterest.com/js/pinit.js';
  document.body.appendChild(s);
}

export function PinterestBoards() {
  const [active, setActive] = useState(0);
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ensurePinitScript();
  }, []);

  // Pinterest не умеет перерисовывать уже вставленный <a> при смене вкладки —
  // виджет строится один раз при монтировании и не обновляется реактивно.
  // Решение — пересоздавать сам DOM-узел ссылки при переключении вкладки и
  // просить PinUtils повторно разобрать содержимое хоста, а не полагаться на
  // то, что React перерисует атрибуты внутри уже собранного iframe Pinterest.
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    host.innerHTML = '';
    const board = BOARDS[active];
    const a = document.createElement('a');
    a.setAttribute('data-pin-do', 'embedBoard');
    a.setAttribute('data-pin-board-width', '100%');
    a.setAttribute('data-pin-scale-height', '360');
    a.setAttribute('href', `https://ru.pinterest.com/arisheniaa/${board.slug}/`);
    a.textContent = board.label;
    host.appendChild(a);

    const w = window as unknown as { PinUtils?: { build: () => void } };
    w.PinUtils?.build();
  }, [active]);

  return (
    <div className="sb-pin mt-[clamp(1.6rem,4vw,2.4rem)]">
      <p className="t-mono text-[color:var(--ink-mute)]">Для вдохновения — мои доски Pinterest</p>
      <div role="tablist" aria-label="Доски Pinterest" className="sb-pin-tabs mt-[0.7rem]">
        {BOARDS.map((b, i) => (
          <button
            key={b.slug}
            type="button"
            role="tab"
            aria-selected={active === i}
            className="sb-pin-tab"
            onClick={() => setActive(i)}
          >
            {b.label}
          </button>
        ))}
      </div>
      <div className="sb-pin-frame frame mt-[0.9rem]" role="tabpanel" ref={hostRef} />
    </div>
  );
}
