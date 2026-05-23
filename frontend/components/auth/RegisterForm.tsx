"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, Microscope, ArrowRight } from "lucide-react";

export function RegisterForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    try {
      await register(name, email, password);
      router.push(`/verify?email=${encodeURIComponent(email)}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left: Brand panel with gradient */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#0f172a] via-[#1a2740] to-[#1e3a5f] flex-col justify-between p-12 text-white relative overflow-hidden">
        {/* Decorative grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "radial-gradient(circle, #fff 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />

        <div className="relative">
          <Link href="/" className="inline-flex items-center gap-2.5 text-white group">
            <div className="h-9 w-9 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center group-hover:bg-white/20 transition-colors">
              <Microscope className="h-5 w-5" />
            </div>
            <span className="text-xl font-semibold tracking-tight">
              ResearchFlow
            </span>
          </Link>
        </div>

        <div className="relative max-w-md">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs font-medium text-white/70 mb-6">
            Join the community
          </div>
          <h2 className="text-4xl font-light leading-tight mb-4 tracking-tight">
            Start your<br />research journey
          </h2>
          <p className="text-base text-white/55 leading-relaxed">
            Join your research team, upload papers, and let AI help you
            understand complex academic literature faster than ever.
          </p>
        </div>

        <p className="relative text-sm text-white/25">ResearchFlow v0.1</p>
      </div>

      {/* Right: Form */}
      <div className="flex-1 flex items-center justify-center px-6 bg-[var(--background)]">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-10">
            <div className="inline-flex items-center gap-2.5 mb-6">
              <div className="h-9 w-9 rounded-xl bg-[var(--primary)] flex items-center justify-center">
                <Microscope className="h-5 w-5 text-[var(--primary-foreground)]" />
              </div>
              <span className="text-xl font-semibold tracking-tight text-[var(--foreground)]">
                ResearchFlow
              </span>
            </div>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-[var(--foreground)] tracking-tight">
              Create your account
            </h1>
            <p className="text-[var(--muted-foreground)] mt-1.5">
              Join your research team
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-[var(--foreground)] mb-1.5 block">
                Full name
              </label>
              <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Prof. Jane Smith"
                required
                className="h-11"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-[var(--foreground)] mb-1.5 block">
                Email
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@university.edu"
                required
                className="h-11"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-[var(--foreground)] mb-1.5 block">
                Password
              </label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                required
                className="h-11"
              />
            </div>
            <Button type="submit" className="w-full h-11" disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="h-4 w-4" />
              )}
              Create account
            </Button>
          </form>

          <p className="text-center text-sm text-[var(--muted-foreground)] mt-8">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-[var(--primary)] font-medium hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
