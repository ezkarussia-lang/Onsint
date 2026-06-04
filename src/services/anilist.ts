/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface AnimeMedia {
  id: number;
  title: {
    english: string | null;
    romaji: string | null;
    native: string | null;
    userPreferred: string | null;
  };
  coverImage: {
    extraLarge: string;
    large: string;
    medium: string;
    color: string | null;
  };
  bannerImage: string | null;
  description: string | null;
  episodes: number | null;
  seasonYear: number | null;
  season: string | null;
  status: string | null;
  format: string | null;
  averageScore: number | null;
  genres: string[];
  duration: number | null;
  studios?: {
    nodes: Array<{
      id: number;
      name: string;
      isAnimationStudio: boolean;
    }>;
  };
  trailer?: {
    id: string;
    site: string;
  } | null;
  nextAiringEpisode?: {
    airingAt: number;
    episode: number;
    timeUntilAiring: number;
  } | null;
  characters?: {
    edges: Array<{
      role: string;
      node: {
        id: number;
        name: {
          userPreferred: string;
        };
        image: {
          large: string;
          medium: string;
        };
      };
    }>;
  };
  staff?: {
    edges: Array<{
      role: string;
      node: {
        id: number;
        name: {
          full: string;
        };
        image: {
          large: string;
        };
      };
    }>;
  };
  relations?: {
    edges: Array<{
      relationType: string;
      node: {
        id: number;
        title: {
          userPreferred: string;
        };
        type: string;
        status: string;
        coverImage: {
          large: string;
        };
      };
    }>;
  };
  recommendations?: {
    nodes: Array<{
      mediaRecommendation?: {
        id: number;
        title: {
          userPreferred: string;
        };
        type: string;
        coverImage: {
          large: string;
        };
      } | null;
    }>;
  };
  streamingEpisodes?: Array<{
    title: string;
    thumbnail: string;
    url: string;
    site: string;
  }> | null;
}

import { getApiUrl } from './api';

export interface PageInfo {
  total: number;
  currentPage: number;
  lastPage: number;
  hasNextPage: boolean;
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
      throw new Error(`AniList API returned error status: ${response.status}`);
    }

    const json = await response.json();
    if (json.errors) {
      throw new Error(json.errors[0]?.message || 'AniList query error');
    }

    return json.data;
  } catch (proxyError: any) {
    console.warn("AniList proxy fetch failed/errored, attempting direct connection:", proxyError);
    // Fallback to direct public AniList GraphQL endpoint
    const response = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
      throw new Error(`Direct AniList API returned error status: ${response.status}`);
    }

    const json = await response.json();
    if (json.errors) {
      throw new Error(json.errors[0]?.message || 'Direct AniList query error');
    }

    return json.data;
  }
}

export async function getTrendingAnime(page = 1, perPage = 10): Promise<{ media: AnimeMedia[]; pageInfo: PageInfo }> {
  const query = `
    query ($page: Int, $perPage: Int) {
      Page (page: $page, perPage: $perPage) {
        pageInfo {
          total
          currentPage
          lastPage
          hasNextPage
        }
        media (sort: [TRENDING_DESC, POPULARITY_DESC], type: ANIME) {
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
          episodes
          seasonYear
          season
          status
          averageScore
          genres
          format
          duration
          nextAiringEpisode {
            airingAt
            episode
            timeUntilAiring
          }
        }
      }
    }
  `;

  const data = await fetchFromAniList<{ Page: { media: AnimeMedia[]; pageInfo: PageInfo } }>(query, { page, perPage });
  return {
    media: data.Page.media,
    pageInfo: data.Page.pageInfo,
  };
}

export async function getPopularAnime(page = 1, perPage = 10): Promise<{ media: AnimeMedia[]; pageInfo: PageInfo }> {
  const query = `
    query ($page: Int, $perPage: Int) {
      Page (page: $page, perPage: $perPage) {
        pageInfo {
          total
          currentPage
          lastPage
          hasNextPage
        }
        media (sort: [POPULARITY_DESC], type: ANIME) {
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
          episodes
          seasonYear
          season
          status
          averageScore
          genres
          format
          duration
          nextAiringEpisode {
            airingAt
            episode
            timeUntilAiring
          }
        }
      }
    }
  `;

  const data = await fetchFromAniList<{ Page: { media: AnimeMedia[]; pageInfo: PageInfo } }>(query, { page, perPage });
  return {
    media: data.Page.media,
    pageInfo: data.Page.pageInfo,
  };
}

export async function searchAnime(
  page = 1,
  perPage = 20,
  search?: string,
  genres?: string[],
  status?: string,
  sort?: string
): Promise<{ media: AnimeMedia[]; pageInfo: PageInfo }> {
  const query = `
    query ($page: Int, $perPage: Int, $search: String, $genre_in: [String], $status: MediaStatus, $sort: [MediaSort]) {
      Page (page: $page, perPage: $perPage) {
        pageInfo {
          total
          currentPage
          lastPage
          hasNextPage
        }
        media (search: $search, genre_in: $genre_in, status: $status, sort: $sort, type: ANIME) {
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
          episodes
          seasonYear
          season
          status
          averageScore
          genres
          format
          duration
          nextAiringEpisode {
            airingAt
            episode
            timeUntilAiring
          }
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

  const data = await fetchFromAniList<{ Page: { media: AnimeMedia[]; pageInfo: PageInfo } }>(query, variables);
  return {
    media: data.Page.media,
    pageInfo: data.Page.pageInfo,
  };
}

export async function getAnimeDetails(id: number): Promise<AnimeMedia> {
  const query = `
    query ($id: Int) {
      Media (id: $id, type: ANIME) {
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
        episodes
        seasonYear
        season
        status
        averageScore
        genres
        duration
        studios {
          nodes {
            id
            name
            isAnimationStudio
          }
        }
        trailer {
          id
          site
        }
        nextAiringEpisode {
          airingAt
          episode
          timeUntilAiring
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
        staff (perPage: 8) {
          edges {
            role
            node {
              id
              name {
                full
              }
              image {
                large
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
        streamingEpisodes {
          title
          thumbnail
          url
          site
        }
      }
    }
  `;

  const data = await fetchFromAniList<{ Media: AnimeMedia }>(query, { id });
  return data.Media;
}

// Fixed list of anime genres for filters
export const ALL_GENRES = [
  'Action',
  'Adventure',
  'Comedy',
  'Drama',
  'Ecchi',
  'Fantasy',
  'Hentai',
  'Horror',
  'Mahou Shoujo',
  'Mecha',
  'Music',
  'Mystery',
  'Psychological',
  'Romance',
  'Sci-Fi',
  'Slice of Life',
  'Sports',
  'Supernatural',
  'Thriller',
];
