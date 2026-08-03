/**
 * Пробник силуэтов звёзд: рисует все пять путей рядом, чтобы сверить их
 * глазами с файлами владелицы (П1), а не поверить коду на слово.
 * Запуск из корня проекта: node .design/hybrid/scripts/star-proof.mjs
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(HERE, '../shots');
fs.mkdirSync(OUT, { recursive: true });

const src = fs.readFileSync(path.resolve(HERE, '../src/star-paths.ts'), 'utf8');
const paths = {};
for (const m of src.matchAll(/^\s{2}(spark|needle8|starfish6|hands5|tiny8):\s*\n?\s*'([^']+)'/gm)) {
  paths[m[1]] = m[2];
}
const names = Object.keys(paths);
if (names.length !== 5) throw new Error('распознано путей: ' + names.length + ' — ' + names);

const tone = { spark: '#F4B93F', needle8: '#131110', starfish6: '#131110', hands5: '#7A2530', tiny8: '#131110' };
const cells = names
  .map(
    (n) => `<figure><svg viewBox="0 0 100 100" width="180" height="180">
      <path d="${paths[n]}" fill="${tone[n]}"/></svg><figcaption>${n}</figcaption></figure>`,
  )
  .join('');

const html = `<!doctype html><meta charset="utf-8"><style>
body{margin:0;background:#EFE9D6;display:flex;flex-wrap:wrap;gap:18px;padding:24px;
  font:600 11px/1 ui-monospace,monospace;letter-spacing:.12em;text-transform:uppercase;color:#7c7a6c}
figure{margin:0;background:#faf8f1;padding:8px}
figcaption{margin-top:6px}
</style>${cells}`;

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1060, height: 260 }, deviceScaleFactor: 2 });
await p.setContent(html);
await p.screenshot({ path: path.join(OUT, 'star-proof.png'), fullPage: true });
await b.close();
console.log('star-proof.png', names.join(' '));
