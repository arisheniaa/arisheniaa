import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { SERVICES, type Service, type Shot } from './works';
import { Draft } from './ui';
import { Parallax, P, W, type Pos } from '../fx/Parallax';

/**
 * РАБОТЫ = УСЛУГИ (её правка 5 октября).
 *
 * «Блок цен уберём, соединим его с блоком работ. Блок работ сузим до одного
 * экрана и разобьём на три столбца: личный сайт/лендинг, многостраничник
 * для компании, разработка брендовой айдентики. Названия — как сейчас
 * названия сайтов, на полупрозрачном блоке».
 *
 * ТРИ СОСТОЯНИЯ, крестик в правом верхнем углу ведёт назад по одному шагу:
 *   1. три колонки разом — у каждой стеклянная карточка и скрины вокруг;
 *   2. нажали на услугу — она выходит в центр и растекается на весь экран,
 *      две другие остаются под ней, «как под стеклом» (полупрозрачный слой
 *      с размытием поверх страницы). Внутри — тот же параллакс скринов, что
 *      был у каждой работы, только скрины разных сайтов;
 *   3. нажали на скрин — он раскрывается крупно с подписью: какой это сайт,
 *      пара слов о нём и ссылка (`Lightbox.tsx`, поле `cap`).
 * Esc делает то же, что крестик.
 *
 * КАК РАСКРЫВАЕТСЯ. Слой услуги с самого начала размером с окно, а видимую
 * часть задаёт `clip-path`: сначала это прямоугольник колонки, потом весь
 * экран. Содержимое не перестраивается по ходу — двигается только маска,
 * поэтому раскрытие плавное. Карточка с названием летит из своей колонки
 * в центр (`x`, `y`, `scale` от её прежнего места). Закрытие — то же назад,
 * к текущему положению колонки.
 */

/* Скрины вокруг карточки в СВЁРНУТОЙ колонке, в процентах колонки.
   COL_W — только кадры с ноутбука (компьютер), COL_P — только мобильные
   (телефон), COL — вперемешку (айдентика: приглашение + сертификат). */
/* Плотная группа: семь кадров внахлёст вокруг карточки (её правка
   «больше скринов, меньше пространства между ними, сгруппируй»). */
const COL_W: Pos[] = [
  { k: W, top: '0%', left: '4%' },
  { k: W, top: '4%', right: '0%' },
  { k: W, top: '24%', left: '-4%' },
  { k: W, top: '28%', right: '-6%' },
  { k: W, top: '52%', left: '0%' },
  { k: W, top: '56%', right: '-2%' },
  { k: W, top: '74%', left: '22%' },
];
/* Телефон: каждая услуга — почти на весь экран (её правка), вокруг
   карточки с описанием восемь мобильных кадров. */
const COL_P: Pos[] = [
  { k: P, top: '1%', left: '3%' },
  { k: P, top: '0%', left: '37%' },
  { k: P, top: '2%', right: '3%' },
  { k: P, top: '27%', left: '-4%' },
  { k: P, top: '29%', right: '-4%' },
  { k: P, top: '74%', left: '4%' },
  { k: P, top: '76%', left: '38%' },
  { k: P, top: '73%', right: '3%' },
];
/* Айдентика на телефоне: сертификат сверху и снизу, телефоны по бокам. */
const COL_MOB_MIX: Pos[] = [
  { k: W, top: '1%', left: '24%' },
  { k: P, top: '3%', left: '1%' },
  { k: P, top: '4%', right: '1%' },
  { k: P, top: '30%', left: '-4%' },
  { k: P, top: '32%', right: '-4%' },
  { k: P, top: '72%', left: '2%' },
  { k: P, top: '71%', right: '2%' },
  { k: W, top: '80%', left: '25%' },
];
const COL: Pos[] = [
  { k: W, top: '3%', left: '0%' },
  { k: P, top: '1%', right: '4%' },
  { k: W, top: '74%', right: '0%' },
  { k: P, top: '62%', left: '3%' },
  { k: P, top: '30%', left: '-1%' },
  { k: P, top: '36%', right: '0%' },
];

