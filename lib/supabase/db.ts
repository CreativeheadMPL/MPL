import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { ListeningLink, Track, TrackWithLink } from "../data/types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function isSupabaseConfigured(): boolean {
  if (!supabaseUrl || !supabaseKey) return false;
  if (
    supabaseUrl.includes("your-project") ||
    supabaseKey.includes("your-supabase") ||
    supabaseKey.includes("your-service-role")
  ) {
    return false;
  }
  return true;
}

let supabaseInstance: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) {
    return null;
  }
  if (!supabaseInstance) {
    supabaseInstance = createClient(supabaseUrl!, supabaseKey!, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return supabaseInstance;
}

// Map Database row to Track interface
interface DbTrackRow {
  id: string;
  title: string;
  artist: string;
  composer: string | null;
  project: string | null;
  description: string | null;
  artwork: string;
  audio_file: string;
  duration: number;
  created_at: string;
}

interface DbLinkRow {
  id: string;
  track_id: string;
  token: string;
  has_password: boolean;
  password_hash: string | null;
  expires_at: string | null;
  status: "ACTIVE" | "EXPIRED" | "REVOKED";
  created_at: string;
  revoked_at: string | null;
}

function mapTrack(row: DbTrackRow): Track {
  return {
    id: row.id,
    title: row.title,
    artist: row.artist,
    composer: row.composer || undefined,
    project: row.project || undefined,
    description: row.description || undefined,
    artwork: row.artwork,
    audioFile: row.audio_file,
    duration: row.duration || 180,
    createdAt: row.created_at,
  };
}

function mapLink(row: DbLinkRow): ListeningLink {
  return {
    id: row.id,
    trackId: row.track_id,
    token: row.token,
    hasPassword: row.has_password,
    passwordHash: row.password_hash || undefined,
    expiresAt: row.expires_at,
    status: row.status,
    createdAt: row.created_at,
    revokedAt: row.revoked_at || undefined,
  };
}

export async function fetchTracksFromSupabase(): Promise<Track[]> {
  const sb = getSupabase();
  if (!sb) return [];

  const { data, error } = await sb
    .from("tracks")
    .select("*")
    .order("created_at", { ascending: false });

  if (error || !data) {
    console.error("Supabase fetchTracks error:", error);
    return [];
  }

  return (data as DbTrackRow[]).map(mapTrack);
}

export async function fetchTrackByIdFromSupabase(id: string): Promise<Track | null> {
  const sb = getSupabase();
  if (!sb) return null;

  const { data, error } = await sb
    .from("tracks")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    return null;
  }

  return mapTrack(data as DbTrackRow);
}

export async function insertTrackToSupabase(
  track: Omit<Track, "id" | "createdAt"> & { id?: string; createdAt?: string }
): Promise<Track | null> {
  const sb = getSupabase();
  if (!sb) return null;

  const payload: Partial<DbTrackRow> = {
    title: track.title,
    artist: track.artist,
    composer: track.composer || null,
    project: track.project || null,
    description: track.description || null,
    artwork: track.artwork,
    audio_file: track.audioFile,
    duration: track.duration,
  };

  if (track.id) payload.id = track.id;
  if (track.createdAt) payload.created_at = track.createdAt;

  const { data, error } = await sb
    .from("tracks")
    .insert([payload])
    .select()
    .single();

  if (error || !data) {
    console.error("Supabase insertTrack error:", error);
    return null;
  }

  return mapTrack(data as DbTrackRow);
}

