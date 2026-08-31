/**
 * СТРАНИЦА «ДИЗАЙН» (Ф67, /design.html) — вторая ветка развилки.
 *
 * Владелица: «при нажатии "Узнать больше про дизайн" лендинг бы опускался
 * вниз также, как с фото, но лендинг был бы другой: стиль такой же, но было
 * мое портфолио с сайтами. включи в него скриншоты из моего сайта, затем из
 * сайта Алены — totoshiroph.ru, а затем и с ритуального сайта, но он еще не
 * выложен, но это в процессе».
 *
 * «Стиль такой же» исполнен не похожестью, а теми же файлами: полотно
 * (`Gradient`), зерно (`Grain`), типографские роли и токены — всё из общей
 * системы гибрида, ни одного нового цвета или гарнитуры. Россыпи звёзд на
 * ветке дизайна нет нигде — прямая просьба владелицы (третье сообщение
 * Ф67); звезда остаётся только в подписи имени (`Name`), это часть имени,
 * а не россыпь. Скриншоты сняты скриптом (`scripts/export-design-shots.mjs`),
 * не руками — пересъёмка при изменении любого из сайтов стоит одну команду.
 *
 * Порядок работ — её: мой сайт, затем Алёнин, затем «Элегия». У всех трёх
 * есть ссылка: «Элегия» выложена (elegia-tula.ru), и прежняя метка «скоро
 * откроется» снята вместе с причиной, по которой стояла.
 *
 * НАВИГАЦИЯ СВОЯ, НЕ ИЗ App.tsx. Header главной переиспользуется страницей
 * раскадровки, потому что там те же разделы того же сайта. Здесь — другая
 * ветка развилки: пункты «Выбрать съёмку» или «С чего начать» вели бы с
 * страницы про дизайн вглубь фотографического сайта, минуя его собственный
 * контекст. Два пункта: «Фотография» (дверь во вторую ветку) и «Телеграм».
 *
 * ФИНАЛЬНАЯ ФРАЗА И КОНТАКТЫ — из `copy.cta`/`copy.contacts` главной,
 * дословные её строки: контакты у обеих веток одни, и второй источник
 * правды о них означал бы расхождение при первой же правке.
 */
import { Fragment, useEffect, useState } from 'react';
import { copy } from '../copy';
import { dcopy } from './copy';
import { Gradient, Grain } from '../Gradient';
/* `Stars` не импортируются — третье сообщение Ф67: «и давай лендинг с
   дизайном тоже будет без звездочек». Ветка дизайна вся живёт без россыпи:
   и развилка (Gate.tsx), и эта страница. На фотографической ветке звёзды
   остаются как были. */
import { Name } from '../Name';
import { Gate } from '../Gate';
import { TiltFrame } from '../Tilt';
import { useReveal, useFocusScrub } from '../reveal';

const WRAP = 'relative z-10 mx-auto w-full max-w-[var(--measure)]';
const SECT = 'relative px-[var(--gutter)]';

export function DesignApp() {
  return (
    <>
      {/* `veil` — дыхание полотна: к середине страницы градиент светлеет до
          бежевого (цвет бумаги сайта) и к низу возвращается в зелёно-жёлтый
          (Ф67, её слова; сперва просила белый, следом — «белый сделай
          бежевым»). Формула и обоснование — `.mesh-veil` в
          styles.css; на фотографической ветке пропа нет и слой не
          рендерится. */}
      <Gradient veil />
      {/* Штора развилки: стоит только если сюда пришли с главной через
          «Узнать больше про дизайн», уезжает сама — см. Gate.tsx. */}
      <Gate page="design" />
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
      <main id="main" className="relative z-10">
        <Hero />
        <Works />
        <Cta />
      </main>
      <footer className={`${SECT} pb-[clamp(2rem,5vh,3.2rem)] pt-[clamp(1.5rem,4vh,2.6rem)]`}>
        <div className={WRAP}>
          <div className="rule" />
        </div>
      </footer>
    </>
  );
}

/* Шапка — та же строка, что на главной (имя со звездой слева, навигация
   справа), но НЕ фиксированная: страница короткая, три работы, и постоянная
   шапка здесь караулила бы пустоту. Подложка и логика скролла не нужны. */
