# PDFs privados

Pon aquí PDFs reales con datos personales (tu CV, facturas, etc.).
**Git ignora todo el contenido de esta carpeta excepto este archivo**: los tests los usan en tu máquina pero nunca se suben al repo público.

Para probarlos:

```bash
npm run test:corpus
```

En cada PDF (hasta 3 páginas) se edita la última palabra de un renglón, se exporta y se comprueba que el texto viejo
desaparece, que el nuevo se puede copiar y que fuera de lo editado no cambia ni un píxel. Si algo falla, el mensaje
dice el archivo, la página y el renglón.
