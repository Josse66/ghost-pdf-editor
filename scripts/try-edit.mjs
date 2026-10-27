// Prueba manual guiada de la Fase 3: edita una línea del CV y captura el resultado.
// Requiere el servidor de desarrollo (npm run dev).
import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'

const OUT = '.impeccable/review/edit'
await mkdir(OUT, { recursive: true })
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, locale: 'es-MX' })
const errors = []
page.on('pageerror', (e) => errors.push(e.message))

await page.goto('http://localhost:5173/?fixture=demo&lang=es')
await page.getByRole('figure', { name: 'Página 1', exact: true }).waitFor()
await page.waitForTimeout(1200)

const hit = page.getByRole('button', { name: /^Editar: Ingeniero de Software/ })
await hit.dblclick({ position: { x: 4, y: 6 } })
const editor = page.getByRole('textbox', { name: 'Editando texto del PDF' })
await editor.waitFor()
await page.keyboard.press('Home')
await page.keyboard.press('Control+ArrowRight')
await page.keyboard.press('Backspace')
await page.keyboard.press('Backspace')
await page.keyboard.type('a ')
await page.keyboard.press('Control+ArrowRight')
await page.keyboard.press('Control+ArrowRight')
await page.keyboard.type('Sénior ')
await page.screenshot({
  path: `${OUT}/1-editando.png`,
  clip: { x: 88, y: 56, width: 1000, height: 420 },
})
await page.keyboard.press('Enter')
await page.waitForTimeout(400)
await page.screenshot({ path: `${OUT}/2-confirmado.png` })

const panel = await page.getByRole('complementary').last().innerText()
await page.keyboard.press('Control+z')
await page.waitForTimeout(300)
const afterUndo = await page.getByRole('complementary').last().innerText()
await page.keyboard.press('Control+y')
await page.waitForTimeout(300)
await page.screenshot({
  path: `${OUT}/3-rehecho.png`,
  clip: { x: 88, y: 56, width: 1000, height: 420 },
})

console.log(
  JSON.stringify(
    { errors, panel: panel.slice(0, 300), afterUndo: afterUndo.slice(0, 120) },
    null,
    1,
  ),
)
await browser.close()
