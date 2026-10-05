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
    /* Кадры x1–x4 и m6–m11 доснят с totoshiroph.ru 5 октября (её правка
       «добавь ещё скринов с сайта Алёны», scripts/capture-toto.mjs). */
    /* toto-plastinka — блок обучения с пластинкой целиком (её правка «можно
       добавить скрин с блока обучения с пластинкой — очень красивый блок»),
       из `распиаривание/toto-shiro/скрины/noutbuk/09-plastinka.png`. На
       телефоне этот блок уже есть — toto-m4. */
    wide: ['toto-desktop', 'toto-snimayu', 'toto-svadebnaya', 'toto-kurs', 'toto-ucheniki', 'toto-x1', 'toto-x2', 'toto-x3', 'toto-x4', 'toto-plastinka'].map(w),
    phone: ['toto-m1', 'toto-m2', 'toto-m3', 'toto-m4', 'toto-m5', 'toto-m6', 'toto-m7', 'toto-m8', 'toto-m9', 'toto-m10', 'toto-m11'].map(w),
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
    /* Порядок — как идёт приглашение: её шесть скриншотов (0–5) и шесть
       досняты в том же формате с «дежурной» копии (6–11). */
    phone: [6, 7, 0, 1, 8, 2, 9, 3, 10, 4, 5, 11].map((k) => w(`invite-m-${k}`)),
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
/* РЕСТОРАНЫ — концепции редизайнов (её правка «пока временно также подтяни
   скрины с сайтов ресторанов, редизайны которых мы делали»; раньше здесь
   стояли пустые рамки «скоро»). Кадры — scripts/capture-restaurants.mjs из
   витрины `Редизайн сайтов/showcase`: у каждого ресторана три направления,
   взяты два — основное (первый экран и меню) и второе (первый экран).
   В подписи — что это концепция, а не сайт ресторана. */
const RESTAURANTS: { id: string; main: string; second: string; name: string; text: string }[] = [
  { id: 'chere-maman', main: 'c', second: 'a', name: 'Chère Maman', text: `французского бистро и${NB}пекарни на${NB}Трубной` },
  { id: 'zhivago', main: 'c', second: 'a', name: `Dr.${NB}Живаго`, text: `гранд-кафе с${NB}русской кухней напротив Кремля` },
  { id: 'myaso-ryba', main: 'b', second: 'c', name: 'Мясо&Рыба', text: `стейк-хауса и${NB}рыбного ресторана, сети из${NB}14${NB}адресов` },
  { id: 'probka', main: 'c', second: 'b', name: 'Probka', text: `итальянского ресторана на${NB}Цветном бульваре` },
  { id: 'uzbekistan', main: 'a', second: 'b', name: '«Узбекистан»', text: `ресторана на${NB}Неглинной, открытого в${NB}1951${NB}году` },
];
const restShots = (kind: 'wide' | 'phone') => {
  const m = kind === 'phone' ? '-m' : '';
  const shot = (r: (typeof RESTAURANTS)[number], file: string): Shot => ({
    src: w(`rest-${r.id}-${file}${m}`),
    kind,
    cap: { name: r.name, text: `Концепция нового сайта для${NB}${r.text}. Одно из${NB}трёх направлений, предложенных ресторану.` },
  });
  /* Сначала первые экраны основных направлений, потом вторых, потом меню:
     в свёрнутую колонку и в кольцо попадают первые по списку. */
  return [
    ...RESTAURANTS.map((r) => shot(r, r.main)),
    ...RESTAURANTS.map((r) => shot(r, r.second)),
    ...RESTAURANTS.map((r) => shot(r, `${r.main}-menu`)),
  ];
};
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
    /* Кадры вперемешку, чтобы рядом стояли разные сайты; у сайта Алёны
       (Toto Shiro) их больше всего — её правка «добавь ещё скринов с сайта
       Алёны». На компьютере берутся кадры с ноутбука, на телефоне —
       мобильные (Services.tsx), первые по списку — в свёрнутую колонку. */
    shots: [
      ...[[`arisheniaa`, 0], [`toto`, 0], [`elegia`, 0], [`toto`, 9], [`arisheniaa`, 1], [`toto`, 1], [`elegia`, 1], [`toto`, 5],
        [`arisheniaa`, 2], [`toto`, 6], [`elegia`, 2], [`toto`, 7], [`arisheniaa`, 3], [`toto`, 8], [`elegia`, 3], [`toto`, 2], [`toto`, 3]]
        .map(([id, k]) => wideOf(id as string, k as number)),
      ...[[`arisheniaa`, 0], [`toto`, 0], [`elegia`, 0], [`toto`, 5], [`arisheniaa`, 1], [`toto`, 6], [`elegia`, 1], [`toto`, 7],
        [`arisheniaa`, 2], [`toto`, 8], [`elegia`, 2], [`toto`, 9], [`toto`, 10], [`arisheniaa`, 3]]
        .map(([id, k]) => phoneOf(id as string, k as number)),
    ],
  },
  {
    id: 'multi',
    name: 'Многостраничник для компании',
    text: `Сайт с${NB}разделами: услуги или меню, команда, контакты, оплата. Прототип через неделю, готовый сайт${NB}— до${NB}трёх недель, от${NB}120${NB}тыс.${NB}руб.`,
    draft: false,
    shots: [...restShots('wide'), ...restShots('phone')],
  },
  {
    id: 'brand',
    name: 'Разработка брендовой айдентики',
    text: `Фирменный стиль: цвета, шрифты, графика${NB}— и${NB}вещи, которые его несут: приглашения, сертификаты, открытки и${NB}дизайн-системы. Готовый результат через неделю, от${NB}25${NB}тыс.${NB}руб.`,
    draft: false,
    everywhere: true,
    shots: [
      { src: w('cert-front'), kind: 'wide', cap: CERT },
      ...[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((k) => phoneOf('invite', k)),
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
