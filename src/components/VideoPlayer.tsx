/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import Hls from 'hls.js';
import { FastForward, CheckCircle2 } from 'lucide-react';

interface VideoPlayerProps {
  url: string;
  type?: string;
  subtitles?: Array<{ file: string; label: string }>;
  intro?: { start: number; end: number };
  outro?: { start: number; end: number };
  onEpisodeEnd?: () => void;
  onError?: (err: string) => void;
}

export default function VideoPlayer({ url, type, subtitles, intro, outro, onEpisodeEnd, onError }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const onEpisodeEndRef = useRef(onEpisodeEnd);
  const onErrorRef = useRef(onError);

  const [currentTime, setCurrentTime] = useState(0);
  const [skipNotification, setSkipNotification] = useState<string | null>(null);
  const skipTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const hasSkippedIntroRef = useRef(false);
  const hasSkippedOutroRef = useRef(false);

  // Reset skip flags on stream change
  useEffect(() => {
    hasSkippedIntroRef.current = false;
    hasSkippedOutroRef.current = false;
  }, [url]);

  // Keep refs up to date to prevent effect re-runs when parent changes callback reference
  useEffect(() => {
    onEpisodeEndRef.current = onEpisodeEnd;
  }, [onEpisodeEnd]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !url) return;

    let hls: Hls | null = null;

    const playVideoSafely = () => {
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          const errMsg = String(err?.message || err || '');
          if (
            !errMsg.includes('interrupted') &&
            !errMsg.includes('pause') &&
            !errMsg.includes('removed') &&
            !errMsg.includes('abort')
          ) {
            console.warn('Auto playback in playVideoSafely was prevented:', err);
          }
        });
      }
    };

    let isHlsStream = false;
    try {
      const searchParams = new URL(url, window.location.href).searchParams;
      const realTargetUrl = searchParams.get('url') || url;
      isHlsStream = realTargetUrl.includes('.m3u8') || realTargetUrl.includes('m3u8') || realTargetUrl.includes('urlset');
    } catch (e) {
      isHlsStream = url.includes('.m3u8') || url.includes('m3u8') || url.includes('urlset');
    }
    
    // Force HLS mode if the backend explicitly tagged it as an hls feed (handles masked url scenarios like hls-redirect)
    if (type && type.includes('hls')) {
      isHlsStream = true;
    }

    const canPlayNativeHls = video.canPlayType('application/vnd.apple.mpegurl');
    
    // Always prefer Native HLS over hls.js if the browser natively supports it.
    // Native HLS bypasses fetch CORS policies (which block hls.js) and optimizes battery on mobile devices.
    if (canPlayNativeHls && isHlsStream) {
      video.src = url;
      
      const onCanPlay = () => playVideoSafely();
      const onVideoError = () => {
        const err = video.error;
        console.error('Native video play error:', err);
        onErrorRef.current?.(err?.message || 'Native video playback channel offline.');
      };

      video.addEventListener('canplay', onCanPlay);
      video.addEventListener('error', onVideoError);

      return () => {
        video.removeEventListener('canplay', onCanPlay);
        video.removeEventListener('error', onVideoError);
      };
    } else if (Hls.isSupported() && isHlsStream) {
      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90,
      });

      hls.loadSource(url);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        playVideoSafely();
      });

      let retryCount = 0;
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              const responseCode = data.response?.code;
              if (responseCode === 403 || responseCode === 404 || responseCode === 500) {
                console.error(`HLS Network Error ${responseCode}: Terminal. Failing over fast skips retries.`);
                onErrorRef.current?.(`Source returned ${responseCode}. Bypassing terminal network block.`);
                break;
              }
              
              if (retryCount < 0) { // Disabled retries for faster failover to working servers
                retryCount++;
                console.warn(`HLS network error, retrying (${retryCount}/1)...`);
                hls?.startLoad();
              } else {
                console.error('HLS terminal network failure.');
                onErrorRef.current?.('Failed to fetch stream segment. It might be offline.');
              }
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.warn('HLS media error, attempting recovery...');
              hls?.recoverMediaError();
              break;
            default:
              console.error('HLS unrecoverable exception:', data);
              onErrorRef.current?.('Unrecoverable player exception. Direct stream offline.');
              break;
          }
        }
      });
    } else {
      // Native fallback (Safari supports HLS, or direct MP4/stream links)
      video.src = url;
      
      const onCanPlay = () => {
        playVideoSafely();
      };

      const onVideoError = () => {
        const err = video.error;
        console.error('Native video play error:', err);
        onErrorRef.current?.(err?.message || 'Native video playback channel offline.');
      };

      video.addEventListener('canplay', onCanPlay);
      video.addEventListener('error', onVideoError);

      return () => {
        video.removeEventListener('canplay', onCanPlay);
        video.removeEventListener('error', onVideoError);
      };
    }

    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, [url]);

  const triggerSkipNotification = (msg: string) => {
    setSkipNotification(msg);
    if (skipTimeoutRef.current) clearTimeout(skipTimeoutRef.current);
    skipTimeoutRef.current = setTimeout(() => {
      setSkipNotification(null);
    }, 2500);
  };

  const handleTimeUpdate = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = e.currentTarget;
    const time = video.currentTime;
    setCurrentTime(time);

    const autoSkipEnabled = localStorage.getItem('anime_auto_skip_oped') === 'true';

    // 1. Check Intro auto skip range
    if (intro && time >= intro.start && time < intro.end - 1.5) {
      if (autoSkipEnabled && !hasSkippedIntroRef.current) {
        hasSkippedIntroRef.current = true;
        video.currentTime = intro.end;
        triggerSkipNotification('Opening Theme Auto-Skipped');
      }
    } else if (intro && time < intro.start - 5) {
      // Reset if user seeks back before opening
      hasSkippedIntroRef.current = false;
    }

    // 2. Check Outro auto skip range
    if (outro && time >= outro.start && time < outro.end - 1.5) {
      if (autoSkipEnabled && !hasSkippedOutroRef.current) {
        hasSkippedOutroRef.current = true;
        video.currentTime = outro.end;
        triggerSkipNotification('Ending Theme Auto-Skipped');
      }
    } else if (outro && time < outro.start - 5) {
      // Reset if user seeks back before ending
      hasSkippedOutroRef.current = false;
    }
  };

  const handleManualSkip = (targetTime: number, label: string) => {
    const video = videoRef.current;
    if (video) {
      video.currentTime = targetTime;
      triggerSkipNotification(`${label} Skipped`);
      if (label === 'Opening') {
        hasSkippedIntroRef.current = true;
      } else {
        hasSkippedOutroRef.current = true;
      }
    }
  };

  const showIntroButton = intro && currentTime >= intro.start && currentTime < intro.end - 1.5 && localStorage.getItem('anime_auto_skip_oped') !== 'true';
  const showOutroButton = outro && currentTime >= outro.start && currentTime < outro.end - 1.5 && localStorage.getItem('anime_auto_skip_oped') !== 'true';

  return (
    <div
      id="anilist_main_player"
      className="relative w-full aspect-video bg-black overflow-hidden group/player"
    >
      <video
        ref={videoRef}
        controls
        autoPlay
        playsInline
        className="w-full h-full object-contain"
        onEnded={() => onEpisodeEndRef.current?.()}
        onTimeUpdate={handleTimeUpdate}
      />

      {/* Manual Skip Button Overlays for opening & ending - Placed on the bottom left side ("other side" of controls) */}
      {showIntroButton && (
        <button
          onClick={() => handleManualSkip(intro.end, 'Opening')}
          className="absolute bottom-16 left-4 z-20 flex items-center gap-1.5 px-4 py-2 bg-red-650 hover:bg-red-700 text-white font-black text-[10px] md:text-xs uppercase tracking-wider rounded-xl shadow-lg border border-red-500 animate-pulse transition-all cursor-pointer"
        >
          <FastForward className="w-3.5 h-3.5 text-white" /> Skip Opening
        </button>
      )}

      {showOutroButton && (
        <button
          onClick={() => handleManualSkip(outro.end, 'Ending')}
          className="absolute bottom-16 left-4 z-20 flex items-center gap-1.5 px-4 py-2 bg-red-650 hover:bg-red-700 text-white font-black text-[10px] md:text-xs uppercase tracking-wider rounded-xl shadow-lg border border-red-500 animate-pulse transition-all cursor-pointer"
        >
          <FastForward className="w-3.5 h-3.5 text-white" /> Skip Ending
        </button>
      )}

      {/* Auto Skip Premium Notification Toast */}
      {skipNotification && (
        <div className="absolute top-4 right-4 z-30 flex items-center gap-2 bg-[#0c0c10]/95 border border-red-900/40 px-3.5 py-2 rounded-xl shadow-2xl animate-fade-in pointer-events-none">
          <CheckCircle2 className="w-4 h-4 text-red-500 shrink-0" />
          <span className="text-[10px] font-black tracking-wider uppercase text-zinc-300 font-mono">
            {skipNotification}
          </span>
        </div>
      )}
    </div>
  );
}
