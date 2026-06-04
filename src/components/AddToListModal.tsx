import React, { useState, useEffect } from 'react';
import { X, CheckCircle, Tag, Sparkles } from 'lucide-react';
import { getMyList, saveMyList, MyListItem, addNotification } from '../services/store';

interface AddToListModalProps {
  isOpen: boolean;
  onClose: () => void;
  animeId: number;
  animeTitle: string;
  animeCover: string;
  onSuccess?: () => void;
}

export default function AddToListModal({ isOpen, onClose, animeId, animeTitle, animeCover, onSuccess }: AddToListModalProps) {
  const [currentStatus, setCurrentStatus] = useState<'Watching' | 'Onhold' | 'Completed' | 'Dropped' | null>(null);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setSuccessMsg('');
    const list = getMyList();
    const existing = list.find((item) => item.animeId === animeId);
    if (existing) {
      setCurrentStatus(existing.status);
    } else {
      setCurrentStatus(null);
    }
  }, [isOpen, animeId]);

  if (!isOpen) return null;

  const handleSelectStatus = (status: 'Watching' | 'Onhold' | 'Completed' | 'Dropped') => {
    const list = getMyList();
    const filtered = list.filter((item) => item.animeId !== animeId);
    
    const updated: MyListItem = {
      animeId,
      animeTitle,
      animeCover,
      status,
      addedAt: new Date().toISOString()
    };

    saveMyList([...filtered, updated]);
    setCurrentStatus(status);
    setSuccessMsg(`Successfully added to ${status}!`);

    // Dispatch real-time alert log entry
    addNotification({
      category: 'Anime',
      userName: 'System Tracker',
      userProfile: animeCover || 'https://api.dicebear.com/7.x/pixel-art/svg?seed=system',
      title: `Added "${animeTitle}" to ${status} watchlist`,
      subtitle: `Your personal streaming library database has synchronized.`,
      animeId: animeId,
      episodeNumber: 1
    });

    setTimeout(() => {
      if (onSuccess) onSuccess();
      onClose();
    }, 1000);
  };

  const handleRemove = () => {
    const list = getMyList();
    const filtered = list.filter((item) => item.animeId !== animeId);
    saveMyList(filtered);
    setCurrentStatus(null);
    setSuccessMsg('Successfully removed from list!');

    // Dispatch real purge alert
    addNotification({
      category: 'Anime',
      userName: 'System Tracker',
      userProfile: animeCover || 'https://api.dicebear.com/7.x/pixel-art/svg?seed=system',
      title: `Purged "${animeTitle}" from watchlist`,
      subtitle: `Watch tracker logs completely cleared from profile deck.`,
      animeId: animeId
    });

    setTimeout(() => {
      if (onSuccess) onSuccess();
      onClose();
    }, 1000);
  };

  const statuses = [
    { value: 'Watching' as const, label: 'Watching Now', desc: 'Direct streams tracked in your card', color: 'bg-red-650/10 text-red-400 border-red-500/20 hover:border-red-500/50' },
    { value: 'Onhold' as const, label: 'On Hold', desc: 'Pause and watch when you return', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:border-amber-500/50' },
    { value: 'Completed' as const, label: 'Completed', desc: 'Finished and scored with reviews', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:border-emerald-500/50' },
    { value: 'Dropped' as const, label: 'Dropped', desc: 'Muted from notifications and tracker', color: 'bg-zinc-850 text-zinc-400 border-zinc-800/80 hover:border-zinc-700' }
  ];

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-fade-in select-none">
      <div className="bg-[#08080a] border border-red-950/80 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl relative flex flex-col">
        
        {/* Top visual detail */}
        <div className="h-1 w-full bg-gradient-to-r from-red-650 to-red-500" />
        
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-500 hover:text-white cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-6 pb-2 text-center">
          <div className="inline-flex p-2 rounded-lg bg-red-950/20 border border-red-900/40 text-[#ef4444] mb-3">
            <Tag className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-black text-white uppercase tracking-widest font-mono">
            Track Stream Status
          </h3>
          <p className="text-xs text-zinc-500 mt-1 line-clamp-1 leading-relaxed block max-w-xs mx-auto">
            {animeTitle}
          </p>
        </div>

        <div className="p-6 pt-2 flex flex-col gap-3">
          {successMsg && (
            <div className="p-3 bg-emerald-950/10 border border-emerald-950/35 text-emerald-400 text-xs flex items-center gap-2 rounded-xl">
              <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <div className="flex flex-col gap-2">
            {statuses.map((status) => {
              const isActive = currentStatus === status.value;
              return (
                <button
                  key={status.value}
                  onClick={() => handleSelectStatus(status.value)}
                  className={`w-full p-3 rounded-xl border text-left cursor-pointer transition-all flex items-center justify-between group ${
                    isActive 
                      ? 'bg-red-600 border-red-500 text-white shadow-md' 
                      : status.color
                  }`}
                >
                  <div className="flex flex-col">
                    <span className="text-xs font-bold uppercase tracking-wider font-mono select-none">
                      {status.label}
                    </span>
                    <span className={`text-[10px] ${isActive ? 'text-red-100' : 'text-zinc-500'}`}>
                      {status.desc}
                    </span>
                  </div>
                  {isActive && <CheckCircle className="w-4 h-4 text-white fill-red-650" />}
                </button>
              );
            })}
          </div>

          {currentStatus && (
            <button
               onClick={handleRemove}
               className="w-full mt-2 py-2 border border-zinc-900 bg-red-950/10 hover:bg-red-950/30 text-red-500 text-[10px] font-bold uppercase tracking-widest font-mono rounded-xl cursor-pointer hover:border-red-950"
            >
              Remove from list
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
