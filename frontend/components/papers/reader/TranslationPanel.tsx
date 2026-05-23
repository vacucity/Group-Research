"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, Loader2, Save } from "lucide-react";

interface Props {
  selectedText: string;
  onClose: () => void;
  onSave?: (content: string, original: string) => void;
}

export function TranslationPanel({ selectedText, onClose, onSave }: Props) {
  const [translation, setTranslation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (selectedText) {
      setLoading(true);
      setError("");
      setTranslation("");

      fetch("/api/ai/translate/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: selectedText, targetLang: "Chinese" }),
      })
        .then(async (res) => {
          if (!res.ok) throw new Error("Translation failed");
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
                  setTranslation(result);
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
        <h3 className="font-semibold text-sm text-[#1a2332] dark:text-[#e2e8f0]">Translation</h3>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        <div>
          <h4 className="text-[10px] font-semibold uppercase tracking-wider text-[#a0b0c0] mb-2">Original</h4>
          <p className="text-sm p-3 bg-[#f8f9fb] dark:bg-[#0f1729] rounded-lg leading-relaxed text-[#1a2332] dark:text-[#e2e8f0]">
            {selectedText}
          </p>
        </div>

        <div>
          <h4 className="text-[10px] font-semibold uppercase tracking-wider text-[#a0b0c0] mb-2">Chinese</h4>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-[#6b7d95] p-3">
              <Loader2 className="h-4 w-4 animate-spin" />
              Translating...
            </div>
          ) : error ? (
            <p className="text-sm text-[#c0392b] p-3">{error}</p>
          ) : (
            <p className="text-sm p-3 bg-[#f8f9fb] dark:bg-[#0f1729] rounded-lg leading-relaxed whitespace-pre-wrap text-[#1a2332] dark:text-[#e2e8f0]">
              {translation}
            </p>
          )}
        </div>
      </div>

      {translation && !loading && (
        <div className="p-4 border-t border-[#e2e8f0] dark:border-[#2d3f57] shrink-0">
          <Button variant="outline" size="sm" className="w-full" onClick={() => onSave?.(translation, selectedText)}>
            <Save className="h-4 w-4 mr-2" />
            Save as Note
          </Button>
        </div>
      )}
    </div>
  );
}
