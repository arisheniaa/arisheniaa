// Экспорт отобранных кадров в веб-размеры.
// Отбор владелицей не сделан (PHOTO-VERDICT ред.2, OQ по отбору) — кадры выбраны
// директором Ф2 по оси «воздух и одиночный объект». Кроп по этой же оси.
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = 'C:/Users/Аришения/OneDrive/Рабочий стол/лайтрум трум трум';
const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public/frames');
fs.mkdirSync(OUT, { recursive: true });

// name, файл, ширина вывода, aspect (w/h) или null = как есть
const PICKS = [
  // фигура в осеннем поле, песочное небо + зелёный луг. Одиночный объект на пустоте.
  { name: 'field',   file: 'DSC_0095.jpg', w: 1600, aspect: 3 / 4 },
  // озеро, фигура крошечная, охристое небо. Тихий регистр.
  { name: 'lake',    file: 'DSC_0227.jpg', w: 1600, aspect: 3 / 4 },
  // смазанная фигура в движении, ч/б. Прямое отрицание «идеальных пикселей».
  { name: 'blur',    file: 'DSC_0126.jpg', w: 1400, aspect: 3 / 4 },
  // ч/б смаз, горизонтальный. Кульминационный кадр творческой съёмки.
  { name: 'motion',  file: 'DSC_0324.jpg', w: 1800, aspect: 3 / 2 },
  // тёплый охра/зелёный портрет, контровой пасмурный свет.
  { name: 'looking', file: 'DSC_0279.jpg', w: 1400, aspect: 3 / 4 },
  // ——— добрано в третьем заходе, выбор с контактного листа scripts/contact-sheet.mjs ———
  // тёплый интерьер: окно во всю стену, осень снаруже, велюр подоконника.
  // Единственный кадр архива, близкий к подписи «Золото в интерьере».
  { name: 'gold',    file: 'DSC00796.jpg', w: 1400, aspect: 3 / 4 },
  // осенний парк и вода: охра листвы, зелёный шарф. Тихий регистр на улице.
  { name: 'autumn',  file: 'DSC_0203.jpg', w: 1400, aspect: 3 / 4 },
  // ч/б крупно, веснушки, зерно заметно. Нужен один кадр без воздуха вокруг —
  // иначе сетка из шести «одиночных объектов на пустоте» становится однообразной.
  { name: 'face',    file: 'DSC_0461.jpg', w: 800, aspect: 3 / 4 },
  // волосы в воздухе, тёплый свет. Странный регистр без постановочного предмета.
  { name: 'flying',  file: 'DSC_0374.jpg', w: 1400, aspect: 3 / 4 },
];

for (const p of PICKS) {
  const src = path.join(SRC, p.file);
  const img = sharp(src).rotate();
  const meta = await img.metadata();
  let pipe = img;
  if (p.aspect) {
    const h = Math.round(p.w / p.aspect);
    // position:'top' — намеренно. Смысл кадров в воздухе НАД фигурой;
    // умный кроп (attention) съел бы небо и уничтожил ось направления.
    pipe = pipe.resize(p.w, h, { fit: 'cover', position: 'top' });
  } else {
    pipe = pipe.resize(p.w, null);
  }
  await pipe.webp({ quality: 76 }).toFile(path.join(OUT, `${p.name}.webp`));
  // 2× для мобильного ретины не нужен: 1600 хватает на 390 CSS-px с запасом
  const st = fs.statSync(path.join(OUT, `${p.name}.webp`));
  console.log(p.name, `${meta.width}x${meta.height}`, '→', p.w, `${(st.size / 1024).toFixed(0)} КБ`);
}
