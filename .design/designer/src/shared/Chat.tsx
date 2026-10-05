import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useInView } from 'motion/react';
import { copy } from './copy';

/**
 * ЦЕНЫ ПЕРЕПИСКОЙ В ТЕЛЕГРАМЕ (её правка).
 *
 * Чат показан глазами КЛИЕНТА: наверху «arisheniaa · в сети», её ответы —
 * входящие слева, вопрос клиента — исходящий справа, зелёный, с двумя
 * галочками. Посетитель сайта и есть этот клиент — так он узнаёт себя.
 *
 * Сцена проигрывается один раз, когда чат въехал в экран: вопрос → она
 * «печатает» (точки в пузыре и в шапке) → сообщение, и так три раза.
 * Время набора — по длине сообщения, но не дольше 2 с: дольше уже ждёшь.
 * При `prefers-reduced-motion` вся переписка сразу на месте.
 *
 * Строка ввода внизу — настоящая ссылка в её телеграм: кто дочитал до
 * цены, тот одним нажатием пишет ей сам.
 *
 * ДВА ВИДА ОКНА (её правка): на компьютере — окно Telegram Desktop
 * (полоска окна, слева поиск и список чатов, справа диалог), на телефоне —
 * чат как в приложении на айфоне. Разметка одна: полоска и список чатов
 * просто скрыты на узком экране (`.tg-bar`, `.tg-side` в base.css).
 * В списке — только её чат и «Избранное», которое есть у всех: чужих
 * выдуманных переписок рядом с её не появляется.
 */
const B = import.meta.env.BASE_URL;
const c = copy.prices.chat;
const ANSWERS = [...c.answers, 'price'] as const;

function Ticks() {
  return (
    <svg className="tg-ticks" viewBox="0 0 18 11" aria-hidden>
      <path d="M1 6l3 3 6-7M7.5 9l1 1 6-8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Dots() {
  return (
    <span className="tg-dots" aria-hidden>
      <i />
      <i />
      <i />
    </span>
  );
}

export function TelegramChat() {
  const ref = useRef<HTMLDivElement>(null);
  const seen = useInView(ref, { once: true, amount: 0.45 });
  const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  /* step: 0 — пусто, 1 — вопрос, 2 — она печатает первое, 3 — первое
     отправлено, 4 — печатает второе … 7 — всё. Чётные после 1 — «печатает». */
  const [step, setStep] = useState(reduce ? 7 : 0);

  useEffect(() => {
    if (!seen || reduce || step >= 7) return;
    const len = step >= 2 && step % 2 === 0 ? (ANSWERS[(step - 2) / 2] === 'price' ? 60 : ANSWERS[(step - 2) / 2].length) : 0;
    const wait = step === 0 ? 300 : step % 2 === 1 ? 700 : Math.min(2000, 700 + len * 6);
    const t = setTimeout(() => setStep((s) => s + 1), wait);
    return () => clearTimeout(t);
  }, [seen, step, reduce]);

  const typing = step >= 2 && step < 7 && step % 2 === 0;
  const shown = step >= 3 ? Math.floor((step - 1) / 2) : 0;

  const bubble = {
    initial: { opacity: 0, y: 14, scale: 0.96 },
    animate: { opacity: 1, y: 0, scale: 1 },
    transition: { type: 'spring', stiffness: 420, damping: 32 },
  } as const;

  return (
    <div ref={ref} className="tg-win" role="figure" aria-label="Пример переписки в телеграме: что входит в работу и сколько стоит сайт">
      <div className="tg-bar" aria-hidden>
        <i />
        <i />
        <i />
        <span>Telegram</span>
      </div>
      <div className="tg-cols">
        <aside className="tg-side" aria-hidden>
          <div className="tg-search">Поиск</div>
          <div className="tg-item is-active">
            <img className="tg-ava" src={`${B}works/about.webp`} alt="" />
            <span className="tg-item-text">
              <b>{c.name}</b>
              <small>{typing ? `${c.typing}…` : shown >= 3 ? `${c.price.before}${c.price.sum}…` : step >= 1 ? c.question : ''}</small>
            </span>
            <time>{c.times[Math.min(shown, 3)]}</time>
          </div>
          <div className="tg-item">
            <span className="tg-ava tg-ava-saved">★</span>
            <span className="tg-item-text">
              <b>Избранное</b>
              <small>Сохранённые сообщения</small>
            </span>
          </div>
        </aside>
    <div className="tg">
      <header className="tg-head">
        <span className="tg-back" aria-hidden>
          ‹
        </span>
        <img className="tg-ava" src={`${B}works/about.webp`} alt="" />
        <span className="tg-who">
          <b>{c.name}</b>
          <small className={typing ? 'is-typing' : ''}>
            {typing ? (
              <>
                {c.typing}
                <Dots />
              </>
            ) : (
              c.online
            )}
          </small>
        </span>
      </header>

      <div className="tg-body">
        <span className="tg-date">сегодня</span>
        <AnimatePresence>
          {step >= 1 && (
            <motion.div key="q" className="tg-msg tg-out" {...bubble}>
              {c.question}
              <span className="tg-meta">
                {c.times[0]} <Ticks />
              </span>
            </motion.div>
          )}
          {c.answers.slice(0, shown).map((a, i) => (
            <motion.div key={`a${i}`} className="tg-msg tg-in" {...bubble}>
              {a}
              <span className="tg-meta">{c.times[i + 1]}</span>
            </motion.div>
          ))}
          {shown >= 3 && (
            <motion.div key="p" className="tg-msg tg-in" {...bubble}>
              {c.price.before}
              <b className="tg-sum">{c.price.sum}</b>
              {c.price.after}
              <span className="tg-meta">{c.times[3]}</span>
            </motion.div>
          )}
          {typing && (
            <motion.div key={`t${step}`} className="tg-msg tg-in tg-typing" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, transition: { duration: 0.1 } }}>
              <Dots />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <a className="tg-input" href={c.href} target="_blank" rel="noreferrer">
        <span>{c.input}</span>
        <svg viewBox="0 0 24 24" aria-hidden>
          <path d="M3 11.5 20.5 4l-3 16-5.5-5-3 3v-5L17 7l-10 6.5z" fill="currentColor" />
        </svg>
      </a>
    </div>
      </div>
    </div>
  );
}
