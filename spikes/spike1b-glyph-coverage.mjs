// Spike 1b: ¿la fuente subconjunto embebida tiene los glifos de un texto nuevo?
import { readFile } from "node:fs/promises";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import fontkit from "@pdf-lib/fontkit";

const data = new Uint8Array(await readFile(process.argv[2]));
const probe = process.argv[3] ?? "Hola Adiós ÑQZ¿?€";
const doc = await pdfjs.getDocument({ data, fontExtraProperties: true }).promise;
const page = await doc.getPage(1);
const text = await page.getTextContent();
await page.getOperatorList();
for (const name of Object.keys(text.styles)) {
  const f = page.commonObjs.get(name);
  let info;
  try {
    const font = fontkit.create(Buffer.from(f.data));
    const set = new Set(font.characterSet);
    const missing = [...new Set(probe)].filter((ch) => ch !== " " && !set.has(ch.codePointAt(0)));
    const pua = font.characterSet.filter((c) => c >= 0xe000 && c <= 0xf8ff).length;
    info = `glifos=${font.numGlyphs} cmap=${set.size} (PUA=${pua}) faltan para "${probe}": ${missing.join("") || "ninguno"}`;
  } catch (e) {
    info = `fontkit no pudo leerla: ${e.message}`;
  }
  console.log(`${f.name} [${f.mimetype}] → ${info}`);
}
