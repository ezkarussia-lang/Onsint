import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Users, 
  MessageSquare, 
  Flame, 
  Radio, 
  Plus, 
  ChevronLeft, 
  Heart, 
  User, 
  Clock, 
  AlertCircle,
  Hash,
  Loader2,
  Tag,
  ArrowUp,
  ArrowDown,
  Share2,
  MoreHorizontal,
  Image as ImageIcon,
  Link as LinkIcon,
  Bold,
  Italic,
  EyeOff,
  Eye,
  ChevronRight,
  Sparkles,
  Award,
  Maximize2,
  X,
  Send
} from 'lucide-react';
import { 
  getThreads, 
  createThread, 
  toggleLikeThread, 
  CommunityThread,
  supabase,
  fetchMultipleUserProfiles
} from '../services/supabase';
import { getStoredUser, UserProfile } from '../services/store';
import Comments from '../components/Comments';
import AuthModal from '../components/AuthModal';
import UserProfileModal from '../components/UserProfileModal';

// Helper to reliably map uuid to unique positive integer for the Comments mapping
function hashStringToInteger(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

// Custom relative time ticker matching screenshot aesthetic
function timeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHr / 24);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

const getUserPoints = (username: string): number => {
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs((hash % 120) + 15); // Dynamic points between 15 and 135
};

const PorscheIcon = () => (
  <svg className="w-4 h-3 inline-block align-middle mr-1 text-[#ef4444]" viewBox="0 0 24 12" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
    <path d="M1 9C1.5 9 1.8 8.8 2.2 8.4C2.5 8 3.5 6 4.5 5.5C5.5 5 7.5 4.8 10 2.5C11 1.5 13 1 15.5 1.2C17.5 1.5 18 2.5 19 3.2C20 4 21.5 4.8 22.5 5.2C23 5.5 23.5 6 23.5 6.8C23.5 7.5 22.5 8 20.5 8.2C19.5 8.3 19 9 18.2 9C17.5 9 17 8.2 16 8.2C15 8.2 14.5 9 13.5 9H1" fill="currentColor" fillOpacity="0.15" />
    <path d="M1 9H5.5C5.8 8.2 6.5 7.5 7.5 7.5C8.5 7.5 9.2 8.2 9.5 9H14.5C14.8 8.2 15.5 7.5 16.5 7.5C17.5 7.5 18.2 8.2 18.5 9H23.5V8.5C23.5 7.5 22.8 7 22 6.8C21.2 6.5 19.5 5.5 18.8 4.8C18 4 17.5 2.5 15.5 2C13.5 1.5 11 2 10 3.2C7.5 5.5 5.5 5.8 4.5 6.2C3.5 6.5 2.5 8.2 2.2 8.5C1.8 8.8 1.5 9 1 9Z" fill="currentColor" fillOpacity="0.25" />
    <path d="M9.8 4.2C11 3.2 12.8 2.8 14.5 3.2C15.5 3.5 16 4.2 16.5 4.8" stroke="currentColor" strokeWidth="0.8" />
    <circle cx="7.5" cy="9" r="1.8" fill="#040405" stroke="currentColor" strokeWidth="0.8" />
    <circle cx="7.5" cy="9" r="0.6" fill="currentColor" />
    <circle cx="16.5" cy="9" r="1.8" fill="#040405" stroke="currentColor" strokeWidth="0.8" />
    <circle cx="16.5" cy="9" r="0.6" fill="currentColor" />
  </svg>
);

const CATEGORIES_DATA = [
  { name: 'ALL', label: 'All', rawName: 'ALL' },
  { name: 'General', label: 'General', rawName: 'Discussions' },
  { name: 'News', label: 'News', rawName: 'Announcements' },
  { name: 'Recommendations', label: 'Recommendations', rawName: 'Recommendations' },
  { name: 'Art_Media', label: 'Art & Media', rawName: 'Art_Media' },
  { name: 'Discussion', label: 'Discussion', rawName: 'Discussion' },
  { name: 'Help_Support', label: 'Help & Support', rawName: 'Help_Support' }
];

