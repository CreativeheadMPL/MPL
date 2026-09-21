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
  onPreviousTrack,
  onNextTrack,
  hasPrevious = false,
  hasNext = false,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
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
  }, []);

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
      audio.volume = volume || 0.8;
    } else {
      audio.muted = true;
      setIsMuted(true);
    }
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
        // Prevent browser default download options
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

      {/* Primary Player Controls */}
      <div className="flex items-center justify-between px-2">
        {/* Previous Track / Rewind */}
        <button
          onClick={hasPrevious && onPreviousTrack ? onPreviousTrack : () => seekBy(-10)}
          title={hasPrevious ? "Previous Track" : "Rewind 10 seconds"}
          className="text-text-muted hover:text-text-primary transition-colors duration-200 p-2 focus:outline-none"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        {/* Center: Hero Play/Pause Toggle */}
        <button
          onClick={togglePlay}
          title={isPlaying ? "Pause (Space)" : "Play (Space)"}
          className="relative flex items-center justify-center w-14 h-14 rounded-full bg-surface-elevated border border-surface-border hover:border-champagne/50 hover:bg-[#1C1C1C] transition-all duration-300 group focus:outline-none shadow-lg"
        >
          {isPlaying ? (
            <Pause className="w-5 h-5 text-champagne fill-champagne transition-transform group-hover:scale-105" />
          ) : (
            <Play className="w-5 h-5 text-champagne fill-champagne ml-0.5 transition-transform group-hover:scale-105" />
          )}
        </button>

        {/* Next Track / Forward */}
        <button
          onClick={hasNext && onNextTrack ? onNextTrack : () => seekBy(10)}
          title={hasNext ? "Next Track" : "Forward 10 seconds"}
          className="text-text-muted hover:text-text-primary transition-colors duration-200 p-2 focus:outline-none"
        >
          <RotateCw className="w-4 h-4" />
        </button>

        {/* Volume & Mute Scrub */}
        <div
          className="relative flex items-center"
          onMouseEnter={() => setShowVolumeSlider(true)}
          onMouseLeave={() => setShowVolumeSlider(false)}
        >
          <button
            onClick={toggleMute}
            title={isMuted ? "Unmute (M)" : "Mute (M)"}
            className="text-text-muted hover:text-text-primary transition-colors duration-200 p-2 focus:outline-none"
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>

          {/* Minimal popup/horizontal volume slider */}
          {showVolumeSlider && (
            <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 flex items-center bg-surface-elevated border border-surface-border rounded-full px-3 py-1.5 shadow-xl animate-fadeIn">
              <input
                type="range"
                min="0"
                max="1"
                step="0.02"
                value={isMuted ? 0 : volume}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                className="w-16 h-1 bg-surface-border rounded-lg appearance-none cursor-pointer accent-champagne"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
