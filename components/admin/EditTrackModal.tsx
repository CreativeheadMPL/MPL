"use client";

import React, { useState } from "react";
import Image from "next/image";
import { X, ShieldAlert, RefreshCw, Link as LinkIcon, CheckCircle2 } from "lucide-react";
import { extractGoogleDriveId } from "@/lib/audio/drive";
import { ListeningLink, TrackWithLink } from "@/lib/data/types";

interface EditTrackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTrackUpdated?: () => void;
  onUpdated: () => void;
  trackWithLink: TrackWithLink | null;
}

export const EditTrackModal: React.FC<EditTrackModalProps> = ({
  isOpen,
  onClose,
  trackWithLink,
  onUpdated,
}) => {
  const [title, setTitle] = useState(trackWithLink?.title || "");
  const [artist, setArtist] = useState(trackWithLink?.artist || "");
  const [composer, setComposer] = useState(trackWithLink?.composer || "");
  const [project, setProject] = useState(trackWithLink?.project || "");
  const [description, setDescription] = useState(trackWithLink?.description || "");
  const [audioUrl, setAudioUrl] = useState(trackWithLink?.audioFile || "");
  const [durationInput, setDurationInput] = useState(
    trackWithLink?.duration
      ? `${Math.floor(trackWithLink.duration / 60)}:${(trackWithLink.duration % 60).toString().padStart(2, "0")}`
      : "3:00"
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !trackWithLink) return null;

  const track = trackWithLink;
  const link = trackWithLink.link;
  const driveId = extractGoogleDriveId(audioUrl);

  const parseDuration = (val: string): number => {
    const trimmed = val.trim();
    if (trimmed.includes(":")) {
      const [m, s] = trimmed.split(":").map(Number);
      if (!isNaN(m) && !isNaN(s)) {
        return m * 60 + s;
      }
    }
    const num = Number(trimmed);
    return !isNaN(num) && num > 0 ? Math.round(num) : 180;
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/tracks/${track.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          artist: artist.trim(),
          composer: composer.trim() || undefined,
          project: project.trim() || undefined,
          description: description.trim() || undefined,
          audioFile: audioUrl.trim(),
          duration: parseDuration(durationInput),
        }),
      });

      if (res.ok) {
        onUpdated();
        onClose();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to update track");
      }
    } catch {
      setError("Network error updating track.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleRevoke = async () => {
    if (!link) return;
    const newStatus = link.status === "REVOKED" ? "ACTIVE" : "REVOKED";
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/links", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          linkId: link.id,
          status: newStatus,
        }),
      });

      if (res.ok) {
        onUpdated();
        onClose();
      }
    } catch {
      setError("Failed to update link status");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegenerateToken = async () => {
    if (!confirm("Generate a new link token? Any existing links will be replaced.")) return;
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trackId: track.id,
          expiresAt: link?.expiresAt || null,
        }),
      });

      if (res.ok) {
        onUpdated();
        onClose();
      }
    } catch {
      setError("Failed to regenerate token");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-xl bg-surface border border-surface-borderLight rounded-sm shadow-2xl p-6 animate-fadeIn my-8">
        <div className="flex items-center justify-between pb-4 border-b border-surface-borderLight">
          <div className="flex items-center space-x-3">
            <div className="relative w-10 h-10 rounded-sm overflow-hidden flex-shrink-0">
              <Image
                src={track.artwork}
                alt={track.title}
                fill
                className="object-cover"
                unoptimized
              />
            </div>
            <div>
              <p className="text-[10px] uppercase font-mono tracking-[0.25em] text-champagne">
                EDIT TRACK
              </p>
              <h2 className="text-sm font-medium text-text-primary">
                {track.title}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-primary p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleUpdate} className="space-y-4 pt-4">
          {/* Google Drive Link */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="flex items-center space-x-1.5 text-[11px] uppercase tracking-widest text-text-secondary">
                <LinkIcon className="w-3.5 h-3.5 text-champagne" />
                <span>Google Drive Audio Link</span>
              </label>
              {driveId && (
                <span className="text-[10px] font-mono text-emerald-400 flex items-center space-x-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>ID: {driveId.slice(0, 8)}...</span>
                </span>
              )}
            </div>
            <input
              type="text"
              value={audioUrl}
              onChange={(e) => setAudioUrl(e.target.value)}
              required
              className="w-full bg-surface-elevated border border-surface-borderLight rounded-sm px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-champagne font-mono"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] uppercase tracking-widest text-text-secondary mb-1">
                Track Name
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full bg-surface-elevated border border-surface-borderLight rounded-sm px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-champagne"
              />
            </div>

            <div>
              <label className="block text-[11px] uppercase tracking-widest text-text-secondary mb-1">
                Artist
              </label>
              <input
                type="text"
                value={artist}
                onChange={(e) => setArtist(e.target.value)}
                required
                className="w-full bg-surface-elevated border border-surface-borderLight rounded-sm px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-champagne"
              />
            </div>

            <div>
              <label className="block text-[11px] uppercase tracking-widest text-text-secondary mb-1">
                Composer
              </label>
              <input
                type="text"
                value={composer}
                onChange={(e) => setComposer(e.target.value)}
                className="w-full bg-surface-elevated border border-surface-borderLight rounded-sm px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-champagne"
              />
            </div>

            <div>
              <label className="block text-[11px] uppercase tracking-widest text-text-secondary mb-1">
                Project / Film
              </label>
              <input
                type="text"
                value={project}
                onChange={(e) => setProject(e.target.value)}
                className="w-full bg-surface-elevated border border-surface-borderLight rounded-sm px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-champagne"
              />
            </div>

            <div>
              <label className="block text-[11px] uppercase tracking-widest text-text-secondary mb-1">
                Duration (mm:ss or seconds)
              </label>
              <input
                type="text"
                value={durationInput}
                onChange={(e) => setDurationInput(e.target.value)}
                className="w-full bg-surface-elevated border border-surface-borderLight rounded-sm px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-champagne font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-widest text-text-secondary mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full bg-surface-elevated border border-surface-borderLight rounded-sm px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-champagne"
            />
          </div>

          {/* Quick Link Controls */}
          {link && (
            <div className="p-3 bg-surface-elevated border border-surface-borderLight rounded-sm space-y-3 pt-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-secondary uppercase font-mono tracking-wider">
                  Link Token: <strong className="text-champagne">{link.token}</strong>
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono tracking-widest ${
                    link.status === "ACTIVE"
                      ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                      : "bg-red-950 text-red-300 border border-red-800"
                  }`}
                >
                  {link.status}
                </span>
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <button
                  type="button"
                  onClick={handleToggleRevoke}
                  disabled={isSubmitting}
                  className={`flex-1 py-1.5 px-3 rounded-sm text-xs font-medium tracking-wider uppercase transition-colors flex items-center justify-center space-x-1.5 ${
                    link.status === "REVOKED"
                      ? "bg-emerald-900/60 hover:bg-emerald-900 text-emerald-100 border border-emerald-700"
                      : "bg-red-900/40 hover:bg-red-900/70 text-red-200 border border-red-800"
                  }`}
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>{link.status === "REVOKED" ? "RESTORE ACCESS" : "REVOKE LINK"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleRegenerateToken}
                  disabled={isSubmitting}
                  className="py-1.5 px-3 rounded-sm text-xs font-medium tracking-wider uppercase bg-surface border border-surface-border hover:border-text-muted text-text-secondary hover:text-text-primary transition-colors flex items-center space-x-1.5"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>NEW TOKEN</span>
                </button>
              </div>
            </div>
          )}

          {error && <p className="text-xs text-red-400 font-mono">{error}</p>}

          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-surface-borderLight">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs tracking-widest uppercase text-text-muted hover:text-text-primary transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-champagne text-background font-medium px-5 py-2 text-xs tracking-widest uppercase rounded-sm hover:bg-champagne-light disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? "SAVING..." : "SAVE CHANGES"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
