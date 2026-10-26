# Ghost PDF Editor debe borrar glifos, no taparlos

> **Nota posterior (22 oct 2026), cruzada con los spikes de [`docs/fase0-hallazgos.md`](../docs/fase0-hallazgos.md):**
> - **Corrección:** donde este reporte dice "@cantoo/pdf-lib + @pdf-lib/fontkit", en realidad debe usarse **@cantoo/fontkit**. Con `@pdf-lib/fontkit` el subset de cantoo truena (Spike 2).
> - El spike de **@embedpdf/pdfium** ya se hizo (Spike 3): elimina el texto de verdad y lee color/fuente reales. Confirma el aviso de Stirling: reusar la fuente original con `FPDFText_SetText` deja el texto no extraíble y rompe ligaduras. Falta la comparación contra un tokenizer propio.
> - **Licencia decidida: MIT** ([decisión 0001](../docs/decisiones/0001-licencia-mit.md)).

El método base del plan (tapar con un rectángulo y redibujar) quedó obsoleto en 2026: es justo lo que hacen dos de los tres repos de referencia, gafapa/pdfedit y Aicrag2310/PDFBlack, proyectos de 0 estrellas generados con agentes y sin una licencia que permita copiarlos, y falla en fondos de color además de dejar el texto original seleccionable y extraíble debajo, lo que contradice el argumento de privacidad del producto. Entre agosto y septiembre de 2026 los dos editores open source más grandes que corren en el navegador, BentoPDF v2.8.8 (AGPL) y Stirling-PDF v3 (núcleo MIT), convergieron en PDFium compilado a WASM para editar objetos de texto reales, y rihaPDF demostró que el stack exacto del plan (pdf.js + pdf-lib + fontkit + harfbuzzjs) también puede eliminar los glifos originales del content stream; de paso, la premisa de PLAN.md de que "lo gratis solo te deja anotar encima" ya no es cierta. En motores, pdfjs-dist 6.4.299 sigue siendo la mejor base de render y capa de texto, el pdf-lib original no publica desde 2021 y conviene reemplazarlo ya por @cantoo/pdf-lib 2.11.1, y el spike prioritario es @embedpdf/pdfium 2.15.1 (MIT, 4.6 MB de WASM), que edita objetos de texto y hace redacción real bajo licencia permisiva, mientras mupdf.js 1.28.1 tiene el modelo de texto más rico pero es AGPL y pesa 10.4 MB. En fuentes nadie, ni Acrobat ni Nutrient, resolvió el subconjunto: lo correcto es verificar si la fuente embebida cubre los glifos nuevos y reutilizarla cuando alcanza, sustituir el run completo por un clon métrico (Carlito, Caladea, Gelasio, Croscore) cuando no, y ajustar el ancho con Tz/Tc, sabiendo que Aptos, la fuente por defecto de Office desde 2023, no tiene clon libre. En plataforma rinden más la virtualización de páginas, OPFS, vite-plugin-pwa y Vitest 4 en modo navegador que WebGPU o los hilos WASM, y la IA local conviene como paquetes opcionales posteriores (PaddleOCR.js para escaneados, MI-GAN para fondos raster, un LLM chico para "acortar para que quepa"). La recomendación operativa es **adelantar la eliminación real de glifos al MVP (Fase 4), decidir el motor con un spike comparativo en Fase 0 y elegir MIT**, salvo que quieras mupdf.js o copiar código de BentoPDF, en cuyo caso AGPL es la única vía sin pagar.

**Convenciones.** En las tablas, los riesgos del plan se abrevian así:

| Código | Riesgo |
|---|---|
| R1 | Fuentes subconjunto sin glifos nuevos |
| R2 | Agrupar fragmentos en líneas y párrafos |
| R3 | Tapar el original en fondos de color |
| R4 | Texto más largo que el original |
| R5 | Coordenadas y rotación |
| R6 | PDFs escaneados |
| R7 | Rendimiento con 100+ páginas |
| R8 | Texto tapado que sigue extraíble (privacidad) |

Las fases son F0 (spikes), F1 (setup), F2 (motor de lectura), F3 (capa de edición), F4 (exportación, MVP), F5 (pulido y PWA) y F6+ (roadmap: v2 redacción real y mover bloques, v3 edición nativa y reflujo, v4 OCR). Los pesos son bytes sin comprimir tomados de npm y jsDelivr; no se midió ningún tamaño brotli. "Sin verificar" señala datos que salen del conocimiento previo de los investigadores y no de una fuente consultada, y hay que confirmarlos antes de decidir.

## El campo abandonó "tapar y redibujar" durante 2026

### Los tres repos de referencia existen, pero ninguno sirve como dependencia

