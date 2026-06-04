/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
  Disc,
  Search,
  Music,
  ListMusic,
  Loader2,
  Tv,
  Radio,
  Sliders,
} from 'lucide-react';

interface AnimeThemeTrack {
  id: string; // animethemes unique key
  title: string; // Song title
  animeTitle: string; // Origin anime title
  type: string; // OP1, ED2 etc
  artist?: string; // Singer
  audioUrl: string; // physical webm/mp4 link
  coverImage?: string; // cover fallback
}

// Famous core starter tracks to satisfy offline safety and provide immediate epic plays
const MASTERPIECE_PLAYLIST: AnimeThemeTrack[] = [
  {
    id: "unravel",
    title: "Unravel",
    animeTitle: "Tokyo Ghoul",
    type: "OP 1",
    artist: "TK from凛として時雨",
    audioUrl: "https://v.animethemes.moe/TokyoGhoul-OP1.webm",
    coverImage: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx20605-64O7S6OfPLa3.png"
  },
  {
    id: "gurenge",
    title: "Gurenge (Red Lotus)",
    animeTitle: "Demon Slayer: Kimetsu no Yaiba",
    type: "OP 1",
    artist: "LiSA",
    audioUrl: "https://v.animethemes.moe/KimetsuNoYaiba-OP1-NCBD1080.webm",
    coverImage: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx101922-PEn1CT6AnI7p.jpg"
  },
  {
    id: "bluebird",
    title: "Blue Bird",
    animeTitle: "Naruto: Shippuden",
    type: "OP 3",
    artist: "Ikimono-gakari",
    audioUrl: "https://v.animethemes.moe/NarutoShippuden-OP3.webm",
    coverImage: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx1735-Z889cl9bFvG2.png"
  },
  {
    id: "kickback",
    title: "KICK BACK",
    animeTitle: "Chainsaw Man",
    type: "OP 1",
    artist: "Kenshi Yonezu",
    audioUrl: "https://v.animethemes.moe/ChainsawMan-OP1.webm",
    coverImage: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/px117002-9P9f77fUv12w.jpg"
  },
  {
    id: "kaikaikitan",
    title: "Kaikai Kitan",
    animeTitle: "Jujutsu Kaisen",
    type: "OP 1",
    artist: "Eve",
    audioUrl: "https://v.animethemes.moe/JujutsuKaisen-OP1-NCBD1080.webm",
    coverImage: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx113415-879ZgH8RLS57.jpg"
  },
  {
    id: "zankoku",
    title: "A Cruel Angel's Thesis",
    animeTitle: "Neon Genesis Evangelion",
    type: "OP 1",
    artist: "Yoko Takahashi",
    audioUrl: "https://v.animethemes.moe/NeonGenesisEvangelion-OP1.webm",
    coverImage: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx30-gcnAtf6ofCOJ.png"
  }
];

