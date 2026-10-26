// Junta "antes" y "después" (recortados) en una sola imagen para revisar el Spike 2.
import { loadImage, createCanvas } from "@napi-rs/canvas";
import { writeFile } from "node:fs/promises";
const [before, after, out, y0, y1] = process.argv.slice(2);
const a = await loadImage(before), b = await loadImage(after);
const top = Math.round(a.height * +y0), h = Math.round(a.height * (+y1 - +y0));
const c = createCanvas(a.width, h * 2 + 10);
const ctx = c.getContext("2d");
ctx.fillStyle = "#f00"; ctx.fillRect(0, 0, c.width, c.height);
ctx.drawImage(a, 0, top, a.width, h, 0, 0, a.width, h);
ctx.drawImage(b, 0, top, b.width, h, 0, h + 10, b.width, h);
await writeFile(out, c.toBuffer("image/png"));
