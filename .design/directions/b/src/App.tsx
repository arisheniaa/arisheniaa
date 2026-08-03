import { NameMorph } from './NameMorph';
import { Rack } from './Rack';
import { Stars } from './Stars';
import { useReveal, useFocusScrub } from './reveal';

/**
 * Направление B — «Воздух и одиночный объект».
 * Вкусовой скилл: apple-design. Срез picked/: пустота как материал.
 *
 * Весь экранный текст — дословно из COPY.md ред. 5. Ни одна строка не
 * переписана. Где текст не встал — записано в README как находка для гейта.
 * Единственный текст, которого в COPY нет, — атрибуты alt: их зоны в COPY
 * помечены ⟦заглушка⟧ до отбора кадров владелицей, и они набраны предметным
 * словарём по фактическим пикселям (§ 0.14 запрещает «мягкий / нежный свет»).
 */

export function App() {
  useReveal();
  useFocusScrub();

  return (
    <>
      <Header />
      <main>
        <Hero />
        <Registers />
        <Grid />
        <Offer />
        <Faq />
        <Cta />
      </main>
    </>
  );
}

/* ───────────────────────── шапка ─────────────────────────
   Знак — единственное место имени. Пресет brand-here: знака-картинки нет,
   знак это само имя, которое умеет наводиться на резкость.
   Геолиния из шапки убрана: на 390 px она обрезалась правым краем
   (видно на shots/hero-390.png прошлого захода). Её место — в первом экране,
   где она и по смыслу принадлежит зоне `home:hero.geo`. */
function Header() {
  return (
    <header className="grain relative z-20 px-[var(--gutter)] pt-[clamp(1.1rem,2.2vw,2rem)]">
      <NameMorph className="reveal t-name" />
    </header>
  );
}

/* ───────────────────────── первый экран ─────────────────────────
   Пустота несущая. Заголовок лестницей: два регистра автора разведены
   по горизонтали, оставаясь одной фразой (композиционный контракт гейта 1).
   Справа — рэк из двух кадров, механика удержания внимания. */
