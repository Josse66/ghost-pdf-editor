import { readFile } from 'node:fs/promises'
import { expect, test } from '@playwright/test'

test('sin documento muestra la lámina para soltar el PDF', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle('Ghost PDF Editor')
  await expect(page.getByRole('heading', { name: 'Abre tu PDF' })).toBeVisible()
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

test('un escaneo avisa a la vista que la página no tiene texto', async ({ page }, testInfo) => {
  await page.goto('/')
  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Elegir PDF' }).click()
  await (await chooser).setFiles('test-fixtures/generated/break-ui/recibo-escaneado.pdf')
  // Un solo aviso por tamaño: en escritorio en la columna de cambios, sin ella arriba de la lámina.
  const note =
    testInfo.project.name === 'chromium'
      ? page.getByRole('complementary').getByRole('note')
      : page.getByRole('figure', { name: 'Página 1', exact: true }).getByRole('note')
  await expect(note).toBeInViewport()
  await expect(page.getByRole('note')).toHaveCount(1)
})

// Fase 3: editar en el lugar, asentar el cambio y deshacerlo.
test('edita una línea, la asienta en Cambios y se deshace', async ({ page }, testInfo) => {
  await page.goto('/')
  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Elegir PDF' }).click()
  await (await chooser).setFiles('test-fixtures/generated/cv-calibri.pdf')

  const hit = page.getByRole('button', { name: /^Editar: Ingeniero de Software/ })
  if (testInfo.project.name === 'android') {
    // En táctil: un toque selecciona y el segundo edita.
    await hit.tap()
    await hit.tap()
  } else {
    await hit.dblclick()
  }
  const editor = page.getByRole('textbox', { name: 'Editando texto del PDF' })
  await expect(editor).toBeFocused()
  await page.keyboard.press('Control+Home')
  await page.keyboard.type('Sr. ')
  await page.keyboard.press('Enter')
  await expect(editor).toBeHidden()

  if (testInfo.project.name === 'chromium') {
    const changes = page.getByRole('complementary').last()
    await expect(changes).toContainText('Sr. Ingeniero de Software')
    await expect(changes).toContainText('Calibri → Carlito')
    await page.keyboard.press('Control+z')
    await expect(changes).not.toContainText('Sr. Ingeniero')
  }
})

// En celular, pellizcar agranda solo el documento; la cabeza se queda donde estaba.
test('pellizcar hace zoom solo en el documento', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'android', 'gesto táctil')
  await page.goto('/')
  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Elegir PDF' }).click()
  await (await chooser).setFiles('test-fixtures/generated/cv-calibri.pdf')

  const sheet = page.getByRole('figure', { name: 'Página 1', exact: true }).locator('[data-sheet]')
  await expect(sheet).toBeVisible()
  const before = (await sheet.boundingBox())!
  const header = (await page.getByRole('banner').boundingBox())!

  // Dos dedos que se separan, a la mitad de la lámina.
  const cdp = await page.context().newCDPSession(page)
  const cx = before.x + before.width / 2
  const cy = before.y + before.height / 3
  const touch = (type: 'touchStart' | 'touchMove' | 'touchEnd', spread: number) =>
    cdp.send('Input.dispatchTouchEvent', {
      type,
      touchPoints:
        type === 'touchEnd'
          ? []
          : [
              { x: cx - spread, y: cy, id: 0 },
              { x: cx + spread, y: cy, id: 1 },
            ],
    })
  await touch('touchStart', 20)
  for (let s = 30; s <= 100; s += 10) await touch('touchMove', s)
  await touch('touchEnd', 100)

  await expect
    .poll(async () => (await sheet.boundingBox())!.width)
    .toBeGreaterThan(before.width * 2)
  // La página no hizo zoom: la cabeza mide lo mismo y el visor se recorre de lado.
  expect((await page.getByRole('banner').boundingBox())!.width).toBe(header.width)
  expect(await page.evaluate('window.visualViewport.scale')).toBe(1)
  const scroller = page.locator('[data-scroll-root]')
  expect(await scroller.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true)
})

