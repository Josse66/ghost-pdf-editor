# Estado de Ghost PDF Editor

> **Último guardado:** 2026-10-27 · rama de trabajo `dev` en `75b42db` · producción (`main`) en `acfc64a`
> (PR #2 de la Fase 3 abierto con auto-merge; al juntarse, `main` queda con la Fase 3).
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
| 3 · Capa de edición | ✅ Terminada y probada en celular real. **PR #2 `dev`→`main` con auto-merge** (2026-10-27) |
| 4 · Exportación (MVP) | ⏭️ Siguiente. Antes hay decisiones abiertas (sección 5) |
| 5 · Pulido, PWA, landing | Pendiente |

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
- **Todavía NO exporta** (Fase 4).

## 3. Lo último que pasó y la pregunta pendiente

**Lo último:** el usuario probó la Fase 3 en su celular (Android, Chrome) y pidió zoom con pellizco solo en el
documento; se hizo (`75b42db`) y le encantó («mucho más intuitivo para editar»). Se abrió el **PR #2** `dev`→`main`
con auto-merge (merge commit). Comentó que el diseño «se ve un poco simple»: **lo dejamos para el final** (Fase 5),
probando varias direcciones; no es prioridad ahora.

Si el PR #2 ya se juntó y `dev` no está sincronizado: `git checkout dev && git merge --ff-only origin/main && git push`.

Luego el usuario cerró las 4 decisiones de la Fase 4, todas en lo recomendado (sección 6).

**Pregunta pendiente para el usuario (hacerla al retomar):**
> ¿Empiezo a construir la Fase 4 por el motor (`core/writer` con borrado PDFium + prueba de que el texto viejo no
> se recupera)?
> Opciones: «Sí, arranca por el motor» · «Primero documentar la Fase 3 con Impeccable (pendiente 2)».

## 4. Pendientes concretos (en orden)

1. Confirmar que el PR #2 (Fase 3) se juntó y sincronizar `dev` con `main`.
2. Refrescar `.impeccable/design.json` (quedó más viejo que `DESIGN.md`) y documentar los
   componentes nuevos de la Fase 3 (capa de edición, hoja de Cambios) con el documentador de Impeccable. Opcional:
   revisión final de Impeccable (`impeccable-finish-reviewer`) sobre la capa de edición.
3. Construir la **Fase 4** (decisiones ya tomadas; notas en la sección 5).
4. Anotados en `PLAN.md`, sin fecha: autoguardado del log de ediciones en OPFS; orden de lectura por columnas para
   navegar con Tab; OCR (v4) — caso real: PDF escaneado exportado de Notion no se puede editar; modo oscuro, PWA y
   landing (Fase 5); prueba en iPhone real (ya se probó en Android).
5. **Rediseño visual al final (Fase 5):** el usuario siente la UI «un poco simple»; probar varias direcciones de
   diseño con Impeccable cuando lo funcional esté listo.

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
- Dirección visual **«Diccionario»**: papel biblia `#F6F6F3` (nunca crema), tinta `#161412`, bermellón `#B8321F`
  (tachado, edición activa, avisos, uñero actual), ultramar `#2C4F9E` (enlaces, selección, foco, cajas debug).
  **Serif (Source Serif 4) solo en palabras guía, «Cambios», entradas de cambios, nombre tachado y definiciones**;
  todo lo demás en Hanken Grotesk. Uñeros de media luna como firma. Ver `DESIGN.md`.
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