Los tres repos que el plan pedía verificar existen, y los tres son proyectos individuales de 2026, con 0 estrellas y escritos en buena parte por agentes de código. **gafapa/pdfedit** tiene 6 commits entre marzo y abril de 2026, co-firmados por "Claude Sonnet 4.6", y usa React 18, Vite 5, pdfjs-dist 4.4 y pdf-lib 1.17.1 sin fontkit ([GitHub API](https://api.github.com/repos/gafapa/pdfedit)). Su exportador asigna a cada bloque una de las 12 fuentes estándar de PDF según si "parece" serif, sans o mono, y tapa el original con un rectángulo **siempre blanco** de `origWidth+2 × fontSize*1.35+2`; en un fondo de color eso se ve, y los glifos originales siguen en el content stream, seleccionables y buscables ([pdfExporter.js](https://raw.githubusercontent.com/gafapa/pdfedit/main/src/utils/pdfExporter.js)). El README dice "MIT", pero no hay archivo LICENSE ([README](https://raw.githubusercontent.com/gafapa/pdfedit/main/README.md)), así que no conviene copiar código.

**Aicrag2310/PDFBlack** (septiembre de 2026, unos 11 commits, Electron + Vercel) no declara licencia y su `package.json` dice `"private": true`, lo que legalmente equivale a todos los derechos reservados ([package.json](https://raw.githubusercontent.com/Aicrag2310/PDFBlack/main/package.json)). Usa la misma técnica de tapar y redibujar, pero aporta dos ideas útiles. La primera es que **muestrea el color de fondo** en varios puntos del canvas por cada bloque, con respaldo en el color de la página y, al final, blanco. La segunda es que **intenta reutilizar la fuente embebida**: la lee de `page.commonObjs` después de `getOperatorList()`, la re-embebe con `embedFont(bytes, {subset:true})` y comprueba con `encodeText()` si cubre el texto nuevo antes de caer a una fuente estándar ([pdfExporter.js](https://raw.githubusercontent.com/Aicrag2310/PDFBlack/main/src/lib/pdfExporter.js)). Su debilidad es que estima los anchos con una tabla heurística de "peso por carácter" en vez de métricas reales ([pdfTextLayout.js](https://raw.githubusercontent.com/Aicrag2310/PDFBlack/main/src/lib/pdfTextLayout.js)). Hay además un matiz: lo que pdf.js guarda en `commonObjs` es su fuente *convertida* a OpenType para el navegador, no el programa original, así que el reuso solo es fiel cuando el subconjunto ya contiene todos los glifos.

**ennkaos/pdfFlow-Engine** es el único técnicamente interesante y también el más delicado de tocar. Tiene un solo commit, del 9 de julio de 2026 (co-autor "Cursor"), `pdfflow-engine@0.1.0` en npm nunca se actualizó, y su licencia es **AGPL-3.0** ([GitHub API](https://api.github.com/repos/ennkaos/pdfFlow-Engine), [LICENSE](https://raw.githubusercontent.com/ennkaos/pdfFlow-Engine/main/LICENSE)). Implementa desde cero, en TypeScript, un parser COS, filtros, cifrado, un intérprete de content streams y módulos de fuentes, y pasa cada bloque por `predictBlockApply()`, que elige entre `native-in-place`, `native-move`, `native-insert`, `native-flatten` y `overlay`. El modo nativo reescribe `Tj`/`TJ` conservando la fuente original; el overlay se activa cuando el texto tiene saltos de línea, cambia familia, peso, tamaño o color, contiene un carácter que la fuente no puede codificar, fusiona varios segmentos o se movió ([README](https://raw.githubusercontent.com/ennkaos/pdfFlow-Engine/main/README.md)). La lección es que la edición "nativa" solo funciona para cambios de una línea, mismo estilo y glifos presentes, y que todo lo demás necesita un plan B; el propio README admite que tablas y multicolumna se fusionan mal. pdfFlow escribe además con actualizaciones incrementales, y por cómo funcionan (se añaden objetos al final del archivo sin eliminar los anteriores) el content stream original con el texto "borrado" seguiría dentro de los bytes del PDF. Es una inferencia sobre el formato, no algo que el repo documente, pero ataca directamente R8 y debe convertirse en una prueba automática.

### Stirling y BentoPDF tardaron meses en converger en PDFium-WASM

**Stirling-PDF** (94.7k estrellas, v3.2.1 del 21 de octubre de 2026) es la referencia más importante. Su primer editor de texto, v2.1.0 de diciembre de 2025, era del lado servidor con PDFBox y un modelo JSON intermedio, y se presentó como "alpha" ([v2.1.0](https://github.com/Stirling-Tools/Stirling-PDF/releases/tag/v2.1.0)). Los usuarios reportaron que "messes up the fonts", espacios aleatorios entre palabras, párrafos superpuestos, documentos de 300+ páginas sin scroll y guardados fallidos ([Discussion #5222](https://github.com/Stirling-Tools/Stirling-PDF/discussions/5222)). La v3.0.0 del 24 de septiembre de 2026 salió de alpha con un editor nuevo que corre **en el cliente sobre PDFium-WASM vía EmbedPDF**, ubicado en `frontend/src/editor/core/`, dentro de la porción MIT de la licencia ([árbol del repo](https://api.github.com/repos/Stirling-Tools/Stirling-PDF/git/trees/main?recursive=1), [LICENSE](https://raw.githubusercontent.com/Stirling-Tools/Stirling-PDF/main/LICENSE)); v3.1.0 agregó tablas y edición de escaneados con OCR, y v3.2.0 redujo memoria ([releases](https://github.com/Stirling-Tools/Stirling-PDF/releases)). El proyecto open source con más recursos necesitó unos diez meses para pasar de "fuentes rotas" a algo usable.

De Stirling importan tres detalles técnicos. Primero, escribe texto nuevo en la fuente original con **charcodes crudos** mediante `FPDFText_SetCharcodes`, porque la búsqueda inversa Unicode→CID de PDFium "está rota" para subconjuntos embebidos; para calcular esos charcodes llama a un endpoint de servidor con PDFBox, que también reporta qué caracteres faltan para caer a Helvetica carácter por carácter ([PdfTextEditorCharcodeController.java](https://raw.githubusercontent.com/Stirling-Tools/Stirling-PDF/main/app/core/src/main/java/stirling/software/SPDF/controller/api/PdfTextEditorCharcodeController.java)). Ghost puede construir ese mapa inverso en el cliente a partir del `ToUnicode` del PDF, sin servidor. Segundo, PDFium-WASM hacía más de 6,000 pares malloc/free por pasada de render en páginas con cientos de runs, y lo resolvieron con una arena de memoria reutilizable ([PR #8099](https://github.com/Stirling-Tools/Stirling-PDF/pull/8099)). Tercero, sus pruebas E2E (`caret-drift`, `cross-font-charcode`, `type3`, `rotated-text`, `letter-spacing`, `reflow-justified`, `clip-path`, `cropbox`, `pattern-fill`, `tagged-structure`, `signed-save`, `fix-mixed-fontsize`, `mushroom-spaces`, `scanned-ocr`, `hidpi`) y su lista de regresiones forman una **checklist de QA gratis**. Esas regresiones incluyen un run de una línea que se sale del borde de la página, un párrafo entero re-emitido que pierde sus fuentes originales al teclear texto no latino, tofu "ÿ" con las fuentes base-14 y emoji que se rompen al guardar ([árbol](https://api.github.com/repos/Stirling-Tools/Stirling-PDF/git/trees/main?recursive=1), [known-issues spec](https://raw.githubusercontent.com/Stirling-Tools/Stirling-PDF/main/frontend/src/editor/core/tests/stubbed/pdf-text-editor-known-issues.spec.ts)). Aun así, su documentación advierte que "fonts and layout can shift slightly" ([docs de Stirling](https://docs.stirlingpdf.com/Tools/Guides/Content-Editing/)).

**BentoPDF** (16.1k estrellas, AGPL-3.0, 100% navegador) agregó edición real en v2.8.8, el 29 de agosto de 2026: clic en un párrafo, reflujo en vivo, justificado, listas, RTL y buscar/reemplazar. Su autor la llamó "arguably the hardest feature I had built so far" y aclaró que el acceso a fuentes locales solo funciona en Chromium ([v2.8.8](https://github.com/alam00000/bentopdf/releases/tag/v2.8.8)). Por dentro usa un build propio de PDFium (`editcore.wasm`), módulos JS de "cirugía" de content streams como `streamsplice.js`, que divide los operandos `Tj`/`TJ` en ranuras de charcode, y una función `sfntCovers()` que verifica si el cmap de una fuente embebida cubre los codepoints necesarios ([engine-loader.js](https://raw.githubusercontent.com/alam00000/bentopdf/main/src/js/editcore/engine-loader.js), [streamsplice.js](https://raw.githubusercontent.com/alam00000/bentopdf/main/src/js/editcore/streamsplice.js)). Su `package.json` arrastra además qpdf-wasm, PyMuPDF-wasm, Ghostscript-wasm y LibreOffice-wasm ([package.json](https://raw.githubusercontent.com/alam00000/bentopdf/main/package.json)). Gana potencia a cambio de peso, y ese es el hueco que puede ocupar una PWA ligera pensada para móvil.

### El resto del mapa confirma la tendencia

EmbedPDF (Apache-2.0, con `@embedpdf/pdfium` publicado como MIT) es el motor sobre el que construyen Stirling y Bento; ofrece redacción real que elimina contenido, pero no documenta un plugin público para editar texto existente ([LICENSE](https://raw.githubusercontent.com/embedpdf/embed-pdf-viewer/main/LICENSE), [releases](https://github.com/embedpdf/embed-pdf-viewer/releases)). **rihaPDF** (Apache-2.0) usa exactamente pdf.js 5 + pdf-lib + fontkit + harfbuzzjs + bidi-js + Lexical y afirma que "original glyphs are removed from the content stream, not whited out" ([README](https://raw.githubusercontent.com/yashau/rihaPDF/HEAD/README.md)): es la prueba de que el stack del plan puede borrar en vez de tapar. **Tintenfisch** (MIT, motor Rust→WASM creado el 19 de octubre de 2026) edita content streams con reflujo y, para letras que el PDF no trae, **ofrece descargar una fuente abierta parecida tras pedir permiso**, con Liberation integrada ([README](https://raw.githubusercontent.com/ArifKobel/Tintenfisch/HEAD/README.md)). PdfZero (MIT) repite la familia overlay con "AI font matching" ([README](https://raw.githubusercontent.com/bevinkatti/PdfZero/HEAD/README.md)), y PdfCraft reporta "0 crashes" sobre el corpus de 983 archivos de pdf.js, un buen indicio de que ese corpus sirve como benchmark de robustez ([README](https://raw.githubusercontent.com/storytold/pdfcraft/HEAD/README.md)). pdf.js, por su parte, sigue sin editar texto existente: todo lo añadido entre v5.0 y v6.4 son anotaciones y operaciones de documento ([releases de pdf.js](https://github.com/mozilla/pdf.js/releases)).

Los comerciales tampoco resolvieron el problema de fondo. Apryse edita en el cliente con WASM pero vende "PDF Editing" como add-on de pago ([Apryse](https://docs.apryse.com/web/edit-page-content/text-edit.md)). Nutrient admite que en subconjuntos "edits that add new characters may render with a fallback face" y expone `getSubsetFonts()` y un callback `contentEditingFontMatcher` para elegir el reemplazo ([Nutrient 1.9](https://www.nutrient.io/guides/web/release-notes/1-9/)). Acrobat cae a una fuente por defecto como Minion Pro ([Adobe](https://helpx.adobe.com/acrobat/current/default-font-pdf-editing-add-text.html)), LibreOffice Draw exige tener instaladas todas las fuentes y parte el texto en una caja por línea ([Ask LibreOffice](https://ask.libreoffice.org/t/libre-draw-pdf-import/28989)), y Sejda no edita texto en escaneados ([reseña de UPDF](https://updf.com/edit-pdf/arabic-pdf-editor-online/)). Como resumen un par de hilos de Hacker News, en un PDF una "A" almacenada puede significar "#" por el remapeo de subconjuntos, y no existe la noción de "bloque de texto con ajuste de línea" ([HN 44295237](https://news.ycombinator.com/item?id=44295237), [HN 23366532](https://news.ycombinator.com/item?id=23366532)).

| Proyecto | Técnica | Licencia | Estado (oct 2026) | Qué tomar |
|---|---|---|---|---|
| gafapa/pdfedit | pdf.js + pdf-lib; rectángulo blanco + 12 fuentes estándar | Sin LICENSE (README dice MIT) | 6 commits, 0★ | Nada: anti-ejemplo |
| Aicrag2310/PDFBlack | Tapar y redibujar; muestreo de fondo; reuso de fuente desde `commonObjs` | Sin licencia | ~11 commits, 0★ | Ideas: muestreo multipunto, chequeo de cobertura |
| ennkaos/pdfFlow-Engine | Parser propio; `Tj`/`TJ` in situ + overlay de respaldo | AGPL-3.0 | 1 commit, sin mantenimiento | Idea del enrutador de dos niveles, reimplementada |
| Stirling-PDF v3 | PDFium-WASM (EmbedPDF), charcodes, Noto de respaldo | MIT en el núcleo del editor | 94.7k★, muy activo | Código de referencia legal y checklist de QA |
| BentoPDF v2.8.8+ | PDFium-WASM propio + cirugía de streams + reflujo | AGPL-3.0 | 16.1k★ | Solo ideas, salvo que Ghost sea AGPL |
| EmbedPDF | Visor PDFium-WASM, redacción real | Apache-2.0 / MIT (pdfium) | 4.6k★, v3-next | El motor `@embedpdf/pdfium` |
| rihaPDF | Stack del plan + harfbuzzjs; borra glifos | Apache-2.0 | 4★ | Prueba de factibilidad de la vía propia |
| Tintenfisch | Rust→WASM; descarga fuentes con consentimiento | MIT | 8★, 3 días de vida | Patrón de UX para fuentes faltantes |
| pdf.js (editor) | Solo anotaciones | Apache-2.0 | v6.4.299 | No edita texto existente |
| Apryse / Nutrient | WASM en cliente, add-on de pago, fuente de respaldo | Comercial | — | Patrón `fontMatcher` / `getSubsetFonts` |

El resultado son dos arquitecturas viables. La vía (a) es pdf.js + pdf-lib + un tokenizer propio que elimina o reescribe `Tj`/`TJ`, como rihaPDF y pdfFlow. La vía (b) es PDFium-WASM para manipular objetos de texto, como Stirling v3 y BentoPDF. Lo que no es viable para un producto que vende privacidad es el rectángulo blanco como estrategia principal. Del resto se pueden tomar ideas sin problemas legales: el enrutador de dos niveles reimplementado desde la especificación, el muestreo multipunto de fondo, el chequeo de cobertura, la escritura por charcodes, pedir consentimiento antes de descargar una fuente y la checklist de Stirling.

## pdf.js sigue leyendo, pdf-lib original murió y PDFium es la vía permisiva para editar

### pdf.js: la mejor base de lectura, pero sin color ni nombre real de fuente

pdfjs-dist está en **6.4.299 (3 de octubre de 2026)**, con licencia Apache-2.0, unos 20.45 millones de descargas semanales y releases casi mensuales ([npm](https://registry.npmjs.org/pdfjs-dist), [descargas](https://api.npmjs.org/downloads/point/last-week/pdfjs-dist)). Pesa 459 KB el módulo principal y 1.26 MB el worker, más WASM opcionales: openjpeg 251 KB, jbig2 104 KB, qcms 97 KB y quickjs 469 KB para scripting ([jsDelivr](https://data.jsdelivr.com/v1/packages/npm/pdfjs-dist@6.4.299?structure=flat)). La 6.0 rompió la API (`getDocument` exige un objeto de parámetros, se eliminó `PDFDocumentProxy.destroy` y el worker ya no empaqueta código DOM), y la 6.4 expone el `operatorList` al callback `operationsFilter` ([releases](https://github.com/mozilla/pdf.js/releases)). Los fragmentos de gafapa y PDFBlack, escritos para la 4.x, requieren migración.

El hallazgo que más afecta a F2 es que **`getTextContent` no entrega color ni el nombre real de la fuente**. Cada item trae `str`, `dir`, `transform`, `width`, `height`, `fontName` (el nombre de la fuente *convertida* por pdf.js) y `hasEOL`, y los estilos solo traen `ascent`, `descent`, `vertical` y `fontFamily` ([api.d.ts](https://cdn.jsdelivr.net/npm/pdfjs-dist@6.4.299/types/src/display/api.d.ts)). El `TextBlock` del plan, con `color` y `fontName: "ABCDEF+Calibri-Bold"`, no sale de ahí: hay que recorrer `getOperatorList()` siguiendo `setFont` y `setFillRGBColor`, o leer las fuentes con pdf-lib. Además, `commonObjs` está tipado solo como `PDFObjects` y el acceso a fuentes no está documentado ([API docs](https://mozilla.github.io/pdf.js/api/draft/module-pdfjsLib-PDFPageProxy.html)), así que el Spike 1 debería volcar también el operator list.

### pdf-lib: el original está abandonado y @cantoo es el reemplazo directo

El pdf-lib original sigue en **1.17.1, del 6 de noviembre de 2021**, aunque aún acumula 11.47 millones de descargas semanales ([npm](https://registry.npmjs.org/pdf-lib)). **@cantoo/pdf-lib 2.11.1 (15 de septiembre de 2026)** es el fork activo, con licencia MIT, seis mantenedores y unas 846k descargas semanales ([npm](https://registry.npmjs.org/@cantoo%2Fpdf-lib)). Mantiene la API de pdf-lib y agrega cifrado AES-256 y descifrado, `extractContents()`, actualizaciones incrementales, recuperación de PDFs truncados y utilidades PDF/A ([README](https://github.com/cantoo-scribe/pdf-lib)). Eso cierra la decisión de F0 entre pdf-lib y el fork, y de paso cubre los PDFs cifrados (riesgo 8 del plan). Como alternativas quedan @pdfme/pdf-lib 6.2.8, un plan B atado al roadmap de pdfme ([npm](https://registry.npmjs.org/@pdfme%2Fpdf-lib)), y @libpdf/core 0.5.3, una beta MIT de Documenso con recuperación por fuerza bruta, guardado incremental, firmas y subsetting portado de PDFBox, que no menciona edición de content streams ([blog de Documenso](https://documenso.com/blog/introducing-libpdf-the-pdf-library-typescript-deserves)). Ninguna de estas librerías trae un tokenizer público de content streams: en la vía (a), el tokenizer y la máquina de estados de texto (BT/ET, Tf, Tm/Td/T\*, Tj/TJ/'/", q/Q/cm y Form XObjects) son código propio, y ese es su riesgo principal.

### PDFium en WASM: edición de objetos y redacción bajo MIT

**@embedpdf/pdfium 2.15.1 (16 de septiembre de 2026)** es MIT, tiene unas 568k descargas semanales y pesa **4.6 MB de WASM** ([npm](https://registry.npmjs.org/@embedpdf%2Fpdfium), [jsDelivr](https://data.jsdelivr.com/v1/packages/npm/@embedpdf/pdfium@2.15.1?structure=flat)). Exporta lo necesario para editar de verdad: `FPDFText_SetText`, `FPDFTextObj_GetFont` y `GetFontSize` para objetos de texto; `FPDFFont_GetBaseFontName`, `GetIsEmbedded`, `GetFontData` y `GetGlyphWidth` para fuentes; `FPDFPage_RemoveObject` y `FPDFPage_GenerateContent` para la página; funciones propias de redacción (`EPDFText_RedactInRect`, `EPDFText_RedactInQuads`, `EPDFPage_ApplyRedactions`), y cifrado con `EPDF_SetEncryption` ([index.d.ts](https://cdn.jsdelivr.net/npm/@embedpdf/pdfium@2.15.1/dist/index.d.ts)). El encabezado `fpdf_edit.h` marca que `FPDFText_SetCharcodes`, `FPDFTextObj_GetFont` y `FPDFPage_RemoveObject` son experimentales, que `RemoveObject` invalida los handles de texto de la página, que hay que llamar a `GenerateContent` antes de guardar o los cambios se pierden, y que `FPDFText_LoadFont` carga datos TrueType o Type1, que es la vía para insertar texto con Carlito ([fpdf_edit.h](https://pdfium.googlesource.com/pdfium/+/refs/heads/main/public/fpdf_edit.h)).

Hay tres advertencias. `GenerateContent` regenera todo el content stream de la página a partir del modelo de objetos, así que puede normalizar marked content y hay que probarlo con PDFs etiquetados. La licencia propia de PDFium (BSD-3/Apache, según se sabe en general) no se verificó en esta investigación. Y la alternativa @hyzyla/pdfium 3.0.0 (5.3 MB, un solo mantenedor) queda para vigilar ([npm](https://registry.npmjs.org/@hyzyla%2Fpdfium)).

### mupdf.js: el mejor modelo de texto, atado a AGPL

**mupdf 1.28.1 (6 de septiembre de 2026)** es AGPL-3.0-or-later, tiene unas 330k descargas semanales y pesa **10.4 MB de WASM** ([npm](https://registry.npmjs.org/mupdf), [jsDelivr](https://data.jsdelivr.com/v1/packages/npm/mupdf@1.28.1?structure=flat)). Tiene el mejor modelo de texto: `StructuredText.walk()` llama a `onChar(utf, origin, font, size, quad, argb, flags)` por cada carácter, con color incluido ([docs](https://mupdf.readthedocs.io/en/latest/reference/javascript/types/StructuredText.html)). `applyRedactions` elimina texto por defecto (`REDACT_TEXT_REMOVE`), pero `PDFPage.process()`, el recorrido de content streams por callbacks, solo existe en `mutool run` y no en mupdf.js ([PDFPage](https://mupdf.readthedocs.io/en/latest/reference/javascript/types/PDFPage.html)). Artifex lo ofrece bajo AGPL o licencia comercial; bajo AGPL exige divulgar el código completo de la aplicación a quienes la usan y conservar la "producer line" en los PDFs generados ([Artifex](https://artifex.com/licensing)).

### El resto no entra en la ruta crítica

Los builds comunitarios de qpdf-wasm (1.3–2.3 MB, de 2025) sirven como herramienta de depuración en modo QDF mientras construyes el tokenizer, no como dependencia ([npm](https://registry.npmjs.org/qpdf-wasm)). pdfcpu-wasm pesa 30 MB ([npm](https://registry.npmjs.org/pdfcpu-wasm)), PyMuPDF en Pyodide es experimental y no se instala con micropip ([docs](https://pymupdf.readthedocs.io/en/latest/pyodide.html)), y hayro, un rasterizador en Rust puro, sigue experimental, sin cifrado ni grupos knockout ([docs.rs](https://docs.rs/hayro)).

### La arquitectura que recomiendo

pdf.js se queda para render y capa de texto en el visor. PDFium se carga bajo demanda en un worker de exportación, de modo que el documento se parsea dos veces solo durante la exportación y no todo el tiempo; es una inferencia, pero en un teléfono importa, porque dos motores con el documento abierto duplican la memoria. @cantoo/pdf-lib se usa para operaciones auxiliares (formularios, páginas, cifrado) y como vía de respaldo si el spike de PDFium falla. El modelo `TextBlock` debería ganar un **localizador de origen** (un handle de objeto o un `página:stream:offset` como el `p1:s42:o1024` de pdfFlow), además de referencia de fuente, color y matriz, para que cualquier backend pueda poblarlo. Y conviene cuidar la granularidad: hay que re-emitir solo las líneas editadas, porque la regresión de Stirling en la que un párrafo entero perdió sus fuentes originales viene justamente de no hacerlo.

| Librería | Madurez | Licencia | Peso | Riesgos | Fase | Veredicto |
|---|---|---|---|---|---|---|
| pdfjs-dist 6.4.299 | Mensual, 20.45M/sem | Apache-2.0 | 459 KB + 1.26 MB worker (+WASM opc. 0.1–0.47 MB) | R2, R5, R7 | F1–F2 | **Adoptar ya**, fijar major 6 |
| @cantoo/pdf-lib 2.11.1 | Varios releases/mes, 846k/sem | MIT | Solo JS (bundle sin medir) | Cifrados, export | F1, F4 | **Adoptar ya** en lugar de pdf-lib |
| pdf-lib 1.17.1 | Sin release desde 2021 | MIT | — | — | — | **Descartar** |
| @pdfme/pdf-lib 6.2.8 | Muy activo, atado a pdfme | MIT | 2.2 MB unpacked | — | — | Vigilar (plan B) |
| @libpdf/core 0.5.3 | Beta | MIT | Sin medir | — | F6+ | Vigilar |
| @embedpdf/pdfium 2.15.1 | Release cada 2–8 sem, 568k/sem | MIT (PDFium sin verificar) | 4.6 MB WASM | R1, R3, R5, R8 | F0 → F4 | **Spike prioritario** |
| @hyzyla/pdfium 3.0.0 | Un mantenedor, 386k/sem | MIT | 5.3 MB WASM | Igual que arriba | — | Vigilar |
| mupdf 1.28.1 | ~2 minors/año, 330k/sem | AGPL / comercial | 10.4 MB WASM | R1, R2, R5, R8 | F0 (opc.), F6+ | **Spike solo si AGPL** |
| qpdf-wasm | 0.1–0.3 (2025) | Apache / ISC | 1.3–2.3 MB | Depuración | F0–F4 (dev) | Vigilar como herramienta |
| pdfcpu-wasm | 0.1.0 | MIT | 30 MB | — | — | Descartar |
| PyMuPDF / Pyodide | Experimental | AGPL | Pyodide + wheel grande | — | — | Descartar |
| hayro | 0.7.x experimental | Sin verificar | No está en npm | — | — | Vigilar |

## La cobertura de glifos decide cada edición, y Aptos no tiene clon libre

El subconjunto de fuentes es un problema que nadie resolvió: Nutrient y Acrobat también caen a otra fuente cuando faltan glifos ([Nutrient 1.9](https://www.nutrient.io/guides/web/release-notes/1-9/), [Adobe](https://helpx.adobe.com/acrobat/current/default-font-pdf-editing-add-text.html)). La respuesta no es una técnica única sino una cascada de decisiones por cada run editado. Primero se extrae la fuente original y su `ToUnicode`. Si todos los glifos nuevos existen, se escribe en la fuente original con charcodes; si no, se sustituye el run completo por un clon métrico. Después se ajusta el ancho con Tz/Tc, y al final se avisa al usuario y se le deja elegir.

### Extraer la fuente original y comprobar su cobertura

pdf.js no tiene una API cómoda para extraer los bytes de las fuentes; por eso existe el wrapper `pdf-font-extract`, que además aclara que solo se obtienen los glifos presentes ([npm pdf-font-extract](https://npmjs.com/package/pdf-font-extract)). La opción `fontExtraProperties` exporta `toUnicode` y anchos ([PR #19548](https://github.com/mozilla/pdf.js/pull/19548)), pero los datos son de la fuente convertida (sin verificar). La ruta limpia es leer con la API de bajo nivel de pdf-lib el `/FontDescriptor` y sus streams `/FontFile`, `/FontFile2` o `/FontFile3`, y parsearlos con fontkit. Esa ruta se infirió del formato PDF y no se probó: los nombres exactos de la API están sin verificar, y fontkit podría no aceptar un CFF desnudo.

Los subconjuntos para PDF suelen carecer de tabla `cmap` ([README de fontkit](https://unpkg.com/@pdf-lib/fontkit@0.0.4/README.md)), así que el mapeo debe venir del `ToUnicode` del PDF. En fuentes Type0 Identity-H los códigos son CIDs que equivalen a GIDs, y el `ToUnicode` invertido da la codificación del texto nuevo. Si el `ToUnicode` falta o está roto, se sustituye la fuente, y las Type3, que son procedimientos de dibujo y no programas de fuente, se sustituyen siempre. Como el chequeo es barato, **"reutilizar la fuente original si contiene todos los glifos" puede pasar de v3 a F4**. Así se hace en el cliente lo que Stirling resuelve con un servidor y lo que BentoPDF hace con `sfntCovers()`.

### Los clones métricos cubren Office clásico, no el Office actual

| Fuente original | Clon métrico | Licencia | Fuente |
|---|---|---|---|
| Calibri | Carlito (deriva de Lato, incluida en ChromeOS) | OFL 1.1 | [Wikipedia](https://en.wikipedia.org/wiki/Calibri) |
| Cambria | Caladea | Apache-2.0 según Fedora | [Fedora](https://packages.fedoraproject.org/pkgs/ht-caladea-fonts/ht-caladea-fonts) |
| Georgia | Gelasio | OFL 1.1 | [CTAN](https://ctan.org/tex-archive/fonts/gelasio?lang=en) |
| Arial, Times, Courier | Arimo, Tinos, Cousine (familia Croscore) | — | [ArchWiki Croscore](https://wiki.archlinux.org/title/Croscore_Fonts) |

La familia Liberation cubre los mismos tres casos que Croscore, pero su licencia OFL figura sin verificar en las notas. El ArchWiki empareja Segoe UI con Selawik, aunque aclara que parecerse no es lo mismo que ser compatible en métricas ([ArchWiki](https://wiki.archlinux.org/title/Metric-compatible_fonts)). El hueco grande es **Aptos**, la fuente por defecto de Microsoft 365 desde julio de 2023 ([Wikipedia](https://en.wikipedia.org/wiki/Calibri)): no se encontró ningún clon métrico libre, y tampoco para Verdana, Tahoma, Century Gothic ni Garamond. Los CVs y facturas recientes hechos en Office vendrán en Aptos, así que ahí toca una fuente parecida, ajuste con Tz y un aviso visible. Para escrituras no latinas, el set Noto por escritura que usa Stirling es un buen modelo ([pdfiumFontFallback.ts](https://raw.githubusercontent.com/Stirling-Tools/Stirling-PDF/main/frontend/src/editor/core/services/pdfiumFontFallback.ts)). Las fuentes conviene cargarlas por familia, bajo demanda y desde tu propio origen, y es preferible usar familias OFL o Apache antes que las URW base35 (AGPL con excepción de fuentes), para no meter dudas de licencia en una app MIT.

### Tz y Tc absorben el cambio de longitud dentro de un margen

Tz expresa el escalado horizontal en porcentaje y también escala Tc, Tw y los ajustes de `TJ` ([PDF Association, cláusula 9](https://pdf-issues.pdfa.org/32000-2-2020/clause09.html)); el desplazamiento por glifo es `tx = ((w0 − Tj/1000) × Tfs + Tc + Tw) × Th`. Con un clon métrico, el mismo texto ocupa prácticamente el mismo ancho, así que Tz solo se necesita cuando cambia la longitud. El rango de 85–110% es una regla práctica sin verificar. Tw solo aplica al byte 32 en codificaciones de un byte, así que en fuentes CID hay que usar ajustes de `TJ`. Pasado el límite toca refluir dentro de la caja, y Stirling ofrece para eso un modo de una línea y otro de párrafo. Todo esto cabe en funciones puras `measureRun()` y `fitRun()` dentro de `src/core/fonts`.

### Identificar fuentes sin nombre útil cuesta kilobytes, no un modelo

Cuando la fuente se llama "F1", lo más barato es una **huella métrica**: comparar el arreglo `/Widths` del PDF contra una tabla JSON con los anchos de 50 a 200 fuentes candidatas, que pesa unos kilobytes y no necesita ML. Los modelos visuales abiertos todavía son juguetes: `gaborcselle/font-identifier` es un ResNet-18 con 48 fuentes y 96.3% de precisión sobre su propio set sintético ([HF](https://huggingface.co/gaborcselle/font-identifier)), y YuzuMarker solo reconoce fuentes CJK ([HF](https://huggingface.co/spaces/gyrojeff/YuzuMarker.FontDetection/raw/a9741cd5f30db7c1b68845c4457e7c6e177f8d7f/README.md)). La **Local Font Access API** solo existe en Chrome y Edge 103+, es experimental y pide permiso ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/Local_Font_Access_API)); sirve como opción "usar la fuente exacta de tu sistema" en Chromium, revisando antes los bits de embebido `fsType` (sin verificar).

### Librerías de fuentes: fontkit basta para v1, harfbuzzjs espera a v3

harfbuzzjs (MIT) está activo y pasó a una API v1 con cambios incompatibles; compila con `-DHB_TINY` y su build de subsetting no está documentado ([GitHub](https://github.com/harfbuzz/harfbuzzjs)). Conviene para RTL, escrituras complejas o kerning exacto, es decir, en v3. @pdf-lib/fontkit sigue en 1.1.1, publicado el 6 de abril de 2022 ([npm](https://registry.npmjs.org/@pdf-lib/fontkit)): está estancado pero es estable, y pdf-lib lo necesita. Extender un subconjunto con glifos donantes se podría hacer con fontTools `merge`, disponible en Pyodide (fontTools 4.62.1, [Pyodide](https://pyodide.org/en/latest/usage/packages-in-pyodide.html)), pero exige el mismo UPM en todas las fuentes y renombra los glifos en conflicto, lo que requiere GSUB ([docs de merge](https://fonttools.readthedocs.io/en/latest/merge.html)). Además, mezclar glifos de Calibri y Carlito en una misma palabra se vería disparejo, así que esa vía es un spike de alto riesgo que probablemente se descarte.

### Política de UX: sustituir el run completo y avisar

Stirling cae a Helvetica carácter por carácter y deja palabras con fuentes mezcladas. Son mejores modelos el `fontMatcher` de Nutrient ([API](https://www.nutrient.io/api/web/types/ContentEditing.FontMatcher.html)) y la descarga con consentimiento de Tintenfisch. Para Ghost propongo sustituir el run completo, mostrar una etiqueta de "fuente sustituida", ofrecer un selector manual y servir paquetes de fuentes opcionales desde tu propio dominio, sin peticiones a terceros.

| Tecnología | Madurez | Licencia | Peso | Riesgos | Fase | Veredicto |
|---|---|---|---|---|---|---|
| Extracción de FontFile vía pdf-lib + parser de `ToUnicode` | Código propio | — | 0 | R1 | F2–F4 | **Adoptar ya** |
| Chequeo de cobertura + reuso con charcodes | Probado (pdfFlow, Stirling, Bento) | — | 0 | R1, R4 | F4 (adelantado desde v3) | **Adoptar** |
| Carlito, Caladea, Gelasio, Croscore/Liberation | Estables | OFL / Apache | ~300–400 KB por peso sin subset (sin verificar) | R1, R4 | F4 | **Adoptar ya** |
| Aptos, Verdana, Tahoma | Sin clon | — | — | R1, R4 | F4 | Fuente parecida + Tz + aviso |
| `measureRun` / `fitRun` (Tz, Tc, `TJ`) | Especificación ISO 32000-2 | — | 0 | R4 | F4 | **Adoptar ya** |
| @pdf-lib/fontkit 1.1.1 | Estancado, estable | MIT | Sin medir | R1 | F4 | ~~Adoptar~~ **Descartar**: con @cantoo/pdf-lib usar @cantoo/fontkit 2.0.12 (Spike 2) |
| harfbuzzjs 1.0 | Activo | MIT | Sin medir | R4 (complejos, kerning) | v3 | Spike |
| opentype.js 1.3.x | Activo, lento | MIT | — | — | — | Spike solo para inspección |
| fontTools merge en Pyodide | Maduro en Python, frágil aquí | MIT / MPL-2.0 | Varios MB | R1 | v3 | Spike de alto riesgo, probable descarte |
| Instanciado de fuentes variables | Sin fuentes consultadas | — | — | R1, R4 (Aptos) | v2+ | Vigilar |
| Huella métrica por `/Widths` | Código propio | — | KB de JSON | R1 (fuentes "F1") | F4–F5 | Spike |
| font-identifier (48 fuentes) | Juguete | MIT | Sin confirmar | R1 | — | Vigilar |
| Local Font Access | Chrome/Edge 103+ | Estándar web | 0 | R1 | F5 | Mejora progresiva opcional |

## Virtualizar, guardar en OPFS e instalar rinden más que WebGPU

### La virtualización resuelve la mayor parte de R7

iOS Safari tiene un tope de memoria total de canvas, con valores reportados de 224, 384 y 448 MB según la versión, y pasado ese tope los canvas se dibujan transparentes ([PQINA](https://www.pqina.nl/blog/total-canvas-memory-use-exceeds-the-maximum-limit/)). Ningún canvas puede superar **16,777,216 píxeles** ([PQINA](https://pqina.nl/blog/canvas-area-exceeds-the-maximum-limit/)), y Safari tampoco libera rápido los canvas sin referencia, por lo que el truco es poner `width` y `height` en 0 antes de soltarlos ([WebKit 195325](https://bugs.webkit.org/show_bug.cgi?id=195325)). Esas cifras son de la era iOS 12–15 y no hay datos de iOS 26. En la práctica, conviene mantener 3 a 5 canvas vivos (la página visible más una o dos a cada lado), usar miniaturas como placeholder para el resto, cancelar tareas de render durante el scroll rápido, llamar a `page.cleanup()` para las páginas lejanas y fijar un presupuesto que asuma el tope más bajo reportado. El fallo de Stirling con documentos de 300 páginas muestra que esto no es opcional.

### El renderer worker de pdf.js es prometedor pero aún no tiene release

pdf.js fusionó **el PR #21860 el 6 de octubre de 2026**: dibuja en un OffscreenCanvas propio del worker y devuelve un ImageBitmap, y en páginas largas envía frames parciales cada 500 ms como máximo. Está apagado en los builds publicados, se activa con `GlobalWorkerOptions.rendererSrc` y vuelve al hilo principal con fondos de gradiente o patrón y con `pageColors` ([PR #21860](https://github.com/mozilla/pdf.js/pull/21860)); tiene un seguimiento en el PR #22157 ([PR #22157](https://github.com/mozilla/pdf.js/pull/22157)) y un bug conocido de gradientes con OffscreenCanvas ([#19779](https://github.com/mozilla/pdf.js/issues/19779)). Como se fusionó después de la 6.4.299, todavía no está en ninguna release etiquetada (inferencia por fechas). Como el hilo principal conserva el canvas, es compatible con el overlay DOM. OffscreenCanvas es Baseline desde marzo de 2023 ([MDN](https://developer.mozilla.org/docs/Web/API/OffscreenCanvasRenderingContext2D)).

### Los hilos WASM cuestan más de lo que aportan en v1

Los hilos WASM necesitan SharedArrayBuffer, y SharedArrayBuffer exige aislamiento cross-origin con COOP y COEP, configurable en `vercel.json` ([Vercel KB](https://vercel.com/kb/guide/fix-shared-array-buffer-not-defined-nextjs-react)). Safari no soporta `COEP: credentialless` ([WebKit 230550](https://bugs.webkit.org/show_bug.cgi?id=230550), [caniuse](https://caniuse.com/wf-iframe-credentialless)), así que habría que usar `require-corp` y limitarlo a `/app`, con el costo de romper fuentes y scripts de terceros sin CORP. Lo sensato es diseñar para un solo hilo y activar el aislamiento solo si un motor WASM demuestra una ganancia grande. JSPI está estandarizado y corre en Chrome 137+, pero el soporte en Firefox y Safari viene de una sola fuente secundaria ([OpenReplay](https://blog.openreplay.com/jspi-javascript-wasm-bridge/)); Memory64 entró en Wasm 3.0, pero sin Safari ([platform.uno](https://platform.uno/blog/state-of-webassembly-2024-2025/)). Ninguno de los dos hace falta.

### WebGPU solo sirve para la IA

WebGPU llegó a Safari en iOS 26 y a Chrome Android 121 en Android 12+. En Firefox salió en Windows (141) y en Mac con Apple Silicon (145), mientras Linux, Android y Mac Intel siguen "en progreso" ([web.dev](https://web.dev/blog/webgpu-supported-major-browsers)). Su lugar está en la IA, siempre con respaldo en WASM, nunca en el render.

### OPFS guarda el original y el log de ediciones, no PDFs re-exportados

OPFS comparte cuota con IndexedDB y Cache, y `navigator.storage.persist()` evita el desalojo de tipo best-effort ([MDN](https://developer.mozilla.org/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)). El desalojo a los 7 días de Safari no aplica a PWAs instaladas en la pantalla de inicio ([web.dev](https://web.dev/articles/storage-for-the-web)), aunque falta confirmar si eso cubre OPFS. Guardar el PDF original más el log de `Edit`s del plan mantiene el autoguardado pequeño y la exportación reproducible. Siempre debe haber una descarga explícita, para que OPFS nunca sea la única copia.

### La integración con el sistema operativo es buena en Android y nula en iOS

Web Share Target funciona en Android (WebAPK) y ChromeOS, solo después de instalar la app ([web.dev](https://web.dev/learn/pwa/os-integration)); el archivo compartido llega a un service worker que lo guarda en OPFS sin salir del dispositivo. Launch Handler está lanzado en Chrome ([Chrome](https://developer.chrome.com/docs/web-platform/launch-handler)), File Handling sigue siendo experimental y de escritorio, y los pickers de File System Access son solo de Chromium escritorio (sin verificar en Android). iOS no tiene ninguna de las cuatro.

### vite-plugin-pwa necesita configuración explícita para WASM

vite-plugin-pwa solo precachea css, js y html por defecto ([docs](https://docsearch.algolia.com/mcp/docs/repo/vite-pwa/vite-plugin-pwa)), así que hay que añadir wasm, mjs y woff2 y subir `maximumFileSizeToCacheInBytes`: el worker de pdf.js pesa 1.26 MB y PDFium 4.6 MB. Con `registerType: 'prompt'` una actualización nunca cambia el código a mitad de una edición. Vite 7 requiere Node 20.19+ o 22.12+ ([Vite 7](https://vite.dev/blog/announcing-vite7)), y tu Node 22.23 cumple.

### EditContext obliga a una abstracción sobre contenteditable

EditContext solo existe en Chrome y Edge 121+; Firefox y Safari (hasta 26.6 y la 27 TP) no lo soportan ([caniuse](https://caniuse.com/wf-edit-context)). Eso obliga a una abstracción `EditingSurface`, con `contenteditable` en modo plaintext-only como base y pruebas de composición con Gboard. `scheduler.yield()` está en Chrome 129 y Firefox 142 pero no en Safari ([Chrome](https://developer.chrome.com/blog/use-scheduler-yield)), así que se usa con un respaldo en `setTimeout`. View Transitions, Popover, anchor positioning, Intl.Segmenter, los overrides de métricas de fuente, Compression Streams y Comlink probablemente sirven, pero su soporte no se verificó y conviene revisarlos en caniuse antes de depender de ellos. Intl.Segmenter, en particular, evitaría el tipo de bug de emoji partidos que sufrió Stirling.

### Vitest 4 permite probar fidelidad y privacidad en el mismo pipeline

Vitest 4 estabilizó el modo navegador y trajo `toMatchScreenshot`, con comparación pixelmatch y umbrales configurables ([InfoQ](https://www.infoq.com/news/2025/12/vitest-4-browser-mode), [docs de Vitest](https://vitest.dev/guide/browser/visual-regression-testing)). Las imágenes de referencia deben generarse en un contenedor fijo, porque el rasterizado de fuentes cambia entre sistemas. A la prueba visual de ida y vuelta (editar, exportar, re-renderizar y comparar) conviene sumarle una prueba semántica con `getTextContent()` y **una prueba de privacidad** que verifique que la cadena eliminada no aparece en ningún stream descomprimido del PDF exportado.

| Tecnología | Soporte | Licencia | Peso | Riesgos | Fase | Veredicto |
|---|---|---|---|---|---|---|
| Virtualización + reciclado de canvas | Universal | — | 0 | R7 | F2 | **Adoptar ya** |
| Renderer worker de pdf.js (#21860) | Fusionado el 6-oct-2026, apagado por defecto | Apache-2.0 | Incluido en pdf.js | R7 | F5 | Spike cuando salga en release |
| OffscreenCanvas | Baseline (mar 2023) | Estándar web | 0 | R7 | F2 (vía pdf.js) | Adoptar |
| Hilos WASM + COOP/COEP | Requiere aislamiento; Safari sin credentialless | Estándar web | 0 | R7 | F6+ | Spike solo si hace falta |
| JSPI / Memory64 / WasmGC | Parcial | Estándar web | 0 | — | — | Vigilar / descartar |
| WebGPU | Chrome, Safari 26, Firefox escritorio parcial | Estándar web | 0 | R6 (vía IA) | F6+ | Vigilar, solo para IA |
| OPFS + `persist()` | Universal (detalles de iOS sin verificar) | Estándar web | 0 | R7, privacidad | F2–F3 | **Adoptar ya** |
| File System Access | Chromium escritorio (sin verificar en Android) | Estándar web | 0 | UX | F5 | Mejora progresiva |
| Web Share Target | Android WebAPK + ChromeOS | Estándar web | 0 | UX | F5 | **Adoptar** |
| Launch Handler | Chrome | Estándar web | 0 | UX | F5 | **Adoptar** |
| File Handling | Escritorio; Android sin verificar | Estándar web | 0 | UX | F5 | Spike |
| vite-plugin-pwa | Estándar de facto | MIT | Service worker | Offline | F1 (esqueleto), F5 | **Adoptar ya** |
| Transferables + Comlink | Sin verificar | MIT (Comlink) | ~1 KB (sin verificar) | R7 | F2 | Adoptar |
| EditContext | Solo Chrome/Edge 121+ | Estándar web | 0 | Edición / IME | F3 | Spike como mejora |
| `scheduler.yield` | Chrome 129, Firefox 142, no Safari | Estándar web | 0 | R7 | F2 | **Adoptar con respaldo** |
| Vitest 4 browser mode + `toMatchScreenshot` | Estable | MIT | Solo dev | Todos (regresión) | F1 | **Adoptar ya** |
| Compute Pressure | Solo Chromium escritorio (sin verificar) | Estándar web | 0 | — | — | Descartar |

## La IA local entra como paquetes opcionales de 10 a 200 MB, no en el núcleo

### onnxruntime-web y transformers.js son el sustrato; lo demás no está listo

El sustrato común es **onnxruntime-web** (MIT), cuyo WASM multihilo exige aislamiento cross-origin ([ORT](https://ONNXRuntime.ai/docs/tutorials/web/env-flags-and-session-options.html)). Encima, **transformers.js v4** (30 de marzo de 2026) trajo un runtime WebGPU nuevo en C++ y modelos como Qwen3-VL, LightOnOCR y GLM-OCR, y la v4.3 (16 de septiembre) añadió WebGPU en Safari 26+ y salida estructurada experimental ([releases](https://github.com/huggingface/transformers.js/releases)). Las demás opciones quedan fuera por ahora. Gemini Nano, vía Prompt API, pide 22 GB de disco, más de 4 GB de VRAM y 16 GB de RAM, y no funciona en Android, iOS ni dentro de Web Workers ([Prompt API](https://developer.chrome.com/docs/ai/prompt-api)); Writer y Rewriter, las APIs más útiles para "acortar", siguen en developer trial ([Built-in AI](https://developer.chrome.com/docs/ai/built-in-apis?hl=en)). WebNN sigue en origin trial desde Chrome 146 ([Phoronix](https://www.phoronix.com/news/Chrome-146-Beta)) y tuvo un CVE de fuga cross-origin en 2026 ([CVE-2026-17858](https://app.opencve.io/cve/CVE-2026-17858)), y WebLLM (Apache-2.0) es redundante si ya usas transformers.js ([GitHub](https://github.com/mlc-ai/web-llm)).

### PaddleOCR.js toma la delantera para escaneados, con Tesseract de respaldo

PaddleOCR tiene ahora un **SDK oficial para navegador**, `@paddleocr/paddleocr-js`, que corre PP-OCRv5 mobile y devuelve por línea un polígono, el texto y una puntuación, con modo worker ([docs](https://www.paddleocr.ai/v3.5.0/en/version3.x/deployment/browser.html), [README](https://cdn.jsdelivr.net/npm/@paddleocr/paddleocr-js@0.3.2/README.md)). La página no publica tamaños de modelo ni licencia de los pesos, así que hay que confirmarlos. **Tesseract.js v7** añadió un build con relaxed SIMD, entre 15 y 35% más rápido que v6 ([newreleases](https://newreleases.io/project/npm/tesseract.js/release/7.0.0)), y sigue siendo el respaldo con cajas por palabra. Los VLM de OCR dan coordenadas gruesas y pueden alucinar, algo grave en un editor. Stirling marca el estándar a alcanzar: las palabras sin cambios conservan los píxeles escaneados y el texto nuevo imita fuente, tamaño, color y nitidez del escaneo ([PR #8314](https://github.com/Stirling-Tools/Stirling-PDF/pull/8314)). En F2 basta con detectar el escaneado y avisar.

### El layout con modelos solo desempata en PDFs digitales

EmbedPDF ya corre en el cliente **PP-DocLayoutV3** (Apache-2.0) y Table Transformer (MIT), de unos 60 MB cada uno, etiquetados como experimentales y con la advertencia de que la pestaña puede dejar de responder en móvil ([EmbedPDF](https://www.embedpdf.com/layout-analysis)). No existe un port de DocLayout-YOLO para navegador ([PyPI](https://pypi.org/project/doclayout-yolo)). En PDFs digitales la geometría que da pdf.js es exacta, así que las heurísticas siguen siendo la base de R2 y el modelo solo desempata casos ambiguos, como distinguir multicolumna de tabla. En escaneados, en cambio, es obligatorio.

### El inpainting solo hace falta cuando el texto está dentro de una imagen

Si se eliminan los operadores de texto, el fondo vectorial queda intacto y no hay nada que reconstruir. Cuando el texto sí está dentro de una imagen, el primer paso es un muestreo clásico de color plano o degradado, y el segundo es **MI-GAN**: código MIT con pesos bajo una licencia aparte que aún no se leyó, unos 80 MB, alrededor de 7 veces más chico que LaMa y con un pipeline ONNX oficial ([MI-GAN](https://github.com/Picsart-AI-Research/MI-GAN), [mirror](https://git.tdem.in/Picsart-AI-Research/MI-GAN)). `inpaint-web` ya lo corre en el navegador ([inpaint-web](https://github.com/vicbravo-zz/inpaint-web)). LaMa en ONNX pesa unos 209 MB y trabaja fijo a 512×512 ([HF](https://huggingface.co/sapienkit/LaMa-ONNX)), demasiado para móvil.

### Un LLM local para "acortar para que quepa" es el diferenciador más claro

Ningún editor lo hace en local. El flujo consiste en medir el exceso de ancho con las métricas reales de la fuente, pedir varias variantes con un presupuesto de caracteres, verificar el ancho de cada una con las mismas métricas y mostrar solo las que caben. Un modelo de menos de 1B parámetros basta, aunque su peso en q4, de 300 a 900 MB, es una estimación. La cadena sería usar la Prompt API si está disponible, luego un modelo chico de transformers.js como descarga opcional, y si no, ocultar la función. Para el orden de lectura, la geometría es más confiable que un LLM.

### Cada modelo es una descarga opcional servida desde tu origen

El núcleo de la app lleva 0 MB de modelos. Cada paquete (OCR, layout, inpainting, LLM) es una descarga opcional con barra de progreso, cacheada en OPFS o Cache, con opción de borrarla y con `persist()` pedido antes de descargar. Los modelos se sirven desde tu propio origen, porque lo exige COEP y porque lo pide la coherencia con el discurso de privacidad. El ancho de banda de Vercel para modelos de decenas de MB es un costo a vigilar (inferencia, sin cifras).

| Tecnología | Madurez | Licencia | Peso | Riesgos | Fase | Veredicto |
|---|---|---|---|---|---|---|
| onnxruntime-web | Canónico | MIT | Runtime WASM (sin medir) | R6, IA | v4 | Adoptar como sustrato cuando llegue la IA |
| transformers.js 4.3.1 | v4 desde mar-2026, WebGPU en Safari | Sin verificar en las notas | Sin medir | R6, R4 | v4 / LLM | Spike |
| Prompt API (Gemini Nano) | Solo escritorio | Del navegador | 0 para la app | R4 | F6+ | Vigilar, mejora opcional |
| Writer / Rewriter | Developer trial | — | — | R4 | — | Descartar por ahora |
| WebNN | Origin trial | — | — | — | — | Vigilar |
| WebLLM | Activo | Apache-2.0 | Cientos de MB | R4 | — | Descartar (redundante) |
| PaddleOCR.js (PP-OCRv5 mobile) | SDK oficial 0.3.2 | Sin confirmar | Sin confirmar | R6 | v4 | **Spike** |
| Tesseract.js v7 | Maduro | Sin verificar en las notas | Sin medir | R6 | v4 | Respaldo |
| VLM OCR (LightOnOCR, GLM-OCR, Qwen-VL) | Pesados | Varias | Cientos de MB | R6 | — | Vigilar |
| PP-DocLayoutV3 | Experimental en EmbedPDF | Apache-2.0 | ~60 MB | R2, R6 | v4 (spike) | Spike |
| Table Transformer | Experimental en EmbedPDF | MIT | ~60 MB | R2 (tablas) | — | Vigilar |
| Muestreo clásico de fondo | Trivial | — | 0 | R3 | F4 | **Adoptar ya** (respaldo) |
| MI-GAN | Pipeline ONNX oficial | Código MIT, pesos aparte | ~80 MB | R3, R6 | v4 | Spike tras leer la licencia de pesos |
| LaMa ONNX | Funciona en ORT Web | Apache-2.0 | ~209 MB | R3 | — | Descartar en móvil |
| LLM "acortar para que quepa" | Factible en escritorio | Según modelo | ≥300 MB (estimación) | R4 | F6+ | Spike (diferenciador) |

## MIT conserva la salida; AGPL compra mupdf.js y el código de BentoPDF

Con **MIT** puedes usar pdf.js (Apache-2.0), @cantoo/pdf-lib, fontkit, harfbuzzjs, onnxruntime-web y @embedpdf/pdfium (MIT), con la licencia propia de PDFium pendiente de verificar. También puedes copiar código del núcleo del editor de Stirling, que queda fuera de sus directorios propietarios ([LICENSE](https://raw.githubusercontent.com/Stirling-Tools/Stirling-PDF/main/LICENSE)); su `engine/` tiene una licencia de uso comercial distinta ([engine/LICENSE](https://raw.githubusercontent.com/Stirling-Tools/Stirling-PDF/main/engine/LICENSE)), así que conviene revisar las cabeceras archivo por archivo. A eso se suman rihaPDF y EmbedPDF (Apache-2.0, conservando el NOTICE) y Tintenfisch (MIT). Quedan fuera mupdf.js, salvo con licencia comercial de Artifex, y el código de BentoPDF, pdfFlow-Engine y GigaPDF, de los que solo puedes tomar ideas reimplementadas desde la especificación. Ganas la opción de cerrar o vender el producto, a cambio de que cualquiera pueda hacer un fork y cerrarlo.

Con **AGPL-3.0** se suman mupdf.js sin pagar, con su modelo de texto por carácter y `applyRedactions`, y el código de BentoPDF, el editor 100% navegador más parecido a Ghost. Las obligaciones son ofrecer el código completo a quien use la app y conservar la "producer line" de MuPDF en los PDFs generados ([Artifex](https://artifex.com/licensing)). Cerrarlo después exigiría quitar todo el código AGPL ajeno y pagar a Artifex, y si además aceptaste contribuciones externas sin un acuerdo de cesión (CLA), necesitarías el permiso de cada contribuidor.

La asimetría decide. Pasar de MIT a AGPL más adelante es trivial mientras seas el único autor, porque el código MIT es compatible con AGPL; el camino inverso es difícil. Y como PDFium-WASM bajo MIT ya demostró en Stirling y Bento que alcanza para editar y redactar, el argumento original de PLAN.md ("AGPL te ahorra dolor con mupdf.js") pierde fuerza. El mejor argumento a favor de AGPL es otro: poder estudiar y reutilizar literalmente BentoPDF, algo que en un proyecto de portafolio que de todos modos será público cuesta poco. Mi recomendación es **MIT con PDFium**; si en F0 PDFium falla en fidelidad y mupdf.js gana con claridad, el cambio a AGPL sigue disponible.

| Aspecto | MIT | AGPL-3.0 |
|---|---|---|
| Motor de edición sin pagar | @embedpdf/pdfium; tokenizer propio | Lo anterior + mupdf.js |
| Código ajeno copiable | Stirling (núcleo MIT), rihaPDF, EmbedPDF, Tintenfisch | Lo anterior + BentoPDF, pdfFlow, GigaPDF |
| Obligaciones | Avisos de copyright; NOTICE de Apache | Código completo a los usuarios; producer line de MuPDF |
| Cerrar o vender después | Sí | Solo pagando a Artifex y sin código AGPL ajeno (más un CLA si hay contribuciones) |
| Forks de terceros | Pueden cerrarse | Deben seguir abiertos |
| Reversibilidad | Pasar a AGPL es fácil | Volver a MIT es difícil |
| Fuentes OFL / Apache | Sin problema | Sin problema |

## Recomendaciones por fase y cobertura de riesgos

| Fase | Adoptar ya | Spike | Vigilar / descartar |
|---|---|---|---|
| **F0** spikes | Cerrar @cantoo/pdf-lib. Ampliar el corpus con los casos de Stirling (Type3, PDF etiquetado, firmado, clip path, CropBox desplazado, párrafo justificado, tamaños mixtos) y un CV en Aptos. Esta investigación ya confirmó que los tres repos existen y su licencia. | Eliminar y reinsertar un run con **@embedpdf/pdfium** frente a un tokenizer mínimo sobre cantoo, midiendo fidelidad, píxeles fuera de la zona editada, texto realmente eliminado, peso y tiempo. Spike 1 con operatorList + FontFile vía pdf-lib, no solo `commonObjs`. mupdf.js solo si te inclinas por AGPL. | Descartar copiar código de gafapa o PDFBlack (sin licencia) y de pdfFlow (AGPL). |
| **F1** setup | pdfjs-dist 6.4.x fijado; @cantoo/pdf-lib + **@cantoo/fontkit** (corregido tras el Spike 2); Vitest 4 browser mode + Playwright; esqueleto de vite-plugin-pwa con wasm/mjs/woff2; fuentes autoalojadas. | — | COOP/COEP: no activarlo todavía. |
| **F2** lectura | Virtualización con 3–5 canvas y presupuesto para iOS; cancel + cleanup; `scheduler.yield` con respaldo; transferables (cuidado con buffers desacoplados); OPFS para el original; color y fuente vía operatorList; `geometry.ts` con CTM; detección de escaneados; localizador de origen en `TextBlock`. | — | Modelo de layout, solo para casos ambiguos. |
| **F3** edición | `EditingSurface` con `contenteditable` plaintext-only; `FontFace` con la fuente sustituta real en el overlay, para que lo que ves coincida con lo exportado; log de ediciones autoguardado en OPFS. | EditContext en Chromium. | — |
| **F4** exportación (MVP) | Cascada de fuentes (cobertura → original con charcodes → clon métrico del run completo → Tz/Tc). **Eliminación real de los glifos editados** con el motor elegido. Guardado completo, no incremental. Prueba automática de no recuperabilidad. Muestreo multipunto como respaldo. Export en worker. Tests visuales de ida y vuelta. | Huella métrica por `/Widths`. | Descartar el rectángulo blanco como estrategia principal. |
| **F5** pulido y PWA | Precache de worker y WASM; Share Target + Launch Handler; File System Access en escritorio; `persist()` + `estimate()`; `registerType: 'prompt'`. | Renderer worker de pdf.js (cuando salga en release); File Handling en Android; Local Font Access opcional. | Vigilar WebGPU. |
| **F6+ v2** | Redacción real con `EPDFText_RedactInQuads` / `EPDFPage_ApplyRedactions` (o mupdf si AGPL); mover bloques. | — | — |
| **F6+ v3** | — | harfbuzzjs (shaping, kerning, RTL); reflujo con segmentación de líneas; edición nativa por charcodes generalizada. | Vigilar el instanciado de fuentes variables. Probable descarte de extender subconjuntos con fontTools/Pyodide. |
| **F6+ v4** | onnxruntime-web como sustrato. | PaddleOCR.js + Tesseract.js v7 de respaldo; PP-DocLayoutV3; MI-GAN; LLM local "acortar para que quepa". | Descartar LaMa en móvil, PyMuPDF/Pyodide, pdfcpu, WebLLM y TF.js nuevo. |

| Riesgo | Respuesta recomendada | Fase |
|---|---|---|
| R1 fuentes subconjunto | Chequeo de cobertura → reuso de la original con charcodes → clon métrico del run completo + aviso + selector manual | F4 |
| R2 agrupar fragmentos | Heurísticas de baseline y separación + modo debug + tests; `LineGrouper` de Stirling (MIT) como referencia; layout ML solo para ambigüedades | F2 |
| R3 fondos de color | Borrar operadores en vez de tapar; muestreo multipunto de respaldo; inpainting solo en raster | F4 / v4 |
| R4 texto más largo | Tz/Tc acotado → reflujo en la caja → LLM opcional para acortar | F4 / F6+ |
| R5 coordenadas y rotación | `geometry.ts` con CTM y matriz de texto; `FPDFPageObj_Get/SetMatrix`; tests de rotación y CropBox | F2 |
| R6 escaneados | Detectar y avisar; luego PaddleOCR.js + layout + MI-GAN | F2 / v4 |
| R7 100+ páginas | Virtualización, presupuesto iOS, OPFS, renderer worker, sin churn de malloc en WASM | F2 / F5 |
| R8 texto extraíble | Eliminar glifos en el MVP + guardado completo + prueba de no recuperabilidad | F4 |

## Decisiones que tienes que tomar

1. ~~**Licencia: MIT o AGPL.**~~ ✅ **Decidido: MIT** ([decisión 0001](../docs/decisiones/0001-licencia-mit.md)). Se puede reevaluar si nos bloqueamos.
2. **¿Adelantar la eliminación real de glifos de v2 al MVP?** Recomendación: sí, al menos para los runs editados. F4 crece, pero el producto deja de contradecir su promesa de privacidad.
3. **Motor de escritura tras el spike de F0:** con MIT quedan @embedpdf/pdfium o un tokenizer propio sobre @cantoo/pdf-lib (mupdf.js descartado). *Avance:* el Spike 3 ya validó PDFium (borra el texto de verdad); falta compararlo contra el tokenizer propio, en la Fase 4.
4. **Política de fuentes faltantes:** sustituir el run completo con aviso (recomendado) o carácter por carácter. Decide también si ofrecer paquetes de fuentes descargables desde tu dominio y Local Font Access en Chromium.
5. **Qué hacer con Aptos y otras fuentes sin clon:** fuente parecida + Tz + aviso, aceptando una diferencia visible.
6. **Política de texto largo por defecto:** límites de Tz/Tc, cuándo pasar a reflujo, y si el modo por defecto es de una línea o de párrafo.
7. **Formato de guardado:** completo por defecto, por privacidad. ¿Ofrecer guardado incremental para PDFs firmados, avisando que conserva el texto anterior?
8. **Matriz de navegadores:** ¿iOS Safari es plataforma de primera clase? Afecta el presupuesto de canvas y la ausencia de EditContext, Share Target y pickers de archivos.
9. **Presupuesto de IA:** qué paquetes, en qué fase, solo escritorio o también móvil, y cuánto ancho de banda de Vercel estás dispuesto a gastar en modelos.
10. **Posicionamiento:** corregir la sección 0 de PLAN.md. La edición gratuita en el navegador ya existe; la diferencia de Ghost debe ser privacidad verificable, fidelidad en CVs y facturas de Office/Docs, y ligereza en móvil.

## Conclusión

Lo que cambió en 2026 no es la dificultad técnica sino dónde está la ventaja. El motor dejó de ser el cuello de botella, porque PDFium-WASM bajo MIT ya demostró en dos proyectos grandes que puede editar y redactar en el navegador. El trabajo difícil, y donde Ghost puede ganar, está en la capa de políticas que ningún motor trae: agrupar fragmentos, la cascada de fuentes, el ajuste de ancho y una batería de pruebas que la lista de Stirling ya dibuja.

La promesa de privacidad tiene que poder comprobarse con una prueba automática y no quedarse en un texto de marketing, porque es justo lo que fallan los editores que tapan, y probablemente cualquiera que guarde de forma incremental. Elegir MIT ahora mantiene abiertas todas las salidas, incluida la de pasarte a mupdf.js si los spikes lo justifican.
