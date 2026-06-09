import React from 'react';
import { Sparkles } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="w-full bg-[#070709] border-t-2 border-t-red-600/30 px-6 py-12 md:py-16 mt-12 text-left pb-32 md:pb-16 select-none relative z-10">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-12 justify-between">
        <div className="flex flex-col gap-4 max-w-sm">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-red-500" />
            </div>
            <span className="text-xl font-bold text-white tracking-widest">Anipriv8</span>
          </div>
          <p className="text-zinc-400 text-sm leading-relaxed mt-2">
            Streamlined anime discovery with curated picks, fast updates, and a community-first experience.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-12 sm:gap-24">
          <div className="flex flex-col gap-4">
            <h4 className="text-xs font-black uppercase text-zinc-300 tracking-widest mb-2">Navigation</h4>
            <a href="/music" className="text-sm font-bold text-zinc-500 hover:text-red-400 transition-colors cursor-pointer">Music</a>
            <a href="/manga" className="text-sm font-bold text-zinc-500 hover:text-red-400 transition-colors cursor-pointer">Manga</a>
            <a href="/leaderboard" className="text-sm font-bold text-zinc-500 hover:text-red-400 transition-colors cursor-pointer">Leaderboard</a>
          </div>

          <div className="flex flex-col gap-4">
            <h4 className="text-xs font-black uppercase text-zinc-300 tracking-widest mb-2">Community</h4>
            <a href="https://discord.com" className="text-sm font-bold text-zinc-500 hover:text-[#5865F2] transition-colors cursor-pointer flex items-center gap-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 127.14 96.36" xmlns="http://www.w3.org/2000/svg"><path d="M107.7,8.07A105.15,105.15,0,0,0,77.26,0a77.19,77.19,0,0,0-3.3,6.83A96.67,96.67,0,0,0,53.18,6.83,77.19,77.19,0,0,0,49.88,0,105.15,105.15,0,0,0,19.44,8.07C3.66,31.58-1.86,54.65,1,77.53A105.73,105.73,0,0,0,32,96.36a77.7,77.7,0,0,0,6.63-10.85,68.43,68.43,0,0,1-10.45-5c.87-.64,1.72-1.31,2.53-2a75.7,75.7,0,0,0,72.76,0c.81.7,1.66,1.37,2.53,2a68.43,68.43,0,0,1-10.45,5,77.7,77.7,0,0,0,6.63,10.85,105.73,105.73,0,0,0,32.61-18.83C129.56,49.58,123.63,26.79,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5.16-12.65,11.43-12.65S53.9,46,53.84,53,48.72,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.24,60,73.24,53S78.41,40.38,84.69,40.38,96.14,46,96.08,53,91,65.69,84.69,65.69Z" /></svg>
              Discord
            </a>
          </div>

          <div className="flex flex-col gap-4">
            <h4 className="text-xs font-black uppercase text-zinc-300 tracking-widest mb-2">Legal</h4>
            <a href="/tos" className="text-sm font-bold text-zinc-500 hover:text-red-400 transition-colors cursor-pointer">Terms of Service</a>
            <a href="/privacy" className="text-sm font-bold text-zinc-500 hover:text-red-400 transition-colors cursor-pointer">Privacy Policy</a>
            <a href="/dmca" className="text-sm font-bold text-zinc-500 hover:text-red-400 transition-colors cursor-pointer">DMCA</a>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto border-t border-zinc-900/50 mt-12 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-medium tracking-wide">
        <span className="text-zinc-500 font-bold inline-flex items-center gap-1.5"><span className="text-red-500">©</span> 2026 Anipriv8. All Rights Reserved.</span>
        <span className="text-zinc-600 text-center md:text-right max-w-xl font-medium">Disclaimer: Anipriv8 does not host media files. Content is provided by non-affiliated third-party sources.</span>
      </div>
    </footer>
  );
}