export default function MusicPlayer() {
  const [playlist, setPlaylist] = useState<AnimeThemeTrack[]>(MASTERPIECE_PLAYLIST);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingSearch, setIsLoadingSearch] = useState(false);
  const [showQueue, setShowQueue] = useState(false);

  // Hidden native Audio node ref
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const visualizerTimerRef = useRef<number | null>(null);
  const [bounceHeights, setBounceHeights] = useState<number[]>([15, 10, 20, 15, 12, 18, 14, 22]);

  const activeTrack = playlist[currentIndex] || playlist[0];

  useEffect(() => {
    // Instantiate Audio element
    audioRef.current = new Audio();
    audioRef.current.volume = volume;
    
    // Binding native listeners
    const audio = audioRef.current;
    
    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };
    
    const onLoadedMetadata = () => {
      setDuration(audio.duration || 0);
    };
    
    const onEnded = () => {
      handleNextTrack();
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('ended', onEnded);
      audio.pause();
      if (visualizerTimerRef.current) cancelAnimationFrame(visualizerTimerRef.current);
    };
  }, []);

  // Update audio source when active track updates
  useEffect(() => {
    if (!audioRef.current || !activeTrack) return;
    const audio = audioRef.current;
    
    const wasPlaying = isPlaying;
    audio.src = activeTrack.audioUrl;
    audio.load();
    
    if (wasPlaying) {
      audio.play().then(() => {
        setIsPlaying(true);
      }).catch(err => {
        console.warn("Autoplay blocked/errored: ", err);
        setIsPlaying(false);
      });
    } else {
      setIsPlaying(false);
    }
  }, [activeTrack]);

  // Handle Playback visualizer bouncing rods
  useEffect(() => {
    if (isPlaying) {
      const animateVisualizer = () => {
        setBounceHeights(Array.from({ length: 12 }, () => Math.floor(Math.random() * 45) + 5));
        visualizerTimerRef.current = requestAnimationFrame(animateVisualizer);
      };
      animateVisualizer();
    } else {
      if (visualizerTimerRef.current) cancelAnimationFrame(visualizerTimerRef.current);
      setBounceHeights(Array.from({ length: 12 }, () => 6));
    }
    return () => {
      if (visualizerTimerRef.current) cancelAnimationFrame(visualizerTimerRef.current);
    };
  }, [isPlaying]);

  // Adjust volume
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    setIsMuted(val === 0);
    if (audioRef.current) {
      audioRef.current.volume = val;
      audioRef.current.muted = val === 0;
    }
  };

  // Adjust time progress
  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  // Toggle play-pause
  const togglePlayPause = () => {
    if (!audioRef.current || !activeTrack) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(err => {
        console.warn("Playback error: ", err);
      });
    }
  };

  // Skip tracks forward
  const handleNextTrack = () => {
    if (playlist.length <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % playlist.length);
    setIsPlaying(true);
  };

  // Skip tracks backward
  const handlePrevTrack = () => {
    if (playlist.length <= 1) return;
    setCurrentIndex((prev) => (prev - 1 + playlist.length) % playlist.length);
    setIsPlaying(true);
  };

  // Mute volume
  const toggleMute = () => {
    if (!audioRef.current) return;
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    audioRef.current.muted = nextMute;
    if (nextMute) {
      audioRef.current.volume = 0;
    } else {
      audioRef.current.volume = volume;
    }
  };

  const fetchAniListCover = async (animeTitle: string): Promise<string> => {
    try {
      const query = `
        query ($search: String) {
          Media (search: $search, type: ANIME) {
            coverImage {
              large
            }
          }
        }
      `;
      const res = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables: { search: animeTitle } })
      });
      if (res.ok) {
        const data = await res.json();
        return data?.data?.Media?.coverImage?.large || '';
      }
    } catch (e) {
      console.error("Failed to fetch AniList cover:", e);
    }
    return '';
  };

  // Live search animethemes.moe API to fetch opening/ending tracks
  const handleSearchMusic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsLoadingSearch(true);
    try {
      // API spec query to compile songs with video entries on AnimeThemes
      const queryUrl = `https://api.animethemes.moe/anime?filter[search]=${encodeURIComponent(searchQuery)}&include=images,animethemes.song,animethemes.animethemeentries.videos&limit=3`;
      const res = await fetch(queryUrl);
      if (!res.ok) {
        throw new Error(`Anime themes request failed: ${res.status}`);
      }
      
      const json = await res.json();
      const matchAnime = json.anime || [];
      if (matchAnime.length === 0) {
        alert("No themes registered on animethemes.moe for this anime. Search another title!");
        return;
      }

      const activeSearchTracks: AnimeThemeTrack[] = [];
      
      const coverPromises = matchAnime.map(async (series: any) => {
        const directCover = series.images?.find((img: any) => img.type === "Large Cover")?.link;
        if (directCover) return directCover;
        return await fetchAniListCover(series.name);
      });

      const resolvedCovers = await Promise.all(coverPromises);

      matchAnime.forEach((series: any, sIdx: number) => {
        const cover = resolvedCovers[sIdx] || "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx20605-64O7S6OfPLa3.png";
        const themes = series.animethemes || [];
        
        themes.forEach((theme: any) => {
          const songTitle = theme.song?.title || "Unknown Song";
          const artist = theme.song?.artists?.map((art: any) => art.name).join(", ") || "Unknown artist";
          const typeStr = `${theme.type || "OP"}${theme.sequence || ""}`;
          
          // Find standard physical video file endpoint
          const videoUrl = theme.animethemeentries?.[0]?.videos?.[0]?.link;
          if (videoUrl) {
            activeSearchTracks.push({
              id: `${series.slug}-${theme.id}`,
              title: songTitle,
              animeTitle: series.name,
              type: typeStr,
              artist,
              audioUrl: videoUrl,
              coverImage: cover
            });
          }
        });
      });

      if (activeSearchTracks.length > 0) {
        // Concatenate searches into current playlist and play it immediately
        setPlaylist((prev) => [...activeSearchTracks, ...prev.filter(t => !activeSearchTracks.some(ast => ast.title === t.title))]);
        setCurrentIndex(0);
        setIsPlaying(true);
        setShowQueue(true);
      } else {
        alert("No playable audio tracks found for this anime on animethemes.moe database.");
      }
    } catch (err) {
      console.error(err);
      alert("Error scanning animethemes database. Check network!");
    } finally {
      setIsLoadingSearch(false);
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="w-full bg-gradient-to-br from-[#070709] via-[#0b0c10] to-[#040405] rounded-3xl p-6 md:p-8 border border-zinc-900/40 shadow-2xl flex flex-col gap-6 md:gap-8 max-w-4xl mx-auto border-t-2 border-t-red-650 animate-fade-in relative overflow-visible select-none">
      
      {/* Decorative vinyl deck corner elements */}
      <div className="absolute right-6 top-6 opacity-5 pointer-events-none hidden md:block">
        <Radio className="w-48 h-48 text-white" />
      </div>

      {/* 1. Header widget with dynamic themes lookup search console */}
      <div className="w-full flex flex-col md:flex-row items-center justify-between border-b border-red-950/20 pb-5 gap-4">
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="p-3 bg-red-600/10 text-red-500 rounded-2xl shadow-inner shadow-red-500/5">
            <Radio className="w-6 h-6 animate-pulse" />
          </div>
          <div className="text-left">
            <h2 className="text-lg font-black uppercase tracking-wider text-white">
              Anipriv8 Music Deck
            </h2>
            <p className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase leading-none mt-1">
              PROXIED HIGH FIDELITY JAPANESE ANIME OST & PLAYS
            </p>
          </div>
        </div>

        {/* Live dynamic music search core */}
        <form onSubmit={handleSearchMusic} className="relative w-full max-w-sm shrink-0">
          <input
            type="text"
            placeholder="Search anime... (e.g. Oshi no Ko)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-950/80 border border-zinc-900 focus:border-red-600 focus:ring-1 focus:ring-red-650 h-10 pl-10 pr-16 text-xs font-semibold rounded-lg text-white outline-none tracking-wide"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <button
            type="submit"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 h-7 bg-red-600 hover:bg-red-700 active:bg-red-800 text-[10px] font-black uppercase tracking-wide text-white rounded-md cursor-pointer flex items-center gap-1 disabled:opacity-50"
            disabled={isLoadingSearch}
          >
            {isLoadingSearch ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Search'}
          </button>
        </form>
      </div>

      {/* 2. Main content deck: cassettes & spinning vinyl discs */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
        
        {/* Left Side: Disc player core layout (spin animation when active) */}
        <div className="md:col-span-4 flex flex-col items-center">
          <div className="relative w-44 h-44 rounded-full overflow-hidden flex items-center justify-center p-1 bg-zinc-950 border-4 border-zinc-900 shadow-2xl">
            
            {/* Background cover art */}
            <div className={`absolute inset-0 transition-transform duration-1000 ${isPlaying ? 'animate-spin-slow' : ''}`}>
              <img
                src={activeTrack.coverImage || '/placeholder_disc.jpg'}
                alt="cover"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.currentTarget.src = "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx20605-64O7S6OfPLa3.png";
                }}
              />
              {/* Glossy overlay */}
              <div className="absolute inset-0 bg-black/10 rounded-full bg-gradient-to-t from-transparent via-white/5 to-transparent" />
            </div>

            {/* Inner vinyl grooves container */}
            <div className="absolute inset-0 border-6 border-black/80 rounded-full pointer-events-none" />
            <div className="absolute inset-8 border border-white/5 rounded-full pointer-events-none" />
            
            {/* Center core spindle pin hole */}
            <div className="w-13 h-13 rounded-full bg-zinc-900 border-4 border-black flex items-center justify-center z-10 shadow-inner">
              <div className="w-4 h-4 rounded-full bg-[#000] border border-zinc-800" />
            </div>
          </div>
        </div>

        {/* Right Side: song metadata & player levers */}
        <div className="md:col-span-8 flex flex-col gap-5 text-left w-full">
          
          {/* Song artist & details listing */}
          <div className="flex flex-col select-text">
            <span className="text-[#ef4444] text-[10px] font-black uppercase tracking-widest leading-none flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75 ${isPlaying ? '' : 'hidden'}`}></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
              <span>NOW STREAMING {activeTrack.type} theme</span>
            </span>
            <h1 className="text-xl md:text-2xl font-extrabold text-white tracking-tight leading-tight mt-2 truncate w-full">
              {activeTrack.title}
            </h1>
            <p className="text-zinc-400 text-xs font-semibold flex items-center gap-1.5 mt-1">
              <Tv className="w-3.5 h-3.5 text-zinc-650" />
              <span className="truncate">{activeTrack.animeTitle}</span>
              <span className="text-zinc-700 font-bold">•</span>
              <span className="text-zinc-550 truncate">{activeTrack.artist || 'Unknown artist'}</span>
            </p>
          </div>

          {/* bouncing active frequencies bars overlay */}
          <div className="h-10 w-full bg-zinc-950/40 rounded-xl px-4 flex items-center justify-between overflow-hidden border border-zinc-950">
            <span className="text-[10px] font-bold font-mono text-zinc-600 uppercase tracking-widest">Digital Visual Frequency</span>
            <div className="flex items-end gap-1 h-full pt-1.5 justify-end">
              {bounceHeights.map((h, i) => (
                <div
                  key={i}
                  className="w-1.5 bg-red-600/90 rounded-t-sm transition-all duration-75"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
          </div>

          {/* Time scrubber line */}
          <div className="flex flex-col gap-2">
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={handleProgressChange}
              className="w-full h-1 bg-zinc-900 rounded-lg appearance-none cursor-pointer accent-red-650"
            />
            <div className="flex items-center justify-between text-[11px] font-semibold font-mono text-zinc-500 select-none">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Core play controllers, volume tracks, layout lists */}
          <div className="flex items-center justify-between flex-wrap gap-4 select-none">
            
            {/* Triggers skips */}
            <div className="flex items-center gap-3">
              <button
                onClick={handlePrevTrack}
                className="p-3 bg-zinc-900/60 hover:bg-zinc-800 border border-zinc-900 text-zinc-400 hover:text-white rounded-full transition-all cursor-pointer shadow-md select-none"
                title="Previous Track"
              >
                <SkipBack className="w-5 h-5 shrink-0" />
              </button>
              
              <button
                onClick={togglePlayPause}
                className="p-4 bg-red-600 hover:bg-red-700 text-white rounded-full transition-all cursor-pointer shadow-lg shadow-red-600/20 active:scale-95 select-none"
                title={isPlaying ? "Pause Track" : "Play Track"}
              >
                {isPlaying ? (
                  <Pause className="w-6 h-6 shrink-0 fill-white" />
                ) : (
                  <Play className="w-6 h-6 shrink-0 fill-white translate-x-0.5" />
                )}
              </button>

              <button
                onClick={handleNextTrack}
                className="p-3 bg-zinc-900/60 hover:bg-zinc-800 border border-zinc-900 text-zinc-400 hover:text-white rounded-full transition-all cursor-pointer shadow-md select-none"
                title="Next Track"
              >
                <SkipForward className="w-5 h-5 shrink-0" />
              </button>
            </div>

            {/* Volume levels layout */}
            <div className="flex items-center gap-2 max-w-[140px] w-full bg-zinc-950 px-4 py-2 rounded-xl border border-zinc-900/40">
              <button onClick={toggleMute} className="text-zinc-400 hover:text-white cursor-pointer inline-flex">
                {isMuted ? <VolumeX className="w-4 h-4 text-red-500" /> : <Volume2 className="w-4 h-4 text-zinc-500" />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-full h-1 bg-zinc-900 rounded-lg appearance-none cursor-pointer accent-red-600"
              />
            </div>

            {/* Queue Toggle selector */}
            <button
              onClick={() => setShowQueue(!showQueue)}
              className={`flex items-center gap-1.5 px-4 h-10 text-xs font-black uppercase tracking-widest border rounded-xl cursor-pointer transition-all ${
                showQueue
                  ? 'bg-red-600/10 border-red-600/50 text-red-500'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white'
              }`}
            >
              <ListMusic className="w-4 h-4 shrink-0" />
              <span>Queue</span>
              <span className="text-[10px] font-mono leading-none bg-zinc-950 px-1.5 py-1 rounded-md text-zinc-400 border border-white/5 ml-1">
                {playlist.length}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Sliding Queue drawer directory */}
      {showQueue && (
        <div className="w-full bg-[#050507] border border-zinc-900 rounded-2xl p-4 md:p-5 mt-4 text-left font-mono max-h-[220px] overflow-y-auto scrollbar-custom animate-fade-in select-none">
          <div className="text-[10px] font-black uppercase tracking-widest text-[#ef4444] border-b border-red-950/20 pb-2 mb-3">
            Active Track Playlist
          </div>
          <div className="space-y-1.5">
            {playlist.map((track, idx) => {
              const active = idx === currentIndex;
              return (
                <button
                  key={track.id + idx}
                  onClick={() => {
                    setCurrentIndex(idx);
                    setIsPlaying(true);
                  }}
                  className={`w-full flex items-center justify-between p-2.5 rounded-lg text-left transition-all outline-none cursor-pointer border ${
                    active
                      ? 'bg-red-950/15 border-red-500/40 text-red-400 font-extrabold text-[11.5px]'
                      : 'bg-zinc-950/20 border-zinc-950 hover:bg-zinc-900 hover:border-zinc-800 text-zinc-500 hover:text-zinc-300 text-xs'
                  }`}
                >
                  <div className="flex items-center gap-3 truncate pr-4">
                    <Music className={`w-3.5 h-3.5 shrink-0 ${active ? 'text-red-500 animate-bounce' : 'text-zinc-650'}`} />
                    <span className="truncate">{track.title}</span>
                    <span className="text-zinc-700">•</span>
                    <span className="text-zinc-600 truncate text-[11px] font-normal">{track.animeTitle}</span>
                  </div>
                  <span className="text-[9.5px] font-black px-2 py-0.5 rounded-md bg-zinc-950 border border-white/5 text-zinc-400 uppercase tracking-wider">
                    {track.type}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
