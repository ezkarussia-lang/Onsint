import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://zeyunnzlhmgvacvfldnk.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpleXVubnpsaG1ndmFjdmZsZG5rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0NDg3OTUsImV4cCI6MjA5NTAyNDc5NX0.1vq4aHbpUdg3JsdIOQT5UswOiQREiKQV4oNzMN5Paz8';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export interface DiscussionComment {
  id: string;
  anime_id: number;
  episode_number: number | null;
  author_name: string;
  author_avatar: string;
  comment_text: string;
  created_at: string;
  parent_id: string | null;
  likes_count: number;
  likes_user_ids: string[];
}

export interface CommunityThread {
  id: string;
  title: string;
  category: string; // 'Discussions' | 'Lists' | 'Announcements'
  author_name: string;
  author_avatar: string;
  content: string;
  created_at: string;
  likes_count: number;
  likes_user_ids: string[];
  replies_count: number;
}

export const SQL_INITIAL_SCHEMA = `
-- 1. Create the Anime Comments table (for episodes)
CREATE TABLE IF NOT EXISTS public.anime_comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    anime_id INTEGER NOT NULL,
    episode_number INTEGER,
    author_name TEXT NOT NULL,
    author_avatar TEXT,
    comment_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    parent_id UUID REFERENCES public.anime_comments(id) ON DELETE CASCADE,
    likes_count INTEGER DEFAULT 0 NOT NULL,
    likes_user_ids TEXT[] DEFAULT '{}'::TEXT[] NOT NULL
);

-- 2. Create the Community Forums table (for general channels)
CREATE TABLE IF NOT EXISTS public.community_threads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    category TEXT NOT NULL, -- 'Discussions' | 'Lists' | 'Announcements'
    author_name TEXT NOT NULL,
    author_avatar TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    likes_count INTEGER DEFAULT 0 NOT NULL,
    likes_user_ids TEXT[] DEFAULT '{}'::TEXT[] NOT NULL,
    replies_count INTEGER DEFAULT 0 NOT NULL
);

-- 3. Create indexes for lighting-fast lookups
CREATE INDEX IF NOT EXISTS idx_anime_comments_anime_ep ON public.anime_comments(anime_id, episode_number);
CREATE INDEX IF NOT EXISTS idx_anime_comments_parent ON public.anime_comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_community_threads_cat ON public.community_threads(category);

-- 4. Enable Row Level Security (RLS) on both tables
ALTER TABLE public.anime_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_threads ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS Policies to allow anyone to read, insert & update likes anonymously
DO $$
BEGIN
    -- Policies for public.anime_comments
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'anime_comments' AND policyname = 'Allow public read access') THEN
        CREATE POLICY "Allow public read access" ON public.anime_comments FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'anime_comments' AND policyname = 'Allow public insert access') THEN
        CREATE POLICY "Allow public insert access" ON public.anime_comments FOR INSERT WITH CHECK (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'anime_comments' AND policyname = 'Allow public update access for likes') THEN
        CREATE POLICY "Allow public update access for likes" ON public.anime_comments FOR UPDATE USING (true) WITH CHECK (true);
    END IF;

    -- Policies for public.community_threads
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'community_threads' AND policyname = 'Allow public read access on threads') THEN
        CREATE POLICY "Allow public read access on threads" ON public.community_threads FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'community_threads' AND policyname = 'Allow public insert access on threads') THEN
        CREATE POLICY "Allow public insert access on threads" ON public.community_threads FOR INSERT WITH CHECK (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'community_threads' AND policyname = 'Allow public update access on threads') THEN
        CREATE POLICY "Allow public update access on threads" ON public.community_threads FOR UPDATE USING (true) WITH CHECK (true);
    END IF;
END
$$;

-- 6. Create User Profiles table for registering and logging in users persistently
CREATE TABLE IF NOT EXISTS public.user_profiles (
    email TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    avatar TEXT NOT NULL,
    bio TEXT,
    website TEXT,
    status TEXT DEFAULT 'Online' NOT NULL,
    tag TEXT DEFAULT 'Otaku' NOT NULL,
    banner TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Create Anime and Manga Lists table for sync and storage per user
CREATE TABLE IF NOT EXISTS public.anime_lists (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    username TEXT NOT NULL,
    anime_id INTEGER NOT NULL,
    anime_title TEXT NOT NULL,
    anime_cover TEXT NOT NULL,
    status TEXT NOT NULL, -- 'Watching' | 'Reading' | 'Onhold' | 'Completed' | 'Dropped' | 'Plantowatch' | 'Plantoread'
    type TEXT DEFAULT 'anime' NOT NULL, -- 'anime' | 'manga'
    added_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (username, anime_id, type)
);

-- Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anime_lists ENABLE ROW LEVEL SECURITY;

-- 8. Create user_notifications table for real-time cross-user syncing
CREATE TABLE IF NOT EXISTS public.user_notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    subtitle TEXT NOT NULL,
    anime_id INTEGER,
    anime_image TEXT,
    user_profile TEXT,
    user_name TEXT,
    target_username TEXT,
    read BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

-- 9. Create Favourited Songs table for users
CREATE TABLE IF NOT EXISTS public.favourited_songs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    username TEXT NOT NULL,
    track_id TEXT NOT NULL,
    title TEXT NOT NULL,
    anime_title TEXT NOT NULL,
    artist TEXT NOT NULL,
    audio_url TEXT NOT NULL,
    cover_image TEXT NOT NULL,
    type TEXT NOT NULL,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (username, track_id)
);

ALTER TABLE public.favourited_songs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    -- Policies for Profiles
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_profiles' AND policyname = 'Allow public read profiles') THEN
        CREATE POLICY "Allow public read profiles" ON public.user_profiles FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_profiles' AND policyname = 'Allow public insert profiles') THEN
        CREATE POLICY "Allow public insert profiles" ON public.user_profiles FOR INSERT WITH CHECK (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_profiles' AND policyname = 'Allow public update profiles') THEN
        CREATE POLICY "Allow public update profiles" ON public.user_profiles FOR UPDATE USING (true) WITH CHECK (true);
    END IF;

    -- Policies for Lists
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'anime_lists' AND policyname = 'Allow public read lists') THEN
        CREATE POLICY "Allow public read lists" ON public.anime_lists FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'anime_lists' AND policyname = 'Allow public write lists') THEN
        CREATE POLICY "Allow public write lists" ON public.anime_lists FOR INSERT WITH CHECK (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'anime_lists' AND policyname = 'Allow public update lists') THEN
        CREATE POLICY "Allow public update lists" ON public.anime_lists FOR UPDATE USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'anime_lists' AND policyname = 'Allow public delete lists') THEN
        CREATE POLICY "Allow public delete lists" ON public.anime_lists FOR DELETE USING (true);
    END IF;

    -- Policies for user_notifications
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_notifications' AND policyname = 'Allow public read notifications') THEN
        CREATE POLICY "Allow public read notifications" ON public.user_notifications FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_notifications' AND policyname = 'Allow public insert notifications') THEN
        CREATE POLICY "Allow public insert notifications" ON public.user_notifications FOR INSERT WITH CHECK (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_notifications' AND policyname = 'Allow public update notifications') THEN
        CREATE POLICY "Allow public update notifications" ON public.user_notifications FOR UPDATE USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_notifications' AND policyname = 'Allow public delete notifications') THEN
        CREATE POLICY "Allow public delete notifications" ON public.user_notifications FOR DELETE USING (true);
    END IF;

    -- Policies for Favourites
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'favourited_songs' AND policyname = 'Allow public read favourites') THEN
        CREATE POLICY "Allow public read favourites" ON public.favourited_songs FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'favourited_songs' AND policyname = 'Allow public insert favourites') THEN
        CREATE POLICY "Allow public insert favourites" ON public.favourited_songs FOR INSERT WITH CHECK (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'favourited_songs' AND policyname = 'Allow public update favourites') THEN
        CREATE POLICY "Allow public update favourites" ON public.favourited_songs FOR UPDATE USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'favourited_songs' AND policyname = 'Allow public delete favourites') THEN
        CREATE POLICY "Allow public delete favourites" ON public.favourited_songs FOR DELETE USING (true);
    END IF;
END
$$;
`;

