import '@fontsource-variable/fraunces/full.css';
import '@fontsource-variable/onest';
import '@fontsource-variable/jetbrains-mono';
import './hub.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Signature } from './shared/Signature';

/**
 * ОГЛАВЛЕНИЕ ВАРИАНТОВ. Не часть сайта — страница для сравнения: что общего
 * у всех, чем каждый отличается, ссылки «как на компьютере / как на
 * телефоне». Превью — снимки `scripts/shots.mjs`, скопированные в public/hub.
 */
const B = import.meta.env.BASE_URL;
const V = [
  {
    id: 'a',
    name: 'Ночной показ',
    base: 'тёмная',
    works: 'экран-параллакс на каждую работу',
    fx: 'Circular Gallery — лента всех телефонных экранов',
    phone: 'айфон + наклон',
    type: 'Fraunces · Cormorant',
  },
  {
    id: 'b',
    name: 'Дневной свет',
    base: 'светлая, шейдер бледнеет до пастели',
    works: 'один общий параллакс + Flowing Menu',
    fx: 'Text Pressure — слоган толстеет у курсора',
    phone: 'айфон, без наклона',
    type: 'Roboto Flex · Yeseva One',
  },
  {
    id: 'c',
    name: 'Плёнка',
    base: 'тёмная, сильное зерно, перфорация',
    works: 'Circular Gallery, которую ведёт скролл',
    fx: 'Image Trail в «Обо мне», подпись — водяной знак',
    phone: 'айфон + наклон',
    type: 'Instrument Serif · Playfair',
  },
  {
    id: 'd',
    name: 'Контраст',
    base: 'тёмный первый экран → светлая афиша',
    works: 'Flowing Menu-оглавление + параллакс на работу',
    fx: 'Image Trail в контактах',
    phone: 'айфон, без наклона',
    type: 'Oi · Onest',
  },
];

function Hub() {
  return (
    <main className="hub">
      <header className="hub-head">
        <div className="hub-sig">
          <Signature />
        </div>
        <h1>Варианты сайта дизайнера</h1>
        <p>
          Общее у всех: «Retro soul, modern vision», ноутбук открывается по скроллу, на экране — градиент ваших цветов и подпись, экран вырастает в фон, цвет меняется при прокрутке (шейдер — на переключателе внизу). Работы: arisheniaa, Toto Shiro, «Элегия», приглашение + слоты под
          концепты. Цены — переписка в телеграме вашими словами; текст «Обо мне» — черновик.
        </p>
      </header>
      <ol className="hub-list">
        {V.map((v) => (
          <li key={v.id} className="hub-card">
            <a href={`./${v.id}.html`} className="hub-shot">
              <img src={`${B}hub/${v.id}.webp`} alt={`Вариант ${v.id.toUpperCase()}`} loading="lazy" />
            </a>
            <div className="hub-body">
              <span className="hub-id">{v.id.toUpperCase()}</span>
              <h2>{v.name}</h2>
              <dl>
                <dt>основа</dt>
                <dd>{v.base}</dd>
                <dt>работы</dt>
                <dd>{v.works}</dd>
                <dt>эффект</dt>
                <dd>{v.fx}</dd>
                <dt>телефон</dt>
                <dd>{v.phone}</dd>
                <dt>шрифты</dt>
                <dd>{v.type}</dd>
              </dl>
              <div className="hub-links">
                <a href={`./${v.id}.html`}>открыть</a>
                <a href={`./${v.id}.html?device=phone`}>как на телефоне</a>
                <a href={`./${v.id}.html?fx=shader`}>с шейдером</a>
              </div>
            </div>
          </li>
        ))}
      </ol>
      <a className="hub-fx" href="./effects.html">
        <span>Витрина эффектов</span>
        <small>все механики по одной: ноутбук, параллакс, Circular Gallery, Flowing Menu, Image Trail, Text Pressure, подпись, шейдер</small>
      </a>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Hub />
  </StrictMode>,
);
