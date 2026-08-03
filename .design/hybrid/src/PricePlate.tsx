import { Fragment, useState } from 'react';

/**
 * ЦЕНА ЗА КЛИКОМ (Ф29 п.6, FACTS.md — синтез `RESEARCH-COMPETITORS.md` § 3,
 * «цена скрыта за намеренным кликом-приглашением»; НЕ лок, усиливает уже
 * принятый вывод `PRICE-POSITION.md`: «прайс — следствие, не главный блок»).
 *
 * ПОЧЕМУ ЦИФРА ПРИГЛУШЕНА CSS-ФИЛЬТРОМ, А НЕ ВЫРЕЗАНА ИЗ ТЕКСТА. Правило
 * «боевой текст дословно» запрещает резать и переписывать `COPY.md` под
 * макет. Зона `home:offer.card.*.price` — ОДНА строка целиком («6 000 ₽ за
 * час в Москве · 4 000 ₽ в Туле»), в COPY нет отдельной «версии без цифры».
 * Поэтому в DOM всегда стоит ПОЛНАЯ строка посимвольно, как в `copy.ts` —
 * до клика и после клика ОДИНАКОВО, — а «скрытие» цифры это исключительно
 * визуальный слой поверх текста (`filter: blur` + приглушённая непрозрачность),
 * ровно тот же приём, что уже применён к «Придумано заранее» и капители
 * служебного слоя (README § 4 п. 6: «визуально это решение поверх текста»).
 * Значит `textContent` не меняется НИКОГДА, и дословность цены проверяется
 * тем же способом, что и остального текста (`selfcheck.mjs`).
 *
 * Побочный эффект этого решения — доступность БЕСПЛАТНО: `filter: blur`
 * не прячет текст от скринридера (это чисто визуальный эффект), то есть
 * цена озвучивается сразу, а щёлкать плашку, чтобы получить ту же цену,
 * зрячему посетителю приходится ровно потому, что для него это визуальный
 * приём, а не потому что данные правда отсутствуют. Тот же принцип, что и
 * у дочерних папок отдачи (`Folders.tsx`): «скрыто состоянием, а не
 * удалением из разметки».
 *
 * «С пружиной» — `--ease-spring`, кубическая кривая с перелётом (styles.css),
 * а не JS-пружина: цель ровно одна (открыто/закрыто), лишний параллельный
 * физический цикл ради одной точки был бы отдельной системой там, где
 * достаточно кривой (см. `useRack.ts`/`Folders.tsx`, где click-раскрытие тоже
 * решено CSS-переходом, а не пружиной в JS).
 */

/** U+20BD — знак ₽. Матчим денежные куски строки: цифры, неразрывные
 *  пробелы-разделители тысяч и сам знак валюты. */
const PRICE_RE = /[\d ]+₽/g;

function splitPrice(s: string): { text: string; price: boolean }[] {
  const out: { text: string; price: boolean }[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  PRICE_RE.lastIndex = 0;
  while ((m = PRICE_RE.exec(s))) {
    if (m.index > last) out.push({ text: s.slice(last, m.index), price: false });
    out.push({ text: m[0], price: true });
    last = m.index + m[0].length;
  }
  if (last < s.length) out.push({ text: s.slice(last), price: false });
  return out;
}

export function PricePlate({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const segments = splitPrice(text);

  return (
    <button
      type="button"
      className="plate t-num price-plate"
      data-open={open ? '' : undefined}
      aria-expanded={open}
      onClick={() => setOpen((v) => !v)}
    >
      {segments.map((seg, i) =>
        seg.price ? (
          <span key={i} className="price-plate-digits">
            {seg.text}
          </span>
        ) : (
          <Fragment key={i}>{seg.text}</Fragment>
        ),
      )}
    </button>
  );
}
