import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Gradient, Grain } from '../Gradient';
import { copy } from '../copy';
import { Header, Footer } from '../App';
/* `useSmoothScroll` снят и здесь (Ф44) — та же причина, что на главной, см. `App.tsx`. */
import { Stars } from '../Stars';
import { ProgressStars } from './ProgressStars';
/* `PinterestBoards` и `boardsForAnswers` больше не импортируются (Ф64): доски
   сняты с экрана результата по прямой просьбе владелицы. Оба файла НЕ удалены
   и остаются рабочими — здесь висит эта строка, а не мёртвый импорт, потому
   что неиспользуемый импорт следующий читатель просто вычистит, не узнав, что
   код жив и ждёт возврата («пока сделаем так»). Тот же приём, что у
   `FilmCaption` в `App.tsx`. */
import { PhotoFan } from './PhotoFan';
import { QuestionLadder } from './QuestionLadder';
import { nextQuestionInTree, estimateTotalSteps, buildBriefAnswers } from './questions';
import { POVOD_PARAM, povodFromSlug } from './q0';
import { pickStoryboard } from './pick';
import type { PickResult } from './pick';
import { downloadStoryboard } from './download';
import type { StoryboardPhoto } from './types';

/**
 * ФИЧА «ПРИДУМАТЬ СЪЁМКУ» — `BRIEF-STORYBOARD.md`. Интерактивный бриф →
 * алгоритм подбора (`pick.ts`) → раскадровка из реальных кадров → скачивание
 * PDF с подписью-визиткой (`download.ts`).
 *
 * РЕДАКЦИЯ 4 (Ф33, `STORYBOARD.md` § 13) — самая крупная правка фичи: квиз
 * перестал быть плоским списком вопросов и стал настоящим деревом решений
 * (`questions.ts`, `nextQuestionInTree`), механика показа сменилась с «один
 * вопрос за раз» на горизонтальную лестницу отвеченных шагов (`QuestionLadder
 * .tsx`), результат показывает фото владелицы карточным веером (`PhotoFan
 * .tsx`) вместо асимметричной сетки, доски Pinterest переехали на экран
 * результата отдельной секцией. Подробности каждого решения — в комментариях
 * затронутых файлов.
 *
 * Направление-лок обязателен и здесь (подтверждено в задании явно):
 * `Gradient`/`Grain`/`Stars`/`Header`/`Footer` — те же компоненты, что на
 * главной, не копии. Единственный вкусовой скилл — `apple-design`, тот же,
 * что зафиксирован в `DIRECTION-LOCK.md`.
 *
 * Экранный текст здесь — авторский текст билдера там, где дерево Ф33 не
 * задаёт формулировку дословно (для этой фичи нет зон в `COPY.md`).
 */

type Stage = 'intro' | 'question' | 'result';

