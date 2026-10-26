// Única instancia del motor en la app. El worker de pdf.js se sirve desde el propio origen,
// así el PDF se procesa en un hilo aparte y nunca toca la red.
import * as pdfjs from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { createPdfjsEngine } from '@/core/reader/pdfjs-engine'

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

export const engine = createPdfjsEngine(pdfjs)
