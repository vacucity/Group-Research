export interface PDFMetadata {
  title: string;
  authors: string | null;
  abstract: string | null;
  pageCount: number;
}

export async function extractPDFMetadata(
  buffer: Buffer,
  fileName: string
): Promise<PDFMetadata> {
  try {
    const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const path = await import("path");
    const { pathToFileURL } = await import("url");

    const workerPath = path.join(
      process.cwd(),
      "node_modules",
      "pdfjs-dist",
      "legacy",
      "build",
      "pdf.worker.mjs"
    );
    pdfjsLib.GlobalWorkerOptions.workerSrc = pathToFileURL(workerPath).href;

    const data = new Uint8Array(buffer);
    const doc = await pdfjsLib.getDocument({ data }).promise;

    const metadata = await doc.getMetadata();
    const info = (metadata.info || {}) as Record<string, string>;
    const pageCount = doc.numPages;

    let abstract = "";
    try {
      const page = await doc.getPage(1);
      const textContent = await page.getTextContent();
      abstract = textContent.items
        .map((item) => {
          if ("str" in item) return (item as { str: string }).str;
          return "";
        })
        .join(" ")
        .substring(0, 1500);
    } catch {
      // Best-effort abstract extraction
    }

    const title = info.Title?.trim() || fileName.replace(/\.pdf$/i, "");
    const authors = info.Author?.trim() || null;

    return { title, authors, abstract, pageCount };
  } catch (err) {
    console.error("PDF metadata extraction failed:", err);
    return {
      title: fileName.replace(/\.pdf$/i, ""),
      authors: null,
      abstract: null,
      pageCount: 0,
    };
  }
}
