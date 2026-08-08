/**
 * Растровые копии значка вкладки (Ф42).
 *
 * ИСТОЧНИК ОДИН — `public/favicon.svg`, где лежит семиугольная звезда из
 * шапки (тот же путь, что у `StarMark` в `src/Stars.tsx`). Этот скрипт
 * ничего не рисует сам, только пересчитывает вектор в те форматы, которые
 * векторного значка не понимают. Правится звезда — правится SVG, потом
 * `npm run favicon`, и растр догоняет сам; рисовать иконку в двух местах
 * руками нельзя, они разойдутся.
 *
 * ЗАЧЕМ РАСТР ВООБЩЕ, если SVG-значки уже понимают все живые браузеры:
 *  · `apple-touch-icon` 180×180 — iOS берёт ИМЕННО png, когда страницу
 *    добавляют на домашний экран; SVG она игнорирует молча;
 *  · `favicon-32.png` — запасной путь для браузеров без поддержки SVG в
 *    `<link rel="icon">`. Порядок в разметке такой, что современные берут
 *    вектор и до png не доходят.
 *
 * Запуск: npm run favicon
 */
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'public/favicon.svg');

if (!fs.existsSync(SRC)) {
  console.error('нет исходного значка:', SRC);
  process.exit(1);
}

const svg = fs.readFileSync(SRC);
const JOBS = [
  { out: 'public/favicon-32.png', size: 32 },
  { out: 'public/apple-touch-icon.png', size: 180 },
];

for (const j of JOBS) {
  const dest = path.join(ROOT, j.out);
  await sharp(svg, { density: 384 }).resize(j.size, j.size).png().toFile(dest);
  const st = fs.statSync(dest);
  console.log(path.basename(j.out).padEnd(24), `${j.size}×${j.size}`, `${(st.size / 1024).toFixed(1)} КБ`);
}
