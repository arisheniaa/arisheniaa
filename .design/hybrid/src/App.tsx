import { Fragment, useEffect, useState } from 'react';
import { copy } from './copy';
import { Gradient, Grain } from './Gradient';
import { Name } from './Name';
import { Rack } from './Rack';
import { Stars } from './Stars';
import { DeliveryDemo } from './Folders';
import { useReveal, useFocusScrub } from './reveal';
import { TiltFrame } from './Tilt';
import { PricePlate } from './PricePlate';
import { FilmCaption } from './FilmCaption';
import { SectionStars } from './SectionStars';
import { NavHint } from './NavHint';

/**
 * ГЛАВНАЯ. Гибрид направлений B и C по `DIRECTION-LOCK.md`.
 *
 * Весь экранный текст — из `copy.ts`: `COPY.md` ред. 6 плюс правки Ф28, где
 * владелица дала формулировки дословно. Ни одна строка не переписана и не
 * сокращена под макет. Где текст не встал — записано в README как находка.
 *
 * Композиция сознательно не карточная. Одинаковых сеток на странице нет ни
 * одной: рэк — предмет в руке, «Как получается кино» — диптих со сбитой осью,
 * услуги — четыре разновеликих разворота «кадр + текст», разделённые
 * волосяными линейками, «Как это устроено» — лестница, FAQ — вопрос слева
 * крупно, ответ справа узкой мерой.
 *
 * РЕДАКЦИЯ 2 — правки Ф28 после первого живого показа:
 *   1. имя статично, морфинга нет (`Name.tsx` вместо `NameMorph.tsx`);
 *   2. тема одна, зелёная; переключатель и `theme.tsx` удалены;
 *   3. звёзды светятся (`Stars.tsx`);
 *   4. навигация переехала из подвала в шапку, шесть подписей Ф28;
 *   5. из подвала убраны навигация по фотографиям и упоминание юрстатуса;
 *   6. CTA сведён к одной фразе со ссылкой на слове «сюда»;
 *   7. подпись-триггер — на самой папке, пояснение — словами владелицы;
 *   8. фотографии услуг заменены, добавлен слот «плёнка», показ уменьшен;
 *   9. секция «Шесть кадров» не рендерится (зоны и компонент сохранены).
 *
 * РЕДАКЦИЯ 3 (Ф29, FACTS.md — «След + Кино без звука», НЕ лок, семь пунктов
 * владелицы поверх редакции 2, «фиксируем, делай!»). Подробности каждого —
 * в комментариях затронутых файлов, здесь только список и где искать:
 *   1. настроение диптиха «Как получается кино» непрерывно со скроллом —
 *      `Gradient.tsx` (`--mood`), `.mesh-mood-a/b` в styles.css;
 *   2. курсор-метка «тяни» над рэком вместо системного grab — `Rack.tsx`;
 *   3. 3D-тилт карточек услуг по курсору — `Tilt.tsx`, здесь ниже;
 *   4. боковой индикатор разделов звёздами — `SectionStars.tsx`;
 *   5. EXIF-подпись на плёночном кадре — `FilmCaption.tsx`, сужена до слова
 *      «плёнка» без города и техданных (OQ-21, находка записана там же);
 *   6. цена за кликом внутри плашки — `PricePlate.tsx`;
 *   7. асимметричный разлёт папок отдачи — `Folders.tsx`, styles.css.
 * Явно НЕ реализовано (прямая просьба владелицы «без звуков»): звук затвора
 * камеры при перевороте рэка. В коде нет ни одного звукового API — проверено
 * `grep`, дублируется измерением в `selfcheck.mjs`.
 */

export function App() {
  return (
    <>
      <Gradient />
      <Page />
      <Grain />
    </>
  );
}

function Page() {
  useReveal();
  useFocusScrub();

  return (
    <>
      <Header />
      {/* Боковой индикатор разделов (Ф29 п.4) — fixed, читает `main > section`
          сам, поэтому положение в дереве не важно; стоит здесь, рядом с
          другими сквозными слоями шапки/подвала. */}
      <SectionStars />
      {/* Стрелка-подсказка на «Придумать съёмку» (Ф33 п.3, редакция 4 фичи
          «Придумать съёмку») — тоже сквозной слой поверх страницы, читает
          `#hero`/`#kontakt` сама, см. `NavHint.tsx`. */}
      <NavHint />
      <main id="main" className="relative z-10">
        <Hero />
        <Cinema />
        {/* <Grid /> — ВЫКЛЮЧЕНО Ф28: «6 фотографий, которые ты выбрал, я бы
            убрала пока. если что, добавим позже». Компонент и зоны `copy.grid`
            оставлены на месте по прямому требованию Ф28 не удалять зоны:
            возврат секции — одна строка, а не восстановление кода. */}
        <Offer />
        <How />
        <Faq />
        <AboutTeaser />
        <Cta />
      </main>
      <Footer />
    </>
  );
}