/**
 * Push notification to Supabase if supported
 */
export async function pushDbNotification(notif: {
  category: string;
  title: string;
  subtitle: string;
  animeId?: number | null;
  animeImage?: string | null;
  userProfile?: string | null;
  userName?: string | null;
  targetUsername?: string | null;
}): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('user_notifications')
      .insert([
        {
          category: notif.category,
          title: notif.title,
          subtitle: notif.subtitle,
          anime_id: notif.animeId || null,
          anime_image: notif.animeImage || null,
          user_profile: notif.userProfile || null,
          user_name: notif.userName || null,
          target_username: notif.targetUsername || null,
          read: false
        }
      ]);
    if (error) {
      console.warn('[Supabase] Failed to push notifications row:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[Supabase] Error in pushDbNotification:', err);
    return false;
  }
}

/**
 * Fetch notifications from Supabase
 */
export async function fetchDbNotifications(username: string): Promise<any[]> {
  if (!username) return [];
  try {
    const { data, error } = await supabase
      .from('user_notifications')
      .select('*')
      .eq('target_username', username)
      .order('created_at', { ascending: false });

    if (error || !data) {
      if (error && error.code !== 'PGRST116') {
        console.warn('[Supabase] fetchDbNotifications failed:', error);
      }
      return [];
    }
    
    return data.map(item => ({
      id: item.id,
      category: item.category,
      title: item.title,
      subtitle: item.subtitle,
      animeId: item.anime_id,
      animeImage: item.anime_image,
      userProfile: item.user_profile,
      userName: item.user_name,
      targetUsername: item.target_username,
      read: item.read,
      time: 'Just now', // Standardizer for live interface feed
    }));
  } catch (err) {
    console.warn('[Supabase] Error in fetchDbNotifications:', err);
    return [];
  }
}

