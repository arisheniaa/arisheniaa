/* ══════════════════════════════════════════════════════════════
   НАПРАВЛЕНИЕ A — движение и графика кодом
   Средства выбраны по лестнице от дешёвого к дорогому:
   sticky → IntersectionObserver → один общий rAF → canvas 2D.
   GSAP, ScrollTrigger и Lenis не подключены: ни одна сцена их не
   потребовала, а 46 КБ ради двух переходов на Ф2 не окупаются.
   ══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var RM = matchMedia('(prefers-reduced-motion: reduce)');
  var reduce = RM.matches;

  /* ── 1 · МОРФИНГ ИМЕНИ ─────────────────────────────────────────
     Механика 1 «послойное растворение» (FACTS.md Ф15).
     340 мс на букву · ступень 28 мс · blur 7→0 · translateY ∓0.14em
     · scale .94/1.06 · ease. Ширину держит кириллица.
     П8: оба написания в DOM, визуальный слой aria-hidden,
     читаемый узел — один чистый «аришения».                       */
  var LAT = 'arisheniaa', CYR = 'аришения', STEP = 28;

  function letters(word) {
    var h = '';
    for (var i = 0; i < word.length; i++)
      h += '<span class="g" style="transition-delay:' + (i * STEP) + 'ms">' + word[i] + '</span>';
    return h;
  }

  var morph = document.getElementById('morph');
  morph.innerHTML =
    '<span class="lay" aria-hidden="true">' +
      '<span class="cyr">' + letters(CYR) + '</span>' +
      '<span class="alt lat">' + letters(LAT) + '</span>' +
    '</span><span class="sr">аришения</span>';

  var markLink = document.getElementById('markLink');
  markLink.addEventListener('click', function (e) { e.preventDefault(); morph.classList.toggle('to'); });

  /* П7: в первом кадре движения нет. Переход ждёт первого признака
     присутствия человека — курсора, пальца, скролла или клавиши. */
  var fired = false;
  function firstIntent() {
    if (fired) return;
    fired = true;
    ['pointermove', 'scroll', 'keydown', 'touchstart', 'wheel'].forEach(function (t) {
      window.removeEventListener(t, firstIntent);
    });
    if (reduce) return;                 // с reduced-motion имя стоит на латинице,
    setTimeout(function () {            // кириллица остаётся в DOM и по клику меняется мгновенно
      morph.classList.add('to');
    }, 260);
  }
  setTimeout(function () {
    ['pointermove', 'scroll', 'keydown', 'touchstart', 'wheel'].forEach(function (t) {
      window.addEventListener(t, firstIntent, { passive: true });
    });
  }, 600);

  /* ── 2 · ПРИБЫТИЕ ПЛАШЕК ───────────────────────────────────────
     420 мс, cubic-bezier(.22,.68,.24,1), ступень 80 мс, сдвиг 18 px.
     IntersectionObserver: ни одной подписки на scroll.            */
  var reveals = [].slice.call(document.querySelectorAll('.reveal'));
  if (reduce || !('IntersectionObserver' in window)) {
    reveals.forEach(function (n) { n.classList.add('in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      var k = 0;
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var n = en.target;
        setTimeout(function () { n.classList.add('in'); }, (k++) * 80);
        io.unobserve(n);
      });
    }, { threshold: 0.18, rootMargin: '0px 0px -8% 0px' });
    reveals.forEach(function (n) { io.observe(n); });
  }

  /* ── 3 · НАВОДКА НА РЕЗКОСТЬ + СЧЁТЧИК КАДРОВ ──────────────────
     Один общий rAF на всю страницу. Шаг растра 4.2 px → 2.0 px
     на первых 1.2 экрана: страница буквально наводится на резкость,
     той же цитатой объектива, что и переход имени.
     Счётчик КАДР 001→120 идёт за прогрессом всей страницы.        */
  var root = document.documentElement;
  var counter = document.getElementById('counter');
  var dot = 4.2, dotTarget = 4.2, shown = -1;

  function readScroll() {
    var y = window.scrollY || 0;
    var vh = window.innerHeight || 1;
    dotTarget = 4.2 - 2.2 * Math.min(1, y / (vh * 1.2));
    var max = Math.max(1, document.body.scrollHeight - vh);
    var n = 1 + Math.round(119 * Math.min(1, y / max));
    if (n !== shown) {
      shown = n;
      counter.textContent = 'КАДР ' + ('00' + n).slice(-3);
    }
  }

  /* ── 4 · ЗВЁЗДЫ ────────────────────────────────────────────────
     Генеративные, неровные, НЕ пятиугольные: 7–11 лучей, радиус
     каждого луча дрожит в 0.42–1.0, углы смещены случайно.
     Жёлтые и белые; белая обведена краской, иначе тонет в бумаге.
     Реакция: курсор и палец отталкивают в радиусе 210 px,
     возврат пружиной k=0.045, затухание 0.86.                     */
  var cv = document.getElementById('stars');
  var ctx = cv.getContext('2d');
  var W = 0, H = 0, DPR = Math.min(2, window.devicePixelRatio || 1);
  var stars = [];
  var px = -9999, py = -9999;

  function rnd(a, b) { return a + Math.random() * (b - a); }

  function makeStar() {
    var spikes = Math.round(rnd(7, 11));
    var pts = [];
    var a0 = rnd(0, Math.PI * 2);
    for (var i = 0; i < spikes * 2; i++) {
      var out = i % 2 === 0;
      var a = a0 + (i / (spikes * 2)) * Math.PI * 2 + rnd(-0.16, 0.16);
      var r = out ? rnd(0.72, 1.0) : rnd(0.26, 0.46);
      pts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
    return pts;
  }

  function seed() {
    stars = [];
    var n = W < 700 ? 12 : 22;
    for (var i = 0; i < n; i++) {
      var white = Math.random() < 0.42;
      stars.push({
        bx: rnd(0.03, 0.97), by: rnd(0.02, 0.98),   // доля вьюпорта
        x: 0, y: 0, vx: 0, vy: 0,
        r: rnd(6, white ? 14 : 20),
        rot: rnd(0, 6.28), spin: rnd(-0.0016, 0.0016),
        alpha: white ? rnd(0.5, 0.8) : rnd(0.38, 0.76),
        white: white,
        pts: makeStar()
      });
    }
    stars.forEach(function (s) { s.x = s.bx * W; s.y = s.by * H; });
  }

  function resize() {
    W = window.innerWidth; H = window.innerHeight;
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    if (!stars.length) seed(); else stars.forEach(function (s) { s.x = s.bx * W; s.y = s.by * H; });
  }

  function drawStar(s) {
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(s.rot);
    ctx.beginPath();
    for (var i = 0; i < s.pts.length; i++) {
      var p = s.pts[i];
      if (i === 0) ctx.moveTo(p[0] * s.r, p[1] * s.r);
      else ctx.lineTo(p[0] * s.r, p[1] * s.r);
    }
    ctx.closePath();
    ctx.globalAlpha = s.alpha;
    ctx.fillStyle = s.white ? '#FFFFFF' : '#F2C94C';
    ctx.fill();
    ctx.globalAlpha = s.alpha * 0.85;
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#141310';
    ctx.stroke();
    ctx.restore();
  }

  function step() {
    readScroll();
    dot += (dotTarget - dot) * 0.12;
    root.style.setProperty('--dot', dot.toFixed(2) + 'px');

    ctx.clearRect(0, 0, W, H);
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      var hx = s.bx * W, hy = s.by * H;
      var dx = s.x - px, dy = s.y - py;
      var d2 = dx * dx + dy * dy, R = 210;
      if (d2 < R * R) {
        var d = Math.sqrt(d2) || 1;
        var f = (1 - d / R); f = f * f * 2.4;
        s.vx += (dx / d) * f; s.vy += (dy / d) * f;
        s.spin += f * 0.0016;
      }
      s.vx += (hx - s.x) * 0.045; s.vy += (hy - s.y) * 0.045;
      s.vx *= 0.86; s.vy *= 0.86;
      s.x += s.vx; s.y += s.vy;
      s.rot += s.spin; s.spin *= 0.985;
      if (Math.abs(s.spin) < 0.0004) s.spin += (Math.random() - 0.5) * 0.00008;
      drawStar(s);
    }
    requestAnimationFrame(step);
  }

  function paintOnce() {
    ctx.clearRect(0, 0, W, H);
    stars.forEach(drawStar);
  }

  window.addEventListener('resize', function () {
    resize();
    if (reduce) paintOnce();
  });
  window.addEventListener('pointermove', function (e) { px = e.clientX; py = e.clientY; }, { passive: true });
  window.addEventListener('pointerdown', function (e) { px = e.clientX; py = e.clientY; }, { passive: true });
  window.addEventListener('pointerleave', function () { px = py = -9999; }, { passive: true });

  resize();
  if (reduce) { readScroll(); paintOnce(); }
  else requestAnimationFrame(step);

  RM.addEventListener && RM.addEventListener('change', function () { location.reload(); });
})();
