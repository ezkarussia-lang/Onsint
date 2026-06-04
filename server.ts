/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import "dotenv/config";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import nodemailer from "nodemailer";
import dns from "dns";
import { Readable } from "stream";

// Configure DNS resolution order to prefer IPv4.
// This resolves the Node 18+ fetch connection timeouts ("Failed to fetch") on platforms with incomplete IPv6 support.
dns.setDefaultResultOrder("ipv4first");

// Custom fetch helper with AbortSignal-based Timeout for Serverless environments (like Vercel)
async function fetchWithTimeout(url: string, options: any = {}, timeoutMs = 2500) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

// Multi-route reverse-matching URL normalizer for Vercel Serverless deployments
app.use((req, res, next) => {
  if (req.originalUrl && req.url !== req.originalUrl) {
    req.url = req.originalUrl;
  }
  
  const url = req.url;
  if (
    !url.startsWith("/api/") &&
    (url.startsWith("/anime/") ||
     url.startsWith("/mangadex/") ||
     url.startsWith("/watch-together/") ||
     url.startsWith("/auth/") ||
     url.startsWith("/proxy") ||
     url.startsWith("/anilist/"))
  ) {
    req.url = "/api" + url;
  }
  next();
});

  // Global CORS and OPTIONS Preflight support for visual preview video players
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, PATCH, DELETE");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, Range, X-Requested-With");
    res.setHeader("Access-Control-Expose-Headers", "Content-Range, Content-Length, Accept-Ranges");
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });

  // Providers Episodes Endpoint
  app.get(["/api/anime/episodes/:anilistId", "/anime/episodes/:anilistId"], async (req, res) => {
    try {
      const { anilistId } = req.params;
      console.log(`[Anivexa] Fetching consolidated provider maps for AniList ID ${anilistId}...`);
      
      const targetUrl = `http://217.60.252.213:4000/episodes/${anilistId}`;
      const apiRes = await fetchWithTimeout(targetUrl, {
        headers: {
          "Accept": "application/json"
        }
      }, 10000);

      if (!apiRes.ok) {
        throw new Error(`Anivexa-API returned status code: ${apiRes.status}`);
      }

      const data = await apiRes.json();
      
      // Filter out non-provider keys to build 'providers' dynamically (Step 1 parity)
      const providers: Record<string, any> = {};
      const nonProviderKeys = ["page", "type", "mappings"];
      if (data && typeof data === "object") {
        Object.entries(data).forEach(([key, val]) => {
          if (!nonProviderKeys.includes(key) && val && typeof val === "object") {
            providers[key] = val;
          }
        });
      }

      res.json({
        mappings: data.mappings || { anilistId: Number(anilistId) },
        providers
      });
    } catch (err: any) {
      console.error("[Anivexa Error] Fetch episodes failed:", err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // Providers Streaming Sources Endpoint
  app.get(["/api/anime/sources", "/anime/sources"], async (req, res) => {
    try {
      const watchId = req.query.watchId as string;
      if (!watchId) {
        return res.status(400).json({ error: "Missing watchId parameter" });
      }

      console.log(`[Anivexa] Resolving multi-provider streams for target watchId: ${watchId}...`);
      
      const parts = watchId.split("/");
      if (parts.length < 5) {
        return res.status(400).json({ error: "Malformed watchId" });
      }

      const anilistId = Number(parts[2]);
      const category = parts[3] as "sub" | "dub";
      const epNumStr = parts[4];
      const epNum = parseFloat(epNumStr);

      // 1. Fetch step 1 consolidated provider maps from Anivexa-API
      const mapsUrl = `http://217.60.252.213:4000/episodes/${anilistId}`;
      const mapsRes = await fetchWithTimeout(mapsUrl, {
        headers: { "Accept": "application/json" }
      }, 15000);

      if (!mapsRes.ok) {
        throw new Error(`Anivexa-API episode maps query failed with status: ${mapsRes.status}`);
      }

      const mapsData = await mapsRes.json();
      
      let resolvedCategory: "sub" | "dub" = category;
      let resolvedEpNum: number = epNum;
      let idFound = false;

      if (mapsData && typeof mapsData === "object") {
        for (const [providerId, providerData] of Object.entries(mapsData)) {
          const typedProviderData = providerData as any;
          if (typedProviderData?.episodes) {
            if (Array.isArray(typedProviderData.episodes.sub)) {
              const matched = typedProviderData.episodes.sub.find((e: any) => e.id === watchId);
              if (matched) {
                resolvedCategory = "sub";
                resolvedEpNum = parseFloat(matched.number);
                idFound = true;
                break;
              }
            }
            if (Array.isArray(typedProviderData.episodes.dub)) {
              const matched = typedProviderData.episodes.dub.find((e: any) => e.id === watchId);
              if (matched) {
                resolvedCategory = "dub";
                resolvedEpNum = parseFloat(matched.number);
                idFound = true;
                break;
              }
            }
          }
        }
      }

      if (!idFound || isNaN(resolvedEpNum)) {
        const trailingDigitsMatch = epNumStr.match(/\d+$/);
        if (trailingDigitsMatch) {
          resolvedEpNum = parseFloat(trailingDigitsMatch[0]);
        }
      }

      if (isNaN(resolvedEpNum)) {
        resolvedEpNum = 1;
      }

      interface ProviderMatch {
        providerId: string;
        episodeId: string;
      }
      const matches: ProviderMatch[] = [];

      if (mapsData && typeof mapsData === "object") {
        for (const [providerId, providerData] of Object.entries(mapsData)) {
          const typedProviderData = providerData as any;
          if (typedProviderData?.episodes) {
            const epList = typedProviderData.episodes[resolvedCategory] || [];
            if (Array.isArray(epList)) {
              const matchedEp = epList.find((e: any) => {
                const itemNum = parseFloat(e.number);
                return !isNaN(itemNum) && itemNum === resolvedEpNum;
              });
              if (matchedEp && matchedEp.id) {
                matches.push({
                  providerId,
                  episodeId: matchedEp.id
                });
              }
            }
          }
        }
      }

      console.log(`[Anivexa] Found ${matches.length} matching providers for Ep ${resolvedEpNum}`);

      const allFetchedStreams: any[] = [];
      const aggregatedSubtitles: any[] = [];
      let finalIntro: any = null;
      let finalOutro: any = null;

      // 3. Pull streaming playlists from Step-2 endpoints
      const fetchPromises = matches.map(async (m) => {
        const resultStreams: any[] = [];
        try {
          const sourceUrl = `http://217.60.252.213:4000/${m.episodeId}`;
          const sourceRes = await fetchWithTimeout(sourceUrl, {
            headers: { "Accept": "application/json" }
          }, 15000);

          if (sourceRes && sourceRes.ok) {
            const resData = await sourceRes.json();
            // Fallback map checks to support either keys layout formatting
            const rawStreams = Array.isArray(resData.sources) 
              ? resData.sources 
              : Array.isArray(resData.streams) 
                ? resData.streams 
                : [];
            
            const defaultReferer = resData.headers?.Referer || resData.headers?.referer || "";
            const defaultUA = resData.headers?.["User-Agent"] || resData.headers?.["user-agent"] || "";

            rawStreams.forEach((stream: any) => {
              if (stream.isActive === false) return; // Ignore streams explicitly marked inactive
              resultStreams.push({
                ...stream,
                providerId: m.providerId,
                referer: stream.referer || defaultReferer,
                userAgent: stream.userAgent || defaultUA,
                // FIX: Force pass explicit translation type down to child streams loop
                translationType: resolvedCategory 
              });
            });
            
            if (resData && Array.isArray(resData.subtitles)) {
              resData.subtitles.forEach((sub: any) => {
                if (!aggregatedSubtitles.some(s => s.url === sub.url)) {
                  aggregatedSubtitles.push(sub);
                }
              });
            }
            if (resData?.intro && !finalIntro) finalIntro = resData.intro;
            if (resData?.outro && !finalOutro) finalOutro = resData.outro;
          }
        } catch (err: any) {
          console.error(`[Anivexa Warning] Failed stream playlists resolution for ${m.providerId}:`, err.message);
        }
        return resultStreams;
      });

      const fetchResults = await Promise.allSettled(fetchPromises);
      fetchResults.forEach(res => {
        if (res.status === 'fulfilled' && res.value) {
          allFetchedStreams.push(...res.value);
        }
      });

      // Fallback checks
      if (allFetchedStreams.length === 0) {
        console.warn(`[Anivexa Sources] Zero premium streams fetched. Activating fallback pool...`);
        const anifyHosts = ["https://api.anify.nz", "https://api.anify.tv"];
        for (const host of anifyHosts) {
          try {
            const anifyUrl = `${host}/sources?id=${anilistId}&episodeNumber=${resolvedEpNum}&providerId=gogoanime&subType=${resolvedCategory}`;
            const anifyRes = await fetchWithTimeout(anifyUrl, { headers: { "Accept": "application/json" } }, 6000);
            if (anifyRes.ok) {
              const anifyData = await anifyRes.json() as any;
              if (anifyData && Array.isArray(anifyData.sources)) {
                anifyData.sources.forEach((s: any) => {
                  allFetchedStreams.push({
                    url: s.url,
                    type: s.url.includes(".m3u8") ? "hls" : "mp4",
                    quality: s.quality || "720p",
                    providerId: "gogoanime",
                    server: "Public Stream",
                    translationType: resolvedCategory
                  });
                });
                break;
              }
            }
          } catch (anifyErr) {
            console.error(`[Fallback Error] Anify pipeline down:`, anifyErr);
          }
        }
      }

      // 4. Final Format Map output pass
      const formattedStreams = allFetchedStreams
      .filter((s: any) => s.type !== "embed" && s.type !== "iframe" && s.type !== "player" && !s.url?.includes("/embed/") && !s.url?.includes("/e/"))
      .map((stream: any, index: number) => {
        let finalUrl = stream.url;
        let refererVal = stream.referer || "";
        let userAgentVal = stream.userAgent || "";
        
        const providerId = stream.providerId || "unknown";
        
        // Auto-assign referers based on provider if missing
        if (!refererVal) {
          if (providerId === 'reanime') refererVal = 'https://reanime.to/';
          else if (providerId === 'animepahe') refererVal = 'https://animepahe.ru/';
          else if (providerId === 'allmanga') refererVal = 'https://allmanga.to/';
          else if (providerId === 'anikoto') refererVal = 'https://anikototv.to/';
          else if (providerId === 'animegg') refererVal = 'https://www.animegg.org/';
        }

        const cleanProviderName = providerId.charAt(0).toUpperCase() + providerId.slice(1);
        
        const streamsOutput = [];
        
        // 1. Direct Stream (no proxy, plays directly in browser if CORS and CF permit)
        streamsOutput.push({
          url: stream.url,
          originalUrl: stream.url,
          type: stream.type || (stream.url?.toLowerCase().includes(".mp4") ? "mp4" : "hls"),
          quality: stream.quality || "1080p",
          server: `${cleanProviderName} (Direct)`,
          referer: refererVal,
          userAgent: userAgentVal,
          provider: providerId,
          translationType: stream.translationType || resolvedCategory
        });

        // 2. Proxied Stream (routes through /api/proxy to inject referers, bypassing CORS if Datacenter IP is allowed)
        if (stream.url && !stream.url.startsWith('/') && stream.type !== "hls-redirect") {
          let proxiedUrl = `/api/proxy?url=${encodeURIComponent(stream.url)}`;
          if (refererVal) proxiedUrl += `&referer=${encodeURIComponent(refererVal)}`;
          if (userAgentVal) proxiedUrl += `&userAgent=${encodeURIComponent(userAgentVal)}`;
          
          streamsOutput.push({
            url: proxiedUrl,
            originalUrl: stream.url,
            type: stream.type || (stream.url?.toLowerCase().includes(".mp4") ? "mp4" : "hls"),
            quality: stream.quality || "1080p",
            server: `${cleanProviderName} (Proxied)`,
            referer: refererVal,
            userAgent: userAgentVal,
            provider: providerId,
            translationType: stream.translationType || resolvedCategory
          });
        }
        
        return streamsOutput;
      }).flat();

      res.json({
        streams: formattedStreams,
        subtitles: aggregatedSubtitles,
        intro: finalIntro || undefined,
        outro: finalOutro || undefined
      });

    } catch (err: any) {
      console.error("[Anivexa Error] Fetch streaming sources failed:", err.message);
      res.status(500).json({
        error: "Failed to fetch streaming sources",
        details: err.message
      });
    }
  });

  const anilistCache = new Map<string, { data: any; expiresAt: number }>();

  // AniList proxy route to bypass iframe / CORS or client connectivity failures
  app.post(["/api/anilist/graphql", "/anilist/graphql"], async (req, res) => {
    try {
      const cacheKey = JSON.stringify(req.body);
      const cached = anilistCache.get(cacheKey);
      if (cached && Date.now() < cached.expiresAt) {
        return res.json(cached.data);
      }

      const response = await fetch("https://graphql.anilist.co", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
        body: JSON.stringify(req.body),
      });
      if (!response.ok) {
        if (cached) {
          // Fallback to expired cache if API is offline or rate limited
          return res.json(cached.data);
        }
        return res.status(response.status).json({ error: `AniList API returned error status: ${response.status}` });
      }
      const json = await response.json();
      anilistCache.set(cacheKey, {
        data: json,
        expiresAt: Date.now() + 5 * 60 * 1000 // 5 minutes cache
      });
      return res.json(json);
    } catch (err: any) {
      console.error("AniList proxy error:", err);
      return res.status(500).json({ error: err.message });
    }
  });

  // MangaDex proxy route to bypass client-side CORS or direct connection blocks
  app.get(["/api/mangadex/*", "/mangadex/*"], async (req, res) => {
    try {
      const fullUrl = req.originalUrl || req.url || "";
      const dexIdx = fullUrl.indexOf("mangadex/");
      const targetPath = dexIdx !== -1 ? fullUrl.substring(dexIdx + "mangadex".length) : fullUrl;
      const targetUrl = `https://api.mangadex.org${targetPath}`;
      
      const response = await fetchWithTimeout(targetUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "application/json",
        },
      }, 3500);
      if (!response.ok) {
        return res.status(response.status).json({ error: `MangaDex API returned error status: ${response.status}` });
      }
      const json = await response.json();
      return res.json(json);
    } catch (err: any) {
      console.error("MangaDex proxy error:", err);
      return res.status(500).json({ error: err.message });
    }
  });

  // In-memory Watch together rooms
  interface WatchTogetherRoom {
    id: string;
    ownerName: string;
    animeId: number;
    animeTitle: string;
    episodeNumber: number;
    episodeThumbnail: string;
    isPublic: boolean;
    playState: {
      currentTime: number;
      isPlaying: boolean;
      lastUpdated: number;
    };
    messages: Array<{
      id: string;
      authorName: string;
      avatar: string;
      text: string;
      timestamp: number;
    }>;
    inviteCode: string;
    bannedUsers: string[];
    kickedUsers: string[];
    members: Array<{
      username: string;
      avatar: string;
      lastSeen: number;
    }>;
  }

  let watchRooms: WatchTogetherRoom[] = [
    {
      id: "room-seed-1",
      ownerName: "EliteShadow",
      animeId: 16498,
      animeTitle: "Solo Leveling",
      episodeNumber: 12,
      episodeThumbnail: "https://api.dicebear.com/7.x/identicon/svg?seed=Leveling",
      isPublic: true,
      playState: { currentTime: 110, isPlaying: true, lastUpdated: Date.now() },
      messages: [
        { id: "m1", authorName: "EliteShadow", avatar: "https://api.dicebear.com/7.x/pixel-art/svg?seed=Shadow", text: "This final fight animation is insane!", timestamp: Date.now() - 60000 },
        { id: "m2", authorName: "KuudereRei", avatar: "https://api.dicebear.com/7.x/pixel-art/svg?seed=Kuudere", text: "Agreed, the A-1 Pictures team cooked.", timestamp: Date.now() - 30000 }
      ],
      inviteCode: "SOLO12",
      bannedUsers: [],
      kickedUsers: [],
      members: [
        { username: "EliteShadow", avatar: "https://api.dicebear.com/7.x/pixel-art/svg?seed=Shadow", lastSeen: Date.now() }
      ]
    },
    {
      id: "room-seed-2",
      ownerName: "AestheticVoid",
      animeId: 170942,
      animeTitle: "Frieren",
      episodeNumber: 28,
      episodeThumbnail: "https://api.dicebear.com/7.x/identicon/svg?seed=Frieren",
      isPublic: true,
      playState: { currentTime: 450, isPlaying: true, lastUpdated: Date.now() },
      messages: [
        { id: "m3", authorName: "AestheticVoid", avatar: "https://api.dicebear.com/7.x/pixel-art/svg?seed=Void", text: "Truly a magnificent masterpiece sequence.", timestamp: Date.now() - 120000 }
      ],
      inviteCode: "FREE28",
      bannedUsers: [],
      kickedUsers: [],
      members: [
        { username: "AestheticVoid", avatar: "https://api.dicebear.com/7.x/pixel-art/svg?seed=Void", lastSeen: Date.now() }
      ]
    }
  ];

  // Watch together REST endpoints
  app.get("/api/watch-together/rooms", (req, res) => {
    res.json(watchRooms);
  });

  app.post("/api/watch-together/rooms", (req, res) => {
    const { ownerName, animeId, animeTitle, episodeNumber, episodeThumbnail, isPublic } = req.body;
    
    const randomCode = Math.random().toString(36).substr(2, 6).toUpperCase();
    const newRoom: WatchTogetherRoom = {
      id: `room-${Math.random().toString(36).substr(2, 9)}`,
      ownerName: ownerName || "GuestOtaku",
      animeId: Number(animeId) || 0,
      animeTitle: animeTitle || "Anime Release",
      episodeNumber: Number(episodeNumber) || 1,
      episodeThumbnail: episodeThumbnail || "https://api.dicebear.com/7.x/identicon/svg?seed=Anime",
      isPublic: isPublic !== false,
      playState: {
        currentTime: 0,
        isPlaying: false,
        lastUpdated: Date.now()
      },
      messages: [],
      inviteCode: randomCode,
      bannedUsers: [],
      kickedUsers: [],
      members: [
        {
          username: ownerName || "GuestOtaku",
          avatar: "https://api.dicebear.com/7.x/pixel-art/svg?seed=" + (ownerName || "GuestOtaku"),
          lastSeen: Date.now()
        }
      ]
    };

    watchRooms.unshift(newRoom);
    res.status(201).json(newRoom);
  });

  app.get("/api/watch-together/rooms/:roomId", (req, res) => {
    // Find either by ID or by current inviteCode
    const room = watchRooms.find(r => r.id === req.params.roomId || r.inviteCode === req.params.roomId);
    if (!room) {
      return res.status(404).json({ error: "Watch room not found" });
    }

    const { username, avatar } = req.query;
    if (typeof username === "string") {
      // Check ban list
      if (room.bannedUsers && room.bannedUsers.includes(username)) {
        return res.status(403).json({ error: "You are banned from this room." });
      }

      // Check kick list
      if (room.kickedUsers && room.kickedUsers.includes(username)) {
        return res.status(401).json({ error: "You have been kicked from this watch party. Out of respect, you cannot re-enter the live session." });
      }

      // Add or update member
      if (!room.members) room.members = [];
      const existing = room.members.find(m => m.username === username);
      if (existing) {
        existing.lastSeen = Date.now();
        if (avatar && typeof avatar === "string") {
          existing.avatar = avatar;
        }
      } else {
        room.members.push({
          username,
          avatar: typeof avatar === "string" ? avatar : "https://api.dicebear.com/7.x/pixel-art/svg?seed=Guest",
          lastSeen: Date.now()
        });
      }
    }

    // Filter out inactive members (e.g. > 10 seconds inactive)
    if (room.members) {
      const activeThreshold = Date.now() - 10000;
      room.members = room.members.filter(m => m.lastSeen > activeThreshold || m.username === room.ownerName);
    }

    res.json(room);
  });

  // Regenerate Invite Code on target room
  app.post("/api/watch-together/rooms/:roomId/regenerate-code", (req, res) => {
    const room = watchRooms.find(r => r.id === req.params.roomId);
    if (!room) {
      return res.status(404).json({ error: "Watch room not found" });
    }
    const { ownerName } = req.body;
    if (room.ownerName !== ownerName) {
      return res.status(403).json({ error: "Only the host can modify the invite code." });
    }
    room.inviteCode = Math.random().toString(36).substr(2, 6).toUpperCase();
    res.json(room);
  });

  // Kick target user from room
  app.post("/api/watch-together/rooms/:roomId/kick", (req, res) => {
    const room = watchRooms.find(r => r.id === req.params.roomId);
    if (!room) {
      return res.status(404).json({ error: "Watch room not found" });
    }
    const { ownerName, usernameToKick } = req.body;
    if (room.ownerName !== ownerName) {
      return res.status(403).json({ error: "Only the host can kick users." });
    }

    if (!room.kickedUsers) room.kickedUsers = [];
    if (!room.kickedUsers.includes(usernameToKick)) {
      room.kickedUsers.push(usernameToKick);
    }

    if (room.members) {
      room.members = room.members.filter(m => m.username !== usernameToKick);
    }

    // Add alert message
    room.messages.push({
      id: `kickMsg-${Date.now()}`,
      authorName: "System",
      avatar: "https://api.dicebear.com/7.x/identicon/svg?seed=System",
      text: `@${usernameToKick} was kicked from the party by the host.`,
      timestamp: Date.now()
    });

    res.json(room);
  });

  // Ban target user from room
  app.post("/api/watch-together/rooms/:roomId/ban", (req, res) => {
    const room = watchRooms.find(r => r.id === req.params.roomId);
    if (!room) {
      return res.status(404).json({ error: "Watch room not found" });
    }
    const { ownerName, usernameToBan } = req.body;
    if (room.ownerName !== ownerName) {
      return res.status(403).json({ error: "Only the host can ban users." });
    }

    if (!room.bannedUsers) room.bannedUsers = [];
    if (!room.bannedUsers.includes(usernameToBan)) {
      room.bannedUsers.push(usernameToBan);
    }

    if (room.members) {
      room.members = room.members.filter(m => m.username !== usernameToBan);
    }

    room.messages.push({
      id: `banMsg-${Date.now()}`,
      authorName: "System",
      avatar: "https://api.dicebear.com/7.x/identicon/svg?seed=System",
      text: `@${usernameToBan} was permanently banned from entering this party.`,
      timestamp: Date.now()
    });

    res.json(room);
  });

  app.post("/api/watch-together/rooms/:roomId/messages", (req, res) => {
    const room = watchRooms.find(r => r.id === req.params.roomId);
    if (!room) {
      return res.status(404).json({ error: "Watch room not found" });
    }
    const { authorName, avatar, text } = req.body;
    const count = room.messages.length + 1;
    const newMessage = {
      id: `msg-${count}-${Math.random().toString(36).substr(2, 5)}`,
      authorName: authorName || "OtakuGuest",
      avatar: avatar || "https://api.dicebear.com/7.x/pixel-art/svg?seed=Guest",
      text: text || "",
      timestamp: Date.now()
    };
    room.messages.push(newMessage);
    res.status(201).json(newMessage);
  });

  app.post("/api/watch-together/rooms/:roomId/sync", (req, res) => {
    const room = watchRooms.find(r => r.id === req.params.roomId);
    if (!room) {
      return res.status(404).json({ error: "Watch room not found" });
    }
    const { currentTime, isPlaying, episodeNumber } = req.body;
    if (typeof currentTime === "number") {
      room.playState.currentTime = currentTime;
    }
    if (typeof isPlaying === "boolean") {
      room.playState.isPlaying = isPlaying;
    }
    if (typeof episodeNumber === "number") {
      room.episodeNumber = episodeNumber;
    }
    room.playState.lastUpdated = Date.now();
    res.json(room);
  });

  app.delete("/api/watch-together/rooms/:roomId", (req, res) => {
    const index = watchRooms.findIndex(r => r.id === req.params.roomId);
    if (index !== -1) {
      watchRooms.splice(index, 1);
      return res.json({ success: true });
    }
    res.status(404).json({ error: "Room not found" });
  });

  // 1. Streaming and CORs proxy for video streams
  app.get("/api/proxy", async (req, res) => {
    let targetUrl = req.query.url as string;
    if (!targetUrl) {
      return res.status(400).send("Missing target url parameter.");
    }

    // Dynamic on-the-fly decryption of kwik.cx web links (embed/page) to raw .m3u8 stream links
    if (targetUrl.includes("kwik.cx") && !targetUrl.toLowerCase().includes(".m3u8") && !targetUrl.toLowerCase().includes(".mp4")) {
      console.log(`[Proxy] Detected kwik.cx embed page: ${targetUrl}. Decrypting on-the-fly...`);
      try {
        const pageRes = await fetchWithTimeout(targetUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Referer": "https://animepahe.ru/"
          }
        }, 5000);
        
        if (pageRes.ok) {
          const html = await pageRes.text();
          let decryptedStreamUrl: string | null = null;

          // Dean Edwards packer matches
          const packerRegex = /eval\(function\(p,a,c,k,e,d\).*?\((['"])(.*?)\1\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(['"])(.*?)\5\.split\(\s*['"]\|['"]\s*\)/s;
          const match = html.match(packerRegex);
          if (match) {
            const pVal = match[2];
            const aVal = parseInt(match[3], 10);
            const cVal = parseInt(match[4], 10);
            const kVal = (match[6] || "").split("|");

            const unpack = (pStr: string, aNum: number, cNum: number, kArr: string[]): string => {
              const dFn = (cIndex: number): string => {
                return (cIndex < aNum ? "" : dFn(Math.floor(cIndex / aNum))) +
                       ((cIndex % aNum) > 35 ? String.fromCharCode((cIndex % aNum) + 29) : (cIndex % aNum).toString(36));
              };
              let idx = cNum;
              while (idx--) {
                if (kArr[idx]) {
                  const regex = new RegExp("\\b" + dFn(idx) + "\\b", "g");
                  pStr = pStr.replace(regex, kArr[idx]);
                }
              }
              return pStr;
            };

            const unpacked = unpack(pVal, aVal, cVal, kVal);
            const sourceMatch = unpacked.match(/(https?:\/\/[^'"]+?\.m3u8[^'"]*)/);
            if (sourceMatch) {
              decryptedStreamUrl = sourceMatch[1];
            }
          }

          // Double defense: plaintext fallback regex mapping in case of layout shifts
          if (!decryptedStreamUrl) {
            const rawM3u8Match = html.match(/(https?:\/\/[^'"]+?\.m3u8[^'"]*)/);
            if (rawM3u8Match) {
              decryptedStreamUrl = rawM3u8Match[1];
            }
          }

          if (decryptedStreamUrl) {
            console.log(`[Proxy] Successfully decrypted kwik direct stream URL: ${decryptedStreamUrl}`);
            targetUrl = decryptedStreamUrl;
          } else {
            console.warn(`[Proxy] Failed to extract stream from Kwik page.`);
          }
        }
      } catch (err: any) {
        console.error(`[Proxy] Kwik on-the-fly resolution exception:`, err.message);
      }
    }

    let proto = (req.headers["x-forwarded-proto"] as string) || req.protocol || "https";
    if (req.get('host')?.includes('.run.app') || req.get('host')?.includes('.pages.dev')) {
      proto = "https";
    }
    const hostUrl = `${proto}://${req.get('host')}`;

    try {
      let refererVal = (req.query.referer as string) || "";
      let userAgentVal = (req.query.userAgent as string) || "";
      if (!refererVal) {
        try {
          const parsedUrl = new URL(targetUrl);
          if (parsedUrl.hostname.includes("kwik")) {
            refererVal = "https://kwik.cx/";
          } else if (parsedUrl.hostname.includes("animeegg")) {
            refererVal = "https://www.animegg.org/";
          } else if (parsedUrl.hostname.includes("mp4upload")) {
            refererVal = "https://www.mp4upload.com/";
          } else if (parsedUrl.hostname.includes("gogoanime")) {
            refererVal = "https://gogoanime.co/";
          } else {
            refererVal = `${parsedUrl.protocol}//${parsedUrl.hostname}/`;
          }
        } catch (e) {
          refererVal = "";
        }
      }

      const headers: Record<string, string> = {
        "User-Agent": userAgentVal || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": refererVal,
      };

      if (refererVal) {
        try {
          headers["Origin"] = new URL(refererVal).origin;
        } catch (e) {
          headers["Origin"] = refererVal;
        }
      }

      if (req.headers.range) {
        headers["Range"] = req.headers.range as string;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      let response = await fetch(targetUrl, { headers, signal: controller.signal });
      clearTimeout(timeoutId);

      // Dynamic automatic 403 Forbidden referer fallback to resolve hotlink blocks
      if (response.status === 403) {
        console.warn(`[Proxy] 403 Forbidden for ${targetUrl}. Retrying without referer...`);
        const retryHeaders = { ...headers };
        delete retryHeaders["Referer"];
        if (retryHeaders["Origin"]) delete retryHeaders["Origin"];
        
        const retryController = new AbortController();
        const retryTimeoutId = setTimeout(() => retryController.abort(), 8000);
        const retryRes = await fetch(targetUrl, {
          headers: retryHeaders,
          signal: retryController.signal
        });
        clearTimeout(retryTimeoutId);
        
        if (retryRes.status !== 403) {
          response = retryRes;
        } else {
          try {
            const urlObj = new URL(targetUrl);
            const hostReferer = `${urlObj.protocol}//${urlObj.hostname}/`;
            console.warn(`[Proxy] Still 403. Retrying with host origin referer: ${hostReferer}`);
            const retryHeaders2 = { ...headers, "Referer": hostReferer };
            try {
              retryHeaders2["Origin"] = new URL(hostReferer).origin;
            } catch (e) {}
            
            const retryController2 = new AbortController();
            const retryTimeoutId2 = setTimeout(() => retryController2.abort(), 8000);
            const retryRes2 = await fetch(targetUrl, {
              headers: retryHeaders2,
              signal: retryController2.signal
            });
            clearTimeout(retryTimeoutId2);
            
            if (retryRes2.status !== 403) {
              response = retryRes2;
            }
          } catch (e) {}
        }
      }

      res.status(response.status);

      // Set CORS and range parameters
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Headers", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
      res.setHeader("Accept-Ranges", "bytes");

      // Check if it is an m3u8 playlist manifest
      const contentType = (response.headers.get("content-type") || "").toLowerCase();
      const isM3u8 = (response.ok) && (targetUrl.toLowerCase().includes(".m3u8") || 
                     contentType.includes("mpegurl") || 
                     targetUrl.toLowerCase().includes("m3u8") ||
                     targetUrl.toLowerCase().includes("urlset"));

      if (isM3u8) {
        const text = await response.text();
        const lines = text.split("\n");
        const rewrittenLines = lines.map((line) => {
          let currentLine = line;
          
          // 1. If line is not a comment and is not empty, it is a resource URI (like a TS chunk or child manifest)
          if (currentLine.trim() && !currentLine.trim().startsWith("#") && !currentLine.toLowerCase().startsWith("http")) {
            try {
              const absUrl = new URL(currentLine.trim(), targetUrl).toString();
              return `${hostUrl}/api/proxy?url=${encodeURIComponent(absUrl)}&referer=${encodeURIComponent(refererVal)}${userAgentVal ? `&userAgent=${encodeURIComponent(userAgentVal)}` : ''}`;
            } catch (err) {
              return currentLine;
            }
          } else if (currentLine.trim() && currentLine.toLowerCase().startsWith("http")) {
            return `${hostUrl}/api/proxy?url=${encodeURIComponent(currentLine.trim())}&referer=${encodeURIComponent(refererVal)}${userAgentVal ? `&userAgent=${encodeURIComponent(userAgentVal)}` : ''}`;
          }

          // 2. If line contains URI="...", we need to rewrite inside it (e.g., encryption keys like AES-128, subtitles)
          const uriRegex = /URI="([^"]+)"/g;
          currentLine = currentLine.replace(uriRegex, (match, p1) => {
            try {
              const absUrl = new URL(p1, targetUrl).toString();
              const proxied = `${hostUrl}/api/proxy?url=${encodeURIComponent(absUrl)}&referer=${encodeURIComponent(refererVal)}${userAgentVal ? `&userAgent=${encodeURIComponent(userAgentVal)}` : ''}`;
              return `URI="${proxied}"`;
            } catch (err) {
              return match;
            }
          });

          return currentLine;
        });
        
        const rewritten = rewrittenLines.join("\n");
        res.setHeader("content-type", "application/vnd.apple.mpegurl; charset=utf-8");
        return res.send(rewritten);
      }

      // For chunk segments or standard media streams
      if (targetUrl.includes(".ts")) {
        res.setHeader("content-type", "video/mp2t");
      } else {
        const actualContentType = response.headers.get("content-type");
        if (actualContentType) {
          res.setHeader("content-type", actualContentType);
        }
      }

      const contentLength = response.headers.get("content-length");
      const contentRange = response.headers.get("content-range");
      const acceptRanges = response.headers.get("accept-ranges");

      if (contentLength) res.setHeader("content-length", contentLength);
      if (contentRange) res.setHeader("content-range", contentRange);
      if (acceptRanges) res.setHeader("accept-ranges", acceptRanges);

      if (response.body) {
        const buffer = await response.arrayBuffer();
        res.send(Buffer.from(buffer));
      } else {
        res.sendStatus(404);
      }

    } catch (err: any) {
      console.error("Proxy error occurred:", err);
      if (!res.headersSent) {
        res.status(500).send("Streaming proxy encountered an error: " + err.message);
      }
    }
  });

  // 1b. Manga Dex Image Upload proxy route to bypass CORS or referer hotlink blockers
  app.get(["/api/mangadex-uploads/*", "/mangadex-uploads/*"], async (req, res) => {
    try {
      const fullUrl = req.originalUrl || req.url || "";
      const dexIdx = fullUrl.indexOf("mangadex-uploads/");
      
      // Separate query string to acquire clean target path of the image
      let pathPart = dexIdx !== -1 ? fullUrl.substring(dexIdx + "mangadex-uploads".length) : fullUrl;
      const qIdx = pathPart.indexOf("?");
      if (qIdx !== -1) {
        pathPart = pathPart.substring(0, qIdx);
      }
      
      const baseUrlParam = req.query.baseUrl as string;
      const hostUrl = baseUrlParam ? baseUrlParam.replace(/\/$/, "") : "https://uploads.mangadex.org";
      const targetUrl = `${hostUrl}${pathPart}`;
      
      const response = await fetch(targetUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Referer": "https://mangadex.org/",
          "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        },
      });

      if (!response.ok) {
        return res.status(response.status).json({ error: `MangaDex upload proxy returned error status: ${response.status}` });
      }

      // Forward relevant response headers
      const contentType = response.headers.get("content-type");
      if (contentType) {
        res.setHeader("Content-Type", contentType);
      }
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Cache-Control", "public, max-age=86400"); // Cache image files for 24h

      const arrayBuffer = await response.arrayBuffer();
      res.send(Buffer.from(arrayBuffer));
    } catch (err: any) {
      console.error("MangaDex uploads proxy error:", err);
      if (!res.headersSent) {
        res.status(500).send("Upload proxy failed: " + err.message);
      }
    }
  });

  // Custom persistent OTP in-memory registry map
  const otpMap = new Map<string, { code: string; expiresAt: number; username?: string }>();

  // POST endpoint to send verification security codes
  app.post("/api/auth/send-otp", async (req, res) => {
    const { email, mode, username } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email address is required." });
    }

    // Generate a secure 6-digit random code
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    otpMap.set(email.toLowerCase(), {
      code: otpCode,
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes expiry window
      username: username || ""
    });

    console.log(`[AUTH-OTP] Generated Security Access Code for ${email}: ${otpCode}`);

    // Retrieve custom SMTP from environment secrets if configured
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const smtpFrom = process.env.SMTP_FROM || `"Anipriv8 Authentication" <no-reply@anipriv8.com>`;

    let emailSent = false;
    let errorDetails = "";

    // If SMTP secrets have been provided, send an actual mail
    if (smtpUser && smtpPass) {
      try {
        const transporter = nodemailer.createTransport({
          host: smtpHost || "smtp.gmail.com",
          port: smtpPort,
          secure: smtpPort === 465,
          auth: {
            user: smtpUser,
            pass: smtpPass
          }
        });

        const subject = mode === "signup" ? "Anipriv8 - Activate Your Otaku Deck" : "Anipriv8 - Otaku Login Key";
        const emailHtml = `
          <div style="font-family: 'Inter', system-ui, sans-serif; max-width: 500px; margin: 0 auto; padding: 28px; background-color: #08080a; color: #ffffff; border: 1px solid #1c1c24; border-radius: 16px;">
            <div style="border-bottom: 2px solid #ef4444; padding-bottom: 15px; margin-bottom: 20px;">
              <h2 style="color: #ef4444; font-family: monospace; text-transform: uppercase; margin: 0; font-size: 22px; letter-spacing: 1px;">Anipriv8 Hub Security</h2>
            </div>
            <p style="font-size: 14px; color: #d4d4d8; line-height: 1.6; margin-top: 0;">An access token has been requested to authorize an Otaku session securely. Please copy the 6-digit code below to authenticate:</p>
            <div style="background-color: #030304; border: 1px solid #27272a; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0;">
              <span style="font-family: monospace; font-size: 32px; font-weight: 900; letter-spacing: 8px; color: #ef4444;">${otpCode}</span>
            </div>
            <p style="font-size: 12px; color: #71717a; line-height: 1.5; margin-bottom: 0;">This access code is active for 10 minutes. If you did not trigger this dispatch, you can safely ignore this mail.</p>
          </div>
        `;

        await transporter.sendMail({
          from: smtpFrom,
          to: email,
          subject: `${subject} - Code ${otpCode}`,
          html: emailHtml,
          text: `Your security access code for Anipriv8 is ${otpCode}. Valid for 10 minutes.`
        });

        emailSent = true;
      } catch (err: any) {
        console.error("[AUTH-OTP] SMTP send dispatch network failure:", err);
        errorDetails = err.message || "Unknown SMTP handler failure";
      }
    } else {
      console.log("[AUTH-OTP] SMTP environment keys omitted. Using local simulation backup.");
    }

    res.json({
      success: true,
      emailSent,
      fallbackCode: emailSent ? null : otpCode,
      warning: emailSent ? null : "Configure your SMTP_USER and SMTP_PASS variables under Settings -> Secrets to receive actual verification emails."
    });
  });

  // POST endpoint to verify verification security codes
  app.post("/api/auth/verify-otp", (req, res) => {
    const { email, otpCode } = req.body;
    if (!email || !otpCode) {
      return res.status(400).json({ error: "Email address and OTP security code must be supplied." });
    }

    const record = otpMap.get(email.toLowerCase());
    if (!record) {
      return res.status(400).json({ error: "No code has been requested for this email. Go back and request a dispatch." });
    }

    if (Date.now() > record.expiresAt) {
      otpMap.delete(email.toLowerCase());
      return res.status(400).json({ error: "Security key has expired. Request a new dispatch code." });
    }

    if (record.code !== otpCode.trim()) {
      return res.status(400).json({ error: "Incorrect verification code. Verify spelling." });
    }

    // Success! Clear otp code
    otpMap.delete(email.toLowerCase());
    res.json({ success: true });
  });

  if (!process.env.VERCEL) {
    const PORT = 3000;
    if (process.env.NODE_ENV !== "production") {
      import("vite").then(({ createServer }) => {
        createServer({
          server: { middlewareMode: true },
          appType: "spa",
        }).then((vite) => {
          app.use(vite.middlewares);
          app.listen(PORT, "0.0.0.0", () => {
            console.log(`[Full-Stack Server] App listening on http://0.0.0.0:${PORT}`);
          });
        });
      });
    } else {
      const distPath = path.join(process.cwd(), "dist");
      app.use(express.static(distPath));
      app.get("*", (req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
      app.listen(PORT, "0.0.0.0", () => {
        console.log(`[Full-Stack Server] App listening on http://0.0.0.0:${PORT}`);
      });
    }
  }

export default app;
