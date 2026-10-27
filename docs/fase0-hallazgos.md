# Fase 0 — Hallazgos

> Ghost PDF Editor · 22 oct 2026. Spikes en [`spikes/`](../spikes), corpus en [`test-fixtures/`](../test-fixtures), investigación completa en [`reports/Tecnologías para editor PDF web.md`](../reports/Tecnologías%20para%20editor%20PDF%20web.md).

## TL;DR

1. **@cantoo/pdf-lib + @cantoo/fontkit, no pdf-lib original.** El subsetting de pdf-lib 1.17.1 con `@pdf-lib/fontkit` pierde glifos (texto ilegible). El fork de Cantoo sale perfecto.
2. **Las fuentes sustitutas métricamente compatibles funcionan muy bien**, siempre que se use la correcta: Carlito sobre Calibri tiene <0.5% de error de ancho y Liberation Sans sobre Arial <1.5%. La fuente equivocada (Carlito sobre Arial) da -13% y se nota. La tabla de equivalencias es obligatoria.
3. **Tapar con un rectángulo funciona en fondos sólidos** (el muestreo de color del canvas es exacto), **falla en degradados** y **deja el texto original extraíble** (privacidad).
4. **PDFium WASM (@embedpdf/pdfium, MIT) borra el texto original de verdad** y da color, fuente y tamaño reales de cada objeto. Es la ruta permisiva hacia la v2/v3 sin AGPL.
5. **Editar un fragmento no basta**: si el texto crece, se encima con lo que sigue en la línea. La unidad de edición tiene que ser la **línea/párrafo completo**, re-acomodando sus fragmentos.

## Corpus

Corpus sintético reproducible: HTML → PDF con Chrome headless. Embebe subconjuntos reales CIDFontType2/Identity-H de Calibri, Arial, Cambria y Times. Los PDFs reales (Word, Google Docs, LaTeX, escaneado, 100+ páginas, cifrado, formulario) siguen pendientes; ver [`test-fixtures/README.md`](../test-fixtures/README.md).

## Spike 1 — Qué da pdf.js (`spike1-dump-text.mjs`, `spike1b-glyph-coverage.mjs`)

pdfjs-dist **6.4.299** (la 6.0 rompió la API: `getDocument` exige un objeto de parámetros).