function Hero() {
  return (
    <section className="grain relative px-[var(--gutter)] pt-[clamp(2rem,5vh,4rem)] pb-[clamp(3.5rem,9vh,7rem)]">
      <Stars count={14} seed={7} />

      <div className="relative z-10 mx-auto max-w-[1500px]">
        <p className="reveal t-meta text-[color:var(--color-ink-mute)]">
          Москва. В&nbsp;Тулу&nbsp;— приезжаю
        </p>

        <h1
          className="reveal t-display mt-[clamp(1.1rem,2.5vw,2rem)]"
          style={{ ['--i' as string]: 1 }}
        >
          <span className="block">Тихие портреты</span>
          <span className="block pl-[0.35em] sm:pl-[1.4em] lg:pl-[2.6em]">и странные затеи</span>
        </h1>

        <div className="mt-[clamp(2.2rem,6vw,4.5rem)] grid grid-cols-1 gap-x-[var(--gutter)] gap-y-[clamp(2.2rem,5vw,4rem)] lg:grid-cols-12">
          <div className="lg:col-span-6 lg:col-start-1">
            <p
              className="reveal t-lead max-w-[34ch] text-[color:var(--color-ink-soft)]"
              style={{ ['--i' as string]: 2 }}
            >
              Снимаю на цифру и на плёнку. Мандарин над снегом придумывается заранее, туман над
              полем&nbsp;— просто ждётся.
            </p>

            <div
              className="reveal mt-[clamp(1.8rem,4.5vw,3.5rem)] flex flex-wrap items-baseline gap-x-[2.5rem] gap-y-4"
              style={{ ['--i' as string]: 3 }}
            >
              <a className="link-major t-h3" href="#cta">
                Написать в&nbsp;Telegram
              </a>
              <a className="link-minor t-body" href="#grid">
                Сначала посмотреть съёмки
              </a>
            </div>
          </div>

          {/* Стопка: один объект в пустоте. Размер выбран не по сетке, а по тому,
              чтобы весь предмет вместе с подписями попадал в первый экран —
              и на 390×844, и на 1280×900. Механика, которую надо доскроллить,
              механикой первого экрана не является. */}
          <div
            className="reveal lg:col-span-4 lg:col-start-9 lg:self-start"
            style={{ ['--i' as string]: 4 }}
          >
            <Rack />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── регистры ─────────────────────────
   Секция без единой фотографии: двойственность произносится типографикой
   на пустой бумаге. Приём с cur-kurppahosk — крупная антиква по центру
   большого воздуха; там она тонкая и серая, здесь плотная и чернильная
   (запрет из F1-STATUS, замена по П3). */
function Registers() {
  return (
    <section className="grain relative px-[var(--gutter)] py-[clamp(4.5rem,14vh,11rem)]">
      <Stars count={7} seed={19} />
      <div className="relative z-10 mx-auto max-w-[1500px]">
        <h2 className="reveal t-h1 mx-auto max-w-[24ch] text-center">Тихое и странное</h2>

        <div className="mt-[clamp(3rem,9vh,7rem)] grid grid-cols-1 gap-[clamp(2.5rem,6vw,5rem)] md:grid-cols-2">
          <div className="reveal" style={{ ['--i' as string]: 1 }}>
            <p className="t-meta text-[color:var(--color-ink-mute)]">Тихое</p>
            <p className="t-quote mt-[clamp(0.9rem,2vw,1.5rem)] max-w-[26ch]">
              Вода, трава, чёрно-белое. Здесь я ничего не придумываю: приезжаю и жду, пока свет
              ляжет.
            </p>
          </div>
          {/* Странное сдвинуто вниз и вправо: равновесие по весу, не по сетке.
              Симметричная пара из двух одинаковых колонок читалась бы как таблица. */}
          <div
            className="reveal md:mt-[clamp(2rem,7vh,5rem)] md:pl-[clamp(1rem,4vw,4rem)]"
            style={{ ['--i' as string]: 2 }}
          >
            <p className="t-meta text-[color:var(--color-ink-mute)]">Странное</p>
            <p className="t-quote mt-[clamp(0.9rem,2vw,1.5rem)] max-w-[26ch]">
              Мандарин над снегом. Эльфийское платье однажды сшила сама&nbsp;— мама принесла велюр.
              Затея делается всерьёз.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── шесть кадров ─────────────────────────
   Р4: кадр — объект, не фон. Поэтому не ровная сетка 3×2, а разнобой
   по ширине и по вертикали: каждый кадр стоит в своём воздухе и подписан.
   Приём из pho-anothermag3 — кадр и текст как два равных объекта на белом. */
const GRID = [
  {
    src: '/frames/flying.webp',
    w: 1400,
    h: 1866,
    caption: 'Мандарин над снегом',
    alt: 'Волосы подняты в воздух, тёплый песочный фон, кадр снят против света',
    col: 'lg:col-span-4 lg:col-start-1',
    push: '',
    size: 'w-[86%]',
  },
  {
    src: '/frames/field.webp',
    w: 1600,
    h: 2133,
    caption: '„Ведомости“ в еловом лесу',
    alt: 'Фигура в длинном пальто посреди поля, за ней стена берёз и молодых елей',
    col: 'lg:col-span-5 lg:col-start-7',
    push: 'lg:mt-[7rem]',
    size: 'w-full',
  },
  {
    src: '/frames/autumn.webp',
    w: 1400,
    h: 1866,
    caption: 'Туман сел на поле',
    alt: 'Портрет у воды, зелёный шарф, охра осенней листвы на другом берегу',
    col: 'lg:col-span-4 lg:col-start-3',
    push: 'lg:mt-[3rem]',
    size: 'w-[78%] ml-auto',
  },
  {
    src: '/frames/face.webp',
    w: 800,
    h: 1066,
    caption: 'Лицо в траве',
    alt: 'Чёрно-белый крупный кадр: веснушки, рука у щеки, зерно заметно',
    col: 'lg:col-span-3 lg:col-start-8',
    push: 'lg:mt-[1rem]',
    size: 'w-[70%]',
  },
  {
    src: '/frames/looking.webp',
    w: 1400,
    h: 1866,
    caption: 'Кадр через колосья',
    alt: 'Профиль на фоне пасмурного неба, солнце уходит за кромку леса',
    col: 'lg:col-span-4 lg:col-start-2',
    push: 'lg:mt-[2rem]',
    size: 'w-[84%]',
  },
  {
    src: '/frames/gold.webp',
    w: 1400,
    h: 1866,
    caption: 'Золото в интерьере',
    alt: 'У окна во всю стену, велюровый подоконник, за стеклом осенний пустырь',
    col: 'lg:col-span-5 lg:col-start-7',
    push: 'lg:mt-[5rem]',
    size: 'w-full',
  },
];

function Grid() {
  return (
    <section id="grid" className="grain relative px-[var(--gutter)] pb-[clamp(4rem,12vh,9rem)]">
      <div className="relative z-10 mx-auto max-w-[1500px]">
        <h2 className="reveal t-h2">Шесть кадров</h2>

        <div className="mt-[clamp(2.5rem,7vh,5rem)] grid grid-cols-1 gap-x-[var(--gutter)] gap-y-[clamp(3rem,9vh,7rem)] lg:grid-cols-12">
          {GRID.map((f, i) => (
            <figure
              key={f.src}
              className={`m-0 ${f.col} ${f.push} ${i % 2 ? 'ml-auto w-[82%] sm:w-auto' : 'w-[94%] sm:w-auto'}`}
            >
              <div data-focus="in" className="overflow-hidden">
                <img
                  src={f.src}
                  width={f.w}
                  height={f.h}
                  alt={f.alt}
                  className={`frame block ${f.size}`}
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <figcaption className="t-meta mt-[0.9rem] text-[color:var(--color-ink-mute)]">
                {f.caption}
              </figcaption>
            </figure>
          ))}
        </div>

        <p className="reveal mt-[clamp(3rem,8vh,6rem)]">
          <a className="link-major t-h3" href="#cta">
            Все съёмки по сериям
          </a>
        </p>
      </div>
    </section>
  );
}

/* ───────────────────────── что можно снять ─────────────────────────
   Самая трудная зона главной: три предложения с ценами.
   Прайс-лист таблицей здесь запрещён (PRICE-POSITION): таблица ставит автора
   в один ряд с теми, кто стоит 3 000. Поэтому чернильное поле, асимметрия
   перечисления и творческая съёмка отдельным объектом, а не третьей ячейкой. */
function Offer() {
  return (
    <section
      id="offer"
      className="grain grain-ink relative overflow-hidden bg-[color:var(--color-ink)] px-[var(--gutter)] py-[clamp(4.5rem,13vh,11rem)] text-[color:var(--color-paper)]"
    >
      {/* На чернильном поле звёзд меньше и seed другой: при seed 31 две попадали
          ровно на строку цены, и жёлтое по жёлтому теряло цифру. */}
      <Stars count={7} seed={37} />

      <div className="relative z-10 mx-auto max-w-[1500px]">
        <div className="mx-auto max-w-[46rem] text-center">
          <h2 className="reveal t-h2">Что можно у меня снять</h2>
          <p
            className="reveal t-lead mx-auto mt-[clamp(1.5rem,3.5vw,2.5rem)] max-w-[42ch] text-[color:var(--color-paper-dim)]"
            style={{ ['--i' as string]: 1 }}
          >
            Два жанра по запросу&nbsp;— один человек и двое. И третий, где запроса нет: вы
            отдаётесь моему воображению и смотрите, как я вас увижу. Плёнка добавляется к любому.
          </p>
        </div>

        <div className="mt-[clamp(3.5rem,10vh,7rem)] grid grid-cols-1 gap-[clamp(2.5rem,5vw,4rem)] md:grid-cols-2">
          <OfferRow
            i={0}
            name="Один человек"
            price="7 000 ₽ за час в Москве · 5 000 ₽ в Туле"
            includes="Час съёмки, 30 снимков в обработке (за каждый следующий час +30). Плёнка — по желанию, от 1,5 часа."
          />
          <OfferRow
            i={1}
            name="Двое"
            price="7 000 ₽ за час в Москве · 5 000 ₽ в Туле"
            includes="Полтора часа на двоих, 45 снимков в обработке. Плёнка — по желанию."
          />
        </div>

        <div className="rule-pale mt-[clamp(3rem,7vh,5rem)]" />

        <div className="mt-[clamp(3rem,8vh,6rem)] grid grid-cols-1 items-center gap-[clamp(2rem,5vw,4rem)] lg:grid-cols-12">
          <figure className="reveal m-0 lg:col-span-5 lg:col-start-1">
            <div data-focus="in" className="overflow-hidden">
              <img
                src="/frames/motion.webp"
                width={1800}
                height={1200}
                alt="Чёрно-белый кадр в движении: волосы через плечо, лицо на выдержке смазано"
                className="frame block w-full"
                loading="lazy"
                decoding="async"
              />
            </div>
          </figure>

          <div className="lg:col-span-6 lg:col-start-7">
            <p className="reveal t-meta text-[color:var(--color-star)]">Третья, без запроса</p>
            <h3 className="reveal t-h2 mt-3" style={{ ['--i' as string]: 1 }}>
              Творческая
            </h3>
            <p
              className="reveal t-lead mt-[clamp(1.25rem,3vw,2rem)] max-w-[36ch] text-[color:var(--color-paper-dim)]"
              style={{ ['--i' as string]: 2 }}
            >
              Идею и реквизит собираю я. До даты съёмки может быть месяц&nbsp;— образ готовится.
            </p>
            <p
              /* Цена везде одного цвета. Асимметрию, которой выделена творческая
                 съёмка (COPY § 13 п. 4), несут размер и место, а не подкраска
                 цифры: две цены жёлтым и третья белым читались как небрежность. */
              className="reveal t-num mt-[clamp(1.25rem,3vw,2rem)] text-[color:var(--color-star)]"
              style={{ ['--i' as string]: 3, fontSize: 'var(--step-1)' }}
            >
              7 000 ₽ за час в Москве · 5 000 ₽ в Туле
            </p>
          </div>
        </div>

        <div className="mt-[clamp(3.5rem,9vh,6.5rem)] flex flex-col items-start gap-6 sm:flex-row sm:items-baseline sm:justify-between">
          <p className="reveal t-body max-w-[38ch] text-[color:var(--color-paper-mute)]">
            Плёнка в час не входит: +3 000 ₽ за 36 кадров, +5 000 ₽ за 72.
          </p>
          <a className="link-major link-pale t-h3" href="#cta">
            Весь прайс и условия
          </a>
        </div>
      </div>
    </section>
  );
}

function OfferRow({
  i,
  name,
  price,
  includes,
}: {
  i: number;
  name: string;
  price: string;
  includes: string;
}) {
  return (
    <div className="reveal" style={{ ['--i' as string]: i }}>
      <h3 className="t-h3">{name}</h3>
      <p className="t-num mt-3 text-[color:var(--color-star)]" style={{ fontSize: 'var(--step-1)' }}>
        {price}
      </p>
      <p className="t-body mt-4 max-w-[34ch] text-[color:var(--color-paper-dim)]">{includes}</p>
    </div>
  );
}

/* ───────────────────────── частые вопросы ─────────────────────────
   Взято намеренно: это самая плотная зона главной — четыре ответа
   по 41–52 слова. Направление, живущее на воздухе, проверяется здесь.
   Решение: вопрос — крупная антиква слева, ответ — узкая мера справа,
   никаких раскрывашек. Ответ, который надо открыть, на сайте с ценой
   выше рынка читается как то, что прячут. */
const FAQ = [
  {
    q: 'Сколько стоит и от чего зависит цена',
    a: 'Час в Москве — 7 000 ₽, час в Туле — 5 000 ₽: цена идёт за рынком города. Больше ничего на неё не влияет, кроме числа часов. Плёнка — отдельно: +3 000 ₽ за 36 кадров, +5 000 ₽ за 72, и только если съёмка идёт от полутора часов. Скидок нет.',
  },
  {
    q: 'Я не умею позировать — это проблема?',
    a: 'Совсем не проблема, и вам не нужно ничему учиться заранее — это моя часть работы. Я говорю простые вещи: куда идти, куда смотреть, что делать с руками. Однажды я снимала девушку, которая не очень хорошо говорила по-русски, и кадры получились: понимать надо не слова, а куда идти. Приходите как есть.',
  },
  {
    q: 'Сколько кадров и когда они готовы',
    a: 'Тридцать снимков за час съёмки, через 5–7 дней после съёмки. Кадры отбираю я сама: это часть работы, а не экономия времени — отдаю свой отбор, а не всю папку. Всё лежит на диске, диск живёт 30 дней, потом ссылка закрывается, так что скачайте сразу. Если была плёнка, на диске две папки: цифра и плёнка.',
  },
  {
    q: 'Где снимаем и что если дождь',
    a: 'Место выбираем заранее — улица или студия, под ваши образы и под свет. Если погодные условия меняются, съёмку переносим. Но не всякая непогода мешает: однажды мы выехали до рассвета искать туман, тумана не было нигде, и съёмка всё равно состоялась.',
  },
];

function Faq() {
  return (
    <section className="grain relative px-[var(--gutter)] py-[clamp(4.5rem,13vh,10rem)]">
      <Stars count={6} seed={53} />
      <div className="relative z-10 mx-auto max-w-[1500px]">
        <h2 className="reveal t-h2">Частые вопросы</h2>

        <dl className="mt-[clamp(2.5rem,7vh,5rem)]">
          {FAQ.map((item, i) => (
            <div
              key={item.q}
              className="reveal grid grid-cols-1 gap-x-[var(--gutter)] gap-y-[clamp(0.9rem,2vw,1.4rem)] border-t border-[color:color-mix(in_srgb,var(--color-ink)_18%,transparent)] py-[clamp(1.8rem,4.5vh,3.2rem)] lg:grid-cols-12"
              style={{ ['--i' as string]: i % 2 }}
            >
              <dt className="t-h3 lg:col-span-5 lg:col-start-1">{item.q}</dt>
              <dd className="t-body m-0 max-w-[54ch] text-[color:var(--color-ink-soft)] lg:col-span-6 lg:col-start-7">
                {item.a}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

/* ───────────────────────── финальный призыв ─────────────────────────
   Закрывает страницу воздухом, а не подвалом: одиночный объект —
   сама фраза. Приём mat-studiodumbar, где на белой странице один предмет. */
function Cta() {
  return (
    <section
      id="cta"
      className="grain relative px-[var(--gutter)] pt-[clamp(3rem,9vh,7rem)] pb-[clamp(5rem,16vh,12rem)]"
    >
      <Stars count={11} seed={71} />
      <div className="relative z-10 mx-auto max-w-[1500px]">
        {/* Мера задана в rem, а не в ch: ch считается от кегля САМОГО элемента,
            и на обёртке с текстовым кеглем 17 px «32ch» дало бы 272 px —
            заголовок в 68 px рассыпался бы в лестницу из пяти слов. */}
        <div className="mx-auto max-w-[42rem] text-center">
          <h2 className="reveal t-h1 mx-auto max-w-[18ch]">Пишите, даже если ещё не решили</h2>
          <p
            className="reveal t-lead mx-auto mt-[clamp(1.5rem,3.5vw,2.5rem)] max-w-[36ch] text-[color:var(--color-ink-soft)]"
            style={{ ['--i' as string]: 1 }}
          >
            Первое сообщение ни к чему не обязывает. Спросите про цену, про дату или про то, как
            это вообще происходит&nbsp;— отвечу.
          </p>
          <p className="reveal mt-[clamp(2.2rem,6vh,4rem)]" style={{ ['--i' as string]: 2 }}>
            <a className="link-major t-h2 whitespace-nowrap" href="#cta">
              Написать в&nbsp;Telegram
            </a>
          </p>
          <p
            className="reveal t-meta mt-[clamp(1.6rem,4vh,2.6rem)] text-[color:var(--color-ink-mute)]"
            style={{ ['--i' as string]: 3 }}
          >
            Telegram, VK, телефон
          </p>
        </div>
      </div>
    </section>
  );
}
