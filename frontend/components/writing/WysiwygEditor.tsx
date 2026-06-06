"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Highlight from "@tiptap/extension-highlight";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import { ManuscriptSection } from "@/types";
import { ManuscriptToolbar } from "./ManuscriptToolbar";

interface Props {
  section: ManuscriptSection;
  manuscriptId: string;
  onSave: (sectionId: string, content: Record<string, unknown>) => Promise<void>;
}

export function WysiwygEditor({ section, manuscriptId, onSave }: Props) {
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
      }),
      Placeholder.configure({
        placeholder: `Start writing "${section.title}"...`,
      }),
      Underline,
      Link.configure({ openOnClick: false }),
      Highlight,
      Subscript,
      Superscript,
    ],
    content: parseContent(section.content),
    onUpdate: ({ editor }) => {
      const json = editor.getJSON();
      debouncedSave(section.id, json);
    },
    editorProps: {
      attributes: {
        class:
          "focus:outline-none min-h-[60vh] px-8 py-6 text-[var(--foreground)] text-sm leading-relaxed",
      },
    },
  });

  // Update editor content when section changes
  useEffect(() => {
    if (editor && section.id) {
      const currentJson = editor.getJSON();
      const newJson = parseContent(section.content);
      if (JSON.stringify(currentJson) !== JSON.stringify(newJson)) {
        editor.commands.setContent(newJson);
      }
    }
  }, [section.id]);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const debouncedSave = useCallback(
    (sectionId: string, json: Record<string, unknown>) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        await onSave(sectionId, json);
        setLastSaved(new Date());
      }, 2000);
    },
    [onSave]
  );

  if (!editor) {
    return (
      <div className="flex items-center justify-center h-full text-[var(--muted-foreground)]">
        <p className="text-sm">Loading editor...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <ManuscriptToolbar editor={editor} manuscriptId={manuscriptId} section={section} />
      <div className="flex-1 overflow-y-auto">
        <EditorContent editor={editor} />
      </div>
      <div className="px-4 py-1.5 border-t border-[var(--border)] bg-[var(--card)] text-[10px] text-[var(--muted-foreground)] shrink-0">
        {lastSaved
          ? `Last saved ${lastSaved.toLocaleTimeString()}`
          : "No changes yet"}
      </div>
    </div>
  );
}

function parseContent(content: unknown): Record<string, unknown> {
  if (!content) return defaultDoc();
  if (typeof content === "object" && content !== null) {
    const obj = content as Record<string, unknown>;
    if (obj.type) return obj;
    return defaultDoc();
  }
  if (typeof content === "string") {
    try {
      const parsed = JSON.parse(content);
      if (parsed && parsed.type) return parsed;
    } catch {
      // Not JSON
    }
    if (content === "{}" || content === "") return defaultDoc();
    return {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: content.trim() ? [{ type: "text", text: content }] : [],
        },
      ],
    };
  }
  return defaultDoc();
}

function defaultDoc(): Record<string, unknown> {
  return {
    type: "doc",
    content: [{ type: "paragraph", content: [] }],
  };
}
