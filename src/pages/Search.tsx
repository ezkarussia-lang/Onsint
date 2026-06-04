import React, { useEffect, useState } from 'react';
import { searchAnime, AnimeMedia, ALL_GENRES } from '../services/anilist';
import { Search as SearchIcon, SlidersHorizontal, Loader2, RefreshCw, Star } from 'lucide-react';
import AnimeCard from '../components/AnimeCard';

interface SearchProps {
  onSelectAnime: (id: number) => void;
  initialSearchQuery?: string;
}

export default function Search({ onSelectAnime, initialSearchQuery = '' }: SearchProps) {
  const [query, setQuery] = useState(initialSearchQuery);
  const [selectedGenre, setSelectedGenre] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedSort, setSelectedSort] = useState('POPULARITY_DESC');
  const [results, setResults] = useState<AnimeMedia[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Custom display filters dropdown
  const [showFilters, setShowFilters] = useState(false);

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

  const performSearch = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      
      const genresInput = selectedGenre ? [selectedGenre] : undefined;
      const response = await searchAnime(1, 24, query, genresInput, selectedStatus, selectedSort);
      
      setResults(response.media);
    } catch (err) {
      console.error('Error fetching search entries matching configuration:', err);
      setErrorMsg('Oops, search failed. Please adjust filters or try again.');
    } finally {
      setLoading(false);
    }
  };

  // Auto trigger search on dependencies adjust
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      performSearch();
    }, 350); // Small 350ms feel debounce for keyboard typing

    return () => clearTimeout(delayDebounce);
  }, [query, selectedGenre, selectedStatus, selectedSort]);

  const clearFilters = () => {
    setQuery('');
    setSelectedGenre('');
    setSelectedStatus('ALL');
    setSelectedSort('POPULARITY_DESC');
  };

  return (
    <div className="w-full flex flex-col gap-6 pb-16 animate-fade-in px-4 md:px-8 select-none">
      
      {/* Header bar */}
      <div className="border-b border-red-950/20 pb-4">
        <h1 className="text-xl md:text-2xl font-black uppercase text-glow flex items-center gap-2">
          <SlidersHorizontal className="w-5 h-5 text-red-500" /> Search Anime..
        </h1>
        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mt-0.5">
          filter anime by genres!
        </p>
      </div>

      {/* Main Search Input Form without query buttons */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type anime title or keyword... (e.g., Solo Leveling)"
            className="w-full pl-11 pr-4 py-3 bg-[#08080a] hover:bg-[#0c0c0f]/80 focus:bg-[#0c0c0f] border border-zinc-900 focus:border-red-650 rounded-xl text-xs placeholder-zinc-505 text-white outline-none transition-all font-mono"
          />
        </div>

        {/* Filter Slider Hamburger button */}
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

        {/* Reset Button */}
        <button
          type="button"
          onClick={clearFilters}
          className="p-3 bg-[#08080a] hover:bg-zinc-900 border border-zinc-900 rounded-xl text-zinc-400 hover:text-white transition-colors cursor-pointer shrink-0"
          title="Reset Filters"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Grid of filters options - sliding down cleanly if triggered */}
      {showFilters && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-[#08080a]/60 p-5 border border-red-950/20 rounded-2xl animate-fade-in relative shadow-xl">
          {/* Genre Selector */}
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

          {/* Airing Status */}
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

          {/* Sorting options */}
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

      {/* Search results catalog */}
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
              onClick={() => onSelectAnime(media.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
