"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ShieldCheck, ArrowRight } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        router.push("/admin");
        router.refresh();
      } else {
        setError(data.error || "Invalid credentials");
      }
    } catch {
      setError("An unexpected network error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col justify-between px-6 py-8 md:px-12 md:py-10 bg-background text-text-primary">
      {/* Header */}
      <header className="w-full flex items-center justify-between text-xs tracking-widest font-semibold uppercase text-text-secondary select-none">
        <div className="flex items-center space-x-3">
          <div className="relative w-8 h-8 flex items-center justify-center">
            <Image
              src="/brand/motion-pulse-mark.png"
              alt="Motion Pulse"
              fill
              className="object-contain"
              priority
              unoptimized
            />
          </div>
          <span className="text-text-primary tracking-[0.25em] font-bold text-sm">MOTION PULSE</span>
        </div>
        <span className="text-champagne font-mono text-[11px] tracking-[0.3em]">
          SAMPLE SPACE
        </span>
      </header>

      {/* Center Login Box */}
      <div className="w-full max-w-sm mx-auto my-auto py-12 animate-fadeIn">
        <div className="text-center mb-8">
          <p className="text-[11px] uppercase tracking-[0.3em] text-champagne font-semibold mb-2">
            ADMINISTRATOR ACCESS
          </p>
          <h1 className="text-xl font-light tracking-wide text-text-primary">
            Sign in to Sample Space
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] uppercase tracking-widest text-text-muted mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-surface border border-surface-borderLight rounded-sm px-3.5 py-2.5 text-sm text-text-primary tracking-wide placeholder:text-text-muted focus:outline-none focus:border-champagne/70 transition-colors"
            />
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-widest text-text-muted mb-1.5">
              Password
            </label>
            <input
              type="password"
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-surface border border-surface-borderLight rounded-sm px-3.5 py-2.5 text-sm text-text-primary tracking-wide placeholder:text-text-muted focus:outline-none focus:border-champagne/70 transition-colors"
            />
          </div>

          {error && (
            <p className="text-xs text-red-400 font-mono tracking-wide py-1 animate-fadeIn">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 bg-champagne text-background font-medium py-3 text-xs tracking-[0.25em] uppercase rounded-sm hover:bg-champagne-light disabled:opacity-50 transition-colors duration-200 flex items-center justify-center space-x-2"
          >
            <span>{isLoading ? "AUTHENTICATING..." : "SIGN IN"}</span>
            {!isLoading && <ArrowRight className="w-3.5 h-3.5" />}
          </button>
        </form>
      </div>

      {/* Footer */}
      <footer className="w-full text-center text-[10px] tracking-[0.35em] uppercase text-text-faint select-none">
        MOTION PULSE INDIA
      </footer>
    </main>
  );
}
