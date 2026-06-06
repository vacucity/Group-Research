"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { ManuscriptSection } from "@/types";
import { WysiwygEditor } from "./WysiwygEditor";
import { LatexEditor } from "./LatexEditor";
import { FileText, Code } from "lucide-react";

interface Props {
  section: ManuscriptSection;
  manuscriptId: string;
  onSave: (sectionId: string, content: Record<string, unknown>) => Promise<void>;
}

export function ManuscriptEditor({ section, manuscriptId, onSave }: Props) {
  const [mode, setMode] = useState<"wysiwyg" | "latex">(
    section.contentMode || "wysiwyg"
  );
  const [latexValue, setLatexValue] = useState<string>(
    section.latexContent || ""
  );
  const latexTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Reset mode and latex content when switching sections
  useEffect(() => {
    setMode(section.contentMode || "wysiwyg");
    setLatexValue(section.latexContent || "");
  }, [section.id, section.contentMode, section.latexContent]);

  const handleLatexChange = useCallback(
    (value: string) => {
      setLatexValue(value);
      if (latexTimer.current) clearTimeout(latexTimer.current);
      latexTimer.current = setTimeout(async () => {
        try {
          await fetch(
            `/api/manuscripts/${manuscriptId}/sections/${section.id}`,
            {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                latexContent: value,
                contentMode: "latex",
              }),
            }
          );
        } catch {
          // silent save failure
        }
      }, 2000);
    },
    [manuscriptId, section.id]
  );

  const handleModeSwitch = async (newMode: "wysiwyg" | "latex") => {
    setMode(newMode);
    await fetch(`/api/manuscripts/${manuscriptId}/sections/${section.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contentMode: newMode }),
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Mode toggle bar */}
      <div className="flex items-center justify-between px-3 py-1 border-b border-[var(--border)] bg-[var(--card)] shrink-0">
        <div className="flex items-center gap-0.5 bg-[var(--secondary)] rounded-lg p-0.5">
          <button
            onClick={() => handleModeSwitch("wysiwyg")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              mode === "wysiwyg"
                ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm"
                : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            Word
          </button>
          <button
            onClick={() => handleModeSwitch("latex")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              mode === "latex"
                ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm"
                : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            }`}
          >
            <Code className="h-3.5 w-3.5" />
            LaTeX
          </button>
        </div>
        <span className="text-[10px] text-[var(--muted-foreground)]">
          {mode === "latex"
            ? "Edit LaTeX source — export as .tex to compile"
            : "Rich text editing"}
        </span>
      </div>

      {/* Editor area */}
      {mode === "wysiwyg" ? (
        <WysiwygEditor
          section={section}
          manuscriptId={manuscriptId}
          onSave={onSave}
        />
      ) : (
        <LatexEditor
          content={latexValue}
          onChange={handleLatexChange}
        />
      )}
    </div>
  );
}
