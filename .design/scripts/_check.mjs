import sharp from 'sharp';
const D='C:/Users/Аришения/OneDrive/Рабочий стол/Claude Projects/Мой сайт/.design/directions/c/public/img';
const slugs=['quiet-window','gold-road','still-water','blur-turn','warm-portrait'];
const W=340,H=440,comp=[];
for(let i=0;i<slugs.length;i++){
  const b=await sharp(`${D}/${slugs[i]}-560.jpg`).resize(W,H,{fit:'contain',background:'#222'}).toBuffer();
  comp.push({input:b,left:i*W,top:0});
}
await sharp({create:{width:W*slugs.length,height:H,channels:3,background:'#222'}}).composite(comp)
 .jpeg({quality:80}).toFile('C:/Users/A1C1~1/AppData/Local/Temp/claude/C--Users----------OneDrive--------------Claude-Projects---------/fd23d0af-d492-421e-b183-cc9c9d885029/scratchpad/sheets/check.jpg');
console.log(slugs.join(' | '));
