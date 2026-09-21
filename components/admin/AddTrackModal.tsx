"use client";

import React, { useRef, useState } from "react";
import Image from "next/image";
import { X, UploadCloud, FileAudio, Check, Shield, Clock } from "lucide-react";
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
  const [customArtworkFile, setCustomArtworkFile] = useState<File | null>(null);

  // Audio file upload state
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioDuration, setAudioDuration] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Security options
  const [hasPassword, setHasPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [expiryOption, setExpiryOption] = useState<"never" | "24h" | "7d" | "30d" | "custom">("never");
  const [customExpiry, setCustomExpiry] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const customArtInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleAudioFile = (file: File) => {
    const validExts = [".mp3", ".wav", ".m4a", ".aac", ".flac"];
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (!validExts.includes(ext)) {
      setError(`Unsupported audio format (${ext}). Supported: MP3, WAV, M4A, AAC, FLAC`);
      return;
    }

    setError(null);
    setAudioFile(file);

    // Calculate audio duration in browser
    const tempUrl = URL.createObjectURL(file);
    const tempAudio = new Audio(tempUrl);
    tempAudio.addEventListener("loadedmetadata", () => {
      if (tempAudio.duration && !isNaN(tempAudio.duration)) {
        setAudioDuration(Math.round(tempAudio.duration));
      }
      URL.revokeObjectURL(tempUrl);
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleAudioFile(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !artist.trim()) {
      setError("Track Name and Artist are required.");
      return;
    }
    if (!audioFile) {
      setError("Please select or drop an audio file.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setUploadStatus("Uploading audio file securely...");

    try {
      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("artist", artist.trim());
      if (composer.trim()) formData.append("composer", composer.trim());
      if (project.trim()) formData.append("project", project.trim());
      if (description.trim()) formData.append("description", description.trim());
      formData.append("artwork", selectedArtwork);
      if (customArtworkFile) formData.append("customArtwork", customArtworkFile);
      formData.append("audio", audioFile);
      if (audioDuration) formData.append("duration", audioDuration.toString());
      if (hasPassword && password.trim()) formData.append("password", password.trim());
      formData.append("expiryOption", expiryOption);
      if (expiryOption === "custom" && customExpiry) {
        formData.append("customExpiry", customExpiry);
      }

      const res = await fetch("/api/tracks", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setUploadStatus("Complete!");
        onSuccess(data.track, data.link);
        onClose();
      } else {
        setError(data.error || "Failed to create private listening link.");
      }
    } catch {
      setError("Network error while uploading audio.");
    } finally {
      setIsSubmitting(false);
      setUploadStatus(null);
    }
  };

  const formatFileSize = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  const formatDuration = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins}:${s.toString().padStart(2, "0")}`;
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
          {/* Audio Upload Dropzone (Section 15) */}
          <div>
            <label className="block text-[11px] uppercase tracking-widest text-text-secondary mb-2">
              Audio File <span className="text-champagne">*</span>
            </label>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative border border-dashed rounded-sm p-6 text-center cursor-pointer transition-all duration-200 ${
                isDragging
                  ? "border-champagne bg-champagne-subtle"
                  : audioFile
                  ? "border-surface-borderLight bg-surface-elevated"
                  : "border-surface-borderLight/60 hover:border-text-muted bg-surface-elevated/40"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".mp3,.wav,.m4a,.aac,.flac,audio/*"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleAudioFile(e.target.files[0]);
                  }
                }}
                className="hidden"
              />

              {audioFile ? (
                <div className="flex items-center justify-between text-left">
                  <div className="flex items-center space-x-3">
                    <div className="p-2.5 bg-surface rounded text-champagne border border-surface-border">
                      <FileAudio className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-text-primary truncate max-w-sm">
                        {audioFile.name}
                      </p>
                      <p className="text-xs text-text-muted font-mono mt-0.5">
                        {formatFileSize(audioFile.size)}
                        {audioDuration && ` · ${formatDuration(audioDuration)}`}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-champagne uppercase tracking-wider font-mono">
                    Change
                  </span>
                </div>
              ) : (
                <div>
                  <UploadCloud className="w-8 h-8 text-text-muted mx-auto mb-2" />
                  <p className="text-xs text-text-primary tracking-wide">
                    Drag and drop audio file, or click to browse
                  </p>
                  <p className="text-[11px] text-text-muted font-mono mt-1">
                    Accepts MP3, WAV, M4A, AAC, FLAC (Up to 50MB)
                  </p>
                </div>
              )}
            </div>
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

          {/* Artwork Selector (Section 12) */}
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
                    setCustomArtworkFile(e.target.files[0]);
                  }
                }}
                className="hidden"
              />
            </div>

            {customArtworkFile && (
              <p className="text-xs text-champagne font-mono mb-2">
                Custom artwork selected: {customArtworkFile.name}
              </p>
            )}

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
              {ARTWORK_PRESETS.map((preset) => {
                const isSelected = selectedArtwork === preset.id && !customArtworkFile;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      setSelectedArtwork(preset.id);
                      setCustomArtworkFile(null);
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

          {/* Security & Link Expiration (Section 17, 18) */}
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

          {uploadStatus && (
            <p className="text-xs text-champagne font-mono tracking-wide animate-pulse">
              {uploadStatus}
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
