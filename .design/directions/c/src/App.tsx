import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import NameMorph from './NameMorph';
import Stars from './Stars';
import Mark from './Mark';
import { copy } from './copy';

gsap.registerPlugin(ScrollTrigger);

/* Кадр как объект (правило Р4). Не фон, не обои: у объекта есть край. */
function Frame({
  slug, alt, className = '', sizes = '(max-width:768px) 90vw, 40vw',
}: { slug: string; alt: string; className?: string; sizes?: string }) {
  return (
    <figure className={`frame grain grain-dark m-0 ${className}`}>
      <img
        src={`/img/${slug}-1120.jpg`}
        srcSet={`/img/${slug}-560.jpg 560w, /img/${slug}-1120.jpg 1120w`}
        sizes={sizes}
        alt={alt}
        loading="lazy"
        decoding="async"
      />
    </figure>
  );
}

export default function App() {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* П7: reduced-motion выключает движение целиком.
       Контент при этом не теряется — все элементы уже в конечном состоянии. */
    if (reduce) return;

    /* Lenis 3 КБ. Взят не ради «плавности», а потому что сцена ниже
       скраббится по прогрессу: нативный скролл на трекпаде даёт рывок
       на pin-переходе. Средство выбрано по лестнице: sticky и IO сцену
       со стеком панелей не решают, GSAP уже нужен для scrub. */
    const lenis = new Lenis({ duration: 0.9, smoothWheel: true, syncTouch: false });
    lenis.on('scroll', ScrollTrigger.update);
    /* Только в dev: Lenis держит собственную цель прокрутки, поэтому
       window.scrollTo из скриншотера отматывается назад. Ручка нужна,
       чтобы кадры сцены снимались по её реальному прогрессу. */
    if (import.meta.env.DEV) (window as unknown as { __lenis?: Lenis }).__lenis = lenis;

    const raf = (t: number) => lenis.raf(t * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();

      /* ---- Вход первого экрана -------------------------------------
         П7: движение НЕ участвует в первом кадре. Всё, что здесь
         анимируется, лежит ниже сгиба или запускается по скроллу.  */
      gsap.from('[data-hero-print]', {
        scrollTrigger: { trigger: '[data-hero-print]', start: 'top 92%' },
        opacity: 0, y: 26, duration: 0.62, ease: 'power2.out',
      });

      /* ---- Сцена регистров: пиннинг + стек панелей ------------------
         Здесь тихое и странное физически сталкиваются в одном кадре —
         то, чего композиция без времени сделать не может.            */
      mm.add(
        { desk: '(min-width: 768px)', mob: '(max-width: 767px)' },
        (c) => {
          const isDesk = !!c.conditions?.desk;

          const tl = gsap.timeline({
            scrollTrigger: {
              trigger: '[data-scene]',
              start: 'top top',
              end: isDesk ? '+=1800' : '+=1100',
              pin: true,
              scrub: 0.6,
              anticipatePin: 1,
              invalidateOnRefresh: true,
            },
          });

          /* фаза 1 — «тихое» приходит и укрупняется */
          tl.fromTo('[data-panel="a"]',
            { opacity: 0, y: isDesk ? 70 : 34, scale: isDesk ? 0.94 : 1 },
            { opacity: 1, y: 0, scale: 1, duration: 1, ease: 'none' }, 0);

          /* фаза 2 — «тихое» уходит НАСУХО (иначе его текст просвечивает
             под текстом «странного» и оба перестают читаться),
             «странное» наезжает снизу и доворачивается */
          tl.to('[data-panel="a"]',
            { opacity: 0, y: isDesk ? -60 : -30, duration: 0.85, ease: 'none' }, 1.15);
          tl.to('[data-panel="b"]',
            { opacity: 1, y: 0, rotate: 0, duration: 1, ease: 'none' }, 1.3);

          /* заголовок сцены держится всю сцену и добирает вес к финалу */
          tl.fromTo('[data-scene-title] [data-w="2"]',
            { opacity: 0.22 }, { opacity: 1, duration: 1, ease: 'none' }, 1.15);

          /* стартовое положение «странного» задаётся здесь, а не через
             fromTo: до своего старта fromTo держал бы панель видимой */
          gsap.set('[data-panel="b"]', { y: isDesk ? 90 : 42, rotate: isDesk ? 2.4 : 0 });
        }
      );

      /* ---- Шапка меняет цвет над бумажной секцией ------------------- */
      ScrollTrigger.create({
        trigger: '#offer',
        start: 'top 56px',
        end: 'bottom 56px',
        onToggle: (self) =>
          document.querySelector('.hdr')?.classList.toggle('is-light', self.isActive),
      });

      /* ---- Плотная секция: карточки набегают снизу, третья ломает ряд */
      gsap.utils.toArray<HTMLElement>('[data-plate]').forEach((el, i) => {
        gsap.from(el, {
          scrollTrigger: { trigger: el, start: 'top 88%' },
          opacity: 0, y: 34, duration: 0.55, delay: i * 0.07, ease: 'power2.out',
        });
      });

      /* ---- Скраб непрозрачности лида: слова набирают вес по прокрутке */
      gsap.fromTo('[data-scrub-lead] span',
        { opacity: 0.22 },
        {
          opacity: 1, stagger: 0.05, ease: 'none',
          scrollTrigger: { trigger: '[data-scrub-lead]', start: 'top 82%', end: 'bottom 58%', scrub: true },
        });
    }, root);

    return () => {
      ctx.revert();
      gsap.ticker.remove(raf);
      lenis.destroy();
    };
  }, []);

  return (
    <main ref={root} className="w-full max-w-full overflow-x-hidden">
      {/* ================= ШАПКА ================= */}
      <header className="hdr fixed top-0 left-0 right-0 z-50">
        <div className="flex items-center justify-between px-[var(--gut)] py-5">
          <a href="#" className="flex items-center gap-2.5 text-current no-underline">
            <Mark size={18} className="hdr-mark" />
            {/* Морфинг живёт в логотипе первого экрана. Отложен на 1400 мс:
                первый кадр остаётся статичным — правило П7. */}
            <NameMorph trigger="delay" delay={1400} className="text-[1.0625rem] font-medium tracking-tight" />
          </a>
          <nav className="hidden md:flex items-center gap-7">
            {copy.nav.map((n) => (
              <a key={n} href="#" className="micro text-current opacity-70 no-underline transition-opacity hover:opacity-100">
                {n}
              </a>
            ))}
          </nav>
        </div>
      </header>

      {/* ================= ПЕРВЫЙ ЭКРАН =================
          Композиция: лестница (cur-makemepulse) — две ступени заголовка,
          подписанные регистрами. Оба регистра существуют с первого экрана —
          композиционный контракт гейта 1.
          Земля — тёплый почти-чёрный с зерном (pho-1854), кадры лежат
          НА зерне объектами (Р4), а не под текстом фоном. */}
      <section className="relative grain flex min-h-[100svh] flex-col justify-center gap-[clamp(2.5rem,7vh,5.5rem)] overflow-hidden pt-24 pb-10 md:pt-28 md:pb-12">
        {/* свечение, а не контраст: свет в кадрах владелицы низкий и контровой */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-0"
          style={{
            background:
              'radial-gradient(78% 52% at 76% 18%, rgba(227,185,97,.16) 0%, transparent 62%),' +
              'radial-gradient(64% 58% at 6% 88%, rgba(110,127,75,.16) 0%, transparent 66%)',
          }}
        />
        <Stars count={26} className="z-[2]" />

        <div className="relative z-[4] px-[var(--gut)]">
          {/* --- лестница заголовка: две ступени, каждая подписана регистром --- */}
          <h1 className="d1 text-paper">
            <span className="block">
              {copy.hero.h1a}
              <span className="ml-4 hidden align-middle md:inline-block">
                <span className="micro border-b border-paper/40 pb-0.5 text-paper/55">
                  {copy.registers.a.label}
                </span>
              </span>
            </span>
            {/* Ступень вторая. nowrap только от 768: на 390 «затеи»
                вылезало за правый край, а горизонтальной прокрутки нет. */}
            <span className="mt-1 block md:whitespace-nowrap md:pl-[13vw]">
              <span className="mr-4 hidden align-middle md:inline-block">
                <span className="micro border-b border-star/50 pb-0.5 text-star/80">
                  {copy.registers.b.label}
                </span>
              </span>
              {copy.hero.h1b}
            </span>
          </h1>
        </div>

        <div className="relative z-[4] px-[var(--gut)]">
          {/* --- низ первого экрана: слово слева, кадры-объекты справа --- */}
          <div className="grid grid-cols-12 items-end gap-x-4 gap-y-8">
            <div className="col-span-12 md:col-span-5">
              <p className="lead max-w-[34ch] text-paper/85">{copy.hero.lead}</p>
              <p className="micro mt-6 text-sand">{copy.hero.geo}</p>
              <div className="mt-7 flex flex-wrap gap-3">
                <a href="#" className="btn btn-solid">{copy.hero.ctaPrimary}</a>
                <a href="#offer" className="btn btn-ghost">{copy.hero.ctaSecondary}</a>
              </div>
            </div>

            {/* контактный отпечаток: тихий регистр — маленький, холодный, ч/б */}
            <div className="col-span-4 md:col-span-2 md:col-start-7" data-hero-print>
              <Frame
                slug="quiet-window"
                alt="Чёрно-белый кадр: фигура в оконном проёме, свет из окна за спиной"
                className="aspect-[3/4] w-full grayscale contrast-[1.08]"
                sizes="(max-width:768px) 30vw, 15vw"
              />
              <p className="micro mt-2 text-paper/40">01</p>
            </div>

            {/* тёплый кадр: странный регистр — крупный и золотой */}
            <div className="col-span-8 md:col-span-4">
              <Frame
                slug="gold-road"
                alt="Фигура в длинном тёмном пальто переходит дорогу под золотыми осенними деревьями"
                className="aspect-[4/5] w-full"
                sizes="(max-width:768px) 62vw, 32vw"
              />
              <p className="micro mt-2 text-paper/40">02</p>
            </div>
          </div>
        </div>
      </section>

      {/* ================= СЦЕНА РЕГИСТРОВ (пиннинг) =================
          Скролл ведёт сцену: тихое приходит, темнеет и уходит,
          странное наезжает поверх. Одна сцена, два регистра, один автор. */}
      <section
        data-scene
        className="relative grain flex min-h-[100svh] flex-col justify-center overflow-hidden px-[var(--gut)] py-16"
      >
        <div className="grid grid-cols-12 items-center gap-y-10">
          {/* левая колонка держится всю сцену */}
          <div className="col-span-12 md:col-span-4">
            <h2 data-scene-title className="d2 text-paper">
              <span data-w="1">Тихое</span>{' '}
              <span className="text-paper/45">и</span>{' '}
              <span data-w="2" className="text-star">странное</span>
            </h2>
            <p className="micro mt-5 text-paper/40">Один автор, два регистра</p>
          </div>

          {/* правая колонка: панели стоят друг на друге */}
          <div className="panel-stack relative col-span-12 md:col-span-7 md:col-start-6 min-h-[54svh] md:min-h-[62svh]">
            <div data-panel="a" className="panel rm-reveal">
              <div className="flex items-start gap-5 md:gap-8">
                <Frame
                  slug="still-water"
                  alt="Сумеречное озеро, фигура стоит у самой воды и кажется маленькой"
                  className="w-[52%] shrink-0 saturate-[.85]"
                  sizes="(max-width:768px) 46vw, 30vw"
                />
                <div className="pt-1">
                  <p className="micro text-paper/50">{copy.registers.a.label}</p>
                  <p className="lead mt-3 max-w-[26ch] text-paper/90">{copy.registers.a.text}</p>
                </div>
              </div>
            </div>

            <div data-panel="b" className="panel panel-b rm-reveal">
              <div className="flex items-start gap-5 md:gap-8">
                <div className="order-2 pt-1">
                  <p className="micro text-star">{copy.registers.b.label}</p>
                  <p className="lead mt-3 max-w-[26ch] text-paper">{copy.registers.b.text}</p>
                </div>
                <Frame
                  slug="blur-turn"
                  alt="Смазанный кадр: человек резко повернулся, лица не разобрать"
                  className="order-1 w-[52%] shrink-0"
                  sizes="(max-width:768px) 46vw, 30vw"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= ПЛОТНАЯ СЕКЦИЯ =================
          Жёсткий врез в бумагу (cur-kurppahosk): тёмное кончается ребром.
          Печатный регистр (mat-oatly): рамки в один волос, моноширинный
          набор, плашки без изображений (mat-creativeindep). */}
      <section id="offer" className="grain grain-dark bg-paper text-ink">
        <div className="px-[var(--gut)] pt-[var(--sect)] pb-[var(--sect)]">
          <div className="grid grid-cols-12 gap-y-8">
            <h2 className="d2 col-span-12 max-w-[16ch] md:col-span-6">{copy.offer.title}</h2>
            <p
              data-scrub-lead
              className="lead col-span-12 max-w-[46ch] md:col-span-5 md:col-start-8 rm-reveal"
            >
              {copy.offer.lead.split(' ').map((w, i) => (
                <span key={i}>{w} </span>
              ))}
            </p>
          </div>

          {/* --- два жанра по запросу: ровные, тихие, без единого кадра ---
              Вторая плашка уходит под врез третьей: ей дан запас 6,5 rem
              снизу против вреза 4 rem, иначе её текст режется. */}
          <div className="mt-16 grid grid-cols-12 gap-3 md:mt-24">
            {[copy.offer.portrait, copy.offer.duo].map((card, i) => (
              <article
                key={card.name}
                data-plate
                className={`col-span-12 flex min-h-[13rem] flex-col justify-between p-6 md:col-span-4 md:p-8 rm-reveal ${
                  i === 1 ? 'md:pb-[6.5rem]' : ''
                }`}
                style={{
                  background: i === 0 ? 'var(--color-green-deep)' : 'var(--color-ink)',
                  color: 'var(--color-paper)',
                }}
              >
                <div>
                  <p className="micro text-paper/45">по запросу</p>
                  <h3 className="d3 mt-2">{card.name}</h3>
                </div>
                <div>
                  <p className="num mt-8 text-[0.8125rem] text-sand">{copy.offer.price}</p>
                  <p className="mt-3 max-w-[30ch] text-[0.875rem] leading-[1.5] text-paper/70">
                    {card.includes}
                  </p>
                </div>
              </article>
            ))}

            {/* --- третий: запроса нет. Ломает ряд, а не увеличивает кегль --- */}
            <article
              data-plate
              className="col-span-12 md:col-span-8 md:col-start-5 md:-mt-16 rm-reveal"
              style={{ background: 'var(--color-terra)', color: 'var(--color-paper)' }}
            >
              <div className="grid grid-cols-12">
                <div className="col-span-12 p-6 md:col-span-7 md:p-9">
                  <p className="micro text-paper/60">запроса нет</p>
                  <h3 className="d3 mt-2 text-[clamp(1.75rem,3.4vw,2.75rem)]">{copy.offer.idea.name}</h3>
                  <p className="num mt-6 text-[0.8125rem] text-paper/85">{copy.offer.price}</p>
                  {/* срок — коммерческий объект, ему дано место, а не сноска */}
                  <p className="lead mt-4 max-w-[28ch]">{copy.offer.idea.includes}</p>
                </div>
                <div className="col-span-12 md:col-span-5">
                  <Frame
                    slug="warm-portrait"
                    alt="Портрет на закате: тёплый низкий свет, тёмное пальто, размытый парк за спиной"
                    className="h-full min-h-[13rem]"
                    sizes="(max-width:768px) 100vw, 30vw"
                  />
                </div>
              </div>
            </article>
          </div>

          <div className="mt-10 flex flex-wrap items-baseline justify-between gap-5 border-t border-ink/15 pt-5">
            <p className="num text-[0.8125rem] text-ink/65">{copy.offer.note}</p>
            <a href="#" className="micro text-ink no-underline underline-offset-4 hover:underline">
              {copy.offer.cta} →
            </a>
          </div>
        </div>
      </section>

      {/* ================= ДЕЙСТВИЕ ================= */}
      <section className="relative grain overflow-hidden px-[var(--gut)] py-[var(--sect)]">
        <Stars count={14} className="z-[2]" />
        <div className="relative z-[4] grid grid-cols-12 gap-y-8">
          <h2 className="d2 col-span-12 max-w-[15ch] md:col-span-6">{copy.cta.title}</h2>
          <div className="col-span-12 md:col-span-5 md:col-start-8">
            <p className="lead max-w-[38ch] text-paper/80">{copy.cta.text}</p>
            <a href="#" className="btn btn-solid mt-7">{copy.cta.button}</a>
            <p className="micro mt-5 text-paper/45">{copy.cta.channels}</p>
          </div>
        </div>
        <footer className="mt-[var(--sect)] flex flex-wrap items-center justify-between gap-4 border-t border-paper/12 pt-6">
          <span className="flex items-center gap-2 text-paper/70">
            <Mark size={14} className="text-star" />
            <NameMorph trigger="scroll" className="text-[0.9375rem]" />
          </span>
          <span className="micro text-paper/35">Москва · Тула</span>
        </footer>
      </section>
    </main>
  );
}
