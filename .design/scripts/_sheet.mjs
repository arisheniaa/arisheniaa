import sharp from 'sharp';
import fs from 'fs';
const SRC='C:/Users/Аришения/OneDrive/Рабочий стол/лайтрум трум трум';
const OUT='C:/Users/A1C1~1/AppData/Local/Temp/claude/C--Users----------OneDrive--------------Claude-Projects---------/fd23d0af-d492-421e-b183-cc9c9d885029/scratchpad/sheets';
const files=fs.readdirSync(SRC).filter(f=>/\.jpg$/i.test(f)).sort();
const COLS=9, CW=190, CH=250, PER=63;
for(let s=0;s<Math.ceil(files.length/PER);s++){
  const batch=files.slice(s*PER,(s+1)*PER);
  const rows=Math.ceil(batch.length/COLS);
  const comp=[];
  for(let i=0;i<batch.length;i++){
    const buf=await sharp(SRC+'/'+batch[i]).rotate().resize(CW,CH,{fit:'cover'}).jpeg({quality:70}).toBuffer();
    comp.push({input:buf,left:(i%COLS)*CW,top:Math.floor(i/COLS)*CH});
  }
  await sharp({create:{width:COLS*CW,height:rows*CH,channels:3,background:'#111'}})
    .composite(comp).jpeg({quality:74}).toFile(`${OUT}/sheet${s}.jpg`);
  console.log('sheet',s,batch[0],'->',batch[batch.length-1]);
}
