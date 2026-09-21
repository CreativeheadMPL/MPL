import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { generateListeningToken, hashPassword, verifyPassword } from "./tokens";
import { ListeningLink, LinkStatus, Track, TrackWithLink } from "./types";
import {
  isSupabaseConfigured,
  fetchTracksFromSupabase,
  fetchTrackByIdFromSupabase,
  insertTrackToSupabase,
  updateTrackInSupabase,
  deleteTrackFromSupabase,
  fetchLinksFromSupabase,
  fetchLinkByTokenFromSupabase,
  insertLinkToSupabase,
  updateLinkInSupabase,
  fetchTracksWithLinksFromSupabase,
} from "../supabase/db";

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

  public isUsingSupabase(): boolean {
    return isSupabaseConfigured();
  }

  // --- Tracks ---

  async getTracks(): Promise<Track[]> {
    if (this.isUsingSupabase()) {
      return await fetchTracksFromSupabase();
    }
    return readJson<Track[]>(TRACKS_FILE, []);
  }

  async getTrackById(id: string): Promise<Track | null> {
    if (this.isUsingSupabase()) {
      return await fetchTrackByIdFromSupabase(id);
    }
    const tracks = readJson<Track[]>(TRACKS_FILE, []);
    return tracks.find((t) => t.id === id) || null;
  }

  async createTrack(trackData: Omit<Track, "id" | "createdAt">): Promise<Track> {
    const id = uuidv4();
    const createdAt = new Date().toISOString();

    if (this.isUsingSupabase()) {
      const inserted = await insertTrackToSupabase({
        id,
        createdAt,
        ...trackData,
      });
      if (inserted) return inserted;
    }

    const tracks = readJson<Track[]>(TRACKS_FILE, []);
    const newTrack: Track = {
      id,
      createdAt,
      ...trackData,
    };
    tracks.unshift(newTrack);
    writeJson(TRACKS_FILE, tracks);
    return newTrack;
  }

  async updateTrack(
    id: string,
    updates: Partial<Omit<Track, "id" | "createdAt">>
  ): Promise<Track | null> {
    if (this.isUsingSupabase()) {
      const updated = await updateTrackInSupabase(id, updates);
      if (updated) return updated;
    }

    const tracks = readJson<Track[]>(TRACKS_FILE, []);
    const index = tracks.findIndex((t) => t.id === id);
    if (index === -1) return null;

    const updated = { ...tracks[index], ...updates };
    tracks[index] = updated;
    writeJson(TRACKS_FILE, tracks);
    return updated;
  }

  async deleteTrack(id: string): Promise<boolean> {
    if (this.isUsingSupabase()) {
      await deleteTrackFromSupabase(id);
    }

    const tracks = readJson<Track[]>(TRACKS_FILE, []);
    const filteredTracks = tracks.filter((t) => t.id !== id);
    writeJson(TRACKS_FILE, filteredTracks);

    // Also delete associated links
    const links = readJson<ListeningLink[]>(LINKS_FILE, []);
    const filteredLinks = links.filter((l) => l.trackId !== id);
    writeJson(LINKS_FILE, filteredLinks);

    return true;
  }

  // --- Links ---

  async getLinks(): Promise<ListeningLink[]> {
    if (this.isUsingSupabase()) {
      return await fetchLinksFromSupabase();
    }

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

  async getLinkByToken(token: string): Promise<ListeningLink | null> {
    if (this.isUsingSupabase()) {
      return await fetchLinkByTokenFromSupabase(token);
    }
    const links = await this.getLinks();
    return links.find((l) => l.token.toUpperCase() === token.toUpperCase()) || null;
  }

  async getLinkByTrackId(trackId: string): Promise<ListeningLink | null> {
    const links = await this.getLinks();
    return links.find((l) => l.trackId === trackId) || null;
  }

  async createLink(params: {
    trackId: string;
    password?: string;
    expiresAt?: string | null;
  }): Promise<ListeningLink> {
    const id = uuidv4();
    const token = generateListeningToken();
    const hasPassword = Boolean(params.password && params.password.trim().length > 0);
    const passwordHash = hasPassword ? hashPassword(params.password!.trim()) : undefined;
    const createdAt = new Date().toISOString();

    const newLink: ListeningLink = {
      id,
      trackId: params.trackId,
      token,
      hasPassword,
      passwordHash,
      expiresAt: params.expiresAt || null,
      status: "ACTIVE",
      createdAt,
    };

    if (this.isUsingSupabase()) {
      const inserted = await insertLinkToSupabase(newLink);
      if (inserted) return inserted;
    }

    const links = readJson<ListeningLink[]>(LINKS_FILE, []);
    const filtered = links.filter((l) => l.trackId !== params.trackId);
    filtered.unshift(newLink);
    writeJson(LINKS_FILE, filtered);

    return newLink;
  }

  async updateLink(
    id: string,
    updates: Partial<ListeningLink>
  ): Promise<ListeningLink | null> {
    if (updates.status === "REVOKED" && !updates.revokedAt) {
      updates.revokedAt = new Date().toISOString();
    }

    if (this.isUsingSupabase()) {
      const updated = await updateLinkInSupabase(id, updates);
      if (updated) return updated;
    }

    const links = readJson<ListeningLink[]>(LINKS_FILE, []);
    const link = links.find((l) => l.id === id || l.token === id);
    if (!link) return null;

    Object.assign(link, updates);
    writeJson(LINKS_FILE, links);
    return link;
  }

  async updateLinkStatus(tokenId: string, status: LinkStatus): Promise<ListeningLink | null> {
    return this.updateLink(tokenId, { status });
  }

  async getTracksWithLinks(): Promise<TrackWithLink[]> {
    if (this.isUsingSupabase()) {
      return await fetchTracksWithLinksFromSupabase();
    }

    const tracks = await this.getTracks();
    const links = await this.getLinks();
    return tracks.map((t) => ({
      ...t,
      link: links.find((l) => l.trackId === t.id),
    }));
  }

  async verifyLinkAccess(
    token: string,
    providedPassword?: string
  ): Promise<{
    allowed: boolean;
    reason?: "NOT_FOUND" | "EXPIRED" | "REVOKED" | "PASSWORD_REQUIRED" | "INVALID_PASSWORD";
    track?: Track;
    link?: ListeningLink;
  }> {
    const link = await this.getLinkByToken(token);
    if (!link) {
      return { allowed: false, reason: "NOT_FOUND" };
    }

    if (link.status === "REVOKED") {
      return { allowed: false, reason: "REVOKED", link };
    }

    if (link.expiresAt && new Date(link.expiresAt) <= new Date()) {
      if (link.status !== "EXPIRED") {
        await this.updateLinkStatus(link.id, "EXPIRED");
      }
      return { allowed: false, reason: "EXPIRED", link };
    }

    const track = await this.getTrackById(link.trackId);
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
    const tracks = await this.getTracks();
    if (tracks.length > 0) return;

    console.log("Seeding Motion Pulse demo tracks with Google Drive links...");

    // Track 1: After Midnight
    const track1 = await this.createTrack({
      title: "After Midnight",
      artist: "Demo Artist",
      composer: "Motion Pulse Studio",
      project: "Motion Pulse Demo",
      description: "Confidential late-night ambient chord exploration for upcoming score.",
      artwork: "/artwork/sample-01.svg",
      audioFile: "https://drive.google.com/file/d/1_DEMO_AFTER_MIDNIGHT/view?usp=sharing",
      duration: 180,
    });
    await this.createLink({
      trackId: track1.id,
      expiresAt: null,
    });

    // Track 2: Tere Bina
    const track2 = await this.createTrack({
      title: "Tere Bina",
      artist: "Arijit Demo",
      composer: "Pritam & Motion Pulse",
      project: "Motion Pulse India",
      description: "Exclusive acoustic vocal preview for Bollywood feature film pitch.",
      artwork: "/artwork/sample-02.svg",
      audioFile: "https://drive.google.com/file/d/1_DEMO_TERE_BINA/view?usp=sharing",
      duration: 210,
    });
    await this.createLink({
      trackId: track2.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
    });

    // Track 3: Horizon Echoes
    const track3 = await this.createTrack({
      title: "Horizon Echoes",
      artist: "Cinematic Suite",
      composer: "Motion Pulse Collective",
      project: "Confidential Film Score",
      description: "Atmospheric pulse and tension build for trailer placement.",
      artwork: "/artwork/sample-04.svg",
      audioFile: "https://drive.google.com/file/d/1_DEMO_HORIZON_ECHOES/view?usp=sharing",
      duration: 165,
    });
    await this.createLink({
      trackId: track3.id,
      password: "demo",
      expiresAt: null,
    });
  }
}
