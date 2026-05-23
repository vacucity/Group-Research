"use client";

import { useEffect, useState } from "react";
import { Project } from "@/types";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { CreateProjectDialog } from "@/components/projects/CreateProjectDialog";
import { Microscope, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProjects = () => {
    setLoading(true);
    fetch("/api/projects")
      .then((r) => r.json())
      .then((json) => {
        if (json.data) setProjects(json.data);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--foreground)] tracking-tight">
            My Projects
          </h1>
          <p className="text-[var(--muted-foreground)] mt-1 text-sm">
            Your research workspaces
          </p>
        </div>
        <CreateProjectDialog onCreated={fetchProjects} />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-20 bg-[var(--card)] rounded-xl border border-[var(--border)] shadow-sm">
          <div className="h-16 w-16 rounded-2xl bg-[var(--primary)]/10 flex items-center justify-center mx-auto mb-5">
            <Microscope className="h-8 w-8 text-[var(--primary)]" />
          </div>
          <h3 className="text-lg font-semibold text-[var(--foreground)] mb-1">
            No projects yet
          </h3>
          <p className="text-[var(--muted-foreground)] mb-8 max-w-sm mx-auto text-sm leading-relaxed">
            Create your first research project to start uploading papers and
            collaborating with your team
          </p>
          <CreateProjectDialog onCreated={fetchProjects} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {projects.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
      )}
    </div>
  );
}
