import React from "react";
import Image from "next/image";

interface ArtworkCardProps {
  artworkUrl: string;
  title: string;
  className?: string;
  priority?: boolean;
}

export const ArtworkCard: React.FC<ArtworkCardProps> = ({
  artworkUrl,
  title,
  className = "",
  priority = true,
}) => {
  return (
    <div
      className={`relative mx-auto w-[72vw] max-w-[340px] sm:max-w-[380px] md:max-w-[400px] aspect-square rounded-sm overflow-hidden bg-surface border border-surface-borderLight/60 shadow-[0_20px_50px_rgba(0,0,0,0.8)] transition-all duration-700 select-none ${className}`}
    >
      <Image
        src={artworkUrl}
        alt={`${title} artwork`}
        fill
        sizes="(max-width: 640px) 72vw, 400px"
        priority={priority}
        className="object-cover transition-opacity duration-700"
        unoptimized
      />
      {/* Subtle fine editorial edge sheen */}
      <div className="absolute inset-0 pointer-events-none ring-1 ring-inset ring-white/5" />
    </div>
  );
};
