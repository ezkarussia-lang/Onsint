import React, { useState, useEffect } from 'react';
import { useMusic, AnimeThemeTrack } from '../services/MusicContext';
import { 
  Play, 
  Pause,
  Search, 
  Disc, 
  Clock, 
  ChevronRight, 
  ArrowLeft, 
  Music as MusicIcon, 
  Radio, 
  Plus, 
  ListMusic, 
  Volume2, 
  Tv, 
  Check, 
  CornerDownRight, 
  Share2, 
  AlertCircle, 
  Loader2,
  Heart
} from 'lucide-react';

interface RecommendedAlbum {
  id: string;
  title: string;
  searchTitle: string;
  image: string;
  year: string;
  iconicSong: string;
  themeColor: string;
  badge: string;
}

const FEATURED_ALBUMS: RecommendedAlbum[] = [
  {
    id: "eva",
    title: "Neon Genesis Evangelion",
    searchTitle: "Neon Genesis Evangelion",
    image: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx30-gcnAtf6ofCOJ.png",
    year: "1995",
    iconicSong: "A Cruel Angel's Thesis",
    themeColor: "from-blue-900 to-purple-950",
    badge: "Masterpiece"
  },
  {
    id: "bebop",
    title: "Cowboy Bebop",
    searchTitle: "Cowboy Bebop",
    image: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx1-9969Y26mE79R.png",
    year: "1998",
    iconicSong: "Tank!",
    themeColor: "from-amber-600 to-zinc-950",
    badge: "Retro Classic"
  },
  {
    id: "tokyoghoul",
    title: "Tokyo Ghoul",
    searchTitle: "Tokyo Ghoul",
    image: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx20605-64O7S6OfPLa3.png",
    year: "2014",
    iconicSong: "Unravel",
    themeColor: "from-red-950 to-zinc-900",
    badge: "Iconic OP"
  },
  {
    id: "chainsawman",
    title: "Chainsaw Man",
    searchTitle: "Chainsaw Man",
    image: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/px117002-9P9f77fUv12w.jpg",
    year: "2022",
    iconicSong: "KICK BACK",
    themeColor: "from-yellow-800 to-black",
    badge: "Modern Electro"
  },
  {
    id: "naruto",
    title: "Naruto: Shippuden",
    searchTitle: "Naruto Shippuden",
    image: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx1735-Z889cl9bFvG2.png",
    year: "2007",
    iconicSong: "Blue Bird",
    themeColor: "from-orange-850 to-zinc-950",
    badge: "Nostalgia"
  },
  {
    id: "demonslayer",
    title: "Kimetsu no Yaiba",
    searchTitle: "Kimetsu no Yaiba",
    image: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx101922-PEn1CT6AnI7p.jpg",
    year: "2019",
    iconicSong: "Gurenge",
    themeColor: "from-rose-955 to-slate-900",
    badge: "Epic Orchestral"
  },
  {
    id: "jujutsukaisen",
    title: "Jujutsu Kaisen",
    searchTitle: "Jujutsu Kaisen",
    image: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx113415-879ZgH8RLS57.jpg",
    year: "2020",
    iconicSong: "Lost in Paradise",
    themeColor: "from-indigo-950 to-purple-950",
    badge: "Stylized Jazz"
  },
  {
    id: "shingeki",
    title: "Attack on Titan",
    searchTitle: "Shingeki no Kyojin",
    image: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx16498-8EXZ07v00c3P.png",
    year: "2013",
    iconicSong: "Shinzou wo Sasageyo!",
    themeColor: "from-amber-950 to-stone-950",
    badge: "Symphonic"
  }
];

