// Recorre los peores casos de break-ui en varios anchos y guarda capturas + datos.
// Requiere: npm run dev, npm run fixtures:long y npm run fixtures:break.
import { chromium } from 'playwright'
import { mkdir, writeFile } from 'node:fs/promises'

const OUT = '.impeccable/review/break'
await mkdir(OUT, { recursive: true })
const cases = (
  process.argv[2] ?? 'demo,long-name,300,mixed,rotated,scanned,empty,truncated,not-pdf,password'
).split(',')
const sizes = [
  ['desktop', { width: 1440, height: 900 }, 1],
  ['zoom200', { width: 720, height: 450 }, 2],
  ['mobile', { width: 390, height: 844 }, 3],
  ['w320', { width: 320, height: 640 }, 2],
]
const lang = process.argv[3] ?? 'es'

const browser = await chromium.launch()
const report = []
for (const id of cases) {
  for (const [name, viewport, deviceScaleFactor] of sizes) {
    const ctx = await browser.newContext({ viewport, deviceScaleFactor, locale: 'es-MX' })
    const page = await ctx.newPage()
    const errors = []
    page.on('pageerror', (e) => errors.push(e.message))
    const t0 = Date.now()
    await page.goto(`http://localhost:5173/?fixture=${id}&lang=${lang}`)
    await page
      .locator('figure[data-page="1"], [role="alert"]')
      .first()
      .waitFor({ timeout: 90000 })
      .catch(() => {})
    await page.waitForTimeout(1200)
    const info = await page.evaluate(() => ({
      overflowX: document.documentElement.scrollWidth > innerWidth,
      header: document.querySelector('header')?.innerText.replace(/\n/g, ' | '),
      alert: document.querySelector('[role="alert"]')?.innerText.replace(/\n/g, ' | ') ?? null,
      tabs: document.querySelectorAll('nav[aria-label] button').length,
      canvases: [...document.querySelectorAll('canvas')].filter((c) => c.width > 0).length,
      figures: document.querySelectorAll('figure[data-page]').length,
    }))
    await page.screenshot({ path: `${OUT}/${id}-${name}.png` })
    report.push({ id, name, ms: Date.now() - t0, errors, ...info })
    await ctx.close()
  }
}
await browser.close()
await writeFile(`${OUT}/report.json`, JSON.stringify(report, null, 2))
for (const r of report)
  console.log(
    `${r.id.padEnd(10)} ${r.name.padEnd(8)} ${String(r.ms).padStart(6)}ms overflowX=${r.overflowX} figs=${r.figures} canvas=${r.canvases} tabs=${r.tabs} alert=${r.alert ?? '-'} errors=${r.errors.length}`,
  )
