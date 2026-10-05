/**
 * РАБОТЫ ПОРТФОЛИО — общие для всех четырёх вариантов.
 *
 * Тексты трёх сайтов — дословно её, из `../hybrid/src/design/copy.ts` (Ф67).
 * Текст приглашения — её (5 октября). Кадры трёх сайтов — те же файлы, что
 * сейчас на сайте; кадры приглашения — её скриншоты с телефона. Элегия —
 * последней, после приглашения (её правка).
 *
 * `wide` — кадры в ширине ноутбука, `phone` — в ширине телефона. Параллакс
 * и галереи берут из обоих наборов: на одном экране рядом ноутбучный и
 * телефонный кадр читаются как «сайт работает везде».
 */
const NB = ' ';
const B = import.meta.env.BASE_URL;
const w = (f: string) => `${B}works/${f}.webp`;

export type Work = {
  id: string;
  name: string;
  kind: string;
  text: string;
  draft?: boolean;
  href?: string;
  year: string;
  /** Акцент работы — цвет её собственного сайта, им подсвечивается строка. */
  tint: string;
  wide: string[];
  phone: string[];
};

export const WORKS: Work[] = [
  {
    id: 'arisheniaa',
    name: 'arisheniaa',
    kind: 'сайт фотографа',
    text: `Сделала сайт в первую очередь для себя${NB}— как для фотографа.`,
    href: '/ph',
    year: '2026',
    tint: '#c05a2a',
    wide: ['arisheniaa-desktop', 'arisheniaa-uslugi', 'arisheniaa-plyonochnaya', 'arisheniaa-vopros', 'arisheniaa-raskadrovka'].map(w),
    phone: ['arisheniaa-m1', 'arisheniaa-m2', 'arisheniaa-m3', 'arisheniaa-m4', 'arisheniaa-m5'].map(w),
  },
  {
    id: 'toto',
    name: 'Toto Shiro',
    kind: 'сайт фотографа',
    text: `Сайт фотографа с запросом${NB}— люблю роскошь. Работала по приложенным референсам и соцсетям фотографа.`,
    href: 'https://totoshiroph.ru/',
    year: '2026',
    tint: '#7a1f2b',
    wide: ['toto-desktop', 'toto-snimayu', 'toto-svadebnaya', 'toto-kurs', 'toto-ucheniki'].map(w),
    phone: ['toto-m1', 'toto-m2', 'toto-m3', 'toto-m4', 'toto-m5'].map(w),
  },
  {
    id: 'invite',
    /* С маленькой буквы и «на ваш праздник» — её правка; текст — её. */
    name: 'приглашение на ваш праздник',
    kind: 'интерактивное приглашение',
    text: `Интерактивное приглашение${NB}— открываете ссылку, а там описание мероприятия, дресс-код, заметки о подарках в стилистике будущего праздника.`,
    /* «Дежурная» копия без имён и мест, собирается scripts/invite-demo.mjs. */
    href: `${B}invite/index.html`,
    year: '2026',
    tint: '#e01e63',
    /* Только телефонные кадры — приглашение живёт в телефоне. Кадры — её
       скриншоты с айфона (папка «фотографии»), без конверта. */
    wide: [],
    phone: ['invite-m-0', 'invite-m-1', 'invite-m-2', 'invite-m-3', 'invite-m-4', 'invite-m-5'].map(w),
  },
  {
    id: 'elegia',
    name: 'Элегия',
    kind: 'ритуальный сайт',
    text: 'Ритуальный сайт по созданию памятников. Создаю не только творческие, но и сайты противоположных сфер.',
    href: 'https://elegia-tula.ru/',
    year: '2026',
    tint: '#2f4a3a',
    wide: ['elegia-desktop', 'elegia-kak-rabotaem', 'elegia-maket', 'elegia-gravyura', 'elegia-ceny-kamen'].map(w),
    phone: ['elegia-m1', 'elegia-m2', 'elegia-m3', 'elegia-m4', 'elegia-m5'].map(w),
  },
];

/**
 * УСЛУГИ (её правка 5 октября: «блок цен уберём, соединим с блоком работ»).
 * Один экран, три колонки — у каждой свои скрины. Описания — ЧЕРНОВИК
 * билдера, она пришлёт свои. Многостраничник пока без скринов: она
 * переделает сайты ресторанов, чтобы не задеть чужие авторские права, —
 * до тех пор на их местах пустые рамки. Сертификат в айдентике — тоже
 * рамка-заглушка, пока его нет.
 */
