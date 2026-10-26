// Spike 2: tapar el texto original y redibujar el nuevo con Carlito embebida (pdf-lib).
// Compara pdf-lib original vs @cantoo/pdf-lib y genera PNG antes/después.
// Uso: node spike2-cover-redraw.mjs
import { readFile, writeFile } from "node:fs/promises";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import { createCanvas } from "@napi-rs/canvas";
import fontkit from "@pdf-lib/fontkit";
// @cantoo/pdf-lib dice ser compatible con @pdf-lib/fontkit, pero su embebido con subset truena con él:
// necesita su propio fork de fontkit.
import cantooFontkit from "@cantoo/fontkit";
import * as pdfLibOriginal from "pdf-lib";
import * as pdfLibCantoo from "@cantoo/pdf-lib";

const FIXTURES = "../test-fixtures/generated";
const RENDER_SCALE = 2;
const SUBSET = process.env.SUBSET !== "0";

// Ediciones de prueba: buscar un string exacto y reemplazarlo.
const CASES = [
  {
    file: "cv-calibri.pdf",
    family: process.env.FAMILY_CV ?? "Carlito",
    edits: [
      { find: "Ingeniero de Software", replace: "Ingeniera de Software Sénior", bold: true },
      { find: "José Núñez Peña", replace: "Josefina Núñez Peña", bold: true },
      {
        find: "Desarrollador Full Stack · Ciudad de México · jose.nunez@ejemplo.com · +52 55 1234 5678",
        replace: "Desarrolladora Full Stack · Monterrey, N.L. · josefina@ejemplo.com · +52 81 9876 5432",
      },
    ],
  },
  {
    file: "factura-color.pdf",
    family: process.env.FAMILY_FACTURA ?? "LiberationSans",
    edits: [
      { find: "FACTURA No. F-2025-0187", replace: "FACTURA No. F-2025-0188", bold: true },
      { find: "Total a pagar (IVA incluido)", replace: "Total a pagar (IVA 16% incluido)", bold: true },
      {
        find: "Texto sobre degradado: este bloque prueba el tapado con fondo no uniforme.",
        replace: "Texto editado sobre degradado: aquí se nota si el tapado falla.",
      },
    ],
  },
];

async function renderPage(bytes) {
  const doc = await pdfjs.getDocument({ data: new Uint8Array(bytes), fontExtraProperties: true }).promise;
  const page = await doc.getPage(1);
  const viewport = page.getViewport({ scale: RENDER_SCALE });
  const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
  const ctx = canvas.getContext("2d");
  await page.render({ canvas, canvasContext: ctx, viewport }).promise;
  return { doc, page, canvas, ctx, viewport };
}

// Convierte una caja en puntos PDF (origen abajo-izquierda) a píxeles del canvas.
function toPx(viewport, x, y) {
  const [px, py] = viewport.convertToViewportPoint(x, y);
  return [Math.round(px), Math.round(py)];
}

