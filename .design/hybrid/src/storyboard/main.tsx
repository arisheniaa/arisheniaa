import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../styles.css';
import './storyboard.css';
import { StoryboardApp } from './StoryboardApp';

/* Точка входа второй страницы (`storyboard.html`). Импортирует `styles.css`
   главной первым — токены темы, шрифты, `.frame`/`.t-*`/`.link-*`/`.reveal`
   и весь остальной словарь направления должны быть ОДНИ на сайт, не два
   набора переменных, которые разойдутся при следующей правке цвета. */
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StoryboardApp />
  </StrictMode>,
);
