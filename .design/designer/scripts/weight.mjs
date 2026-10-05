// Сколько весит страница в режиме градиента и в режиме шейдера (по сборке).
// Нужен `npm run build` и `npx vite preview` на 5181.
import { chromium } from 'playwright';
const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
for (const fx of ['mesh', 'shader']) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  let js = 0, all = 0, three = false;
  page.on('response', async (r) => {
    try {
      const b = (await r.body()).length;
      all += b;
      if (r.url().endsWith('.js')) js += b;
      if (/ShaderCanvas/.test(r.url())) three = true;
    } catch {}
  });
  await page.goto(`http://127.0.0.1:5181/a.html?fx=${fx}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  console.log(fx, 'JS', Math.round(js / 1024), 'КБ; всего', Math.round(all / 1024), 'КБ; three.js', three ? 'загружен' : 'нет');
  await page.close();
}
await browser.close();