const WRAP = 'relative z-10 mx-auto w-full max-w-[var(--measure)]';
const SECT = 'relative px-[var(--gutter)]';

/* ═════════════════════════ ШАПКА ═════════════════════════
   Позиция, размер и звезда-компаньон — из направления C (лок, «Имя — облик из C»):
   фиксированная строка сверху, звезда слева от имени, кегль как в C.
   Единственное добавление к C — подложка, которая появляется, когда шапка
   уезжает на контент: в C под ней было сплошное тёмное поле, здесь под ней
   живой градиент и фотографии, и без подложки имя ложится на кадр.

   НАВИГАЦИЯ (Ф28) — здесь, а не в подвале: «навигацию сделай в верхушке сайта,
   а не внизу». Шесть подписей и их порядок — дословно из Ф28.

   АДРЕСА. Собранная страница на сегодня одна, главная. Страниц «Работы»,
   «Обо мне», «Что снимаю», «Подготовка к съёмке» ещё нет — это задача Ф4, и
   выдумывать их сейчас было бы подменой архитектуры. Поэтому пункты ведут в
   соответствующие по смыслу зоны ЭТОЙ страницы, а не на несуществующие URL:
   ссылка на 404 хуже ссылки на секцию. Соответствие — в таблице `NAV` ниже,
   каждый переходный адрес помечен `stub: true`, чтобы его нельзя было принять
   за готовый раздел при следующей правке. Это заявленный долг (README). */
/* Ссылки — с ведущим «/», не голым «#…». На ЭТОЙ странице ведущий слэш ничего
   не меняет (путь `/` совпадает с текущим, переход внутристраничный, без
   перезагрузки — фрагментная навигация по спецификации). Но те же подписи
   теперь используются и с новой страницы `storyboard.html` (фича «Придумать
   съёмку», добавлена ниже) — оттуда голый `#uslugi` увёл бы в никуда (такого
   узла на той странице нет), а `/#uslugi` корректно возвращает на главную и
   прокручивает к разделу. Один список ссылок работает с обеих страниц. */
const NAV: { label: string; href: string; stub: boolean; id?: string }[] = [
  // «Главная» — начало страницы. Раньше туда вело имя; Ф28 сделала имя
  // некликабельным, и переход наверх достался этому пункту.
  { label: 'Главная', href: '/#main', stub: false },
  // «Работы» — «там будут собраны мои фотографии» (Ф28). Собранного раздела с
  // фотографиями на сайте сейчас ровно один: рэк на первом экране, восемь
  // кадров восьми съёмок. Секция «Шесть кадров», куда этот пункт вёл бы
  // естественнее, снята той же Ф28.
  { label: 'Работы', href: '/#raboty', stub: true },
  { label: 'Обо мне', href: '/#o-mne', stub: true },
  // «Что снимаю» — «тут будут услуги: индивидуальная, парная и творческая»
  // (Ф28). Это в точности секция `home:offer` — «Что можно у меня снять».
  { label: 'Что снимаю', href: '/#uslugi', stub: false },
  // «Придумать съёмку» — НОВЫЙ пункт (`BRIEF-STORYBOARD.md`), формулировка
  // подтверждена владелицей дословно. Полноценная страница, не модалка на
  // главной (раздел 5 брифа) — `storyboard.html`, вторая точка входа сборки
  // (см. `vite.config.mts`), не хэш-якорь этой страницы.
  // `id` — только у этой ссылки: адресуется стрелкой-подсказкой `NavHint.tsx`
  // (Ф33 п.3), которой нужно измерить реальное положение пункта на экране.
  { label: 'Придумать съёмку', href: '/storyboard.html', stub: false, id: 'nav-link-storyboard' },
  // «Подготовка к съёмке» — переименованный FAQ (Ф27), теперь и в навигации.
  { label: 'Подготовка к съёмке', href: '/#podgotovka', stub: false },
  { label: 'Контакты', href: '/#kontakt', stub: false },
];

/* Экспортирован (не только используется в `Page` этого файла): страница
   `storyboard.html` (фича «Придумать съёмку») переиспользует этот же `Header`
   и `Footer` дословно — правило «общее раньше частного», один источник
   правды для шапки/навигации/подвала на весь сайт, не два похожих файла,
   которые разойдутся при следующей правке. */
