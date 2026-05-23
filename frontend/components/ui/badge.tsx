import { clsx } from "clsx";

const variants = {
  default: "bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20",
  secondary: "bg-[var(--secondary)] text-[var(--secondary-foreground)] border border-[var(--border)]",
  destructive: "bg-[var(--destructive)]/10 text-[var(--destructive)] border border-[var(--destructive)]/20",
  outline: "border border-[var(--border)] text-[var(--foreground)]",
};

interface BadgeProps {
  children: React.ReactNode;
  variant?: keyof typeof variants;
  className?: string;
}

export function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
