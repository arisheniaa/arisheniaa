// Сертификат «Юлия и Данила» (её работа, `Claude Projects/сертификаты`,
// выбран вариант 7) — лицо и оборот кадрами для блока айдентики.
// Снимается прямо с её HTML-макета, вылеты (2 мм) срезаются.
import { chromium } from 'playwright';
import sharp from 'sharp';
const SRC = 'file:///C:/Users/Аришения/OneDrive/Рабочий стол/Claude Projects/сертификаты/сертификат.html';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 1200 }, deviceScaleFactor: 3 });
await page.goto(SRC, { waitUntil: 'networkidle' });
await page.waitForTimeout(800);
for (const [sel, name] of [['.lico', 'cert-front'], ['.oborot', 'cert-back']]) {
  const el = page.locator(sel);
  const buf = await el.screenshot();
  const m = await sharp(buf).metadata();
  const bleed = Math.round((m.width / 159) * 2); // 2 мм вылета с каждой стороны
  await sharp(buf).extract({ left: bleed, top: bleed, width: m.width - 2 * bleed, height: m.height - 2 * bleed })
    .resize(1600).webp({ quality: 86 }).toFile(`public/works/${name}.webp`);
  console.log(name, m.width, m.height);
}
await browser.close();
