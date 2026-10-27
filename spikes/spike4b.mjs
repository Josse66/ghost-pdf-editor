// Spike 4b: qué archivos de Fontsource aguantan el subset de @cantoo/fontkit.
// Uso: node spike4b.mjs carlito/files/carlito-latin-400-normal.woff ...
import { readFile } from "node:fs/promises";
import { PDFDocument } from "@cantoo/pdf-lib";
import fontkit from "@cantoo/fontkit";

const root = "../node_modules/@fontsource";
for (const name of process.argv.slice(2)) {
  for (const subset of [true, false]) {
    const doc = await PDFDocument.create();
    doc.registerFontkit(fontkit);
    const page = doc.addPage([400, 200]);
    try {
      const font = await doc.embedFont(await readFile(`${root}/${name}`), { subset });
      page.drawText("Hola Adiós ÑQZ¿? fi ft", { x: 20, y: 100, size: 18, font });
      const out = await doc.save();
      console.log(name, subset ? "subset" : "full", "ok", Math.round(out.length / 1024), "KB");
    } catch (e) {
      console.log(name, subset ? "subset" : "full", "FALLA", e.message.slice(0, 60));
    }
  }
}
