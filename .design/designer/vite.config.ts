import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';

/**
 * Сайт дизайнера — корень arisheniaa.ru.
 *
 * `npm run build` — то, что уходит на сервер: один вход `index.html`
 * (вариант A, выбран 4 октября 2026) и `public/` (кадры работ, пример
 * приглашения, robots, карта сайта).
 * `npm run build:variants` — все варианты для сравнения: оглавление
 * `variants.html`, A–D и витрина эффектов (так собирается артефакт для
 * просмотра на claude.ai).
 *
 * `base: './'` — сборка открывается из любой папки без пересборки. Порт и
 * IPv4-адрес заданы жёстко по той же причине, что в `../hybrid`.
 */
const page = (n: string) => fileURLToPath(new URL(`./${n}.html`, import.meta.url));

export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [react(), tailwindcss()],
  server: { host: '127.0.0.1', port: 5180, strictPort: true },
  preview: { host: '127.0.0.1', port: 5180, strictPort: true },
  build: {
    rollupOptions: {
      input:
        mode === 'variants'
          ? { index: page('index'), variants: page('variants'), a: page('a'), b: page('b'), c: page('c'), d: page('d'), effects: page('effects') }
          : { index: page('index') },
    },
  },
}));
