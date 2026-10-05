import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { motion, useMotionValueEvent, useScroll, useTransform } from 'motion/react';
import { Shader } from './Shader';
import { Signature } from './Signature';
import { Keypad, SpeakerGrid, Trackpad } from './Keyboard';

/**
 * ПЕРВЫЙ ЭКРАН: ноутбук (на телефоне — телефон), который открывается по
 * скроллу, а его экран разрастается и становится фоном всего сайта.
 *
 * Основа — MacbookScroll из aceternity, но с двумя переделками по брифу:
 *   1. На экране не картинка, а живой шейдер с её настройкой и подпись
 *      Arisheniaa, которая прорисовывается, когда крышка открылась.
 *   2. Экран не улетает вниз страницы, как в оригинале, а растёт до
 *      размеров окна и остаётся фоном (вопрос 4: «подпись и шейдер»).
 *
 * КАК ЭТО СДЕЛАНО, ЧТОБЫ ФОН БЫЛ ОДИН. Крышка с самого начала имеет размер
 * ОКНА (W×H) и стоит `position: fixed`, а маленькой её делает `scale3d`.
 * Поэтому шейдер всегда рисуется в полном разрешении окна и после
 * раскрытия просто остаётся на месте: одна WebGL-сцена на всю страницу,
 * без подмены одного холста другим и без скачка на стыке. Масштаб — 3D,
 * чтобы глубина поворота крышки уменьшалась вместе с ней, иначе перспектива
 * у маленькой крышки была бы как у огромной.
 *
 * Хореография (p — доля пути от 0 до конца раскрытия):
 *   0 … 0.32 — крышка поднимается из приоткрытого положения, заголовок уходит;
 *   ~0.14    — подпись начинает прорисовываться;
 *   0.36 … 0.92 — экран растёт до окна, корпус уезжает вниз и гаснет.
 */
export type Device = 'laptop' | 'phone';

