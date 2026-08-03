#!/usr/bin/env node
// Сборщик референсов Ф1. Написан основным циклом после трёх срывов dp-scout
// (остановка, лимит расходов, зависание). Детерминированный, без модели в цикле:
// падает громко, пишет отчёт, не теряет сделанное.
//
// Запуск:  node .design/tools/capture.mjs [--only slug1,slug2] [--list targets.json]

import { chromium } from 'playwright'
import { writeFile, mkdir, readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'

const RAW = path.resolve('.design/refs/raw')
const REPORT = path.resolve('.design/refs/raw/_capture-report.json')

const argv = process.argv.slice(2)
const opt = (n) => { const i = argv.indexOf(`--${n}`); return i !== -1 ? argv[i + 1] : null }
const only = opt('only')?.split(',').map((s) => s.trim())

// Целевые источники по незакрытым source_gap из F1-STATUS.md.
// polus: mat материальность · pal тёплая палитра вне фотонишы · nai наивный вектор
//        axs морфинг глифов · anti анти-полюс
const TARGETS = JSON.parse(await readFile(path.resolve(opt('list') ?? '.design/tools/targets.json'), 'utf8'))

// Баннеры согласия. Порядок важен: сначала «только необходимые», потом «принять».
// По правилу приватности выбираем максимально сберегающий вариант, а не «accept all».
const DENY = [
  'button:has-text("Only necessary")', 'button:has-text("Only essential")',
  'button:has-text("Reject all")', 'button:has-text("Decline")', 'button:has-text("Deny")',
  'button:has-text("Отклонить")', 'button:has-text("Только необходимые")',
  '#onetrust-reject-all-handler', '.cky-btn-reject',
  'button:has-text("Хорошо")', 'button:has-text("Понятно")',
  'button:has-text("Accept")', 'button:has-text("Got it")', 'button:has-text("OK")',
  'button:has-text("I agree")', '#onetrust-accept-btn-handler',
]

async function dismiss(page) {
  for (const sel of DENY) {
    try {
      const el = page.locator(sel).first()
      if (await el.isVisible({ timeout: 250 })) {
        await el.click({ timeout: 1200, force: true })
        await page.waitForTimeout(450)
        return sel
      }
    } catch {}
  }
  return null
}

const report = []
await mkdir(RAW, { recursive: true })

const browser = await chromium.launch()
const list = TARGETS.filter((t) => !only || only.includes(t.slug))
console.log(`Целей: ${list.length}\n`)

for (const t of list) {
  const rec = { slug: t.slug, url: t.url, polus: t.polus, files: [], ok: false, notes: [] }
  for (const vp of [
    { tag: 'd', width: 1440, height: 900 },
    { tag: 'm', width: 390, height: 844 },
  ]) {
    // Мобильный снимаем только там, где он что-то доказывает: интерактив и анти-полюс.
    if (vp.tag === 'm' && !t.mobile) continue
    const ctx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1,
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      locale: t.locale ?? 'en-US',
      reducedMotion: 'no-preference',
    })
    const page = await ctx.newPage()
    try {
      await page.goto(t.url, { waitUntil: 'domcontentloaded', timeout: 45000 })
      try { await page.waitForLoadState('networkidle', { timeout: 12000 }) } catch {}
      const hit = await dismiss(page)
      if (hit) rec.notes.push(`баннер закрыт: ${hit}`)
      await page.waitForTimeout(t.wait ?? 2500)

      // hero — первый экран
      let f = `${t.polus}-${t.slug}--${vp.tag}-hero.png`
      await page.screenshot({ path: path.join(RAW, f) })
      rec.files.push(f)

      // dense — второй экран: там обычно и живёт фактура, а не в герое
      if (vp.tag === 'd') {
        await page.evaluate(() => window.scrollBy(0, Math.round(window.innerHeight * 1.35)))
        await page.waitForTimeout(t.scrollWait ?? 1800)
        f = `${t.polus}-${t.slug}--d-dense.png`
        await page.screenshot({ path: path.join(RAW, f) })
        rec.files.push(f)
      }
      rec.ok = true
    } catch (e) {
      rec.notes.push(`ОШИБКА ${vp.tag}: ${String(e.message).split('\n')[0].slice(0, 160)}`)
    } finally {
      await ctx.close()
    }
  }
  report.push(rec)
  // Пишем отчёт ПОСЛЕ КАЖДОЙ цели: скаут терял манифест целиком при падении.
  await writeFile(REPORT, JSON.stringify(report, null, 1), 'utf8')
  console.log(`${rec.ok ? '✓' : '✗'} ${t.polus}-${t.slug}  ${rec.files.length} файл(ов)  ${rec.notes.join('; ')}`)
}

await browser.close()

const ok = report.filter((r) => r.ok).length
console.log(`\nГотово: ${ok} из ${report.length}. Файлов: ${report.reduce((s, r) => s + r.files.length, 0)}`)
console.log(`Отчёт: ${REPORT}`)
if (ok < report.length) {
  console.log('Не взялись:')
  report.filter((r) => !r.ok).forEach((r) => console.log(`  ${r.slug} — ${r.notes.join('; ')}`))
}
