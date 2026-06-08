import React, { useState, useEffect } from 'react';
import { User, Shield, Sliders, Play, Trash2, Key, Globe, Layout, CheckCircle, Mail, AlertTriangle, ShieldCheck, Pencil, BookOpen, Film, Eye } from 'lucide-react';
import { UserProfile, ANIME_AVATARS, getStoredUser, saveStoredUser, getMyList, MyListItem, DECORATIONS_STORE } from '../services/store';
import { upsertDbUserProfile } from '../services/supabase';

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

interface ProfileProps {
  onBack?: () => void;
  onLogout?: () => void;
}

export default function Profile({ onBack, onLogout }: ProfileProps) {
  const [user, setUser] = useState<UserProfile | null>(null);
  
  // Custom states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [bio, setBio] = useState('');
  const [website, setWebsite] = useState('');
  const [status, setStatus] = useState<UserProfile['status']>('Online');
  const [tag, setTag] = useState<UserProfile['tag']>('Otaku');
  const [selectedAvatar, setSelectedAvatar] = useState('');
  const [selectedBanner, setSelectedBanner] = useState('');
  const [personalList, setPersonalList] = useState<MyListItem[]>([]);
  const [showMangaSetting, setShowMangaSetting] = useState(true);

  // Editing avatar selection view
  const [showAvatarGrid, setShowAvatarGrid] = useState(false);

  // Email Confirmation Wizard
  const [showVerificationWizard, setShowVerificationWizard] = useState(false);
  const [verificationType, setVerificationType] = useState<'credentials' | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationError, setVerificationError] = useState('');
  const [tempChanges, setTempChanges] = useState<{ username?: string; password?: string; email?: string }>({});

  const [notificationMsg, setNotificationMsg] = useState('');

  useEffect(() => {
    const active = getStoredUser();
    if (active) {
      setUser(active);
      setUsername(active.username);
      setEmail(active.email);
      setBio(active.bio || '');
      setWebsite(active.website || '');
      setStatus(active.status || 'Online');
      setTag(active.tag || 'Otaku');
      setSelectedAvatar(active.avatar);
      setSelectedBanner(active.banner || '');
      setPassword(localStorage.getItem(`pwd_${active.email}`) || '••••••••');
      
      // Load user list items and preferences
      setPersonalList(getMyList());
      setShowMangaSetting(localStorage.getItem('anipr8v_hide_manga_list') !== 'true');
    }
  }, []);

  const handleSaveStandardDetails = (updatedAvatar?: string, updatedTag?: UserProfile['tag'], updatedBanner?: string) => {
    if (!user) return;
    
    const activeAvatar = updatedAvatar || selectedAvatar;
    const activeTag = updatedTag || tag;
    const activeBanner = updatedBanner !== undefined ? updatedBanner : selectedBanner;

    const updated: UserProfile = {
      ...user,
      avatar: activeAvatar,
      tag: activeTag,
      banner: activeBanner,
      bio,
      website,
      status
    };

    setUser(updated);
    saveStoredUser(updated);
    localStorage.setItem(`user_${user.email}`, JSON.stringify(updated));
    upsertDbUserProfile(updated).catch(() => {});
    triggerFlyout('Settings synchronized successfully!');
  };

  const triggerFlyout = (msg: string) => {
    setNotificationMsg(msg);
    setTimeout(() => setNotificationMsg(''), 3000);
  };

  const handleBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setSelectedBanner(base64String);
      handleSaveStandardDetails(undefined, undefined, base64String);
      triggerFlyout('Profile banner updated successfully!');
    };
    reader.readAsDataURL(file);
  };

  // Launch Verification flow for Username / Password modifications
  const handleRequestCredentialChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setVerificationError('');

    if (!username.trim()) {
      setVerificationError('Username cannot be empty');
      return;
    }

    // Save temporary details
    setTempChanges({ username, password });
    setVerificationType('credentials');
    setVerificationCode('');
    setShowVerificationWizard(true);
  };

  const verifyCodeAndApply = () => {
    if (verificationCode !== '1234') {
      setVerificationError('Incorrect confirmation code. Try "1234" to authorize.');
      return;
    }

    if (!user) return;

    const updated: UserProfile = {
      ...user,
      username: tempChanges.username || user.username,
    };

    setUser(updated);
    saveStoredUser(updated);
    localStorage.setItem(`user_${user.email}`, JSON.stringify(updated));
    localStorage.setItem(`pwd_${user.email}`, tempChanges.password || '••••••••');
    upsertDbUserProfile(updated, tempChanges.password || undefined).catch(() => {});

    setShowVerificationWizard(false);
    setVerificationType(null);
    triggerFlyout('Credentials successfully verified via secure email confirmation!');
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertTriangle className="w-8 h-8 text-red-500 mb-2" />
        <span className="text-zinc-500 font-bold uppercase text-[10px]">Session Missing</span>
        <p className="text-xs text-zinc-600 max-w-xs mt-1">Please log in on the discussion board to configure your credentials settings.</p>
      </div>
    );
  }

  const getStatusColor = (s: UserProfile['status']) => {
    switch (s) {
      case 'Online': return 'bg-emerald-500';
      case 'Idle': return 'bg-amber-500';
      case 'Do Not Disturb': return 'bg-rose-500';
      case 'Invisible': return 'bg-zinc-600';
    }
  };

  const getTagBanner = (t: UserProfile['tag']) => {
    switch (t) {
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
    <div className="w-full flex flex-col gap-6 pb-20 animate-fade-in px-4 md:px-8 select-none">
      
      {/* Header bar */}
      <div className="border-b border-red-950/20 pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-black uppercase text-glow flex items-center gap-2">
            <User className="w-5 h-5 text-red-500" /> Otaku Settings Card
          </h1>
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mt-0.5">
            Optimize your community presence, tag badges, and secure credentials
          </p>
        </div>
      </div>

      {notificationMsg && (
        <div className="p-3 bg-emerald-950/10 border border-emerald-950/40 text-emerald-400 text-xs flex items-center gap-2 rounded-xl animate-bounce">
          <CheckCircle className="w-4 h-4 text-emerald-500" />
          <span>{notificationMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column - Realtime Discord Style Card preview */}
        <div className="flex flex-col gap-4">
          <h3 className="text-xs font-black uppercase tracking-widest text-[#ef4444] border-l-2 border-red-500 pl-2">
            Profile Page Settings
          </h3>
          
          <div className="bg-[#121217] border border-zinc-900 rounded-2xl overflow-hidden shadow-xl relative pb-6">
            <input
              type="file"
              id="profile-banner-picker"
              accept="image/*"
              className="hidden"
              onChange={handleBannerUpload}
            />
            <div className="h-24 relative group overflow-hidden border-b border-[#040405] bg-[#0c0c10]">
              {selectedBanner ? (
                <>
                  <img src={selectedBanner} alt="User Profile Banner" className="w-full h-full object-cover animate-fade-in" referrerPolicy="no-referrer" />
                  <div className="absolute inset-0 bg-black/75 opacity-0 group-hover:opacity-100 flex flex-col gap-1.5 items-center justify-center transition-all duration-200">
                    <button
                      type="button"
                      onClick={() => document.getElementById('profile-banner-picker')?.click()}
                      className="px-2.5 py-1 bg-red-650 hover:bg-red-700 text-white text-[9px] font-black font-mono uppercase tracking-wider rounded transition-all cursor-pointer"
                    >
                      Change Image
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedBanner('');
                        handleSaveStandardDetails(undefined, undefined, '');
                        triggerFlyout('Custom banner removed! Fallback automatic tag color active.');
                      }}
                      className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white text-[9px] font-black font-mono uppercase tracking-wider rounded transition-all cursor-pointer"
                    >
                      Use Tag Color fallback
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className={`w-full h-full bg-gradient-to-b ${getTagBanner(tag)} animate-fade-in`} />
                  <button
                    type="button"
                    onClick={() => document.getElementById('profile-banner-picker')?.click()}
                    className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-[9.5px] font-black font-mono uppercase tracking-widest transition-all cursor-pointer gap-0.5"
                    title="Upload Custom Banner Image"
                  >
                    <span>Upload Cover Banner</span>
                    <span className="text-[8px] text-zinc-450 normal-case font-medium font-sans">falls back to {tag} automatic tag color</span>
                  </button>
                </>
              )}
            </div>
            <div className="px-5 relative">
              
              {/* Avatar position */}
              <div className="absolute -top-10 left-5 w-18 h-18 rounded-2xl border-4 border-[#121217] bg-black overflow-hidden group">
                <img src={selectedAvatar} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </div>

              {/* Float edit pencil circle perfectly positioned over the avatar bottom right */}
              <button 
                type="button"
                onClick={() => setShowAvatarGrid(!showAvatarGrid)}
                className="absolute top-2 left-18 bg-red-600 hover:bg-red-700 text-white p-1 rounded-full border-2 border-[#121217] shadow-xl transition-all active:scale-90 cursor-pointer flex items-center justify-center"
                title="Edit Avatar"
              >
                <Pencil className="w-2.5 h-2.5 text-white" />
              </button>
              
              {/* Shortened tight distance between avatar and username */}
              <div className="pt-10">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-base font-black text-white font-mono">@{username || 'Guest'}</span>
                  <span className={`text-[9.5px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded border inline-flex items-center ${
                    tag === 'Sirsilvex'
                      ? 'bg-white/10 text-white border-white/35 shadow-sm font-black'
                      : tag === 'Kuudere'
                      ? 'bg-sky-500/10 text-sky-450 border-sky-500/20'
                      : tag === 'Tsundere'
                      ? 'bg-pink-500/10 text-pink-450 border-pink-500/20'
                      : 'bg-purple-500/10 text-purple-450 border-purple-500/20'
                  }`}>
                    {tag === 'Sirsilvex' && <PorscheIcon />}
                    {tag}
                  </span>
                </div>
                <p className="text-[9.5px] text-zinc-500 font-mono font-bold mt-1 uppercase tracking-wider">{status}</p>
              </div>

              <div className="mt-4 pt-3.5 border-t border-zinc-900/60">
                <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest font-mono">About Preview</span>
                <p className="text-xs text-zinc-350 leading-relaxed mt-1">{bio || 'No bio specified.'}</p>
              </div>

              {website && (
                <div className="mt-3">
                  <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest font-mono">Link</span>
                  <p className="text-xs text-[#ef4444] truncate font-mono mt-0.5">{website}</p>
                </div>
              )}
            </div>
          </div>

          {/* Quick interactive Avatar card picker drawer if pencil icon is triggered */}
          {showAvatarGrid && (
            <div className="p-4 bg-[#08080a] border border-red-950/20 rounded-xl animate-fade-in">
              <span className="text-[10px] font-black uppercase text-zinc-400 font-mono block mb-2 font-bold">Available Pre-selected Profiles</span>
              <div className="grid grid-cols-5 gap-2 max-h-24 overflow-y-auto">
                {ANIME_AVATARS.map((url, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setSelectedAvatar(url);
                      setShowAvatarGrid(false);
                      handleSaveStandardDetails(url, undefined);
                    }}
                    className={`w-10 h-10 rounded-lg overflow-hidden border shrink-0 transition-all ${
                      selectedAvatar === url ? 'border-red-650' : 'border-zinc-900 hover:border-zinc-700'
                    }`}
                  >
                    <img src={url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quick Decor Picker */}
          <div className="p-4 bg-[#08080a] border border-yellow-500/20 rounded-xl flex flex-col gap-3">
            <span className="text-[10px] font-black uppercase text-yellow-500 tracking-widest block font-bold border-b border-yellow-900/30 pb-2">Equip Decoration</span>
            <div className="grid grid-cols-4 gap-3 max-h-40 overflow-y-auto w-full">
               <button
                  onClick={() => {
                     const u = getStoredUser();
                     if(u) {
                        const next = {...u, decoration: ""};
                        saveStoredUser(next);
                        setUser(next);
                        upsertDbUserProfile(next).catch(()=>{});
                     }
                  }}
                  className={`relative w-12 h-12 rounded-lg border flex items-center justify-center text-[10px] font-black tracking-widest uppercase transition-all bg-zinc-900/50 hover:bg-zinc-800 ${!user?.decoration ? 'border-yellow-500 text-yellow-500' : 'border-zinc-800 text-zinc-500'}`}
               >
                  Clear
               </button>
               {(() => {
                 let purchased: string[] = [];
                 try {
                   purchased = JSON.parse(localStorage.getItem(`anipr8v_purchased_decos_${user?.username.toLowerCase()}`) || "[]");
                 } catch(e) {}
                 const availableDecos = (DECORATIONS_STORE || []).filter(d => purchased.includes(d.id));
                 
                 if (availableDecos.length === 0) {
                    return <div className="col-span-3 flex items-center justify-center text-zinc-500 text-[10px] font-bold uppercase tracking-widest text-center">No Decorations. Buy in Settings!</div>;
                 }

                 return availableDecos.map(deco => (
                    <button
                      key={deco.id}
                      onClick={() => {
                        const u = getStoredUser();
                        if(u) {
                           const next = {...u, decoration: deco.url};
                           saveStoredUser(next);
                           setUser(next);
                           upsertDbUserProfile(next).catch(()=>{});
                        }
                      }}
                      className={`relative w-12 h-12 rounded-lg border flex flex-col items-center justify-center transition-all overflow-hidden ${user?.decoration === deco.url ? 'border-yellow-500 bg-yellow-500/10' : 'border-zinc-800 hover:border-zinc-700 bg-black'}`}
                    >
                       <img src={deco.url} className="w-[120%] h-[120%] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 object-contain pointer-events-none" />
                    </button>
                 ));
               })()}
            </div>
          </div>

        </div>

        {/* Center/Right Form config columns */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          
          {/* Identity Credentials - Requiring verification */}
          <form onSubmit={handleRequestCredentialChange} className="p-5 bg-[#08080a] border border-red-950/20 rounded-2xl flex flex-col gap-4">
            <h3 className="text-xs font-black uppercase text-white tracking-widest border-l-2 border-red-500 pl-2.5 flex items-center gap-1.5">
              <Key className="w-4 h-4 text-red-500" /> Secure Identity Settings
            </h3>
            <p className="text-[10.5px] text-zinc-500 leading-snug">
              Modifying your username or passkey requires automated multi-factor Email Confirmation. Enter new values and click confirm below.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-mono">Username</label>
                <input
                  type="text"
                  maxLength={16}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="bg-black border border-zinc-900 focus:border-red-650 text-xs text-white p-2.5 rounded-xl outline-none transition-all font-mono"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-mono">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-black border border-zinc-900 focus:border-red-650 text-xs text-white p-2.5 rounded-xl outline-none transition-all font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              className="py-2.5 bg-red-650 hover:bg-red-700 active:scale-98 transition-all text-white rounded-xl text-xs font-black uppercase tracking-wider font-mono self-start px-6 cursor-pointer"
            >
              Verify Changes
            </button>
          </form>

          {/* Social Presence Card details */}
          <div className="p-5 bg-[#08080a] border border-red-950/20 rounded-2xl flex flex-col gap-4">
            <h3 className="text-xs font-black uppercase text-white tracking-widest border-l-2 border-red-600 pl-2.5 flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-red-500" /> Community Customization
            </h3>

            <div className="flex flex-col gap-4">
              {/* Custom Bio */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-mono">Short Biography</label>
                <textarea
                  maxLength={150}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="bg-black border border-zinc-900 focus:border-red-650 text-xs text-white p-2.5 rounded-xl outline-none h-18 resize-none transition-all"
                  placeholder="Tell the community about your favorites..."
                />
              </div>

              {/* Website link */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-mono">Personal Link (Website Link)</label>
                <input
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  className="bg-black border border-zinc-900 focus:border-red-650 text-xs text-white p-2.5 rounded-xl outline-none transition-all font-mono"
                  placeholder="https://anipr8v.com"
                />
              </div>

              {/* Grid of details: Status & custom badges */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                
                {/* Status Dropdown */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-mono">My Active Status</label>
                  <select
                    value={status}
                    onChange={(e) => {
                      const val = e.target.value as UserProfile['status'];
                      setStatus(val);
                      // Auto save status trigger
                      setTimeout(() => handleSaveStandardDetails(), 100);
                    }}
                    className="w-full bg-black border border-zinc-900 focus:border-red-650 text-xs text-zinc-300 p-2.5 rounded-xl outline-none cursor-pointer font-mono"
                  >
                    <option value="Online">Online</option>
                    <option value="Idle">Idle</option>
                    <option value="Do Not Disturb">Do Not Disturb</option>
                    <option value="Invisible">Invisible / Offline</option>
                  </select>
                </div>

                {/* Badge Tag choosing */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-mono">Visual Badge Tag</label>
                  <select
                    value={tag}
                    onChange={(e) => {
                      const val = e.target.value as UserProfile['tag'];
                      setTag(val);
                      // Auto save trigger
                      setTimeout(() => handleSaveStandardDetails(undefined, val), 100);
                    }}
                    className="w-full bg-black border border-zinc-900 focus:border-red-650 text-xs text-zinc-300 p-2.5 rounded-xl outline-none cursor-pointer font-mono"
                  >
                    <option value="Otaku">🟣 Otaku</option>
                    <option value="Kuudere">🔵 Kuudere</option>
                    <option value="Tsundere">💗 Tsundere</option>
                    <option value="Sirsilvex">⚪ Sirsilvex</option>
                  </select>
                </div>
              </div>

            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between w-full mt-4">
              <button
                type="button"
                onClick={() => handleSaveStandardDetails()}
                className="py-2.5 bg-zinc-950 hover:bg-zinc-900 border border-zinc-900 hover:border-zinc-805 text-white rounded-xl text-xs font-black uppercase tracking-wider font-mono px-6 cursor-pointer w-full sm:w-auto"
              >
                Update Presence
              </button>

              {onLogout && (
                <button 
                  type="button"
                  onClick={onLogout}
                  className="py-2 bg-red-950/25 hover:bg-red-900/40 border border-red-900/30 text-red-500 hover:text-red-400 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer font-mono px-6 w-full sm:flex-1 text-center"
                >
                  Sign Out of Account
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 4. PUBLIC MY LIST SHELVES SHOWCASE */}
      <div className="mt-8 pt-8 border-t border-zinc-900 flex flex-col gap-8 text-left">
        
        {/* Anime Broadcasts Shelf */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black uppercase text-white tracking-widest flex items-center gap-2">
              <Film className="w-4 h-4 text-red-500" /> Active Watchlist broadcasts ({personalList.filter(i => (i.type || 'anime') === 'anime').length})
            </h3>
            <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest font-black">Logged Anime Streams</span>
          </div>

          {personalList.filter(i => (i.type || 'anime') === 'anime').length === 0 ? (
            <div className="p-8 border border-dashed border-zinc-900 rounded-xl text-center bg-zinc-950/25">
              <span className="text-[10.5px] text-zinc-500 font-bold uppercase tracking-wider block">Watchlist is currently empty.</span>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
              {personalList.filter(i => (i.type || 'anime') === 'anime').map((item, idx) => (
                <div key={idx} className="bg-[#0b0b0d] border border-zinc-900 rounded-xl overflow-hidden relative flex flex-col group hover:border-red-500/20 transition-all">
                  <div className="aspect-[3/4] relative overflow-hidden bg-zinc-950 shrink-0">
                    <img src={item.animeCover} alt="" className="w-full h-full object-cover group-hover:scale-103 transition-transform" referrerPolicy="no-referrer" />
                    <span className="absolute top-2 left-2 text-[7.5px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-red-650 text-white shadow">
                      {item.status}
                    </span>
                  </div>
                  <div className="p-2.5 flex flex-col justify-center min-w-0 flex-grow text-left">
                    <h4 className="text-[11px] font-black uppercase tracking-wide truncate text-zinc-100 group-hover:text-red-500 transition-colors leading-tight">
                      {item.animeTitle}
                    </h4>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Manga Library Shelf - Shown only if settings flag is true */}
        {showMangaSetting && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black uppercase text-white tracking-widest flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-red-500" /> My Manga Shelves ({personalList.filter(i => i.type === 'manga').length})
              </h3>
              <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest font-black">Synced Manga Titles</span>
            </div>

            {personalList.filter(i => i.type === 'manga').length === 0 ? (
              <div className="p-8 border border-dashed border-zinc-905 rounded-xl text-center bg-zinc-950/25">
                <span className="text-[10.5px] text-zinc-500 font-bold uppercase tracking-wider block">Manga shelf is currently empty.</span>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
                {personalList.filter(i => i.type === 'manga').map((item, idx) => (
                  <div key={idx} className="bg-[#0b0b0d] border border-zinc-900 rounded-xl overflow-hidden relative flex flex-col group hover:border-red-500/20 transition-all">
                    <div className="aspect-[3/4] relative overflow-hidden bg-zinc-950 shrink-0">
                      <img src={item.animeCover} alt="" className="w-full h-full object-cover group-hover:scale-103 transition-transform" referrerPolicy="no-referrer" />
                      <span className="absolute top-2 left-2 text-[7.5px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 shadow">
                        {item.status}
                      </span>
                    </div>
                    <div className="p-2.5 flex flex-col justify-center min-w-0 flex-grow text-left">
                      <h4 className="text-[11px] font-black uppercase tracking-wide truncate text-zinc-100 group-hover:text-red-500 transition-colors leading-tight font-sans">
                        {item.animeTitle}
                      </h4>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>

      {/* Verification Code overlay wizard representing email confirmation */}
      {showVerificationWizard && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50 animate-fade-in select-none">
          <div className="bg-[#0c0c10] border border-red-950/80 p-6 rounded-2xl w-full max-w-sm text-center shadow-2xl relative">
            <button 
              onClick={() => {
                setShowVerificationWizard(false);
                setVerificationType(null);
              }}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white"
            >
              X
            </button>

            <div className="inline-flex p-3 rounded-xl bg-red-950/20 border border-red-900/40 text-red-500 mb-4">
              <ShieldCheck className="w-5.5 h-5.5 animate-pulse" />
            </div>

            <h4 className="text-sm font-black text-white uppercase tracking-widest font-mono">Email Confirmation Code Required</h4>
            <p className="text-xs text-zinc-500 mt-2 leading-relaxed">
              We've dispatched an interactive secure confirmation key to: <br/>
              <span className="text-red-400 font-bold font-mono text-[10.5px]">{email}</span> <br/>
              Simulated verification key: <b className="text-white bg-zinc-900 px-1.5 py-0.5 rounded text-[10px] font-mono tracking-wider">1234</b>
            </p>

            <div className="my-5">
              {verificationError && (
                <p className="text-[10px] text-red-500 font-bold block mb-2 font-mono">{verificationError}</p>
              )}
              <input
                type="text"
                placeholder="Enter 4-digit code"
                maxLength={4}
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                className="w-full p-2.5 bg-black border border-zinc-900 font-mono font-extrabold text-[#ef4444] text-center tracking-widest focus:border-red-650 rounded-xl outline-none"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={verifyCodeAndApply}
                className="flex-1 py-2 bg-red-650 hover:bg-red-700 text-white rounded-xl text-xs font-bold uppercase cursor-pointer"
              >
                Confirm Changes
              </button>
              <button
                onClick={() => {
                  setShowVerificationWizard(false);
                  setVerificationType(null);
                }}
                className="flex-1 py-2 bg-zinc-900 text-zinc-400 rounded-xl text-xs font-bold uppercase hover:bg-zinc-800 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
