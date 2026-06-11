import React, { useState, useEffect } from 'react';
import { Search, Play, CalendarDays, Zap, Shield, Hash, MonitorPlay, SlidersHorizontal, Loader2, RefreshCw, Users, Radio, BookOpen, MessageSquare } from 'lucide-react';
import { searchAnime, AnimeMedia, getTrendingAnime, ALL_GENRES } from '../services/anilist';
import AnimeCard from '../components/AnimeCard';

interface LandingProps {
  onGetStarted: () => void;
  onBrowseAnimes: () => void;
  onSearchAnime: (id: number) => void;
}

export default function Landing({ onGetStarted, onBrowseAnimes, onSearchAnime }: LandingProps) {
  const [query, setQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedSort, setSelectedSort] = useState('POPULARITY_DESC');
  const [results, setResults] = useState<AnimeMedia[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const [trendingVisuals, setTrendingVisuals] = useState<AnimeMedia[]>([]);

  useEffect(() => {
    async function fetchVisuals() {
      try {
        const res = await getTrendingAnime(1, 6);
        setTrendingVisuals(res.media);
      } catch (e) {}
    }
    fetchVisuals();
  }, []);

  const performSearch = async () => {
    if (!query && !selectedGenre && selectedStatus === 'ALL' && selectedSort === 'POPULARITY_DESC') {
      setHasSearched(false);
      return;
    }
    
    setHasSearched(true);
    try {
      setLoading(true);
      setErrorMsg(null);
      
      const genresInput = selectedGenre ? [selectedGenre] : undefined;
      const response = await searchAnime(1, 18, query, genresInput, selectedStatus, selectedSort);
      
      setResults(response.media);
    } catch (err) {
      setErrorMsg('Oops, search failed. Please adjust filters or try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (query || selectedGenre || selectedStatus !== 'ALL' || selectedSort !== 'POPULARITY_DESC') {
        performSearch();
      } else {
        setHasSearched(false);
      }
    }, 450);

    return () => clearTimeout(delayDebounce);
  }, [query, selectedGenre, selectedStatus, selectedSort]);

  const clearFilters = () => {
    setQuery('');
    setSelectedGenre('');
    setSelectedStatus('ALL');
    setSelectedSort('POPULARITY_DESC');
    setHasSearched(false);
  };

  const statusOptions = [
    { value: 'ALL', label: 'Any Status' },
    { value: 'RELEASING', label: 'Ongoing / Airing' },
    { value: 'FINISHED', label: 'Finished Airing' },
    { value: 'NOT_YET_RELEASED', label: 'Upcoming / Unreleased' },
    { value: 'CANCELLED', label: 'Cancelled' },
  ];

  const sortOptions = [
    { value: 'POPULARITY_DESC', label: 'Most Popular' },
    { value: 'TRENDING_DESC', label: 'Trending First' },
    { value: 'SCORE_DESC', label: 'Highest Rated' },
    { value: 'FAVOURITES_DESC', label: 'Most Favorited' },
    { value: 'UPDATED_AT_DESC', label: 'Recently Updated' },
  ];

  return (
    <div className="w-full min-h-screen bg-[#040405] text-white relative overflow-x-hidden selection:bg-red-500/30">
      
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-red-900/10 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute top-[40%] right-[-10%] w-[30%] h-[40%] bg-red-900/10 blur-[150px] rounded-full pointer-events-none" />

      <div className="w-full max-w-5xl mx-auto px-6 pt-32 pb-24 md:pt-48 md:pb-32 flex flex-col items-center relative z-10">
        
        <div className="flex flex-col items-center gap-6 mb-12 text-center">
          <div className="scale-150 mb-4 animate-fade-in animate-duration-1000 select-none">
            <span className="text-4xl font-black tracking-tight text-white transition-all duration-300">
              Ani<span className="text-red-500 italic">priv8</span>
            </span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight text-white animate-fade-in animate-delay-200" style={{ textShadow: "0 4px 24px rgba(0,0,0,0.4)" }}>
            Watch Free Anime Online
          </h1>
        </div>

        <div className="w-full max-w-2xl animate-fade-in animate-delay-300 relative group flex flex-col gap-4">
          
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Type anime title or keyword... (e.g., Solo Leveling)"
                className="w-full pl-11 pr-4 py-3 bg-[#08080a] hover:bg-[#0c0c0f]/80 focus:bg-[#0c0c0f] border border-zinc-900 focus:border-red-650 rounded-xl text-xs placeholder-zinc-505 text-white outline-none transition-all font-mono shadow-xl shadow-black/40"
              />
            </div>

            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`p-3 border rounded-xl transition-all cursor-pointer flex items-center justify-center shrink-0 ${
                showFilters 
                  ? 'bg-red-650/15 border-red-650 text-red-500 shadow-md shadow-red-500/10' 
                  : 'bg-[#08080a] border-zinc-900 text-zinc-400 hover:text-white hover:border-zinc-805'
              }`}
              title="Toggle Filter Panel"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={clearFilters}
              className="p-3 bg-[#08080a] hover:bg-zinc-900 border border-zinc-900 rounded-xl text-zinc-400 hover:text-white transition-colors cursor-pointer shrink-0"
              title="Reset Filters"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-[#08080a]/60 p-5 border border-red-950/20 rounded-2xl animate-fade-in relative shadow-xl backdrop-blur-md">
              <div className="flex flex-col gap-1.5">
                <label className="text-[9.5px] font-bold text-zinc-500 uppercase tracking-wider font-mono">
                  Primary Genre
                </label>
                <select
                  value={selectedGenre}
                  onChange={(e) => setSelectedGenre(e.target.value)}
                  className="w-full bg-black border border-zinc-900 text-zinc-300 text-xs py-2.5 px-3 rounded-lg outline-none cursor-pointer focus:border-red-650 transition-colors font-mono"
                >
                  <option value="">Any Genre</option>
                  {ALL_GENRES.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[9.5px] font-bold text-zinc-500 uppercase tracking-wider font-mono">
                  Airing Status
                </label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full bg-black border border-zinc-900 text-zinc-300 text-xs py-2.5 px-3 rounded-lg outline-none cursor-pointer focus:border-red-650 transition-colors font-mono"
                >
                  {statusOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[9.5px] font-bold text-zinc-500 uppercase tracking-wider font-mono">
                  Sort Order
                </label>
                <select
                  value={selectedSort}
                  onChange={(e) => setSelectedSort(e.target.value)}
                  className="w-full bg-black border border-zinc-900 text-zinc-300 text-xs py-2.5 px-3 rounded-lg outline-none cursor-pointer focus:border-red-650 transition-colors font-mono"
                >
                  {sortOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
          
          <div className="text-center flex flex-wrap items-center justify-center gap-2 text-zinc-500 text-sm font-medium mt-2">
            <span>Suggestion:</span>
            <span className="hover:text-red-400 cursor-pointer transition-colors" onClick={() => setQuery('One Piece')}>One Piece</span>
            <span className="hover:text-red-400 cursor-pointer transition-colors" onClick={() => setQuery('Solo Leveling')}>Solo Leveling</span>
            <span className="hover:text-red-400 cursor-pointer transition-colors" onClick={() => setQuery('Jujutsu Kaisen')}>Jujutsu Kaisen</span>
            <span className="hover:text-red-400 cursor-pointer transition-colors" onClick={() => setQuery('Oshi No Ko')}>Oshi No Ko</span>
            <span className="hover:text-red-400 cursor-pointer transition-colors" onClick={() => setQuery('Mashle')}>Mashle</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 mt-8 animate-fade-in animate-delay-500">
          <button 
            onClick={onGetStarted}
            className="bg-red-500 hover:bg-red-400 text-white font-black text-lg px-8 py-4 rounded-xl flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-red-500/20 w-full sm:w-auto"
          >
            <Play className="w-5 h-5 fill-current" />
            Watch now
          </button>
          
          <button 
            onClick={onBrowseAnimes}
            className="bg-[#101014]/80 hover:bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white font-bold text-lg px-8 py-4 rounded-xl flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-black/20 w-full sm:w-auto"
          >
            <CalendarDays className="w-5 h-5" />
            Browse animes
          </button>
        </div>
      </div>

      {hasSearched && (
        <div className="w-full max-w-6xl mx-auto px-6 pb-24 animate-fade-in">
          {loading ? (
            <div className="flex flex-col items-center justify-center min-h-[30vh] gap-2 mt-4">
              <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
              <span className="text-zinc-500 font-bold uppercase tracking-widest text-[10px] font-mono">
                SYNTAX QUERIES IN PROGRESS...
              </span>
            </div>
          ) : errorMsg ? (
            <div className="text-center bg-[#0d0a0a] border border-red-950/40 p-10 rounded-xl">
              <span className="text-red-500 text-glow font-bold text-sm">{errorMsg}</span>
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-20 border border-dashed border-zinc-905 rounded-xl">
              <span className="text-zinc-500 font-bold tracking-widest text-xs uppercase block mb-1">
                No Specific Anime Matches Found
              </span>
              <span className="text-[11px] text-zinc-650 max-w-sm block mx-auto leading-relaxed">
                Please loosen filter boundaries or check spelling queries above.
              </span>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-6 gap-6 mt-4">
              {results.map((media) => (
                <AnimeCard
                  key={media.id}
                  media={media}
                  onClick={() => onSearchAnime(media.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <div className="w-full max-w-6xl mx-auto px-6 py-24 md:py-32 grid md:grid-cols-2 gap-16 items-center relative z-10 border-t border-zinc-900/50 mt-12">
        <div className="flex flex-col gap-6 order-2 md:order-1">
          <h4 className="text-red-500 font-extrabold uppercase tracking-[0.2em] text-xs">About Ani[priv8]</h4>
          <h2 className="text-3xl md:text-5xl font-bold leading-tight text-white mb-2 tracking-tight">
            A quiet, high-performance portal that <span className="text-red-500">respects the medium</span> and the viewer.
          </h2>
          <p className="text-zinc-400 leading-relaxed max-w-md">
            Anime is more than entertainment — it's a gateway to worlds full of emotion, creativity, and storytelling. From intense battles to unforgettable romantic moments, anime has become essential for millions of fans worldwide.
          </p>
          <p className="text-zinc-400 leading-relaxed max-w-md">
            Ani[priv8] was built because the Internet has become too loud. Anime sites have become a minefield of ads, pop-ups, and clutter. We don't want your data. We don't want your attention for anything other than the show you came to watch.
          </p>
        </div>

        <div className="relative h-[400px] md:h-[600px] flex items-center justify-center order-1 md:order-2">
          <div className="absolute top-[20%] left-[10%] w-2 h-2 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]" />
          <div className="absolute bottom-[10%] right-[20%] w-2 h-2 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]" />
          
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[400px] h-[500px]">
            <div className="absolute top-0 right-0 w-[55%] aspect-[2/3] rounded-xl overflow-hidden rotate-[6deg] border border-zinc-800 shadow-2xl opacity-90 delay-100 hover:rotate-[8deg] transition-all duration-500 z-10 shadow-black/80">
              {trendingVisuals[0]?.coverImage?.large ? (
                <img src={trendingVisuals[0].coverImage.large} alt="Anime Art" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-zinc-900 border border-zinc-800 flex items-center justify-center" />
              )}
            </div>
            
            <div className="absolute top-[25%] left-[50%] -translate-x-1/2 w-[60%] aspect-[3/4] rounded-xl overflow-hidden -rotate-[2deg] border border-zinc-800 shadow-2xl hover:-rotate-[4deg] transition-all duration-500 z-20 shadow-black/80 bg-zinc-950">
              {trendingVisuals[1]?.coverImage?.large ? (
                <img src={trendingVisuals[1].coverImage.large} alt="Anime Art" className="w-full h-full object-cover hover:scale-105 transition-transform" />
              ) : (
                <div className="w-full h-full bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                  <span className="text-zinc-600 text-xs font-bold animate-pulse">Loading Asset...</span>
                </div>
              )}
            </div>

            <div className="absolute bottom-[5%] left-[10%] w-[55%] aspect-[2/3] rounded-xl overflow-hidden rotate-[12deg] border border-zinc-800 shadow-2xl opacity-95 hover:rotate-[14deg] transition-all duration-500 z-30 shadow-black/80">
              {trendingVisuals[2]?.coverImage?.large ? (
                <img src={trendingVisuals[2].coverImage.large} alt="Anime Art" className="w-full h-full object-cover hover:scale-105 transition-transform delay-100" />
              ) : (
                <div className="w-full h-full bg-zinc-900 border border-zinc-800 flex items-center justify-center" />
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="w-full max-w-6xl mx-auto px-6 py-24 md:py-32 grid md:grid-cols-2 gap-16 items-center relative z-10 border-t border-zinc-900/50">
        
        <div className="relative h-[400px] md:h-[600px] flex items-center justify-center">
            <div className="absolute top-[10%] left-[0%] w-[45%] aspect-[3/4] rounded-xl overflow-hidden rotate-[-10deg] border border-zinc-800 shadow-2xl z-10 shadow-black/80">
              {trendingVisuals[3]?.coverImage?.large ? (
                <img src={trendingVisuals[3].coverImage.large} alt="Anime Art" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-zinc-900 border border-zinc-800" />
              )}
            </div>

            <div className="absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[55%] aspect-[2/3] rounded-2xl overflow-hidden rotate-0 border border-zinc-800 shadow-2xl z-20 shadow-black/80 relative">
              {trendingVisuals[4]?.coverImage?.large ? (
                <img src={trendingVisuals[4].coverImage.large} alt="Anime Art" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                  <span className="text-zinc-600 text-xs font-bold animate-pulse">Loading Asset...</span>
                </div>
              )}
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 w-full translate-x-2 translate-y-6 flex items-center justify-center pointer-events-none scale-110">
                 <div className="bg-[#101014] p-3 rounded-2xl border border-zinc-800 shadow-xl flex items-center gap-3">
                   <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                     <span className="text-red-500 text-xl font-black">★</span>
                   </div>
                   <div className="flex flex-col">
                     <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Top Rated</span>
                     <span className="text-sm font-black text-white">1080p Quality</span>
                   </div>
                 </div>
               </div>
            </div>

            <div className="absolute bottom-[5%] right-[0%] w-[45%] aspect-[4/3] rounded-xl overflow-hidden rotate-[8deg] border border-zinc-800 shadow-2xl z-30 shadow-black/80">
               {trendingVisuals[5]?.coverImage?.large ? (
                 <img src={trendingVisuals[5].coverImage.large} alt="Anime Art" className="w-full h-full object-cover" />
               ) : (
                 <div className="w-full h-full bg-zinc-900 border border-zinc-800" />
               )}
            </div>
        </div>

        <div className="flex flex-col gap-10">
          <div className="flex flex-col gap-4">
            <h4 className="text-red-500 font-extrabold uppercase tracking-[0.2em] text-xs">Why Ani[priv8]?</h4>
            <h2 className="text-3xl md:text-5xl font-bold leading-tight text-white tracking-tight">
              Engineered for <span className="text-red-500">performance</span> and pure enjoyment.
            </h2>
          </div>

          <div className="flex flex-col gap-8 mt-2">
            
            <div className="flex gap-5">
              <div className="w-12 h-12 shrink-0 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                <Users className="w-5 h-5 text-zinc-400" />
              </div>
              <div className="flex flex-col pt-1">
                <h4 className="text-white font-bold text-lg mb-1">Watch Parties</h4>
                <p className="text-zinc-500 leading-relaxed text-sm">Sync up and watch your favorite episodes together with friends in real-time private rooms.</p>
              </div>
            </div>

            <div className="flex gap-5">
              <div className="w-12 h-12 shrink-0 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                <Radio className="w-5 h-5 text-zinc-400" />
              </div>
              <div className="flex flex-col pt-1">
                <h4 className="text-white font-bold text-lg mb-1">Built-in OST Radio</h4>
                <p className="text-zinc-500 leading-relaxed text-sm">Listen to a customized continuous stream of anime soundtracks and openings while you browse.</p>
              </div>
            </div>

            <div className="flex gap-5">
              <div className="w-12 h-12 shrink-0 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-zinc-400" />
              </div>
              <div className="flex flex-col pt-1">
                <h4 className="text-white font-bold text-lg mb-1">Integrated Manga</h4>
                <p className="text-zinc-500 leading-relaxed text-sm">Seamlessly transition from watching anime episodes to reading their latest manga chapters.</p>
              </div>
            </div>

            <div className="flex gap-5">
              <div className="w-12 h-12 shrink-0 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-zinc-400" />
              </div>
              <div className="flex flex-col pt-1">
                <h4 className="text-white font-bold text-lg mb-1">Active Community</h4>
                <p className="text-zinc-500 leading-relaxed text-sm">Join discussions, share opinions in forums, and compete on our global leaderboards.</p>
              </div>
            </div>

          </div>
        </div>
      </div>

    </div>
  );
}
