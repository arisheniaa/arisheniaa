import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
const SRC = 'C:/Users/Аришения/OneDrive/Рабочий стол/лайтрум трум трум';
const files = fs.readdirSync(SRC).filter(f => /\.jpe?g$/i.test(f)).sort();
const idx = process.argv[2].split(',').map(Number);
const out = process.argv[3];
for (const i of idx) {
  const meta = await sharp(path.join(SRC, files[i])).metadata();
  await sharp(path.join(SRC, files[i])).resize(760, 760, { fit: 'inside' })
    .jpeg({ quality: 82 }).toFile(path.join(out, `p${i}.jpg`));
  console.log(i, files[i], meta.width + 'x' + meta.height);
}
