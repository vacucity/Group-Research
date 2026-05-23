"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Avatar } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import {
  Microscope,
  LayoutDashboard,
  Library,
  Settings,
  LogOut,
  ChevronLeft,
  Lightbulb,
} from "lucide-react";
import { clsx } from "clsx";

interface Props {
  open: boolean;
  onToggle: () => void;
}

export function AppSidebar({ open, onToggle }: Props) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const projectId = pathname.match(/\/projects\/([^/]+)/)?.[1];

  const navItems = projectId
    ? [
        { href: `/projects/${projectId}`, label: "Overview", icon: LayoutDashboard },
        { href: `/projects/${projectId}/papers`, label: "Library", icon: Library },
        { href: `/projects/${projectId}/research`, label: "Research", icon: Lightbulb },
        { href: `/projects/${projectId}/settings`, label: "Settings", icon: Settings },
      ]
    : [];

  return (
    <aside
      className={clsx(
        "fixed left-0 top-0 z-40 h-screen w-60 border-r border-[var(--border)] bg-[var(--sidebar-bg)] flex flex-col transition-transform duration-300 ease-in-out",
        open ? "translate-x-0" : "-translate-x-60"
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between px-4 h-14 border-b border-[var(--border)] shrink-0">
        <Link href="/projects" className="flex items-center gap-2.5 group">
          <div className="h-8 w-8 rounded-lg bg-[var(--primary)] flex items-center justify-center">
            <Microscope className="h-4 w-4 text-[var(--primary-foreground)]" />
          </div>
          <span className="font-semibold text-base tracking-tight text-[var(--foreground)]">
            ResearchFlow
          </span>
        </Link>
        <button
          onClick={onToggle}
          className="p-1.5 rounded-lg hover:bg-[var(--sidebar-hover)] text-[var(--muted-foreground)] transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-auto py-4 px-3">
        <div className="space-y-1">
          <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-2">
            Navigation
          </p>
          <Link
            href="/projects"
            className={clsx(
              "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all",
              pathname === "/projects" || pathname === "/projects/new"
                ? "bg-[var(--sidebar-active)] text-[var(--primary)] font-medium shadow-sm"
                : "text-[var(--muted-foreground)] hover:bg-[var(--sidebar-hover)] hover:text-[var(--foreground)]"
            )}
          >
            <LayoutDashboard className="h-4 w-4" />
            My Projects
          </Link>
        </div>

        {projectId && (
          <div className="mt-4 pt-4 border-t border-[var(--border)] space-y-1">
            <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-2">
              Project
            </p>
            {navItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== `/projects/${projectId}` && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={clsx(
                    "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all",
                    isActive
                      ? "bg-[var(--sidebar-active)] text-[var(--primary)] font-medium shadow-sm"
                      : "text-[var(--muted-foreground)] hover:bg-[var(--sidebar-hover)] hover:text-[var(--foreground)]"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* User */}
      <div className="border-t border-[var(--border)] p-3 shrink-0">
        <DropdownMenu
          side="top"
          trigger={
            <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-[var(--sidebar-hover)] cursor-pointer transition-colors">
              <Avatar name={user?.name || "User"} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate text-[var(--foreground)]">
                  {user?.name}
                </p>
                <p className="text-xs text-[var(--muted-foreground)] truncate">
                  {user?.email}
                </p>
              </div>
            </div>
          }
        >
          <DropdownMenuItem onClick={handleLogout} destructive>
            <LogOut className="h-4 w-4 mr-2" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenu>
      </div>
    </aside>
  );
}
