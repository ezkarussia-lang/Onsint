/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { getTrendingAnime, getPopularAnime, AnimeMedia } from '../services/anilist';
import { getMangaDetails } from '../services/manga';
import { Play, Pause, Info, ChevronLeft, ChevronRight, TrendingUp, Sparkles, Loader2, Star, BookOpen, Flame, Search, ArrowRight, Music, Radio, Volume2, Disc } from 'lucide-react';
import AnimeCard from '../components/AnimeCard';
import { useMusic, MASTERPIECE_PLAYLIST, AnimeThemeTrack } from '../services/MusicContext';

interface HomeProps {
  onSelectAnime: (id: number) => void;
  onViewAllTrending: () => void;
  onWatchAnime: (id: number) => void;
  onSelectManga: (id: number) => void;
  onNavigateMusic: () => void;
}

export default function Home({ onSelectAnime, onViewAllTrending, onWatchAnime, onSelectManga, onNavigateMusic }: HomeProps) {
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

      {/* MID-PORT: Real-time Manga Reader Media Deck Container */}
      <div className="w-full bg-[#070709] rounded-3xl p-6 md:p-8 border border-zinc-900 border-t-2 border-t-red-650 flex flex-col gap-6 md:gap-8 max-w-4xl mx-auto shadow-2xl relative text-left">
        
        {/* Header Console */}
        <div className="flex flex-col md:flex-row items-center justify-between border-b border-red-950/20 pb-4 gap-4 w-full">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-600/10 text-red-505 rounded-2xl shadow-inner animate-pulse">
              <BookOpen className="w-6 h-6 text-red-500" />
            </div>
            <div>
              <h2 className="text-lg font-black uppercase tracking-wider text-white">
                READ MANGA
              </h2>
              <p className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase leading-none mt-1">
                Manga Reading Mode Of Anipriv8
              </p>
            </div>
          </div>

          {/* Quick direct search portal */}
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              onSelectManga(0); // This just triggers switching tabs, search state is manual
            }} 
            className="flex items-center gap-2 max-w-sm w-full"
          >
            <input
              type="text"
              placeholder="Jump directly to manga title..."
              className="bg-zinc-950/80 border border-zinc-900 focus:border-red-600 focus:ring-1 focus:ring-red-650 h-10 px-4 text-xs font-semibold rounded-lg text-white outline-none w-full"
            />
            <button
              type="submit"
              className="px-4 h-10 bg-red-600 hover:bg-red-700 active:bg-red-800 text-[10px] font-black uppercase tracking-wide text-white rounded-md cursor-pointer flex items-center gap-1"
            >
              <Search className="w-3.5 h-3.5 shrink-0" />
            </button>
          </form>
        </div>

        {/* Tactile Deck Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          
          {/* Cover Showcase */}
          <div className="md:col-span-4 flex flex-col items-center">
            <div 
              onClick={() => onSelectManga(popularManga.find(m => m.id === 86821)?.id || 86821)} // Solo Leveling
              className="relative w-38 aspect-[3/4] rounded-2xl overflow-hidden shadow-2xl border border-zinc-800 cursor-pointer group shrink-0"
            >
              <img
                src={popularManga.find(m => m.id === 86821)?.cover || "https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/bx86821-I267m6AnYpWb.jpg"}
                alt="Active Manga Cover"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
              <div className="absolute bottom-2.5 inset-x-2.5 text-center bg-black/80 backdrop-blur-md rounded-md py-1 border border-white/5">
                <span className="text-[10px] font-black uppercase text-red-500 tracking-wider">
                  Read Ch. 1 Now
                </span>
              </div>
            </div>
          </div>

          {/* Player controls details */}
          <div className="md:col-span-8 flex flex-col gap-4 text-left">
            <div className="flex flex-col">
              <span className="text-red-500 text-[10px] font-mono font-black uppercase tracking-widest leading-none flex items-center gap-1">
                <Flame className="w-3 h-3 animate-pulse" /> CORE COVER SELECTION
              </span>
              <h3 className="text-xl font-extrabold text-white mt-1.5 leading-snug">
                {popularManga.find(m => m.id === 86821)?.title || "Solo Leveling (Only I Level Up)"}
              </h3>
              <p className="text-zinc-400 text-xs mt-1 leading-relaxed line-clamp-2" dangerouslySetInnerHTML={{
                __html: popularManga.find(m => m.id === 86821)?.description || "In a world where hunters must battle deadly monsters, Jinwoo Sung, the weakest hunter of all mankind, finds himself in a struggle for survival..."
              }} />
            </div>

            {/* Tactile reading bar */}
            <div className="flex flex-col gap-1.5">
              <div className="w-full h-1 bg-zinc-900 rounded-full overflow-hidden relative">
                <div className="absolute top-0 left-0 bottom-0 w-[42%] bg-red-650 rounded-full" />
              </div>
              <div className="flex justify-between items-center text-[9.5px] font-black text-zinc-500 font-mono">
                <span>CHAPTER 1</span>
                <span>VOL. 8 (42% COMPLETE)</span>
                <span>CHAPTER 200</span>
              </div>
            </div>

            {/* Horizontal playlists of other masterly titles */}
            <div className="flex flex-col gap-2 mt-1">
              <span className="text-[9px] font-black uppercase text-zinc-500 font-mono tracking-widest border-b border-zinc-950 pb-1">
                ALTERNATIVE POPULAR TUNES (MANGA CHANNELS)
              </span>
              <div className="flex items-center gap-3 overflow-x-auto pb-1 scrollbar-none">
                {(popularManga.filter(m => m.id !== 86821).length > 0 ? popularManga.filter(m => m.id !== 86821) : [
                  { id: 30002, title: "Berserk", cover: "https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/bx30002-vX7874gL76vI.jpg", chapters: "415 Chs" },
                  { id: 30013, title: "One Piece", cover: "https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/bx30013-1Yvbo7fK2ZpL.jpg", chapters: "Ongoing" },
                  { id: 113415, title: "Jujutsu Kaisen", cover: "https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/bx113415-g7v93gAtT5Vf.png", chapters: "271 Chs" }
                ]).map((m) => (
                  <button
                    key={m.id}
                    onClick={() => onSelectManga(m.id)}
                    className="flex items-center gap-2.5 p-1.5 bg-zinc-950/60 border border-zinc-900/60 rounded-xl cursor-pointer hover:border-red-500/20 text-left shrink-0 max-w-[170px]"
                  >
                    <img 
                      src={m.cover} 
                      alt="Cover" 
                      className="w-7 h-10 object-cover rounded-md border border-zinc-900"
                      referrerPolicy="no-referrer"
                    />
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-white line-clamp-1 truncate leading-tight hover:text-red-500">
                        {m.title}
                      </span>
                      <span className="text-[8px] font-mono text-zinc-500 mt-0.5 font-bold uppercase tracking-wider">
                        {m.chapters}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
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

      {/* MID-PORT: Audio Themes Soundboard Deck (animethemes.moe integration) */}
      <div id="home-music-deck" className="w-full bg-[#070709] rounded-3xl p-6 md:p-8 border border-zinc-900 border-t-2 border-t-red-600 flex flex-col gap-5 max-w-2xl mx-auto shadow-2xl relative text-left mt-4 animate-fade-in select-none">
        
        {/* Header Console (screenshot style) */}
        <div className="flex items-center justify-between w-full">
          {/* Top category label pill */}
          <div className="bg-red-950/20 border border-red-900/40 rounded-full px-4 py-1.5 flex items-center gap-2">
            <Music className="w-3.5 h-3.5 text-red-500 animate-pulse" />
            <span className="text-[10.5px] font-black text-red-400 uppercase tracking-widest font-mono">
              Music on Anipriv8
            </span>
          </div>
          
          <button
            onClick={onNavigateMusic}
            className="px-4 py-1.5 bg-red-950/20 hover:bg-red-950/40 border border-red-905 text-[11px] font-black text-red-400 hover:text-white uppercase tracking-wider rounded-full transition-all active:scale-95 cursor-pointer shadow-sm"
          >
            See more
          </button>
        </div>

        {/* Dynamic Titles */}
        <div className="flex flex-col text-left mt-2.5">
          <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight text-white leading-tight">
            Music Discovery
          </h2>
          <p className="text-xs text-zinc-400 font-semibold leading-relaxed mt-1 max-w-md">
            Jump into anime soundtracks, OP/ED favorites, and quick mood picks.
          </p>
        </div>

        {/* Options inside card container precisely styled as screenshot 1 */}
        <div className="flex flex-col gap-3 mt-3">
          
          {/* Option 1: Anime OST */}
          <div 
            onClick={onNavigateMusic}
            className="group flex items-center justify-between bg-[#08080a] border border-zinc-900/80 hover:border-red-550/30 p-4 rounded-2xl cursor-pointer transition-all active:scale-99"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-red-950/20 border border-red-900/35 flex items-center justify-center text-red-500 shrink-0">
                <Disc className="w-5 h-5" />
              </div>
              <span className="text-sm font-extrabold text-white group-hover:text-red-400 transition-colors">
                Anime OST
              </span>
            </div>
            
            <span className="text-zinc-500 group-hover:text-red-400 text-xs font-bold font-mono tracking-widest uppercase transition-colors shrink-0">
              Open
            </span>
          </div>

          {/* Option 2: Openings & Endings */}
          <div 
            onClick={onNavigateMusic}
            className="group flex items-center justify-between bg-[#08080a] border border-zinc-900/80 hover:border-red-550/30 p-4 rounded-2xl cursor-pointer transition-all active:scale-99"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-red-950/20 border border-red-900/35 flex items-center justify-center text-red-500 shrink-0">
                <Radio className="w-5 h-5" />
              </div>
              <span className="text-sm font-extrabold text-white group-hover:text-red-400 transition-colors">
                Openings & Endings
              </span>
            </div>
            
            <span className="text-zinc-500 group-hover:text-red-400 text-xs font-bold font-mono tracking-widest uppercase transition-colors shrink-0">
              Open
            </span>
          </div>

        </div>
      </div>
    </div>
  );
}
