import { jsPDF } from 'jspdf';
import type { StoryboardPhoto } from './types';

/**
 * ФИНАЛ — ТОЛЬКО СКАЧИВАНИЕ (`BRIEF-STORYBOARD.md` § 4). Клиентский экспорт
 * раскадровки через `<canvas>`, без сервера и без базы данных. Подпись-
 * визитка внизу файла — обязательное требование раздела: «на картинке/PDF
 * внизу — имя/ник владелицы и ссылка на Telegram (@arisheniaa)».
 *
 * ФОРМАТ: PDF, было PNG — правка Ф31 (`FACTS.md`). Первая версия выбрала PNG
 * («лок не одобряет новые зависимости без необходимости», раздел 4 брифа
 * допускал «картинку/PDF» как «или», не оба сразу) — это было предположение
 * билдера при отсутствии прямого ответа владелицы, не лок. Владелица
 * ответила прямо: «скачивание в PDF (обязательно должен быть брендирован
 * моим никнеймом)» — необходимость новой зависимости названа явно, `jsPDF`
 * добавлен `npm install`, не скопирован вручную.
 *
 * Раскладка кадров и подпись-визитка не переделывались — `renderStoryboardCanvas`
 * ниже тот же, что рисовал PNG; PDF-путь оборачивает готовый canvas одним
 * `addImage`, не дублирует вёрстку раскадровки на другом языке разметки.
 * Размер страницы — по пропорциям самого canvas (`unit: 'px'`, `format:
 * [width, height]`), не A4: raskadrovka — не документ с полями, а цельный
 * кадр, обрезать его под чужие пропорции значило бы либо оставлять пустые
 * поля, либо резать фотографии по краю.
 *
 * Подпись рисуется РЕАЛЬНЫМ вызовом `fillText` в canvas, а не как
 * decorative-слой — это буквально то, что превращает файл в «визитку,
 * которая переживает закрытие вкладки» (раздел 4): текст впечатан в пиксели
 * canvas, которые `addImage` переносит в PDF один в один, не отдельным
 * PDF-текстовым слоем поверх.
 */

export const SIGNATURE_NAME = 'аришения';
export const SIGNATURE_HANDLE = '@arisheniaa';
export const SIGNATURE_LINK = 't.me/arisheniaa';

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`не удалось загрузить кадр: ${src}`));
    img.src = src;
  });
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const ir = img.naturalWidth / img.naturalHeight;
  const cr = w / h;
  let sx = 0;
  let sy = 0;
  let sw = img.naturalWidth;
  let sh = img.naturalHeight;
  if (ir > cr) {
    sw = img.naturalHeight * cr;
    sx = (img.naturalWidth - sw) / 2;
  } else {
    sh = img.naturalWidth / cr;
    sy = (img.naturalHeight - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

const FONT = '"Golos Text Variable", "Segoe UI", sans-serif';

/**
 * Собирает раскадровку в `<canvas>` и возвращает его — отдельно от скачивания,
 * чтобы самопроверка могла отрисовать канвас и прочитать перехваченные вызовы
 * `fillText`, не обязательно доводя дело до реального файла на диск.
 */
export async function renderStoryboardCanvas(photos: StoryboardPhoto[]): Promise<HTMLCanvasElement> {
  if (document.fonts?.ready) {
    await document.fonts.ready.catch(() => undefined);
  }
  const images = await Promise.all(photos.map((p) => loadImage(p.src)));

  const COLS = photos.length > 4 ? 3 : 2;
  const CELL_W = 360;
  const CELL_H = 460;
  const GAP = 20;
  const PAD = 44;
  const rows = Math.max(1, Math.ceil(photos.length / COLS));

  const width = PAD * 2 + COLS * CELL_W + (COLS - 1) * GAP;
  const gridHeight = rows * CELL_H + (rows - 1) * GAP;
  const headerH = 118;
  const footerH = 108;
  const height = headerH + gridHeight + footerH + PAD * 2;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas 2d недоступен в этом браузере');

  // фон — тон бумаги темы (--paper, styles.css), тот же холст, что на сайте
  ctx.fillStyle = '#ede7d2';
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = '#14140f';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `700 32px ${FONT}`;
  ctx.fillText('Ваша раскадровка', PAD, PAD + 38);
  ctx.fillStyle = '#6d6c56';
  ctx.font = `400 15px ${FONT}`;
  ctx.fillText('Собрано по вашим ответам из реальных съёмок', PAD, PAD + 64);

  images.forEach((img, i) => {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const x = PAD + col * (CELL_W + GAP);
    const y = PAD + headerH + row * (CELL_H + GAP);
    drawCover(ctx, img, x, y, CELL_W, CELL_H);
  });

  // подпись-визитка (BRIEF-STORYBOARD.md § 4) — обязательный элемент файла
  const footerY = PAD + headerH + gridHeight + 26;
  ctx.fillStyle = '#8e3d18';
  ctx.fillRect(0, footerY - 24, width, footerH);
  ctx.fillStyle = '#f6f3e2';
  ctx.font = `700 24px ${FONT}`;
  ctx.fillText(SIGNATURE_NAME, PAD, footerY + 12);
  ctx.font = `400 17px ${FONT}`;
  ctx.fillText(`Telegram ${SIGNATURE_HANDLE} · ${SIGNATURE_LINK}`, PAD, footerY + 40);

  return canvas;
}

export async function downloadStoryboard(
  photos: StoryboardPhoto[],
  filename = 'raskadrovka.pdf',
): Promise<void> {
  const canvas = await renderStoryboardCanvas(photos);
  const dataUrl = canvas.toDataURL('image/png');

  const doc = new jsPDF({
    orientation: canvas.width >= canvas.height ? 'l' : 'p',
    unit: 'px',
    format: [canvas.width, canvas.height],
    compress: true,
  });
  doc.addImage(dataUrl, 'PNG', 0, 0, canvas.width, canvas.height);
  doc.save(filename);
}
