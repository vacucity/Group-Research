"use client";

import { useState } from "react";
import Link from "next/link";
import { Project } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Avatar } from "@/components/ui/avatar";
import { Library, Users, ArrowRight, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function ProjectCard({
  project,
  currentUserId,
  onDeleted,
}: {
  project: Project;
  currentUserId: string | null;
  onDeleted: (id: string) => void;
}) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isOwner = currentUserId
    ? project.members?.some(
        (m) => m.userId === currentUserId && m.role === "OWNER"
      )
    : false;

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed");
      toast.success("Project deleted");
      onDeleted(project.id);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete project"
      );
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  };

  return (
    <>
      <div className="relative group">
        <Link href={`/projects/${project.id}`} className="block">
          <Card className="h-full border-[var(--border)] bg-[var(--card)] hover:border-[var(--primary)]/30 hover:shadow-lg transition-all duration-200 cursor-pointer overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-[var(--primary)] to-[var(--primary)]/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-semibold text-[var(--foreground)] truncate pr-4 group-hover:text-[var(--primary)] transition-colors">
                  {project.name}
                </h3>
                <ArrowRight className="h-4 w-4 shrink-0 text-[var(--muted-foreground)] opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" />
              </div>

              <p className="text-sm text-[var(--muted-foreground)] line-clamp-2 mb-5 leading-relaxed">
                {project.description || "No description"}
              </p>

              <div className="flex items-center justify-between pt-4 border-t border-[var(--border)]">
                <div className="flex items-center gap-4 text-xs text-[var(--muted-foreground)]">
                  <span className="flex items-center gap-1.5">
                    <Library className="h-3.5 w-3.5" />
                    {project._count?.papers || 0}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" />
                    {project._count?.members || 0}
                  </span>
                </div>
                <div className="flex -space-x-1.5">
                  {project.members?.slice(0, 3).map((m) => (
                    <Avatar
                      key={m.id}
                      name={m.user?.name || "?"}
                      imageUrl={m.user?.avatarUrl}
                      size="sm"
                    />
                  ))}
                  {(project.members?.length || 0) > 3 && (
                    <div className="h-7 w-7 rounded-full bg-[var(--secondary)] flex items-center justify-center text-[10px] font-medium text-[var(--muted-foreground)] ring-2 ring-[var(--card)]">
                      +{project.members!.length - 3}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Delete button — only visible to owner on hover */}
        {isOwner && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setDeleteOpen(true);
            }}
            className="absolute top-3 right-3 p-1.5 rounded-lg bg-[var(--card)] border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--destructive)] hover:border-[var(--destructive)]/30 hover:bg-[var(--destructive)]/5 opacity-0 group-hover:opacity-100 transition-all duration-200 z-10"
            title="Delete project"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      <Dialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete project"
        description={`Permanently delete "${project.name}" and all its data. This cannot be undone.`}
      >
        <div className="space-y-4">
          <div className="rounded-lg border border-[var(--destructive)]/30 bg-[var(--destructive)]/5 p-3">
            <p className="text-sm text-[var(--foreground)]">
              All papers, notes, ideas, and member data in this project will be
              lost forever.
            </p>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Yes, delete forever
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
