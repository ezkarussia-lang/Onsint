import React, { useState, useEffect, useMemo } from 'react';
import { 
  MessageSquare, 
  CornerDownRight, 
  AlertTriangle, 
  User, 
  Check, 
  Copy, 
  Send, 
  X, 
  Smile, 
  TrendingUp, 
  Loader2, 
  Image as ImageIcon, 
  Film, 
  ShieldAlert,
  Sparkles,
  MoreHorizontal,
  Bold,
  Italic,
  Eye,
  EyeOff,
  Lock,
  ThumbsUp,
  ThumbsDown,
  Trash2
} from 'lucide-react';

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
import { 
  getComments, 
  postComment, 
  toggleLikeComment, 
  deleteComment,
  DiscussionComment, 
  SQL_INITIAL_SCHEMA,
  fetchMultipleUserProfiles
} from '../services/supabase';
import { 
  getStoredUser, 
  ANIME_STICKERS, 
  ANIME_AVATARS, 
  UserProfile,
  addNotification,
  getAllRegisteredUsers
} from '../services/store';
import AuthModal from './AuthModal';
import UserProfileModal from './UserProfileModal';

interface CommentsProps {
  animeId: number;
  episodeNumber?: number | null;
  noContainer?: boolean;
  threadOwnerName?: string;
  onCommentAdded?: () => void;
  animeCover?: string;
}

// Custom security helper to make application 100% immune to HTML injection/XSS protocol hacking
function isSafeUrl(url: string): boolean {
  if (!url) return false;
  const decoded = decodeURIComponent(url).trim().toLowerCase();
  
  // Clean off and reject direct malicious protocols
  if (
    decoded.startsWith('javascript:') || 
    decoded.startsWith('data:') || 
    decoded.startsWith('vbscript:') || 
    decoded.startsWith('file:')
  ) {
    return false;
  }
  
  // Safe web protocols
  return (
    decoded.startsWith('http://') || 
    decoded.startsWith('https://') || 
    decoded.startsWith('/') || 
    decoded.startsWith('//')
  );
}

// Custom curated GIF list for comments reaction section
const ANIME_GIFS = [
  { label: 'Happy Dance', url: 'https://media.giphy.com/media/13HLw81VK6YpKE/giphy.gif' },
  { label: 'Anya Heh', url: 'https://media.giphy.com/media/FWAcpJsFT9mNW8RGOa/giphy.gif' },
  { label: 'Shocked', url: 'https://media.giphy.com/media/3ofT5YyELqJc98CH6M/giphy.gif' },
  { label: 'Wow!', url: 'https://media.giphy.com/media/V2AkNfK9NN9mw/giphy.gif' },
  { label: 'Sip Tea', url: 'https://media.giphy.com/media/S0m5t70SgY2qI/giphy.gif' },
  { label: 'Crying Chibi', url: 'https://media.giphy.com/media/xT0xeuOy2Fcl9vbd8A/giphy.gif' }
];

// Rich text bold/italic/spoiler safety renderer
const renderRichText = (inputText: string) => {
  const parts: React.ReactNode[] = [];
  let currentText = inputText;

  const spoilerRegex = /\[spoiler\](.*?)\[\/spoiler\]/g;
  let match;
  let lastIndex = 0;

  const parsePings = (txt: string, baseKey: string) => {
    const pingRegex = /@(\w+)/g;
    const pParts: React.ReactNode[] = [];
    let lastPIndex = 0;
    let pMatch;
    let subPKey = 0;

    while ((pMatch = pingRegex.exec(txt)) !== null) {
      if (pMatch.index > lastPIndex) {
        pParts.push(<span key={`${baseKey}-ping-plain-${subPKey++}`}>{txt.substring(lastPIndex, pMatch.index)}</span>);
      }
      const username = pMatch[1];
      pParts.push(
        <span
          key={`${baseKey}-ping-val-${subPKey++}`}
          className="text-[#ef4444] font-extrabold hover:underline cursor-pointer transition-colors"
        >
          @{username}
        </span>
      );
      lastPIndex = pingRegex.lastIndex;
    }
    if (lastPIndex < txt.length) {
      pParts.push(<span key={`${baseKey}-ping-plain-end`}>{txt.substring(lastPIndex)}</span>);
    }
    return pParts;
  };

  const parseItalics = (txt: string, baseKey: string) => {
    const italicRegex = /\*(.*?)\*/g;
    const subParts: React.ReactNode[] = [];
    let lastSubIndex = 0;
    let italicMatch;
    let subKey = 0;

    while ((italicMatch = italicRegex.exec(txt)) !== null) {
      if (italicMatch.index > lastSubIndex) {
        subParts.push(...parsePings(txt.substring(lastSubIndex, italicMatch.index), `${baseKey}-it-plain-${subKey++}`));
      }
      subParts.push(
        <em key={`${baseKey}-it-val-${subKey++}`} className="italic text-zinc-400">
          {italicMatch[1]}
        </em>
      );
      lastSubIndex = italicRegex.lastIndex;
    }
    if (lastSubIndex < txt.length) {
      subParts.push(...parsePings(txt.substring(lastSubIndex), `${baseKey}-it-plain-end`));
    }
    return subParts;
  };

  const processText = (txt: string, keyPrefix: string) => {
    const boldRegex = /\*\*(.*?)\*\*/g;
    const subParts: React.ReactNode[] = [];
    let lastSubIndex = 0;
    let boldMatch;
    let subKey = 0;

    while ((boldMatch = boldRegex.exec(txt)) !== null) {
      if (boldMatch.index > lastSubIndex) {
        const plainTxt = txt.substring(lastSubIndex, boldMatch.index);
        subParts.push(...parseItalics(plainTxt, `${keyPrefix}-sub-${subKey++}`));
      }
      subParts.push(
        <strong key={`${keyPrefix}-bold-${subKey++}`} className="font-extrabold text-white">
          {parseItalics(boldMatch[1], `${keyPrefix}-bold-it-${subKey++}`)}
        </strong>
      );
      lastSubIndex = boldRegex.lastIndex;
    }
    if (lastSubIndex < txt.length) {
      subParts.push(...parseItalics(txt.substring(lastSubIndex), `${keyPrefix}-sub-end`));
    }
    return subParts;
  };

  let pKey = 0;
  while ((match = spoilerRegex.exec(currentText)) !== null) {
    if (match.index > lastIndex) {
      parts.push(...processText(currentText.substring(lastIndex, match.index), `pt-${pKey++}`));
    }
    const spoilerContent = match[1];
    parts.push(
      <span 
        key={`spoiler-${pKey++}`} 
        onClick={(e) => {
          const el = e.currentTarget;
          el.classList.toggle('text-transparent');
          el.classList.toggle('select-none');
          el.classList.toggle('bg-zinc-800');
          el.classList.toggle('text-zinc-200');
        }}
        className="bg-zinc-900 border border-zinc-850 rounded-md px-1.5 py-0.5 text-transparent select-none cursor-pointer hover:bg-zinc-800/80 transition-all font-mono text-[11px] inline-block mx-1"
        title="Click to reveal spoiler"
      >
        {spoilerContent}
      </span>
    );
    lastIndex = spoilerRegex.lastIndex;
  }

  if (lastIndex < currentText.length) {
    parts.push(...processText(currentText.substring(lastIndex), `pt-end`));
  }

  return parts;
};

