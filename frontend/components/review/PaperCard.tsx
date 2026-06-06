"use client";

import { ReviewPaper } from "@/types";
import { FileText, Clock, AlertCircle, CheckCircle, Loader2 } from "lucide-react";

interface Props {
  paper: ReviewPaper;
  onDelete?: (id: string) => void;
  onParse?: (id: string) => void;
}

export function PaperCard({ paper, onDelete, onParse }: Props) {
  const statusIcon = {
    pending: <Clock className="h-3.5 w-3.5 text-gray-400" />,
    parsing: <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-400" />,
    parsed: <CheckCircle className="h-3.5 w-3.5 text-green-400" />,
    error: <AlertCircle className="h-3.5 w-3.5 text-red-400" />,
  };

  return (
    <div className="group flex items-start gap-3 p-3 rounded-lg border border-[var(--border)] bg-[var(--card)] hover:border-[var(--primary)]/30 transition-colors">
      <div className="h-8 w-8 rounded-md bg-[var(--primary)]/10 flex items-center justify-center shrink-0 mt-0.5">
        <FileText className="h-4 w-4 text-[var(--primary)]" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-medium text-[var(--foreground)] truncate">
            {paper.title}
          </h4>
          <span title={paper.status}>{statusIcon[paper.status] || statusIcon.pending}</span>
        </div>
        {paper.authors && (
          <p className="text-xs text-[var(--muted-foreground)] mt-0.5 truncate">
            {paper.authors}
          </p>
        )}
        <div className="flex items-center gap-2 mt-1">
          {paper.year && (
            <span className="text-[10px] text-[var(--muted-foreground)]">{paper.year}</span>
          )}
          {paper.source && (
            <span className="text-[10px] px-1 py-0.5 rounded bg-[var(--secondary)] text-[var(--muted-foreground)] uppercase">
              {paper.source}
            </span>
          )}
        </div>
        {paper.abstract && (
          <p className="text-xs text-[var(--muted-foreground)] mt-1.5 line-clamp-2">
            {paper.abstract}
          </p>
        )}
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        {paper.status === "pending" && onParse && (
          <button
            onClick={() => onParse(paper.id)}
            className="px-2 py-1 text-[10px] rounded bg-[var(--primary)]/10 text-[var(--primary)] hover:bg-[var(--primary)]/20"
          >
            Parse
          </button>
        )}
        {onDelete && (
          <button
            onClick={() => onDelete(paper.id)}
            className="p-1 rounded text-[var(--muted-foreground)] hover:text-red-500 hover:bg-red-50"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