/**
 * Mark DB notifications as read
 */
export async function markDbNotificationsRead(username: string): Promise<boolean> {
  if (!username) return false;
  try {
    const { error } = await supabase
      .from('user_notifications')
      .update({ read: true })
      .eq('target_username', username);
    return !error;
  } catch (err) {
    console.warn('[Supabase] Error in markDbNotificationsRead:', err);
    return false;
  }
}

/**
 * Fetch comments for a specific anime and episode.
 * Organizes them into top-level comments and replies.
 */
export async function getComments(animeId: number, episodeNumber: number | null = null): Promise<{ comments: DiscussionComment[]; error: any }> {
  try {
    let query = supabase
      .from('anime_comments')
      .select('*')
      .eq('anime_id', animeId)
      .order('created_at', { ascending: true });

    if (episodeNumber !== null) {
      query = query.eq('episode_number', episodeNumber);
    } else {
      query = query.is('episode_number', null);
    }

    const { data, error } = await query;
    if (error) {
      return { comments: [], error };
    }

    return { comments: (data as DiscussionComment[]) || [], error: null };
  } catch (err) {
    return { comments: [], error: err };
  }
}

/**
 * Submit a new comment or reply.
 */
export async function postComment(params: {
  animeId: number;
  episodeNumber: number | null;
  authorName: string;
  authorAvatar: string;
  commentText: string;
  parentId?: string | null;
}): Promise<{ comment: DiscussionComment | null; error: any }> {
  try {
    const { data, error } = await supabase
      .from('anime_comments')
      .insert([
        {
          anime_id: params.animeId,
          episode_number: params.episodeNumber,
          author_name: params.authorName,
          author_avatar: params.authorAvatar,
          comment_text: params.commentText,
          parent_id: params.parentId || null,
          likes_count: 0,
          likes_user_ids: [],
        },
      ])
      .select()
      .single();

    if (error) {
      return { comment: null, error };
    }

    return { comment: data as DiscussionComment, error: null };
  } catch (err) {
    return { comment: null, error: err };
  }
}

