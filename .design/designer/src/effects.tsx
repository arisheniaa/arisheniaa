import '@fontsource-variable/fraunces/full.css';
import '@fontsource-variable/roboto-flex/full.css';
import '@fontsource-variable/onest';
import '@fontsource-variable/jetbrains-mono';
import './hub.css';
import './effects.css';
import { StrictMode, useState, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { Signature } from './shared/Signature';
import { Shader } from './shared/Shader';
import { MIXED, WORKS } from './shared/works';
import { Parallax } from './fx/Parallax';
import CircularGallery from './fx/CircularGallery';
import FlowingMenu from './fx/FlowingMenu';
import ImageTrail from './fx/ImageTrail';
import TextPressure from './fx/TextPressure';

/**
 * ВИТРИНА ЭФФЕКТОВ. reactbits.dev у владелицы не открывается, поэтому все
 * механики здесь по одной, уже на её работах. Под каждой — где она стоит в
 * вариантах. У Image Trail восемь стилей следа — переключатель, чтобы выбрать.
 */
function Fx({ n, title, where, children, note }: { n: string; title: string; where: string; children: ReactNode; note?: string }) {
  return (
    <section className="fx">
      <header className="fx-head">
        <span className="hub-id">{n}</span>
        <h2>{title}</h2>
        <p>{note}</p>
        <p className="fx-where">в вариантах: {where}</p>
      </header>
      <div className="fx-stage">{children}</div>
    </section>
  );
}

function SignatureDemo() {
  const [k, setK] = useState(0);
  return (
    <div className="fx-sig">
      <div key={k} style={{ width: 'min(760px, 90%)' }}>
        <Signature />
      </div>
      <button type="button" onClick={() => setK(k + 1)}>
        повторить
      </button>
    </div>
  );
}

function TrailDemo() {
  const [v, setV] = useState(1);
  return (
    <div className="fx-trail">
      <div className="fx-tabs">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <button key={i} type="button" aria-pressed={v === i} onClick={() => setV(i)}>
            стиль {i}
          </button>
        ))}
      </div>
      <div className="fx-trail-area">
        <ImageTrail key={v} items={WORKS.flatMap((w) => w.wide.slice(0, 3))} variant={v} imgClass="w-[clamp(150px,16vw,240px)] aspect-[16/10]" />
        <p>ведите курсором или пальцем</p>
      </div>
    </div>
  );
}

function Effects() {
  return (
    <main className="hub">
      <header className="hub-head">
        <a href="./" className="fx-back">
          ← все варианты
        </a>
        <h1>Витрина эффектов</h1>
        <p>Каждая механика отдельно, на ваших работах. Ноутбук здесь не показан — он занимает весь экран, смотрите его в любом варианте.</p>
      </header>

      <Fx n="01" title="Подпись Arisheniaa" where="все — экран ноутбука и логотип в шапке" note="Перенесена из соседней сессии один в один: перо бежит впереди, буква заливается за ним.">
        <SignatureDemo />
      </Fx>

      <Fx n="02" title="Шейдер" where="все — экран ноутбука, потом фон" note="Ровно ваша настройка с shadergradient.co: сфера, бирюза, оранжевый, лаванда, зерно.">
        <div className="fx-shader">
          <Shader />
        </div>
      </Fx>

      <Fx n="03" title="Parallax Hero Images" where="A, D — экран на каждую работу; B — один общий" note="Кадры на разной глубине: ближние двигаются сильнее. Мышь, а на телефоне — скролл и наклон.">
        <Parallax items={MIXED.map((src, i) => ({ src, kind: i % 2 ? 'phone' : 'wide' }))} className="fx-par" tilt>
          <h3 className="fx-par-title">Работы</h3>
        </Parallax>
      </Fx>

      <Fx n="04" title="Circular Gallery" where="A — лента экранов; C — всё портфолио, едет скроллом" note="Кадры на изогнутой плёнке. Тяните мышью или пальцем, стрелки ← → тоже работают.">
        <div className="fx-gal">
          <CircularGallery items={WORKS.flatMap((w) => w.phone.slice(0, 3).map((image, k) => ({ image, text: k ? '' : w.name })))} planeW={540} planeH={960} bend={2} textColor="#f2ede4" font="400 34px 'Fraunces Variable'" borderRadius={0.05} />
        </div>
      </Fx>

      <Fx n="05" title="Flowing Menu" where="B — список работ; D — оглавление работ" note="Наведите на строку: она заливается с той стороны, откуда пришёл курсор, по ней бегут кадры.">
        <div className="fx-menu">
          <FlowingMenu
            items={WORKS.map((w) => ({ link: w.href ?? '#', text: w.name, image: w.wide[0] ?? w.phone[0], images: w.phone.slice(0, 4), sub: w.kind }))}
            textColor="var(--ink)"
            bgColor="transparent"
            marqueeBgColor="#ff810a"
            marqueeTextColor="#111"
            borderColor="var(--line)"
            textClass="fx-menu-text"
            pillClass="fx-menu-pill"
          />
        </div>
      </Fx>

      <Fx n="06" title="Image Trail" where="C — «Обо мне»; D — контакты" note="За курсором сыплются кадры работ. Восемь стилей следа — переключайте и выбирайте.">
        <TrailDemo />
      </Fx>

      <Fx n="07" title="Text Pressure" where="B — слоган на первом экране" note="Буквы толстеют и расширяются рядом с курсором. На телефоне — рядом с пальцем.">
        <div className="fx-press">
          <TextPressure text="Retro soul" textColor="var(--ink)" weight width italic={false} minFontSize={32} />
        </div>
      </Fx>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Effects />
  </StrictMode>,
);
