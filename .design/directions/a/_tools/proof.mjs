import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:1500,height:1000}});
await p.goto('http://localhost:5173/cyrillic-proof.html',{waitUntil:'networkidle'});
await p.waitForTimeout(600);
await p.screenshot({path:'C:/Users/Аришения/OneDrive/Рабочий стол/Claude Projects/Мой сайт/.design/directions/a/shots/cyrillic-proof.png', fullPage:true});
await b.close();
