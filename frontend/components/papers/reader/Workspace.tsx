"use client";

import { useState, useEffect, useRef } from "react";
import { Note } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { LatexRenderer, PlainText } from "@/components/shared/LatexRenderer";
import {
  StickyNote, Languages, Brain, MessageCircle, Map, Save, Trash2,
  Loader2, Send, User, Bot, Highlighter, X, Plus, ListTree, Zap,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { clsx } from "clsx";

type Tab = "notes" | "translate" | "analyze" | "qa" | "outline";

interface Props {
  notes: Note[];
  selectedText: string | null;
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  paperContext: string;
  paperTitleAbstract: string;
  paperId: string;
  onSaveNote: (content: string, original: string, type: string) => void;
  onDeleteNote: (id: string) => void;
  onRefreshNotes: () => void;
  onClearSelection: () => void;
}

const tabs: { id: Tab; icon: React.ReactNode; label: string }[] = [
  { id: "notes", icon: <StickyNote className="h-3.5 w-3.5" />, label: "Notes" },
  { id: "translate", icon: <Languages className="h-3.5 w-3.5" />, label: "Translate" },
  { id: "analyze", icon: <Brain className="h-3.5 w-3.5" />, label: "Analyze" },
  { id: "qa", icon: <MessageCircle className="h-3.5 w-3.5" />, label: "Q&A" },
  { id: "outline", icon: <ListTree className="h-3.5 w-3.5" />, label: "Outline" },
];

const typeBadge: Record<string, { color: string; label: string }> = {
  HIGHLIGHT: { color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400", label: "Highlight" },
  TRANSLATION: { color: "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400", label: "Translation" },
  ANALYSIS: { color: "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400", label: "Analysis" },
  COMMENT: { color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400", label: "Q&A" },
  FLASHCARD: { color: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400", label: "Flashcard" },
};

export function Workspace({ notes, selectedText, activeTab, onTabChange, paperContext, paperTitleAbstract, paperId, onSaveNote, onDeleteNote, onRefreshNotes, onClearSelection }: Props) {
  return (
    <aside className="w-full h-full flex flex-col bg-[var(--card)] overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-[var(--border)] shrink-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={clsx(
              "flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-medium border-b-2 transition-colors",
              activeTab === tab.id
                ? "border-[var(--primary)] text-[var(--primary)]"
                : "border-transparent text-[var(--muted-foreground)]/60 hover:text-[var(--muted-foreground)]"
            )}
          >
            {tab.icon}
            <span className="hidden xl:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto">
        {activeTab === "notes" && <NotesTab notes={notes} onDelete={onDeleteNote} />}
        {activeTab === "translate" && (
          <TranslateTab selectedText={selectedText} onSave={onSaveNote} onClear={onClearSelection} />
        )}
        {activeTab === "analyze" && (
          <AnalyzeTab selectedText={selectedText} paperContext={paperContext} onSave={onSaveNote} onClear={onClearSelection} paperId={paperId} />
        )}
        {activeTab === "qa" && <QATab paperContext={paperContext} paperTitleAbstract={paperTitleAbstract} onSave={onSaveNote} />}
        {activeTab === "outline" && <OutlineTab notes={notes} onSave={onSaveNote} />}
      </div>
    </aside>
  );
}

// ===== Notes Tab =====
function NotesTab({ notes, onDelete }: { notes: Note[]; onDelete: (id: string) => void }) {
  if (notes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <StickyNote className="h-10 w-10 text-[var(--muted-foreground)]/30 mb-3" />
        <p className="text-sm text-[var(--muted-foreground)] mb-1">No notes yet</p>
        <p className="text-xs text-[var(--muted-foreground)]/60">Select text in the PDF and use the toolbar below to create notes</p>
      </div>
    );
  }

  return (
    <div className="p-3 space-y-2">
      {notes.map((note) => {
        const badge = typeBadge[note.type] || typeBadge.COMMENT;
        return (
          <div key={note.id} className="p-3 rounded-lg border border-[var(--border)] hover:border-[var(--primary)]/20 transition-colors group">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <Badge className={clsx("text-[10px] border-0 px-1.5 py-0", badge.color)}>{badge.label}</Badge>
                <span className="text-[10px] text-[var(--muted-foreground)]/60">
                  {format(new Date(note.createdAt), "MM/dd HH:mm")}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Avatar name={note.user?.name || "?"} size="sm" />
                <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => onDelete(note.id)}>
                  <Trash2 className="h-3 w-3 text-[var(--destructive)]" />
                </Button>
              </div>
            </div>
            {note.targetText && (
              <p className="text-xs text-[var(--muted-foreground)] italic line-clamp-2 mb-1.5 p-1.5 bg-[var(--muted)] rounded">
                &ldquo;{note.targetText}&rdquo;
              </p>
            )}
            {note.content && (
              <p className="text-sm text-[var(--foreground)] whitespace-pre-wrap leading-relaxed">{note.content}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ===== Translate Tab =====
function TranslateTab({ selectedText, onSave, onClear }: { selectedText: string | null; onSave: (content: string, original: string, type: string) => void; onClear: () => void }) {
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!selectedText) return;
    setLoading(true); setError(""); setResult("");
    const lang = /[一-鿿]/.test(selectedText) ? "English" : "Chinese";
    fetch("/api/ai/translate/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: selectedText, targetLang: lang }),
    }).then(async (res) => {
      if (!res.ok) throw new Error("Translation failed");
      const reader = res.body?.getReader();
      const decoder = new TextDecoder(); let r = "";
      while (true) {
        const { done, value } = await reader!.read();
        if (done) break;
        for (const line of decoder.decode(value, { stream: true }).split("\n")) {
          if (line.startsWith("data: ")) {
            const d = line.slice(6);
            if (d) { try { r += JSON.parse(d); } catch { r += d; } setResult(r); }
          }
        }
      }
    }).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, [selectedText]);

  if (!selectedText) {
    return <EmptyState icon={<Languages className="h-10 w-10" />} text="Select text to translate" />;
  }

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]/60">Translation</h4>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClear}><X className="h-3 w-3" /></Button>
      </div>
      <p className="text-sm p-3 bg-[var(--muted)] rounded-lg leading-relaxed text-[var(--foreground)]">{selectedText}</p>
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]"><Loader2 className="h-4 w-4 animate-spin" /> Translating...</div>
      ) : error ? (
        <p className="text-sm text-[var(--destructive)]">{error}</p>
      ) : result ? (
        <>
          <p className="text-sm p-3 bg-[var(--secondary)] rounded-lg leading-relaxed text-[var(--foreground)]">{result}</p>
          <Button variant="outline" size="sm" className="w-full" onClick={() => { onSave(result, selectedText, "TRANSLATION"); onClear(); }}>
            <Save className="h-4 w-4 mr-2" /> Save
          </Button>
        </>
      ) : null}
    </div>
  );
}

