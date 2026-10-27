---
name: ghosteditor
description: Retoma el proyecto Ghost PDF Editor exactamente donde quedó en la sesión anterior. Lee el estado guardado (fases, ramas, decisiones, pendientes y la pregunta que quedó abierta), lo verifica contra git, GitHub y el CI, resume al usuario dónde vamos y vuelve a hacerle la pregunta pendiente antes de tocar nada. Úsala al iniciar una sesión nueva, cuando el usuario escriba /ghosteditor o pregunte «¿dónde nos quedamos?», «¿qué sigue?» o «retomemos». Con el argumento «guardar» (/ghosteditor guardar) actualiza el estado al cerrar una sesión o después de un avance grande.
---

# Ghost Editor: retomar y guardar el proyecto

El estado del proyecto vive en [estado.md](estado.md), junto a este archivo. Es la memoria entre sesiones: qué fase
va, qué hay en producción y qué en `dev`, decisiones tomadas y abiertas, pendientes, trampas técnicas, preferencias
del usuario y **la pregunta que quedó sin responder**.

Responde siempre en español, tono casual (ver `CLAUDE.md`).

## Modo «retomar» (sin argumento)

1. **Lee el contexto**, en este orden:
   - [estado.md](estado.md) completo.
   - `CLAUDE.md`, y de `PLAN.md` las secciones de la fase actual y la siguiente, §6 (flujo) y §8 (skills).
   - `PRODUCT.md`; y `DESIGN.md` si el siguiente paso toca interfaz.
2. **Verifica en vivo** (el estado guardado puede estar atrasado). Corre y compara con estado.md:
   - `git branch --show-current`, `git status --short`, `git log --oneline -5 origin/main` y `git log --oneline -8 dev`
     (antes `git fetch -q origin`).
   - `gh pr list --repo Josse66/ghost-pdf-editor --state all --limit 3` y
     `gh run list --repo Josse66/ghost-pdf-editor --limit 3`.
   - Si hay diferencias (un PR que ya se juntó, commits nuevos, el CI en rojo, cambios sin commit), **manda lo vivo**:
     dilo en una línea y tenlo en cuenta para la pregunta.
3. **Resume al usuario** en pocas líneas:
   - En qué fase vamos y qué está en producción frente a qué está solo en `dev` (con los links del preview).
   - Qué fue lo último que se hizo y qué se le pidió.
   - Los pendientes inmediatos (sección 4 de estado.md), sin listar todo el historial.
4. **Haz la pregunta pendiente** de la sección 3 de estado.md, ajustada a lo que verificaste (por ejemplo, si el PR ya
   se juntó, ya no preguntes si abrirlo). Usa la herramienta de preguntas o el recuadro de siguiente paso, con 2–3
   opciones claras. Si la siguiente fase tiene decisiones abiertas (sección 5), menciónalas y pregúntalas cuando toque
   arrancarla.
5. **No empieces trabajo nuevo** hasta que el usuario responda. Al iniciar una fase, sigue la regla de `CLAUDE.md`:
   di qué skills tocan y en qué orden antes de escribir código.

## Modo «guardar» (`/ghosteditor guardar`)

Úsalo al cerrar una sesión, al terminar una fase o tras un avance grande. También guárdalo **por iniciativa propia**
cuando el usuario anuncie que se va («es todo por hoy») o al terminar una fase, y avísale en una línea.

1. Verifica el estado vivo igual que en el paso 2 de «retomar».
2. Actualiza [estado.md](estado.md), conservando su estructura:
   - Encabezado: fecha de hoy, commit de `dev` y de `main`.
   - Sección 2: tabla de fases y «Qué hace hoy la app».
   - Sección 3: **lo último que pasó y la pregunta pendiente exacta** (lo que el usuario debe responder para seguir),
     con las opciones y qué hacer con cada una.
   - Secciones 4 y 5: pendientes y decisiones abiertas (borra lo resuelto, agrega lo nuevo).
   - Secciones 6–9: agrega decisiones tomadas, comandos nuevos, trampas técnicas resueltas y preferencias del usuario
     que hayan aparecido. No dupliques lo que ya está en `PLAN.md`; enlázalo.
3. Que se pueda leer en frío: alguien sin la conversación debe poder continuar solo con estado.md y el repo.
   Sin datos personales (el repo es público).
4. Haz commit en `dev` (`docs(estado): …`) y súbelo solo si el usuario lo aprueba o ya estaba trabajando así en la
   sesión; si no, deja el archivo guardado y dile que falta el commit.

## Reglas

- estado.md es una foto, no la fuente de verdad: si choca con git, GitHub, `PLAN.md` o el código, gana lo vivo, y lo
  corriges.
- No reabras decisiones de la sección 6 sin una razón nueva.
- Las acciones hacia afuera (crear PRs, cambiar configuración de GitHub o Vercel, publicar) siguen necesitando la
  aprobación del usuario en la sesión, aunque estado.md diga cuál es el siguiente paso.
