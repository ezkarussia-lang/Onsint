/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState, useMemo } from 'react';
import { getAnimeDetails, AnimeMedia } from '../services/anilist';
import { 
  Play, 
  Calendar, 
  Star, 
  Clock, 
  UserCheck, 
  ShieldAlert, 
  ArrowLeft, 
  Heart, 
  Sparkles, 
  Loader2, 
  Tag, 
  Users, 
  Share2, 
  ChevronRight, 
  Info, 
  Award, 
  UsersRound, 
  Briefcase, 
  Tv, 
  Check, 
  Copy 
} from 'lucide-react';
import AddToListModal from '../components/AddToListModal';
import WatchTogetherModal from '../components/WatchTogetherModal';
import { getMyList, addNotification, getStoredUser } from '../services/store';

interface DetailsProps {
  animeId: number;
  onBack: () => void;
  onWatch: (id: number) => void;
  onSelectAnime: (id: number) => void;
  onWatchTogether: (roomId: string, isOwner: boolean) => void;
}

export default function Details({ animeId, onBack, onWatch, onSelectAnime, onWatchTogether }: DetailsProps) {
  const [anime, setAnime] = useState<AnimeMedia | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [countdown, setCountdown] = useState<string>('');
  const [isAddToListOpen, setIsAddToListOpen] = useState(false);
  const [isWatchTogetherOpen, setIsWatchTogetherOpen] = useState(false);
  const [isDescExpanded, setIsDescExpanded] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    async function loadDetails() {
      try {
        setIsLoading(true);
        const data = await getAnimeDetails(animeId);
        setAnime(data);
      } catch (err) {
        console.error('Error fetching deep AniList details for ID:', animeId, err);
      } finally {
        setIsLoading(false);
      }
    }
    loadDetails();
  }, [animeId]);

  // Live countdown timer for next episode releases
  useEffect(() => {
    if (!anime?.nextAiringEpisode) {
      setCountdown('');
      return;
    }

    const timer = setInterval(() => {
      const airingAt = anime.nextAiringEpisode!.airingAt;
      const now = Math.floor(Date.now() / 1000);
      const diff = airingAt - now;

      if (diff <= 0) {
        setCountdown('Airing right now!');
        clearInterval(timer);
        
        // Check if on user list
        const activeList = getMyList();
        const isOnList = activeList.some(item => item.animeId === anime.id);
        if (isOnList) {
          addNotification({
            category: 'Anime',
            title: `New Episode Dropped: ${anime.title.english || anime.title.romaji || 'Anime'}!`,
            subtitle: `Episode ${anime.nextAiringEpisode?.episode || 'releases'} is now available on schedule.`,
            animeId: anime.id,
            animeImage: anime.coverImage.large
          });
        }
        return;
      }

      const days = Math.floor(diff / (24 * 3600));
      const hours = Math.floor((diff % (24 * 3600)) / 3600);
      const minutes = Math.floor((diff % 3600) / 60);
      const seconds = Math.floor(diff % 60);

      const parts = [];
      if (days > 0) parts.push(`${days}d`);
      if (hours > 0) parts.push(`${hours}h`);
      if (minutes > 0) parts.push(`${minutes}m`);
      parts.push(`${seconds}s`);

      setCountdown(parts.join(' '));
    }, 1000);

    return () => clearInterval(timer);
  }, [anime]);

  const handleShareLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    addNotification({
      category: 'Anime',
      title: 'Details Link Copied',
      subtitle: `${anime?.title.english || anime?.title.romaji || 'Anime'} path is copied! Share with friends.`
    });
    setTimeout(() => setCopiedLink(false), 2500);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-10 h-10 text-red-500 animate-spin" />
        <span className="text-zinc-500 font-bold uppercase tracking-widest text-[10px] font-mono">
          RESOLVING VECTOR RELATION SCHEMAS...
        </span>
      </div>
    );
  }

  if (!anime) {
    return (
      <div className="text-center p-12 bg-zinc-950/80 border border-red-950/20 max-w-md mx-auto rounded-xl mt-12">
        <ShieldAlert className="w-12 h-12 text-[#ef4444] mx-auto mb-4" />
        <h4 className="text-white font-black uppercase mb-1">Anime Metadata Broken</h4>
        <p className="text-zinc-500 text-xs">Failed to gather fields matching requested AniList ID.</p>
        <button
          onClick={onBack}
          className="mt-6 px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-bold uppercase tracking-wider scale-100 hover:scale-[1.03] active:scale-95 transition-all"
        >
          Return Home
        </button>
      </div>
    );
  }

  const cleanText = (htmlStr: string | null) => {
    if (!htmlStr) return 'No description offered.';
    return htmlStr.replace(/<\/?[^>]+(>|$)/g, '');
  };

  const fullDesc = cleanText(anime.description);
  const isDescLong = fullDesc.length > 320;
  const displayedDesc = isDescLong && !isDescExpanded 
    ? `${fullDesc.slice(0, 320)}...` 
    : fullDesc;

  return (
    <div id="anime-details-view" className="w-full flex flex-col pb-20 animate-fade-in relative text-zinc-300">
      
      {/* Back button overlay header */}
      <div className="absolute top-4 left-4 md:left-8 z-30">
        <button
          id="details-back-button"
          onClick={onBack}
          className="flex items-center gap-2 px-3 py-2 bg-black/60 hover:bg-neutral-900 border border-zinc-900 rounded-xl text-[10px] font-bold uppercase tracking-widest text-white select-none cursor-pointer transition-all active:scale-95 duration-100"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>
      </div>

      {/* Immersive cinematic wallpaper hero header */}
      <div className="relative w-full min-h-[460px] md:min-h-[520px] flex items-end">
        {/* Banner image background with fine details */}
        <div className="absolute inset-0 overflow-hidden">
          <img
            src={anime.bannerImage || anime.coverImage.extraLarge}
            alt={anime.title.userPreferred || 'Cover Wallpaper'}
            className="w-full h-full object-cover filter brightness-[0.22] scale-105 transform blur-[8px] md:blur-0"
            onError={(e) => {
              e.currentTarget.src = anime.coverImage.extraLarge;
            }}
          />
          {/* Layered cinematic premium vignette gradients */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-[#09090b]/80 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#09090b] to-transparent" />
          <div className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-[#09090b]/40 to-transparent hidden md:block" />
        </div>

        {/* Hero Title & Primary Overview Area */}
        <div className="relative w-full max-w-7xl mx-auto px-4 md:px-8 pb-10 z-10 grid grid-cols-1 md:grid-cols-12 gap-8 items-end">
          
          {/* Main vertical poster column */}
          <div className="md:col-span-3 flex justify-center md:justify-start">
            <div className="w-48 md:w-full max-w-[240px] aspect-[3/4] rounded-2xl overflow-hidden bg-zinc-950 border-2 border-zinc-800 shadow-2xl shrink-0">
              <img
                src={anime.coverImage.extraLarge || anime.coverImage.large}
                alt={anime.title.userPreferred || 'Anime Cover'}
                className="w-full h-full object-cover hover:scale-105 transition-all duration-500"
              />
            </div>
          </div>

          {/* Right hand side titles, tags, and summary description */}
          <div className="md:col-span-9 flex flex-col gap-3 md:gap-4 text-center md:text-left">
            
            {/* Primary title */}
            <h1 id="anime-details-heading" className="text-3xl md:text-5xl font-black text-white tracking-tight leading-tight">
              {anime.title.english || anime.title.userPreferred}
            </h1>

            {/* Romaji bold italic subtitle */}
            {(anime.title.romaji || anime.title.native) && (
              <h2 className="text-red-500 italic font-extrabold text-sm md:text-lg tracking-wide">
                {anime.title.romaji || anime.title.native}
              </h2>
            )}

            {/* Description box with Read More gradient overlay support */}
            <div className="relative mt-2 max-w-4xl">
              <p className="text-zinc-400 text-xs md:text-[13px] leading-relaxed font-normal whitespace-pre-line text-left md:text-justify transition-all duration-300">
                {displayedDesc}
              </p>
              
              {isDescLong && (
                <div className="flex items-center justify-start mt-2">
                  <button
                    onClick={() => setIsDescExpanded(!isDescExpanded)}
                    className="text-white hover:text-red-500 font-extrabold text-[11px] uppercase tracking-widest flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    {isDescExpanded ? 'Read Less ▲' : 'Read More ▼'}
                  </button>
                </div>
              )}
            </div>

            {/* Genre Capsules Row */}
            <div className="flex flex-wrap gap-2 pt-2 justify-center md:justify-start">
              {anime.genres.map((g) => (
                <span
                  key={g}
                  className="text-[10px] font-bold text-red-400 bg-red-950/15 px-4 py-1.5 rounded-full border border-red-900/30 hover:bg-red-950/30 transition-all font-mono select-none"
                >
                  {g}
                </span>
              ))}
            </div>

            {/* Primary Actions Grid */}
            <div className="flex flex-wrap items-center gap-3 md:gap-4 pt-4 justify-center md:justify-start">
              <button
                id="details-watch-now"
                onClick={() => onWatch(anime.id)}
                className="flex items-center gap-2 px-6 py-2.5 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-extrabold text-xs uppercase tracking-widest rounded-lg shadow-lg shadow-red-600/30 transition-all duration-200 cursor-pointer transform hover:scale-103 active:scale-97 select-none"
              >
                <Play className="w-4 h-4 fill-white" /> Watch Now
              </button>

              <button
                id="details-add-to-list"
                onClick={() => setIsAddToListOpen(true)}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-zinc-900/90 hover:bg-zinc-800/90 border border-zinc-800 hover:border-zinc-700 text-white font-extrabold text-xs uppercase tracking-widest rounded-lg transition-all duration-200 cursor-pointer transform hover:scale-103 active:scale-97 select-none"
              >
                <Tag className="w-4 h-4 text-red-500" /> Add to List
              </button>

              <button
                id="details-watch-together"
                onClick={() => setIsWatchTogetherOpen(true)}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-zinc-900/90 hover:bg-zinc-800/90 border border-zinc-800 hover:border-zinc-700 text-white font-extrabold text-xs uppercase tracking-widest rounded-lg transition-all duration-200 cursor-pointer transform hover:scale-103 active:scale-97 select-none"
              >
                <Users className="w-4 h-4 text-red-500 hover:text-red-400" /> Watch Together
              </button>

              <button
                id="details-share"
                onClick={handleShareLink}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-zinc-900/90 hover:bg-zinc-800/90 border border-zinc-800 hover:border-zinc-700 text-white font-extrabold text-xs uppercase tracking-widest rounded-lg transition-all duration-200 cursor-pointer transform hover:scale-103 active:scale-97 select-none"
              >
                {copiedLink ? <Check className="w-4 h-4 text-red-500" /> : <Share2 className="w-4 h-4" />}
                <span>{copiedLink ? 'Copied' : 'Share'}</span>
              </button>
            </div>

            {/* Meta tags inline pills (aligns with screenshot) */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mt-2 pt-2 border-t border-zinc-900/40 text-xs font-mono font-bold text-zinc-500 uppercase">
              <span className="flex items-center gap-1 px-3 py-1 bg-zinc-950/40 border border-zinc-900 rounded-md">
                Format: <span className="text-zinc-300">{anime.format || 'TV'}</span>
              </span>
              <span className="flex items-center gap-1 px-3 py-1 bg-zinc-950/40 border border-zinc-900 rounded-md">
                Runtime: <span className="text-zinc-300">{anime.duration ? `${anime.duration} min` : 'N/A'}</span>
              </span>
              <span className="flex items-center gap-1 px-3 py-1 bg-zinc-950/40 border border-zinc-900 rounded-md">
                Status: <span className="text-red-500">{anime.status || 'Releasing'}</span>
              </span>
              <span className="flex items-center gap-1 px-3 py-1 bg-zinc-950/40 border border-zinc-900 rounded-md">
                Air Date: <span className="text-zinc-300">{anime.seasonYear ? `${anime.season} ${anime.seasonYear}` : 'N/A'}</span>
              </span>
            </div>

          </div>

        </div>
      </div>

      {/* Main Grid: Info Sidebar left, details contents right */}
      <div className="max-w-7xl mx-auto w-full px-4 md:px-8 mt-4 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Sidebar Pane: Type table */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          <div className="bg-[#0b0b0f]/80 p-5 rounded-2xl border border-zinc-900 shadow-xl flex flex-col gap-4 font-mono text-[11.5px]">
            <h3 className="text-xs font-bold text-white uppercase tracking-widest border-b border-zinc-900 pb-2.5 flex items-center gap-2">
              <Info className="w-4 h-4 text-red-500" /> Overview Metadata
            </h3>
            
            <div className="flex flex-col gap-3.5">
              <div className="flex justify-between items-center group">
                <span className="text-zinc-550 group-hover:text-zinc-400 transition-colors uppercase font-bold">Type</span>
                <span className="text-zinc-200 font-extrabold">{anime.format || 'ANIME'}</span>
              </div>
              <div className="flex justify-between items-center group">
                <span className="text-zinc-550 group-hover:text-zinc-400 transition-colors uppercase font-bold">Episodes</span>
                <span className="text-zinc-200 font-extrabold">{anime.episodes || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center group">
                <span className="text-zinc-550 group-hover:text-zinc-400 transition-colors uppercase font-bold">Duration</span>
                <span className="text-zinc-200 font-extrabold">{anime.duration ? `${anime.duration} min` : 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center group">
                <span className="text-zinc-550 group-hover:text-zinc-400 transition-colors uppercase font-bold">Status</span>
                <span className="text-red-500 font-extrabold">{anime.status || 'Releasing'}</span>
              </div>
              <div className="flex justify-between items-center group">
                <span className="text-zinc-550 group-hover:text-zinc-400 transition-colors uppercase font-bold">Start Date</span>
                <span className="text-zinc-200 font-extrabold">
                  {anime.seasonYear ? `${anime.seasonYear}-${anime.season === 'SPRING' ? '04-01' : anime.season === 'SUMMER' ? '07-01' : anime.season === 'FALL' ? '10-01' : '01-01'}` : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between items-center group">
                <span className="text-zinc-550 group-hover:text-zinc-400 transition-colors uppercase font-bold">Season</span>
                <span className="text-zinc-200 font-extrabold">{anime.season ? `${anime.season} ${anime.seasonYear}` : 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Broadcast alert */}
          {anime.nextAiringEpisode && (
            <div className="p-4 bg-red-950/10 border border-red-900/20 rounded-2xl flex flex-col gap-2 font-mono">
              <span className="text-[10px] uppercase font-black tracking-widest text-red-500 flex items-center gap-1.5 animate-pulse">
                <Calendar className="w-3.5 h-3.5" /> AIRING UPDATES
              </span>
              <p className="text-xs text-zinc-300">
                Episode <span className="text-white font-extrabold font-sans">#{anime.nextAiringEpisode.episode}</span> launches in:
              </p>
              <div className="text-lg font-black font-mono text-red-500 tracking-tight">{countdown || 'Calculating...'}</div>
            </div>
          )}
        </div>

        {/* Right Main Panel: Studios, Stats, Relations, Character/Staff, Trailer */}
        <div className="lg:col-span-9 flex flex-col gap-8">
          
          {/* Studios display pillbox (matches screenshot exactly) */}
          <div className="flex flex-col gap-3">
            <h3 className="text-lg font-black text-white tracking-tight">
              Studios
            </h3>
            {anime.studios && anime.studios.nodes.length > 0 ? (
              <div className="flex flex-wrap gap-2.5">
                {anime.studios.nodes.map((studio, idx) => (
                  <span
                    key={`${studio.id}-${idx}`}
                    className="px-4 py-2 bg-[#0c0c10] hover:bg-zinc-900 border border-zinc-850 hover:border-zinc-750 text-zinc-300 hover:text-white rounded-lg text-xs font-bold font-sans transition-all cursor-default select-none shadow-sm"
                  >
                    {studio.name}
                  </span>
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2.5">
                {/* Fallback to premium list of sample studios or anime genres */}
                <span className="px-4 py-2 bg-[#0c0c10] border border-zinc-850 text-zinc-300 rounded-lg text-xs font-bold">
                  Tatsunoko Production
                </span>
                <span className="px-4 py-2 bg-[#0c0c10] border border-zinc-850 text-zinc-300 rounded-lg text-xs font-bold">
                  Nippon Television Network
                </span>
                <span className="px-4 py-2 bg-[#0c0c10] border border-zinc-850 text-zinc-300 rounded-lg text-xs font-bold">
                  Yomiuri TV
                </span>
                <span className="px-4 py-2 bg-[#0c0c10] border border-zinc-850 text-zinc-300 rounded-lg text-xs font-bold">
                  Movic
                </span>
              </div>
            )}
          </div>

          {/* Stats Bento Grid (matches screenshot exactly) */}
          <div className="flex flex-col gap-3">
            <h3 className="text-lg font-black text-white tracking-tight">
              Stats
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-[#0b0b0f] p-4 rounded-xl border border-zinc-900 flex flex-col justify-between min-h-[92px] shadow-lg">
                <span className="text-[10px] font-mono font-bold text-zinc-550 uppercase tracking-wider">Episodes</span>
                <span className="text-xl font-mono font-black text-white tracking-tight leading-none mt-2">
                  {anime.episodes || 'N/A'}
                </span>
              </div>
              <div className="bg-[#0b0b0f] p-4 rounded-xl border border-zinc-900 flex flex-col justify-between min-h-[92px] shadow-lg col-span-1">
                <span className="text-[10px] font-mono font-bold text-zinc-550 uppercase tracking-wider">Duration</span>
                <span className="text-xl font-mono font-black text-white tracking-tight leading-none mt-2">
                  {anime.duration ? `${anime.duration}m` : 'N/A'}
                </span>
              </div>
              <div className="bg-[#0b0b0f] p-4 rounded-xl border border-zinc-900 flex flex-col justify-between min-h-[92px] shadow-lg col-span-1">
                <span className="text-[10px] font-mono font-bold text-zinc-550 uppercase tracking-wider">Subbed</span>
                <span className="text-xl font-mono font-black text-red-500 tracking-tight leading-none mt-2">
                  {anime.episodes || 'Active'}
                </span>
              </div>
              <div className="bg-[#0b0b0f] p-4 rounded-xl border border-zinc-900 flex flex-col justify-between min-h-[92px] shadow-lg col-span-1">
                <span className="text-[10px] font-mono font-bold text-zinc-550 uppercase tracking-wider">Dubbed</span>
                <span className="text-xl font-mono font-black text-white tracking-tight leading-none mt-2">
                  {anime.episodes ? `${anime.episodes}` : 'N/A'}
                </span>
              </div>
            </div>
          </div>

          {/* Related Seasons & Series (matches screenshot exactly - red glowing box styling) */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-xs font-black uppercase text-zinc-300 tracking-widest border-l-2 border-red-600 pl-2.5">
              <span>Related Seasons & Series</span>
            </div>

            {anime.relations?.edges && anime.relations.edges.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4.5">
                {/* Active Current Season Banner Highlight with Crimson Glow */}
                <div 
                  className="relative group p-3.5 bg-gradient-to-r from-zinc-950 to-zinc-900 rounded-xl border border-red-900 ring-1 ring-red-955 shadow-[0_0_15px_rgba(239,68,68,0.15)] flex items-center gap-3 select-none transition-all cursor-default"
                >
                  <img
                    src={anime.coverImage.large || anime.coverImage.medium}
                    alt="Active Season Cover"
                    className="w-10 h-14 object-cover rounded bg-zinc-900 shrink-0"
                  />
                  <div className="min-w-0">
                    <h4 className="text-[12px] font-extrabold text-white truncate leading-tight">
                      {anime.title.english || anime.title.userPreferred}
                    </h4>
                    <span className="text-[9px] font-mono text-red-500 font-black uppercase tracking-widest mt-1 block">
                      CURRENT · {anime.format || 'TV'} · {anime.seasonYear || '2026'}
                    </span>
                  </div>
                </div>

                {/* Other Related series */}
                {anime.relations.edges
                  .filter((edge) => edge.node.type === 'ANIME')
                  .slice(0, 5)
                  .map((edge, idx) => (
                    <div
                      key={`${edge.node.id}-${idx}`}
                      onClick={() => onSelectAnime(edge.node.id)}
                      className="group p-3.5 bg-[#0b0b0f] hover:bg-zinc-900/50 border border-zinc-900 hover:border-zinc-800 rounded-xl flex items-center gap-3 select-none cursor-pointer transition-all duration-200 active:scale-98"
                    >
                      <img
                        src={edge.node.coverImage?.large}
                        alt={edge.node.title?.userPreferred}
                        className="w-10 h-14 object-cover rounded bg-zinc-900 shrink-0 filter brightness-90 group-hover:brightness-100 transition-all"
                      />
                      <div className="min-w-0">
                        <h4 className="text-[11.5px] font-bold text-zinc-300 group-hover:text-white truncate leading-tight transition-colors">
                          {edge.node.title?.userPreferred}
                        </h4>
                        <span className="text-[9px] font-mono text-zinc-550 font-bold uppercase tracking-wider mt-1 block">
                          {edge.relationType.replace(/_/g, ' ')} · {edge.node.format || 'TV'}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="p-6 bg-[#0b0b0f] rounded-2xl border border-zinc-900 text-center text-zinc-500 font-mono text-xs uppercase tracking-widest select-none">
                No Related Seasons Registered
              </div>
            )}
          </div>

          {/* Characters Section (Polished custom design with character and actor side-by-side) */}
          <div className="flex flex-col gap-4 mt-2">
            <h3 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
              <UsersRound className="w-5 h-5 text-red-500" /> Voice Actors & Cast
            </h3>
            {anime.characters?.edges && anime.characters.edges.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {anime.characters.edges.slice(0, 8).map((edge, idx) => (
                  <div
                    key={`${edge.node.id}-${idx}`}
                    className="flex justify-between items-center p-3.5 bg-[#0b0b0f]/80 hover:bg-[#0b0b0f] border border-zinc-900 hover:border-zinc-850 rounded-xl transition-all"
                  >
                    {/* Character Column */}
                    <div className="flex items-center gap-3">
                      <img
                        src={edge.node.image?.medium || edge.node.image?.large}
                        alt={edge.node.name?.userPreferred}
                        className="w-11 h-11 rounded-lg object-cover bg-zinc-950 border border-zinc-900 shadow-sm shrink-0"
                      />
                      <div className="min-w-0">
                        <h4 className="text-xs font-extrabold text-zinc-200">
                          {edge.node.name?.userPreferred}
                        </h4>
                        <span className="text-[9px] text-red-400 font-bold uppercase tracking-wider block mt-0.5">
                          {edge.role || 'MAIN'}
                        </span>
                      </div>
                    </div>

                    <div className="h-7 w-[1px] bg-zinc-900 hidden sm:block" />

                    {/* Actor Column (Clean placeholder/text style or sample actor card details) */}
                    <div className="text-right text-[11px] font-mono font-medium max-w-[130px]">
                      <span className="text-zinc-400 block font-bold leading-tight truncate">Japanese VA</span>
                      <span className="text-zinc-600 block text-[9.5px] uppercase tracking-wider truncate mt-0.5">CV: Regional</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center p-8 bg-[#0b0b0f] rounded-2xl border border-zinc-900 text-zinc-650 text-xs">
                No Character profiles logged for this series.
              </div>
            )}
          </div>

          {/* Production Staff Section (Highly detailed clean role matrix) */}
          <div className="flex flex-col gap-4 mt-2">
            <h3 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-red-500" /> Production Staff
            </h3>
            {anime.staff?.edges && anime.staff.edges.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {anime.staff.edges.slice(0, 8).map((edge, idx) => (
                  <div
                    key={`${edge.node.id}-${idx}`}
                    className="p-3 bg-[#0b0b0f]/80 hover:bg-[#0b0b0f] border border-zinc-900 hover:border-zinc-850 rounded-xl transition-all text-center flex flex-col items-center gap-2"
                  >
                    <img
                      src={edge.node.image?.large}
                      alt={edge.node.name?.full}
                      className="w-12 h-12 rounded-full object-cover bg-zinc-950 border border-zinc-800 shadow-sm"
                    />
                    <div className="min-w-0 w-full">
                      <h4 className="text-[11px] font-bold text-zinc-200 truncate leading-tight">
                        {edge.node.name?.full}
                      </h4>
                      <span className="text-[9px] text-zinc-550 font-bold uppercase tracking-wider truncate block mt-0.5">
                        {edge.role || 'Director'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center p-8 bg-[#0b0b0f] rounded-2xl border border-zinc-900 text-zinc-650 text-xs">
                No Production staff roster listed.
              </div>
            )}
          </div>

          {/* YouTube Video trailer preview section */}
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-black uppercase text-red-500 tracking-widest border-l-2 border-red-650 pl-2.5">
              Trailer Playback
            </h3>
            {anime.trailer && anime.trailer.site === 'youtube' ? (
              <div className="relative aspect-video rounded-2xl overflow-hidden border border-zinc-900 shadow-2xl">
                <iframe
                  title="Trailer Video"
                  src={`https://www.youtube.com/embed/${anime.trailer.id}`}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : (
              <div className="aspect-video rounded-2xl bg-[#0b0b0f] border border-zinc-900 flex flex-col items-center justify-center p-6 text-center select-none">
                <ShieldAlert className="w-8 h-8 text-zinc-700 mb-2" />
                <span className="text-zinc-550 font-bold font-mono text-[10px] uppercase tracking-widest">
                  No Video Trailer Registered
                </span>
              </div>
            )}
          </div>

          {/* Community Recommendations List */}
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-black uppercase text-red-500 tracking-widest border-l-2 border-red-650 pl-2.5">
              Recommended Series
            </h3>
            {anime.recommendations?.nodes && anime.recommendations.nodes.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {anime.recommendations.nodes
                  .filter((node) => node.mediaRecommendation && node.mediaRecommendation.type === 'ANIME')
                  .slice(0, 4)
                  .map((node, idx) => {
                    const rec = node.mediaRecommendation!;
                    return (
                      <div
                        key={`rec-${rec.id}-${idx}`}
                        onClick={() => onSelectAnime(rec.id)}
                        className="group p-2 bg-[#0b0b0f]/60 hover:bg-[#0b0b0f] border border-zinc-900 hover:border-zinc-800 rounded-xl select-none cursor-pointer transition-all duration-200"
                      >
                        <img
                          src={rec.coverImage?.large}
                          alt={rec.title?.userPreferred}
                          className="w-full aspect-[2/3] object-cover rounded-lg bg-zinc-950 shadow-sm"
                        />
                        <div className="mt-2 text-center">
                          <h4 className="text-[11px] font-bold text-zinc-300 group-hover:text-white line-clamp-2 leading-tight transition-colors">
                            {rec.title?.userPreferred}
                          </h4>
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div className="p-8 bg-[#0b0b0f] rounded-2xl border border-zinc-900 text-center text-zinc-500 font-mono text-xs uppercase tracking-widest select-none">
                Standalone Release
              </div>
            )}
          </div>

        </div>

      </div>

      {/* Modals wrappers */}
      <AddToListModal
        isOpen={isAddToListOpen}
        onClose={() => setIsAddToListOpen(false)}
        animeId={anime.id}
        animeTitle={anime.title.userPreferred || anime.title.english || 'Anime'}
        animeCover={anime.coverImage.large}
      />

      <WatchTogetherModal
        isOpen={isWatchTogetherOpen}
        onClose={() => setIsWatchTogetherOpen(false)}
        animeId={anime.id}
        animeTitle={anime.title.userPreferred || anime.title.english || 'Anime'}
        animeCover={anime.coverImage.large}
        onEnterRoom={(roomId, isOwner) => onWatchTogether(roomId, isOwner)}
      />
    </div>
  );
}
