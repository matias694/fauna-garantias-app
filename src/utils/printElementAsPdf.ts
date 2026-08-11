const escapeHtml = (value: string) => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

/**
 * Genera el PDF desde el MISMO DOM que se muestra en la vista previa.
 * No mantiene una segunda plantilla: copia el documento renderizado y las mismas hojas
 * de estilo a una ventana de impresión A4. Así cualquier cambio visual de la app se
 * refleja automáticamente al guardar como PDF.
 */
export function printElementAsPdf(element: HTMLElement | null, documentTitle: string) {
  if (!element || typeof window === 'undefined' || typeof document === 'undefined') return;

  const printWindow = window.open('', '_blank', 'width=900,height=1100');
  if (!printWindow) return;

  const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
    .map(node => node.outerHTML)
    .join('\n');

  const title = escapeHtml(documentTitle);
  const documentHtml = element.outerHTML;

  printWindow.document.open();
  printWindow.document.write(`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  ${styles}
  <style>
    @page { size: A4; margin: 0; }
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      background: #ffffff !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body { width: 210mm; margin: 0 auto !important; }
    #fauna-pdf-root {
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      background: #ffffff;
      overflow: visible !important;
    }
    #fauna-pdf-root > * {
      width: 100% !important;
      max-width: none !important;
      overflow: visible !important;
    }
    table, tr, td, th { break-inside: avoid; }
  </style>
</head>
<body>
  <div id="fauna-pdf-root">${documentHtml}</div>
</body>
</html>`);
  printWindow.document.close();

  const print = () => {
    // Da tiempo a que las hojas de estilo del mismo bundle terminen de cargarse.
    window.setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 250);
  };

  if (printWindow.document.readyState === 'complete') print();
  else printWindow.addEventListener('load', print, { once: true });
}
