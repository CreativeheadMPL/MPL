"use client";

import React, { useEffect, useRef, useState } from "react";
import { Play, Pause, RotateCcw, RotateCw, Volume2, VolumeX } from "lucide-react";
import { MinimalWaveform } from "./MinimalWaveform";
import { TimeDisplay } from "./TimeDisplay";

interface CustomAudioPlayerProps {
  token: string;
  seed?: string;
  initialDuration?: number;
  onTrackEnd?: () => void;
  onPreviousTrack?: () => void;
  onNextTrack?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
}

export const CustomAudioPlayer: React.FC<CustomAudioPlayerProps> = ({
  token,
  seed = "motion-pulse",
  initialDuration = 180,
  onTrackEnd,
  onPreviousTrack,
  onNextTrack,
  hasPrevious = false,
  hasNext = false,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const volumeContainerRef = useRef<HTMLDivElement | null>(null);
  const sliderRef = useRef<HTMLInputElement | null>(null);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(initialDuration);
  const [volume, setVolume] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);

  // Audio source URL points to protected streaming endpoint
  const audioSourceUrl = `/api/audio/${token}`;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      if ("disableRemotePlayback" in audio) {
        audio.disableRemotePlayback = true;
      }
      if (audio.duration && !isNaN(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      if (onTrackEnd) onTrackEnd();
    };

    const handleError = () => {
      setAudioError("Unable to stream preview audio. The link may have expired or been revoked.");
      setIsPlaying(false);
    };

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);

    return () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
    };
  }, [onTrackEnd]);

  // Keyboard controls (Space = Play/Pause, ArrowLeft/Right = seek 5s, M = mute)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture when typing in an input
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.code === "Space") {
        e.preventDefault();
        togglePlay();
      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
        seekBy(-5);
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        seekBy(5);
      } else if (e.code === "KeyM") {
        e.preventDefault();
        toggleMute();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPlaying, isMuted, volume]);

  // Debounced volume popover hover handlers to prevent slider from vanishing
  const handleVolumeMouseEnter = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setShowVolumeSlider(true);
  };

  const handleVolumeMouseLeave = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
    }
    closeTimeoutRef.current = setTimeout(() => {
      setShowVolumeSlider(false);
    }, 350);
  };

  // Close timeout cleanup on unmount
  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  // Click outside volume popover to dismiss
  useEffect(() => {
    if (!showVolumeSlider) return;

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (volumeContainerRef.current && !volumeContainerRef.current.contains(e.target as Node)) {
        setShowVolumeSlider(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [showVolumeSlider]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().then(() => {
        setIsPlaying(true);
      }).catch((err) => {
        console.error("Playback error:", err);
      });
    }
  };

  const handleSeek = (targetTime: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = targetTime;
    setCurrentTime(targetTime);
  };

  const seekBy = (deltaSeconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    const newTime = Math.max(0, Math.min(duration, audio.currentTime + deltaSeconds));
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleVolumeChange = (newVol: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    setVolume(newVol);
    audio.volume = newVol;
    if (newVol > 0 && isMuted) {
      setIsMuted(false);
      audio.muted = false;
    }
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isMuted) {
      audio.muted = false;
      setIsMuted(false);
      audio.volume = volume || 0.85;
    } else {
      audio.muted = true;
      setIsMuted(true);
    }
  };

  const handleVolumeButtonClick = () => {
    toggleMute();
    setShowVolumeSlider(true);
  };

  return (
    <div
      className="w-full select-none"
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Protected HTML5 Audio element */}
      <audio
        ref={audioRef}
        src={audioSourceUrl}
        preload="metadata"
        controlsList="nodownload noplaybackrate"
      />

      {audioError && (
        <div className="mb-4 p-3 bg-red-950/40 border border-red-800/40 rounded text-red-200 text-xs text-center font-mono">
          {audioError}
        </div>
      )}

      {/* Waveform Scrubber */}
      <div className="mb-3">
        <MinimalWaveform
          currentTime={currentTime}
          duration={duration}
          onSeek={handleSeek}
          seed={seed}
        />
      </div>

      {/* Time Display: 00:42 03:47 */}
      <div className="mb-8">
        <TimeDisplay currentTime={currentTime} duration={duration} />
      </div>

      {/* Primary Player Controls: Mathematically Centered & Symmetrical */}
      <div className="relative flex items-center justify-center px-2 py-1">
        {/* Left balance placeholder */}
        <div className="absolute left-0 flex items-center">
          {hasPrevious && onPreviousTrack && (
            <button
              onClick={onPreviousTrack}
              title="Previous Track"
              className="w-11 h-11 flex items-center justify-center rounded-full text-text-muted hover:text-text-primary hover:bg-surface-elevated/70 transition-all focus:outline-none"
            >
              <RotateCcw className="w-4.5 h-4.5" />
            </button>
          )}
        </div>

        {/* Central Playback Cluster: Rewind - Hero Play/Pause - Forward */}
        <div className="flex items-center space-x-6 sm:space-x-8">
          {/* Rewind 10 seconds */}
          <button
            onClick={() => seekBy(-10)}
            title="Rewind 10 seconds (←)"
            aria-label="Rewind 10 seconds"
            className="w-11 h-11 flex items-center justify-center rounded-full text-text-muted hover:text-text-primary hover:bg-surface-elevated/80 transition-all duration-200 focus:outline-none"
          >
            <RotateCcw className="w-5 h-5" />
          </button>

          {/* Central Hero Play / Pause Button */}
          <button
            onClick={togglePlay}
            title={isPlaying ? "Pause (Space)" : "Play (Space)"}
            aria-label={isPlaying ? "Pause" : "Play"}
            className="relative flex items-center justify-center w-14 h-14 rounded-full bg-surface-elevated border border-surface-border hover:border-champagne/60 hover:bg-[#1C1C1C] transition-all duration-200 group focus:outline-none shadow-xl"
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 text-champagne fill-champagne transition-transform group-hover:scale-105" />
            ) : (
              <Play className="w-5 h-5 text-champagne fill-champagne ml-0.5 transition-transform group-hover:scale-105" />
            )}
          </button>

          {/* Forward 10 seconds */}
          <button
            onClick={() => seekBy(10)}
            title="Forward 10 seconds (→)"
            aria-label="Forward 10 seconds"
            className="w-11 h-11 flex items-center justify-center rounded-full text-text-muted hover:text-text-primary hover:bg-surface-elevated/80 transition-all duration-200 focus:outline-none"
          >
            <RotateCw className="w-5 h-5" />
          </button>
        </div>

        {/* Right Anchored: Volume Control with Continuous Hover Bridge */}
        <div
          ref={volumeContainerRef}
          className="absolute right-0 flex items-center"
          onMouseEnter={handleVolumeMouseEnter}
          onMouseLeave={handleVolumeMouseLeave}
        >
          {/* Volume Button */}
          <button
            onClick={handleVolumeButtonClick}
            title={isMuted ? "Unmute (M)" : "Mute (M)"}
            aria-label={isMuted ? "Unmute" : "Mute"}
            className="w-11 h-11 flex items-center justify-center rounded-full text-text-muted hover:text-text-primary hover:bg-surface-elevated/80 transition-all duration-200 focus:outline-none"
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-5 h-5 text-champagne" />
            ) : (
              <Volume2 className="w-5 h-5" />
            )}
          </button>

          {/* Volume Slider Popover in front of volume icon with safe hover bridge */}
          {showVolumeSlider && (
            <div
              className="absolute left-full pl-2.5 top-1/2 -translate-y-1/2 flex items-center z-30"
              onMouseEnter={handleVolumeMouseEnter}
              onMouseLeave={handleVolumeMouseLeave}
            >
              <div className="flex items-center space-x-2 bg-surface-elevated border border-surface-borderLight rounded-full px-3 py-1.5 shadow-2xl backdrop-blur-md animate-fadeIn">
                <input
                  ref={sliderRef}
                  type="range"
                  min="0"
                  max="1"
                  step="0.02"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                  className="w-16 sm:w-20 h-1 bg-surface-border rounded-lg appearance-none cursor-pointer accent-champagne focus:outline-none"
                />
                <span className="text-[10px] font-mono text-champagne w-6 text-right select-none tabular-nums">
                  {Math.round((isMuted ? 0 : volume) * 100)}%
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
