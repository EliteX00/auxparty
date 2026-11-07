import React, { useEffect, useState } from 'react';
import {
  ChevronDown,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Radio,
  RotateCcw,
  RotateCw,
  Sparkles,
} from 'lucide-react';
import { YoutubeIcon as Youtube } from './YoutubeIcon';
import { usePlayer } from '../context/PlayerContext';
import { useRoom } from '../context/RoomContext';
import { AudioVisualizer } from './AudioVisualizer';
import { extractPalette, TrackPalette, DEFAULT_PALETTE } from '../utils/colorExtractor';

interface FullscreenPlayerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FullscreenPlayer: React.FC<FullscreenPlayerProps> = ({ isOpen, onClose }) => {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    playMode,
    isShuffle,
    isAutoplay,
    autoplayTrack,
    isLoading,
    togglePlayPause,
    seekTo,
    seekRelative,
    nextTrack,
    prevTrack,
    toggleShuffle,
    toggleAutoplay,
    cyclePlayMode,
  } = usePlayer();

  const { roomState, sendReaction } = useRoom();
  const [palette, setPalette] = useState<TrackPalette>(DEFAULT_PALETTE);

  useEffect(() => {
    if (currentTrack?.image) {
      extractPalette(currentTrack.image, currentTrack.title).then(setPalette);
    }
  }, [currentTrack?.image, currentTrack?.title]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
      if (e.code === 'Space' && isOpen && !(e.target instanceof HTMLInputElement)) {
        e.preventDefault();
        togglePlayPause();
      }
      if (e.key === 'ArrowRight' && isOpen) {
        seekRelative(10);
      }
      if (e.key === 'ArrowLeft' && isOpen) {
        seekRelative(-10);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, togglePlayPause, seekRelative]);

  if (!isOpen || !currentTrack) return null;

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const emojis = ['🔥', '❤️', '⚡', '🎧', '🚀', '🎉'];
  const isYT = currentTrack.source === 'youtube' || Boolean(currentTrack.youtubeId);

  return (
    <div className="fixed inset-0 z-50 bg-[#0c0c12] flex flex-col justify-between overflow-hidden animate-fade-in select-none">
      {/* High-Contrast Duo-Tone Ambient Atmosphere (Reference Matched) */}
      <div
        className="absolute inset-0 pointer-events-none transition-all duration-700"
        style={{
          background: `
            radial-gradient(ellipse 65% 55% at 20% 25%, ${palette.primaryGlow} 0%, transparent 68%),
            radial-gradient(ellipse 55% 50% at 80% 75%, ${palette.secondaryGlow} 0%, transparent 64%),
            #0c0c12
          `,
          animation: isPlaying ? 'aliveBreathing 8s ease-in-out infinite alternate' : 'none',
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 75% 70% at 50% 50%, rgba(12, 12, 18, 0.1) 0%, rgba(12, 12, 18, 0.8) 85%, #0c0c12 100%)',
        }}
      />

      {/* Top Header */}
      <div className="relative z-10 p-6 flex items-center justify-between">
        <button
          onClick={onClose}
          className="p-3 rounded-2xl glass-button text-white transition-all active:scale-95 hover:bg-white/15"
          title="Minimize player (Esc)"
        >
          <ChevronDown className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center">
          <div className="flex items-center gap-2">
            {isYT ? (
              <span className="text-[10px] uppercase tracking-widest font-extrabold px-2.5 py-0.5 rounded-full bg-red-600/30 text-red-300 border border-red-500/40 flex items-center gap-1.5">
                <Youtube className="w-3 h-3 fill-current" />
                YouTube Audio Stream
              </span>
            ) : (
              <span className="text-[10px] uppercase tracking-widest font-extrabold px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Playing in 320kbps HIFI
              </span>
            )}
          </div>
          {roomState.connected && (
            <div className="flex items-center gap-1.5 mt-1.5 px-3 py-0.5 rounded-full glass-panel text-purple-200 text-xs border-purple-500/30">
              <Radio className="w-3 h-3 text-purple-400 animate-pulse" />
              <span>Room {roomState.roomCode} • {roomState.peers.length} Listening</span>
            </div>
          )}
        </div>

        {/* YouTube Autoplay Toggle in Header */}
        <button
          onClick={toggleAutoplay}
          className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border flex items-center gap-1.5 ${
            isAutoplay
              ? 'bg-red-500/20 text-red-300 border-red-500/40 shadow-sm shadow-red-500/20'
              : 'glass-button text-zinc-400 border-white/10'
          }`}
          title={isAutoplay ? 'Autoplay ON' : 'Autoplay OFF'}
        >
          <span className={`w-2 h-2 rounded-full ${isAutoplay ? 'bg-red-400 animate-pulse' : 'bg-zinc-600'}`} />
          <span className="hidden sm:inline">Autoplay</span>
        </button>
      </div>

      {/* Center Artwork & Visualizer */}
      <div className="relative z-10 flex flex-col items-center justify-center flex-1 px-6 max-w-2xl mx-auto w-full my-auto">
        <div className="relative group">
          <img
            src={currentTrack.image}
            alt={currentTrack.title}
            className="w-64 h-64 sm:w-80 sm:h-80 md:w-92 md:h-92 rounded-3xl object-cover shadow-2xl border border-white/15 transition-transform duration-500 group-hover:scale-[1.02]"
          />
          {isPlaying && (
            <div
              className="absolute -inset-4 rounded-[2.5rem] blur-2xl -z-10 animate-pulse opacity-60"
              style={{ background: palette.primary }}
            />
          )}
        </div>

        {/* Live Canvas Spectrum Visualizer */}
        <div className="w-full flex justify-center mt-6">
          <AudioVisualizer height={40} barWidth={4} gap={3} className="w-64 sm:w-80 opacity-90" />
        </div>

        {/* Track Info */}
        <div className="text-center mt-5 w-full">
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight truncate drop-shadow-md">
            {currentTrack.title}
          </h2>
          <p className="text-base sm:text-lg text-zinc-300 font-semibold truncate mt-1">
            {currentTrack.artist}
          </p>
          {autoplayTrack && isAutoplay && (
            <p className="text-xs text-zinc-400 mt-1 flex items-center justify-center gap-1.5 font-medium">
              <Sparkles className="w-3 h-3 text-purple-400" />
              <span>Up Next (Autoplay): {autoplayTrack.title}</span>
            </p>
          )}
        </div>

        {/* Quick Reaction Bar (for Rooms) */}
        {roomState.connected && (
          <div className="flex gap-2.5 mt-5 p-2 rounded-2xl glass-panel">
            {emojis.map((emoji) => (
              <button
                key={emoji}
                onClick={() => sendReaction(emoji)}
                className="w-10 h-10 rounded-xl glass-button text-xl flex items-center justify-center hover:scale-125 active:scale-95 transition-all"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Controls */}
      <div className="relative z-10 p-6 sm:p-10 max-w-2xl mx-auto w-full space-y-4">
        {/* Scrubber */}
        <div>
          <div className="relative group py-2 cursor-pointer">
            <div className="h-2 w-full bg-zinc-800/80 rounded-full overflow-hidden border border-white/5">
              <div
                className="h-full bg-gradient-to-r from-purple-500 via-indigo-500 to-pink-500 rounded-full transition-all"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
            <input
              type="range"
              min="0"
              max={duration || 100}
              step="0.1"
              value={currentTime}
              onChange={(e) => seekTo(parseFloat(e.target.value))}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>
          <div className="flex justify-between text-xs font-mono text-zinc-400 mt-1 font-semibold">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Buttons Bar */}
        <div className="flex items-center justify-between">
          <button
            onClick={toggleShuffle}
            className={`p-3 rounded-2xl glass-button transition-colors ${
              isShuffle ? 'text-purple-400 border-purple-500/40 bg-purple-500/10' : 'text-zinc-400 hover:text-white'
            }`}
            title="Shuffle"
          >
            <Shuffle className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-4 sm:gap-6">
            {/* Rewind 10s */}
            <button
              onClick={() => seekRelative(-10)}
              className="p-3 rounded-2xl glass-button text-zinc-400 hover:text-white transition-all active:scale-90"
              title="Rewind 10 seconds (Left Arrow)"
            >
              <RotateCcw className="w-5 h-5" />
            </button>

            {/* Prev Track */}
            <button
              onClick={prevTrack}
              className="p-3 text-zinc-200 hover:text-white glass-button rounded-2xl transition-all active:scale-90"
              title="Previous Track"
            >
              <SkipBack className="w-6 h-6 fill-current" />
            </button>

            {/* Main Play / Pause Button */}
            <button
              onClick={togglePlayPause}
              disabled={isLoading}
              className="w-16 h-16 rounded-full bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 text-white flex items-center justify-center shadow-2xl shadow-purple-600/50 hover:scale-105 active:scale-95 transition-all border border-white/20"
              title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
            >
              {isLoading ? (
                <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : isPlaying ? (
                <Pause className="w-7 h-7 fill-current" />
              ) : (
                <Play className="w-7 h-7 fill-current ml-1" />
              )}
            </button>

            {/* Next Track (Guaranteed to work + Autoplay Next) */}
            <button
              onClick={nextTrack}
              className="p-3 text-zinc-200 hover:text-white glass-button rounded-2xl transition-all active:scale-90"
              title="Next Track (Skip Forward)"
            >
              <SkipForward className="w-6 h-6 fill-current" />
            </button>

            {/* Forward 10s */}
            <button
              onClick={() => seekRelative(10)}
              className="p-3 rounded-2xl glass-button text-zinc-400 hover:text-white transition-all active:scale-90"
              title="Skip forward 10 seconds (Right Arrow)"
            >
              <RotateCw className="w-5 h-5" />
            </button>
          </div>

          <button
            onClick={cyclePlayMode}
            className={`p-3 rounded-2xl glass-button transition-colors ${
              playMode !== 'none' ? 'text-purple-400 border-purple-500/40 bg-purple-500/10' : 'text-zinc-400 hover:text-white'
            }`}
            title={`Repeat: ${playMode}`}
          >
            {playMode === 'repeat-one' ? (
              <Repeat1 className="w-5 h-5" />
            ) : (
              <Repeat className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
