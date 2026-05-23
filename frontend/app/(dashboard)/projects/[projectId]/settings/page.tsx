"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ProjectMember } from "@/types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import {
  Plus,
  Loader2,
  UserX,
  Shield,
  ShieldCheck,
  Users,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";

export default function ProjectSettingsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"EDITOR" | "VIEWER">("EDITOR");
  const [inviting, setInviting] = useState(false);

  const fetchMembers = () => {
    fetch(`/api/projects/${projectId}/members`)
      .then((r) => r.json())
      .then((json) => {
        if (json.data) setMembers(json.data);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchMembers();
  }, [projectId]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed");
      setMembers([...members, json.data]);
      setInviteOpen(false);
      setInviteEmail("");
      toast.success("Member invited successfully");
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to invite. Make sure the user has registered."
      );
    } finally {
      setInviting(false);
    }
  };

  const handleRemove = async (userId: string) => {
    try {
      await fetch(`/api/projects/${projectId}/members/${userId}`, {
        method: "DELETE",
      });
      setMembers(members.filter((m) => m.userId !== userId));
      toast.success("Member removed");
    } catch {
      toast.error("Failed to remove member");
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await fetch(`/api/projects/${projectId}/members/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      setMembers(
        members.map((m) =>
          m.userId === userId
            ? { ...m, role: newRole as ProjectMember["role"] }
            : m
        )
      );
      toast.success("Role updated");
    } catch {
      toast.error("Failed to update role");
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
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--foreground)] tracking-tight">
            Settings
          </h1>
          <p className="text-[var(--muted-foreground)] mt-1 text-sm">
            Manage project members
          </p>
        </div>
        <Button onClick={() => setInviteOpen(true)}>
          <UserPlus className="h-4 w-4" />
          Invite Collaborator
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-[var(--muted-foreground)]" />
            Collaborators ({members.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {members.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between p-3 rounded-lg border border-[var(--border)] hover:bg-[var(--secondary)] transition-colors"
            >
              <div className="flex items-center gap-3">
                <Avatar
                  name={m.user?.name || "?"}
                  imageUrl={m.user?.avatarUrl}
                  size="md"
                />
                <div>
                  <p className="text-sm font-medium text-[var(--foreground)]">
                    {m.user?.name}
                  </p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {m.user?.email}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {m.role === "OWNER" ? (
                  <Badge variant="default">
                    <ShieldCheck className="h-3 w-3 mr-1" />
                    Owner
                  </Badge>
                ) : (
                  <select
                    value={m.role}
                    onChange={(e) => handleRoleChange(m.userId, e.target.value)}
                    className="h-8 rounded-lg border border-[var(--border)] bg-[var(--card)] px-2 text-xs font-medium text-[var(--foreground)] cursor-pointer"
                  >
                    <option value="EDITOR">Editor</option>
                    <option value="VIEWER">Viewer</option>
                  </select>
                )}
                {m.role !== "OWNER" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemove(m.userId)}
                    className="text-[var(--destructive)] hover:bg-[var(--destructive)]/10"
                  >
                    <UserX className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}

          {members.length <= 1 && (
            <div className="text-center py-8">
              <div className="h-10 w-10 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center mx-auto mb-3">
                <Users className="h-5 w-5 text-[var(--primary)]" />
              </div>
              <p className="text-sm text-[var(--muted-foreground)] mb-1">
                No collaborators yet
              </p>
              <p className="text-xs text-[var(--muted-foreground)] mb-4">
                Invite team members to share papers and notes
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setInviteOpen(true)}
              >
                <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                Invite your first collaborator
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invite Dialog */}
      <Dialog
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        title="Invite Collaborator"
        description="Enter the email of a registered user to add them to this project."
      >
        <form onSubmit={handleInvite} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-[var(--foreground)] mb-1.5 block">
              Email address
            </label>
            <Input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="colleague@university.edu"
              required
              className="h-11"
            />
            <p className="text-xs text-[var(--muted-foreground)] mt-1.5">
              The person must already have a ResearchFlow account.
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-[var(--foreground)] mb-1.5 block">
              Role
            </label>
            <select
              value={inviteRole}
              onChange={(e) =>
                setInviteRole(e.target.value as "EDITOR" | "VIEWER")
              }
              className="flex h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 text-sm text-[var(--foreground)]"
            >
              <option value="EDITOR">Editor — Can upload papers and add notes</option>
              <option value="VIEWER">Viewer — Read-only access</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setInviteOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={inviting}>
              {inviting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Send Invitation
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
