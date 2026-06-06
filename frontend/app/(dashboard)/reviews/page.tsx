"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ReviewWorkspace, ReviewType } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Plus,
  BookOpen,
  Loader2,
  ChevronRight,
  Clock,
  Layers,
  Lightbulb,
} from "lucide-react";
import { toast } from "sonner";

const REVIEW_TYPES: { value: ReviewType; label: string; desc: string }[] = [
  { value: "survey", label: "Survey Paper", desc: "Complete literature review" },
  { value: "related_work", label: "Related Work", desc: "For a regular paper" },
  { value: "systematic", label: "Systematic Review", desc: "PRISMA-style" },
  { value: "comparative", label: "Comparative Analysis", desc: "Side-by-side comparison" },
];

export default function ReviewsPage() {
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState<ReviewWorkspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [researchField, setResearchField] = useState("");
  const [reviewType, setReviewType] = useState<ReviewType>("survey");
  const [targetVenue, setTargetVenue] = useState("");
  const [creating, setCreating] = useState(false);

  const fetchWorkspaces = () => {
    fetch("/api/reviews")
      .then((r) => r.json())
      .then((json) => {
        if (json.data) setWorkspaces(json.data);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          researchField: researchField.trim(),
          reviewType,
          targetVenue: targetVenue.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed");
      setCreateOpen(false);
      setName("");
      setResearchField("");
      setTargetVenue("");
      toast.success("Workspace created");
      router.push(`/reviews/${json.data.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create workspace");
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
            Literature Reviews
          </h1>
          <p className="text-[var(--muted-foreground)] mt-1 text-sm">
            AI-assisted literature review workspaces
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Workspace
        </Button>
      </div>

      {workspaces.length === 0 ? (
        <div className="text-center py-20 bg-[var(--card)] rounded-xl border border-[var(--border)] shadow-sm">
          <div className="h-16 w-16 rounded-2xl bg-[var(--primary)]/10 flex items-center justify-center mx-auto mb-5">
            <BookOpen className="h-8 w-8 text-[var(--primary)]" />
          </div>
          <h3 className="text-lg font-semibold text-[var(--foreground)] mb-1">
            No review workspaces yet
          </h3>
          <p className="text-[var(--muted-foreground)] mb-8 max-w-sm mx-auto text-sm">
            Create a workspace to organize literature and write AI-powered
            reviews
          </p>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create your first workspace
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {workspaces.map((ws) => (
            <Card
              key={ws.id}
              className="border-[var(--border)] hover:border-[var(--primary)]/30 cursor-pointer transition-all"
              onClick={() => router.push(`/reviews/${ws.id}`)}
            >
              <CardContent className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center shrink-0">
                    <BookOpen className="h-5 w-5 text-[var(--primary)]" />
                  </div>
                  <div>
                    <h3 className="font-medium text-[var(--foreground)]">{ws.name}</h3>
                    <div className="flex items-center gap-3 mt-1 text-xs text-[var(--muted-foreground)]">
                      {ws.researchField && (
                        <span className="flex items-center gap-1">
                          <Layers className="h-3 w-3" />
                          {ws.researchField}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <BookOpen className="h-3 w-3" />
                        {ws._count?.papers || 0} papers
                      </span>
                      <span className="flex items-center gap-1">
                        <Lightbulb className="h-3 w-3" />
                        {ws._count?.clusters || 0} clusters
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(ws.updatedAt).toLocaleDateString()}
                      </span>
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-[var(--secondary)] text-[var(--muted-foreground)]">
                        {ws.reviewType}
                      </span>
                    </div>
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
        title="New Review Workspace"
        description="Create a workspace for your literature review."
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-[var(--foreground)] mb-1.5 block">
              Workspace Name *
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Transformer-based Time Series Forecasting"
              required
              className="h-11"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-[var(--foreground)] mb-1.5 block">
              Research Field
            </label>
            <Input
              value={researchField}
              onChange={(e) => setResearchField(e.target.value)}
              placeholder="e.g. Machine Learning, NLP"
              className="h-11"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-[var(--foreground)] mb-1.5 block">
              Review Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              {REVIEW_TYPES.map((rt) => (
                <button
                  key={rt.value}
                  type="button"
                  onClick={() => setReviewType(rt.value)}
                  className={`p-3 rounded-lg border text-left transition-colors ${
                    reviewType === rt.value
                      ? "border-[var(--primary)] bg-[var(--primary)]/5"
                      : "border-[var(--border)] hover:border-[var(--primary)]/30"
                  }`}
                >
                  <p className="text-sm font-medium text-[var(--foreground)]">{rt.label}</p>
                  <p className="text-[10px] text-[var(--muted-foreground)] mt-0.5">{rt.desc}</p>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-[var(--foreground)] mb-1.5 block">
              Target Venue (optional)
            </label>
            <Input
              value={targetVenue}
              onChange={(e) => setTargetVenue(e.target.value)}
              placeholder="e.g. NeurIPS, ACL, IJCAI"
              className="h-11"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={creating || !name.trim()}>
              {creating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Create
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
