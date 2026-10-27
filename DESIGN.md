---
name: Ghost PDF Editor
description: Editor de PDF en el navegador con la estructura de un edificio de concreto.
colors:
  ink-0: "#f3f2ef"
  ink-1: "#e4e3df"
  ink-2: "#d3d1cc"
  ink-3: "#bdbab4"
  ink-4: "#a4a19b"
  ink-5: "#8a8781"
  ink-6: "#716e69"
  ink-7: "#5f5d58"
  ink-8: "#4a4844"
  ink-9: "#3a3a37"
  ink-10: "#2a2a28"
  ultramar: "#24466b"
  vermilion: "#a8322a"
  sheet-white: "#ffffff"
typography:
  display:
    fontFamily: "Archivo Variable, system-ui, sans-serif"
    fontSize: "2.4rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.025em"
  display-compact:
    fontFamily: "Archivo Variable, system-ui, sans-serif"
    fontSize: "2rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Archivo Variable, system-ui, sans-serif"
    fontSize: "30px"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Archivo Variable, system-ui, sans-serif"
    fontSize: "19px"
    fontWeight: 800
    lineHeight: 1.3
    letterSpacing: "-0.025em"
  brand:
    fontFamily: "Archivo Variable, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 800
    letterSpacing: "-0.025em"
  entry:
    fontFamily: "Archivo Variable, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 600
    lineHeight: 1.375
  body:
    fontFamily: "Archivo Variable, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.625
  label:
    fontFamily: "Archivo Variable, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: 1.43
  caption:
    fontFamily: "Archivo Variable, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.4
  guide:
    fontFamily: "Archivo Variable, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 600
    letterSpacing: "0.1em"
    fontFeature: "all-small-caps"
  tab-numeral:
    fontFamily: "Archivo Variable, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 700
    lineHeight: 1
rounded:
  none: "0px"
spacing:
  grid: "24px"
  gutter-sm: "8px"
  gutter-md: "16px"
  column-pad: "24px"
components:
  slab:
    backgroundColor: "{colors.ink-0}"
    textColor: "{colors.ink-10}"
    rounded: "{rounded.none}"
    height: "56px"
    padding: "0 16px"
  button-primary:
    backgroundColor: "{colors.ultramar}"
    textColor: "{colors.sheet-white}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    height: "36px"
    padding: "0 14px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink-10}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    height: "36px"
  button-ghost-hover:
    backgroundColor: "{colors.ink-1}"
    textColor: "{colors.ink-10}"
  thumb-block:
    backgroundColor: "{colors.ink-0}"
    textColor: "{colors.ink-8}"
    typography: "{typography.tab-numeral}"
    rounded: "{rounded.none}"
    height: "56px"
  thumb-block-current:
    backgroundColor: "{colors.ink-10}"
    textColor: "{colors.sheet-white}"
  sheet:
    backgroundColor: "{colors.sheet-white}"
    rounded: "{rounded.none}"
  changes-column:
    backgroundColor: "{colors.ink-0}"
    textColor: "{colors.ink-10}"
    padding: "20px 24px"
    width: "352px"
  segmented-option-active:
    backgroundColor: "{colors.ink-10}"
    textColor: "{colors.ink-0}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
---

# Design System: Ghost PDF Editor

## Overview

**Concreto.** Ghost se construye como un edificio de Teodoro González de León (Museo Tamayo, El Colegio de México): poco color, mucha estructura. Volúmenes grises de aristas exactas se apoyan en una plaza con retícula, y la luz de mediodía les proyecta una sombra larga y recta. El PDF es la hoja blanca más importante del edificio y lo único a todo color; la interfaz nunca lo tiñe.

Superficie de trabajo (modo Operate): primero se encuentra todo, después se nota el mundo. Seria, sólida y actual, sin parecer suite de oficina. Rechaza el arreglo típico de la categoría (blanco con un índigo de acento y tarjetas redondeadas) y el mundo anterior «Diccionario» (papel biblia, serif, bermellón como firma).

