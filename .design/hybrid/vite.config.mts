import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';

/**
 * Сборка гибрида.
 *
 * Обязательны ОБА плагина, и это не формальность: без `@tailwindcss/vite`
 * директивы `@tailwind utilities` и `@theme` из `styles.css` уходят в сборку
 * НЕОБРАБОТАННЫМИ. Vite при этом собирается успешно и печатает зелёный отчёт —
 * ругается только lightningcss, предупреждением, кодом 0. Результат: в CSS нет
 * ни одной утилиты (`flex`, `grid-cols-12`, `mx-auto`, `min-h-[100svh]`),
 * страница разваливается в одну колонку, а токены `--font-sans` не существуют
 * и шрифт падает на системный. Проверка — не «сборка прошла», а «в dist/*.css
 * есть правило .grid» (см. README, самопроверка).
 *
 * Порт 5176 задан жёстко (`--strictPort`): без strictPort Vite при занятом
 * порте молча уходит на соседний, и снимок делается с чужой сборки.
 *
 * `host: '127.0.0.1'`, а не значение по умолчанию: на этой машине `localhost`
 * разрешался только в IPv6, Vite слушал `[::1]:5176`, и Playwright, который
 * идёт по IPv4, получал ERR_CONNECTION_REFUSED при живом сервере. Вид отчёта
 * при этом был зелёный с обеих сторон: Vite печатал «ready», Playwright —
 * «refused». Явный IPv4-адрес снимает расхождение.
 *
 * Расширение `.mts`, а не `.ts`: в `package.json` стоит `"type": "commonjs"`,
 * и конфиг с ESM-синтаксисом Vite грузил через legacy-загрузчик с предупреждением.
 *
 * ВТОРАЯ ТОЧКА ВХОДА — `storyboard.html` (фича «Придумать съёмку»,
 * `BRIEF-STORYBOARD.md`). Это НЕ клиентский роутер: лок не одобрял новые
 * зависимости роутинга, а `window.location.pathname`-разбор внутри одного
 * бандла означал бы, что все компоненты обеих страниц (включая рэк, полотно,
 * звёзды главной) грузятся в один JS-чанк для читателя, который открыл только
 * бриф. Второй `.html`-файл — встроенная возможность Vite для многостраничных
 * сборок: два независимых входа, каждый со своим чанком. В dev-режиме Vite
 * отдаёт любой `.html` в корне проекта без этой записи; `rollupOptions.input`
 * нужен только для `vite build`, иначе `npm run build` включит в `dist/`
 * один `index.html` и молча потеряет вторую страницу — типовая ловушка,
 * которую страница показывает нормально в `dev`, но не после сборки.
 */
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { host: '127.0.0.1', port: 5176, strictPort: true },
  preview: { host: '127.0.0.1', port: 5176, strictPort: true },
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        storyboard: fileURLToPath(new URL('./storyboard.html', import.meta.url)),
        // ТРЕТЬЯ ТОЧКА ВХОДА — страница «Дизайн» (Ф67, ветка развилки).
        // Тот же принцип, что у storyboard: отдельный html — отдельный чанк,
        // и без этой строки `vite build` молча потерял бы страницу.
        design: fileURLToPath(new URL('./design.html', import.meta.url)),
      },
    },
  },
});
