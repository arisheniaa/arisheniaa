// Холодная загрузка: новый браузер без кэша, CPU замедлен в 4 раза (как
// средний ноутбук). Сколько ждать первого экрана и как дёргается первый проход.
import { chromium } from 'playwright';
const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu'] });
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
const t0 = Date.now();
await page.goto(`http://127.0.0.1:5181/${process.argv[2] || 'a'}.html`, { waitUntil: 'load' });
const load = Date.now() - t0;
await page.evaluate(() => { window.__lt = []; new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__lt.push(Math.round(e.duration)))).observe({ type: 'longtask', buffered: true }); });
await page.waitForTimeout(3000);
const fcp = await page.evaluate(() => performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? 0);
const lt = await page.evaluate(() => window.__lt);
console.log('долгие задачи за первые 3 с (мс):', lt.join(', ') || 'нет', '— самая долгая', Math.max(0, ...lt));
const r = await page.evaluate(async () => {
  let worst = 0, frames = 0, last = performance.now(), run = true, at = 0, slow = [];
  const loop = (t) => { frames++; const d = t - last; if (d > 100) slow.push([Math.round(scrollY), Math.round(d)]); if (d > worst) { worst = d; at = scrollY; } last = t; if (run) requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
  const H = document.documentElement.scrollHeight - innerHeight;
  const t0 = performance.now();
  for (let y = 0; y <= H; y += 80) { scrollTo(0, y); await new Promise((r) => requestAnimationFrame(r)); }
  run = false;
  const where = (y) => [...document.querySelectorAll('main > section, main > div, section[id]')].map((e) => [e.id || e.className.slice(0, 30), e.getBoundingClientRect().top + scrollY]).filter(([, top]) => top <= y + innerHeight).pop()?.[0];
  return { fps: Math.round(frames / ((performance.now() - t0) / 1000)), worst: Math.round(worst), at: Math.round(at), slow: slow.map(([y, d]) => `${y}px(${where(y)}):${d}мс`).join(' ') };
});
console.log(`загрузка ${load} мс, первый кадр ${Math.round(fcp)} мс, первый проход: ${r.fps} к/с, худший кадр ${r.worst} мс на ${r.at}px`);
console.log('кадры дольше 100 мс:', r.slow);
await browser.close();
