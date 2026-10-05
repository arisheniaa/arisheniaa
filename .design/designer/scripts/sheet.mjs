// Контактный лист: все снимки варианта одной картинкой.
//   node scripts/sheet.mjs a-1440   →  _shots/sheet-a-1440.jpg
import sharp from 'sharp';
import fs from 'node:fs';

const prefix = process.argv[2];
const cols = Number(process.argv[3] || 3);
const files = fs.readdirSync('_shots').filter((f) => f.startsWith(prefix + '-') && f.endsWith('.png')).sort();
const metas = await Promise.all(files.map((f) => sharp(`_shots/${f}`).metadata()));
const tw = prefix.includes('-390') ? 260 : 520;
const th = Math.round((metas[0].height / metas[0].width) * tw);
const bufs = await Promise.all(files.map((f) => sharp(`_shots/${f}`).resize(tw, th, { fit: 'cover', position: 'top' }).toBuffer()));
const rows = Math.ceil(files.length / cols);
await sharp({ create: { width: cols * tw + (cols - 1) * 6, height: rows * th + (rows - 1) * 6, channels: 3, background: '#777' } })
  .composite(bufs.map((b, i) => ({ input: b, left: (i % cols) * (tw + 6), top: Math.floor(i / cols) * (th + 6) })))
  .jpeg({ quality: 82 })
  .toFile(`_shots/sheet-${prefix}.jpg`);
console.log(`_shots/sheet-${prefix}.jpg`, files.length);
