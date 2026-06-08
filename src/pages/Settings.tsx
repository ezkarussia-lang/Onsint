/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Shield, Sliders, Play, Trash2, CheckCircle2, ShoppingBag, Coins } from 'lucide-react';
import { fetchDbUserProfile, upsertDbUserProfile } from '../services/supabase';
import { getApiUrl } from '../services/api';
import { DECORATIONS_STORE, getStoredUser, saveStoredUser } from '../services/store';

export default function Settings({ onNavigateStore }: { onNavigateStore?: () => void }) {
  const [autoSkipOped, setAutoSkipOped] = useState(() => localStorage.getItem('anime_auto_skip_oped') === 'true');
  const [autoplay, setAutoplay] = useState(() => localStorage.getItem('anime_autoplay') !== 'false');
  const [profilePrivate, setProfilePrivate] = useState(() => localStorage.getItem('anipr8v_hide_my_list') === 'true');
  const [hideMangaList, setHideMangaList] = useState(() => localStorage.getItem('anipr8v_hide_manga_list') === 'true');
  const [hideFavouriteSongs, setHideFavouriteSongs] = useState(() => localStorage.getItem('anipr8v_hide_favourite_songs') === 'true');
  const [historyClearedMessage, setHistoryClearedMessage] = useState(false);
  
  const [userCoins, setUserCoins] = useState(0);
  const [purchasedDecos, setPurchasedDecos] = useState<string[]>([]);
  
  useEffect(() => {
    const user = getStoredUser();
    if (user) {
      setUserCoins(user.coins || 0);
      try {
        const storedPurchased = localStorage.getItem(`anipr8v_purchased_decos_${user.username.toLowerCase()}`);
        if (storedPurchased) {
          setPurchasedDecos(JSON.parse(storedPurchased));
        }
      } catch (e) {}
    }
  }, []);

  const handlePurchaseDecoration = async (deco: typeof DECORATIONS_STORE[0]) => {
    const user = getStoredUser();
    if (!user) {
        alert("You must be logged in to purchase decorations!");
        return;
    }
    if (purchasedDecos.includes(deco.id)) {
        alert("You already own this decoration!");
        return;
    }
    if (userCoins < deco.price) {
        alert("Not enough Otaku Coins!");
        return;
    }
    const newCoins = userCoins - deco.price;
    setUserCoins(newCoins);
    const newDecos = [...purchasedDecos, deco.id];
    setPurchasedDecos(newDecos);
    localStorage.setItem(`anipr8v_purchased_decos_${user.username.toLowerCase()}`, JSON.stringify(newDecos));
    
    // Auto equip if none equipped or just bought
    const updatedUser = { ...user, coins: newCoins, decoration: deco.url };
    saveStoredUser(updatedUser);
    
    try {
        await upsertDbUserProfile(updatedUser);
        alert(`Successfully purchased and equipped ${deco.label}!`);
    } catch (e) {}
  };

  const [pyCode, setPyCode] = useState('');
  const [tsCode, setTsCode] = useState('');

  const handleToggleAutoSkip = () => {
    const newVal = !autoSkipOped;
    setAutoSkipOped(newVal);
    localStorage.setItem('anime_auto_skip_oped', String(newVal));
  };

  const handleToggleAutoplay = () => {
    const newVal = !autoplay;
    setAutoplay(newVal);
    localStorage.setItem('anime_autoplay', String(newVal));
  };

  const handleTogglePrivate = () => {
    const newVal = !profilePrivate;
    setProfilePrivate(newVal);
    localStorage.setItem('anipr8v_hide_my_list', String(newVal));
    
    // Save to server-side profile if logged in
    const cachedUser = localStorage.getItem('otaku_user');
    if (cachedUser) {
      try {
        const parsed = JSON.parse(cachedUser);
        const username = parsed.username || parsed;
        
        // Direct Client-Side Supabase save! Full persistent parity.
        fetchDbUserProfile(username).then(profile => {
          if (profile) {
            upsertDbUserProfile({ ...profile, hide_my_list: newVal }).catch(() => {});
          }
        }).catch(() => {});

        fetch(getApiUrl('/api/auth/save-privacy-setting'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, key: 'hide_my_list', value: newVal })
        }).catch(err => console.error("Failed to save privacy key on server:", err));
      } catch (e) {}
    }
  };

  const handleToggleHideManga = () => {
    const newVal = !hideMangaList;
    setHideMangaList(newVal);
    localStorage.setItem('anipr8v_hide_manga_list', String(newVal));
    
    const cachedUser = localStorage.getItem('otaku_user');
    if (cachedUser) {
      try {
        const parsed = JSON.parse(cachedUser);
        const username = parsed.username || parsed;

        // Direct Client-Side Supabase save! Full persistent parity.
        fetchDbUserProfile(username).then(profile => {
          if (profile) {
            upsertDbUserProfile({ ...profile, hide_manga_list: newVal }).catch(() => {});
          }
        }).catch(() => {});

        fetch(getApiUrl('/api/auth/save-privacy-setting'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, key: 'hide_manga_list', value: newVal })
        }).catch(err => console.error("Failed to save privacy key on server:", err));
      } catch (e) {}
    }
  };

  const handleToggleHideFavouriteSongs = () => {
    const newVal = !hideFavouriteSongs;
    setHideFavouriteSongs(newVal);
    localStorage.setItem('anipr8v_hide_favourite_songs', String(newVal));
    
    const cachedUser = localStorage.getItem('otaku_user');
    if (cachedUser) {
      try {
        const parsed = JSON.parse(cachedUser);
        const username = parsed.username || parsed;

        // Direct Client-Side Supabase save! Full persistent parity.
        fetchDbUserProfile(username).then(profile => {
          if (profile) {
            upsertDbUserProfile({ ...profile, hide_favourite_songs: newVal }).catch(() => {});
          }
        }).catch(() => {});

        fetch(getApiUrl('/api/auth/save-privacy-setting'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, key: 'hide_favourite_songs', value: newVal })
        }).catch(err => console.error("Failed to save privacy key on server:", err));
      } catch (e) {}
    }
  };

  const handleClearHistory = () => {
    localStorage.clear();
    setHistoryClearedMessage(true);
    setAutoSkipOped(false);
    setAutoplay(true);
    setProfilePrivate(false);
    setHideMangaList(false);
    setTimeout(() => {
      setHistoryClearedMessage(false);
    }, 3000);
  };

  // Parsing engine for Python-to-TypeScript compilation results
  const handleTranslate = (pythonCode: string) => {
    setPyCode(pythonCode);
    if (!pythonCode.trim()) {
      setTsCode('');
      return;
    }

    let ts = pythonCode;

    // 1. Convert Standard primitive type variables in annotations
    ts = ts.replace(/:\s*str/g, ': string');
    ts = ts.replace(/:\s*int/g, ': number');
    ts = ts.replace(/:\s*float/g, ': number');
    ts = ts.replace(/:\s*bool/g, ': boolean');
    ts = ts.replace(/:\s*dict/g, ': Record<string, any>');
    ts = ts.replace(/:\s*List\[(.*?)\]/g, ':$1[]');
    ts = ts.replace(/:\s*Dict\[(.*?),(.*?)\]/g, ': Record<$1, $2>');
    ts = ts.replace(/:\s*Optional\[(.*?)\]/g, '?: $1');

    // 2. Convert standard primitives constants
    ts = ts.replace(/:\s*bool\s*=\s*False/g, '?: boolean = false');
    ts = ts.replace(/:\s*bool\s*=\s*True/g, '?: boolean = true');
    ts = ts.replace(/None/g, 'null');
    ts = ts.replace(/True/g, 'true');
    ts = ts.replace(/False/g, 'false');

    // 3. Class schemas and constructs
    ts = ts.replace(/class\s+(\w+)\(BaseModel\):/g, 'export interface $1 {');
    ts = ts.replace(/class\s+(\w+):/g, 'export class $1 {');

    // 4. Methods & Functions
    // Special inside class constructor definitions
    ts = ts.replace(/def\s+__init__\s*\(self,\s*/g, 'constructor(');
    ts = ts.replace(/def\s+__init__\s*\(self\):/g, 'constructor() {');
    ts = ts.replace(/def\s+(\w+)\s*\(self,\s*/g, '$1(');
    ts = ts.replace(/def\s+(\w+)\s*\(self\):/g, '$1() {');

    // Free functions/async definitions
    ts = ts.replace(/async\s+def\s+(\w+)/g, 'export async function $1');
    ts = ts.replace(/def\s+(\w+)/g, 'export function $1');

    // Return arrow maps
    ts = ts.replace(/->\s*List\[(.*?)\]/g, ': $1[]');
    ts = ts.replace(/->\s*dict/g, ': Record<string, any>');
    ts = ts.replace(/->\s*str/g, ': string');
    ts = ts.replace(/->\s*int/g, ': number');
    ts = ts.replace(/->\s*float/g, ': number');
    ts = ts.replace(/->\s*bool/g, ': boolean');

    // 5. Basic statement equivalents
    ts = ts.replace(/self\./g, 'this.');
    ts = ts.replace(/print\(f'(.*?)'\)/g, 'console.log(`$1`)');
    ts = ts.replace(/print\('(.*?)'\)/g, 'console.log("$1")');
    ts = ts.replace(/print\((.*?)\)/g, 'console.log($1)');
    ts = ts.replace(/elif\s/g, 'else if ');
    ts = ts.replace(/except\s+Exception\s+as\s+(\w+):/g, 'catch ($1) {');
    ts = ts.replace(/except\s+Exception:/g, 'catch (e) {');

    // 6. Inline scopes and formatting brackets helper hints
    const lines = ts.split('\n');
    let formattedTs = '';
    let inInterface = false;

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];
      
      if (line.includes('export interface') || line.includes('export class')) {
        inInterface = true;
      }

      // Convert standard Pydantic custom annotations under model interfaces
      if (inInterface && line.includes(' = ') && !line.includes('class') && !line.includes('def') && !line.includes('constructor') && !line.includes('function')) {
        line = line.replace(/=\s*(.*?)$/, ';');
      }

      formattedTs += line + '\n';
    }

    setTsCode(formattedTs);
  };

  const handleLoadSample = (py: string) => {
    handleTranslate(py);
  };

  return (
    <div className="w-full flex flex-col gap-6 pb-16 animate-fade-in px-4 md:px-8 select-none">
      {/* Header title */}
      <div className="border-b border-red-950/20 pb-4">
        <h1 className="text-xl md:text-2xl font-black uppercase text-glow flex items-center gap-2">
          <SettingsIcon className="w-5 h-5 text-red-500" /> Control Hub
        </h1>
        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mt-0.5">
          Manipulate player preferences, skip triggers, and storage configurations
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Row section: Streaming Configurations */}
        <div className="p-5 rounded-xl border border-red-950/20 bg-[#08080a] flex flex-col gap-4">
          <h3 className="text-xs font-black uppercase text-white tracking-widest border-l-2 border-red-600 pl-2.5 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-red-500" /> Player & Skip Controls
          </h3>

          <div className="flex flex-col gap-4">
            {/* Auto Skip OP/ED Single Toggle */}
            <div className="flex items-center justify-between py-2 border-b border-zinc-900/60">
              <div>
                <h4 className="text-sm font-bold text-zinc-300">Auto Skip OP / ED</h4>
                <p className="text-[11px] text-zinc-500">Automatically fast-forwards through anime opening and ending themes</p>
              </div>
              <button
                onClick={handleToggleAutoSkip}
                className={`w-10 h-5.5 rounded-full p-0.5 transition-all duration-300 cursor-pointer outline-none ${
                  autoSkipOped ? 'bg-red-600' : 'bg-zinc-800'
                }`}
              >
                <div
                  className={`w-4.5 h-4.5 rounded-full bg-white transition-transform duration-300 ${
                    autoSkipOped ? 'translate-x-4.5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Autoplay Episodes Toggle */}
            <div className="flex items-center justify-between py-2">
              <div>
                <h4 className="text-sm font-bold text-zinc-300">Autoplay Next Episode</h4>
                <p className="text-[11px] text-zinc-500">Plays the next sequential episode automatically upon completion</p>
              </div>
              <button
                onClick={handleToggleAutoplay}
                className={`w-10 h-5.5 rounded-full p-0.5 transition-all duration-300 cursor-pointer outline-none ${
                  autoplay ? 'bg-red-600' : 'bg-zinc-800'
                }`}
              >
                <div
                  className={`w-4.5 h-4.5 rounded-full bg-white transition-transform duration-300 ${
                    autoplay ? 'translate-x-4.5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Row section: Profile & Storage */}
        <div className="p-5 rounded-xl border border-red-950/20 bg-[#08080a] flex flex-col gap-4">
          <h3 className="text-xs font-black uppercase text-white tracking-widest border-l-2 border-red-600 pl-2.5 flex items-center gap-2">
            <Shield className="w-4 h-4 text-red-500" /> profile privacy & local storage
          </h3>

          <div className="flex flex-col gap-4">
            {/* Private Tracker */}
            <div className="flex items-center justify-between py-2 border-b border-zinc-900/60">
              <div>
                <h4 className="text-sm font-bold text-zinc-300">Hide My Anime List</h4>
                <p className="text-[11px] text-zinc-500">Hides your anime watch list and scores from other users and community boards</p>
              </div>
              <button
                onClick={handleTogglePrivate}
                className={`w-10 h-5.5 rounded-full p-0.5 transition-all duration-300 cursor-pointer outline-none ${
                  profilePrivate ? 'bg-red-6/80 bg-red-600' : 'bg-zinc-800'
                }`}
              >
                <div
                  className={`w-4.5 h-4.5 rounded-full bg-white transition-transform duration-300 ${
                    profilePrivate ? 'translate-x-4.5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-zinc-900/60">
              <div>
                <h4 className="text-sm font-bold text-zinc-300">Hide My Manga List</h4>
                <p className="text-[11px] text-zinc-500">Hides your personal manga shelves from other users and public profile pages</p>
              </div>
              <button
                onClick={handleToggleHideManga}
                className={`w-10 h-5.5 rounded-full p-0.5 transition-all duration-300 cursor-pointer outline-none ${
                  hideMangaList ? 'bg-red-650' : 'bg-zinc-800'
                }`}
              >
                <div
                  className={`w-4.5 h-4.5 rounded-full bg-white transition-transform duration-300 ${
                    hideMangaList ? 'translate-x-4.5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-zinc-900/60">
              <div>
                <h4 className="text-sm font-bold text-zinc-300">Hide My Favourited Songs</h4>
                <p className="text-[11px] text-zinc-500">Hides your favourited music tracks from other users visiting your profile</p>
              </div>
              <button
                onClick={handleToggleHideFavouriteSongs}
                className={`w-10 h-5.5 rounded-full p-0.5 transition-all duration-300 cursor-pointer outline-none ${
                  hideFavouriteSongs ? 'bg-red-650' : 'bg-zinc-800'
                }`}
              >
                <div
                  className={`w-4.5 h-4.5 rounded-full bg-white transition-transform duration-300 ${
                    hideFavouriteSongs ? 'translate-x-4.5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Clear history */}
            <div className="flex items-center justify-between py-2">
              <div>
                <h4 className="text-sm font-bold text-zinc-355 text-zinc-300">Wipe Storage Cache</h4>
                <p className="text-[11px] text-zinc-500">Clears current watch positions and general UI preferences</p>
              </div>
              <button
                onClick={handleClearHistory}
                className="flex items-center gap-2 px-3.5 py-1.5 bg-red-950/20 hover:bg-red-900/20 text-red-500 border border-red-900/30 text-xs font-semibold rounded-lg transition-colors cursor-pointer outline-none"
              >
                <Trash2 className="w-3.5 h-3.5" /> Wipe Cache
              </button>
            </div>

            {historyClearedMessage && (
              <div className="flex items-center gap-2 text-xs text-red-400 font-bold bg-[#140a0a] p-3 rounded-lg border border-red-950/40 animate-fade-in mt-1">
                <CheckCircle2 className="w-4 h-4 text-red-500" />
                <span>LocalStorage cache and configurations wiped! Defaults restored.</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Decoration Store CTA */}
      <div 
        onClick={onNavigateStore}
        className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-purple-500/10 to-transparent border border-purple-500/20 rounded-2xl cursor-pointer hover:border-purple-500/40 transition-colors mt-6 group"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
            <ShoppingBag className="w-5 h-5 text-purple-500" />
          </div>
          <div className="flex flex-col">
            <h3 className="font-black text-white uppercase tracking-wider text-sm group-hover:text-purple-400 transition-colors">Decoration Store</h3>
            <span className="text-xs text-zinc-400">Spend your Otaku Coins on exclusive profile decorations.</span>
          </div>
        </div>
        <div className="flex items-center text-xs font-bold uppercase tracking-widest text-purple-500 gap-1 group-hover:gap-2 transition-all">
          Visit Store <Play className="w-3 h-3 fill-purple-500 text-purple-500" />
        </div>
      </div>

      {/* TACTILE CODEGEN: Python to TypeScript Transpiler Deck Panel */}
      <div className="p-5 md:p-6 rounded-2xl border border-red-950/20 bg-[#070709] mt-6 flex flex-col gap-6 text-left">
        
        <div className="border-b border-red-950/15 pb-3">
          <h3 className="text-sm font-black uppercase text-white tracking-widest border-l-2 border-red-650 pl-2.5 flex items-center gap-2">
            <Play className="w-4 h-4 text-red-500" /> Py-to-TS Codegen Module
          </h3>
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mt-1">
            CONVERT SENSITIVE PYTHON WEB SCRAPERS OR DATA MODELS INTO TS CODE STRUCTURES INSTANTLY
          </p>
        </div>

        {/* Quick sample loading buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500 font-mono">Load Samples:</span>
          {[
            {
              label: "Python Class Scraper",
              py: "class Scraper:\n    def __init__(self, domain: str):\n        self.domain = domain\n        self.timeout = 5000\n        \n    def get_links(self, path: str, limit: int = 10) -> List[str]:\n        print(f'Fetching path: {path}')\n        if not path:\n            return None\n        return [f'https://{self.domain}/{path}/{i}' for i in range(limit)]"
            },
            {
              label: "Pydantic Schema Model",
              py: "class AnimeDetails(BaseModel):\n    id: int\n    title: str\n    average_score: float = None\n    genres: List[str] = []\n    is_releasing: bool = False\n    episodes_count: Optional[int] = None"
            },
            {
              label: "Async API Request",
              py: "async def fetch_manifest(api_url: str) -> dict:\n    try:\n        response = await client.get(api_url)\n        meta = response.json()\n        return {\n            'status': 'success',\n            'data': meta\n        }\n    except Exception as e:\n        return {'status': 'failed', 'error': str(e)}"
            }
          ].map((sample, idx) => (
            <button
              key={idx}
              onClick={() => handleLoadSample(sample.py)}
              className="px-3 py-1.5 bg-zinc-950/80 border border-zinc-900 hover:border-red-500/20 text-[10px] font-black uppercase font-mono tracking-wide rounded-md text-zinc-400 hover:text-white cursor-pointer"
            >
              {sample.label}
            </button>
          ))}
        </div>

        {/* Editor columns split */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-mono">
          
          {/* Python input card */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-[#ef4444]">Python Source Input</label>
            <textarea
              value={pyCode}
              onChange={(e) => handleTranslate(e.target.value)}
              placeholder="# Type or paste Python code here... (Translation triggers automatically!)"
              className="w-full h-64 bg-[#030304] border border-zinc-900 focus:border-red-600 focus:ring-1 focus:ring-red-650 rounded-xl p-4 text-xs font-semibold leading-relaxed text-zinc-300 outline-none resize-none scrollbar-custom"
            />
          </div>

          {/* TS output card */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-[#10b981]">TypeScript Codegen Output</label>
            <div className="relative w-full h-64 bg-[#030304] border border-zinc-900 rounded-xl p-4 text-xs font-semibold leading-relaxed text-zinc-300 overflow-y-auto scrollbar-custom select-text selection:bg-emerald-800">
              <pre className="whitespace-pre-wrap">{tsCode || '// TS translations will populate here as you type Python source..'}</pre>
              
              {tsCode && (
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(tsCode);
                    alert("Translated TypeScript compiled block copied to clipboard!");
                  }}
                  className="absolute right-3.5 top-3.5 bg-zinc-950/80 hover:bg-zinc-900 border border-zinc-900 text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-md text-emerald-500 cursor-pointer"
                >
                  Copy TS Code
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
