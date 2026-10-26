# Ghost PDF Editor — Plan maestro

> Editor de PDF en el navegador: subes un PDF, editas el texto **directo sobre la página** sin romper el formato, y exportas un PDF. Gratis, sin subir archivos a ningún servidor.

---

## 0. La visión (qué tan potente puede ser esto)

**El problema real:** un PDF no tiene "párrafos", tiene instrucciones de dibujo (`pon el glifo "H" en x=72, y=700 con la fuente F3 a 11pt`). Editar "directo" significa reconstruir líneas/párrafos a partir de esos glifos, dejar que el usuario los cambie, y volver a escribirlos de forma que se vea idéntico.

**Por qué vale la pena:** las herramientas que lo hacen bien (Acrobat, Nutrient/PSPDFKit, Apryse, Smallpdf, iLovePDF Pro) cobran justo esta función. Hasta 2025, lo gratis solo dejaba *anotar encima*. *(Actualizado en Fase 0: en 2026 Stirling-PDF v3 y BentoPDF ya editan texto gratis en el navegador con PDFium-WASM. Nuestra ventaja ya no es "ser gratis", sino privacidad verificable, fidelidad en CVs y facturas de Office/Docs, y ligereza en móvil. Ver `reports/Tecnologías para editor PDF web.md`.)*

**Ventaja competitiva real:**
1. **100% local** — el PDF nunca sale del dispositivo. Privacidad = argumento de venta (contratos, CVs, facturas).
2. **Gratis y sin marca de agua.**
3. **PWA instalable** — funciona offline en Android y escritorio, sin Play Store.
4. **Portafolio de nivel alto** — parsing binario, canvas, Web Workers, fuentes, testing visual. No es "otro CRUD".

**Techo del proyecto (a dónde puede llegar):**
| Nivel | Qué hace | Dificultad |
|---|---|---|
| v1 MVP | Editar texto existente (tapar + redibujar), exportar | Media |
| v2 | Mover/redimensionar bloques, agregar texto/imágenes, firmar, multi-página fluido, PWA offline | Media-alta |
| v3 | Edición "nativa" reescribiendo el content stream (conserva la fuente original real), reflujo de párrafos | Alta |
| v4 | OCR para PDFs escaneados (convertir imagen → texto editable) | Alta |

---

## 1. Decisiones de arquitectura (con correcciones al plan anterior)

### 1.1 Web app (PWA), no nativa — ✅ confirmado
Todo el ecosistema serio de PDF en cliente está en JS/WASM. Android nativo no tiene nada para *editar* PDF.

### 1.2 Todo client-side, sin backend — ✅ confirmado
Vercel solo sirve archivos estáticos. Razones: límite de ~4.5 MB por request en funciones de Vercel, privacidad, y costo $0.

### 1.3 ⚠️ Corrección: **Vite + React**, no Next.js
El plan anterior proponía Next.js. Para esta app es la herramienta equivocada:
- No hay SSR, ni rutas de servidor, ni SEO dinámico, ni API. Todo pasa en el navegador.
- pdf.js usa `window`, `canvas`, `DOMMatrix` y Web Workers → en Next tendrías que llenar todo de `"use client"` y `dynamic(..., { ssr: false })` y pelear con el worker.
- Vite: arranque instantáneo, el worker se importa con `?worker`/`?url` sin scripts `postinstall`, y Vercel lo despliega igual de fácil (detecta Vite solo).
- Si algún día quieres landing con SEO o cuentas de usuario, se agrega aparte (Astro/Next para la landing, la app sigue en Vite).

> React sigue siendo React: lo que aprendes en Full Stack Open aplica 1:1.

### 1.4 Librerías

