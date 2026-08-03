import sharp from 'C:/Users/Аришения/OneDrive/Рабочий стол/Claude Projects/Мой сайт/node_modules/sharp/lib/index.js';
const SRC='C:/Users/Аришения/OneDrive/Рабочий стол/лайтрум трум трум';
const jobs=[
  ['DSC01167','quiet-window', 3, 4],   // ч/б, фигура в оконном проёме, много воздуха
  ['DSC_0049','gold-road',     3, 4],   // золотые деревья, фигура переходит дорогу
  ['DSC_0226','dusk-lake',     16, 9],  // сумеречное озеро, фигура мала
  ['DSC_0095','blur-turn',     3, 4],   // смаз: фигура повернулась
  ['DSC_0126','warm-portrait', 3, 4],   // тёплый портрет на закате
];
for(const [file,slug,aw,ah] of jobs){
  for(const w of [560,1120]){
    await sharp(`${SRC}/${file}.jpg`).rotate()
      .resize(w, Math.round(w*ah/aw), {fit:'cover', position:'attention'})
      .jpeg({quality: w>800?76:80, mozjpeg:true})
      .toFile(`public/img/${slug}-${w}.jpg`);
  }
  console.log(slug,'ok');
}
