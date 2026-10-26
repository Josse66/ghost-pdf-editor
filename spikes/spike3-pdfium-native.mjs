// Spike 3: edición "nativa" con PDFium (WASM, @embedpdf/pdfium, MIT) en vez de tapar + redibujar.
//  A) Lista los objetos de texto reales de la página (texto, fuente original, tamaño, color, matriz).
//  B) Variante "reusar": FPDFText_SetText sobre el objeto original (fuente subconjunto original).
//  C) Variante "reemplazar": elimina el objeto original y crea uno nuevo con Carlito en la misma matriz.
// Después verifica con pdf.js si el texto viejo sigue extraíble y renderiza PNG.
// Uso: node spike3-pdfium-native.mjs
import { readFile, writeFile } from "node:fs/promises";
import { init } from "@embedpdf/pdfium";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import { createCanvas } from "@napi-rs/canvas";

const INPUT = "../test-fixtures/generated/cv-calibri.pdf";
const FIND = "Ingeniero de Software";
const REPLACE = "Ingeniera de Software Sénior";
const FPDF_PAGEOBJ_TEXT = 1;
const FPDF_FONT_TRUETYPE = 2;

const P = await init({ wasmBinary: await readFile("node_modules/@embedpdf/pdfium/dist/pdfium.wasm") });
P.PDFiumExt_Init();
const { wasmExports, getValue, setValue, UTF16ToString, stringToUTF16 } = P.pdfium;
const heap = () => new Uint8Array(wasmExports.memory.buffer);
const malloc = (n) => wasmExports.malloc(n);
const free = (p) => wasmExports.free(p);

function copyIn(bytes) {
  const ptr = malloc(bytes.length);
  heap().set(bytes, ptr);
  return ptr;
}

function utf16(str) {
  const size = (str.length + 1) * 2;
  const ptr = malloc(size);
  stringToUTF16(str, ptr, size);
  return ptr;
}

function textOf(obj, textPage) {
  const len = P.FPDFTextObj_GetText(obj, textPage, 0, 0);
  const buf = malloc(len);
  P.FPDFTextObj_GetText(obj, textPage, buf, len);
  const s = UTF16ToString(buf);
  free(buf);
  return s;
}

function fontNameOf(obj) {
  const font = P.FPDFTextObj_GetFont(obj);
  const len = P.FPDFFont_GetBaseFontName(font, 0, 0);
  const buf = malloc(len);
  P.FPDFFont_GetBaseFontName(font, buf, len);
  const s = Buffer.from(heap().slice(buf, buf + len - 1)).toString("latin1");
  free(buf);
  return s;
}

function floatOut(fn, obj) {
  const ptr = malloc(4);
  fn(obj, ptr);
  const v = getValue(ptr, "float");
  free(ptr);
  return v;
}

function matrixOf(obj) {
  const ptr = malloc(24);
  P.FPDFPageObj_GetMatrix(obj, ptr);
  const m = [0, 1, 2, 3, 4, 5].map((i) => getValue(ptr + i * 4, "float"));
  return { ptr, m };
}

function fillColorOf(obj) {
  const ptr = malloc(16);
  P.FPDFPageObj_GetFillColor(obj, ptr, ptr + 4, ptr + 8, ptr + 12);
  const c = [0, 1, 2, 3].map((i) => getValue(ptr + i * 4, "i32") >>> 0);
  free(ptr);
  return c;
}

function save(doc) {
  const writer = P.PDFiumExt_OpenFileWriter();
  P.PDFiumExt_SaveAsCopy(doc, writer);
  const size = P.PDFiumExt_GetFileWriterSize(writer);
  const buf = malloc(size);
  P.PDFiumExt_GetFileWriterData(writer, buf, size);
  const out = heap().slice(buf, buf + size);
  free(buf);
  P.PDFiumExt_CloseFileWriter(writer);
  return out;
}

function openPage(bytes) {
  const dataPtr = copyIn(bytes);
  const doc = P.FPDF_LoadMemDocument(dataPtr, bytes.length, "");
  if (!doc) throw new Error(`PDFium no abrió el documento (error ${P.FPDF_GetLastError()})`);
  const page = P.FPDF_LoadPage(doc, 0);
  const textPage = P.FPDFText_LoadPage(page);
  return { doc, page, textPage, dataPtr };
}

// PDFium parte el texto en muchos objetos (a veces uno por glifo por el kerning):
// busca la secuencia consecutiva de objetos cuyo texto unido es exactamente "find".
// Se compara sin espacios: PDFium agrega espacios sintéticos al final de algunos objetos.
function findRun(objs, find) {
  const target = find.replace(/\s+/g, "");
  for (let s = 0; s < objs.length; s++) {
    let acc = "";
    for (let e = s; e < objs.length && acc.length < target.length; e++) {
      acc += objs[e].text.replace(/\s+/g, "");
      if (acc === target) return objs.slice(s, e + 1);
    }
  }
  throw new Error(`No encontré la secuencia "${find}"`);
}

