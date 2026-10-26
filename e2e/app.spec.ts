import { expect, test } from '@playwright/test'

test('sin documento muestra la lámina para soltar el PDF', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle('Ghost PDF Editor')
  await expect(page.getByRole('heading', { name: 'Suelta tu PDF aquí' })).toBeVisible()
  await expect(page.getByText('Tu PDF nunca sale de este dispositivo.')).toBeVisible()
})

test('abre un PDF y muestra sus páginas con palabras guía', async ({ page }, testInfo) => {
  await page.goto('/')
  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Elegir PDF' }).click()
  await (await chooser).setFiles('test-fixtures/generated/cv-calibri.pdf')

  await expect(page.getByRole('figure', { name: 'Página 1', exact: true })).toBeVisible()
  if (testInfo.project.name === 'chromium') {
    await expect(page.getByText('Página 1', { exact: true }).first()).toBeVisible()
    await expect(page.getByRole('navigation', { name: 'Índice de páginas' })).toBeVisible()
  }
})

test('avisa cuando el archivo no es un PDF', async ({ page }) => {
  await page.goto('/')
  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Elegir PDF' }).click()
  await (
    await chooser
  ).setFiles({ name: 'notas.txt', mimeType: 'text/plain', buffer: Buffer.from('hola') })

  await expect(page.getByRole('alert')).toContainText('Ese archivo no es un PDF.')
  await expect(page.getByRole('button', { name: 'Elegir otro PDF' })).toBeVisible()
})

// Regresiones de break-ui (los PDFs salen de: npm run fixtures:break).
test('un archivo de 0 bytes se explica como vacío, no como "no es PDF"', async ({ page }) => {
  await page.goto('/')
  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Elegir PDF' }).click()
  await (
    await chooser
  ).setFiles({ name: 'factura-marzo.pdf', mimeType: 'application/pdf', buffer: Buffer.alloc(0) })
  await expect(page.getByRole('alert')).toContainText('El archivo está vacío')
})

test('un PDF con contraseña avisa que está cifrado', async ({ page }) => {
  await page.goto('/')
  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Elegir PDF' }).click()
  await (await chooser).setFiles('test-fixtures/generated/break-ui/estado-de-cuenta-protegido.pdf')
  await expect(page.getByRole('alert')).toContainText('protegido con contraseña')
})

test('a 320 px el error con nombre largo cabe dentro de la lámina', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 })
  await page.goto('/')
  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Elegir PDF' }).click()
  await (
    await chooser
  ).setFiles({
    name: 'estado-de-cuenta-protegido-banco-del-norte-2026.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.alloc(0),
  })
  const alert = page.getByRole('alert')
  await expect(alert).toBeVisible()
  const plate = alert.locator('xpath=ancestor::div[contains(@class,"bg-white")]')
  const [a, p] = [await alert.boundingBox(), await plate.boundingBox()]
  expect(a!.x + a!.width).toBeLessThanOrEqual(p!.x + p!.width + 0.5)
  expect(p!.x + p!.width).toBeLessThanOrEqual(320)
})

test('un escaneo avisa arriba de la página que no tiene texto', async ({ page }) => {
  await page.goto('/')
  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Elegir PDF' }).click()
  await (await chooser).setFiles('test-fixtures/generated/break-ui/recibo-escaneado.pdf')
  const note = page.getByRole('figure', { name: 'Página 1', exact: true }).getByRole('note')
  await expect(note).toBeInViewport()
})
