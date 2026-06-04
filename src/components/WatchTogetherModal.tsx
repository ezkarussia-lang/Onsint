import React, { useState, useEffect } from 'react';
import { Users, Globe, Lock, Plus, Play, ArrowRight, X, Loader2, Copy, Check } from 'lucide-react';
import { getStoredUser, ANIME_AVATARS } from '../services/store';
import { getApiUrl } from '../services/api';

interface WatchTogetherRoom {
  id: string;
  ownerName: string;
  animeId: number;
  animeTitle: string;
  episodeNumber: number;
  episodeThumbnail: string;
  isPublic: boolean;
}

interface WatchTogetherModalProps {
  isOpen: boolean;
  onClose: () => void;
  animeId: number;
  animeTitle: string;
  animeCover: string;
  onEnterRoom: (roomId: string, isOwner: boolean) => void;
}

export default function WatchTogetherModal({
  isOpen,
  onClose,
  animeId,
  animeTitle,
  animeCover,
  onEnterRoom
}: WatchTogetherModalProps) {
  const [rooms, setRooms] = useState<WatchTogetherRoom[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'join' | 'create'>('join');
  
  // Create Room states
  const [targetEpisode, setTargetEpisode] = useState<number>(1);
  const [isRoomPublic, setIsRoomPublic] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [privateEnterCode, setPrivateEnterCode] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const currentUser = getStoredUser();

  const fetchRooms = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(getApiUrl('/api/watch-together/rooms'));
      if (res.ok) {
        const data = await res.json();
        // Filter rooms matching this specific anime to match users' discussion context
        setRooms(data);
      }
    } catch (err) {
      console.error('Failed to load Watch Together rooms:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchRooms();
      setActiveTab('join');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = {
        ownerName: currentUser?.username || 'GuestOtaku',
        animeId: animeId,
        animeTitle: animeTitle,
        episodeNumber: targetEpisode,
        episodeThumbnail: animeCover,
        isPublic: isRoomPublic
      };

      const res = await fetch(getApiUrl('/api/watch-together/rooms'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const room = await res.json();
        localStorage.setItem(`wt_owner_${room.id}`, 'true');
        onEnterRoom(room.id, true);
        onClose();
      }
    } catch (err) {
      console.error('Failed to create room:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJoinRoom = (room: WatchTogetherRoom) => {
    const isOwnerLocally = localStorage.getItem(`wt_owner_${room.id}`) === 'true';
    onEnterRoom(room.id, isOwnerLocally || room.ownerName.toLowerCase() === (currentUser?.username || 'GuestOtaku').toLowerCase());
    onClose();
  };

  const handleJoinPrivateCode = () => {
    if (!privateEnterCode.trim()) return;
    const cleanId = privateEnterCode.trim().replace('#', '');
    onEnterRoom(cleanId, false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/85 flex items-center justify-center p-4 z-50 animate-fade-in font-sans">
      <div className="bg-[#09090c] border border-red-950/80 rounded-2xl w-full max-w-lg p-5 shadow-2.5xl relative flex flex-col max-h-[90vh]">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4.5 right-4.5 text-zinc-500 hover:text-white p-1 hover:bg-zinc-900 rounded-lg transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Title */}
        <div className="flex items-center gap-2 mb-4 select-none">
          <Users className="w-5 h-5 text-red-500" />
          <div>
            <h3 className="text-sm font-black text-white uppercase tracking-wider font-mono">Watch Together Hub</h3>
            <p className="text-[10px] text-zinc-500 font-mono font-bold uppercase truncate max-w-[280px]">
              {animeTitle}
            </p>
          </div>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex border-b border-zinc-900 pb-2 mb-4 gap-4 select-none">
          <button
            onClick={() => setActiveTab('join')}
            className={`pb-1 text-xs font-bold uppercase tracking-wider font-mono transition-all relative cursor-pointer ${
              activeTab === 'join' ? 'text-red-500 border-b-2 border-red-500 font-black' : 'text-zinc-500'
            }`}
          >
            Active Groups
          </button>
          <button
            onClick={() => setActiveTab('create')}
            className={`pb-1 text-xs font-bold uppercase tracking-wider font-mono transition-all relative cursor-pointer ${
              activeTab === 'create' ? 'text-red-500 border-b-2 border-red-500 font-black' : 'text-zinc-500'
            }`}
          >
            Create Watch Party
          </button>
        </div>

        {/* Content body based on tabs */}
        <div className="flex-grow overflow-y-auto pr-1">
          {activeTab === 'join' ? (
            <div className="flex flex-col gap-4">
              
              {/* Private Enter Code area */}
              <div className="p-3 bg-black/40 border border-zinc-900 rounded-xl flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <h4 className="text-[10.5px] font-bold text-zinc-400 font-mono uppercase tracking-widest leading-none mb-1">Have an Invite Room Code?</h4>
                  <input
                    type="text"
                    placeholder="E.g., room-4a1v9z"
                    value={privateEnterCode}
                    onChange={(e) => setPrivateEnterCode(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-900 focus:border-red-650 rounded-lg p-1.5 text-xs text-white outline-none font-mono"
                  />
                </div>
                <button
                  type="button"
                  disabled={!privateEnterCode.trim()}
                  onClick={handleJoinPrivateCode}
                  className="px-3.5 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-zinc-900 disabled:text-zinc-650 font-bold font-mono text-[10px] rounded-lg text-white uppercase tracking-wider transition-all cursor-pointer"
                >
                  Join Party
                </button>
              </div>

              {/* List Header */}
              <div className="flex items-center justify-between select-none">
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest font-mono">Ongoing Watch parties</span>
                <button
                  onClick={fetchRooms}
                  className="text-[9.5px] text-red-500 hover:text-red-400 font-extrabold uppercase font-mono tracking-wider cursor-pointer"
                >
                  Refresh
                </button>
              </div>

              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2 font-mono">
                  <Loader2 className="w-5 h-5 text-red-600 animate-spin" />
                  <span className="text-[9.5px] text-zinc-500 uppercase tracking-widest font-bold">Scanning current broadcasts...</span>
                </div>
              ) : rooms.filter(r => r.animeId === animeId && (r.isPublic || r.ownerName === currentUser?.username)).length === 0 ? (
                <div className="text-center py-10 bg-black/15 border border-dashed border-zinc-900 rounded-xl">
                  <p className="text-zinc-600 text-xs font-mono italic">No watch parties are active for this anime right now.</p>
                  <button
                    onClick={() => setActiveTab('create')}
                    className="mt-3.5 text-[10px] font-black text-red-500 hover:text-red-400 uppercase tracking-widest font-mono cursor-pointer"
                  >
                    🚀 Launch the First Room
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {rooms
                    .filter(r => r.animeId === animeId && (r.isPublic || r.ownerName === currentUser?.username))
                    .map((room) => (
                      <div
                        key={room.id}
                        className="p-3 bg-black/45 border border-zinc-900/90 hover:border-red-950/40 rounded-xl flex items-center gap-3 transition-colors group"
                      >
                        {/* Thumbnail */}
                        <div className="w-12 h-16 bg-zinc-950 rounded border border-zinc-900 overflow-hidden relative shrink-0">
                          <img
                            src={room.episodeThumbnail}
                            alt=""
                            className="w-full h-full object-cover opacity-80"
                            referrerPolicy="no-referrer"
                          />
                          <span className="absolute bottom-1 right-1 bg-black/85 px-1 py-0.2 rounded text-[7.5px] font-black text-red-500 font-mono leading-none">
                            EP {room.episodeNumber}
                          </span>
                        </div>

                        {/* Title descriptions */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 select-none">
                            <span className="text-[11px] font-black font-mono text-zinc-300">@{room.ownerName}'s Party</span>
                            {room.isPublic ? (
                              <Globe className="w-3 h-3 text-emerald-500" title="Public Watch Party" />
                            ) : (
                              <Lock className="w-3 h-3 text-amber-500" title="Private Watch Party" />
                            )}
                          </div>
                          
                          <h4 className="text-[11px] text-zinc-450 truncate font-medium mt-1">
                            {room.animeTitle}
                          </h4>
                          
                          <div className="flex items-center gap-1 select-none mt-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                            <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest leading-none font-bold">Live Stream Broadcast</span>
                          </div>
                        </div>

                        <button
                          onClick={() => handleJoinRoom(room)}
                          className="px-3.5 py-2 bg-red-600 group-hover:bg-red-700 text-white font-extrabold text-[10.5px] uppercase tracking-widest font-mono rounded-lg transition-all flex items-center gap-1 cursor-pointer active:scale-95 shadow-md shadow-red-950/20"
                        >
                          Join <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                </div>
              )}
            </div>
          ) : !currentUser ? (
            <div className="flex flex-col items-center justify-center p-6 py-10 text-center bg-black/30 border border-dashed border-red-950/30 rounded-2xl font-mono select-none my-4">
              <Lock className="w-8 h-8 text-red-500 mb-3 animate-pulse" />
              <h3 className="text-xs font-bold text-white uppercase tracking-widest">Account Required</h3>
              <p className="text-[10px] text-zinc-500 mt-2 leading-relaxed max-w-xs font-mono">
                Only registered members can host Watch Together rooms. Please register or sign in to start broadcasting!
              </p>
            </div>
          ) : (
            <form onSubmit={handleCreateRoom} className="flex flex-col gap-4">
              
              <div className="flex flex-col gap-1 select-none">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-wider font-mono">Visibility / access settings</label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsRoomPublic(true)}
                    className={`p-3 rounded-xl border flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      isRoomPublic 
                        ? 'bg-red-950/15 border-red-600 text-white font-black' 
                        : 'bg-zinc-950 border-zinc-900 text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    <Globe className={`w-4 h-4 ${isRoomPublic ? 'text-emerald-500' : ''}`} />
                    <div className="text-left font-mono text-[10.5px]">
                      <span className="block uppercase tracking-wider">Public</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsRoomPublic(false)}
                    className={`p-3 rounded-xl border flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      !isRoomPublic 
                        ? 'bg-red-950/15 border-red-600 text-white font-black' 
                        : 'bg-zinc-950 border-zinc-900 text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    <Lock className={`w-4 h-4 ${!isRoomPublic ? 'text-amber-500' : ''}`} />
                    <div className="text-left font-mono text-[10.5px]">
                      <span className="block uppercase tracking-wider">Private</span>
                    </div>
                  </button>
                </div>
                <p className="text-[9.5px] italic text-zinc-650 mt-1.5 font-mono leading-normal">
                  {isRoomPublic 
                    ? 'Anyone looking at this title can view and click to join your active Watch Party!' 
                    : 'Private watch parties require an exact Invite room code string to enter.'}
                </p>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 py-3 bg-red-650 hover:bg-red-700 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-red-950/50 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                <span>Launch Watch Party</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
