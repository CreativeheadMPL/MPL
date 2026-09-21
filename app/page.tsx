"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Lock } from "lucide-react";

export default function HomePage() {
  const router = useRouter();
  const [tokenInput, setTokenInput] = useState("");

  const handleTokenSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim()) return;
    const cleanToken = tokenInput.trim().toUpperCase();
    router.push(`/listen/${cleanToken}`);
  };

  return (
    <main className="min-h-screen flex flex-col justify-between px-6 py-8 md:px-12 md:py-10 bg-background text-text-primary">
      {/* Minimal Header */}
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
        <Link
          href="/admin"
          className="text-text-muted hover:text-champagne font-mono text-[11px] tracking-[0.25em] transition-colors"
        >
          ADMIN
        </Link>
      </header>

      {/* 33. Center Branding & Portal */}
      <div className="w-full max-w-md mx-auto my-auto text-center py-12 animate-fadeIn select-none">
        {/* Official Motion Pulse Emblem */}
        <div className="w-24 h-28 sm:w-28 sm:h-32 mx-auto mb-8 relative">
          <Image
            src="/brand/motion-pulse-mark.png"
            alt="Motion Pulse Mark"
            fill
            className="object-contain"
            priority
            unoptimized
          />
        </div>

        {/* Brand Display */}
        <h2 className="text-sm sm:text-base font-bold tracking-[0.35em] uppercase text-text-primary mb-1">
          MOTION PULSE
        </h2>
        <h1 className="text-xl sm:text-2xl font-light tracking-[0.3em] uppercase text-champagne mb-6 font-mono">
          SAMPLE SPACE
        </h1>

        <p className="text-xs tracking-[0.25em] uppercase text-text-muted mb-12">
          &ldquo;Listen before release.&rdquo;
        </p>

        {/* Direct Token Jump (Convenience for executives) */}
        <form onSubmit={handleTokenSubmit} className="max-w-xs mx-auto mb-8">
          <div className="relative flex items-center">
            <input
              type="text"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder="ENTER SAMPLE TOKEN"
              className="w-full bg-surface border border-surface-borderLight rounded-sm pl-4 pr-10 py-2.5 text-xs text-text-primary placeholder:text-text-faint tracking-widest uppercase focus:outline-none focus:border-champagne/70 font-mono transition-colors"
            />
            <button
              type="submit"
              disabled={!tokenInput.trim()}
              className="absolute right-1 text-champagne disabled:text-text-faint p-1.5 transition-colors"
              title="Open Sample"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>

        {/* Admin Access Button */}
        <div>
          <Link
            href="/admin"
            className="inline-flex items-center space-x-2 px-6 py-2.5 bg-surface-elevated hover:bg-[#1C1C1C] border border-surface-border hover:border-champagne/40 text-text-secondary hover:text-champagne text-xs font-mono tracking-[0.2em] uppercase rounded-sm transition-all shadow"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>ADMIN</span>
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full text-center text-[10px] tracking-[0.35em] uppercase text-text-faint select-none">
        MOTION PULSE INDIA
      </footer>
    </main>
  );
}
