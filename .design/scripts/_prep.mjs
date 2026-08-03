import sharp from 'sharp';
const SRC='C:/Users/Аришения/OneDrive/Рабочий стол/лайтрум трум трум';
const DST='C:/Users/Аришения/OneDrive/Рабочий стол/Claude Projects/Мой сайт/.design/directions/c/public/img';
// [файл, слуг, ширина:высота, позиция кропа]
const jobs=[
  ['DSC01167','quiet-window',  3,4, 'centre'], // ч/б, фигура в оконном проёме
  ['DSC_0049','gold-road',     4,5, 'centre'], // золотые деревья, переход дороги
  ['DSC_0226','still-water',   4,5, 'centre'], // сумеречное озеро, фигура мала
  ['DSC_0126','blur-turn',     4,5, 'top'   ], // ч/б смаз: резкий поворот
  ['DSC_0213','warm-portrait', 4,5, 'centre'], // тёплый закатный портрет
];
for(const [file,slug,aw,ah,pos] of jobs){
  for(const w of [560,1120]){
    await sharp(`${SRC}/${file}.jpg`).rotate()
      .resize(w, Math.round(w*ah/aw), {fit:'cover', position:pos})
      .jpeg({quality: w>800?76:80, mozjpeg:true})
      .toFile(`${DST}/${slug}-${w}.jpg`);
  }
  console.log(slug,'<-',file);
}
