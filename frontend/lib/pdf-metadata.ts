import path from "path";

export interface PDFMetadata {
  title: string;
  authors: string | null;
  abstract: string | null;
  pageCount: number;
}

export async function extractPDFMetadata(filePath: string): Promise<PDFMetadata> {
  try {
    const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
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

    const fs = await import("fs/promises");
    const data = new Uint8Array(await fs.readFile(filePath));
    const doc = await pdfjsLib.getDocument({ data }).promise;

    const metadata = await doc.getMetadata();
    const info = (metadata.info || {}) as Record<string, string>;
    const pageCount = doc.numPages;

    // Get first page text as abstract
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

    const title = info.Title?.trim() || path.basename(filePath, ".pdf");
    const authors = info.Author?.trim() || null;

    return { title, authors, abstract, pageCount };
  } catch (err) {
    console.error("PDF metadata extraction failed:", err);
    return {
      title: path.basename(filePath, ".pdf"),
      authors: null,
      abstract: null,
      pageCount: 0,
    };
  }
}
