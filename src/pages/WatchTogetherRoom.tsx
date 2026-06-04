import React, { useEffect, useState, useRef, useMemo } from 'react';
import { ArrowLeft, Loader2, Play, Users, AlertCircle, Copy, Check, Send, LogOut, Trash2, ChevronLeft, ChevronRight, ChevronDown, Tv, Mic, LayoutGrid, List, Grid } from 'lucide-react';
import { getAnimeDetails, AnimeMedia } from '../services/anilist';
import { fetchEpisodes, fetchStreamSources, resolveM3u8, AnimeEpisode, AnimeWatchResponse } from '../services/api';
import { getStoredUser, ANIME_AVATARS, addNotification, getAllRegisteredUsers } from '../services/store';
import UserProfileModal from '../components/UserProfileModal';
import Hls from 'hls.js';

interface Message {
  id: string;
  authorName: string;
  avatar: string;
  text: string;
  timestamp: number;
}

interface RoomState {
  id: string;
  ownerName: string;
  animeId: number;
  animeTitle: string;
  episodeNumber: number;
  episodeThumbnail: string;
  isPublic: boolean;
  playState: {
    currentTime: number;
    isPlaying: boolean;
    lastUpdated: number;
  };
  messages: Message[];
  inviteCode: string;
  bannedUsers: string[];
  members?: Array<{
    username: string;
    avatar: string;
    lastSeen: number;
  }>;
}

interface WatchTogetherRoomProps {
  roomId: string;
  isOwner: boolean;
  onBack: () => void;
}

