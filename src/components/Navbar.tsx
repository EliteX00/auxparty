import React from 'react';
import { Search, Radio, Music, ListMusic, Sparkles, X, Users } from 'lucide-react';
import { useRoom } from '../context/RoomContext';
import { usePlayer } from '../context/PlayerContext';

interface NavbarProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onSearchSubmit: (e: React.FormEvent) => void;
  openSpotifyModal: () => void;
  openRoomModal: () => void;
  toggleQueue: () => void;
  isQueueOpen: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  searchQuery,
  setSearchQuery,
  onSearchSubmit,
  openSpotifyModal,
  openRoomModal,
  toggleQueue,
  isQueueOpen,
}) => {
  const { roomState } = useRoom();
  const { queue } = usePlayer();

  return (
    <header className="sticky top-0 z-30 w-full backdrop-blur-xl bg-zinc-950/80 border-b border-zinc-800/60 px-4 md:px-8 py-3.5 flex items-center justify-between gap-4 transition-all">
      {/* Brand Logo */}
      <div className="flex items-center gap-3 shrink-0 cursor-pointer" onClick={() => setSearchQuery('')}>
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 via-violet-500 to-pink-500 flex items-center justify-between p-2 shadow-lg shadow-purple-900/30 group">
          <span className="w-1 h-3.5 bg-white rounded-full group-hover:h-5 transition-all"></span>
          <span className="w-1 h-5 bg-white rounded-full group-hover:h-3 transition-all"></span>
          <span className="w-1 h-2 bg-white rounded-full group-hover:h-6 transition-all"></span>
          <span className="w-1 h-4 bg-white rounded-full group-hover:h-2 transition-all"></span>
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
              AuxParty
            </h1>
            <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
              320k
            </span>
          </div>
          <p className="text-[11px] text-zinc-400 font-medium hidden sm:block">
            Stream together • Zero ads
          </p>
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="flex-1 max-w-xl mx-2">
        <form onSubmit={onSearchSubmit} className="relative w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search songs, artists, albums (press '/' to focus)..."
            className="w-full bg-zinc-900/90 text-sm text-zinc-100 placeholder-zinc-500 rounded-full pl-10 pr-10 py-2.5 border border-zinc-800 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all shadow-inner"
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
        {/* Spotify Import Button */}
        <button
          onClick={openSpotifyModal}
          className="flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 hover:border-emerald-500/40 transition-all"
          title="Import any Spotify playlist"
        >
          <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          <span className="hidden md:inline">Import Spotify</span>
        </button>

        {/* Room / Listen Together Button */}
        <button
          onClick={openRoomModal}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-semibold transition-all ${
            roomState.connected
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30 animate-pulse-slow'
              : 'bg-zinc-800/80 text-zinc-200 border border-zinc-700/80 hover:bg-zinc-700/80 hover:text-white'
          }`}
        >
          <Radio className={`w-3.5 h-3.5 ${roomState.connected ? 'text-white' : 'text-purple-400'}`} />
          {roomState.connected ? (
            <span className="flex items-center gap-1.5">
              <span>{roomState.roomCode}</span>
              <span className="flex items-center gap-0.5 text-[10px] bg-purple-900/60 px-1.5 py-0.2 rounded-full border border-purple-400/40">
                <Users className="w-2.5 h-2.5" />
                {roomState.peers.length}
              </span>
            </span>
          ) : (
            <span>Listen With Friends</span>
          )}
        </button>

        {/* Queue Button */}
        <button
          onClick={toggleQueue}
          className={`relative p-2.5 rounded-full border transition-all ${
            isQueueOpen
              ? 'bg-purple-600 border-purple-500 text-white'
              : 'bg-zinc-900/80 border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700'
          }`}
          title="Open Queue"
        >
          <ListMusic className="w-4 h-4" />
          {queue.length > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-purple-500 text-[10px] font-bold text-white flex items-center justify-center border-2 border-zinc-950">
              {queue.length}
            </span>
          )}
        </button>
      </div>
    </header>
  );
};
