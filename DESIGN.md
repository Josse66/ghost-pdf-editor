---
name: Ghost PDF Editor
description: Editor de PDF en el navegador que se lee como un diccionario de consulta.
colors:
  ink-0: "#f6f6f3"
  ink-1: "#eae9e5"
  ink-2: "#dcdbd6"
  ink-3: "#c7c5bf"
  ink-4: "#aba8a1"
  ink-5: "#8e8a83"
  ink-6: "#726e67"
  ink-7: "#5a564f"
  ink-8: "#423f39"
  ink-9: "#2c2925"
  ink-10: "#161412"
  vermilion: "#b8321f"
  ultramar: "#2c4f9e"
  sheet-white: "#ffffff"
typography:
  display:
    fontFamily: "Hanken Grotesk Variable, system-ui, sans-serif"
    fontSize: "2.4rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.025em"
  display-compact:
    fontFamily: "Hanken Grotesk Variable, system-ui, sans-serif"
    fontSize: "2rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Hanken Grotesk Variable, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Hanken Grotesk Variable, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 600
    lineHeight: 1.4
  brand:
    fontFamily: "Hanken Grotesk Variable, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 600
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Hanken Grotesk Variable, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.375
  label:
    fontFamily: "Hanken Grotesk Variable, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: 1.43
  caption:
    fontFamily: "Hanken Grotesk Variable, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.375
  guide:
    fontFamily: "Source Serif 4 Variable, Georgia, serif"
    fontSize: "15px"
    fontWeight: 400
    letterSpacing: "0.08em"
    fontFeature: "\"smcp\", \"c2sc\", \"tnum\""
  entry:
    fontFamily: "Source Serif 4 Variable, Georgia, serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.625
  entry-term:
    fontFamily: "Source Serif 4 Variable, Georgia, serif"
    fontSize: "19px"
    fontWeight: 600
    lineHeight: 1.4
  tab-numeral:
    fontFamily: "Source Serif 4 Variable, Georgia, serif"
    fontSize: "15px"
    fontWeight: 600
    lineHeight: 1
    fontFeature: "\"tnum\""
  tab-numeral-3:
    fontFamily: "Source Serif 4 Variable, Georgia, serif"
    fontSize: "12.5px"
    fontWeight: 600
    lineHeight: 1
    fontFeature: "\"tnum\""
  tab-numeral-4:
    fontFamily: "Source Serif 4 Variable, Georgia, serif"
    fontSize: "11px"
    fontWeight: 600
    lineHeight: 1
    fontFeature: "\"tnum\""
rounded:
  segment: "3px"
  md: "3.2px"
  lg: "4px"
  tab: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.ink-10}"
    textColor: "{colors.ink-0}"
    typography: "{typography.label}"
    rounded: "{rounded.lg}"
    padding: "0 14px"
    height: "36px"
  button-primary-hover:
    backgroundColor: "color-mix(in srgb, #161412 80%, transparent)"
    textColor: "{colors.ink-0}"
  button-primary-entry:
    backgroundColor: "{colors.ink-10}"
    textColor: "{colors.ink-0}"
    rounded: "{rounded.lg}"
    padding: "0 20px"
    height: "44px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink-10}"
    typography: "{typography.label}"
    rounded: "{rounded.lg}"
    padding: "0 12px"
    height: "36px"
  button-ghost-hover:
    backgroundColor: "{colors.ink-1}"
    textColor: "{colors.ink-10}"
  button-icon:
    backgroundColor: "transparent"
    textColor: "{colors.ink-10}"
    rounded: "{rounded.lg}"
    size: "32px"
  button-icon-pressed:
    backgroundColor: "transparent"
    textColor: "{colors.ultramar}"
  thumb-tab:
    backgroundColor: "{colors.ink-10}"
    textColor: "{colors.ink-0}"
    typography: "{typography.tab-numeral}"
    rounded: "{rounded.tab}"
    height: "44px"
    width: "78%"
  thumb-tab-hover:
    backgroundColor: "{colors.ink-8}"
    textColor: "{colors.ink-0}"
  thumb-tab-current:
    backgroundColor: "{colors.vermilion}"
    textColor: "{colors.sheet-white}"
    width: "100%"
  plate:
    backgroundColor: "{colors.ink-0}"
    padding: "8px"
  plate-sheet:
    backgroundColor: "{colors.sheet-white}"
  segmented:
    backgroundColor: "transparent"
    rounded: "{rounded.md}"
    padding: "2px"
  segmented-option:
    backgroundColor: "transparent"
    textColor: "{colors.ink-8}"
    typography: "{typography.label}"
    rounded: "{rounded.segment}"
    padding: "6px 8px"
  segmented-option-active:
    backgroundColor: "{colors.ink-10}"
    textColor: "{colors.ink-0}"
  select:
    backgroundColor: "{colors.ink-0}"
    textColor: "{colors.ink-10}"
    rounded: "{rounded.md}"
    padding: "0 8px"
    height: "36px"
