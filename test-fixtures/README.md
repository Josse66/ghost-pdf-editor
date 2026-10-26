# Corpus de prueba

Benchmark fijo para medir cada fase (ver PLAN.md §5). **No modificar los PDFs una vez agregados.**

## generated/ (sintéticos, reproducibles)

Generados con Chrome headless (`--print-to-pdf`) desde `generated/html/`, así que embeben subconjuntos reales de las fuentes del sistema (CIDFontType2, Identity-H), como un PDF exportado de verdad.

| Archivo | Prueba |
|---|---|
| `cv-calibri.pdf` | Calibri regular/bold/italic, acentos y ñ, ligaduras (ft, ti) |
| `factura-color.pdf` | Arial, texto sobre fondos de color sólido, tabla y degradado |
| `dos-columnas-serif.pdf` | Cambria + Times, dos columnas justificadas con guiones |
| `cv-rotado-90.pdf` | `cv-calibri.pdf` con `/Rotate 90` (generado con pdf-lib) |

## Pendientes (PDFs reales, los aporta el usuario)

- [ ] CV hecho en Word → PDF
- [ ] CV hecho en Google Docs
- [ ] Factura de un sistema real (fuentes raras)
- [ ] Documento LaTeX (Type1, ligaduras)
- [ ] PDF de 100+ páginas
- [ ] Texto no latino
- [ ] PDF escaneado
- [ ] PDF con formulario
- [ ] PDF cifrado con contraseña

> Ojo con datos personales: usa documentos tuyos o de ejemplo, nunca de terceros.
