import React from 'react';
import { X, ExternalLink, Activity, BookOpen, ShieldAlert, Heart, Music as MusicIcon } from 'lucide-react';
import { UserProfile, MyListItem, getStoredUser } from '../services/store';
import { fetchDbUserProfile, supabase, fetchFavouritedSongs } from '../services/supabase';

const PorscheIcon = () => (
  <svg className="w-5 h-3.5 inline-block align-middle mr-1.5 text-rose-500" viewBox="0 0 24 12" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
    <path d="M1 9C1.5 9 1.8 8.8 2.2 8.4C2.5 8 3.5 6 4.5 5.5C5.5 5 7.5 4.8 10 2.5C11 1.5 13 1 15.5 1.2C17.5 1.5 18 2.5 19 3.2C20 4 21.5 4.8 22.5 5.2C23 5.5 23.5 6 23.5 6.8C23.5 7.5 22.5 8 20.5 8.2C19.5 8.3 19 9 18.2 9C17.5 9 17 8.2 16 8.2C15 8.2 14.5 9 13.5 9H1" fill="currentColor" fillOpacity="0.15" />
    <path d="M1 9H5.5C5.8 8.2 6.5 7.5 7.5 7.5C8.5 7.5 9.2 8.2 9.5 9H14.5C14.8 8.2 15.5 7.5 16.5 7.5C17.5 7.5 18.2 8.2 18.5 9H23.5V8.5C23.5 7.5 22.8 7 22 6.8C21.2 6.5 19.5 5.5 18.8 4.8C18 4 17.5 2.5 15.5 2C13.5 1.5 11 2 10 3.2C7.5 5.5 5.5 5.8 4.5 6.2C3.5 6.5 2.5 8.2 2.2 8.5C1.8 8.8 1.5 9 1 9Z" fill="currentColor" fillOpacity="0.25" />
    <path d="M9.8 4.2C11 3.2 12.8 2.8 14.5 3.2C15.5 3.5 16 4.2 16.5 4.8" stroke="currentColor" strokeWidth="0.8" />
    <circle cx="7.5" cy="9" r="1.8" fill="#040405" stroke="currentColor" strokeWidth="0.8" />
    <circle cx="7.5" cy="9" r="0.6" fill="currentColor" />
    <circle cx="16.5" cy="9" r="1.8" fill="#040405" stroke="currentColor" strokeWidth="0.8" />
    <circle cx="16.5" cy="9" r="0.6" fill="currentColor" />
  </svg>
);

interface UserProfileModalProps {
  isOpen: boolean;
  username: string;
  onClose: () => void;
  customProfile?: UserProfile | null;
}