function Header() {
  return (
    <header className="relative z-20 px-[var(--gutter)] py-[clamp(0.9rem,1.6vw,1.4rem)]">
      <div className="mx-auto flex max-w-[var(--measure)] items-center justify-between gap-[clamp(1rem,3vw,2.5rem)]">
        <Name />
        <nav aria-label="Разделы сайта">
          <ul className="m-0 flex list-none items-baseline gap-x-[clamp(0.9rem,1.8vw,1.9rem)] p-0">
            {dcopy.nav.map((n) => (
              <li key={n.label}>
                <a
                  className="nav-link"
                  href={n.href}
                  {...(n.href.startsWith('http')
                    ? { target: '_blank', rel: 'noopener noreferrer' }
                    : {})}
                >
                  {n.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}

/* Первый экран — лестница, как на главной, только из двух слов: страница
   обязана узнаваться как та же рука. Отступы ступеней те же, что в Hero
   главной, просто ступеней на одну меньше. */
function Hero() {
  return (
    <section className={`${SECT} flex min-h-[62svh] flex-col justify-center pb-[clamp(2.5rem,7vh,5rem)] pt-[clamp(3rem,8vh,6rem)]`}>
      <div className={WRAP}>
        <p className="reveal t-mono text-[color:var(--ink-mute)]">{dcopy.hero.mono}</p>
        {/* `t-display-long` — своя шкала кегля для заголовка из длинных слов,
            разбор в styles.css. На общей шкале «дизайнерский» не помещалось
            в полосу и срезалось по правому краю. */}
        <h1
          className="reveal t-display t-display-long mt-[clamp(1rem,2.4vw,2rem)]"
          style={{ ['--i' as string]: 1 }}
        >
          {/* Лестница трёх ступеней с теми же отступами, что у «Создаю ваше
              кино» на главной. Пробельный узел между ступенями обязателен и
              здесь: без него `textContent` склеился бы в «Создаю
              вашдизайнерскийсайт» — то же правило П8, что расписано у Hero
              главной.

              Ступени работают на ВСЕХ ширинах, как на главной. Первая
              версия правки отключала их на телефоне — казалось, что слово
              выталкивает за край именно отступ. Замер показал другое:
              «дизайнерский» не помещалось само по себе, отступ был ни при
              чём, и лечится это кеглем (`t-display-long`, styles.css), а не
              отменой приёма. Со своей шкалой запас положительный на всех
              проверенных ширинах вместе со ступенями. */}
          {dcopy.hero.h1.map((word, i) => (
            <Fragment key={word}>
              {i > 0 ? ' ' : null}
              <span className="block" style={{ paddingLeft: `${[0, 1.1, 2.4][i]}em` }}>
                {word}
              </span>
            </Fragment>
          ))}
        </h1>
        <p
          className="reveal t-lead mt-[clamp(1.6rem,3.4vw,2.6rem)] max-w-[40ch] text-[color:var(--ink-soft)]"
          style={{ ['--i' as string]: 2 }}
        >
          {dcopy.hero.lead}
        </p>
      </div>
    </section>
  );
}

/* Три работы. Не карточная сетка (композиционный контракт гибрида: одинаковых
   сеток нет нигде) — три разворота «скриншоты + текст» с чередованием сторон,
   разделённые волосяными линейками, как услуги на главной. Пара кадров
   в каждом развороте — ноутбук крупно и телефон внахлёст поверх угла:
   портфолио сайтов обязано показывать, что работа живёт в обеих ширинах. */
function Works() {
  return (
    <section className={`${SECT} pb-[clamp(4rem,12vh,9rem)]`}>
      <div className={WRAP}>
        {dcopy.projects.map((p, i) => (
          <Fragment key={p.name}>
            {i > 0 ? <div className="rule my-[clamp(3rem,8vh,5.5rem)]" /> : null}
            <Work p={p} flip={i % 2 === 1} index={i} />
          </Fragment>
        ))}
      </div>
    </section>
  );
}

function Work({
  p,
  flip,
  index,
}: {
  p: (typeof dcopy.projects)[number];
  flip: boolean;
  index: number;
}) {
  return (
    <div className="grid grid-cols-1 items-center gap-x-[var(--gap)] gap-y-[clamp(1.6rem,4vw,2.4rem)] lg:grid-cols-12">
      {/* Текст. В DOM всегда первым — читательский порядок «имя, потом
          кадры» не зависит от того, с какой стороны текст стоит глазу. */}
      <div className={flip ? 'lg:col-span-4 lg:col-start-9 lg:row-start-1' : 'lg:col-span-4 lg:col-start-1'}>
        {/* НУМЕРАЦИЯ «01 / 02 / 03» СНЯТА по прямой просьбе владелицы.
            Стояла моноширинным цветом акцента над именем каждой работы и
            держала порядок чтения; порядок никуда не делся — работы идут
            сверху вниз, разделённые линейками, и счёт им читатель ведёт
            сам. Ступени лестницы задержек ниже пересчитаны (было 1–2–3):
            вместе с номером ушла его ступень, а дырка в лестнице — это
            видимая глазом пауза на пустом месте (тот же разбор, что в Ф64,
            когда снимался надзаголовок блока «Придумать съёмку»). */}
        <h2 className="reveal t-h2">{p.name}</h2>
        <p
          className="reveal t-body mt-[clamp(0.8rem,2vw,1.2rem)] max-w-[34ch] text-[color:var(--ink-soft)]"
          style={{ ['--i' as string]: 1 }}
        >
          {p.text}
        </p>
        {/* Ссылка есть у всех трёх работ. Ветка с плашкой «скоро откроется»
            снята вместе с причиной: «Элегия» выложена, адрес дала владелица
            (`elegia-tula.ru`). Возврат метки — это возврат поля `status` в
            `./copy.ts` и трёх строк сюда; держать сейчас мёртвую ветку
            значило бы утверждать, что у работы может не быть адреса, а
            такой работы на странице больше нет. */}
        <p className="reveal mt-[clamp(1.2rem,3vw,1.8rem)]" style={{ ['--i' as string]: 2 }}>
          <a
            className="link-major link-tap t-lead"
            href={p.href}
            target="_blank"
            rel="noopener noreferrer"
          >
            {p.link}
          </a>
        </p>
      </div>

      {/* Кадры. Телефонный внахлёст на нижний угол ноутбучного, со стороны
          текста — пара смотрит на подпись, а не от неё. Ширина телефона 22%
          от блока кадров: при 390×844 это даёт высоту чуть меньше половины
          ноутбучного кадра, угол занят, кадр не спрятан. */}
      <div
        className={`relative ${
          flip ? 'lg:col-span-8 lg:col-start-1 lg:row-start-1' : 'lg:col-span-8 lg:col-start-5'
        }`}
      >
        <div className="reveal pb-[clamp(2.2rem,6vw,3.5rem)]" style={{ ['--i' as string]: 1 }}>
          <TiltFrame className={`overflow-visible ${flip ? 'mr-[8%]' : 'ml-[8%]'}`}>
            <div data-focus="in">
              <img
                src={p.shots.desktop}
                width={1600}
                height={1000}
                alt={p.alt.desktop}
                className="frame block w-full border border-[color:color-mix(in_srgb,var(--ink)_14%,transparent)]"
                loading={index === 0 ? 'eager' : 'lazy'}
                decoding="async"
              />
            </div>
          </TiltFrame>
          <img
            src={p.shots.phone}
            width={640}
            height={1385}
            alt={p.alt.phone}
            className={`frame absolute bottom-0 w-[22%] border border-[color:color-mix(in_srgb,var(--ink)_14%,transparent)] ${
              flip ? 'right-0 rotate-[2.5deg]' : 'left-0 rotate-[-2.5deg]'
            }`}
            loading="lazy"
            decoding="async"
          />
        </div>
      </div>
    </div>
  );
}

/* Финальная фраза и два контакта — дословно зоны главной (см. шапку файла). */
function Cta() {
  return (
    <section
      id="kontakt"
      aria-label="Контакты"
      className={`${SECT} pt-[clamp(3rem,8vh,6rem)] pb-[clamp(5rem,15vh,11rem)]`}
    >
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
          <ul
            className="reveal m-0 mt-[clamp(2.2rem,7vh,4rem)] flex list-none flex-wrap items-baseline justify-center gap-x-[clamp(1.6rem,5vw,3.4rem)] gap-y-4 p-0"
            style={{ ['--i' as string]: 1 }}
          >
            {copy.contacts.map((k) => (
              <li key={k.word}>
                <a
                  className="link-major link-tap t-h3"
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