export default function WatchTogetherRoom({ roomId, isOwner, onBack }: WatchTogetherRoomProps) {
  const [room, setRoom] = useState<RoomState | null>(null);
  const [sidebarTab, setSidebarTab] = useState<'chat' | 'members'>('chat');
  const [animeDetail, setAnimeDetail] = useState<AnimeMedia | null>(null);
  const [selectedEpisode, setSelectedEpisode] = useState<AnimeEpisode | null>(null);
  const [allEpisodes, setAllEpisodes] = useState<AnimeEpisode[]>([]);
  const [selectedProfileUsername, setSelectedProfileUsername] = useState<string>('');
  const [streamInfo, setStreamInfo] = useState<AnimeWatchResponse | null>(null);
  const [playableUrl, setPlayableUrl] = useState<string>('');
  
  const [selectedCategory, setSelectedCategory] = useState<'sub' | 'dub'>('sub');
  const [activeStreamIndex, setActiveStreamIndex] = useState<number>(0);
  const [isSourceDropdownOpen, setIsSourceDropdownOpen] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);

  const activeCategoryStreams = useMemo(() => {
    if (!streamInfo || !streamInfo.streams) return [];
    return streamInfo.streams.filter((s) => s.translationType === selectedCategory);
  }, [streamInfo, selectedCategory]);

  const activeStream = useMemo(() => {
    if (!streamInfo || !streamInfo.streams || streamInfo.streams.length === 0) return null;
    const currentStream = streamInfo.streams[activeStreamIndex];
    if (currentStream && currentStream.translationType === selectedCategory) {
      return currentStream;
    }
    return activeCategoryStreams[0] || streamInfo.streams[0] || null;
  }, [streamInfo, activeStreamIndex, activeCategoryStreams, selectedCategory]);

  const activeCategoryStreamIdx = useMemo(() => {
    if (!activeStream || activeCategoryStreams.length === 0) return 0;
    const idx = activeCategoryStreams.indexOf(activeStream);
    return idx !== -1 ? idx : 0;
  }, [activeStream, activeCategoryStreams]);

  const handleCategorySwitch = (cat: 'sub' | 'dub') => {
    setSelectedCategory(cat);
    if (streamInfo && streamInfo.streams) {
      const firstOfCat = streamInfo.streams.findIndex(s => s.translationType === cat);
      if (firstOfCat !== -1) {
        setActiveStreamIndex(firstOfCat);
      }
    }
  };

  const cycleSource = (dir: 'next' | 'prev') => {
    if (activeCategoryStreams.length <= 1) return;
    const currentActiveInCat = activeCategoryStreams.indexOf(activeStream!);
    let targetIdxInCat = 0;
    if (dir === 'next') {
      targetIdxInCat = (currentActiveInCat + 1) % activeCategoryStreams.length;
    } else {
      targetIdxInCat = (currentActiveInCat - 1 + activeCategoryStreams.length) % activeCategoryStreams.length;
    }
    const targetStream = activeCategoryStreams[targetIdxInCat];
    if (targetStream && streamInfo) {
      const overallIdx = streamInfo.streams.indexOf(targetStream);
      if (overallIdx !== -1) {
        setActiveStreamIndex(overallIdx);
      }
    }
  };
  
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
    if (animeDetail?.streamingEpisodes) {
      animeDetail.streamingEpisodes.forEach(ep => {
        const num = getEpisodeNumberFromTitle(ep.title);
        if (num !== null) {
          map[num] = ep.thumbnail;
        }
      });
    }
    return map;
  }, [animeDetail]);
  
  // Loading & error states
  const [loadingRoom, setLoadingRoom] = useState(true);
  const [loadingStream, setLoadingStream] = useState(true);
  const [resolvingStream, setResolvingStream] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  // Episode view and search states
  const [episodeLayoutMode, setEpisodeLayoutMode] = useState<'list' | 'grid'>('list');
  const [episodeSearch, setEpisodeSearch] = useState('');

  const filteredEpisodes = useMemo(() => {
    if (!episodeSearch) return allEpisodes;
    const targetNum = parseInt(episodeSearch, 10);
    if (isNaN(targetNum)) return allEpisodes;
    return allEpisodes.filter(e => e.number === targetNum);
  }, [allEpisodes, episodeSearch]);

  // Live chat messages state
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const [showMentionList, setShowMentionList] = useState(false);
  const [mentionWord, setMentionWord] = useState('');
  const [mentionIndex, setMentionIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const dynamicAutocompleteUsers = useMemo(() => {
    const list = getAllRegisteredUsers().map(u => ({
      username: u.username,
      avatar: u.avatar || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${u.username}`
    }));
    if (room?.members) {
      room.members.forEach(m => {
        if (!list.some(item => item.username.toLowerCase() === m.username.toLowerCase())) {
          list.push({
            username: m.username,
            avatar: m.avatar || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${m.username}`
          });
        }
      });
    }
    return list;
  }, [room?.members, showMentionList]);

  const handleTextChange = (val: string) => {
    setChatInput(val);
    
    const input = inputRef.current;
    if (!input) return;
    const caretPos = input.selectionStart ?? val.length;
    const textBeforeCaret = val.substring(0, caretPos);
    
    const lastAtIdx = textBeforeCaret.lastIndexOf('@');
    if (lastAtIdx !== -1) {
      const hasSpaceBefore = lastAtIdx === 0 || /\s/.test(textBeforeCaret.charAt(lastAtIdx - 1));
      const wordAfterAt = textBeforeCaret.substring(lastAtIdx + 1);
      if (hasSpaceBefore && !/\s/.test(wordAfterAt)) {
        setShowMentionList(true);
        setMentionWord(wordAfterAt.toLowerCase());
        setMentionIndex(lastAtIdx);
        return;
      }
    }
    setShowMentionList(false);
  };

  const handleSelectMention = (targetUser: string) => {
    const input = inputRef.current;
    if (!input) return;
    const caretPos = input.selectionStart ?? chatInput.length;
    
    const beforeMention = chatInput.substring(0, mentionIndex);
    const afterCaret = chatInput.substring(caretPos);
    
    const newText = beforeMention + `@${targetUser} ` + afterCaret;
    setChatInput(newText);
    setShowMentionList(false);
    
    setTimeout(() => {
      input.focus();
      const newPos = mentionIndex + targetUser.length + 2; // '@' + user + ' '
      input.setSelectionRange(newPos, newPos);
    }, 50);
  };

  const filteredUsers = dynamicAutocompleteUsers.filter((u) =>
    u.username.toLowerCase().includes(mentionWord)
  );

  // Player synchronization refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const isSyncingBackRef = useRef<boolean>(false);

  const currentUser = getStoredUser();
  const isEffectiveOwner = isOwner || 
    (localStorage.getItem(`wt_owner_${roomId}`) === 'true') ||
    (room ? room.ownerName.toLowerCase() === (currentUser?.username || 'GuestOtaku').toLowerCase() : false);

  // 1. Poll room metadata & chat messages every 1.5 seconds
  useEffect(() => {
    let active = true;
    const fetchRoomState = async () => {
      try {
        const usernameParam = encodeURIComponent(currentUser?.username || 'GuestOtaku');
        const avatarParam = encodeURIComponent(currentUser?.avatar || '');
        const res = await fetch(`/api/watch-together/rooms/${roomId}?username=${usernameParam}&avatar=${avatarParam}`);
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'This watch party has ended.');
        }
        const data: RoomState = await res.json();
        if (active) {
          setRoom(data);
          setMessages(data.messages);
          setLoadingRoom(false);

          // For GUESTS - Sync playback periodically
          if (!isOwner && videoRef.current) {
            const video = videoRef.current;
            const targetTime = data.playState.currentTime;
            const targetPlaying = data.playState.isPlaying;

            // Align current position if deviation is excessive (> 3 seconds)
            const diff = Math.abs(video.currentTime - targetTime);
            if (diff > 3.0) {
              video.currentTime = targetTime;
            }

            // Align play/pause state
            if (targetPlaying && video.paused) {
              video.play().catch(() => {});
            } else if (!targetPlaying && !video.paused) {
              video.pause();
            }
          }
        }
      } catch (err: any) {
        if (active) {
          setErrorText(err.message || 'Failed to sync with the watch party.');
          setLoadingRoom(false);
        }
      }
    };

    fetchRoomState();
    const interval = setInterval(fetchRoomState, 1500);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [roomId, isOwner]);

  // 2. Load detailed metadata matching the Room's anime
  useEffect(() => {
    if (!room) return;
    getAnimeDetails(room.animeId)
      .then((data) => setAnimeDetail(data))
      .catch((e) => console.error('AniList load failure in WatchTogetherRoom:', e));
  }, [room?.animeId]);

  // 3. Resolve the stream with the matching episode number inside room
  useEffect(() => {
    if (!room) return;

    let active = true;
    async function loadEpisodeAndSources() {
      let episodesList: AnimeEpisode[] = [];
      let targetEp: AnimeEpisode | null = null;

      try {
        setLoadingStream(true);
        setErrorText(null);
        setResolveError(null);

        // Fetch episodes
        try {
          const epData = await fetchEpisodes(room!.animeId);
          if (epData && epData.providers) {
            const rawList: AnimeEpisode[] = [];
            Object.values(epData.providers).forEach((prov: any) => {
              if (prov && prov.episodes) {
                if (Array.isArray(prov.episodes.sub)) rawList.push(...prov.episodes.sub);
                if (Array.isArray(prov.episodes.dub)) rawList.push(...prov.episodes.dub);
              }
            });

            // Deduplicate episodes
            const uniqueMap: Record<number, AnimeEpisode> = {};
            rawList.forEach((item) => {
              if (item && item.number) {
                if (!uniqueMap[item.number] || (item.id && !item.id.startsWith('backup'))) {
                  uniqueMap[item.number] = item;
                }
              }
            });

            episodesList = Object.values(uniqueMap).sort((a, b) => a.number - b.number);
            targetEp = episodesList.find((e) => e.number === room!.episodeNumber) || episodesList[0] || null;
          }
        } catch (epErr) {
          console.warn('Failed to load real episodes from Miruro, fallback list will be generated:', epErr);
        }

        // If no episodes loaded, generate safe backup list using animeDetail or default to 12
        if (episodesList.length === 0) {
          const totalEps = animeDetail?.episodes || 12;
          for (let i = 1; i <= totalEps; i++) {
            episodesList.push({
              id: `backup-ep-${room!.animeId}-${i}`,
              number: i,
              title: `Episode ${i}`,
              image: room!.episodeThumbnail || ''
            });
          }
          targetEp = episodesList.find((e) => e.number === room!.episodeNumber) || episodesList[0] || null;
        }

        if (!targetEp) {
          targetEp = {
            id: `backup-ep-${room!.animeId}-${room!.episodeNumber}`,
            number: room!.episodeNumber,
            title: `Episode ${room!.episodeNumber}`,
            image: room!.episodeThumbnail || ''
          };
        }

        if (active) {
          setSelectedEpisode(targetEp);
          setAllEpisodes(episodesList);
        }

        // Now resolve sources
        if (targetEp.id.startsWith('backup-ep')) {
          if (active) {
            setStreamInfo({
              streams: []
            });
            setActiveStreamIndex(0);
          }
        } else {
          try {
            const sources = await fetchStreamSources(targetEp.id);
            if (active) {
              if (sources && sources.streams && sources.streams.length > 0) {
                setStreamInfo(sources);
                const matchIdx = sources.streams.findIndex((s) => s.translationType === selectedCategory);
                if (matchIdx !== -1) {
                  setActiveStreamIndex(matchIdx);
                } else {
                  setActiveStreamIndex(0);
                }
              } else {
                throw new Error('No streams found for this episode.');
              }
            }
          } catch (sourcesErr) {
            console.warn('Individual episode stream load failed.', sourcesErr);
            if (active) {
              setStreamInfo({
                streams: []
              });
              setActiveStreamIndex(0);
            }
          }
        }
      } catch (err: any) {
        console.error('Core room stream resolver failure:', err);
        if (active) {
          setResolveError(err.message || 'Error occurred while establishing stream.');
        }
      } finally {
        if (active) {
          setLoadingStream(false);
        }
      }
    }

    loadEpisodeAndSources();
    return () => {
      active = false;
    };
  }, [room?.animeId, room?.episodeNumber, animeDetail]);

  // Decode/decrypt and load the playable URL in background based on active source choice
  useEffect(() => {
    if (!streamInfo || !streamInfo.streams || streamInfo.streams.length === 0) {
      setPlayableUrl('');
      return;
    }

    const currentStream = streamInfo.streams[activeStreamIndex];
    if (!currentStream) return;

    if (currentStream.url.startsWith('backup') || currentStream.url.startsWith('demo-')) {
      setPlayableUrl(currentStream.url);
      setResolvingStream(false);
      return;
    }

    let active = true;
    async function resolveCurrentStream() {
      try {
        setResolvingStream(true);
        const playable = await resolveM3u8(currentStream.url);
        if (active) {
          setPlayableUrl(playable);
        }
      } catch (err) {
        console.warn('Playback resolution failure.', err);
        // Do not set playable URL to backup, leave it empty or handled by error state
      } finally {
        if (active) {
          setResolvingStream(false);
        }
      }
    }

    resolveCurrentStream();
    return () => {
      active = false;
    };
  }, [streamInfo, activeStreamIndex]);

  // 4. Setup HLS Player
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !playableUrl) return;

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const isHlsStream = playableUrl.includes('.m3u8') || playableUrl.includes('/proxy') || playableUrl.includes('m3u8');

    if (Hls.isSupported() && isHlsStream) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90
      });

      hls.loadSource(playableUrl);
      hls.attachMedia(video);
      hlsRef.current = hls;

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (room?.playState.isPlaying) {
          video.play().catch(() => {});
        }
      });
    } else {
      video.src = playableUrl;
      if (room?.playState.isPlaying) {
        video.play().catch(() => {});
      }
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [playableUrl]);

  // 5. Scroll chat to bottom with new messages smoothly without forcing window scroll
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages]);

  // 6. Owner updates: Sync state changes back to server
  const syncPlaybackToServer = async () => {
    if (!isEffectiveOwner || !videoRef.current || !room || isSyncingBackRef.current) return;

    isSyncingBackRef.current = true;
    try {
      await fetch(`/api/watch-together/rooms/${roomId}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentTime: videoRef.current.currentTime,
          isPlaying: !videoRef.current.paused
        })
      });
    } catch (err) {
      console.error('Owner timestamp sync failure:', err);
    } finally {
      isSyncingBackRef.current = false;
    }
  };

  // Sync back to backend whenever owner toggles play state or seeks
  const handleOwnerPlayPause = () => {
    if (isEffectiveOwner) syncPlaybackToServer();
  };

  const handleOwnerSeeked = () => {
    if (isEffectiveOwner) syncPlaybackToServer();
  };

  // Periodically send timestamp updates back to server if owner is playing the stream
  useEffect(() => {
    if (!isEffectiveOwner) return;

    const timer = setInterval(() => {
      if (videoRef.current && !videoRef.current.paused) {
        syncPlaybackToServer();
      }
    }, 2500);

    return () => clearInterval(timer);
  }, [isEffectiveOwner, roomId, room]);

  // Submit dynamic message to chat live
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isSendingMessage) return;

    setIsSendingMessage(true);
    const contentText = chatInput.trim();
    setChatInput('');

    try {
      const payload = {
        authorName: currentUser?.username || 'GuestOtaku',
        avatar: currentUser?.avatar || ANIME_AVATARS[0],
        text: contentText
      };

      const res = await fetch(`/api/watch-together/rooms/${roomId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const msg = await res.json();
        setMessages((prev) => [...prev, msg]);
      }
    } catch (err) {
      console.error('Failed to post Live Chat message:', err);
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleHostSwitchEpisode = async (episodeNum: number) => {
    if (!isEffectiveOwner || !room) return;
    try {
      setLoadingStream(true);
      const res = await fetch(`/api/watch-together/rooms/${roomId}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          episodeNumber: episodeNum,
          currentTime: 0,
          isPlaying: true
        })
      });
      if (res.ok) {
        const data = await res.json();
        setRoom(data);
      }
    } catch (err) {
      console.error('Failed to change episode:', err);
    }
  };

  const handleRegenerateInviteCode = async () => {
    try {
      const res = await fetch(`/api/watch-together/rooms/${roomId}/regenerate-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ownerName: currentUser?.username || 'GuestOtaku' })
      });
      if (res.ok) {
        const data = await res.json();
        setRoom(data);
      }
    } catch (err) {
      console.error('Failed to regenerate code:', err);
    }
  };

  const handleKickUser = async (usernameToKick: string) => {
    try {
      const res = await fetch(`/api/watch-together/rooms/${roomId}/kick`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ownerName: currentUser?.username || 'GuestOtaku',
          usernameToKick
        })
      });
      if (res.ok) {
        const data = await res.json();
        setRoom(data);
      }
    } catch (err) {
      console.error('Failed to kick user:', err);
    }
  };

  const handleBanUser = async (usernameToBan: string) => {
    try {
      const res = await fetch(`/api/watch-together/rooms/${roomId}/ban`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ownerName: currentUser?.username || 'GuestOtaku',
          usernameToBan
        })
      });
      if (res.ok) {
        const data = await res.json();
        setRoom(data);
      }
    } catch (err) {
      console.error('Failed to ban user:', err);
    }
  };

  const handleLeaveOrCloseParty = async () => {
    if (isEffectiveOwner) {
      // Owner deletes the watch room cleanly to keep list uncluttered
      try {
        await fetch(`/api/watch-together/rooms/${roomId}`, { method: 'DELETE' });
      } catch {}
    }
    onBack();
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(room?.inviteCode || roomId);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  if (loadingRoom) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 font-mono select-none">
        <Loader2 className="w-10 h-10 text-red-600 animate-spin" />
        <span className="text-zinc-500 font-bold uppercase tracking-widest text-[10px]">
          RESOLVING WATCH PARTY STREAM TIMESTAMPS...
        </span>
      </div>
    );
  }

  if (errorText && !room) {
    return (
      <div className="text-center p-12 bg-zinc-950/80 border border-red-950/20 max-w-sm mx-auto rounded-xl mt-12 font-sans select-none">
        <AlertCircle className="w-12 h-12 text-[#ef4444] mx-auto mb-4 animate-scale-up" />
        <h4 className="text-white font-black uppercase text-sm mb-1 font-mono">Room Offline</h4>
        <p className="text-zinc-500 text-xs mt-1.5">{errorText}</p>
        <button
          onClick={onBack}
          className="mt-6 px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold uppercase tracking-wider font-mono cursor-pointer"
        >
          Return to Anime details
        </button>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-5 pb-20 px-4 md:px-8 select-none font-sans">
      
      {/* Upper navigation header row */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-900 pb-3">
        <div className="flex items-center gap-3">
          <button
            onClick={handleLeaveOrCloseParty}
            className="group px-3 py-2 bg-gradient-to-r from-red-950/40 to-black hover:from-red-600 hover:to-rose-600 border border-red-900/30 hover:border-red-650 rounded-xl text-zinc-350 hover:text-white transition-all duration-300 cursor-pointer flex items-center gap-1.5 text-[10px] font-mono uppercase font-black tracking-wider shadow-md hover:shadow-red-600/10 active:scale-95"
            title="Leave Lobby"
          >
            <LogOut className="w-3.5 h-3.5 text-zinc-500 group-hover:text-white transition-colors" />
            <span>{isEffectiveOwner ? 'Close Party' : 'Leave Party'}</span>
          </button>

          <div>
            <span className="text-[9px] font-black uppercase tracking-widest text-[#ef4444] block font-mono leading-none mb-1">
              {isEffectiveOwner ? '⭐ HOSTING WATCH PARTY' : '🔊 GUEST LISTENER MODE'}
            </span>
            <h2 className="text-sm font-black text-white font-mono flex items-center gap-1.5 truncate max-w-sm">
              Live: {animeDetail?.title.userPreferred || room?.animeTitle} (EP {room?.episodeNumber})
            </h2>
          </div>
        </div>

        {/* Copy Invite Code badge */}
        <div className="bg-[#0c0c10] border border-zinc-900 p-2.5 rounded-xl flex items-center gap-2.5 font-mono">
          <div>
            <span className="text-[7.5px] font-extrabold uppercase text-zinc-500 block leading-none">INVITE CODE</span>
            <span className="text-[11px] font-black tracking-wider text-pink-500 font-mono mt-0.5 block">#{room?.inviteCode || roomId}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleCopyCode}
              className="p-1.5 hover:bg-zinc-900 text-zinc-400 hover:text-white rounded-lg transition-colors cursor-pointer border border-transparent hover:border-zinc-800"
              title="Copy Invite Room ID"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            {isEffectiveOwner && (
              <button
                onClick={handleRegenerateInviteCode}
                className="px-2.5 py-1.5 bg-zinc-950 hover:bg-neutral-900 text-[8.5px] text-pink-500 hover:text-pink-400 font-black rounded-lg font-mono uppercase tracking-widest transition-all duration-300 border border-pink-550/20 hover:border-pink-500/50 cursor-pointer active:scale-95 hover:shadow-sm"
                title="Regenerate Entrance Code"
              >
                Regen Code
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main split screen viewport */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Left Video Player area */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="relative aspect-video overflow-hidden bg-black">
            {loadingStream || resolvingStream || !playableUrl ? (
              <div className="w-full h-full bg-black flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-10 h-10 text-red-600 animate-spin" />
                <span className="text-zinc-500 font-bold uppercase tracking-widest text-[9px] font-mono">
                  {loadingStream ? 'TUNING INTO HOST FREQUENCY...' : 'DECRYPTING VIDEO BUFFER SEED...'}
                </span>
              </div>
            ) : (
              <>
                <video
                  ref={videoRef}
                  controls={isEffectiveOwner}
                  autoPlay
                  playsInline
                  onPlay={handleOwnerPlayPause}
                  onPause={handleOwnerPlayPause}
                  onSeeked={handleOwnerSeeked}
                  className="w-full h-full object-contain"
                />

                {/* Un-interactive guest cover or text reminder if not host */}
                {!isEffectiveOwner && (
                  <div className="absolute top-3 left-3 bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-zinc-900 flex items-center gap-1.5 pointer-events-none select-none z-20">
                    <span className="relative flex h-2 w-2 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                    </span>
                    <span className="text-[9.5px] font-mono font-black uppercase text-red-550 tracking-widest">
                      Host @{room?.ownerName} Controls Playback
                    </span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Independent Capsule Controller directly below the video player */}
          <div className="flex flex-col items-center justify-center gap-3 py-1">
            {/* Premium Pill Controller matching the requested mock and Watch.tsx exactly */}
            <div className="w-full max-w-md flex items-center justify-between gap-1 bg-zinc-950 border border-zinc-900 rounded-full px-4 py-2 hover:border-zinc-850/60 transition-colors shadow-lg relative select-none">
              
              {/* Arrow Left to go to prev source */}
              <button
                type="button"
                onClick={() => cycleSource('prev')}
                disabled={activeCategoryStreams.length <= 1}
                className="p-1.5 hover:bg-zinc-900/80 rounded-full text-zinc-500 hover:text-white transition-all cursor-pointer disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed"
                title="Previous Source"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              {/* Toggle SUB / DUB in high-contrast red brand colors */}
              <div className="bg-zinc-900/60 border border-zinc-900/70 p-0.5 rounded-full flex items-center shrink-0">
                <button
                  type="button"
                  onClick={() => handleCategorySwitch('sub')}
                  className={`px-3 py-1.5 text-[10px] font-black rounded-full uppercase tracking-wider transition-all leading-none cursor-pointer ${
                    selectedCategory === 'sub'
                      ? 'bg-red-600 text-white shadow shadow-red-600/25'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  SUB
                </button>
                <button
                  type="button"
                  onClick={() => handleCategorySwitch('dub')}
                  className={`px-3 py-1.5 text-[10px] font-black rounded-full uppercase tracking-wider transition-all leading-none cursor-pointer ${
                    selectedCategory === 'dub'
                      ? 'bg-red-600 text-white shadow shadow-red-600/25'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  DUB
                </button>
              </div>

              {/* Dropdown Menu for Source choice */}
              <div className="relative shrink-0">
                <button
                  onClick={() => {
                    if (activeCategoryStreams.length > 0) {
                      setIsSourceDropdownOpen(!isSourceDropdownOpen);
                    }
                  }}
                  disabled={activeCategoryStreams.length === 0}
                  className="flex items-center gap-1.5 bg-zinc-900/90 border border-zinc-900 hover:border-zinc-800 rounded-full px-4 py-1.5 text-xs font-bold text-white transition-all cursor-pointer select-none leading-none disabled:opacity-50"
                  type="button"
                  title="Choose Streaming Source"
                >
                  <Tv className="w-3.5 h-3.5 text-red-500" />
                  <span className="truncate max-w-[100px]">
                    {activeCategoryStreams[activeCategoryStreamIdx]?.server || 'Direct Match'}
                  </span>
                  <span className="text-[9px] px-1 py-0.5 rounded bg-zinc-950 font-black tracking-wider text-red-400 font-mono">
                    {activeCategoryStreams[activeCategoryStreamIdx]?.quality || 'HD'}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
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
                            type="button"
                            onClick={() => {
                              setActiveStreamIndex(overallIdx);
                              setIsSourceDropdownOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-between gap-2.5 outline-none cursor-pointer ${
                              isPlayable
                                ? 'bg-red-950/20 text-[#ef4444] border border-red-500/10'
                                : 'text-zinc-400 hover:text-white hover:bg-zinc-900/40 border border-transparent'
                            }`}
                          >
                            <span className="truncate">{stream.server} ({stream.quality})</span>
                            {isPlayable && <span className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-sm" />}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>

              {/* Arrow Right to cycle forward */}
              <button
                type="button"
                onClick={() => cycleSource('next')}
                disabled={activeCategoryStreams.length <= 1}
                className="p-1.5 hover:bg-zinc-900/80 rounded-full text-zinc-500 hover:text-white transition-all cursor-pointer disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed"
                title="Next Source"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Quick Warning/Notice Banner below controller if active */}
          {resolveError && (
            <div className="flex items-center gap-2 p-3 bg-red-950/10 border border-red-900/20 text-red-400 rounded-lg text-xs leading-relaxed">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{resolveError}</span>
            </div>
          )}

          {/* Details below video */}
          <div className="p-4 bg-[#08080a] border border-red-950/5 rounded-2xl">
            <span 
              className="text-[10px] font-black uppercase bg-zinc-950 border border-zinc-900 text-zinc-500 px-3 py-1 rounded-full font-mono mb-2 inline-block leading-normal cursor-pointer hover:border-red-500 hover:text-red-450 transition-all"
              onClick={() => setSelectedProfileUsername(room?.ownerName || '')}
            >
              HOST: @{room?.ownerName}
            </span>
            <p className="text-xs text-zinc-400 mt-1 lines-clamp-2">
              Currently streaming Episode {room?.episodeNumber} with {messages.length} live chat comments logged. Guests' video players will automatically synchronize timestamps to match the Host in real-time.
            </p>
          </div>

          {/* Host Playlist Selector - Polish redesigned as requested for the host of the room */}
          {allEpisodes.length > 0 && (
            <div className="p-5 bg-[#08080a] border border-red-950/10 rounded-2xl flex flex-col gap-3.5 shadow-md">
               <div className="flex items-center justify-between border-b border-zinc-900/60 pb-2.5 select-none gap-2">
                 <div className="flex items-center gap-1.5 font-mono min-w-0">
                   <Play className="w-4 h-4 text-red-500 fill-red-500/20 shrink-0" />
                   <h3 className="text-xs font-black text-white uppercase tracking-widest font-mono truncate">
                     {isEffectiveOwner ? 'Host Broadcast Controls' : 'Watch Party Episodes'}
                   </h3>
                 </div>
                 
                 <div className="flex items-center gap-2 shrink-0">
                   {/* Layout Mode Toggler replicates Watch.tsx */}
                   <div className="flex items-center bg-zinc-900 p-0.5 rounded border border-zinc-800">
                     <button
                       type="button"
                       onClick={() => setEpisodeLayoutMode('list')}
                       className={`p-1 rounded transition-colors cursor-pointer ${
                         episodeLayoutMode === 'list'
                           ? 'bg-zinc-950 text-red-500 border border-zinc-900'
                           : 'text-zinc-500 hover:text-zinc-300'
                       }`}
                       title="List with Thumbnails"
                     >
                       <List className="w-3 h-3" />
                     </button>
                     <button
                       type="button"
                       onClick={() => setEpisodeLayoutMode('grid')}
                       className={`p-1 rounded transition-colors cursor-pointer ${
                         episodeLayoutMode === 'grid'
                           ? 'bg-zinc-950 text-red-500 border border-zinc-900'
                           : 'text-zinc-500 hover:text-zinc-300'
                       }`}
                       title="Compact Numbers Grid"
                     >
                       <Grid className="w-3 h-3" />
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
                       className="w-12 bg-zinc-900 text-[10.5px] text-white placeholder-zinc-650 font-bold border border-zinc-800 focus:border-red-650 rounded px-1 py-0.5 text-center outline-none transition-colors"
                     />
                   </div>

                   <span className="text-[9px] font-black font-mono uppercase bg-red-950/25 text-[#ef4444] px-2 py-0.5 rounded-full border border-red-900/30">
                     {allEpisodes.length} Available
                   </span>
                 </div>
               </div>
               
               {filteredEpisodes.length === 0 ? (
                 <div className="flex items-center justify-center p-6 text-zinc-650 text-xs italic">
                   No episodes match search filter.
                 </div>
               ) : episodeLayoutMode === 'list' ? (
                 <div className="flex flex-col gap-2 max-h-71 overflow-y-auto pr-1 select-none custom-scrollbar animate-fade-in">
                   {filteredEpisodes.map((ep) => {
                     const isActive = ep.number === room?.episodeNumber;
                     const isGenericEpName = !ep.title || 
                       ep.title.toLowerCase() === `episode ${ep.number}` || 
                       ep.title.toLowerCase() === `episode 0${ep.number}` ||
                       ep.title.toLowerCase() === `episode 00${ep.number}` ||
                       /^ep(\s)*\d+$/i.test(ep.title);
                     
                     const resolvedDisplayTitle = isGenericEpName 
                       ? (animeDetail?.title.english || animeDetail?.title.userPreferred || `Episode ${ep.number}`)
                       : ep.title;
  
                     return (
                       <button
                         key={ep.id}
                         type="button"
                         onClick={() => {
                           if (isEffectiveOwner) {
                             handleHostSwitchEpisode(ep.number);
                           } else {
                             addNotification({
                               category: 'Anime',
                               title: 'Broadcast Sync Locked',
                               subtitle: `Only @${room?.ownerName || 'the host'} can change episodes. High-quality watch synchronization is active.`,
                               animeId: room?.animeId || 20,
                               animeImage: animeDetail?.coverImage.large || room?.episodeThumbnail || ''
                             });
                           }
                         }}
                         className={`w-full flex items-center gap-3 p-2 rounded-xl text-left border transition-all cursor-pointer group outline-none ${
                           isActive
                             ? 'bg-red-950/10 border-red-900/30 text-white shadow shadow-red-950/10'
                             : 'bg-zinc-950/40 border-zinc-900/40 text-zinc-400 hover:bg-zinc-900/50 hover:border-zinc-800/80 hover:text-zinc-200'
                         }`}
                       >
                         {/* Episode snapshot aspect ratio container */}
                         <div className="relative aspect-[16/10] w-22 sm:w-24 rounded-lg overflow-hidden shrink-0 bg-zinc-950 border border-zinc-900 shadow-sm leading-none flex items-center justify-center">
                           {(() => {
                             const customTh = episodeThumbnailsMap[ep.number] || ep.image || animeDetail?.bannerImage || animeDetail?.coverImage.large;
                             return customTh ? (
                               <img
                                 src={customTh}
                                 alt={`Episode ${ep.number}`}
                                 className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                 referrerPolicy="no-referrer"
                                 onError={(e) => {
                                   (e.currentTarget as HTMLImageElement).src = animeDetail?.coverImage.large || '';
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
                           <span className="text-[9px] font-black font-mono tracking-widest text-[#a1a1aa] block uppercase mb-0.5">
                             Broadcast EP {ep.number}
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
                                 BROADCASTING LIVE
                               </span>
                             </div>
                           )}
                         </div>
                       </button>
                     );
                   })}
                 </div>
               ) : (
                 /* Replicates Compact numbers grid layout on Watch.tsx */
                 <div className="flex flex-wrap gap-1.5 justify-start max-h-71 overflow-y-auto pr-1 select-none custom-scrollbar pb-1 animate-fade-in">
                   {filteredEpisodes.map((ep) => {
                     const isActive = ep.number === room?.episodeNumber;
                     return (
                       <button
                         key={ep.id}
                         type="button"
                         onClick={() => {
                           if (isEffectiveOwner) {
                             handleHostSwitchEpisode(ep.number);
                           } else {
                             addNotification({
                               category: 'Anime',
                               title: 'Broadcast Sync Locked',
                               subtitle: `Only @${room?.ownerName || 'the host'} can change episodes. High-quality watch synchronization is active.`,
                               animeId: room?.animeId || 20,
                               animeImage: animeDetail?.coverImage.large || room?.episodeThumbnail || ''
                             });
                           }
                         }}
                         className={`w-7.5 h-7.5 shrink-0 rounded-md flex items-center justify-center border font-mono font-bold text-[10.5px] transition-all outline-none cursor-pointer hover:scale-105 active:scale-95 ${
                           isActive
                             ? 'bg-red-650 border-red-550 text-white shadow-md shadow-red-650/30'
                             : 'bg-[#08080a] border-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-900 hover:border-zinc-800'
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
          )}
        </div>

        {/* Right Live Room Chat Sidebar */}
        <div className="bg-[#050507] border border-red-900/15 rounded-2xl p-4 flex flex-col h-[485px] shadow-xl relative md:sticky md:top-4">
          
          {/* Sidebar Tab Selector */}
          <div className="flex border-b border-zinc-900 pb-2 mb-3.5 gap-4 select-none font-mono">
            <button
              onClick={() => setSidebarTab('chat')}
              className={`pb-1 text-[10.5px] font-black uppercase tracking-wider transition-all relative cursor-pointer flex items-center gap-1 ${
                sidebarTab === 'chat' ? 'text-red-500 border-b-2 border-red-500 font-extrabold' : 'text-zinc-500 hover:text-zinc-400'
              }`}
            >
              Chat ({messages.length})
            </button>
            <button
              onClick={() => setSidebarTab('members')}
              className={`pb-1 text-[10.5px] font-black uppercase tracking-wider transition-all relative cursor-pointer flex items-center gap-1 ${
                sidebarTab === 'members' ? 'text-red-500 border-b-2 border-red-500 font-extrabold' : 'text-zinc-500 hover:text-zinc-400'
              }`}
            >
              Members ({(room?.members || []).length})
            </button>
          </div>

          {/* Dynamic tabs content */}
          {sidebarTab === 'chat' ? (
            <>
              {/* Messages stack */}
              <div ref={chatContainerRef} className="flex-1 overflow-y-auto pr-1 flex flex-col gap-3 custom-scrollbar">
                {messages.length === 0 ? (
                  <div className="text-center py-16 flex flex-col items-center justify-center gap-1.5">
                    <Users className="w-6 h-6 text-zinc-650" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#ef4444] font-mono">Room is Silent</span>
                    <p className="text-zinc-550 text-[10px] max-w-[180px] leading-relaxed mx-auto italic">
                      Say hello. Launch the live watch discussion below!
                    </p>
                  </div>
                ) : (
                  messages.map((m) => {
                    const parsedParts: React.ReactNode[] = [];
                    const pingRegex = /@(\w+)/g;
                    let lastPIndex = 0;
                    let pMatch;
                    let subKeyIdx = 0;
                    while ((pMatch = pingRegex.exec(m.text)) !== null) {
                      const username = pMatch[1];
                      if (pMatch.index > lastPIndex) {
                        parsedParts.push(m.text.substring(lastPIndex, pMatch.index));
                      }
                      parsedParts.push(
                        <span
                          key={`roomchan-msg-${m.id}-ping-${subKeyIdx++}`}
                          className="text-[#ef4444] font-extrabold hover:underline cursor-pointer transition-colors"
                          onClick={() => setSelectedProfileUsername(username)}
                        >
                          @{username}
                        </span>
                      );
                      lastPIndex = pingRegex.lastIndex;
                    }
                    if (lastPIndex < m.text.length) {
                      parsedParts.push(m.text.substring(lastPIndex));
                    }

                    return (
                      <div key={m.id} className="flex items-start gap-2 animate-fade-in group pb-1">
                        <img
                          src={m.avatar}
                          alt=""
                          className="w-6.5 h-6.5 rounded-md object-cover bg-zinc-900 border border-zinc-800 shrink-0 mt-0.5 cursor-pointer hover:border-red-500 transition-all active:scale-95"
                          onClick={() => setSelectedProfileUsername(m.authorName)}
                          referrerPolicy="no-referrer"
                        />
                        <div className="min-w-0 flex-1 bg-zinc-950/40 p-2 rounded-xl border border-zinc-905/30">
                          <div className="flex items-baseline justify-between gap-1 select-none mb-1">
                            <span 
                              className="text-[10px] font-bold text-zinc-300 truncate font-mono cursor-pointer hover:text-red-400 transition-colors"
                              onClick={() => setSelectedProfileUsername(m.authorName)}
                            >
                              @{m.authorName}
                            </span>
                            <span className="text-[8.5px] text-zinc-650 font-mono">
                              {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-200 leading-normal font-sans break-words text-left">
                            {parsedParts.length > 0 ? parsedParts : m.text}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Live Chat input bar */}
              <form onSubmit={handleSendMessage} className="mt-3 relative flex items-center gap-1.5 border-t border-zinc-950/50 pt-3">
                {showMentionList && filteredUsers.length > 0 && (
                  <div className="absolute bottom-full left-0 right-0 mb-2 bg-[#0d0d12] border border-zinc-900 rounded-xl shadow-2xl p-1.5 max-h-40 overflow-y-auto z-50 flex flex-col gap-0.5 custom-scrollbar">
                    {filteredUsers.map((u) => (
                      <button
                        key={u.username}
                        type="button"
                        onClick={() => handleSelectMention(u.username)}
                        className="w-full flex items-center gap-2.5 px-2.5 py-1.5 hover:bg-zinc-900/85 rounded-lg text-left text-xs font-mono transition-colors text-zinc-300 hover:text-white cursor-pointer"
                      >
                        <img src={u.avatar} alt="" className="w-5 h-5 rounded-md object-cover bg-zinc-900 border border-zinc-850" referrerPolicy="no-referrer" />
                        <span className="font-bold">@{u.username}</span>
                      </button>
                    ))}
                  </div>
                )}
                <input
                  ref={inputRef}
                  type="text"
                  max={250}
                  placeholder="Type message..."
                  value={chatInput}
                  onChange={(e) => handleTextChange(e.target.value)}
                  className="w-full bg-[#0d0d12] border border-zinc-900 focus:border-red-650 rounded-xl py-2 px-3 pr-9 text-xs text-zinc-350 outline-none placeholder-zinc-650 font-medium"
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim() || isSendingMessage}
                  className="absolute right-1.5 p-1.5 rounded-lg bg-red-600 disabled:bg-transparent text-white disabled:text-zinc-700 hover:bg-red-700 transition-colors cursor-pointer select-none"
                  title="Post Comment"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2.5 custom-scrollbar">
              {(room?.members || []).length === 0 ? (
                <div className="text-center py-16 flex flex-col items-center justify-center gap-1">
                  <Users className="w-5 h-5 text-zinc-750 font-mono" />
                  <span className="text-[9.5px] font-bold text-zinc-500 uppercase tracking-widest leading-none">No active listeners</span>
                </div>
              ) : (
                (room?.members || []).map((m) => {
                  const isUserHostObj = m.username === room?.ownerName;
                  return (
                    <div
                      key={m.username}
                      className="p-2.5 bg-zinc-950/40 rounded-xl border border-zinc-900 hover:border-zinc-850 transition-all flex items-center justify-between gap-3 group animate-fade-in"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <img
                          src={m.avatar || "https://api.dicebear.com/7.x/pixel-art/svg?seed=" + m.username}
                          alt=""
                          className="w-7 h-7 rounded-md object-cover bg-zinc-900 border border-zinc-850 shrink-0 cursor-pointer hover:border-red-500 transition-all active:scale-95"
                          onClick={() => setSelectedProfileUsername(m.username)}
                          referrerPolicy="no-referrer"
                        />
                        <div className="min-w-0">
                          <span 
                            className="text-[11px] font-bold text-zinc-200 block truncate font-mono cursor-pointer hover:text-red-450 transition-colors"
                            onClick={() => setSelectedProfileUsername(m.username)}
                          >
                            @{m.username}
                          </span>
                          <span className="text-[8px] text-zinc-550 font-mono uppercase tracking-wider leading-none block mt-0.5">
                            {isUserHostObj ? '👑 Host' : '🔊 Listener'}
                          </span>
                        </div>
                      </div>

                      {/* Action buttons (Only if current client is owner AND the targeted member is NOT the host themselves!) */}
                      {isEffectiveOwner && !isUserHostObj && (
                        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity shrink-0">
                          <button
                            onClick={() => handleKickUser(m.username)}
                            className="px-2 py-1 bg-zinc-900 hover:bg-amber-950/30 text-zinc-400 hover:text-amber-500 text-[8.5px] font-black uppercase font-mono tracking-wider rounded-md border border-zinc-800 hover:border-amber-900/40 transition-colors cursor-pointer"
                            title={`Kick @${m.username}`}
                          >
                            Kick
                          </button>
                          <button
                            onClick={() => handleBanUser(m.username)}
                            className="px-2 py-1 bg-zinc-950 hover:bg-red-950/40 text-[#ef4444] hover:text-red-500 text-[8.5px] font-black uppercase font-mono tracking-wider rounded-md border border-zinc-900 hover:border-red-900/50 transition-colors cursor-pointer"
                            title={`Ban @${m.username}`}
                          >
                            Ban
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>

      {/* Dynamic Profile Inspection Modal */}
      {selectedProfileUsername && (
        <UserProfileModal
          isOpen={!!selectedProfileUsername}
          username={selectedProfileUsername}
          onClose={() => setSelectedProfileUsername('')}
        />
      )}
    </div>
  );
}
