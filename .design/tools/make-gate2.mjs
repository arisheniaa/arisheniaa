#!/usr/bin/env node
// Контактный лист для гейта 2 дизайн-пайплайна.
//
// Проходит по .design/refs/raw/, подтягивает к каждому снимку его строку из INDEX.md,
// отдаёт самодостаточный html с чекбоксами, счётчиком «выбрано N, нужно 8–12» и выгрузкой
// списка. Снимки без строки в INDEX подсвечиваются отдельно: по правилу Ф1 они не считаются
// собранными, и владелец должен видеть это здесь, а не обнаруживать позже.
//
// Запуск из корня проекта:  node .design/tools/make-gate2.mjs
// Опции:  --refs <путь>  --out <путь>  --min <n>  --max <n>

import { readFile, readdir, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'

const argv = process.argv.slice(2)
const opt = (name, fallback) => {
  const i = argv.indexOf(`--${name}`)
  return i !== -1 && argv[i + 1] ? argv[i + 1] : fallback
}

const refsDir = path.resolve(opt('refs', '.design/refs/raw'))
const outFile = path.resolve(opt('out', '.design/refs/GATE2.html'))
const MIN = Number(opt('min', 8))
const MAX = Number(opt('max', 12))

const IMAGE_RE = /\.(png|jpe?g|webp|avif|gif)$/i

if (!existsSync(refsDir)) {
  console.error(`✗ Нет папки с референсами: ${refsDir}`)
  console.error('  Ф1 не отработала или путь другой — укажи через --refs.')
  process.exit(1)
}

// --- снимки -----------------------------------------------------------------
const entries = await readdir(refsDir, { withFileTypes: true })
const shots = entries
  .filter((e) => e.isFile() && IMAGE_RE.test(e.name))
  .map((e) => e.name)
  .sort((a, b) => a.localeCompare(b, 'ru'))

if (shots.length === 0) {
  console.error(`✗ В ${refsDir} нет изображений. Нечего показывать на гейте 2.`)
  process.exit(1)
}

// --- INDEX.md ---------------------------------------------------------------
// Ищем для каждого снимка строку, где упомянуто его имя файла. Формат строки свободный —
// важно лишь, что аннотация существует и привязана к файлу.
const indexPath = path.join(refsDir, 'INDEX.md')
let indexRaw = ''
if (existsSync(indexPath)) {
  indexRaw = await readFile(indexPath, 'utf8')
} else {
  console.warn(`⚠ Нет ${indexPath} — все снимки уйдут в раздел «без строки в INDEX».`)
}

// CRLF и BOM: файл писался на Windows, регулярки с $ об этом спотыкаются.
const allLines = indexRaw.replace(/^﻿/, '').split(/\r?\n/)

// Доработка основного цикла. Исходный матчер искал имя файла в ЛЮБОЙ строке INDEX.
// Из-за этого раздел «Без аннотации», перечисляющий необработанные файлы по именам,
// сам засчитывался как аннотация: генератор рапортовал 38 из 38 при 13 написанных.
// Ровно тот класс дефекта, ради которого подсветка и существует, — тихо рапортовать «всё
// собрано». Поэтому: строки внутри раздела, чей заголовок говорит об отсутствии
// аннотации, из сопоставления исключаются.
const SKIP_HEADING = /без\s+аннотац|не\s+считаются\s+собранн|not\s*annotated/i
let skipping = false
const indexLines = allLines.filter((l) => {
  if (/^#{1,6}\s/.test(l)) skipping = SKIP_HEADING.test(l)
  return !skipping
})

const annotationFor = (file) => {
  const base = file.replace(IMAGE_RE, '')
  const hit = indexLines.find((l) => l.includes(file) || (base.length > 3 && l.includes(base)))
  if (!hit) return null
  // Срезаем markdown-разметку списка/таблицы и само имя файла — остаётся смысл строки.
  const text = hit
    .replace(/^\s*[-*+]\s*/, '')
    .replace(/^\s*\|\s*/, '')
    .replace(/\s*\|\s*$/, '')
    .replace(/\|/g, ' · ')
    .replace(new RegExp(file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '')
    .replace(/!?\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/[`*_]/g, '')
    .trim()
  return text.length > 0 ? text : null
}

const items = shots.map((file) => ({ file, note: annotationFor(file) }))
const missing = items.filter((i) => !i.note)

// source_gap — источники, которые не взялись. Владелец должен видеть, где карта неполна.
const gaps = indexLines
  .filter((l) => /source_gap\s*:/i.test(l))
  .map((l) => l.replace(/^\s*[-*+|]\s*/, '').replace(/\|/g, ' · ').trim())

// --- html -------------------------------------------------------------------
const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  )

// Пути к картинкам — относительно расположения html, через forward slash:
// path.relative на Windows отдаёт бэкслэши, а в href они не работают.
const relDir = path.relative(path.dirname(outFile), refsDir).split(path.sep).join('/')
const src = (file) => (relDir ? `${relDir}/${file}` : file)

// --- группировка по полюсам -------------------------------------------------
// Доработка основного цикла: исходный генератор валил всё в одну сетку. Анти-полюс
// в общей сетке отбирается по ошибке — он выглядит ровно как то, что нравится нише,
// и владелец кладёт его в picked/, не заметив. Отделяем физически.
const POLES = {
  mat: ['Материальность', 'Зерно, печатная фактура, аналоговая деградация. Несущий полюс: он выражает конфликт «против цифровой стерильности».'],
  pal: ['Тёплая палитра вне фотонишы', 'Песочный и зелёный там, где они НЕ значат «нежная свадебная съёмка». Смотри сюда после анти-полюса: вопрос не «нравится ли», а «чем это звучит иначе, чем Vigbo».'],
  nai: ['Наивный вектор', 'Неровные фигуры, толстый контур, кривое намеренно. Под звёзды: «несуразные, не пятиугольные».'],
  axs: ['Морфинг и подмена глифов', 'Под переход arisheniaa → аришения. Смотри на механику, не на цвет.'],
  pho: ['Фотография как объект', 'Кадр внутри сетки и типографики, а не фон под текстом.'],
  cur: ['Курсорный интерактив', 'Реакция на курсор и палец. Проверяй, что остаётся на телефоне.'],
  scr: ['Скролл-режиссура', 'Сцена, которой управляет прокрутка.'],
  anti: ['⚠ АНТИ-ПОЛЮС — от чего отличаемся', 'Это НЕ примеры для подражания. Отбирать их в picked/ нельзя: они и есть то, во что одета вся ниша. Смотри и запоминай, чтобы не повторить.'],
}
const poleOf = (f) => {
  const p = f.split('-')[0]
  return POLES[p] ? p : 'etc'
}
POLES.etc = ['Без полюса', 'Префикс имени файла не опознан.']

const card = (it, n) => `
    <label class="card${it.note ? '' : ' card--nonote'}" data-file="${esc(it.file)}">
      <input type="checkbox" value="${esc(it.file)}"${poleOf(it.file) === 'anti' ? ' data-anti="1"' : ''}>
      <span class="frame"><img src="${esc(src(it.file))}" alt="" loading="lazy"></span>
      <span class="meta">
        <span class="name">${String(n + 1).padStart(2, '0')} · ${esc(it.file)}</span>
        <span class="note">${it.note ? esc(it.note) : 'нет строки в INDEX — по правилу Ф1 не считается собранным'}</span>
      </span>
    </label>`

let counter = 0
const order = ['mat', 'pal', 'nai', 'axs', 'pho', 'cur', 'scr', 'etc', 'anti']
const cards = order
  .filter((p) => items.some((i) => poleOf(i.file) === p))
  .map((p) => {
    const group = items.filter((i) => poleOf(i.file) === p)
    const withNote = group.filter((i) => i.note).length
    return `
    <section class="pole${p === 'anti' ? ' pole--anti' : ''}">
      <h2>${esc(POLES[p][0])} <em>${group.length} снимков, с аннотацией ${withNote}</em></h2>
      <p class="poleWhy">${esc(POLES[p][1])}</p>
      <div class="grid">${group.map((it) => card(it, counter++)).join('')}</div>
    </section>`
  })
  .join('')

const html = `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Гейт 2 — отбор референсов</title>
<style>
  :root { color-scheme: light dark; --bg:#0d0d0f; --fg:#f2f2f0; --dim:#8b8b93;
          --line:#26262b; --pick:#c8ff3d; --warn:#ff8f5e; }
  @media (prefers-color-scheme: light) {
    :root { --bg:#fbfbf9; --fg:#16161a; --dim:#6a6a72; --line:#e2e2dd;
            --pick:#2f6b00; --warn:#a4400d; }
  }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--bg); color:var(--fg);
         font:15px/1.5 ui-sans-serif,system-ui,"Segoe UI",sans-serif; }
  header { position:sticky; top:0; z-index:5; background:var(--bg);
           border-bottom:1px solid var(--line); padding:18px 24px;
           display:flex; gap:24px; align-items:baseline; flex-wrap:wrap; }
  h1 { font-size:15px; font-weight:600; margin:0; letter-spacing:-.01em; }
  .count { font-variant-numeric:tabular-nums; font-weight:600; }
  .count.ok { color:var(--pick); }
  .count.bad { color:var(--warn); }
  .hint { color:var(--dim); font-size:13px; }
  button { font:inherit; padding:7px 14px; border:1px solid var(--line);
           background:transparent; color:var(--fg); border-radius:6px; cursor:pointer; }
  button:hover { border-color:var(--fg); }
  .warn { margin:0; padding:14px 24px; border-bottom:1px solid var(--line);
          color:var(--warn); font-size:13px; }
  .grid { display:grid; gap:18px; padding:0 24px 8px;
          grid-template-columns:repeat(auto-fill,minmax(300px,1fr)); }
  .pole { border-top:1px solid var(--line); padding-top:20px; margin-top:12px; }
  .pole h2 { font-size:14px; font-weight:600; margin:0 24px 2px; letter-spacing:-.01em; }
  .pole h2 em { font-style:normal; font-weight:400; color:var(--dim); font-size:12px;
                font-variant-numeric:tabular-nums; margin-left:8px; }
  .poleWhy { font-size:13px; color:var(--dim); margin:0 24px 16px; max-width:80ch; }
  .pole--anti { background:color-mix(in srgb, var(--warn) 8%, transparent);
                border-top:2px solid var(--warn); margin-top:34px; padding-bottom:10px; }
  .pole--anti h2 { color:var(--warn); }
  .pole--anti .poleWhy { color:var(--warn); }
  .pole--anti .card:has(:checked) { border-color:var(--warn); }
  .pole--anti .card:has(:checked) .frame { outline-color:var(--warn); }
  .card { display:flex; flex-direction:column; gap:10px; cursor:pointer;
          border:1px solid var(--line); border-radius:10px; padding:10px;
          background:transparent; transition:border-color .12s, transform .12s; }
  .card:hover { border-color:var(--dim); }
  .card:has(:checked) { border-color:var(--pick); transform:translateY(-2px); }
  .card input { position:absolute; opacity:0; pointer-events:none; }
  .frame { display:block; aspect-ratio:16/10; overflow:hidden; border-radius:6px;
           background:#00000018; }
  .frame img { width:100%; height:100%; object-fit:cover; object-position:top center;
               display:block; }
  .card:has(:checked) .frame { outline:2px solid var(--pick); outline-offset:-2px; }
  .meta { display:flex; flex-direction:column; gap:3px; }
  .name { font-size:12px; color:var(--dim); font-variant-numeric:tabular-nums; }
  .note { font-size:13px; }
  .card--nonote .note { color:var(--warn); }
  #out { margin:0 24px 40px; padding:14px; width:calc(100% - 48px);
         min-height:130px; background:transparent; color:var(--fg);
         border:1px solid var(--line); border-radius:8px;
         font:13px/1.6 ui-monospace,"Cascadia Code",Consolas,monospace; display:none; }
</style>
</head>
<body>
<header>
  <h1>Гейт 2 — отбор референсов</h1>
  <span class="count" id="count">выбрано 0, нужно ${MIN}–${MAX}</span>
  <span class="hint">Отбор — единственная точка калибровки вкуса. Смотри, что берёшь, а не что нравится.</span>
  <button id="copy">Выгрузить список</button>
</header>
${
  missing.length
    ? `<p class="warn">⚠ Без строки в INDEX: ${missing.length} из ${items.length}. По правилу Ф1 такие снимки не считаются собранными — верни их скауту, а не отбирай вслепую.</p>`
    : ''
}
${gaps.length ? `<p class="warn">⚠ Источники, которые не взялись:<br>${gaps.map(esc).join('<br>')}</p>` : ''}
<div class="grid">${cards}</div>
<textarea id="out" spellcheck="false" readonly></textarea>
<script>
  const boxes = [...document.querySelectorAll('input[type=checkbox]')]
  const count = document.getElementById('count')
  const out = document.getElementById('out')
  const MIN = ${MIN}, MAX = ${MAX}
  const picked = () => boxes.filter(b => b.checked).map(b => b.value)
  const antiPicked = () => boxes.filter(b => b.checked && b.dataset.anti).length
  function render () {
    const n = picked().length
    const a = antiPicked()
    count.textContent = 'выбрано ' + n + ', нужно ${MIN}–${MAX}'
      + (a ? '  ⚠ из них ' + a + ' из анти-полюса — так нельзя' : '')
    count.classList.toggle('ok', n >= MIN && n <= MAX && a === 0)
    count.classList.toggle('bad', a > 0)
  }
  boxes.forEach(b => b.addEventListener('change', render))
  document.getElementById('copy').addEventListener('click', async () => {
    const list = picked()
    const text = list.length
      ? '# picked (' + list.length + ')\\n' + list.map(f => 'cp .design/refs/raw/' + f + ' .design/refs/picked/').join('\\n')
      : '# ничего не выбрано'
    out.style.display = 'block'
    out.value = text
    out.select()
    try { await navigator.clipboard.writeText(text) } catch {}
  })
  render()
</script>
</body>
</html>
`

await writeFile(outFile, html, 'utf8')

console.log(`✓ Контактный лист: ${outFile}`)
console.log(`  снимков: ${items.length}`)
console.log(`  с аннотацией: ${items.length - missing.length}`)
if (missing.length) console.log(`  ⚠ без строки в INDEX: ${missing.length}`)
if (gaps.length) console.log(`  ⚠ source_gap: ${gaps.length}`)
console.log(`  открой в браузере, отбери ${MIN}–${MAX} и скопируй в .design/refs/picked/`)
