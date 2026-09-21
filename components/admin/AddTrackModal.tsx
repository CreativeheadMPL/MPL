"use client";

import React, { useRef, useState } from "react";
import Image from "next/image";
import { X, Check, Shield, Clock, Link as LinkIcon, CheckCircle2, AlertCircle } from "lucide-react";
import { extractGoogleDriveId } from "@/lib/audio/drive";
import { ListeningLink, Track } from "@/lib/data/types";

interface AddTrackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (track: Track, link: ListeningLink) => void;
}

const ARTWORK_PRESETS = [
  { id: "/artwork/sample-01.svg", name: "Sample 01", desc: "Noir Geometry" },
  { id: "/artwork/sample-02.svg", name: "Sample 02", desc: "Crimson Pulse" },
  { id: "/artwork/sample-03.svg", name: "Sample 03", desc: "Champagne Ray" },
  { id: "/artwork/sample-04.svg", name: "Sample 04", desc: "Midnight Horizon" },
  { id: "/artwork/sample-05.svg", name: "Sample 05", desc: "Acoustic Monolith" },
  { id: "/artwork/default.svg", name: "Default Master", desc: "Archive Vinyl" },
];

export const AddTrackModal: React.FC<AddTrackModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [composer, setComposer] = useState("");
  const [project, setProject] = useState("");
  const [description, setDescription] = useState("");
  const [selectedArtwork, setSelectedArtwork] = useState("/artwork/sample-01.svg");
  const [customArtworkName, setCustomArtworkName] = useState<string | null>(null);
  const [customArtworkDataUrl, setCustomArtworkDataUrl] = useState<string | null>(null);

  // Google Drive Audio Link state
  const [googleDriveUrl, setGoogleDriveUrl] = useState("");
  const [durationInput, setDurationInput] = useState("3:00");

  // Security options
  const [hasPassword, setHasPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [expiryOption, setExpiryOption] = useState<"never" | "24h" | "7d" | "30d" | "custom">("never");
  const [customExpiry, setCustomExpiry] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const customArtInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const driveId = extractGoogleDriveId(googleDriveUrl);
  const isDriveValid = Boolean(driveId);

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

  const handleCustomArtFile = (file: File) => {
    setCustomArtworkName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setCustomArtworkDataUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !artist.trim()) {
      setError("Track Name and Artist are required.");
      return;
    }
    if (!googleDriveUrl.trim()) {
      setError("Please paste a Google Drive audio link.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setStatusMsg("Saving sample to database...");

    try {
      const finalDuration = parseDuration(durationInput);
      const finalArtwork = customArtworkDataUrl || selectedArtwork;

      const res = await fetch("/api/tracks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          artist: artist.trim(),
          composer: composer.trim() || undefined,
          project: project.trim() || undefined,
          description: description.trim() || undefined,
          artwork: finalArtwork,
          googleDriveUrl: googleDriveUrl.trim(),
          duration: finalDuration,
          password: hasPassword && password.trim() ? password.trim() : undefined,
          expiryOption,
          customExpiry: expiryOption === "custom" ? customExpiry : undefined,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setStatusMsg("Complete!");
        onSuccess(data.track, data.link);
        onClose();
      } else {
        setError(data.error || data.details || "Failed to create private listening link.");
      }
    } catch {
      setError("Network error while creating track.");
    } finally {
      setIsSubmitting(false);
      setStatusMsg(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-surface border border-surface-borderLight rounded-sm shadow-2xl my-8 overflow-hidden animate-fadeIn">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-surface-borderLight/80">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-champagne">
              MOTION PULSE SAMPLE SPACE
            </p>
            <h2 className="text-base font-normal tracking-wide text-text-primary">
              Add Track & Generate Link
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-primary transition-colors p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Google Drive Link Input */}
          <div className="bg-surface-elevated/40 border border-surface-borderLight rounded-sm p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center space-x-2 text-[11px] uppercase tracking-widest text-text-secondary font-medium">
                <LinkIcon className="w-3.5 h-3.5 text-champagne" />
                <span>Google Drive Audio Link <span className="text-champagne">*</span></span>
              </label>
              {googleDriveUrl.trim() && (
                <div className="flex items-center space-x-1.5 text-[11px] font-mono">
                  {isDriveValid ? (
                    <span className="text-emerald-400 flex items-center space-x-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Drive ID: {driveId?.slice(0, 8)}...</span>
                    </span>
                  ) : (
                    <span className="text-amber-400 flex items-center space-x-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>Direct Stream URL</span>
                    </span>
                  )}
                </div>
              )}
            </div>

            <input
              type="text"
              value={googleDriveUrl}
              onChange={(e) => setGoogleDriveUrl(e.target.value)}
              placeholder="https://drive.google.com/file/d/.../view?usp=sharing"
              required
              className="w-full bg-surface border border-surface-borderLight rounded-sm px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-champagne transition-colors font-mono"
            />

            <p className="text-[11px] text-text-muted leading-relaxed">
              Paste your Google Drive share link.{" "}
              <span className="text-champagne/90">
                Ensure general access is set to &ldquo;Anyone with the link can view&rdquo;
              </span>
              . Audio will stream seamlessly without exposing the Google Drive URL to listeners.
            </p>
          </div>

          {/* Track Metadata Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] uppercase tracking-widest text-text-secondary mb-1.5">
                Track Name <span className="text-champagne">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Tere Bina (Demo)"
                required
                className="w-full bg-surface-elevated border border-surface-borderLight rounded-sm px-3.5 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-champagne/70 transition-colors"
              />
            </div>

            <div>
              <label className="block text-[11px] uppercase tracking-widest text-text-secondary mb-1.5">
                Artist <span className="text-champagne">*</span>
              </label>
              <input
                type="text"
                value={artist}
                onChange={(e) => setArtist(e.target.value)}
                placeholder="e.g. Arijit Singh / Demo Artist"
                required
                className="w-full bg-surface-elevated border border-surface-borderLight rounded-sm px-3.5 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-champagne/70 transition-colors"
              />
            </div>

            <div>
              <label className="block text-[11px] uppercase tracking-widest text-text-secondary mb-1.5">
                Composer
              </label>
              <input
                type="text"
                value={composer}
                onChange={(e) => setComposer(e.target.value)}
                placeholder="e.g. Pritam"
                className="w-full bg-surface-elevated border border-surface-borderLight rounded-sm px-3.5 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-champagne/70 transition-colors"
              />
            </div>

            <div>
              <label className="block text-[11px] uppercase tracking-widest text-text-secondary mb-1.5">
                Project / Film
              </label>
              <input
                type="text"
                value={project}
                onChange={(e) => setProject(e.target.value)}
                placeholder="e.g. Motion Pulse Demo Score"
                className="w-full bg-surface-elevated border border-surface-borderLight rounded-sm px-3.5 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-champagne/70 transition-colors"
              />
            </div>

            <div>
              <label className="block text-[11px] uppercase tracking-widest text-text-secondary mb-1.5">
                Duration (mm:ss or seconds)
              </label>
              <input
                type="text"
                value={durationInput}
                onChange={(e) => setDurationInput(e.target.value)}
                placeholder="3:00 or 180"
                className="w-full bg-surface-elevated border border-surface-borderLight rounded-sm px-3.5 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-champagne/70 transition-colors font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-widest text-text-secondary mb-1.5">
              Confidential Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Internal notes or listener context for this preview..."
              rows={2}
              className="w-full bg-surface-elevated border border-surface-borderLight rounded-sm px-3.5 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-champagne/70 transition-colors"
            />
          </div>

          {/* Artwork Selector */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] uppercase tracking-widest text-text-secondary">
                Artwork Selection
              </label>
              <button
                type="button"
                onClick={() => customArtInputRef.current?.click()}
                className="text-[11px] text-champagne hover:underline tracking-wider"
              >
                + Upload Custom Square Artwork
              </button>
              <input
                ref={customArtInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleCustomArtFile(e.target.files[0]);
                  }
                }}
                className="hidden"
              />
            </div>

            {customArtworkName && (
              <p className="text-xs text-champagne font-mono mb-2">
                Custom artwork selected: {customArtworkName}
              </p>
            )}

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
              {ARTWORK_PRESETS.map((preset) => {
                const isSelected = selectedArtwork === preset.id && !customArtworkDataUrl;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      setSelectedArtwork(preset.id);
                      setCustomArtworkName(null);
                      setCustomArtworkDataUrl(null);
                    }}
                    className={`relative aspect-square rounded-sm overflow-hidden border transition-all text-left group ${
                      isSelected
                        ? "border-champagne ring-1 ring-champagne"
                        : "border-surface-borderLight/80 opacity-60 hover:opacity-100"
                    }`}
                  >
                    <Image
                      src={preset.id}
                      alt={preset.name}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                    {isSelected && (
                      <div className="absolute top-1 right-1 bg-champagne text-background rounded-full p-0.5 shadow">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 bg-black/80 px-1 py-0.5 text-[9px] text-text-primary truncate">
                      {preset.name}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Security & Link Expiration */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-surface-borderLight/60">
            {/* Password Protection */}
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <Shield className="w-3.5 h-3.5 text-champagne" />
                <label className="text-[11px] uppercase tracking-widest text-text-secondary">
                  Password Protection
                </label>
              </div>

              <div className="flex items-center space-x-3 mb-2 text-xs">
                <label className="flex items-center space-x-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="passwordMode"
                    checked={!hasPassword}
                    onChange={() => setHasPassword(false)}
                    className="accent-champagne"
                  />
                  <span className="text-text-secondary">No Password</span>
                </label>

                <label className="flex items-center space-x-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="passwordMode"
                    checked={hasPassword}
                    onChange={() => setHasPassword(true)}
                    className="accent-champagne"
                  />
                  <span className="text-text-secondary">Password Protected</span>
                </label>
              </div>

              {hasPassword && (
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Set preview password"
                  className="w-full bg-surface-elevated border border-surface-borderLight rounded-sm px-3.5 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-champagne/70 transition-colors font-mono"
                />
              )}
            </div>

            {/* Expiration Options */}
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <Clock className="w-3.5 h-3.5 text-champagne" />
                <label className="text-[11px] uppercase tracking-widest text-text-secondary">
                  Link Expiration
                </label>
              </div>

              <select
                value={expiryOption}
                onChange={(e) =>
                  setExpiryOption(e.target.value as "never" | "24h" | "7d" | "30d" | "custom")
                }
                className="w-full bg-surface-elevated border border-surface-borderLight rounded-sm px-3.5 py-2 text-xs text-text-primary focus:outline-none focus:border-champagne/70 transition-colors"
              >
                <option value="never">No Expiration</option>
                <option value="24h">Expires in 24 Hours</option>
                <option value="7d">Expires in 7 Days</option>
                <option value="30d">Expires in 30 Days</option>
                <option value="custom">Custom Date & Time</option>
              </select>

              {expiryOption === "custom" && (
                <input
                  type="datetime-local"
                  value={customExpiry}
                  onChange={(e) => setCustomExpiry(e.target.value)}
                  className="w-full mt-2 bg-surface-elevated border border-surface-borderLight rounded-sm px-3 py-1.5 text-xs text-text-primary focus:outline-none focus:border-champagne font-mono"
                />
              )}
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-400 font-mono tracking-wide animate-fadeIn">
              {error}
            </p>
          )}

          {statusMsg && (
            <p className="text-xs text-champagne font-mono tracking-wide animate-pulse">
              {statusMsg}
            </p>
          )}

          {/* Form Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-surface-borderLight/80">
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
              className="bg-champagne text-background font-medium px-6 py-2.5 text-xs tracking-[0.2em] uppercase rounded-sm hover:bg-champagne-light disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? "GENERATING..." : "CREATE SAMPLE LINK"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
