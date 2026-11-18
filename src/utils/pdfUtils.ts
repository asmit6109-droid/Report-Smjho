import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

export const MAX_SCAN_PAGES = 5;

export interface PdfRenderResult {
  pages: string[];
  totalPages: number;
  truncated: boolean;
}

export function isPdfFile(file: File): boolean {
  return (
    file.type === 'application/pdf' ||
    file.name.toLowerCase().endsWith('.pdf')
  );
}

/**
 * Renders up to `maxPages` (default 5) pages of a PDF file to compressed JPEG data URLs
 * with max width 1500px and JPEG quality ~0.7 client-side.
 */
export async function renderPdfToJpegPages(
  file: File,
  maxPages = MAX_SCAN_PAGES,
  maxWidth = 1500,
  quality = 0.7
): Promise<PdfRenderResult> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;

  const totalPages = pdf.numPages;
  const pageCount = Math.min(totalPages, maxPages);
  const renderedPages: string[] = [];

  for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const baseViewport = page.getViewport({ scale: 1.0 });
    const targetScale = Math.min(2.0, Math.max(1.0, maxWidth / (baseViewport.width || 800)));
    const viewport = page.getViewport({ scale: targetScale });

    const canvas = document.createElement('canvas');
    canvas.width = Math.min(maxWidth, Math.round(viewport.width));
    canvas.height = Math.round((canvas.width / viewport.width) * viewport.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      page.cleanup();
      continue;
    }

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const renderViewport = page.getViewport({
      scale: (canvas.width / baseViewport.width) || targetScale,
    });

    await page.render({
      canvasContext: ctx,
      viewport: renderViewport,
      canvas,
    }).promise;

    renderedPages.push(canvas.toDataURL('image/jpeg', quality));
    canvas.width = 0;
    canvas.height = 0;
    page.cleanup();
  }

  return {
    pages: renderedPages,
    totalPages,
    truncated: totalPages > maxPages,
  };
}
