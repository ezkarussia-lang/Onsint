/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState } from 'react';
import { getTrendingAnime, AnimeMedia } from '../services/anilist';
import { ArrowLeft, Loader2, Sparkles, Star } from 'lucide-react';
import AnimeCard from './AnimeCard';

interface TrendingAllProps {
  onBack: () => void;
  onSelectAnime: (id: number) => void;
}

export default function TrendingAll({ onBack, onSelectAnime }: TrendingAllProps) {
  const [animes, setAnimes] = useState<AnimeMedia[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(true);
  const observerRef = useRef<HTMLDivElement | null>(null);

  // Load first page
  useEffect(() => {
    async function loadInitial() {
      try {
        setLoading(true);
        const res = await getTrendingAnime(1, 20);
        setAnimes(res.media);
        setHasNextPage(res.pageInfo.hasNextPage);
      } catch (err) {
        console.error('Error fetching trending index page:', err);
      } finally {
        setLoading(false);
      }
    }
    loadInitial();
  }, []);

  // Fetch sequential pages for infinite load
  const loadMore = async () => {
    if (loading || !hasNextPage) return;

    try {
      setLoading(true);
      const nextPage = page + 1;
      const res = await getTrendingAnime(nextPage, 20);
      setAnimes((prev) => {
        // Prevent duplicates
        const existingIds = new Set(prev.map((a) => a.id));
        const filtered = res.media.filter((a) => !existingIds.has(a.id));
        return [...prev, ...filtered];
      });
      setPage(nextPage);
      setHasNextPage(res.pageInfo.hasNextPage);
    } catch (err) {
      console.error('Failed to load next page of trending list:', err);
    } finally {
      setLoading(false);
    }
  };

  // Setup infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !loading) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    const loaderNode = observerRef.current;
    if (loaderNode) {
      observer.observe(loaderNode);
    }

    return () => {
      if (loaderNode) {
        observer.unobserve(loaderNode);
      }
    };
  }, [hasNextPage, loading, page]);

  return (
    <div className="w-full flex flex-col gap-6 pb-16 animate-fade-in px-4 md:px-8 select-none">
      {/* Upper action header bar */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-2 bg-zinc-950 border border-zinc-900 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 transition-all cursor-pointer"
          title="Return back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-[#ef4444]" />
            <h1 className="text-xl md:text-2xl font-black uppercase text-glow">
              Trending Catalog
            </h1>
          </div>
          <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
            INFINITE SCROLLING ON-DEMAND ROW PACKETS
          </span>
        </div>
      </div>

      {/* Grid list display */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
        {animes.map((media) => (
          <AnimeCard
            key={media.id}
            media={media}
            onClick={() => onSelectAnime(media.id)}
          />
        ))}
      </div>

      {/* Loader target tag / Infinite Scroll Sentinel */}
      {hasNextPage && (
        <div
          ref={observerRef}
          className="flex flex-col items-center justify-center p-6 mt-4 gap-2"
        >
          <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
          <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
            FETCHING ADDITIONAL ANIME CHUNKS...
          </span>
        </div>
      )}

      {!hasNextPage && (
        <div className="w-full text-center py-8 text-zinc-600 text-[11px] font-bold uppercase tracking-widest border-t border-zinc-950 mt-6">
          YOU HAVE REACHED THE END OF THE VECTOR PACKETS.
        </div>
      )}
    </div>
  );
}
