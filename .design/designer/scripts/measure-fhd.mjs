// Замер эталона: вычисленные размеры и отступы блоков на Full HD (окно
// браузера 1920×950). Из них собран src/shared/fluid.css; повторный
// запуск после правки показывает, совпадает ли Full HD с эталоном.
// Нужен `vite preview` на 5181. node scripts/measure-fhd.mjs [ширина] [высота]
import { chromium } from 'playwright';
const W = Number(process.argv[2] || 1920);
const H = Number(process.argv[3] || 950);
const PROPS = {
  '.topbar': ['paddingTop', 'paddingLeft', 'gap'],
  '.topnav a': ['fontSize'],
  '.topbar-logo > span': ['width'],
  '.a-intro': ['paddingTop', 'paddingBottom'],
  '.a-intro p': ['fontSize'],
  '.wrap': ['maxWidth', 'paddingLeft'],
  '#works': ['paddingTop', 'paddingBottom', 'minHeight', 'height'],
  '.svc-grid': ['columnGap', 'height'],
  '.svc-col': ['minHeight', 'width'],
  '.svc-w': ['width', 'borderRadius'],
  '.svc-p': ['width', 'borderRadius'],
  '.svc-col .svc-card': ['width', 'paddingTop', 'paddingLeft', 'borderTopLeftRadius'],
  '.svc-col .s-work-name': ['fontSize', 'marginBottom'],
  '.svc-col .s-work-text': ['fontSize', 'lineHeight', 'marginBottom'],
  '.svc-col .s-work-link': ['fontSize', 'paddingTop', 'paddingLeft'],
  '#about': ['paddingTop', 'paddingBottom', 'minHeight', 'height'],
  '.s-about-grid': ['columnGap'],
  '.s-about-photo': ['width'],
  '.s-about-lead': ['fontSize', 'lineHeight'],
  '.s-about-text p:not(.s-about-lead)': ['fontSize', 'lineHeight'],
  '.s-about-text': ['rowGap'],
  '.s-about-ph': ['fontSize'],
  '#contacts': ['paddingTop', 'paddingBottom', 'minHeight', 'height'],
  '.s-finale-in': ['rowGap'],
  '.s-finale-line': ['fontSize'],
  '.s-finale-sig': ['width'],
  '.s-finale-links a': ['fontSize', 'paddingTop', 'paddingLeft'],
  '.s-contacts-links': ['columnGap'],
};
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: W, height: H } });
await page.goto('http://127.0.0.1:5181/index.html#contacts', { waitUntil: 'load' });
await page.waitForSelector('#contacts', { state: 'attached' });
await page.evaluate(() => document.fonts.ready);
const out = await page.evaluate((PROPS) => {
  const r = {};
  for (const [sel, props] of Object.entries(PROPS)) {
    const el = document.querySelector(sel);
    if (!el) { r[sel] = 'нет'; continue; }
    const cs = getComputedStyle(el);
    const b = el.getBoundingClientRect();
    r[sel] = props.map((p) => `${p}=${p === 'height' ? Math.round(b.height) + 'px' : p === 'width' ? Math.round(b.width) + 'px' : cs[p]}`).join('  ');
  }
  return r;
}, PROPS);
// Расстояния МЕЖДУ блоками: от низа содержимого одного до верха следующего.
const gaps = await page.evaluate(() => {
  const top = (el) => el.getBoundingClientRect().top + scrollY;
  const bot = (el) => el.getBoundingClientRect().bottom + scrollY;
  const intro = document.querySelector('.a-intro p');
  const grid = document.querySelector('.svc-grid');
  const photo = document.querySelector('.s-about-grid');
  const fin = document.querySelector('.s-finale-line');
  return {
    'вступление → услуги': Math.round(top(grid) - bot(intro)),
    'услуги → обо мне': Math.round(top(photo) - bot(grid)),
    'обо мне → контакты': Math.round(top(fin) - bot(photo)),
  };
});
await browser.close();
console.log(`${W}×${H}`);
for (const [k, v] of Object.entries(out)) console.log(k.padEnd(40), v);
console.log('между блоками:', JSON.stringify(gaps));