---

# Design System: Ghost PDF Editor

## Overview

**Creative North Star: "El Diccionario de consulta"**

El editor se lee como un léxico del siglo XIX con hombro y lámina: siempre sabes dónde estás porque la cabeza nombra lo que tienes a la vista (palabras guía), el canto lleva uñeros para saltar de página, y cada corrección se asienta como una entrada de diccionario, tachada y reemplazada. El PDF es una lámina enmarcada en tinta y es lo único a todo color; la interfaz alrededor es papel biblia, tinta de grabado y dos tintas de imprenta usadas con avaricia.

La densidad es de herramienta (modo Operate): una barra de 58px, columnas delimitadas por reglas finas de tinta, cero sombras, cero tarjetas. La personalidad la ponen la tipografía y las reglas, no el color ni los efectos. La serif de texto vive solo donde el diccionario habla (palabras guía y entradas); todo lo que se opera habla en la sans de la app.

Rechazos confirmados: el arreglo de la categoría (barra llena de íconos sobre miniaturas grises, mosaicos de herramientas tipo iLovePDF) y el look «café literario» (crema y serif por todas partes).

**Key Characteristics:**
- Papel biblia frío (`ink-0`), nunca crema; todos los neutros salen de un solo ramp numerado de 11 pasos.
- Bermellón y ultramar como únicas tintas de color, cada una con un oficio fijo.
- Reglas de tinta de 1px como estructura; regla doble bajo la cabeza.
- La lámina del PDF enmarcada en tinta, intocable por la UI.
- Uñeros de media luna como firma; el actual en bermellón y más ancho.
- Serif solo en palabras guía y entradas; sans en todo lo demás.

## Colors

Un solo ramp neutro del papel a la tinta, más dos tintas de imprenta con trabajos que no se cruzan.

### Primary
- **Tinta de grabado** (`ink-10`): texto, reglas estructurales, botón primario sólido, uñeros inactivos, opción activa del control segmentado. La acción primaria es tinta sólida, no color.

### Secondary
- **Bermellón** (`vermilion`): solo tres oficios. Texto tachado (subrayado de tachado de 2px en el nombre del archivo que falló), la edición activa y el uñero de la página actual, y avisos (título y regla inferior del aviso «página sin texto», nota sobre la lámina en celular). También es `--destructive`.

### Tertiary
- **Ultramar** (`ultramar`): enlaces, selección (fondo al 22%), caret, foco (contorno de 2px con 2px de separación), estado presionado de los ajustes de zoom, zona de soltar activa (borde, fondo al 5%, contorno discontinuo interior) y cajas de depuración sobre la lámina (contorno sin relleno, sólido para líneas, discontinuo para párrafos).

### Neutral
- **Papel biblia** (`ink-0`): fondo de la app y marco interior de la lámina; texto sobre tinta.
- **Papel de hoja** (`sheet-white`): solo la hoja del PDF dentro de la lámina (y la zona de entrada, que es la lámina vacía) y el número del uñero actual.
- **Gris de hover** (`ink-1`): fondo de hover de botones ghost y opciones; `--muted`, `--secondary`, `--accent`.
- **Pista** (`ink-2`): riel de la barra de progreso.
- **Filete** (`ink-3`): `--border`; separador entre entradas dentro de una columna.
- **Contorno de campo** (`ink-4`): `--input`; borde del select y del control segmentado; barra de scroll.
- **Texto secundario** (`ink-7`): `--muted-foreground`; pistas, contadores, texto atenuado.
- **Texto de apoyo** (`ink-8`): cuerpos de definiciones y avisos, etiqueta de zoom, pie de lámina, línea de privacidad; hover de uñeros.
- **Palabras guía** (`ink-9`): las palabras guía centradas de la cabeza.
- `ink-5` e `ink-6` existen en el ramp para continuidad, no tienen oficio asignado aún.

