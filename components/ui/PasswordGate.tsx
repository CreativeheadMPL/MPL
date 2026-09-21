"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Lock } from "lucide-react";

interface PasswordGateProps {
  token: string;
  onSuccess?: () => void;
}

export const PasswordGate: React.FC<PasswordGateProps> = ({ token, onSuccess }) => {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/links/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        if (onSuccess) onSuccess();
        window.location.reload();
      } else {
        setError(data.error || "Incorrect password");
      }
    } catch {
      setError("Network error. Please try again.");
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
              unoptimized
            />
          </div>
          <span className="text-text-primary tracking-[0.25em] font-bold text-sm">MOTION PULSE</span>
        </div>
        <span className="text-champagne font-mono text-[11px] tracking-[0.3em]">
          SAMPLE SPACE
        </span>
      </header>

      {/* Center Modal Card */}
      <div className="w-full max-w-sm mx-auto my-auto py-12 text-center animate-fadeIn">
        <div className="w-10 h-10 mx-auto mb-6 flex items-center justify-center rounded-full bg-surface-elevated border border-surface-border text-champagne">
          <Lock className="w-4 h-4" />
        </div>

        <p className="text-xs uppercase tracking-[0.3em] text-champagne mb-2 font-medium">
          PRIVATE PREVIEW
        </p>
        <h1 className="text-lg font-normal text-text-primary mb-8 tracking-wide">
          This sample is password protected.
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              autoFocus
              className="w-full bg-surface border border-surface-borderLight/80 rounded-sm px-4 py-3 text-center text-sm tracking-widest text-text-primary placeholder:text-text-muted focus:outline-none focus:border-champagne/70 transition-colors"
            />
          </div>

          {error && (
            <p className="text-xs text-red-400 font-mono tracking-wider animate-fadeIn">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading || !password.trim()}
            className="w-full bg-champagne text-background font-medium py-3 text-xs tracking-[0.25em] uppercase rounded-sm hover:bg-champagne-light disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-200"
          >
            {isLoading ? "Verifying..." : "ENTER"}
          </button>
        </form>

        <p className="mt-8 text-[11px] text-text-muted tracking-wider uppercase">
          Confidential Motion Pulse Sample
        </p>
      </div>

      {/* Footer */}
      <footer className="w-full text-center text-[10px] tracking-[0.3em] uppercase text-text-faint select-none">
        MOTION PULSE INDIA
      </footer>
    </main>
  );
};