// ===== Analyze Tab =====
function AnalyzeTab({ selectedText, paperContext, onSave, onClear, paperId }: { selectedText: string | null; paperContext?: string; onSave: (content: string, original: string, type: string) => void; onClear: () => void; paperId: string }) {
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [flashcardOutput, setFlashcardOutput] = useState("");
  const [generatingCards, setGeneratingCards] = useState(false);

  useEffect(() => {
    if (!selectedText) return;
    setLoading(true); setError(""); setResult(""); setFlashcardOutput("");
    const lang = /[一-鿿]/.test(selectedText) ? "Chinese" : "English";
    fetch("/api/ai/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: selectedText, language: lang, paper_context: paperContext }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("Analysis failed");
        const json = await res.json();
        setResult(json.data?.analysis || json.analysis || "");
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [selectedText]);

  const handleGenerateFlashcards = async () => {
    if (!result) return;
    setGeneratingCards(true);
    setFlashcardOutput("");
    try {
      const res = await fetch("/api/ai/flashcards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysis: result }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Generation failed");
      const cards = json.data?.flashcards || json.flashcards || "";
      setFlashcardOutput(cards);
    } catch (e) {
      setFlashcardOutput("Failed to generate flashcards.");
    } finally {
      setGeneratingCards(false);
    }
  };

  const handleSaveFlashcards = async () => {
    if (!flashcardOutput) return;
    try {
      const res = await fetch(`/api/papers/${paperId}/flashcards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: flashcardOutput }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Save failed");
      toast.success(`${json.data?.flashcards?.length || "?"} flashcards saved`);
      setFlashcardOutput("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save flashcards");
    }
  };

  if (!selectedText) {
    return <EmptyState icon={<Brain className="h-10 w-10" />} text="Select text to analyze" />;
  }

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]/60">AI Analysis</h4>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClear}><X className="h-3 w-3" /></Button>
      </div>
      <p className="text-sm p-3 bg-[var(--muted)] rounded-lg leading-relaxed text-[var(--foreground)]">{selectedText}</p>
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]"><Loader2 className="h-4 w-4 animate-spin" /> Analyzing...</div>
      ) : error ? (
        <p className="text-sm text-[var(--destructive)]">{error}</p>
      ) : result ? (
        <>
          <LatexRenderer className="text-sm leading-relaxed" text={result} />
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1" onClick={() => { onSave(result, selectedText, "ANALYSIS"); onClear(); }}>
              <Save className="h-4 w-4 mr-2" /> Save
            </Button>
            <Button variant="outline" size="sm" className="flex-1" onClick={handleGenerateFlashcards} disabled={generatingCards}>
              {generatingCards ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Zap className="h-4 w-4 mr-2" />}
              Flashcards
            </Button>
          </div>

          {/* Flashcard output */}
          {flashcardOutput && (
            <div className="border border-[var(--border)] rounded-lg p-3 bg-[var(--card)] space-y-2">
              <h5 className="text-xs font-semibold text-[var(--foreground)]">Generated Flashcards</h5>
              <LatexRenderer className="text-xs leading-relaxed" text={flashcardOutput} />
              <Button variant="default" size="sm" className="w-full" onClick={handleSaveFlashcards}>
                <Save className="h-4 w-4 mr-2" /> Save Flashcards
              </Button>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}

// ===== Q&A Tab =====
function QATab({ paperContext, paperTitleAbstract, onSave }: { paperContext: string; paperTitleAbstract: string; onSave: (content: string, original: string, type: string) => void }) {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [current, setCurrent] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, current]);

  const send = async () => {
    if (!input.trim() || streaming) return;
    const q = input.trim();

    setInput(""); setMessages((p) => [...p, { role: "user", content: q }]);
    setStreaming(true); setCurrent("");

    try {
      const res = await fetch("/api/ai/qa/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: q,
          context: paperContext,
          title_abstract: paperTitleAbstract,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      const reader = res.body?.getReader();
      const dec = new TextDecoder(); let a = "";
      while (true) {
        const { done, value } = await reader!.read();
        if (done) break;
        for (const line of dec.decode(value, { stream: true }).split("\n")) {
          if (line.startsWith("data: ")) {
            const d = line.slice(6);
            if (d) { try { a += JSON.parse(d); } catch { a += d; } setCurrent(a.replace(/([一-鿿])\s+([一-鿿])/g, "$1$2")); }
          }
        }
      }
      setMessages((p) => [...p, { role: "assistant", content: a }]);
    } catch {
      setMessages((p) => [...p, { role: "assistant", content: "Sorry, an error occurred." }]);
    } finally { setStreaming(false); setCurrent(""); }
  };

  return (
    <div className="flex flex-col h-full">
      <div ref={bottomRef} className="flex-1 overflow-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-10">
            <MessageCircle className="h-10 w-10 mx-auto text-[var(--muted-foreground)]/30 mb-3" />
            <p className="text-sm text-[var(--muted-foreground)]">Ask questions about this paper</p>
            <p className="text-xs text-[var(--muted-foreground)]/60 mt-1">AI detects your language and responds accordingly</p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-2 ${m.role === "user" ? "justify-end" : ""}`}>
            {m.role === "assistant" && (
              <div className="shrink-0 w-6 h-6 rounded-full bg-[var(--primary)]/10 flex items-center justify-center mt-0.5">
                <Bot className="h-3 w-3 text-[var(--primary)]" />
              </div>
            )}
            <div className={`rounded-lg p-2.5 text-xs max-w-[85%] ${
              m.role === "user" ? "bg-[var(--primary)] text-[var(--primary-foreground)]" : "bg-[var(--secondary)]"
            }`}>
              <LatexRenderer className="text-xs leading-relaxed" text={m.content} />
              {m.role === "assistant" && messages[i - 1]?.role === "user" && (
                <button className="text-[10px] text-[var(--muted-foreground)]/60 hover:text-[var(--muted-foreground)] mt-1.5" onClick={() => onSave(m.content, messages[i - 1].content, "COMMENT")}>
                  <Save className="h-3 w-3 inline mr-1" />Save
                </button>
              )}
            </div>
            {m.role === "user" && (
              <div className="shrink-0 w-6 h-6 rounded-full bg-[var(--border)] flex items-center justify-center mt-0.5">
                <User className="h-3 w-3 text-[var(--muted-foreground)]" />
              </div>
            )}
          </div>
        ))}
        {streaming && current && (
          <div className="flex gap-2">
            <div className="shrink-0 w-6 h-6 rounded-full bg-[var(--primary)]/10 flex items-center justify-center"><Bot className="h-3 w-3 text-[var(--primary)]" /></div>
            <div className="rounded-lg p-2.5 text-xs max-w-[85%] bg-[var(--secondary)]"><PlainText className="text-xs leading-relaxed" text={current} /></div>
          </div>
        )}
      </div>
      <div className="p-3 border-t border-[var(--border)] shrink-0 space-y-2">
        {messages.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-[10px] text-[var(--muted-foreground)]"
            onClick={() => {
              const conversation = messages
                .map((m) => `**${m.role === "user" ? "Q" : "A"}:** ${m.content}`)
                .join("\n\n");
              onSave(conversation, messages[0]?.content || "Conversation", "COMMENT");
              toast.success("Conversation saved");
            }}
          >
            <Save className="h-3 w-3 mr-1" /> Save Conversation
          </Button>
        )}
        <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex gap-2">
          <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask about this paper..." disabled={streaming} className="h-8 text-xs" />
          <Button type="submit" size="icon" className="h-8 w-8" disabled={streaming || !input.trim()}>
            <Send className="h-3.5 w-3.5" />
          </Button>
        </form>
      </div>
    </div>
  );
}

