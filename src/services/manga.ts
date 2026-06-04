/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AnimeMedia, PageInfo } from './anilist';

export interface MangaMedia extends AnimeMedia {
  chaptersCount?: number | null;
  volumes?: number | null;
}

export interface MangaChapter {
  id: string; // MangaDex chapter ID
  chapter: string; // e.g. "1", "1.5"
  title: string; // chapter title
  pages: number; // pages count
  publishAt: string;
}

import { getApiUrl } from './api';

export interface ChapterPagesResponse {
  baseUrl: string;
  hash: string;
  pages: string[]; // local filenames
}

const GRAPHQL_URL = getApiUrl('/api/anilist/graphql');

async function fetchFromAniList<T>(query: string, variables: Record<string, any>): Promise<T> {
  try {
    const response = await fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
      throw new Error(`AniList GraphQL proxy error status: ${response.status}`);
    }

    const json = await response.json();
    if (json.errors) {
      throw new Error(json.errors[0]?.message || 'AniList query error');
    }

    return json.data;
  } catch (proxyError: any) {
    console.warn("[Manga] AniList proxy fetch failed, trying direct:", proxyError);
    const response = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
      throw new Error(`Direct AniList GraphQL query failed: ${response.status}`);
    }

    const json = await response.json();
    if (json.errors) {
      throw new Error(json.errors[0]?.message || 'Direct AniList query error');
    }

    return json.data;
  }
}

export async function searchManga(
  page = 1,
  perPage = 20,
  search?: string,
  genres?: string[],
  status?: string,
  sort?: string
): Promise<{ media: MangaMedia[]; pageInfo: PageInfo }> {
  const query = `
    query ($page: Int, $perPage: Int, $search: String, $genre_in: [String], $status: MediaStatus, $sort: [MediaSort]) {
      Page (page: $page, perPage: $perPage) {
        pageInfo {
          total
          currentPage
          lastPage
          hasNextPage
        }
        media (search: $search, genre_in: $genre_in, status: $status, sort: $sort, type: MANGA) {
          id
          title {
            english
            romaji
            native
            userPreferred
          }
          coverImage {
            extraLarge
            large
            medium
            color
          }
          bannerImage
          description
          chapters
          volumes
          seasonYear
          status
          averageScore
          genres
          format
        }
      }
    }
  `;

  const variables: Record<string, any> = {
    page,
    perPage,
  };

  if (search && search.trim() !== '') {
    variables.search = search.trim();
  }

  if (genres && genres.length > 0) {
    variables.genre_in = genres;
  }

  if (status && status !== 'ALL') {
    variables.status = status;
  }

  if (sort && sort !== 'ALL') {
    variables.sort = [sort];
  } else {
    variables.sort = ['POPULARITY_DESC'];
  }

  const data = await fetchFromAniList<{ Page: { media: MangaMedia[]; pageInfo: PageInfo } }>(query, variables);
  return {
    media: data.Page.media,
    pageInfo: data.Page.pageInfo,
  };
}

export async function getMangaDetails(id: number): Promise<MangaMedia> {
  const query = `
    query ($id: Int) {
      Media (id: $id, type: MANGA) {
        id
        title {
          english
          romaji
          native
          userPreferred
        }
        coverImage {
          extraLarge
          large
          color
        }
        bannerImage
        description
        chapters
        volumes
        seasonYear
        status
        averageScore
        genres
        studios {
          nodes {
            id
            name
          }
        }
        characters (sort: [ROLE, RELEVANCE], perPage: 12) {
          edges {
            role
            node {
              id
              name {
                userPreferred
              }
              image {
                large
                medium
              }
            }
          }
        }
        relations {
          edges {
            relationType
            node {
              id
              title {
                userPreferred
              }
              type
              status
              coverImage {
                large
              }
            }
          }
        }
        recommendations (perPage: 10) {
          nodes {
            mediaRecommendation {
              id
              title {
                userPreferred
              }
              type
              coverImage {
                large
              }
            }
          }
        }
      }
    }
  `;

  const data = await fetchFromAniList<{ Media: MangaMedia }>(query, { id });
  return data.Media;
}

/**
 * Resolves AniList Manga on MangaDex API and fetches chapters feed
 */