export function Header() {
  const [set, setSet] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setSet(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* Список на узком экране закрывается по Esc. Раскрытый список, который
     нельзя закрыть клавиатурой, ловит фокус: пользователь табом уходит в
     скрытый от глаз контент. */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const links = NAV.map((n) => (
    <li key={n.label}>
      <a
        id={n.id}
        className="nav-link"
        href={n.href}
        data-stub={n.stub ? '' : undefined}
        onClick={() => setOpen(false)}
      >
        {n.label}
      </a>
    </li>
  ));

  return (
    <header
      className={`fixed left-0 right-0 top-0 z-50 px-[var(--gutter)] py-[clamp(0.9rem,1.6vw,1.4rem)] transition-[background-color,backdrop-filter] duration-300 ${
        set || open
          ? 'bg-[color-mix(in_srgb,var(--paper)_72%,transparent)] backdrop-blur-[7px]'
          : ''
      }`}
    >
      <div className="mx-auto flex max-w-[var(--measure)] items-center justify-between gap-[clamp(1rem,3vw,2.5rem)]">
        {/* Имя — не ссылка (Ф28: «пусть оно не будет кликабельным»). */}
        <Name />

        {/* Одна разметка навигации на все ширины, одна `<nav>` на документ:
            два `<nav>` с одним и тем же списком — это дубль лендмарка, а на
            кадре он выглядит ровно как один. Широкая раскладка — строка,
            узкая — раскрывающийся список. */}
        <nav aria-label="Разделы сайта" className="min-w-0">
          <button
            type="button"
            className="nav-toggle md:hidden"
            aria-expanded={open}
            aria-controls="nav-list"
            onClick={() => setOpen((v) => !v)}
          >
            {/* Слово, а не иконка: весь служебный слой сайта набран словами.
                «Разделы» — не экранный текст из COPY, а подпись органа
                управления; в `COPY.md` такой зоны нет, и это записано в
                хендоф как долг копирайтера. */}
            Разделы
          </button>
          <ul
            id="nav-list"
            className={`m-0 list-none flex-wrap items-baseline gap-x-[clamp(0.9rem,1.8vw,1.9rem)] gap-y-3 p-0 ${
              open
                ? /* Раскрытый список узкой раскладки. Оговорки `md:` возвращают
                     строку, если экран расширили с открытым списком: без них
                     на планшете висела бы полноширинная плашка поверх контента. */
                  'nav-sheet absolute left-0 right-0 top-full flex flex-col gap-y-[0.9rem] px-[var(--gutter)] py-[clamp(1.1rem,3vh,1.8rem)] md:static md:flex-row md:bg-transparent md:px-0 md:py-0 md:[backdrop-filter:none]'
                : 'hidden md:flex'
            }`}
          >
            {links}
          </ul>
        </nav>
      </div>
    </header>
  );
}

/* ═════════════════════════ ПЕРВЫЙ ЭКРАН ═════════════════════════
   Лестница заголовка — приём cur-makemepulse: три ступени с растущим отступом.
   H1 три слова (COPY ред. 6), поэтому кегль поднят до 136 px на 1920: на пяти
   словах прошлой редакции такой кегль не помещался, на трёх помещается.
   Справа — рэк: один предмет в пустоте, и он же механика внимания (П13). */
function Hero() {
  return (
    <section
      id="hero"
      className={`${SECT} flex min-h-[100svh] flex-col justify-center pb-[clamp(3rem,8vh,6rem)] pt-[clamp(6rem,14vh,9rem)]`}
    >
      <Stars count={18} seed={7} scale="mixed" />

      <div className={WRAP}>
        <div className="grid grid-cols-1 items-end gap-x-[var(--gutter)] gap-y-[clamp(2.4rem,6vw,4rem)] lg:grid-cols-12">
          <div className="lg:col-span-7 lg:col-start-1">
            <p className="reveal t-mono text-[color:var(--ink-mute)]">{copy.hero.geo}</p>

            {/* Лестница из трёх блоков. Между блоками СТОИТ пробельный узел, и он
                здесь не косметика: три `<span className="block">` вплотную дают
                textContent «Создаювашекино» — именно это и было в первой версии.
                Визуально пробел между блочными элементами не виден, а копирование,
                поиск и скринридер получают «Создаю ваше кино», то есть H1 дословно
                (правило П8: текст заголовка остаётся текстом, даже когда он
                разложен композицией). */}
            <h1 className="reveal t-display mt-[clamp(1rem,2.4vw,2rem)]" style={{ ['--i' as string]: 1 }}>
              {copy.hero.h1.map((word, i) => (
                <Fragment key={word}>
                  {i > 0 ? ' ' : null}
                  <span className="block" style={{ paddingLeft: `${[0, 1.1, 2.4][i]}em` }}>
                    {word}
                  </span>
                </Fragment>
              ))}
            </h1>

            <p
              className="reveal t-lead mt-[clamp(1.6rem,3.4vw,2.6rem)] max-w-[36ch] text-[color:var(--ink-soft)]"
              style={{ ['--i' as string]: 2 }}
            >
              {copy.hero.lead}
            </p>

            <div
              className="reveal mt-[clamp(1.8rem,4vw,3rem)] flex flex-wrap items-baseline gap-x-[2.4rem] gap-y-4"
              style={{ ['--i' as string]: 3 }}
            >
              {/* Ф28 дала настоящий адрес личного Telegram (`@arisheniaa`, не
                  канал `@byarisheniaa`). Ссылка, которая говорит «Написать в
                  Telegram», обязана открывать Telegram, а не прокручивать
                  страницу к блоку контактов, как было до появления адреса. */}
              <a
                className="link-major t-h3"
                href="https://t.me/arisheniaa"
                target="_blank"
                rel="noopener noreferrer"
              >
                {copy.hero.ctaPrimary}
              </a>
              {/* Вела в «Шесть кадров» (`#kadry`); секция снята Ф28, и адрес
                  переставлен на рэк — единственную собранную подборку кадров. */}
              <a className="link-minor t-body" href="/#raboty">
                {copy.hero.ctaSecondary}
              </a>
            </div>
          </div>

          <div
            id="raboty"
            className="reveal scroll-mt-[7rem] lg:col-span-4 lg:col-start-9"
            style={{ ['--i' as string]: 4 }}
          >
            <Rack />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═════════════════════════ КАК ПОЛУЧАЕТСЯ КИНО ═════════════════════════
   Ни одной фотографии: пара произносится типографикой на пустоте. Ось сбита
   намеренно — две равные колонки читались бы как таблица, а половины
   равновесны по весу, не по сетке. Звёзды здесь крупные и бордовые: единственное
   место, где они работают предметом, а не фоном.

   `data-mood-scope` (Ф29 п.1, FACTS.md — не лок): по этому узлу `Gradient.tsx`
   считает локальный прогресс прохода ИМЕННО этой секции и двигает им фон
   между «тихим» и «странным» непрерывно, синхронно со скроллом — см.
   комментарий в Gradient.tsx и `.mesh-mood-a/b` в styles.css. */
function Cinema() {
  return (
    <section data-mood-scope className={`${SECT} py-[clamp(5rem,15vh,12rem)]`}>
      <Stars count={9} seed={19} scale="bold" tones={[2, 0]} shapes={['hands5', 'starfish6', 'spark']} />

      <div className={WRAP}>
        <h2 className="reveal t-h1 max-w-[16ch]">{copy.cinema.title}</h2>

        <div className="mt-[clamp(3rem,8vh,6rem)] grid grid-cols-1 gap-x-[var(--gutter)] gap-y-[clamp(2.6rem,7vw,5rem)] lg:grid-cols-12">
          <div className="reveal lg:col-span-5 lg:col-start-1">
            <p className="t-mono text-[color:var(--ink-mute)]">{copy.cinema.a.label}</p>
            <p className="t-quote mt-[clamp(0.9rem,2vw,1.5rem)] max-w-[30ch]">
              {copy.cinema.a.text}
            </p>
          </div>
          <div
            className="reveal lg:col-span-5 lg:col-start-8 lg:mt-[clamp(2.5rem,8vh,6rem)]"
            style={{ ['--i' as string]: 1 }}
          >
            <p className="t-mono text-[color:var(--ink-mute)]">{copy.cinema.b.label}</p>
            <p className="t-quote mt-[clamp(0.9rem,2vw,1.5rem)] max-w-[30ch]">
              {copy.cinema.b.text}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═════════════════════════ ШЕСТЬ КАДРОВ ═════════════════════════
   Р4: кадр — объект, не фон. Поэтому не ровная сетка 3×2, а разнобой по ширине
   и по вертикали: каждый кадр стоит в своём воздухе и подписан. Приём из
   pho-anothermag3 — кадр и текст как два равных объекта. */
const GRID_LAYOUT = [
  { col: 'lg:col-span-4 lg:col-start-1', push: '', size: 'w-[86%]' },
  { col: 'lg:col-span-5 lg:col-start-7', push: 'lg:mt-[7rem]', size: 'w-full' },
  { col: 'lg:col-span-4 lg:col-start-3', push: 'lg:mt-[3rem]', size: 'w-[78%] ml-auto' },
  { col: 'lg:col-span-3 lg:col-start-8', push: 'lg:mt-[1rem]', size: 'w-[72%]' },
  { col: 'lg:col-span-4 lg:col-start-2', push: 'lg:mt-[2rem]', size: 'w-[84%]' },
  { col: 'lg:col-span-5 lg:col-start-7', push: 'lg:mt-[5rem]', size: 'w-full' },
];

/* ВЫКЛЮЧЕНО Ф28 — секция не рендерится (`Page` выше). Компонент экспортируется,
   а не удаляется и не остаётся молча неиспользованным: экспорт — это подпись
   «оставлено намеренно», а безымянная неиспользуемая функция в файле выглядит
   забытым мусором и будет вычищена следующим, кто сюда придёт. Владелица
   сказала «добавим позже», значит возврат — одна строка в `Page`. */
export function Grid() {
  return (
    <section id="kadry" className={`${SECT} pb-[clamp(4rem,12vh,9rem)]`}>
      <div className={WRAP}>
        <h2 className="reveal t-h2">{copy.grid.title}</h2>

        <div className="mt-[clamp(2.5rem,7vh,5rem)] grid grid-cols-1 gap-x-[var(--gutter)] gap-y-[clamp(3rem,9vh,7rem)] lg:grid-cols-12">
          {copy.grid.frames.map((f, i) => {
            const L = GRID_LAYOUT[i];
            return (
              <figure
                key={f.src}
                className={`m-0 ${L.col} ${L.push} ${i % 2 ? 'ml-auto w-[82%] sm:w-auto' : 'w-[94%] sm:w-auto'}`}
              >
                <div data-focus="in" className="overflow-hidden">
                  <img
                    src={f.src}
                    width={1200}
                    height={1600}
                    alt={f.alt}
                    className={`frame block ${L.size}`}
                    loading="lazy"
                    decoding="async"
                  />
                </div>
                <figcaption className="t-mono mt-[0.9rem] text-[color:var(--ink-mute)]">
                  {f.caption}
                </figcaption>
              </figure>
            );
          })}
        </div>

        <p className="reveal mt-[clamp(3rem,8vh,6rem)]">
          <a className="link-major t-h3" href="/#kadry">
            {copy.grid.link}
          </a>
        </p>
      </div>
    </section>
  );
}

/* ═════════════════════════ ЧТО МОЖНО СНЯТЬ ═════════════════════════
   Самая трудная зона главной: три предложения с ценами и один ответ FAQ
   на 72 слова ниже. Прайс таблицей здесь запрещён (`PRICE-POSITION.md`):
   таблица ставит автора в один ряд с теми, кто стоит 3 000 ₽.

   Запрет лока «плашка цены с изображением-заглушкой» исполнен так: цена стоит
   на цветовой плашке темы, а фотография есть только там, где она настоящая, —
   три кадра из портфолио по Ф26.

   Творческая съёмка выделена АСИММЕТРИЕЙ перечисления, а не размером ячейки
   (композиционный контракт COPY § 13 п. 4): текст уходит на другую сторону
   разворота, и она стоит после волосяной линейки — то есть не третья ячейка
   одинакового ряда, а отдельный предмет.

   РЕДАКЦИЯ 2 (Ф28), три правки в этой секции:

   1. ПОКАЗ КАДРОВ УМЕНЬШЕН. «уменьши их в размере, чтобы не было так заметно
      ухудшение качества». Было: кадр на всю ширину своей колонки, то есть до
      700 px на 1920 при исходнике 853×1280 — компрессия портфолио-копий
      (`PHOTO-VERDICT.md`) на таком размере видна прямо. Стало: явный потолок
      ширины на каждом кадре, 15–19 rem. Это ровно вывод вердикта: мельче
      показ — меньше видна компрессия. Разница размеров между кадрами
      сохранена, иначе четыре одинаковых кадра сложились бы в сетку карточек.

   2. АСИММЕТРИЯ ТВОРЧЕСКОЙ ПЕРЕЕХАЛА С ПРОПОРЦИИ НА ПОЛОЖЕНИЕ. Раньше её
      кадр был горизонтальным (3:2) и этим отличался от двух вертикальных.
      Новый файл Ф28 `IMG_6281.JPG` — вертикальный портрет в полный рост, как
      и остальные три: кроп 3:2 отрезал бы фигуре голову. Поэтому пропорция у
      всех четырёх одна, а творческая выделяется тем, что стоит одна на
      развороте после линейки и её кадр самый крупный из четырёх.

   3. ПОЯВИЛСЯ СЛОТ «ПЛЁНКА» — «для услуги на плёнку добавь IMG_1651». Стоит
      там, где про плёнку до сих пор был только текст (`home:offer.note`).
      Своего заголовка у слота нет: подписи «Плёнка» в `COPY.md` не существует,
      а сочинять экранный текст билдеру запрещено. */
function Offer() {
  const c = copy.offer.cards;
  return (
    <section id="uslugi" className={`${SECT} scroll-mt-[5rem] py-[clamp(4rem,12vh,9rem)]`}>
      <Stars count={11} seed={37} scale="fine" tones={[1, 0]} />

      <div className={WRAP}>
        <div className="grid grid-cols-1 gap-x-[var(--gutter)] gap-y-[clamp(1.4rem,3vw,2.4rem)] lg:grid-cols-12">
          <h2 className="reveal t-h1 lg:col-span-6 lg:col-start-1">{copy.offer.title}</h2>
          <p
            className="reveal t-lead max-w-[42ch] text-[color:var(--ink-soft)] lg:col-span-5 lg:col-start-8 lg:mt-[0.6rem]"
            style={{ ['--i' as string]: 1 }}
          >
            {copy.offer.lead}
          </p>
        </div>

        {/* два по запросу. Кадры разного размера намеренно: 15 rem против
            13 rem — ряд из двух одинаковых кадров читался бы как пара карточек. */}
        <div className="mt-[clamp(3rem,9vh,6rem)] grid grid-cols-1 gap-x-[var(--gutter)] gap-y-[clamp(3rem,8vw,5rem)] md:grid-cols-12">
          <OfferRow i={0} card={c.portrait} cls="md:col-span-6 md:col-start-1" frame="max-w-[15rem]" />
          <OfferRow
            i={1}
            card={c.duo}
            cls="md:col-span-5 md:col-start-8 md:mt-[clamp(2rem,6vh,4.5rem)]"
            frame="max-w-[13rem]"
          />
        </div>

        <div className="rule mt-[clamp(3rem,8vh,5.5rem)]" />

        {/* третья, без запроса: разворот, а не ячейка. Кадр самый крупный из
            четырёх — 19 rem, — и стоит один против текста. */}
        <div className="mt-[clamp(3rem,8vh,5.5rem)] grid grid-cols-1 items-center gap-x-[var(--gutter)] gap-y-[clamp(2rem,5vw,3rem)] lg:grid-cols-12">
          <figure className="reveal m-0 lg:col-span-5 lg:col-start-1">
            <TiltFrame className="max-w-[19rem] overflow-hidden">
              <div data-focus="in">
                <img
                  src={c.idea.photo}
                  width={680}
                  height={907}
                  alt={c.idea.alt}
                  className="frame block w-full"
                  loading="lazy"
                  decoding="async"
                />
              </div>
            </TiltFrame>
          </figure>
          <div className="lg:col-span-6 lg:col-start-7">
            <h3 className="reveal t-h2">{c.idea.name}</h3>
            <p className="reveal mt-[clamp(1rem,2.4vw,1.6rem)]" style={{ ['--i' as string]: 1 }}>
              <PricePlate text={c.idea.price} />
            </p>
            <p
              className="reveal t-body mt-[clamp(1.1rem,2.6vw,1.8rem)] max-w-[38ch] text-[color:var(--ink-soft)]"
              style={{ ['--i' as string]: 2 }}
            >
              {c.idea.includes}
            </p>
          </div>
        </div>

        <div className="rule mt-[clamp(3rem,8vh,5.5rem)]" />

        {/* ПЛЁНКА (Ф28). Доплата, а не четвёртая услуга: поэтому у неё нет ни
            имени, ни плашки цены — цена стоит внутри текста `offer.note`, — и
            кадр здесь мельче всех, 12 rem. Зеркальный разворот к творческой:
            там кадр слева, текст справа, здесь наоборот. Ряда из четырёх
            одинаковых ячеек в секции так и не появляется. */}
        <div className="mt-[clamp(3rem,8vh,5.5rem)] grid grid-cols-1 items-center gap-x-[var(--gutter)] gap-y-[clamp(2rem,5vw,3rem)] lg:grid-cols-12">
          <p className="reveal t-body max-w-[46ch] text-[color:var(--ink-soft)] lg:col-span-6 lg:col-start-1">
            {copy.offer.note}
          </p>
          <figure
            className="reveal m-0 lg:col-span-4 lg:col-start-9"
            style={{ ['--i' as string]: 1 }}
          >
            <TiltFrame className="ml-auto max-w-[12rem] overflow-hidden">
              {/* EXIF-подпись (Ф29 п.5) — только на этом кадре, единственном
                  подтверждённом как плёночный (`FilmCaption.tsx`). */}
              <FilmCaption>
                <div data-focus="in">
                  <img
                    src={copy.offer.film.photo}
                    width={680}
                    height={907}
                    alt={copy.offer.film.alt}
                    className="frame block w-full"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
              </FilmCaption>
            </TiltFrame>
          </figure>
        </div>

        <p className="reveal mt-[clamp(3rem,9vh,6rem)]">
          <a className="link-major t-h3" href="/#uslugi">
            {copy.offer.cta}
          </a>
        </p>
      </div>
    </section>
  );
}

function OfferRow({
  i,
  card,
  cls,
  frame,
}: {
  i: number;
  card: { name: string; price: string; includes: string; photo: string; alt: string };
  cls: string;
  /** потолок ширины кадра — Ф28, «уменьши их в размере» */
  frame: string;
}) {
  return (
    <div className={`reveal ${cls}`} style={{ ['--i' as string]: i }}>
      <figure className="m-0">
        <TiltFrame className={`overflow-hidden ${frame}`}>
          <div data-focus="in">
            <img
              src={card.photo}
              width={680}
              height={907}
              alt={card.alt}
              className="frame block w-full"
              loading="lazy"
              decoding="async"
            />
          </div>
        </TiltFrame>
      </figure>
      <h3 className="t-h3 mt-[clamp(1.1rem,2.4vw,1.6rem)]">{card.name}</h3>
      <p className="mt-[0.9rem]">
        <PricePlate text={card.price} />
      </p>
      <p className="t-body mt-[1rem] max-w-[34ch] text-[color:var(--ink-soft)]">{card.includes}</p>
    </div>
  );
}

/* ═════════════════════════ КАК ЭТО УСТРОЕНО ═════════════════════════
   Лестница из четырёх шагов с волосяными линейками, а не четыре карточки:
   шаги идут во времени, и последовательность обязана быть видна глазом.
   Рядом с четвёртым шагом («Отдаю кадры») стоит демонстрация отдачи —
   она иллюстрирует именно его (COPY § 1.6.1). */
function How() {
  return (
    <section className={`${SECT} py-[clamp(4rem,12vh,9rem)]`}>
      <Stars count={8} seed={53} scale="fine" />

      <div className={WRAP}>
        <h2 className="reveal t-h2">{copy.how.title}</h2>

        <div className="mt-[clamp(2.5rem,7vh,4.5rem)] grid grid-cols-1 gap-x-[var(--gutter)] lg:grid-cols-12">
          <ol className="m-0 list-none p-0 lg:col-span-7 lg:col-start-1">
            {copy.how.steps.map((s, i) => (
              <li
                key={s.label}
                className="reveal grid grid-cols-[3.2rem_1fr] gap-x-[clamp(0.8rem,2vw,1.6rem)] border-t border-[color:color-mix(in_srgb,var(--ink)_16%,transparent)] py-[clamp(1.4rem,3.5vh,2.4rem)]"
                style={{ ['--i' as string]: i % 2 }}
              >
                <p className="t-mono m-0 pt-[0.3em] text-[color:var(--accent)]">
                  {String(i + 1).padStart(2, '0')}
                </p>
                <div>
                  <h3 className="t-h3 m-0">{s.label}</h3>
                  <p className="t-body mt-[0.6rem] max-w-[42ch] text-[color:var(--ink-soft)]">
                    {s.text}
                  </p>
                </div>
              </li>
            ))}
          </ol>

          <div className="reveal mt-[clamp(2.6rem,7vh,0rem)] lg:col-span-4 lg:col-start-9 lg:mt-[clamp(6rem,18vh,12rem)]">
            <DeliveryDemo
              trigger={copy.delivery.trigger}
              digital={copy.delivery.digital}
              film={copy.delivery.film}
              note={copy.delivery.note}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═════════════════════════ ПОМОГУ ПОДГОТОВИТЬСЯ ═════════════════════════
   Самая плотная зона главной: четыре ответа, один из них на 72 слова (BC-04).
   Никаких раскрывашек: ответ, который надо открыть, на сайте с ценой выше
   рынка читается как то, что прячут. Вопрос крупно слева, ответ узкой мерой
   справа — здесь и проверяется, держит ли направление плотность. */
function Faq() {
  return (
    // `#podgotovka` — адрес пункта «Подготовка к съёмке» из навигации Ф28.
    <section id="podgotovka" className={`${SECT} scroll-mt-[5rem] py-[clamp(4rem,12vh,9rem)]`}>
      <div className={WRAP}>
        <h2 className="reveal t-h2 max-w-[22ch]">{copy.faq.title}</h2>

        <dl className="mt-[clamp(2.5rem,7vh,5rem)]">
          {copy.faq.items.map((item, i) => (
            <div
              key={item.q}
              className="reveal grid grid-cols-1 gap-x-[var(--gutter)] gap-y-[clamp(0.8rem,2vw,1.3rem)] border-t border-[color:color-mix(in_srgb,var(--ink)_16%,transparent)] py-[clamp(1.6rem,4.5vh,3rem)] lg:grid-cols-12"
              style={{ ['--i' as string]: i % 2 }}
            >
              <dt className="t-h3 lg:col-span-5 lg:col-start-1">{item.q}</dt>
              <dd className="t-body m-0 max-w-[56ch] text-[color:var(--ink-soft)] lg:col-span-6 lg:col-start-7">
                {item.a}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

/* ═════════════════════════ КТО СНИМАЕТ ═════════════════════════
   `#o-mne` — переходный адрес пункта «Обо мне» из навигации Ф28: страницы
   «Обо мне» ещё нет, эта секция — её анонс на главной. */
function AboutTeaser() {
  return (
    <section id="o-mne" className={`${SECT} scroll-mt-[5rem] py-[clamp(3rem,9vh,7rem)]`}>
      <Stars count={7} seed={71} scale="mixed" tones={[1, 2]} />
      <div className={WRAP}>
        <div className="grid grid-cols-1 gap-x-[var(--gutter)] gap-y-[clamp(1.2rem,3vw,2rem)] lg:grid-cols-12">
          <h2 className="reveal t-h2 lg:col-span-3 lg:col-start-1">{copy.about.title}</h2>
          <div className="lg:col-span-7 lg:col-start-5">
            <p className="reveal t-quote max-w-[46ch]" style={{ ['--i' as string]: 1 }}>
              {copy.about.text}
            </p>
            <p className="reveal mt-[clamp(1.4rem,3vw,2.2rem)]" style={{ ['--i' as string]: 2 }}>
              {/* `home:about.link` — «Обо мне». Ведёт на будущую страницу
                  «Обо мне», которой ещё нет; до неё адрес — эта же секция,
                  как и у одноимённого пункта навигации. */}
              <a className="link-minor t-body" href="/#o-mne">
                {copy.about.link}
              </a>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═════════════════════════ ФИНАЛЬНЫЙ ПРИЗЫВ ═════════════════════════
   Ф28 сводит эту зону к одной фразе:

     «убери фразу „пишите, даже если ещё не решили“ и ссылку „написать в
      телеграм“. фраза „вы всегда можете связаться со мной, кликнув сюда“
      должна быть единственной, ниже уже контакты. слово „сюда“ сделать
      кликабельной ссылкой с переходом на диалог в телеграме»

   Убрано: заголовок `home:cta.title`, кнопка `home:cta.button`, строка
   `home:cta.channels` («Telegram, VK, телефон» — VK и телефон не подтверждены,
   и Ф28 запрещает добавлять в блок контактов что-либо, кроме двух слов).

   Долг C-09 закрыт: адрес диалога наконец известен — `t.me/arisheniaa`. Раньше
   ссылка вела в эту же зону, потому что адреса не было, и это было записано
   долгом. Больше не долг.

   У секции нет заголовка — впервые на странице. Это прямое следствие правки, а
   не небрежность: единственный заголовок здесь был снятой фразой. Секция
   называет себя навигации и скринридеру через `aria-label`; ориентир для
   пункта «Контакты» из шапки не потерян.

   Кегль фразы поднят с `t-lead` до `t-h2`: она осталась одна на весь экран, и
   на прежнем кегле лида её просто не видно — воздух вокруг стал больше, а
   объект в нём не изменился. Сама строка не тронута ни на знак. */
function Cta() {
  return (
    <section
      id="kontakt"
      aria-label="Контакты"
      className={`${SECT} scroll-mt-[5rem] pt-[clamp(4rem,12vh,9rem)] pb-[clamp(5rem,15vh,11rem)]`}
    >
      <Stars count={13} seed={97} scale="mixed" />
      <div className={WRAP}>
        <div className="mx-auto max-w-[44rem] text-center">
          <p className="reveal t-h2 mx-auto max-w-[24ch] text-balance">
            {copy.cta.textBefore}
            <a
              className="link-major"
              href={copy.cta.href}
              target="_blank"
              rel="noopener noreferrer"
            >
              {copy.cta.textLink}
            </a>
            {copy.cta.textAfter}
          </p>

          {/* КОНТАКТЫ (Ф28). Ровно два кликабельных слова и ничего больше:
              «сделай кликабельными слова „телеграм“ и „инстаграм“… больше
              ничего добавлять не нужно». Ни подписи над блоком, ни адресов,
              ни иконок — иконка соцсети была бы тем самым «ещё чем-то».
              Список, а не строка через точку: два равных адреса — это
              перечисление, и разметка обязана это сказать. */}
          <ul className="reveal m-0 mt-[clamp(2.2rem,7vh,4rem)] flex list-none flex-wrap items-baseline justify-center gap-x-[clamp(1.6rem,5vw,3.4rem)] gap-y-4 p-0"
            style={{ ['--i' as string]: 1 }}
          >
            {copy.contacts.map((k) => (
              <li key={k.word}>
                <a
                  className="link-major t-h3"
                  href={k.href}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {k.word}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/* ═════════════════════════ ПОДВАЛ ═════════════════════════
   Ф28 забирает из подвала всё, что в нём было:

     «убери внизу навигацию на фотографии и подпись про самозанятость.
      это лишнее»

   Убрано:
    · дублирующая навигация по фотографиям (`copy.footer.clusters` — шесть
      ссылок на серии и услуги). Она вообще не имела факта за собой;
    · упоминание юрстатуса (`copy.footer.legal`). Ф28 называет это ДЕФЕКТОМ
      СБОРКИ, а не решением владелицы: решение Ф17 — «юрстатус не добавлять на
      сайт сейчас», и билдер поставил заглушку «самозанятая / ИП» сам.
      На сайт не возвращается ни в каком виде;
    · заглушка контактов ⟦Telegram @ник · VK · телефон⟧: адреса теперь есть и
      стоят в блоке контактов, а VK и телефон Ф28 прямо запрещает добавлять;
    · навигация из восьми подписей — переехала в шапку в составе Ф28.

   Осталась волосяная линейка: страница должна кончаться краем, а не обрывом
   последней секции. Экранного текста в подвале больше нет — и это находка для
   гейта, а не готовое решение: если владелица захочет видеть внизу что-то ещё
   (год, права на кадры, политику данных), это новый текст, и его пишет
   копирайтер, а не я. Записано в хендоф.

   `<footer>` сохранён как лендмарк: самопроверка требует ровно один, и
   выкидывать лендмарк ради пустоты нельзя — линейка внизу это тоже подвал. */
export function Footer() {
  return (
    <footer className={`${SECT} pb-[clamp(2rem,5vh,3.2rem)] pt-[clamp(1.5rem,4vh,2.6rem)]`}>
      <div className={WRAP}>
        <div className="rule" />
      </div>
    </footer>
  );
}
