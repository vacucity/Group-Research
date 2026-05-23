"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LatexRenderer } from "@/components/shared/LatexRenderer";
import { X, Send, Loader2, User, Bot, Save } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Props {
  paperContext: string;
  onClose: () => void;
  onSave?: (question: string, answer: string) => void;
}

export function QAPanel({ paperContext, onClose, onSave }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [currentStream, setCurrentStream] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages, currentStream]);

  const handleSend = async () => {
    if (!input.trim() || streaming) return;
    const question = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setStreaming(true);
    setCurrentStream("");

    try {
      const res = await fetch("/api/ai/qa/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, context: paperContext }),
      });
      if (!res.ok) throw new Error("Q&A failed");
      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response stream");
      const decoder = new TextDecoder();
      let answer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split("\n")) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data) {
              try { answer += JSON.parse(data); }
              catch { answer += data; }
              setCurrentStream(answer);
            }
          }
        }
      }
      setMessages((prev) => [...prev, { role: "assistant", content: answer }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Sorry, an error occurred." }]);
    } finally {
      setStreaming(false);
      setCurrentStream("");
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b border-[#e2e8f0] dark:border-[#2d3f57] shrink-0">
        <h3 className="font-semibold text-sm text-[#1a2332] dark:text-[#e2e8f0]">Q&A</h3>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div ref={containerRef} className="flex-1 overflow-auto p-4 space-y-4">
        {messages.length === 0 && (
          <p className="text-center text-sm text-[#a0b0c0] py-8">Ask questions about this paper</p>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : ""}`}>
            {msg.role === "assistant" && (
              <div className="shrink-0 w-7 h-7 rounded-full bg-[#2c3e6b]/10 dark:bg-[#5b7db5]/20 flex items-center justify-center mt-0.5">
                <Bot className="h-3.5 w-3.5 text-[#2c3e6b] dark:text-[#5b7db5]" />
              </div>
            )}
            <div
              className={`rounded-lg p-3 text-sm max-w-[85%] ${
                msg.role === "user"
                  ? "bg-[#2c3e6b] text-white"
                  : "bg-[#f8f9fb] dark:bg-[#0f1729] text-[#1a2332] dark:text-[#e2e8f0]"
              }`}
            >
              {msg.role === "assistant" ? (
                <LatexRenderer className="text-sm leading-relaxed" text={msg.content} />
              ) : (
                <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
              )}
              {msg.role === "assistant" && messages[i - 1]?.role === "user" && (
                <button
                  className="text-[10px] text-[#a0b0c0] hover:text-[#6b7d95] mt-1.5"
                  onClick={() => onSave?.(messages[i - 1].content, msg.content)}
                >
                  <Save className="h-3 w-3 inline mr-1" /> Save
                </button>
              )}
            </div>
            {msg.role === "user" && (
              <div className="shrink-0 w-7 h-7 rounded-full bg-[#e2e8f0] dark:bg-[#2d3f57] flex items-center justify-center mt-0.5">
                <User className="h-3.5 w-3.5 text-[#6b7d95]" />
              </div>
            )}
          </div>
        ))}
        {streaming && currentStream && (
          <div className="flex gap-2.5">
            <div className="shrink-0 w-7 h-7 rounded-full bg-[#2c3e6b]/10 dark:bg-[#5b7db5]/20 flex items-center justify-center">
              <Bot className="h-3.5 w-3.5 text-[#2c3e6b] dark:text-[#5b7db5]" />
            </div>
            <div className="rounded-lg p-3 text-sm max-w-[85%] bg-[#f8f9fb] dark:bg-[#0f1729] text-[#1a2332] dark:text-[#e2e8f0]">
              <p className="whitespace-pre-wrap leading-relaxed">{currentStream}</p>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-[#e2e8f0] dark:border-[#2d3f57] shrink-0">
        <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about this paper..."
            disabled={streaming}
            className="h-9 text-sm"
          />
          <Button type="submit" size="icon" className="h-9 w-9 bg-[#2c3e6b] hover:bg-[#1a2332]" disabled={streaming || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