### Named Rules
**The Papel Biblia Rule.** El fondo es `ink-0`, un blanco frío. Nunca crema, nunca beige, nunca cálido.

**The Two Inks Rule.** El bermellón es tachado, edición activa y aviso; el ultramar es enlace, selección, foco y depuración. Si un elemento no hace uno de esos trabajos, es tinta o ramp neutro.

**The Untinted Plate Rule.** La UI nunca tiñe la página del PDF: las cajas de depuración son contornos ultramar sin relleno y el bermellón queda para la edición activa.

**The One Ramp Rule.** Todo neutro sale de `ink-0`…`ink-10`. No se introducen grises fuera del ramp.

## Typography

**Display Font:** Hanken Grotesk Variable (con system-ui, sans-serif)
**Body Font:** Hanken Grotesk Variable (con system-ui, sans-serif)
**Label/Mono Font:** Source Serif 4 Variable (con Georgia, serif) para palabras guía y entradas; cifras tabulares (`tabular`) en contadores, zoom y números de página.

**Character:** Una grotesca de app limpia y apretada para operar, y una serif de texto de diccionario que aparece solo cuando el editor «asienta» o «nombra». El contraste entre ambas es el sistema.

### Hierarchy
- **Display** (600, 2rem en celular / 2.4rem desde `sm`, 1.25, tracking -0.025em, `text-wrap: balance`): el título de la lámina de entrada.
- **Headline** (600, 1.5rem, 1.25): el título de carga.
- **Title** (600, 17px): título de aviso en la columna de cambios (en bermellón).
- **Brand** (600, 15px, tracking -0.025em): el nombre «Ghost PDF Editor» en la cabeza.
- **Body** (400, 15px, 1.375–1.625): mensajes de error, pistas, cuerpos de aviso.
- **Label** (500, 14px): botones, opciones, etiqueta de zoom, línea de privacidad.
- **Caption** (400, 12px): pie de lámina, conteo de páginas, leyenda de depuración.
- **Guide** (serif, 15px, versalitas `all-small-caps`, tracking 0.08em; 12px en etiquetas de columna): palabras guía de la cabeza («Página 1 — Página 2»), cabecera «Cambios · n», pie «Página n» de cada lámina y la etiqueta «Pág.» sobre los uñeros.
- **Entry** (serif, 400, 15px, 1.625): entradas de cambios y su estado vacío; cuerpos de las definiciones de entrada.
- **Entry term** (serif, 600, 19px; categoría gramatical en itálica 15px `ink-7`): término de cada definición en la columna de entrada.
- **Tab numeral** (serif, 600, 15px / 12.5px con 3 cifras / 11px con 4+, interlineado 1, tabular): números de los uñeros.

### Named Rules
**The Dictionary Voice Rule.** La serif (Source Serif 4) va SOLO en: las palabras guía (rango de páginas centrado en la cabeza, en versalitas, y su familia de marcadores de lugar: pie «Página n», etiqueta «Pág.», números de uñero), la cabecera «Cambios», las entradas de cambios, el nombre de archivo tachado en los errores y las definiciones de la columna de entrada. Todo lo demás (títulos, botones, avisos, etiquetas, controles) usa la sans de la app, Hanken Grotesk.

**The Tabular Rule.** Toda cifra que cambia en vivo (zoom, contadores, páginas, uñeros) usa cifras tabulares para no bailar.

## Layout

Rejilla de app a pantalla completa (`100svh`, sin scroll de documento): cabeza arriba y una fila de columnas que llena el resto; solo la columna central y las laterales hacen scroll propio.

