/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState, useMemo } from 'react';
import { fetchEpisodes, fetchStreamSources, resolveM3u8, AnimeEpisode, AnimeWatchResponse } from '../services/api';
import { getAnimeDetails, AnimeMedia } from '../services/anilist';
import VideoPlayer from '../components/VideoPlayer';
import Comments from '../components/Comments';
import { ArrowLeft, Loader2, Play, Users, AlertCircle, Sparkles, Filter, ChevronRight, ChevronLeft, ChevronDown, Tv, CornerRightDown, Grid, List } from 'lucide-react';

interface WatchProps {
  animeId: number;
  onBack: () => void;
  onSelectAnime: (id: number) => void;
}

export default function Watch({ animeId, onBack, onSelectAnime }: WatchProps) {
  const [animeInfo, setAnimeInfo] = useState<AnimeMedia | null>(null);
  const [providers, setProviders] = useState<Record<string, { sub?: AnimeEpisode[]; dub?: AnimeEpisode[] }>>({});
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<'sub' | 'dub'>('sub');
  const [selectedEpisode, setSelectedEpisode] = useState<AnimeEpisode | null>(null);
  const [streamInfo, setStreamInfo] = useState<AnimeWatchResponse | null>(null);
  const [activeStreamIndex, setActiveStreamIndex] = useState<number>(0);
  const [isSourceDropdownOpen, setIsSourceDropdownOpen] = useState(false);

  const [loadingEpisodes, setLoadingEpisodes] = useState(true);
  const [loadingStreams, setLoadingStreams] = useState(false);
  const [episodeSearch, setEpisodeSearch] = useState('');
  const [episodeLayoutMode, setEpisodeLayoutMode] = useState<'list' | 'grid'>('list');
  const [errorEpisodes, setErrorEpisodes] = useState<string | null>(null);
  const [errorStreams, setErrorStreams] = useState<string | null>(null);

  // Stream decryption/resolving states
  const [playableUrl, setPlayableUrl] = useState<string>('');
  const [resolvingM3u8, setResolvingM3u8] = useState<boolean>(false);
  const [resolveError, setResolveError] = useState<string | null>(null);

  const cleanServerName = (name: string) => {
    if (!name) return 'Direct';
    let cleaned = name;
    
    cleaned = cleaned
      .replace('AnimeX', 'AX')
      .replace('Zenith Default', 'Zenith')
      .replace('Default', 'Def')
      .replace('gogoanime', 'Gogo')
      .replace('animepahe', 'Pahe')
      .trim();

    return cleaned;
  };

  // Fallback demo playlist in case API providers fail or are sluggish
  // (Removed backup stream logic)

  // Load static metadata from AniList
  useEffect(() => {
    getAnimeDetails(animeId)
      .then((data) => setAnimeInfo(data))
      .catch((e) => console.error('Error fetching AniList watch titles details:', e));
  }, [animeId]);

  // Load episodes mapping from AnimePahe API
  useEffect(() => {
    async function loadEpisodes() {
      try {
        setLoadingEpisodes(true);
        setErrorEpisodes(null);
        setSelectedProvider('');
        setSelectedEpisode(null);
        setStreamInfo(null);

        const res = await fetchEpisodes(animeId);

        if (res.providers && Object.keys(res.providers).length > 0) {
          // Format structural keys
          const formatted: Record<string, { sub?: AnimeEpisode[]; dub?: AnimeEpisode[] }> = {};
          Object.entries(res.providers).forEach(([key, val]) => {
            if (val.episodes) {
              formatted[key] = {
                sub: val.episodes.sub || [],
                dub: val.episodes.dub || [],
              };
            }
          });

          setProviders(formatted);

          // Default selection to an active provider with episodes
          const availableProviders = Object.keys(formatted);
          const defaultProv = availableProviders.find(p => (formatted[p].sub?.length || 0) > 0 || (formatted[p].dub?.length || 0) > 0) || availableProviders[0];
          
          if (defaultProv) {
            setSelectedProvider(defaultProv);
            const defaultCategory = (formatted[defaultProv].sub?.length || 0) > 0 ? 'sub' : 'dub';
            setSelectedCategory(defaultCategory);
            
            const episodesList = formatted[defaultProv][defaultCategory] || [];
            if (episodesList.length > 0) {
              // Sorting episodes by number ascendingly
              const sorted = [...episodesList].sort((a, b) => a.number - b.number);
              setSelectedEpisode(sorted[0]);
            }
          }
        } else {
          // Empty or invalid provider response
          throw new Error('No providers or episode lists matched this AniList ID.');
        }

      } catch (err: any) {
        console.warn('Core episodes API failed. Loading custom mock episodes instead.', err);
        setErrorEpisodes('Dynamic episodes fetch offline. No premium episodes available.');
        
        // Populate standard mock episodes so player is always working
        const mockProv: Record<string, { sub?: AnimeEpisode[]; dub?: AnimeEpisode[] }> = {
          'kiwi (Demo)': {
            sub: Array.from({ length: 12 }, (_, i) => ({
              id: `demo-sub-${i + 1}`,
              number: i + 1,
              title: `Episode ${i + 1}`,
              image: animeInfo?.coverImage.large,
              airDate: '2026-05-22',
            })),
            dub: Array.from({ length: 12 }, (_, i) => ({
              id: `demo-dub-${i + 1}`,
              number: i + 1,
              title: `Episode ${i + 1}`,
              image: animeInfo?.coverImage.large,
              airDate: '2026-05-22',
            })),
          }
        };
        setProviders(mockProv);
        setSelectedProvider('kiwi (Demo)');
        setSelectedCategory('sub');
        setSelectedEpisode(mockProv['kiwi (Demo)'].sub![0]);
      } finally {
        setLoadingEpisodes(false);
      }
    }

    loadEpisodes();
  }, [animeId, animeInfo]);

  // Load stream sources for selected episode
  useEffect(() => {
    if (!selectedEpisode) return;

    async function loadStream() {
      try {
        setLoadingStreams(true);
        setErrorStreams(null);
        setStreamInfo(null);
        setActiveStreamIndex(0);

        // If the ID represents a demo source
        if (selectedEpisode.id.startsWith('demo-')) {
          setStreamInfo({
            streams: [],
            intro: { start: 5, end: 35 },
            outro: { start: 120, end: 150 },
          });
          return;
        }

        const titleParam = animeInfo?.title?.english || animeInfo?.title?.romaji || animeInfo?.title?.userPreferred || 'Anime';
        const sources = await fetchStreamSources(selectedEpisode.id, titleParam);
        if (sources.streams && sources.streams.length > 0) {
          setStreamInfo(sources);
          
          // FIX: Look up match index but fall back to 0 if a strict structural match isn't present
          // Prioritize matching the selectedProvider if possible so the video starts on the right source
          const providerMatchIdx = sources.streams.findIndex(s => s.translationType === selectedCategory && (s as any).provider === selectedProvider);
          const matchIdx = sources.streams.findIndex(s => s.translationType === selectedCategory);
          
          if (providerMatchIdx !== -1) {
            setActiveStreamIndex(providerMatchIdx);
          } else if (matchIdx !== -1) {
            setActiveStreamIndex(matchIdx);
          } else {
            // If category specific filtering is empty, pick the first working global feed provider array
            setActiveStreamIndex(0);
          }
        } else {
          throw new Error('No valid streams arrays found in watcher payload.');
        }

      } catch (err) {
        console.warn('Failed to resolve streams.', err);
        setErrorStreams('Resolving direct video stream timed out or failed. No sources available.');
        setStreamInfo({
          streams: [],
          intro: { start: 10, end: 40 },
          outro: { start: 200, end: 240 },
        });
      } finally {
        setLoadingStreams(false);
      }
    }

    loadStream();
  }, [selectedEpisode]);

  // Stream resolution effect relocated lower below category index declarations to support automatic failover routing

  const getEpisodeNumberFromTitle = (title: string): number | null => {
    const match = title.match(/Episode\s+(\d+)/i);
    if (match) {
      return parseInt(match[1], 10);
    }
    const genericMatch = title.match(/\b(\d+)\b/);
    if (genericMatch) {
      return parseInt(genericMatch[1], 10);
    }
    return null;
  };

  const episodeThumbnailsMap = useMemo(() => {
    const map: Record<number, string> = {};
    if (animeInfo?.streamingEpisodes) {
      animeInfo.streamingEpisodes.forEach(ep => {
        const num = getEpisodeNumberFromTitle(ep.title);
        if (num !== null) {
          map[num] = ep.thumbnail;
        }
      });
    }
    return map;
  }, [animeInfo]);

  // Stable episodes list from the active provider (dynamically matches 'sub' or 'dub' category lists)
  const currentProviderEpisodes = useMemo(() => {
    if (!selectedProvider || !providers[selectedProvider]) return [];
    const prov = providers[selectedProvider];
    const list = (selectedCategory === 'sub' ? prov.sub : prov.dub) || prov.sub || prov.dub || [];
    return [...list].sort((a, b) => a.number - b.number);
  }, [selectedProvider, providers, selectedCategory]);

  // Handle number-only search in typing episodes
  const filteredEpisodes = useMemo(() => {
    const rawSearch = episodeSearch.replace(/[^0-9]/g, '');
    if (!rawSearch) return currentProviderEpisodes;
    return currentProviderEpisodes.filter(ep => ep.number.toString() === rawSearch);
  }, [currentProviderEpisodes, episodeSearch]);

  const handleEpisodeClick = (ep: AnimeEpisode) => {
    setSelectedEpisode(ep);
  };

  const handleProviderSwitch = (provName: string) => {
    setSelectedProvider(provName);
    const prov = providers[provName];
    const episodesList = (selectedCategory === 'sub' ? prov?.sub : prov?.dub) || prov?.sub || prov?.dub || [];
    if (episodesList.length > 0) {
      const currentNumber = selectedEpisode?.number || 1;
      const matchingEp = episodesList.find(e => e.number === currentNumber);
      const sorted = [...episodesList].sort((a, b) => a.number - b.number);
      setSelectedEpisode(matchingEp || sorted[0]);
    }
  };

  const currentStreamUrl = useMemo(() => {
    if (!streamInfo || !streamInfo.streams || streamInfo.streams.length === 0) return '';
    return streamInfo.streams[activeStreamIndex]?.url || streamInfo.streams[0]?.url || '';
  }, [streamInfo, activeStreamIndex]);

  // Extract all sub streams for the currently active stream package
  const availableSubStreams = useMemo(() => {
    if (!streamInfo || !streamInfo.streams) return [];
    return streamInfo.streams.filter(s => s.translationType === 'sub');
  }, [streamInfo]);

  // Extract all dub streams for the currently active stream package
  const availableDubStreams = useMemo(() => {
    if (!streamInfo || !streamInfo.streams) return [];
    return streamInfo.streams.filter(s => s.translationType === 'dub');
  }, [streamInfo]);

  const activeCategoryStreams = useMemo(() => {
    return selectedCategory === 'sub' ? availableSubStreams : availableDubStreams;
  }, [selectedCategory, availableSubStreams, availableDubStreams]);

  const activeCategoryStreamIdx = useMemo(() => {
    if (!streamInfo?.streams || activeCategoryStreams.length === 0) return -1;
    const currentStream = streamInfo.streams[activeStreamIndex];
    if (!currentStream) return 0;
    const idx = activeCategoryStreams.findIndex(s => s.url === currentStream.url && s.quality === currentStream.quality);
    return idx === -1 ? 0 : idx;
  }, [streamInfo, activeStreamIndex, activeCategoryStreams]);

  const handleStreamFailure = (errorMsg: string) => {
    const nextIdx = activeCategoryStreamIdx + 1;
    if (nextIdx < activeCategoryStreams.length && nextIdx >= 0) {
      const nextStream = activeCategoryStreams[nextIdx];
      const overallIdx = streamInfo?.streams?.indexOf(nextStream) ?? -1;
      if (overallIdx !== -1) {
        console.warn(`Stream index ${activeStreamIndex} (${activeCategoryStreams[activeCategoryStreamIdx]?.server}) failed. Failing over to ${nextStream.server}`);
        setResolveError(`Server "${cleanServerName(activeCategoryStreams[activeCategoryStreamIdx]?.server)}" offline. Failing over to next server.`);
        setActiveStreamIndex(overallIdx);
        return;
      }
    }

    // Error out if absolutely everything is offline
    setResolveError(errorMsg || 'This video server is offline.');
    setPlayableUrl('');
  };

  // Load and decrypt playable m3u8 URL from kwik URL in background
  useEffect(() => {
    if (!streamInfo || !streamInfo.streams || streamInfo.streams.length === 0) {
      setPlayableUrl('');
      return;
    }

    const activeStream = streamInfo.streams[activeStreamIndex];
    if (!activeStream) return;

    // Check if it's a demo or direct stream
    if (activeStream.url.startsWith('demo-')) {
      setPlayableUrl(activeStream.url);
      setResolvingM3u8(false);
      return;
    }

    let active = true;
    async function resolveCurrentStream() {
      try {
        setResolvingM3u8(true);
        setResolveError(null);
        const resolved = await resolveM3u8(activeStream.url);
        if (active) {
          setPlayableUrl(resolved);
        }
      } catch (err: any) {
        console.warn('Error resolving stream seed:', err);
        if (active) {
          handleStreamFailure('This source mirror is offline or unreachable.');
        }
      } finally {
        if (active) {
          setResolvingM3u8(false);
        }
      }
    }

    resolveCurrentStream();

    return () => {
      active = false;
    };
  }, [streamInfo, activeStreamIndex, activeCategoryStreams, activeCategoryStreamIdx]);

  const handleSelectStream = (overallIdx: number) => {
    setResolveError(null);
    setPlayableUrl('');
    setActiveStreamIndex(overallIdx);

    // Auto-update selected episode list provider if user switched provider via source dropdown
    const selectedStream = streamInfo?.streams?.[overallIdx];
    if (selectedStream && (selectedStream as any).provider) {
      const provName = (selectedStream as any).provider;
      if (providers[provName] && selectedProvider !== provName) {
        setSelectedProvider(provName);
      }
    }
  };

  const cycleSource = (direction: 'next' | 'prev') => {
    if (activeCategoryStreams.length <= 1) return;
    let nextIdx = activeCategoryStreamIdx;
    if (direction === 'next') {
      nextIdx = (activeCategoryStreamIdx + 1) % activeCategoryStreams.length;
    } else {
      nextIdx = (activeCategoryStreamIdx - 1 + activeCategoryStreams.length) % activeCategoryStreams.length;
    }
    const nextStream = activeCategoryStreams[nextIdx];
    const overallIdx = streamInfo?.streams?.indexOf(nextStream) ?? 0;
    if (overallIdx !== -1) {
      handleSelectStream(overallIdx);
    }
  };

  const handleCategorySwitch = (category: 'sub' | 'dub') => {
    setSelectedCategory(category);
    // Find matching episode under the new category so the ID changes properly
    const prov = providers[selectedProvider];
    if (prov) {
      const episodesList = prov[category] || [];
      if (episodesList.length > 0) {
        const currentNumber = selectedEpisode?.number || 1;
        const matchingEp = episodesList.find(e => e.number === currentNumber);
        setSelectedEpisode(matchingEp || episodesList[0]);
      }
    }
  };

  return (
    <div className="w-full flex flex-col gap-6 pb-20 animate-fade-in px-4 md:px-8 select-none">
      
      {/* Navigation Return row bar */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-2 bg-zinc-950 border border-zinc-900 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 transition-all cursor-pointer"
          title="Back to Details"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-base font-extrabold text-white leading-tight line-clamp-1">
            Now Streaming: {animeInfo?.title.english || animeInfo?.title.userPreferred}
          </h2>
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mt-0.5">
            Playing Episode {selectedEpisode?.number || 1} • {selectedCategory.toUpperCase()} Audio Source
          </p>
        </div>
      </div>

      {/* Main split grid: Episode List Left (PC/TV), video/comments right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Left column holding Episode list (takes order-2 on mobile, order-1 on large screens) */}
        <div className="order-2 lg:order-1 lg:col-span-1 flex flex-col gap-4">
          
          {/* Container holding Episode entries */}
          <div className="bg-[#08080a] border border-red-950/20 rounded-xl overflow-hidden flex flex-col h-[520px] lg:h-[720px] shadow-2xl relative">
            
            {/* Header of Episode List container */}
            <div className="p-3.5 bg-zinc-950 border-b border-zinc-900 flex items-center justify-between gap-2 shrink-0">
              <span className="text-[11px] font-black uppercase text-red-500 tracking-widest leading-none">
                Episode List
              </span>

              <div className="flex items-center gap-3">
                {/* Visual view toggler (List / Grid) */}
                <div className="flex items-center bg-zinc-900 p-0.5 rounded border border-zinc-800">
                  <button
                    onClick={() => setEpisodeLayoutMode('list')}
                    className={`p-1 rounded transition-colors cursor-pointer ${
                      episodeLayoutMode === 'list'
                        ? 'bg-zinc-950 text-red-500 border border-zinc-900'
                        : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                    title="List with Thumbnails"
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setEpisodeLayoutMode('grid')}
                    className={`p-1 rounded transition-colors cursor-pointer ${
                      episodeLayoutMode === 'grid'
                        ? 'bg-zinc-950 text-red-500 border border-zinc-900'
                        : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                    title="Compact Numbers Grid"
                  >
                    <Grid className="w-3.5 h-3.5" />
                  </button>
                </div>
                
                {/* Compact Numerical input search filter */}
                <div className="relative">
                  <input
                    type="text"
                    pattern="[0-9]*"
                    value={episodeSearch}
                    onChange={(e) => {
                      const cleaned = e.target.value.replace(/[^0-9]/g, '');
                      setEpisodeSearch(cleaned);
                    }}
                    placeholder="Ep #"
                    className="w-14 bg-zinc-900 text-[10.5px] text-white placeholder-zinc-600 font-bold border border-zinc-800 focus:border-red-650 rounded px-1.5 py-1 text-center outline-none transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Scrolling catalog of episodes */}
            <div className="flex-grow overflow-y-auto p-3 scroll-smooth custom-scrollbar">
              {loadingEpisodes ? (
                <div className="flex flex-col items-center justify-center h-full gap-2 text-zinc-500">
                  <Loader2 className="w-6 h-6 text-red-600 animate-spin" />
                  <span className="text-[9px] font-bold uppercase tracking-wider">Loading lists...</span>
                </div>
              ) : filteredEpisodes.length === 0 ? (
                <div className="flex items-center justify-center h-full text-zinc-600 text-xs">
                  No episodes found.
                </div>
              ) : episodeLayoutMode === 'list' ? (
                /* REDESIGNED: Premium vertical item list containing rich episode snapshots and text */
                <div className="flex flex-col gap-2">
                  {filteredEpisodes.map((ep) => {
                    const isActive = selectedEpisode?.id === ep.id;
                    const isGenericEpName = !ep.title || 
                      ep.title.toLowerCase() === `episode ${ep.number}` || 
                      ep.title.toLowerCase() === `episode 0${ep.number}` ||
                      ep.title.toLowerCase() === `episode 00${ep.number}` ||
                      /^ep(\s)*\d+$/i.test(ep.title);
                    
                    const resolvedDisplayTitle = isGenericEpName 
                      ? (animeInfo?.title.english || animeInfo?.title.userPreferred || `Episode ${ep.number}`)
                      : ep.title;

                    return (
                      <button
                        key={ep.id}
                        onClick={() => handleEpisodeClick(ep)}
                        className={`w-full flex items-center gap-3 p-2 rounded-xl text-left border transition-all cursor-pointer group outline-none ${
                          isActive
                            ? 'bg-red-950/10 border-red-900/30 text-white shadow shadow-red-950/10'
                            : 'bg-zinc-950/40 border-zinc-900/40 text-zinc-400 hover:bg-zinc-900/50 hover:border-zinc-800/80 hover:text-zinc-200'
                        }`}
                      >
                        {/* Episode snapshot aspect ratio container */}
                        <div className="relative aspect-[16/10] w-22 sm:w-24 rounded-lg overflow-hidden shrink-0 bg-zinc-950 border border-zinc-900 shadow-sm leading-none flex items-center justify-center">
                          {(() => {
                            const customTh = episodeThumbnailsMap[ep.number] || ep.image || animeInfo?.bannerImage || animeInfo?.coverImage.large;
                            return customTh ? (
                              <img
                                src={customTh}
                                alt={`Episode ${ep.number}`}
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                referrerPolicy="no-referrer"
                                onError={(e) => {
                                  // Cover image portrait fallback if both landscape formats fail
                                  (e.currentTarget as HTMLImageElement).src = animeInfo?.coverImage.large || '';
                                }}
                              />
                            ) : (
                              <div className="w-full h-full bg-zinc-950 flex flex-col items-center justify-center">
                                <span className="text-[10px] font-mono text-zinc-650">EP {ep.number}</span>
                              </div>
                            );
                          })()}
                          <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity duration-200 ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                            <Play className={`w-3.5 h-3.5 text-white fill-white transition-all ${isActive ? 'scale-110' : 'scale-90 group-hover:scale-100'}`} />
                          </div>
                        </div>

                        {/* Title and metadata details beside snapshot */}
                        <div className="flex-1 min-w-0">
                          <span className="text-[9px] font-black font-mono tracking-widest text-zinc-500 block uppercase mb-0.5">
                            Episode {ep.number}
                          </span>
                          <h4 className={`text-xs font-bold truncate leading-snug transition-colors ${
                            isActive ? 'text-red-400' : 'text-zinc-200 group-hover:text-white'
                          }`}>
                            {resolvedDisplayTitle}
                          </h4>
                          {isActive && (
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className="relative flex h-1.5 w-1.5 shrink-0">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500"></span>
                              </span>
                              <span className="text-[8.5px] font-mono font-black text-red-500 uppercase tracking-widest leading-none">
                                PLAYING
                              </span>
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                /* Compact rounded squares container */
                <div className="flex flex-wrap gap-1.5 justify-start">
                  {filteredEpisodes.map((ep) => {
                    const isActive = selectedEpisode?.id === ep.id;
                    return (
                      <button
                        key={ep.id}
                        onClick={() => handleEpisodeClick(ep)}
                        className={`w-7.5 h-7.5 shrink-0 rounded-md flex items-center justify-center border font-mono font-bold text-[10.5px] transition-all outline-none cursor-pointer hover:scale-105 active:scale-95 ${
                          isActive
                            ? 'bg-red-600 border-red-500 text-white shadow-md shadow-red-600/30'
                            : 'bg-zinc-950 border-zinc-900/60 text-zinc-400 hover:text-white hover:bg-zinc-900 hover:border-zinc-800'
                        }`}
                        title={ep.title || `Episode ${ep.number}`}
                      >
                        {ep.number}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right column holding Custom VideoPlayer, configurations, and comments (takes order-1 on mobile, order-2 on large screens) */}
        <div className="order-1 lg:order-2 lg:col-span-2 flex flex-col gap-5">
          


          {/* Custom Player module */}
          <div className="relative">
            {loadingStreams || resolvingM3u8 || !playableUrl ? (
              <div className="w-full aspect-video bg-black flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-10 h-10 text-red-600 animate-spin" />
                <span className="text-zinc-500 font-bold uppercase tracking-widest text-[9px]">
                  {loadingStreams ? 'INTERSECTING PROVIDER CHANNELS...' : 'DECRYPTING KWIK STREAM SEED...'}
                </span>
              </div>
            ) : (
              <VideoPlayer
                url={playableUrl}
                type={streamInfo?.streams?.[activeStreamIndex]?.type}
                subtitles={streamInfo?.subtitles}
                intro={streamInfo?.intro}
                outro={streamInfo?.outro}
                onEpisodeEnd={() => {
                  const autoplayEnabled = localStorage.getItem('anime_autoplay') !== 'false';
                  if (!autoplayEnabled) return;
                  const nextEpNum = (selectedEpisode?.number || 0) + 1;
                  const nextEp = currentProviderEpisodes.find(e => e.number === nextEpNum);
                  if (nextEp) {
                    setSelectedEpisode(nextEp);
                  }
                }}
                onError={(err) => {
                  handleStreamFailure(err || 'This video server is offline. Cycling to next source.');
                }}
              />
            )}
          </div>



          {/* Independent Capsule Controller directly below the video player */}
          <div className="flex flex-col items-center justify-center gap-3 py-1">
            {/* Premium Pill Controller matching the requested mock exactly */}
            <div className="w-full max-w-[340px] xs:max-w-md flex items-center justify-between gap-1 bg-zinc-950 border border-zinc-900 rounded-full px-2 md:px-4 py-1.5 md:py-2 hover:border-zinc-850/60 transition-colors shadow-lg relative select-none">
              
              {/* Arrow Left to go to prev source */}
              <button
                onClick={() => cycleSource('prev')}
                disabled={activeCategoryStreams.length <= 1}
                className="p-1 xs:p-1.5 hover:bg-zinc-900/80 rounded-full text-zinc-500 hover:text-white transition-all cursor-pointer disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed shrink-0"
                title="Previous Source"
              >
                <ChevronLeft className="w-4 h-4 xs:w-5 xs:h-5" />
              </button>

              {/* Toggle SUB / DUB in high-contrast red brand colors */}
              <div className="bg-zinc-900/60 border border-zinc-900/70 p-0.5 rounded-full flex items-center shrink-0">
                <button
                  onClick={() => handleCategorySwitch('sub')}
                  className={`px-2 md:px-3 py-1.5 text-[9.5px] md:text-[10px] font-black rounded-full uppercase tracking-wider transition-all leading-none cursor-pointer ${
                    selectedCategory === 'sub'
                      ? 'bg-red-600 text-white shadow shadow-red-600/25'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  SUB
                </button>
                <button
                  onClick={() => handleCategorySwitch('dub')}
                  className={`px-2 md:px-3 py-1.5 text-[9.5px] md:text-[10px] font-black rounded-full uppercase tracking-wider transition-all leading-none cursor-pointer ${
                    selectedCategory === 'dub'
                      ? 'bg-red-600 text-white shadow shadow-red-600/25'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  DUB
                </button>
              </div>

              {/* Dropdown Menu for Source choice */}
              <div className="relative flex-1 min-w-0 max-w-[125px] xs:max-w-[160px] md:max-w-[190px]">
                <button
                  onClick={() => {
                    if (activeCategoryStreams.length > 0) {
                      setIsSourceDropdownOpen(!isSourceDropdownOpen);
                    }
                  }}
                  disabled={activeCategoryStreams.length === 0}
                  className="w-full flex items-center justify-between gap-1 bg-zinc-900/90 border border-zinc-900 hover:border-zinc-800 rounded-full px-1.5 xs:px-2.5 md:px-3 py-1 xs:py-1.5 text-[10px] xs:text-[11px] md:text-xs font-bold text-white transition-all cursor-pointer select-none leading-none disabled:opacity-50 min-w-0"
                  type="button"
                  title="Choose Streaming Source"
                >
                  <div className="flex flex-col items-start min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 w-full">
                      <Tv className="w-3.5 h-3.5 text-red-500 shrink-0" />
                      <span className="truncate flex-1 font-black leading-tight text-white">
                        Server {activeCategoryStreamIdx + 1 > 0 ? activeCategoryStreamIdx + 1 : 1}
                      </span>
                    </div>
                    <span className="text-[9px] text-zinc-500 font-medium truncate ml-5">
                      {cleanServerName(activeCategoryStreams[activeCategoryStreamIdx]?.server) || 'Direct'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-[8.5px] px-1 py-0.5 rounded bg-zinc-950 font-black tracking-wider text-red-400 font-mono">
                      {activeCategoryStreams[activeCategoryStreamIdx]?.quality || 'HD'}
                    </span>
                    <ChevronDown className="w-3 h-3 text-zinc-500 shrink-0" />
                  </div>
                </button>

                {/* Floating Dropdown Overlay (True dropdown - opens downwards) */}
                {isSourceDropdownOpen && activeCategoryStreams.length > 0 && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setIsSourceDropdownOpen(false)} 
                    />
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 min-w-[200px] bg-zinc-950 border border-zinc-900/90 rounded-2xl p-1.5 shadow-[0_12px_32px_rgba(0,0,0,0.9)] z-50 flex flex-col gap-0.5 animate-fade-in">
                      <div className="px-3 py-1.5 border-b border-zinc-900/40 mb-1 col-span-1">
                        <span className="text-[8px] font-black font-mono text-zinc-500 uppercase tracking-widest block">Available Sources ({selectedCategory.toUpperCase()})</span>
                      </div>
                      {activeCategoryStreams.map((stream, idx) => {
                        const overallIdx = streamInfo?.streams?.indexOf(stream) ?? 0;
                        const isPlayable = overallIdx === activeStreamIndex;
                        return (
                          <button
                            key={`${overallIdx}-${stream.quality}-${idx}`}
                            onClick={() => {
                              handleSelectStream(overallIdx);
                              setIsSourceDropdownOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-between gap-2.5 outline-none cursor-pointer ${
                              isPlayable
                                ? 'bg-red-950/15 text-red-400 border border-red-900/20'
                                : 'text-zinc-400 hover:text-white hover:bg-zinc-900/60 border border-transparent'
                            }`}
                          >
                            <div className="flex flex-col items-start gap-0.5 truncate mr-2">
                              <span className="font-bold text-sm tracking-wide">Server {idx + 1}</span>
                              <span className="text-[9px] font-medium opacity-60 truncate">{cleanServerName(stream.server)}</span>
                            </div>
                            <span className="text-[8.5px] px-1.5 py-0.5 rounded font-mono font-black tracking-wider bg-zinc-900 text-zinc-500 whitespace-nowrap shrink-0">
                              {stream.quality || 'HD'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>

              {/* Arrow Right to go to next source */}
              <button
                onClick={() => cycleSource('next')}
                disabled={activeCategoryStreams.length <= 1}
                className="p-1 xs:p-1.5 hover:bg-zinc-900/80 rounded-full text-zinc-500 hover:text-white transition-all cursor-pointer disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed shrink-0"
                title="Next Source"
              >
                <ChevronRight className="w-4 h-4 xs:w-5 xs:h-5" />
              </button>

            </div>

            {/* Small status indicators or loaders */}
            {loadingStreams && (
              <div className="flex items-center gap-2 py-0.5 text-zinc-500 text-[10px] font-bold uppercase tracking-wider">
                <Loader2 className="w-3.5 h-3.5 text-red-500 animate-spin" />
                <span>Syncing cloud source channels...</span>
              </div>
            )}

            {!loadingStreams && activeCategoryStreams.length === 0 && (
              <span className="text-[10px] text-zinc-500 tracking-wider uppercase font-mono mt-1">No matches resolved for this format. Wait or switch category.</span>
            )}
          </div>

          {/* Quick Warning/Notice Banner below controller if active */}
          {(errorEpisodes || errorStreams || resolveError) && (
            <div className="flex items-center gap-2 p-3 bg-red-950/10 border border-red-900/20 text-red-400 rounded-lg text-xs leading-relaxed">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{resolveError || errorStreams || errorEpisodes}</span>
            </div>
          )}
        </div>
      </div>

      {/* Unified Comments Section below the episode list and player */}
      <div className="w-full">
        <Comments 
          animeId={animeId} 
          episodeNumber={selectedEpisode?.number} 
          noContainer={true} 
          animeCover={animeInfo?.coverImage?.large} 
        />
      </div>
    </div>
  );
}
