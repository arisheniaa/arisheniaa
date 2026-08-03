/**
 * Экспорт настоящих фотографий в веб-размеры. Ни одного сгенерированного
 * изображения (П10): всё — файлы из папок, названных владелицей.
 *
 * Три источника, три роли:
 *
 *  1. РЭК — `Рабочий стол\портфолио`, 8 кадров. Лок (Ф19): пул шире, чем в B,
 *     «не обязательно из одной серии». Отбор сделан глазами по контактному
 *     листу (`scripts/contact-sheet.mjs`); почему именно эти — в комментариях.
 *
 *  2. КАРТОЧКИ УСЛУГ — `Рабочий стол\портфолио`, 3 кадра, назначены локом
 *     дословно (Ф26): IMG_5439, IMG_1343, IMG_6270.
 *
 *  3. «ШЕСТЬ КАДРОВ» — `Рабочий стол\лайтрум трум трум`. Отдельный источник,
 *     потому что подписи этой секции в COPY (§ 1.4) называют конкретные сюжеты
 *     («Мандарин над снегом», «Золото в интерьере») и написаны под этот архив.
 *     Соответствие файл→подпись повторяет направление B, где сцепка уже
 *     сверена глазами.
 *
 * Кроп: `centre` для портфолио (сюжет в центре кадра) и `top` для лайтрума
 * (там смысл в воздухе НАД фигурой, умный кроп съел бы небо).
 * Запуск: npm run photos
 */
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PORT = 'C:/Users/Аришения/OneDrive/Рабочий стол/портфолио';
const LR = 'C:/Users/Аришения/OneDrive/Рабочий стол/лайтрум трум трум';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const JOBS = [
  /* ─── рэк: восемь кадров, восемь разных съёмок ─────────────────────── */
  // фигура в утреннем поле против солнца — самый «киношный» кадр архива
  { out: 'public/frames/pole.webp', src: `${PORT}/IMG_0459.JPG`, w: 1200, ar: 3 / 4, pos: 'centre' },
  // мандарины в снегопаде: сюжет, который называет лид первого экрана
  { out: 'public/frames/mandarin.webp', src: `${PORT}/IMG_2919.JPG`, w: 1200, ar: 3 / 4, pos: 'centre' },
  // мокрая осенняя дорога, фигура в пальто — тот же холод, но цветной
  { out: 'public/frames/doroga.webp', src: `${PORT}/IMG_6317.JPG`, w: 1200, ar: 3 / 4, pos: 'centre' },
  // контровой свет в дыму, силуэты: стопке нужен один кадр без лиц
  { out: 'public/frames/kontra.webp', src: `${PORT}/IMG_5499.JPG`, w: 1200, ar: 3 / 4, pos: 'centre' },
  // студийный красный: единственный чистый цвет в стопке, держит розовую тему
  { out: 'public/frames/krasnoe.webp', src: `${PORT}/IMG_7414.JPG`, w: 1200, ar: 3 / 4, pos: 'centre' },
  // мелкая вода поверх камней: холодный зелёный, держит зелёную тему
  { out: 'public/frames/voda.webp', src: `${PORT}/IMG_8802.JPG`, w: 1200, ar: 3 / 4, pos: 'centre' },
  // перевёрнутый кадр: ни одна другая карточка стопки не спорит с гравитацией
  { out: 'public/frames/perevernutyi.webp', src: `${PORT}/IMG_9484.JPG`, w: 1200, ar: 3 / 4, pos: 'centre' },
  // чёрно-белое крупно: без него восемь цветных кадров сливаются в один тон
  { out: 'public/frames/chb.webp', src: `${PORT}/IMG_3577.JPG`, w: 1200, ar: 3 / 4, pos: 'centre' },

  /* ─── карточки услуг: назначены Ф28, заменяют назначения Ф26 ─────────
     | услуга    | файл          | что было (Ф26)          |
     | один      | IMG_5511.JPG  | IMG_5439.JPG — заменён  |
     | двое      | IMG_1343.JPG  | тот же, без изменений   |
     | творческая| IMG_6281.JPG  | IMG_6270.JPG — заменён  |
     | плёнка    | IMG_1651.JPG  | слота не было вовсе     |

     ШИРИНА ЭКСПОРТА УМЕНЬШЕНА С 1200/1600 ДО 680. Ф28: «уменьши их в размере,
     чтобы не было так заметно ухудшение качества». На макете самый крупный из
     четырёх кадров показывается на 19 rem = 304 px, значит 680 px это ещё и
     двойная плотность с запасом. Отдавать в такой слот 1200 px значило бы
     тянуть по сети вчетверо больше байтов и показывать компрессию
     портфолио-копий (853×1280, `PHOTO-VERDICT.md`) крупнее, чем она терпит.

     ПРОПОРЦИЯ У ВСЕХ ЧЕТЫРЁХ 3:4. Прежний кроп творческой был 3:2 (у неё
     разворот, а не ячейка) — на новом файле это невозможно: IMG_6281 портрет
     853×1280 с фигурой в полный рост, и 3:2 отрезает фигуре голову. Кадры
     открыты глазами перед решением (правило П1), не по имени файла. */
  { out: 'public/services/odin.webp', src: `${PORT}/IMG_5511.JPG`, w: 680, ar: 3 / 4, pos: 'centre' },
  { out: 'public/services/dvoe.webp', src: `${PORT}/IMG_1343.JPG`, w: 680, ar: 3 / 4, pos: 'centre' },
  { out: 'public/services/tvorcheskaya.webp', src: `${PORT}/IMG_6281.JPG`, w: 680, ar: 3 / 4, pos: 'centre' },
  // плёнка — новый слот Ф28. Кадр снят на плёнку и виден как плёночный.
  { out: 'public/services/plenka.webp', src: `${PORT}/IMG_1651.JPG`, w: 680, ar: 3 / 4, pos: 'centre' },

  /* ─── «Шесть кадров»: СЕКЦИЯ ВЫКЛЮЧЕНА Ф28, файлы оставлены ──────────
     Экспорт не снят вместе с секцией: Ф28 говорит «добавим позже», и повторно
     искать шесть исходников в чужом архиве по возвращении секции — работа,
     которую не надо делать дважды. Файлы лежат в `public/frames/`, страница их
     не запрашивает. Подписи COPY § 1.4 написаны под этот архив. */
  { out: 'public/frames/grid-mandarin.webp', src: `${LR}/DSC_0374.jpg`, w: 1200, ar: 3 / 4, pos: 'top' },
  { out: 'public/frames/grid-vedomosti.webp', src: `${LR}/DSC_0095.jpg`, w: 1200, ar: 3 / 4, pos: 'top' },
  { out: 'public/frames/grid-tuman.webp', src: `${LR}/DSC_0203.jpg`, w: 1200, ar: 3 / 4, pos: 'top' },
  { out: 'public/frames/grid-lico.webp', src: `${LR}/DSC_0461.jpg`, w: 900, ar: 3 / 4, pos: 'centre' },
  { out: 'public/frames/grid-kolosya.webp', src: `${LR}/DSC_0279.jpg`, w: 1200, ar: 3 / 4, pos: 'top' },
  { out: 'public/frames/grid-zoloto.webp', src: `${LR}/DSC00796.jpg`, w: 1200, ar: 3 / 4, pos: 'top' },
];

