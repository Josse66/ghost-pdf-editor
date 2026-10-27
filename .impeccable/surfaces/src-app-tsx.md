---
version: 1
slug: "src-app-tsx"
primary_target: "src/App.tsx"
related_targets: []
---

# Espacio de trabajo (editor)

**Modo:** Operate. **Alcance:** espacio de trabajo completo: entrada (soltar PDF), carga, visor, edición, exportar y errores. Lo heredan las Fases 2, 3 y 4.

## Audiencia y tarea
Usuario ocasional con urgencia y usuario frecuente, con el mismo peso; celular y escritorio con el mismo peso. Tarea: abrir un PDF, editar texto existente en la página y exportar sin que se note, con el texto viejo borrado del archivo. La entrada es directa a la herramienta (la landing va aparte, en Fase 5).

## Estados y rangos
- PDFs de 1 a 300+ páginas.
- Estados: entrada vacía, cargando (progreso por páginas), visor, modo debug de cajas (Fase 2), edición en sitio (Fase 3), exportar con resumen y avisos honestos (Fase 4).
- Errores amables: cifrado, escaneado sin texto, corrupto, firmado.

## Adaptación
- Escritorio: tres columnas, uñeros | lámina | cambios.
- Celular: lámina a pantalla completa, uñeros como franja delgada en el borde, cambios en una hoja inferior; Exportar siempre al alcance.

## Anti-objetivos
Parecer iLovePDF (mosaicos de herramientas gigantes), barras llenas de botones, el look «café literario» (crema y serif por todas partes), pesadez en el celular.

## Direction contract

THESIS: Ghost como arquitectura de concreto (Teodoro González de León): la interfaz pesa poco en color y mucho en estructura; volúmenes grises de aristas exactas sostienen el PDF, que es lo único a todo color. Rechaza el arreglo de la categoría (blanco con un acento índigo y tarjetas redondeadas) y también el «Diccionario» anterior (papel y serif).

OWN-WORLD: Rampa de concreto de 11 pasos (#F3F2EF a #2A2A28) como únicos neutros; azul profundo de cristal #24466B solo para lo activo: edición en curso, selección, foco y la acción primaria; rojo #A8322A solo para avisos. Archivo como única familia: jerarquía por tamaño y peso (encabezado «Cambios» grande en 800 sobre una regla carbón de 3px). Aristas a 90°, sin radios. La plaza lleva una retícula tenue de 24px (de Crouwel, elegida por el usuario). Una sombra larga y recta de luz de mediodía bajo cada volumen que flota: la hoja, la losa de la cabeza y el uñero actual (elegida por el usuario; no es neobrutalismo, es la luz del mundo).

STORY: El visitante abre su PDF, lo ve completo sobre la plaza gris, toca la línea a corregir y la reescribe ahí mismo; cada corrección queda asentada en el volumen claro de Cambios, tachada y reemplazada; exporta sabiendo que lo tachado se borra del archivo.

FIRST VIEWPORT: Escritorio 1440: plaza gris con retícula; arriba a la izquierda, una losa clara de 56px que flota con sombra larga (marca y archivo, página actual, zoom, Abrir y Exportar PDF en azul). Bajo ella, los uñeros como bloques sueltos (el actual carbón con su sombra) y la lámina blanca con sombra larga. A la derecha, de arriba a abajo, el volumen claro de 352px con «Cambios · n» grande, aviso de exportación arriba y entradas separadas por reglas finas. Vacío: la lámina es la zona para soltar el PDF.

FORM: Concreto (IMPECCABLE'S PICK, primero de mi lista en la segunda tirada; elegido por el usuario) con la cabeza «Losa flotante» y la retícula de Crouwel, elegidas por el usuario tras comparar en su celular. Bocetos de referencia: .impeccable/mocks/decision/r1-pick.html y mix-losa.html. seed:923beebb2af2c37c

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