/**
 * Toggles a like on a comment for a local user.
 * Uses a local browser signature ID to prevent double liking.
 */
export async function toggleLikeComment(
  commentId: string,
  currentLikes: number,
  userIds: string[],
  userBrowserId: string
): Promise<{ likesCount: number; likesUserIds: string[]; error: any }> {
  try {
    const hasLiked = userIds.includes(userBrowserId);
    let updatedIds: string[];
    let updatedLikes: number;

    if (hasLiked) {
      updatedIds = userIds.filter((id) => id !== userBrowserId);
      updatedLikes = Math.max(0, currentLikes - 1);
    } else {
      updatedIds = [...userIds, userBrowserId];
      updatedLikes = currentLikes + 1;
    }

    const { error } = await supabase
      .from('anime_comments')
      .update({
        likes_count: updatedLikes,
        likes_user_ids: updatedIds,
      })
      .eq('id', commentId);

    if (error) {
      return { likesCount: currentLikes, likesUserIds: userIds, error };
    }

    return { likesCount: updatedLikes, likesUserIds: updatedIds, error: null };
  } catch (err) {
    return { likesCount: currentLikes, likesUserIds: userIds, error: err };
  }
}

/**
 * Fetch all community threads. Optional category filter.
 */
export async function getThreads(category?: string): Promise<{ threads: CommunityThread[]; error: any }> {
  try {
    let query = supabase
      .from('community_threads')
      .select('*')
      .order('created_at', { ascending: false });

    if (category && category !== 'ALL') {
      query = query.eq('category', category);
    }

    const { data, error } = await query;
    return { threads: (data as CommunityThread[]) || [], error };
  } catch (err) {
    return { threads: [], error: err };
  }
}

/**
 * Creates a new community thread.
 */
export async function createThread(
  title: string,
  category: string,
  authorName: string,
  authorAvatar: string,
  content: string
): Promise<{ thread: CommunityThread | null; error: any }> {
  try {
    const { data, error } = await supabase
      .from('community_threads')
      .insert([
        {
          title,
          category,
          author_name: authorName,
          author_avatar: authorAvatar,
          content,
          likes_count: 0,
          likes_user_ids: [],
          replies_count: 0
        }
      ])
      .select()
      .single();

    if (error) {
      return { thread: null, error };
    }
    return { thread: data as CommunityThread, error: null };
  } catch (err) {
    return { thread: null, error: err };
  }
}

/**
 * Toggles a like in a community thread.
 */
export async function toggleLikeThread(
  threadId: string,
  currentLikes: number,
  userIds: string[],
  userBrowserId: string
): Promise<{ likesCount: number; likesUserIds: string[]; error: any }> {
  try {
    const hasLiked = userIds.includes(userBrowserId);
    let updatedIds: string[];
    let updatedLikes: number;

    if (hasLiked) {
      updatedIds = userIds.filter((id) => id !== userBrowserId);
      updatedLikes = Math.max(0, currentLikes - 1);
    } else {
      updatedIds = [...userIds, userBrowserId];
      updatedLikes = currentLikes + 1;
    }

    const { error } = await supabase
      .from('community_threads')
      .update({
        likes_count: updatedLikes,
        likes_user_ids: updatedIds
      })
      .eq('id', threadId);

    if (error) {
      return { likesCount: currentLikes, likesUserIds: userIds, error };
    }

    return { likesCount: updatedLikes, likesUserIds: updatedIds, error: null };
  } catch (err) {
    return { likesCount: currentLikes, likesUserIds: userIds, error: err };
  }
}

/**
 * Deletes a comment from Supabase
 */
export async function deleteComment(commentId: string): Promise<{ success: boolean; error: any }> {
  try {
    const { error } = await supabase
      .from('anime_comments')
      .delete()
      .eq('id', commentId);
    return { success: !error, error };
  } catch (err) {
    return { success: false, error: err };
  }
}

