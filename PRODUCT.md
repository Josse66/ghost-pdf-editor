# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Vite + React 19 + TypeScript, Tailwind v4 + shadcn/ui, Zustand. Motor: pdfjs-dist 6 (lectura/render), @cantoo/pdf-lib + @cantoo/fontkit (escritura), @embedpdf/pdfium (edición nativa, a partir de la Fase 4). PWA estática en Vercel, sin backend. Decidido en PLAN.md §1 y en la Fase 0 (`docs/fase0-hallazgos.md`).

## Users

Dos perfiles con el mismo peso:

- **Usuario ocasional con urgencia:** necesita corregir algo puntual (un dato del CV, una fecha en una factura, un nombre en un contrato) y quiere terminar rápido. Abre la app de vez en cuando y no va a aprender una herramienta.
- **Usuario frecuente / profesional:** edita PDFs seguido en el trabajo (administración, RH, freelancers) y valora la velocidad, los atajos de teclado y no repetir pasos.

La app tiene que servir al primero sin estorbar al segundo.

## Product Purpose

Editar el texto que **ya existe** en un PDF, directo sobre la página, sin romper el formato, y exportar un PDF donde no se note la edición. Todo pasa en el navegador: el archivo nunca sale del dispositivo. Éxito = el usuario corrige su CV o factura, lo exporta y nadie nota que fue editado.

## Positioning

En 2026 ya existe edición de texto gratuita en el navegador (Stirling-PDF v3, BentoPDF), así que "gratis" no basta. La diferencia de Ghost:

- **Privacidad verificable:** el texto editado se *borra* del archivo, no se tapa con un rectángulo, y hay una prueba automática que lo comprueba. Nada se sube a un servidor.
- **Fidelidad donde más importa:** CVs y facturas hechos en Word y Google Docs (fuentes métricamente compatibles, mismo color y posición).
- **Ligereza:** PWA instalable que funciona offline y se siente bien tanto en celular como en escritorio. Los extras pesados (OCR, IA) son descargas opcionales.
- Gratis, sin marca de agua y de código abierto (MIT).

Fuente: PLAN.md §0 y `reports/Tecnologías para editor PDF web.md`.

## Operating Context

- Documentos típicos: CVs, facturas, contratos y formularios, a menudo con datos personales o sensibles.
- Flujo: abrir un PDF (arrastrar, selector, "Abrir con" o "Compartir" desde otra app en Android) → ver las páginas → tocar o hacer doble clic en un bloque de texto → editar → exportar `original-editado.pdf`.
- Se usa con la misma importancia en **celular** (táctil, pantalla chica, PWA instalada) y en **escritorio** (mouse, teclado, atajos).
- Puede usarse sin conexión.

## Capabilities and Constraints

- **Interfaz bilingüe:** español (idioma base) e inglés, con i18n desde el inicio.
- 100% en el cliente: sin backend, sin cuentas, sin subir archivos.
- v1: editar texto existente y exportar. Roadmap: mover y redimensionar bloques, agregar texto e imágenes, firma, formularios, páginas; redacción real; reflujo de párrafos; OCR para escaneados.
- Límites conocidos que la app debe comunicar con honestidad: fuente sustituta cuando el PDF no trae los glifos (p. ej. Aptos no tiene clon libre), fondos no uniformes, PDFs escaneados (sin texto), cifrados y firmados (editar invalida la firma).
- Rendimiento: PDFs de 100+ páginas en un Android de gama media.
- Decisiones aún abiertas (ver PLAN.md §9): borrado real de los glifos en el MVP, política de texto que no cabe, si iOS Safari es plataforma de primera clase, presupuesto de paquetes de IA.

## Brand Commitments

- Nombre: **Ghost PDF Editor**.
- Código abierto bajo licencia MIT, repo público.
- Todavía no hay logo, voz definida ni identidad visual.

## Evidence on Hand

- Corpus sintético de prueba en `test-fixtures/generated/`; los PDFs reales del usuario van en `test-fixtures/privado/` (ignorada por git).
- Evidencia técnica de fidelidad: imágenes de antes y después en `docs/fase0/`.
- **No hay** usuarios, testimonios, métricas de uso, benchmarks públicos ni precios. No inventarlos.

## Product Principles

1. **Que no se note.** La edición debe ser invisible en el PDF exportado; la fidelidad le gana a las funciones extra.
2. **Privacidad que se puede comprobar.** El archivo no sale del dispositivo, y lo borrado desaparece de verdad del archivo.
3. **Honestidad cuando no se puede.** Si la fuente se sustituye, el fondo no es uniforme o el PDF es escaneado, se avisa claro antes de exportar, nunca en silencio.
4. **Rápido para quien viene una vez, ágil para quien viene diario.** Cero curva de aprendizaje para lo básico; atajos y flujo continuo para el uso frecuente.
5. **Ligero por defecto.** El núcleo carga rápido en un celular; lo pesado se descarga solo cuando se pide.
