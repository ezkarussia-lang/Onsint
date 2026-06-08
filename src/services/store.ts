import { useState, useEffect } from 'react';

import { 
  fetchDbNotifications, 
  pushDbNotification, 
  markDbNotificationsRead, 
  syncUserListsWithDb, 
  deleteFromDbList,
  upsertDbUserProfile,
  fetchDbUserProfile,
  dbHeartbeat,
  fetchAllDbUserProfiles
} from './supabase';

export interface UserProfile {
  email: string;
  username: string;
  avatar: string;
  bio: string;
  website: string;
  status: 'Online' | 'Idle' | 'Do Not Disturb' | 'Invisible';
  tag: 'Otaku' | 'Kuudere' | 'Tsundere' | 'Sirsilvex';
  banner?: string;
  coins?: number;
  decoration?: string;
}

export interface MyListItem {
  animeId: number;
  animeTitle: string;
  animeCover: string;
  status: 'Watching' | 'Reading' | 'Onhold' | 'Completed' | 'Dropped' | 'Plantowatch' | 'Plantoread';
  addedAt: string;
  type?: 'anime' | 'manga';
}

export interface AppNotification {
  id: string;
  category: 'Comments' | 'Community' | 'Anime';
  userProfile?: string;
  userName?: string;
  time: string;
  title: string;
  subtitle?: string;
  animeId?: number;
  animeImage?: string;
  episodeNumber?: number;
  route?: any; // To redirect
  read?: boolean;
  targetUsername?: string; // target user filtering support
}

// Preset avatars custom list
export const ANIME_AVATARS = [
  'https://api.dicebear.com/7.x/pixel-art/svg?seed=Luffy',
  'https://api.dicebear.com/7.x/pixel-art/svg?seed=Nezuko',
  'https://api.dicebear.com/7.x/pixel-art/svg?seed=Goku',
  'https://api.dicebear.com/7.x/pixel-art/svg?seed=Usagi',
  'https://api.dicebear.com/7.x/pixel-art/svg?seed=Sasuke',
  'https://api.dicebear.com/7.x/pixel-art/svg?seed=Killua',
  'https://api.dicebear.com/7.x/pixel-art/svg?seed=Anya',
  'https://api.dicebear.com/7.x/pixel-art/svg?seed=Rem',
  'https://api.dicebear.com/7.x/pixel-art/svg?seed=Zoro',
  'https://api.dicebear.com/7.x/pixel-art/svg?seed=Kakashi'
];

// Preset stickers
export const ANIME_STICKERS = [
  { id: 'st1', label: 'Anya Smug', url: 'https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExbnZ2cHhsbHZwdWdmaHp0a28zbDJhcWdvd2phb2IxaGlod2J3bm43MyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/8g63TshfshSg5Uf0U1/giphy.gif' },
  { id: 'st2', label: 'Happy Pikachu', url: 'https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3ZpdDZtMTV3YmJ1OHo5N2gycGlsaTFma3AwdHRsYWw1cDZ5ZnVyYSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/9fMc1InXg6AFAjA8uG/giphy.gif' },
  { id: 'st3', label: 'Angry Chibi', url: 'https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExOHYyNHpldWJzMTBwbG1paDR5MHVyOTl0ajI1ZHlyeWRhNmI5MTNtMCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/D8rBeR8O7V2S2hQkNo/giphy.gif' },
  { id: 'st4', label: 'Shocked Nezuko', url: 'https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExZmlrbWtsdnU1eGdzNmhmMXlyM2N6cHR2ZXRsa3RwZmhuMXByOWJ3aiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/idUqGqR9oQePyjE0m2/giphy.gif' },
  { id: 'st5', label: 'Goku Laugh', url: 'https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExNG1sb3RnbnZhMTlhdWp3bm0weDN6dmwzNTZkaGU0ZHFlczBrbzN1MCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Yw/tH2oOpjkWzcqc/giphy.gif' },
  { id: 'st6', label: 'Sips Tea', url: 'https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExdTBmOHByMHdtNjRmdnAwYWRoZnI5cHk2NmJmODZocGR3MWw3NHpsNiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Yw/S0m5t70SgY2qI/giphy.gif' }
];

