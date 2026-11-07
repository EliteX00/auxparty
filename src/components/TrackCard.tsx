import React from 'react';
import { Play, Pause, Plus } from 'lucide-react';
import { YoutubeIcon as Youtube } from './YoutubeIcon';
import { Track } from '../types';
import { usePlayer } from '../context/PlayerContext';

interface TrackCardProps {
  track: Track;
  index?: number;
}

export const TrackCard: React.FC<TrackCardProps> = ({ track }) => {
  const { currentTrack, isPlaying, playTrack, togglePlayPause, addToQueue } = usePlayer();
  const isThisPlaying = currentTrack?.id === track.id && isPlaying;
  const isThisSelected = currentTrack?.id === track.id;
  const isYT = track.source === 'youtube' || Boolean(track.youtubeId);

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isThisSelected) {
      togglePlayPause();
    } else {
      playTrack(track);
    }
  };

  const handleQueueClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    addToQueue(track);
  };

  return (
    <div
      onClick={handlePlayClick}
      className={`group relative flex flex-col p-3 rounded-2xl glass-card transition-all duration-300 cursor-pointer ${
        isThisSelected ? 'border-purple-500/50 bg-purple-950/30 shadow-lg shadow-purple-900/30' : ''
      }`}
    >
      {/* Artwork container */}
      <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-zinc-950 shadow-inner border border-white/5">
        <img
          src={track.image || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=60'}
          alt={track.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />

        {/* Hover overlay with action buttons */}
        <div
          className={`absolute inset-0 bg-black/50 transition-opacity flex items-center justify-center gap-2 ${
            isThisSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}
        >
          <button
            onClick={handlePlayClick}
            className="w-12 h-12 rounded-full bg-gradient-to-tr from-purple-600 to-pink-500 text-white flex items-center justify-center shadow-lg shadow-purple-600/40 hover:scale-110 active:scale-95 transition-all border border-white/20"
          >
            {isThisPlaying ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current ml-0.5" />
            )}
          </button>

          <button
            onClick={handleQueueClick}
            className="w-9 h-9 rounded-full glass-button text-zinc-100 flex items-center justify-center shadow-md hover:text-white hover:border-purple-400 hover:scale-105 active:scale-95 transition-all"
            title="Add to queue"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Badge: 320k or YouTube */}
        {isYT ? (
          <span className="absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-md bg-zinc-950/85 text-red-300 border border-red-500/30 flex items-center gap-1 shadow-sm">
            <Youtube className="w-3 h-3 fill-current text-red-400" />
            YouTube
          </span>
        ) : (
          <span className="absolute top-2 left-2 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-zinc-950/85 text-purple-300 border border-white/10 shadow-sm">
            320k
          </span>
        )}

        {/* Equalizer animation when playing */}
        {isThisPlaying && (
          <div className="absolute bottom-2 right-2 flex items-end gap-0.5 bg-zinc-950/90 p-1.5 rounded-lg border border-white/10 shadow-sm">
            <span className="w-1 bg-purple-400 rounded-full h-3 animate-soundwave"></span>
            <span className="w-1 bg-pink-400 rounded-full h-4 animate-soundwave [animation-delay:0.2s]"></span>
            <span className="w-1 bg-purple-400 rounded-full h-2 animate-soundwave [animation-delay:0.4s]"></span>
          </div>
        )}
      </div>

      {/* Track Info */}
      <div className="mt-3 flex flex-col">
        <h3
          className={`font-semibold text-sm truncate leading-snug ${
            isThisSelected ? 'text-purple-300' : 'text-zinc-100 group-hover:text-purple-300'
          }`}
        >
          {track.title}
        </h3>
        <p className="text-xs text-zinc-400 truncate mt-0.5 font-medium">{track.artist}</p>
      </div>
    </div>
  );
};
