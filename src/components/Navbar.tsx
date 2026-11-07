import React from 'react';
import { Search, Radio, Music, ListMusic, Sparkles, X, Users } from 'lucide-react';
import { YoutubeIcon as Youtube } from './YoutubeIcon';
import { useRoom } from '../context/RoomContext';
import { usePlayer } from '../context/PlayerContext';

interface NavbarProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onSearchSubmit: (e: React.FormEvent) => void;
  openSpotifyModal: () => void;
  openYouTubeModal: () => void;
  openRoomModal: () => void;
  toggleQueue: () => void;
  isQueueOpen: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  searchQuery,
  setSearchQuery,
  onSearchSubmit,
  openSpotifyModal,
  openYouTubeModal,
  openRoomModal,
  toggleQueue,
  isQueueOpen,
}) => {
  const { roomState } = useRoom();
  const { queue } = usePlayer();

  return (
    <header className="sticky top-0 z-30 w-full glass-panel border-b border-white/10 px-4 md:px-8 py-3.5 flex items-center justify-between gap-4 transition-all">
      {/* Brand Logo with Dynamic Gradient Sheen */}
      <div
        className="flex items-center gap-3 shrink-0 cursor-pointer group"
        onClick={() => setSearchQuery('')}
      >
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-pink-500 flex items-center justify-between p-2.5 shadow-lg shadow-purple-900/40 border border-white/20 group-hover:scale-105 transition-all">
          <span className="w-1 h-3.5 bg-white rounded-full group-hover:h-5 transition-all"></span>
          <span className="w-1 h-5 bg-white rounded-full group-hover:h-3 transition-all"></span>
          <span className="w-1 h-2 bg-white rounded-full group-hover:h-6 transition-all"></span>
          <span className="w-1 h-4 bg-white rounded-full group-hover:h-2 transition-all"></span>
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="font-black text-xl tracking-tight bg-gradient-to-r from-white via-zinc-100 to-zinc-400 bg-clip-text text-transparent">
              AuxParty
            </h1>
            <span className="text-[10px] uppercase font-black tracking-wider px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
              320k
            </span>
          </div>
          <p className="text-[11px] text-zinc-400 font-medium hidden sm:block">
            Stream together • Lossless HIFI
          </p>
        </div>
      </div>

      {/* Search Input Bar (Supports search queries & Direct YouTube links!) */}
      <div className="flex-1 max-w-xl mx-2">
        <form onSubmit={onSearchSubmit} className="relative w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search songs or paste direct YouTube links (press '/' to focus)..."
            className="w-full glass-input text-sm text-zinc-100 placeholder-zinc-500 rounded-full pl-10 pr-10 py-2.5 focus:outline-none transition-all font-medium"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </form>
      </div>

      {/* Right Action Buttons */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* Direct YouTube Link Button */}
        <button
          onClick={openYouTubeModal}
          className="flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-bold bg-red-600/15 text-red-300 border border-red-500/30 hover:bg-red-600/25 hover:border-red-500/50 transition-all shadow-sm shadow-red-600/20"
          title="Add song via YouTube link"
        >
          <Youtube className="w-3.5 h-3.5 text-red-400 fill-current" />
          <span className="hidden md:inline">YouTube</span>
        </button>

        {/* Spotify Import Button */}
        <button
          onClick={openSpotifyModal}
          className="flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 hover:border-emerald-500/50 transition-all shadow-sm shadow-emerald-500/20"
          title="Import Spotify playlist"
        >
          <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          <span className="hidden md:inline">Spotify</span>
        </button>

        {/* Room / Listen Together Button */}
        <button
          onClick={openRoomModal}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all ${
            roomState.connected
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/40 animate-pulse-slow border border-purple-400/50'
              : 'glass-button text-zinc-200 hover:text-white'
          }`}
        >
          <Radio className={`w-3.5 h-3.5 ${roomState.connected ? 'text-white' : 'text-purple-400'}`} />
          {roomState.connected ? (
            <span className="flex items-center gap-1.5">
              <span>#{roomState.roomCode}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
            </span>
          ) : (
            <span>Party Room</span>
          )}
        </button>

        {/* Queue Toggle Button */}
        <button
          onClick={toggleQueue}
          className={`p-2.5 rounded-full glass-button transition-colors relative ${
            isQueueOpen
              ? 'bg-purple-600/30 text-purple-300 border-purple-500/50 shadow-md shadow-purple-600/20'
              : 'text-zinc-400 hover:text-white'
          }`}
          title="Toggle Queue"
        >
          <ListMusic className="w-4 h-4" />
          {queue.length > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-purple-500 text-white text-[9px] font-black flex items-center justify-center">
              {queue.length}
            </span>
          )}
        </button>
      </div>
    </header>
  );
};
