/**
 * Экспорт фотографий для фичи «Придумать съёмку» (интерактивный бриф →
 * раскадровка, `BRIEF-STORYBOARD.md`). Ни одного сгенерированного изображения
 * (П10): все 204 файла — реальные кадры из размеченного архива владелицы
 * (`FACTS.md` Ф30), путь к каждому — поле `sourcePath` в
 * `.design/storyboard-manifest.json`.
 *
 * Отличие от `export-photos.mjs` (герой/услуги): там 14 кадров под конкретные
 * слоты макета с фиксированным кропом 3:4. Здесь 204 кадра под карточку
 * квиза/раскадровки — без кропа (не наше решение, что отрезать у чужой
 * съёмки), только уменьшение веса: ширина по потолку 640 px, оригинальные
 * пропорции сохранены, чтобы не срезать людям головы и не выдумывать композицию
 * за автора. Сохраняются реальные пиксельные размеры экспорта (`w`/`h`) —
 * они идут в публичный манифест и оттуда прямо в атрибуты `<img>`, чтобы
 * вёрстка не прыгала при догрузке 204 карточек разной пропорции.
 *
 * ID кадра — 10 первых hex-символов sha1 от ПУТИ К ОРИГИНАЛУ (не от имени
 * файла: Ф30 нашла в архиве 11 совпадений имени, из них 4 — разные фотографии
 * со случайно совпавшим именем камеры; имя как идентификатор ненадёжно).
 * Одна и та же фотография, поданная под двумя форматами (7 файлов Ф30,
 * лежащих одновременно в «индивидуальная/студия» и «творческая/студия»),
 * получает ДВА разных ID — у неё два разных `sourcePath` (разные записи
 * дерева), и это осознанно: тот же кадр законно предлагается квизом и как
 * пример индивидуальной, и как пример творческой съёмки.
 *
 * Публичный манифест (`public/storyboard/manifest.json`) НЕ содержит
 * `sourcePath` — это локальный путь на диске владелицы/машины сборки, ему
 * нечего делать в файле, который получает браузер клиента.
 *
 * Запуск: npm run storyboard:photos
 */
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MANIFEST_IN = path.resolve(ROOT, '../storyboard-manifest.json');
const OUT_DIR = path.join(ROOT, 'public/storyboard');
const MANIFEST_OUT = path.join(OUT_DIR, 'manifest.json');

const MAX_W = 640; // карточка квиза/раскадровки, не полноэкранный герой — экономим вес
const QUALITY = 68;

/** «индивидуальная съемка» (цифра) и «индивидуальная» (плёнка) — одно и то же
 *  для брифа: владелица делит архив по материалу первым уровнем, поэтому
 *  подпись формата у плёнки короче, но смысл тот же (см. FACTS.md Ф30,
 *  «формат читается из второго уровня цифры/плёнки»).
 *
 * «ПАРЕНЬ» — НАХОДКА Ф37, НЕ БЫЛО В Ф30. Владелица добавила `цифра/парень/`
 * и `пленка/парень/` как папки того же уровня, что «индивидуальная»/«парная»/
 * «творческая» (заменили старую подпапку «мужская, город» внутри
 * «индивидуальная съемка», которой в архиве больше нет). Без этой строки
 * `normalizeFormat` отдавал `null` на «парень» — все 6 файлов (включая 2
 * плёночных, единственные плёночные мужские кадры в архиве) выпадали из
 * подбора целиком, при любых ответах. Мужская одиночная съёмка — по смыслу
 * подмножество «индивидуальная», не отдельный формат. */
function normalizeFormat(raw) {
  if (!raw) return null;
  if (raw.startsWith('индивидуальная')) return 'индивидуальная';
  if (raw === 'парень') return 'индивидуальная';
  if (raw === 'парная') return 'парная';
  if (raw === 'творческая') return 'творческая';
  return null;
}

/** Бакет места — три варианта брифа (`BRIEF-STORYBOARD.md` § 3) поверх куда
 *  более богатых реальных подпапок (сезон, время суток, конкретика). Это
 *  ОГРУБЛЕНИЕ, а не факт: решения по неоднозначным случаям — ниже и в
 *  STORYBOARD.md, не спрятаны. */
