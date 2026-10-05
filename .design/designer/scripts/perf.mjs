// Замер плавности варианта: кадры в секунду и длинные задачи при прокрутке
// всей страницы, с разными слоями эффектов выключенными через CSS.
//   node scripts/perf.mjs a
// Цифры сравнительные (headless на этой машине), смысл — какой слой тяжёлый.
import { chromium } from 'playwright';

const page0 = process.argv[2] || 'a';
const CASES = {
  'прогрев': '',
  'всё включено': '',
  'без плёнки (зерно/засветы)': '.film{display:none!important}',
  'без размытий (backdrop/blur)': '*{backdrop-filter:none!important}.p-frame{filter:none!important}',
  'без градиента': '.mesh{display:none!important}',
  'без веера': '.fan{display:none!important}',
};
const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
for (const [name, css] of Object.entries(CASES)) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.goto(`http://127.0.0.1:5180/${page0}.html`, { waitUntil: 'load' });
  if (css) await page.addStyleTag({ content: css });
  await page.waitForTimeout(2500);
  const r = await page.evaluate(async () => {
    let frames = 0;
    let long = 0;
    let worst = 0;
    let last = performance.now();
    const po = new PerformanceObserver((l) => l.getEntries().forEach((e) => { long += e.duration; }));
    po.observe({ type: 'longtask', buffered: false });
    let run = true;
    const loop = (t) => {
      frames++;
      worst = Math.max(worst, t - last);
      last = t;
      if (run) requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    const H = document.documentElement.scrollHeight - innerHeight;
    const t0 = performance.now();
    for (let y = 0; y <= H; y += 60) {
      window.scrollTo(0, y);
      await new Promise((r) => requestAnimationFrame(r));
    }
    const dt = (performance.now() - t0) / 1000;
    run = false;
    po.disconnect();
    return { fps: Math.round(frames / dt), worst: Math.round(worst), long: Math.round(long), sec: dt.toFixed(1) };
  });
  console.log(`${name.padEnd(30)} fps ${r.fps}  худший кадр ${r.worst} мс  длинные задачи ${r.long} мс  (${r.sec} с)`);
  await page.close();
}
await browser.close();