| Capa | Elección | Licencia | Por qué |
|---|---|---|---|
| Lectura / render | **pdfjs-dist** (Mozilla) | Apache-2.0 | Estándar de facto, render fiel, `getTextContent()` da posición, fuente y transform de cada fragmento |
| Escritura / export | ✅ **@cantoo/pdf-lib** | MIT | Decidido en Fase 0: pdf-lib original (sin release desde 2021) pierde glifos al hacer subset; el fork de Cantoo sale perfecto |
| Fuentes custom | ✅ **@cantoo/fontkit** | MIT | Obligatorio con @cantoo/pdf-lib (con `@pdf-lib/fontkit` el subset truena) |
| Motor nativo (v2/v3) | ✅ **@embedpdf/pdfium** (PDFium WASM) | MIT (PDFium: BSD) | Borra texto de verdad, da color/fuente/tamaño reales. Detrás de `PdfEngine`. Ver `docs/fase0-hallazgos.md` |
| ~~Alternativa pro~~ | ~~mupdf.js~~ | AGPL / comercial | Descartado por la licencia MIT del proyecto (ver 1.5). Solo si algún día cambiamos a AGPL |
| UI | React 19 + TypeScript + Tailwind v4 + shadcn/ui | MIT | Tu stack |
| Estado | **Zustand** | MIT | Simple, sin boilerplate, fácil undo/redo |
| Capa interactiva | DOM absoluto (divs/`contenteditable`) sobre el canvas | — | Más simple y accesible que fabric/konva para texto. Konva solo si luego haces dibujo libre |
| Tests | **Vitest** (unit) + **Playwright** (e2e + comparación visual) | MIT | |
| PWA | **vite-plugin-pwa** (Workbox) | MIT | Instalable + offline |

### 1.5 Licencia — ✅ decidido: **MIT**
- Repo **público** en GitHub, código abierto bajo **MIT**. Todo el stack es permisivo: pdf.js (Apache-2.0), @cantoo/pdf-lib (MIT), @embedpdf/pdfium (MIT) y las fuentes Carlito/Liberation/Caladea (OFL/Apache).
- Deja abierta la puerta a cobrar un precio bajo más adelante sin deberle nada a nadie.
- Obligación: conservar los avisos de copyright de las dependencias y fuentes (página de créditos / `THIRD_PARTY_LICENSES`).
- Si algún día nos bloqueamos y mupdf.js resuelve algo que PDFium no, se puede reevaluar el cambio a AGPL. Por eso el motor va detrás de la interfaz `PdfEngine`.
- Detalle en `docs/decisiones/0001-licencia-mit.md`.

### 1.6 Arquitectura en capas

```
┌─────────────────────────────────────────────┐
│  UI (React)  — visor, toolbar, overlay edit │
├─────────────────────────────────────────────┤
│  Store (Zustand) — documento, ediciones,    │
│                    selección, undo/redo     │
├─────────────────────────────────────────────┤
│  Core (TS puro, SIN React, testeable)       │
│   ├─ reader/   pdf.js → modelo de bloques   │
│   ├─ layout/   glifos → líneas → párrafos   │
│   ├─ fonts/    mapeo fuente PDF → fuente    │
│   ├─ color/    muestreo de fondo / texto    │
│   └─ writer/   pdf-lib → PDF final          │
├─────────────────────────────────────────────┤
│  Workers — parsing y export fuera del hilo  │
│            principal (no congelar la UI)    │
└─────────────────────────────────────────────┘
```

**Regla de oro:** `core/` no importa nada de React. Así lo testeas con Vitest contra PDFs reales y puedes cambiar la UI cuando quieras.

### 1.7 El modelo de datos (el corazón)

```ts
type TextBlock = {
  id: string;
  page: number;
  // geometría en coordenadas PDF (puntos, origen abajo-izquierda)
  x: number; y: number; width: number; height: number;
  baseline: number;
  rotation: number;            // de la matriz transform
  text: string;                // texto original
  fontName: string;            // nombre interno del PDF (p.ej. "ABCDEF+Calibri-Bold")
  fontFamily: string;          // normalizado: "Calibri"
  bold: boolean; italic: boolean;
  fontSize: number;
  color: [number, number, number];
  bgColor?: [number, number, number]; // detectado al exportar
};

type Edit = { blockId: string; newText: string; /* luego: dx, dy, fontSize... */ };
```

El documento original **nunca se modifica en memoria**; guardas una lista de `Edit`s y las aplicas al exportar. Eso te da undo/redo gratis y export reproducible.

---

## 2. Los riesgos técnicos (dónde se muere un proyecto así)

Ordenados por qué tanto duelen:

1. **Fuentes (el #1).** Los PDFs embeben fuentes **subconjunto** (solo los glifos usados). Si el original dice "Hola" y escribes "Adiós", la fuente embebida probablemente no tiene "A", "d", "ó"... → No puedes reutilizarla tal cual.
   - **Estrategia v1:** mapear el nombre (`ABCDEF+Calibri-Bold` → Calibri Bold) a una fuente equivalente libre (Carlito ≈ Calibri, Liberation Sans ≈ Arial, Liberation Serif ≈ Times, Caladea ≈ Cambria, etc.) y embeberla con fontkit. Tener una tabla de equivalencias.
   - **Fallback:** las 14 fuentes estándar de PDF (Helvetica/Times/Courier) — pero no soportan bien Unicode fuera de Latin-1.
   - **v3:** intentar reutilizar la fuente original si contiene todos los glifos nuevos.
2. **Agrupar texto.** `getTextContent()` devuelve fragmentos sueltos (a veces letra por letra, a veces palabras cortadas). Hay que unirlos en líneas y párrafos por proximidad y baseline. Algoritmo propio, mucho test.
3. **Tapar el original sin que se note.** Rectángulo blanco funciona en 80% de los casos. Fondos de color/degradado/imagen → muestrear píxeles del canvas alrededor del bloque. **Mejor aún (v2/v3):** eliminar realmente los operadores de texto del content stream en vez de taparlos (el texto viejo sigue siendo seleccionable/buscable si solo lo tapas — eso es un problema de privacidad si alguien "borra" un dato sensible).
4. **Texto más largo que el original.** Opciones: reducir tamaño, comprimir espaciado (`characterSpacing`), o hacer wrap a varias líneas. Decidir política por defecto.
5. **Coordenadas.** pdf.js da viewport con origen arriba-izquierda escalado; PDF usa puntos con origen abajo-izquierda. Páginas rotadas y `CropBox` ≠ `MediaBox`. Centralizar todas las conversiones en un solo módulo con tests.
6. **PDFs escaneados.** No tienen texto, son imágenes → fuera del MVP; detectarlos y avisar al usuario. OCR (Tesseract.js) en v4.
7. **Rendimiento.** PDFs de 100+ páginas: render perezoso (solo páginas visibles), workers, liberar canvas fuera de pantalla.
8. **PDFs cifrados / con formularios / firmados.** Detectar y manejar con mensaje claro. Editar un PDF firmado invalida la firma — avisar.

---

## 3. Fases

Cada fase termina con algo **desplegado en Vercel** que puedas abrir en el celular. Nada de fases "invisibles".

### Fase 0 — Investigación y spikes (3–5 días)
Objetivo: eliminar incertidumbre antes de construir.
- [x] Verificar y correr los repos de referencia mencionados antes (`gafapa/pdfedit`, `Aicrag2310/PDFBlack`, `ennkaos/pdfFlow-Engine`) — **confirmar que existen y su licencia** antes de copiar ideas o código. *(Existen, pero ninguno sirve de base; ver reporte de investigación.)*
- [ ] Armar el **corpus de PDFs de prueba** en `test-fixtures/` (ver sección 5). *(Sintéticos listos en `test-fixtures/generated/`; los reales los aporta el usuario al llegar a la Fase 2, en `test-fixtures/privado/`.)*
- [x] Spike 1: script que carga un PDF con pdf.js y vuelca `getTextContent()` + `commonObjs` de fuentes a JSON. Ver qué tan feo viene.
- [x] Spike 2: con pdf-lib, abrir un PDF, dibujar rectángulo blanco + texto con Carlito embebida, guardar. Abrir en Acrobat/Chrome y comparar.
- [x] Spike 3 (opcional): lo mismo con mupdf.js para comparar calidad. *(Se hizo con PDFium WASM/MIT en lugar de mupdf/AGPL.)*
- [x] Decidir: pdf-lib vs @cantoo/pdf-lib, y licencia (sección 1.5). *(→ @cantoo/pdf-lib + MIT.)*
- [x] Investigación profunda de tecnologías actuales: `reports/Tecnologías para editor PDF web.md`.
- **Entregable:** `docs/fase0-hallazgos.md` con capturas y decisiones.

### Fase 1 — Setup del proyecto (1 día)
- [x] Vite + React + TS (`npm create vite@latest`), Tailwind v4, shadcn/ui (`npx shadcn@latest init`). *(Vite 8, React 19.3, TS 6, shadcn radix-nova.)*
- [x] ESLint + Prettier, alias `@/`, `tsconfig` estricto. *(Vite 8 trae **oxlint** en lugar de ESLint; se queda oxlint + Prettier.)*
- [x] Vitest 4 (unit + **browser mode** con `toMatchScreenshot`) + Playwright configurados con 1 test cada uno. *(Salió Vitest 5; proyectos `unit` y `browser`. Playwright corre en escritorio + Pixel 7.)*
- [x] Estructura de carpetas (sección 4) + `src/core/engine.ts` con la interfaz `PdfEngine` vacía.
- [x] Dependencias del motor fijadas: `pdfjs-dist@6`, `@cantoo/pdf-lib`, `@cantoo/fontkit` (PDFium se agrega en Fase 4).
- [x] `LICENSE` (MIT) + `THIRD_PARTY_LICENSES` / créditos de fuentes y librerías.
- [x] `.gitignore` con `test-fixtures/privado/`; los `spikes/` se quedan como referencia.
- [x] `PRODUCT.md` (`/impeccable init`) y dirección visual «Diccionario» (`/impeccable shape`), con brief en `.impeccable/surfaces/src-app-tsx.md`.
- [x] Repo **público** `ghost-pdf-editor` en GitHub (rama `main`), conectado a Vercel → deploy automático + preview por cada PR. *([github.com/Josse66/ghost-pdf-editor](https://github.com/Josse66/ghost-pdf-editor) · [ghost-pdf-editor.vercel.app](https://ghost-pdf-editor.vercel.app). En PowerShell usar `vercel.cmd`.)*
- [x] GitHub Actions: lint + typecheck + test en cada PR. *(Verde en 44 s.)*
- 🧰 **Skills:** `/impeccable init` (crea `PRODUCT.md`: quién lo usa, tono, personalidad) → `/impeccable shape` (dirección visual y tokens antes de escribir UI) → `pick-ui-library` (confirmar shadcn + qué libs extra: toasts, iconos, drag) → `ask-sonner` si eliges Sonner para notificaciones.
- **Entregable:** ✅ página vacía desplegada en `ghost-pdf-editor.vercel.app`.

### Fase 2 — Motor de lectura (1–2 semanas)
- [x] Drag & drop / selector de archivo (el archivo se lee como `ArrayBuffer`, nunca se sube).
- [x] Render de páginas con pdf.js en canvas, con zoom y scroll; render perezoso. *(Solo se dibujan las páginas cercanas; ajustar al ancho, zoom ± y Ctrl +/−/0.)*
- [x] `core/reader`: extraer fragmentos → `core/layout`: agrupar en `TextBlock`s. *(Líneas con runs por estilo y párrafos; columnas y celdas de tabla separadas; texto rotado. Pendiente para la Fase 3: orden de lectura por columnas, hoy intercala.)*
- [x] Modo debug: dibujar las cajas de cada bloque encima del render (clave para depurar). *(Panel «Revisión»: líneas en ultramar, párrafos en bermellón.)*
- [x] Tests de `layout` contra el corpus. *(Sintético: CV, dos columnas, factura, rotado. Falta sumar los PDFs reales del usuario.)*
- 🧰 **Skills:** `/impeccable craft` para la pantalla de carga (drop zone, estado vacío, progreso) y el visor. `break-ui` sobre el visor: PDF de 1 página, de 300, nombre de archivo larguísimo, PDF vacío/corrupto. *El motor (`core/`) no usa skills de diseño.*
- **Entregable:** subes un PDF y ves los bloques de texto resaltados correctamente.

### Fase 3 — Capa de edición (1–2 semanas)
- [ ] Doble clic en bloque → `contenteditable` posicionado exacto, con fuente/tamaño/color aproximados (CSS).
- [ ] Store de ediciones + undo/redo (Ctrl+Z / Ctrl+Y).
- [ ] Indicador visual de bloques editados.
- [ ] Soporte táctil (celular).
- 🧰 **Skills:** `emil-design-eng` (la capa de edición ES la experiencia: hover, foco, selección, feedback al editar). `prototype` para probar 2–3 variantes del overlay de edición y elegir. `mobile-native` para el soporte táctil (zoom en inputs, long-press, tap highlight). `apple-design` si haces pinch-zoom / gestos.
- **Entregable:** puedes editar varios bloques y ver el resultado en pantalla.

### Fase 4 — Motor de exportación (1–2 semanas) ← **aquí se gana o se pierde**
- [ ] `core/fonts`: tabla de equivalencias + carga de fuentes libres (servidas desde `/public/fonts`, cacheadas).
- [ ] `core/color`: muestreo de fondo del canvas alrededor del bloque.
- [ ] `core/writer`: por cada `Edit` → tapar → dibujar texto nuevo con fuente/tamaño/color/rotación correctos → ajuste si no cabe.
- [ ] Export en un Web Worker, descarga con nombre `original-editado.pdf`.
- [ ] Tests visuales: renderizar PDF exportado vs original y comparar píxeles (Playwright screenshots / pixelmatch) fuera de la zona editada.
- 🧰 **Skills:** casi ninguna de diseño — esta fase es motor puro. Solo `/impeccable harden` sobre el flujo de exportar (errores, progreso, archivo grande, cancelar). Plugin **Playwright** (si lo activaste) o el navegador de la app para los tests e2e.
- **Entregable: MVP v1.** Editar y exportar un CV/factura y que no se note.

### Fase 5 — Pulido y PWA (1 semana)
- [ ] UI final (toolbar, miniaturas de páginas, atajos de teclado, modo oscuro).
- [ ] vite-plugin-pwa: instalable + offline.
- [ ] Manejo de errores amable (cifrado, escaneado, corrupto).
- [ ] Landing simple + "tus archivos nunca salen de tu dispositivo".
- 🧰 **Skills (esta es la fase de diseño fuerte):**
  1. `/impeccable critique` + `/impeccable audit` sobre toda la app → lista de problemas.
  2. `/impeccable polish`, `typeset`, `layout`, `adapt` (responsive) según lo que salga.
  3. `find-animation-opportunities` → `animate` para lo que valga la pena (abrir panel, guardar, exportar listo).
  4. `review-animations` + `animation-performance` (el canvas del PDF + animaciones = riesgo de jank).
  5. `mobile-native` para la PWA instalada (safe areas, status bar, 100vh).
  6. `design-taste-frontend` para la **landing** (es su especialidad: páginas públicas).
  7. `break-ui` final sobre toolbar y miniaturas.
  8. `/impeccable document` → genera `DESIGN.md` con el sistema de diseño final.
- **Entregable: v1.0 pública.**

### Fase 6+ — Roadmap
- v1.x: mover/redimensionar bloques, agregar texto nuevo, insertar imágenes, firma dibujada, rellenar formularios (AcroForm, pdf-lib ya lo soporta), reordenar/eliminar/rotar páginas, unir PDFs.
- v2: eliminar texto original del content stream (redacción real) en vez de taparlo.
- v3: edición nativa del content stream conservando la fuente original; reflujo de párrafos.
- v4: OCR con Tesseract.js para escaneados.

---

## 4. Estructura de carpetas

```
pdf-master/
├─ public/
│  └─ fonts/               # Carlito, Liberation, Caladea, Noto... (licencias OFL)
├─ src/
│  ├─ core/                # TS puro — sin React
│  │  ├─ engine.ts         # interfaz PdfEngine (permite cambiar a mupdf después)
│  │  ├─ reader/
│  │  ├─ layout/
│  │  ├─ fonts/
│  │  ├─ color/
│  │  ├─ writer/
│  │  └─ geometry.ts       # TODAS las conversiones de coordenadas
│  ├─ workers/             # export.worker.ts, parse.worker.ts
│  ├─ store/               # Zustand: document, edits, ui
│  ├─ components/
│  │  ├─ ui/               # shadcn
│  │  ├─ viewer/           # PageCanvas, PageList, Thumbnails
│  │  └─ editor/           # TextOverlay, EditableBlock, Toolbar
│  ├─ hooks/
│  ├─ lib/                 # utils
│  ├─ App.tsx
│  └─ main.tsx
├─ test-fixtures/          # corpus de PDFs
├─ tests/
│  ├─ unit/                # Vitest (core/)
│  └─ e2e/                 # Playwright
├─ docs/                   # decisiones, hallazgos
└─ PLAN.md
```

---

## 5. Corpus de prueba (tu mejor amigo)

Junta 10–15 PDFs variados y no los cambies: son tu benchmark.
- CV hecho en Word (Calibri) → exportado a PDF
- CV hecho en Google Docs
- Factura generada por un sistema (fuentes raras)
- Documento LaTeX (fuentes Type1, ligaduras "fi")
- PDF con texto sobre fondo de color
- PDF con página rotada 90°
- PDF de 100+ páginas (rendimiento)
- PDF con acentos/ñ y otro con texto no latino
- PDF escaneado (para probar que se detecta y avisa)
- PDF con formulario
- PDF cifrado con contraseña

Cada fase se mide: "¿cuántos del corpus funcionan bien?"

---

## 6. Flujo de trabajo

- **Git:** dos ramas fijas.
  - `main` = **producción** (`ghost-pdf-editor.vercel.app`). Solo recibe merges desde `dev`, ya verificados.
  - `dev` = **integración**. Ahí se trabaja (o en ramas cortas `feat/…` / `fix/…` que se unen a `dev`). Cada push a `dev` genera un preview en Vercel con URL fija de rama, para probarlo en el celular.
  - Cuando `dev` funciona en el preview y el CI está en verde → PR `dev` → `main` → merge = deploy a producción.
- **Commits:** Conventional Commits (`feat:`, `fix:`, `refactor:`, `test:`).
- **Issues:** cada checkbox de las fases = un issue en GitHub; un Project board (Kanban) con columnas Todo / Doing / Done.
- **Definición de "terminado":** funciona en el corpus, tiene test, está desplegado.
- **Docs de decisiones:** cada decisión importante (pdf-lib vs mupdf, política de texto largo...) → una nota corta en `docs/decisiones/`.

---

## 7. Entorno local — pendientes

- ✅ Node 22.19, npm 10.9, git 2.51, Vercel CLI disponibles.
- ✅ Proyecto movido fuera de OneDrive a `C:\dev\pdf-master`.
- ✅ GitHub CLI (`gh`) instalado y autenticado (usuario Josse66).
- ✅ Node actualizado a 22.23.4.
- ✅ Nombre: **Ghost PDF Editor** (repo sugerido: `ghost-pdf-editor`).

---

## 8. Mapa de skills y herramientas instaladas

Instaladas en `.claude/` del proyecto (versiones fijadas en `skills-lock.json`). **Cómo se activan:** las skills se cargan solas cuando la tarea coincide con su descripción, y también Claude las puede invocar. Tú puedes forzarlas escribiendo `/nombre` (p. ej. `/break-ui`). Claude debe **avisarte al inicio de cada fase** cuáles tocan (ver `CLAUDE.md`).

### Quién manda en qué (para que no se peleen)
Varias skills de diseño se traslapan. Regla para no recibir consejos contradictorios:

| Terreno | Skill principal | Apoyo |
|---|---|---|
| UI de la app (editor, toolbar, paneles) | **Impeccable** | `emil-design-eng` para detalles finos |
| Movimiento / animación | **Emil** (`animate`, `review-animations`) | — |
| Landing / páginas públicas | **Taste** (`design-taste-frontend`) | Impeccable para revisar |
| Móvil / PWA | **`mobile-native`** | `apple-design` para gestos |
| `frontend-design` (Anthropic) | **No usar** — redundante con Impeccable | — |

### Referencia rápida

| Skill | Qué hace | Fase |
|---|---|---|
| `/impeccable init` | Crea `PRODUCT.md` (contexto de producto que leen las demás) | 1 |
| `/impeccable shape` | Define dirección visual antes de construir | 1 |
| `/impeccable craft` | Construye una pantalla con calidad | 2, 3 |
| `/impeccable critique` · `audit` | Revisión UX / técnica (a11y, rendimiento, responsive) | 5 |
| `/impeccable polish` · `typeset` · `layout` · `colorize` · `clarify` · `adapt` | Ajustes finos dirigidos | 5 |
| `/impeccable harden` | Estados de error, vacío, carga, casos límite | 4, 5 |
| `/impeccable document` | Genera `DESIGN.md` del sistema final | 5 |
| Hook de Impeccable | Corre solo tras cada edición de UI; avisa contraste, overflow, etc. | siempre |
| `pick-ui-library` | Elegir librerías de UI confiables | 1 |
| `ask-sonner` | Toasts con Sonner | 1, 5 |
| `emil-design-eng` | Pulido de componentes e interacción | 3, 5 |
| `prototype` | Varias versiones de un componente para comparar | 3 |
| `break-ui` | Probar UI con datos extremos | 2, 5 |
| `mobile-native` | Que la web se sienta app en el celular | 3, 5 |
| `apple-design` | Gestos, springs, sheets | 3 |
| `find-animation-opportunities` → `animate` | Dónde animar y cómo | 5 |
| `review-animations` · `improve-animations` · `animation-performance` | Revisar / auditar / arreglar jank | 5 |
| `animation-vocabulary` | Ponerle nombre a una animación que viste | cuando sea |
| `design-taste-frontend` | Dirección de arte anti-genérica | 5 (landing) |
| Plugin **Playwright** (opcional) | Tests e2e / navegador automatizado | 4, 5 |
| `gh` (GitHub CLI) | Crear repo, PRs, issues | 1 en adelante |

### Notas
- El hook de Impeccable también revisa `.ts`; si molesta en `src/core/`, excluirlo con `/impeccable hooks ignore-file "src/core/**"`.
- No instalados a propósito: OmniRoute, Headroom, MemPalace (ver historial de la sesión).

---

## 9. Siguiente paso inmediato

1. ✅ Ubicación (`C:/dev/pdf-master`) y nombre (Ghost PDF Editor) decididos.
2. ✅ **Fase 0** terminada (falta solo el corpus real, que llega en Fase 2). Ver `docs/fase0-hallazgos.md`.
3. **Decisiones abiertas** que salieron del reporte de investigación (§ "Decisiones que tienes que tomar"). Se cierran cuando llegue su fase:
   - **Antes de la Fase 4:** ¿adelantar al MVP la *eliminación real* de los glifos editados (PDFium), con guardado completo y una prueba automática de que el texto viejo no se recupera? Recomendado: sí, es la promesa de privacidad.
   - **Fase 4:** fuentes faltantes (sustituir el run completo + aviso), Aptos y otras fuentes sin clon libre, límites de Tz/Tc antes de pasar a reflujo.
   - **Fase 5:** ¿iOS Safari es de primera clase? Presupuesto de IA (qué paquetes, solo escritorio o también móvil).
   - **Posicionamiento (§0):** la edición gratis en el navegador ya existe (Stirling-PDF v3, BentoPDF). Ghost se diferencia por privacidad *verificable*, fidelidad en CVs y facturas de Office/Docs, y ligereza en móvil.
4. 👉 **Fase 1 — Setup**, en este orden:
   1. `/impeccable init` → crea `PRODUCT.md`. **Requiere al usuario:** preguntas sobre quién lo usa, tono y personalidad.
   2. `/impeccable shape` → dirección visual y tokens. **Requiere al usuario:** elegir entre direcciones.
   3. Scaffold: Vite + React + TS + Tailwind v4 + shadcn, ESLint/Prettier, Vitest 4 + Playwright, carpetas, `PdfEngine`, deps del motor, LICENSE MIT.
   4. `/pick-ui-library` → **lo escribe el usuario** (no se activa solo): confirmar shadcn + iconos/toasts/drag. Luego `ask-sonner` si elegimos Sonner.
   5. Repo público en GitHub + Vercel + GitHub Actions. **Requiere al usuario:** confirmar la creación del repo y, si se pide, iniciar sesión en Vercel.
   6. Entregable: página vacía en `ghost-pdf-editor.vercel.app`.