/**
 * Sync Local MyList with Supabase anime_lists table
 */
export async function syncUserListsWithDb(username: string, localList: any[]): Promise<any[]> {
  try {
    // 1. Fetch remote list
    const { data: dbData, error } = await supabase
      .from('anime_lists')
      .select('*')
      .eq('username', username);

    if (error) {
      console.warn('[Supabase] Failed to fetch remote anime_lists:', error);
      return localList;
    }

    const merged = [...localList];
    let changed = false;

    // 2. Identify missing items from local to insert into DB
    for (const localItem of localList) {
      const type = localItem.type || 'anime';
      const existsInDb = dbData?.some(dbItem => 
        dbItem.anime_id === localItem.animeId && 
        dbItem.type === type
      );

      if (!existsInDb) {
        // Insert into DB
        await supabase.from('anime_lists').insert([
          {
            username,
            anime_id: localItem.animeId,
            anime_title: localItem.animeTitle,
            anime_cover: localItem.animeCover,
            status: localItem.status,
            type: type,
            added_at: localItem.addedAt || new Date().toISOString()
          }
        ]);
        changed = true;
      } else {
        // If status is different, update DB with local status (local is master)
        const dbItem = dbData?.find(dbItem => dbItem.anime_id === localItem.animeId && dbItem.type === type);
        if (dbItem && dbItem.status !== localItem.status) {
          await supabase.from('anime_lists').update({
            status: localItem.status
          }).eq('username', username).eq('anime_id', localItem.animeId).eq('type', type);
        }
      }
    }

    // 3. Add items from DB that aren't in local listing
    if (dbData) {
      for (const dbItem of dbData) {
        const type = dbItem.type || 'anime';
        const existsLocally = localList.some(localItem => 
          localItem.animeId === dbItem.anime_id && 
          (localItem.type || 'anime') === type
        );

        if (!existsLocally) {
          merged.push({
            animeId: dbItem.anime_id,
            animeTitle: dbItem.anime_title,
            animeCover: dbItem.anime_cover,
            status: dbItem.status as any,
            addedAt: dbItem.added_at,
            type: type as any
          });
          changed = true;
        }
      }
    }

    return merged;
  } catch (err) {
    console.warn('[Supabase] Error syncing lists:', err);
    return localList;
  }
}

/**
 * Delete item from user lists in Supabase
 */
export async function deleteFromDbList(username: string, animeId: number, type: 'anime' | 'manga' = 'anime'): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('anime_lists')
      .delete()
      .eq('username', username)
      .eq('anime_id', animeId)
      .eq('type', type);
    return !error;
  } catch (e) {
    return false;
  }
}

export function parseBioCredentials(bio: string | null): { 
  bio: string; 
  pwd?: string; 
  lastActive?: number;
  hide_my_list?: boolean;
  hide_manga_list?: boolean;
  hide_favourite_songs?: boolean;
} {
  const result: any = { 
    bio: bio || "", 
    pwd: "", 
    lastActive: 0,
    hide_my_list: false,
    hide_manga_list: false,
    hide_favourite_songs: false,
    coins: 0,
    decoration: ''
  };
  if (!bio) return result;
  
  const match = bio.match(/\[CREDENTIALS:([^\]]*)\]/);
  if (match) {
    result.bio = bio.replace(/\[CREDENTIALS:([^\]]*)\]/, "").trim();
    const parts = match[1].split(';');
    parts.forEach(part => {
      const indexOfEq = part.indexOf('=');
      if (indexOfEq !== -1) {
        const key = part.substring(0, indexOfEq).trim();
        const value = part.substring(indexOfEq + 1).trim();
        if (key === 'pwd') {
          result.pwd = value;
        } else if (key === 'last_active') {
          result.lastActive = parseInt(value, 10) || 0;
        } else if (key === 'hide_my_list') {
          result.hide_my_list = value === 'true';
        } else if (key === 'hide_manga_list') {
          result.hide_manga_list = value === 'true';
        } else if (key === 'hide_favourite_songs') {
          result.hide_favourite_songs = value === 'true';
        } else if (key === 'coins') {
          result.coins = parseInt(value, 10) || 0;
        } else if (key === 'decoration') {
          result.decoration = value;
        }
      }
    });
  }
  return result;
}

