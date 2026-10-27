// Spike 4: ¿@cantoo/pdf-lib + @cantoo/fontkit embeben (con subset) las WOFF de Fontsource?
// Si sí, la exportación usa las mismas gemelas que la app ya trae, sin TTF aparte.
import { readFile, writeFile } from "node:fs/promises";
import { PDFDocument, rgb } from "@cantoo/pdf-lib";
import fontkit from "@cantoo/fontkit";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";

const files = "../node_modules/@fontsource/carlito/files";
const doc = await PDFDocument.create();
doc.registerFontkit(fontkit);
const page = doc.addPage([400, 200]);
for (const [i, name] of ["carlito-latin-400-normal.woff", "carlito-latin-ext-700-normal.woff", "carlito-latin-400-normal.woff2"].entries()) {
  try {
    const bytes = await readFile(`${files}/${name}`);
    const font = await doc.embedFont(bytes, { subset: true });
    const text = i === 1 ? "Łódź Ővé" : "Hola Adiós ÑQZ¿? fi ft";
    page.drawText(text, { x: 20, y: 150 - i * 40, size: 18, font, color: rgb(0, 0, 0) });
    console.log(name, "ok, ancho", font.widthOfTextAtSize(text, 18).toFixed(1));
  } catch (e) { console.log(name, "FALLA", e.message); }
}
const out = await doc.save();
await writeFile("out/spike4.pdf", out);
const pdf = await pdfjs.getDocument({ data: out }).promise;
const items = (await (await pdf.getPage(1)).getTextContent()).items.map((i) => i.str).join(" | ");
console.log(Math.round(out.length / 1024), "KB · texto:", items);