let fail = 0;
for (const j of JOBS) {
  const out = path.join(ROOT, j.out);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  if (!fs.existsSync(j.src)) {
    console.error('НЕТ ФАЙЛА:', j.src);
    fail++;
    continue;
  }
  const img = sharp(j.src).rotate();
  const meta = await img.metadata();
  /* Потолок по исходнику. Папка «портфолио» — это экспортированные копии
     853×1280, а не сырьё: запрошенные 1200 px апскейлили бы кадр и мылили его.
     Апскейл — это порча фотографии, поэтому ширина режется по факту, а не по
     желанию макета, и каждый такой случай печатается в отчёт. */
  const capW = Math.min(j.w, meta.width, Math.round(meta.height * j.ar));
  const w = capW;
  const h = Math.round(w / j.ar);
  await img.resize(w, h, { fit: 'cover', position: j.pos }).webp({ quality: 80 }).toFile(out);
  const st = fs.statSync(out);
  console.log(
    path.basename(j.out).padEnd(24),
    `${meta.width}×${meta.height} → ${w}×${h}`,
    `${(st.size / 1024).toFixed(0)} КБ`,
    w < j.w ? `⚠ упёрлось в исходник (просили ${j.w})` : '',
  );
}
if (fail) {
  console.error(`\nне экспортировано: ${fail}`);
  process.exit(1);
}
console.log('\nвсего:', JOBS.length);
