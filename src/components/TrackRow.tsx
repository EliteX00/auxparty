import React from 'react';
import { Play, Pause, Plus } from 'lucide-react';
import { YoutubeIcon as Youtube } from './YoutubeIcon';
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
  const isYT = track.source === 'youtube' || Boolean(track.youtubeId);

  const formatDuration = (sec: number) => {
    if (!sec || isNaN(sec)) return '—';
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
      className={`group flex items-center justify-between px-3.5 py-2.5 rounded-2xl transition-all cursor-pointer select-none ${
        isThisSelected
          ? 'glass-card border-purple-500/40 bg-purple-950/30'
          : 'hover:bg-white/[0.04] border border-transparent'
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
          className="w-10 h-10 rounded-xl object-cover shrink-0 shadow-sm border border-white/10"
          loading="lazy"
        />

        {/* Title & Artist */}
        <div className="min-w-0 flex-1">
          <p
            className={`text-sm font-semibold truncate ${
              isThisSelected ? 'text-purple-300' : 'text-zinc-100 group-hover:text-purple-300'
            }`}
          >
            {track.title}
          </p>
          <p className="text-xs text-zinc-400 truncate">{track.artist}</p>
        </div>
      </div>

      {/* Center: Album */}
      <div className="hidden md:block w-1/3 px-4 truncate text-xs text-zinc-400">
        {track.album || '—'}
      </div>

      {/* Right: Badge, Duration, Actions */}
      <div className="flex items-center gap-3 shrink-0">
        {isYT ? (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-red-600/20 text-red-300 border border-red-500/30 flex items-center gap-1">
            <Youtube className="w-2.5 h-2.5 fill-current" />
            YT
          </span>
        ) : (
          <span className="hidden sm:inline text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-white/5 text-purple-300 border border-white/10">
            320k
          </span>
        )}

        <button
          onClick={(e) => {
            e.stopPropagation();
            addToQueue(track);
          }}
          className="p-1.5 rounded-lg glass-button opacity-0 group-hover:opacity-100 transition-opacity text-zinc-300 hover:text-white"
          title="Add to queue"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>

        <span className="text-xs font-mono text-zinc-400 w-12 text-right">
          {formatDuration(track.duration)}
        </span>
      </div>
    </div>
  );
};
