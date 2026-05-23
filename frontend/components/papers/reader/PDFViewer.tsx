"use client";

import { useState, useEffect, useCallback } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

// Use worker matching react-pdf's bundled pdfjs-dist@4.8.69
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@4.8.69/build/pdf.worker.min.mjs`;

interface Props {
  pdfUrl: string;
  onTextSelect?: (text: string, pageNumber: number) => void;
}

export function PDFViewer({ pdfUrl, onTextSelect }: Props) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.3);

  const handleTextSelect = useCallback(() => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim().length > 3) {
      const text = selection.toString().trim();
      onTextSelect?.(text, pageNumber);
    }
  }, [pageNumber, onTextSelect]);

  return (
    <div className="flex flex-col items-center pdf-container">
      {/* Toolbar */}
      <div className="sticky top-16 z-10 flex items-center gap-1 mb-6 p-1.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur rounded-xl border shadow-sm">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setPageNumber(Math.max(1, pageNumber - 1))}
          disabled={pageNumber <= 1}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm min-w-[100px] text-center tabular-nums">
          {pageNumber} / {numPages || "?"}
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setPageNumber(Math.min(numPages || 1, pageNumber + 1))}
          disabled={pageNumber >= numPages}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <div className="w-px h-5 bg-border mx-1" />
        <Button variant="ghost" size="icon" onClick={() => setScale(Math.max(0.5, scale - 0.2))}>
          <ZoomOut className="h-4 w-4" />
        </Button>
        <span className="text-xs w-12 text-center tabular-nums">{Math.round(scale * 100)}%</span>
        <Button variant="ghost" size="icon" onClick={() => setScale(Math.min(3, scale + 0.2))}>
          <ZoomIn className="h-4 w-4" />
        </Button>
      </div>

      {/* PDF Document */}
      <div onMouseUp={handleTextSelect}>
        <Document
          file={pdfUrl}
          onLoadSuccess={(doc) => setNumPages(doc.numPages)}
          loading={
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading PDF...</p>
            </div>
          }
          error={
            <div className="text-center py-20">
              <p className="text-destructive font-medium">Failed to load PDF</p>
              <p className="text-sm text-muted-foreground mt-1">The file may be corrupted or inaccessible</p>
            </div>
          }
          className="flex flex-col items-center"
        >
          <div className="pdf-page" data-page-number={pageNumber}>
            <Page
              pageNumber={pageNumber}
              scale={scale}
              renderTextLayer={true}
              renderAnnotationLayer={true}
              className="shadow-xl rounded-md overflow-hidden"
            />
          </div>
        </Document>
      </div>
    </div>
  );
}
