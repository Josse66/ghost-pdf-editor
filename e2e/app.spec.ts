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