const MOCK_PROFILES_DATABASE: Record<string, { profile: UserProfile; list: MyListItem[]; hideList?: boolean }> = {
  'EliteShadow': {
    profile: {
      email: 'shadow@anipr8v.com',
      username: 'EliteShadow',
      avatar: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=Shadow',
      bio: 'Master of the shadows. Watching ongoing action releases weekly. Fan of dark synth aesthetics & Solo Leveling.',
      website: 'https://github.com/eliteshadow',
      status: 'Online',
      tag: 'Tsundere'
    },
    list: [
      { animeId: 16498, animeTitle: 'Solo Leveling', animeCover: 'https://img.daisyui.com/images/stock/photo-1507358900868-88b768a192aa.webp', status: 'Watching', addedAt: '2026-05-22' },
      { animeId: 101759, animeTitle: 'Chainsaw Man', animeCover: '', status: 'Completed', addedAt: '2026-04-10' },
      { animeId: 104314, animeTitle: 'Solo Leveling (Manga)', animeCover: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=Leveling', status: 'Reading', addedAt: '2026-05-22', type: 'manga' }
    ]
  },
  'AestheticVoid': {
    profile: {
      email: 'void@anipr8v.com',
      username: 'AestheticVoid',
      avatar: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=Void',
      bio: 'Lost in the beautiful voids of slice-of-life and sci-fi. Collecting premium light novels.',
      website: 'https://anipr8v.com/void',
      status: 'Idle',
      tag: 'Kuudere'
    },
    list: [
      { animeId: 170942, animeTitle: 'Frieren: Beyond Journey\'s End', animeCover: '', status: 'Completed', addedAt: '2026-05-01' },
      { animeId: 1535, animeTitle: 'Death Note', animeCover: '', status: 'Onhold', addedAt: '2026-03-12' },
      { animeId: 148821, animeTitle: 'Frieren (Manga)', animeCover: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=Frieren', status: 'Completed', addedAt: '2026-05-01', type: 'manga' }
    ]
  },
  'Anipriv8Admin': {
    profile: {
      email: 'admin@anipriv8.com',
      username: 'Anipriv8Admin',
      avatar: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=Admin',
      bio: 'Lead engineer of the Anipriv8 streaming pipeline. Report all bugs on the Discord forums!',
      website: 'https://anipriv8.com',
      status: 'Do Not Disturb',
      tag: 'Sirsilvex'
    },
    list: [
      { animeId: 21, animeTitle: 'One Piece', animeCover: '', status: 'Watching', addedAt: '2026-01-01' },
      { animeId: 30012, animeTitle: 'One Piece (Manga)', animeCover: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=Piece', status: 'Reading', addedAt: '2026-01-01', type: 'manga' }
    ]
  }
};

export default function UserProfileModal({ isOpen, username, onClose, customProfile }: UserProfileModalProps) {
  const [profile, setProfile] = React.useState<UserProfile | null>(null);
  const [list, setList] = React.useState<MyListItem[]>([]);
  const [favSongs, setFavSongs] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!isOpen || !username) return;

    setLoading(true);
    let active = true;

    const loadData = async () => {
      let foundProfile: UserProfile | null = null;
      let foundList: MyListItem[] = [];
      let foundSongs: any[] = [];

      const currentLogged = getStoredUser();
      const normalize = (s: string) => (s || '').toLowerCase().trim();

      if (customProfile && (normalize(customProfile.username) === normalize(username) || !username)) {
        foundProfile = {
          ...customProfile,
          hide_my_list: localStorage.getItem('anipr8v_hide_my_list') === 'true',
          hide_manga_list: localStorage.getItem('anipr8v_hide_manga_list') === 'true',
          hide_favourite_songs: localStorage.getItem('anipr8v_hide_favourite_songs') === 'true'
        } as any;
        const localListStr = localStorage.getItem('anipr8v_my_list');
        if (localListStr) {
          try { foundList = JSON.parse(localListStr); } catch {}
        }
        try {
          foundSongs = await fetchFavouritedSongs(username);
        } catch {}
      } else if (currentLogged && normalize(currentLogged.username) === normalize(username)) {
        foundProfile = {
          ...currentLogged,
          hide_my_list: localStorage.getItem('anipr8v_hide_my_list') === 'true',
          hide_manga_list: localStorage.getItem('anipr8v_hide_manga_list') === 'true',
          hide_favourite_songs: localStorage.getItem('anipr8v_hide_favourite_songs') === 'true'
        } as any;
        const localListStr = localStorage.getItem('anipr8v_my_list');
        if (localListStr) {
          try { foundList = JSON.parse(localListStr); } catch {}
        }
        try {
          foundSongs = await fetchFavouritedSongs(username);
        } catch {}
      } else {
        try {
          const dbUser = await fetchDbUserProfile(username);
          if (dbUser) {
            const isOnline = dbUser.status !== 'Invisible' && (Date.now() - (dbUser.lastActive || 0) < 90000);
            foundProfile = {
              email: dbUser.email,
              username: dbUser.username,
              avatar: dbUser.avatar,
              bio: dbUser.bio,
              website: dbUser.website,
              status: isOnline ? dbUser.status : 'Invisible',
              tag: dbUser.tag,
              banner: dbUser.banner,
              hide_my_list: dbUser.hide_my_list,
              hide_manga_list: dbUser.hide_manga_list,
              hide_favourite_songs: dbUser.hide_favourite_songs
            } as any;
          }

          const { data: dbItems } = await supabase
            .from('anime_lists')
            .select('*')
            .eq('username', username);

          if (dbItems && dbItems.length > 0) {
            foundList = dbItems.map((item: any) => ({
              animeId: item.anime_id,
              animeTitle: item.anime_title,
              animeCover: item.anime_cover,
              status: item.status,
              addedAt: item.added_at,
              type: item.type
            }));
          }

          foundSongs = await fetchFavouritedSongs(username);
        } catch (e) {}
      }

      if (!foundProfile) {
        const entry = MOCK_PROFILES_DATABASE[username];
        if (entry) {
          foundProfile = entry.profile;
          foundList = entry.list;
        } else {
          foundProfile = {
            email: `${username.toLowerCase()}@otakudeck.com`,
            username: username,
            avatar: `https://api.dicebear.com/7.x/pixel-art/svg?seed=${username}`,
            bio: `Seasoned Otaku and valued community thread contributor.`,
            website: '',
            status: 'Online',
            tag: 'Otaku'
          };
          foundList = [];
        }
      }

      if (active) {
        setProfile(foundProfile);
        setList(foundList);
        setFavSongs(foundSongs);
        setLoading(false);
      }
    };

    loadData();
    return () => {
      active = false;
    };
  }, [isOpen, username, customProfile]);

  if (!isOpen) return null;
  if (loading || !profile) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
        <div className="bg-[#121217] border border-zinc-800/80 rounded-2xl w-full max-w-sm p-8 text-center">
          <div className="w-10 h-10 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-xs text-zinc-400 font-mono uppercase tracking-wider">Syncing Profile details...</p>
        </div>
      </div>
    );
  }

  const resolvedProfile = profile;
  const resolvedList = list;
  const isHideList = !!(resolvedProfile as any).hide_my_list;
  const isHideMangaList = !!(resolvedProfile as any).hide_manga_list;
  const isHideFavouriteSongs = !!(resolvedProfile as any).hide_favourite_songs;

  const animeList = resolvedList.filter((item) => !item.type || item.type === 'anime');
  const mangaList = resolvedList.filter((item) => item.type === 'manga');

  const getStatusStyle = (status: UserProfile['status']) => {
    switch (status) {
      case 'Online':
        return { color: 'bg-emerald-500', text: 'Online' };
      case 'Idle':
        return { color: 'bg-amber-500', text: 'Idle' };
      case 'Do Not Disturb':
        return { color: 'bg-rose-500', text: 'Do Not Disturb' };
      case 'Invisible':
        return { color: 'bg-zinc-650', text: 'Offline' };
      default:
        return { color: 'bg-emerald-500', text: 'Online' };
    }
  };

  const statusMeta = getStatusStyle(resolvedProfile.status);

  const getTagStyle = (tag: UserProfile['tag']) => {
    switch (tag) {
      case 'Sirsilvex':
        return 'bg-white/10 text-white border-white/30 font-black scale-103 shadow-md shadow-white/5';
      case 'Kuudere':
        return 'bg-sky-500/10 text-sky-400 border-sky-500/20';
      case 'Tsundere':
        return 'bg-pink-500/10 text-pink-450 border-pink-500/20';
      case 'Otaku':
      default:
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
    }
  };

  const getTagBanner = (tag: UserProfile['tag']) => {
    switch (tag) {
      case 'Sirsilvex':
        return 'from-zinc-800 to-zinc-950';
      case 'Kuudere':
        return 'from-sky-950/40 to-sky-900/10';
      case 'Tsundere':
        return 'from-pink-950/40 to-pink-900/10';
      case 'Otaku':
      default:
        return 'from-purple-950/40 to-purple-900/10';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-fade-in select-none">
      <div className="bg-[#121217] border border-zinc-800/80 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl relative flex flex-col font-sans">
        
        {/* Discord top theme banner */}
        <div className="h-24 w-full relative overflow-hidden border-b border-zinc-900/10 mb-1">
          {resolvedProfile && resolvedProfile.banner ? (
            <img src={resolvedProfile.banner} alt="User Banner" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <div className={`w-full h-full bg-gradient-to-b ${getTagBanner(resolvedProfile.tag)}`} />
          )}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 bg-black/40 hover:bg-black/60 text-zinc-400 hover:text-white rounded-full transition-colors cursor-pointer z-10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* User profile layout container - Split into static header and scrollable body to prevent pfp from being cut off */}
        <div className="px-5 relative shrink-0 z-20">
          {/* Avatar frame overflowing the banner */}
          <div className="absolute -top-12 left-5 w-20 h-20 rounded-2xl border-4 border-[#121217] bg-[#0c0c10] overflow-hidden z-20">
            <img 
              src={resolvedProfile.avatar} 
              alt={resolvedProfile.username} 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            {/* Discord rounded status badge */}
            <span className={`absolute bottom-1 right-1 w-3.5 h-3.5 rounded-full border-2 border-[#121217] ${statusMeta.color}`} title={statusMeta.text} />
          </div>

          {/* User Name & Details */}
          <div className="pt-10">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black text-white font-mono">
                @{resolvedProfile.username}
              </h3>
              <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded border inline-flex items-center ${getTagStyle(resolvedProfile.tag)}`}>
                {resolvedProfile.tag === 'Sirsilvex' && <PorscheIcon />}
                {resolvedProfile.tag}
              </span>
            </div>
            
            <p className="text-[10px] text-zinc-500 font-mono mt-1 flex items-center gap-1.5 font-bold uppercase tracking-wider">
              <span className={`w-1.5 h-1.5 rounded-full ${statusMeta.color}`} />
              {statusMeta.text}
            </p>
          </div>
        </div>

        {/* Scrollable content container for bio and lists */}
        <div className="px-5 pb-6 flex-grow overflow-y-auto scrollbar-none mt-4 max-h-[350px]">

          {/* Bio block section */}
          <div className="mt-4 pt-3.5 border-t border-zinc-800/50">
            <span className="text-[9px] font-black uppercase text-zinc-500 tracking-wider font-mono">About Me</span>
            <p className="text-xs text-zinc-300 mt-1.5 leading-relaxed font-sans">{resolvedProfile.bio}</p>
          </div>

          {/* Website segment */}
          {resolvedProfile.website && (
            <div className="mt-3.5">
              <span className="text-[9px] font-black uppercase text-zinc-500 tracking-wider font-mono">Personal Link</span>
              <a 
                href={resolvedProfile.website}
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xs text-[#ef4444] hover:underline flex items-center gap-1 mt-1 font-mono"
              >
                <span>{resolvedProfile.website.replace(/^https?:\/\//, '')}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}

          <div className="mt-5 pt-4 border-t border-zinc-800/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] font-black uppercase text-zinc-500 tracking-wider font-mono flex items-center gap-1">
                <Activity className="w-3.5 h-3.5 text-red-500" /> Curated Watchlist
              </span>
              <span className="text-[9.5px] font-mono font-bold text-zinc-500">
                {isHideList ? 'Private' : `${animeList.length} Animes`}
              </span>
            </div>

            {isHideList ? (
              <div className="flex items-center justify-center p-4 bg-zinc-950/40 border border-zinc-900 rounded-xl text-zinc-500 gap-2 font-mono">
                <ShieldAlert className="w-4 h-4" />
                <span className="text-[10px] uppercase font-bold tracking-wider">Activity private</span>
              </div>
            ) : animeList.length === 0 ? (
              <div className="text-center p-4 bg-zinc-950/40 border border-dashed border-zinc-900 rounded-xl text-zinc-650 text-[10px] font-mono uppercase font-bold">
                No streams saved yet
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 max-h-24 overflow-y-auto pr-1 select-none custom-scrollbar pb-1">
                {animeList.map((item) => (
                  <div key={item.animeId} className="flex items-center gap-2 p-1.5 bg-black/30 border border-zinc-900 rounded-lg">
                    {item.animeCover ? (
                      <img src={item.animeCover} alt="" className="w-6 h-8 object-cover rounded bg-zinc-950 shrink-0" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-6 h-8 bg-zinc-900 rounded shrink-0 flex items-center justify-center text-[8px] font-bold text-zinc-500 font-mono">
                        A
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-[10.5px] font-bold text-zinc-300 truncate leading-snug">{item.animeTitle}</p>
                      <span className={`text-[8px] font-mono font-black uppercase tracking-widest block leading-none mt-0.5 ${
                        item.status === 'Completed' ? 'text-green-450' : item.status === 'Watching' ? 'text-red-400' : 'text-amber-400'
                      }`}>
                        {item.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-5 pt-4 border-t border-zinc-800/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] font-black uppercase text-zinc-500 tracking-wider font-mono flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5 text-red-500" /> Manga Shelves
              </span>
              <span className="text-[9.5px] font-mono font-bold text-zinc-500">
                {isHideMangaList ? 'Private' : `${mangaList.length} Manga`}
              </span>
            </div>

            {isHideMangaList ? (
              <div className="flex items-center justify-center p-4 bg-zinc-950/40 border border-zinc-900 rounded-xl text-zinc-500 gap-2 font-mono">
                <ShieldAlert className="w-4 h-4" />
                <span className="text-[10px] uppercase font-bold tracking-wider">Activity private</span>
              </div>
            ) : mangaList.length === 0 ? (
              <div className="text-center p-4 bg-zinc-950/40 border border-dashed border-zinc-900 rounded-xl text-zinc-650 text-[10px] font-mono uppercase font-bold">
                No manga saved yet
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 max-h-24 overflow-y-auto pr-1 select-none custom-scrollbar pb-1">
                {mangaList.map((item) => (
                  <div key={item.animeId} className="flex items-center gap-2 p-1.5 bg-black/30 border border-zinc-900 rounded-lg">
                    {item.animeCover ? (
                      <img src={item.animeCover} alt="" className="w-6 h-8 object-cover rounded bg-zinc-950 shrink-0" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-6 h-8 bg-zinc-900 rounded shrink-0 flex items-center justify-center text-[8px] font-bold text-zinc-500 font-mono">
                        M
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-[10.5px] font-bold text-zinc-300 truncate leading-snug">{item.animeTitle}</p>
                      <span className={`text-[8px] font-mono font-black uppercase tracking-widest block leading-none mt-0.5 ${
                        item.status === 'Completed' ? 'text-green-450' : item.status === 'Reading' ? 'text-red-400' : 'text-amber-400'
                      }`}>
                        {item.status === 'Plantoread' ? 'Plan Read' : item.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-5 pt-4 border-t border-zinc-800/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] font-black uppercase text-zinc-500 tracking-wider font-mono flex items-center gap-1">
                <MusicIcon className="w-3.5 h-3.5 text-rose-500" /> Favorite Music
              </span>
              <span className="text-[9.5px] font-mono font-bold text-zinc-500">
                {isHideFavouriteSongs ? 'Private' : `${favSongs.length} Tracks`}
              </span>
            </div>

            {isHideFavouriteSongs ? (
              <div className="flex items-center justify-center p-4 bg-zinc-950/40 border border-zinc-900 rounded-xl text-zinc-500 gap-2 font-mono">
                <ShieldAlert className="w-4 h-4" />
                <span className="text-[10px] uppercase font-bold tracking-wider">Music playlist private</span>
              </div>
            ) : favSongs.length === 0 ? (
              <div className="text-center p-4 bg-zinc-950/40 border border-dashed border-zinc-900 rounded-xl text-zinc-650 text-[10px] font-mono uppercase font-bold">
                No songs saved yet
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 max-h-24 overflow-y-auto pr-1 select-none custom-scrollbar pb-1">
                {favSongs.map((song) => (
                  <div key={song.id} className="flex items-center gap-2 p-1.5 bg-black/30 border border-zinc-900 rounded-lg">
                    {song.coverImage ? (
                      <img src={song.coverImage} alt="" className="w-6 h-6 object-cover rounded bg-zinc-950 shrink-0" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-6 h-6 bg-zinc-900 rounded shrink-0 flex items-center justify-center text-[10px] font-bold text-zinc-500 font-mono">
                        ♪
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold text-zinc-300 truncate leading-snug">{song.title}</p>
                      <span className="text-[7.5px] font-mono text-zinc-500 block leading-none truncate mt-0.5 animate-pulse">
                        {song.artist || song.animeTitle || 'OST'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
