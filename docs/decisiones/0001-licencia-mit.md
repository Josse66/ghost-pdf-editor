# 0001 — Licencia MIT

- **Fecha:** 2026-10-22
- **Estado:** aceptada

## Contexto
Ghost PDF Editor será código abierto en un repo público. Más adelante quizá se cobre un precio bajo. La alternativa más potente para el motor, mupdf.js, es AGPL: obligaría a publicar toda la app bajo AGPL o a comprar una licencia comercial a Artifex.

## Decisión
El proyecto se publica bajo **MIT**. El stack se mantiene 100% permisivo: pdfjs-dist (Apache-2.0), @cantoo/pdf-lib y @cantoo/fontkit (MIT), @embedpdf/pdfium (MIT; PDFium BSD), y fuentes OFL/Apache.

## Por qué
- El Spike 3 mostró que PDFium WASM cubre lo que nos daba mupdf: borrar texto de verdad y leer color, fuente y tamaño reales.
- MIT no ata decisiones futuras (cobrar, cerrar módulos, etc.).

## Consecuencias
- No se usa código AGPL (mupdf.js, BentoPDF, pdfFlow-Engine); de esos proyectos solo se toman ideas.
- Hay que conservar los avisos de copyright de las dependencias y de las fuentes (`THIRD_PARTY_LICENSES` / página de créditos).
- Reversible: si nos bloqueamos y mupdf.js resuelve algo que PDFium no, se reevalúa. El motor va detrás de `PdfEngine` para que el cambio no toque la UI.