export function DeviceHero({
  title,
  device,
  fx = 'mesh',
  screenBg = '#050505',
  signatureColor = '#fff',
  signatureRest = 0,
  hint,
  dark = true,
  restOpacity = 1,
  titleSpace = 0.28,
  glow = false,
  titleHug,
  zoomWhole = false,
  onProgress,
}: {
  title: ReactNode;
  device: Device;
  fx?: 'mesh' | 'shader' | 'lite';
  screenBg?: string;
  signatureColor?: string;
  /** Видимость подписи после раскрытия: 0 — гаснет, 0.1 — остаётся водяным знаком. */
  signatureRest?: number;
  hint?: string;
  dark?: boolean;
  /** Прозрачность фона, когда пошёл контент: 1 — шейдер остаётся во всю
   *  силу (A, C), 0.3 — бледнеет до пастели на светлой основе (B), 0 — гаснет
   *  совсем и перестаёт рисоваться (D, «тёмный hero → светлое ниже»). */
  restOpacity?: number;
  /** Доля высоты окна над устройством — место под заголовок. */
  titleSpace?: number;
  /** Тёплое свечение под устройством (вариант A после её правок). */
  glow?: boolean;
  /** Заголовок опускается к самой крышке: его низ — на столько пикселей выше
   *  видимого верха крышки (вариант A, её правка: «спусти Retro soul поближе
   *  к ноутбуку» — в окне артефакта заголовок наезжал на шапку). */
  titleHug?: number;
  /** Ноутбук не разбирается: экран не отрывается от клавиатуры, а «камера»
   *  наезжает на ноутбук целиком, пока экран не закроет окно (вариант A,
   *  её правка 5 октября: «не отсоединяй экран от клавиатуры — пусть
   *  картинка ноутбука остаётся ею же, просто увеличивай экран»). */
  zoomWhole?: boolean;
  onProgress?: (p: number) => void;
}) {
  const [{ W, H }, setSize] = useState(() => ({ W: window.innerWidth, H: window.innerHeight }));

  /* Мобильная адресная строка меняет высоту окна на каждом скролле. Если
     пересчитывать раскладку на каждое такое событие, ноутбук прыгает.
     Пересчёт — только когда сменилась ширина или высота сильно. */
  useLayoutEffect(() => {
    const on = () =>
      setSize((s) => {
        const w = window.innerWidth;
        const h = window.innerHeight;
        if (w === s.W && Math.abs(h - s.H) < 140) return s;
        return { W: w, H: h };
      });
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);

  const phone = device === 'phone';
  /* Ширина устройства в закрытом виде. */
  const narrow = W < 768;
  const L = phone ? Math.min(W * 0.5, 260) : narrow ? W * 0.84 : Math.min(W * 0.44, 720);
  /* МАСШТАБ ПО ДВУМ ОСЯМ. Крышка ноутбука в закрытом виде — 16:10, а окно
     бывает любым, в том числе высоким и узким (телефон, узкое окно
     claude.ai). Поэтому сжатие по ширине (s0x) и по высоте (s0y) своё, и
     раскрытие сводит оба к 1 — крышка вырастает ровно в окно. Раньше на
     узком экране вместо ноутбука показывался телефон; её правка — ноутбук
     везде. У телефона (другие варианты) пропорции окна и так подходят. */
  const s0x = L / W;
  const s0y = phone ? s0x : L / 1.6 / H;
  const lidH = H * s0y;
  const top = H * (phone ? Math.max(titleSpace, 0.3) : titleSpace);
  const hingeY = Math.min(top + lidH, H * (phone ? 0.94 : 0.86));
  const a0 = phone ? 38 : -42; // телефон лежит откинутым, крышка ноутбука — приоткрыта
  const E = H * 1.7; // путь раскрытия в пикселях скролла

  const { scrollY } = useScroll();
  const p = useTransform(scrollY, [0, E], [0, 1], { clamp: true });
  /* К концу раскрытия фон уходит к `restOpacity` за полэкрана скролла —
     начинает чуть раньше конца, потому что первый текст уже въезжает. */
  const stageO = useTransform(scrollY, [E * 0.9, E * 0.9 + H * 0.5], [1, restOpacity]);
  const [gone, setGone] = useState(false);
  useMotionValueEvent(scrollY, 'change', (v) => {
    if (restOpacity > 0) return;
    const g = v > E * 0.9 + H * 0.55;
    if (g !== gone) setGone(g);
  });
  useMotionValueEvent(p, 'change', (v) => onProgress?.(v));

  const rot = useTransform(p, [0, 0.32], [a0, 0]);
  const tilt = useTransform(p, [0, 0.32], [phone ? -7 : 0, 0]);
  /* Наезд камерой (zoomWhole): крышка и корпус остаются как в открытом
     виде, растёт вся сцена — от центра экрана, пока экран не накроет окно
     целиком (по большей из сторон), и центр экрана съезжает в центр окна.
     Масштаб растёт по степени, а не линейно: так наезд воспринимается
     равномерным, без рывка в конце. */
  const whole = zoomWhole && !phone;
  const screenCY = hingeY - lidH / 2;
  const zoomK = Math.max(W / (L - 18), H / (lidH - 18)) * 1.03;
  const zt = useTransform(p, [0.36, 0.92], [0, 1]);
  const zoomT = useTransform(zt, (t) => `translate3d(0, ${(H / 2 - screenCY) * t}px, 0) scale(${Math.pow(zoomK, t)})`);
  const sx = useTransform(p, [0.36, 0.92], whole ? [s0x, s0x] : [s0x, 1]);
  const sy = useTransform(p, [0.36, 0.92], whole ? [s0y, s0y] : [s0y, 1]);
  const y = useTransform(p, [0.36, 0.92], whole ? [hingeY - H, hingeY - H] : [hingeY - H, 0]);
  const lidT = useTransform(
    [y, sx, sy, rot, tilt] as const,
    ([yy, ax, ay, rr, tt]: number[]) =>
      `translate3d(0, ${yy}px, 0) scale3d(${ax}, ${ay}, ${ay}) rotateX(${rr}deg) rotateZ(${tt}deg)`,
  );
  /* Рамка и скругление — в единицах ДО масштаба: делим на сжатие своей оси,
     чтобы в закрытом виде рамка была ~9 px на экране со всех сторон, и к
     концу сводим в ноль. Скругление эллиптическое по той же причине. */
  const k = useTransform(p, [0.36, 0.92], whole ? [1, 1] : [1, 0]);
  const kb = useTransform(p, [0.36, 0.8], whole ? [1, 1] : [1, 0]);
  const bezel = useTransform(kb, (v) => `${(9 * v) / s0y}px ${(9 * v) / s0x}px`);
  const rr0 = phone ? 38 : 14;
  const ri0 = phone ? 30 : 6;
  const radius = useTransform(k, (v) => `${(rr0 * v) / s0x}px / ${(rr0 * v) / s0y}px`);
  const innerR = useTransform(k, (v) => `${(ri0 * v) / s0x}px / ${(ri0 * v) / s0y}px`);
  /* Подпись внутри крышки не должна растягиваться от разного сжатия осей —
     поэтому по ширине она сжата обратно до пропорций высоты. */
  const sigSX = useTransform([sx, sy] as const, ([ax, ay]: number[]) => ay / ax);
  /* …и ширина подписи считается так, чтобы на экране она занимала ~62%
     ширины КРЫШКИ, а не окна (на узком экране иначе выходила крошечной).
     При наезде на ноутбук целиком подпись растёт вместе с экраном, но не
     шире 86% окна: на телефоне экран, чтобы закрыть высоту окна, вырастает
     почти вчетверо, и подпись обрезалась по бокам. На компьютере до этого
     предела она не дорастает (на 1536×706 — 66% окна). Видимая ширина =
     доля × ширина окна × сжатие по высоте × наезд. */
  const sigW = useTransform([sx, sy, zt] as const, ([ax, ay, t]: number[]) => {
    const pct = Math.min(62 * (ax / ay), 260);
    return `${whole ? Math.min(pct, 86 / (ay * Math.pow(zoomK, t))) : pct}%`;
  });

  const baseY = useTransform(p, [0.36, 0.8], whole ? [0, 0] : [0, H * 0.7]);
  const baseO = useTransform(p, [0.4, 0.7], whole ? [1, 1] : [1, 0]);
  const baseK = L / 512;
  const baseT = useTransform(baseY, (by) => `translate3d(0, ${by}px, 0) rotateX(76deg) scale3d(${baseK}, ${baseK}, ${baseK})`);

  const titleO = useTransform(p, [0, 0.2], [1, 0]);
  const titleY = useTransform(p, [0, 0.25], [0, -80]);
  const hintO = useTransform(p, [0, 0.06], [1, 0]);
  const sigO = useTransform(p, [0.5, 0.92], [1, signatureRest]);
  const notchO = useTransform(p, [0.36, 0.6], [1, 0]);
  const glowO = useTransform(p, [0.3, 0.7], [1, 0]);

  /* Видимый верх приоткрытой крышки ниже `top`: она откинута назад, и в
     перспективе её верхний край опускается. Меряем его на месте, когда
     страница вверху, и ставим низ заголовка над ним. Выше прежнего места
     заголовок не поднимается никогда. */
  const lidRef = useRef<HTMLDivElement>(null);
  const [titleH, setTitleH] = useState(top);
  useLayoutEffect(() => {
    if (!titleHug) return setTitleH(top);
    const id = requestAnimationFrame(() => {
      const r = lidRef.current?.getBoundingClientRect();
      if (r && window.scrollY < 4) setTitleH(Math.max(top, r.top - titleHug));
    });
    return () => cancelAnimationFrame(id);
  }, [W, H, top, titleHug]);

  const [sig, setSig] = useState(false);
  useMotionValueEvent(p, 'change', (v) => {
    if (v > 0.14 && !sig) setSig(true);
  });
  /* Уже прокрученная страница (обновили на середине) — подпись сразу целая. */
  useEffect(() => {
    if (p.get() > 0.14) setSig(true);
  }, [p]);

  return (
    <>
      <motion.div className="device-stage" style={{ opacity: stageO, visibility: gone ? 'hidden' : 'visible' }}>
        {/* Тёплое свечение под ноутбуком — из варианта «Плёнка» (её выбор).
            Неподвижное, гаснет, когда экран начинает расти. */}
        {glow && <motion.div className="hero-glow" style={{ left: W / 2, top: hingeY, opacity: glowO }} />}
        <motion.div
          className="device-zoom"
          style={whole ? { transform: zoomT, transformOrigin: `${W / 2}px ${screenCY}px` } : undefined}
        >
        {/* Корпус ноутбука: плоскость, лежащая от шарнира к зрителю. */}
        {!phone && (
          <motion.div
            className="device-base"
            style={{
              left: W / 2 - 256,
              top: hingeY,
              transform: baseT,
              opacity: baseO,
            }}
          >
            <div className="relative h-[22rem] w-[32rem] overflow-hidden rounded-2xl bg-[#272729]">
              <div className="relative h-10 w-full">
                <div className="absolute inset-x-0 mx-auto h-4 w-[80%] bg-[#050505]" />
              </div>
              <div className="relative flex">
                <div className="mx-auto h-full w-[10%] overflow-hidden">
                  <SpeakerGrid />
                </div>
                <div className="mx-auto h-full w-[80%]">
                  <Keypad />
                </div>
                <div className="mx-auto h-full w-[10%] overflow-hidden">
                  <SpeakerGrid />
                </div>
              </div>
              <Trackpad />
            </div>
          </motion.div>
        )}

        {/* Крышка / телефон: размер окна, уменьшен масштабом. */}
        <motion.div
          ref={lidRef}
          className="device-lid"
          style={{
            width: W,
            height: H,
            transform: lidT,
            borderRadius: radius,
            padding: bezel,
            background: phone ? '#0b0b0c' : '#0a0a0a',
          }}
        >
          <motion.div className="device-screen" style={{ borderRadius: innerR, background: screenBg }}>
            {!gone && <Shader kind={fx} density={1} />}
            <motion.div
              className="device-sig"
              style={{ opacity: sigO, color: signatureColor, scaleX: sigSX }}
            >
              <motion.div className="device-sig-box" style={{ width: sigW }}>
                <Signature play={sig} />
              </motion.div>
            </motion.div>
            <div className="device-glare" />
          </motion.div>
          {/* Камера ноутбука / «остров» телефона. */}
          <motion.div
            className={phone ? 'device-island' : 'device-cam'}
            style={{
              opacity: notchO,
              width: phone ? 86 / s0x : 6 / s0x,
              height: phone ? 24 / s0y : 6 / s0y,
              top: phone ? 14 / s0y : 3.5 / s0y,
            }}
          />
        </motion.div>
        </motion.div>
      </motion.div>

      {/* Заголовок — над устройством, в том же неподвижном слое. */}
      <motion.header
        className={`device-title ${dark ? 'text-white' : 'text-[var(--ink)]'}`}
        style={{ opacity: titleO, y: titleY, top: 0, height: titleH }}
      >
        {title}
      </motion.header>

      {hint && (
        <motion.p className="device-hint" style={{ opacity: hintO }}>
          {hint}
        </motion.p>
      )}

      {/* Распорка: путь скролла, за который проходит раскрытие. */}
      <div style={{ height: E + H * 0.55 }} aria-hidden />
    </>
  );
}
