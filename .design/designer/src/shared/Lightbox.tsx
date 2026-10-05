import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CtlIcon } from './ui';

/**
 * ПРОСМОТР СКРИНА КРУПНО (её правка: «при нажатии на скрины открывались они
 * глубже, чётче, перед названием сайта — нажать на конкретный скрин, он
 * раскроется, и его можно рассмотреть вблизи»).
 *
 * Скрин вылетает ИЗ СВОЕГО МЕСТА: в момент нажатия запоминается его рамка на
 * экране, и большой кадр стартует ровно из неё, а при закрытии возвращается
 * туда же. Поэтому видно, какой именно скрин раскрылся.
 *
 * Листать внутри работы: стрелки на экране, ← → на клавиатуре, свайп.
 * Закрыть: клик по фону, крестик, Esc.
 *
 * Фон затемняется без размытия — размытие всего экрана и было одной из
 * причин, почему сайт тормозил (её «полный пакет» облегчения).
 */
/** Подпись к скрину (вкладка услуг): чей это сайт, пара слов и ссылка. */
export type Cap = { name: string; text: string; href?: string };
type Shot = { src: string; alt?: string; cap?: Cap };
type Open = (list: Shot[], index: number, from: HTMLElement) => void;
const Ctx = createContext<Open>(() => {});
export const useLightbox = () => useContext(Ctx);

type State = { list: Shot[]; index: number; rect: DOMRect; ratio: number; stepped: boolean } | null;

/** Пропорция кадра до загрузки: телефонные скрины 620×1102, остальные ~16:10. */
const guess = (src: string) => (/-md/.test(src) ? 620 / 1102 : 1.6);

/** Место под подпись снизу, если она есть. */
const CAP_H = 150;
function fit(ratio: number, cap = false) {
  const W = window.innerWidth;
  const H = window.innerHeight;
  const maxW = W * (W < 768 ? 0.92 : 0.84);
  const maxH = H * 0.84 - (cap ? CAP_H : 0);
  let w = maxW;
  let h = w / ratio;
  if (h > maxH) {
    h = maxH;
    w = h * ratio;
  }
  return { left: (W - w) / 2, top: (H - h - (cap ? CAP_H : 0)) / 2, width: w, height: h };
}

export function LightboxProvider({ children }: { children: ReactNode }) {
  const [st, setSt] = useState<State>(null);
  const [ratios, setRatios] = useState<Record<string, number>>({});
  const fromEl = useRef<HTMLElement | null>(null);

  const open = useCallback<Open>((list, index, from) => {
    fromEl.current = from;
    const img = from instanceof HTMLImageElement ? from : from.querySelector('img');
    const ratio = img && img.naturalWidth ? img.naturalWidth / img.naturalHeight : 0.56;
    setSt({ list, index, rect: from.getBoundingClientRect(), ratio, stepped: false });
  }, []);

  const close = useCallback(() => {
    /* Возвращаться — в ТЕКУЩЕЕ положение исходного скрина: страница могла
       сдвинуться, пока кадр был открыт. */
    setSt((s) => (s && fromEl.current ? { ...s, rect: fromEl.current.getBoundingClientRect() } : s));
    requestAnimationFrame(() => setSt(null));
  }, []);

  const step = useCallback((d: number) => {
    setSt((s) => (s ? { ...s, index: (s.index + d + s.list.length) % s.list.length, stepped: true } : s));
  }, []);

  useEffect(() => {
    if (!st) return;
    /* Ловим клавиши раньше всех (фаза захвата) и дальше не пускаем: под
       скрином может быть раскрытая услуга, и Esc должен закрыть только
       скрин — по шагу назад за раз (её правка про крестик). */
    const on = (e: KeyboardEvent) => {
      if (e.key === 'Escape') (e.stopImmediatePropagation(), close());
      if (e.key === 'ArrowRight') step(1);
      if (e.key === 'ArrowLeft') step(-1);
    };
    window.addEventListener('keydown', on, true);
    return () => window.removeEventListener('keydown', on, true);
  }, [st, close, step]);

  const touch = useRef(0);
  const cur = st ? st.list[st.index] : null;
  const ratio = !st || !cur ? 1 : ratios[cur.src] ?? (st.stepped ? guess(cur.src) : st.ratio);
  const target = st ? fit(ratio, !!cur?.cap) : null;
  const r = st?.rect;

  return (
    <Ctx.Provider value={open}>
      {children}
      <AnimatePresence>
        {st && cur && target && r && (
          <motion.div
            key="lb"
            className="lb"
            role="dialog"
            aria-modal="true"
            aria-label="Скрин крупно"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={close}
            onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
            onTouchEnd={(e) => {
              const dx = e.changedTouches[0].clientX - touch.current;
              if (Math.abs(dx) > 50) {
                e.stopPropagation();
                step(dx < 0 ? 1 : -1);
              }
            }}
          >
            <motion.img
              key={cur.src}
              className="lb-img"
              src={cur.src}
              alt={cur.alt ?? ''}
              onLoad={(e) => {
                const im = e.currentTarget;
                setRatios((m) => ({ ...m, [cur.src]: im.naturalWidth / im.naturalHeight }));
              }}
              /* Первый кадр вылетает из скрина; следующие при листании —
                 просто проявляются на месте. */
              initial={st.stepped ? { ...target, opacity: 0, scale: 0.96 } : { left: r.left, top: r.top, width: r.width, height: r.height, borderRadius: 10 }}
              animate={{ ...target, opacity: 1, scale: 1, borderRadius: 14 }}
              exit={{ left: r.left, top: r.top, width: r.width, height: r.height, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
            />
            {st.list.length > 1 && (
              <>
                <button type="button" className="lb-nav lb-prev" aria-label="Предыдущий скрин" onClick={(e) => (e.stopPropagation(), step(-1))}>
                  <CtlIcon name="prev" />
                </button>
                <button type="button" className="lb-nav lb-next" aria-label="Следующий скрин" onClick={(e) => (e.stopPropagation(), step(1))}>
                  <CtlIcon name="next" />
                </button>
                {!cur.cap && <span className="lb-count">
                  {st.index + 1} / {st.list.length}
                </span>}
              </>
            )}
            {cur.cap && (
              <motion.div
                key={`cap-${cur.src}`}
                className="lb-cap"
                style={{ top: target.top + target.height + 18 }}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: st.stepped ? 0 : 0.2 }}
                onClick={(e) => e.stopPropagation()}
              >
                <b className="lb-cap-name">{cur.cap.name}</b>
                <span className="lb-cap-text">{cur.cap.text}</span>
                {cur.cap.href && (
                  <a className="lb-cap-link" href={cur.cap.href} {...(/^https?:/.test(cur.cap.href) ? { target: '_blank', rel: 'noreferrer' } : {})}>
                    посмотреть сайт <span aria-hidden>↗</span>
                  </a>
                )}
              </motion.div>
            )}
            <button type="button" className="lb-close" aria-label="Закрыть" onClick={(e) => (e.stopPropagation(), close())}>
              <CtlIcon name="close" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </Ctx.Provider>
  );
}
