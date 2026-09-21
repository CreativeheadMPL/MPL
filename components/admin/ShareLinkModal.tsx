"use client";

import React, { useState } from "react";
import Image from "next/image";
import { X, Copy, Check, ExternalLink, ShieldAlert, Clock } from "lucide-react";
import { ListeningLink, Track } from "@/lib/data/types";

interface ShareLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  track: Track | null;
  link: ListeningLink | null;
}

export const ShareLinkModal: React.FC<ShareLinkModalProps> = ({
  isOpen,
  onClose,
  track,
  link,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !track || !link) return null;

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const fullUrl = `${origin}/listen/${link.token}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-lg bg-surface border border-surface-borderLight rounded-sm shadow-2xl p-6 sm:p-8 animate-fadeIn">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 rounded-full bg-champagne animate-ping" />
            <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-champagne">
              PRIVATE LINK GENERATED
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-primary transition-colors p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Track Card Preview */}
        <div className="flex items-center space-x-4 p-3 bg-surface-elevated border border-surface-borderLight rounded-sm mb-6">
          <div className="relative w-14 h-14 rounded-sm overflow-hidden flex-shrink-0">
            <Image
              src={track.artwork}
              alt={track.title}
              fill
              className="object-cover"
              unoptimized
            />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-medium text-text-primary truncate">
              {track.title}
            </h3>
            <p className="text-xs text-text-muted truncate">
              {track.artist}
              {track.project && ` · ${track.project}`}
            </p>
          </div>
        </div>

        {/* URL Box */}
        <div className="space-y-3 mb-6">
          <label className="block text-[11px] uppercase tracking-widest text-text-secondary">
            Confidential Listening URL
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              readOnly
              value={fullUrl}
              className="w-full bg-background border border-surface-borderLight rounded-sm px-3.5 py-2.5 text-xs text-text-primary font-mono select-all focus:outline-none focus:border-champagne/60"
            />
            <button
              onClick={handleCopy}
              className="flex items-center space-x-1.5 bg-champagne text-background font-medium px-4 py-2.5 text-xs tracking-wider uppercase rounded-sm hover:bg-champagne-light transition-colors flex-shrink-0"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  <span>COPIED</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>COPY</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Security & Link Status Badges */}
        <div className="p-3 bg-background/50 border border-surface-borderLight/60 rounded-sm text-xs space-y-1.5 mb-6 text-text-muted">
          <div className="flex items-center space-x-2">
            <Clock className="w-3.5 h-3.5 text-champagne flex-shrink-0" />
            <span>
              {link.expiresAt
                ? `Expires: ${new Date(link.expiresAt).toLocaleDateString()} at ${new Date(link.expiresAt).toLocaleTimeString()}`
                : "No expiration set (Permanent until revoked)"}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <ShieldAlert className="w-3.5 h-3.5 text-champagne flex-shrink-0" />
            <span>
              {link.hasPassword
                ? "Protected with confidential preview password."
                : "Open confidential link (No password required)."}
            </span>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-between pt-2">
          <a
            href={`/listen/${link.token}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-1.5 text-xs text-champagne/80 hover:text-champagne tracking-widest uppercase transition-colors"
          >
            <span>Open Preview Page</span>
            <ExternalLink className="w-3 h-3" />
          </a>

          <button
            onClick={onClose}
            className="px-5 py-2 text-xs tracking-widest uppercase text-text-muted hover:text-text-primary transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
