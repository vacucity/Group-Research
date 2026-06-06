"use client";

import { useMemo, useRef, useCallback, useState } from "react";
import CodeMirror, { ReactCodeMirrorRef } from "@uiw/react-codemirror";
import { StreamLanguage } from "@codemirror/language";
import { stex } from "@codemirror/legacy-modes/mode/stex";
import { Columns2, AlignLeft } from "lucide-react";
import { renderLatexToHtml } from "@/lib/latex-renderer";

interface Props {
  content: string;
  onChange: (value: string) => void;
}

export function LatexEditor({ content, onChange }: Props) {
  const editorRef = useRef<ReactCodeMirrorRef>(null);
  const [split, setSplit] = useState(true); // true = code + preview, false = code only

  const handleChange = useCallback(
    (value: string) => {
      onChange(value);
    },
    [onChange]
  );

  const previewHtml = useMemo(() => renderLatexToHtml(content), [content]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Split toggle */}
      <div className="flex items-center gap-1 px-3 py-0.5 border-b border-[var(--border)] bg-[var(--card)] shrink-0">
        <button
          type="button"
          onClick={() => setSplit(!split)}
          title={split ? "Code only" : "Split view"}
          className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
            split
              ? "bg-[var(--primary)]/10 text-[var(--primary)]"
              : "text-[var(--muted-foreground)] hover:bg-[var(--secondary)]"
          }`}
        >
          {split ? <Columns2 className="h-3 w-3" /> : <AlignLeft className="h-3 w-3" />}
          {split ? "Split" : "Code"}
        </button>
        <span className="text-[10px] text-[var(--muted-foreground)] ml-auto">
          {split ? "Live preview" : "Source only"}
        </span>
      </div>

      {/* Editor + Preview */}
      <div className={`flex-1 flex overflow-hidden ${split ? "" : "flex-col"}`}>
        {/* Code panel */}
        <div className={`${split ? "w-1/2" : "flex-1"} overflow-hidden border-r border-[var(--border)]`}>
          <CodeMirror
            ref={editorRef}
            value={content}
            onChange={handleChange}
            extensions={[StreamLanguage.define(stex)]}
            basicSetup={{
              lineNumbers: true,
              foldGutter: false,
              highlightActiveLine: true,
              bracketMatching: true,
              closeBrackets: true,
              indentOnInput: true,
            }}
            className="h-full"
            style={{ height: "100%", fontSize: "13px" }}
          />
        </div>

        {/* Preview panel */}
        {split && (
          <div className="w-1/2 overflow-y-auto bg-white">
            <div className="px-6 py-8 max-w-none">
              {previewHtml ? (
                <div
                  className="latex-preview prose prose-sm max-w-none text-[var(--foreground)] leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: previewHtml }}
                />
              ) : (
                <p className="text-[var(--muted-foreground)] text-sm italic">
                  Start writing LaTeX to see the preview...
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
