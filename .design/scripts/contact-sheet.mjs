// Контактный лист: 40 кадров на лист, подпись индексом.
// Нужен, чтобы директор смотрел кадры глазами, а не по именам файлов.
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

const SRC = 'C:/Users/Аришения/OneDrive/Рабочий стол/лайтрум трум трум';
const OUT = process.argv[2];
const COLS = 8, ROWS = 5, CELL = 190, PAD = 6;
const PER = COLS * ROWS;

const files = fs.readdirSync(SRC).filter(f => /\.jpe?g$/i.test(f)).sort();
console.log('files', files.length);

const W = COLS * (CELL + PAD) + PAD;
const H = ROWS * (CELL + PAD) + PAD;

for (let sheet = 0; sheet * PER < files.length; sheet++) {
  const slice = files.slice(sheet * PER, sheet * PER + PER);
  const composites = [];
  for (let i = 0; i < slice.length; i++) {
    const buf = await sharp(path.join(SRC, slice[i]))
      .resize(CELL, CELL, { fit: 'contain', background: { r: 20, g: 20, b: 20 } })
      .jpeg({ quality: 70 }).toBuffer();
    composites.push({
      input: buf,
      left: PAD + (i % COLS) * (CELL + PAD),
      top: PAD + Math.floor(i / COLS) * (CELL + PAD),
    });
  }
  const labels = slice.map((f, i) => {
    const x = PAD + (i % COLS) * (CELL + PAD) + 3;
    const y = PAD + Math.floor(i / COLS) * (CELL + PAD) + 13;
    return `<text x="${x}" y="${y}" font-family="monospace" font-size="12" fill="#ffef00">${sheet * PER + i}</text>`;
  }).join('');
  composites.push({
    input: Buffer.from(`<svg width="${W}" height="${H}">${labels}</svg>`),
    left: 0, top: 0,
  });

  await sharp({ create: { width: W, height: H, channels: 3, background: { r: 20, g: 20, b: 20 } } })
    .composite(composites)
    .jpeg({ quality: 74 })
    .toFile(path.join(OUT, `sheet-${String(sheet).padStart(2, '0')}.jpg`));
  console.log('sheet', sheet);
}
