import '@fontsource/oi/cyrillic-400.css';
import '@fontsource/oi/latin-400.css';
import '@fontsource-variable/onest';
import '@fontsource-variable/jetbrains-mono';
import '../shared/base.css';
import './d.css';
import { mount } from '../shared/mount';
import { copy } from '../shared/copy';
import { WORKS } from '../shared/works';
import { SHADER_POSTER } from '../shared/Shader';
import { DeviceHero } from '../shared/DeviceHero';
import { CmpBar, FilmFx, Topbar, useMode } from '../shared/ui';
import { About, Contacts, Prices, SectionHead, Slots, WorkCaption } from '../shared/Sections';
import { Parallax, type PItem } from '../fx/Parallax';
import FlowingMenu from '../fx/FlowingMenu';
import ImageTrail from '../fx/ImageTrail';

/**
 * ВАРИАНТ D «КОНТРАСТ».
 * Первый экран тёмный — ноутбук светится в темноте. После раскрытия шейдер
 * гаснет (и перестаёт рисоваться), всё дальше — светлая бумага. Резкая
 * смена — сама по себе событие.
 * Гарнитура одна на всё крупное — Oi: ультражирный ретро-гротеск
 * с кириллицей, как афиша 70-х. Рядом спокойный Onest.
 * Работы: оглавление Flowing Menu (наведёшь — строка заливается, по ней
 * бегут кадры; клик — к экрану работы), затем экран-параллакс на каждую.
 * Контакты: Image Trail — курсор оставляет след из кадров.
 * Телефон: лёгкий режим.
 */
function framesOf(i: number): PItem[] {
  const w = WORKS[i];
  const out: PItem[] = [];
  for (let k = 0; k < 4; k++) {
    if (w.wide[k]) out.push({ src: w.wide[k], kind: 'wide' });
    if (w.phone[k + 1]) out.push({ src: w.phone[k + 1], kind: 'phone' });
  }
  return out;
}

const menu = [
  ...WORKS.map((w) => ({ link: `#w-${w.id}`, text: w.name, image: w.wide[0] ?? w.phone[0], images: [...w.phone.slice(0, 4)], sub: w.kind })),
  { link: '#slots', text: 'Концепт 01', image: SHADER_POSTER, images: [], sub: 'скоро' },
];
const TRAIL = WORKS.flatMap((w) => [w.wide[0], w.wide[2], w.wide[3]]).filter(Boolean);

function D() {
  const { device, fx, tilt } = useMode('lite');
  return (
    <>
      <FilmFx grain={0.1} leak={0} vignette={0} />
      <Topbar />
      <div id="top" />
      <DeviceHero
        device={device}
        fx={fx}
        restOpacity={0}
        titleSpace={0.32}
        hint={copy.hero.scroll}
        title={
          <>
            <p className="d-slogan" lang="en">
              <span>{copy.hero.slogan[0]}</span> <span className="d-slogan-2">{copy.hero.slogan[1]}</span>
            </p>
            <h1 className="d-h1">{copy.hero.h1}</h1>
          </>
        }
      />

      <main className="content d-light">
        <section className="d-intro">
          <div className="wrap">
            <p>{copy.hero.lead}</p>
          </div>
        </section>

        <section id="works">
          <div className="wrap">
            <SectionHead n="01" title={copy.works.title}>
              {copy.works.lead}
            </SectionHead>
          </div>
          <div className="d-menu">
            <FlowingMenu
              items={menu}
              textColor="var(--ink)"
              bgColor="transparent"
              marqueeBgColor="var(--accent)"
              marqueeTextColor="var(--ink)"
              borderColor="var(--ink)"
              speed={16}
              textClass="d-menu-text"
              pillClass="d-menu-pill"
            />
          </div>
          {WORKS.map((w, i) => (
            <section key={w.id} id={`w-${w.id}`} className="d-work" style={{ '--tint': w.tint } as React.CSSProperties}>
              <Parallax items={framesOf(i)} variant={i % 2 ? 'default' : 'edge-focus'} tilt={tilt} className="d-par">
                <div className="d-card">
                  <WorkCaption w={w} i={i} />
                </div>
              </Parallax>
            </section>
          ))}
          <div className="wrap" id="slots">
            <Slots />
          </div>
        </section>

        <About />
        <Prices />
        <Contacts>
          <div className="d-trail">
            <ImageTrail items={TRAIL} variant={2} imgClass="w-[clamp(150px,16vw,240px)] aspect-[16/10]" />
            <p className="d-trail-hint">поводите здесь</p>
          </div>
        </Contacts>
      </main>
      <CmpBar fx={fx} variant="D · контраст" />
    </>
  );
}

mount(<D />);
