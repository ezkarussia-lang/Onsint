/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { getTrendingAnime, getPopularAnime, AnimeMedia } from '../services/anilist';
import { getMangaDetails } from '../services/manga';
import { Play, Pause, Info, ChevronLeft, ChevronRight, TrendingUp, Sparkles, Loader2, Star, BookOpen, Flame, Search, ArrowRight, Music, Radio, Volume2, Disc, Trophy } from 'lucide-react';
import AnimeCard from '../components/AnimeCard';
import { useMusic, MASTERPIECE_PLAYLIST, AnimeThemeTrack } from '../services/MusicContext';

export interface DiscoverProps {
  onSelectAnime: (id: number) => void;
  onViewAllTrending: () => void;
  onWatchAnime: (id: number) => void;
  onSelectManga: (id: number) => void;
  onNavigateMusic: () => void;
  onNavigateLeaderboard: () => void;
}

export default function Discover({ onSelectAnime, onViewAllTrending, onWatchAnime, onSelectManga, onNavigateMusic, onNavigateLeaderboard }: DiscoverProps) {
  const music = useMusic();
  const [trending, setTrending] = useState<AnimeMedia[]>([]);
  const [popular, setPopular] = useState<AnimeMedia[]>([]);
  const [popularManga, setPopularManga] = useState<any[]>([]);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [mangaSearchWord, setMangaSearchWord] = useState('');
  
  const [featuredTrack, setFeaturedTrack] = useState<AnimeThemeTrack>(() => ({
    id: "tank-cowboy-bebop",
    title: "Tank!",
    animeTitle: "Cowboy Bebop",
    type: "OP 1",
    artist: "The Seatbelts",
    audioUrl: "https://v.animethemes.moe/CowboyBebop-OP1.webm",
    coverImage: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx30-gcnAtf6ofCOJ.png"
  }));
  const [isLoadingFeaturedTrack, setIsLoadingFeaturedTrack] = useState(false);

  const handleSelectAlternativeTheme = async (animeSlug: string, animeTitle: string, defaultTrackInfo: AnimeThemeTrack) => {
    setIsLoadingFeaturedTrack(true);
    try {
      const url = `https://api.animethemes.moe/anime?filter[search]=${encodeURIComponent(animeSlug)}&include=images,animethemes.song,animethemes.animethemeentries.videos&limit=1`;
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        const series = json.anime?.[0];
        if (series) {
          const cover = series.images?.find((img: any) => img.type === "Large Cover")?.link || defaultTrackInfo.coverImage;
          const opTheme = series.animethemes?.find((theme: any) => theme.type === "OP");
          if (opTheme) {
            const videoUrl = opTheme.animethemeentries?.[0]?.videos?.[0]?.link;
            if (videoUrl) {
              setFeaturedTrack({
                id: `${series.slug}-${opTheme.id}`,
                title: opTheme.song?.title || defaultTrackInfo.title,
                animeTitle: series.name,
                type: opTheme.type || "OP1",
                artist: opTheme.song?.artists?.map((a: any) => a.name).join(", ") || defaultTrackInfo.artist,
                audioUrl: videoUrl,
                coverImage: cover
              });
              setIsLoadingFeaturedTrack(false);
              return;
            }
          }
        }
      }
    } catch (e) {
      console.warn("Could not load alternative themes:", e);
    }
    setFeaturedTrack(defaultTrackInfo);
    setIsLoadingFeaturedTrack(false);
  };

  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        const [trendingData, popularData] = await Promise.all([
          getTrendingAnime(1, 10),
          getPopularAnime(1, 10),
        ]);
        setTrending(trendingData.media);
        setPopular(popularData.media);

        // Fetch dynamic manga information to bypass broken hardcoded S4 CDN links!
        const mangaIds = [86821, 30002, 30013, 113415];
        const mangaPromises = mangaIds.map(id =>
          getMangaDetails(id)
            .then(res => ({
              id: res.id,
              title: res.title.english || res.title.userPreferred,
              cover: res.coverImage.extraLarge || res.coverImage.large,
              chapters: res.chaptersCount ? `${res.chaptersCount} Chs` : "Ongoing",
              description: res.description
            }))
            .catch(() => null)
        );
        const mangaResults = await Promise.all(mangaPromises);
        const validManga = mangaResults.filter(Boolean) as any[];
        setPopularManga(validManga);
      } catch (err) {
        console.error('Error loading anime rows for Home Page:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  // Active slideshow auto increment
  useEffect(() => {
    if (trending.length === 0) return;
    const interval = setInterval(() => {
      setCarouselIndex((prev) => (prev + 1) % Math.min(5, trending.length));
    }, 6000);
    return () => clearInterval(interval);
  }, [trending]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-10 h-10 text-red-600 animate-spin" />
        <span className="text-zinc-500 font-bold tracking-widest text-xs uppercase">
          INITIATING DISCOVER ROW FEED...
        </span>
      </div>
    );
  }

  const carouselItems = trending.slice(0, 5);
  const activeSlide = carouselItems[carouselIndex];

  const handleNextSlide = () => {
    if (carouselItems.length === 0) return;
    setCarouselIndex((prev) => (prev + 1) % carouselItems.length);
  };

  const handlePrevSlide = () => {
    if (carouselItems.length === 0) return;
    setCarouselIndex((prev) => (prev - 1 + carouselItems.length) % carouselItems.length);
  };

  const cleanDescription = (htmlStr: string | null) => {
    if (!htmlStr) return '';
    return htmlStr.replace(/<\/?[^>]+(>|$)/g, '').substring(0, 150) + '...';
  };

  return (
    <div className="w-full flex flex-col gap-8 pb-12 animate-fade-in px-4 md:px-8">
      {/* 1. Hero Slideshow Carousel */}
      {activeSlide && (
        <div className="relative w-full h-[320px] md:h-[460px] rounded-2xl overflow-hidden shadow-2xl border border-red-950/20">
          {/* Banner Image Background */}
          <div className="absolute inset-0">
            <img
              src={activeSlide.bannerImage || activeSlide.coverImage.extraLarge}
              alt={activeSlide.title.userPreferred || 'Hero'}
              className="w-full h-full object-cover transition-transform duration-1000 transform scale-102"
              onError={(e) => {
                // fallback
                e.currentTarget.src = activeSlide.coverImage.extraLarge;
              }}
            />
            {/* Ambient vignette gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/40 to-transparent" />
          </div>

          {/* Silder details overlay */}
          <div className="absolute bottom-0 left-0 w-full p-6 md:p-10 select-none flex flex-col gap-3 max-w-2xl">
            {/* Tag Badge */}
            <div className="flex items-center gap-2">
              <span className="bg-[#dc2626] text-black text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-sm shadow-md animate-pulse">
                TRENDING NOW
              </span>
              <span className="text-zinc-300 text-xs font-bold">
                {activeSlide.seasonYear}
              </span>
            </div>

            {/* Title */}
            <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight text-white leading-tight text-glow">
              {activeSlide.title.english || activeSlide.title.userPreferred}
            </h1>

            {/* Description fallback */}
            <p className="text-xs md:text-sm text-zinc-400 line-clamp-2 leading-relaxed">
              {cleanDescription(activeSlide.description)}
            </p>

            {/* CTA control buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => onWatchAnime(activeSlide.id)}
                className="flex items-center gap-2 px-6 py-2.5 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-extrabold text-xs uppercase tracking-widest rounded-lg shadow-lg shadow-red-600/30 transition-all duration-200 cursor-pointer transform hover:scale-103 active:scale-97"
              >
                <Play className="w-4 h-4 fill-white" /> Watch Now
              </button>
              <button
                onClick={() => onSelectAnime(activeSlide.id)}
                className="flex items-center gap-2 px-6 py-2.5 bg-zinc-900/90 hover:bg-zinc-800/90 text-white font-extrabold text-xs uppercase tracking-widest rounded-lg border border-zinc-800 hover:border-zinc-700 transition-all duration-200 cursor-pointer transform hover:scale-103 active:scale-97"
              >
                <Info className="w-4 h-4" /> View Details
              </button>
            </div>
          </div>

          {/* Slide Arrow Switches */}
          <button
            onClick={handlePrevSlide}
            className="absolute top-1/2 left-4 -translate-y-1/2 p-2 rounded-full bg-black/60 hover:bg-red-600 text-white transition-all cursor-pointer shadow-lg hidden md:block"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={handleNextSlide}
            className="absolute top-1/2 right-4 -translate-y-1/2 p-2 rounded-full bg-black/60 hover:bg-red-600 text-white transition-all cursor-pointer shadow-lg hidden md:block"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Indicator Dot lists */}
          <div className="absolute bottom-4 right-6 flex items-center gap-1.5">
            {carouselItems.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCarouselIndex(idx)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  carouselIndex === idx ? 'w-5 bg-red-600' : 'w-1.5 bg-zinc-700 hover:bg-zinc-500'
                }`}
              />
            ))}
          </div>
        </div>
      )}

      {/* 2. Trending Anime Row */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-red-950/20 pb-2.5">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-red-500" />
            <h2 className="text-lg font-black uppercase tracking-wider text-white">
              Trending Anime
            </h2>
          </div>
          <button
            onClick={onViewAllTrending}
            className="text-xs font-bold uppercase tracking-widest text-red-500 hover:text-red-400 transition-colors"
          >
            View All
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
          {trending.slice(0, 10).map((media) => (
            <AnimeCard
              key={media.id}
              media={media}
              onClick={() => onSelectAnime(media.id)}
            />
          ))}
        </div>
      </div>

      {/* 3. Popular Anime Row */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-red-950/20 pb-2.5">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-red-500" />
            <h2 className="text-lg font-black uppercase tracking-wider text-white">
              All-Time Popular
            </h2>
          </div>
          <button
            onClick={onViewAllTrending} // Shared row page
            className="text-xs font-bold uppercase tracking-widest text-red-500 hover:text-red-400 transition-colors"
          >
            View All
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
          {popular.slice(0, 10).map((media) => (
            <AnimeCard
              key={media.id}
              media={media}
              onClick={() => onSelectAnime(media.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