export async function updateTrackInSupabase(
  id: string,
  updates: Partial<Omit<Track, "id" | "createdAt">>
): Promise<Track | null> {
  const sb = getSupabase();
  if (!sb) return null;

  const payload: Record<string, unknown> = {};
  if (updates.title !== undefined) payload.title = updates.title;
  if (updates.artist !== undefined) payload.artist = updates.artist;
  if (updates.composer !== undefined) payload.composer = updates.composer;
  if (updates.project !== undefined) payload.project = updates.project;
  if (updates.description !== undefined) payload.description = updates.description;
  if (updates.artwork !== undefined) payload.artwork = updates.artwork;
  if (updates.audioFile !== undefined) payload.audio_file = updates.audioFile;
  if (updates.duration !== undefined) payload.duration = updates.duration;

  const { data, error } = await sb
    .from("tracks")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error || !data) {
    console.error("Supabase updateTrack error:", error);
    return null;
  }

  return mapTrack(data as DbTrackRow);
}

export async function deleteTrackFromSupabase(id: string): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;

  const { error } = await sb.from("tracks").delete().eq("id", id);
  if (error) {
    console.error("Supabase deleteTrack error:", error);
    return false;
  }
  return true;
}

export async function fetchLinksFromSupabase(): Promise<ListeningLink[]> {
  const sb = getSupabase();
  if (!sb) return [];

  const { data, error } = await sb
    .from("links")
    .select("*")
    .order("created_at", { ascending: false });

  if (error || !data) {
    console.error("Supabase fetchLinks error:", error);
    return [];
  }

  return (data as DbLinkRow[]).map(mapLink);
}

export async function fetchLinkByTokenFromSupabase(
  token: string
): Promise<ListeningLink | null> {
  const sb = getSupabase();
  if (!sb) return null;

  const { data, error } = await sb
    .from("links")
    .select("*")
    .eq("token", token)
    .single();

  if (error || !data) {
    return null;
  }

  return mapLink(data as DbLinkRow);
}

export async function insertLinkToSupabase(
  link: Omit<ListeningLink, "id" | "createdAt"> & { id?: string; createdAt?: string }
): Promise<ListeningLink | null> {
  const sb = getSupabase();
  if (!sb) return null;

  const payload: Partial<DbLinkRow> = {
    track_id: link.trackId,
    token: link.token,
    has_password: link.hasPassword,
    password_hash: link.passwordHash || null,
    expires_at: link.expiresAt,
    status: link.status,
  };

  if (link.id) payload.id = link.id;
  if (link.createdAt) payload.created_at = link.createdAt;

  const { data, error } = await sb
    .from("links")
    .insert([payload])
    .select()
    .single();

  if (error || !data) {
    console.error("Supabase insertLink error:", error);
    return null;
  }

  return mapLink(data as DbLinkRow);
}

export async function updateLinkInSupabase(
  linkId: string,
  updates: Partial<Omit<ListeningLink, "id" | "createdAt">>
): Promise<ListeningLink | null> {
  const sb = getSupabase();
  if (!sb) return null;

  const payload: Record<string, unknown> = {};
  if (updates.status !== undefined) payload.status = updates.status;
  if (updates.expiresAt !== undefined) payload.expires_at = updates.expiresAt;
  if (updates.hasPassword !== undefined) payload.has_password = updates.hasPassword;
  if (updates.passwordHash !== undefined) payload.password_hash = updates.passwordHash;
  if (updates.revokedAt !== undefined) payload.revoked_at = updates.revokedAt;
  if (updates.token !== undefined) payload.token = updates.token;

  const { data, error } = await sb
    .from("links")
    .update(payload)
    .eq("id", linkId)
    .select()
    .single();

  if (error || !data) {
    console.error("Supabase updateLink error:", error);
    return null;
  }

  return mapLink(data as DbLinkRow);
}

export async function fetchTracksWithLinksFromSupabase(): Promise<TrackWithLink[]> {
  const [tracks, links] = await Promise.all([
    fetchTracksFromSupabase(),
    fetchLinksFromSupabase(),
  ]);

  const linksByTrackId = new Map<string, ListeningLink>();
  for (const l of links) {
    if (!linksByTrackId.has(l.trackId)) {
      linksByTrackId.set(l.trackId, l);
    }
  }

  return tracks.map((t) => ({
    ...t,
    link: linksByTrackId.get(t.id),
  }));
}
