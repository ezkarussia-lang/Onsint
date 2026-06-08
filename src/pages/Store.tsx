import React, { useEffect, useState } from 'react';
import { ArrowLeft, ShoppingBag, Coins, CheckCircle2 } from 'lucide-react';
import { fetchDbUserProfile, upsertDbUserProfile } from '../services/supabase';
import { DECORATIONS_STORE, getStoredUser, saveStoredUser } from '../services/store';

export default function Store({ onBack }: { onBack: () => void }) {
  const [userCoins, setUserCoins] = useState(0);
  const [purchasedDecos, setPurchasedDecos] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

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
    setLoading(false);
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
    } catch (e) {}
  };

  return (
    <div className="w-full flex justify-center pb-20 animate-fade-in relative z-10 px-4">
      <div className="max-w-5xl w-full flex flex-col gap-6">
        <div className="flex justify-between items-start">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-bold text-sm tracking-wide">Return</span>
          </button>

          <div className="flex flex-col items-end">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
              <Coins className="w-4 h-4 text-yellow-500" />
              <span className="font-mono text-sm font-black text-yellow-500">{userCoins}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-black uppercase text-white flex items-center gap-3">
            <ShoppingBag className="w-8 h-8 text-purple-500" />
            Decoration Store
          </h1>
          <p className="text-zinc-500 text-sm">Spend your Otaku Coins on exclusive profile decorations.</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20 text-purple-500">
            <ShoppingBag className="w-8 h-8 animate-pulse" />
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
            {DECORATIONS_STORE.map((deco) => {
              const owned = purchasedDecos.includes(deco.id);
              return (
                <div key={deco.id} className="relative p-5 bg-[#0a0a0c] rounded-2xl border border-zinc-900 hover:border-purple-500/50 transition-colors flex flex-col items-center gap-4 group">
                  <div className="w-24 h-24 rounded-full border border-zinc-800 bg-zinc-900 relative flex items-center justify-center shrink-0">
                    <div className="w-full h-full rounded-full bg-zinc-800/30" />
                    <img src={deco.url} className="absolute inset-0 w-[120%] h-[120%] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 object-contain pointer-events-none group-hover:scale-110 transition-transform duration-500" />
                  </div>
                  <div className="flex flex-col items-center gap-2 w-full">
                    <span className="text-sm font-black text-white uppercase tracking-widest text-center truncate w-full">{deco.label}</span>
                    {owned ? (
                      <button className="w-full mt-2 px-4 py-2.5 bg-zinc-800 text-zinc-400 text-xs font-black uppercase tracking-wider rounded-xl border border-zinc-700 cursor-not-allowed flex justify-center items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" /> Owned
                      </button>
                    ) : (
                      <button 
                        onClick={() => handlePurchaseDecoration(deco)}
                        disabled={userCoins < deco.price}
                        className={`w-full mt-2 px-4 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl border flex justify-center gap-2 items-center transition-all shadow-lg ${userCoins >= deco.price ? 'bg-purple-500 text-white border-purple-400 hover:bg-purple-400 hover:scale-105 active:scale-95' : 'bg-zinc-900 border-zinc-800 text-zinc-500 cursor-not-allowed flex-col py-1.5'}`}
                      >
                        <div className="flex items-center gap-2">
                          <Coins className="w-4 h-4" /> {deco.price}
                        </div>
                        {userCoins < deco.price && <span className="text-[9px] uppercase tracking-widest text-red-500 font-bold block">Need {deco.price - userCoins} more</span>}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