/* РАСКРЫТАЯ УСЛУГА НА КОМПЬЮТЕРЕ. Кадры ставятся ЦЕНТРОМ (`c: true`) на
   точки, симметричные относительно центра окна, — а значит, и карточки
   (её правка: «при нажатии на услугу всё стремится к верхушке, сделай
   выравнивание по середине»). Раньше слоты задавались верхним углом в
   процентах высоты, а размер кадра — в процентах ширины, и на окнах разной
   формы кольцо съезжало; вдобавок кадры уводил вверх сдвиг от прокрутки
   (выключен: `drift` в Parallax).

   Расстояние рядов от центра — в vh и vw: полвысоты кадра растёт с шириной
   окна (кадр 19vw × 11,9vw), просвет до карточки — с высотой. */
const at = (k: Pos['k'], left: string, top: string): Pos => ({ k, c: true, left, top });
const up = (vh: number) => `calc(50% - ${vh}vh - 6vw)`;
const down = (vh: number) => `calc(50% + ${vh}vh + 6vw)`;

/* Сайты: десять кадров с ноутбука — четыре сверху, по одному по бокам,
   четыре снизу, с небольшим разбросом по высоте. */
const DESK_WIDE: Pos[] = [
  at(W, '19.5%', up(21)),
  at(W, '40%', up(22.5)),
  at(W, '60.5%', up(21.5)),
  at(W, '81%', up(20)),
  at(W, '12.5%', 'calc(50% - 1vh)'),
  at(W, '87.5%', 'calc(50% + 1vh)'),
  at(W, '18.5%', down(20)),
  at(W, '40.5%', down(22)),
  at(W, '61%', down(21)),
  at(W, '82%', down(22.5)),
];

/* Айдентика: двенадцать телефонов приглашения (её правка «добавь ещё
   скринов с приглашения») — по три столбца на сторону, в два ряда, волной;
   сертификат — лицом над карточкой и оборотом под ней. Столбцы отсчитаны
   от края карточки (она `min(560px, 86vw)`), чтобы не уходить под неё на
   широком окне и не разбегаться к краям на узком. Телефон — 9,6vw ×
   17,1vw, ряды — на полвысоты телефона от центра. */
const EDGE = 'min(280px, 43vw)';
const colL = (vw: number, min: number) => `max(${min}vw, calc(50% - ${EDGE} - ${vw}vw))`;
const colR = (vw: number, min: number) => `min(${100 - min}vw, calc(50% + ${EDGE} + ${vw}vw))`;
const rowUp = (vh: number) => `calc(50% - 8.6vw - ${vh}vh)`;
const rowDown = (vh: number) => `calc(50% + 8.6vw + ${vh}vh)`;
const BRAND_DESK: Pos[] = [
  at(W, '50%', up(21)),
  at(P, colL(26.4, 5.4), rowUp(-1.5)),
  at(P, colL(16, 15.4), rowUp(4.5)),
  at(P, colL(5.6, 25.6), rowUp(-1.5)),
  at(P, colR(5.6, 25.6), rowUp(4.5)),
  at(P, colR(16, 15.4), rowUp(-1.5)),
  at(P, colR(26.4, 5.4), rowUp(4.5)),
  at(P, colL(26.4, 5.4), rowDown(4.5)),
  at(P, colL(16, 15.4), rowDown(-1.5)),
  at(P, colL(5.6, 25.6), rowDown(4.5)),
  at(P, colR(5.6, 25.6), rowDown(-1.5)),
  at(P, colR(16, 15.4), rowDown(4.5)),
  at(P, colR(26.4, 5.4), rowDown(-1.5)),
  at(W, '50%', down(21)),
];

/* РАСКРЫТАЯ УСЛУГА НА ТЕЛЕФОНЕ: скрины — по ОВАЛУ, центр которого совпадает
   с центром карточки (её правка: «при раскрытии блок должен располагаться
   по центру овала из превью работ»). Карточка стоит в центре окна, значит и
   овал — вокруг центра окна; каждый кадр ставится своим ЦЕНТРОМ на точку
   овала (`c: true`), поэтому кольцо симметрично при любом размере кадра.

   Кадры расставлены через равные отрезки ДЛИНЫ овала, а не равные углы —
   иначе они сбиваются у боков, где овал круче. Первый кадр — сверху по
   центру, дальше по часовой. */