function median(values) {
  const s = [...values].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

// Muestrea un anillo de píxeles justo afuera de la caja → color de fondo estimado (mediana por canal).
function sampleBackground(ctx, viewport, box) {
  const [x0, y0] = toPx(viewport, box.x, box.y + box.h);
  const [x1, y1] = toPx(viewport, box.x + box.w, box.y);
  const pad = 3;
  const img = ctx.getImageData(x0 - pad, y0 - pad, x1 - x0 + pad * 2, y1 - y0 + pad * 2);
  const { width, height, data } = img;
  const r = [], g = [], b = [];
  for (let yy = 0; yy < height; yy++) {
    for (let xx = 0; xx < width; xx++) {
      const ring = xx < pad || yy < pad || xx >= width - pad || yy >= height - pad;
      if (!ring) continue;
      const i = (yy * width + xx) * 4;
      r.push(data[i]); g.push(data[i + 1]); b.push(data[i + 2]);
    }
  }
  // Varianza alta = fondo no uniforme (degradado/imagen): el rectángulo sólido se va a notar.
  const spread = Math.max(...r) - Math.min(...r) + Math.max(...g) - Math.min(...g) + Math.max(...b) - Math.min(...b);
  return { rgb: [median(r), median(g), median(b)].map((v) => v / 255), spread };
}

// Color del texto: el píxel más alejado del fondo dentro de la caja (getTextContent no da color).
function sampleTextColor(ctx, viewport, box, bg) {
  const [x0, y0] = toPx(viewport, box.x, box.y + box.h);
  const [x1, y1] = toPx(viewport, box.x + box.w, box.y);
  const { data } = ctx.getImageData(x0, y0, x1 - x0, y1 - y0);
  let best = [0, 0, 0], bestDist = -1;
  for (let i = 0; i < data.length; i += 4) {
    const c = [data[i] / 255, data[i + 1] / 255, data[i + 2] / 255];
    const d = Math.hypot(c[0] - bg[0], c[1] - bg[1], c[2] - bg[2]);
    if (d > bestDist) { bestDist = d; best = c; }
  }
  return best;
}

async function findItems(page, finds) {
  const text = await page.getTextContent();
  await page.getOperatorList();
  return finds.map((find) => {
    const it = text.items.find((i) => i.str === find);
    if (!it) throw new Error(`No encontré "${find}"`);
    const font = page.commonObjs.get(it.fontName);
    const size = Math.hypot(it.transform[2], it.transform[3]);
    const ascent = font.ascent ?? 0.9;
    const descent = font.descent ?? -0.25;
    return {
      item: it,
      size,
      // Caja de tapado: de la línea base menos el descendente hasta el ascendente.
      box: { x: it.transform[4] - 0.5, y: it.transform[5] + descent * size - 0.5, w: it.width + 1, h: (ascent - descent) * size + 1 },
    };
  });
}

async function applyEdits(lib, fk, family, bytes, matches, edits, ctx, viewport) {
  const { PDFDocument, rgb } = lib;
  const pdf = await PDFDocument.load(bytes);
  pdf.registerFontkit(fk);
  const regular = await pdf.embedFont(await readFile(`fonts/${family}-Regular.ttf`), { subset: SUBSET });
  const bold = await pdf.embedFont(await readFile(`fonts/${family}-Bold.ttf`), { subset: SUBSET });
  const page = pdf.getPage(0);
  const report = [];

  edits.forEach((edit, i) => {
    const { item, size, box } = matches[i];
    const font = edit.bold ? bold : regular;
    const bg = sampleBackground(ctx, viewport, box);
    const fg = sampleTextColor(ctx, viewport, box, bg.rgb);

    // Fidelidad de métricas: el texto ORIGINAL medido con Carlito debería medir lo mismo que en el PDF.
    const originalWithCarlito = font.widthOfTextAtSize(item.str, size);
    const metricError = (originalWithCarlito - item.width) / item.width;

    // Política simple de "no cabe": si el nuevo texto es más ancho que el original, se reduce el tamaño.
    const newWidth = font.widthOfTextAtSize(edit.replace, size);
    const fitSize = newWidth > item.width ? size * (item.width / newWidth) : size;

    page.drawRectangle({ x: box.x, y: box.y, width: box.w, height: box.h, color: rgb(...bg.rgb) });
    page.drawText(edit.replace, { x: item.transform[4], y: item.transform[5], size: fitSize, font, color: rgb(...fg) });

    report.push({
      find: item.str,
      replace: edit.replace,
      size: +size.toFixed(2),
      fitSize: +fitSize.toFixed(2),
      metricErrorPct: +(metricError * 100).toFixed(2),
      widthRatio: +(newWidth / item.width).toFixed(2),
      bg: bg.rgb.map((v) => Math.round(v * 255)),
      bgSpread: bg.spread,
      textColor: fg.map((v) => Math.round(v * 255)),
    });
  });

  return { bytes: await pdf.save(), report };
}

const summary = [];
for (const c of CASES) {
  const bytes = await readFile(`${FIXTURES}/${c.file}`);
  const { page, canvas, ctx, viewport } = await renderPage(bytes);
  await writeFile(`out/${c.file}.antes.png`, canvas.toBuffer("image/png"));
  const matches = await findItems(page, c.edits.map((e) => e.find));

  for (const [libName, lib, fk] of [["pdf-lib", pdfLibOriginal, fontkit], ["cantoo", pdfLibCantoo, cantooFontkit]]) {
    const t0 = performance.now();
    const { bytes: out, report } = await applyEdits(lib, fk, c.family, bytes, matches, c.edits, ctx, viewport);
    const ms = Math.round(performance.now() - t0);
    const outName = `out/${c.file.replace(".pdf", "")}.editado.${libName}${SUBSET ? "" : ".nosubset"}.pdf`;
    await writeFile(outName, out);
    const after = await renderPage(out);
    await writeFile(`${outName}.png`, after.canvas.toBuffer("image/png"));
    summary.push({ file: c.file, family: c.family, lib: libName, ms, inKB: Math.round(bytes.length / 1024), outKB: Math.round(out.length / 1024), report });
  }
}

await writeFile("out/spike2-report.json", JSON.stringify(summary, null, 2));
for (const s of summary) {
  console.log(`\n${s.file} [${s.lib}] ${s.ms}ms · ${s.inKB}KB → ${s.outKB}KB`);
  for (const r of s.report) {
    console.log(`  "${r.find.slice(0, 32)}" error métrico sustituta=${r.metricErrorPct}% · ancho nuevo/orig=${r.widthRatio} · size ${r.size}→${r.fitSize} · fondo=${r.bg} (spread ${r.bgSpread}) · texto=${r.textColor}`);
  }
}
