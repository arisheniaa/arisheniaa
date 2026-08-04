import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Gradient, Grain } from '../Gradient';
import { Header, Footer } from '../App';
import { Stars } from '../Stars';
import { ProgressStars } from './ProgressStars';
import { PinterestBoards } from './PinterestBoards';
import { buildQuestions } from './questions';
import type { QuestionDef } from './questions';
import { pickStoryboard, normalizeOccasionTags } from './pick';
import type { PickResult } from './pick';
import { downloadStoryboard } from './download';
import type { BriefAnswers, StoryboardPhoto } from './types';
import { OCCASION_NONE, SKIP_LOOK } from './types';

/**
 * ФИЧА «ПРИДУМАТЬ СЪЁМКУ» — `BRIEF-STORYBOARD.md`. Интерактивный бриф
 * (пять вопросов-плиток) → алгоритм подбора (`pick.ts`) → раскадровка из
 * 5–7 реальных кадров → скачивание PNG с подписью-визиткой (`download.ts`).
 *
 * Направление-лок обязателен и здесь (это подтверждено в задании явно, не
 * моё предположение): `Gradient`/`Grain`/`Stars`/`Header`/`Footer` — те же
 * компоненты, что на главной, не копии. Единственный вкусовой скилл —
 * `apple-design`, тот же, что зафиксирован в `DIRECTION-LOCK.md`.
 *
 * Экранный текст здесь — авторский текст билдера (для этой фичи нет зон в
 * `COPY.md`), подробности — `STORYBOARD.md`.
 */

type Stage =
  | { kind: 'intro' }
  | { kind: 'question'; index: number }
  | { kind: 'result' };

export function StoryboardApp() {
  return (
    <>
      <Gradient />
      <StoryboardPage />
      <Grain />
    </>
  );
}

