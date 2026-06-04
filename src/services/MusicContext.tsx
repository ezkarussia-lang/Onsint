import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { getStoredUser } from './store';

export interface AnimeThemeTrack {
  id: string;
  title: string;
  animeTitle: string;
  type: string;
  artist?: string;
  audioUrl: string;
  coverImage?: string;
}

export const MASTERPIECE_PLAYLIST: AnimeThemeTrack[] = [
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

interface MusicContextType {
  playlist: AnimeThemeTrack[];
  currentIndex: number;
  activeTrack: AnimeThemeTrack | null;
  isPlaying: boolean;
  volume: number;
  isMuted: boolean;
  currentTime: number;
  duration: number;
  isLooping: boolean;
  recentlyPlayed: AnimeThemeTrack[];
  favouritedSongs: AnimeThemeTrack[];
  playTrack: (track: AnimeThemeTrack, fromList?: AnimeThemeTrack[]) => void;
  playAll: (tracks: AnimeThemeTrack[]) => void;
  queueTrack: (track: AnimeThemeTrack) => void;
  removeTrack: (id: string) => void;
  reorderQueue: (startIndex: number, endIndex: number) => void;
  togglePlayPause: () => void;
  nextTrack: () => void;
  prevTrack: () => void;
  seekTo: (time: number) => void;
  setVolume: (vol: number) => void;
  setIsMuted: (muted: boolean) => void;
  setIsLooping: (loop: boolean) => void;
  clearQueue: () => void;
  toggleFavourite: (track: AnimeThemeTrack) => void;
  isFavourited: (trackId: string) => boolean;
}

const MusicContext = createContext<MusicContextType | undefined>(undefined);

export function MusicProvider({ children }: { children: React.ReactNode }) {
  const [playlist, setPlaylist] = useState<AnimeThemeTrack[]>(() => {
    const saved = localStorage.getItem('anipr8v_playlist');
    return saved ? JSON.parse(saved) : MASTERPIECE_PLAYLIST;
  });

  const [currentIndex, setCurrentIndex] = useState<number>(() => {
    const saved = localStorage.getItem('anipr8v_current_idx');
    return saved ? parseInt(saved, 10) : 0;
  });

  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolumeState] = useState(() => {
    const saved = localStorage.getItem('anipr8v_volume');
    return saved ? parseFloat(saved) : 0.7;
  });
  const [isMuted, setIsMutedState] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLooping, setIsLoopingState] = useState(false);
  const [recentlyPlayed, setRecentlyPlayed] = useState<AnimeThemeTrack[]>(() => {
    const saved = localStorage.getItem('anipr8v_recent_played');
    return saved ? JSON.parse(saved) : MASTERPIECE_PLAYLIST.slice(0, 3);
  });
  const [favouritedSongs, setFavouritedSongs] = useState<AnimeThemeTrack[]>(() => {
    const saved = localStorage.getItem('anipr8v_favourited_songs');
    return saved ? JSON.parse(saved) : [];
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const activeTrack = playlist[currentIndex] || null;

  // Sync state to LocalStorage
  useEffect(() => {
    localStorage.setItem('anipr8v_playlist', JSON.stringify(playlist));
  }, [playlist]);

  useEffect(() => {
    localStorage.setItem('anipr8v_favourited_songs', JSON.stringify(favouritedSongs));
    const user = getStoredUser();
    if (user && user.username) {
      import('./supabase').then(({ syncFavouritedSongsWithDb }) => {
        syncFavouritedSongsWithDb(user.username, favouritedSongs).then((merged) => {
          if (merged && merged.length !== favouritedSongs.length) {
            setFavouritedSongs(merged);
          }
        }).catch(() => {});
      }).catch(() => {});
    }
  }, [favouritedSongs]);

  useEffect(() => {
    const user = getStoredUser();
    if (user && user.username) {
      import('./supabase').then(({ syncFavouritedSongsWithDb }) => {
        syncFavouritedSongsWithDb(user.username, favouritedSongs).then((merged) => {
          if (merged && merged.length > 0) {
            setFavouritedSongs(merged);
          }
        }).catch(() => {});
      }).catch(() => {});
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('anipr8v_current_idx', String(currentIndex));
  }, [currentIndex]);

  useEffect(() => {
    localStorage.setItem('anipr8v_volume', String(volume));
  }, [volume]);

  useEffect(() => {
    localStorage.setItem('anipr8v_recent_played', JSON.stringify(recentlyPlayed));
  }, [recentlyPlayed]);

  // Audio Node Init
  useEffect(() => {
    audioRef.current = new Audio();
    audioRef.current.volume = isMuted ? 0 : volume;

    const audio = audioRef.current;

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const onLoadedMetadata = () => {
      setDuration(audio.duration || 0);
    };

    const onEnded = () => {
      if (isLooping) {
        audio.currentTime = 0;
        audio.play().catch(() => {});
      } else {
        triggerNext();
      }
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('ended', onEnded);
      audio.pause();
    };
  }, [isLooping]);

  // Audio source triggers
  useEffect(() => {
    if (!audioRef.current) return;
    const audio = audioRef.current;

    if (activeTrack) {
      const wasPlaying = isPlaying;
      audio.src = activeTrack.audioUrl;
      audio.load();

      if (wasPlaying) {
        audio.play()
          .then(() => setIsPlaying(true))
          .catch((err) => {
            console.warn("Playback blocked / pending gesture: ", err);
            setIsPlaying(false);
          });
      }
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  }, [activeTrack]);

  const triggerNext = () => {
    if (playlist.length <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % playlist.length);
    setIsPlaying(true);
  };

  const playTrack = (track: AnimeThemeTrack, fromList?: AnimeThemeTrack[]) => {
    if (fromList && fromList.length > 0) {
      // Replace playlist with list
      setPlaylist(fromList);
      const idx = fromList.findIndex(t => t.id === track.id || t.audioUrl === track.audioUrl);
      setCurrentIndex(idx !== -1 ? idx : 0);
    } else {
      // Check if track is already in the playlist query
      const matchIdx = playlist.findIndex(t => t.id === track.id || t.audioUrl === track.audioUrl);
      if (matchIdx !== -1) {
        setCurrentIndex(matchIdx);
      } else {
        // Add to standard queue top
        const newList = [track, ...playlist];
        setPlaylist(newList);
        setCurrentIndex(0);
      }
    }

    // Add to recently played list
    setRecentlyPlayed((prev) => {
      const filtered = prev.filter(t => t.id !== track.id);
      return [track, ...filtered].slice(0, 10);
    });

    setIsPlaying(true);
    setTimeout(() => {
      if (audioRef.current) {
        audioRef.current.play()
          .then(() => setIsPlaying(true))
          .catch(() => setIsPlaying(false));
      }
    }, 50);
  };

  const playAll = (tracks: AnimeThemeTrack[]) => {
    if (tracks.length === 0) return;
    setPlaylist(tracks);
    setCurrentIndex(0);
    setIsPlaying(true);
    setTimeout(() => {
      if (audioRef.current) {
        audioRef.current.play()
          .then(() => setIsPlaying(true))
          .catch(() => setIsPlaying(false));
      }
    }, 50);
  };

  const queueTrack = (track: AnimeThemeTrack) => {
    const exists = playlist.some(t => t.id === track.id || t.audioUrl === track.audioUrl);
    if (!exists) {
      setPlaylist((prev) => [...prev, track]);
    }
  };

  const removeTrack = (id: string) => {
    if (playlist.length <= 1) return; // Keep at least one track
    const matchIdx = playlist.findIndex(t => t.id === id);
    if (matchIdx === -1) return;

    const newList = playlist.filter(t => t.id !== id);
    setPlaylist(newList);

    if (matchIdx === currentIndex) {
      // Active playing track deleted -> fall to the previous index or zero
      const nextIdx = Math.max(0, matchIdx - 1);
      setCurrentIndex(nextIdx);
    } else if (matchIdx < currentIndex) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const reorderQueue = (startIndex: number, endIndex: number) => {
    const result = Array.from(playlist);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);

    // Adjust currentIndex
    const activeItem = playlist[currentIndex];
    setPlaylist(result);

    const newIdx = result.findIndex((item: any) => item.id === activeItem?.id);
    if (newIdx !== -1) {
      setCurrentIndex(newIdx);
    }
  };

  const togglePlayPause = () => {
    if (!audioRef.current || !activeTrack) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play()
        .then(() => setIsPlaying(true))
        .catch((err) => console.warn(err));
    }
  };

  const nextTrack = () => {
    triggerNext();
  };

  const prevTrack = () => {
    if (playlist.length <= 1) return;
    setCurrentIndex((prev) => (prev - 1 + playlist.length) % playlist.length);
    setIsPlaying(true);
  };

  const seekTo = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const setVolume = (vol: number) => {
    const bounded = Math.min(1, Math.max(0, vol));
    setVolumeState(bounded);
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : bounded;
    }
  };

  const setIsMuted = (muted: boolean) => {
    setIsMutedState(muted);
    if (audioRef.current) {
      audioRef.current.volume = muted ? 0 : volume;
    }
  };

  const setIsLooping = (loop: boolean) => {
    setIsLoopingState(loop);
  };

  const clearQueue = () => {
    if (activeTrack) {
      setPlaylist([activeTrack]);
      setCurrentIndex(0);
    }
  };

  const toggleFavourite = (track: AnimeThemeTrack) => {
    const isFav = favouritedSongs.some(t => t.id === track.id);
    let updated: AnimeThemeTrack[];
    if (isFav) {
      updated = favouritedSongs.filter(t => t.id !== track.id);
      const user = getStoredUser();
      if (user && user.username) {
        import('./supabase').then(({ deleteFavouritedSongFromDb }) => {
          deleteFavouritedSongFromDb(user.username, track.id).catch(() => {});
        }).catch(() => {});
      }
    } else {
      updated = [...favouritedSongs, track];
    }
    setFavouritedSongs(updated);
    window.dispatchEvent(new CustomEvent('anipr8v_fave_songs_update'));
  };

  const isFavourited = (trackId: string) => {
    return favouritedSongs.some(t => t.id === trackId);
  };

  return (
    <MusicContext.Provider
      value={{
        playlist,
        currentIndex,
        activeTrack,
        isPlaying,
        volume,
        isMuted,
        currentTime,
        duration,
        isLooping,
        recentlyPlayed,
        favouritedSongs,
        playTrack,
        playAll,
        queueTrack,
        removeTrack,
        reorderQueue,
        togglePlayPause,
        nextTrack,
        prevTrack,
        seekTo,
        setVolume,
        setIsMuted,
        setIsLooping,
        clearQueue,
        toggleFavourite,
        isFavourited
      }}
    >
      {children}
    </MusicContext.Provider>
  );
}

export function useMusic() {
  const context = useContext(MusicContext);
  if (context === undefined) {
    throw new Error('useMusic must be used within a MusicProvider');
  }
  return context;
}
