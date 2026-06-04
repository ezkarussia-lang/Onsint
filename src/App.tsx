import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import BottomNav, { TabType } from './components/BottomNav';
import Home from './pages/Home';
import Search from './pages/Search';
import Community from './pages/Community';
import Settings from './pages/Settings';
import Details from './pages/Details';
import Watch from './pages/Watch';
import WatchTogetherRoom from './pages/WatchTogetherRoom';
import TrendingAll from './components/TrendingAll';
import { X, Play, Bell } from 'lucide-react';

// New layout sub-views
import Profile from './pages/Profile';
import PublicProfile from './pages/PublicProfile';
import MyList from './pages/MyList';
import Manga from './pages/Manga';
import { getStoredUser, UserProfile, saveStoredUser, syncMyListWithDb, simulateNewEpisodeReleases } from './services/store';
import AuthModal from './components/AuthModal';
import { MusicProvider } from './services/MusicContext';
import PersistentPlayer from './components/PersistentPlayer';
import Music from './pages/Music';

import { upsertDbUserProfile } from './services/supabase';

type ViewState =
  | { type: 'tab'; tab: TabType }
  | { type: 'details'; animeId: number }
  | { type: 'watch'; animeId: number }
  | { type: 'watch-together'; roomId: string; isOwner: boolean }
  | { type: 'trending' }
  | { type: 'profile'; username?: string }
  | { type: 'music' };

function parsePathToView(pathname: string): ViewState {
  const cleanPath = pathname.toLowerCase().replace(/^\/|\/$/g, '');
  
  if (!cleanPath || cleanPath === 'home') {
    return { type: 'tab', tab: 'home' };
  }
  if (cleanPath === 'search') {
    return { type: 'tab', tab: 'search' };
  }
  if (cleanPath === 'manga') {
    return { type: 'tab', tab: 'manga' };
  }
  if (cleanPath === 'mylist') {
    return { type: 'tab', tab: 'mylist' };
  }
  if (cleanPath === 'community') {
    return { type: 'tab', tab: 'community' };
  }
  if (cleanPath === 'settings') {
    return { type: 'tab', tab: 'settings' };
  }
  if (cleanPath === 'profile') {
    return { type: 'profile' };
  }
  if (cleanPath.startsWith('profile/')) {
    const parts = cleanPath.split('/');
    if (parts.length > 1 && parts[1]) {
      return { type: 'profile', username: parts[1] };
    }
  }
  if (cleanPath === 'music') {
    return { type: 'music' };
  }
  if (cleanPath === 'trending') {
    return { type: 'trending' };
  }
  
  if (cleanPath.startsWith('details/')) {
    const id = parseInt(cleanPath.replace('details/', ''), 10);
    if (!isNaN(id)) {
      return { type: 'details', animeId: id };
    }
  }
  if (cleanPath.startsWith('watch/')) {
    const id = parseInt(cleanPath.replace('watch/', ''), 10);
    if (!isNaN(id)) {
      return { type: 'watch', animeId: id };
    }
  }
  if (cleanPath.startsWith('watch-together/')) {
    const roomId = cleanPath.replace('watch-together/', '');
    if (roomId) {
      return { type: 'watch-together', roomId, isOwner: false };
    }
  }
  
  return { type: 'tab', tab: 'home' };
}

function viewToPath(view: ViewState): string {
  switch (view.type) {
    case 'tab':
      return view.tab === 'home' ? '/' : `/${view.tab}`;
    case 'profile':
      return view.username ? `/profile/${view.username}` : '/profile';
    case 'music':
      return '/music';
    case 'trending':
      return '/trending';
    case 'details':
      return `/details/${view.animeId}`;
    case 'watch':
      return `/watch/${view.animeId}`;
    case 'watch-together':
      return `/watch-together/${view.roomId}`;
    default:
      return '/';
  }
}