function ovalAngles(n: number, rx: number, ry: number) {
  const N = 720;
  const len: number[] = [0];
  for (let i = 1; i <= N; i++) {
    const t0 = ((i - 1) / N) * 2 * Math.PI;
    const t1 = (i / N) * 2 * Math.PI;
    len.push(len[i - 1] + Math.hypot(rx * (Math.cos(t1) - Math.cos(t0)), ry * (Math.sin(t1) - Math.sin(t0))));
  }
  const total = len[N];
  const out: number[] = [];
  for (let k = 0; k < n; k++) {
    const want = (k / n) * total;
    let i = 0;
    while (len[i + 1] < want) i++;
    out.push((i / N) * 2 * Math.PI - Math.PI / 2);
  }
  return out;
}
/* Точка овала в процентах окна. */
const onOval = (k: Pos['k'], t: number, rx: number, ry: number): Pos => ({
  k,
  c: true,
  left: `${(50 + rx * Math.cos(t)).toFixed(1)}%`,
  top: `${(50 + ry * Math.sin(t)).toFixed(1)}%`,
});

/* Кадры по точкам овала: вид каждого кадра задан списком, первый —
   сверху по центру, дальше по часовой. */
const ring = (kinds: Pos['k'][], rx: number, ry: number) =>
  ovalAngles(kinds.length, rx, ry).map((t, i) => onOval(kinds[i], t, rx, ry));
const many = (k: Pos['k'], n: number) => Array.from({ length: n }, () => k);

/* Сайты. Телефон: десять мобильных кадров, овал ближе к центру — сверху и
   снизу карточки, по бокам кадры чуть заходят под неё (её правка: «скрины
   стремятся вверх — пусть стремятся к центру»). */
const SITES = {
  desk: DESK_WIDE,
  mob: ring(many(P, 10), 36, 34),
};

/* Айдентика на телефоне: сертификат (лицо и оборот) — сверху и снизу,
   телефоны приглашения — по бокам. */
const BRAND = {
  desk: BRAND_DESK,
  mob: ring([W, P, P, P, P, W, P, P, P, P], 36, 34),
};

/** Скрины колонки: первые по виду под слоты COL. */
function thumbs(shots: Shot[], slots: Pos[]) {
  const wides = shots.filter((x) => x.kind === 'wide');
  const phones = shots.filter((x) => x.kind === 'phone');
  const out: { shot: Shot; pos: Pos }[] = [];
  for (const pos of slots) {
    const shot = (pos.k === W ? wides : phones).shift();
    if (shot) out.push({ shot, pos });
  }
  return out;
}

type Open = { s: Service; col: DOMRect; card: DOMRect; back?: { col: DOMRect; card: DOMRect } };

const clip = (r: DOMRect, round = 28) =>
  `inset(${r.top}px ${window.innerWidth - r.right}px ${window.innerHeight - r.bottom}px ${r.left}px round ${round}px)`;
const FULL = 'inset(0px 0px 0px 0px round 0px)';
const EASE = [0.22, 1, 0.36, 1] as const;

/** Откуда лететь карточке: сдвиг её центра от центра окна и масштаб. */
function from(card: DOMRect) {
  const tw = Math.min(560, window.innerWidth * 0.86);
  return {
    x: card.left + card.width / 2 - window.innerWidth / 2,
    y: card.top + card.height / 2 - window.innerHeight / 2,
    scale: card.width / tw,
  };
}

