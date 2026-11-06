import React, { useEffect } from 'react';
import {
  ChevronDown,
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
  Radio,
  Flame,
  Heart,
  Zap,
  Headphones,
  PartyPopper,
} from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { useRoom } from '../context/RoomContext';
import { AudioVisualizer } from './AudioVisualizer';

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
    volume,
    isMuted,
    playMode,
    isShuffle,
    isLoading,
    togglePlayPause,
    seekTo,
    setVolume,
    toggleMute,
    nextTrack,
    prevTrack,
    toggleShuffle,
    cyclePlayMode,
  } = usePlayer();

  const { roomState, sendReaction } = useRoom();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
      if (e.code === 'Space' && isOpen && !(e.target instanceof HTMLInputElement)) {
        e.preventDefault();
        togglePlayPause();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, togglePlayPause]);

  if (!isOpen || !currentTrack) return null;

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const emojis = ['🔥', '❤️', '⚡', '🎧', '🚀', '🎉'];

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col justify-between overflow-hidden animate-fade-in select-none">
      {/* Dynamic blurred ambient glow background */}
      <div
        className="absolute inset-0 bg-cover bg-center blur-3xl opacity-25 scale-125 transition-all duration-1000 pointer-events-none"
        style={{ backgroundImage: `url(${currentTrack.image})` }}
      ></div>
      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/70 to-zinc-950/40 pointer-events-none"></div>

      {/* Top Header */}
      <div className="relative z-10 p-6 flex items-center justify-between">
        <button
          onClick={onClose}
          className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-all active:scale-95"
          title="Minimize player (Esc)"
        >
          <ChevronDown className="w-6 h-6" />
        </button>

        <div className="flex flex-col items-center">
          <span className="text-[11px] uppercase tracking-widest font-extrabold text-purple-400">
            Playing in 320kbps HIFI
          </span>
          {roomState.connected && (
            <div className="flex items-center gap-1.5 mt-1 px-2.5 py-0.5 rounded-full bg-purple-900/50 border border-purple-500/30 text-purple-200 text-xs">
              <Radio className="w-3 h-3 text-purple-400 animate-pulse" />
              <span>Room {roomState.roomCode} • {roomState.peers.length} Listening</span>
            </div>
          )}
        </div>

        <div className="w-10"></div>
      </div>

      {/* Center Artwork & Visualizer */}
      <div className="relative z-10 flex flex-col items-center justify-center flex-1 px-6 max-w-2xl mx-auto w-full my-auto">
        <div className="relative group">
          <img
            src={currentTrack.image}
            alt={currentTrack.title}
            className="w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96 rounded-3xl object-cover shadow-2xl shadow-purple-950/60 border border-white/10 transition-transform duration-500"
          />
          {isPlaying && (
            <div className="absolute -inset-4 bg-purple-500/20 rounded-[2.5rem] blur-xl -z-10 animate-pulse"></div>
          )}
        </div>

        {/* Live Canvas Spectrum Visualizer */}
        <div className="w-full flex justify-center mt-6">
          <AudioVisualizer height={42} barWidth={4} gap={3} className="w-64 sm:w-80 opacity-90" />
        </div>

        {/* Track Info */}
        <div className="text-center mt-6 w-full">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight truncate drop-shadow-md">
            {currentTrack.title}
          </h2>
          <p className="text-base sm:text-lg text-zinc-400 font-medium truncate mt-1">
            {currentTrack.artist}
          </p>
          {currentTrack.album && (
            <p className="text-xs text-zinc-500 truncate mt-0.5">{currentTrack.album}</p>
          )}
        </div>

        {/* Quick Reaction Bar (for Rooms) */}
        {roomState.connected && (
          <div className="flex gap-2.5 mt-4 p-2 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10">
            {emojis.map((emoji) => (
              <button
                key={emoji}
                onClick={() => sendReaction(emoji)}
                className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/15 text-xl flex items-center justify-center hover:scale-125 active:scale-95 transition-all"
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
            <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all"
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
          <div className="flex justify-between text-xs font-mono text-zinc-400 mt-1">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-between">
          <button
            onClick={toggleShuffle}
            className={`p-3 rounded-full transition-colors ${
              isShuffle ? 'text-purple-400' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Shuffle className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-6">
            <button
              onClick={prevTrack}
              className="p-3 text-zinc-300 hover:text-white transition-all active:scale-90"
            >
              <SkipBack className="w-7 h-7 fill-current" />
            </button>

            <button
              onClick={togglePlayPause}
              disabled={isLoading}
              className="w-16 h-16 rounded-full bg-gradient-to-tr from-purple-600 to-pink-500 text-white flex items-center justify-center shadow-xl shadow-purple-600/40 hover:scale-105 active:scale-95 transition-all"
            >
              {isLoading ? (
                <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : isPlaying ? (
                <Pause className="w-7 h-7 fill-current" />
              ) : (
                <Play className="w-7 h-7 fill-current ml-1" />
              )}
            </button>

            <button
              onClick={nextTrack}
              className="p-3 text-zinc-300 hover:text-white transition-all active:scale-90"
            >
              <SkipForward className="w-7 h-7 fill-current" />
            </button>
          </div>

          <button
            onClick={cyclePlayMode}
            className={`p-3 rounded-full transition-colors ${
              playMode !== 'none' ? 'text-purple-400' : 'text-zinc-500 hover:text-zinc-300'
            }`}
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
