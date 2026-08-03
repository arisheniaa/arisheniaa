import { chromium } from 'playwright';
import fs from 'fs';
const src = 'C:/Users/Аришения/OneDrive/Рабочий стол/лайтрум трум трум';
const out = 'C:/Users/Аришения/OneDrive/Рабочий стол/Claude Projects/Мой сайт/.design/directions/a/img';
const jobs = [
  ['DSC00796.jpg', 'okno', 1500],
  ['DSC_0203.jpg', 'osen', 1500],
  ['DSC00922.jpg', 'ohra', 1200],
  ['DSC_0126.jpg', 'pole', 1200],
  ['DSC00820.jpg', 'granat', 1000],
];
const b = await chromium.launch();
const p = await b.newPage();
for (const [f, name, max] of jobs) {
  const b64 = fs.readFileSync(src + '/' + f).toString('base64');
  const data = await p.evaluate(async ([url, max]) => {
    const img = new Image();
    img.src = url;
    await img.decode();
    const s = max / Math.max(img.width, img.height);
    const c = document.createElement('canvas');
    c.width = Math.round(img.width * s);
    c.height = Math.round(img.height * s);
    const g = c.getContext('2d');
    g.imageSmoothingQuality = 'high';
    g.drawImage(img, 0, 0, c.width, c.height);
    return { u: c.toDataURL('image/jpeg', 0.84), w: c.width, h: c.height };
  }, ['data:image/jpeg;base64,' + b64, max]);
  fs.writeFileSync(out + '/' + name + '.jpg', Buffer.from(data.u.split(',')[1], 'base64'));
  console.log(name, data.w + 'x' + data.h, ((fs.statSync(out + '/' + name + '.jpg').size / 1024) | 0) + 'kb');
}
await b.close();
