/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Info } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="w-full bg-[#040405] border-t border-zinc-950 px-6 py-8 md:py-12 mt-12 pb-24 text-center">
      <div className="max-w-4xl mx-auto flex flex-col items-center gap-6">
        {/* Discord Server Icon (Placeholder) */}
        <a
          href="#discord"
          onClick={(e) => {
            e.preventDefault();
            alert('Discord community placeholder: Discord server link is active. Full server connection will deploy with community update.');
          }}
          className="group relative flex items-center justify-center w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-red-600 transition-all duration-300 transform hover:scale-110 active:scale-95 shadow-md shadow-black/80"
          title="Join Discord Community"
        >
          {/* Discord SVG */}
          <svg
            className="w-6 h-6 text-zinc-400 group-hover:text-red-500 transition-colors"
            fill="currentColor"
            viewBox="0 0 127.14 96.36"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M107.7,8.07A105.15,105.15,0,0,0,77.26,0a77.19,77.19,0,0,0-3.3,6.83A96.67,96.67,0,0,0,53.18,6.83,77.19,77.19,0,0,0,49.88,0,105.15,105.15,0,0,0,19.44,8.07C3.66,31.58-1.86,54.65,1,77.53A105.73,105.73,0,0,0,32,96.36a77.7,77.7,0,0,0,6.63-10.85,68.43,68.43,0,0,1-10.45-5c.87-.64,1.72-1.31,2.53-2a75.7,75.7,0,0,0,72.76,0c.81.7,1.66,1.37,2.53,2a68.43,68.43,0,0,1-10.45,5,77.7,77.7,0,0,0,6.63,10.85,105.73,105.73,0,0,0,32.61-18.83C129.56,49.58,123.63,26.79,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5.16-12.65,11.43-12.65S53.9,46,53.84,53,48.72,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.24,60,73.24,53S78.41,40.38,84.69,40.38,96.14,46,96.08,53,91,65.69,84.69,65.69Z" />
          </svg>
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-600 rounded-full border border-black animate-ping" />
        </a>

        {/* Disclaimer Text Container */}
        <div className="flex items-start justify-center gap-2 max-w-xl text-left bg-[#08080a] border border-red-950/20 rounded-xl p-4 shadow-inner">
          <Info className="w-5 h-5 text-[#ef4444] shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-widest mb-1">
              Terms of Service & Disclaimer
            </h4>
            <p className="text-[11px] text-zinc-500 leading-relaxed font-sans">
              Anipriv8 indexes links and meta-references via legal third-party APIs. We do not store, host, or upload any anime episodes, streaming feeds, or multimedia source clips on our servers. All video routing, stream caching, and player sources are gathered dynamically on-demand.
            </p>
          </div>
        </div>

        {/* Brand Copyright line */}
        <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-wider">
          © {new Date().getFullYear()} Anipriv8. Powered by Open Indexing.
        </span>
      </div>
    </footer>
  );
}
