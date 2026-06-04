// Centralized API Configuration for Frontend Hosting Parity
// Allows deploying frontends to Cloudflare Pages while pointing to any backend server.

function resolveBackendUrl(): string {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) return envUrl;

  if (typeof window !== 'undefined' && window.location) {
    const origin = window.location.origin;
    if (origin && origin !== 'null') {
      if (origin.includes('.run.app') || origin.includes('localhost') || origin.includes('127.0.0.1')) {
        return origin;
      }
    }
    try {
      const href = window.location.href;
      if (href.includes('ais-dev')) {
        return 'https://ais-dev-kyvvoxeb2asjm65vu4oxou-375267897647.asia-east1.run.app';
      }
      if (href.includes('ais-pre')) {
        return 'https://ais-pre-kyvvoxeb2asjm65vu4oxou-375267897647.asia-east1.run.app';
      }
    } catch (e) {}
  }

  if (import.meta.env.DEV) {
    return 'https://ais-dev-kyvvoxeb2asjm65vu4oxou-375267897647.asia-east1.run.app';
  }

  return 'https://ais-pre-kyvvoxeb2asjm65vu4oxou-375267897647.asia-east1.run.app';
}

export const API_BASE = resolveBackendUrl();

export function getApiUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  // Ensure we don't double slash if the path has one
  if (cleanPath.startsWith('/api/') && API_BASE.endsWith('/api')) {
    return `${API_BASE}${cleanPath.substring(4)}`;
  }
  return `${API_BASE}${cleanPath}`;
}

export interface AnimeEpisode {
  id: string;
  number: number;
  title?: string | null;
  image?: string | null;
  airDate?: string | null;
  duration?: number | null;
  description?: string | null;
}

export interface AnimeStream {
  url: string;
  type: string; // "hls" | "mp4"
  quality: string;
  server?: string;
  translationType?: 'sub' | 'dub';
  audio?: string;
  fansub?: string;
}

export interface AnimeWatchResponse {
  streams?: AnimeStream[];
  subtitles?: any[];
  intro?: {
    start: number;
    end: number;
  };
  outro?: {
    start: number;
    end: number;
  };
}

export interface AnimeEpisodesResponse {
  mappings?: {
    anilistId?: number;
  };
  providers?: Record<string, {
    episodes?: {
      sub?: AnimeEpisode[];
      dub?: AnimeEpisode[];
    };
  }>;
}

/**
 * Fetches episodes from our custom full-stack endpoint on the backend.
 */
export async function fetchEpisodes(anilistId: number, animeTitle?: string): Promise<AnimeEpisodesResponse> {
  const url = getApiUrl(`/api/anime/episodes/${anilistId}?title=${encodeURIComponent(animeTitle || "Anime")}`);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Episodes retrieval failed: ${res.statusText}`);
  }

  const data = await res.json() as AnimeEpisodesResponse;
  if (!data || !data.providers) {
    throw new Error('Invalid episodes response structure');
  }

  // Sort episodes in ascending order
  Object.values(data.providers).forEach((provider: any) => {
    if (provider.episodes) {
      if (Array.isArray(provider.episodes.sub)) {
        provider.episodes.sub.sort((a: any, b: any) => a.number - b.number);
      }
      if (Array.isArray(provider.episodes.dub)) {
        provider.episodes.dub.sort((a: any, b: any) => a.number - b.number);
      }
    }
  });

  return data;
}

/**
 * Fetches streaming sources from our custom full-stack endpoint.
 */
export async function fetchStreamSources(watchId: string, animeTitle?: string): Promise<AnimeWatchResponse> {
  const url = getApiUrl(`/api/anime/sources?watchId=${encodeURIComponent(watchId)}&title=${encodeURIComponent(animeTitle || "Anime")}`);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Sources request failed: ${res.statusText}`);
  }

  const data = await res.json() as AnimeWatchResponse;
  if (!data || !data.streams || !Array.isArray(data.streams)) {
    throw new Error('Invalid sources response format: streams list expected');
  }

  const isDub = watchId.toLowerCase().includes('/dub/');

  // Standardize streams to match AnimeStream interface
  const formattedStreams: AnimeStream[] = data.streams.map((stream: any, index: number) => {
    return {
      url: stream.url,
      originalUrl: stream.originalUrl,
      type: stream.type || 'hls',
      quality: stream.quality || '1080p',
      server: stream.server || `Source ${index + 1}`,
      translationType: stream.translationType || (isDub ? 'dub' : 'sub'),
      audio: stream.audio,
      fansub: stream.fansub,
      provider: stream.provider
    };
  });

  return {
    streams: formattedStreams,
    subtitles: data.subtitles || [],
    intro: data.intro || undefined,
    outro: data.outro || undefined
  };
}

/**
 * Clean alias targeting the Port 4000 layout as specified in requirements.
 */
export const getStreamingSource = fetchStreamSources;

/**
 * Resolves the final playable stream URL passing through our CORS proxy if needed.
 */
export async function resolveM3u8(streamUrl: string): Promise<string> {
  if (!streamUrl) {
    throw new Error('Missing stream URL to resolve');
  }

  if (streamUrl.startsWith('/api/proxy') || streamUrl.includes('/api/proxy')) {
    return getApiUrl(streamUrl);
  }

  return streamUrl;
}
