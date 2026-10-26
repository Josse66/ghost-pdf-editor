# Ghost PDF Editor

Editor de PDF 100% en el navegador: edita el texto que **ya existe** en tu PDF, directo sobre la página, sin romper el formato. Tu PDF nunca sale de tu dispositivo.

> 🚧 En construcción. Fase 1 (setup) de [PLAN.md](PLAN.md).

## Por qué

- **Privacidad verificable:** todo pasa en tu navegador, sin servidores. Al exportar, el texto editado se borra del archivo en lugar de taparse.
- **Que no se note:** fuentes métricamente compatibles (Carlito por Calibri, Liberation por Arial…) para CVs y facturas de Word y Google Docs.
- **Ligero:** PWA instalable que funciona offline en celular y escritorio.
- Gratis, sin marca de agua y de código abierto.

## Desarrollo

Requiere Node 22+.

```bash
npm install
npm run dev          # servidor de desarrollo
npm run typecheck    # TypeScript estricto
npm run lint         # oxlint
npm test             # tests unitarios (src/core)
npm run test:browser # tests en Chromium real (Vitest browser mode)
npm run test:e2e     # end-to-end con Playwright (escritorio + Android emulado)
npm run build
```

La primera vez, instala el navegador de pruebas con `npx playwright install chromium`.

## Estructura

- `src/core/`: motor en TypeScript puro, sin React (lectura, agrupación de texto, fuentes, escritura). Todo pasa por la interfaz `PdfEngine`.
- `src/components/`: interfaz en React + Tailwind + shadcn/ui.
- `spikes/`: experimentos de la Fase 0 ([hallazgos](docs/fase0-hallazgos.md)).
- `test-fixtures/`: corpus de PDFs de prueba. Los privados van en `test-fixtures/privado/`, que git ignora.

## Licencia

[MIT](LICENSE). Créditos de dependencias y fuentes en [THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md).
