// Peores casos realistas para el visor (break-ui). Se generan; no se versionan.
// Uso: npm run fixtures:break  → test-fixtures/generated/break-ui/
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import { PDFDocument, PageSizes, StandardFonts } from '@cantoo/pdf-lib'

const SRC = 'test-fixtures/generated'
const OUT = `${SRC}/break-ui`
await mkdir(OUT, { recursive: true })

// Nombre largo y sin espacios, como los que se exportan de un portal de RH o se guardan "final(3)".
await copyFile(
  `${SRC}/cv-calibri.pdf`,
  `${OUT}/CV_Aleksandra-Wisniewska-Kowalczyk_Desarrolladora-Full-Stack_Northwind-Industries-Holdings_2026-10-26_version-final-FINAL(3).pdf`,
)

// Archivo de 0 bytes: una descarga que falló a medias.
await writeFile(`${OUT}/factura-marzo.pdf`, new Uint8Array())

// Cabecera de PDF y luego nada útil: un adjunto de correo truncado.
const cv = await readFile(`${SRC}/cv-calibri.pdf`)
await writeFile(`${OUT}/contrato-truncado.pdf`, cv.subarray(0, 2048))

// Una foto renombrada a .pdf.
await copyFile('docs/fase0/spike2-cantoo-cv.png', `${OUT}/ine-escaneada.pdf`)

// PDF escaneado: solo una imagen de la página, sin capa de texto.
{
  const doc = await PDFDocument.create()
  const png = await doc.embedPng(await readFile('docs/fase0/spike2-cantoo-factura.png'))
  const page = doc.addPage(PageSizes.Letter)
  const { width, height } = page.getSize()
  const s = Math.min(width / png.width, height / png.height)
  page.drawImage(png, {
    x: 0,
    y: height - png.height * s,
    width: png.width * s,
    height: png.height * s,
  })
  await writeFile(`${OUT}/recibo-escaneado.pdf`, await doc.save())
}

// Protegido con contraseña (contraseña de prueba: "ghost").
{
  const doc = await PDFDocument.load(cv)
  doc.encrypt({ userPassword: 'ghost', ownerPassword: 'ghost-owner' })
  await writeFile(`${OUT}/estado-de-cuenta-protegido.pdf`, await doc.save())
}

// Tamaños mezclados: carta, A4, una apaisada ancha y un ticket angosto.
{
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  for (const [label, size] of [
    ['Carta', PageSizes.Letter],
    ['A4', PageSizes.A4],
    ['Tabloide apaisado', [1224, 792]],
    ['Ticket 80 mm', [227, 600]],
  ]) {
    const page = doc.addPage(size)
    page.drawText(`${label} · ${size[0]} × ${size[1]} pt`, {
      x: 24,
      y: size[1] - 48,
      size: 14,
      font,
    })
  }
  await writeFile(`${OUT}/tamanos-mixtos.pdf`, await doc.save())
}

console.log(`listo: ${OUT}`)
