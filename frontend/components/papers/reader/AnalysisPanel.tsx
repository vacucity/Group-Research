"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { LatexRenderer } from "@/components/shared/LatexRenderer";
import { X, Loader2, Save, Zap } from "lucide-react";

interface Props {
  selectedText: string;
  onClose: () => void;
  onSave?: (content: string, original: string) => void;
  onGenerateFlashcards?: (content: string) => void;
}

export function AnalysisPanel({ selectedText, onClose, onSave, onGenerateFlashcards }: Props) {
  const [analysis, setAnalysis] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (selectedText) {
      setLoading(true);
      setError("");
      setAnalysis("");

      fetch("/api/ai/analyze/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: selectedText }),
      })
        .then(async (res) => {
          if (!res.ok) throw new Error("Analysis failed");
          const reader = res.body?.getReader();
          if (!reader) throw new Error("No response stream");
          const decoder = new TextDecoder();
          let result = "";
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            for (const line of chunk.split("\n")) {
              if (line.startsWith("data: ")) {
                const data = line.slice(6);
                if (data) {
                  try {
                    result += JSON.parse(data);
                  } catch {
                    result += data;
                  }
                  setAnalysis(result);
                }
              }
            }
          }
        })
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    }
  }, [selectedText]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b border-[#e2e8f0] dark:border-[#2d3f57] shrink-0">
        <h3 className="font-semibold text-sm text-[#1a2332] dark:text-[#e2e8f0]">AI Analysis</h3>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <div className="mb-4">
          <h4 className="text-[10px] font-semibold uppercase tracking-wider text-[#a0b0c0] mb-2">Selected Text</h4>
          <p className="text-sm p-3 bg-[#f8f9fb] dark:bg-[#0f1729] rounded-lg leading-relaxed text-[#1a2332] dark:text-[#e2e8f0]">
            {selectedText}
          </p>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-[#6b7d95] py-8 justify-center">
            <Loader2 className="h-4 w-4 animate-spin" />
            Analyzing...
          </div>
        ) : error ? (
          <p className="text-sm text-[#c0392b]">{error}</p>
        ) : analysis ? (
          <LatexRenderer className="prose prose-sm dark:prose-invert max-w-none prose-headings:text-[#1a2332] dark:prose-headings:text-[#e2e8f0] prose-p:text-[#374151] dark:prose-p:text-[#c0c8d4] prose-strong:text-[#1a2332] dark:prose-strong:text-[#e2e8f0] text-sm leading-relaxed" text={analysis} />
        ) : null}
      </div>

      {analysis && !loading && (
        <div className="p-4 border-t border-[#e2e8f0] dark:border-[#2d3f57] flex gap-2 shrink-0">
          <Button variant="outline" size="sm" className="flex-1" onClick={() => onSave?.(analysis, selectedText)}>
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
          <Button variant="outline" size="sm" className="flex-1" onClick={() => onGenerateFlashcards?.(analysis)}>
            <Zap className="h-4 w-4 mr-2" />
            Flashcards
          </Button>
        </div>
      )}
    </div>
  );
}
