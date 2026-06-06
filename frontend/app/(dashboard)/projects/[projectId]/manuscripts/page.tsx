"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Manuscript } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Plus,
  PenLine,
  Loader2,
  FileText,
  ChevronRight,
  Clock,
} from "lucide-react";
import { toast } from "sonner";

export default function ManuscriptsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const router = useRouter();
  const [manuscripts, setManuscripts] = useState<Manuscript[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [abstract, setAbstract] = useState("");
  const [creating, setCreating] = useState(false);

  const fetchManuscripts = () => {
    fetch(`/api/projects/${projectId}/manuscripts`)
      .then((r) => r.json())
      .then((json) => {
        if (json.data) setManuscripts(json.data);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchManuscripts();
  }, [projectId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setCreating(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/manuscripts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), abstract: abstract.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed");
      setCreateOpen(false);
      setTitle("");
      setAbstract("");
      toast.success("Manuscript created");
      router.push(
        `/projects/${projectId}/manuscripts/${json.data.id}`
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create manuscript"
      );
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--foreground)] tracking-tight">
            Writing Workspace
          </h1>
          <p className="text-[var(--muted-foreground)] mt-1 text-sm">
            Collaborative academic manuscripts
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Manuscript
        </Button>
      </div>

      {manuscripts.length === 0 ? (
        <div className="text-center py-20 bg-[var(--card)] rounded-xl border border-[var(--border)] shadow-sm">
          <div className="h-16 w-16 rounded-2xl bg-[var(--primary)]/10 flex items-center justify-center mx-auto mb-5">
            <PenLine className="h-8 w-8 text-[var(--primary)]" />
          </div>
          <h3 className="text-lg font-semibold text-[var(--foreground)] mb-1">
            No manuscripts yet
          </h3>
          <p className="text-[var(--muted-foreground)] mb-8 max-w-sm mx-auto text-sm leading-relaxed">
            Start writing your research paper with AI assistance and team
            collaboration
          </p>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create your first manuscript
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {manuscripts.map((m) => (
            <Card
              key={m.id}
              className="border-[var(--border)] hover:border-[var(--primary)]/30 cursor-pointer transition-all"
              onClick={() =>
                router.push(`/projects/${projectId}/manuscripts/${m.id}`)
              }
            >
              <CardContent className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center shrink-0">
                    <FileText className="h-5 w-5 text-[var(--primary)]" />
                  </div>
                  <div>
                    <h3 className="font-medium text-[var(--foreground)]">
                      {m.title}
                    </h3>
                    <div className="flex items-center gap-3 mt-1 text-xs text-[var(--muted-foreground)]">
                      <span className="flex items-center gap-1">
                        <PenLine className="h-3 w-3" />
                        {m._count?.sections || 0} sections
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(m.updatedAt).toLocaleDateString()}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                          m.status === "completed"
                            ? "bg-green-100 text-green-700"
                            : m.status === "reviewing"
                            ? "bg-yellow-100 text-yellow-700"
                            : m.status === "writing"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {m.status}
                      </span>
                    </div>
                    {m.abstract && (
                      <p className="text-xs text-[var(--muted-foreground)] mt-1.5 line-clamp-1 max-w-md">
                        {m.abstract}
                      </p>
                    )}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-[var(--muted-foreground)] shrink-0" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="New Manuscript"
        description="Create a new academic manuscript to start writing."
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-[var(--foreground)] mb-1.5 block">
              Title
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Transformer-based Macroeconomic Forecasting"
              required
              className="h-11"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-[var(--foreground)] mb-1.5 block">
              Abstract (optional)
            </label>
            <textarea
              value={abstract}
              onChange={(e) => setAbstract(e.target.value)}
              placeholder="Brief description of what this paper is about..."
              rows={3}
              className="flex w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] resize-none"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCreateOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={creating || !title.trim()}>
              {creating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Create
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
