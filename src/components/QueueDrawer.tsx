import React, { useState } from 'react';
import { X, Trash2, ListMusic, Music, History, Play } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';

interface QueueDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QueueDrawer: React.FC<QueueDrawerProps> = ({ isOpen, onClose }) => {
  const { currentTrack, queue, history, removeFromQueue, clearQueue, playTrack } = usePlayer();
  const [activeTab, setActiveTab] = useState<'queue' | 'history'>('queue');

  if (!isOpen) return null;

  return (
    <aside className="fixed inset-y-0 right-0 z-50 w-full sm:w-96 bg-zinc-950/95 backdrop-blur-2xl border-l border-zinc-800 shadow-2xl flex flex-col animate-slide-left">
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-zinc-800/80">
        <div className="flex items-center gap-2.5">
          <ListMusic className="w-5 h-5 text-purple-400" />
          <h3 className="font-bold text-base text-zinc-100">Play Queue</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-800/80 px-4 pt-2">
        <button
          onClick={() => setActiveTab('queue')}
          className={`flex items-center gap-2 pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all ${
            activeTab === 'queue'
              ? 'border-purple-500 text-purple-400'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <ListMusic className="w-3.5 h-3.5" />
          Up Next ({queue.length})
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all ${
            activeTab === 'history'
              ? 'border-purple-500 text-purple-400'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          Recently Played
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Now Playing Banner */}
        {currentTrack && (
          <div className="p-3 rounded-2xl bg-purple-950/20 border border-purple-500/30 flex items-center gap-3">
            <img
              src={currentTrack.image}
              alt={currentTrack.title}
              className="w-11 h-11 rounded-lg object-cover shadow"
            />
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 block">
                Now Playing
              </span>
              <p className="text-sm font-semibold text-zinc-100 truncate">
                {currentTrack.title}
              </p>
              <p className="text-xs text-zinc-400 truncate">{currentTrack.artist}</p>
            </div>
            <div className="flex items-end gap-0.5 h-4 px-1">
              <span className="w-1 bg-purple-400 rounded-full h-full animate-soundwave"></span>
              <span className="w-1 bg-pink-400 rounded-full h-2/3 animate-soundwave [animation-delay:0.2s]"></span>
              <span className="w-1 bg-purple-400 rounded-full h-4/5 animate-soundwave [animation-delay:0.4s]"></span>
            </div>
          </div>
        )}

        {activeTab === 'queue' ? (
          <div>
            <div className="flex items-center justify-between text-xs text-zinc-400 mb-2">
              <span>Next In Line</span>
              {queue.length > 0 && (
                <button
                  onClick={clearQueue}
                  className="flex items-center gap-1 text-[11px] text-zinc-500 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                  Clear Queue
                </button>
              )}
            </div>

            {queue.length === 0 ? (
              <div className="py-12 text-center text-zinc-500 text-xs">
                <Music className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p>Your queue is empty.</p>
                <p className="text-[11px] text-zinc-600 mt-1">
                  Add tracks from search or import a Spotify playlist!
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {queue.map((track, idx) => (
                  <div
                    key={`${track.id}-${idx}`}
                    className="group flex items-center justify-between p-2 rounded-xl hover:bg-zinc-900 border border-transparent hover:border-zinc-800 transition-all text-xs"
                  >
                    <div
                      className="flex items-center gap-2.5 truncate cursor-pointer flex-1"
                      onClick={() => playTrack(track, queue.filter((_, i) => i !== idx))}
                    >
                      <span className="text-zinc-500 w-4 text-center font-mono">{idx + 1}</span>
                      <img src={track.image} alt={track.title} className="w-8 h-8 rounded object-cover" />
                      <div className="truncate">
                        <p className="font-semibold text-zinc-200 truncate group-hover:text-purple-400">
                          {track.title}
                        </p>
                        <p className="text-[11px] text-zinc-500 truncate">{track.artist}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => removeFromQueue(idx)}
                      className="p-1 text-zinc-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div>
            <div className="text-xs text-zinc-400 mb-2">Played History</div>
            {history.length === 0 ? (
              <div className="py-12 text-center text-zinc-500 text-xs">
                <History className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p>No recently played tracks yet.</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {history.map((track, idx) => (
                  <div
                    key={`${track.id}-hist-${idx}`}
                    onClick={() => playTrack(track)}
                    className="group flex items-center justify-between p-2 rounded-xl hover:bg-zinc-900 border border-transparent hover:border-zinc-800 transition-all text-xs cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 truncate flex-1">
                      <img src={track.image} alt={track.title} className="w-8 h-8 rounded object-cover" />
                      <div className="truncate">
                        <p className="font-semibold text-zinc-200 truncate group-hover:text-purple-400">
                          {track.title}
                        </p>
                        <p className="text-[11px] text-zinc-500 truncate">{track.artist}</p>
                      </div>
                    </div>
                    <Play className="w-3.5 h-3.5 text-zinc-500 group-hover:text-white" />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
