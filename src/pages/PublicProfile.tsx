import React, { useState, useEffect } from 'react';
import { User, Shield, Play, ArrowLeft, Loader2, ExternalLink, Activity, BookOpen, Music as MusicIcon, Heart, Calendar, Link as LinkIcon, ShieldAlert } from 'lucide-react';
import { UserProfile, MyListItem, getStoredUser } from '../services/store';
import { fetchDbUserProfile, supabase, fetchFavouritedSongs } from '../services/supabase';

interface PublicProfileProps {
  username: string;
  onBack: () => void;
  onSelectAnime: (id: number) => void;
  onSelectManga: (id: number) => void;
}

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

export default function PublicProfile({ username, onBack, onSelectAnime, onSelectManga }: PublicProfileProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [list, setList] = useState<MyListItem[]>([]);
  const [favSongs, setFavSongs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'anime' | 'manga' | 'songs'>('anime');

  useEffect(() => {
    if (!username) return;
    setLoading(true);

    const loadProfileAndLists = async () => {
      try {
        let foundProfile: UserProfile | null = null;
        let foundList: MyListItem[] = [];
        let foundSongs: any[] = [];

        const currentLogged = getStoredUser();
        const normalize = (s: string) => (s || '').toLowerCase().trim();

        if (currentLogged && normalize(currentLogged.username) === normalize(username)) {
          // If viewing self, load from local storage first
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
          foundSongs = await fetchFavouritedSongs(username).catch(() => []);
        } else {
          // Fetch from Supabase
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

          // Fetch watch/reading shelf listing
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

          foundSongs = await fetchFavouritedSongs(username).catch(() => []);
        }

        // General fallback if no custom DB profile exists yet
        if (!foundProfile) {
          foundProfile = {
            email: `${username.toLowerCase()}@anipriv8.com`,
            username: username,
            avatar: `https://api.dicebear.com/7.x/pixel-art/svg?seed=${username}`,
            bio: `Dedicated Otaku and valued AniPriv8 community explorer.`,
            website: '',
            status: 'Online',
            tag: 'Otaku'
          };
        }

        setProfile(foundProfile);
        setList(foundList);
        setFavSongs(foundSongs);
      } catch (err) {
        console.error('Failed to load public profile:', err);
      } finally {
        setLoading(false);
      }
    };

    loadProfileAndLists();
  }, [username]);

  if (loading) {
    return (
      <div className="w-full min-h-[500px] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
        <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Syncing User profile deck...</span>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="w-full min-h-[400px] flex flex-col items-center justify-center gap-4 text-center px-4">
        <ShieldAlert className="w-12 h-12 text-zinc-600" />
        <div>
          <h3 className="text-lg font-bold text-white">Profile offline</h3>
          <p className="text-xs text-zinc-500 mt-1 max-w-xs">We couldn't resolve details for target user profile "@{username}".</p>
        </div>
        <button onClick={onBack} className="px-5 py-2 bg-zinc-950 border border-zinc-900 rounded-full text-xs font-bold hover:bg-zinc-900 text-zinc-300">
          Return Home
        </button>
      </div>
    );
  }

  const getStatusStyle = (status: UserProfile['status']) => {
    switch (status) {
      case 'Online':
        return { color: 'bg-emerald-500', text: 'Online' };
      case 'Idle':
        return { color: 'bg-amber-500', text: 'Idle' };
      case 'Do Not Disturb':
        return { color: 'bg-rose-500', text: 'Do Not Disturb' };
      case 'Invisible':
      default:
        return { color: 'bg-zinc-650', text: 'Offline' };
    }
  };

  const statusMeta = getStatusStyle(profile.status);

  const getTagStyle = (tag: UserProfile['tag']) => {
    switch (tag) {
      case 'Sirsilvex':
        return 'bg-white/10 text-white border-white/30 font-black shadow-md shadow-white/5';
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
        return 'from-purple-950/50 to-purple-900/10';
    }
  };

  const animeList = list.filter((item) => !item.type || item.type === 'anime');
  const mangaList = list.filter((item) => item.type === 'manga');

  const isHideList = !!(profile as any).hide_my_list;
  const isHideMangaList = !!(profile as any).hide_manga_list;
  const isHideFavouriteSongs = !!(profile as any).hide_favourite_songs;

  return (
    <div className="w-full flex flex-col gap-6 pb-20 animate-fade-in px-4 md:px-8 select-none">
      
      {/* Return button */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 bg-zinc-950 border border-zinc-900 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 transition-all cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-base font-extrabold text-white leading-tight">
            User Deck Profile
          </h2>
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mt-0.5">
            Viewing Profile card for @{profile.username}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left column (compact Discord theme card - span 4) */}
        <div className="col-span-1 lg:col-span-4 flex flex-col gap-4">
          <div className="bg-[#08080a] border border-zinc-900 rounded-2xl overflow-hidden shadow-2xl flex flex-col font-sans">
            
            {/* Top theme banner */}
            <div className="h-32 w-full relative overflow-hidden border-b border-zinc-900/20">
              {profile.banner ? (
                <img src={profile.banner} alt="User Banner" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className={`w-full h-full bg-gradient-to-b ${getTagBanner(profile.tag)}`} />
              )}
            </div>

            {/* Profile Detail header info overlay */}
            <div className="px-5 relative shrink-0 z-20">
              <div className="absolute -top-14 left-5 w-24 h-24 rounded-2xl border-4 border-[#08080a] bg-[#0c0c10] overflow-hidden z-20 shadow-lg">
                <img 
                  src={profile.avatar} 
                  alt={profile.username} 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <span className={`absolute bottom-1 right-1 w-4 h-4 rounded-full border-2 border-[#0c0c10] ${statusMeta.color}`} />
              </div>

              <div className="pt-12">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-black text-white font-mono">
                    @{profile.username}
                  </h3>
                  <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded border inline-flex items-center ${getTagStyle(profile.tag)}`}>
                    {profile.tag === 'Sirsilvex' && <PorscheIcon />}
                    {profile.tag}
                  </span>
                </div>
                
                <p className="text-[10px] text-zinc-500 font-mono mt-1.5 flex items-center gap-1.5 font-bold uppercase tracking-wider">
                  <span className={`w-1.5 h-1.5 rounded-full ${statusMeta.color}`} />
                  {statusMeta.text}
                </p>
              </div>
            </div>

            {/* User Bio and dynamic links */}
            <div className="px-5 pb-6 pt-5 flex flex-col gap-4.5">
              
              <div className="p-3 bg-zinc-950/50 border border-zinc-900/60 rounded-xl">
                <span className="text-[9px] font-black uppercase text-zinc-500 tracking-wider font-mono">About Me</span>
                <p className="text-xs text-zinc-300 mt-1.5 leading-relaxed font-sans">{profile.bio || "No description set yet."}</p>
              </div>

              {profile.website && (
                <div>
                  <span className="text-[9px] font-black uppercase text-zinc-500 tracking-wider font-mono block mb-1">Personal Website</span>
                  <a 
                    href={profile.website}
                    target="_blank"  
                    rel="noopener noreferrer"
                    className="text-xs text-red-500 hover:underline inline-flex items-center gap-1.5 font-mono"
                  >
                    <LinkIcon className="w-3.5 h-3.5" />
                    <span>{profile.website.replace(/^https?:\/\//, '')}</span>
                  </a>
                </div>
              )}

              <div className="pt-4 border-t border-zinc-900/50 flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs font-bold text-zinc-400">
                  <span className="font-mono text-[9px] uppercase tracking-wider text-zinc-500">Anime Shelf</span>
                  <span>{isHideList ? 'Private' : `${animeList.length} items`}</span>
                </div>
                <div className="flex items-center justify-between text-xs font-bold text-zinc-400">
                  <span className="font-mono text-[9px] uppercase tracking-wider text-zinc-500">Manga Shelf</span>
                  <span>{isHideMangaList ? 'Private' : `${mangaList.length} items`}</span>
                </div>
                <div className="flex items-center justify-between text-xs font-bold text-zinc-400">
                  <span className="font-mono text-[9px] uppercase tracking-wider text-zinc-500">Favourited Tracks</span>
                  <span>{isHideFavouriteSongs ? 'Private' : `${favSongs.length} songs`}</span>
                </div>
              </div>

            </div>

          </div>
        </div>

        {/* Right column (Tabs for Shelf Displays - span 8) */}
        <div className="col-span-1 lg:col-span-8 flex flex-col gap-4">
          
          {/* Deck Shelf Tabs */}
          <div className="flex items-center bg-zinc-950 p-1 border border-zinc-900 rounded-xl">
            <button
              onClick={() => setActiveTab('anime')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-extrabold rounded-lg transition-all uppercase tracking-wider cursor-pointer ${
                activeTab === 'anime'
                  ? 'bg-red-950/20 text-red-500 border border-red-900/10'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>Anime Shelf</span>
            </button>
            <button
              onClick={() => setActiveTab('manga')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-extrabold rounded-lg transition-all uppercase tracking-wider cursor-pointer ${
                activeTab === 'manga'
                  ? 'bg-red-950/20 text-red-500 border border-red-900/10'
                  : 'text-zinc-400 hover:text-zinc-300'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Manga Shelf</span>
            </button>
            <button
              onClick={() => setActiveTab('songs')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-extrabold rounded-lg transition-all uppercase tracking-wider cursor-pointer ${
                activeTab === 'songs'
                  ? 'bg-red-950/20 text-red-500 border border-red-900/10'
                  : 'text-zinc-400 hover:text-zinc-350'
              }`}
            >
              <MusicIcon className="w-4 h-4" />
              <span>Music Playlist</span>
            </button>
          </div>

          {/* Shelves Content block */}
          <div className="bg-[#08080a] border border-zinc-900 rounded-2xl p-5 min-h-[400px]">
            {activeTab === 'anime' && (
              <div className="flex flex-col gap-4 animate-fade-in animate-duration-200">
                <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
                  <h4 className="text-sm font-black text-white font-mono uppercase tracking-widest flex items-center gap-2">
                    <Activity className="w-4.5 h-4.5 text-red-500" /> Anime Watch Deck
                  </h4>
                  <span className="text-[10px] font-mono text-zinc-500 font-bold bg-zinc-950 px-2 py-0.5 border border-zinc-900 rounded-full">
                    {isHideList ? 'Locked' : `${animeList.length} total`}
                  </span>
                </div>

                {isHideList ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-3 text-zinc-505 text-center">
                    <Shield className="w-10 h-10 text-zinc-700" />
                    <div>
                      <p className="text-xs font-bold text-zinc-300">Anime Shelf are private</p>
                      <p className="text-[10px] text-zinc-500 mt-0.5">This user has set their interactive anime watchlist to private.</p>
                    </div>
                  </div>
                ) : animeList.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-zinc-500 text-xs">
                    No anime titles added to this user's watch deck yet.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {animeList.map((item) => (
                      <div
                        key={item.animeId}
                        onClick={() => onSelectAnime(item.animeId)}
                        className="bg-zinc-950 border border-zinc-900/60 rounded-xl overflow-hidden hover:scale-[1.02] hover:border-red-950/50 cursor-pointer transition-all flex flex-col group"
                      >
                        <div className="aspect-[16/10] bg-zinc-900 relative leading-none shrink-0 overflow-hidden">
                          {item.animeCover ? (
                            <img src={item.animeCover} alt={item.animeTitle} className="w-full h-full object-cover transition-transform group-hover:scale-105" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
                              <span className="text-[9px] font-mono text-zinc-500 font-black">No Cover</span>
                            </div>
                          )}
                          <div className="absolute top-2 right-2 flex gap-1">
                            <span className={`text-[8.5px] font-mono font-black uppercase px-2 py-0.5 rounded leading-none shadow-sm ${
                              item.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15' :
                              item.status === 'Watching' ? 'bg-red-500/10 text-red-400 border border-red-500/15' :
                              'bg-amber-500/10 text-amber-400 border border-amber-500/15'
                            }`}>
                              {item.status}
                            </span>
                          </div>
                        </div>
                        <div className="p-3 flex-grow flex flex-col justify-between">
                          <h5 className="text-xs font-black text-zinc-100 line-clamp-1 group-hover:text-red-400 transition-colors">
                            {item.animeTitle}
                          </h5>
                          {item.addedAt && (
                            <p className="text-[8.5px] font-mono text-zinc-500 mt-2 flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-zinc-600" />
                              Synced {item.addedAt}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'manga' && (
              <div className="flex flex-col gap-4 animate-fade-in animate-duration-200">
                <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
                  <h4 className="text-sm font-black text-white font-mono uppercase tracking-widest flex items-center gap-2">
                    <BookOpen className="w-4.5 h-4.5 text-red-500" /> Manga Shelf Deck
                  </h4>
                  <span className="text-[10px] font-mono text-zinc-500 font-bold bg-zinc-950 px-2 py-0.5 border border-zinc-900 rounded-full">
                    {isHideMangaList ? 'Locked' : `${mangaList.length} total`}
                  </span>
                </div>

                {isHideMangaList ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-3 text-zinc-505 text-center">
                    <Shield className="w-10 h-10 text-zinc-700" />
                    <div>
                      <p className="text-xs font-bold text-zinc-300">Manga Shelf is private</p>
                      <p className="text-[10px] text-zinc-500 mt-0.5">This user has set their manga collection shelves to private.</p>
                    </div>
                  </div>
                ) : mangaList.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-zinc-500 text-xs text-center">
                    No Manga titles logged in this user's reading deck yet.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {mangaList.map((item) => (
                      <div
                        key={item.animeId}
                        onClick={() => onSelectManga(item.animeId)}
                        className="bg-zinc-950 border border-zinc-900/60 rounded-xl overflow-hidden hover:scale-[1.02] hover:border-red-950/50 cursor-pointer transition-all flex flex-col group"
                      >
                        <div className="aspect-[16/10] bg-zinc-900 relative leading-none shrink-0 overflow-hidden">
                          {item.animeCover ? (
                            <img src={item.animeCover} alt={item.animeTitle} className="w-full h-full object-cover transition-transform group-hover:scale-105" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
                              <span className="text-[9px] font-mono text-zinc-500 font-black">No Cover</span>
                            </div>
                          )}
                          <div className="absolute top-2 right-2">
                            <span className={`text-[8.5px] font-mono font-black uppercase px-2 py-0.5 rounded leading-none shadow-sm ${
                              item.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15' :
                              item.status === 'Reading' ? 'bg-sky-500/10 text-sky-400 border border-sky-500/15' :
                              'bg-amber-500/10 text-amber-400 border border-amber-500/15'
                            }`}>
                              {item.status}
                            </span>
                          </div>
                        </div>
                        <div className="p-3 flex-grow flex flex-col justify-between">
                          <h5 className="text-xs font-black text-zinc-100 line-clamp-1 group-hover:text-red-400 transition-colors">
                            {item.animeTitle}
                          </h5>
                          {item.addedAt && (
                            <p className="text-[8.5px] font-mono text-zinc-500 mt-2 flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-zinc-600" />
                              Synced {item.addedAt}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'songs' && (
              <div className="flex flex-col gap-4 animate-fade-in animate-duration-200">
                <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
                  <h4 className="text-sm font-black text-white font-mono uppercase tracking-widest flex items-center gap-2">
                    <MusicIcon className="w-4.5 h-4.5 text-red-500" /> Favourited Play Deck
                  </h4>
                  <span className="text-[10px] font-mono text-zinc-500 font-bold bg-zinc-950 px-2 py-0.5 border border-zinc-900 rounded-full">
                    {isHideFavouriteSongs ? 'Locked' : `${favSongs.length} total`}
                  </span>
                </div>

                {isHideFavouriteSongs ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-3 text-zinc-505 text-center">
                    <Shield className="w-10 h-10 text-zinc-700" />
                    <div>
                      <p className="text-xs font-bold text-zinc-300">Songs list is private</p>
                      <p className="text-[10px] text-zinc-500 mt-0.5">This user's curated favourited audio tracks are set to private.</p>
                    </div>
                  </div>
                ) : favSongs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-zinc-500 text-xs">
                    No custom audio tracks favorited by this user yet.
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {favSongs.map((song, idx) => (
                      <div
                        key={song.track_id || idx}
                        className="flex items-center justify-between p-3 bg-zinc-950 border border-zinc-905 rounded-xl hover:bg-zinc-900/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-zinc-900 rounded-lg flex items-center justify-center text-red-500 shrink-0 border border-zinc-850">
                            <Heart className="w-4 h-4 fill-current text-red-500" />
                          </div>
                          <div>
                            <h5 className="text-xs font-black text-white leading-tight">
                              {song.track_title || song.title || "Unknown Track"}
                            </h5>
                            <p className="text-[10px] text-zinc-505 mt-1 font-mono font-bold uppercase tracking-wider">
                              {song.track_artist || song.artist || "Anime OST"}
                            </p>
                          </div>
                        </div>
                        {song.anime_title && (
                          <span className="hidden sm:inline-block text-[9.5px] px-2.5 py-1 rounded bg-zinc-900 border border-zinc-850/60 font-mono text-zinc-400 max-w-[150px] truncate">
                            {song.anime_title}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
