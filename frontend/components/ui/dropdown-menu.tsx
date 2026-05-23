"use client";

import { useState, useRef, useEffect } from "react";
import { clsx } from "clsx";

interface DropdownMenuProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: "left" | "right";
  side?: "bottom" | "top";
}

export function DropdownMenu({ trigger, children, align = "right", side = "bottom" }: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <div onClick={() => setOpen(!open)} className="cursor-pointer">
        {trigger}
      </div>
      {open && (
        <div
          className={clsx(
            "absolute z-50 min-w-[180px] rounded-lg border border-[var(--border)] bg-[var(--card)] p-1 shadow-lg",
            side === "top" ? "bottom-full mb-1" : "top-full mt-1",
            align === "right" ? "right-0" : "left-0"
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
}

export function DropdownMenuItem({
  children,
  onClick,
  destructive,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  destructive?: boolean;
}) {
  return (
    <button
      onClick={() => {
        onClick?.();
      }}
      className={clsx(
        "flex w-full items-center rounded-md px-2 py-1.5 text-sm transition-colors",
        destructive
          ? "text-[var(--destructive)] hover:bg-[var(--destructive)]/10"
          : "hover:bg-[var(--secondary)] text-[var(--foreground)]"
      )}
    >
      {children}
    </button>
  );
}
