import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { generateAmbientTrack } from "../audio/synth";
import { getAudioStorageProvider } from "../storage";
import { generateListeningToken, hashPassword, verifyPassword } from "./tokens";
import { ListeningLink, LinkStatus, Track, TrackWithLink } from "./types";

const DATA_DIR = path.join(process.cwd(), "storage", "data");
const TRACKS_FILE = path.join(DATA_DIR, "tracks.json");
const LINKS_FILE = path.join(DATA_DIR, "links.json");

function ensureDirectories(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readJson<T>(filePath: string, fallback: T): T {
  ensureDirectories();
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(fallback, null, 2), "utf-8");
    return fallback;
  }
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(filePath: string, data: T): void {
  ensureDirectories();
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

export class DataStore {
  private static instance: DataStore;

  private constructor() {
    ensureDirectories();
  }

  public static getInstance(): DataStore {
    if (!DataStore.instance) {
      DataStore.instance = new DataStore();
    }
    return DataStore.instance;
  }

  // --- Tracks ---

  getTracks(): Track[] {
    return readJson<Track[]>(TRACKS_FILE, []);
  }

  getTrackById(id: string): Track | null {
    const tracks = this.getTracks();
    return tracks.find((t) => t.id === id) || null;
  }

  createTrack(trackData: Omit<Track, "id" | "createdAt">): Track {
    const tracks = this.getTracks();
    const newTrack: Track = {
      id: uuidv4(),
      createdAt: new Date().toISOString(),
      ...trackData,
    };
    tracks.unshift(newTrack);
    writeJson(TRACKS_FILE, tracks);
    return newTrack;
  }

  updateTrack(id: string, updates: Partial<Omit<Track, "id" | "createdAt">>): Track | null {
    const tracks = this.getTracks();
    const index = tracks.findIndex((t) => t.id === id);
    if (index === -1) return null;

    const updated = { ...tracks[index], ...updates };
    tracks[index] = updated;
    writeJson(TRACKS_FILE, tracks);
    return updated;
  }

  async deleteTrack(id: string): Promise<boolean> {
    const tracks = this.getTracks();
    const track = tracks.find((t) => t.id === id);
    if (!track) return false;

    // Delete audio file from storage
    if (track.audioFile) {
      try {
        const storage = getAudioStorageProvider();
        await storage.delete(track.audioFile);
      } catch (err) {
        console.error("Failed to delete audio file:", err);
      }
    }

    const filteredTracks = tracks.filter((t) => t.id !== id);
    writeJson(TRACKS_FILE, filteredTracks);

    // Also delete associated links
    const links = this.getLinks().filter((l) => l.trackId !== id);
    writeJson(LINKS_FILE, links);

    return true;
  }

  // --- Links ---

  getLinks(): ListeningLink[] {
    const links = readJson<ListeningLink[]>(LINKS_FILE, []);
    const now = new Date();
    let changed = false;

    // Automatically check for expiration
    for (const link of links) {
      if (link.status === "ACTIVE" && link.expiresAt) {
        if (new Date(link.expiresAt) <= now) {
          link.status = "EXPIRED";
          changed = true;
        }
      }
    }

    if (changed) {
      writeJson(LINKS_FILE, links);
    }

    return links;
  }

  getLinkByToken(token: string): ListeningLink | null {
    const links = this.getLinks();
    return links.find((l) => l.token.toUpperCase() === token.toUpperCase()) || null;
  }

  getLinkByTrackId(trackId: string): ListeningLink | null {
    const links = this.getLinks();
    return links.find((l) => l.trackId === trackId) || null;
  }

  createLink(params: {
    trackId: string;
    password?: string;
    expiresAt?: string | null;
  }): ListeningLink {
    const links = this.getLinks();
    // Revoke any existing active link for this track if necessary, or create new one
    const token = generateListeningToken();
    const hasPassword = Boolean(params.password && params.password.trim().length > 0);
    const passwordHash = hasPassword ? hashPassword(params.password!.trim()) : undefined;

    const newLink: ListeningLink = {
      id: uuidv4(),
      trackId: params.trackId,
      token,
      hasPassword,
      passwordHash,
      expiresAt: params.expiresAt || null,
      status: "ACTIVE",
      createdAt: new Date().toISOString(),
    };

    // Remove older link for the same track if you want 1 primary link, or prepend
    const filtered = links.filter((l) => l.trackId !== params.trackId);
    filtered.unshift(newLink);
    writeJson(LINKS_FILE, filtered);

    return newLink;
  }

  updateLink(id: string, updates: Partial<ListeningLink>): ListeningLink | null {
    const links = this.getLinks();
    const link = links.find((l) => l.id === id || l.token === id);
    if (!link) return null;

    Object.assign(link, updates);
    if (updates.status === "REVOKED" && !updates.revokedAt) {
      link.revokedAt = new Date().toISOString();
    }
    writeJson(LINKS_FILE, links);
    return link;
  }

  updateLinkStatus(tokenId: string, status: LinkStatus): ListeningLink | null {
    return this.updateLink(tokenId, { status });
  }

  getTracksWithLinks(): TrackWithLink[] {
    const tracks = this.getTracks();
    const links = this.getLinks();
    return tracks.map((t) => ({
      ...t,
      link: links.find((l) => l.trackId === t.id),
    }));
  }

  verifyLinkAccess(
    token: string,
    providedPassword?: string
  ): {
    allowed: boolean;
    reason?: "NOT_FOUND" | "EXPIRED" | "REVOKED" | "PASSWORD_REQUIRED" | "INVALID_PASSWORD";
    track?: Track;
    link?: ListeningLink;
  } {
    const link = this.getLinkByToken(token);
    if (!link) {
      return { allowed: false, reason: "NOT_FOUND" };
    }

    if (link.status === "REVOKED") {
      return { allowed: false, reason: "REVOKED", link };
    }

    if (link.expiresAt && new Date(link.expiresAt) <= new Date()) {
      if (link.status !== "EXPIRED") {
        this.updateLinkStatus(link.id, "EXPIRED");
      }
      return { allowed: false, reason: "EXPIRED", link };
    }

    const track = this.getTrackById(link.trackId);
    if (!track) {
      return { allowed: false, reason: "NOT_FOUND" };
    }

    if (link.hasPassword && link.passwordHash) {
      if (!providedPassword) {
        return { allowed: false, reason: "PASSWORD_REQUIRED", track, link };
      }
      const isValid = verifyPassword(providedPassword, link.passwordHash);
      if (!isValid) {
        return { allowed: false, reason: "INVALID_PASSWORD", track, link };
      }
    }

    return { allowed: true, track, link };
  }

  // --- Demo Seeding ---

  async seedDemoTracks(): Promise<void> {
    const tracks = this.getTracks();
    if (tracks.length > 0) return;

    console.log("Seeding realistic Motion Pulse demo tracks...");
    const storage = getAudioStorageProvider();

    // Track 1: After Midnight
    const audioBuf1 = generateAmbientTrack(48, [164.81, 196.0, 246.94, 293.66], 68);
    const uploaded1 = await storage.upload(audioBuf1, "after-midnight-demo.wav", "audio/wav");
    const track1 = this.createTrack({
      title: "After Midnight",
      artist: "Demo Artist",
      composer: "Motion Pulse Studio",
      project: "Motion Pulse Demo",
      description: "Confidential late-night ambient chord exploration for upcoming score.",
      artwork: "/artwork/sample-01.svg",
      audioFile: uploaded1.key,
      duration: 48,
    });
    this.createLink({
      trackId: track1.id,
      expiresAt: null,
    });

    // Track 2: Tere Bina (Arijit Demo)
    const audioBuf2 = generateAmbientTrack(54, [220, 261.63, 329.63, 392.0], 74);
    const uploaded2 = await storage.upload(audioBuf2, "tere-bina-arijit-demo.wav", "audio/wav");
    const track2 = this.createTrack({
      title: "Tere Bina",
      artist: "Arijit Demo",
      composer: "Pritam & Motion Pulse",
      project: "Motion Pulse India",
      description: "Exclusive acoustic vocal preview for Bollywood feature film pitch.",
      artwork: "/artwork/sample-02.svg",
      audioFile: uploaded2.key,
      duration: 54,
    });
    this.createLink({
      trackId: track2.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(), // 7 days
    });

    // Track 3: Horizon Echoes
    const audioBuf3 = generateAmbientTrack(60, [146.83, 174.61, 220, 261.63], 60);
    const uploaded3 = await storage.upload(audioBuf3, "horizon-echoes.wav", "audio/wav");
    const track3 = this.createTrack({
      title: "Horizon Echoes",
      artist: "Cinematic Suite",
      composer: "Motion Pulse Collective",
      project: "Confidential Film Score",
      description: "Atmospheric pulse and tension build for trailer placement.",
      artwork: "/artwork/sample-04.svg",
      audioFile: uploaded3.key,
      duration: 60,
    });
    this.createLink({
      trackId: track3.id,
      password: "demo",
      expiresAt: null,
    });

    console.log("Demo tracks seeded successfully.");
  }
}