- **Cabeza:** 58px de alto, padding lateral 12px (20px desde `sm`). Desde `lg` es una rejilla de tres partes: marca y nombre de archivo a la izquierda, palabras guía centradas, acciones a la derecha. Debajo de `lg` las palabras guía se ocultan.
- **Escritorio (`lg`, 1024px+):** tres columnas, hombro de uñeros (88px) | lámina (flexible) | cambios (352px), separadas por reglas de 1px en tinta. El contrato pedía 96px y 400px; el build se asentó en 88px y 352px y es lo que rige.
- **Celular y tablet:** dos columnas, franja de uñeros de 44px | lámina a pantalla completa. Sin columna derecha: el aviso de página sin texto sube sobre la lámina y la revisión de cajas pasa a un select nativo sobre las láminas. El nombre del archivo pasa al pie de la primera lámina. Las etiquetas de Abrir y Exportar se vuelven solo ícono debajo de `sm`; Exportar siempre visible.
- **Lámina:** centrada, con 24px arriba y abajo y 12px (24px desde `sm`) a los lados; en anchos de más de 720px se reservan 48px extra de aire. Las láminas se apilan con 32px entre sí y 30vh de cola al final.
- **Columna de cambios:** padding 20px vertical / 24px horizontal; el selector de revisión vive anclado abajo, separado por una regla de tinta.
- **Zoom:** escala en px CSS por punto PDF, 100% = 96/72. Pasos fijos 50, 67, 80, 100, 125, 150, 200, 300%. Ajustar a página o al ancho mide la página mediana del documento y puede bajar hasta 20% para que la hoja quepa en celular.
- **Ritmo:** pasos de 4, 8, 16, 24 y 32px; 6px entre uñeros y entre botones de la cabeza.

## Elevation & Depth

Plano por completo. No hay `box-shadow` en ningún componente del build. La profundidad se expresa con reglas de tinta y con el marco de la lámina: borde de 1.5px en tinta, 8px de papel biblia y la hoja blanca dentro. Un plano se distingue de otro por una regla, nunca por una sombra ni por un fondo elevado.

### Named Rules
**The Ruled Page Rule.** La estructura se dibuja con reglas de tinta (`rule` = `ink-10`): 1px entre columnas y bajo cabeceras, regla doble de 3px solo bajo la barra superior. Dentro de una columna, las entradas se separan con un filete de 1px en `ink-3`, y un aviso cierra con una regla bermellón.

**The No Shadow Rule.** Ninguna superficie lleva sombra; si algo necesita destacarse, lo hace con tinta, regla o tipografía.

## Shapes

Esquinas casi rectas: el radio base es 4px (`lg`) en botones, 3.2px (`md`) en el select y el control segmentado, 3px en sus opciones. La lámina y la zona de entrada son rectángulos sin radio. La única curva expresiva es la del uñero: media luna completa a la izquierda (`rounded-l-full`) y canto recto a la derecha, pegado a la regla del hombro, como el corte del canto de un diccionario.

## Components

### Buttons
Directos y de tinta: la acción primaria es un bloque sólido, lo demás es texto con ícono.
- **Shape:** esquinas casi rectas (4px).
- **Primary:** tinta sólida (`ink-10`) con texto papel (`ink-0`), 36px de alto en la cabeza (padding 10–14px), 44px y padding 20px con texto de 15px en la lámina de entrada. Ícono Lucide de 16px a la izquierda. Una sola primaria por vista.
- **Hover / Focus:** hover baja la tinta al 80%; presionar desplaza 1px hacia abajo; foco con anillo ultramar. Deshabilitado al 50% de opacidad (Exportar mientras llega la Fase 4).
- **Ghost:** transparente con texto tinta; hover en `ink-1` (Abrir).
- **Icon:** 32px cuadrado, ghost (zoom). Los ajustes de zoom marcan el estado presionado con el ícono en ultramar, sin fondo.

### Inputs / Fields
- **Control segmentado (escritorio):** contorno de 1px `ink-4`, radio 3.2px, 2px de padding, tres opciones iguales. La activa es tinta sólida con texto papel; las inactivas, texto `ink-8` con hover `ink-1`. Foco: contorno ultramar de 2px en la opción.
- **Select nativo (celular):** 36px de alto, fondo papel, contorno `ink-4`, radio 3.2px, texto de 16px en celular (evita el zoom de iOS) y 14px desde `sm`. Se usa el control nativo porque el celular ya lo sabe operar.

