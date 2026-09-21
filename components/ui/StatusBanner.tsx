import React from "react";
import Image from "next/image";
import Link from "next/link";
import { AlertCircle, ShieldAlert } from "lucide-react";

interface StatusBannerProps {
  status: "EXPIRED" | "REVOKED" | "NOT_FOUND";
}

export const StatusBanner: React.FC<StatusBannerProps> = ({ status }) => {
  const isRevoked = status === "REVOKED";
  const isExpired = status === "EXPIRED";

  const title = isRevoked
    ? "ACCESS REVOKED"
    : isExpired
    ? "SAMPLE UNAVAILABLE"
    : "SAMPLE NOT FOUND";

  const description = isRevoked
    ? "This sample is no longer available."
    : isExpired
    ? "This private listening link has expired."
    : "The requested confidential sample could not be found.";

  return (
    <main className="min-h-screen flex flex-col justify-between px-6 py-8 md:px-12 md:py-10 bg-background text-text-primary">
      {/* Top Header */}
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

      {/* Center Status Display */}
      <div className="w-full max-w-md mx-auto my-auto text-center py-16 px-4 animate-fadeIn">
        <div className="w-12 h-12 mx-auto mb-6 flex items-center justify-center rounded-full bg-surface-elevated border border-surface-border text-text-muted">
          {isRevoked ? (
            <ShieldAlert className="w-5 h-5 text-red-400" />
          ) : (
            <AlertCircle className="w-5 h-5 text-champagne" />
          )}
        </div>

        <h1 className="text-sm font-semibold tracking-[0.35em] uppercase text-text-primary mb-3">
          {title}
        </h1>
        <p className="text-sm text-text-muted tracking-wide mb-8">
          {description}
        </p>

        <div className="pt-6 border-t border-surface-border/60">
          <p className="text-xs text-text-faint tracking-widest uppercase">
            If you believe this is an error, please contact your Motion Pulse representative.
          </p>
        </div>

        <div className="mt-8">
          <Link
            href="/"
            className="text-xs text-champagne/80 hover:text-champagne tracking-widest uppercase transition-colors"
          >
            ← Return to Motion Pulse
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full text-center text-[10px] tracking-[0.3em] uppercase text-text-faint select-none">
        MOTION PULSE INDIA
      </footer>
    </main>
  );
};
