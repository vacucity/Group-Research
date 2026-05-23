import Link from "next/link";
import { Project } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Library, Users, ArrowRight } from "lucide-react";

export function ProjectCard({ project }: { project: Project }) {
  return (
    <Link href={`/projects/${project.id}`} className="block group">
      <Card className="h-full border-[var(--border)] bg-[var(--card)] hover:border-[var(--primary)]/30 hover:shadow-lg transition-all duration-200 cursor-pointer overflow-hidden">
        {/* Accent bar on top */}
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
  );
}