export const DECORATIONS_STORE = [
  { id: 'dec1', label: 'Glitch', url: 'https://cdn.discordapp.com/avatar-decoration-presets/a_e90ebc0114e7bdc30353c8b11953ea41.png?size=96&passthrough=true', price: 50 },
  { id: 'dec2', label: 'Golden Crown', url: 'https://cdn.discordapp.com/avatar-decoration-presets/a_65db91cee351e36150a2b506b26eba71.png?size=96&passthrough=true', price: 100 },
  { id: 'dec3', label: 'Rainy Mood', url: 'https://cdn.discordapp.com/avatar-decoration-presets/a_e8c11f139e55dac538cdaafb3caa2317.png?size=96&passthrough=true', price: 50 },
  { id: 'dec4', label: 'Cat Ears', url: 'https://cdn.discordapp.com/avatar-decoration-presets/a_c3cffc19e9784f7d0b005eecdf1b566e.png?size=96&passthrough=true', price: 150 },
  { id: 'dec5', label: 'Shocked Anime', url: 'https://cdn.discordapp.com/avatar-decoration-presets/a_b98e8b204d59882fb7f9f7c86922c0bf.png?size=96&passthrough=true', price: 100 },
  { id: 'dec6', label: 'Neon Star', url: 'https://raw.githubusercontent.com/phaticusthiccy/phaticusthiccy/main/youtube_animated_avatars/rotating_star.png?raw=true', price: 200 }
];

export const CURRENT_USER_KEY = 'anipr8v_logged_user';
export const MY_LIST_KEY = 'anipr8v_my_list';
export const NOTIFICATIONS_KEY = 'anipr8v_notifications';
export const NOTIFICATIONS_READ_KEY = 'anipr8v_notif_read';

// Helper to initialize database if empty
export function getStoredUser(): UserProfile | null {
  const data = localStorage.getItem(CURRENT_USER_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export function saveStoredUser(user: UserProfile | null) {
  if (user) {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(CURRENT_USER_KEY);
  }
  window.dispatchEvent(new Event('anipr8v_auth_change'));
}

export function getMyList(): MyListItem[] {
  const data = localStorage.getItem(MY_LIST_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export function saveMyList(list: MyListItem[]) {
  localStorage.setItem(MY_LIST_KEY, JSON.stringify(list));
  // Push changes to Supabase in background
  const currentUser = getStoredUser();
  if (currentUser && currentUser.username) {
    syncUserListsWithDb(currentUser.username, list).catch(e => console.warn('[Supabase] background list push failed:', e));
  }
  window.dispatchEvent(new CustomEvent('anipr8v_list_update'));
}

export function syncMyListWithDb() {
  const currentUser = getStoredUser();
  if (currentUser && currentUser.username) {
    const local = getMyList();
    syncUserListsWithDb(currentUser.username, local).then((synced) => {
      localStorage.setItem(MY_LIST_KEY, JSON.stringify(synced));
      window.dispatchEvent(new CustomEvent('anipr8v_list_update'));
    }).catch(e => console.warn('[Supabase] list sync failed:', e));
  }
}

export function deleteMyListItem(animeId: number, type: 'anime' | 'manga' = 'anime') {
  const local = getMyList();
  const updated = local.filter(item => !(item.animeId === animeId && (item.type || 'anime') === type));
  localStorage.setItem(MY_LIST_KEY, JSON.stringify(updated));
  
  const currentUser = getStoredUser();
  if (currentUser && currentUser.username) {
    deleteFromDbList(currentUser.username, animeId, type).catch(e => console.warn('[Supabase] delete from list failing:', e));
  }
  window.dispatchEvent(new CustomEvent('anipr8v_list_update'));
}

// Default initial notifications simulation
export const INITIAL_NOTIFICATIONS: AppNotification[] = [];

export function getRawNotifications(): AppNotification[] {
  const data = localStorage.getItem(NOTIFICATIONS_KEY);
  if (!data) {
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(INITIAL_NOTIFICATIONS));
    return INITIAL_NOTIFICATIONS;
  }
  try {
    const list: AppNotification[] = JSON.parse(data);
    // Filter out residual mock notifications
    return list.filter(n => n.id !== 'n1' && n.id !== 'n2' && n.id !== 'n3');
  } catch {
    return INITIAL_NOTIFICATIONS;
  }
}

export function getNotifications(): AppNotification[] {
  const list = getRawNotifications();
  const currentUser = getStoredUser();

  if (currentUser && currentUser.username) {
    // Start background sync asynchronously
    syncNotifications(currentUser.username);
  }

  return list.filter(n => {
    if (n.targetUsername) {
      return currentUser && n.targetUsername.toLowerCase() === currentUser.username.toLowerCase();
    }
    return true;
  });
}

let lastSyncTime = 0;
export function syncNotifications(username: string) {
  const now = Date.now();
  if (now - lastSyncTime < 5000) return; // Debounce sync calls so we don't spam database
  lastSyncTime = now;

  fetchDbNotifications(username).then((dbNotifs) => {
    if (dbNotifs && dbNotifs.length > 0) {
      const localNotifs = getRawNotifications();
      let changed = false;

      // Merge and deduplicate
      const updated = [...localNotifs];

      dbNotifs.forEach((dbN) => {
        const exists = updated.some(n => 
          n.id === dbN.id || 
          (n.title === dbN.title && n.subtitle === dbN.subtitle && n.userName === dbN.userName)
        );
        if (!exists) {
          updated.push(dbN);
          changed = true;
        }
      });

      if (changed) {
        localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(updated));
        window.dispatchEvent(new CustomEvent('anipr8v_notif_update'));
      }
    }
  }).catch(err => console.warn('[Supabase] background sync notification failed:', err));
}

export function saveNotifications(notifs: AppNotification[]) {
  localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifs));

  const currentUser = getStoredUser();
  if (currentUser && currentUser.username) {
    const hasUnread = notifs.some(n => n.targetUsername && n.targetUsername.toLowerCase() === currentUser.username.toLowerCase() && !n.read);
    if (!hasUnread) {
      markDbNotificationsRead(currentUser.username).catch(() => {});
    }
  }
}

