/**
 * Descargas desde el navegador. Solo para Client Components: usan el DOM.
 */

export function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}

/** Descarga un texto como archivo. El BOM del CSV ya viene incluido en `content`. */
export function downloadTextFile(filename: string, content: string, mimeType: string): void {
  downloadBlob(filename, new Blob([content], { type: `${mimeType};charset=utf-8` }));
}
