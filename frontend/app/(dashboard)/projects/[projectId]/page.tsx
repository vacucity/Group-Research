"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Project } from "@/types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import {
  Library,
  Users,
  FileText,
  Plus,
  Loader2,
  ArrowRight,
  Upload,
} from "lucide-react";
import Link from "next/link";

export default function ProjectDashboardPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/projects/${projectId}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.data) setProject(json.data);
      })
      .finally(() => setLoading(false));
  }, [projectId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
      </div>
    );
  }

  if (!project) return null;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--foreground)] tracking-tight">
            {project.name}
          </h1>
          <p className="text-[var(--muted-foreground)] mt-1 text-sm">
            {project.description || "No description"}
          </p>
        </div>
        <Link href={`/projects/${projectId}/papers`}>
          <Button>
            <Upload className="h-4 w-4" />
            Upload Paper
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { icon: Library, label: "Papers", value: project._count?.papers || 0 },
          { icon: Users, label: "Members", value: project._count?.members || 0 },
          { icon: FileText, label: "Notes", value: "—" },
          { icon: ArrowRight, label: "Active", value: "—" },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center">
                  <stat.icon className="h-5 w-5 text-[var(--primary)]" />
                </div>
                <div>
                  <p className="text-2xl font-semibold text-[var(--foreground)]">
                    {stat.value}
                  </p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {stat.label}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Papers */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-lg">Recent Papers</CardTitle>
              <Link
                href={`/projects/${projectId}/papers`}
                className="text-sm text-[var(--primary)] hover:underline flex items-center gap-1"
              >
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </CardHeader>
            <CardContent>
              {project.papers && project.papers.length > 0 ? (
                <div className="space-y-2">
                  {project.papers.map((paper) => (
                    <Link
                      key={paper.id}
                      href={`/projects/${projectId}/papers/${paper.id}`}
                      className="block p-3 rounded-lg border border-[var(--border)] hover:bg-[var(--secondary)] transition-colors"
                    >
                      <p className="font-medium text-sm text-[var(--foreground)] truncate">
                        {paper.title}
                      </p>
                      <p className="text-xs text-[var(--muted-foreground)] mt-1">
                        {paper.authors || "Unknown authors"} ·{" "}
                        {paper.pageCount || "?"} pages
                      </p>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10">
                  <div className="h-12 w-12 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center mx-auto mb-3">
                    <Library className="h-6 w-6 text-[var(--primary)]" />
                  </div>
                  <p className="text-sm text-[var(--muted-foreground)] mb-1">
                    No papers uploaded yet
                  </p>
                  <p className="text-xs text-[var(--muted-foreground)] mb-4">
                    Upload your first PDF to get started
                  </p>
                  <Link href={`/projects/${projectId}/papers`}>
                    <Button variant="outline" size="sm">
                      <Upload className="h-3.5 w-3.5 mr-1.5" />
                      Upload Paper
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Members */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Collaborators</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {project.members?.map((m) => (
                <div key={m.id} className="flex items-center gap-3">
                  <Avatar
                    name={m.user?.name || "?"}
                    imageUrl={m.user?.avatarUrl}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--foreground)] truncate">
                      {m.user?.name}
                    </p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {m.role}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <Link
              href={`/projects/${projectId}/settings`}
              className="block mt-4 pt-3 border-t border-[var(--border)]"
            >
              <Button variant="outline" size="sm" className="w-full">
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Invite Collaborator
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
