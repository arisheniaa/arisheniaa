import { useEffect, useRef, useState } from 'react';
import type { PinBoard } from './boards';

/**
 * PINTEREST-ВИДЖЕТ — правка Ф34 (`FACTS.md`), правит Ф31/Ф32. Раньше это был
 * фиксированный список шести досок вкладками на одном вопросе «образ»; теперь
 * компонент принимает СПИСОК досок ИЗВНЕ (`boards` — накоплен по пройденному
 * пути дерева, см. `boards.ts`, `boardsForAnswers`) и рендерится один раз на
 * экране результата. Логика привязки досок к ответам здесь не живёт — этот
 * файл теперь чисто представление: список досок → вкладки.
 *
 * ОФИЦИАЛЬНЫЙ ВИДЖЕТ, НЕ СКРИНШОТ ДОСКИ (не изменилось): `//assets.pinterest
 * .com/js/pinit.js` + `data-pin-do="embedBoard"` — официальный тип
 * встраивания доски целиком, тянет живые данные с серверов Pinterest.
 *
 * ВКЛАДКИ, НЕ ДОСКИ ПОДРЯД (не изменилось, причина та же): несколько
 * полноразмерных досок друг под другом растянули бы экран результата на
 * лишние прокрутки — читателю нужен один активный источник вдохновения за
 * раз. Если досок для этого пути ровно одна (например ветка «Запечатлеть
 * любовь» — только `запечатлеваем-любовь`), рендерится один таб без
 * переключателя (список из одного элемента, `role="tablist"` всё равно
 * корректен и с одной вкладкой).
 *
 * ЗАГРУЗКА НЕ БЛОКИРУЕТ КВИЗ (не изменилось): скрипт грузится лениво при
 * монтировании компонента (то есть теперь — при показе экрана результата,
 * а не вопроса «образ»), один раз на сессию.
 *
 * НАХОДКА ПРИ САМОПРОВЕРКЕ (`STORYBOARD.md` § 13.10) — раньше сюда
 * добавлялся `data-active-board` НЕ было, и самопроверка искала СЫРОЙ
 * `<a data-pin-do="embedBoard">` напрямую. Это работало в изолированном
 * прогоне, но падало в полном прогоне всего файла: после исполнения
 * `pinit.js` виджет ПО ДИЗАЙНУ заменяет этот `<a>` на живую разметку с
 * реальными пинами (см. комментарий выше, «узел реально заменяется на
 * рендер с живыми данными») — и чем дольше уже крутится браузер (тёплые
 * DNS/TLS к CDN Pinterest), тем быстрее происходит эта замена. Раздел с
 * одной доской (без вкладок) проверял ИМЕННО этот исчезающий узел — то есть
 * тест был бы тем более хрупким, чем лучше на самом деле работает виджет.
 * Это не гонка теста с анимацией (как в §13.4/§13.10 про веер) — это тест,
 * утверждавший на деталь реализации, которая ПРАВИЛЬНО исчезает. Исправлено
 * добавлением `data-active-board` на СТАБИЛЬНЫЙ узел-обёртку (`.sb-pin`),
 * который Pinterest не трогает вовсе — самопроверка сверяет slug активной
 * доски по нему, не по содержимому чужого виджета. */

let pinitRequested = false;

function ensurePinitScript() {
  if (pinitRequested) return;
  pinitRequested = true;
  if (document.querySelector('script[src*="pinit.js"]')) return;
  const s = document.createElement('script');
  s.async = true;
  s.defer = true;
  /* Явный `https:`, а не протокол-относительный `//` (Ф55). Причина не в
     красоте: боевой CSP перечисляет источники СХЕМОЙ И ХОСТОМ, и при `//`
     на локальном сервере (он по http) адрес разворачивается в
     `http://assets.pinterest.com` — то есть в источник, которого в списке
     нет. Проверка политики на месте после этого показывала бы «работает» или
     «не работает» в зависимости от того, по какому протоколу открыт сайт, а
     не от самой политики. Со схемой в адресе локальная проверка и боевой
     сайт спрашивают у CSP одно и то же. Заодно снимается лишний источник:
     разрешать `http://` в списке больше не нужно. */
  s.src = 'https://assets.pinterest.com/js/pinit.js';
  document.body.appendChild(s);
}

export function PinterestBoards({ boards }: { boards: PinBoard[] }) {
  const [active, setActive] = useState(0);
  const hostRef = useRef<HTMLDivElement>(null);
  const key = boards.map((b) => b.slug).join('|');

  useEffect(() => {
    if (boards.length > 0) ensurePinitScript();
  }, [boards.length]);

  // сбрасываем активную вкладку, если сам список досок сменился (переход по
  // другому пути дерева/«Пройти ещё раз») — иначе индекс мог бы указывать на
  // доску, которой в новом списке уже нет
  useEffect(() => {
    setActive(0);
  }, [key]);

  // Pinterest не умеет перерисовывать уже вставленный <a> при смене вкладки —
  // виджет строится один раз при монтировании и не обновляется реактивно.
  // Решение — пересоздавать сам DOM-узел ссылки при переключении вкладки и
  // просить PinUtils повторно разобрать содержимое хоста.
  useEffect(() => {
    const host = hostRef.current;
    const board = boards[active];
    if (!host || !board) return;
    host.innerHTML = '';
    const a = document.createElement('a');
    a.setAttribute('data-pin-do', 'embedBoard');
    a.setAttribute('data-pin-board-width', '100%');
    a.setAttribute('data-pin-scale-height', '360');
    a.setAttribute('href', `https://ru.pinterest.com/arisheniaa/${board.slug}/`);
    a.textContent = board.label;
    host.appendChild(a);

    const w = window as unknown as { PinUtils?: { build: () => void } };
    w.PinUtils?.build();
  }, [active, boards]);

  if (boards.length === 0) return null;

  return (
    <div className="sb-pin mt-[clamp(1.4rem,3.6vw,2.2rem)]" data-active-board={boards[active]?.slug ?? ''}>
      {boards.length > 1 && (
        <div role="tablist" aria-label="Доски Pinterest" className="sb-pin-tabs">
          {boards.map((b, i) => (
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
      )}
      <div
        className={`sb-pin-frame frame ${boards.length > 1 ? 'mt-[0.9rem]' : ''}`}
        role="tabpanel"
        ref={hostRef}
      />
    </div>
  );
}
