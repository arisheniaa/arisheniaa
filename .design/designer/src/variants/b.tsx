import '@fontsource-variable/roboto-flex/full.css';
import '@fontsource/yeseva-one/cyrillic-400.css';
import '@fontsource/yeseva-one/latin-400.css';
import '@fontsource-variable/onest';
import '@fontsource-variable/jetbrains-mono';
import '../shared/base.css';
import './b.css';
import { mount } from '../shared/mount';
import { copy } from '../shared/copy';
import { MIXED, WORKS } from '../shared/works';
import { DeviceHero } from '../shared/DeviceHero';
import { CmpBar, FilmFx, Topbar, useMode } from '../shared/ui';
import { About, Contacts, Prices } from '../shared/Sections';
import { SHADER_POSTER } from '../shared/Shader';
import { Parallax } from '../fx/Parallax';
import FlowingMenu from '../fx/FlowingMenu';
import TextPressure from '../fx/TextPressure';

/**
 * ВАРИАНТ B «ДНЕВНОЙ СВЕТ».
 * Светлая бумажная основа. Слоган — Text Pressure: буквы толстеют и
 * расширяются у курсора (Roboto Flex с осями ширины и веса). Шейдер после
 * раскрытия бледнеет до пастели — фон остаётся, но не спорит с текстом.
 * Работы: один общий параллакс (по два кадра с каждой), под ним — Flowing
 * Menu: наведёшь на строку — она заливается, по ней бегут кадры работы.
 * Телефон: лёгкий режим (кадр шейдера вместо WebGL).
 * Ретро — в антикве Yeseva One (дидона 70-х, есть кириллица) и в зерне.
 */
const menu = [
  ...WORKS.map((w) => ({ link: w.href ?? '#works', text: w.name, image: w.wide[0] ?? w.phone[0], images: [...w.wide.slice(0, 3), ...w.phone.slice(0, 2)], sub: w.kind })),
  { link: '#works', text: 'Концепт 01', image: SHADER_POSTER, images: [], sub: 'скоро' },
];

function B() {
  const { device, fx, tilt } = useMode('lite');
  return (
    <>
      <FilmFx grain={0.1} leak={0} vignette={0} />
      <Topbar />
      <div id="top" />
      <DeviceHero
        device={device}
        fx={fx}
        dark={false}
        screenBg="#1a1410"
        restOpacity={0.28}
        titleSpace={0.36}
        hint={copy.hero.scroll}
        title={
          <>
            <p className="sr-only" lang="en">{copy.hero.sloganPlain}</p>
            <div className="b-press" aria-hidden>
              <div className="b-press-line">
                <TextPressure text="Retro soul," textColor="var(--ink)" weight width italic={false} minFontSize={28} />
              </div>
              <div className="b-press-line">
                <TextPressure text="modern vision" textColor="var(--accent)" weight width italic={false} minFontSize={28} />
              </div>
            </div>
            <h1 className="b-h1">{copy.hero.h1}</h1>
          </>
        }
      />

      <main className="content">
        <section className="b-intro">
          <div className="wrap">
            <p>{copy.hero.lead}</p>
          </div>
        </section>

        <section id="works" className="b-works">
          <Parallax items={MIXED.map((src, i) => ({ src, kind: i % 2 ? 'phone' : 'wide' }))} className="b-par" tilt={tilt} maxOffset={56}>
            <div className="b-par-head">
              <span className="s-num">01</span>
              <h2 className="b-par-title">{copy.works.title}</h2>
              <p>{copy.works.lead}</p>
            </div>
          </Parallax>
          <div className="b-menu">
            <FlowingMenu
              items={menu}
              textColor="var(--ink)"
              bgColor="transparent"
              marqueeBgColor="var(--ink)"
              marqueeTextColor="var(--bg)"
              borderColor="var(--line)"
              speed={18}
              textClass="b-menu-text"
              pillClass="b-menu-pill"
            />
          </div>
          <div className="wrap b-menu-note">
            <p>Наведите на строку — по ней побегут кадры работы.</p>
          </div>
        </section>

        <About />
        <Prices />
        <Contacts />
      </main>
      <CmpBar fx={fx} variant="B · дневной свет" />
    </>
  );
}

mount(<B />);