function findTextObject(page, textPage) {
  const n = P.FPDFPage_CountObjects(page);
  const all = [];
  for (let i = 0; i < n; i++) {
    const obj = P.FPDFPage_GetObject(page, i);
    if (P.FPDFPageObj_GetType(obj) !== FPDF_PAGEOBJ_TEXT) continue;
    all.push({ i, obj, text: textOf(obj, textPage) });
  }
  return all;
}

// --- A) Inventario de objetos de texto ---
const original = await readFile(INPUT);
{
  const { page, textPage } = openPage(original);
  const objs = findTextObject(page, textPage);
  console.log(`A) ${objs.length} objetos de texto en la página 1. Primeros 6:`);
  for (const o of objs.slice(0, 6)) {
    const { m, ptr } = matrixOf(o.obj);
    free(ptr);
    console.log(`   #${o.i} ${JSON.stringify(o.text).padEnd(28)} font=${fontNameOf(o.obj)} size=${floatOut(P.FPDFTextObj_GetFontSize, o.obj).toFixed(2)} rgba=${fillColorOf(o.obj)} matrix=${m.map((v) => +v.toFixed(2))}`);
  }
}

// --- B) Reusar la fuente original: SetText sobre el mismo objeto ---
async function variantReuse() {
  const { doc, page, textPage } = openPage(original);
  const [first, ...rest] = findRun(findTextObject(page, textPage), FIND);
  const ws = utf16(REPLACE);
  const ok = P.FPDFText_SetText(first.obj, ws);
  free(ws);
  for (const o of rest) { P.FPDFPage_RemoveObject(page, o.obj); P.FPDFPageObj_Destroy(o.obj); }
  console.log(`   secuencia original: ${rest.length + 1} objetos`);
  P.FPDFPage_GenerateContent(page);
  return { ok, bytes: save(doc) };
}

// --- C) Reemplazar: borrar objeto original + objeto nuevo con Carlito ---
async function variantReplace() {
  const { doc, page, textPage } = openPage(original);
  const run = findRun(findTextObject(page, textPage), FIND);
  const target = run[0];
  const size = floatOut(P.FPDFTextObj_GetFontSize, target.obj);
  const { ptr: matrixPtr } = matrixOf(target.obj);
  const [r, g, b, a] = fillColorOf(target.obj);

  const fontBytes = await readFile("fonts/Carlito-Bold.ttf");
  const fontPtr = copyIn(fontBytes);
  const font = P.FPDFText_LoadFont(doc, fontPtr, fontBytes.length, FPDF_FONT_TRUETYPE, true);

  let removed = true;
  for (const o of run) { removed = P.FPDFPage_RemoveObject(page, o.obj) && removed; P.FPDFPageObj_Destroy(o.obj); }

  const obj = P.FPDFPageObj_CreateTextObj(doc, font, size);
  const ws = utf16(REPLACE);
  P.FPDFText_SetText(obj, ws);
  free(ws);
  P.FPDFPageObj_SetMatrix(obj, matrixPtr);
  P.FPDFPageObj_SetFillColor(obj, r, g, b, a);
  P.FPDFPage_InsertObject(page, obj);
  P.FPDFPage_GenerateContent(page);
  return { ok: removed && !!font, bytes: save(doc) };
}

async function checkWithPdfjs(name, bytes) {
  const doc = await pdfjs.getDocument({ data: new Uint8Array(bytes) }).promise;
  const page = await doc.getPage(1);
  const text = (await page.getTextContent()).items.map((i) => i.str).join("\n");
  const viewport = page.getViewport({ scale: 2 });
  const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
  await page.render({ canvas, canvasContext: canvas.getContext("2d"), viewport }).promise;
  await writeFile(`out/${name}.pdf`, bytes);
  await writeFile(`out/${name}.png`, canvas.toBuffer("image/png"));
  console.log(`   ${name}: ${Math.round(bytes.length / 1024)}KB · texto viejo extraíble=${text.includes(FIND)} · texto nuevo extraíble=${text.includes(REPLACE)}`);
}

for (const [name, fn] of [["spike3-pdfium-reusar", variantReuse], ["spike3-pdfium-reemplazar", variantReplace]]) {
  const t0 = performance.now();
  const { ok, bytes } = await fn();
  console.log(`\n${name}: ok=${ok} · ${Math.round(performance.now() - t0)}ms`);
  await checkWithPdfjs(name, bytes);
}