function StoryboardPage() {
  const [photos, setPhotos] = useState<StoryboardPhoto[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [stage, setStage] = useState<Stage>({ kind: 'intro' });
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<PickResult | null>(null);

  const load = () => {
    setLoadError(false);
    setPhotos(null);
    fetch('/storyboard/manifest.json')
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
      .then((data: StoryboardPhoto[]) => setPhotos(data))
      .catch(() => setLoadError(true));
  };

  useEffect(load, []);

  const questions = useMemo(() => (photos ? buildQuestions(photos) : []), [photos]);

  function choose(q: QuestionDef, value: string, index: number) {
    const next = { ...answers, [q.id]: value };
    setAnswers(next);

    /* Быстрый переход — «повод», единственный реальный, не «без повода»
       (см. `pick.ts`): фото этого мини-сета не несут формата вовсе, значит
       вопросы «кто в кадре» / «материал» / «где» / «образ», что идут после,
       заведомо не повлияют на выдачу подбора по поводу. Спрашивать их дальше
       значило бы тратить время читателя на выбор, который будет отброшен. */
    if (q.id === 'повод' && value !== OCCASION_NONE && photos) {
      const brief: BriefAnswers = {
        формат: 'индивидуальная', // не используется веткой повода в pick.ts, заглушка типа
        материал: 'любой',
        место: 'неважно',
        образ: SKIP_LOOK,
        повод: value,
      };
      setResult(pickStoryboard(photos, brief));
      setStage({ kind: 'result' });
      return;
    }

    if (index + 1 < questions.length) {
      setStage({ kind: 'question', index: index + 1 });
    } else if (photos) {
      const brief: BriefAnswers = {
        формат: (next.формат as BriefAnswers['формат']) ?? 'индивидуальная',
        материал: (next.материал as BriefAnswers['материал']) ?? 'любой',
        место: (next.место as BriefAnswers['место']) ?? 'неважно',
        образ: next.образ ?? SKIP_LOOK,
        повод: next.повод ?? OCCASION_NONE,
      };
      setResult(pickStoryboard(photos, brief));
      setStage({ kind: 'result' });
    }
  }

  function back() {
    if (stage.kind === 'question' && stage.index > 0) {
      setStage({ kind: 'question', index: stage.index - 1 });
    } else if (stage.kind === 'question') {
      setStage({ kind: 'intro' });
    } else if (stage.kind === 'result') {
      setStage({ kind: 'question', index: questions.length - 1 });
    }
  }

  function restart() {
    setAnswers({});
    setResult(null);
    setStage({ kind: 'intro' });
  }

  const answeredCount =
    stage.kind === 'intro' ? 0 : stage.kind === 'result' ? questions.length : stage.index;

  return (
    <>
      <Header />
      <main id="pridumat" className="relative z-10">
        <section className="relative min-h-[100svh] px-[var(--gutter)] py-[clamp(6rem,14vh,9rem)]">
          <Stars count={10} seed={131} scale="mixed" />

          <div className="relative z-10 mx-auto w-full max-w-[52rem]">
            {loadError && (
              <ErrorState onRetry={load} />
            )}

            {!loadError && !photos && <LoadingState />}

            {!loadError && photos && (
              <>
                {/* ЕДИНСТВЕННЫЙ <h1> СТРАНИЦЫ — постоянный, не переключается вместе
                    со стадией. Первая версия давала h1 только экрану-входу
                    (`Intro`) — как только читатель уходил на вопрос или на
                    результат, `Intro` размонтировался вместе со своим h1, и
                    на странице не оставалось НИ ОДНОГО h1 (поймано
                    самопроверкой: «main 1, header 1, footer 1, nav 1, h1 0»
                    на экране результата — не мнение, измерение). Заголовки
                    вопроса/результата остаются h2, как и были. */}
                <h1 className="t-mono text-[color:var(--ink-mute)]">Придумать съёмку</h1>

                {questions.length > 0 && stage.kind !== 'intro' && (
                  <div className="mt-[clamp(1rem,2.6vh,1.6rem)] mb-[clamp(1.6rem,4vh,2.6rem)]">
                    <ProgressStars total={questions.length} lit={answeredCount} />
                  </div>
                )}

                {stage.kind === 'intro' && (
                  <Intro onStart={() => setStage({ kind: 'question', index: 0 })} />
                )}

                {stage.kind === 'question' && questions[stage.index] && (
                  <FadeStep stepKey={questions[stage.index].id}>
                    <QuestionScreen
                      q={questions[stage.index]}
                      index={stage.index}
                      total={questions.length}
                      selected={answers[questions[stage.index].id]}
                      onChoose={(v) => choose(questions[stage.index], v, stage.index)}
                      onBack={back}
                    />
                  </FadeStep>
                )}

                {stage.kind === 'result' && result && (
                  <FadeStep stepKey="result">
                    <Results result={result} onBack={back} onRestart={restart} />
                  </FadeStep>
                )}
              </>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

/* ═══ СОСТОЯНИЯ ЗАГРУЗКИ/ОШИБКИ ═══ (правило «все состояния»: загрузка, ошибка) */
function LoadingState() {
  return (
    <p className="t-mono text-[color:var(--ink-mute)]" role="status" aria-live="polite">
      Загружаю архив кадров…
    </p>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div role="alert">
      <p className="t-body max-w-[40ch] text-[color:var(--ink-soft)]">
        Не получилось загрузить фотографии. Проверьте соединение и попробуйте ещё раз.
      </p>
      <button type="button" className="link-major t-h3 mt-[1.2rem]" onClick={onRetry}>
        Попробовать снова
      </button>
    </div>
  );
}

/* ═══ ЭКРАН-ВХОД ═══
   Заголовок здесь — h2, не h1: единственный h1 страницы стоит выше (см.
   комментарий в `StoryboardPage`) и не меняется вместе со стадией квиза. */
function Intro({ onStart }: { onStart: () => void }) {
  return (
    <div>
      <h2 className="t-h1 mt-[0.7rem] max-w-[16ch]">Соберём вашу раскадровку</h2>
      <p className="t-lead mt-[clamp(1.2rem,3vw,2rem)] max-w-[42ch] text-[color:var(--ink-soft)]">
        Несколько коротких вопросов — и я подберу для вас 5–7 кадров из своих реальных
        съёмок. Раскадровку можно скачать и принести с собой в переписку — так проще
        показать, какую съёмку вы себе представляете.
      </p>
      <button type="button" className="link-major t-h3 mt-[clamp(1.8rem,4vh,2.6rem)]" onClick={onStart}>
        Начать
      </button>
    </div>
  );
}

/* ═══ ПЕРЕХОД МЕЖДУ ШАГАМИ ═══
   Свой лёгкий fade вместо `useReveal()` главной: тот хук снимает единственный
   снимок `.reveal`-узлов при монтировании (IntersectionObserver один раз на
   всё время жизни компонента) — для машины шагов, где узлы конкретного шага
   монтируются и размонтируются заново, это не подходит: наблюдатель не видит
   узлы, которых не было в DOM в момент своего создания. Здесь — обычный
   `useEffect` с зависимостью от `stepKey`: при каждой смене шага эффект
   создаётся заново и запускает переход с нуля. */
function FadeStep({ children, stepKey }: { children: ReactNode; stepKey: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.classList.add('is-in');
      return;
    }
    el.classList.remove('is-in');
    const id = requestAnimationFrame(() =>
      requestAnimationFrame(() => el.classList.add('is-in')),
    );
    return () => cancelAnimationFrame(id);
  }, [stepKey]);

  return (
    <div ref={ref} className="sb-step">
      {children}
    </div>
  );
}

/* ═══ ЭКРАН ВОПРОСА ═══ */
function QuestionScreen({
  q,
  index,
  total,
  selected,
  onChoose,
  onBack,
}: {
  q: QuestionDef;
  index: number;
  total: number;
  selected: string | undefined;
  onChoose: (value: string) => void;
  onBack: () => void;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.focus();
  }, [q.id]);

  return (
    <div aria-live="polite">
      <p className="t-mono text-[color:var(--ink-mute)]">
        Вопрос {index + 1} из {total}
      </p>
      <h2
        ref={headingRef}
        tabIndex={-1}
        className="t-h1 mt-[0.6rem] max-w-[20ch] outline-none"
        style={{ overflowWrap: 'break-word' }}
      >
        {q.title}
      </h2>
      {q.hint && (
        <p className="t-body mt-[0.9rem] max-w-[46ch] text-[color:var(--ink-soft)]">{q.hint}</p>
      )}

      <div
        role="group"
        aria-label={q.title}
        className="sb-tiles mt-[clamp(1.6rem,4vw,2.6rem)]"
      >
        {q.tiles.map((t) => (
          <button
            key={t.value}
            type="button"
            className="sb-tile"
            aria-pressed={selected === t.value}
            onClick={() => onChoose(t.value)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Правка Ф31/Ф32 — виджет только на вопросе «образ», дополняет
          плитки-ответы выше, не заменяет их (раздел 2 брифа). */}
      {q.id === 'образ' && <PinterestBoards />}

      <button
        type="button"
        className="link-minor t-body mt-[clamp(2rem,5vh,3rem)]"
        onClick={onBack}
        disabled={index === 0}
      >
        Назад
      </button>
    </div>
  );
}

/* ═══ АСИММЕТРИЧНАЯ РАСКЛАДКА РЕЗУЛЬТАТА ═══
   Direction-lock действует и здесь: «сетка одинаковых карточек как способ
   собрать страницу» запрещена (таблица запретов, hybrid/README.md § 3).
   Разные ширины и вертикальные сдвиги по индексу — тот же принцип, что у
   выключенной секции «Шесть кадров» на главной (`GRID_LAYOUT`, App.tsx),
   отдельный набор чисел здесь, потому что раскадровка отдаёт 4–7 кадров,
   а не ровно 6. Цикл по модулю: седьмой кадр повторяет разметку первого. */
const RESULT_LAYOUT = [
  { col: 'lg:col-span-5 lg:col-start-1', push: '' },
  { col: 'lg:col-span-6 lg:col-start-7', push: 'lg:mt-[4rem]' },
  { col: 'lg:col-span-4 lg:col-start-2', push: 'lg:mt-[2rem]' },
  { col: 'lg:col-span-5 lg:col-start-7', push: 'lg:mt-[1rem]' },
  { col: 'lg:col-span-5 lg:col-start-1', push: 'lg:mt-[3rem]' },
  { col: 'lg:col-span-4 lg:col-start-8', push: 'lg:mt-[5rem]' },
  { col: 'lg:col-span-6 lg:col-start-2', push: 'lg:mt-[2.5rem]' },
];

function Results({
  result,
  onBack,
  onRestart,
}: {
  result: PickResult;
  onBack: () => void;
  onRestart: () => void;
}) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDownload() {
    setDownloading(true);
    setError(null);
    try {
      await downloadStoryboard(result.photos);
    } catch {
      setError('Не получилось собрать файл. Попробуйте ещё раз.');
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div>
      <h2 className="t-h1 max-w-[18ch]">Ваша раскадровка</h2>

      {result.occasionOverride && (
        <p className="t-body mt-[0.9rem] max-w-[46ch] text-[color:var(--ink-soft)]">
          Показываю кадры именно с этим поводом — в архиве они пока без разметки по составу
          и месту, поэтому остальные вопросы здесь не участвовали.
        </p>
      )}

      {result.relaxedMaterial && (
        <p className="t-body mt-[0.9rem] max-w-[46ch] text-[color:var(--ink-soft)]">
          Точных кадров под цифру/плёнку в этом сочетании набралось мало — показываю более
          широкий подбор по формату съёмки.
        </p>
      )}

      {result.photos.length === 0 ? (
        /* «нулевой результат» — правило «все состояния». Практически недостижимо при
           текущих размерах бакетов (`pick.ts`), но обрабатывается честно, а не молча. */
        <p className="t-body mt-[1.4rem] max-w-[42ch] text-[color:var(--ink-soft)]">
          Пока не нашлось подходящих кадров под такое сочетание ответов — большая редкость.
          Попробуйте пройти ещё раз с другими ответами.
        </p>
      ) : (
        <ul className="sb-grid mt-[clamp(2rem,6vh,3.5rem)] grid grid-cols-1 gap-x-[var(--gutter)] gap-y-[clamp(2.2rem,6vw,4rem)] lg:grid-cols-12">
          {result.photos.map((p, i) => {
            const L = RESULT_LAYOUT[i % RESULT_LAYOUT.length];
            return (
              <li key={p.id} className={`m-0 ${L.col} ${L.push}`}>
                <ResultFrame p={p} />
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-[clamp(2.2rem,6vh,3.4rem)] flex flex-wrap items-baseline gap-x-[2.2rem] gap-y-4">
        <button
          type="button"
          className="link-major t-h3"
          onClick={handleDownload}
          disabled={downloading || result.photos.length === 0}
        >
          {downloading ? 'Собираю файл…' : 'Скачать раскадровку'}
        </button>
        <button type="button" className="link-minor t-body" onClick={onRestart}>
          Пройти ещё раз
        </button>
        <button type="button" className="link-minor t-body" onClick={onBack}>
          Назад к вопросам
        </button>
      </div>

      {error && (
        <p role="alert" className="t-body mt-[1rem] text-[color:var(--plate)]">
          {error}
        </p>
      )}
    </div>
  );
}

/* Кадр результата + честная подпись из реальных тегов (материал/формат/место —
   ровно то, что известно про фото, без выдуманных подробностей). Данные-атрибуты
   (`data-format` и т. д.) не декоративны: по ним самопроверка меряет, что подбор
   действительно фильтрует по ответам, а не только показывает случайные кадры. */
function ResultFrame({ p }: { p: StoryboardPhoto }) {
  const [broken, setBroken] = useState(false);
  const caption = [p.формат, p.материал, p.место].filter(Boolean).join(' · ');

  return (
    <figure
      className="m-0"
      data-format={p.формат ?? ''}
      data-material={p.материал ?? ''}
      data-place-category={p.местоКатегория ?? ''}
      data-look={p.образ.join(',')}
      data-occasion={normalizeOccasionTags(p.настроение).join(',')}
    >
      <div className="frame overflow-hidden" style={{ minHeight: broken ? 120 : undefined }}>
        {!broken ? (
          <img
            src={p.src}
            width={p.w}
            height={p.h}
            alt={p.alt}
            className="block w-full"
            /* НЕ lazy, намеренно — это единственное место фичи, где
               `loading="lazy"` было бы неверным выбором, а не просто
               умолчанием: результат — ровно 4–7 кадров, это payoff-момент
               всего брифа, и на медленной сети/резком скролле ленивая
               загрузка даёт видимые пустые проймы (поймано скриншотом
               `fullPage` на 360px при съёмке доказательств — сеть у Playwright
               не медленная, поэтому в самой странице это не гонка, а
               исключительно фотография для отчёта; но на реальном медленном
               соединении то же самое стало бы реальным разрывом на самом
               важном экране). Шесть кадров ~15–35 КБ каждый — грузить их
               сразу дешевле, чем объяснять пользователю дыру в его же
               раскадровке. */
            loading="eager"
            decoding="async"
            onError={() => setBroken(true)}
          />
        ) : (
          /* «отсутствующее изображение» — правило «все состояния»: кадр не
             грузится молча дырой, а честно сообщает об этом текстом. */
          <p className="t-mono p-4 text-[color:var(--ink-mute)]">Кадр временно недоступен</p>
        )}
      </div>
      {caption && (
        <figcaption className="t-mono mt-[0.6rem] text-[color:var(--ink-mute)]">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
