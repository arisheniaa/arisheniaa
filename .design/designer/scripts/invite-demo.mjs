// «Дежурное» приглашение для портфолио (её правка): без имён гостей и без
// ресторана, ответы теста никуда не уходят. Собирается из
// `Приглашения/sayt/index.html` в `public/invite/` — оригинал и живая версия
// у гостей не трогаются.
//
//   public/invite/m.html     — само приглашение (телефонная вёрстка);
//   public/invite/index.html — вход: на телефоне сразу ведёт в m.html, на
//                              компьютере показывает его в рамке телефона
//                              с пометкой «*это приглашение создано только
//                              для мобильной версии». Внутри рамки ширина
//                              окна — телефонная, поэтому срабатывает вся
//                              мобильная вёрстка, в том числе конверт-фото.
//                              На сервере для m.html разрешён показ в рамке
//                              своего же сайта (server/Caddyfile, @invite).
//
// Запуск: node scripts/invite-demo.mjs
import fs from 'node:fs';
import path from 'node:path';

const SRC = 'C:/Users/Аришения/OneDrive/Рабочий стол/Claude Projects/Приглашения/sayt';
const OUT = 'public/invite';
fs.mkdirSync(`${OUT}/assets`, { recursive: true });

let h = fs.readFileSync(`${SRC}/index.html`, 'utf8');
const must = (from, to) => {
  if (!h.includes(from)) throw new Error(`не нашла: ${from.slice(0, 60)}`);
  h = h.split(from).join(to);
};

/* Пути: в оригинале от корня сервера, здесь — рядом со страницей. */
h = h.replace(/\/assets\//g, 'assets/');
/* Без мест: в кружке просто «ресторан», в заголовке теста — без названия,
   строки с адресом нет. */
must(
  '<p class="kruzhok-mesto"><a class="ssylka" href="https://yandex.ru/maps/org/sempre/6531532095/" target="_blank" rel="noopener">Sempre</a></p>',
  '<p class="kruzhok-mesto">ресторан</p>',
);
must(
  'Начнём мы в&nbsp;ресторане <a class="ssylka" href="https://yandex.ru/maps/org/sempre/6531532095/" target="_blank" rel="noopener">Sempre</a></h2>',
  'Начнём мы в&nbsp;ресторане</h2>',
);
h = h.replace(/\s*<p class="adres">[\s\S]*?<\/p>/, '');
/* Адрес второй части вечера — в абзаце перед тестом (и в его варианте на
   «вы»): убран, остаётся «продолжим праздник». */
h = h.replace(/продолжим по адресу Новая, 14\./g, 'продолжим праздник.');
h = h.replace(/продолжим по&nbsp;адресу Новая,&nbsp;14\./g, 'продолжим праздник.');
if (/Новая|Sempre|Дмитровк|Чеховск/.test(h)) throw new Error('в копии остался адрес');
/* Без имён: имя гостя не читается ни из адреса, ни с сервера. */
must('var GUEST = imyaIzSsylki();', 'var GUEST = "";');
h = h.replace(/var SLUG = \(function\(\)\{[\s\S]*?\}\)\(\);/, 'var SLUG = "";');
/* Ответы теста — только на странице: вместо отправки сразу «спасибо». */
h = h.replace(/function otpravit\(pary\)\{[\s\S]*?\n  \}\n/, `function otpravit(pary){
    qNote.textContent = "Спасибо за ответы! Всё записала)";
    qFall.classList.add("off");
  }
`);
if (/api\/otvet/.test(h)) throw new Error('в копии осталась отправка ответов');
/* Шрифт Golos Text — свой, а не с Google Fonts: CSP сервера пускает
   стили и шрифты только с нашего домена (server/Caddyfile). Файлы — из
   @fontsource/golos-text, кириллица и латиница, четыре начертания. */
const GOLOS = [400, 500, 600, 700];
const SUBSETS = [
  ['cyrillic', 'U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116'],
  ['latin', 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD'],
];
const golosCss = GOLOS.flatMap((wt) =>
  SUBSETS.map(([sub, range]) => `@font-face{font-family:"Golos Text";font-style:normal;font-display:swap;font-weight:${wt};src:url(assets/golos-text-${sub}-${wt}-normal.woff2) format("woff2");unicode-range:${range}}`),
).join('\n');
fs.mkdirSync(`${OUT}/assets`, { recursive: true });
for (const wt of GOLOS) for (const [sub] of SUBSETS) {
  const f = `golos-text-${sub}-${wt}-normal.woff2`;
  fs.copyFileSync(`node_modules/@fontsource/golos-text/files/${f}`, `${OUT}/assets/${f}`);
}
h = h.replace(/<link rel="preconnect" href="https:\/\/fonts\.googleapis\.com">\s*/, '')
  .replace(/<link rel="preconnect" href="https:\/\/fonts\.gstatic\.com" crossorigin>\s*/, '');
must('<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Golos+Text:wght@400;500;600;700&display=swap">', `<style>
${golosCss}
</style>`);
if (/fonts\.g(oogleapis|static)/.test(h)) throw new Error('в копии осталась ссылка на Google Fonts');

must('<title>Приглашение на 3 октября</title>', '<title>Приглашение на праздник · пример</title>\n<meta name="robots" content="noindex">');

fs.writeFileSync(`${OUT}/m.html`, h);

/* Картинки — только те, на которые ссылается страница. */
const used = [...new Set([...h.matchAll(/assets\/([\w.-]+)/g)].map((m) => m[1]))];
for (const f of used.filter((x) => !x.startsWith('golos-text-'))) fs.copyFileSync(path.join(SRC, 'assets', f), `${OUT}/assets/${f}`);

fs.writeFileSync(
  `${OUT}/index.html`,
  `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Приглашение на праздник · пример</title>
<script>
  /* Телефон и узкое окно — сразу в приглашение, без рамки. */
  if (window.innerWidth <= 719) location.replace('m.html');
</script>
<style>
  @font-face { font-family: 'Golos Text'; font-weight: 400; font-display: swap; src: url(assets/golos-text-cyrillic-400-normal.woff2) format('woff2'); unicode-range: U+0400-045F; }
  @font-face { font-family: 'Golos Text'; font-weight: 400; font-display: swap; src: url(assets/golos-text-latin-400-normal.woff2) format('woff2'); unicode-range: U+0000-00FF; }
  :root { color-scheme: dark; }
  html, body { height: 100%; }
  body {
    margin: 0; display: grid; place-items: center; gap: 18px;
    padding-block: 24px; box-sizing: border-box;
    background: radial-gradient(ellipse at 50% 40%, #2a1c14, #0b0908 70%);
    color: #f3efe6; font: 400 15px/1.4 'Golos Text', system-ui, sans-serif;
  }
  .phone {
    width: 390px; height: min(844px, calc(100vh - 110px));
    padding: 12px; border-radius: 54px; background: #0b0b0c;
    box-shadow: 0 0 0 1px rgb(255 255 255 / 0.08), 0 60px 120px -40px rgb(0 0 0 / 0.9), 0 0 140px -20px rgb(224 20 93 / 0.25);
  }
  .phone iframe { width: 100%; height: 100%; border: 0; border-radius: 42px; background: #fbf3e4; display: block; }
  .note { margin: 0; color: rgb(243 239 230 / 0.7); text-align: center; }
</style>
</head>
<body>
  <div class="phone"><iframe src="m.html" title="Приглашение на праздник"></iframe></div>
  <p class="note">*это приглашение создано только для мобильной версии</p>
</body>
</html>
`,
);
console.log('ok', used.length, 'картинок');
