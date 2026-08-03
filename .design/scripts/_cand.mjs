import sharp from 'sharp';
const SRC='C:/Users/Аришения/OneDrive/Рабочий стол/лайтрум трум трум';
const OUT='C:/Users/A1C1~1/AppData/Local/Temp/claude/C--Users----------OneDrive--------------Claude-Projects---------/fd23d0af-d492-421e-b183-cc9c9d885029/scratchpad/sheets';
const pick=['DSC01141','DSC01151','DSC01167','DSC01300','DSC01315','DSC01327','DSC_0049','DSC_0068','DSC_0095','DSC_0126','DSC_0213','DSC_0218','DSC_0226','DSC00920','DSC_0414','DSC_0501'];
const CW=420,CH=560,COLS=4;
const comp=[];
for(let i=0;i<pick.length;i++){
  const buf=await sharp(SRC+'/'+pick[i]+'.jpg').rotate().resize(CW,CH,{fit:'cover'}).jpeg({quality:80}).toBuffer();
  comp.push({input:buf,left:(i%COLS)*CW,top:Math.floor(i/COLS)*CH});
}
await sharp({create:{width:COLS*CW,height:Math.ceil(pick.length/COLS)*CH,channels:3,background:'#000'}})
 .composite(comp).jpeg({quality:82}).toFile(OUT+'/cand.jpg');
console.log(pick.join(' | '));
