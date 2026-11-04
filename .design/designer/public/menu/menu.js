/* Направление B · «Спичечная этикетка (живой лист)»
   Физика по apple-design: пружины (damping ratio + response), 1:1 трекинг с учётом точки захвата,
   прерываемость (стартуем всегда с текущего значения), проекция импульса d=0.998, резиновый край,
   хаптика в кадр причины. Без библиотек. */
(function () {
  'use strict';

  /* ---------------- данные: её список (2026-11-02). Продукты в строке — мои догадки, она поправит; «любимое» пока не отмечено ---------------- */
  var SECTIONS = [
    { id: 'zavtrak', title: 'Завтрак', art: 'pan', dishes: [
      ['omlet', 'Омлет с овощами', 'яйца, томаты, перец', 0],
      ['buter', 'Бутерброды с творожным сыром', 'хлеб, творожный сыр, огурец', 1],
      ['kasha', 'Каша с ягодами', 'овсянка, молоко, ягоды', 0],
      ['tvorozhok', 'Творожок с вареньем', 'творог, варенье, сметана', 0],
      ['syrniki', 'Сырники с ягодами', 'творог, яйцо, ягоды', 0],
      ['bliny', 'Блинчики с вишней и кремчизом', 'молоко, вишня, кремчиз', 1],
      ['draniki', 'Драники со сметаной', 'картофель, лук, сметана', 0],
      ['pashot', 'Тост с яйцом пашот', 'хлеб, яйцо, зелень', 0],
      ['pankeyki', 'Воздушные панкейки', 'мука, молоко, яйца', 0]
    ]},
    { id: 'goryachee', title: 'Горячее', art: 'plate', dishes: [
      ['pyure', 'Пюре с котлеткой', 'картофель, фарш, молоко', 1],
      ['grechka', 'Гречка с курочкой', 'гречка, курица, лук', 0],
      ['ris-ryba', 'Рис с рыбкой', 'рис, рыба, лимон', 0],
      ['zharenyi-ris', 'Жареный рис с курицей', 'рис, курица, яйцо', 0],
      ['podruzhki', 'Макароны-подружки', 'макароны, яйцо, масло', 0],
      ['pasta', 'Паста в сливочном соусе', 'паста, сливки, пармезан', 0],
      ['pelmeni', 'Пельмени / гёдза', 'пельмени, сметана', 0],
      ['perec', 'Фаршированные перцы', 'перец, фарш, рис', 0],
      ['bliny-myaso', 'Блинчики с мясом', 'мука, молоко, фарш', 0],
      ['kurica-yabloki', 'Курица с яблоками в медово-горчичном соусе', 'курица, яблоки, мёд', 0],
      ['gnezda', 'Картофельные гнёзда с мясной начинкой', 'картофель, яйца, сыр', 0]
    ]},
    { id: 'supy', title: 'Супы', art: 'pot', dishes: [
      ['lapsha', 'Куриный суп с лапшой', 'курица, лапша, морковь', 1],
      ['frikadelki', 'Суп с фрикадельками', 'фарш, картофель, морковь', 0],
      ['kudryavyi', 'Кудрявый суп', 'яйцо, бульон, зелень', 0],
      ['borsch', 'Борщ', 'свёкла, капуста, говядина', 0],
      ['schi', 'Щи', 'капуста, картофель, морковь', 0],
      ['__h', 'Закуски', '', 0],
      ['onigiri', 'Открытые онигири', 'рис, нори, лосось', 0],
      ['ovoshi', 'Тушёные овощи', 'кабачок, морковь, перец', 0],
      ['yap-snek', 'Японский белковый снек', 'куриный фарш, нори', 0],
      ['brokkoli', 'Хрустящий снек из брокколи', 'брокколи, сыр', 0],
      ['tost-shproty', 'Тост со шпротами', 'хлеб, шпроты, огурец', 0],
      ['kukuruza', 'Запечённая кукуруза', 'кукуруза, специи', 0],
      ['yogurt', 'Йогурт', 'йогурт, ягоды, гранола', 0]
    ]},
    { id: 'salaty', title: 'Салаты', art: 'bowl', dishes: [
      ['svekla-feta', 'Свёкла, фета и кедровые орешки', 'свёкла, фета, кедровые орехи', 0],
      ['grecheskiy', 'Греческий', 'томаты, огурец, фета', 0],
      ['strachatella', 'Страчателла с клубникой', 'страчателла, клубника, руккола', 1],
      ['tunec', 'С тунцом', 'тунец, яйцо, салат', 0],
      ['vinegret', 'Винегрет', 'свёкла, картофель, огурец', 0],
      ['svekla-chesnok', 'Свекольный с чесноком', 'свёкла, чеснок, майонез', 0],
      ['morkovka', 'Морковка с сухариками', 'морковь, сухарики, чеснок', 0]
    ]},
    { id: 'deserty', title: 'Десерты', art: 'pie', dishes: [
      ['kartoshka', 'Пирожное картошка', 'печенье, какао, сгущёнка', 1],
      ['sharlotka', 'Шарлотка с зелёными яблоками', 'зелёные яблоки, яйца, мука', 0],
      ['blinnyi-tort', 'Блинный торт', 'блины, сливки, сахар', 0],
      ['sloyka-bri', 'Слойка с запечённым бри и грушами', 'слоёное тесто, бри, груша', 0],
      ['kamamber', 'Запечённый камамбер с мёдом и орехами', 'камамбер, мёд, орехи', 0],
      ['vishnevyi', 'Вишнёвый пирог', 'вишня, мука, яйца', 0],
      ['fr-tost', 'Французский тост', 'батон, яйцо, молоко', 0]
    ]}
  ];

  /* ---------------- утилиты ---------------- */
  var RM = window.matchMedia('(prefers-reduced-motion: reduce)');
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function buzz(p) { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) {} }
  // счётчик нажатий без сторонних сервисов: пустой запрос на свой сайт, его видно в журнале сервера (tools/menu-stats.sh)
  function track(e, s) {
    if (navigator.webdriver) return; // автотесты не считаем
    try { fetch('hit?e=' + e + (s ? '&s=' + s : ''), { method: 'GET', keepalive: true, cache: 'no-store', credentials: 'omit' }).catch(function () {}); } catch (x) {}
  }
  // Apple: проекция импульса (Designing Fluid Interfaces), экспоненциальное затухание
  function project(v, d) { d = d || 0.998; return (v / 1000) * d / (1 - d); }
  // Apple: резиновый край
  function rubber(over, dim, c) { c = c || 0.55; return (over * dim * c) / (dim + c * Math.abs(over)); }

  /* Пружина в параметрах Apple: damping ratio + response (сек). k=(2π/response)², c=4πζ/response, m=1 */
  function Spring(x, onFrame) { this.x = x; this.v = 0; this.target = x; this.raf = 0; this.onFrame = onFrame; this.onRest = null; }
  Spring.prototype.to = function (target, opt) {
    opt = opt || {};
    this.target = target;
    if (opt.velocity != null) this.v = opt.velocity;
    this.k = Math.pow(2 * Math.PI / (opt.response || 0.4), 2);
    this.c = 4 * Math.PI * (opt.damping == null ? 1 : opt.damping) / (opt.response || 0.4);
    this.onRest = opt.onRest || null;
    if (RM.matches) { this.x = target; this.v = 0; this.onFrame(this.x); if (this.onRest) this.onRest(); return; }
    if (!this.raf) { var self = this, last = performance.now();
      var tick = function (now) {
        var dt = Math.min(0.032, (now - last) / 1000); last = now;
        var n = 4, h = dt / n;
        for (var i = 0; i < n; i++) { var a = -self.k * (self.x - self.target) - self.c * self.v; self.v += a * h; self.x += self.v * h; }
        if (Math.abs(self.x - self.target) < 0.0004 && Math.abs(self.v) < 0.004) {
          self.x = self.target; self.v = 0; self.raf = 0; self.onFrame(self.x); if (self.onRest) self.onRest(); return;
        }
        self.onFrame(self.x); self.raf = requestAnimationFrame(tick);
      };
      this.raf = requestAnimationFrame(tick);
    }
  };
  // прерывание: остановить там, где объект сейчас на экране (presentation value)
  Spring.prototype.grab = function () { if (this.raf) cancelAnimationFrame(this.raf); this.raf = 0; this.v = 0; return this.x; };
  Spring.prototype.set = function (x) { this.grab(); this.x = this.target = x; this.onFrame(x); };

  function Tracker() { this.h = []; }
  Tracker.prototype.push = function (x, t) { this.h.push([x, t]); if (this.h.length > 8) this.h.shift(); };
  Tracker.prototype.velocity = function () { // px/s по последним ~90 мс
    var h = this.h; if (h.length < 2) return 0; var last = h[h.length - 1], i = h.length - 2;
    while (i > 0 && last[1] - h[i][1] < 90) i--;
    var dt = last[1] - h[i][1]; return dt > 0 ? (last[0] - h[i][0]) / dt * 1000 : 0;
  };

  /* ---------------- хранение: приготовленное на этой неделе ---------------- */
  function weekKey() { var d = new Date(); var day = (d.getDay() + 6) % 7; d.setDate(d.getDate() - day); function z(n) { return (n < 10 ? '0' : '') + n; } return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate()); } // по местному времени, не UTC
  var KEY = 'menu-b-v1', store = { week: weekKey(), cooked: [] };
  try { var s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s && s.week === store.week) store = s; } catch (e) {}
  var HKEY = 'menu-b-home', home = { out: [] };
  try { var h = JSON.parse(localStorage.getItem(HKEY) || 'null'); if (h && h.out) home = h; } catch (e) {}
  function saveHome() { try { localStorage.setItem(HKEY, JSON.stringify(home)); } catch (e) {} }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) {} }

  /* ---------------- ЗАГЛУШКИ иллюстраций: форма линогравюры, её Midjourney придёт сюда ----------------
     Чернильно-синяя масса + вырезанные штрихи цвета бумаги/плашки + кремовые блики. */
  var INK = '#033E69', BLUE = '#0C7384', CREAM = '#FCF5E6', RED = '#F65910';
  var uid = 0;
  function gouges(r, box, n, color, ang, len, w) {
    var s = '';
    for (var i = 0; i < n; i++) {
      var x = box[0] + r() * box[2], y = box[1] + r() * box[3];
      var L = len[0] + r() * (len[1] - len[0]), a = ang + (r() - 0.5) * 0.5;
      var dx = Math.cos(a) * L, dy = Math.sin(a) * L, bend = (r() - 0.5) * L * 0.35;
      s += '<path d="M' + x.toFixed(1) + ' ' + y.toFixed(1) + ' q' + (dx / 2 - dy * bend / L).toFixed(1) + ' ' + (dy / 2 + dx * bend / L).toFixed(1) + ' ' + dx.toFixed(1) + ' ' + dy.toFixed(1) + '" stroke="' + color + '" stroke-width="' + (w[0] + r() * (w[1] - w[0])).toFixed(1) + '" stroke-linecap="round" fill="none"/>';
    }
    return s;
  }
  function blob(r, cx, cy, rx, ry, k) { // неровный «вырезанный» овал
    var pts = [], n = 9;
    for (var i = 0; i < n; i++) { var a = i / n * Math.PI * 2, j = 1 + (r() - 0.5) * k; pts.push([cx + Math.cos(a) * rx * j, cy + Math.sin(a) * ry * j]); }
    return closed(pts);
  }
  function closed(p) { // Catmull-Rom → кубические Безье
    var n = p.length, d = 'M' + p[0][0].toFixed(1) + ' ' + p[0][1].toFixed(1);
    for (var i = 0; i < n; i++) { var p0 = p[(i - 1 + n) % n], p1 = p[i], p2 = p[(i + 1) % n], p3 = p[(i + 2) % n];
      d += ' C' + (p1[0] + (p2[0] - p0[0]) / 6).toFixed(1) + ' ' + (p1[1] + (p2[1] - p0[1]) / 6).toFixed(1) + ' ' + (p2[0] - (p3[0] - p1[0]) / 6).toFixed(1) + ' ' + (p2[1] - (p3[1] - p1[1]) / 6).toFixed(1) + ' ' + p2[0].toFixed(1) + ' ' + p2[1].toFixed(1); }
    return d + 'Z';
  }
  function open(p) {
    var n = p.length, d = 'M' + p[0][0].toFixed(1) + ' ' + p[0][1].toFixed(1);
    for (var i = 0; i < n - 1; i++) { var p0 = p[Math.max(0, i - 1)], p1 = p[i], p2 = p[i + 1], p3 = p[Math.min(n - 1, i + 2)];
      d += ' C' + (p1[0] + (p2[0] - p0[0]) / 6).toFixed(1) + ' ' + (p1[1] + (p2[1] - p0[1]) / 6).toFixed(1) + ' ' + (p2[0] - (p3[0] - p1[0]) / 6).toFixed(1) + ' ' + (p2[1] - (p3[1] - p1[1]) / 6).toFixed(1) + ' ' + p2[0].toFixed(1) + ' ' + p2[1].toFixed(1); }
    return d;
  }
  function steam(r, x, y, h, w) { var p = [], n = 6; for (var i = 0; i <= n; i++) p.push([x + Math.sin(i * 1.4 + r() * 3) * w, y - i / n * h]); return '<path d="' + open(p) + '" stroke="' + CREAM + '" stroke-width="7" stroke-linecap="round" fill="none"/>'; }

  function art(kind, seed) {
    var r = rng(seed), id = "art" + (++uid), g = '';
    if (kind === 'pan') { // яичница на сковороде
      g += '<path d="M318 214 L436 170 L446 196 L334 246Z" fill="' + INK + '"/>';
      g += '<ellipse cx="190" cy="250" rx="168" ry="120" fill="' + INK + '"/>';
      g += '<clipPath id="' + id + '"><ellipse cx="190" cy="244" rx="142" ry="98"/></clipPath>';
      g += '<ellipse cx="190" cy="244" rx="142" ry="98" fill="' + BLUE + '"/>';
      g += '<g clip-path="url(#' + id + ')">' + gouges(r, [40, 150, 300, 200], 46, INK, -0.25, [16, 40], [2.5, 4]) + '</g>';
      g += gouges(r, [30, 150, 330, 30], 10, RED, 0.1, [12, 26], [3, 4.5]);
      g += '<path d="' + blob(r, 132, 236, 66, 46, .38) + '" fill="' + CREAM + '"/><path d="' + blob(r, 250, 262, 62, 44, .4) + '" fill="' + CREAM + '"/>';
      g += '<circle cx="138" cy="232" r="25" fill="' + RED + '" stroke="' + INK + '" stroke-width="4"/><circle cx="246" cy="258" r="23" fill="' + RED + '" stroke="' + INK + '" stroke-width="4"/>';
      g += '<path d="M126 222 q8 -8 18 -4" stroke="' + CREAM + '" stroke-width="5" stroke-linecap="round" fill="none"/><path d="M236 248 q8 -8 17 -3" stroke="' + CREAM + '" stroke-width="5" stroke-linecap="round" fill="none"/>';
    } else if (kind === 'pot') { // кастрюля супа
      g += steam(r, 150, 140, 110, 14) + steam(r, 205, 128, 120, 16) + steam(r, 260, 140, 100, 13);
      g += '<rect x="34" y="196" width="40" height="22" rx="10" fill="' + INK + '"/><rect x="326" y="196" width="40" height="22" rx="10" fill="' + INK + '"/>';
      g += '<clipPath id="' + id + '"><path d="M64 176 H336 V318 Q336 368 286 368 H114 Q64 368 64 318Z"/></clipPath>';
      g += '<path d="M64 176 H336 V318 Q336 368 286 368 H114 Q64 368 64 318Z" fill="' + INK + '"/>';
      g += '<g clip-path="url(#' + id + ')">' + gouges(r, [70, 200, 260, 160], 54, CREAM, 0.02, [18, 54], [2.2, 3.6]) + '<rect x="64" y="236" width="272" height="34" fill="' + BLUE + '"/></g>';
      g += '<ellipse cx="200" cy="176" rx="150" ry="24" fill="' + BLUE + '" stroke="' + INK + '" stroke-width="6"/>';
      g += '<path d="M90 172 Q200 152 312 172" stroke="' + CREAM + '" stroke-width="4" fill="none" stroke-linecap="round"/>';
    } else if (kind === 'plate') { // котлеты с пюре
      g += '<path d="M28 120 v120 M18 120 v50 M38 120 v50 M48 120 v50 M18 170 q15 14 30 0" stroke="' + INK + '" stroke-width="7" stroke-linecap="round" fill="none"/>';
      g += '<path d="M372 110 q22 40 6 120 l-4 120" stroke="' + INK + '" stroke-width="12" stroke-linecap="round" fill="none"/>';
      g += '<circle cx="200" cy="250" r="150" fill="' + CREAM + '"/><circle cx="200" cy="250" r="118" fill="none" stroke="' + BLUE + '" stroke-width="5"/>';
      g += '<path d="' + blob(r, 150, 250, 74, 58, .25) + '" fill="' + CREAM + '" stroke="' + INK + '" stroke-width="5"/>';
      g += gouges(r, [100, 215, 100, 70], 8, BLUE, 0.2, [16, 30], [2.4, 3]);
      g += '<clipPath id="' + id + '"><path d="' + blob(r, 248, 222, 56, 34, .2) + '"/><path d="' + blob(r, 262, 290, 58, 34, .2) + '"/></clipPath>';
      g += '<g clip-path="url(#' + id + ')"><rect width="400" height="400" fill="' + INK + '"/>' + gouges(r, [190, 185, 130, 140], 40, RED, -0.5, [10, 26], [2.4, 3.6]) + '</g>';
    } else if (kind === 'bowl') { // салатник
      for (var i = 0; i < 7; i++) { var x = 70 + i * 42 + r() * 10, h = 70 + r() * 70; g += '<path d="M' + x + ' 220 q' + (-30 + r() * 60) + ' ' + (-h * .6) + ' ' + (r() * 30 - 15) + ' ' + (-h) + ' q' + (20 + r() * 20) + ' ' + (h * .5) + ' ' + (r() * 10) + ' ' + h + 'Z" fill="' + (i % 2 ? BLUE : INK) + '"/>'; }
      g += '<circle cx="128" cy="196" r="30" fill="' + RED + '" stroke="' + INK + '" stroke-width="4"/><circle cx="270" cy="190" r="26" fill="' + RED + '" stroke="' + INK + '" stroke-width="4"/>';
      g += '<clipPath id="' + id + '"><path d="M30 214 H370 Q360 360 200 362 Q40 360 30 214Z"/></clipPath>';
      g += '<path d="M30 214 H370 Q360 360 200 362 Q40 360 30 214Z" fill="' + INK + '"/>';
      g += '<g clip-path="url(#' + id + ')">' + gouges(r, [40, 220, 320, 130], 48, CREAM, 0.35, [14, 40], [2.2, 3.4]) + '</g>';
      g += '<path d="M40 222 H360" stroke="' + CREAM + '" stroke-width="5" stroke-linecap="round"/>';
    } else if (kind === 'pie') { // кусок шарлотки
      g += '<path d="M40 300 L340 210 L360 290 L60 372Z" fill="' + INK + '"/>';
      g += '<path d="M40 300 L340 210 L330 180 L60 250Z" fill="' + CREAM + '"/>';
      g += '<clipPath id="' + id + '"><path d="M40 300 L340 210 L360 290 L60 372Z"/></clipPath>';
      g += '<g clip-path="url(#' + id + ')">' + gouges(r, [50, 220, 300, 140], 44, RED, -0.29, [14, 40], [2.4, 3.6]) + '</g>';
      g += '<path d="M60 250 Q120 226 200 228 Q280 200 330 180" stroke="' + INK + '" stroke-width="5" fill="none"/>';
      g += '<circle cx="250" cy="120" r="34" fill="' + INK + '"/><path d="M250 86 q10 -30 34 -36" stroke="' + INK + '" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M236 108 q8 -8 18 -6" stroke="' + CREAM + '" stroke-width="5" fill="none" stroke-linecap="round"/>';
    } else if (kind === 'teapot') { // обложка: чайник и чашка в солнечном круге
      g += steam(r, 196, 120, 90, 12) + steam(r, 300, 214, 70, 9);
      g += '<path d="M282 230 q62 -24 74 -96 l14 6 q-6 92 -80 120Z" fill="' + INK + '"/>';
      g += '<path d="M118 236 q-60 -10 -54 52 q6 50 64 44" stroke="' + INK + '" stroke-width="18" fill="none"/>';
      g += '<clipPath id="' + id + '"><path d="M110 340 Q96 200 200 194 Q304 200 290 340Z"/></clipPath>';
      g += '<path d="M110 340 Q96 200 200 194 Q304 200 290 340Z" fill="' + INK + '"/>';
      g += '<g clip-path="url(#' + id + ')">' + gouges(r, [100, 200, 200, 140], 40, CREAM, 1.2, [14, 34], [2.2, 3.4]) + '<rect x="100" y="262" width="200" height="26" fill="' + BLUE + '"/></g>';
      g += '<path d="M140 194 Q200 160 260 194Z" fill="' + BLUE + '" stroke="' + INK + '" stroke-width="5"/><circle cx="200" cy="164" r="11" fill="' + INK + '"/>';
      g += '<path d="M318 300 h70 q-4 52 -35 52 q-31 0 -35 -52Z" fill="' + CREAM + '" stroke="' + INK + '" stroke-width="5"/>';
    }
    return '<svg class="art" viewBox="0 0 400 380" preserveAspectRatio="xMidYMax slice" aria-hidden="true" data-stub="иллюстрация: заглушка"><g filter="url(#dry)">' + g + '</g></svg>';
  }


  /* ЗАГЛУШКА обложки: вертикальная картинка с фигурой (её иллюстрация в духе постеров «Аэрофлот. Отдых начинается в полёте»):
     плоские формы, сухое зерно внутри заливок, фигура на большой цветной плоскости */
  function figure() {
    var D = '#C74225', g = '';
    g += '<circle cx="268" cy="250" r="120" fill="' + RED + '" opacity=".35"/>';
    g += '<path d="M150 250 Q226 214 312 250 L330 400 Q360 560 380 700 H96 Q112 540 140 400Z" fill="' + RED + '"/>';
    g += '<path d="M182 300 L200 700 M250 330 L262 700 M300 330 Q330 520 350 700" stroke="' + D + '" stroke-width="10" fill="none" opacity=".8"/>';
    g += '<path d="M168 392 Q232 372 300 392 L318 640 Q236 666 150 640Z" fill="' + CREAM + '"/>';
    g += '<path d="M168 392 Q140 380 124 404 M300 392 Q330 380 346 404" stroke="' + CREAM + '" stroke-width="6" fill="none" stroke-linecap="round"/>';
    g += '<path d="M208 200 h36 v44 h-36Z" fill="' + CREAM + '"/>';
    g += '<ellipse cx="226" cy="168" rx="38" ry="48" fill="' + CREAM + '"/>';
    g += '<path d="M188 168 Q182 108 230 112 Q272 114 266 160 Q246 132 214 140 Q200 150 196 176Z" fill="' + INK + '"/><circle cx="252" cy="104" r="24" fill="' + INK + '"/>';
    g += '<circle cx="214" cy="180" r="9" fill="' + RED + '" opacity=".55"/>';
    g += '<path d="M206 160 q8 -4 14 0 M234 160 q8 -4 14 0" stroke="' + INK + '" stroke-width="3" fill="none" stroke-linecap="round"/>';
    g += '<path d="M300 256 Q356 300 352 372" stroke="' + RED + '" stroke-width="40" fill="none" stroke-linecap="round"/>';
    g += '<path d="M352 372 q4 18 -8 26" stroke="' + CREAM + '" stroke-width="18" fill="none" stroke-linecap="round"/>';
    g += '<path d="M296 400 Q292 344 334 340 Q378 344 374 400Z" fill="' + INK + '"/><path d="M296 380 Q262 370 256 344 l8 -4 Q274 362 298 366Z" fill="' + INK + '"/>';
    g += '<path d="M374 360 q22 0 20 22 q-2 18 -22 16" stroke="' + INK + '" stroke-width="8" fill="none"/><rect x="326" y="328" width="16" height="12" rx="4" fill="' + INK + '"/>';
    g += '<path d="M250 336 q-14 -26 4 -48 q16 -22 2 -50" stroke="' + CREAM + '" stroke-width="6" fill="none" stroke-linecap="round"/>';
    g += '<path d="M152 262 Q120 330 150 400 Q170 430 196 420" stroke="' + RED + '" stroke-width="36" fill="none" stroke-linecap="round"/><circle cx="198" cy="418" r="14" fill="' + CREAM + '"/>';
    return '<svg class="figure" viewBox="0 0 400 700" preserveAspectRatio="xMidYMax meet" aria-hidden="true" data-stub="обложка: заглушка"><g filter="url(#dry)">' + g + '</g></svg>';
  }

  /* рукописное «Меню» — ЗАГЛУШКА: временный путь одной линией, на проде её обведённая линия */
  var SCRIPT = 'M18 176 C30 120 34 58 46 40 C56 26 64 66 70 100 C76 134 80 152 86 150 C94 148 102 76 114 46 C122 30 128 64 130 104 C132 142 134 166 148 170 C166 174 184 154 188 134 C192 114 176 106 164 116 C148 128 152 170 178 174 C198 176 212 158 220 140 C226 126 230 112 232 106 C230 130 226 156 226 176 C228 156 234 142 248 140 L270 138 C272 124 274 112 276 106 C276 132 272 160 276 174 C280 180 292 172 298 158 C302 140 304 118 306 106 C306 132 302 156 300 176 C302 152 308 142 320 141 L334 141 C334 120 350 104 366 108 C386 114 388 160 368 172 C350 182 332 168 332 148 C332 130 346 122 362 126 C392 134 420 150 452 120 C472 100 494 84 520 92';

  /* ---------------- разметка ---------------- */
  function plural(n) { var m = n % 10, h = n % 100; return m === 1 && h !== 11 ? 'блюдо' : m >= 2 && m <= 4 && (h < 12 || h > 14) ? 'блюда' : 'блюд'; }
  function typed(s) { return s.split('').map(function (c) { return c === ' ' ? ' ' : '<i>' + c + '</i>'; }).join(''); }
  var STK = 'assets/stikery/';
  var VEG = ['podruzhki', 'macncheese', 'pasta', 'svekla-feta', 'grecheskiy', 'strachatella', 'vinegret', 'svekla-chesnok', 'morkovka', 'ovoshi', 'brokkoli', 'kukuruza', 'yogurt'];
  // значки держатся за последнее слово названия и не переносятся на отдельную строку
  function withIcons(name, icons) {
    if (!icons) return name;
    var i = name.lastIndexOf(' ');
    return name.slice(0, i + 1) + '<span class="nw">' + name.slice(i + 1) + icons + '</span>';
  }
  function dishRow(d) {
    if (d[0] === '__h') return '<li class="subhead" aria-hidden="false"><h2 class="band sub">' + d[1] + '</h2></li>';
    var done = store.cooked.indexOf(d[0]) > -1;
    var icons = (d[3] ? '<img class="ico fav-ico" src="' + STK + 'lyubimoe.webp" alt="любимое" title="любимое">' : '') +
      (VEG.indexOf(d[0]) > -1 ? '<img class="ico veg-ico" src="' + STK + 'bez-myasa.webp" alt="без мяса" title="без мяса">' : '');
    return '<li class="dish' + (done ? ' done' : '') + '" tabindex="0" role="button" aria-pressed="' + done + '" data-id="' + d[0] + '" data-prod="' + d[2] + '"><div class="txt"><span class="name">' + withIcons(d[1], icons) + '</span><span class="prod">' + typed(d[2]) + '</span></div></li>';
  }
  function panelHTML(s, n) {
    return '<div class="panel" data-sec="' + s.id + '">' +
      '<div class="plate" style="--gx:' + (16 + n * 13 % 60) + '%;--gy:' + (12 + n * 7 % 20) + '%"><div class="air"></div>' + '<img class="dishart" src="assets/razdely/' + s.id + '.webp" alt="" draggable="false">' +
      '<div class="fine"><span>№ ' + n + ' · ' + s.dishes.length + ' ' + plural(s.dishes.length) + '</span></div><span class="stubtag">заглушка · её иллюстрация</span></div>' +
      '<h2 class="band' + (s.two ? ' two' : '') + '">' + s.title + '</h2>' +
      '<ol class="dishes">' + s.dishes.map(dishRow).join('') + '</ol>' +
      '<div class="actions"><button class="pick" type="button">Выбери за меня</button><span class="hint"></span></div></div>';
  }
  function coverHTML(mobile) {
    return '<div class="panel cover" data-sec="cover"><div class="air"></div>' +
      '<div class="sun"><img class="poster" src="assets/oblozhka-sinyaya.webp" alt="Девушка подбрасывает блин на кухне"></div>' +
      '<div class="fine"><span>лист втрое · 6 панелей</span><span class="stub">«Меню» — заглушка</span></div>' +
      '<div class="wordmark"><span class="tagline">Дома вкуснее</span>' +
      '<h1 class="mark"><svg viewBox="0 0 1000 190" aria-hidden="true"><text x="2" y="182" textLength="996" lengthAdjust="spacingAndGlyphs">МЕНЮ</text></svg><span class="sr">Меню</span></h1></div>' +
      '<div class="foot"><span>завтрак · обед · ужин<br>закуски · салаты · десерты</span></div></div>';
  }

  /* ---------------- поведение панели: выбор и зачёркивание ---------------- */
  function strike(li, animate) {
    var name = li.querySelector('.name'), txt = li.querySelector('.txt');
    var old = txt.querySelector('.strike'); if (old) old.remove();
    var w = name.offsetWidth + 12, h = name.offsetHeight;
    var img = document.createElement('img'); img.className = 'mark strike'; img.alt = '';
    img.src = STK + 'poloska-' + (li.dataset.id.length % 2 ? 1 : 2) + '.webp';
    img.style.width = w + 'px'; img.style.height = Math.max(5, h * 0.42) + 'px';
    img.style.left = (name.offsetLeft - 6) + 'px'; img.style.top = (name.offsetTop + h * 0.32) + 'px';
    img.style.transform = 'rotate(' + (li.dataset.id.length % 3 - 1) * 1.2 + 'deg)';
    txt.appendChild(img);
    if (animate && !RM.matches) img.animate([{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0 0 0)' }], { duration: 340, easing: 'cubic-bezier(.4,.1,.6,1)', fill: 'both' });
  }
  // обводка выбранного блюда — её карандашные овалы; берём тот, чьи пропорции ближе к названию
  var OVALS = [['oval-a', 508 / 131], ['oval-b', 508 / 226], ['oval-c', 315 / 135]];
  function oval(li) {
    var name = li.querySelector('.name'), txt = li.querySelector('.txt');
    var padX = 12, padY = 9, w = name.offsetWidth + padX * 2, h = name.offsetHeight + padY * 2, ratio = w / h;
    var best = OVALS.reduce(function (m, o) { return Math.abs(Math.log(o[1] / ratio)) < Math.abs(Math.log(m[1] / ratio)) ? o : m; });
    var img = document.createElement('img'); img.className = 'mark oval'; img.alt = ''; img.src = STK + best[0] + '.webp';
    img.style.width = w + 'px'; img.style.height = h + 'px';
    img.style.left = (name.offsetLeft - padX) + 'px'; img.style.top = (name.offsetTop - padY) + 'px';
    txt.appendChild(img);
    if (!RM.matches) img.animate([{ clipPath: 'inset(0 100% 0 0)', opacity: .4 }, { clipPath: 'inset(0 0 0 0)', opacity: 1 }], { duration: 650, easing: 'cubic-bezier(.3,.1,.2,1)', fill: 'both' });
  }
  function wirePanel(panel, gate) {
    panel.querySelectorAll('.dish.done').forEach(function (li) { requestAnimationFrame(function () { strike(li, false); }); });
    panel.addEventListener('pointerdown', function (e) { var li = e.target.closest('.dish'); if (li) li.classList.add('press'); var b = e.target.closest('.pick'); if (b) b.classList.add('press'); });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (t) { panel.addEventListener(t, function () { panel.querySelectorAll('.press').forEach(function (x) { x.classList.remove('press'); }); }); });
    function toggle(li) {
      var id = li.dataset.id, i = store.cooked.indexOf(id), on = i < 0;
      if (on) store.cooked.push(id); else store.cooked.splice(i, 1); save();
      track(on ? 'cooked' : 'uncooked', id);
      li.classList.toggle('done', on); li.setAttribute('aria-pressed', on);
      if (on) { strike(li, true); buzz(8); } else { var s = li.querySelector('.strike'); if (s) s.remove(); }
    }
    // бросок кубика: приседает, подлетает с оборотами (тень на столе бледнеет и сжимается), падает, подпрыгивает и ложится
    function toss(btn, dur) {
      var die = btn.querySelector('.dice-svg'), sh = btn.querySelector('.die-sh');
      if (!die || RM.matches) return;
      var up = 'cubic-bezier(.2,.7,.4,1)', down = 'cubic-bezier(.55,0,.9,.45)';
      die.animate([
        { transform: 'translate(0,0) rotate(0deg) scale(1,1)', easing: 'ease-out' },
        { transform: 'translate(0,3px) rotate(0deg) scale(1.14,.84)', offset: .07, easing: up },
        { transform: 'translate(-14px,-86px) rotate(-430deg) scale(1,1)', offset: .43, easing: down },
        { transform: 'translate(-18px,0) rotate(-720deg) scale(1,1)', offset: .72, easing: 'ease-out' },
        { transform: 'translate(-18px,2px) rotate(-720deg) scale(1.12,.86)', offset: .77, easing: up },
        { transform: 'translate(-8px,-18px) rotate(-790deg) scale(1,1)', offset: .87, easing: down },
        { transform: 'translate(-2px,0) rotate(-810deg) scale(1.06,.94)', offset: .94, easing: 'ease-out' },
        { transform: 'translate(0,0) rotate(-810deg) scale(1,1)' }
      ], { duration: dur });
      if (sh) sh.animate([
        { transform: 'translateX(0) scale(1)', opacity: .16 },
        { transform: 'translateX(0) scale(1.15)', opacity: .2, offset: .07 },
        { transform: 'translateX(-14px) scale(.35)', opacity: .06, offset: .43 },
        { transform: 'translateX(-18px) scale(1.1)', opacity: .22, offset: .72 },
        { transform: 'translateX(-8px) scale(.75)', opacity: .12, offset: .87 },
        { transform: 'translateX(-2px) scale(1.05)', opacity: .18, offset: .94 },
        { transform: 'translateX(0) scale(1)', opacity: .16 }
      ], { duration: dur });
    }
    var run = 0;
    function pick(btn) {
      var my = ++run;
      track('dice', panel.dataset.sec);
      panel.querySelectorAll('.oval').forEach(function (x) { x.remove(); });
      panel.querySelectorAll('.won,.hop').forEach(function (x) { x.classList.remove('won', 'hop'); });
      // группы: раздел и подразделы (в «Супах» — супы и закуски), из каждой по одному блюду
      var groups = [[]];
      panel.querySelectorAll('.dishes > li').forEach(function (li) { if (li.classList.contains('subhead')) groups.push([]); else groups[groups.length - 1].push(li); });
      var rows = [].slice.call(panel.querySelectorAll('.dish'));
      var cands = groups.map(function (g) { return g.filter(function (li) { return !li.classList.contains('done') && !li.classList.contains('nohome'); }); }).filter(function (c) { return c.length; });
      var hint = panel.querySelector('.hint');
      hint.classList.remove('sr');
      if (!cands.length) { hint.innerHTML = rows.some(function (li) { return !li.classList.contains('done'); }) ? 'для остального<br>чего-то нет дома' : 'всё уже было —<br>новая неделя с понедельника'; buzz([20, 60, 20]); return; }
      hint.textContent = '';
      var delays = [], d = 45; while (d < 230) { delays.push(d); d *= 1.25; }
      var total = delays.reduce(function (a, b) { return a + b; }, 0);
      var seqs = cands.map(function (cand) {
        var win = cand[Math.floor(Math.random() * cand.length)], seq = [], prev = -1;
        delays.forEach(function () { var k; do { k = Math.floor(Math.random() * cand.length); } while (cand.length > 1 && k === prev); prev = k; seq.push(cand[k]); });
        seq.push(win); return seq;
      });
      if (RM.matches) { seqs = seqs.map(function (s) { return [s[s.length - 1]]; }); delays = []; }
      toss(btn, total + 80);
      var i = 0, cur = [];
      (function hop() {
        if (my !== run) return;
        cur.forEach(function (li) { li.classList.remove('hop'); });
        cur = seqs.map(function (s) { return s[i]; });
        if (i === delays.length) {
          cur.forEach(function (li) { li.classList.add('won'); oval(li); });
          var list = panel.querySelector('.dishes');
          if (list.scrollHeight > list.clientHeight + 1) { var lr = list.getBoundingClientRect(), cr = cur[0].getBoundingClientRect(); list.scrollTo({ top: list.scrollTop + (cr.top - lr.top) - list.clientHeight / 2 + cr.height / 2, behavior: RM.matches ? 'auto' : 'smooth' }); }
          buzz([12, 60, 26]); // хаптика в кадр, где начинается овал
          hint.classList.add('sr'); // для скринридера; на листе выбор показывает овал
          hint.textContent = 'сегодня: ' + cur.map(function (li) { return li.querySelector('.name').textContent.toLowerCase(); }).join(' и ');
          return;
        }
        cur.forEach(function (li) { li.classList.add('hop'); });
        buzz(5); setTimeout(hop, delays[i++]);
      })();
    }
    panel.addEventListener('click', function (e) {
      if (gate && gate()) return; // жест листания съел нажатие
      var b = e.target.closest('.pick'); if (b) return pick(b);
      if (e.target.closest('.home-btn')) return openHome();
      var li = e.target.closest('.dish'); if (li) toggle(li);
    });
    panel.addEventListener('keydown', function (e) { var li = e.target.closest('.dish'); if (li && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); toggle(li); } });
  }

  /* ---------------- что есть дома ---------------- */
  function applyHome() {
    document.querySelectorAll('.dish').forEach(function (li) {
      var miss = (li.dataset.prod || '').split(', ').filter(function (p) { return home.out.indexOf(p) > -1; });
      li.classList.toggle('nohome', miss.length > 0);
      li.title = miss.length ? 'нет дома: ' + miss.join(', ') : '';
    });
  }
  function allProducts() {
    var set = {}; SECTIONS.forEach(function (s) { s.dishes.forEach(function (d) { if (d[0] === '__h') return; d[2].split(', ').forEach(function (p) { set[p] = 1; }); }); });
    return Object.keys(set).sort(function (a, b) { return a.localeCompare(b, 'ru'); });
  }
  function openHome() {
    track('home');
    var old = document.querySelector('.homesheet'); if (old) old.remove();
    var el = document.createElement('div'); el.className = 'homesheet'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Что есть дома');
    el.innerHTML = '<div class="hs-card"><h3>Чего нет дома?</h3><p class="hs-sub">отметь, что закончилось — блюда с этим побледнеют, кубик их пропустит</p>' +
      '<div class="hs-chips">' + allProducts().map(function (p) { return '<button type="button" class="chip' + (home.out.indexOf(p) > -1 ? ' out' : '') + '" data-p="' + p + '">' + p + '</button>'; }).join('') + '</div>' +
      '<div class="hs-legend"><span><img src="' + STK + 'lyubimoe.webp" alt=""> любимое</span><span><img src="' + STK + 'bez-myasa.webp" alt=""> без мяса</span><span>тап по блюду — приготовлено на этой неделе</span><span>кубик — выбрать наугад</span></div>' +
      '<div class="hs-foot"><button type="button" class="hs-reset">всё есть</button><button type="button" class="hs-done">готово</button></div></div>';
    document.body.appendChild(el);
    el.addEventListener('click', function (e) {
      var c = e.target.closest('.chip');
      if (c) { var p = c.dataset.p, i = home.out.indexOf(p); if (i < 0) home.out.push(p); else home.out.splice(i, 1); track(i < 0 ? 'out' : 'in', encodeURIComponent(p)); c.classList.toggle('out', i < 0); saveHome(); applyHome(); return; }
      if (e.target.closest('.hs-reset')) { home.out = []; saveHome(); applyHome(); el.querySelectorAll('.chip.out').forEach(function (x) { x.classList.remove('out'); }); return; }
      if (e.target.closest('.hs-done') || e.target === el) el.remove();
    });
    document.addEventListener('keydown', function esc(e) { if (e.key === 'Escape') { el.remove(); document.removeEventListener('keydown', esc); } });
  }
  document.addEventListener('click', function (e) { if (e.target.closest('.home-global')) openHome(); });
  new MutationObserver(function () { applyHome(); }).observe(document.getElementById('app'), { childList: true });

  /* ================= ТЕЛЕФОН: тетрадь, панель поворачивается вокруг сгиба ================= */
  function mountPhone(app) {
    app.innerHTML = '<div class="phone"><div class="stack"></div><button class="ghost home-global" type="button">дома</button><nav class="pager" aria-label="Панели"><button class="ghost" data-go="-1" aria-label="Назад">←</button><span class="ghost" aria-live="polite" id="pg"></span><button class="ghost" data-go="1" aria-label="Вперёд">→</button></nav></div>';
    var stack = app.querySelector('.stack'), pages = [];
    var html = [coverHTML(true)].concat(SECTIONS.map(function (s, i) { return panelHTML(s, i + 1); }));
    html.forEach(function (h, i) {
      var pg = document.createElement('section'); pg.className = 'page'; pg.style.zIndex = 100 - i;
      pg.setAttribute('aria-label', i ? SECTIONS[i - 1].title.replace('<br>', ' ') : 'Обложка');
      pg.innerHTML = h + '<div class="shade"></div><div class="under"></div><div class="spine"></div>';
      stack.appendChild(pg); pages.push(pg);
    });
    var N = pages.length, W = () => window.innerWidth, pgEl = app.querySelector('#pg');
    var pager = app.querySelector('.pager');
    function render(pos) {
      var base = Math.floor(clamp(pos, 0, N - 1));
      for (var i = 0; i < N; i++) {
        var pg = pages[i], vis = i >= base - 0 && i <= base + 1 || (pos < 0 && i === 0);
        pg.style.visibility = vis ? 'visible' : 'hidden';
        if (!vis) continue;
        var t = clamp(pos - i, 0, 1), shade = pg.children[pg.children.length - 3], under = pg.children[pg.children.length - 2];
        if (i === N - 1 && pos > N - 1) t = pos - i; // резиновый край: последняя панель чуть приподнимается и падает
        if (RM.matches) { pg.style.transform = 'none'; pg.style.opacity = 1 - t; }
        else if (i === 0 && pos < 0) pg.style.transform = 'translateX(' + (-pos * W()) + 'px)';
        else pg.style.transform = 'rotateY(' + (-180 * t).toFixed(2) + 'deg)';
        shade.style.opacity = (Math.sin(t * Math.PI / 2) * 0.75).toFixed(3);
        var prevT = i > 0 ? clamp(pos - (i - 1), 0, 1) : 0;
        under.style.opacity = (i > 0 && prevT > 0 && prevT < 1) ? ((1 - prevT) * 0.6).toFixed(3) : 0;
        pg.inert = Math.round(clamp(pos, 0, N - 1)) !== i;
      }
      var cur = Math.round(clamp(pos, 0, N - 1));
      pgEl.textContent = (cur + 1) + ' / ' + N;
      pager.style.visibility = cur === 0 ? 'hidden' : ''; // на обложке стрелок и номера нет (её правка)
      app.querySelectorAll('.ghost').forEach(function (b) { b.style.color = cur === 0 ? '#FCF5E6' : '#033E69'; });
    }
    var spring = new Spring(0, render);
    var drag = null, ate = false, idx = 0;
    function settle(target, v) {
      var changed = target !== idx; idx = target;
      if (changed) buzz(10); // хаптика в кадр фиксации перелистывания
      // Apple: вращение — damping 0.8 / response 0.4; без броска — критическое затухание
      spring.to(target, { damping: Math.abs(v) > 0.6 ? 0.8 : 1, response: 0.4, velocity: v });
    }
    stack.addEventListener('pointerdown', function (e) {
      if (e.button) return;
      ate = false;
      var p0 = spring.grab(); // хватаем на лету, с текущего значения
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY, p0: p0, on: false, tr: new Tracker() };
      drag.tr.push(e.clientX, e.timeStamp);
      if (Math.abs(p0 - Math.round(p0)) > 0.01) { drag.on = true; stack.setPointerCapture(e.pointerId); } // поймали в полёте — сразу ведём
    });
    stack.addEventListener('pointermove', function (e) {
      if (!drag || e.pointerId !== drag.id) return;
      var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (!drag.on) {
        if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) { drag = null; return; } // это прокрутка списка
        if (Math.abs(dx) < 10) return; // гистерезис 10 px
        drag.on = true; drag.x = e.clientX; dx = 0; stack.setPointerCapture(e.pointerId);
        stack.querySelectorAll('.press').forEach(function (x) { x.classList.remove('press'); });
      }
      drag.tr.push(e.clientX, e.timeStamp);
      var p = drag.p0 - dx / W(), lo = 0, hi = N - 1;
      if (p < lo) p = lo - rubber(lo - p, 1) ; else if (p > hi) p = hi + rubber(p - hi, 1);
      spring.set(p);
    });
    function up(e) {
      if (!drag || e.pointerId !== drag.id) return;
      if (drag.on) {
        ate = true;
        var vpx = drag.tr.velocity(), pos = spring.x, start = Math.round(drag.p0);
        var proj = pos - project(vpx) / W(), target = Math.round(proj);
        if (target === start && Math.abs(vpx) > 300) target = start + (vpx < 0 ? 1 : -1); // знак скорости решает
        target = clamp(clamp(target, start - 1, start + 1), 0, N - 1);
        settle(target, -vpx / W());
      }
      drag = null;
    }
    stack.addEventListener('pointerup', up); stack.addEventListener('pointercancel', up);
    pages.forEach(function (pg) { var p = pg.querySelector('.panel'); if (!p.classList.contains('cover')) wirePanel(p, function () { var a = ate; ate = false; return a; }); });
    pager.addEventListener('click', function (e) { var b = e.target.closest('[data-go]'); if (b) settle(clamp(idx + +b.dataset.go, 0, N - 1), 0); });
    window.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight') settle(clamp(idx + 1, 0, N - 1), 0); if (e.key === 'ArrowLeft') settle(clamp(idx - 1, 0, N - 1), 0); });
    render(0);
    intro(app.querySelector('.cover'), function () {
      // подсказка в направлении жеста: обложка приподнимается и падает обратно
      if (idx === 0 && !drag) spring.to(0.14, { damping: 1, response: 0.35, onRest: function () { if (idx === 0) spring.to(0, { damping: 0.8, response: 0.4 }); } });
    });
    var q = new URLSearchParams(location.search); if (q.get('p')) { idx = +q.get('p'); spring.set(idx); }
    return { destroy: function () {} };
  }

  /* ================= КОМПЬЮТЕР: лист втрое раскладывается за курсором ================= */
  function mountDesk(app) {
    app.innerHTML = '<div class="desk"><div class="sheet"><div class="floor"></div>' +
      '<div class="col L"><div class="face front">' + panelHTML(SECTIONS[0], 1) + '<div class="shade"></div></div><div class="face back">' + panelHTML(SECTIONS[3], 4) + '<div class="shade"></div></div></div>' +
      '<div class="col M"><div class="face front">' + panelHTML(SECTIONS[1], 2) + '<div class="shade"></div></div></div>' +
      '<div class="col R"><div class="face front">' + panelHTML(SECTIONS[2], 3) + '<div class="shade"></div></div><div class="face back">' + coverHTML(false) + '<div class="shade"></div></div></div>' +
      '<div class="crease" id="crease1"></div><div class="crease" id="crease2"></div>' +
      '</div>' +
      '<div class="outside" hidden><div class="flat">' + panelHTML(SECTIONS[3], 4) + '</div><div class="flat">' + panelHTML(SECTIONS[4], 5) + '</div><div class="flat">' + coverHTML(false) + '</div>' +
      '<div class="crease" style="left:33.333%"></div><div class="crease" style="left:66.666%"></div></div>' +
      '<p class="caption" id="cap"></p><p class="flipbar"><button type="button" class="home-global">дома</button><button type="button" id="flip">обратная сторона листа →</button></p></div>';
    var sheet = app.querySelector('.sheet'), L = app.querySelector('.col.L'), M = app.querySelector('.col.M'), R = app.querySelector('.col.R');
    var floor = app.querySelector('.floor'), cap = app.querySelector('#cap'), c1 = app.querySelector("#crease1"), c2 = app.querySelector("#crease2");
    var W, H, out = app.querySelector('.outside'), flip = app.querySelector('#flip'), side = 'in';
    function layout() {
      var vw = window.innerWidth, vh = window.innerHeight;
      W = Math.floor(Math.min((vw - 120) / 3, vh >= 860 ? (vh - 90) / 2.05 : 470, 470)); H = Math.round(W * 2.05); // окно от 860 px (Full HD) — лист целиком в окне; ниже — по ширине, текст полного размера, прокручивается страница // по ширине: на низком экране страница прокручивается, текст не мельчает
      sheet.style.width = 3 * W + 'px'; sheet.style.height = H + 'px'; sheet.style.marginTop = '0px';
      [L, M, R].forEach(function (c, i) { c.style.width = W + 'px'; c.style.height = H + 'px'; c.style.left = i * W + 'px'; });
      out.style.width = 3 * W + 'px'; out.style.height = H + 'px'; out.style.marginTop = '0px';
      L.style.transformOrigin = '100% 50%'; R.style.transformOrigin = '0% 50%';
      c1.style.left = W + 'px'; c2.style.left = 2 * W + 'px';
      render(spring ? spring.x : 0);
    }
    function render(p) {
      var r = p < 1 ? p : 1, l = p > 1 ? p - 1 : 0;
      if (p > 2) l = p - 1; // перелёт: клапан слегка отгибается назад
      var aR = -180 * (1 - r), aL = clamp(180 * (1 - l), -14, 180);
      if (RM.matches) { R.style.transform = 'translateZ(2px) rotateY(' + (r > .5 ? 0 : -180) + 'deg)'; L.style.transform = 'translateZ(1px) rotateY(' + (l > .5 ? 0 : 180) + 'deg)'; }
      else { R.style.transform = 'translateZ(2px) rotateY(' + aR.toFixed(2) + 'deg)'; L.style.transform = 'translateZ(1px) rotateY(' + aL.toFixed(2) + 'deg)'; }
      // свет: клапан темнеет, пока встаёт к ребру
      R.querySelector('.front .shade').style.opacity = (Math.sin((1 - r) * Math.PI) * 0.5).toFixed(3);
      R.querySelector('.back .shade').style.opacity = (Math.sin(r * Math.PI) * 0.5).toFixed(3);
      L.querySelector('.front .shade').style.opacity = (Math.sin((1 - clamp(l, 0, 1)) * Math.PI) * 0.45).toFixed(3);
      L.querySelector('.back .shade').style.opacity = (Math.sin(clamp(l, 0, 1) * Math.PI) * 0.45).toFixed(3);
      // тень на столе растёт вместе с раскрытым листом
      var left = W * (1 - clamp(l, 0, 1)), right = W * (2 + clamp(r, 0, 1));
      floor.style.left = left + 'px'; floor.style.width = (right - left) + 'px';
      c1.style.opacity = clamp(l, 0, 1); c2.style.opacity = clamp(r, 0, 1);
      L.querySelector('.front').inert = l < .99; R.querySelector('.front').inert = r < .99; M.querySelector('.front').inert = r < .99 || l < .99;
      var st = p < .5 ? 0 : p < 1.5 ? 1 : 2;
      if (st !== render.st) { render.st = st;
        cap.innerHTML = st === 0 ? 'потяни обложку вправо — или <button data-to="2">раскрой</button>' : st === 1 ? 'тяни дальше — или <button data-to="2">раскрой целиком</button>' : '<button data-to="0">сложить лист</button> · тап по блюду — приготовлено';
      }
    }
    var spring = new Spring(0, render);
    layout(); window.addEventListener('resize', layout);
    var drag = null, hover = false;
    function go(t, v) { spring.to(t, { damping: Math.abs(v || 0) > 0.8 ? 0.8 : 0.9, response: t === 0 ? 0.5 : 0.55, velocity: v || 0 }); }
    cap.addEventListener('click', function (e) { var b = e.target.closest('[data-to]'); if (b) go(+b.dataset.to); });
    function handle(e) { return !e.target.closest('.dish,.pick,button,.dishes'); }
    sheet.addEventListener('pointerdown', function (e) {
      if (e.button || !handle(e)) return;
      var p0 = spring.grab();
      drag = { id: e.pointerId, x: e.clientX, p0: p0, on: false, tr: new Tracker() }; drag.tr.push(e.clientX, e.timeStamp);
      sheet.setPointerCapture(e.pointerId); document.body.classList.add('grabbing');
    });
    sheet.addEventListener('pointermove', function (e) {
      if (!drag) { // наведение у края обложки: клапан приподнимается к курсору
        if (spring.target > 0.2 || spring.x > 0.2) return;
        var rc = sheet.getBoundingClientRect(), x = e.clientX - rc.left, near = x > W * 1.45 && x < W * 2.05;
        sheet.classList.toggle('grab', true);
        if (near !== hover) { hover = near; spring.to(near ? 0.07 : 0, { damping: 1, response: 0.35 }); }
        return;
      }
      var dx = e.clientX - drag.x; if (Math.abs(dx) > 4) drag.on = true;
      drag.tr.push(e.clientX, e.timeStamp);
      var p = drag.p0 + dx / W; // 1:1 — край клапана идёт за курсором, точка захвата сохраняется
      if (p < 0) p = -rubber(-p, 1); else if (p > 2) p = 2 + rubber(p - 2, 1);
      spring.set(p);
    });
    sheet.addEventListener('pointerleave', function () { if (!drag && hover) { hover = false; spring.to(0, { damping: 1, response: 0.35 }); } });
    function up(e) {
      if (!drag || e.pointerId !== drag.id) return;
      document.body.classList.remove('grabbing');
      var vpx = drag.tr.velocity(), v = vpx / W, p = spring.x;
      if (!drag.on) { drag = null; if (p < 1.5) go(2); return; } // клик по обложке/плашке — раскрыть
      var proj = p + project(vpx) / W, t = clamp(Math.round(proj), 0, 2);
      drag = null; hover = false; go(t, v);
    }
    sheet.addEventListener('pointerup', up); sheet.addEventListener('pointercancel', up);
    window.addEventListener('keydown', function (e) { if (e.key === 'Escape') go(0); if ((e.key === 'Enter' || e.key === 'ArrowRight') && spring.target < 2 && document.activeElement === document.body) go(2); });
    [L.querySelector('.front .panel'), M.querySelector('.panel'), R.querySelector('.front .panel')].forEach(function (p) { wirePanel(p); });
    out.querySelectorAll('.flat .panel:not(.cover)').forEach(function (p) { wirePanel(p); });
    function setSide(to, animate) {
      side = to; var show = to === 'out' ? out : sheet, hide = to === 'out' ? sheet : out;
      hide.hidden = true; show.hidden = false; cap.hidden = to === 'out';
      flip.textContent = to === 'out' ? '← лицевая сторона' : 'обратная сторона →';
      if (animate && !RM.matches) show.animate([{ transform: 'perspective(1800px) rotateY(' + (to === 'out' ? -70 : 70) + 'deg)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 520, easing: 'cubic-bezier(.2,.8,.2,1)' });
    }
    flip.addEventListener('click', function () { if (side === 'in' && spring.target < 2) go(2); setSide(side === 'in' ? 'out' : 'in', true); });
    setSide('in', false);
    var q = new URLSearchParams(location.search);
    if (q.get('side') === 'out') setSide('out', false);
    if (q.get('open')) spring.set(+q.get('open'));
    else intro(R.querySelector('.cover'), function () { if (spring.x < 0.02 && !drag) spring.to(0.1, { damping: 1, response: 0.3, onRest: function () { if (!drag) spring.to(0, { damping: 0.7, response: 0.45 }); } }); });
  }

  /* вход сцены: линия «Меню» прорисовывается, солнце встаёт, затем подсказка жестом */
  function intro(cover, then) {
    var path = cover.querySelector('.wordmark'), sun = cover.querySelector('.sun');
    if (RM.matches || /still=1/.test(location.search)) { return; }
    path.animate([{ transform: 'translateY(14px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 900, delay: 500, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'both' });
    sun.animate([{ transform: 'translateY(6%)', opacity: 0 }, { transform: 'translateY(0)', opacity: 1 }], { duration: 900, easing: 'cubic-bezier(.2,.9,.25,1.12)', fill: 'both' });
    setTimeout(then, 2500);
  }

  /* ---------------- монтаж по ширине ---------------- */
  var app = document.getElementById('app'), mq = window.matchMedia('(min-width: 900px)'), mode = null;
  function mount() { var m = mq.matches ? 'desk' : 'phone'; if (m === mode) return; mode = m; (m === 'desk' ? mountDesk : mountPhone)(app); }
  mq.addEventListener('change', mount); mount();
})();
