export interface EpisodeItem {
  number: number;
  id: string; // pre-formatted target identifier path key
  audio?: "sub" | "dub";
  title?: string;
  image?: string;
  airDate?: string;
}

export interface ProviderEpisodes {
  episodes: {
    sub?: EpisodeItem[];
    dub?: EpisodeItem[];
  };
}

/**
 * Consolidated responses from Step 1: GET http://217.60.252.213:4000/episodes/:anilistId
 */
export type ConsolidatedProviderMapsResponse = Record<string, ProviderEpisodes>;

export interface LiveStreamSource {
  url: string;
  type: string; // "hls" | "mp4"
  quality: string;
  headers?: Record<string, string>;
  referer?: string;
  userAgent?: string;
}

/**
 * Streaming response from Step 2: GET http://217.60.252.213:4000/:id
 */
export interface AbsoluteStreamPlaylistResponse {
  streams: LiveStreamSource[];
  subtitles?: Array<{ url: string; lang: string }>;
  intro?: { start: number; end: number };
  outro?: { start: number; end: number };
}
