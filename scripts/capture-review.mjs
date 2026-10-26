// Capturas de revisión del espacio de trabajo (escritorio y celular, vacío y con PDF).
// Requiere el servidor de desarrollo corriendo: npm run dev, luego npm run review:capture [pdf] [modo]
import { chromium, devices } from 'playwright'
import { mkdir } from 'node:fs/promises'

const BASE = 'http://localhost:5173'
const OUT = '.impeccable/review'
const FIXTURE = process.argv[2] ?? 'test-fixtures/generated/cv-calibri.pdf'
const debugMode = process.argv[3] ?? 'Párrafos'
await mkdir(OUT, { recursive: true })

const browser = await chromium.launch()
for (const [name, opts] of [
  ['desktop', { viewport: { width: 1440, height: 900 } }],
  ['mobile', { ...devices['Pixel 7'] }],
]) {
  const ctx = await browser.newContext({ ...opts, locale: 'es-MX' })
  const page = await ctx.newPage()
  await page.goto(BASE)
  await page.waitForTimeout(600)
  await page.screenshot({ path: `${OUT}/${name}-empty.png` })
  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Elegir PDF' }).click()
  await (await chooser).setFiles(FIXTURE)
  await page.getByRole('figure', { name: 'Página 1', exact: true }).waitFor()
  await page.waitForTimeout(1200)
  await page.screenshot({ path: `${OUT}/${name}.png` })
  if (name === 'desktop') {
    await page.getByText(debugMode, { exact: true }).click()
    await page.waitForTimeout(800)
    await page.screenshot({ path: `${OUT}/${name}-debug.png` })
  }
  await ctx.close()
}
await browser.close()
console.log('ok')