// Fase 4: exportar descarga un PDF donde el texto viejo ya no existe y el nuevo sí es texto.
test('exporta el PDF editado y el texto viejo ya no se puede extraer', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'la descarga se prueba una vez')
  await page.goto('/')
  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Elegir PDF' }).click()
  await (await chooser).setFiles('test-fixtures/generated/cv-calibri.pdf')

  const exportButton = page.getByRole('button', { name: 'Exportar PDF' })
  await expect(exportButton).toBeDisabled()

  await page.getByRole('button', { name: /^Editar: Ingeniero de Software/ }).dblclick()
  await page.keyboard.press('Control+Home')
  await page.keyboard.type('Sr. ')
  await page.keyboard.press('Enter')

  const download = page.waitForEvent('download')
  await exportButton.click()
  const file = await download
  expect(file.suggestedFilename()).toBe('cv-calibri-editado.pdf')
  await expect(page.getByRole('complementary').last()).toContainText(
    'Se descargó cv-calibri-editado.pdf.',
  )

  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const bytes = new Uint8Array(await readFile(await file.path()))
  const pdf = await getDocument({ data: bytes }).promise
  const content = await (await pdf.getPage(1)).getTextContent()
  const text = content.items.map((item) => ('str' in item ? item.str : '')).join('')
  expect(text).toContain('Sr. Ingeniero de Software')
  expect(text.replace('Sr. Ingeniero de Software', '')).not.toContain('Ingeniero de Software')
})

// Sin red la primera vez, el motor no baja: el aviso lo explica y Reintentar funciona al volver.
test('sin conexión la primera exportación lo explica y se puede reintentar', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'flujo de red, una vez')
  await page.goto('/')
  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Elegir PDF' }).click()
  await (await chooser).setFiles('test-fixtures/generated/cv-calibri.pdf')
  await page.getByRole('button', { name: /^Editar: Ingeniero de Software/ }).dblclick()
  await page.keyboard.press('End')
  await page.keyboard.type(' ')
  await page.keyboard.press('Enter')

  // El worker pide el wasm desde su propio contexto: se corta a nivel del navegador.
  await page.context().route('**/*.wasm', (route) => route.abort('internetdisconnected'))
  await page.keyboard.press('Control+s')
  const alert = page.getByRole('complementary').last().getByRole('alert')
  await expect(alert).toContainText('No se pudo exportar')
  await expect(alert).toContainText('hace falta conexión')

  await page.context().unroute('**/*.wasm')
  const download = page.waitForEvent('download')
  await alert.getByRole('button', { name: 'Reintentar' }).click()
  expect((await download).suggestedFilename()).toBe('cv-calibri-editado.pdf')
})

// Fase 5: PWA. Después de la primera visita la app abre sin conexión, y se puede instalar.
test('abre sin conexión después de la primera visita', async ({ page, context }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'service worker, una vez')
  await page.goto('/')
  await page.evaluate('navigator.serviceWorker.ready.then(() => true)')
  // La primera carga instala el service worker; desde la segunda, él responde.
  await page.reload()
  await expect.poll(() => page.evaluate('!!navigator.serviceWorker.controller')).toBe(true)

  await context.setOffline(true)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Abre tu PDF' })).toBeVisible()
  await context.setOffline(false)
})

test('el manifiesto permite instalarla con su ícono', async ({ page, request }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'una vez')
  await page.goto('/')
  const href = await page.locator('link[rel="manifest"]').getAttribute('href')
  const manifest = await (await request.get(href!)).json()
  expect(manifest).toMatchObject({ name: 'Ghost PDF Editor', display: 'standalone' })
  for (const icon of manifest.icons as { src: string }[]) {
    expect((await request.get(`/${icon.src}`)).ok()).toBe(true)
  }
})
