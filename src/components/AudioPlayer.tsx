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
} from 'lucide-react';
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

  const { roomState } = useRoom();
  const [isLiked, setIsLiked] = useState<boolean>(false);
  const [isSeeking, setIsSeeking] = useState<boolean>(false);
  const [seekHoverTime, setSeekHoverTime] = useState<number | null>(null);

  if (!currentTrack) {
    return (
      <footer className="fixed bottom-0 left-0 right-0 z-40 bg-zinc-950/80 backdrop-blur-xl border-t border-zinc-900 py-3.5 px-6 flex items-center justify-between text-xs text-zinc-500">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-zinc-700 animate-pulse"></div>
          <span>Select any song or search to start streaming in 320kbps</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-zinc-600">AuxParty Ready</span>
        </div>
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

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    seekTo(val);
  };

  const handleSeekMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    setSeekHoverTime(Math.max(0, Math.min(duration, pos * duration)));
  };

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-40 bg-zinc-950/90 backdrop-blur-2xl border-t border-zinc-800/80 px-4 md:px-8 py-3 flex flex-col md:flex-row items-center justify-between gap-3 shadow-2xl transition-all">
      {/* Left: Track Info & Artwork */}
      <div className="flex items-center gap-3.5 w-full md:w-1/4 min-w-0">
        <div className="relative group cursor-pointer shrink-0" onClick={openFullscreen}>
          <img
            src={currentTrack.image}
            alt={currentTrack.title}
            className="w-13 h-13 md:w-14 md:h-14 rounded-xl object-cover shadow-lg border border-white/5 group-hover:scale-105 transition-all"
          />
          <div className="absolute inset-0 bg-black/40 rounded-xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
            <Maximize2 className="w-4 h-4 text-white" />
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4
              onClick={openFullscreen}
              className="text-sm font-bold text-zinc-100 truncate cursor-pointer hover:text-purple-400 transition-colors"
            >
              {currentTrack.title}
            </h4>
            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 uppercase shrink-0">
              320k
            </span>
          </div>
          <p className="text-xs text-zinc-400 truncate mt-0.5">{currentTrack.artist}</p>
        </div>

        {/* Favorite heart button */}
        <button
          onClick={() => setIsLiked(!isLiked)}
          className={`p-1.5 rounded-full transition-colors shrink-0 ${
            isLiked ? 'text-pink-500' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
        </button>

        {/* Room Sync Live Badge */}
        {roomState.connected && (
          <button
            onClick={openRoomModal}
            className="hidden lg:flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold bg-purple-900/60 text-purple-300 border border-purple-500/40 hover:bg-purple-800/80 transition-all shrink-0"
          >
            <Radio className="w-2.5 h-2.5 animate-pulse text-purple-300" />
            <span>{roomState.isHost ? 'DJ Host' : 'Synced'}</span>
          </button>
        )}
      </div>

      {/* Center: Controls & Scrubber */}
      <div className="flex flex-col items-center w-full md:max-w-xl md:flex-1">
        {/* Buttons */}
        <div className="flex items-center gap-4 sm:gap-6">
          <button
            onClick={toggleShuffle}
            className={`p-1.5 rounded-full transition-colors ${
              isShuffle ? 'text-purple-400' : 'text-zinc-500 hover:text-zinc-300'
            }`}
            title={isShuffle ? 'Shuffle enabled' : 'Shuffle disabled'}
          >
            <Shuffle className="w-4 h-4" />
          </button>

          <button
            onClick={prevTrack}
            className="p-1.5 rounded-full text-zinc-400 hover:text-white transition-colors active:scale-95"
            title="Previous"
          >
            <SkipBack className="w-5 h-5 fill-current" />
          </button>

          <button
            onClick={togglePlayPause}
            disabled={isLoading}
            className="w-11 h-11 rounded-full bg-gradient-to-r from-purple-500 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-purple-600/30 hover:scale-105 active:scale-95 transition-all"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : isPlaying ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current ml-0.5" />
            )}
          </button>

          <button
            onClick={nextTrack}
            className="p-1.5 rounded-full text-zinc-400 hover:text-white transition-colors active:scale-95"
            title="Next"
          >
            <SkipForward className="w-5 h-5 fill-current" />
          </button>

          <button
            onClick={cyclePlayMode}
            className={`p-1.5 rounded-full transition-colors ${
              playMode !== 'none' ? 'text-purple-400' : 'text-zinc-500 hover:text-zinc-300'
            }`}
            title={`Repeat: ${playMode}`}
          >
            {playMode === 'repeat-one' ? (
              <Repeat1 className="w-4 h-4" />
            ) : (
              <Repeat className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Progress Bar / Scrubber */}
        <div className="flex items-center gap-3 w-full mt-2">
          <span className="text-[11px] font-mono text-zinc-400 w-9 text-right">
            {formatTime(currentTime)}
          </span>

          <div
            className="relative flex-1 group py-1 cursor-pointer"
            onMouseMove={handleSeekMouseMove}
            onMouseLeave={() => setSeekHoverTime(null)}
          >
            {/* Background bar */}
            <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden relative">
              {/* Buffered progress */}
              <div
                className="absolute top-0 bottom-0 left-0 bg-zinc-700/60 rounded-full transition-all"
                style={{ width: `${bufferedPercent}%` }}
              ></div>
              {/* Played progress */}
              <div
                className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full group-hover:from-purple-400 group-hover:to-pink-400 transition-all"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>

            {/* Range Input overlay */}
            <input
              type="range"
              min="0"
              max={duration || 100}
              step="0.1"
              value={currentTime}
              onChange={handleSeekChange}
              onMouseDown={() => setIsSeeking(true)}
              onMouseUp={() => setIsSeeking(false)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />

            {/* Hover tooltip */}
            {seekHoverTime !== null && (
              <div
                className="absolute -top-7 -translate-x-1/2 bg-zinc-900 text-zinc-200 text-[10px] font-mono px-1.5 py-0.5 rounded border border-zinc-700 pointer-events-none"
                style={{ left: `${(seekHoverTime / duration) * 100}%` }}
              >
                {formatTime(seekHoverTime)}
              </div>
            )}
          </div>

          <span className="text-[11px] font-mono text-zinc-400 w-9">
            {formatTime(duration)}
          </span>
        </div>
      </div>

      {/* Right: Visualizer, Volume, Queue & Fullscreen */}
      <div className="hidden md:flex items-center justify-end gap-3.5 w-1/4">
        {/* Mini Visualizer */}
        <div
          onClick={openFullscreen}
          className="cursor-pointer p-1 rounded-lg hover:bg-zinc-800/40 transition-colors"
          title="Audio spectrum visualizer"
        >
          <AudioVisualizer height={26} barWidth={2} gap={2} />
        </div>

        {/* Volume controls */}
        <div className="flex items-center gap-2 group">
          <button
            onClick={toggleMute}
            className="text-zinc-400 hover:text-white transition-colors"
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-4 h-4 text-red-400" />
            ) : volume < 0.5 ? (
              <Volume1 className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={isMuted ? 0 : volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="w-18 h-1 bg-zinc-800 accent-purple-500 rounded-lg cursor-pointer"
          />
        </div>

        {/* Queue button */}
        <button
          onClick={toggleQueue}
          className={`p-2 rounded-lg transition-colors ${
            isQueueOpen
              ? 'bg-purple-600/20 text-purple-400 border border-purple-500/40'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
          }`}
          title="Queue"
        >
          <ListMusic className="w-4 h-4" />
        </button>

        {/* Expand / Fullscreen */}
        <button
          onClick={openFullscreen}
          className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800/50 rounded-lg transition-colors"
          title="Fullscreen Mode"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>
    </footer>
  );
};
