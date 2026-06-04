/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useRef } from 'react';
import {
  searchManga,
  getMangaDetails,
  getMangaChapters,
  getChapterPages,
  MangaMedia,
  MangaChapter,
} from '../services/manga';
import { 
  getMyList, 
  saveMyList, 
  MyListItem, 
  addNotification 
} from '../services/store';
import AddMangaToListModal from '../components/AddMangaToListModal';
import {
  Search as SearchIcon,
  BookOpen,
  ArrowLeft,
  Star,
  ChevronRight,
  Loader2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Bookmark,
  ChevronLeft,
  Flame,
  Columns,
  RefreshCw,
  Menu,
  List,
} from 'lucide-react';

interface MangaProps {
  onBackToHome?: () => void;
  initialMangaId?: number | null;
}

export default function Manga({ onBackToHome, initialMangaId }: MangaProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [mangaList, setMangaList] = useState<MangaMedia[]>([]);
  const [trendingManga, setTrendingManga] = useState<MangaMedia[]>([]);
  const [selectedManga, setSelectedManga] = useState<MangaMedia | null>(null);
  const [chapters, setChapters] = useState<MangaChapter[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<MangaChapter | null>(null);
  const [chapterPages, setChapterPages] = useState<string[]>([]);
  const [mangaDexBUrl, setMangaDexBUrl] = useState('');
  const [mangaDexHash, setMangaDexHash] = useState('');
  
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isLoadingChapters, setIsLoadingChapters] = useState(false);
  const [isLoadingPages, setIsLoadingPages] = useState(false);
  
  const [zoomLevel, setZoomLevel] = useState(100); // % of screen width
  const [readerFit, setReaderFit] = useState<'width' | 'contain'>('width');
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [bookmarks, setBookmarks] = useState<number[]>([]);
  const [currentMangaStatus, setCurrentMangaStatus] = useState<'Reading' | 'Plantoread' | 'Onhold' | 'Completed' | 'Dropped' | 'None'>('None');
  const [isAddToListOpen, setIsAddToListOpen] = useState(false);

  // New immersive reading and progress states
  const [isReading, setIsReading] = useState(false);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [readChapters, setReadChapters] = useState<string[]>([]);
  const [chapterSearch, setChapterSearch] = useState('');
  const [chapterFilter, setChapterFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [chapterSort, setChapterSort] = useState<'oldest' | 'newest'>('newest');
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const MANGA_GENRES = ["Action", "Adventure", "Comedy", "Drama", "Fantasy", "Mystery", "Romance", "Sci-Fi", "Supernatural"];
  
  const topRef = useRef<HTMLDivElement>(null);

  // Load default trending mangas on init
  useEffect(() => {
    async function loadDefaultManga() {
      setIsLoadingList(true);
      try {
        // Fetch trending/popular manga from AniList GQL
        const res = await searchManga(1, 15, "", [], "ALL", "POPULARITY_DESC");
        setTrendingManga(res.media);
        setMangaList(res.media);
      } catch (err) {
        console.error("Manga list loading failed: ", err);
      } finally {
        setIsLoadingList(false);
      }
    }
    loadDefaultManga();
  }, []);

  // Handle Initial selection if linked from home player widget
  useEffect(() => {
    if (initialMangaId) {
      handleSelectManga(initialMangaId);
    }
  }, [initialMangaId]);

  // Sync bookmark status and read chapters when selected manga shifts
  useEffect(() => {
    if (selectedManga) {
      const list = getMyList();
      const existing = list.find(item => item.animeId === selectedManga.id && item.type === 'manga');
      if (existing) {
        setIsBookmarked(true);
        setCurrentMangaStatus(existing.status as any);
      } else {
        setIsBookmarked(false);
        setCurrentMangaStatus('None');
      }

      const saved = localStorage.getItem(`manga_read_chapters_${selectedManga.id}`);
      if (saved) {
        try {
          setReadChapters(JSON.parse(saved));
        } catch (_) {
          setReadChapters([]);
        }
      } else {
        setReadChapters([]);
      }
    } else {
      setReadChapters([]);
    }
  }, [selectedManga]);

  const toggleChapterReadStatus = (chapterId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!selectedManga) return;
    
    let newReadChapters: string[];
    if (readChapters.includes(chapterId)) {
      newReadChapters = readChapters.filter(id => id !== chapterId);
    } else {
      newReadChapters = [...readChapters, chapterId];
    }
    
    setReadChapters(newReadChapters);
    localStorage.setItem(`manga_read_chapters_${selectedManga.id}`, JSON.stringify(newReadChapters));
  };

  // Dynamic auto-searching identical to Search page with genre filter
  useEffect(() => {
    if (!searchQuery.trim() && !selectedGenre) {
      if (trendingManga.length > 0) {
        setMangaList(trendingManga);
      }
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setIsLoadingList(true);
      try {
        const genres = selectedGenre ? [selectedGenre] : [];
        const res = await searchManga(1, 20, searchQuery, genres);
        setMangaList(res.media);
      } catch (err) {
        console.error('Manga search error:', err);
      } finally {
        setIsLoadingList(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery, selectedGenre, trendingManga]);

  // Handler to select a single Manga
  const handleSelectManga = async (id: number) => {
    setIsLoadingDetails(true);
    setSelectedChapter(null);
    setChapterPages([]);
    
    try {
      const details = await getMangaDetails(id);
      setSelectedManga(details);
      
      // Auto scroll to top
      topRef.current?.scrollIntoView({ behavior: 'smooth' });
      
      // Fetch chapters from MangaDex
      setIsLoadingChapters(true);
      const chs = await getMangaChapters(details.title.userPreferred, details.title.english);
      setChapters(chs);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingDetails(false);
      setIsLoadingChapters(false);
    }
  };

  // Toggle saving to My List with custom status managers
  const handleMangaStatusChange = (status: 'Reading' | 'Plantoread' | 'Onhold' | 'Completed' | 'Dropped' | 'None') => {
    if (!selectedManga) return;
    const list = getMyList();
    const filtered = list.filter(item => !(item.animeId === selectedManga.id && item.type === 'manga'));
    
    if (status === 'None') {
      saveMyList(filtered);
      setIsBookmarked(false);
      setCurrentMangaStatus('None');
      
      addNotification({
        category: 'Community',
        userName: 'Manga Tracker',
        userProfile: selectedManga.coverImage.large,
        title: `Purged "${selectedManga.title.english || selectedManga.title.userPreferred}" from Watchlist`,
        subtitle: `Shelf logs successfully cleared.`,
      });
      return;
    }

    const updated: MyListItem = {
      animeId: selectedManga.id,
      animeTitle: selectedManga.title.english || selectedManga.title.userPreferred,
      animeCover: selectedManga.coverImage.extraLarge || selectedManga.coverImage.large,
      status: status,
      addedAt: new Date().toISOString(),
      type: 'manga'
    };

    saveMyList([...filtered, updated]);
    setIsBookmarked(true);
    setCurrentMangaStatus(status);

    addNotification({
      category: 'Community',
      userName: 'Manga Tracker',
      userProfile: selectedManga.coverImage.large,
      title: `Added "${selectedManga.title.english || selectedManga.title.userPreferred}" to ${status} Library`,
      subtitle: `Shelf listings synced to profile.`,
    });
  };

  const toggleBookmark = () => {
    if (isBookmarked) {
      handleMangaStatusChange('None');
    } else {
      handleMangaStatusChange('Reading');
    }
  };

  // Select a chapter to read
  const handleSelectChapter = async (chapter: MangaChapter, pageIndexToStart: number = 0) => {
    setSelectedChapter(chapter);
    setIsLoadingPages(true);
    setChapterPages([]);
    
    try {
      const res = await getChapterPages(chapter.id);
      if (res) {
        setMangaDexBUrl(res.baseUrl);
        setMangaDexHash(res.hash);
        setChapterPages(res.pages);
        
        setIsReading(true);
        setCurrentPageIndex(pageIndexToStart);
        
        // Save reading progress in local storage
        if (selectedManga) {
          localStorage.setItem(`manga_progress_${selectedManga.id}`, JSON.stringify({
            chapterId: chapter.id,
            chapterNo: chapter.chapter,
            chapterTitle: chapter.title,
            pageIndex: pageIndexToStart,
            timestamp: Date.now()
          }));
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingPages(false);
    }
  };

  const loadNextChapter = () => {
    if (selectedChapter && chapters.length > 0) {
      const sortedChs = [...chapters];
      if (chapterSort === 'newest') {
        const currentIndex = sortedChs.findIndex(c => c.id === selectedChapter.id);
        if (currentIndex > 0) {
          handleSelectChapter(sortedChs[currentIndex - 1], 0);
          setTimeout(() => {
            const container = document.querySelector('.manga-reader-container');
            if (container) container.scrollTop = 0;
          }, 150);
        } else {
          alert('Congratulations! You finished the last chapter.');
        }
      } else {
        const currentIndex = sortedChs.findIndex(c => c.id === selectedChapter.id);
        if (currentIndex !== -1 && currentIndex < sortedChs.length - 1) {
          handleSelectChapter(sortedChs[currentIndex + 1], 0);
          setTimeout(() => {
            const container = document.querySelector('.manga-reader-container');
            if (container) container.scrollTop = 0;
          }, 150);
        } else {
          alert('Congratulations! You finished the last chapter.');
        }
      }
    }
  };

  const loadPrevChapter = () => {
    if (selectedChapter && chapters.length > 0) {
      const sortedChs = [...chapters];
      if (chapterSort === 'newest') {
        const currentIndex = sortedChs.findIndex(c => c.id === selectedChapter.id);
        if (currentIndex !== -1 && currentIndex < sortedChs.length - 1) {
          handleSelectChapter(sortedChs[currentIndex + 1], 0);
          setTimeout(() => {
            const container = document.querySelector('.manga-reader-container');
            if (container) container.scrollTop = 0;
          }, 155);
        } else {
          alert('This is the first chapter.');
        }
      } else {
        const currentIndex = sortedChs.findIndex(c => c.id === selectedChapter.id);
        if (currentIndex > 0) {
          handleSelectChapter(sortedChs[currentIndex - 1], 0);
          setTimeout(() => {
            const container = document.querySelector('.manga-reader-container');
            if (container) container.scrollTop = 0;
          }, 155);
        } else {
          alert('This is the first chapter.');
        }
      }
    }
  };

  const scrollToPage = (index: number) => {
    if (index >= 0 && index < chapterPages.length) {
      const targetEl = document.querySelector(`[data-index="${index}"]`);
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setCurrentPageIndex(index);
      }
    }
  };

  const handleNextPage = () => {
    if (currentPageIndex < chapterPages.length - 1) {
      scrollToPage(currentPageIndex + 1);
    } else {
      loadNextChapter();
    }
  };

  const handlePrevPage = () => {
    if (currentPageIndex > 0) {
      scrollToPage(currentPageIndex - 1);
    } else {
      loadPrevChapter();
    }
  };

  // IntersectionObserver to dynamically track which page is in view and auto-complete
  useEffect(() => {
    if (!isReading || chapterPages.length === 0 || !selectedManga || !selectedChapter) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = Number(entry.target.getAttribute('data-index'));
            if (!isNaN(index)) {
              setCurrentPageIndex(index);

              // Dynamically save progress
              localStorage.setItem(`manga_progress_${selectedManga.id}`, JSON.stringify({
                chapterId: selectedChapter.id,
                chapterNo: selectedChapter.chapter,
                chapterTitle: selectedChapter.title,
                pageIndex: index,
                timestamp: Date.now()
              }));

              // If they scroll to the extremely last page of the chapter, mark it as completed
              if (index === chapterPages.length - 1) {
                if (!readChapters.includes(selectedChapter.id)) {
                  const newReadChapters = [...readChapters, selectedChapter.id];
                  setReadChapters(newReadChapters);
                  localStorage.setItem(`manga_read_chapters_${selectedManga.id}`, JSON.stringify(newReadChapters));
                }
              }
            }
          }
        });
      },
      {
        root: null, // observation relative to viewport
        rootMargin: '-30% 0px -40% 0px', // active central reading focal zone
        threshold: 0.1
      }
    );

    const timer = setTimeout(() => {
      const pageElements = document.querySelectorAll('.manga-scroll-page');
      pageElements.forEach((el) => observer.observe(el));
    }, 300);

    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [isReading, chapterPages, selectedManga, selectedChapter, readChapters]);

  // Keyboard controls for convenient arrow page snappings
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }
      if (!isReading) return;
      if (e.key === 'ArrowRight') {
        handleNextPage();
      } else if (e.key === 'ArrowLeft') {
        handlePrevPage();
      } else if (e.key === 'Escape') {
        setIsReading(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isReading, currentPageIndex, chapterPages]);

  const navigateChapter = (direction: 'next' | 'prev') => {
    if (direction === 'next') handleNextPage();
    else handlePrevPage();
  };

  const getSavedProgress = (mangaId: number) => {
    const prog = localStorage.getItem(`manga_progress_${mangaId}`);
    if (prog) {
      try {
        return JSON.parse(prog);
      } catch (_) {}
    }
    return null;
  };

  // Gather Continue Reading dynamic list
  const continueReadingShelf = (() => {
    const list = getMyList().filter(item => item.type === 'manga');
    const itemsWithProgress: { mangaId: number; title: string; cover: string; progress: any }[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('manga_progress_')) {
        const mangaId = Number(key.replace('manga_progress_', ''));
        if (!isNaN(mangaId)) {
          try {
            const progress = JSON.parse(localStorage.getItem(key) || '');
            const matchingListItem = list.find(item => item.animeId === mangaId);
            const title = matchingListItem?.animeTitle || `Manga #${mangaId}`;
            const cover = matchingListItem?.animeCover || "";
            if (progress) {
              itemsWithProgress.push({ mangaId, title, cover, progress });
            }
          } catch (_) {}
        }
      }
    }
    
    itemsWithProgress.sort((a, b) => (b.progress.timestamp || 0) - (a.progress.timestamp || 0));
    return itemsWithProgress;
  })();

  if (isReading && selectedChapter) {
    return (
      <div className="fixed inset-0 bg-[#040406] text-[#f4f4f5] z-[9999] overflow-hidden flex flex-col select-none animate-fadeIn">
        
        {/* Immersive Reader Header bar with snap buttons and page index dropdown */}
        <div className="w-full h-16 bg-[#09090b]/95 backdrop-blur-md border-b border-zinc-900/80 px-4 md:px-8 flex items-center justify-between z-50 shrink-0 select-none">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsReading(false)}
              className="p-2 bg-zinc-900/60 hover:bg-zinc-800 border border-zinc-850 hover:border-zinc-700 text-zinc-300 hover:text-white rounded-lg active:scale-95 transition-all text-xs flex items-center gap-1.5 cursor-pointer leading-none font-bold uppercase tracking-wider"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-red-500" /> Back
            </button>
            <div className="h-4 w-[1px] bg-zinc-850 mx-2 hidden md:block" />
            <h2 className="text-xs md:text-sm font-black text-zinc-100 uppercase tracking-widest line-clamp-1 max-w-[140px] md:max-w-md">
              {selectedManga?.title.english || selectedManga?.title.userPreferred} — CH {selectedChapter.chapter}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={handlePrevPage}
              className="p-2 bg-zinc-900/60 hover:bg-zinc-800 border border-zinc-850 hover:border-zinc-700 rounded-lg text-zinc-400 hover:text-white cursor-pointer active:scale-95 transition-all"
              title="Previous Page (ArrowLeft)"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            <div className="flex items-center gap-1 bg-zinc-950/80 px-3 py-1.5 border border-zinc-900 rounded-lg text-[10px] font-black font-mono tracking-widest text-zinc-300">
              <span className="text-red-500 uppercase">Page {currentPageIndex + 1}</span>
              <span className="text-zinc-650">/{chapterPages.length}</span>
            </div>

            <button 
              onClick={handleNextPage}
              className="p-2 bg-zinc-900/60 hover:bg-zinc-800 border border-zinc-850 hover:border-zinc-700 rounded-lg text-zinc-400 hover:text-white cursor-pointer active:scale-95 transition-all"
              title="Next Page (ArrowRight)"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Reader Canvas Space - Continuous Vertical Scroll container */}
        <div className="flex-1 w-full bg-[#050507] overflow-y-auto overflow-x-hidden relative py-6 px-4 scrollbar-thin scrollbar-thumb-zinc-800 manga-reader-container">
          {isLoadingPages ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#050507]">
              <Loader2 className="w-10 h-10 text-red-600 animate-spin" />
              <span className="text-zinc-550 text-[10px] font-black font-mono uppercase tracking-widest">
                STREAMING CANVASES...
              </span>
            </div>
          ) : chapterPages.length === 0 ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center max-w-sm mx-auto p-6 gap-3">
              <span className="text-red-500 font-black text-sm uppercase tracking-widest border border-red-500/20 px-3 py-1 rounded bg-red-950/20">
                PAGES DECODING BLOCKED
              </span>
              <p className="text-zinc-400 text-xs">
                MangaDex backend returned empty pages or has CORS access blocks. Please retry in a few seconds!
              </p>
              <button 
                onClick={() => setIsReading(false)}
                className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-bold text-zinc-300 rounded-lg hover:text-white transition-all cursor-pointer"
              >
                Back to Dashboard
              </button>
            </div>
          ) : (
            <div className="max-w-[760px] mx-auto w-full flex flex-col items-center py-4">
              
              {/* Continuous stream of pages */}
              <div className="w-full flex flex-col gap-6 select-none max-w-full">
                {chapterPages.map((filename, index) => {
                  // Direct loads from MangaDex CDN via referrerPolicy="no-referrer" to prevent expensive serverless transfer timeouts
                  const url = `${mangaDexBUrl}/data/${mangaDexHash}/${filename}`;
                  return (
                    <div
                      key={index}
                      data-index={index}
                      className="manga-scroll-page w-full flex flex-col items-center relative"
                    >
                      {mangaDexBUrl && mangaDexHash && filename ? (
                        <img
                          src={url}
                          alt={`Page ${index + 1}`}
                          className="w-full h-auto object-contain select-none shadow-2xl border border-zinc-900 transition-all rounded-sm pointer-events-none bg-zinc-950"
                          referrerPolicy="no-referrer"
                          loading={index < 3 ? "eager" : "lazy"}
                          onError={(e) => {
                            const target = e.currentTarget;
                            const currentSrc = target.getAttribute('src') || "";
                            const directUrl = `${mangaDexBUrl}/data/${mangaDexHash}/${filename}`;
                            const weservUrl = `https://images.weserv.nl/?url=${encodeURIComponent(directUrl)}`;
                            const serverProxyUrl = `/api/mangadex-uploads/data/${mangaDexHash}/${filename}?baseUrl=${encodeURIComponent(mangaDexBUrl)}`;

                            if (currentSrc === directUrl) {
                              target.setAttribute('src', weservUrl);
                            } else if (currentSrc === weservUrl) {
                              target.setAttribute('src', serverProxyUrl);
                            }
                          }}
                        />
                      ) : (
                        <div className="w-full h-96 border border-zinc-850 rounded flex items-center justify-center text-zinc-550 text-xs bg-zinc-950">
                          Generating Page URL...
                        </div>
                      )}
                      
                      {/* Subdued footer divider details inside the stream */}
                      <div className="w-full flex items-center justify-between px-3 py-2 bg-zinc-950/40 border-t border-zinc-900/60 rounded-b-sm select-none">
                        <span className="text-[9px] font-black font-mono text-zinc-500 uppercase tracking-widest">
                          PAGE {index + 1}
                        </span>
                        <span className="text-[9px] font-bold font-mono text-zinc-650 truncate max-w-[200px] md:max-w-xs">
                          {selectedManga?.title.english || selectedManga?.title.userPreferred} — CH {selectedChapter.chapter}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Enhanced End of Chapter Actions Bar */}
              <div className="w-full mt-12 p-6 bg-zinc-950/90 border border-zinc-900 rounded-2xl flex flex-col items-center text-center gap-4 select-none">
                <div className="flex flex-col gap-1">
                  <span className="text-zinc-200 font-black text-xs md:text-sm uppercase tracking-widest">
                    Chapter Complete!
                  </span>
                  <p className="text-zinc-500 text-xs max-w-md">
                    You have finished reading Chapter {selectedChapter.chapter} of {selectedManga?.title.english || selectedManga?.title.userPreferred}.
                  </p>
                </div>
                
                <div className="flex items-center gap-3 mt-1">
                  <button
                    onClick={loadPrevChapter}
                    className="px-4 py-2 border border-zinc-850 hover:border-zinc-700 bg-zinc-900/40 text-xs font-bold text-zinc-350 hover:text-white rounded-xl cursor-pointer flex items-center gap-1.5 transition-all"
                  >
                    <ChevronLeft className="w-4 h-4 text-red-500" /> Prev Chapter
                  </button>

                  <button
                    onClick={() => setIsReading(false)}
                    className="px-4 py-2 border border-zinc-850 hover:border-zinc-700 bg-zinc-900/40 text-xs font-bold text-zinc-355 text-zinc-350 hover:text-white rounded-xl cursor-pointer transition-all"
                  >
                    Dashboard
                  </button>

                  <button
                    onClick={loadNextChapter}
                    className="px-5 py-2.5 bg-red-650 hover:bg-red-700 text-white shadow-lg shadow-red-650/10 text-xs font-black uppercase tracking-wider rounded-xl cursor-pointer flex items-center gap-1.5 transition-all"
                  >
                    Next Chapter <ChevronRight className="w-4 h-4 text-white" />
                  </button>
                </div>
              </div>

            </div>
          )}
        </div>

        {/* Global floating progress bar */}
        <div className="w-full h-1 bg-zinc-900 relative">
          <div 
            className="h-full bg-red-600 transition-all duration-300"
            style={{ width: `${((currentPageIndex + 1) / chapterPages.length) * 100}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div ref={topRef} className="w-full min-h-screen bg-[#040405] text-[#f4f4f5] pb-24 px-4 md:px-8 select-none">
      
      {/* 1. Header Back trigger action */}
      {selectedManga && (
        <button
          onClick={() => {
            setSelectedManga(null);
            setSelectedChapter(null);
            setChapters([]);
          }}
          className="flex items-center gap-2 mb-6 px-4 py-2 bg-zinc-900 border border-zinc-800 hover:border-red-500/40 text-xs font-bold tracking-wider text-zinc-300 hover:text-white uppercase rounded-lg transition-all cursor-pointer shadow-md"
        >
          <ArrowLeft className="w-4 h-4 text-red-500" /> Back to Manga List
        </button>
      )}

      {/* RENDER VIEW A: Manga List search / catalog discover overview */}
      {!selectedManga && (
        <div className="flex flex-col gap-8">
          
          {/* Header Title Accent */}
          <div className="flex flex-col gap-1 border-b border-red-950/20 pb-4">
            <div className="flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-red-500 animate-pulse" />
              <h1 className="text-2xl md:text-3xl font-black uppercase tracking-wider text-white">
                Manga Reader Center
              </h1>
            </div>
            <p className="text-xs text-zinc-500 font-bold tracking-widest uppercase">
              Anipriv8 Dedicated Manga Page
            </p>
          </div>

          {/* Search form bar container */}
          <div className="relative w-full max-w-xl">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Type manga title or keyword... (e.g., Solo Leveling)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-[#08080a] hover:bg-[#0c0c0f]/80 focus:bg-[#0c0c0f] border border-zinc-900 focus:border-red-650 rounded-xl text-xs placeholder-zinc-550 text-white outline-none transition-all font-mono"
            />
          </div>

          {/* Quick Genre Chips Filter Section */}
          <div className="flex flex-col gap-2.5 text-left">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
              Quick Genre Filters
            </span>
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none flex-wrap">
              <button
                onClick={() => setSelectedGenre(null)}
                className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border cursor-pointer ${
                  !selectedGenre
                    ? 'bg-red-600 border-red-500/30 text-white shadow-md shadow-red-600/20'
                    : 'bg-[#08080a] border-zinc-900 text-zinc-400 hover:text-white hover:border-zinc-800'
                }`}
              >
                All Genres
              </button>
              {MANGA_GENRES.map((genre) => (
                <button
                  key={genre}
                  onClick={() => setSelectedGenre(genre === selectedGenre ? null : genre)}
                  className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border cursor-pointer ${
                    selectedGenre === genre
                      ? 'bg-red-600 border-red-500/30 text-white shadow-md shadow-red-600/20'
                      : 'bg-[#08080a] border-zinc-900 text-zinc-400 hover:text-white hover:border-zinc-800'
                  }`}
                >
                  {genre}
                </button>
              ))}
            </div>
          </div>

          {/* Continue Reading Shelf Section */}
          {continueReadingShelf.length > 0 && (
            <div className="flex flex-col gap-4 bg-[#07070a]/40 border border-zinc-900/60 rounded-2xl p-4 md:p-6 text-left">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-red-550 text-red-500 animate-pulse" />
                <h2 className="text-sm font-black uppercase tracking-widest text-white">
                  Continue Reading
                </h2>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {continueReadingShelf.slice(0, 3).map((item) => (
                  <div
                    key={item.mangaId}
                    onClick={async () => {
                      setIsLoadingDetails(true);
                      setSelectedChapter(null);
                      setChapterPages([]);
                      try {
                        const details = await getMangaDetails(item.mangaId);
                        setSelectedManga(details);
                        setIsLoadingChapters(true);
                        const chs = await getMangaChapters(details.title.userPreferred, details.title.english);
                        setChapters(chs);
                        
                        const matchingCh = chs.find(c => c.id === item.progress.chapterId);
                        if (matchingCh) {
                          handleSelectChapter(matchingCh, item.progress.pageIndex || 0);
                        } else {
                          handleSelectChapter({
                            id: item.progress.chapterId,
                            chapter: item.progress.chapterNo,
                            title: item.progress.chapterTitle,
                            pages: 0,
                            publishAt: ""
                          }, item.progress.pageIndex || 0);
                        }
                      } catch (err) {
                        console.error(err);
                      } finally {
                        setIsLoadingDetails(false);
                        setIsLoadingChapters(false);
                      }
                    }}
                    className="group bg-[#0c0c0f] border border-zinc-850 hover:border-red-500/30 rounded-xl p-3 flex items-center gap-3 cursor-pointer transition-all hover:scale-[1.01]"
                  >
                    {item.cover ? (
                      <img
                        src={item.cover}
                        alt="cover"
                        className="w-12 h-16 object-cover rounded-md border border-zinc-800 shrink-0"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-12 h-16 rounded-md bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0">
                        <BookOpen className="w-5 h-5 text-zinc-500" />
                      </div>
                    )}
                    
                    <div className="flex flex-col min-w-0 flex-1">
                      <h3 className="text-xs font-black text-white group-hover:text-red-500 transition-colors truncate">
                        {item.title}
                      </h3>
                      <span className="text-[10px] font-bold text-zinc-500 uppercase mt-1 leading-none">
                        Chapter {item.progress.chapterNo} • Page {item.progress.pageIndex + 1}
                      </span>
                      <span className="text-[9px] font-bold text-red-500 uppercase tracking-widest mt-2 leading-none">
                        Resume Reading ⇾
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Catalog grid loader */}
          {isLoadingList ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="w-10 h-10 text-red-600 animate-spin" />
              <span className="text-xs font-bold uppercase tracking-widest text-zinc-500">
                QUERYING MANGA ARCHIVES...
              </span>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              <h2 className="text-base font-black uppercase tracking-widest text-white border-l-4 border-red-600 pl-3">
                {searchQuery ? `Search Results for "${searchQuery}"` : 'Trending Manga Catalog'}
              </h2>
              
              {mangaList.length === 0 ? (
                <div className="text-center py-16 text-zinc-500 text-sm font-semibold uppercase tracking-wider">
                  No matching manga title found. Search for other keywords!
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                  {mangaList.map((manga) => {
                    const rating = manga.averageScore ? (manga.averageScore / 10).toFixed(1) : null;
                    const formatText = manga.format || 'MANGA';
                    return (
                      <div
                        key={manga.id}
                        onClick={() => handleSelectManga(manga.id)}
                        className="group flex flex-col h-full cursor-pointer select-none transition-all duration-300"
                      >
                        {/* Cover Image */}
                        <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-zinc-950 border border-zinc-900 hover:border-red-500/40 shadow-lg transition-all duration-300">
                          <img
                            src={manga.coverImage.extraLarge || manga.coverImage.large}
                            alt={manga.title.userPreferred || 'Manga'}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                            loading="lazy"
                            referrerPolicy="no-referrer"
                          />
                          {rating && (
                            <div className="absolute top-2 left-2 bg-black/80 backdrop-blur-md rounded-full px-2 py-1 flex items-center gap-1 border border-white/5">
                              <Star className="w-3 h-3 text-[#facc15] fill-[#facc15]" />
                              <span className="text-[10px] font-black text-[#facc15] font-mono leading-none">
                                {rating}
                              </span>
                            </div>
                          )}
                          <div className="absolute bottom-2 right-2 bg-black/80 backdrop-blur-md text-[9px] font-black font-mono px-2 py-1 rounded-sm border border-white/5 text-zinc-300">
                            {formatText}
                          </div>
                        </div>

                        {/* Text Infos */}
                        <div className="pt-3 text-left">
                          <h3 className="text-[12.5px] font-black text-white group-hover:text-red-500 transition-colors line-clamp-2 leading-snug">
                            {manga.title.english || manga.title.userPreferred}
                          </h3>
                          <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest font-mono mt-0.5">
                            {manga.chapters ? `${manga.chapters} Chapters` : 'Ongoing status'}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* RENDER VIEW B: Dedicated Manga Details Layout */}
      {selectedManga && (
        <div className="flex flex-col gap-8 animate-fade-in text-left">
          
          {/* Cover Hero Banner background section identical to Details.tsx */}
          <div className="relative w-full min-h-[380px] md:min-h-[460px] flex items-end pb-8 rounded-2xl overflow-hidden border border-red-950/20 shadow-2xl">
            {/* Banner image background with fine details */}
            <div className="absolute inset-0 overflow-hidden">
              <img
                src={selectedManga.bannerImage || selectedManga.coverImage.extraLarge}
                alt={selectedManga.title.userPreferred || 'Cover Wallpaper'}
                className="w-full h-full object-cover filter brightness-[0.22] scale-102 transform blur-[8px] md:blur-0"
                referrerPolicy="no-referrer"
              />
              {/* Layered vignette premium gradients */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#040405] via-[#040405]/85 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#040405] to-transparent" />
            </div>

            {/* Hero Title & Primary Overview Area */}
            <div className="relative w-full max-w-7xl mx-auto px-4 md:px-8 pt-16 z-10 grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
              
              {/* Main vertical poster column */}
              <div className="md:col-span-3 flex justify-center md:justify-start shrink-0">
                <div className="w-40 md:w-full max-w-[200px] aspect-[3/4] rounded-2xl overflow-hidden bg-zinc-950 border-2 border-zinc-800 shadow-2xl">
                  <img
                    src={selectedManga.coverImage.extraLarge || selectedManga.coverImage.large}
                    alt={selectedManga.title.userPreferred || 'Manga Cover'}
                    className="w-full h-full object-cover hover:scale-103 transition-all duration-500"
                    referrerPolicy="no-referrer"
                  />
                </div>
              </div>

              {/* Right hand side titles, tags, and summary description */}
              <div className="md:col-span-9 flex flex-col gap-3 md:gap-4 text-center md:text-left">
                <div className="flex items-center gap-2 flex-wrap justify-center md:justify-start">
                  <span className="bg-red-600 text-white text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-sm">
                    {selectedManga.format || 'MANGA'}
                  </span>
                  <span className="text-xs text-zinc-400 font-bold">
                    Released in {selectedManga.seasonYear || 'Unknown'}
                  </span>
                  {selectedManga.averageScore && (
                    <span className="flex items-center gap-1 text-[#facc15] font-mono text-xs font-bold bg-yellow-950/15 border border-yellow-500/25 px-2 py-0.5 rounded-full">
                      <Star className="w-3.5 h-3.5 fill-[#facc15]" />
                      {(selectedManga.averageScore/10).toFixed(1)} / 10
                    </span>
                  )}
                </div>

                <h1 className="text-2xl md:text-4xl font-black text-white tracking-tight leading-tight">
                  {selectedManga.title.english || selectedManga.title.userPreferred}
                </h1>

                <p className="text-red-500 italic font-extrabold text-xs md:text-sm tracking-wide">
                  {selectedManga.title.native} • {selectedManga.title.romaji}
                </p>
              </div>
            </div>
          </div>

          {/* Action trigger deck: Bookmark lists / reading state */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setIsAddToListOpen(true)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg border text-xs font-extrabold uppercase tracking-widest cursor-pointer transition-all transform hover:scale-103 active:scale-97 ${
                isBookmarked
                  ? 'bg-red-955/20 text-red-500 border-red-500/40 hover:bg-red-955/35'
                  : 'bg-zinc-900 border-zinc-800 hover:border-red-500/40 text-white'
              }`}
            >
              <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-red-500' : ''}`} />
              {isBookmarked ? `Library Status: ${currentMangaStatus === 'Plantoread' ? 'Plan to Read' : currentMangaStatus}` : 'Add to My List'}
            </button>

            {/* Start Reading or Resume Reading Chapter selection matching Screenshot 1/2 */}
            {getSavedProgress(selectedManga.id) ? (
              <button
                onClick={() => {
                  const saved = getSavedProgress(selectedManga.id);
                  const matchingCh = chapters.find(c => c.id === saved.chapterId);
                  if (matchingCh) {
                    handleSelectChapter(matchingCh, saved.pageIndex || 0);
                  } else {
                    handleSelectChapter({
                      id: saved.chapterId,
                      chapter: saved.chapterNo,
                      title: saved.chapterTitle,
                      pages: 0,
                      publishAt: ""
                    }, saved.pageIndex || 0);
                  }
                }}
                className="flex items-center gap-2 px-5 py-2.5 bg-red-650 hover:bg-red-700 text-white text-xs font-extrabold uppercase tracking-widest rounded-lg cursor-pointer transition-all transform hover:scale-103 active:scale-97 shadow-lg shadow-red-650/40"
              >
                <BookOpen className="w-4 h-4" /> Resume Reading Chapter {getSavedProgress(selectedManga.id).chapterNo}
              </button>
            ) : (
              chapters.length > 0 && (
                <button
                  onClick={() => {
                    const sortedChapters = [...chapters].sort((a, b) => parseFloat(a.chapter || '0') - parseFloat(b.chapter || '0'));
                    if (sortedChapters[0]) {
                      handleSelectChapter(sortedChapters[0], 0);
                    }
                  }}
                  className="flex items-center gap-2 px-5 py-2.5 bg-red-650 hover:bg-red-700 text-white text-xs font-extrabold uppercase tracking-widest rounded-lg cursor-pointer transition-all transform hover:scale-103 active:scale-97 shadow-lg shadow-red-650/40"
                >
                  <BookOpen className="w-4 h-4" /> Start Reading
                </button>
              )
            )}
          </div>

          {/* Information & synopsis details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                       {/* Left Col: Chapters index list panel matching Screenshot 2 */}
            <div className="md:col-span-1 bg-[#070709] border border-zinc-900/60 rounded-2xl p-5 flex flex-col gap-4 max-h-[680px]">
              {/* Header matching Screenshot 2 */}
              <div className="flex items-center gap-2 border-b border-zinc-900 pb-3">
                <Menu className="w-5 h-5 text-zinc-400" />
                <span className="text-base font-black text-white">Chapters</span>
                <span className="text-xs text-zinc-500 font-medium">({chapters.length} chapters)</span>
              </div>

              {/* Search chapters by number or title... matching Screenshot 2 */}
              <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Search chapters by number or title..."
                  value={chapterSearch}
                  onChange={(e) => setChapterSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-[#040405] border border-zinc-850 rounded-xl text-xs placeholder-zinc-500 text-white outline-none focus:border-red-650 transition-all"
                />
              </div>

              {/* 3 Filters buttons: All, Unread, Read matching Screenshot 2 */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setChapterFilter('all')}
                  className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                    chapterFilter === 'all'
                      ? 'bg-[#121216] border-zinc-700 text-white shadow-md shadow-black/40'
                      : 'bg-[#040405] border-zinc-900 text-zinc-400 hover:text-white hover:border-zinc-800'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setChapterFilter('unread')}
                  className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                    chapterFilter === 'unread'
                      ? 'bg-[#121216] border-zinc-700 text-white shadow-md shadow-black/40'
                      : 'bg-[#040405] border-zinc-900 text-zinc-400 hover:text-white hover:border-zinc-800'
                  }`}
                >
                  Unread
                </button>
                <button
                  onClick={() => setChapterFilter('read')}
                  className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                    chapterFilter === 'read'
                      ? 'bg-[#121216] border-zinc-700 text-white shadow-md shadow-black/40'
                      : 'bg-[#040405] border-zinc-900 text-zinc-400 hover:text-white hover:border-zinc-800'
                  }`}
                >
                  Read
                </button>
              </div>

              {/* Sorting button: Oldest First / Newest First matching Screenshot 2 */}
              <div>
                <button
                  onClick={() => setChapterSort(prev => prev === 'oldest' ? 'newest' : 'oldest')}
                  className="w-full text-left py-1.5 px-3 bg-[#040405] border border-zinc-900 text-zinc-400 hover:text-white rounded-lg text-xs font-bold transition-all flex items-center justify-between cursor-pointer"
                >
                  <span>{chapterSort === 'oldest' ? 'Oldest First ↴' : 'Newest First ↴'}</span>
                </button>
              </div>

              {/* Loader list states */}
              {isLoadingChapters ? (
                <div className="flex flex-col items-center justify-center py-24 gap-2">
                  <Loader2 className="w-6 h-6 text-red-600 animate-spin" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">
                    RESOLVING CHAPTER REELS...
                  </span>
                </div>
              ) : chapters.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
                  <span className="text-zinc-650 text-[11px] font-bold uppercase tracking-wider">
                    No English chapters mapped yet for this title.
                  </span>
                  <button
                    onClick={() => handleSelectManga(selectedManga.id)}
                    className="flex items-center gap-1 px-3 py-1 bg-zinc-900 border border-zinc-800 text-[10px] font-black text-zinc-300 rounded-sm hover:border-red-500/20"
                  >
                    <RefreshCw className="w-3 h-3 text-red-500" /> Retry syncer
                  </button>
                </div>
              ) : (
                <div className="flex-grow overflow-y-auto space-y-1.5 pr-1 scrollbar-custom">
                  {(() => {
                    const processedChapters = [...chapters]
                      .filter(ch => {
                        if (chapterSearch.trim()) {
                          const term = chapterSearch.toLowerCase();
                          const chNo = (ch.chapter || '').toLowerCase();
                          const chTitle = (ch.title || '').toLowerCase();
                          return chNo.includes(term) || chTitle.includes(term);
                        }
                        return true;
                      })
                      .filter(ch => {
                        const isRead = readChapters.includes(ch.id);
                        if (chapterFilter === 'unread') return !isRead;
                        if (chapterFilter === 'read') return isRead;
                        return true;
                      });

                    processedChapters.sort((a, b) => {
                      const aNum = parseFloat(a.chapter || '0');
                      const bNum = parseFloat(b.chapter || '0');
                      return chapterSort === 'oldest' ? aNum - bNum : bNum - aNum;
                    });

                    if (processedChapters.length === 0) {
                      return (
                        <div className="text-center py-12 text-zinc-500 text-xs font-semibold uppercase tracking-wider">
                          No matching chapters on current filter.
                        </div>
                      );
                    }

                    return processedChapters.map((ch, idx) => {
                      const isNowPlaying = selectedChapter?.id === ch.id;
                      const hasRead = readChapters.includes(ch.id);
                      return (
                        <div
                          key={`${ch.id}-${idx}`}
                          onClick={() => handleSelectChapter(ch)}
                          className={`w-full flex items-center justify-between p-3 rounded-lg text-left transition-all text-xs border outline-none cursor-pointer ${
                            isNowPlaying
                              ? 'bg-red-955/25 border-red-500/50 text-red-400 font-extrabold scale-[0.99]'
                              : 'bg-zinc-950/60 border-zinc-900/60 hover:bg-[#0c0c0f]/85 hover:border-zinc-850'
                          }`}
                        >
                          <div className="flex flex-col gap-0.5 pr-2 truncate">
                            <span className={isNowPlaying ? 'text-red-500 font-extrabold' : 'text-zinc-200 font-extrabold'}>
                              Chapter {ch.chapter}
                            </span>
                            {ch.title && (
                              <span className="text-[10px] font-medium text-zinc-500 truncate max-w-[130px]">
                                {ch.title}
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-3 shrink-0 select-none font-mono">
                            <span className="text-[11px] text-zinc-500 font-bold uppercase tracking-wider">
                              {ch.pages || '0'} pages
                            </span>
                            <button
                              onClick={(e) => toggleChapterReadStatus(ch.id, e)}
                              className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded border cursor-pointer transition-all ${
                                hasRead
                                  ? 'border-blue-500/40 bg-blue-500/15 text-blue-400 hover:border-blue-500/60'
                                  : 'border-zinc-800 bg-zinc-950/40 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                              }`}
                            >
                              {hasRead ? 'Read' : 'Unread'}
                            </button>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              )}
            </div>

            {/* Right Col: Synopsis and metadata information */}
            <div className="md:col-span-2 flex flex-col gap-6">
              
              {/* Media description / summary text block */}
              <div className="bg-[#060608]/50 border border-zinc-900/40 rounded-2xl p-6 flex flex-col gap-3">
                <h3 className="text-xs font-black uppercase tracking-widest text-[#ef4444]">
                  Synopsis Summary
                </h3>
                <p
                  className="text-sm text-zinc-400 leading-relaxed font-normal"
                  dangerouslySetInnerHTML={{
                    __html: selectedManga.description || 'No synopsis files configured for this title overview records.'
                  }}
                />
              </div>

              {/* Character listing component block */}
              {selectedManga.characters?.edges && selectedManga.characters.edges.length > 0 && (
                <div className="flex flex-col gap-3">
                  <h3 className="text-xs font-black uppercase tracking-widest text-[#ef4444] border-b border-red-950/20 pb-1 w-fit">
                    Key Characters
                  </h3>
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                    {selectedManga.characters.edges.slice(0, 12).map((char, index) => {
                      const image = char.node?.image?.large || char.node?.image?.medium;
                      return (
                        <div key={index} className="flex flex-col items-center text-center gap-1">
                          <div className="w-16 h-16 rounded-full overflow-hidden border border-zinc-900 shadow-md">
                            <img src={image} alt="character" className="w-full h-full object-cover" />
                          </div>
                          <span className="text-[9.5px] font-black text-white line-clamp-1 truncate max-w-full leading-tight select-text selection:bg-red-500">
                            {char.node?.name?.userPreferred}
                          </span>
                          <span className="text-[8px] font-mono font-bold text-zinc-500 uppercase tracking-wide">
                            {char.role}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Relations links list details */}
              {selectedManga.relations?.edges && selectedManga.relations.edges.length > 0 && (
                <div className="flex flex-col gap-3">
                  <h3 className="text-xs font-black uppercase tracking-widest text-[#ef4444] border-b border-red-950/20 pb-1 w-fit">
                    Show Relations
                  </h3>
                  <div className="flex items-center gap-4 overflow-x-auto pb-2 scrollbar-none">
                    {selectedManga.relations.edges.slice(0, 8).map((rel, index) => {
                      const node = rel.node;
                      return (
                        <div
                          key={index}
                          onClick={() => {
                            if (node.type === 'ANIME') {
                              // If they clicked on an anime relation, allow playing it via an Alert or just direct them
                              alert(`This relation goes to the Anime: ${node.title.userPreferred}. Close Manga and find it in Search!`);
                            } else {
                              handleSelectManga(node.id);
                            }
                          }}
                          className="flex items-center gap-3 shrink-0 p-2 bg-[#060608]/40 border border-zinc-900/60 rounded-xl cursor-pointer hover:border-red-500/20 max-w-[200px]"
                        >
                          <img
                            src={node.coverImage.large}
                            alt="Cover"
                            className="w-10 h-13 object-cover rounded-md border border-zinc-900 shadow-sm shrink-0"
                          />
                          <div className="flex flex-col justify-center min-w-0">
                            <span className="text-[10px] font-black text-white line-clamp-1 truncate leading-tight hover:text-red-500 transition-colors">
                              {node.title.userPreferred}
                            </span>
                            <span className="text-[7.5px] font-mono font-black text-red-500 mt-1 uppercase tracking-widest leading-none">
                              {rel.relationType} ({node.type})
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <AddMangaToListModal
            isOpen={isAddToListOpen}
            onClose={() => {
              setIsAddToListOpen(false);
              const list = getMyList();
              const existing = list.find(item => item.animeId === selectedManga.id && item.type === 'manga');
              if (existing) {
                setIsBookmarked(true);
                setCurrentMangaStatus(existing.status as any);
              } else {
                setIsBookmarked(false);
                setCurrentMangaStatus('None');
              }
            }}
            mangaId={selectedManga.id}
            mangaTitle={selectedManga.title.english || selectedManga.title.userPreferred}
            mangaCover={selectedManga.coverImage.extraLarge || selectedManga.coverImage.large}
          />
        </div>
      )}
    </div>
  );
}