export function buildBioWithCredentials(
  cleanBio: string, 
  pwd?: string, 
  lastActive?: number,
  hide_my_list?: boolean,
  hide_manga_list?: boolean,
  hide_favourite_songs?: boolean,
  coins?: number,
  decoration?: string
): string {
  const pieces = [
    `pwd=${pwd || ""}`,
    `last_active=${lastActive || Date.now()}`,
    `hide_my_list=${hide_my_list ? 'true' : 'false'}`,
    `hide_manga_list=${hide_manga_list ? 'true' : 'false'}`,
    `hide_favourite_songs=${hide_favourite_songs ? 'true' : 'false'}`,
    `coins=${coins || 0}`,
    `decoration=${decoration || ""}`
  ];
  return `${cleanBio.trim()}\n\n[CREDENTIALS:${pieces.join(';')}]`.trim();
}

export async function upsertDbUserProfile(profile: any, rawPassword?: string): Promise<boolean> {
  try {
    const { data: existing } = await supabase
      .from('user_profiles')
      .select('bio')
      .eq('email', profile.email)
      .maybeSingle();

    let finalPwd = rawPassword || "";
    let finalLastActive = Date.now();
    let finalCleanBio = profile.bio || "";
    let finalHideList = false;
    let finalHideManga = false;
    let finalHideFavouriteSongs = false;
    let finalCoins = profile.coins || 0;
    let finalDecoration = profile.decoration || '';

    // Load presets from LocalStorage fallback if saving current user
    if (typeof window !== 'undefined') {
      finalHideList = localStorage.getItem('anipr8v_hide_my_list') === 'true';
      finalHideManga = localStorage.getItem('anipr8v_hide_manga_list') === 'true';
      finalHideFavouriteSongs = localStorage.getItem('anipr8v_hide_favourite_songs') === 'true';
    }

    if (existing && existing.bio) {
      const parsed = parseBioCredentials(existing.bio);
      if (!rawPassword && parsed.pwd) {
        finalPwd = parsed.pwd;
      }
      if (parsed.lastActive) {
        finalLastActive = parsed.lastActive;
      }
      finalHideList = parsed.hide_my_list || false;
      finalHideManga = parsed.hide_manga_list || false;
      finalHideFavouriteSongs = parsed.hide_favourite_songs || false;
      
      if (profile.coins === undefined && parsed.coins) {
        finalCoins = parsed.coins;
      }
      if (profile.decoration === undefined && parsed.decoration) {
        finalDecoration = parsed.decoration;
      }
    }

    // Overwrite explicit fields passed in profile
    if (profile.hide_my_list !== undefined) finalHideList = !!profile.hide_my_list;
    if (profile.hide_manga_list !== undefined) finalHideManga = !!profile.hide_manga_list;
    if (profile.hide_favourite_songs !== undefined) finalHideFavouriteSongs = !!profile.hide_favourite_songs;

    const compiledBio = buildBioWithCredentials(
      finalCleanBio, 
      finalPwd, 
      finalLastActive,
      finalHideList,
      finalHideManga,
      finalHideFavouriteSongs,
      finalCoins,
      finalDecoration
    );

    const { error } = await supabase
      .from('user_profiles')
      .upsert({
        email: profile.email,
        username: profile.username,
        avatar: profile.avatar,
        bio: compiledBio,
        website: profile.website || "",
        status: profile.status || "Online",
        tag: profile.tag || "Otaku",
        banner: profile.banner || ""
      }, { onConflict: 'email' });

    return !error;
  } catch (err) {
    return false;
  }
}

