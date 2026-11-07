import React, { useState } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  VolumeX,
  Volume1,
  Maximize2,
  ListMusic,
  Heart,
  Radio,
  RotateCcw,
  RotateCw,
} from 'lucide-react';
import { YoutubeIcon as Youtube } from './YoutubeIcon';
import { usePlayer } from '../context/PlayerContext';
import { useRoom } from '../context/RoomContext';
import { AudioVisualizer } from './AudioVisualizer';

interface AudioPlayerProps {
  toggleQueue: () => void;
  isQueueOpen: boolean;
  openFullscreen: () => void;
  openRoomModal: () => void;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  toggleQueue,
  isQueueOpen,
  openFullscreen,
  openRoomModal,
}) => {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    buffered,
    volume,
    isMuted,
    playMode,
    isShuffle,
    isAutoplay,
    isLoading,
    togglePlayPause,
    seekTo,
    seekRelative,
    setVolume,
    toggleMute,
    nextTrack,
    prevTrack,
    toggleShuffle,
    toggleAutoplay,
    cyclePlayMode,
  } = usePlayer();

  const { roomState } = useRoom();
  const [isLiked, setIsLiked] = useState<boolean>(false);
  const [seekHoverTime, setSeekHoverTime] = useState<number | null>(null);

  if (!currentTrack) {
    return (
      <footer className="fixed bottom-0 left-0 right-0 z-40 glass-dock py-2.5 px-4 sm:px-6 flex items-center justify-between text-xs text-zinc-400">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
          </span>
          <span className="font-semibold text-zinc-300 truncate">AuxParty HIFI Ready • Select a song or paste a YouTube link</span>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-zinc-400 shrink-0">
          320k Lossless
        </span>
      </footer>
    );
  }

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferedPercent = duration > 0 ? (buffered / duration) * 100 : 0;
  const isYT = currentTrack.source === 'youtube' || Boolean(currentTrack.youtubeId);

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    seekTo(parseFloat(e.target.value));
  };

  const handleSeekMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    setSeekHoverTime(Math.max(0, Math.min(duration, pos * duration)));
  };

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-40 glass-dock transition-all">
      {/* Mobile Thin Progress Line (Top Edge of Bar) */}
      <div className="md:hidden relative h-1 w-full bg-zinc-800/80 cursor-pointer overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all"
          style={{ width: `${progressPercent}%` }}
        />
        <input
          type="range"
          min="0"
          max={duration || 100}
          step="0.1"
          value={currentTime}
          onChange={handleSeekChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </div>

      {/* MOBILE COMPACT BAR (< 768px) */}
      <div className="md:hidden px-3 py-2 flex items-center justify-between gap-3">
        {/* Track Thumbnail & Title */}
        <div
          onClick={openFullscreen}
          className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer"
        >
          <img
            src={currentTrack.image}
            alt={currentTrack.title}
            className="w-10 h-10 rounded-xl object-cover shadow border border-white/10 shrink-0"
          />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-white truncate leading-tight">
              {currentTrack.title}
            </p>
            <p className="text-[11px] text-zinc-400 truncate mt-0.5">{currentTrack.artist}</p>
          </div>
        </div>

        {/* Mobile Action Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={togglePlayPause}
            disabled={isLoading}
            className="w-9 h-9 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-md active:scale-90 transition-all"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : isPlaying ? (
              <Pause className="w-4 h-4 fill-current" />
            ) : (
              <Play className="w-4 h-4 fill-current ml-0.5" />
            )}
          </button>

          <button
            onClick={nextTrack}
            className="p-2 text-zinc-300 hover:text-white glass-button rounded-xl active:scale-90 transition-all"
            title="Next Track"
          >
            <SkipForward className="w-4 h-4 fill-current" />
          </button>

          <button
            onClick={toggleQueue}
            className={`p-2 rounded-xl glass-button ${
              isQueueOpen ? 'text-purple-400 border-purple-500/50' : 'text-zinc-400'
            }`}
            title="Queue"
          >
            <ListMusic className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* DESKTOP EXPANDED STUDIO BAR (>= 768px) */}
      <div className="hidden md:flex items-center justify-between gap-4 px-6 py-2.5 max-w-7xl mx-auto w-full">
        {/* Left: Artwork, Info & Badge */}
        <div className="flex items-center gap-3 w-1/4 min-w-0">
          <div className="relative group cursor-pointer shrink-0" onClick={openFullscreen}>
            <img
              src={currentTrack.image}
              alt={currentTrack.title}
              className="w-12 h-12 rounded-xl object-cover shadow-lg border border-white/10 group-hover:scale-105 transition-all"
            />
            <div className="absolute inset-0 bg-black/40 rounded-xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              <Maximize2 className="w-3.5 h-3.5 text-white" />
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h4
                onClick={openFullscreen}
                className="text-xs font-bold text-zinc-100 truncate cursor-pointer hover:text-purple-300 transition-colors"
              >
                {currentTrack.title}
              </h4>
              {isYT ? (
                <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-red-600/30 text-red-300 border border-red-500/40 uppercase shrink-0 flex items-center gap-1">
                  <Youtube className="w-2.5 h-2.5 fill-current" />
                  YT
                </span>
              ) : (
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 uppercase shrink-0">
                  320k
                </span>
              )}
            </div>
            <p className="text-[11px] text-zinc-400 truncate mt-0.5 font-medium">{currentTrack.artist}</p>
          </div>

          <button
            onClick={() => setIsLiked(!isLiked)}
            className={`p-1.5 rounded-full glass-button transition-colors shrink-0 ${
              isLiked ? 'text-pink-500' : 'text-zinc-400 hover:text-zinc-200'
            }`}
            title={isLiked ? 'Favorited' : 'Favorite'}
          >
            <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-current' : ''}`} />
          </button>
        </div>

        {/* Center: Controls & Scrubber */}
        <div className="flex flex-col items-center w-full max-w-lg flex-1">
          {/* Controls Bar */}
          <div className="flex items-center gap-4">
            <button
              onClick={toggleShuffle}
              className={`p-1.5 rounded-full glass-button transition-colors ${
                isShuffle ? 'text-purple-400 border-purple-500/40 bg-purple-500/10' : 'text-zinc-400 hover:text-white'
              }`}
              title={isShuffle ? 'Shuffle ON' : 'Shuffle OFF'}
            >
              <Shuffle className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => seekRelative(-5)}
              className="p-1.5 rounded-full text-zinc-400 hover:text-white glass-button transition-all active:scale-95"
              title="Rewind 5s"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={prevTrack}
              className="p-1.5 rounded-full text-zinc-300 hover:text-white glass-button transition-all active:scale-95"
              title="Previous Track"
            >
              <SkipBack className="w-4 h-4 fill-current" />
            </button>

            {/* Play/Pause Button */}
            <button
              onClick={togglePlayPause}
              disabled={isLoading}
              className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-purple-600/35 hover:scale-105 active:scale-95 transition-all border border-white/20"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : isPlaying ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 fill-current ml-0.5" />
              )}
            </button>

            {/* Skip Forward Next Track */}
            <button
              onClick={nextTrack}
              className="p-1.5 rounded-full text-zinc-300 hover:text-white glass-button transition-all active:scale-95"
              title="Next Track (Skip Forward)"
            >
              <SkipForward className="w-4 h-4 fill-current" />
            </button>

            <button
              onClick={() => seekRelative(5)}
              className="p-1.5 rounded-full text-zinc-400 hover:text-white glass-button transition-all active:scale-95"
              title="Skip forward 5s"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={cyclePlayMode}
              className={`p-1.5 rounded-full glass-button transition-colors ${
                playMode !== 'none' ? 'text-purple-400 border-purple-500/40 bg-purple-500/10' : 'text-zinc-400 hover:text-white'
              }`}
              title={`Repeat: ${playMode}`}
            >
              {playMode === 'repeat-one' ? (
                <Repeat1 className="w-3.5 h-3.5" />
              ) : (
                <Repeat className="w-3.5 h-3.5" />
              )}
            </button>

            {/* Autoplay Toggle Switch */}
            <button
              onClick={toggleAutoplay}
              className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition-all ${
                isAutoplay
                  ? 'bg-red-500/20 text-red-300 border-red-500/40'
                  : 'glass-button text-zinc-400 hover:text-zinc-200'
              }`}
              title={isAutoplay ? 'YouTube Autoplay ON' : 'Autoplay OFF'}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isAutoplay ? 'bg-red-400 animate-pulse' : 'bg-zinc-600'}`} />
              <span>Autoplay</span>
            </button>
          </div>

          {/* Desktop Scrubber */}
          <div className="flex items-center gap-2.5 w-full mt-1.5">
            <span className="text-[10px] font-mono text-zinc-400 w-8 text-right font-medium">
              {formatTime(currentTime)}
            </span>

            <div
              className="relative flex-1 group py-1 cursor-pointer"
              onMouseMove={handleSeekMouseMove}
              onMouseLeave={() => setSeekHoverTime(null)}
            >
              <div className="h-1 w-full bg-zinc-800 rounded-full overflow-hidden relative">
                <div
                  className="absolute top-0 bottom-0 left-0 bg-zinc-700/60 rounded-full transition-all"
                  style={{ width: `${bufferedPercent}%` }}
                />
                <div
                  className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-purple-500 to-indigo-400 rounded-full transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              <input
                type="range"
                min="0"
                max={duration || 100}
                step="0.1"
                value={currentTime}
                onChange={handleSeekChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />

              {seekHoverTime !== null && (
                <div
                  className="absolute -top-6 -translate-x-1/2 glass-panel text-white text-[10px] font-mono px-1.5 py-0.5 rounded border border-white/10 pointer-events-none"
                  style={{ left: `${(seekHoverTime / (duration || 1)) * 100}%` }}
                >
                  {formatTime(seekHoverTime)}
                </div>
              )}
            </div>

            <span className="text-[10px] font-mono text-zinc-400 w-8 font-medium">
              {formatTime(duration)}
            </span>
          </div>
        </div>

        {/* Right: Visualizer, Volume, Queue & Fullscreen */}
        <div className="flex items-center justify-end gap-3 w-1/4">
          <div
            onClick={openFullscreen}
            className="cursor-pointer p-1 rounded-lg glass-button hover:border-purple-500/30 transition-all"
            title="Spectrum visualizer"
          >
            <AudioVisualizer height={20} barWidth={2} gap={2} />
          </div>

          {/* Volume */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={toggleMute}
              className="p-1 rounded-full text-zinc-400 hover:text-white glass-button transition-colors"
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-3.5 h-3.5 text-red-400" />
              ) : volume < 0.5 ? (
                <Volume1 className="w-3.5 h-3.5" />
              ) : (
                <Volume2 className="w-3.5 h-3.5" />
              )}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={isMuted ? 0 : volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-16 h-1 bg-zinc-800 accent-purple-500 rounded-lg cursor-pointer"
            />
          </div>

          {/* Queue button */}
          <button
            onClick={toggleQueue}
            className={`p-1.5 rounded-xl glass-button ${
              isQueueOpen ? 'text-purple-400 border-purple-500/40 bg-purple-500/10' : 'text-zinc-400 hover:text-white'
            }`}
            title="Queue"
          >
            <ListMusic className="w-3.5 h-3.5" />
          </button>

          {/* Fullscreen */}
          <button
            onClick={openFullscreen}
            className="p-1.5 text-zinc-400 hover:text-white glass-button rounded-xl transition-colors"
            title="Fullscreen"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </footer>
  );
};