export default function Community() {
  const [threads, setThreads] = useState<CommunityThread[]>([]);
  const [commentsCountMap, setCommentsCountMap] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'hot' | 'new' | 'top' | 'old'>('new');
  const [userBrowserSignature, setUserBrowserSignature] = useState('');
  
  // Custom downvotes collection stored locally: { [threadId]: string[] }
  const [downvotesMap, setDownvotesMap] = useState<Record<string, string[]>>(() => {
    try {
      const stored = localStorage.getItem('anipr8v_threads_downvotes_v1');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  // Custom user profile links modal
  const [selectedProfileUsername, setSelectedProfileUsername] = useState('');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Custom admin roles & pinning structures
  const [pinnedThreadIds, setPinnedThreadIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('anipr8v_pinned_threads');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => getStoredUser());
  
  const isAdmin = useMemo(() => {
    return currentUser && (
      currentUser.email === 'ezkarussia@gmail.com' ||
      currentUser.username?.toLowerCase() === 'admin' ||
      currentUser.tag === 'Sirsilvex' ||
      currentUser.tag?.toLowerCase() === 'admin'
    );
  }, [currentUser]);

  useEffect(() => {
    const syncUser = () => setCurrentUser(getStoredUser());
    window.addEventListener('storage', syncUser);
    window.addEventListener('anipr8v_auth_change', syncUser);
    return () => {
      window.removeEventListener('storage', syncUser);
      window.removeEventListener('anipr8v_auth_change', syncUser);
    };
  }, []);

  const handleTogglePin = (threadId: string) => {
    let updated: string[];
    if (pinnedThreadIds.includes(threadId)) {
      updated = pinnedThreadIds.filter(id => id !== threadId);
    } else {
      updated = [...pinnedThreadIds, threadId];
    }
    setPinnedThreadIds(updated);
    localStorage.setItem('anipr8v_pinned_threads', JSON.stringify(updated));
  };

  // True numbers computed dynamically based on live threads list (NO fake hardcoded counts!)
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      ALL: threads.length,
      General: 0,
      News: 0,
      Recommendations: 0,
      Art_Media: 0,
      Discussion: 0,
      Help_Support: 0,
    };

    threads.forEach(t => {
      if (t.category === 'Discussions') {
        counts.General++;
      } else if (t.category === 'Announcements') {
        counts.News++;
      } else {
        // Match exact or camel case names recursively
        const match = CATEGORIES_DATA.find(c => c.rawName === t.category || c.name === t.category);
        if (match && counts[match.name] !== undefined) {
          counts[match.name]++;
        }
      }
    });

    return counts;
  }, [threads]);

  // Combined score calculations and client sorting
  const sortedThreadsData = useMemo(() => {
    const pinned = threads.filter(t => pinnedThreadIds.includes(t.id));
    const sortedRegular = [...threads.filter(t => !pinnedThreadIds.includes(t.id))];
    
    // Sort algorithm applying standard score formulas: net score = upvotes (likes_count) - downvotes count
    const getNetScore = (t: CommunityThread) => {
      const downvoters = downvotesMap[t.id] || [];
      return (t.likes_count || 0) - downvoters.length;
    };

    if (sortBy === 'new') {
      sortedRegular.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else if (sortBy === 'old') {
      sortedRegular.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    } else if (sortBy === 'top') {
      // Top shows the ones with the absolute most positive upvotes descending
      sortedRegular.sort((a, b) => {
        const netA = getNetScore(a);
        const netB = getNetScore(b);
        if (netB !== netA) return netB - netA;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    } else {
      // Hot shows posts with high net score and recent activity
      sortedRegular.sort((a, b) => {
        const scoreA = getNetScore(a);
        const scoreB = getNetScore(b);
        if (scoreB !== scoreA) return scoreB - scoreA;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    }

    // Filter regular list by category
    const filteredRegular = sortedRegular.filter(t => {
      if (selectedCategory === 'ALL') return true;
      const match = CATEGORIES_DATA.find(c => c.name === selectedCategory);
      return t.category === match?.rawName;
    });

    return { pinnedThreads: pinned, regularThreads: filteredRegular };
  }, [threads, pinnedThreadIds, sortBy, selectedCategory, downvotesMap]);

  const { pinnedThreads, regularThreads } = sortedThreadsData;
  
  // Navigation layout states
  const [activeViewThread, setActiveViewThread] = useState<CommunityThread | null>(null);
  const [userProfiles, setUserProfiles] = useState<Record<string, any>>({});
  
  useEffect(() => {
    if (threads.length === 0) return;
    const authorNames = Array.from(new Set(threads.map(t => t.author_name).filter(Boolean))) as string[];
    if (activeViewThread && activeViewThread.author_name) {
      authorNames.push(activeViewThread.author_name);
    }
    fetchMultipleUserProfiles(authorNames).then((profiles) => {
      setUserProfiles(prev => ({ ...prev, ...profiles }));
    }).catch(console.error);
  }, [threads, activeViewThread]);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  // Forms states
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('General');
  const [newContent, setNewContent] = useState('');
  const [attachedImage, setAttachedImage] = useState<string>(''); // Base64 string for photo attachment
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Pinned Posts horizontal slider controller
  const sliderRef = useRef<HTMLDivElement | null>(null);

  const scrollSlider = (direction: 'left' | 'right') => {
    if (sliderRef.current) {
      const scrollAmount = direction === 'left' ? -340 : 340;
      sliderRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // Convert categories names to query safe filters
  const mapCategoryToQuery = (uiCategory: string) => {
    if (uiCategory === 'ALL') return 'ALL';
    if (uiCategory === 'General') return 'Discussions';
    if (uiCategory === 'News') return 'Announcements';
    return uiCategory;
  };

  useEffect(() => {
    let fingerprint = localStorage.getItem('anipr8v_browser_sig');
    if (!fingerprint) {
      fingerprint = 'anon-' + Math.random().toString(36).substring(2, 11);
      localStorage.setItem('anipr8v_browser_sig', fingerprint);
    }
    setUserBrowserSignature(fingerprint);
    queryAllThreads();
  }, [selectedCategory]);

  const queryAllThreads = async () => {
    try {
      setLoading(true);
      const { threads: list, error } = await getThreads();
      if (!error) {
        setThreads(list);
        
        // Fetch comments counts dynamically derived from Supabase to keep all post counts perfectly accurate!
        const hashes = list.map(t => hashStringToInteger(t.id));
        if (hashes.length > 0) {
          const { data: cData, error: cErr } = await supabase
            .from('anime_comments')
            .select('anime_id');
          if (!cErr && cData) {
            const tempMap: Record<number, number> = {};
            cData.forEach((comment: any) => {
              const aid = comment.anime_id;
              tempMap[aid] = (tempMap[aid] || 0) + 1;
            });
            const finalMap: Record<string, number> = {};
            list.forEach(t => {
              const h = hashStringToInteger(t.id);
              finalMap[t.id] = tempMap[h] || 0;
            });
            setCommentsCountMap(finalMap);
          }
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Reddit Upvoting mechanism with Chevron toggling
  const handleUpvote = async (e: React.MouseEvent, thread: CommunityThread) => {
    e.stopPropagation();
    const hasUpvoted = thread.likes_user_ids?.includes(userBrowserSignature);
    const hasDownvoted = downvotesMap[thread.id]?.includes(userBrowserSignature);

    // Remove downvote if active
    let newDownvotedIds = downvotesMap[thread.id] || [];
    if (hasDownvoted) {
      newDownvotedIds = newDownvotedIds.filter(id => id !== userBrowserSignature);
      const newMap = { ...downvotesMap, [thread.id]: newDownvotedIds };
      setDownvotesMap(newMap);
      localStorage.setItem('anipr8v_threads_downvotes_v1', JSON.stringify(newMap));
    }

    try {
      // Toggle upvote in database
      const { likesCount, likesUserIds } = await toggleLikeThread(
        thread.id,
        thread.likes_count,
        thread.likes_user_ids || [],
        userBrowserSignature
      );
      
      setThreads(prev => prev.map(t => t.id === thread.id ? { ...t, likes_count: likesCount, likes_user_ids: likesUserIds } : t));
      if (activeViewThread && activeViewThread.id === thread.id) {
        setActiveViewThread(prev => prev ? { ...prev, likes_count: likesCount, likes_user_ids: likesUserIds } : null);
      }
    } catch (err) {
      console.error('Failed to upvote:', err);
    }
  };

  // Reddit Downvoting mechanism with Chevron toggling
  const handleDownvote = (e: React.MouseEvent, thread: CommunityThread) => {
    e.stopPropagation();
    const hasUpvoted = thread.likes_user_ids?.includes(userBrowserSignature);
    const hasDownvoted = downvotesMap[thread.id]?.includes(userBrowserSignature);

    let newDownvotedIds = downvotesMap[thread.id] || [];
    if (hasDownvoted) {
      // Toggle off downvote
      newDownvotedIds = newDownvotedIds.filter(id => id !== userBrowserSignature);
    } else {
      // Toggle on downvote
      newDownvotedIds = [...newDownvotedIds, userBrowserSignature];
    }

    const newMap = { ...downvotesMap, [thread.id]: newDownvotedIds };
    setDownvotesMap(newMap);
    localStorage.setItem('anipr8v_threads_downvotes_v1', JSON.stringify(newMap));

    // If previously upvoted, remove upvote in database too
    if (hasUpvoted) {
      toggleLikeThread(
        thread.id,
        thread.likes_count,
        thread.likes_user_ids || [],
        userBrowserSignature
      ).then(({ likesCount, likesUserIds }) => {
        setThreads(prev => prev.map(t => t.id === thread.id ? { ...t, likes_count: likesCount, likes_user_ids: likesUserIds } : t));
        if (activeViewThread && activeViewThread.id === thread.id) {
          setActiveViewThread(prev => prev ? { ...prev, likes_count: likesCount, likes_user_ids: likesUserIds } : null);
        }
      }).catch(err => console.error(err));
    }
  };

  // Insert markdown helpers to make composition buttons fully functional
  const insertMarkdown = (syntax: 'bold' | 'italic' | 'link') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = newContent;
    const selectedText = text.substring(start, end);
    let replacement = '';

    if (syntax === 'bold') {
      replacement = `**${selectedText || 'bold text'}**`;
    } else if (syntax === 'italic') {
      replacement = `*${selectedText || 'italic text'}*`;
    } else if (syntax === 'link') {
      replacement = `[${selectedText || 'link description'}](url)`;
    }

    setNewContent(text.substring(0, start) + replacement + text.substring(end));
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + 2, start + 2 + (selectedText ? selectedText.length : (syntax === 'link' ? 16 : 9)));
    }, 50);
  };

  // Image file attachment helper
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1.5 * 1024 * 1024) {
      setPostError('Attached photo exceeds size limit of 1.5 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        setAttachedImage(reader.result);
        setPostError(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const activeUser = getStoredUser();
    
    if (!activeUser) {
      setIsAuthOpen(true);
      return;
    }

    if (!newTitle.trim() || !newContent.trim()) {
      setPostError('Please input a title and content context.');
      return;
    }

    try {
      setIsSubmitting(true);
      setPostError(null);
      
      const categoryToPost = mapCategoryToQuery(newCategory);
      // Append attachment block to the body if present
      let finalContentBody = newContent.trim();
      if (attachedImage) {
        finalContentBody = `${finalContentBody}\n\n[img]${attachedImage}[/img]`;
      }

      const { thread, error } = await createThread(
        newTitle.trim(),
        categoryToPost,
        activeUser.username,
        activeUser.avatar || 'https://api.dicebear.com/7.x/pixel-art/svg?seed=' + activeUser.username,
        finalContentBody
      );

      if (error) {
        setPostError(error.message || 'Error publishing discussion thread.');
      } else if (thread) {
        setNewTitle('');
        setNewContent('');
        setAttachedImage('');
        setIsPreviewMode(false);
        setIsCreateOpen(false);
        queryAllThreads();
      }
    } catch (err) {
      console.error(err);
      setPostError('Network connection failure. Try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openUserProfile = (username: string) => {
    setSelectedProfileUsername(username);
    setIsProfileModalOpen(true);
  };

  const handleAuthSuccess = () => {
    setCurrentUser(getStoredUser());
    setIsAuthOpen(false);
    setIsCreateOpen(true);
    window.dispatchEvent(new Event('anipr8v_auth_change'));
  };

  // Parser helper to extract & render attachments inside listing items or details view
  const parseThreadBody = (text: string) => {
    const imgMatch = text?.match(/\[img\](.*?)\[\/img\]/);
    let plainText = text || '';
    let imgUrl = '';
    
    if (imgMatch && imgMatch[1]) {
      imgUrl = imgMatch[1];
      plainText = text.replace(/\[img\](.*?)\[\/img\]/, '').trim();
    }
    
    return { plainText, imgUrl };
  };

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-6 pb-20 px-4 md:px-8 select-none">
      
      {/* Detail inspect layout view */}
      {activeViewThread ? (
        (() => {
          const { plainText, imgUrl } = parseThreadBody(activeViewThread.content);
          const hasUpvoted = activeViewThread.likes_user_ids?.includes(userBrowserSignature);
          const hasDownvoted = downvotesMap[activeViewThread.id]?.includes(userBrowserSignature);
          const netScore = (activeViewThread.likes_count || 0) - (downvotesMap[activeViewThread.id]?.length || 0);

          return (
            <div className="flex flex-col gap-6 mt-2 animate-fade-in w-full">
              {/* Back to forums button */}
              <div>
                <button
                  onClick={() => {
                    setActiveViewThread(null);
                    queryAllThreads();
                  }}
                  className="px-4 py-2 bg-zinc-900/60 hover:bg-[#1a1212] border border-zinc-800 rounded-xl text-xs font-black uppercase tracking-wider text-zinc-400 hover:text-white transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 shadow-md font-mono"
                >
                  <ChevronLeft className="w-4 h-4 text-[#ef4444]" /> Back to Forums
                </button>
              </div>

              {/* Core thread article banner */}
              <div className="p-5 md:p-8 bg-[#0a0a0c]/90 border border-zinc-800/80 rounded-2xl shadow-xl flex flex-col gap-5 relative overflow-hidden backdrop-blur-sm">
                
                {/* Visual Ambient top stripe accent for premium detail panel */}
                <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-[#ef4444]/60 to-transparent" />

                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="text-[10px] font-black font-mono uppercase bg-zinc-900 text-[#ef4444] border border-zinc-800 px-3 py-1 rounded-full tracking-widest leading-none">
                    {activeViewThread.category === 'Discussions' ? 'GENERAL' : activeViewThread.category.toUpperCase()}
                  </span>
                  <span className="text-zinc-800 text-[10px]">•</span>
                  <span className="text-[10px] text-zinc-500 font-bold flex items-center gap-1 font-mono">
                    <Clock className="w-3 h-3 text-zinc-500" />
                    {timeAgo(activeViewThread.created_at)}
                  </span>
                </div>

                <h1 className="text-xl md:text-2xl font-black text-white leading-tight font-sans tracking-tight">
                  {activeViewThread.title}
                </h1>

                {/* Author info card - Redesigned cleanly with reputation point badge */}
                <div 
                  onClick={() => openUserProfile(activeViewThread.author_name)}
                  className="flex items-center gap-2.5 px-3.5 py-2 bg-[#121217] hover:bg-zinc-900 rounded-xl border border-zinc-800/80 w-max max-w-full cursor-pointer transition-all hover:scale-[1.02]"
                >
                  <img
                    src={userProfiles[activeViewThread.author_name.toLowerCase()]?.avatar || activeViewThread.author_avatar}
                    alt=""
                    className="w-8 h-8 rounded-lg object-cover bg-zinc-900 border border-zinc-800 shrink-0"
                  />
                  <div className="min-w-0 pr-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-black text-zinc-200 truncate leading-none font-sans hover:text-[#ef4444] transition-colors">@{activeViewThread.author_name}</span>
                    </div>
                    <span className="text-[8px] text-zinc-500 block font-mono uppercase tracking-widest mt-1 select-none">
                      {activeViewThread.author_name === 'sirsilvex' && <PorscheIcon />}
                      Owner Of Post
                    </span>
                  </div>
                </div>

                {/* Main content text snippet */}
                <div className="border-t border-zinc-900 pt-5 flex flex-col gap-4">
                  {plainText && (
                    <p className="text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap font-sans">
                      {plainText}
                    </p>
                  )}
                  {imgUrl && (
                    <div className="max-w-xl rounded-xl overflow-hidden border border-zinc-800 shadow-lg">
                      <img src={imgUrl} alt="Attached forum clip" className="w-full object-cover select-all" />
                    </div>
                  )}
                </div>

                {/* Unified voting capsule matching the post list card */}
                <div className="flex items-center gap-3 border-t border-zinc-900 pt-4 mt-2 select-none">
                  <div className="flex items-center bg-zinc-900/60 border border-zinc-800/80 rounded-xl px-1 py-0.5 w-max select-none">
                    <button
                      onClick={(e) => handleUpvote(e, activeViewThread)}
                      className={`p-2 rounded-lg hover:bg-zinc-800/65 transition-all cursor-pointer group active:scale-95 ${
                        hasUpvoted ? 'text-[#ef4444]' : 'text-zinc-400 hover:text-white'
                      }`}
                      title="Upvote post"
                    >
                      <ArrowUp className={`w-5 h-5 transition-transform group-hover:-translate-y-0.5 ${hasUpvoted ? 'stroke-[3.5]' : 'stroke-[2.5]'}`} />
                    </button>
                    <span className={`px-3.5 text-sm font-black font-mono select-none leading-none ${
                      hasUpvoted ? 'text-[#ef4444]' : hasDownvoted ? 'text-blue-500' : 'text-zinc-200'
                    }`}>
                      {netScore}
                    </span>
                    <button
                      onClick={(e) => handleDownvote(e, activeViewThread)}
                      className={`p-2 rounded-lg hover:bg-zinc-800/65 transition-all cursor-pointer group active:scale-95 ${
                        hasDownvoted ? 'text-blue-500' : 'text-zinc-400 hover:text-white'
                      }`}
                      title="Downvote post"
                    >
                      <ArrowDown className={`w-5 h-5 transition-transform group-hover:translate-y-0.5 ${hasDownvoted ? 'stroke-[3.5]' : 'stroke-[2.5]'}`} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Integrated Comments section */}
              <div className="w-full mt-4">
                <h3 className="text-xs font-black uppercase tracking-widest font-mono text-zinc-500 border-l-2 border-[#ef4444] pl-2.5 mb-2 select-none">
                  Comment Section
                </h3>
                <div className="w-full">
                  <Comments 
                    animeId={hashStringToInteger(activeViewThread.id)} 
                    episodeNumber={null} 
                    noContainer={true}
                    threadOwnerName={activeViewThread.author_name}
                    onCommentAdded={() => {
                      queryAllThreads();
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })()
      ) : (
        <>
          {/* Subtle description header */}
          <div className="text-center py-4 select-none border-b border-zinc-950/80 mb-1">
            <p className="text-[11px] text-zinc-500 font-bold uppercase tracking-wider leading-relaxed">
              Join the discussion, share your art, and connect with fellow anime enthusiasts.
            </p>
          </div>

          {/* 1. PINNED POSTS Section matching precise screenshot layout */}
          {pinnedThreads.length > 0 && selectedCategory === 'ALL' && (
            <div className="relative flex flex-col gap-4 py-4 border-b border-zinc-900/40 w-full mb-2 bg-[#08080a] p-4 rounded-2xl border border-zinc-800/40">
              <div className="flex items-center select-none gap-2 font-mono">
                <span className="text-[11px] font-black uppercase tracking-widest text-[#ef4444] flex items-center gap-1.5 mx-auto">
                  PINNED POSTS
                </span>
              </div>
              
              {/* Slider area flanked by navigation triggers */}
              <div className="relative w-full flex items-center px-1">
                {/* Arrow Left */}
                {pinnedThreads.length > 1 && (
                  <button 
                    onClick={() => scrollSlider('left')}
                    className="absolute -left-3 z-20 w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white hover:border-zinc-750 cursor-pointer shadow-lg active:scale-95 transition-all"
                    title="Scroll left"
                  >
                    <ChevronLeft className="w-4 h-4 text-[#ef4444]" />
                  </button>
                )}

                <div 
                  ref={sliderRef}
                  className={`w-full flex gap-4 overflow-x-auto scroll-smooth pr-1 pb-2 scrollbar-none snap-x snap-mandatory ${
                    pinnedThreads.length === 1 ? 'justify-center' : ''
                  }`}
                >
                  {pinnedThreads.map((thread) => (
                    <div
                      key={thread.id}
                      onClick={() => setActiveViewThread(thread)}
                      className="min-w-[280px] md:min-w-[340px] flex-1 max-w-[420px] relative p-5 bg-[#101014]/90 hover:bg-zinc-900 border border-zinc-900 hover:border-zinc-850 rounded-2xl flex flex-col justify-between gap-5 cursor-pointer transition-all duration-300 shadow shadow-black snap-center"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2 select-none">
                          <span className="text-[8px] font-black font-mono uppercase bg-zinc-900 text-zinc-400 border border-zinc-805 px-2.5 py-0.5 rounded-md tracking-wider leading-none">
                            {thread.category === 'Discussions' ? 'GENERAL' : thread.category.toUpperCase()}
                          </span>
                          {isAdmin && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleTogglePin(thread.id);
                              }}
                              className="text-[8.5px] font-mono font-bold uppercase text-[#ef4444] bg-[#ef4444]/10 px-2 py-0.5 border border-[#ef4444]/20 rounded cursor-pointer hover:bg-[#ef4444]/20 transition-all"
                              title="Unpin thread from dashboard"
                            >
                              Unpin
                            </button>
                          )}
                        </div>
                        <h3 className="text-sm md:text-base font-extrabold text-zinc-100 tracking-tight leading-snug line-clamp-2">
                          {thread.title}
                        </h3>
                      </div>
                      
                      <div className="flex items-center gap-2 text-[10.5px] text-zinc-500 font-medium">
                        <img src={userProfiles[thread.author_name.toLowerCase()]?.avatar || thread.author_avatar} alt="" className="w-5 h-5 rounded-md object-cover border border-zinc-850" />
                        <span>by {thread.author_name}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Arrow Right */}
                {pinnedThreads.length > 1 && (
                  <button 
                    onClick={() => scrollSlider('right')}
                    className="absolute -right-3 z-20 w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white hover:border-zinc-750 cursor-pointer shadow-lg active:scale-95 transition-all"
                    title="Scroll right"
                  >
                    <ChevronRight className="w-4 h-4 text-[#ef4444]" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* 2. Interactive "Create a post..." box widget (Click open composer) */}
          <div className="w-full mb-1">
            {!isCreateOpen ? (
              <div 
                onClick={() => {
                  if (!getStoredUser()) {
                    setIsAuthOpen(true);
                  } else {
                    setIsCreateOpen(true);
                  }
                }}
                className="w-full p-3.5 bg-zinc-950/80 border border-zinc-900 rounded-xl flex items-center justify-between gap-3 cursor-pointer hover:bg-zinc-900/60 transition-all select-none shadow outline-none"
              >
                <div className="flex items-center gap-3 flex-1">
                  {currentUser ? (
                    <img
                      src={currentUser.avatar || 'https://api.dicebear.com/7.x/pixel-art/svg?seed=' + currentUser.username}
                      alt={currentUser.username}
                      className="w-8 h-8 rounded-full object-cover border border-zinc-800 bg-[#0d0d10]"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center text-zinc-400 font-mono font-bold border border-zinc-800 text-xs text-center select-none uppercase">
                      G
                    </div>
                  )}
                  <div className="flex-1 bg-[#030304] border border-zinc-900/80 text-zinc-500 text-xs py-2 px-4 rounded-full select-none">
                    Create a post...
                  </div>
                </div>
                <div className="flex items-center gap-3 text-zinc-500">
                  <ImageIcon className="w-4 h-4 hover:text-[#ef4444] transition-colors" />
                  <LinkIcon className="w-4 h-4 hover:text-white transition-colors" />
                </div>
              </div>
            ) : (
              /* COMPOSER FORM - Posting block */
              <div className="p-5 md:p-6 bg-[#060608] border border-zinc-800 rounded-2xl animate-slide-in flex flex-col gap-4 shadow-xl">
                <div className="flex items-center gap-3 select-none">
                  {currentUser ? (
                    <img
                      src={currentUser.avatar || 'https://api.dicebear.com/7.x/pixel-art/svg?seed=' + currentUser.username}
                      alt={currentUser.username}
                      className="w-8 h-8 rounded-full object-cover border border-zinc-800 bg-[#0d0d10]"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-zinc-950 flex items-center justify-center text-zinc-400 font-mono font-black border border-zinc-900 text-xs leading-none">
                      G
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-bold text-zinc-400 font-sans">Posting in</span>
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      className="ml-1 bg-zinc-950 border border-zinc-900 focus:border-zinc-800 rounded-full px-3.5 py-1 text-xs text-zinc-200 font-extrabold outline-none cursor-pointer"
                    >
                      {CATEGORIES_DATA.filter(c => c.name !== 'ALL').map(c => (
                        <option key={c.name} value={c.name}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {postError && (
                  <div className="p-3 bg-red-950/20 border border-red-900/30 text-red-400 rounded-xl text-[10.5px] font-mono flex items-center gap-1.5 animate-fade-in animate-duration-200">
                    <AlertCircle className="w-4 h-4" />
                    <span>{postError}</span>
                  </div>
                )}

                <form onSubmit={handleCreateSubmit} className="flex flex-col gap-3">
                  <input
                    type="text"
                    maxLength={120}
                    placeholder="Give your post a title..."
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-900 focus:border-zinc-800 rounded-xl px-4 py-2 text-xs text-zinc-100 outline-none font-bold placeholder-zinc-600 font-sans"
                  />

                  {isPreviewMode ? (
                    <div className="w-full min-h-[120px] bg-zinc-950/50 border border-zinc-900 rounded-xl p-4 text-xs text-zinc-300 leading-relaxed font-sans prose prose-invert overflow-auto">
                      <div className="text-[10px] text-zinc-550 uppercase tracking-widest font-mono mb-2 border-b border-zinc-900 pb-1 flex justify-between">
                        <span>Preview Mode</span>
                        <span onClick={() => setIsPreviewMode(false)} className="text-[#ef4444] cursor-pointer">Edit</span>
                      </div>
                      <h3 className="text-sm font-black text-white">{newTitle || 'Untitled Draft'}</h3>
                      <p className="whitespace-pre-wrap mt-2">{newContent || '(Content draft context empty. Type thoughts below)'}</p>
                      {attachedImage && (
                        <div className="mt-4 rounded-xl overflow-hidden max-w-[200px] border border-zinc-900">
                          <img src={attachedImage} alt="Attachment clip preview" className="w-full h-full object-cover" />
                        </div>
                      )}
                    </div>
                  ) : (
                    <textarea
                      ref={textareaRef}
                      rows={5}
                      maxLength={3000}
                      placeholder="Share your thoughts, theories, or questions... supports bold, italics, links, and real photo uploads!"
                      value={newContent}
                      onChange={(e) => setNewContent(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-900 focus:border-zinc-800 rounded-xl p-4 text-xs text-zinc-200 outline-none placeholder-zinc-600 resize-y min-h-[125px] leading-relaxed font-sans"
                    />
                  )}

                  {/* Thumbnail attachment preview */}
                  {!isPreviewMode && attachedImage && (
                    <div className="relative w-max rounded-xl overflow-hidden border border-zinc-900 shadow-xl group anim-scale-up">
                      <img src={attachedImage} alt="Uploaded attachment draft" className="max-h-24 max-w-[170px] object-cover" />
                      <button
                        type="button"
                        onClick={() => setAttachedImage('')}
                        className="absolute top-1.5 right-1.5 p-1 rounded-full bg-zinc-950/80 border border-zinc-800 text-zinc-400 hover:text-white cursor-pointer active:scale-90"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Submit and format rows - fully functional now! */}
                  <div className="flex items-center justify-between pt-2 border-t border-zinc-900/65">
                    {/* Visual format elements matching screenshot - fully operational format triggers */}
                    <div className="flex items-center gap-3.5 text-zinc-500 text-xs select-none">
                      <button 
                        type="button" 
                        onClick={() => insertMarkdown('bold')}
                        className="p-1 hover:text-[#ef4444] transition-colors cursor-pointer"
                        title="Insert Bold Text"
                      >
                        <Bold className="w-3.5 h-3.5" />
                      </button>
                      
                      <button 
                        type="button" 
                        onClick={() => insertMarkdown('italic')}
                        className="p-1 hover:text-[#ef4444] transition-colors cursor-pointer"
                        title="Insert Italic Text"
                      >
                        <Italic className="w-3.5 h-3.5" />
                      </button>

                      <button 
                        type="button" 
                        onClick={() => {
                          if (fileInputRef.current) {
                            fileInputRef.current.click();
                          }
                        }}
                        className={`p-1 hover:text-[#ef4444] transition-colors cursor-pointer ${attachedImage ? 'text-[#ef4444]' : ''}`}
                        title="Upload Base64 Photo"
                      >
                        <ImageIcon className="w-3.5 h-3.5" />
                      </button>
                      
                      {/* Hidden upload inputs */}
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />

                      <button 
                        type="button" 
                        onClick={() => insertMarkdown('link')}
                        className="p-1 hover:text-[#ef4444] transition-colors cursor-pointer"
                        title="Link website"
                      >
                        <LinkIcon className="w-3.5 h-3.5" />
                      </button>

                      <button 
                        type="button" 
                        onClick={() => setIsPreviewMode(!isPreviewMode)}
                        className={`p-1 transition-colors cursor-pointer ${isPreviewMode ? 'text-[#ef4444]' : 'hover:text-white'}`}
                        title="Toggle Preview Canvas"
                      >
                        {isPreviewMode ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setAttachedImage('');
                          setIsCreateOpen(false);
                        }}
                        className="px-4 py-2 bg-transparent text-zinc-400 hover:text-white text-xs font-bold uppercase cursor-pointer rounded-lg"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="px-5 py-2 bg-[#ef4444] hover:bg-red-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-md flex items-center gap-1.5 active:scale-95 disabled:bg-zinc-900 disabled:text-zinc-650"
                      >
                        {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        <span>Post</span>
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            )}
          </div>          {/* 3. Redesigned Category Filter pill-badges row with neon RED accent aligned with MAIN theme */}
          <div className="flex overflow-x-auto scrollbar-none items-center gap-2 select-none py-1.5 max-w-full w-full">
            {CATEGORIES_DATA.map((cat) => {
              const isActive = selectedCategory === cat.name;
              const count = categoryCounts[cat.name];
              return (
                <button
                  key={cat.name}
                  onClick={() => setSelectedCategory(cat.name)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border whitespace-nowrap ${
                    isActive
                      ? 'bg-[#08080c] text-[#ef4444] border-zinc-800 shadow-sm shadow-white/[0.02]'
                      : 'text-zinc-500 hover:text-zinc-200 border-transparent bg-transparent'
                  }`}
                >
                  <span>{cat.name === 'ALL' ? 'All' : cat.label}</span>
                  {count > 0 && (
                    <span className={`text-[10px] font-medium font-mono ${isActive ? 'text-[#ef4444]/80' : 'text-zinc-650'}`}>
                      {count >= 1000 ? `${(count / 1000).toFixed(1)}k` : count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* 4. Fine Sort Order Options Toolbar below category badges (Clean visual tags, NO emojis!) */}
          <div className="flex items-center gap-4 border-b border-zinc-900 pb-3 select-none pt-2">
            {([
              { id: 'hot', label: 'Hot', icon: <Flame className="w-3.5 h-3.5 text-[#ef4444]" /> },
              { id: 'new', label: 'New', icon: <Clock className="w-3.5 h-3.5" /> },
              { id: 'top', label: 'Top', icon: <Award className="w-3.5 h-3.5" /> },
              { id: 'old', label: 'Old', icon: <Clock className="w-3.5 h-3.5 opacity-60" /> }
            ] as const).map((tab) => {
              const isSelected = sortBy === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setSortBy(tab.id)}
                  className={`text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    isSelected
                      ? 'bg-[#08080c] text-white border border-zinc-800 rounded-xl px-3.5 py-1.5 shadow-sm shadow-white/[0.02]'
                      : 'text-zinc-500 hover:text-zinc-200 px-1 py-1.5'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* 5. Custom Thread List Grid */}
          <div className="flex flex-col gap-4">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-24 gap-2 select-none">
                <Loader2 className="w-7 h-7 text-[#ef4444] animate-spin" />
                <span className="text-[10px] font-black uppercase text-zinc-500 tracking-widest font-mono">
                  Loading forum index...
                </span>
              </div>
            ) : regularThreads.length === 0 ? (
              <div className="p-10 text-center rounded-2xl bg-zinc-950/10 border border-dashed border-zinc-900/60 py-16 select-none">
                <Radio className="w-8 h-8 text-zinc-700 mx-auto mb-3 animate-pulse" />
                <h4 className="text-xs font-black uppercase text-zinc-400 font-mono tracking-widest mb-1">
                  Community feed is silent
                </h4>
                <p className="text-zinc-550 text-[10.5px] max-w-sm mx-auto leading-relaxed">
                  No active discussions in this category. Make a post above to kick off the thread!
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {regularThreads.map((thread) => {
                  const { plainText, imgUrl } = parseThreadBody(thread.content);
                  const hasUpvoted = thread.likes_user_ids?.includes(userBrowserSignature);
                  const hasDownvoted = downvotesMap[thread.id]?.includes(userBrowserSignature);
                  const netScore = (thread.likes_count || 0) - (downvotesMap[thread.id]?.length || 0);

                  return (
                    <div
                      key={thread.id}
                      onClick={() => setActiveViewThread(thread)}
                      className="p-5 bg-[#050507] hover:bg-[#09090d] border border-zinc-900/40 hover:border-zinc-800 rounded-2xl flex flex-col justify-between gap-5 cursor-pointer transition-all duration-300 shadow leading-relaxed"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        {/* Creator Profile avatar */}
                        <img
                          src={userProfiles[thread.author_name.toLowerCase()]?.avatar || thread.author_avatar}
                          alt=""
                          onClick={(e) => {
                            e.stopPropagation();
                            openUserProfile(thread.author_name);
                          }}
                          className="w-10 h-10 rounded-full object-cover bg-zinc-900 border border-zinc-850 shrink-0 hover:scale-105 transition-all"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2 select-none text-xs text-zinc-500">
                            <span 
                              onClick={(e) => {
                                e.stopPropagation();
                                openUserProfile(thread.author_name);
                              }}
                              className="font-bold text-zinc-200 hover:text-[#ef4444]"
                            >
                              @{thread.author_name}
                            </span>
                            {thread.author_name === 'sirsilvex' && (
                              <span className="shrink-0">
                                <PorscheIcon />
                              </span>
                            )}
                            
                            <span className="text-[8px] font-black font-mono uppercase bg-[#18181c] border border-zinc-820 px-2.5 py-0.5 rounded-full text-zinc-400">
                              {thread.category === 'Discussions' ? 'GENERAL' : thread.category.toUpperCase()}
                            </span>
                            <span className="text-zinc-805 font-mono">•</span>
                            <span className="font-medium font-mono text-[10px] text-zinc-500">
                              {timeAgo(thread.created_at)}
                            </span>
                            
                            {isAdmin && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleTogglePin(thread.id);
                                }}
                                className="ml-auto text-[9px] font-mono tracking-wider text-[#ef4444] hover:text-red-400 flex items-center gap-1 bg-red-950/20 px-2.5 py-0.5 border border-[#ef4444]/20 rounded-full cursor-pointer font-extrabold transition-all"
                                title="Pin thread to top of board"
                              >
                                Pin
                              </button>
                            )}
                          </div>
                          
                          <h4 className="text-base font-extrabold tracking-tight text-white hover:text-[#ef4444] transition-colors mt-1.5 uppercase leading-tight">
                            {thread.title}
                          </h4>

                          {/* Sub Category Tag design */}
                          <div className="mt-1 flex items-center gap-1.5">
                            <span className="border border-zinc-850 bg-zinc-900/40 text-xs text-zinc-500 px-3 py-0.5 rounded-full font-semibold">
                              {thread.category}
                            </span>
                          </div>

                          <p className="text-zinc-400 text-sm leading-relaxed mt-2.5 line-clamp-2 font-sans font-light">
                            {plainText}
                          </p>

                          {imgUrl && (
                            <div className="mt-3 overflow-hidden rounded-xl border border-zinc-900/60 max-h-56">
                              <img src={imgUrl} alt="" className="w-full object-cover" />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Consolidated Actions Bar */}
                      <div className="flex flex-wrap items-center gap-3 font-sans text-xs shrink-0 self-start md:self-auto pt-1 select-none w-full">
                        
                        {/* Unified upvote and downvote capsule */}
                        <div className="flex items-center bg-zinc-900/60 border border-zinc-800/80 rounded-xl px-1 py-0.5 w-max select-none">
                          <button
                            onClick={(e) => handleUpvote(e, thread)}
                            className={`p-1.5 rounded-lg hover:bg-zinc-800/60 transition-all cursor-pointer group active:scale-90 ${
                              hasUpvoted ? 'text-[#ef4444]' : 'text-zinc-400 hover:text-white'
                            }`}
                            title="Upvote post"
                          >
                            <ArrowUp className={`w-4.5 h-4.5 transition-transform group-hover:-translate-y-0.5 ${hasUpvoted ? 'stroke-[2.5]' : 'stroke-[2]'}`} />
                          </button>
                          
                          <span className={`px-2 text-xs font-black font-mono leading-none ${
                            hasUpvoted ? 'text-[#ef4444]' : hasDownvoted ? 'text-blue-500' : 'text-zinc-200'
                          }`}>
                            {netScore}
                          </span>

                          <button
                            onClick={(e) => handleDownvote(e, thread)}
                            className={`p-1.5 rounded-lg hover:bg-zinc-800/60 transition-all cursor-pointer group active:scale-90 ${
                              hasDownvoted ? 'text-blue-500' : 'text-zinc-400 hover:text-white'
                            }`}
                            title="Downvote post"
                          >
                            <ArrowDown className={`w-4.5 h-4.5 transition-transform group-hover:translate-y-0.5 ${hasDownvoted ? 'stroke-[2.5]' : 'stroke-[2]'}`} />
                          </button>
                        </div>

                        {/* Comments Pill */}
                        <div className="flex items-center gap-1.5 bg-zinc-900/60 border border-zinc-800/80 rounded-xl px-3 py-1.5 text-xs font-bold text-zinc-400 hover:bg-zinc-850 hover:text-white transition-all">
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span className="font-mono text-zinc-350">{commentsCountMap[thread.id] || 0}</span>
                        </div>

                        {/* Clipboard share link */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText(`${window.location.origin}/community?thread=${thread.id}`);
                            alert('Thread link copied to clipboard!');
                          }}
                          className="ml-auto p-1.5 rounded-lg border border-zinc-900 bg-zinc-950 text-zinc-500 hover:text-white hover:bg-zinc-900 active:scale-95 transition-all cursor-pointer"
                          title="Copy post link"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* Profile inspection layout panel */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        username={selectedProfileUsername}
        onClose={() => setIsProfileModalOpen(false)}
      />

      {/* Embedded Auth screen credentials checker modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={handleAuthSuccess}
      />
    </div>
  );
}