- **Los fragmentos son razonables con PDFs de Chrome**: casi una línea por item. Pero con texto justificado y acentos se rompe letra por letra (`"p" "á" "rrafos ni l" "ı́"`).
- **Unicode descompuesto:** con `disableNormalization: true` llegan cosas como `ı` + acento combinante en lugar de `í`. Siempre hay que normalizar a NFC antes de comparar o editar.
- **Items vacíos** (`""` con `hasEOL`) mezclados: entre 30 y 50% de los items. Hay que filtrarlos en `core/layout`.
- **No hay color del texto** en `getTextContent()`. Se puede muestrear del canvas (funcionó en el Spike 2) o sacar del operator list / PDFium.
- **`bold`/`italic` vienen `null`**: se deducen del nombre (`AAAAAA+Calibri-Bold`) o del descriptor.
- **Rotación:** con `/Rotate 90`, `transform` sigue en coordenadas sin rotar. Sale correcto si todas las conversiones pasan por `viewport` (→ `core/geometry.ts`).
- **Cobertura de glifos (riesgo #1 confirmado):** con `fontExtraProperties` se obtienen los bytes de la fuente y fontkit los lee. Para `"Hola Adiós ÑQZ¿?€"` a todas les faltan glifos: a Calibri Bold le faltan `AÑQZ¿?€` y a Calibri Italic le falta casi todo. Ojo: es la fuente *convertida* por pdf.js (cmap remapeado a PUA). Para un chequeo fiable hay que leer `/FontFile2` + `/ToUnicode` del PDF original.

## Spike 2 — Tapar + redibujar (`spike2-cover-redraw.mjs`)

Tres ediciones por PDF: más largo, más corto y sobre fondo de color/degradado. Se muestrea el fondo (mediana de un anillo de píxeles alrededor de la caja) y el color del texto (píxel más lejano al fondo). Si no cabe, se reduce el tamaño.

| Prueba | Resultado |
|---|---|
| pdf-lib 1.17.1 + `@pdf-lib/fontkit`, `subset: true` | ❌ **Faltan glifos** en el texto nuevo ([imagen](fase0/spike2-pdflib-subset-roto.png)) |
| pdf-lib 1.17.1, `subset: false` | ⚠️ Se ve bien, pero +560 KB por fuente y un hueco raro en "Soft ware" (ligadura) |
| @cantoo/pdf-lib 2.11.1 + `@pdf-lib/fontkit` | ❌ Truena al hacer subset (su README dice que es compatible; no lo es) |
| **@cantoo/pdf-lib 2.11.1 + @cantoo/fontkit 2.0.12** | ✅ **Perfecto**, +10–17 KB ([CV](fase0/spike2-cantoo-cv.png), [factura](fase0/spike2-cantoo-factura.png)) |
| Carlito sobre Calibri | ✅ Error de ancho 0.2–0.5%: indistinguible a simple vista |
| Liberation Sans sobre Arial | ✅ Error 0.3–1.5%: "FACTURA No. F-2025-0188" idéntica al original |
| Carlito sobre Arial (fuente equivocada) | ❌ Error -13%, se nota ([imagen](fase0/spike2-carlito-sobre-arial.png)) |
| Fondo sólido (blanco, azul, durazno) | ✅ Color exacto, `spread = 0` |
| Fondo degradado | ❌ El rectángulo se nota. El `spread` (232) lo detecta, así que podemos avisar o usar otra estrategia |
| Política "reducir tamaño si no cabe" | ⚠️ Se nota feo (8.4 pt al lado de 11 pt). Preferir usar el espacio libre a la derecha, Tz/Tc moderado, o reflujo |
| Privacidad | ❌ `getTextContent()` del PDF exportado **sigue encontrando "Ingeniero de Software" y "F-2025-0187"** debajo del rectángulo |

Tiempo: 130–520 ms por documento en Node, incluyendo embebido de fuentes.

## Spike 3 — Edición nativa con PDFium WASM (`spike3-pdfium-native.mjs`)

Lo cambiamos por mupdf.js porque la investigación encontró que `@embedpdf/pdfium` (MIT, wasm de 4.6 MB) expone la API de edición de PDFium. mupdf.js es AGPL.

- **Inventario rico:** cada objeto de texto trae la fuente real (`AAAAAA+Calibri-Bold`), el tamaño, el **color de relleno RGBA** y la matriz. pdf.js no da el color.
- **Pero está muy fragmentado:** 782 objetos de texto en una página de CV, a menudo **uno por glifo** (Chrome emite `TJ` con kerning), y con espacios sintéticos. "Ingeniero de Software" = 20 objetos. La edición nativa *también* necesita nuestro agrupamiento en líneas.
- **Variante "reusar fuente original"** (`FPDFText_SetText` sobre el objeto original): se ve nativa, pero la `ft` original era una ligadura y la fuente no tiene `f` ni `t` sueltas, así que salen cuadritos. Además, **el texto nuevo no es extraíble**: PDFium no mapea bien Unicode→CID en fuentes subconjunto (coincide con lo que reporta Stirling-PDF). ([imagen](fase0/spike3-pdfium.png), arriba)
- **Variante "reemplazar"** (borrar los 20 objetos + `FPDFText_LoadFont(Carlito)` + objeto nuevo en la misma matriz/color): ✅ se ve bien, ✅ **el texto viejo desaparece del archivo**, ✅ el nuevo es extraíble. ⚠️ Pesa 57 → 347 KB porque PDFium embebe la fuente completa: hay que pasarle una fuente ya recortada (hb-subset). (imagen, abajo)
- **En ambas**, el texto más largo se encima con " — Compañía…": confirma el hallazgo 5 del TL;DR.
- Velocidad: 74–126 ms.

## Spike 4 — Gemelas de Fontsource en el PDF (`spike4*.mjs`, Fase 4)

- Los **WOFF** de Fontsource se pueden embeber con `@cantoo/pdf-lib` recortados (+3–4 KB por archivo). **WOFF2 truena** al recortar.
- **Sin recortar, pdf-lib mete el WOFF tal cual** y los lectores no lo entienden («loca table not found»): por eso `core/fonts/woff.ts` convierte WOFF → TTF antes.
- Sin recortar, además, se aplican **ligaduras** («fi», «ft») y el texto copiado sale mal («Soħa» por «Sofía»): se embebe con `liga`, `clig` y `dlig` apagadas.
- La raya «–» de Carlito es **más corta** que la de Calibri aunque ocupe el mismo ancho: es el diseño de la gemela (también se ve así en el editor), no un error del recorte.
- Para borrar se usa PDFium, pero para dibujar se usa pdf-lib: PDFium embebe la fuente entera (57 → 347 KB en el Spike 3).
- PDFium deja el contenido viejo de la página como objeto suelto dentro del archivo: hay que recolectarlo (`core/writer/gc.ts`) y guardar sin flujos de objetos para poder verificarlo.

## Decisiones propuestas

| Tema | Propuesta | Estado |
|---|---|---|
| Escritura (v1) | **@cantoo/pdf-lib + @cantoo/fontkit** en lugar de pdf-lib | Recomendado, con evidencia |
| Lectura / render | **pdfjs-dist 6.x** | Recomendado |
| Motor v2/v3 | **@embedpdf/pdfium** detrás de `PdfEngine`, para borrar texto de verdad y leer color/fuente | Spike pasado; adoptarlo en la Fase 4 o en la v2 |
| Fuentes | Tabla de equivalencias métricas (Carlito, Caladea, Liberation, Gelasio…) + chequeo de cobertura con `/ToUnicode` | Recomendado |
| Unidad de edición | **Línea/párrafo**, no fragmento | Recomendado (afecta el modelo `TextBlock`) |
| Texto que no cabe | Espacio libre → Tz/Tc dentro de ~85–110% → reflujo. Reducir el tamaño solo como último recurso | Por definir |
| Fondos no uniformes | Detectar con `spread`; v1 avisa, v2 borra los operadores (PDFium) en lugar de tapar | Recomendado |
| **Licencia del proyecto** | **MIT**: pdf.js + cantoo + PDFium, todo permisivo ([decisión](decisiones/0001-licencia-mit.md)) | ✅ Decidido |

## Pendientes

- [ ] PDFs reales del corpus: los aporta el usuario al llegar a la Fase 2, en `test-fixtures/privado/` (ignorada por git).
- [ ] (Opcional, Fase 4) Mini-spike: hb-subset de Carlito → PDFium `FPDFText_LoadFont`, para confirmar que el peso baja.