Se eligió en la Fase 4.1 tras dos rondas de direcciones de Impeccable y una comparación en el celular del usuario: Concreto como base, con la plaza en retícula (de la dirección Crouwel) y la cabeza como losa flotante.

## Colors

Restringido: una rampa de concreto de 11 pasos y dos colores con oficio fijo.

### Primary
- **Azul de cristal** (`ultramar`, #24466B): todo lo activo. Exportar PDF y el resto de las acciones primarias, la edición en curso (contorno y marca al margen), la selección de texto, el foco visible y el cursor de escritura.

### Secondary
- **Rojo de aviso** (`vermilion`, #A8322A): solo avisos. Error al exportar, avisos de exportación, página sin texto, subrayado de texto que ya no cabe. También es `--destructive`.

### Neutral
- **Plaza** (`ink-1`, #E4E3DF): el fondo de la app, con la retícula.
- **Concreto claro** (`ink-0`, #F3F2EF): la losa de la cabeza, la columna de Cambios, la hoja de Cambios en celular, los uñeros inactivos.
- **Junta** (`ink-3`, #BDBAB4): 1px entre columnas y entre entradas.
- **Texto secundario** (`ink-7`, #5F5D58): lo tachado, la letra chiquita de cada cambio, el archivo en la cabeza.
- **Texto de apoyo** (`ink-8`, #4A4844): cuerpos de aviso, pistas, número de zoom.
- **Carbón** (`ink-10`, #2A2A28): tinta principal, el uñero actual, la regla gruesa de Cambios.
- **Hoja** (`sheet-white`, #FFFFFF): la página del PDF y la lámina de entrada.

### Named Rules
**The Two Jobs Rule.** El azul hace lo activo y el rojo hace los avisos. Ninguno decora. Si un elemento no es activo ni aviso, es concreto.

**The Untinted Sheet Rule.** La UI nunca tiñe la hoja: los contornos de edición y de revisión son líneas sin relleno, y el blanco de la hoja es el único blanco puro de la pantalla además de las fichas.

## Typography

**Familia única:** Archivo (variable, autoalojada con Fontsource). La jerarquía sale solo de tamaño y peso; no hay serif ni cursiva de estilo.

### Hierarchy
- **Headline** (800, 30px, interlínea 1): «Cambios» sobre su regla carbón de 3px, con el conteo a 16px 600 en `ink-7`.
- **Display** (600, 2rem en celular / 2.4rem desde sm): «Abre tu PDF» en la lámina de entrada.
- **Title** (800, 19px): términos de la columna de entrada (Editar, Exportar, Privado); títulos de aviso a 17px 600 en rojo.
- **Brand** (800, 16px): nombre de la app en la losa.
- **Entry** (600, 17px): el texto nuevo de cada cambio. Lo anterior va a 15px 400 en `ink-7`, tachado en carbón de 1.5px.
- **Body** (400, 15px, 1.625): avisos, pistas, definiciones.
- **Label** (500, 14px): botones y controles.
- **Caption** (400, 13px): letra chiquita de cada cambio («pág. 1 · Calibri → Carlito»).
- **Guide** (600, 12px, versalitas, +0.1em): rótulos («PÁG.», «PÁGINA 1» en la cabeza y al pie de la hoja).

### Named Rules
**The One Family Rule.** Todo en Archivo. Si algo necesita destacarse, sube de peso o de tamaño; no cambia de letra.

## Layout

- **Plaza con retícula:** cuadrícula de 24px (líneas de 1px al 7% de carbón) sobre `ink-1` en todo el fondo de la app.
- **Escritorio (lg, desde 1024px):** tres columnas: uñeros 5.5rem | hoja | Cambios 22rem. La losa ocupa las dos primeras columnas arriba; Cambios va de arriba abajo en la tercera, como un volumen apoyado.
- **Celular y tablet:** dos columnas, uñeros 2.75rem | hoja. La losa a todo el ancho; Cambios se abre como hoja inferior desde el botón de conteo en la losa. Exportar siempre visible (solo ícono debajo de sm).
- **Márgenes de la losa:** 8px en celular, 16–20px en escritorio, respetando la zona segura superior.
- Las escalas de ajuste de la hoja reservan 12px por lado para que su sombra quepa.

## Elevation & Depth

Profundidad por **sombra larga y recta, sin difuminado**: la luz de mediodía sobre concreto. Solo la llevan los volúmenes que flotan sobre la plaza:

- **Hoja del PDF y lámina de entrada:** 22px 26px 0 al 16% de carbón (10px 12px 0 al 14% en celular).
- **Losa de la cabeza:** 12px 14px 0 al 14% (7px 8px 0 en celular).
- **Uñero actual:** 5px 6px 0 al 18%.

Las columnas no flotan: se separan con una junta de 1px. Los uñeros inactivos llevan un leve hundido interior (2px 2px 0 al 8%).

### Named Rules
**The Noon Light Rule.** Una sola dirección de luz (abajo-derecha) y cero difuminado. Elegida por el usuario: es la firma del mundo, no neobrutalismo; no se agregan sombras suaves ni de color.

## Shapes

Aristas a 90° en todo: `--radius` es 0. Botones, fichas, selects, la losa, la hoja de Cambios del celular y los uñeros son rectángulos exactos. Bordes de 1px en `ink-3`; la única regla gruesa es la de 3px carbón bajo «Cambios» y sobre la hoja inferior del celular.

## Components

### Losa (cabeza)
Rectángulo `ink-0` de 56px que flota sobre la plaza con su sombra larga. Izquierda: marca y archivo. Centro (lg): página visible en versalitas. Derecha: zoom (−, %, +, ajustar a página, ajustar al ancho), Cambios en celular, Abrir (fantasma) y Exportar PDF (azul). Exportar se habilita con el primer cambio y muestra «Preparando…» / «Exportando…» con un indicador que gira.

### Uñeros
Bloques sueltos sobre la plaza, uno por página (o por rango en documentos largos), de 44px (celular) a 56px (lg) de alto. Inactivos: `ink-0` con hundido leve y número en `ink-8`. Actual: bloque carbón con número blanco y su sombra larga.

### Hoja
La página del PDF sin marco, blanca, con su sombra larga y el pie «PÁGINA n» (y el nombre de archivo en celular) en versalitas.

### Columna de Cambios
Volumen `ink-0`: aviso de exportación arriba, «Cambios» grande sobre la regla carbón con deshacer/rehacer, y entradas separadas por juntas de 1px: lo anterior tachado, lo nuevo en 17px 600, la letra chiquita con página y fuente, Restaurar. Los avisos de exportación de cada entrada van en rojo dentro de la letra chiquita.

### Avisos
Título 17px 600 en rojo, cuerpo 15px en `ink-8` y una regla roja de 1px al cierre. Si todo salió igual, una sola línea de estado en `ink-8` sin rojo.

### Revisión de cajas
Control segmentado en escritorio (opción activa carbón) y select nativo en celular. Las cajas se dibujan como contornos azules sin relleno.

## Do's and Don'ts

### Do:
- **Do** apoyar todo en la plaza con retícula y darle sombra larga solo a lo que flota.
- **Do** usar el azul para lo activo y el rojo para avisos, y nada más.
- **Do** resolver la jerarquía con tamaño y peso de Archivo.
- **Do** mantener las aristas a 90° en cualquier componente nuevo.

### Don't:
- **Don't** redondear esquinas, ni siquiera en botones o diálogos.
- **Don't** usar sombras difuminadas, de color o en más de una dirección.
- **Don't** traer de vuelta el mundo «Diccionario»: ni serif, ni bermellón como firma, ni «v. tr.».
- **Don't** teñir la hoja del PDF ni rellenar cajas sobre ella.
- **Don't** agregar un tercer color de acento.