export default function Music({ onBack }: { onBack?: () => void }) {
  const { playTrack, playAll, activeTrack, isPlaying, recentlyPlayed, toggleFavourite, isFavourited } = useMusic();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAlbum, setSelectedAlbum] = useState<RecommendedAlbum | null>(null);
  
  // Tab filters: 'ALL' | 'OP' | 'ED' | 'IN'
  const [activeTab, setActiveTab] = useState<'ALL' | 'OP' | 'ED' | 'IN'>('ALL');

  // Greeting based on hours
  const [greeting, setGreeting] = useState('GOOD EVENING');
  useEffect(() => {
    const hours = new Date().getHours();
    if (hours < 12) setGreeting('GOOD MORNING');
    else if (hours < 18) setGreeting('GOOD AFTERNOON');
    else setGreeting('GOOD EVENING');
  }, []);
  
  // Album tracks
  const [albumTracks, setAlbumTracks] = useState<AnimeThemeTrack[]>([]);
  const [isLoadingTracks, setIsLoadingTracks] = useState(false);
  const [searchTracks, setSearchTracks] = useState<AnimeThemeTrack[]>([]);
  const [isLoadingSearch, setIsLoadingSearch] = useState(false);

  // Trigger Anime search inside albums
  useEffect(() => {
    if (selectedAlbum) {
      loadAlbumSongs(selectedAlbum.searchTitle, selectedAlbum.image);
    }
  }, [selectedAlbum]);

  const loadAlbumSongs = async (animeTitle: string, coverImage: string) => {
    setIsLoadingTracks(true);
    setAlbumTracks([]);
    try {
      const url = `https://api.animethemes.moe/anime?filter[search]=${encodeURIComponent(animeTitle)}&include=images,animethemes.song,animethemes.animethemeentries.videos&limit=1`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("API call error");
      const json = await res.json();
      const info = json.anime?.[0];
      if (!info) {
        setAlbumTracks([]);
        return;
      }

      const tracks: AnimeThemeTrack[] = [];
      const themes = info.animethemes || [];
      themes.forEach((theme: any) => {
        const title = theme.song?.title || "Unknown Track";
        const artist = theme.song?.artists?.map((a: any) => a.name).join(", ") || "Unknown Artist";
        const typeStr = `${theme.type || "OP"}${theme.sequence || ""}`;
        const audioUrl = theme.animethemeentries?.[0]?.videos?.[0]?.link;

        if (audioUrl) {
          tracks.push({
            id: `${info.slug}-${theme.id}`,
            title,
            animeTitle: info.name,
            type: typeStr,
            artist,
            audioUrl,
            coverImage: coverImage
          });
        }
      });
      setAlbumTracks(tracks);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingTracks(false);
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

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchTracks([]);
      return;
    }

    setIsLoadingSearch(true);
    setSearchTracks([]);
    try {
      const url = `https://api.animethemes.moe/anime?filter[search]=${encodeURIComponent(searchQuery)}&include=images,animethemes.song,animethemes.animethemeentries.videos&limit=5`;
      const res = await fetch(url);
      const json = await res.json();
      const matchAnime = json.anime || [];
      
      const tracks: AnimeThemeTrack[] = [];
      const coverPromises = matchAnime.map(async (series: any) => {
        const imgObj = series.images?.find((img: any) => 
          img.facet === "large-cover" || 
          img.facet === "small-cover" || 
          img.type === "Large Cover" || 
          img.facet === "cover" ||
          img.facet?.toLowerCase().includes("cover")
        );
        if (imgObj?.link) return imgObj.link;
        return await fetchAniListCover(series.name);
      });

      const resolvedCovers = await Promise.all(coverPromises);

      matchAnime.forEach((series: any, sIdx: number) => {
        const cover = resolvedCovers[sIdx] || "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx20605-64O7S6OfPLa3.png";
        const themes = series.animethemes || [];
        themes.forEach((theme: any) => {
          const songTitle = theme.song?.title || "Unknown Song";
          const artist = theme.song?.artists?.map((a: any) => a.name).join(", ") || "Unknown artist";
          const typeStr = `${theme.type || "OP"}${theme.sequence || ""}`;
          const videoUrl = theme.animethemeentries?.[0]?.videos?.[0]?.link;
          
          if (videoUrl) {
            tracks.push({
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
      setSearchTracks(tracks);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingSearch(false);
    }
  };

  const filteredAlbumTracks = albumTracks.filter(track => {
    if (activeTab === 'ALL') return true;
    if (activeTab === 'OP') return track.type.toLowerCase().includes('op');
    if (activeTab === 'ED') return track.type.toLowerCase().includes('ed');
    return !track.type.toLowerCase().includes('op') && !track.type.toLowerCase().includes('ed'); // Insert / other
  });

  const lastPlayed = recentlyPlayed?.[0] || {
    id: "tank-cowboy-bebop",
    title: "Tank!",
    animeTitle: "Cowboy Bebop",
    type: "OP 1",
    artist: "The Seatbelts",
    audioUrl: "https://v.animethemes.moe/CowboyBebop-OP1.webm",
    coverImage: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx30-gcnAtf6ofCOJ.png"
  };

  return (
    <div className="w-full min-h-screen bg-[#040405] text-[#f4f4f5] pb-24 px-4 md:px-8 select-none">
      
      {/* 1. DISCOVERY OVERVIEW PORTAL */}
      {!selectedAlbum && (
        <div className="flex flex-col gap-8 animate-fade-in text-left">
          
          {/* Back trigger */}
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-2 max-w-fit px-4 py-2 bg-zinc-900 border border-zinc-800 hover:border-red-500/30 text-xs font-bold tracking-wider text-zinc-300 hover:text-white uppercase rounded-lg cursor-pointer transition-all shadow-md self-start mb-2"
            >
              <ArrowLeft className="w-4 h-4 text-red-500" /> Back to Home
            </button>
          )}

          {/* Recently Listened row (design from photo 1) */}
          <div className="flex flex-col gap-3">
            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2 font-mono">
              <Disc className="w-4 h-4 text-red-500" /> Recently listened to
            </span>
            <div className="w-full max-w-md bg-[#09090c] border border-zinc-900/60 rounded-2xl p-4 flex items-center justify-between shadow-xl">
              <div className="flex items-center gap-3.5 min-w-0 pr-3">
                <img 
                  src={lastPlayed.coverImage} 
                  alt="" 
                  className="w-12 h-12 rounded-xl object-cover shrink-0 select-none border border-zinc-800"
                  referrerPolicy="no-referrer"
                />
                <div className="min-w-0 text-left">
                  <h4 className="text-sm font-extrabold text-white truncate leading-snug">{lastPlayed.title}</h4>
                  <p className="text-[11px] text-zinc-400 font-bold truncate mt-0.5">{lastPlayed.animeTitle} • {lastPlayed.type}</p>
                  <p className="text-[9px] text-zinc-500 font-mono font-bold uppercase tracking-wider mt-0.5">3d ago • <span className="text-red-500">Anime</span></p>
                </div>
              </div>
              <button 
                onClick={() => playTrack(lastPlayed)}
                className="w-9 h-9 rounded-full bg-red-600/10 hover:bg-red-600/20 border border-red-500/25 text-red-500 transition-all flex items-center justify-center shrink-0 cursor-pointer active:scale-90"
              >
                {activeTrack?.id === lastPlayed.id && isPlaying ? (
                  <Pause className="w-4 h-4 fill-red-500" />
                ) : (
                  <Play className="w-4 h-4 fill-red-500 translate-x-0.5" />
                )}
              </button>
            </div>
          </div>

          {/* Core Greeting & Discovery Header */}
          <div className="flex flex-col text-left">
            <span className="text-[10px] font-black tracking-widest text-zinc-500 uppercase font-mono leading-none mb-1">
              {greeting}
            </span>
            <h1 className="text-3xl md:text-4xl font-extrabold text-white leading-tight uppercase tracking-tight">
              Music Discover
            </h1>
          </div>

          {/* Search Console */}
          <form onSubmit={handleSearchSubmit} className="relative w-full max-w-xl">
            <input
              type="text"
              placeholder="Search anime titles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#08080a] border border-zinc-900 focus:border-red-650 focus:ring-1 focus:ring-red-650 h-12 pl-12 pr-4 rounded-xl text-sm font-semibold text-white outline-none tracking-wide"
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
            <button
              type="submit"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 px-4 py-1.5 bg-red-650 hover:bg-red-750 active:bg-red-800 text-xs font-bold uppercase tracking-wider rounded-lg text-white font-mono cursor-pointer"
            >
              Scan
            </button>
          </form>

          {/* Category Toggle Tabs inside search area */}
          <div className="flex items-center gap-3">
            <button 
              type="button"
              className="flex items-center gap-2 px-4 py-2 bg-[#09090c] border border-zinc-800 rounded-xl text-[11px] font-black uppercase text-white tracking-widest"
            >
              <Tv className="w-4 h-4 text-red-500" />
              <span>Anime</span>
            </button>
            <button 
              type="button"
              className="flex items-center gap-2 px-4 py-2 bg-zinc-950/20 border border-zinc-900 rounded-xl text-[11px] font-black uppercase text-zinc-500 tracking-widest cursor-not-allowed"
            >
              <Disc className="w-4 h-4 text-zinc-650" />
              <span>Song</span>
            </button>
          </div>

          {/* Inline filters sub tab pills row */}
          <div className="flex bg-[#070709] border border-zinc-900 rounded-xl p-1 max-w-xs">
            {[
              { id: 'ALL', label: 'ALL' },
              { id: 'OP', label: 'OP' },
              { id: 'ED', label: 'ED' },
              { id: 'IN', label: 'IN' }
            ].map((tab) => {
              const isAct = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                    isAct 
                      ? 'bg-red-650 text-white font-mono font-black shadow-md shadow-red-650/10' 
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* If searching live results */}
          {searchQuery.trim() && (
            <div className="flex flex-col gap-4 border border-zinc-900 bg-zinc-950/40 p-5 rounded-2xl">
              <h3 className="text-xs font-black uppercase text-red-500 tracking-wider">
                Live Scan Results ({searchTracks.length} themes found)
              </h3>
              
              {isLoadingSearch ? (
                <div className="flex items-center gap-2 text-zinc-550 text-xs py-4 font-mono">
                  <Loader2 className="w-4 h-4 text-red-500 animate-spin" /> Querying AnimeThemes API...
                </div>
              ) : searchTracks.length === 0 ? (
                <span className="text-zinc-650 text-xs font-bold uppercase font-mono">No playable streams located.</span>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin">
                  {searchTracks.map((track) => {
                    const isPlay = activeTrack?.id === track.id && isPlaying;
                    return (
                      <div
                        key={track.id}
                        onClick={() => playTrack(track, searchTracks)}
                        className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer hover:scale-101 transition-all ${
                          isPlay 
                            ? 'bg-red-950/20 border-red-500/30 text-white' 
                            : 'bg-[#09090c] border-zinc-900 hover:border-zinc-800'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 pr-3">
                          <img src={track.coverImage} className="w-10 h-10 object-cover rounded-lg shrink-0" referrerPolicy="no-referrer" />
                          <div className="min-w-0 text-left">
                            <h4 className="text-xs font-extrabold text-white truncate">{track.title}</h4>
                            <p className="text-[10px] text-zinc-500 font-bold truncate">{track.artist} • {track.animeTitle}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavourite(track);
                            }}
                            className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                              isFavourited(track.id) 
                                ? 'bg-red-950/20 border-red-900/30 text-red-500' 
                                : 'bg-zinc-950 border-zinc-900 text-zinc-500 hover:text-zinc-300'
                            }`}
                            title={isFavourited(track.id) ? "Remove Favourites" : "Add Favourites"}
                          >
                            <Heart className={`w-3 h-3 ${isFavourited(track.id) ? 'fill-red-500 text-red-500' : ''}`} />
                          </button>
                          <span className="text-[9px] font-bold font-mono px-2 py-0.5 rounded bg-zinc-950 text-red-550 uppercase tracking-widest text-[#ef4444]">
                            {track.type}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Album grid (vintage cartoon aesthetic cards from screenshot 4) */}
          <div className="flex flex-col gap-4">
            <h3 className="text-sm font-black uppercase tracking-widest text-red-500 border-l-2 border-red-650 pl-2">
              Featured
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {FEATURED_ALBUMS.map((album) => (
                <div
                  key={album.id}
                  onClick={() => setSelectedAlbum(album)}
                  className="group flex flex-col gap-2 cursor-pointer"
                >
                  {/* High contrast card thumbnail */}
                  <div className="relative aspect-square overflow-hidden bg-zinc-950 border border-zinc-900 rounded-2xl shadow-lg">
                    <img
                      src={album.image}
                      alt={album.title}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 filter brightness-[0.80]"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-black/45 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="p-3.5 bg-red-650 text-white rounded-full shadow-lg transform scale-90 group-hover:scale-100 transition-transform duration-300">
                        <Play className="w-5 h-5 fill-white ml-0.5" />
                      </div>
                    </div>
                  </div>

                  {/* Album Detail */}
                  <div className="flex flex-col text-left">
                    <h4 className="text-xs font-black text-white group-hover:text-red-500 transition-colors leading-snug line-clamp-1 uppercase tracking-wide">
                      {album.title}
                    </h4>
                    <span className="text-[10px] font-mono text-zinc-550 font-bold uppercase tracking-wider mt-0.5">
                      {album.year} • {album.id === 'eva' ? '15 tracks' : album.id === 'bebop' ? '4 tracks' : album.id === 'tokyoghoul' ? '11 tracks' : album.id === 'chainsawman' ? '12 tracks' : album.id === 'naruto' ? '15 tracks' : '14 tracks'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 2. ALBUM DETAILS INTERACTIVE SCREEN (Image 3) */}
      {selectedAlbum && (
        <div className="flex flex-col gap-8 animate-fade-in text-left">
          
          {/* Back trigger */}
          <button
            onClick={() => setSelectedAlbum(null)}
            className="flex items-center gap-2 max-w-fit px-4 py-2 bg-zinc-900 border border-zinc-800 hover:border-red-500/30 text-xs font-bold tracking-wider text-zinc-300 hover:text-white uppercase rounded-lg cursor-pointer transition-all shadow-md self-start"
          >
            <ArrowLeft className="w-4 h-4 text-red-500" /> Back to Music Library
          </button>

          {/* Gorgeous Banner section */}
          <div className="relative w-full rounded-2xl overflow-hidden border border-zinc-900 shadow-2xl bg-gradient-to-r p-6 md:p-8 flex flex-col md:flex-row gap-6 items-end min-h-[220px]">
            {/* Ambient artwork backdrop blur */}
            <div className={`absolute inset-0 bg-gradient-to-r ${selectedAlbum.themeColor} opacity-50 z-0`} />
            <div className="absolute inset-x-0 bottom-0 top-0 bg-gradient-to-t from-black via-black/80 to-transparent z-0" />
            
            <img
              src={selectedAlbum.image}
              alt={selectedAlbum.title}
              className="w-28 md:w-36 aspect-square rounded-xl object-cover shadow-2xl border border-zinc-800 z-10 shrink-0 select-none"
              referrerPolicy="no-referrer"
            />

            <div className="flex flex-col gap-2 z-10 select-none pb-1">
              <span className="bg-red-650 text-white text-[8px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-sm w-fit leading-none">
                ALBUM OST SOUNDS
              </span>
              <h1 className="text-xl md:text-3xl font-black tracking-wide text-white uppercase leading-none">
                {selectedAlbum.title}
              </h1>
              <p className="text-zinc-400 text-xs font-bold">
                Released in {selectedAlbum.year} • Official High Resolution Stereo Tracks
              </p>
              
              <div className="flex items-center gap-3 pt-2">
                <button
                  disabled={albumTracks.length === 0}
                  onClick={() => playAll(albumTracks)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-red-650 hover:bg-red-750 disabled:opacity-40 text-xs font-black uppercase tracking-wider text-white rounded-lg shadow-lg shadow-red-650/15 cursor-pointer active:scale-97 transition-all"
                >
                  <Play className="w-4 h-4 fill-white" /> Play Album
                </button>
              </div>
            </div>
          </div>

          {/* Navigation filters tab row */}
          <div className="flex border-b border-zinc-900 pb-0.5 gap-6 text-[11px] font-black uppercase tracking-widest text-zinc-500 font-mono">
            {[
              { id: 'ALL', label: `ALL SONGS (${albumTracks.length})` },
              { id: 'OP', label: 'OPENINGS' },
              { id: 'ED', label: 'ENDINGS' },
              { id: 'IN', label: 'INSERT / OTHER' }
            ].map((tab) => {
              const isAct = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`pb-2.5 cursor-pointer transition-colors relative outline-none ${
                    isAct ? 'text-[#ef4444] font-black' : 'hover:text-zinc-300'
                  }`}
                >
                  <span>{tab.label}</span>
                  {isAct && <div className="absolute bottom-0 inset-x-0 h-0.5 bg-red-600 animate-fade-in" />}
                </button>
              );
            })}
          </div>

          {/* Directory tracks table */}
          <div className="flex flex-col gap-3">
            {isLoadingTracks ? (
              <div className="text-center py-16 flex flex-col items-center justify-center gap-3 text-zinc-500 font-mono font-bold text-xs">
                <Loader2 className="w-8 h-8 text-red-500 animate-spin" /> RETRIEVING HIGH DEF STEREO AUDIO SECTIONS...
              </div>
            ) : filteredAlbumTracks.length === 0 ? (
              <div className="text-center py-20 bg-[#08080a]/30 border border-zinc-900 border-dashed rounded-xl p-8">
                <AlertCircle className="w-7 h-7 text-zinc-600 mx-auto mb-2.5" />
                <span className="text-xs font-black font-mono uppercase text-zinc-550 block mb-1">NO TRACKS CLASSIFIED</span>
                <p className="text-[11px] text-zinc-650 max-w-xs mx-auto">No themes are indexed under this specific category for this album.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2 font-mono text-xs">
                
                {/* Headers row */}
                <div className="grid grid-cols-12 px-4 py-2 text-[10px] text-zinc-600 font-black tracking-widest border-b border-zinc-950 pb-2">
                  <div className="col-span-1">#</div>
                  <div className="col-span-5 md:col-span-6">TRACK TITLE / ARTIST</div>
                  <div className="col-span-3 md:col-span-2">CATEGORY</div>
                  <div className="col-span-3 text-right">CONTROLS</div>
                </div>

                {/* Body Rows */}
                {filteredAlbumTracks.map((track, index) => {
                  const isCurPl = activeTrack?.id === track.id;
                  const isCurPlActive = isCurPl && isPlaying;
                  return (
                    <div
                      key={track.id}
                      onClick={() => playTrack(track, albumTracks)}
                      className={`grid grid-cols-12 items-center px-4 py-3 rounded-xl border cursor-pointer transition-all ${
                        isCurPl
                          ? 'bg-red-950/15 border-red-505/30 text-white'
                          : 'bg-[#08080a]/80 border-zinc-900/50 hover:bg-zinc-900/60 hover:border-red-500/10 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {/* # index column */}
                      <div className="col-span-1 text-[11px] font-bold text-zinc-500">
                        {isCurPlActive ? (
                          <div className="flex items-center gap-0.5 h-3 justify-start">
                            <span className="w-0.5 bg-red-500 h-3 animate-pulse" />
                            <span className="w-0.5 bg-red-500 h-1.5 animate-pulse" />
                            <span className="w-0.5 bg-red-500 h-2 animate-pulse" />
                          </div>
                        ) : (
                          String(index + 1).padStart(2, '0')
                        )}
                      </div>

                      {/* Info details column with beautiful mini-thumbnail */}
                      <div className="col-span-5 md:col-span-6 flex items-center gap-3.5 min-w-0 pr-3">
                        <img
                          src={track.coverImage || "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx20605-64O7S6OfPLa3.png"}
                          alt=""
                          className="w-10 h-10 object-cover rounded-lg shrink-0 border border-zinc-900 shadow-sm"
                          referrerPolicy="no-referrer"
                        />
                        <div className="min-w-0 text-left">
                          <h4 className={`font-sans font-extrabold text-xs truncate leading-snug ${isCurPl ? 'text-red-500' : 'text-zinc-100'}`}>
                            {track.title}
                          </h4>
                          <span className="text-[10px] text-zinc-550 truncate block mt-0.5">
                            {track.artist || 'Unknown Artist'}
                          </span>
                        </div>
                      </div>

                      {/* Category badge */}
                      <div className="col-span-3 md:col-span-2 shrink-0">
                        <span className={`text-[9px] font-mono font-black uppercase px-2 py-0.5 rounded ${
                          isCurPl 
                            ? 'bg-red-950/20 text-red-500' 
                            : 'bg-zinc-950 text-zinc-500'
                        }`}>
                          {track.type}
                        </span>
                      </div>

                      {/* Quality tags & actions buttons */}
                      <div className="col-span-3 flex items-center justify-end gap-3 shrink-0">
                        <span className="text-[8px] font-mono font-bold bg-[#111215] text-zinc-550 border border-zinc-900 px-1.5 py-0.5 rounded select-none hidden md:block">
                          NCBD 1080P
                        </span>
                        
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavourite(track);
                          }}
                          className={`p-1.5 rounded-lg border text-xs cursor-pointer transition-transform duration-100 active:scale-95 ${
                            isFavourited(track.id)
                              ? 'bg-red-950/20 border-red-900/30 text-red-500'
                              : 'bg-zinc-950 border-zinc-900 text-zinc-500 hover:text-white'
                          }`}
                          title={isFavourited(track.id) ? "Remove Favourites" : "Add Favourites"}
                        >
                          <Heart className={`w-3.5 h-3.5 ${isFavourited(track.id) ? 'fill-red-500 text-red-500' : ''}`} />
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            playTrack(track, albumTracks);
                          }}
                          className={`p-1.5 rounded-lg border text-xs cursor-pointer transition-transform duration-100 active:scale-95 ${
                            isCurPl
                              ? 'bg-red-650 border-red-500 text-white'
                              : 'bg-zinc-950 border-zinc-900 text-zinc-500 hover:text-white'
                          }`}
                          title={isCurPlActive ? 'Pause' : 'Play Theme'}
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