function AppContent() {
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    const parsed = parsePathToView(window.location.pathname);
    return parsed.type === 'tab' ? parsed.tab : 'home';
  });
  const [currentView, setCurrentView] = useState<ViewState>(() => parsePathToView(window.location.pathname));
  const [history, setHistory] = useState<ViewState[]>([]);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [mangaRouteId, setMangaRouteId] = useState<number | null>(null);
  const [toastNotif, setToastNotif] = useState<any | null>(null);

  // Sync state with popstate (browser back/forward navigation)
  useEffect(() => {
    const handlePopState = () => {
      const parsed = parsePathToView(window.location.pathname);
      setCurrentView(parsed);
      if (parsed.type === 'tab') {
        setActiveTab(parsed.tab);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // Update browser URL query/path dynamically when currentView changes
  useEffect(() => {
    const targetPath = viewToPath(currentView);
    if (window.location.pathname !== targetPath) {
      window.history.pushState(null, '', targetPath);
    }
  }, [currentView]);

  useEffect(() => {
    // Read session on startup
    const user = getStoredUser();
    setCurrentUser(user);
    if (user) {
      syncMyListWithDb();
    }
  }, []);

  // Periodic automatic new episode checker and custom toast triggers
  useEffect(() => {
    // 3 seconds startup buffer
    const startupTimer = setTimeout(() => {
      simulateNewEpisodeReleases();
    }, 3000);

    // Dynamic checks every 20 seconds
    const intervalChecker = setInterval(() => {
      simulateNewEpisodeReleases();
    }, 20000);

    // List updater instantly triggers check
    const handleListUpdate = () => {
      simulateNewEpisodeReleases();
    };
    window.addEventListener('anipr8v_list_update', handleListUpdate);

    return () => {
      clearTimeout(startupTimer);
      clearInterval(intervalChecker);
      window.removeEventListener('anipr8v_list_update', handleListUpdate);
    };
  }, []);

  useEffect(() => {
    const handleNewToast = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        setToastNotif(customEvent.detail);
        
        // Auto-dismiss in 6 seconds
        const t = setTimeout(() => {
          setToastNotif(null);
        }, 6000);
        return () => clearTimeout(t);
      }
    };
    window.addEventListener('anipr8v_new_notif_toast', handleNewToast);

    const handleGlobalOpenAuth = () => {
      setShowAuthModal(true);
    };
    window.addEventListener('anipriv8_open_auth', handleGlobalOpenAuth);

    return () => {
      window.removeEventListener('anipr8v_new_notif_toast', handleNewToast);
      window.removeEventListener('anipriv8_open_auth', handleGlobalOpenAuth);
    };
  }, []);

  const handleSetUser = (user: UserProfile | null) => {
    setCurrentUser(user);
    saveStoredUser(user);
    if (user) {
      syncMyListWithDb();
    }
  };

  const handleAuthSuccess = (user: UserProfile) => {
    handleSetUser(user);
    // After logging in, go to profile overview
    navigateTo({ type: 'profile' });
  };

  const handleLogout = () => {
    const active = getStoredUser();
    if (active) {
      upsertDbUserProfile({ ...active, status: 'Invisible' }).catch(() => {});
    }
    setCurrentUser(null);
    saveStoredUser(null);
    handleChangeTab('home');
  };

  const handleSelectMangaOnPage = (mangaId: number) => {
    setMangaRouteId(mangaId);
    handleChangeTab('manga');
  };

  // Navigate to a new view while logging position into history
  const navigateTo = (view: ViewState) => {
    setHistory((prev) => [...prev, currentView]);
    setCurrentView(view);
    if (view.type === 'tab') {
      setActiveTab(view.tab);
    }
  };

  // Back one step in physical history stack
  const handleBack = () => {
    if (history.length === 0) {
      setCurrentView({ type: 'tab', tab: 'home' });
      setActiveTab('home');
      return;
    }
    const previous = history[history.length - 1];
    setHistory((prev) => prev.slice(0, -1));
    setCurrentView(previous);
    if (previous.type === 'tab') {
      setActiveTab(previous.tab);
    }
  };

  const handleChangeTab = (tab: TabType) => {
    if (tab !== 'manga') {
      setMangaRouteId(null);
    }
    setActiveTab(tab);
    setHistory([]);
    setCurrentView({ type: 'tab', tab });
  };

  // Core render page selectors
  const renderContent = () => {
    switch (currentView.type) {
      case 'profile': {
        const queryUser = currentView.username;
        if (queryUser && (!currentUser || currentUser.username.toLowerCase() !== queryUser.toLowerCase())) {
          return (
            <PublicProfile
              username={queryUser}
              onBack={handleBack}
              onSelectAnime={(id) => navigateTo({ type: 'details', animeId: id })}
              onSelectManga={handleSelectMangaOnPage}
            />
          );
        }
        return <Profile onBack={handleBack} onLogout={handleLogout} />;
      }
      case 'tab':
        switch (currentView.tab) {
          case 'home':
            return (
              <Home
                onSelectAnime={(id) => navigateTo({ type: 'details', animeId: id })}
                onWatchAnime={(id) => navigateTo({ type: 'watch', animeId: id })}
                onViewAllTrending={() => navigateTo({ type: 'trending' })}
                onSelectManga={handleSelectMangaOnPage}
                onNavigateMusic={() => navigateTo({ type: 'music' })}
              />
            );
          case 'search':
            return <Search onSelectAnime={(id) => navigateTo({ type: 'details', animeId: id })} />;
          case 'manga':
            return (
              <Manga
                onBackToHome={() => handleChangeTab('home')}
                initialMangaId={mangaRouteId}
              />
            );
          case 'mylist':
            return (
              <MyList 
                onSelectAnime={(id) => navigateTo({ type: 'details', animeId: id })} 
                onSelectManga={handleSelectMangaOnPage}
              />
            );
          case 'community':
            return <Community />;
          case 'settings':
            return <Settings />;
        }
        break;
      case 'details':
        return (
          <Details
            animeId={currentView.animeId}
            onBack={handleBack}
            onWatch={(id) => navigateTo({ type: 'watch', animeId: id })}
            onSelectAnime={(id) => navigateTo({ type: 'details', animeId: id })}
            onWatchTogether={(roomId, isOwner) => navigateTo({ type: 'watch-together', roomId, isOwner })}
          />
        );
      case 'watch':
        return (
          <Watch
            animeId={currentView.animeId}
            onBack={handleBack}
            onSelectAnime={(id) => navigateTo({ type: 'details', animeId: id })}
          />
        );
      case 'watch-together':
        return (
          <WatchTogetherRoom
            roomId={currentView.roomId}
            isOwner={currentView.isOwner}
            onBack={handleBack}
          />
        );
      case 'trending':
        return (
          <TrendingAll
            onBack={handleBack}
            onSelectAnime={(id) => navigateTo({ type: 'details', animeId: id })}
          />
        );
      case 'music':
        return (
          <Music
            onBack={handleBack}
          />
        );
    }
  };

  return (
    <div className="min-h-screen max-w-full overflow-x-hidden bg-[#040405] text-[#f4f4f5] flex flex-col font-sans md:pl-20 lg:pl-20">
      
      {/* Top sticky brand bar header */}
      <Header
        onSearchClick={() => handleChangeTab('search')}
        onNavigateHome={() => handleChangeTab('home')}
        onNavigateProfile={() => navigateTo({ type: 'profile' })}
        onSelectAnime={(id) => navigateTo({ type: 'details', animeId: id })}
        onSelectAnimeWatch={(id) => navigateTo({ type: 'watch', animeId: id })}
        onNavigateCommunity={() => handleChangeTab('community')}
        currentUser={currentUser}
        onSetUser={handleSetUser}
        onOpenAuth={() => setShowAuthModal(true)}
      />

      {/* Main core pages render panel */}
      <main className="flex-grow pt-6">
        {renderContent()}
      </main>

      {/* Primary footer displayed below every page */}
      <Footer />

      {/* Permanent bottom floating nav bar tabs */}
      <BottomNav 
        activeTab={activeTab} 
        onChangeTab={handleChangeTab} 
        currentUser={currentUser}
        onNavigateProfile={() => navigateTo({ type: 'profile' })}
        onOpenAuth={() => setShowAuthModal(true)}
      />

      {/* Auth credentials signin modal at viewport root level */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={handleAuthSuccess}
      />

      {/* Real-time Anime Broadcast Toast notifications popup */}
      {toastNotif && (
        <div className="fixed bottom-20 md:bottom-6 right-4 left-4 md:left-auto md:w-96 bg-[#09090c]/95 border border-red-500/30 rounded-2xl p-4 shadow-2xl shadow-[#ef4444]/15 flex items-start gap-3 z-50 animate-fade-in backdrop-blur-md">
          {toastNotif.animeImage ? (
            <img 
              src={toastNotif.animeImage} 
              alt="Cover" 
              className="w-12 h-18 object-cover rounded-lg border border-zinc-800 shrink-0" 
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-12 h-18 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0">
              <Bell className="w-5 h-5 text-red-500" />
            </div>
          )}
          <div className="flex-grow min-w-0 flex flex-col text-left">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black text-red-500 uppercase tracking-widest font-mono">
                {toastNotif.category === 'Anime' ? 'ANIME RELEASE' : 'ALERT BROADCAST'}
              </span>
              <button 
                onClick={() => setToastNotif(null)}
                className="text-zinc-500 hover:text-white p-1 hover:bg-zinc-900 rounded transition-all duration-150 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <h4 className="text-xs font-black text-white leading-snug mt-1 truncate">
              {toastNotif.title}
            </h4>
            <p className="text-[11px] text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
              {toastNotif.subtitle}
            </p>
            {toastNotif.animeId && (
              <button
                onClick={() => {
                  navigateTo({ type: 'details', animeId: toastNotif.animeId });
                  setToastNotif(null);
                }}
                className="mt-2.5 flex items-center justify-center gap-1.5 w-full py-1.5 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-extrabold text-[10px] uppercase tracking-widest rounded-lg transition-all duration-200 cursor-pointer shadow-lg shadow-red-600/10"
              >
                <Play className="w-3 h-3 fill-white ml-0.5" /> Watch Episode
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <MusicProvider>
      <AppContent />
      <PersistentPlayer />
    </MusicProvider>
  );
}