export function Services({ tilt = false }: { tilt?: boolean }) {
  const [open, setOpen] = useState<Open | null>(null);
  /* Колонка, в которую услуга возвращается: пока идёт обратная анимация,
     её собственная карточка ещё скрыта — иначе их было бы две. */
  const [leaving, setLeaving] = useState<string | null>(null);
  const cols = useRef<Record<string, HTMLDivElement | null>>({});
  const cards = useRef<Record<string, HTMLDivElement | null>>({});
  const closeBtn = useRef<HTMLButtonElement>(null);
  const mobile = useMemo(() => window.matchMedia('(max-width: 767px)').matches, []);
  /* Кадры услуги для этого экрана: сайты — только своего вида. */
  const shotsOf = useCallback(
    (s: Service) => (s.everywhere ? s.shots : s.shots.filter((x) => x.kind === (mobile ? 'phone' : 'wide'))),
    [mobile],
  );

  const show = (s: Service) => {
    const col = cols.current[s.id];
    const card = cards.current[s.id];
    if (!col || !card) return;
    setOpen({ s, col: col.getBoundingClientRect(), card: card.getBoundingClientRect() });
  };

  const close = useCallback(() => {
    /* Назад — к ТЕКУЩЕМУ месту колонки (окно могли повернуть или
       изменить), затем снимаем слой: выход анимируется к этим рамкам. */
    setOpen((o) => {
      if (!o) return o;
      setLeaving(o.s.id);
      const col = cols.current[o.s.id];
      const card = cards.current[o.s.id];
      return col && card ? { ...o, back: { col: col.getBoundingClientRect(), card: card.getBoundingClientRect() } } : o;
    });
    requestAnimationFrame(() => setOpen(null));
  }, []);

  /* Пока услуга раскрыта, страница под ней не листается; Esc — назад. */
  useEffect(() => {
    if (!open) return;
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    closeBtn.current?.focus({ preventScroll: true });
    return () => {
      html.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open?.s.id, close]);

  const last = useRef<string | null>(null);
  useEffect(() => {
    if (open) last.current = open.s.id;
    else if (last.current) {
      cols.current[last.current]?.focus({ preventScroll: true });
      last.current = null;
    }
  }, [open]);

  return (
    <>
      <div className={`svc-grid ${open ? 'is-open' : ''}`}>
        {SERVICES.map((s) => {
          const on = open?.s.id === s.id || leaving === s.id;
          return (
            <div
              key={s.id}
              ref={(el) => {
                cols.current[s.id] = el;
              }}
              className={`svc-col ${on ? 'is-on' : open || leaving ? 'is-under' : ''}`}
              role="button"
              tabIndex={0}
              aria-label={`${s.name} — открыть работы`}
              onClick={() => show(s)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') (e.preventDefault(), show(s));
              }}
            >
              {thumbs(shotsOf(s), s.everywhere ? (mobile ? COL_MOB_MIX : COL) : mobile ? COL_P : COL_W).map(({ shot, pos }, i) => (
                <span key={i} className="svc-thumb" style={{ top: pos.top, left: pos.left, right: pos.right }}>
                  {shot.ph ? (
                    <span className={`p-frame p-ph ${shot.kind === 'wide' ? 'svc-w' : 'svc-p'}`} />
                  ) : (
                    <img src={shot.src} alt="" loading="lazy" decoding="async" draggable={false} className={`p-frame ${shot.kind === 'wide' ? 'svc-w' : 'svc-p'}`} />
                  )}
                </span>
              ))}
              <div
                ref={(el) => {
                  cards.current[s.id] = el;
                }}
                className="a-card svc-card"
              >
                <h3 className="s-work-name">{s.name}</h3>
                <p className="s-work-text">
                  {s.text}
                  {s.draft && <Draft />}
                </p>
                <span className="s-work-link">
                  смотреть работы <span aria-hidden>→</span>
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Слой — в <body>: внутри `.content` (свой z-index) он оказался бы
          под шапкой. */}
      {createPortal(
      <AnimatePresence onExitComplete={() => setLeaving(null)}>
        {open && (
          <motion.div
            key={open.s.id}
            className="svc-over"
            role="dialog"
            aria-modal="true"
            aria-label={open.s.name}
            initial={{ clipPath: clip(open.col) }}
            animate={{ clipPath: FULL }}
            exit={{ clipPath: clip(open.back?.col ?? open.col) }}
            transition={{ duration: 0.75, ease: EASE }}
          >
            <Parallax
              items={shotsOf(open.s)}
              tilt={tilt}
              tiltButton={false}
              drift={false}
              slots={open.s.everywhere ? BRAND : SITES}
              variant={open.s.id === 'multi' ? 'edge-focus' : 'default'}
              className="svc-par"
            >
              <motion.div
                className="a-card svc-card svc-card-big"
                initial={from(open.card)}
                animate={{ x: 0, y: 0, scale: 1 }}
                exit={from(open.back?.card ?? open.card)}
                transition={{ duration: 0.75, ease: EASE }}
              >
                <h3 className="s-work-name">{open.s.name}</h3>
                <p className="s-work-text">
                  {open.s.text}
                  {open.s.draft && <Draft />}
                </p>
                <span className="svc-hint">нажмите на скрин, чтобы рассмотреть</span>
              </motion.div>
            </Parallax>
            <motion.button
              ref={closeBtn}
              type="button"
              className="svc-close"
              aria-label="Назад ко всем услугам"
              onClick={close}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1, transition: { delay: 0.35 } }}
              exit={{ opacity: 0, transition: { duration: 0.15 } }}
            >
              ×
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>,
      document.body,
      )}
    </>
  );
}
