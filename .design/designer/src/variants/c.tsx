import '@fontsource/instrument-serif/latin-400.css';
import '@fontsource/instrument-serif/latin-400-italic.css';
import '@fontsource-variable/playfair-display/wght.css';
import '@fontsource-variable/playfair-display/wght-italic.css';
import '@fontsource-variable/onest';
import '@fontsource-variable/jetbrains-mono';
import '../shared/base.css';
import './c.css';
import { useRef, useState } from 'react';
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'motion/react';
import { mount } from '../shared/mount';
import { copy } from '../shared/copy';
import { WORKS, SLOTS } from '../shared/works';
import { DeviceHero } from '../shared/DeviceHero';
import { CmpBar, FilmFx, Topbar, useMode } from '../shared/ui';
import { About, Contacts, Prices, SectionHead, WorkCaption } from '../shared/Sections';
import CircularGallery, { type GalleryApp } from '../fx/CircularGallery';
import ImageTrail from '../fx/ImageTrail';

/**
 * ВАРИАНТ C «ПЛЁНКА».
 * Тёмный, зерно сильнее, по краям разделов — перфорация и коды кадров, как
 * на краю плёнки. Подпись после раскрытия остаётся на фоне водяным знаком.
 * Портфолио целиком — Circular Gallery, которую ведёт скролл страницы:
 * блок «прилипает», лента едет кадр за кадром, подпись слева меняется на
 * ту работу, чей кадр в центре. Тянуть мышью/пальцем тоже можно.
 * «Обо мне» — Image Trail: ведёшь курсором, за ним сыплются кадры работ.
 * Телефон: полный режим (айфон + наклон).
 * Гарнитуры: Instrument Serif (кино-титры) для слогана, Playfair Display
 * для русских заголовков, JetBrains Mono — коды плёнки.
 */
type Frame = { image: string; text: string; work: number };
const FRAMES: Frame[] = [
  ...WORKS.flatMap((w, wi) => w.phone.slice(0, 5).map((src, k) => ({ image: src, text: k === 0 ? w.name : '', work: wi }))),
  ...SLOTS.map((s) => ({ image: `${import.meta.env.BASE_URL}shader-poster.webp`, text: s.name, work: -1 })),
];
const TRAIL = WORKS.flatMap((w) => w.wide.slice(0, 3));

function Reel() {
  const ref = useRef<HTMLDivElement>(null);
  const app = useRef<GalleryApp | null>(null);
  const [active, setActive] = useState(0);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    const a = app.current;
    if (!a || !a.medias[0]) return;
    const w = a.medias[0].width;
    a.scroll.target = v * w * (FRAMES.length - 1);
    const i = Math.max(0, Math.min(FRAMES.length - 1, Math.round(v * (FRAMES.length - 1))));
    setActive(FRAMES[i].work);
  });
  const w = active >= 0 ? WORKS[active] : null;
  return (
    <div ref={ref} className="c-reel" style={{ height: `${FRAMES.length * 38 + 100}vh` }}>
      <div className="c-reel-pin">
        <div className="c-reel-gallery">
          <CircularGallery
            items={FRAMES.map(({ image, text }) => ({ image, text }))}
            planeW={520}
            planeH={940}
            bend={-1.6}
            textColor="#efe8da"
            font="italic 400 40px 'Instrument Serif'"
            borderRadius={0.04}
            scrollEase={0.08}
            onApp={(a) => (app.current = a)}
          />
        </div>
        <div className="c-reel-caption">
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0, y: 24, filter: 'blur(8px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -16, filter: 'blur(8px)' }}
              transition={{ duration: 0.45 }}
            >
              {w ? (
                <WorkCaption w={w} i={active} />
              ) : (
                <div className="s-work">
                  <span className="s-work-meta">05–06 · концепт-сайты</span>
                  <h3 className="s-work-name">Скоро</h3>
                  <p className="s-work-text">{copy.works.slotText}</p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
        <p className="c-edge c-edge-l" aria-hidden>
          KODAK 400 · ▶ {String(active + 1).padStart(2, '0')}A · ARISHENIAA
        </p>
      </div>
    </div>
  );
}

function C() {
  const { device, fx, tilt } = useMode('full');
  return (
    <>
      <FilmFx grain={0.2} leak={0.22} vignette={0.6} />
      <Topbar />
      <div id="top" />
      <DeviceHero
        device={device}
        fx={fx}
        hint={copy.hero.scroll}
        signatureRest={0.1}
        title={
          <>
            <p className="c-slogan" lang="en">
              <em>{copy.hero.slogan[0]}</em> {copy.hero.slogan[1]}
            </p>
            <h1 className="c-h1">{copy.hero.h1}</h1>
          </>
        }
      />

      <main className="content">
        <section className="c-intro wrap">
          <p className="c-edge" aria-hidden>
            ▶ 00 · ПЛЁНКА ЗАРЯЖЕНА
          </p>
          <p className="c-intro-text">{copy.hero.lead}</p>
        </section>

        <section id="works">
          <div className="wrap">
            <SectionHead n="01 · 24 кадра" title={copy.works.title}>
              {copy.works.lead}
            </SectionHead>
          </div>
          <Reel />
        </section>

        <About
          aside={
            <div className="c-trail">
              <ImageTrail items={TRAIL} variant={1} imgClass="w-[clamp(160px,18vw,260px)] aspect-[16/10]" />
              <p className="c-trail-hint">ведите курсором или пальцем — здесь след из моих работ</p>
            </div>
          }
        />
        <Prices />
        <Contacts />
      </main>
      <CmpBar fx={fx} variant="C · плёнка" />
    </>
  );
}

mount(<C />);
