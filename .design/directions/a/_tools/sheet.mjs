import { chromium } from 'playwright';
import fs from 'fs';
const dir = 'C:/Users/Аришения/OneDrive/Рабочий стол/лайтрум трум трум';
const off = Number(process.argv[2]||0), n = 24;
const all = fs.readdirSync(dir).filter(f=>/\.jpg$/i.test(f));
const step = Math.floor(all.length/48);
const seq = []; for(let i=0;i<all.length;i+=step) seq.push(all[i]);
const pick = seq.slice(off, off+n);
const html = `<style>body{margin:0;background:#111;display:grid;grid-template-columns:repeat(6,1fr);gap:2px}
figure{margin:0;position:relative;aspect-ratio:1;overflow:hidden}
img{width:100%;height:100%;object-fit:cover}
figcaption{position:absolute;left:0;bottom:0;background:#000c;color:#fff;font:11px monospace;padding:1px 3px}</style>`+
pick.map(f=>`<figure><img src="file:///${dir}/${f}"><figcaption>${f.replace('DSC','').replace('.jpg','')}</figcaption></figure>`).join('');
const tmp = 'C:/Users/Аришения/AppData/Local/Temp'+'/sheet.html';
fs.writeFileSync(tmp, html);
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:1100,height:900}});
await p.goto('file:///'+tmp, {waitUntil:'domcontentloaded', timeout:120000});
await p.waitForFunction(()=>[...document.images].every(i=>i.complete), null, {timeout:180000});
await p.screenshot({path: 'C:/Users/Аришения/AppData/Local/Temp'+'/sheet'+off+'.png', fullPage:true});
await b.close();
console.log(pick.join(' '));