export async function fetchDbUserProfile(usernameOrEmail: string): Promise<any | null> {
  try {
    let query = supabase.from('user_profiles').select('*');
    if (usernameOrEmail.includes('@')) {
      query = query.eq('email', usernameOrEmail.toLowerCase().trim());
    } else {
      query = query.ilike('username', usernameOrEmail.trim());
    }

    const { data, error } = await query.maybeSingle();
    if (error || !data) return null;

    const parsedBio = parseBioCredentials(data.bio);
    return {
      email: data.email,
      username: data.username,
      avatar: data.avatar,
      bio: parsedBio.bio,
      website: data.website,
      status: data.status,
      tag: data.tag,
      banner: data.banner,
      pwd: parsedBio.pwd,
      lastActive: parsedBio.lastActive,
      hide_my_list: parsedBio.hide_my_list || false,
      hide_manga_list: parsedBio.hide_manga_list || false,
      hide_favourite_songs: parsedBio.hide_favourite_songs || false,
      coins: parsedBio.coins || 0,
      decoration: parsedBio.decoration || ''
    };
  } catch (err) {
    return null;
  }
}

export async function dbHeartbeat(email: string): Promise<void> {
  try {
    const { data } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (!data) return;

    const parsed = parseBioCredentials(data.bio);
    const updatedBio = buildBioWithCredentials(parsed.bio, parsed.pwd, Date.now());

    await supabase
      .from('user_profiles')
      .update({ bio: updatedBio, status: data.status })
      .eq('email', email);
  } catch (e) {}
}

export async function fetchAllDbUserProfiles(): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*');

    if (error || !data) return [];

    return data.map(item => {
      const parsedBio = parseBioCredentials(item.bio);
      const isOnline = item.status !== 'Invisible' && (Date.now() - (parsedBio.lastActive || 0) < 90000);
      return {
        email: item.email,
        username: item.username,
        avatar: item.avatar,
        bio: parsedBio.bio,
        website: item.website,
        status: isOnline ? item.status : 'Invisible',
        tag: item.tag,
        banner: item.banner,
        lastActive: parsedBio.lastActive,
        hide_my_list: parsedBio.hide_my_list || false,
        hide_manga_list: parsedBio.hide_manga_list || false,
        hide_favourite_songs: parsedBio.hide_favourite_songs || false,
        coins: parsedBio.coins || 0,
        decoration: parsedBio.decoration || ''
      };
    });
  } catch (err) {
    return [];
  }
}

export async function fetchMultipleUserProfiles(usernames: string[]): Promise<Record<string, any>> {
  if (!usernames || usernames.length === 0) return {};
  try {
    // Unique, trimmed, and valid alphanumeric/dash names to avoid any injection or syntax errors
    const cleanedAndDeDuped = Array.from(
      new Set(usernames.map(u => u.trim()).filter(u => /^[A-Za-z0-9_\-\.\s]+$/.test(u)))
    );
    if (cleanedAndDeDuped.length === 0) return {};
    
    // Construct real case-insensitive .or constraint using ilike matching for maximum accuracy
    // Escape double quotes inside values if any, but since we regex-validated they don't have them, it is safe
    const orFilter = cleanedAndDeDuped.map(u => `username.ilike."${u}"`).join(',');
    
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .or(orFilter);

    if (error || !data) {
      // Fallback to basic query if .or statement returned error
      const { data: fallbackData } = await supabase
        .from('user_profiles')
        .select('*');
      if (!fallbackData) return {};
      
      const profilesMap: Record<string, any> = {};
      fallbackData.forEach((row: any) => {
        const parsedBio = parseBioCredentials(row.bio);
        const isOnline = row.status !== 'Invisible' && (Date.now() - (parsedBio.lastActive || 0) < 90000);
        profilesMap[row.username.toLowerCase()] = {
          email: row.email,
          username: row.username,
          avatar: row.avatar,
          bio: parsedBio.bio,
          website: row.website,
          status: isOnline ? row.status : 'Invisible',
          tag: row.tag,
          banner: row.banner,
          lastActive: parsedBio.lastActive,
          hide_my_list: parsedBio.hide_my_list || false,
          hide_manga_list: parsedBio.hide_manga_list || false,
          hide_favourite_songs: parsedBio.hide_favourite_songs || false,
          coins: parsedBio.coins || 0,
          decoration: parsedBio.decoration || ''
        };
      });
      return profilesMap;
    }

    const profilesMap: Record<string, any> = {};
    data.forEach((row: any) => {
      const parsedBio = parseBioCredentials(row.bio);
      const isOnline = row.status !== 'Invisible' && (Date.now() - (parsedBio.lastActive || 0) < 90000);
      profilesMap[row.username.toLowerCase()] = {
        email: row.email,
        username: row.username,
        avatar: row.avatar,
        bio: parsedBio.bio,
        website: row.website,
        status: isOnline ? row.status : 'Invisible',
        tag: row.tag,
        banner: row.banner,
        lastActive: parsedBio.lastActive,
        hide_my_list: parsedBio.hide_my_list || false,
        hide_manga_list: parsedBio.hide_manga_list || false,
        hide_favourite_songs: parsedBio.hide_favourite_songs || false,
        coins: parsedBio.coins || 0,
        decoration: parsedBio.decoration || ''
      };
    });
    return profilesMap;
  } catch (err) {
    return {};
  }
}

