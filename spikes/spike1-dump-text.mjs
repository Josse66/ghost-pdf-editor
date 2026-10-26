// Spike 1: carga un PDF con pdf.js y vuelca getTextContent() + info de fuentes a JSON.
// Uso: node spike1-dump-text.mjs <archivo.pdf> [salida.json]
import { readFile, writeFile } from "node:fs/promises";
import { basename } from "node:path";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";

const input = process.argv[2];
if (!input) {
  console.error("Uso: node spike1-dump-text.mjs <archivo.pdf> [salida.json]");
  process.exit(1);
}
const output = process.argv[3] ?? `out/${basename(input, ".pdf")}.text.json`;

const data = new Uint8Array(await readFile(input));
// fontExtraProperties conserva los bytes del programa de fuente embebido en commonObjs.
const doc = await pdfjs.getDocument({ data, fontExtraProperties: true, useSystemFonts: false }).promise;

const result = { file: basename(input), numPages: doc.numPages, pages: [] };

for (let p = 1; p <= doc.numPages; p++) {
  const page = await doc.getPage(p);
  const viewport = page.getViewport({ scale: 1 });
  const text = await page.getTextContent({ includeMarkedContent: false, disableNormalization: true });

  // getOperatorList fuerza la carga de las fuentes para poder leerlas de commonObjs.
  await page.getOperatorList();
  const fonts = {};
  for (const loadedName of Object.keys(text.styles)) {
    const f = page.commonObjs.has(loadedName) ? page.commonObjs.get(loadedName) : null;
    fonts[loadedName] = {
      style: text.styles[loadedName],
      name: f?.name ?? null,
      fallbackName: f?.fallbackName ?? null,
      type: f?.type ?? null,
      subtype: f?.subtype ?? null,
      mimetype: f?.mimetype ?? null,
      bold: f?.bold ?? null,
      italic: f?.italic ?? null,
      isType3Font: f?.isType3Font ?? null,
      embeddedBytes: f?.data?.length ?? 0,
      ascent: f?.ascent ?? null,
      descent: f?.descent ?? null,
    };
  }

  const items = text.items.map((it) => ({
    str: it.str,
    dir: it.dir,
    fontName: it.fontName,
    // transform = [a, b, c, d, e, f]: escala/rotación + posición (e, f) en puntos PDF, origen abajo-izquierda.
    transform: it.transform.map((n) => +n.toFixed(2)),
    width: +it.width.toFixed(2),
    height: +it.height.toFixed(2),
    hasEOL: it.hasEOL,
  }));

  result.pages.push({
    page: p,
    rotate: page.rotate,
    view: page.view,
    viewport: { width: viewport.width, height: viewport.height },
    itemCount: items.length,
    emptyItems: items.filter((i) => i.str.trim() === "").length,
    fonts,
    items,
  });
}

await writeFile(output, JSON.stringify(result, null, 2));

// Resumen rápido en consola
for (const pg of result.pages) {
  console.log(`\n${result.file} · página ${pg.page} · rotate=${pg.rotate} · ${pg.itemCount} items (${pg.emptyItems} vacíos)`);
  for (const [k, f] of Object.entries(pg.fonts)) {
    console.log(`  ${k}: name=${f.name} type=${f.type} embebida=${f.embeddedBytes}B bold=${f.bold} italic=${f.italic}`);
  }
  console.log("  Primeros items:");
  for (const it of pg.items.slice(0, 8)) {
    console.log(`    ${JSON.stringify(it.str).padEnd(40)} x=${it.transform[4]} y=${it.transform[5]} size=${it.transform[3]} w=${it.width} font=${it.fontName}`);
  }
}
console.log(`\nJSON completo → ${output}`);
