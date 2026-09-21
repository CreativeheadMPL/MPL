"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  Copy,
  Check,
  Edit2,
  Trash2,
  ExternalLink,
  LogOut,
  Music,
  Database,
  Cloud,
} from "lucide-react";
import { AddTrackModal } from "./AddTrackModal";
import { EditTrackModal } from "./EditTrackModal";
import { ShareLinkModal } from "./ShareLinkModal";
import { extractGoogleDriveId } from "@/lib/audio/drive";
import { ListeningLink, Track, TrackWithLink } from "@/lib/data/types";

interface AdminDashboardProps {
  initialTracks: TrackWithLink[];
  isUsingSupabase?: boolean;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  initialTracks,
  isUsingSupabase = false,
}) => {
  const router = useRouter();
  const [tracks, setTracks] = useState<TrackWithLink[]>(initialTracks);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTrack, setEditingTrack] = useState<TrackWithLink | null>(null);
  const [shareModalData, setShareModalData] = useState<{
    track: Track;
    link: ListeningLink;
  } | null>(null);

  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

  const refreshTracks = async () => {
    try {
      const res = await fetch("/api/tracks");
      if (res.ok) {
        const data = await res.json();
        setTracks(data);
      }
    } catch (err) {
      console.error("Failed to refresh tracks:", err);
    }
  };

  const handleCopyLink = async (token: string) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const fullUrl = `${origin}/listen/${token}`;
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopiedToken(token);
      setTimeout(() => setCopiedToken(null), 2000);
    } catch {
      // Fallback
    }
  };

  const handleToggleRevoke = async (track: TrackWithLink) => {
    if (!track.link) return;
    const newStatus = track.link.status === "REVOKED" ? "ACTIVE" : "REVOKED";
    setIsActionLoading(true);

    try {
      const res = await fetch("/api/links", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          linkId: track.link.id,
          status: newStatus,
        }),
      });

      if (res.ok) {
        await refreshTracks();
      }
    } catch (err) {
      console.error("Failed to update status:", err);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDelete = async (track: TrackWithLink) => {
    if (!confirm(`Are you sure you want to permanently delete "${track.title}"?`)) {
      return;
    }

    setIsActionLoading(true);
    try {
      const res = await fetch(`/api/tracks/${track.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        await refreshTracks();
      }
    } catch (err) {
      console.error("Failed to delete track:", err);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/admin/login");
    router.refresh();
  };

  return (
    <main className="min-h-screen flex flex-col justify-between px-6 py-8 md:px-12 md:py-10 bg-background text-text-primary">
      {/* Top Header: MOTION PULSE / SAMPLE SPACE */}
      <header className="w-full flex items-center justify-between text-xs tracking-widest font-semibold uppercase text-text-secondary select-none pb-8 border-b border-surface-borderLight/50">
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
          <span className="text-text-primary tracking-[0.25em] font-bold text-sm">
            MOTION PULSE
          </span>
          <span className="hidden sm:inline-block text-text-faint font-mono">/</span>
          <span className="text-champagne font-mono text-[11px] tracking-[0.3em]">
            SAMPLE SPACE
          </span>
        </div>

        <div className="flex items-center space-x-5">
          {/* Database status indicator */}
          <div
            className={`hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-sm border text-[10px] font-mono tracking-wider ${
              isUsingSupabase
                ? "bg-emerald-950/40 border-emerald-800/80 text-emerald-400"
                : "bg-surface-elevated border-surface-border text-text-muted"
            }`}
          >
            <Database className="w-3 h-3" />
            <span>{isUsingSupabase ? "SUPABASE CLOUD DB" : "LOCAL DB"}</span>
          </div>

          <Link
            href="/"
            className="text-[11px] text-text-muted hover:text-text-primary tracking-wider transition-colors hidden sm:block"
          >
            Portal
          </Link>
          <button
            onClick={handleLogout}
            title="Sign out"
            className="flex items-center space-x-1.5 text-[11px] text-text-muted hover:text-red-400 tracking-wider transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">SIGN OUT</span>
          </button>
        </div>
      </header>

      {/* Main Admin Section */}
      <div className="w-full max-w-5xl mx-auto my-8 flex-1 animate-fadeIn">
        {/* Supabase Notice Banner if not configured yet */}
        {!isUsingSupabase && (
          <div className="mb-6 p-4 rounded-sm bg-surface-elevated/80 border border-champagne/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-champagne/10 text-champagne rounded-sm">
                <Database className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs text-text-primary font-medium tracking-wide">
                  Ready for Supabase PostgreSQL Database
                </p>
                <p className="text-[11px] text-text-muted mt-0.5">
                  Set <code className="text-champagne font-mono">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
                  <code className="text-champagne font-mono">SUPABASE_SERVICE_ROLE_KEY</code> in{" "}
                  <code className="text-champagne font-mono">.env.local</code> to activate cloud database.
                </p>
              </div>
            </div>
            <span className="text-[10px] font-mono text-champagne uppercase tracking-widest px-2 py-0.5 border border-champagne/40 rounded bg-champagne/5">
              Local Fallback Active
            </span>
          </div>
        )}

        {/* Title Bar & Add Track Button */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-xl sm:text-2xl font-light tracking-tight text-text-primary">
              TRACKS
            </h1>
            <p className="text-xs text-text-muted font-mono tracking-wider mt-0.5">
              {tracks.length} {tracks.length === 1 ? "SAMPLE" : "SAMPLES"} ARCHIVED
            </p>
          </div>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center space-x-2 bg-champagne text-background font-medium px-4 sm:px-5 py-2.5 text-xs tracking-[0.2em] uppercase rounded-sm hover:bg-champagne-light transition-all shadow-md active:scale-[0.98]"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>ADD TRACK</span>
          </button>
        </div>

        {/* Existing Tracks Table / List */}
        {tracks.length === 0 ? (
          <div className="py-20 text-center border border-dashed border-surface-borderLight rounded-sm bg-surface/30">
            <Music className="w-8 h-8 text-text-muted mx-auto mb-3 opacity-60" />
            <p className="text-sm text-text-secondary tracking-wide mb-1">
              No private sample tracks yet.
            </p>
            <p className="text-xs text-text-muted mb-4">
              Add a Google Drive link to generate a confidential preview link.
            </p>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="bg-surface border border-champagne/60 text-champagne text-xs uppercase tracking-widest px-4 py-2 rounded-sm hover:bg-champagne hover:text-background transition-colors"
            >
              + ADD FIRST TRACK
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {tracks.map((track) => {
              const link = track.link;
              const isRevoked = link?.status === "REVOKED";
              const isActive = link?.status === "ACTIVE";
              const hasPassword = Boolean(link?.hasPassword);
              const isDrive = extractGoogleDriveId(track.audioFile) !== null;

              return (
                <div
                  key={track.id}
                  className="group relative flex flex-col md:flex-row md:items-center justify-between p-4 bg-surface border border-surface-borderLight/80 rounded-sm hover:border-surface-border transition-all duration-200 gap-4"
                >
                  {/* Left: Artwork + Track Name + Artist + Project */}
                  <div className="flex items-center space-x-4 min-w-0">
                    <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-sm overflow-hidden flex-shrink-0 bg-surface-elevated border border-surface-borderLight">
                      <Image
                        src={track.artwork}
                        alt={track.title}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center space-x-2">
                        <h3 className="text-sm sm:text-base font-medium text-text-primary truncate">
                          {track.title}
                        </h3>
                        {hasPassword && (
                          <span
                            title="Password Protected"
                            className="text-[10px] text-champagne font-mono border border-champagne/30 px-1 rounded"
                          >
                            LOCK
                          </span>
                        )}
                        {isDrive && (
                          <span
                            title="Streaming from Google Drive"
                            className="text-[10px] text-sky-400 font-mono border border-sky-800/60 bg-sky-950/40 px-1 rounded flex items-center space-x-0.5"
                          >
                            <Cloud className="w-2.5 h-2.5" />
                            <span>DRIVE</span>
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-text-secondary truncate mt-0.5">
                        {track.artist}
                        {track.composer && (
                          <span className="text-text-muted"> · {track.composer}</span>
                        )}
                      </p>

                      <div className="flex items-center space-x-2 mt-1 text-[11px] text-text-muted font-mono">
                        {track.project && (
                          <span className="text-champagne/80">{track.project}</span>
                        )}
                        {track.project && <span>·</span>}
                        <span>
                          {new Date(track.createdAt).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                        {track.duration && (
                          <>
                            <span>·</span>
                            <span>
                              {Math.floor(track.duration / 60)}:
                              {(track.duration % 60).toString().padStart(2, "0")}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Status Badge & Action Buttons */}
                  <div className="flex items-center flex-wrap gap-2 md:gap-3 justify-between md:justify-end pt-2 md:pt-0 border-t md:border-t-0 border-surface-borderLight/40">
                    {/* Status Badge */}
                    {link && (
                      <span
                        className={`text-[10px] font-mono tracking-widest uppercase px-2.5 py-1 rounded-sm border ${
                          isActive
                            ? "bg-emerald-950/40 text-emerald-400 border-emerald-900/60"
                            : isRevoked
                            ? "bg-red-950/40 text-red-400 border-red-900/60"
                            : "bg-amber-950/40 text-amber-400 border-amber-900/60"
                        }`}
                      >
                        {link.status}
                      </span>
                    )}

                    {/* Copy Link Button */}
                    {link && (
                      <button
                        onClick={() => handleCopyLink(link.token)}
                        className="flex items-center space-x-1.5 px-3 py-1.5 bg-surface-elevated hover:bg-[#1C1C1C] border border-surface-border text-text-secondary hover:text-champagne text-xs font-mono tracking-wider rounded-sm transition-colors"
                        title="Copy private listening URL"
                      >
                        {copiedToken === link.token ? (
                          <>
                            <Check className="w-3 h-3 text-champagne stroke-[2.5]" />
                            <span className="text-champagne">COPIED</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>COPY LINK</span>
                          </>
                        )}
                      </button>
                    )}

                    {/* Preview Button */}
                    {link && (
                      <Link
                        href={`/listen/${link.token}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 text-text-muted hover:text-text-primary transition-colors"
                        title="Open confidential listening page in new tab"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                    )}

                    {/* Edit Button */}
                    <button
                      onClick={() => setEditingTrack(track)}
                      className="p-1.5 text-text-muted hover:text-text-primary transition-colors"
                      title="Edit track metadata"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    {/* Revoke / Restore Quick Toggle */}
                    {link && (
                      <button
                        onClick={() => handleToggleRevoke(track)}
                        disabled={isActionLoading}
                        className={`text-xs font-mono uppercase px-2 py-1 transition-colors ${
                          isRevoked
                            ? "text-emerald-400 hover:underline"
                            : "text-red-400/80 hover:text-red-300"
                        }`}
                        title={isRevoked ? "Restore preview access" : "Revoke preview link"}
                      >
                        {isRevoked ? "RESTORE" : "REVOKE"}
                      </button>
                    )}

                    {/* Delete Button */}
                    <button
                      onClick={() => handleDelete(track)}
                      disabled={isActionLoading}
                      className="p-1.5 text-text-muted hover:text-red-400 transition-colors"
                      title="Delete track"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="w-full text-center text-[10px] tracking-[0.35em] uppercase text-text-faint select-none pt-8 border-t border-surface-borderLight/40">
        MOTION PULSE INDIA
      </footer>

      {/* Add Track Modal */}
      <AddTrackModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={async (newTrack, newLink) => {
          await refreshTracks();
          setShareModalData({ track: newTrack, link: newLink });
        }}
      />

      {/* Edit Track Modal */}
      <EditTrackModal
        isOpen={Boolean(editingTrack)}
        onClose={() => setEditingTrack(null)}
        trackWithLink={editingTrack}
        onUpdated={refreshTracks}
      />

      {/* Share Link Modal (Triggered on track creation) */}
      <ShareLinkModal
        isOpen={Boolean(shareModalData)}
        onClose={() => setShareModalData(null)}
        track={shareModalData?.track || null}
        link={shareModalData?.link || null}
      />
    </main>
  );
};
