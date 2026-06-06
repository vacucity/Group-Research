"use client";

import { Editor } from "@tiptap/react";
import { ManuscriptSection } from "@/types";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Code,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  Quote,
  Link as LinkIcon,
  Highlighter,
  Undo2,
  Redo2,
  Sparkles,
  Search,
  AlertTriangle,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Props {
  editor: Editor;
  manuscriptId: string;
  section: ManuscriptSection;
}

export function ManuscriptToolbar({ editor, manuscriptId, section }: Props) {
  const [aiOpen, setAiOpen] = useState(false);
  const [aiAction, setAiAction] = useState("improve");
  const [aiLoading, setAiLoading] = useState(false);

  // Citation suggestion
  const [citeOpen, setCiteOpen] = useState(false);
  const [citeResult, setCiteResult] = useState("");
  const [citeLoading, setCiteLoading] = useState(false);

  // Missing citation detection
  const [missingOpen, setMissingOpen] = useState(false);
  const [missingResult, setMissingResult] = useState("");
  const [missingLoading, setMissingLoading] = useState(false);

  const ToolButton = ({
    onClick,
    active,
    title,
    children,
  }: {
    onClick: () => void;
    active?: boolean;
    title: string;
    children: React.ReactNode;
  }) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded hover:bg-[var(--secondary)] transition-colors ${
        active
          ? "text-[var(--primary)] bg-[var(--primary)]/10"
          : "text-[var(--muted-foreground)]"
      }`}
    >
      {children}
    </button>
  );

  const handleAI = async () => {
    setAiLoading(true);
    try {
      const res = await fetch("/api/ai/write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "section",
          section_title: section.title,
          section_type: section.sectionType,
          write_action: aiAction,
          existing_content: editor.getText(),
          language: "Chinese",
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "AI failed");

      const aiContent = json.data?.content || "";
      if (aiAction === "improve" || aiAction === "expand") {
        editor.commands.setContent(`<p>${aiContent.replace(/\n/g, "</p><p>")}</p>`);
      } else if (aiAction === "generate") {
        editor.commands.insertContent(
          `<p>${aiContent.replace(/\n/g, "</p><p>")}</p>`
        );
      } else if (aiAction === "summarize") {
        editor.commands.setContent(`<p>${aiContent.replace(/\n/g, "</p><p>")}</p>`);
      }
      toast.success(`AI ${aiAction} completed`);
      setAiOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "AI request failed");
    } finally {
      setAiLoading(false);
    }
  };

  const handleSuggestCitations = async () => {
    setCiteLoading(true);
    try {
      const res = await fetch("/api/ai/write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "citations",
          text: editor.getText(),
          limit: 5,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed");
      setCiteResult(json.data?.suggestions || "No relevant citations found.");
      setCiteOpen(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Citation suggestion failed");
    } finally {
      setCiteLoading(false);
    }
  };

  const handleDetectMissing = async () => {
    setMissingLoading(true);
    try {
      const res = await fetch("/api/ai/write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "missing",
          text: editor.getText(),
          existing_citations: "",
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed");
      setMissingResult(json.data?.missing || "No missing citations detected.");
      setMissingOpen(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Missing citation detection failed");
    } finally {
      setMissingLoading(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-0.5 px-3 py-1.5 border-b border-[var(--border)] bg-[var(--card)] overflow-x-auto shrink-0">
        <ToolButton onClick={() => editor.chain().focus().undo().run()} title="Undo">
          <Undo2 className="h-4 w-4" />
        </ToolButton>
        <ToolButton onClick={() => editor.chain().focus().redo().run()} title="Redo">
          <Redo2 className="h-4 w-4" />
        </ToolButton>

        <div className="w-px h-5 bg-[var(--border)] mx-1.5" />

        <ToolButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive("bold")}
          title="Bold"
        >
          <Bold className="h-4 w-4" />
        </ToolButton>
        <ToolButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive("italic")}
          title="Italic"
        >
          <Italic className="h-4 w-4" />
        </ToolButton>
        <ToolButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          active={editor.isActive("underline")}
          title="Underline"
        >
          <UnderlineIcon className="h-4 w-4" />
        </ToolButton>
        <ToolButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          active={editor.isActive("strike")}
          title="Strikethrough"
        >
          <Strikethrough className="h-4 w-4" />
        </ToolButton>
        <ToolButton
          onClick={() => editor.chain().focus().toggleCode().run()}
          active={editor.isActive("code")}
          title="Inline Code"
        >
          <Code className="h-4 w-4" />
        </ToolButton>
        <ToolButton
          onClick={() => editor.chain().focus().toggleHighlight().run()}
          active={editor.isActive("highlight")}
          title="Highlight"
        >
          <Highlighter className="h-4 w-4" />
        </ToolButton>

        <div className="w-px h-5 bg-[var(--border)] mx-1.5" />

        <ToolButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          active={editor.isActive("heading", { level: 1 })}
          title="Heading 1"
        >
          <Heading1 className="h-4 w-4" />
        </ToolButton>
        <ToolButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive("heading", { level: 2 })}
          title="Heading 2"
        >
          <Heading2 className="h-4 w-4" />
        </ToolButton>
        <ToolButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          active={editor.isActive("heading", { level: 3 })}
          title="Heading 3"
        >
          <Heading3 className="h-4 w-4" />
        </ToolButton>

        <div className="w-px h-5 bg-[var(--border)] mx-1.5" />

        <ToolButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive("bulletList")}
          title="Bullet List"
        >
          <List className="h-4 w-4" />
        </ToolButton>
        <ToolButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive("orderedList")}
          title="Ordered List"
        >
          <ListOrdered className="h-4 w-4" />
        </ToolButton>
        <ToolButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive("blockquote")}
          title="Blockquote"
        >
          <Quote className="h-4 w-4" />
        </ToolButton>

        <div className="w-px h-5 bg-[var(--border)] mx-1.5" />

        {/* AI buttons */}
        <button
          type="button"
          onClick={() => setAiOpen(true)}
          className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-[var(--primary)]/10 text-[var(--primary)] hover:bg-[var(--primary)]/20 transition-colors"
        >
          <Sparkles className="h-3.5 w-3.5" />
          AI Write
        </button>

        <button
          type="button"
          onClick={handleSuggestCitations}
          disabled={citeLoading}
          className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-[var(--muted-foreground)] hover:bg-[var(--secondary)] transition-colors"
        >
          <Search className="h-3.5 w-3.5" />
          Cite
        </button>

        <button
          type="button"
          onClick={handleDetectMissing}
          disabled={missingLoading}
          className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-[var(--muted-foreground)] hover:bg-[var(--secondary)] transition-colors"
        >
          <AlertTriangle className="h-3.5 w-3.5" />
          Check
        </button>
      </div>

      {/* AI Write Dialog */}
      <Dialog
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        title="AI Writing Assistant"
        description={`Assist with the "${section.title}" section.`}
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-[var(--foreground)] mb-1.5 block">
              Action
            </label>
            <select
              value={aiAction}
              onChange={(e) => setAiAction(e.target.value)}
              className="flex h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 text-sm text-[var(--foreground)]"
            >
              <option value="generate">Generate new content</option>
              <option value="improve">Improve existing text</option>
              <option value="expand">Expand with more detail</option>
              <option value="summarize">Summarize / condense</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setAiOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAI} disabled={aiLoading}>
              {aiLoading && (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2 inline-block" />
              )}
              Run
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Citation Suggestions Dialog */}
      <Dialog
        open={citeOpen}
        onClose={() => setCiteOpen(false)}
        title="Suggested Citations"
        description="AI-recommended citations for the current text."
      >
        <div className="max-h-80 overflow-y-auto whitespace-pre-wrap text-sm text-[var(--foreground)] leading-relaxed">
          {citeResult}
        </div>
      </Dialog>

      {/* Missing Citation Detection Dialog */}
      <Dialog
        open={missingOpen}
        onClose={() => setMissingOpen(false)}
        title="Missing Citation Check"
        description="Claims that may need citations."
      >
        <div className="max-h-80 overflow-y-auto whitespace-pre-wrap text-sm text-[var(--foreground)] leading-relaxed">
          {missingResult}
        </div>
      </Dialog>
    </>
  );
}