interface CommentInputBoxProps {
  placeholder: string;
  submitLabel: string;
  initialValue?: string;
  onCancel?: () => void;
  onSubmit: (text: string, imageBase64: string) => Promise<void>;
  isSubmitting: boolean;
  avatarUrl?: string;
}

function CommentInputBox({ placeholder, submitLabel, onCancel, onSubmit, isSubmitting, avatarUrl }: CommentInputBoxProps) {
  const [text, setText] = useState('');
  const [attachedImg, setAttachedImg] = useState('');
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  // TikTok tag states
  const [showMentionList, setShowMentionList] = useState(false);
  const [mentionWord, setMentionWord] = useState('');
  const [mentionIndex, setMentionIndex] = useState(-1);

  const registeredUsers = useMemo(() => {
    return getAllRegisteredUsers();
  }, [showMentionList]);

  const handleTextChange = (val: string) => {
    setText(val);
    
    const textarea = textareaRef.current;
    if (!textarea) return;
    const caretPos = textarea.selectionStart ?? val.length;
    const textBeforeCaret = val.substring(0, caretPos);
    
    // Find last index of '@' before caret
    const lastAtIdx = textBeforeCaret.lastIndexOf('@');
    if (lastAtIdx !== -1) {
      const hasSpaceBefore = lastAtIdx === 0 || /\s/.test(textBeforeCaret.charAt(lastAtIdx - 1));
      const wordAfterAt = textBeforeCaret.substring(lastAtIdx + 1);
      if (hasSpaceBefore && !/\s/.test(wordAfterAt)) {
        setShowMentionList(true);
        setMentionWord(wordAfterAt.toLowerCase());
        setMentionIndex(lastAtIdx);
        return;
      }
    }
    setShowMentionList(false);
  };

  const handleSelectMention = (targetUser: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const caretPos = textarea.selectionStart ?? text.length;
    
    const beforeMention = text.substring(0, mentionIndex);
    const afterCaret = text.substring(caretPos);
    
    const newText = beforeMention + `@${targetUser} ` + afterCaret;
    setText(newText);
    setShowMentionList(false);
    
    setTimeout(() => {
      textarea.focus();
      const newPos = mentionIndex + targetUser.length + 2; // '@' + user + ' '
      textarea.setSelectionRange(newPos, newPos);
    }, 50);
  };

  const filteredUsers = registeredUsers.filter((u) =>
    u.username.toLowerCase().includes(mentionWord)
  );

  const handleLocalPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            if (event.target?.result) {
              setAttachedImg(event.target.result as string);
            }
          };
          reader.readAsDataURL(file);
        }
      }
    }
  };

  const handleLocalUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("Image too large. Please upload an image smaller than 2MB.");
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setAttachedImg(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const insertSyntax = (syntax: 'bold' | 'italic' | 'spoiler' | 'lock') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = text.substring(start, end);

    let replacement = '';
    if (syntax === 'bold') {
      replacement = `**${selectedText || 'bold text'}**`;
    } else if (syntax === 'italic') {
      replacement = `*${selectedText || 'italic text'}*`;
    } else if (syntax === 'spoiler') {
      replacement = `[spoiler]${selectedText || 'spoiler'}[/spoiler]`;
    } else if (syntax === 'lock') {
      replacement = `${text ? ' ' : ''}🔓 ${selectedText || 'secured'} 🔐`;
    }

    const newText = text.substring(0, start) + replacement + text.substring(end);
    setText(newText);

    setTimeout(() => {
      textarea.focus();
      const newCursor = start + replacement.length;
      textarea.setSelectionRange(newCursor, newCursor);
    }, 50);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() && !attachedImg) return;
    onSubmit(text, attachedImg).then(() => {
      setText('');
      setAttachedImg('');
      setIsPreviewMode(false);
    });
  };

  const elementIdSuffix = Math.floor(Math.random() * 1000000);

  return (
    <div className="bg-[#0b0b0e]/90 border border-zinc-900 rounded-2xl p-4 shadow-md flex gap-3.5 select-none focus-within:border-zinc-800 transition-all w-full mb-5 relative text-left">
      {/* TikTok autocomplete mention menu */}
      {showMentionList && filteredUsers.length > 0 && (
        <div className="absolute left-16 right-4 bottom-full mb-2.5 bg-[#09090c] border border-zinc-850 rounded-xl shadow-2xl p-1.5 z-40 max-h-48 overflow-y-auto select-none custom-scrollbar animate-fade-in text-left">
          <div className="px-2 py-1 text-[9px] uppercase tracking-widest font-mono text-zinc-500 border-b border-zinc-900/40 mb-1 leading-none font-bold">
            ⚡ Select user
          </div>
          <div className="flex flex-col">
            {filteredUsers.map((u) => (
              <button
                key={u.username}
                type="button"
                onClick={() => handleSelectMention(u.username)}
                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 hover:bg-zinc-900/85 rounded-lg text-left text-xs font-mono transition-colors text-zinc-350 hover:text-white cursor-pointer animate-fade-in"
              >
                <img src={u.avatar} alt="" className="w-5 h-5 rounded-md object-cover" referrerPolicy="no-referrer" />
                <span className="font-bold">@{u.username}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="w-8.5 h-8.5 rounded-xl bg-zinc-950 border border-zinc-900 shrink-0 overflow-hidden select-none">
        <img src={avatarUrl || ANIME_AVATARS[0]} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
      </div>

      <form onSubmit={handleFormSubmit} className="flex-1 min-w-0">
        {isPreviewMode ? (
          <div className="w-full min-h-[48px] bg-zinc-950/40 rounded-xl p-3 text-xs text-zinc-300 font-sans leading-relaxed select-text border border-dashed border-zinc-900/60">
            <span className="text-[8px] uppercase tracking-widest font-mono text-rose-500 block mb-1">Preview mode:</span>
            {text.trim() ? (
              <p className="whitespace-pre-wrap">{renderRichText(text)}</p>
            ) : (
              <p className="text-zinc-650 italic">Empty draft. Type text to preview formatting.</p>
            )}
          </div>
        ) : (
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => handleTextChange(e.target.value)}
            onPaste={handleLocalPaste}
            placeholder={placeholder}
            maxLength={1000}
            className="w-full min-h-[48px] placeholder-zinc-550 text-zinc-200 text-xs bg-transparent outline-none resize-none leading-relaxed font-sans mt-0.5"
          />
        )}

        {/* Thumbnail attachment preview */}
        {attachedImg && (
          <div className="relative inline-block mt-3 group rounded-xl overflow-hidden border border-zinc-900 bg-zinc-950 p-1 select-none">
            <img src={attachedImg} alt="Attachment" className="max-h-24 max-w-[160px] object-cover rounded-lg" referrerPolicy="no-referrer" />
            <button
              type="button"
              onClick={() => setAttachedImg('')}
              className="absolute top-1.5 right-1.5 bg-black/85 hover:bg-black p-1 rounded-full text-zinc-450 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Action rows */}
        <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-zinc-950/25">
          {/* Formatting Controls */}
          <div className="flex items-center gap-2.5 sm:gap-3.5 text-zinc-500">
            <button
              type="button"
              onClick={() => insertSyntax('bold')}
              className="hover:text-[#ef4444] transition-colors cursor-pointer"
              title="Bold text"
            >
              <Bold className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => insertSyntax('italic')}
              className="hover:text-[#ef4444] transition-colors cursor-pointer"
              title="Italic text"
            >
              <Italic className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => insertSyntax('spoiler')}
              className="hover:text-[#ef4444] transition-colors cursor-pointer"
              title="Add Spoiler [spoiler]...[/spoiler]"
            >
              <EyeOff className="w-4 h-4" />
            </button>
            
            {/* Gallery Upload */}
            <div className="relative flex items-center">
              <input
                type="file"
                accept="image/*"
                onChange={handleLocalUpload}
                className="hidden"
                id={`attachment-file-${elementIdSuffix}`}
              />
              <button
                type="button"
                onClick={() => {
                  document.getElementById(`attachment-file-${elementIdSuffix}`)?.click();
                }}
                className={`hover:text-[#ef4444] transition-colors cursor-pointer ${attachedImg ? 'text-[#ef4444]' : ''}`}
                title="Attach Image"
              >
                <ImageIcon className="w-4 h-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => insertSyntax('lock')}
              className="hover:text-[#ef4444] transition-colors cursor-pointer"
              title="Insert Lock tag"
            >
              <Lock className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setIsPreviewMode(!isPreviewMode)}
              className={`hover:text-[#ef4444] transition-colors cursor-pointer ${isPreviewMode ? 'text-[#ef4444]' : ''}`}
              title="Preview Mode"
            >
              <Eye className="w-4 h-4" />
            </button>
          </div>

          {/* Submits and Cancels */}
          <div className="flex items-center gap-2.5 ml-auto">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="px-3 py-1.5 text-[11px] font-bold text-zinc-450 hover:text-white uppercase transition-colors mr-1 shrink-0"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={isSubmitting || (!text.trim() && !attachedImg)}
              className={`flex items-center gap-1.5 px-4.5 py-1.5 font-extrabold text-[11px] rounded-xl uppercase tracking-wider transition-all cursor-pointer ${
                !text.trim() && !attachedImg
                  ? 'bg-zinc-950 border border-zinc-900 text-zinc-650 cursor-not-allowed'
                  : 'bg-[#ef4444] hover:bg-red-750 text-white shadow-lg active:scale-95'
              }`}
            >
              {isSubmitting ? (
                <Loader2 className="w-3 animate-spin" />
              ) : (
                <Send className="w-3 h-3" />
              )}
              <span>{submitLabel}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default function Comments({ animeId, episodeNumber = null, noContainer = false, threadOwnerName, onCommentAdded, animeCover }: CommentsProps) {
  const [comments, setComments] = useState<DiscussionComment[]>([]);
  const [userProfiles, setUserProfiles] = useState<Record<string, any>>({});
  
  useEffect(() => {
    if (comments.length === 0) return;
    const authorNames = Array.from(new Set(comments.map(c => c.author_name).filter(Boolean))) as string[];
    fetchMultipleUserProfiles(authorNames).then((profiles) => {
      setUserProfiles(prev => ({ ...prev, ...profiles }));
    }).catch(console.error);
  }, [comments]);

  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const [needsSchemaSetup, setNeedsSchemaSetup] = useState(false);
  const [copiedSchema, setCopiedSchema] = useState(false);
  
  // Options/Actions panel triggers
  const [openMenuCommentId, setOpenMenuCommentId] = useState<string | null>(null);
  const [hiddenCommentIds, setHiddenCommentIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('anipr8v_hidden_comments');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Automatically close open comment context panels when user clicks elsewhere
  useEffect(() => {
    const handleGlobalClick = () => {
      setOpenMenuCommentId(null);
    };
    document.addEventListener('click', handleGlobalClick);
    return () => {
      document.removeEventListener('click', handleGlobalClick);
    };
  }, []);

  // Custom auth flow triggers
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

  // Popover triggers
  const [showStickerPanel, setShowStickerPanel] = useState(false);
  const [showGifPanel, setShowGifPanel] = useState(false);
  const [imageUrl, setImageUrl] = useState('');

  // Custom GIF/Sticker search and feedback states
  const [mediaSearchQuery, setMediaSearchQuery] = useState('');
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  const [dynamicGifs, setDynamicGifs] = useState<{label: string, url: string}[]>(ANIME_GIFS);
  const [dynamicStickers, setDynamicStickers] = useState<{id: string, label: string, url: string}[]>(ANIME_STICKERS);
  const [isSearchingMedia, setIsSearchingMedia] = useState(false);

  useEffect(() => {
    if (!mediaSearchQuery.trim()) {
      setDynamicGifs(ANIME_GIFS);
      setDynamicStickers(ANIME_STICKERS);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingMedia(true);
      try {
        const type = showGifPanel ? 'gifs' : 'stickers';
        // Connect to Giphy's public API to make searches real and working
        const res = await fetch(`https://api.giphy.com/v1/${type}/search?api_key=dc6zaTOxFJmzC&q=${encodeURIComponent(mediaSearchQuery + ' anime')}&limit=18`);
        const result = await res.json();
        
        if (result && result.data && Array.isArray(result.data)) {
          const mapped = result.data.map((item: any) => ({
            id: item.id || String(Math.random()),
            label: item.title ? item.title.replace(' GIF', '').trim() : 'Live React',
            url: item.images?.fixed_height?.url || item.images?.original?.url || ''
          }));
          
          if (showGifPanel) {
            setDynamicGifs(mapped);
          } else {
            setDynamicStickers(mapped);
          }
        }
      } catch (err) {
        console.warn("Giphy public search failed, falling back to local query matcher", err);
        if (showGifPanel) {
          setDynamicGifs(ANIME_GIFS.filter(g => g.label.toLowerCase().includes(mediaSearchQuery.toLowerCase())));
        } else {
          setDynamicStickers(ANIME_STICKERS.filter(s => s.label.toLowerCase().includes(mediaSearchQuery.toLowerCase())));
        }
      } finally {
        setIsSearchingMedia(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [mediaSearchQuery, showGifPanel, showStickerPanel]);

  const filteredGifs = useMemo(() => dynamicGifs, [dynamicGifs]);
  const filteredStickers = useMemo(() => dynamicStickers, [dynamicStickers]);

  const handleSelectReaction = (url: string, type: 'gif' | 'sticker') => {
    // Copy URL to clip
    navigator.clipboard.writeText(url)
      .then(() => {
        setCopyFeedback(`${type === 'gif' ? 'GIF' : 'Sticker'} copied to clipboard & added to comment!`);
        setTimeout(() => setCopyFeedback(null), 2500);
      })
      .catch(() => {
        setCopyFeedback(`Added to comment!`);
        setTimeout(() => setCopyFeedback(null), 2005);
      });

    // Automatically goes to comment box
    const tag = `[${type}]${url}[/${type}]`;
    setInputText(prev => prev ? `${prev} ${tag}` : tag);
    document.getElementById('comment-box-input')?.focus();
    
    setShowGifPanel(false);
    setShowStickerPanel(false);
    setMediaSearchQuery('');
  };

  const handleTextareaPaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64String = reader.result as string;
            setImageUrl(base64String);
          };
          reader.readAsDataURL(file);
        }
        return;
      }
    }
  };

  const handlePasteFromClipboard = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.read) {
        const clipboardItems = await navigator.clipboard.read();
        for (const item of clipboardItems) {
          for (const type of item.types) {
            if (type.startsWith('image/')) {
              const blob = await item.getType(type);
              const reader = new FileReader();
              reader.onloadend = () => {
                const base64String = reader.result as string;
                setImageUrl(base64String);
              };
              reader.readAsDataURL(blob);
              return;
            }
          }
        }
      }
    } catch (e) {
      console.warn("Direct clipboard image read fallback to text");
    }

    try {
      const text = await navigator.clipboard.readText();
      if (!text) {
        setCopyFeedback('Clipboard contents are empty!');
        setTimeout(() => setCopyFeedback(null), 2000);
        return;
      }
      if (text.startsWith('http://') || text.startsWith('https://') || text.startsWith('data:image')) {
        setImageUrl(text);
      } else {
        setMediaSearchQuery(text);
        if (showGifPanel || showStickerPanel) {
          setCopyFeedback(`Searching media for: "${text}"`);
        } else {
          setShowGifPanel(true);
          setCopyFeedback(`Searching GIFs for: "${text}"`);
        }
      }
      setTimeout(() => setCopyFeedback(null), 2000);
    } catch (e) {
      setCopyFeedback('Manual click visual input active!');
      setTimeout(() => setCopyFeedback(null), 2500);
    }
  };

  const handleGalleryUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setImageUrl(base64String);
    };
    reader.readAsDataURL(file);
  };

  // Replying state - can reply to any comment or sub-comment
  const [replyToComment, setReplyToComment] = useState<DiscussionComment | null>(null);

  // Discord profile popup state
  const [selectedProfileUsername, setSelectedProfileUsername] = useState<string | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Browser ID for guest likes fallback
  const [browserId] = useState(() => {
    let id = localStorage.getItem('otaku_browser_id');
    if (!id) {
      id = 'br_' + Math.random().toString(36).substring(2, 15);
      localStorage.setItem('otaku_browser_id', id);
    }
    return id;
  });

  // Sync logged in profile on mounts and changes
  useEffect(() => {
    const handleAuthChange = () => {
      setCurrentUser(getStoredUser());
    };
    handleAuthChange();
    window.addEventListener('anipr8v_auth_change', handleAuthChange);
    return () => {
      window.removeEventListener('anipr8v_auth_change', handleAuthChange);
    };
  }, []);

  // Reload user state trigger
  const handleAuthSuccess = (user: UserProfile) => {
    setCurrentUser(user);
  };

  // Fetch comments from db
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setLoading(true);
      setDbError(null);
      setNeedsSchemaSetup(false);

      const { comments: fetched, error } = await getComments(animeId, episodeNumber);
      
      if (!isMounted) return;

      if (error) {
        console.error('Supabase getComments error:', error);
        if (error.code === '42P01' || (error.message && error.message.includes('does not exist'))) {
          setNeedsSchemaSetup(true);
        } else {
          setDbError(error.message || 'Error communicating with Supabase database.');
        }
      } else {
        setComments(fetched);
      }
      setLoading(false);
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [animeId, episodeNumber]);

  // Group comments: top-level and map replies
  const groupedComments = useMemo(() => {
    // Filter out comments hidden by the current user
    const visibleComments = comments.filter(c => !hiddenCommentIds.includes(c.id));

    const topLevel = visibleComments.filter(c => !c.parent_id);
    const repliesMap: Record<string, DiscussionComment[]> = {};

    visibleComments.forEach(c => {
      if (c.parent_id) {
        // Find if this parent comment actually has a parent so we consolidate flat in threads
        let parentId = c.parent_id;
        // Search if the target parent is itself a reply
        const parentNode = visibleComments.find(x => x.id === c.parent_id);
        if (parentNode && parentNode.parent_id) {
          parentId = parentNode.parent_id;
        }

        if (!repliesMap[parentId]) {
          repliesMap[parentId] = [];
        }
        repliesMap[parentId].push(c);
      }
    });

    // Sort replies chronologically
    Object.keys(repliesMap).forEach(key => {
      repliesMap[key].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    });

    return { topLevel, repliesMap };
  }, [comments, hiddenCommentIds]);

  const handleCopySchema = () => {
    navigator.clipboard.writeText(SQL_INITIAL_SCHEMA);
    setCopiedSchema(true);
    setTimeout(() => setCopiedSchema(false), 3000);
  };

  // Prompt logic if user writes without account
  const verifyAuthAndTrigger = (): boolean => {
    const active = getStoredUser();
    if (!active) {
      setIsAuthModalOpen(true);
      return false;
    }
    return true;
  };

  const triggerSimulatedNotifications = (inputTextVal: string, parentAuthorName?: string | null) => {
    if (!inputTextVal) return;

    const currentUser = getStoredUser();

    // 1. New Comment on your community board post
    if (!parentAuthorName && threadOwnerName && threadOwnerName.toLowerCase() !== currentUser?.username?.toLowerCase()) {
      addNotification({
        category: 'Community',
        title: 'New Comment on your post!',
        subtitle: `${currentUser?.username || 'Someone'} commented: "${inputTextVal.substring(0, 60)}${inputTextVal.length > 60 ? '...' : ''}"`,
        animeId: animeId,
        animeImage: animeCover || currentUser?.avatar || ANIME_AVATARS[0],
        userProfile: currentUser?.avatar || ANIME_AVATARS[0],
        userName: currentUser?.username || 'Guest',
        targetUsername: threadOwnerName,
      });
    }

    // 2. Reply notification to parent author if they are NOT the replier
    if (parentAuthorName && parentAuthorName.toLowerCase() !== currentUser?.username?.toLowerCase()) {
      addNotification({
        category: 'Comments',
        title: 'New Reply to your comment',
        subtitle: `${currentUser?.username || 'Someone'} replied: "${inputTextVal.substring(0, 60)}${inputTextVal.length > 60 ? '...' : ''}"`,
        animeId: animeId,
        animeImage: animeCover || currentUser?.avatar || ANIME_AVATARS[0],
        userProfile: currentUser?.avatar || ANIME_AVATARS[0],
        userName: currentUser?.username || 'Guest',
        targetUsername: parentAuthorName,
      });
    }

    // 3. Parse @username mentions in the text
    const mentionRegex = /@([a-zA-Z0-9_\-]+)/g;
    const matches = Array.from(inputTextVal.matchAll(mentionRegex));
    matches.forEach((match) => {
      const pingedUsername = match[1];
      // Avoid notifying yourself
      if (pingedUsername.toLowerCase() !== currentUser?.username?.toLowerCase()) {
        addNotification({
          category: 'Comments',
          title: 'You were mentioned!',
          subtitle: `${currentUser?.username || 'Someone'} mentioned you: "${inputTextVal.substring(0, 60)}${inputTextVal.length > 60 ? '...' : ''}"`,
          animeId: animeId,
          animeImage: animeCover || currentUser?.avatar || ANIME_AVATARS[0],
          userProfile: currentUser?.avatar || ANIME_AVATARS[0],
          userName: currentUser?.username || 'Guest',
          targetUsername: pingedUsername,
        });
      }
    });
  };

  // Handle posting text comments or nested replies
  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyAuthAndTrigger()) return;
    if (!inputText.trim() && !imageUrl) return;

    setIsSubmitting(true);
    let finalPayloadText = inputText.trim();
    if (imageUrl) {
      // Append images link nicely or format in brackets
      finalPayloadText = finalPayloadText 
        ? `${finalPayloadText}\n\n[img]${imageUrl}[/img]` 
        : `[img]${imageUrl}[/img]`;
    }

    const { comment, error } = await postComment({
      animeId,
      episodeNumber,
      authorName: currentUser?.username || 'GuestOtaku',
      authorAvatar: currentUser?.avatar || ANIME_AVATARS[0],
      commentText: finalPayloadText,
      parentId: replyToComment ? replyToComment.id : null,
    });

    if (error) {
      setDbError(error.message || 'Failed to submit comment. Try again.');
    } else if (comment) {
      // Handle injecting current user custom tags or properties if needed on live state
      const extendedComment = {
        ...comment,
        // Carry local tags for live rendering before refetch
        metadata: {
          tag: currentUser?.tag || 'Otaku',
          status: currentUser?.status || 'Online'
        }
      };
      setComments(prev => [...prev, extendedComment]);
      setInputText('');
      setImageUrl('');
      setReplyToComment(null);
      if (onCommentAdded) {
        onCommentAdded();
      }

      triggerSimulatedNotifications(finalPayloadText, replyToComment?.author_name);
    }
    setIsSubmitting(false);
  };

  // Immediate sticker submission
  const handleSendSticker = async (stickerUrl: string) => {
    if (!verifyAuthAndTrigger()) return;

    setIsSubmitting(true);
    const stickerPayloadText = `[sticker]${stickerUrl}[/sticker]`;

    const { comment, error } = await postComment({
      animeId,
      episodeNumber,
      authorName: currentUser?.username || 'GuestOtaku',
      authorAvatar: currentUser?.avatar || ANIME_AVATARS[0],
      commentText: stickerPayloadText,
      parentId: replyToComment ? replyToComment.id : null,
    });

    if (error) {
      setDbError(error.message);
    } else if (comment) {
      const extendedComment = {
        ...comment,
        metadata: {
          tag: currentUser?.tag || 'Otaku',
          status: currentUser?.status || 'Online'
        }
      };
      setComments(prev => [...prev, extendedComment]);
      setReplyToComment(null);
      setShowStickerPanel(false);
      if (onCommentAdded) {
        onCommentAdded();
      }

      triggerSimulatedNotifications("sent a custom sticker react in chat", replyToComment?.author_name);
    }
    setIsSubmitting(false);
  };

  // Immediate GIF reaction submission
  const handleSendGif = async (gifUrl: string) => {
    if (!verifyAuthAndTrigger()) return;

    setIsSubmitting(true);
    const gifPayloadText = `[gif]${gifUrl}[/gif]`;

    const { comment, error } = await postComment({
      animeId,
      episodeNumber,
      authorName: currentUser?.username || 'GuestOtaku',
      authorAvatar: currentUser?.avatar || ANIME_AVATARS[0],
      commentText: gifPayloadText,
      parentId: replyToComment ? replyToComment.id : null,
    });

    if (error) {
      setDbError(error.message);
    } else if (comment) {
      const extendedComment = {
        ...comment,
        metadata: {
          tag: currentUser?.tag || 'Otaku',
          status: currentUser?.status || 'Online'
        }
      };
      setComments(prev => [...prev, extendedComment]);
      setReplyToComment(null);
      setShowGifPanel(false);
      if (onCommentAdded) {
        onCommentAdded();
      }

      triggerSimulatedNotifications("sent an animated GIF reaction", replyToComment?.author_name);
    }
    setIsSubmitting(false);
  };

  const handleLike = async (commentId: string) => {
    const comment = comments.find(c => c.id === commentId);
    if (!comment) return;

    const signatureId = currentUser?.email || browserId;
    const alreadyLiked = comment.likes_user_ids.includes(signatureId);
    
    const newLikesUserIds = alreadyLiked 
      ? comment.likes_user_ids.filter(id => id !== signatureId)
      : [...comment.likes_user_ids, signatureId];
    const newLikesCount = alreadyLiked ? Math.max(0, comment.likes_count - 1) : comment.likes_count + 1;

    // Optimistic toggle
    setComments(prev => prev.map(c => {
      if (c.id === commentId) {
        return { ...c, likes_count: newLikesCount, likes_user_ids: newLikesUserIds };
      }
      return c;
    }));

    const { error } = await toggleLikeComment(
      commentId,
      comment.likes_count,
      comment.likes_user_ids,
      signatureId
    );

    if (error) {
      // Revert optimistic
      setComments(prev => prev.map(c => {
        if (c.id === commentId) {
          return { ...c, likes_count: comment.likes_count, likes_user_ids: comment.likes_user_ids };
        }
        return c;
      }));
      setDbError(error.message);
    }
  };

  const openUserProfile = (username: string) => {
    setSelectedProfileUsername(username);
    setIsProfileModalOpen(true);
  };

  const handleHideComment = (commentId: string) => {
    const updated = [...hiddenCommentIds, commentId];
    setHiddenCommentIds(updated);
    localStorage.setItem('anipr8v_hidden_comments', JSON.stringify(updated));
    setOpenMenuCommentId(null);
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      // Optimistic state filtering
      setComments(prev => prev.filter(c => c.id !== commentId));
      setOpenMenuCommentId(null);
      if (onCommentAdded) {
        onCommentAdded();
      }

      const { success, error } = await deleteComment(commentId);
      if (!success) {
        console.error('Failed to delete comment from Supabase:', error);
        // Fallback: reload comments list
        const { comments: reloaded } = await getComments(animeId, episodeNumber);
        if (reloaded) setComments(reloaded);
      }
    } catch (err) {
      console.error('Error deleting comment:', err);
    }
  };

  // Parser helper to render stickers, GIFs, and images embedded nicely
  const renderCommentBodyText = (text: string) => {
    if (!text) return null;

    // 1. Check if comment is purely a sticker
    const stickerMatch = text.match(/\[sticker\](.*?)\[\/sticker\]/);
    if (stickerMatch && stickerMatch[1]) {
      const stickerUrl = stickerMatch[1];
      if (!isSafeUrl(stickerUrl)) {
        return <p className="text-xs text-red-500 font-mono italic">[Insecure Sticker Protocol Blocked]</p>;
      }
      return (
        <div className="mt-1.5 rounded-lg overflow-hidden max-w-[120px] max-h-[120px] hover:scale-105 transition-all">
          <img src={stickerUrl} alt="Sticker Reaction" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
        </div>
      );
    }

    // 2. Check if comment is purely a GIF
    const gifMatch = text.match(/\[gif\](.*?)\[\/gif\]/);
    if (gifMatch && gifMatch[1]) {
      const gifUrl = gifMatch[1];
      if (!isSafeUrl(gifUrl)) {
        return <p className="text-xs text-red-500 font-mono italic">[Insecure GIF Protocol Blocked]</p>;
      }
      return (
        <div className="mt-1.5 rounded-xl overflow-hidden max-w-[200px] border border-zinc-900/60 shadow hover:border-zinc-800">
          <img src={gifUrl} alt="GIF Reaction" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
        </div>
      );
    }

    // 3. Render body text & extract any embedded image block
    let plainText = text;
    let inlineImageUrl = '';

    const imgMatch = text.match(/\[img\](.*?)\[\/img\]/);
    if (imgMatch && imgMatch[1]) {
      const imgUrl = imgMatch[1];
      if (isSafeUrl(imgUrl)) {
        inlineImageUrl = imgUrl;
      }
      plainText = text.replace(/\[img\](.*?)\[\/img\]/, '').trim();
    }

    return (
      <div className="flex flex-col gap-2 mt-1">
        {plainText && (
          <p className="text-xs text-zinc-300 leading-relaxed break-words whitespace-pre-wrap font-sans">
            {renderRichText(plainText)}
          </p>
        )}
        {inlineImageUrl && (
          <div className="mt-1.5 rounded-xl overflow-hidden max-w-[240px] border border-zinc-900 shadow-sm hover:border-red-950/40 transition-all duration-300">
            <img src={inlineImageUrl} alt="User upload thumbnail" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          </div>
        )}
      </div>
    );
  };

  const [replyInputId, setReplyInputId] = useState<string | null>(null);
  const [dislikedCommentIds, setDislikedCommentIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('anipr8v_disliked_comments');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const handleDislike = (id: string) => {
    setDislikedCommentIds(prev => {
      const updated = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      localStorage.setItem('anipr8v_disliked_comments', JSON.stringify(updated));
      return updated;
    });
  };

  const renderCommentNode = (comment: DiscussionComment, isReply = false) => {
    const signatureId = currentUser?.email || browserId;
    const hasLiked = comment.likes_user_ids.includes(signatureId);
    
    const dateFormatted = new Date(comment.created_at).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    // Detect dynamic forum tags based on user actions and post roles
    const isOwner = threadOwnerName && comment.author_name.toLowerCase() === threadOwnerName.toLowerCase();
    const isSirsilvex = comment.author_name.toLowerCase() === 'sirsilvex' || comment.author_name.toLowerCase() === 'admin' || comment.author_name.toLowerCase() === 'ezkarussia';
    
    const liveProfile = userProfiles[comment.author_name.toLowerCase()];

    // Resolve the user's explicitly chosen tag from logged-in state, custom database profile, or comment metadata
    let selectedUserTag = '';
    if (currentUser && comment.author_name.toLowerCase() === currentUser.username.toLowerCase()) {
      selectedUserTag = currentUser.tag || 'Otaku';
    } else if (liveProfile && liveProfile.tag) {
      selectedUserTag = liveProfile.tag;
    } else if ((comment as any).metadata?.tag) {
      selectedUserTag = (comment as any).metadata.tag;
    }

    let userRoleLabel = selectedUserTag;

    // Fall back to general contextual roles ONLY if the user hasn't chosen/fetched a tag yet
    if (!userRoleLabel) {
      if (episodeNumber) {
        userRoleLabel = 'Watcher';
      } else if (threadOwnerName) {
        userRoleLabel = 'Forum Participant';
      } else {
        userRoleLabel = 'Otaku';
      }
    }

    // Special staff/creator overlays take priority
    if (isSirsilvex) {
      userRoleLabel = 'Sirsilvex';
    } else if (isOwner) {
      userRoleLabel = 'Owner Of Post';
    }

    const resolvedAvatar = (currentUser && comment.author_name === currentUser.username)
      ? (currentUser.avatar || ANIME_AVATARS[0])
      : (liveProfile?.avatar || comment.author_avatar || ANIME_AVATARS[0]);

    const getTagColorClass = (label: string) => {
      if (label === 'Sirsilvex') {
        return 'bg-white/10 text-white border-white/25 font-black shadow-sm font-black';
      }
      if (label === 'Owner Of Post') {
        return 'bg-[#ef4444]/15 text-[#ef4444] border-[#ef4444]/25 font-black';
      }
      if (label === 'Otaku') {
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20 font-bold';
      }
      if (label === 'Kuudere') {
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20 font-bold';
      }
      if (label === 'Tsundere') {
        return 'bg-pink-500/10 text-pink-400 border-pink-500/20 font-bold';
      }
      return 'bg-zinc-900 text-zinc-400 border-zinc-840 font-bold';
    };

    const isDisliked = dislikedCommentIds.includes(comment.id);
    const parentCommentNode = comment.parent_id ? comments.find(c => c.id === comment.parent_id) : null;
    const parentAuthor = parentCommentNode?.author_name;
    const parentTextSnippet = parentCommentNode ? parentCommentNode.comment_text.replace(/\[.*?\]/g, '') : '';

    return (
      <div 
        key={comment.id}
        className="flex items-start gap-3.5 py-4 border-b border-zinc-900/35 last:border-b-0 animate-fade-in text-left"
      >
        <button
          type="button"
          onClick={() => openUserProfile(comment.author_name)}
          className="w-10 h-10 rounded-xl border border-zinc-900 bg-zinc-950 shrink-0 overflow-hidden relative group cursor-pointer active:scale-95 transition-all"
          title="Inspect Profile"
        >
          <img 
            src={resolvedAvatar} 
            alt={comment.author_name} 
            className="w-full h-full object-cover group-hover:scale-108 transition-all"
            referrerPolicy="no-referrer"
          />
        </button>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-1.5 mb-1.5 select-none">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0">
              <button
                type="button"
                onClick={() => openUserProfile(comment.author_name)}
                className="text-xs font-mono font-black text-[#ef4444] hover:text-white transition-colors max-w-[150px] xs:max-w-[200px] sm:max-w-none shrink-0"
              >
                @{comment.author_name}
              </button>
              <span className={`text-[8px] font-mono uppercase tracking-widest px-1.5 py-0.5 rounded border leading-none select-none inline-flex items-center shrink-0 ${getTagColorClass(userRoleLabel)}`}>
                {userRoleLabel === 'Sirsilvex' && <PorscheIcon />}
                {userRoleLabel}
              </span>
            </div>
            
            <div className="flex items-center gap-2 shrink-0 relative">
              <span className="text-[9.5px] text-zinc-550 font-mono font-medium animate-fade-in">
                {dateFormatted}
              </span>
              
              {/* Three dots button */}
              <div className="relative">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenMenuCommentId(openMenuCommentId === comment.id ? null : comment.id);
                  }}
                  className="p-1 hover:bg-zinc-950 rounded-md text-zinc-550 hover:text-white transition-colors cursor-pointer"
                  title="Comment options"
                >
                  <MoreHorizontal className="w-3.5 h-3.5" />
                </button>
                
                {/* Options Panel Dropdown */}
                {openMenuCommentId === comment.id && (
                  <div className="absolute right-0 top-6 z-55 w-36 bg-[#0c0c10] border border-zinc-900 rounded-xl shadow-2xl p-1 flex flex-col gap-0.5 animate-fade-in">
                    <button
                      type="button"
                      onClick={() => handleHideComment(comment.id)}
                      className="w-full text-left px-2.5 py-1.5 text-[11px] font-semibold text-zinc-350 hover:text-white hover:bg-zinc-900 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <span>Hide Comment</span>
                    </button>
                    {currentUser && comment.author_name === currentUser.username && (
                      <button
                        type="button"
                        onClick={() => handleDeleteComment(comment.id)}
                        className="w-full text-left px-2.5 py-1.5 text-[11px] font-semibold text-red-500 hover:text-red-400 hover:bg-red-950/20 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <span>Delete</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Render Parent Quote badging block for subnested threads */}
          {isReply && parentCommentNode && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-zinc-950/50 border border-zinc-900/60 rounded-lg text-[10px] font-semibold text-zinc-450 select-none mb-2 w-fit">
              <span className="text-zinc-500 font-bold shrink-0">to</span>
              <span className="text-[#3b82f6] font-extrabold max-w-[80px] truncate shrink-0">@{parentAuthor}</span>
              <span className="text-zinc-700 font-mono text-[8px] shrink-0 font-bold">"</span>
              <span className="italic truncate max-w-[120px] xs:max-w-[200px] sm:max-w-none text-zinc-500 font-medium">
                {parentTextSnippet.length > 40 ? `${parentTextSnippet.slice(0, 40)}...` : parentTextSnippet}
              </span>
              <span className="text-zinc-700 font-mono text-[8px] shrink-0 font-bold">"</span>
            </div>
          )}

          {/* Render parsed text block with pictures */}
          {renderCommentBodyText(comment.comment_text)}

          {/* Comment tools footer toolbar */}
          <div className="flex items-center gap-4 mt-2.5 pt-1.5 select-none leading-none">
            {/* THUMBS UP */}
            <button
              onClick={() => handleLike(comment.id)}
              className={`flex items-center gap-1.5 text-[11.5px] font-black font-mono transition-colors cursor-pointer ${
                hasLiked ? 'text-rose-500 font-bold' : 'text-zinc-500 hover:text-zinc-350'
              }`}
            >
              <ThumbsUp className={`w-3.5 h-3.5 ${hasLiked ? 'fill-rose-500' : ''}`} />
              <span>{comment.likes_count}</span>
            </button>

            {/* THUMBS DOWN */}
            <button
              onClick={() => handleDislike(comment.id)}
              className={`flex items-center gap-1 text-[11px] font-extrabold font-mono transition-colors cursor-pointer ${
                isDisliked ? 'text-zinc-350' : 'text-zinc-500 hover:text-zinc-350'
              }`}
            >
              <ThumbsDown className={`w-3.5 h-3.5 ${isDisliked ? 'fill-zinc-400' : ''}`} />
            </button>

            {/* Reply trigger button */}
            <button
              onClick={() => {
                if (!verifyAuthAndTrigger()) return;
                setReplyInputId(replyInputId === comment.id ? null : comment.id);
              }}
              className="text-[11px] font-extrabold text-zinc-550 hover:text-white transition-all cursor-pointer font-mono"
            >
              REPLY
            </button>
          </div>

          {/* Inline reply editor */}
          {replyInputId === comment.id && (
            <div className="mt-4.5 animate-fade-in text-left">
              <CommentInputBox
                placeholder={`Reply to @${comment.author_name}...`}
                submitLabel="Reply"
                onCancel={() => setReplyInputId(null)}
                avatarUrl={currentUser?.avatar}
                isSubmitting={isSubmitting}
                onSubmit={async (text, attachedImg) => {
                  let finalPayload = text;
                  if (attachedImg) {
                    finalPayload = `[img]${attachedImg}[/img] ${text}`;
                  }
                  
                  setIsSubmitting(true);
                  const { comment: newComment, error } = await postComment({
                    animeId,
                    episodeNumber,
                    authorName: currentUser?.username || 'GuestOtaku',
                    authorAvatar: currentUser?.avatar || ANIME_AVATARS[0],
                    commentText: finalPayload,
                    parentId: comment.id,
                  });

                  if (error) {
                    setDbError(error.message);
                  } else if (newComment) {
                    setComments(prev => [...prev, newComment]);
                    setReplyInputId(null);
                    if (onCommentAdded) onCommentAdded();

                    triggerSimulatedNotifications(text, comment.author_name);
                  }
                  setIsSubmitting(false);
                }}
              />
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full mt-6 text-left animate-fade-in">
      
      {/* 1. Header component board */}
      <div className="flex items-center justify-between border-b border-zinc-900 pb-4 mb-6 select-none">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-[#ef4444]" />
          <h3 className="text-base font-black text-white uppercase tracking-wider font-mono">
            Comment Section
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-zinc-500 text-[10px] font-black uppercase tracking-wider bg-zinc-950 px-3 py-1 rounded-full border border-zinc-900 font-mono">
            {comments.length} Discussion{comments.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {dbError && (
        <div className="mb-4 p-3 bg-red-950/20 border border-red-900/30 text-red-400 rounded-xl text-xs flex items-center gap-2 font-mono">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{dbError}</span>
          <button onClick={() => setDbError(null)} className="ml-auto hover:text-white font-bold cursor-pointer">×</button>
        </div>
      )}

      {/* SQL Table schema indicator fallback check */}
      {needsSchemaSetup ? (
        <div className="border border-red-900/30 bg-[#0f0a0a] rounded-2xl p-5 mb-8 animate-fade-in select-none">
          <div className="flex items-start gap-3 mb-3">
            <div className="p-2 bg-red-950/40 border border-red-900/30 rounded-xl text-red-500 shrink-0">
              <AlertTriangle className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h4 className="text-xs font-black text-white uppercase tracking-wider font-mono">
                Create Database Table Required
              </h4>
              <p className="text-zinc-400 text-[11px] leading-relaxed mt-0.5">
                Great job providing the Supabase details! Now we just need to run a small SQL schema command to build the `anime_comments` table. 
              </p>
            </div>
          </div>

          <div className="bg-[#050303] border border-zinc-900 rounded-lg p-3.5 mb-4 relative font-mono text-[9.5px] text-zinc-500 h-32 overflow-y-auto select-all custom-scrollbar">
            <pre className="text-zinc-400">{SQL_INITIAL_SCHEMA}</pre>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-zinc-950/60 p-3 rounded-xl border border-zinc-900">
            <button
              onClick={handleCopySchema}
              className={`flex items-center justify-center gap-1.5 px-4 py-2 font-bold font-mono text-[10px] rounded-lg border uppercase transition-all cursor-pointer ${
                copiedSchema 
                  ? 'bg-zinc-900 border-zinc-800 text-red-400' 
                  : 'bg-red-600 hover:bg-red-700 border-red-600 text-white'
              }`}
            >
              {copiedSchema ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedSchema ? 'COPIED!' : 'Copy SQL Schema'}</span>
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Main comments and replies entry box representing the sole comment bar */}
          <div className="mb-6">
            {!currentUser ? (
              <div className="border border-zinc-900 bg-zinc-950/40 p-6 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left select-none">
                <div className="flex flex-col md:flex-row items-center gap-3.5">
                  <div className="p-3 bg-red-955/20 border border-red-500/20 rounded-xl max-w-fit">
                    <Lock className="w-5 h-5 text-red-500 animate-pulse" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-white uppercase tracking-wider">Join our Otaku Community Discussion!</h4>
                    <p className="text-[11px] text-zinc-500 mt-0.5 max-w-md">Please register or log in to post comments, customize stickers, and interact with releases.</p>
                  </div>
                </div>
                <button
                  onClick={() => window.dispatchEvent(new CustomEvent('anipriv8_open_auth'))}
                  className="px-4 py-2 bg-red-650 hover:bg-red-700 text-white text-xs font-extrabold uppercase tracking-widest rounded-lg cursor-pointer transition-all hover:scale-103 active:scale-97 shadow-lg shadow-red-650/20 shrink-0"
                >
                  Log In / Register
                </button>
              </div>
            ) : (
              <CommentInputBox
                placeholder="Join our discussion... Supports bold, italics, spoilers and image paste reactions!"
                submitLabel="Comment"
                avatarUrl={currentUser?.avatar}
                isSubmitting={isSubmitting}
                onSubmit={async (text, attachedImg) => {
                  let finalPayload = text;
                  if (attachedImg) {
                    finalPayload = `[img]${attachedImg}[/img] ${text}`;
                  }

                  setIsSubmitting(true);
                  const { comment: newComment, error } = await postComment({
                    animeId,
                    episodeNumber,
                    authorName: currentUser?.username || 'GuestOtaku',
                    authorAvatar: currentUser?.avatar || ANIME_AVATARS[0],
                    commentText: finalPayload,
                    parentId: null,
                  });

                  if (error) {
                    setDbError(error.message);
                  } else if (newComment) {
                    setComments(prev => [...prev, newComment]);
                    if (onCommentAdded) onCommentAdded();

                    triggerSimulatedNotifications(text);
                  }
                  setIsSubmitting(false);
                }}
              />
            )}
          </div>

          {/* Comments list stack */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2 select-none">
              <Loader2 className="w-6 h-6 text-red-600 animate-spin" />
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider font-mono">
                Fetching broadcast discussions...
              </span>
            </div>
          ) : comments.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center bg-zinc-950/10 border border-dashed border-zinc-900 rounded-2xl py-12 select-none">
              <TrendingUp className="w-7 h-7 text-zinc-600 mb-2.5" />
              <h4 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-1.5 font-mono">
                Be the first to speak
              </h4>
              <p className="text-zinc-500 text-[10.5px] max-w-xs leading-relaxed">
                No comments have been posted for this episode yet. Post a comment above to launch the discussions!
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {groupedComments.topLevel.map((parentComment) => {
                const commentReplies = groupedComments.repliesMap[parentComment.id] || [];

                return (
                  <div key={parentComment.id} className="flex flex-col gap-3">
                    {/* Parent Comment */}
                    {renderCommentNode(parentComment, false)}

                    {/* Left indented list of replies - Supports replying to anyone flattening */}
                    {commentReplies.length > 0 && (
                      <div className="pl-4 border-l border-zinc-900/85 flex flex-col gap-3 ml-4.5">
                        {commentReplies.map((reply) => renderCommentNode(reply, true))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Auth register popup if comment attempted anonymously */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
      />

      {/* Discord User Profile popover popup info container */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        username={selectedProfileUsername || ''}
        onClose={() => setIsProfileModalOpen(false)}
      />
    </div>
  );
}
