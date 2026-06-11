import React, { useState, useEffect } from 'react';
import { Newspaper, ChevronUp, Clock, ExternalLink, Sparkles, Loader2 } from 'lucide-react';

interface ApiArticle {
  title: string;
  slug: string;
  source: string;
  excerpt: string;
  date: string;
  image: string;
  link: string;
  tags: string[];
}

export default function AnimeNews({ onBack }: { onBack?: () => void }) {
  const [filterSource, setFilterSource] = useState('All Sources');
  const [news, setNews] = useState<ApiArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [sources, setSources] = useState<string[]>(['All Sources']);

  useEffect(() => {
    async function fetchNews() {
      try {
        setLoading(true);
        const url = filterSource === 'All Sources' 
          ? 'https://aninews.vercel.app/api/news?limit=20'
          : `https://aninews.vercel.app/api/news?limit=20&source=${filterSource.toLowerCase()}`;
        
        const res = await fetch(url);
        const json = await res.json();
        
        if (json.success) {
          setNews(json.data);
          if (sources.length === 1 && json.meta?.availableSources) {
            setSources(['All Sources', ...json.meta.availableSources.map((s: string) => s.toUpperCase())]);
          }
        }
      } catch (e) {
        console.error('Failed to fetch anime news', e);
      } finally {
        setLoading(false);
      }
    }
    fetchNews();
  }, [filterSource]);

  return (
    <div className="w-full pb-24 md:pb-8 pt-4 px-4 flex flex-col gap-6 max-w-4xl mx-auto animate-fade-in relative z-10">
      
      <div className="flex flex-col gap-4 border border-zinc-900 bg-[#070709] rounded-3xl p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center border border-red-500/20">
              <Newspaper className="w-5 h-5 text-red-500" />
            </div>
            <h1 className="text-xl md:text-2xl font-black text-white">Anime News Feed</h1>
          </div>
          <button onClick={onBack} className="text-zinc-500 hover:text-white transition-colors cursor-pointer">
            <ChevronUp className="w-6 h-6" />
          </button>
        </div>
        
        <div className="flex items-center">
          <span className="px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-bold">
            {news.length} articles
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-bold text-zinc-400">Filter By Source</label>
          <div className="relative">
            <select 
              value={filterSource}
              onChange={(e) => setFilterSource(e.target.value)}
              className="w-full bg-[#070709] border border-zinc-800 rounded-xl px-4 py-3 text-white appearance-none outline-none focus:border-red-500 transition-colors font-semibold"
            >
              {sources.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
              <ChevronUp className="w-4 h-4 text-zinc-500 rotate-180" />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {news.map((article, i) => {
              // Format date nicely
              const parsedDate = new Date(article.date);
              const isToday = parsedDate.toDateString() === new Date().toDateString();
              const formattedTime = parsedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              const dateDisplay = isToday ? `Today at ${formattedTime}` : parsedDate.toLocaleDateString();

              return (
                <div key={`${article.slug}-${i}`} className="w-full bg-[#070709] border border-zinc-900 rounded-2xl overflow-hidden flex flex-col relative group">
                  <div className="w-full h-48 md:h-64 bg-zinc-900 relative flex items-center justify-center overflow-hidden">
                    {article.image ? (
                      <img src={article.image} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <Sparkles className="w-8 h-8 text-zinc-700" />
                    )}
                    <div className="absolute top-4 left-4 bg-black/80 px-3 py-1 rounded-md border border-white/10">
                      <span className="text-[10px] font-black uppercase text-white tracking-widest">{article.source}</span>
                    </div>
                  </div>
                  <div className="p-5 flex flex-col gap-3">
                    <div className="flex items-center gap-2 text-zinc-400">
                      <Clock className="w-4 h-4" />
                      <span className="text-xs font-semibold">{dateDisplay}</span>
                    </div>
                    <h3 className="text-lg md:text-xl font-bold text-white leading-snug group-hover:text-red-500 transition-colors line-clamp-2 cursor-pointer">
                      {article.title}
                    </h3>
                    {article.excerpt && (
                      <p className="text-sm text-zinc-400 line-clamp-2 mt-1">{article.excerpt}</p>
                    )}
                    <a href={article.link} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-red-500 hover:text-red-400 font-bold text-sm mt-2 transition-colors w-fit">
                      Read article <ExternalLink className="w-4 h-4" />
                    </a>
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