/**
 * Fetch Favourited Songs for specified user
 */
export async function fetchFavouritedSongs(username: string): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('favourited_songs')
      .select('*')
      .eq('username', username);
    if (error || !data) return [];
    return data.map((item: any) => ({
      id: item.track_id,
      title: item.title,
      animeTitle: item.anime_title,
      artist: item.artist,
      audioUrl: item.audio_url,
      coverImage: item.cover_image,
      type: item.type
    }));
  } catch (e) {
    return [];
  }
}

/**
 * Purge individual favourited song in background from remote DB on unfavourite action
 */
export async function deleteFavouritedSongFromDb(username: string, trackId: string): Promise<void> {
  try {
    await supabase
      .from('favourited_songs')
      .delete()
      .eq('username', username)
      .eq('track_id', trackId);
  } catch (e) {
    console.error('[Supabase] Failed to delete favourited song:', e);
  }
}

/**
 * Bidirectional state synchronizer for user favourited songs
 */
export async function syncFavouritedSongsWithDb(username: string, localFavs: any[]): Promise<any[]> {
  try {
    const { data: dbData, error } = await supabase
      .from('favourited_songs')
      .select('*')
      .eq('username', username);

    if (error) {
      console.warn('[Supabase] Failed to fetch remote favourited_songs:', error);
      return localFavs;
    }

    const merged = [...localFavs];

    // 1. Upload missing local items to Supabase
    for (const localItem of localFavs) {
      const existsInDb = dbData?.some(dbItem => dbItem.track_id === localItem.id);
      if (!existsInDb) {
        await supabase.from('favourited_songs').insert([
          {
            username,
            track_id: localItem.id,
            title: localItem.title,
            anime_title: localItem.animeTitle,
            artist: localItem.artist || "",
            audio_url: localItem.audioUrl,
            cover_image: localItem.coverImage || "",
            type: localItem.type || ""
          }
        ]);
      }
    }

    // 2. Fetch missing remote items into local
    if (dbData) {
      for (const dbItem of dbData) {
        const existsLocally = localFavs.some(localItem => localItem.id === dbItem.track_id);
        if (!existsLocally) {
          merged.push({
            id: dbItem.track_id,
            title: dbItem.title,
            animeTitle: dbItem.anime_title,
            artist: dbItem.artist,
            audioUrl: dbItem.audio_url,
            coverImage: dbItem.cover_image,
            type: dbItem.type
          });
        }
      }
    }

    return merged;
  } catch (err) {
    console.error('[Supabase] favourited_songs sync err:', err);
    return localFavs;
  }
}


