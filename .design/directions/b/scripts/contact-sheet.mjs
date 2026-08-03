// Контактный лист: одна PNG-простыня из выборки архива, чтобы кадры выбирались
// глазами, а не по имени файла. Служебный инструмент директора, не часть продукта.
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

const SRC = 'C:/Users/Аришения/OneDrive/Рабочий стол/лайтрум трум трум';
const OUT = process.argv[2] || 'sheet.png';
const START = Number(process.argv[3] || 0);
const COUNT = Number(process.argv[4] || 48);

const CELL = 150;
const COLS = 8;

const files = fs.readdirSync(SRC).filter((f) => /\.jpg$/i.test(f)).sort();
const step = Math.max(1, Math.floor(files.length / COUNT));
const picked = [];
for (let i = START; i < files.length && picked.length < COUNT; i += step) picked.push(files[i]);

const rows = Math.ceil(picked.length / COLS);
const composites = [];
for (let i = 0; i < picked.length; i++) {
  const buf = await sharp(path.join(SRC, picked[i]))
    .rotate()
    .resize(CELL, CELL, { fit: 'cover' })
    .png()
    .toBuffer();
  composites.push({ input: buf, left: (i % COLS) * CELL, top: Math.floor(i / COLS) * CELL });
}

await sharp({
  create: { width: COLS * CELL, height: rows * CELL, channels: 3, background: '#111' },
})
  .composite(composites)
  .png()
  .toFile(OUT);

console.log(picked.map((f, i) => `${i}:${f}`).join(' '));
