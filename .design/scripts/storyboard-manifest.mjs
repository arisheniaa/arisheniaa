// Перегенерирует .design/storyboard-manifest.json из живого архива владелицы
// (не хранит сами фото — только теги и путь к оригиналу). Сверка по содержимому
// (sha1), не по имени файла: камера переиспользует номера кадров между разными
// съёмками, см. FACTS.md Ф30.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = 'C:\\Users\\Аришения\\OneDrive\\Рабочий стол\\исходники';
const OUT = path.resolve('.design/storyboard-manifest.json');

function walk(dir, cb, relParts = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, cb, [...relParts, entry.name]);
    } else if (entry.isFile()) {
      cb(full, entry.name, relParts);
    }
  }
}

function hashFile(full) {
  return crypto.createHash('sha1').update(fs.readFileSync(full)).digest('hex');
}

// --- дерево материал/формат/место: цифра/ и пленка/, ключ — полный путь, не имя ---
const primary = [];
for (const material of ['цифра', 'пленка']) {
  const materialDir = path.join(ROOT, material);
  if (!fs.existsSync(materialDir)) continue;
  walk(materialDir, (full, name, relParts) => {
    const format = relParts[0] || null;
    const place = relParts.length > 1 ? relParts.slice(1).join(' / ') : null;
    primary.push({ material, format, place, path: full, name, hash: hashFile(full) });
  });
}

// --- фасеты образ/ и настроение/, сверка по sha1 против дерева выше ---
const hashToPrimary = new Map();
for (const p of primary) {
  if (!hashToPrimary.has(p.hash)) hashToPrimary.set(p.hash, []);
  hashToPrimary.get(p.hash).push(p);
}

const facetTags = new Map(); // путь primary-записи -> {образ:[], настроение:[]}
const orphans = { образ: [], настроение: [] }; // фото, которых нет в дереве материал/формат/место

for (const facetName of ['образ', 'настроение']) {
  const facetDir = path.join(ROOT, facetName);
  if (!fs.existsSync(facetDir)) continue;
  walk(facetDir, (full, name, relParts) => {
    const tag = relParts.join(' / ');
    const matches = hashToPrimary.get(hashFile(full));
    if (!matches || matches.length === 0) {
      orphans[facetName].push({ name, tag, full });
      return;
    }
    for (const m of matches) {
      if (!facetTags.has(m.path)) facetTags.set(m.path, { образ: [], настроение: [] });
      facetTags.get(m.path)[facetName].push(tag);
    }
  });
}

// --- итоговый манифест: записи дерева + самостоятельные фото-сироты ---
const manifest = primary.map((p) => ({
  file: p.name,
  sourcePath: p.path,
  материал: p.material,
  формат: p.format,
  место: p.place,
  образ: facetTags.get(p.path)?.образ || [],
  настроение: facetTags.get(p.path)?.настроение || [],
}));

for (const facetName of ['образ', 'настроение']) {
  for (const o of orphans[facetName]) {
    const tagParts = o.tag.split(' / ');
    const last = tagParts[tagParts.length - 1];
    const material = last === 'цифра' || last === 'пленка' ? last : null;
    manifest.push({
      file: o.name,
      sourcePath: o.full,
      материал: material,
      формат: null,
      место: null,
      образ: facetName === 'образ' ? [o.tag] : [],
      настроение: facetName === 'настроение' ? [o.tag] : [],
    });
  }
}

fs.writeFileSync(OUT, JSON.stringify(manifest, null, 2), 'utf-8');

console.log('manifest written:', OUT, '| total entries:', manifest.length);
const byFormat = {};
for (const m of manifest) {
  const k = `${m.материал} / ${m.формат}`;
  byFormat[k] = (byFormat[k] || 0) + 1;
}
console.log('\nпо материал/формат:');
for (const [k, v] of Object.entries(byFormat).sort()) console.log(' ', v, '|', k);