interface HistoryEntry {
  id: string;
  title: string;
  value: string;
  label: string;
}

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
  // Ф39 п.14 — тот же плавный ход колеса, что на главной. Хук, а не копия
  // логики: правило «общее раньше частного», как у `Header`/`Footer` выше.
  /* useSmoothScroll(); — снят Ф44, перехват колеса переносил прокрутку с композитора на основной поток */

  const [photos, setPhotos] = useState<StoryboardPhoto[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [stage, setStage] = useState<Stage>('intro');
  const [history, setHistory] = useState<HistoryEntry[]>([]);
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

  /* ═══ ВХОД С ГЛАВНОЙ, С УЖЕ ОТМЕЧЕННЫМ ОТВЕТОМ (Ф63) ═══════════════════
     Владелица: «раздел "придумать съемку" прям спрятался… как продукт не
     сразу достигает своего клиента». На главной теперь стоит первый вопрос
     квиза (`Storyboard()` в `App.tsx`), и его плитки — обычные ссылки сюда
     с адресом вида `/storyboard.html?povod=lyubov`.

     ЧЕЛОВЕК УЖЕ ОТВЕТИЛ — ЗНАЧИТ ВОПРОС НЕ ЗАДАЁТСЯ ВТОРОЙ РАЗ. Ответ
     кладётся в историю, и страница открывается сразу на СЛЕДУЮЩЕМ вопросе,
     а первый уже стоит в лестнице отвеченным. Экран входа при этом
     пропускается целиком: он приглашает начать, а начали уже на главной.

     ЖДЁМ АРХИВ, а не разбираем адрес сразу: тайл «Скоро день рождения»
     существует, только пока в архиве есть кадры с этим поводом (`q0.ts`), и
     проверить это можно лишь по загруженному манифесту. Слаг, которому не
     нашлось живого тайла, ИГНОРИРУЕТСЯ — читатель видит обычный вход, а не
     пустой результат по ответу, которого в дереве нет.

     АДРЕС ЧИСТИТСЯ сразу после применения (`replaceState`, без перехода):
     ответ переехал в состояние, и держать его ещё и в строке адреса значит
     соврать после «Начать заново» — там история пуста, а адрес по-прежнему
     обещает выбранный повод. `window.history`, не `history`: локальное
     состояние выше носит то же имя и перекрывает глобальное. */
  useEffect(() => {
    if (!photos || history.length > 0) return;
    const value = povodFromSlug(new URLSearchParams(window.location.search).get(POVOD_PARAM));
    if (!value) return;
    const q0 = nextQuestionInTree({}, photos);
    const tile = q0?.tiles.find((t) => t.value === value);
    if (!q0 || !tile) return;
    setHistory([{ id: q0.id, title: q0.title, value: tile.value, label: tile.label }]);
    setStage('question');
    const url = new URL(window.location.href);
    url.searchParams.delete(POVOD_PARAM);
    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
    // `history.length` читается один раз как охрана от повторного применения;
    // добавлять его в зависимости незачем — эффект обязан сработать на приход
    // архива, а не на каждый ответ квиза.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photos]);

  const answersMap = useMemo(
    () => Object.fromEntries(history.map((h) => [h.id, h.value])),
    [history],
  );
  const currentQuestion = useMemo(
    () => (photos && stage === 'question' ? nextQuestionInTree(answersMap, photos) : null),
    [photos, stage, answersMap],
  );

  function start() {
    setStage('question');
  }

  function chooseTile(value: string, label: string) {
    if (!currentQuestion || !photos) return;
    const entry: HistoryEntry = { id: currentQuestion.id, title: currentQuestion.title, value, label };
    const newHistory = [...history, entry];
    setHistory(newHistory);
    const newAnswers = Object.fromEntries(newHistory.map((h) => [h.id, h.value]));
    const next = nextQuestionInTree(newAnswers, photos);
    if (next) {
      setStage('question');
    } else {
      const brief = buildBriefAnswers(newAnswers);
      setResult(pickStoryboard(photos, brief));
      setStage('result');
    }
    scrollToFresh();
  }

  /* ═══ АВТОПРОКРУТКА ПОСЛЕ ОТВЕТА (Ф52) ═════════════════════════════════
     «В интерактиве страница должна сдвигаться вверх, когда ответы заполняют
     всю страницу, чтобы не пришлось перелистывать вручную».

     Лестница отвеченных вопросов растёт вниз (на узком экране — строго
     вертикально), и после третьего-четвёртого ответа новый вопрос
     оказывается ниже края экрана. Человек отвечает, экран внешне не
     меняется, и приходится догадаться прокрутить.

     ЧТО ИМЕННО ПОДВОДИМ ПОД ГЛАЗА — не низ страницы и не следующий вопрос, а
     ПОСЛЕДНИЙ ШАГ ЛЕСТНИЦЫ: на стадии вопросов это и есть новый вопрос, на
     стадии результата — сам результат. Один узел на оба случая, никаких
     ветвлений.

     ПРОКРУЧИВАЕМ ТОЛЬКО ЕСЛИ НУЖНО. `scrollIntoViewIfNeeded`-поведения в
     стандарте нет, поэтому проверяем сами: если новый узел уже целиком виден
     под шапкой, страница не двигается вовсе. Дёргать её на каждом ответе,
     когда и так всё видно, — худшее, чем ручная прокрутка.

     ЖДЁМ ОТРИСОВКУ. Состояние только что изменено, DOM ещё старый: замер до
     перерисовки вернул бы положение предыдущего шага. Двойной кадр —
     тот же приём, что у входных анимаций лестницы.

     `smooth` здесь честный: движение короткое и предсказуемое, человек сам
     его вызвал нажатием. При выключенном движении прокрутка мгновенная. */
  function scrollToFresh() {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        const steps = document.querySelectorAll<HTMLElement>('.sb-ladder-step, .sb-step');
        const fresh = steps[steps.length - 1];
        if (!fresh) return;
        const r = fresh.getBoundingClientRect();
        const HEADER = 96; // фиксированная шапка перекрывает верх вьюпорта
        const влезает = r.top >= HEADER && r.bottom <= window.innerHeight;
        if (влезает) return;
        window.scrollTo({
          top: Math.max(0, r.top + window.scrollY - HEADER),
          behavior: reduce ? 'auto' : 'smooth',
        });
      }),
    );
  }

  function back() {
    if (stage === 'result') {
      setResult(null);
      setHistory((h) => h.slice(0, -1));
      setStage('question');
      return;
    }
    if (history.length === 0) {
      setStage('intro');
      return;
    }
    setHistory((h) => h.slice(0, -1));
  }

  function restart() {
    setHistory([]);
    setResult(null);
    setStage('intro');
  }

  const progressTotal =
    stage === 'result' ? history.length : (estimateTotalSteps(answersMap) ?? history.length + 1);
  const wide = stage === 'question' || stage === 'result';

  return (
    <>
      <Header />
      <main id="pridumat" className="relative z-10">
        <section className="relative min-h-[100svh] px-[var(--gutter)] py-[clamp(6rem,14vh,9rem)]">
          <Stars count={10} seed={131} scale="mixed" />

          <div className={`relative z-10 mx-auto w-full ${wide ? 'max-w-[82rem]' : 'max-w-[52rem]'}`}>
            {loadError && <ErrorState onRetry={load} />}

            {!loadError && !photos && <LoadingState />}

            {!loadError && photos && (
              <>
                {/* ЕДИНСТВЕННЫЙ <h1> СТРАНИЦЫ — постоянный, не переключается вместе
                    со стадией (находка редакции 1, см. STORYBOARD.md § 10). */}
                <h1 className="t-mono text-[color:var(--ink-mute)]">{copy.storyboard.nav}</h1>

                {stage !== 'intro' && (
                  <div className="mt-[clamp(1rem,2.6vh,1.6rem)] mb-[clamp(1.6rem,4vh,2.6rem)]">
                    <ProgressStars total={progressTotal} lit={history.length} />
                  </div>
                )}

                {stage === 'intro' && <Intro onStart={start} />}

                {stage === 'question' && currentQuestion && (
                  <QuestionLadder
                    history={history}
                    current={currentQuestion}
                    stepNumber={history.length + 1}
                    totalSteps={estimateTotalSteps(answersMap)}
                    onChoose={chooseTile}
                    onBack={back}
                  />
                )}

                {stage === 'result' && result && (
                  <FadeStep stepKey="result">
                    {/* `answers` больше не передаётся (Ф64): он был нужен
                        только доскам Pinterest — они выбирались по всему
                        пройденному пути (`boards.ts`). Сам `answersMap`
                        остаётся, им живёт дерево вопросов. */}
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
   Заголовок здесь — h2, не h1: единственный h1 страницы стоит выше.

   ТЕКСТ — ПРАВКА Ф33 п.5, УТОЧНЕНА Ф34 (пришла раньше, чем билдер закончил
   работу над деревом, и заменяет одну фразу из Ф33 целиком):
   · заголовок «соберем для вас референсы к вашей съемке» (как есть у
     владелицы, без «ё» и без изменения регистра — «боевой текст дословно»),
     заменяет прежнее «Соберём вашу раскадровку» — это часть Ф33, Ф34 её не
     трогает;
   · к фразе «из своих реальных съёмок» добавлено «и немного вдохновляясь
     моими уже собранными досками на Pinterest» — Ф34 дословно заменяет более
     раннюю формулировку Ф33 («и собранных референсов из Pinterest :)»),
     которая победившей не стала.

   Ф39, две правки этого экрана:
   · п.9 — заголовок с прописной («Соберем…»). Отменяет прежнее «без
     изменения регистра»: там строчная сохранялась как её манера, теперь она
     сама просит прописную, и её указание сильнее вывода билдера. Слово
     «Соберем» остаётся без «ё» — правится регистр, а не написание;
   · п.10 — «и немного вдохновляясь моими уже собранными досками на
     Pinterest» → «и немного повдохновляемся моими уже собранными досками на
     Pinterest». Слово исправлено следом её же сообщением: сначала было
     прислано «подвохновляемся», через минуту — «поменяй слово
     "подвохновляемся" на "повдохновляемся"». Стоит второе. Точка в конце
     сохранена: замена стоит не в конце абзаца, за ней идёт ещё одно
     предложение про скачивание, и без точки два предложения слиплись бы. */
/* Ф63: три строки этого экрана переехали в `../copy.ts`, зона
   `copy.storyboard` — их читает теперь и блок-приглашение на главной, а
   боевой текст, правленный владелицей по одному слову, не должен лежать в
   двух компонентах сразу. Ни один знак не изменён; причина переезда
   подробно записана над самой зоной. */
function Intro({ onStart }: { onStart: () => void }) {
  return (
    <div>
      <h2 className="t-h1 mt-[0.7rem] max-w-[22ch]">{copy.storyboard.title}</h2>
      <p className="t-lead mt-[clamp(1.2rem,3vw,2rem)] max-w-[44ch] text-[color:var(--ink-soft)]">
        {copy.storyboard.lead}
      </p>
      <button type="button" className="link-major t-h3 mt-[clamp(1.8rem,4vh,2.6rem)]" onClick={onStart}>
        {copy.storyboard.start}
      </button>
    </div>
  );
}

/* ═══ ПЕРЕХОД МЕЖДУ ВХОДОМ/РЕЗУЛЬТАТОМ ═══
   Редакция 4 сузила область применения этого хука: раньше он оборачивал КАЖДЫЙ
   вопрос (один-за-раз), теперь стадию вопросов ведёт `QuestionLadder.tsx` (у
   неё свой, шаговый вход на каждую плашку лестницы) — этот компонент остался
   только для входа в стадию результата, тот же лёгкий fade, что и раньше. */
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

/* ═══ ЭКРАН РЕЗУЛЬТАТА ═══
   Владелица: «референсы… можно разделить — например "вдохновение по моим
   съемкам" и веер из моих работ» (FACTS.md Ф33, п.4). Секция «моих съёмок» —
   карточный веер (`PhotoFan.tsx`, п.2 задания).

   ═══ СЕКЦИЯ PINTEREST СНЯТА ЦЕЛИКОМ (Ф64) ═══════════════════════════════
   Дословно: «убери доски Pinterest и любые упоминания его в тексте. пока
   сделаем так».

   Снято три вещи: заголовок «Вдохновение из Pinterest», сам виджет с
   вкладками и придаточное про доски в подводке экрана входа (`copy.ts`,
   зона `storyboard`), плюс подсказка вопроса про образ, которая эти доски
   обещала (`questions.ts`, `Q_LOOK`). Больше слова «Pinterest» на экране
   нет нигде — самопроверка меряет это по всему текстовому слою обеих
   страниц, а не только там, где мы помним, что оно было.

   ЧТО НЕ УДАЛЕНО И ПОЧЕМУ. Файлы `PinterestBoards.tsx` и `boards.ts`
   остаются на месте рабочими — тот же принцип, что у `Grid()`, `Faq()` и
   `FilmCaption` на главной: владелица сказала «пока сделаем так», то есть
   возврат обсуждается. Возврат стоит одного блока разметки здесь и двух
   строк импорта, а не восстановления привязки досок к ответам дерева, на
   которую ушла целая правка Ф34.

   ЧТО ЭТО СТОИЛО, честно: пропала единственная часть результата, которая
   показывала НЕ её кадры, — то есть отделять «чужой источник» от «своих
   съёмок» больше нечего, и заголовок над веером теперь один на весь экран.
   Ветка «Скоро день рождения» и раньше приходила к результату без досок
   (Ф34), так что для неё экран не изменился вовсе. */
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
      {/* Ф41: «вместо фраз "Ваша раскадровка / Вдохновение по моим съёмкам"
          напиши просто одну "Наша возможная раскадровка"». Два заголовка
          сведены в один: этот остаётся и меняет текст, `<h3>` над веером
          снят ниже. «Наша», не «Ваша» — её слово, и оно меняет смысл: не
          готовый результат, а совместный набросок. */}
      <h2 className="t-h1 max-w-[18ch]">Наша возможная раскадровка</h2>

      {/* ПОЯСНИТЕЛЬНЫЕ ФРАЗЫ СНЯТЫ Ф41: «фразы по типу таких "Показываю кадры
          именно с этим поводом. Место и образ в архиве пока не размечены под
          эти кадры, поэтому эти ответы не повлияли — учла только материал."
          убери вообще». Обе — и про повод (`result.occasionOverride`), и про
          ослабление фильтра «мужская» (`result.relaxedGender`): вторая того
          же рода, «по типу таких» их и объединяет — оба абзаца объясняли
          читателю внутреннюю кухню подбора.

          ЧТО ЭТО МЕНЯЕТ, честно. Фразы были не украшением: они закрывали
          правило «не врать молча» — читатель отвечал про место и образ, а на
          выдачу влиял только материал, и текст об этом предупреждал. Теперь
          подбор ведёт себя так же, но молчит. Это осознанный размен по её
          прямой просьбе, а не упущение.

          Флаги `result.occasionOverride` и `result.relaxedGender` НЕ удалены
          из `pick.ts` — они по-прежнему вычисляются и по-прежнему верны,
          просто не выводятся. Возврат любой из фраз — один блок здесь. */}

      {/* `<h3>Вдохновение по моим съёмкам</h3>` СНЯТ Ф41 — сведён в заголовок
          выше. Секция от этого не осталась без имени: над ней стоит `<h2>`,
          и веер читается как содержимое самой раскадровки. С Ф64, когда
          вторая подборка (доски) снята, он и вовсе остался единственным
          разделом экрана — отделять от чужого источника больше нечего. */}
      <div className="mt-[clamp(2rem,6vh,3.5rem)]">
        {result.photos.length === 0 ? (
          /* «нулевой результат» — правило «все состояния». Практически недостижимо при
             текущих размерах бакетов (`pick.ts`), но обрабатывается честно, а не молча. */
          <p className="t-body mt-[1.2rem] max-w-[42ch] text-[color:var(--ink-soft)]">
            Пока не нашлось подходящих кадров под такое сочетание ответов — большая редкость.
            Попробуйте пройти ещё раз с другими ответами.
          </p>
        ) : (
          <div className="mt-[clamp(1.4rem,4vh,2.2rem)]">
            <PhotoFan photos={result.photos} />
          </div>
        )}
      </div>

      {/* Здесь стояла секция «Вдохновение из Pinterest» — снята Ф64 целиком,
          см. блок-комментарий над `Results()`. */}

      {/* Приписка владелицы дословно (FACTS.md Ф34) — смайлик и формулировка
          её тон, не билдера. Стоит после веера, перед кнопками —
          как лёгкая оговорка перед призывом скачать раскадровку.
          Ф39: прописная в начале. Пункт 7 назван про «следующий и
          последующие разделы» главной, а п.6 добавляет «все в одной
          стилистике» — оставить единственную строчную фразу на весь сайт
          означало бы исполнить просьбу наполовину. Смайлик, отсутствие «ё» и
          строчная после запятых — как у неё.

          ВТОРОЕ ПРЕДЛОЖЕНИЕ — правка владелицы в чате (не в FACTS.md, см.
          сообщение коммита): «к подписи добавь такой текст: "Вы можете
          скачать нашу раскадровку и прислать мне ее как один из вариантов
          референсов."». Дословно, её «ее» без «ё» не тронуто. Добавлено, а
          не заменено — «добавь» её словами, не «замени»; встаёт вторым
          предложением того же абзаца, сразу перед кнопкой «Скачать
          раскадровку» — CTA получает объяснение «зачем» непосредственно
          перед собой, а не оговорку об идеях без него. */}
      <p className="t-body mt-[clamp(2rem,5vh,3rem)] max-w-[48ch] text-[color:var(--ink-soft)]">
        Естественно это лишь наброски, еще больше идей может родиться в процессе обсуждения и
        переписки:) Вы можете скачать нашу раскадровку и прислать мне ее как один из вариантов
        референсов.
      </p>

      <div className="mt-[clamp(1.4rem,3.6vh,2rem)] flex flex-wrap items-baseline gap-x-[2.2rem] gap-y-4">
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
