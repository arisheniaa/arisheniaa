import { useEffect, useRef } from 'react';
import type { QuestionDef } from './questions';

/**
 * МЕХАНИКА ПОКАЗА ВОПРОСОВ — РЕДАКЦИЯ 4 (Ф33, `STORYBOARD.md` § 13). Владелица
 * дословно: «1 вопрос виден сразу с вариантами ответов в левой части экрана;
 * затем после ответа следующий вопрос появляется правее, а предыдущий вопрос
 * отходит на задний план под блюр, но виден пользователю с выбранным вариантом
 * ответа. и далее по этой же логике все вопросы». Заменяет `FadeStep` +
 * «один вопрос за раз» редакций 1–3 целиком для стадии вопросов (FadeStep
 * остаётся, но только для входа/результата — см. `StoryboardApp.tsx`).
 *
 * ГОРИЗОНТАЛЬНАЯ ЛЕСТНИЦА (768px и шире): каждый отвеченный вопрос — отдельная
 * плашка слева направо, последняя — активная (полная, интерактивная), все
 * предыдущие — под лёгким блюром, уменьшены, показывают ТОЛЬКО заголовок и
 * выбранный тайл (не весь список вариантов — это описание поведения, не
 * готовая реализация, конкретные значения на билдере, FACTS.md Ф33). Контейнер
 * — `flex-wrap: wrap` (правка Ф35: «не должна уходить полностью вправо, а
 * когда закончится место — уходить вниз»): шаги, не поместившиеся в строку,
 * переходят на следующую сами, без горизонтальной прокрутки ни у страницы,
 * ни у контейнера (было `overflow-x: auto` в редакции 4 первого прохода —
 * заменено по прямой просьбе владелицы).
 *
 * ДЕГРАДАЦИЯ НА УЗКИХ ЭКРАНАХ (< 768px, решение билдера, задокументировано
 * также в STORYBOARD.md § 13): горизontальная лестница на 360–390px физически
 * не может показать даже два шага одновременно без прокрутки вбок всей полосы
 * вопроса — на телефоне читатель прокручивает СТРАНИЦУ вертикально, вбок он
 * обычно не ожидает жеста внутри виджета. Поэтому ниже `md:` (768px) `.sb-
 * ladder` становится колонкой: прошлые вопросы — те же блюр-плашки, но друг
 * над другом сверху, активный вопрос — снизу, во всю ширину. Ось лестницы
 * меняется с горизонтальной на вертикальную, сама механика (блюр + видимый
 * выбранный ответ) сохраняется один в один.
 *
 * ВХОД НОВОГО ШАГА: `LadderStep` использует тот же приём двойного rAF, что
 * `FadeStep` (`StoryboardApp.tsx`) — при монтировании класс `is-in`
 * добавляется на следующий кадр, давая CSS-переходу на что сработать (CSS-
 * переходы не запускаются от изменения class в момент самого монтирования).
 * Уже смонтированные прошлые шаги НЕ перемонтируются при появлении новых —
 * переход "в прошлое" (блюр/уменьшение) у них происходит просто сменой
 * класса на том же узле, обычным CSS-переходом, без этого трюка.
 */

export interface LadderHistoryEntry {
  id: string;
  title: string;
  label: string;
}

export function QuestionLadder({
  history,
  current,
  stepNumber,
  totalSteps,
  onChoose,
  onBack,
}: {
  history: LadderHistoryEntry[];
  current: QuestionDef;
  stepNumber: number;
  totalSteps: number | null;
  onChoose: (value: string, label: string) => void;
  onBack: () => void;
}) {
  return (
    <div className="sb-ladder" aria-label="Вопросы анкеты">
      {history.map((h) => (
        <LadderStep key={h.id} past>
          <p className="t-mono text-[color:var(--ink-mute)]">{h.title}</p>
          <span className="sb-tile sb-tile--ghost" aria-pressed="true">
            {h.label}
          </span>
        </LadderStep>
      ))}

      <LadderStep key={current.id}>
        <ActiveQuestion
          q={current}
          stepNumber={stepNumber}
          totalSteps={totalSteps}
          onChoose={onChoose}
          onBack={onBack}
        />
      </LadderStep>
    </div>
  );
}

function LadderStep({ children, past }: { children: React.ReactNode; past?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.classList.add('is-in');
      return;
    }
    const id = requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('is-in')));
    return () => cancelAnimationFrame(id);
    // монтируется один раз за шаг (ключ в родителе — `h.id`/`current.id`),
    // поэтому пустой массив зависимостей здесь корректен: это НЕ тот же узел,
    // что «стал прошлым» — прошлые шаги просто получают класс `past` ниже.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={ref} className={`sb-ladder-step${past ? ' sb-ladder-step--past' : ' sb-ladder-step--active'}`}>
      {children}
    </div>
  );
}

function ActiveQuestion({
  q,
  stepNumber,
  totalSteps,
  onChoose,
  onBack,
}: {
  q: QuestionDef;
  stepNumber: number;
  totalSteps: number | null;
  onChoose: (value: string, label: string) => void;
  onBack: () => void;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.focus();
  }, [q.id]);

  return (
    <div aria-live="polite">
      <p className="t-mono text-[color:var(--ink-mute)]">
        Вопрос {stepNumber}
        {totalSteps ? ` из ${totalSteps}` : ''}
      </p>
      {/* `.t-h3`, не `.t-h1` — правка Ф35 («текст квиза уменьшить»). `.t-h1`
          (clamp до 4.5rem) — размер главного заголовка страницы, повторять
          его на каждом из нескольких вопросов подряд было избыточно крупно. */}
      <h2
        ref={headingRef}
        tabIndex={-1}
        className="t-h3 mt-[0.6rem] max-w-[20ch] outline-none"
        style={{ overflowWrap: 'break-word' }}
      >
        {q.title}
      </h2>
      {q.hint && (
        <p className="t-body mt-[0.9rem] max-w-[38ch] text-[color:var(--ink-soft)]">{q.hint}</p>
      )}

      <div role="group" aria-label={q.title} className="sb-tiles mt-[clamp(1.4rem,3.6vw,2.2rem)]">
        {q.tiles.map((t) => (
          <button key={t.value} type="button" className="sb-tile" onClick={() => onChoose(t.value, t.label)}>
            {t.label}
          </button>
        ))}
      </div>

      <button type="button" className="link-minor t-body mt-[clamp(1.6rem,4vh,2.4rem)]" onClick={onBack}>
        Назад
      </button>
    </div>
  );
}
