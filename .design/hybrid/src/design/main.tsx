/* Точка входа страницы «Дизайн» (Ф67) — та же пара строк, что у main.tsx
   главной и storyboard/main.tsx: свой вход у своей страницы, стили общие. */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../styles.css';
import { DesignApp } from './DesignApp';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DesignApp />
  </StrictMode>,
);
