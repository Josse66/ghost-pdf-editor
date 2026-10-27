# Estado de Ghost PDF Editor

> **Último guardado:** 2026-10-27 (fin de sesión) · producción (`main`) en `557a3b4` (rediseño «Concreto», PR #4)
> · `dev` en `147ac9c` = `main` + PWA + arreglos de la crítica de Impeccable (CI en verde, **sin PR todavía**).
> Lo escribe y actualiza la skill `ghosteditor` (modo «guardar»). Si algo de aquí contradice lo que muestran
> git, GitHub o los archivos, **manda lo vivo**: dilo y actualiza este archivo.

## 1. Qué es el proyecto

Editor de PDF 100 % en el navegador: el usuario abre un PDF, **edita el texto que ya existe** directo sobre la página
sin romper el formato y exporta un PDF. Sin backend, el archivo nunca sale del dispositivo. Código abierto (MIT).

- Repo público: https://github.com/Josse66/ghost-pdf-editor (carpeta local `C:/dev/pdf-master`)
- Producción (`main`): https://ghost-pdf-editor.vercel.app
- Preview de `dev` (sin login): https://ghost-pdf-editor-git-dev-mdr-ghosts-projects.vercel.app
- Documentos guía: `PLAN.md` (fases y checkboxes), `PRODUCT.md` (producto), `DESIGN.md` (sistema visual),
  `CLAUDE.md` (reglas), `docs/fase0-hallazgos.md`, `reports/Tecnologías para editor PDF web.md` (investigación),
  `docs/decisiones/0001-licencia-mit.md`, `.impeccable/surfaces/src-app-tsx.md` (brief + contrato de dirección).

## 2. Dónde vamos

| Fase | Estado |
|---|---|
| 0 · Investigación y spikes | ✅ Hecha (falta solo corpus de PDFs reales del usuario, en `test-fixtures/privado/`) |
| 1 · Setup | ✅ Hecha (Vite 8, React 19, TS 6 estricto, Tailwind v4, shadcn, oxlint, Vitest 5, Playwright, CI, Vercel) |
| 2 · Motor de lectura + visor «Diccionario» | ✅ **En producción** (PR #1, merge `acfc64a`, 2026-10-26) |
| 3 · Capa de edición | ✅ **En producción** (PR #2, merge `13840d1`, 2026-10-27; probada en Android real) |
| 4 · Exportación (MVP) | ✅ **En producción** (PR #3, merge `3193b44`). Pruebas por píxeles hechas; corpus real: falta que el usuario ponga sus PDFs |
| 4.1 · Exploración de diseño | ✅ **En producción**: «Concreto» con losa flotante (PR #4, merge `557a3b4`) |
| 5 · Pulido, PWA, landing | 🔨 En curso en `dev`: PWA hecha; crítica + auditoría de Impeccable hechas (28/40 y 15/20) y sus 3 P1 + 2 P2 corregidos |

### Qué hace hoy la app (en `dev`)
- Abrir PDF (selector o arrastrar), render perezoso, abre en «ajustar a la página», zoom y Ctrl +/−/0.
- Uñeros (rangos en PDFs largos), palabras guía, revisión de cajas (líneas/párrafos).
- **Editar texto:** doble clic (o dos toques en celular) → editor en el lugar con la **fuente gemela**
  (Carlito/Calibri, Caladea/Cambria, Arimo/Arial-Helvetica, Tinos/Times, Cousine/Courier, Gelasio/Georgia),
  color de fondo y tinta leídos del render, línea base alineada, negritas/cursivas conservadas.
  Enter confirma, Esc cancela, Shift+Enter salto de línea, Ctrl+Z / Ctrl+Y.
- **Pellizcar para hacer zoom solo en el documento** (`src/hooks/usePinchZoom.ts`): la cabeza y las columnas no se
  mueven, un dedo recorre la lámina, el punto bajo los dedos se conserva, cerca de un ajuste vuelve a él. Con zoom
  manual la lámina puede pasarse del ancho.
- Columna de Cambios (escritorio) / hoja de Cambios (celular): «tachado → nuevo», «pág. n · Calibri → Carlito»,
  aviso si la fuente no tiene gemela, Restaurar.
- Avisos honestos: marca bermellón en lo editado; subrayado bermellón si el texto ya no cabe; escaneado sin texto;
  errores de archivo (vacío, dañado, contraseña, no PDF).
- **PWA** (solo en `dev`): instalable, abre sin conexión desde la segunda visita; la app y el visor se precachean, el
  motor de exportación y las fuentes se guardan al primer uso (`vite.config.ts`). Ícono propio desde
  `public/favicon.svg` (`scripts/make-icons.mjs`).
- **Sin perder cambios** (solo en `dev`): abrir otro PDF con cambios sin exportar pregunta antes, y el navegador avisa
  al recargar o cerrar (`src/store/unsaved.ts`). En celular, la pista de edición va sobre la hoja hasta el primer
  cambio; la revisión de cajas vive al fondo de la hoja de Cambios; botones de la losa a 44 px en táctil.
- **Exportar**: el botón se habilita con el primer cambio, muestra «Exportando…» y descarga
  `nombre-editado.pdf`. Corre en `src/workers/export.worker.ts` (PDFium wasm y gemelas se piden al propio origen
  solo al exportar). El resultado se avisa arriba de Cambios (y sobre la lámina en celular): línea de estado si salió
  igual, aviso bermellón si hubo avisos o error; cada entrada dice su aviso («letras un poco apretadas…»).

## 3. Lo último que pasó y la pregunta pendiente

**Lo último:** la Fase 3 (con zoom de pellizco, que al usuario le encantó) se juntó a `main`. El usuario cerró las 4
decisiones de la Fase 4 en lo recomendado y se construyó el **motor de exportación** en `src/core/writer/`:
PDFium borra los objetos de texto por posición → `gc.ts` tira el contenido viejo suelto → `fit.ts` acomoda cada
línea (espacio libre → Tz 85 % → achicar; títulos centrados siguen centrados) → pdf-lib dibuja con la gemela
recortada → guardado completo sin flujos de objetos. Devuelve un reporte (`notErased`, `squeezed`, `shrunk`,
`overflow`, `missingGlyphs`) para que la app avise. La prueba `export.test.ts` confirma que ni pdf.js ni PDFium
recuperan el texto viejo, que el resto queda intacto y que el PDF crece solo ~15 KB. Comentó que el diseño «se ve un
poco simple»: **lo dejamos para el final** (Fase 5).

Después se **conectó a la app** (worker, botón, avisos, e2e que descarga y relee el PDF) y se verificó en el navegador
de escritorio y en vista móvil.

El usuario exportó desde su celular y funcionó. Se pasó `/impeccable harden` por el flujo: «Preparando…» mientras
baja el motor la primera vez, aviso específico sin conexión (con Reintentar en el aviso), nombres larguísimos que
se parten, Ctrl/⌘ S exporta; e2e de sin-red → reintentar. Se abrió el **PR #3** `dev`→`main` con auto-merge.
El usuario preguntó por qué Chrome decía que accedía a su ubicación: la app no usa geolocalización (verificado en
código, build y preview); lo más probable es el indicador de Android sobre la app Chrome. En los previews Vercel
inyecta su barra de comentarios (`vercel.live`), que tampoco la usa; se puede apagar en Vercel si molesta.

Luego: pruebas por píxeles (`export.test.ts`, 0 cambios fuera de lo editado) y corpus privado (`npm run test:corpus`,
se salta solo sin PDFs). **Fase 4.1 en la rama `design`**: tres rondas de direcciones de Impeccable (bocetos en
`.impeccable/mocks/decision/`); el usuario eligió **Concreto** (arquitectura de González de León) y luego pidió otra
cabeza: se compararon «Losa flotante» y «Barra de fichas» en su celular y **ganó la Losa** (cabeza flotando sobre una
plaza con retícula, con la misma sombra larga que la hoja). Revisión final de Impeccable: ship. `DESIGN.md` reescrito.
Se juntó `design` en `dev` y se abrió el PR #4 a `main`.

El PR #4 se juntó: **Concreto está en producción**. Se arrancó la Fase 5 en `dev`: PWA instalable y sin conexión
(el usuario la instaló desde el preview de `dev` y funciona), luego `/impeccable critique` + `audit` (corridos en un
solo contexto, sin subagentes; reporte en `.impeccable/critique/`) y se corrigieron sus 5 hallazgos (ver «Qué hace hoy
la app»).

**Al cerrar la sesión, el usuario reportó (pendiente 1):** al hacer zoom con pellizco y recorrer la hoja de lado, lo
que rodea la hoja (pista de edición, aviso «Se descargó…», pie «PÁGINA n · archivo») se mueve con ella y si se va muy a
la derecha **se pierde de vista**. Quiere que se quede visible.

**Pregunta pendiente para el usuario (hacerla al retomar):**
> Arreglo lo que se pierde al hacer zoom (pendiente 1) y, cuando lo pruebes en el celular, ¿abro el PR de `dev` a
> producción con la PWA y los arreglos?
> Opciones: «Sí, arréglalo y luego PR» · «Arréglalo, pero el PR después».

## 4. Pendientes concretos (en orden)

1. **Lo que rodea la hoja no debe perderse al hacer zoom.** En `src/components/viewer/PageList.tsx` la pista
   (`EditHint`), el aviso de exportación (`ExportNotice`) y el pie de cada hoja (`figcaption` en `Page.tsx`) viven
   dentro del contenedor que se desplaza de lado. Idea: hacerlos `sticky` al borde izquierdo visible (`sticky left-*`)
   con ancho del visor, y el pie `sticky` dentro de su `figure`. Verificar con el e2e de pellizco (perfil `android`)
   que sigan a la vista tras recorrer a la derecha, y en el celular del usuario.
2. PR `dev`→`main` (PWA + arreglos de la crítica) con auto-merge, cuando el usuario lo pruebe.
3. El usuario borrará la PWA instalada desde el preview de `dev` y se quedará con la de producción cuando la PWA
   llegue a `main` (cada dirección es una app distinta).
4. Fase 5, siguientes skills según `PLAN.md` §8: `find-animation-opportunities` → `animate`, `review-animations` +
   `animation-performance`, landing con `design-taste-frontend` (requiere al usuario), `break-ui` final. Modo oscuro.
5. Corpus real: el usuario pone sus PDFs en `test-fixtures/privado/` y corre `npm run test:corpus`.
6. Las ramas `design`, `design-losa` y `design-fichas` se pueden borrar cuando el usuario lo apruebe.
7. Sin cancelar exportación todavía (tarda segundos).
8. Anotados en `PLAN.md`, sin fecha: autoguardado del log de ediciones en OPFS; orden de lectura por columnas para
   navegar con Tab; OCR (v4) — caso real: PDF escaneado exportado de Notion no se puede editar; modo oscuro, PWA y
   landing; prueba en iPhone real (ya se probó en Android).

## 5. Decisiones abiertas

Ninguna para la Fase 4: se cerraron el 2026-10-27 (ver sección 6). Notas para implementarla:
- Spike que valida el borrado: `spikes/spike3-pdfium-native.mjs`. Ojo: PDFium embebe la fuente completa → pasarle
  la gemela ya recortada (subset).
- Skills de la Fase 4 según `PLAN.md` §8: casi ninguna de diseño; `/impeccable harden` sobre el flujo de exportar;
  Playwright para tests visuales de ida y vuelta (exportar → reabrir → comparar píxeles y texto).
- La exportación debe respetar `BlockEdit.lines` (líneas tal como se cortaron en pantalla) y `runs` (estilo heredado).
- Siguen abiertas para la Fase 5: ¿iOS Safari de primera clase? Presupuesto de IA (ver `PLAN.md` §9).

## 6. Decisiones ya tomadas (no reabrir sin razón)

- Licencia **MIT** (se puede reevaluar AGPL solo si nos bloqueamos; mupdf.js queda fuera).
- Stack: pdf.js 6 (lectura/render), **@cantoo/pdf-lib + @cantoo/fontkit** (pdf-lib original pierde glifos en el
  subset; cantoo con `@pdf-lib/fontkit` truena), **@embedpdf/pdfium** para edición nativa (Fase 4 / v2).
- **Fase 4 (2026-10-27):** borrado real de los glifos editados con PDFium (`@embedpdf/pdfium`) desde el MVP, nunca
  solo tapar; guardado **completo**; prueba automática de que el texto viejo no se recupera. Texto que no cabe:
  espacio libre a la derecha → Tz/Tc hasta ~85 % → reflujo → reducir tamaño al final. Sin gemela: la más parecida
  + aviso.
- Unidad de edición: **párrafo/línea**, no fragmento (editar fragmentos encima el texto siguiente).
- Dirección visual **«Concreto»** (Fase 4.1, reemplaza al «Diccionario»): rampa de concreto `#F3F2EF`…`#2A2A28`,
  azul `#24466B` solo para lo activo, rojo `#A8322A` solo para avisos, Archivo como única letra, aristas a 90°, plaza
  con retícula de 24 px y **sombra larga y recta** (elegida por el usuario) solo en la hoja, la losa y el uñero
  actual. La cabeza es una **losa flotante**. Ver `DESIGN.md` y el contrato en `.impeccable/surfaces/src-app-tsx.md`.
- Flujo git: trabajar en `dev` → preview → PR `dev`→`main` con auto-merge (merge commit). `main` protegida: exige el
  check `check` del CI. Previews de Vercel sin login (protección de forks activa).
- i18n español (base) + inglés desde el inicio. Interfaz para usuario ocasional y frecuente, celular y escritorio
  con el mismo peso.

## 7. Cómo trabajar en este repo

- Comandos: `npm run dev` · `typecheck` · `lint` · `format` · `test` (unit) · `test:browser` · `test:e2e` ·
  `build` · `fixtures:long` y `fixtures:break` (PDFs de prueba generados, no versionados) · `review:capture`
  (capturas de revisión; requiere `npm run dev`).
- Interruptor de casos de prueba **solo en dev**: `http://localhost:5173/?fixture=<demo|long-name|300|mixed|rotated|scanned|empty|truncated|not-pdf|password>&lang=<es|en>`.
- `scripts/try-edit.mjs`: prueba guiada de edición con Playwright (requiere `npm run dev`).
- Vercel CLI instalada y con sesión (josse66). En PowerShell usar **`vercel.cmd`** (la política de scripts bloquea
  `vercel.ps1`; no cambiarla, es configuración de seguridad del usuario).
- `gh` autenticado como Josse66. El servidor de preview de la app: `.claude/launch.json` (nombre `dev`, puerto 5173).
- Antes de tocar UI: leer la skill `impeccable` (su `craft-floor.md`) y respetar `DESIGN.md`. En móvil: `mobile-native`.
  En movimiento: `emil-design-eng`/`animate`. `src/core/` es TS puro, sin React ni skills de diseño.
- Al terminar una tarea de fase: marcar su checkbox en `PLAN.md`.

## 8. Trampas técnicas ya resueltas (no repetirlas)

- pdf.js 6: el documento ya no tiene `destroy()` → destruir la **loading task**. Usar `fontExtraProperties: true`
  para leer el nombre real de la fuente desde `commonObjs` (tras `getOperatorList`).
- pdf.js tarda en cancelar un render: encadenar renders por canvas (si no, el viejo dibuja a otra escala encima).
- Medir la línea base del texto editado **después** de cargar la gemela (`document.fonts.load`), o queda ~2px abajo.
- Contornos de selección pegados a la caja (`outline-offset-0`); separados tapan la línea vecina.
- iOS hace zoom al enfocar texto < 16px: el editor táctil se pinta a ≥16px y se escala con `transform` (nunca
  `maximum-scale`).
- Exportación (Spike 4, `docs/fase0-hallazgos.md`): usar los **WOFF** de Fontsource convertidos a TTF
  (`core/fonts/woff.ts`), nunca WOFF2 (truena al recortar) ni el WOFF sin convertir (los lectores no lo abren).
  Embeber **sin ligaduras** (`liga/clig/dlig: false`) o el texto copiado sale mal. La raya «–» de Carlito se ve más
  corta que la de Calibri: es la gemela, no un error. PDFium deja el contenido viejo como objeto suelto → `gc.ts` +
  guardar con `useObjectStreams: false`. Ver un export: `EXPORT_OUT=ruta.pdf npx vitest run src/core/writer` y
  `node spikes/render-page.mjs ruta.pdf salida.png`.
- El wasm de PDFium se importa como `@embedpdf/pdfium/pdfium.wasm?url` (la ruta `dist/…` no está en los `exports`
  del paquete). Siempre pasarle `wasmBinary`: si no, PDFium lo baja de jsDelivr (rompe la promesa de privacidad).
  La primera exportación en `npm run dev` recarga la página porque Vite optimiza deps nuevas: es solo en desarrollo.
- Zoom con pellizco: el visor lleva `touch-action: pan-x pan-y` (nunca `maximum-scale`); el canvas limita su
  densidad a ~12 M píxeles (iOS no dibuja canvases de más de ~16,7 M). El e2e simula dos dedos con CDP
  (`Input.dispatchTouchEvent`) en el perfil `android`.
- Playwright: `getByRole('figure', { name: 'Página 1', exact: true })` (sin `exact` choca con «Página 10»).
- Tests en Node usan `pdfjs-dist/legacy/build/pdf.mjs`; la app usa la build normal con worker `?url`.
- El detector de Impeccable marca nombres de fuentes en tests y bocetos: se ignoran **por archivo** con
  `impeccable hooks ignore-value <regla> "*" --file <ruta> --reason "..."` (nunca `ignore-rule` sin permiso).

## 9. Sobre el usuario

- Responder en **español, tono casual**. Explicar la jerga en palabras simples (está aprendiendo; viene de Full Stack Open).
- **Dicta por voz:** interpretar homófonos por contexto («Meet» = MIT) y decir la interpretación en una línea.
- Quiere investigación profunda que incluya **tecnología nueva o subutilizada**, no solo lo que ya existe.
- Prueba en el preview antes de pasar a producción. Aprueba explícitamente cambios de configuración (repo, Vercel).
- Idea de producto: código abierto ahora; quizá un costo muy bajo más adelante.
- En diseño decide **viendo las opciones funcionando en su celular** (ramas separadas con preview) y le gusta
  **combinar** lo mejor de varias. Las páginas de decisión de Impeccable a veces se le cierran: si `--wait` devuelve
  `PAGE CLOSED`, preguntarle por chat; y la página solo muestra bocetos guardados después de `--start`.
- Cuando dice «termina» o «continúa», quiere que se avance sin más preguntas de las necesarias.
