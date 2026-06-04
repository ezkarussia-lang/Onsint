/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { getMyList, MyListItem, saveMyList } from '../services/store';
import { useMusic } from '../services/MusicContext';
import { 
  Play, 
  Trash2, 
  Calendar, 
  Star, 
  Clock, 
  AlertCircle, 
  BookOpen, 
  Sparkles, 
  MonitorPlay,
  Music
} from 'lucide-react';

interface MyListProps {
  onSelectAnime: (id: number) => void;
  onSelectManga: (id: number) => void;
}

export default function MyList({ onSelectAnime, onSelectManga }: MyListProps) {
  const [list, setList] = useState<MyListItem[]>([]);
  const [contentType, setContentType] = useState<'anime' | 'manga' | 'music'>('anime');
  const [activeTab, setActiveTab] = useState<string>('All');

  // Music hooks
  const { favouritedSongs, playTrack, toggleFavourite, isPlaying, activeTrack } = useMusic();

  useEffect(() => {
    setList(getMyList());
  }, []);

  // Update on music favorites events
  useEffect(() => {
    const handleUpdate = () => {
      // Force trigger state sync if required
    };
    window.addEventListener('anipr8v_fave_songs_update', handleUpdate);
    return () => {
      window.removeEventListener('anipr8v_fave_songs_update', handleUpdate);
    };
  }, []);

  const handleRemove = (animeId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = list.filter((item) => !(item.animeId === animeId && (item.type || 'anime') === contentType));
    setList(updated);
    saveMyList(updated);
  };

  // Determine items matching current section & status tab
  const sectionItems = list.filter(item => {
    const itemType = item.type || 'anime';
    return itemType === contentType;
  });

  const filteredItems = activeTab === 'All'
    ? sectionItems
    : sectionItems.filter(item => item.status.toLowerCase() === activeTab.toLowerCase());

  // Set tabs based on selection
  const tabs = contentType === 'music' ? [
    { id: 'All', label: 'All Songs', count: favouritedSongs.length }
  ] : contentType === 'anime' ? [
    { id: 'All', label: 'All Anime', count: sectionItems.length },
    { id: 'Watching', label: 'Watching', count: sectionItems.filter(i => i.status === 'Watching').length },
    { id: 'Plantowatch', label: 'Plan To Watch', count: sectionItems.filter(i => i.status === 'Plantowatch').length },
    { id: 'Onhold', label: 'On Hold', count: sectionItems.filter(i => i.status === 'Onhold').length },
    { id: 'Completed', label: 'Completed', count: sectionItems.filter(i => i.status === 'Completed').length },
    { id: 'Dropped', label: 'Dropped', count: sectionItems.filter(i => i.status === 'Dropped').length },
  ] : [
    { id: 'All', label: 'All Manga', count: sectionItems.length },
    { id: 'Reading', label: 'Reading', count: sectionItems.filter(i => i.status === 'Reading').length },
    { id: 'Plantoread', label: 'Plan To Read', count: sectionItems.filter(i => i.status === 'Plantoread').length },
    { id: 'Onhold', label: 'On Hold', count: sectionItems.filter(i => i.status === 'Onhold').length },
    { id: 'Completed', label: 'Completed', count: sectionItems.filter(i => i.status === 'Completed').length },
    { id: 'Dropped', label: 'Dropped', count: sectionItems.filter(i => i.status === 'Dropped').length },
  ];

  // Map database status string keys to stylized labels
  const getStatusLabel = (status: string) => {
    if (status === 'Plantowatch') return 'Plan to Watch';
    if (status === 'Plantoread') return 'Plan to Read';
    return status;
  };

  return (
    <div className="w-full flex flex-col gap-6 pb-16 animate-fade-in px-4 md:px-8 select-none">
      
      {/* Header index panel */}
      <div className="border-b border-zinc-900 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black uppercase text-glow flex items-center gap-2 text-left">
            <BookOpen className="w-5 h-5 text-red-500" /> My Library Index
          </h1>
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mt-0.5 animate-pulse text-left">
            Curate, organize, and monitor your personal favorite watchlists, shelves, & songs
          </p>
        </div>

        {/* Anime / Manga / Music Switcher */}
        <div className="flex flex-wrap bg-[#07070a] border border-zinc-900 rounded-xl p-1 select-none gap-1">
          <button
            onClick={() => {
              setContentType('anime');
              setActiveTab('All');
            }}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-black uppercase tracking-wider rounded-lg cursor-pointer transition-all ${
              contentType === 'anime'
                ? 'bg-red-650 text-white font-black shadow-md shadow-red-550/10'
                : 'text-zinc-500 hover:text-zinc-350'
            }`}
          >
            <MonitorPlay className="w-3.5 h-3.5" />
            <span>Anime Stations</span>
          </button>
          
          <button
            onClick={() => {
              setContentType('manga');
              setActiveTab('All');
            }}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-black uppercase tracking-wider rounded-lg cursor-pointer transition-all ${
              contentType === 'manga'
                ? 'bg-red-650 text-white font-black shadow-md shadow-red-550/10'
                : 'text-zinc-500 hover:text-zinc-355'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Manga Shelves</span>
          </button>

          <button
            onClick={() => {
              setContentType('music');
              setActiveTab('All');
            }}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-black uppercase tracking-wider rounded-lg cursor-pointer transition-all ${
              contentType === 'music'
                ? 'bg-red-650 text-white font-black shadow-md shadow-red-550/10'
                : 'text-zinc-500 hover:text-zinc-355'
            }`}
          >
            <Music className="w-3.5 h-3.5" />
            <span>My Music Playlist</span>
          </button>
        </div>
      </div>

      {/* Advanced Filter Nodes (Only render for Anime or Manga categories) */}
      {contentType !== 'music' && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-[10.5px] font-bold uppercase tracking-wider font-mono rounded-lg border transition-all cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-2 ${
                  isActive
                    ? 'bg-red-650 border-red-600 text-white shadow shadow-red-500/10 scale-102'
                    : 'bg-[#08080a] border-zinc-900 text-zinc-500 hover:text-zinc-300 hover:border-zinc-800'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[8.5px] px-1.5 py-0.2 rounded font-black ${
                  isActive ? 'bg-black/30 text-white' : 'bg-zinc-955 text-zinc-650'
                }`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Grid listing */}
      {contentType === 'music' ? (
        <div className="flex flex-col gap-3">
          {favouritedSongs.length === 0 ? (
            <div className="text-center py-20 border border-dashed border-zinc-900 rounded-2xl bg-[#08080a]/25 flex flex-col items-center justify-center p-6">
              <Music className="w-8 h-8 text-zinc-550 mb-3 animate-pulse" />
              <span className="text-zinc-400 font-bold tracking-widest text-xs uppercase block mb-1">
                No Favourited Songs Yet
              </span>
              <span className="text-[10px] text-zinc-500 max-w-xs block mx-auto leading-relaxed uppercase tracking-wider font-mono text-center">
                Explore anime opening & ending themes under the Music deck, hit the heart button, and build your specialized Otaku collection here!
              </span>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {favouritedSongs.map((track) => {
                const isPlay = activeTrack?.id === track.id && isPlaying;
                return (
                  <div
                    key={track.id}
                    onClick={() => playTrack(track, favouritedSongs)}
                    className={`flex items-center justify-between p-3.5 bg-[#08080a]/80 border rounded-2xl cursor-pointer hover:border-red-650/40 relative group transition-all text-left ${
                      isPlay ? 'border-red-650/40 bg-red-950/5' : 'border-zinc-900 hover:border-zinc-850'
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0 pr-10">
                      <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-zinc-900">
                        {track.coverImage ? (
                          <img src={track.coverImage} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-full h-full bg-zinc-900 flex items-center justify-center text-[8px] text-zinc-550 font-black uppercase font-mono">SONG</div>
                        )}
                        {isPlay && (
                          <div className="absolute inset-0 bg-red-950/60 flex items-center justify-center">
                            <span className="text-red-500 animate-pulse text-[8px] font-black uppercase font-mono">LIVE</span>
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-black text-white truncate uppercase tracking-tight">{track.title}</h4>
                        <p className="text-[10px] text-zinc-400 truncate mt-0.5 leading-tight">{track.artist || 'Unknown Artist'}</p>
                        <p className="text-[9px] text-red-550 font-black font-mono tracking-wider uppercase mt-1.5 leading-none">
                          {track.animeTitle} • {track.type}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavourite(track);
                        }}
                        className="p-2 rounded-xl bg-zinc-950/90 hover:bg-red-950/40 text-red-550 border border-zinc-900 hover:border-red-900/40 transition-colors cursor-pointer"
                        title="Remove favourite"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-zinc-900 rounded-2xl bg-[#08080a]/25 flex flex-col items-center justify-center p-6">
          <AlertCircle className="w-8 h-8 text-zinc-650 mb-3 animate-pulse" />
          <span className="text-zinc-400 font-bold tracking-widest text-xs uppercase block mb-1">
            Category Shelve Empty
          </span>
          <span className="text-[10px] text-zinc-500 max-w-xs block mx-auto leading-relaxed uppercase tracking-wider font-mono">
            {contentType === 'anime'
              ? 'Find anime titles under Search or Home, click status and add to collection!'
              : 'Explore manga series in the Manga tab and select status logs to build shelves!'
            }
          </span>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-5">
          {filteredItems.map((item) => (
            <div
              key={`${item.animeId}-${contentType}`}
              onClick={() => contentType === 'anime' ? onSelectAnime(item.animeId) : onSelectManga(item.animeId)}
              className="bg-[#0b0b0e] border border-zinc-900 hover:border-red-650/30 rounded-xl overflow-hidden cursor-pointer group transition-all duration-300 shadow-xl hover:-translate-y-1.5 flex flex-col h-full relative text-left"
            >
              
              {/* Cover Layout */}
              <div className="relative aspect-[3/4] overflow-hidden bg-zinc-950">
                {item.animeCover ? (
                  <img
                    src={item.animeCover}
                    alt={item.animeTitle}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full bg-zinc-900 flex items-center justify-center text-xs font-mono font-bold text-zinc-500">
                    EMPTY COVER
                  </div>
                )}

                {/* Cover status category sticker */}
                <span className={`absolute top-2 left-2 text-[7.5px] font-black uppercase tracking-widest px-2 py-0.5 rounded shadow-md ${
                  item.status === 'Completed'
                    ? 'bg-emerald-500 text-white'
                    : item.status === 'Watching' || item.status === 'Reading'
                    ? 'bg-red-650 text-white'
                    : item.status === 'Onhold'
                    ? 'bg-amber-500 text-neutral-950 font-extrabold'
                    : 'bg-zinc-800 text-zinc-400'
                }`}>
                  {getStatusLabel(item.status)}
                </span>

                {/* Remove button circle */}
                <button
                  onClick={(e) => handleRemove(item.animeId, e)}
                  className="absolute top-2 right-2 p-1.5 bg-black/80 hover:bg-red-600 rounded-full border border-zinc-805 text-zinc-400 hover:text-white transition-all cursor-pointer opacity-0 group-hover:opacity-100"
                  title="Remove item"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>

              {/* Title specs */}
              <div className="p-3 flex flex-col gap-1.5 flex-grow">
                <span className="text-[8px] font-bold text-zinc-500 font-mono uppercase tracking-widest leading-none">
                  Logged {new Date(item.addedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </span>
                <h3 className="text-xs font-bold text-zinc-100 group-hover:text-[#ef4444] transition-colors leading-snug line-clamp-2 uppercase">
                  {item.animeTitle}
                </h3>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
