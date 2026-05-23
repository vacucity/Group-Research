import { clsx } from "clsx";

export function Avatar({ name, imageUrl, size = "md" }: { name: string; imageUrl?: string | null; size?: "sm" | "md" | "lg" }) {
  const sizes = { sm: "h-7 w-7 text-xs", md: "h-9 w-9 text-sm", lg: "h-12 w-12 text-lg" };
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={name}
        className={clsx("rounded-full object-cover", sizes[size])}
      />
    );
  }

  return (
    <div
      className={clsx(
        "rounded-full bg-primary/10 text-primary font-medium flex items-center justify-center",
        sizes[size]
      )}
    >
      {initials}
    </div>
  );
}
