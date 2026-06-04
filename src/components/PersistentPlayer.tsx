import React, { useState, useEffect, useRef } from 'react';
import { useMusic, AnimeThemeTrack } from '../services/MusicContext';
import { 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack, 
  Volume2, 
  VolumeX, 
  Disc, 
  ChevronUp, 
  ChevronDown, 
  RotateCw, 
  Trash2, 
  MoveUp, 
  MoveDown, 
  ListMusic, 
  Radio,
  Heart
} from 'lucide-react';

export default function PersistentPlayer() {
  const { 
    playlist, 
    currentIndex, 
    activeTrack, 
    isPlaying, 
    volume, 
    isMuted, 
    currentTime, 
    duration, 
    isLooping, 
    playTrack, 
    removeTrack, 
    reorderQueue, 
    togglePlayPause, 
    nextTrack, 
    prevTrack, 
    seekTo, 
    setVolume, 
    setIsMuted, 
    setIsLooping,
    clearQueue,
    toggleFavourite,
    isFavourited
  } = useMusic();

  const [isOpen, setIsOpen] = useState(false);
  const [bounceBars, setBounceBars] = useState<number[]>(Array.from({ length: 48 }, () => 4));
  const visualizerRef = useRef<number | null>(null);

  // Animated sound wave bars when music is playing
  useEffect(() => {
    if (isPlaying) {
      const animate = () => {
        setBounceBars(Array.from({ length: 48 }, () => Math.floor(Math.random() * 32) + 4));
        visualizerRef.current = requestAnimationFrame(animate);
      };
      animate();
    } else {
      if (visualizerRef.current) cancelAnimationFrame(visualizerRef.current);
      setBounceBars(Array.from({ length: 48 }, () => 4));
    }
    return () => {
      if (visualizerRef.current) cancelAnimationFrame(visualizerRef.current);
    };
  }, [isPlaying]);

  if (!activeTrack || (!isPlaying && currentTime === 0)) return null;

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    seekTo(time);
  };

  return (
    <>
      {/* 1. COMPACT PERSISTENT BAR - Floats above BottomNav */}
      <div className="fixed bottom-16 md:bottom-4 left-3 right-3 md:left-24 md:right-4 bg-zinc-950/95 backdrop-blur-md border border-zinc-900 rounded-2xl h-16 px-4 py-2 flex items-center justify-between z-30 shadow-2xl animate-slide-up select-none">
        
        {/* Track brief specifications */}
        <div className="flex items-center gap-3 min-w-0 flex-1 pr-4">
          <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-zinc-800 shrink-0 bg-zinc-900">
            <img 
              src={activeTrack.coverImage} 
              alt="" 
              className={`w-full h-full object-cover ${isPlaying ? 'animate-spin' : ''}`} 
              style={{ animationDuration: '6s' }}
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="min-w-0 text-left">
            <h4 className="text-xs font-extrabold text-white truncate leading-snug">{activeTrack.title}</h4>
            <span className="text-[10px] text-zinc-500 font-bold truncate block">{activeTrack.type} • {activeTrack.animeTitle}</span>
          </div>
        </div>

        {/* Floating controls panel */}
        <div className="flex items-center gap-4 shrink-0">
          
          <button 
            onClick={prevTrack}
            className="p-1 rounded-lg hover:bg-zinc-900 text-zinc-500 hover:text-white cursor-pointer transition-colors active:scale-90"
            title="Previous track"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          <button 
            onClick={togglePlayPause}
            className="p-2 bg-red-650 hover:bg-red-750 text-white rounded-full cursor-pointer transition-all active:scale-90 shadow-md shadow-red-650/10"
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 fill-white" />
            ) : (
              <Play className="w-4 h-4 fill-white translate-x-0.5" />
            )}
          </button>

          <button 
            onClick={nextTrack}
            className="p-1 rounded-lg hover:bg-zinc-900 text-zinc-500 hover:text-white cursor-pointer transition-colors active:scale-90"
            title="Next track"
          >
            <SkipForward className="w-4 h-4" />
          </button>

          <button 
            onClick={() => toggleFavourite(activeTrack)}
            className={`p-1.5 rounded-lg border transition-colors cursor-pointer active:scale-90 ${
              isFavourited(activeTrack.id) 
                ? 'bg-red-950/20 border-red-900/30 text-red-500' 
                : 'bg-zinc-950 border-zinc-900 text-zinc-500 hover:text-zinc-300'
            }`}
            title={isFavourited(activeTrack.id) ? "Remove Favourites" : "Add Favourites"}
          >
            <Heart className={`w-3.5 h-3.5 ${isFavourited(activeTrack.id) ? 'fill-red-500 text-red-500' : ''}`} />
          </button>

          <div className="w-px h-6 bg-zinc-900 mx-1 hidden sm:block" />

          {/* Up arrow expandable trigger */}
          <button 
            onClick={() => setIsOpen(true)}
            className="p-1.5 bg-zinc-900 hover:bg-zinc-800 text-red-500 rounded-lg cursor-pointer transition-colors flex items-center gap-1 active:scale-95 border border-zinc-800"
            title="Expand player HUD"
          >
            <ChevronUp className="w-4 h-4 animate-bounce" />
            <span className="text-[9.5px] font-mono font-black uppercase tracking-wider hidden sm:inline">HUD</span>
          </button>
        </div>
      </div>

      {/* 2. FULLSCREEN IMMERSIVE DECKS OVERLAY (Image 2) */}
      {isOpen && (
        <div className="fixed inset-0 bg-[#040405]/98 z-50 overflow-y-auto flex flex-col p-4 md:p-8 animate-fade-in select-none">
          
          {/* Main header navbar row */}
          <div className="flex items-center justify-between border-b border-red-950/20 pb-4 mb-6">
            <div className="flex items-center gap-2">
              <Radio className="w-5 h-5 text-red-500 animate-pulse" />
              <span className="text-[10px] font-black tracking-widest text-zinc-400 uppercase font-mono">
                Anipriv8 Stream Studio Decks
              </span>
            </div>
            
            <button 
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-1.5 px-4 py-2 bg-zinc-900 hover:bg-black border border-zinc-800 rounded-xl text-xs font-bold uppercase tracking-widest text-zinc-400 hover:text-white cursor-pointer transition-all active:scale-95"
            >
              <ChevronDown className="w-4 h-4 text-red-500" />
              <span>MINIMIZE</span>
            </button>
          </div>

          {/* Core Master Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-grow max-w-7xl mx-auto w-full">
            
            {/* LEFT AREA: Spinning Vinyl Plate + Primary Control console */}
            <div className="lg:col-span-7 flex flex-col gap-6 justify-center">
              
              <div className="flex flex-col items-center">
                
                {/* Vinyl Plate Centerpiece */}
                <div className="relative w-48 h-48 md:w-64 md:h-64 rounded-full bg-zinc-950 border-8 border-zinc-900 shadow-2xl flex items-center justify-center filter drop-shadow-[0_0_20px_rgba(239,68,68,0.15)] select-none">
                  
                  {/* Glowing neon border loop */}
                  <div className={`absolute inset-0 rounded-full border-2 border-dashed ${isPlaying ? 'border-red-500/30 animate-spin' : 'border-zinc-850'}`} style={{ animationDuration: '25s' }} />

                  {/* Grooves */}
                  <div className="absolute inset-4 rounded-full border border-zinc-900" />
                  <div className="absolute inset-8 rounded-full border border-zinc-905" />
                  <div className="absolute inset-12 rounded-full border border-zinc-910" />
                  <div className="absolute inset-16 rounded-full border border-zinc-915" />
                  <div className="absolute inset-20 rounded-full border border-zinc-920" />

                  {/* Album label sticker */}
                  <div className={`w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden absolute flex items-center justify-center bg-zinc-900 border-4 border-zinc-950 ${isPlaying ? 'animate-spin' : ''}`} style={{ animationDuration: '8s' }}>
                    <img 
                      src={activeTrack.coverImage} 
                      alt="" 
                      className="w-full h-full object-cover filter brightness-[0.7]" 
                      referrerPolicy="no-referrer"
                    />
                    {/* Vinyl hole pin */}
                    <div className="absolute w-4 h-4 rounded-full bg-black border-2 border-zinc-650" />
                  </div>
                </div>

                {/* Sound wave spectrum visualizer rods */}
                <div className="flex items-end justify-center gap-0.5 h-10 w-full max-w-sm mt-6">
                  {bounceBars.map((height, idx) => (
                    <div 
                      key={idx} 
                      className="w-0.5 bg-gradient-to-t from-red-900 to-red-505 rounded-full transition-all duration-100" 
                      style={{ height: `${height}px` }} 
                    />
                  ))}
                </div>

                {/* Metadata specifications */}
                <div className="text-center mt-4">
                  <span className="bg-red-650 text-white text-[8px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-sm">
                    {activeTrack.type}
                  </span>
                  <h2 className="text-lg md:text-2xl font-black text-white mt-2 leading-none uppercase tracking-wide">
                    {activeTrack.title}
                  </h2>
                  <p className="text-zinc-500 text-xs mt-1.5 font-bold uppercase tracking-wider">
                    {activeTrack.artist || 'Unknown Artist'} • {activeTrack.animeTitle}
                  </p>
                </div>
              </div>

              {/* Progress Seek Slider */}
              <div className="flex flex-col gap-2 bg-[#08080a] border border-zinc-900/60 p-4.5 rounded-2xl">
                
                <div className="flex justify-between text-[11px] font-mono text-zinc-500 select-none">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>

                <input
                  type="range"
                  min={0}
                  max={duration || 100}
                  value={currentTime}
                  onChange={handleProgressChange}
                  className="w-full accent-red-600 h-1.5 bg-zinc-900 rounded-full appearance-none cursor-pointer outline-none"
                />

                <div className="flex items-center justify-between select-none pt-2">
                  <button 
                    onClick={() => setIsLooping(!isLooping)}
                    className={`flex items-center gap-1 px-2.5 py-1 text-[9.5px] font-bold uppercase tracking-wider border rounded-lg cursor-pointer transition-colors ${
                      isLooping 
                        ? 'bg-red-950/20 border-red-500/40 text-red-500' 
                        : 'bg-zinc-950 border-zinc-900 text-zinc-500'
                    }`}
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>{isLooping ? "LOOP ACTIVE" : "LOOP OFF"}</span>
                  </button>

                  <span className="text-[9px] font-mono text-zinc-600 font-bold uppercase tracking-widest">
                    NC_AUDIO LAYER (PCM PROXY)
                  </span>
                </div>
              </div>

              {/* Large Master playback controls row */}
              <div className="flex items-center justify-center gap-6">
                
                <button 
                  onClick={() => toggleFavourite(activeTrack)}
                  className={`p-3.5 border rounded-2xl cursor-pointer active:scale-95 transition-all ${
                    isFavourited(activeTrack.id)
                      ? 'bg-red-950/20 border-red-900/30 text-red-500'
                      : 'bg-zinc-950 border-zinc-900 text-zinc-500 hover:text-white'
                  }`}
                  title={isFavourited(activeTrack.id) ? "Remove Favourites" : "Add Favourites"}
                >
                  <Heart className={`w-5 h-5 ${isFavourited(activeTrack.id) ? 'fill-red-500 text-red-500' : ''}`} />
                </button>

                <button 
                  onClick={prevTrack}
                  className="p-2.5 bg-zinc-950 hover:bg-zinc-900 border border-zinc-900 rounded-xl text-zinc-400 hover:text-white cursor-pointer active:scale-95 transition-all text-sm"
                  title="Previous track"
                >
                  <SkipBack className="w-5 h-5 fill-current" />
                </button>

                <button 
                  onClick={togglePlayPause}
                  className="p-5 bg-red-650 hover:bg-red-750 text-white rounded-full cursor-pointer active:scale-95 transition-all shadow-xl shadow-red-650/15"
                  title={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? (
                    <Pause className="w-7 h-7 fill-white" />
                  ) : (
                    <Play className="w-7 h-7 fill-white translate-x-0.5" />
                  )}
                </button>

                <button 
                  onClick={nextTrack}
                  className="p-2.5 bg-zinc-950 hover:bg-zinc-900 border border-zinc-900 rounded-xl text-zinc-400 hover:text-white cursor-pointer active:scale-95 transition-all text-sm"
                  title="Next track"
                >
                  <SkipForward className="w-5 h-5 fill-current" />
                </button>
              </div>

              {/* Volume Master controller block */}
              <div className="flex items-center gap-3 bg-[#08080a] border border-zinc-900/60 px-5 py-3 rounded-2xl w-full max-w-sm mx-auto">
                <button 
                  onClick={() => setIsMuted(!isMuted)}
                  className="text-zinc-500 hover:text-red-500 cursor-pointer"
                >
                  {isMuted ? (
                    <VolumeX className="w-4 h-4 text-zinc-600" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                </button>
                
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={isMuted ? 0 : volume}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    setVolume(v);
                    if (isMuted && v > 0) setIsMuted(false);
                  }}
                  className="w-full accent-red-600 h-1 bg-zinc-900 rounded-full appearance-none cursor-pointer outline-none"
                />

                <span className="text-[10px] font-mono text-zinc-500 font-bold uppercase w-8 text-right">
                  {Math.round((isMuted ? 0 : volume) * 100)}%
                </span>
              </div>
            </div>

            {/* RIGHT AREA: Queue Deck Panel (Image 2) */}
            <div className="lg:col-span-5 flex flex-col bg-[#07070a] border border-zinc-905 rounded-3xl p-5 md:p-6 min-h-[450px] max-h-[600px] text-left">
              
              <div className="flex items-center justify-between border-b border-zinc-900 pb-3 mb-4 shrink-0">
                <div className="flex items-center gap-2">
                  <ListMusic className="w-4.5 h-4.5 text-red-500" />
                  <h3 className="text-xs font-black uppercase text-white tracking-widest leading-none">
                    Session Stream Queue ({playlist.length})
                  </h3>
                </div>

                <button 
                  onClick={clearQueue}
                  className="text-[9.5px] font-mono font-black text-red-500 hover:text-red-400 uppercase tracking-wider cursor-pointer"
                >
                  Clear Queue
                </button>
              </div>

              {/* Upcoming Tracks Scroll block */}
              <div className="flex-grow overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-zinc-900 flex flex-col gap-2">
                {playlist.map((track, idx) => {
                  const isCurrent = idx === currentIndex;
                  return (
                    <div
                      key={`${track.id}-${idx}`}
                      onClick={() => playTrack(track)}
                      className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                        isCurrent
                          ? 'bg-red-950/20 border-red-500/25 text-white'
                          : 'bg-zinc-950/30 border-zinc-900/50 hover:border-zinc-800 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {/* Left brief layout items */}
                      <div className="flex items-center gap-3 min-w-0 pr-2">
                        <img 
                          src={track.coverImage} 
                          alt="" 
                          className="w-8 h-8 rounded-lg object-cover shrink-0 select-none" 
                          referrerPolicy="no-referrer"
                        />
                        <div className="min-w-0">
                          <h4 className={`text-xs font-extrabold truncate ${isCurrent ? 'text-red-500' : 'text-zinc-100'}`}>
                            {track.title}
                          </h4>
                          <span className="text-[9px] text-zinc-500 font-bold truncate block">
                            {track.artist || 'Unknown Singer'}
                          </span>
                        </div>
                      </div>

                      {/* Controls (Up / Down / Delete) */}
                      <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                        
                        {/* Upper reorder */}
                        {idx > 0 && (
                          <button
                            onClick={() => reorderQueue(idx, idx - 1)}
                            className="p-1 rounded bg-zinc-950/80 hover:bg-zinc-90 w-5.5 h-5.5 flex items-center justify-center border border-zinc-900 text-zinc-550 hover:text-white cursor-pointer"
                            title="Reorder upward"
                          >
                            <MoveUp className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Lower reorder */}
                        {idx < playlist.length - 1 && (
                          <button
                            onClick={() => reorderQueue(idx, idx + 1)}
                            className="p-1 rounded bg-zinc-950/80 hover:bg-zinc-90 w-5.5 h-5.5 flex items-center justify-center border border-zinc-900 text-zinc-550 hover:text-white cursor-pointer"
                            title="Reorder downward"
                          >
                            <MoveDown className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Delete trigger */}
                        <button
                          disabled={playlist.length <= 1}
                          onClick={() => removeTrack(track.id)}
                          className="p-1 rounded bg-zinc-950/80 hover:bg-red-950 hover:text-red-500 w-5.5 h-5.5 flex items-center justify-center border border-zinc-900 text-zinc-550 disabled:opacity-30 disabled:hover:bg-zinc-950 disabled:hover:text-zinc-550 cursor-pointer"
                          title="Remove item"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
