import type { Metadata } from "next";
import { cookies } from "next/headers";
import Image from "next/image";
import { CustomAudioPlayer } from "@/components/player/CustomAudioPlayer";
import { ArtworkCard } from "@/components/ui/ArtworkCard";
import { PasswordGate } from "@/components/ui/PasswordGate";
import { StatusBanner } from "@/components/ui/StatusBanner";
import { DataStore } from "@/lib/data/store";

interface PageProps {
  params: { token: string };
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const store = DataStore.getInstance();
  await store.seedDemoTracks();
  const link = await store.getLinkByToken(params.token);
  const track = link ? await store.getTrackById(link.trackId) : null;

  const trackTitle = track ? track.title : "Private Audio Preview";
  const artistName = track ? track.artist : "Motion Pulse";
  const artwork = track ? track.artwork : "/artwork/default.svg";

  return {
    title: `${trackTitle} — MOTION PULSE SAMPLE SPACE`,
    description: `Private Listening Preview. Confidential sample by ${artistName}.`,
    robots: {
      index: false,
      follow: false,
      nocache: true,
      googleBot: {
        index: false,
        follow: false,
        noimageindex: true,
        noarchive: true,
      },
    },
    openGraph: {
      title: "MOTION PULSE SAMPLE SPACE",
      description: `${trackTitle} — Private Listening Preview`,
      images: [
        {
          url: artwork,
          width: 800,
          height: 800,
          alt: trackTitle,
        },
      ],
      type: "music.song",
    },
  };
}

export default async function ListenerPage({ params }: PageProps) {
  const token = params.token;
  const store = DataStore.getInstance();
  await store.seedDemoTracks();

  const accessCookie = cookies().get(`mp_pass_${token}`)?.value;
  const result = await store.verifyLinkAccess(token, accessCookie);

  // Link not found
  if (result.reason === "NOT_FOUND") {
    return <StatusBanner status="NOT_FOUND" />;
  }

  // Link revoked
  if (result.reason === "REVOKED") {
    return <StatusBanner status="REVOKED" />;
  }

  // Link expired
  if (result.reason === "EXPIRED") {
    return <StatusBanner status="EXPIRED" />;
  }

  // Link password protected and not yet unlocked
  if (result.reason === "PASSWORD_REQUIRED" || result.reason === "INVALID_PASSWORD") {
    return <PasswordGate token={token} />;
  }

  const track = result.track!;
  const link = result.link!;

  return (
    <main className="min-h-screen flex flex-col justify-between px-6 py-8 md:px-12 md:py-10 bg-background text-text-primary">
      {/* 8. Top Navigation / Header */}
      <header className="w-full flex items-center justify-between text-xs tracking-widest font-semibold uppercase text-text-secondary select-none">
        {/* Top left: MOTION PULSE */}
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
        </div>

        {/* Top right: SAMPLE SPACE */}
        <div className="flex items-center space-x-2">
          <span className="text-champagne font-mono text-[11px] tracking-[0.3em]">
            SAMPLE SPACE
          </span>
        </div>
      </header>

      {/* 8. Digital Listening Card (Center) */}
      <div className="w-full max-w-md mx-auto my-auto py-8 md:py-12 flex flex-col items-center animate-fadeIn">
        {/* [ LARGE SQUARE ARTWORK ] */}
        <div className="mb-8 w-full flex justify-center">
          <ArtworkCard artworkUrl={track.artwork} title={track.title} priority />
        </div>

        {/* Track Title */}
        <h1 className="text-2xl sm:text-3xl font-normal tracking-tight text-text-primary text-center mb-2">
          {track.title}
        </h1>

        {/* Artist / Composer */}
        <p className="text-sm font-light text-text-secondary text-center tracking-wide mb-1">
          {track.artist}
          {track.composer && (
            <span className="text-text-muted"> · {track.composer}</span>
          )}
        </p>

        {/* Optional Project / Film Name */}
        {track.project && (
          <p className="text-xs uppercase tracking-[0.2em] text-champagne/80 text-center mb-8 font-medium">
            {track.project}
          </p>
        )}

        {/* Custom Audio Player with Minimal Waveform */}
        <div className="w-full mt-2">
          <CustomAudioPlayer
            token={token}
            seed={track.id}
            initialDuration={track.duration || 180}
          />
        </div>

        {/* Below Player Microcopy */}
        <div className="mt-10 text-center select-none">
          <p className="text-[11px] uppercase tracking-[0.3em] text-champagne font-semibold mb-1">
            PRIVATE PREVIEW
          </p>
          <p className="text-xs text-text-muted tracking-wider">
            Confidential Motion Pulse sample. Listening only.
          </p>
        </div>
      </div>

      {/* 8. Bottom Footer: MOTION PULSE INDIA */}
      <footer className="w-full text-center text-[10px] tracking-[0.35em] uppercase text-text-faint select-none">
        MOTION PULSE INDIA
      </footer>
    </main>
  );
}
