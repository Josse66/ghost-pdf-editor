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

THESIS: El editor se lee como un diccionario de consulta: siempre sabes dónde estás (palabras guía) y cada cambio queda asentado como una entrada, tachado y reemplazado. Rechaza el arreglo de la categoría: barra de herramientas llena de íconos sobre miniaturas grises.

OWN-WORLD: Fondo papel biblia #F6F6F3, tinta de grabado #161412, bermellón #B8321F solo para tachado, edición activa y avisos, ultramar #2C4F9E para enlaces, selección y foco. Reglas finas de 1px en tinta como único separador. El PDF es una lámina enmarcada con borde de tinta y es lo único a todo color; la UI nunca lo tiñe. Serif de texto (tipo Source Serif) solo en palabras guía y entradas de cambios; sans de app en controles. Neutros de un solo ramp numerado.

STORY: El visitante suelta su PDF, lo ve íntegro como una lámina, toca la línea que quiere corregir y la reescribe ahí mismo. Cada corrección se asienta en la columna de cambios con su aparato (página, línea, fuente, ajuste). Confía en que al exportar lo tachado desaparece del archivo, y exporta.

FIRST VIEWPORT: Escritorio 1440: barra superior de 58px (marca a la izquierda; palabras guía centradas en serif versalita, «Página 1 — Página 2»; Abrir y Exportar PDF, la acción primaria sólida en tinta, a la derecha). Columna de hombro de 96px con uñeros (pestañas de tinta, la actual en bermellón). Al centro, la lámina a escala de lectura. A la derecha, columna de 400px «Cambios · n» con las entradas. Vacío: la lámina es la zona para soltar el PDF, con la línea de privacidad.

FORM: Diccionario (léxico del s. XIX con hombro y lámina, fusionado). Elegido por el usuario en una tirada atrevida, con su ajuste: papel biblia en lugar de crema, serif solo en los cambios, uñeros como firma. Composición de referencia: .impeccable/mocks/decision/challenger-lexicon.html. seed:c2a51aacc3ddd73d

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