function placeCategory(raw) {
  if (!raw) return null;
  if (raw.includes('город')) return 'город'; // включая «мужская, город»
  if (raw.includes('студия')) return 'студия'; // включая «парная, в студии и в галерее»
  return 'природа'; // лес, поле, сад, вода, песок, детская площадка
}

function normalizeOccasion(tags) {
  return Array.from(new Set(tags.map((t) => t.split(' / ')[0])));
}

/** Честный alt из подтверждённых тегов, без выдуманных эпитетов (правило,
 *  проверенное на основном сайте: alt обязан описывать факты, не впечатление). */
function buildAlt(entry, format, place) {
  const bits = [];
  if (format) bits.push(`${format} съёмка`);
  else bits.push('кадр из архива');
  if (entry.материал) bits.push(entry.материал);
  if (place) bits.push(place);
  return `Фото: ${bits.join(', ')}.`;
}

if (!fs.existsSync(MANIFEST_IN)) {
  console.error('нет исходного манифеста:', MANIFEST_IN);
  process.exit(1);
}
const source = JSON.parse(fs.readFileSync(MANIFEST_IN, 'utf-8'));
fs.mkdirSync(OUT_DIR, { recursive: true });

let fail = 0;
let totalBytes = 0;
const out = [];

for (const entry of source) {
  const id = crypto.createHash('sha1').update(entry.sourcePath).digest('hex').slice(0, 10);
  const file = `sb-${id}.webp`;
  const dest = path.join(OUT_DIR, file);

  if (!fs.existsSync(entry.sourcePath)) {
    console.error('НЕТ ФАЙЛА:', entry.sourcePath);
    fail++;
    continue;
  }

  const img = sharp(entry.sourcePath).rotate();
  const meta = await img.metadata();
  const w = Math.min(MAX_W, meta.width || MAX_W);
  const h = Math.round(w * ((meta.height || w) / (meta.width || w)));
  await img.resize({ width: w }).webp({ quality: QUALITY }).toFile(dest);
  const st = fs.statSync(dest);
  totalBytes += st.size;

  const формат = normalizeFormat(entry.формат);
  /* Метка «мужская» — часть СЫРОГО поля `место` (`pick.ts`, `isMale()` ищет
     подстроку там же, где раньше искала её в «мужская, город»). Файлы из
     новой папки `парень/` (Ф37) не несут места вовсе (`entry.место === null`,
     нет подкаталога) — без этой строки бонус/фильтр по полу их не находил
     бы даже после исправления формата выше. */
  const место = entry.формат === 'парень' && !entry.место ? 'мужская' : entry.место;
  const местоКатегория = placeCategory(место);

  out.push({
    id,
    src: `/storyboard/${file}`,
    w,
    h,
    alt: buildAlt(entry, формат, место),
    материал: entry.материал,
    формат,
    место,
    местоКатегория,
    образ: entry.образ,
    настроение: normalizeOccasion(entry.настроение),
  });
}

fs.writeFileSync(MANIFEST_OUT, JSON.stringify(out, null, 2), 'utf-8');

console.log('экспортировано:', out.length, 'из', source.length);
console.log('вес всего:', (totalBytes / 1024 / 1024).toFixed(2), 'МБ');
if (fail) {
  console.error('не экспортировано:', fail);
  process.exit(1);
}

const byFormat = {};
const byMaterial = {};
const byPlace = {};
for (const r of out) {
  byFormat[r.формат] = (byFormat[r.формат] || 0) + 1;
  byMaterial[r.материал] = (byMaterial[r.материал] || 0) + 1;
  byPlace[r.местоКатегория] = (byPlace[r.местоКатегория] || 0) + 1;
}
console.log('\nпо формату:', byFormat);
console.log('по материалу:', byMaterial);
console.log('по категории места:', byPlace);
console.log('с образом:', out.filter((r) => r.образ.length > 0).length);
console.log('с поводом:', out.filter((r) => r.настроение.length > 0).length);