### Navigation
- **Cabeza:** marca en sans 600, nombre de archivo atenuado truncado por la mitad (se conservan siempre los últimos 16 caracteres, con la extensión), palabras guía centradas en serif versalita `ink-9` y anunciadas con `aria-live`.

### Uñeros (componente firma)
Los cortes del canto de un diccionario para saltar entre páginas.
- **Forma:** media luna a la izquierda, canto recto a la derecha, 40px de alto (44px en `lg`), 6px entre pestañas, alineados a la derecha contra la regla del hombro.
- **Inactivo:** tinta sólida con número en papel, al 78% del ancho (90% con 3+ cifras); hover `ink-8`.
- **Actual:** bermellón con número blanco, al 100% del ancho: el actual sobresale.
- **Densidad:** hasta 16 páginas, un uñero por página; arriba de eso, cada uñero cubre un rango y el actual muestra la página exacta.
- **Movimiento:** ancho y color transicionan en 200ms ease-out.

### Lámina
- **Marco:** borde de 1.5px en tinta, 8px de papel biblia, hoja blanca dentro con el canvas del PDF. Pie «Página n» en serif versalita 12px `ink-8`.
- **Entrada:** sin documento, la lámina vacía es la zona para soltar, con proporción de hoja (1:1.18) desde `sm`. Al arrastrar, el borde pasa a ultramar con fondo ultramar al 5% y un contorno discontinuo de 2px a 8px hacia dentro (150ms). Contiene el título display, la primaria «Elegir PDF», la pista de soltar (solo con puntero fino) y la línea de privacidad con candado.
- **Carga:** barra de progreso de 3px en `ink-10` sobre riel `ink-2`, que crece con `scaleX` en 200ms ease-out, y el conteo de páginas en cifras tabulares.
- **Error:** el nombre del archivo tachado en bermellón (serif 18px, `ink-7`, tachado de 2px) sobre el mensaje en sans.

### Columna de cambios
- Cabecera «Cambios» en serif versalita 15px semibold con el contador a la derecha, sobre una regla de tinta. Entradas en serif 15px, interlineado holgado.
- Aviso de página sin texto: título sans 17px semibold en bermellón, cuerpo 15px `ink-8`, cerrado por una regla bermellón.
- Sin documento, la columna muestra tres definiciones de diccionario (término serif 19px semibold, categoría en itálica, cuerpo serif 15px `ink-8`) separadas por filetes `ink-3`.

## Do's and Don'ts

### Do:
- **Do** usar `ink-0` (papel biblia frío) como fondo y sacar cada neutro del ramp `ink-0`…`ink-10`.
- **Do** hacer la acción primaria en tinta sólida (`ink-10` con texto `ink-0`), una por vista.
- **Do** reservar el bermellón para tachado, edición activa / uñero actual y avisos, y el ultramar para enlaces, selección, foco y cajas de depuración.
- **Do** separar planos con reglas de tinta de 1px y dejar la regla doble de 3px solo bajo la barra superior.
- **Do** presentar cada página del PDF como lámina: borde de 1.5px en tinta, 8px de papel, hoja blanca.
- **Do** escribir palabras guía, la cabecera «Cambios», las entradas, el nombre tachado y las definiciones en Source Serif 4; todo lo demás en Hanken Grotesk.
- **Do** usar cifras tabulares en todo número que cambie en vivo.
- **Do** marcar el uñero actual en bermellón y al ancho completo; los demás, tinta y más angostos.

### Don't:
- **Don't** usar crema, beige ni papeles cálidos; el look «café literario» (crema y serif por todas partes) está rechazado.
- **Don't** poner serif en títulos, botones, avisos, etiquetas ni controles.
- **Don't** teñir ni rellenar la página del PDF desde la UI; las cajas de depuración son contornos ultramar sin relleno.
- **Don't** usar bermellón para acciones primarias, decoración o énfasis general.
- **Don't** agregar sombras, tarjetas elevadas ni fondos elevados.
- **Don't** llenar la barra superior de íconos ni armar mosaicos de herramientas grandes al estilo iLovePDF.
- **Don't** introducir grises fuera del ramp `ink`.
