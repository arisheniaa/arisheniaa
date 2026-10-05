import { useRef, type ReactNode } from 'react';
import { motion, useInView } from 'motion/react';
import { Signature } from './Signature';
import { copy } from './copy';
import { ABOUT_PHOTO, SLOTS, type Work } from './works';
import { Draft } from './ui';
import { TelegramChat } from './Chat';

/**
 * Разделы, общие для вариантов. Разметка одна, вид — классы `s-*`, которые
 * каждый вариант красит по-своему в своём css. Так варианты отличаются
 * характером, а не текстом и не структурой — сравнивать честнее.
 *
 * Нумерации блоков («01», «02»…), подписи «01 · сайт фотографа · 2026» над
 * названием работы и подписей в подвале больше нет — её правки после выбора
 * варианта A. Проп `n` у разделов оставлен, чтобы не трогать вызовы в
 * вариантах, но ничего не рисует.
 */

const rise = {
  initial: { opacity: 0, y: 40 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.3 },
  transition: { duration: 0.9, ease: [0.16, 1, 0.3, 1] },
} as const;

export function SectionHead({ title, children }: { n?: string; title: ReactNode; children?: ReactNode }) {
  return (
    <motion.header className="s-head" {...rise}>
      <h2 className="s-title">{title}</h2>
      {children && <div className="s-lead">{children}</div>}
    </motion.header>
  );
}

/** Подпись работы в центре параллакса / рядом с галереей. */
export function WorkCaption({ w }: { w: Work; i?: number }) {
  return (
    <motion.div className="s-work" {...rise}>
      <h3 className="s-work-name">{w.name}</h3>
      <p className="s-work-text">
        {w.text}
        {w.draft && <Draft />}
      </p>
      {w.href ? (
        <a className="s-work-link" href={w.href} {...(/^https?:/.test(w.href) ? { target: '_blank', rel: 'noreferrer' } : {})}>
          {copy.works.open} <span aria-hidden>↗</span>
        </a>
      ) : (
        <span className="s-work-link is-off">ссылка — по запросу</span>
      )}
    </motion.div>
  );
}

export function Slots() {
  return (
    <div className="s-slots">
      {SLOTS.map((s) => (
        <motion.div key={s.id} className="s-slot" {...rise}>
          <span className="s-slot-name">{s.name}</span>
          <span className="s-slot-text">{copy.works.slotText}</span>
          <span className="s-slot-kind">{s.kind}</span>
        </motion.div>
      ))}
    </div>
  );
}

/** `titled={false}` — без видимого заголовка (вариант A, её проба «только с
 *  текстом»); для читалок заголовок остаётся скрытым. */
export function About({ aside, titled = true }: { n?: string; aside?: ReactNode; titled?: boolean }) {
  return (
    <section id="about" className="s-about s-screen">
      <div className="wrap">
        {titled ? (
          <SectionHead title={<>{copy.about.title}</>}>{copy.about.draft && <Draft />}</SectionHead>
        ) : (
          <h2 className="sr-only">{copy.about.title}</h2>
        )}
        <div className="s-about-grid">
          <motion.figure className="s-about-photo" {...rise}>
            <img className="cutout" src={ABOUT_PHOTO} alt="Чёрно-белый плёночный автопортрет arisheniaa, вырезанный по силуэту с чёрной рамкой" loading="lazy" />
          </motion.figure>
          <motion.div className="s-about-text" {...rise}>
            <p className="s-about-lead">{copy.about.lead}</p>
            {copy.about.body.map((p) => (
              <p key={p}>{p}</p>
            ))}
            <a className="s-about-ph" href={copy.photoLink.href}>
              смотреть меня как фотографа ↗
            </a>
          </motion.div>
        </div>
        {aside}
      </div>
    </section>
  );
}

/** Цены — переписка в телеграме (её правка), разбор в `Chat.tsx`. */
export function Prices(_: { n?: string } = {}) {
  return (
    <section id="prices" className="s-prices s-screen">
      <div className="wrap s-chat-grid">
        {/* Видимого заголовка «Цены» нет (её правка: «убери заголовок, пусть
            останется текст»). Для экранных читалок и поиска он остаётся
            скрытым — раздел не должен стать безымянным. */}
        <motion.header className="s-head s-chat-head" {...rise}>
          <h2 className="sr-only">{copy.prices.title}</h2>
          <p className="s-chat-lead">Так обычно начинается работа{' '}— в переписке.</p>
        </motion.header>
        <motion.div {...rise}>
          <TelegramChat />
        </motion.div>
      </div>
    </section>
  );
}

export function Contacts({ children }: { n?: string; children?: ReactNode }) {
  const c = copy.contacts;
  return (
    <section id="contacts" className="s-contacts s-screen">
      <div className="wrap">
        <SectionHead title={c.title} />
        <motion.p className="s-contacts-line" {...rise}>
          {c.textBefore}
          <a href={c.href} target="_blank" rel="noreferrer">
            {c.textLink}
          </a>
          {c.textAfter}
        </motion.p>
        <div className="s-contacts-links">
          {c.links.map((l) => (
            <a key={l.word} href={l.href} target="_blank" rel="noreferrer">
              {l.word}
            </a>
          ))}
          <a href={copy.photoLink.href}>{copy.photoLink.label} ↗</a>
        </div>
        {children}
      </div>
    </section>
  );
}

/**
 * КОНТАКТЫ — ФИНАЛЬНЫЙ КАДР (её выбор после второго показа варианта A:
 * «финал с подписью»). Как последний кадр фильма: её фраза крупно, под ней
 * заново прорисовывается подпись Arisheniaa — когда блок въехал в экран, —
 * и строка ссылок: телеграм, инстаграм, фотография.
 * Видимого заголовка «Контакты» нет, для читалок и меню он скрытый.
 */
export function ContactsFinale() {
  const c = copy.contacts;
  const ref = useRef<HTMLDivElement>(null);
  const seen = useInView(ref, { once: true, amount: 0.5 });
  return (
    <section id="contacts" className="s-finale s-screen">
      <div className="wrap s-finale-in">
        <h2 className="sr-only">{c.title}</h2>
        <motion.p className="s-finale-line" {...rise}>
          {c.textBefore}
          <a href={c.href} target="_blank" rel="noreferrer">
            {c.textLink}
          </a>
          {c.textAfter}
        </motion.p>
        <div ref={ref} className="s-finale-sig">
          <Signature play={seen} duration={1.3} stagger={0.16} />
        </div>
        {/* Ссылки — как в прошлой версии контактов (её правка: «верни ссылки
            на соцсети как были»), вместо двух больших кнопок. */}
        <motion.div className="s-contacts-links s-finale-links" {...rise}>
          {c.links.map((l) => (
            <a key={l.word} href={l.href} target="_blank" rel="noreferrer">
              {l.word}
            </a>
          ))}
          <a href={copy.photoLink.href}>{copy.photoLink.label} ↗</a>
        </motion.div>
      </div>
    </section>
  );
}
