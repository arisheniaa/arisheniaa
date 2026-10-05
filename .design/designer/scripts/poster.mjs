// Кадр шейдера для лёгкого режима (`public/shader-poster.webp`).
// Снимается с живой страницы: фон после раскрытия, всё остальное скрыто.
import { chromium } from 'playwright';
import sharp from 'sharp';

const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1200, height: 1200 } });
await page.goto('http://127.0.0.1:5180/a.html?device=laptop', { waitUntil: 'load' });
await page.waitForTimeout(4000);
await page.evaluate(() => window.scrollTo(0, innerHeight * 1.8));
await page.addStyleTag({ content: '.device-sig,.content,.topbar,.film,.cmp-bar,.device-hint,.device-title{display:none!important}' });
await page.waitForTimeout(2500);
// Рамка экрана в кадр попадает (раскрытие не всегда доходит до конца
// за время паузы) — поэтому кадр обрезается по центру.
await sharp(await page.screenshot()).extract({ left: 140, top: 140, width: 920, height: 920 }).resize(900).webp({ quality: 78 }).toFile('public/shader-poster.tmp.webp');
await browser.close();
console.log('ok');
import fs from 'node:fs'; fs.renameSync('public/shader-poster.tmp.webp', 'public/shader-poster.webp');
