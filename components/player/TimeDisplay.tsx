import React from "react";

interface TimeDisplayProps {
  currentTime: number;
  duration: number;
  className?: string;
}

export function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export const TimeDisplay: React.FC<TimeDisplayProps> = ({
  currentTime,
  duration,
  className = "",
}) => {
  return (
    <div
      className={`flex items-center justify-between text-xs tracking-widest font-mono text-text-muted select-none ${className}`}
    >
      <span>{formatTime(currentTime)}</span>
      <span>{formatTime(duration)}</span>
    </div>
  );
};
