/**
 * Контактный лист папки «портфолио» — чтобы отбирать кадры для рэка глазами,
 * а не по именам файлов. Лок (Ф19) требует расширить пул до 6–8+ кадров,
 * не обязательно одной серии; отбор — на исполнителе, значит его надо увидеть.
 *
 * Запуск: node .design/hybrid/scripts/contact-sheet.mjs
 * Кладёт .design/hybrid/shots/contact-NN.png (только .JPG, скриншоты отзывов .PNG
 * в лист не идут — это не кадры).
 */
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = 'C:/Users/Аришения/OneDrive/Рабочий стол/портфолио';
const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../shots');
fs.mkdirSync(OUT, { recursive: true });

const files = fs.readdirSync(SRC).filter((f) => /\.jpe?g$/i.test(f)).sort();
const COLS = 8;
const CW = 150;
const CH = 200;
const LABEL = 16;
const PER = 40;

console.log('кадров:', files.length);

for (let s = 0; s * PER < files.length; s++) {
  const chunk = files.slice(s * PER, s * PER + PER);
  const rows = Math.ceil(chunk.length / COLS);
  const comps = [];
  for (let i = 0; i < chunk.length; i++) {
    const buf = await sharp(path.join(SRC, chunk[i]))
      .rotate()
      .resize(CW, CH, { fit: 'cover', position: 'centre' })
      .png()
      .toBuffer();
    const svg = Buffer.from(
      `<svg width="${CW}" height="${LABEL}"><rect width="${CW}" height="${LABEL}" fill="#111"/>` +
        `<text x="3" y="12" font-family="monospace" font-size="11" fill="#eee">${chunk[i].replace(/\.[^.]+$/, '')}</text></svg>`,
    );
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    comps.push({ input: buf, left: col * CW, top: row * (CH + LABEL) });
    comps.push({ input: svg, left: col * CW, top: row * (CH + LABEL) + CH });
  }
  await sharp({
    create: { width: COLS * CW, height: rows * (CH + LABEL), channels: 3, background: '#222' },
  })
    .composite(comps)
    .png()
    .toFile(path.join(OUT, `contact-${String(s + 1).padStart(2, '0')}.png`));
  console.log('лист', s + 1, chunk.length);
}