export type Shot = { src: string; kind: 'wide' | 'phone'; cap?: { name: string; text: string; href?: string }; ph?: string };
/** `everywhere` — показывать все кадры на любом экране (приглашение есть
 *  только мобильное, сертификат — печатный). У остальных услуг на
 *  компьютере — только кадры с ноутбука, на телефоне — только мобильные
 *  (её правка 5 октября). */
export type Service = { id: string; name: string; text: string; draft: boolean; everywhere?: boolean; shots: Shot[] };

const byId = (id: string) => WORKS.find((x) => x.id === id)!;
const capOf = (x: Work) => ({ name: x.name, text: x.text, href: x.href });
const wideOf = (id: string, k: number): Shot => ({ src: byId(id).wide[k], kind: 'wide', cap: capOf(byId(id)) });
const phoneOf = (id: string, k: number): Shot => ({ src: byId(id).phone[k], kind: 'phone', cap: capOf(byId(id)) });
const blank = (kind: 'wide' | 'phone', ph: string, n: number): Shot => ({ src: `ph-${ph}-${kind}-${n}`, kind, ph });
/* Сертификат на фотосессию «Юлия и Данила» — её печатная работа
   (`Claude Projects/сертификаты`, вариант 7), снят scripts/capture-cert.mjs. */
const CERT = {
  name: 'сертификат на фотосессию',
  text: `Подарочный сертификат${NB}— лицо и${NB}оборот, макет для печати и${NB}конверт к${NB}нему.`,
};

export const SERVICES: Service[] = [
  {
    id: 'landing',
    name: 'Личный сайт / лендинг',
    text: `Страница о${NB}вас и${NB}вашем деле в${NB}фирменном стиле. Прототип через неделю, готовый сайт${NB}— через две, от${NB}75${NB}тыс.${NB}руб.`,
    draft: false,
    /* Больше кадров с ноутбука (её правка): все пять страниц каждого сайта,
       вперемешку, чтобы рядом стояли разные сайты. */
    shots: [
      ...[0, 1, 2, 3, 4].flatMap((k) => [wideOf('arisheniaa', k), wideOf('toto', k), wideOf('elegia', k)]),
      phoneOf('arisheniaa', 0), phoneOf('toto', 0), phoneOf('elegia', 0),
      phoneOf('arisheniaa', 1), phoneOf('toto', 1), phoneOf('elegia', 1),
    ],
  },
  {
    id: 'multi',
    name: 'Многостраничник для компании',
    text: `Сайт с${NB}разделами: услуги или меню, команда, контакты, оплата. Прототип через неделю, готовый сайт${NB}— до${NB}трёх недель, от${NB}120${NB}тыс.${NB}руб.`,
    draft: false,
    shots: [
      ...[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => blank('wide', 'скоро', n)),
      ...[0, 1, 2, 3, 4, 5].map((n) => blank('phone', 'скоро', n)),
    ],
  },
  {
    id: 'brand',
    name: 'Разработка брендовой айдентики',
    text: `Фирменный стиль: цвета, шрифты, графика${NB}— и${NB}вещи, которые его несут: приглашения, сертификаты, открытки и${NB}дизайн-системы. Готовый результат через неделю, от${NB}25${NB}тыс.${NB}руб.`,
    draft: false,
    everywhere: true,
    shots: [
      { src: w('cert-front'), kind: 'wide', cap: CERT },
      ...[0, 1, 2, 3, 4, 5].map((k) => phoneOf('invite', k)),
      { src: w('cert-back'), kind: 'wide', cap: CERT },
    ],
  },
];

/** Слоты под будущие концепт-сайты (вопрос 8: делаются позже). */
export const SLOTS = [
  { id: 'concept-1', name: 'Концепт 01', kind: 'скоро' },
  { id: 'concept-2', name: 'Концепт 02', kind: 'скоро' },
];

/** Восемь кадров для общего параллакса: по два с работы, ноутбук + телефон. */
export const MIXED: string[] = WORKS.flatMap((x) => [x.wide[0] ?? x.phone[0], x.phone[1]]);

/* Вырезка «ножницами» с чёрной рамкой (её правки; scripts/cutout.py). */
export const ABOUT_PHOTO = w('about-cutout');