export async function getMangaChapters(title: string, englishTitle?: string | null): Promise<MangaChapter[]> {
  try {
    // 1. Search MangaDex for matching Manga
    const cleanTitle = (englishTitle || title || "").replace(/\(Color\)|\s+Colored|\s+Colored\s+Edition/gi, "").trim();
    const searchUrl = getApiUrl(`/api/mangadex/manga?title=${encodeURIComponent(cleanTitle)}&limit=5&contentRating[]=safe&contentRating[]=suggestive&includes[]=cover_art`);
    
    const directSearchUrl = `https://api.mangadex.org/manga?title=${encodeURIComponent(cleanTitle)}&limit=5&contentRating[]=safe&contentRating[]=suggestive&includes[]=cover_art`;
    const proxySearchUrl = getApiUrl(`/api/mangadex/manga?title=${encodeURIComponent(cleanTitle)}&limit=5&contentRating[]=safe&contentRating[]=suggestive&includes[]=cover_art`);
    
    let searchRes;
    try {
      // Direct call first (supports CORS and avoids serverless API timeouts/rate limits)
      searchRes = await fetch(directSearchUrl);
      if (!searchRes.ok) {
        throw new Error(`Direct status: ${searchRes.status}`);
      }
    } catch (directErr) {
      try {
        console.warn("[MangaDex] Direct search failed or CORS blocked, falling back to server proxy:", directErr);
        searchRes = await fetch(proxySearchUrl);
        if (!searchRes.ok) {
          throw new Error(`Proxy status: ${searchRes.status}`);
        }
      } catch (proxyErr) {
        console.warn("[MangaDex] Server proxy search failed, falling back to public CORS proxy:", proxyErr);
        const corsProxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(directSearchUrl)}`;
        searchRes = await fetch(corsProxyUrl);
      }
    }

    if (!searchRes.ok) {
      throw new Error(`MangaDex search failed with status: ${searchRes.status}`);
    }
    
    const searchJson = await searchRes.json();
    const matches = searchJson.data || [];
    if (matches.length === 0) {
      // Fallback: search with a secondary cleaned string
      const shorterTitle = cleanTitle.split(/[;:\-,]/)[0].trim();
      if (shorterTitle && shorterTitle !== cleanTitle) {
        return getMangaChapters(shorterTitle);
      }
      return [];
    }
    
    // Select the first matching MangaID
    const mangaDexId = matches[0].id;
    
    // 2. Fetch Chapters Feed in English (try direct first, proxy fallback second)
    const directFeedUrl = `https://api.mangadex.org/manga/${mangaDexId}/feed?translatedLanguage[]=en&limit=100&includes[]=scanlation_group&order[chapter]=desc&contentRating[]=safe&contentRating[]=suggestive`;
    const proxyFeedUrl = getApiUrl(`/api/mangadex/manga/${mangaDexId}/feed?translatedLanguage[]=en&limit=100&includes[]=scanlation_group&order[chapter]=desc&contentRating[]=safe&contentRating[]=suggestive`);
    
    let feedRes;
    try {
      feedRes = await fetch(directFeedUrl);
      if (!feedRes.ok) {
        throw new Error(`Direct feed status: ${feedRes.status}`);
      }
    } catch (directErr) {
      try {
        console.warn("[MangaDex] Direct feed proxy failed, falling back to server proxy:", directErr);
        feedRes = await fetch(proxyFeedUrl);
        if (!feedRes.ok) {
          throw new Error(`Proxy feed status: ${feedRes.status}`);
        }
      } catch (proxyErr) {
        console.warn("[MangaDex] Server proxy feed failed, falling back to public CORS proxy:", proxyErr);
        const corsProxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(directFeedUrl)}`;
        feedRes = await fetch(corsProxyUrl);
      }
    }

    if (!feedRes.ok) {
      throw new Error(`MangaDex chapter list failed with status: ${feedRes.status}`);
    }
    
    const feedJson = await feedRes.json();
    const chaptersRaw = feedJson.data || [];
    
    const uniqueChapters = new Map<string, MangaChapter>();
    
    chaptersRaw.forEach((ch: any) => {
      const num = ch.attributes?.chapter || "0";
      const id = ch.id;
      const titleStr = ch.attributes?.title || `Chapter ${num}`;
      const pagesCount = ch.attributes?.pages || 0;
      
      // Avoid duplicates for same chapter number (prefer chapters with non-zero pages)
      if (!uniqueChapters.has(num) || (pagesCount > 0 && uniqueChapters.get(num)!.pages === 0)) {
        uniqueChapters.set(num, {
          id,
          chapter: num,
          title: titleStr,
          pages: pagesCount,
          publishAt: ch.attributes?.publishAt || "",
        });
      }
    });
    
    const sortedChapters = Array.from(uniqueChapters.values()).sort((a, b) => {
      const numA = parseFloat(a.chapter) || 0;
      const numB = parseFloat(b.chapter) || 0;
      return numB - numA; // Sort Descending (Chapter 10, 9, 8...)
    });
    
    return sortedChapters;
  } catch (e) {
    console.error("[MangaDex API] Failed to resolve manga chapters:", e);
    return [];
  }
}

/**
 * Resolves MangaDex Chapter Pages
 */
export async function getChapterPages(chapterId: string): Promise<ChapterPagesResponse | null> {
  try {
    const directPagesUrl = `https://api.mangadex.org/at-home/server/${chapterId}`;
    const proxyPagesUrl = getApiUrl(`/api/mangadex/at-home/server/${chapterId}`);
    let res;
    try {
      // Direct call first
      res = await fetch(directPagesUrl);
      if (!res.ok) {
        throw new Error(`Direct status: ${res.status}`);
      }
    } catch (directErr) {
      try {
        console.warn("[MangaDex Pages] Direct fetch failed or CORS blocked, falling back to serverless proxy:", directErr);
        res = await fetch(proxyPagesUrl);
        if (!res.ok) {
          throw new Error(`Proxy pages status: ${res.status}`);
        }
      } catch (proxyErr) {
        console.warn("[MangaDex Pages] Server proxy pages failed, falling back to public CORS proxy:", proxyErr);
        const corsProxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(directPagesUrl)}`;
        res = await fetch(corsProxyUrl);
      }
    }

    if (!res.ok) {
      throw new Error(`MangaDex pages query failed with status: ${res.status}`);
    }
    
    const json = await res.json();
    const baseUrl = json.baseUrl;
    const hash = json.chapter?.hash;
    const pages = json.chapter?.data || [];
    
    if (!baseUrl || !hash || pages.length === 0) {
      return null;
    }
    
    return { baseUrl, hash, pages };
  } catch (e) {
    console.error("[MangaDex Chapter Pages] Error:", e);
    return null;
  }
}
