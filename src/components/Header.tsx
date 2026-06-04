import React, { useState, useEffect } from 'react';
import { Search, Bell, User, MessageCircle, X, Sparkles, BookOpen, Clock, Heart } from 'lucide-react';
import { 
  UserProfile, 
  getStoredUser, 
  getNotifications, 
  AppNotification, 
  saveNotifications, 
  ANIME_AVATARS 
} from '../services/store';

interface HeaderProps {
  onSearchClick: () => void;
  onNavigateHome: () => void;
  onNavigateProfile: () => void;
  onSelectAnime: (id: number) => void;
  onSelectAnimeWatch?: (id: number) => void;
  onNavigateCommunity: () => void;
  currentUser: UserProfile | null;
  onSetUser: (user: UserProfile | null) => void;
  onOpenAuth: () => void;
}

export default function Header({ 
  onSearchClick, 
  onNavigateHome, 
  onNavigateProfile, 
  onSelectAnime, 
  onSelectAnimeWatch,
  onNavigateCommunity,
  currentUser,
  onSetUser,
  onOpenAuth
}: HeaderProps) {
  
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [notifTab, setNotifTab] = useState<'Comments' | 'Community' | 'Anime'>('Comments');
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [hasNewNotifications, setHasNewNotifications] = useState(true);

  useEffect(() => {
    const list = getNotifications();
    setNotifications(list);
    setHasNewNotifications(list.some(n => !n.read));

    if (currentUser?.username) {
      const interval = setInterval(() => {
        getNotifications();
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [currentUser]);

  useEffect(() => {
    const handleNotifUpdate = () => {
      const list = getNotifications();
      setNotifications(list);
      setHasNewNotifications(list.some(n => !n.read));
    };
    window.addEventListener('anipr8v_notif_update', handleNotifUpdate);
    return () => {
      window.removeEventListener('anipr8v_notif_update', handleNotifUpdate);
    };
  }, []);

  const handleMarkAllRead = () => {
    const updated = notifications.map(n => ({ ...n, read: true }));
    saveNotifications(updated);
    setNotifications(updated);
    setHasNewNotifications(false);
  };

  const handleAvatarClick = () => {
    const active = getStoredUser();
    if (active) {
      onNavigateProfile();
    } else {
      onOpenAuth();
    }
  };

  const clearNewNotificationGlow = () => {
    // Keep unread state unless marked read
  };

  // Click on single notification card
  const handleNotifClick = (notif: AppNotification) => {
    setShowNotificationModal(false);
    
    // Mark individual notification as read
    const updated = notifications.map(n => n.id === notif.id ? { ...n, read: true } : n);
    saveNotifications(updated);
    setNotifications(updated);
    setHasNewNotifications(updated.some(n => !n.read));

    if (notif.category === 'Comments' && notif.animeId) {
      if (onSelectAnimeWatch) {
        onSelectAnimeWatch(notif.animeId);
      } else {
        onSelectAnime(notif.animeId);
      }
    } else if (notif.category === 'Community') {
      onNavigateCommunity();
    } else if (notif.category === 'Anime' && notif.animeId) {
      onSelectAnime(notif.animeId);
    }
  };

  // Categories filter
  const commentsNotifs = notifications.filter(n => n.category === 'Comments');
  const communityNotifs = notifications.filter(n => n.category === 'Community');
  const animeNotifs = notifications.filter(n => n.category === 'Anime');

  return (
    <header className="sticky top-0 bg-[#060608]/90 backdrop-blur-md border-b border-red-950/40 z-40 px-4 md:px-8 py-3.5 flex items-center justify-between select-none">
      
      {/* Brand logo */}
      <div 
        onClick={onNavigateHome}
        className="flex items-center gap-2 cursor-pointer group select-none"
      >
        <span className="text-xl font-black tracking-tight text-white group-hover:text-[#ef4444] transition-all duration-300">
          Ani<span className="text-red-500 text-glow">priv8</span>
        </span>
      </div>

      {/* Header Buttons area */}
      <div className="flex items-center gap-3">
        
        {/* Search Toggle icon */}
        <button
          onClick={onSearchClick}
          className="p-2 text-zinc-400 hover:text-[#ef4444] hover:bg-zinc-900/50 rounded-lg transition-all duration-200 cursor-pointer"
          title="Search Anime"
        >
          <Search className="w-5 h-5" />
        </button>

        {/* Dynamic dynamic alerts Bell */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotificationModal(prev => !prev);
              clearNewNotificationGlow();
            }}
            className="p-2 text-zinc-400 hover:text-[#ef4444] hover:bg-zinc-900/50 rounded-lg transition-all duration-200 cursor-pointer relative"
            title="Notification Alerts Hub"
          >
            <Bell className="w-5 h-5" />
            {hasNewNotifications && (
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-600 border border-black rounded-full animate-ping" />
            )}
          </button>

          {/* Responsive Notifications Dropdown & Dialog Portal */}
          {showNotificationModal && (
            <>
              {/* Invisible touch catcher background overlay on desktop */}
              <div 
                className="fixed inset-0 z-40 hidden md:block cursor-default" 
                onClick={() => setShowNotificationModal(false)}
              />

              {/* Blurred backdrop shadow on mobile screens */}
              <div 
                className="fixed inset-0 bg-black/80 z-40 md:hidden animate-fade-in" 
                onClick={() => setShowNotificationModal(false)}
              />

              {/* Main alert content body context-aware container (px-0 layout for full margins stretch) */}
              <div className="fixed md:absolute z-50 top-[18%] md:top-full left-1/2 md:left-auto md:right-0 -translate-x-1/2 md:translate-x-0 w-[92%] max-w-[290px] md:w-85 md:max-w-none bg-[#09090c] border border-zinc-900 rounded-2xl pt-4 md:pt-5 pb-1 px-0 shadow-2xl flex flex-col font-sans animate-fade-in md:mt-2.5 overflow-hidden">
                
                {/* Header title & Close action block */}
                <div className="flex items-center justify-between pb-3 border-b border-zinc-900/80 mb-3 select-none px-4 md:px-5 md:gap-4 shrink-0">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Bell className="w-4 h-4 text-red-500 shrink-0" />
                    <h3 className="text-[10px] md:text-xs font-black text-white uppercase tracking-widest font-mono truncate">Streaming Alerts</h3>
                  </div>
                  <button
                    onClick={() => setShowNotificationModal(false)}
                    className="text-zinc-500 hover:text-white p-0.5 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Hub tabs selector */}
                <div className="flex border-b border-zinc-900/60 pb-1.5 gap-2 mb-3 select-none px-4 md:px-5 shrink-0">
                  {(['Comments', 'Community', 'Anime'] as const).map((tab) => {
                    const isActive = notifTab === tab;
                    const count = tab === 'Comments' 
                      ? commentsNotifs.length 
                      : tab === 'Community' 
                      ? communityNotifs.length 
                      : animeNotifs.length;

                    return (
                      <button
                        key={tab}
                        onClick={() => setNotifTab(tab)}
                        className={`pb-1 text-[10px] font-bold uppercase tracking-wider font-mono transition-all relative cursor-pointer ${
                          isActive ? 'text-red-500 border-b border-red-500 font-extrabold' : 'text-zinc-500'
                        }`}
                      >
                        {tab} ({count})
                      </button>
                    );
                  })}
                </div>

                {/* Mark all read stretchy button modeled after premium buttons */}
                {notifications.some(n => !n.read) && (
                  <button
                    onClick={handleMarkAllRead}
                    className="mx-4 md:mx-5 w-[calc(100%-2rem)] md:w-[calc(100%-2.5rem)] bg-red-650 hover:bg-red-700 text-white font-mono text-[9px] font-black uppercase tracking-widest py-2 rounded-xl text-center transition-all cursor-pointer shadow-md flex items-center justify-center gap-1.5 outline-none select-none shrink-0 mb-3 block border-none active:scale-[0.98]"
                    title="Mark all notifications as read"
                  >
                    <Bell className="w-3 h-3 text-white" />
                    Mark all read
                  </button>
                )}

                {/* List scroll panels (stretching perfectly edge-to-edge) */}
                <div className="flex flex-col max-h-52 overflow-y-auto w-full custom-scrollbar">
                  {notifTab === 'Comments' && (
                    commentsNotifs.length === 0 ? (
                      <div className="text-center py-6 text-zinc-650 text-[10px] font-mono italic px-4 md:px-5">No replies recorded.</div>
                    ) : (
                      commentsNotifs.map((n) => {
                        const isFlickering = n.category === 'Comments' && !n.read;
                        return (
                          <div
                            key={n.id}
                            onClick={() => handleNotifClick(n)}
                            className={`px-4 md:px-5 py-3 border-b border-zinc-950/60 hover:bg-zinc-905 last:border-b-0 cursor-pointer transition-all flex items-start gap-2.5 group relative overflow-hidden shrink-0 ${
                              isFlickering
                                ? 'bg-rose-950/15 border-l-2 border-l-rose-500 animate-[pulse_1.5s_infinite]'
                                : 'bg-transparent hover:bg-zinc-900/30'
                            }`}
                          >
                            <img src={n.userProfile} alt="" className="w-6.5 h-6.5 rounded bg-zinc-950 shrink-0 object-cover" referrerPolicy="no-referrer" />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[11px] font-bold text-zinc-350 font-mono">@{n.userName}</span>
                                {isFlickering && (
                                  <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-ping shrink-0" />
                                )}
                                <span className="text-[8px] text-zinc-650 font-mono shrink-0 ml-auto">{n.time}</span>
                              </div>
                              <p className="text-[10px] text-zinc-455 mt-0.5 line-clamp-1 group-hover:text-white leading-snug">{n.title}</p>
                              {n.subtitle && (
                                <p className="text-[9.5px] italic text-[#ef4444] truncate mt-1 bg-red-950/15 p-1 rounded font-mono leading-none">{n.subtitle}</p>
                              )}
                            </div>
                            {n.animeImage && (
                              <div className="w-8 h-11 rounded overflow-hidden border border-zinc-800 shrink-0 self-center">
                                <img src={n.animeImage} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              </div>
                            )}
                          </div>
                        );
                      })
                    )
                  )}

                  {notifTab === 'Community' && (
                    communityNotifs.length === 0 ? (
                      <div className="text-center py-6 text-zinc-650 text-[10px] font-mono italic px-4 md:px-5">No forum replies.</div>
                    ) : (
                      communityNotifs.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => handleNotifClick(n)}
                          className="px-4 md:px-5 py-3 border-b border-zinc-950/60 hover:bg-zinc-900/30 bg-transparent last:border-b-0 cursor-pointer transition-all flex items-start gap-2.5 group shrink-0"
                        >
                          <img src={n.userProfile} alt="" className="w-6.5 h-6.5 bg-zinc-950 rounded shrink-0 object-cover" referrerPolicy="no-referrer" />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] font-bold text-zinc-350 font-mono">@{n.userName}</span>
                              <span className="text-[8px] text-zinc-600 font-mono shrink-0">{n.time}</span>
                            </div>
                            <p className="text-[10px] text-zinc-455 mt-0.5 line-clamp-1 group-hover:text-white leading-snug">{n.title}</p>
                            <p className="text-[9.5px] italic text-zinc-550 mt-1 truncate">{n.subtitle}</p>
                          </div>
                          {n.animeImage && (
                            <div className="w-8 h-11 rounded overflow-hidden border border-zinc-800 shrink-0 self-center">
                              <img src={n.animeImage} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            </div>
                          )}
                        </div>
                      ))
                    )
                  )}

                  {notifTab === 'Anime' && (
                    animeNotifs.length === 0 ? (
                      <div className="text-center py-6 text-zinc-650 text-[10px] font-mono italic px-4 md:px-5">No watchlist updates.</div>
                    ) : (
                      animeNotifs.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => handleNotifClick(n)}
                          className="px-4 md:px-5 py-3 border-b border-zinc-950/60 hover:bg-zinc-900/30 bg-transparent last:border-b-0 cursor-pointer transition-all flex items-center gap-2.5 shrink-0"
                        >
                          <div className="w-8 h-11 bg-zinc-900 rounded overflow-hidden shrink-0 border border-zinc-950">
                            <img 
                              src={n.userProfile}
                              alt="" 
                              className="w-full h-full object-cover opacity-75" 
                              referrerPolicy="no-referrer"
                            />
                          </div>
                          
                          <div className="min-w-0 flex-1">
                            <span className="text-[7.5px] font-black uppercase text-red-500 font-mono leading-none tracking-widest block">Release Alert</span>
                            <h4 className="text-[11px] font-extrabold text-white font-mono truncate mt-0.5">{n.title}</h4>
                            <span className="text-[9.5px] text-zinc-500 block truncate font-medium">{n.subtitle}</span>
                          </div>
                        </div>
                      ))
                    )
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Upper Bar blank profile button - Clicking logged in takes user to Profile page, clicked logged out sparks Login modal */}
        <button
          onClick={handleAvatarClick}
          className={`w-8.5 h-8.5 rounded-full border border-zinc-900 hover:border-red-650 flex items-center justify-center overflow-hidden transition-all duration-300 relative group active:scale-95 cursor-pointer ${
            currentUser ? 'bg-zinc-950' : 'bg-zinc-90 w-8 h-8'
          }`}
          title={currentUser ? `Profile settings for @${currentUser.username}` : "Otaku Identity Registration"}
        >
          {currentUser ? (
            <img 
              src={currentUser.avatar} 
              alt={currentUser.username} 
              className="w-full h-full object-cover group-hover:scale-110 transition-transform"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-full h-full border border-[#ef4444]/15 bg-black flex items-center justify-center text-zinc-500 hover:text-white">
              <User className="w-4 h-4" />
            </div>
          )}
        </button>
      </div>

    </header>
  );
}
