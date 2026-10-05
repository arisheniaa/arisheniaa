import { StrictMode, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { redirectPhotoAnchors } from './ui';

/** Точка входа варианта. Сначала — перенос старых фото-якорей на /ph. */
export function mount(node: ReactNode) {
  redirectPhotoAnchors();
  history.scrollRestoration = 'manual';
  createRoot(document.getElementById('root')!).render(<StrictMode>{node}</StrictMode>);
}
