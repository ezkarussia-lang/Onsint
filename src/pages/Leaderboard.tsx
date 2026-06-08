import React, { useEffect, useState } from 'react';
import { ArrowLeft, Trophy, Search, User as UserIcon } from 'lucide-react';
import { fetchAllDbUserProfiles } from '../services/supabase';
import { UserProfile, ANIME_AVATARS } from '../services/store';

export default function Leaderboard({ onBack, onOpenProfile }: { onBack: () => void, onOpenProfile: (username: string) => void }) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllDbUserProfiles().then(res => {
      const sorted = res.sort((a, b) => (b.coins || 0) - (a.coins || 0));
      setUsers(sorted);
      setLoading(false);
    });
  }, []);

  return (
    <div className="w-full flex justify-center pb-20 animate-fade-in relative z-10 px-4">
      <div className="max-w-4xl w-full flex flex-col gap-6">
        <button
          onClick={onBack}
          className="self-start flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-bold text-sm tracking-wide">Return</span>
        </button>

        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-black uppercase text-white flex items-center gap-3">
            <Trophy className="w-8 h-8 text-yellow-500" />
            Otaku Coins Leaderboard
          </h1>
          <p className="text-zinc-500 text-sm">Top currency holders ranked globally.</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20 text-red-500">
            <Search className="w-8 h-8 animate-spin" />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {users.map((user, idx) => (
              <div 
                key={idx} 
                className="flex items-center justify-between p-4 bg-[#0a0a0c] border border-zinc-900 rounded-2xl hover:border-zinc-800 transition-colors group relative overflow-hidden"
              >
                {idx === 0 && <div className="absolute inset-0 bg-yellow-500/5 mix-blend-screen pointer-events-none" />}
                {idx === 1 && <div className="absolute inset-0 bg-gray-400/5 mix-blend-screen pointer-events-none" />}
                {idx === 2 && <div className="absolute inset-0 bg-orange-700/5 mix-blend-screen pointer-events-none" />}
                <div className="flex items-center gap-4 relative z-10">
                  <div className={`w-8 font-black text-xl text-center ${idx === 0 ? 'text-yellow-500' : idx === 1 ? 'text-gray-400' : idx === 2 ? 'text-orange-700' : 'text-zinc-600'}`}>
                    #{idx + 1}
                  </div>
                  <div className="w-12 h-12 rounded-full border border-zinc-800 overflow-hidden relative opacity-100 flex items-center justify-center shrink-0">
                    <img 
                      src={user.avatar || ANIME_AVATARS[0]} 
                      alt={user.username} 
                      className="w-full h-full object-cover" 
                      referrerPolicy="no-referrer"
                    />
                    {user.decoration && (
                      <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none aspect-square h-full w-full">
                        <img 
                          src={user.decoration} 
                          className="h-[120%] w-[120%] object-contain min-h-[50px] min-w-[50px] pointer-events-none scale-100" 
                          alt="Deco" 
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col">
                    <h3 className="font-extrabold text-white text-base group-hover:text-red-400 cursor-pointer transition-colors" onClick={() => onOpenProfile(user.username)}>{user.username}</h3>
                    <span className="text-xs text-zinc-500 uppercase tracking-widest">{user.tag || 'Otaku'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 relative z-10">
                  <span className="font-mono font-black text-yellow-500 text-lg">{user.coins || 0}</span>
                  <span className="text-[10px] text-zinc-500 tracking-widest uppercase">Coins</span>
                </div>
              </div>
            ))}
            {users.length === 0 && (
              <div className="text-center py-20 text-zinc-600 font-bold uppercase tracking-widest text-sm">
                No users found.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
