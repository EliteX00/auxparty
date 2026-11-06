import React from 'react';
import { Play, Pause, Plus, MoreHorizontal, Clock } from 'lucide-react';
import { Track } from '../types';
import { usePlayer } from '../context/PlayerContext';

interface TrackRowProps {
  track: Track;
  index: number;
}

export const TrackRow: React.FC<TrackRowProps> = ({ track, index }) => {
  const { currentTrack, isPlaying, playTrack, togglePlayPause, addToQueue } = usePlayer();
  const isThisPlaying = currentTrack?.id === track.id && isPlaying;
  const isThisSelected = currentTrack?.id === track.id;

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleRowClick = () => {
    if (isThisSelected) {
      togglePlayPause();
    } else {
      playTrack(track);
    }
  };

  return (
    <div
      onClick={handleRowClick}
      className={`group flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all cursor-pointer select-none ${
        isThisSelected
          ? 'bg-purple-950/30 border border-purple-500/30'
          : 'hover:bg-zinc-800/40 border border-transparent'
      }`}
    >
      {/* Left: Index / Play Icon & Track Details */}
      <div className="flex items-center gap-3.5 min-w-0 flex-1">
        {/* Index or Play button */}
        <div className="w-6 flex items-center justify-center shrink-0">
          <span
            className={`text-xs font-semibold text-zinc-500 group-hover:hidden ${
              isThisSelected ? 'hidden' : 'block'
            }`}
          >
            {index + 1}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleRowClick();
            }}
            className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
              isThisSelected ? 'flex text-purple-400' : 'hidden group-hover:flex text-zinc-200 hover:text-white'
            }`}
          >
            {isThisPlaying ? (
              <Pause className="w-4 h-4 fill-current" />
            ) : (
              <Play className="w-4 h-4 fill-current ml-0.5" />
            )}
          </button>
        </div>

        {/* Thumbnail */}
        <img
          src={track.image || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=100&auto=format&fit=crop&q=60'}
          alt={track.title}
          className="w-10 h-10 rounded-lg object-cover shrink-0 shadow-sm"
          loading="lazy"
        />

        {/* Title & Artist */}
        <div className="min-w-0 flex-1">
          <p
            className={`text-sm font-semibold truncate ${
              isThisSelected ? 'text-purple-400' : 'text-zinc-100 group-hover:text-purple-300'
            }`}
          >
            {track.title}
          </p>
          <p className="text-xs text-zinc-400 truncate">{track.artist}</p>
        </div>
      </div>

      {/* Center: Album (hidden on small screens) */}
      <div className="hidden md:block w-1/3 px-4 truncate text-xs text-zinc-400">
        {track.album || '—'}
      </div>

      {/* Right: Badge, Duration, Actions */}
      <div className="flex items-center gap-3 shrink-0">
        <span className="hidden sm:inline text-[10px] font-bold px-1.5 py-0.5 rounded bg-zinc-800/80 text-purple-300 border border-zinc-700/50">
          320k
        </span>

        <button
          onClick={(e) => {
            e.stopPropagation();
            addToQueue(track);
          }}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-700/50 opacity-0 group-hover:opacity-100 transition-opacity"
          title="Add to queue"
        >
          <Plus className="w-4 h-4" />
        </button>

        <span className="text-xs font-mono text-zinc-500 w-10 text-right">
          {formatDuration(track.duration)}
        </span>
      </div>
    </div>
  );
};