export function addNotification(notif: Omit<AppNotification, 'id' | 'time'>) {
  const list = getRawNotifications(); // Preserve all raw notifications
  const newNotif: AppNotification = {
    ...notif,
    id: 'n_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    time: 'Just now',
    read: false
  };
  const updated = [newNotif, ...list];
  localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(updated));

  // Push to Supabase database in the background so all other connected devices sync up!
  pushDbNotification({
    category: notif.category,
    title: notif.title,
    subtitle: notif.subtitle,
    animeId: notif.animeId,
    animeImage: notif.animeImage,
    userProfile: notif.userProfile,
    userName: notif.userName,
    targetUsername: notif.targetUsername,
  }).catch(e => console.warn('[Supabase] background push notification failed:', e));

  window.dispatchEvent(new CustomEvent('anipr8v_notif_update'));
  window.dispatchEvent(new CustomEvent('anipr8v_new_notif_toast', { detail: newNotif }));
}

let cachedDbUsers: UserProfile[] = [];

if (typeof window !== 'undefined') {
  const syncUsersAndPresence = () => {
    const user = getStoredUser();
    if (user && user.email) {
      dbHeartbeat(user.email).catch(() => {});
    }
    fetchAllDbUserProfiles().then(users => {
      if (users && users.length > 0) {
        cachedDbUsers = users;
        window.dispatchEvent(new CustomEvent('anipr8v_users_update'));
      }
    }).catch(() => {});
  };

  syncUsersAndPresence();
  setInterval(syncUsersAndPresence, 20000);
}

export function getAllRegisteredUsers(): UserProfile[] {
  if (cachedDbUsers.length > 0) {
    const currentUser = getStoredUser();
    if (currentUser) {
      const idx = cachedDbUsers.findIndex(u => u.username.toLowerCase() === currentUser.username.toLowerCase());
      if (idx !== -1) {
        cachedDbUsers[idx].status = currentUser.status;
      }
    }
    return cachedDbUsers;
  }

  const users: UserProfile[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('user_')) {
        const item = localStorage.getItem(key);
        if (item) {
          const parsed = JSON.parse(item);
          if (parsed && typeof parsed === 'object' && parsed.username) {
            users.push(parsed as UserProfile);
          }
        }
      }
    }
  } catch (e) {
  }
  
  const currentUser = getStoredUser();
  if (currentUser) {
    if (!users.some(u => u.username.toLowerCase() === currentUser.username.toLowerCase())) {
      users.push(currentUser);
    }
  }
  return users;
}

export function simulateNewEpisodeReleases() {
  const myList = getMyList();
  if (myList.length === 0) return;

  // Track any active anime (Watching, Plantowatch, Onhold)
  const activeItems = myList.filter(item => 
    (!item.type || item.type === 'anime') &&
    (item.status === 'Watching' || item.status === 'Plantowatch' || item.status === 'Onhold')
  );
  if (activeItems.length === 0) return;

  const releasedKey = 'anipr8v_simulated_releases';
  let simulatedHistory: string[] = [];
  try {
    const data = localStorage.getItem(releasedKey);
    if (data) {
      simulatedHistory = JSON.parse(data);
    }
  } catch (e) {}

  // Simulate ONE release per cycle to avoid flooding
  for (const item of activeItems) {
    let epNum = 1;
    let trackingKey = `release_${item.animeId}_ep_${epNum}`;
    while (simulatedHistory.includes(trackingKey) && epNum < 25) {
      epNum++;
      trackingKey = `release_${item.animeId}_ep_${epNum}`;
    }

    if (epNum <= 24) {
      simulatedHistory.push(trackingKey);
      localStorage.setItem(releasedKey, JSON.stringify(simulatedHistory));

      // Standard real notification
      addNotification({
        category: 'Anime',
        title: `Episode ${epNum} Released!`,
        subtitle: `Awesome new episode of "${item.animeTitle}" is now streaming on Anipriv8!`,
        animeId: item.animeId,
        animeImage: item.animeCover,
        userProfile: item.animeCover,
        userName: 'Release Bot',
        episodeNumber: epNum
      });
      break; // Only simulate one release at a time
    }
  }
}

