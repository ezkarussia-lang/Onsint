import React, { useState, useEffect } from 'react';
import { Trophy, ArrowRight, BookOpen, Flame, Music, Disc, Radio, RefreshCw, Bookmark, Newspaper, ChevronRight, Star } from 'lucide-react';
import { getMangaDetails } from '../services/manga';
import { AnimeMedia } from '../services/anilist';

interface HomeProps {
  onSelectManga: (id: number) => void;
  onNavigateMusic: () => void;
  onNavigateLeaderboard: () => void;
  onNavigateAnimeNews: () => void;
}

export default function Home({ onSelectManga, onNavigateMusic, onNavigateLeaderboard, onNavigateAnimeNews }: HomeProps) {
  const [popularManga, setPopularManga] = useState<any[]>([]);
  const [news, setNews] = useState<any[]>([]);

  useEffect(() => {
    async function loadManga() {
      // Hardcoded Solo Leveling, Berserk, One Piece, JJK for demo
      const ids = [86821, 30002, 30013, 113415];
      const items = [];
      for (const id of ids) {
        try {
          const res = await getMangaDetails(id);
          if (res) {
            items.push({
              id: res.id,
              title: typeof res.title === 'string' ? res.title : (res.title?.userPreferred || res.title?.english || res.title?.romaji || "Unknown"),
              cover: res.coverImage?.extraLarge || res.coverImage?.large || "",
              chapters: res.chaptersCount ? `${res.chaptersCount} Chs` : "Ongoing",
              description: res.description || ""
            });
          }
        } catch (e) {}
      }
      if (items.length > 0) setPopularManga(items);
    }
    loadManga();

    async function loadNews() {
      try {
        const res = await fetch('https://aninews.vercel.app/api/news?limit=5');
        const json = await res.json();
        if (json.success && json.data) {
          setNews(json.data);
        }
      } catch (e) {}
    }
    loadNews();
  }, []);

  return (
    <div className="w-full pb-24 md:pb-8 pt-4 px-4 flex flex-col gap-6 max-w-7xl mx-auto animate-fade-in relative z-10">
      <div className="flex flex-col gap-1 max-w-4xl mx-auto w-full">
        <h1 className="text-3xl font-black text-white px-2">Welcome</h1>
      </div>

      {/* Anime News Widget */}
      <div className="w-full bg-[#070709] rounded-3xl p-6 md:p-8 border border-zinc-900 flex flex-col gap-6 max-w-4xl mx-auto mb-2 relative">
        <div 
          onClick={onNavigateAnimeNews}
          className="flex items-center gap-3 cursor-pointer group w-fit"
        >
          <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center border border-red-500/20">
            <Newspaper className="w-4 h-4 text-red-500" />
          </div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-white group-hover:text-red-500 transition-colors">Anime News</h2>
            <ChevronRight className="w-5 h-5 text-zinc-500 group-hover:text-red-500 transition-colors" />
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {news.length > 0 && (
            <>
              <div className="w-full h-48 md:h-64 rounded-2xl overflow-hidden relative cursor-pointer group border border-zinc-800" onClick={onNavigateAnimeNews}>
                {news[0].image ? (
                  <img src={news[0].image} alt="Featured News" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full bg-zinc-900 group-hover:scale-105 transition-transform duration-500" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 flex flex-col gap-2">
                  <div className="flex items-center gap-1.5 text-red-500">
                    <Star className="w-4 h-4 fill-current" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Featured</span>
                  </div>
                  <h3 className="text-lg md:text-xl font-bold text-white leading-snug">{news[0].title}</h3>
                </div>
              </div>
              
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" onClick={onNavigateAnimeNews}>
                {news.slice(1, 5).map((article, i) => (
                  <div key={i} className="aspect-[3/2] rounded-xl overflow-hidden relative group cursor-pointer border border-zinc-800">
                    {article.image ? (
                      <img src={article.image} alt="News" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
                        <Newspaper className="w-8 h-8 text-zinc-800" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
          {news.length === 0 && (
            <div className="text-zinc-500 text-sm font-semibold flex items-center justify-center py-12">
              Loading latest news...
            </div>
          )}
        </div>
      </div>

      {/* Quote Widget */}
      <div className="w-full bg-[#070709] rounded-3xl p-6 md:p-8 border border-zinc-900 flex flex-col gap-6 max-w-4xl mx-auto border-t-2 border-t-red-600/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-red-500 font-bold text-lg">
            <span className="text-2xl font-serif leading-none">”</span>
            Good Evening, • 10:39 pm
          </div>
          <button className="text-zinc-500 hover:text-white transition-colors">
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
        
        <p className="text-xl md:text-2xl font-bold text-white leading-snug">
          I took a shit so powerful during a typhoon in the Philippines, it registered on Japanese seismographs as an ancient curse.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <div className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 flex items-center gap-2 text-sm font-semibold">
            <BookOpen className="w-4 h-4" /> Anipriv8 Community
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 flex items-center gap-2 text-sm font-semibold">
            <span className="w-4 h-4 rounded-full border border-zinc-700 bg-zinc-800 flex items-center justify-center text-[8px]">👤</span> Nanashi
          </div>
        </div>
      </div>

      {/* Continue Watching Placeholder */}
      <div className="w-full bg-[#070709] rounded-3xl p-6 md:p-8 border border-zinc-900 flex flex-col gap-4 max-w-4xl mx-auto border-t-2 border-t-red-600/50">
        <div className="flex items-center gap-3">
          <Bookmark className="w-6 h-6 text-red-500" />
          <h2 className="text-xl font-black uppercase text-white">Continue Watching</h2>
        </div>
        <p className="text-zinc-500 text-sm font-medium">Your currently active shows will appear here soon.</p>
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
              onSelectManga(86821); // Route to Solo Leveling by default since we don't have global sync
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
              Search
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
                {(() => {
                  const m = popularManga.find(m => m.id === 86821);
                  if (!m) return "Solo Leveling (Only I Level Up)";
                  return typeof m.title === 'string' ? m.title : (m.title?.userPreferred || m.title?.english || "Solo Leveling (Only I Level Up)");
                })()}
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
                        {typeof m.title === 'string' ? m.title : (m.title?.userPreferred || m.title?.english || "Unknown Manga")}
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

      {/* MID-PORT: Audio Themes Soundboard Deck (animethemes.moe integration) */}
      <div id="home-music-deck" className="w-full bg-[#070709] rounded-3xl p-6 md:p-8 border border-zinc-900 border-t-2 border-t-red-600 flex flex-col gap-5 max-w-4xl mx-auto shadow-2xl relative text-left select-none">
        <div className="flex items-center justify-between w-full">
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

        <div className="flex flex-col text-left mt-2.5">
          <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight text-white leading-tight">
            Music Discovery
          </h2>
          <p className="text-xs text-zinc-400 font-semibold leading-relaxed mt-1 max-w-md">
            Jump into anime soundtracks, OP/ED favorites, and quick mood picks.
          </p>
        </div>

        <div className="flex flex-col gap-3 mt-3">
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
