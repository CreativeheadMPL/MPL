"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

interface MinimalWaveformProps {
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  seed?: string;
  className?: string;
}

export const MinimalWaveform: React.FC<MinimalWaveformProps> = ({
  currentTime,
  duration,
  onSeek,
  seed = "motion-pulse",
  className = "",
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [hoverFraction, setHoverFraction] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Generate deterministic pseudo-random heights for 100 bars based on track seed
  const barCount = 100;
  const barHeights = useMemo(() => {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = (hash << 5) - hash + seed.charCodeAt(i);
      hash |= 0;
    }
    const heights: number[] = [];
    for (let i = 0; i < barCount; i++) {
      // Natural music waveform profile: quiet intro, dynamic body, gentle outro
      const progress = i / barCount;
      const envelope = Math.sin(Math.PI * progress);
      const pseudoRand = Math.abs(Math.sin(hash * 0.123 + i * 0.456 + progress * 7.89));
      const height = Math.max(0.12, Math.min(0.95, (0.2 + 0.8 * pseudoRand) * envelope));
      heights.push(height);
    }
    return heights;
  }, [seed]);

  // Render canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, rect.width, rect.height);

    const playFraction = duration > 0 ? Math.min(1, Math.max(0, currentTime / duration)) : 0;
    const width = rect.width;
    const height = rect.height;
    const totalBars = barHeights.length;
    const barWidth = Math.max(1.5, (width / totalBars) * 0.55);
    const gap = (width - totalBars * barWidth) / (totalBars - 1);

    for (let i = 0; i < totalBars; i++) {
      const x = i * (barWidth + gap);
      const barHeightFraction = barHeights[i];
      const barH = Math.max(4, barHeightFraction * height);
      const y = (height - barH) / 2;

      const barFraction = (i + 0.5) / totalBars;
      const isPlayed = barFraction <= playFraction;
      const isHovered = hoverFraction !== null && barFraction <= hoverFraction;

      if (isPlayed) {
        ctx.fillStyle = "#D4C5A5"; // Warm subtle champagne
      } else if (isHovered) {
        ctx.fillStyle = "#555248";
      } else {
        ctx.fillStyle = "#222222"; // Dark grey unplayed
      }

      // Draw subtle rounded bar
      ctx.beginPath();
      const radius = barWidth / 2;
      ctx.roundRect(x, y, barWidth, barH, radius);
      ctx.fill();
    }
  }, [currentTime, duration, hoverFraction, barHeights]);

  // Scrubbing & click handlers
  const handleSeekEvent = (e: React.MouseEvent<HTMLDivElement> | MouseEvent) => {
    if (!containerRef.current || duration <= 0) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const fraction = clickX / rect.width;
    onSeek(fraction * duration);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
    handleSeekEvent(e);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    setHoverFraction(mouseX / rect.width);
    if (isDragging) {
      handleSeekEvent(e);
    }
  };

  const handleMouseLeave = () => {
    if (!isDragging) {
      setHoverFraction(null);
    }
  };

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsDragging(false);
      setHoverFraction(null);
    };
    window.addEventListener("mouseup", handleGlobalMouseUp);
    return () => window.removeEventListener("mouseup", handleGlobalMouseUp);
  }, []);

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative w-full h-12 flex items-center cursor-pointer group select-none ${className}`}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
        style={{ width: "100%", height: "48px" }}
      />
      
      {/* Subtle playhead indicator line */}
      {duration > 0 && (
        <div
          className="absolute top-1/2 -translate-y-1/2 w-1.5 h-6 bg-champagne rounded-full shadow-[0_0_8px_rgba(212,197,165,0.4)] pointer-events-none transition-all duration-75"
          style={{
            left: `calc(${(currentTime / duration) * 100}% - 3px)`,
          }}
        />
      )}
    </div>
  );
};