// ===== Outline Tab =====
function OutlineTab({ notes, onSave }: { notes: Note[]; onSave: (content: string, original: string, type: string) => void }) {
  const [items, setItems] = useState<{ text: string; level: number }[]>([]);
  const [newItem, setNewItem] = useState("");

  useEffect(() => {
    const highlights = notes.filter((n) => n.type === "HIGHLIGHT" || n.type === "ANALYSIS");
    const outlineItems = highlights.map((n) => ({
      text: n.targetText || n.content,
      level: n.type === "ANALYSIS" ? 1 : 0,
    }));
    setItems(outlineItems);
  }, [notes]);

  const addItem = () => {
    if (!newItem.trim()) return;
    setItems([...items, { text: newItem.trim(), level: 0 }]);
    setNewItem("");
  };

  const indentItem = (index: number) => {
    const updated = [...items];
    updated[index] = { ...updated[index], level: Math.min(2, updated[index].level + 1) };
    setItems(updated);
  };

  if (items.length === 0) {
    return (
      <div className="p-4">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <ListTree className="h-10 w-10 text-[var(--muted-foreground)]/30 mb-3" />
          <p className="text-sm text-[var(--muted-foreground)] mb-1">Build your outline</p>
          <p className="text-xs text-[var(--muted-foreground)]/60 mb-4">
            Select and highlight key points from the paper, or add them manually here
          </p>
        </div>
        <div className="flex gap-2">
          <Input value={newItem} onChange={(e) => setNewItem(e.target.value)} placeholder="Add a key point..." className="h-8 text-xs" onKeyDown={(e) => e.key === "Enter" && addItem()} />
          <Button size="icon" className="h-8 w-8" onClick={addItem}><Plus className="h-3.5 w-3.5" /></Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]/60">Research Outline</h4>
        <Button variant="ghost" size="sm" className="text-[10px] text-[var(--primary)]" onClick={() => onSave(items.map((i) => `${"  ".repeat(i.level)}- ${i.text}`).join("\n"), "Outline", "COMMENT")}>
          <Save className="h-3 w-3 mr-1" /> Save
        </Button>
      </div>

      <div className="space-y-1">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2 group">
            <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100 shrink-0" onClick={() => indentItem(i)}>
              <Plus className="h-3 w-3 text-[var(--muted-foreground)]" />
            </Button>
            <p className={clsx(
              "text-sm leading-relaxed flex-1",
              item.level === 0 && "font-medium text-[var(--foreground)]",
              item.level === 1 && "ml-4 text-[var(--muted-foreground)]",
              item.level === 2 && "ml-8 text-[var(--muted-foreground)]/70 text-xs"
            )}>
              {item.level === 0 ? "●" : item.level === 1 ? "○" : "–"} {item.text}
            </p>
          </div>
        ))}
      </div>

      <div className="flex gap-2 pt-3 border-t border-[var(--border)]">
        <Input value={newItem} onChange={(e) => setNewItem(e.target.value)} placeholder="Add point..." className="h-8 text-xs" onKeyDown={(e) => e.key === "Enter" && addItem()} />
        <Button size="icon" className="h-8 w-8" onClick={addItem}><Plus className="h-3.5 w-3.5" /></Button>
      </div>
    </div>
  );
}

// ===== Empty state =====
function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-4">
      <div className="text-[var(--muted-foreground)]/30 mb-3">{icon}</div>
      <p className="text-sm text-[var(--muted-foreground)]">{text}</p>
    </div>
  );
}
