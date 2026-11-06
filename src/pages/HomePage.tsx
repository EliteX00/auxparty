import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  Search,
  Sparkles,
  Radio,
  Music2,
  Compass,
  Flame,
  Volume2,
  ListMusic,
  Share2,
  Play,
  Loader2,
} from 'lucide-react';
import { Track } from '../types';
import { searchTracks, getTrendingTracks } from '../services/api';
import { Navbar } from '../components/Navbar';
import { TrackCard } from '../components/TrackCard';
import { TrackRow } from '../components/TrackRow';
import { AudioPlayer } from '../components/AudioPlayer';
import { SpotifyImportModal } from '../components/SpotifyImportModal';
import { RoomModal } from '../components/RoomModal';
import { QueueDrawer } from '../components/QueueDrawer';
import { FullscreenPlayer } from '../components/FullscreenPlayer';
import { FloatingReactions } from '../components/FloatingReactions';
import { usePlayer } from '../context/PlayerContext';
import { useRoom } from '../context/RoomContext';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { currentTrack, playTrack } = usePlayer();
  const { roomState } = useRoom();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Track[]>([]);
  const [trendingTracks, setTrendingTracks] = useState<Track[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingTrending, setIsLoadingTrending] = useState(true);
  const [selectedGenre, setSelectedGenre] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Modals & Panels
  const [isSpotifyModalOpen, setIsSpotifyModalOpen] = useState(false);
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);

  // Search debounce
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load Trending on Mount
  useEffect(() => {
    async function loadTrending() {
      setIsLoadingTrending(true);
      const tracks = await getTrendingTracks();
      setTrendingTracks(tracks);
      setIsLoadingTrending(false);
    }
    loadTrending();
  }, []);

  // Handle Search Input with Debounce
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    setIsSearching(true);
    debounceTimerRef.current = setTimeout(async () => {
      const results = await searchTracks(searchQuery);
      setSearchResults(results);
      setIsSearching(false);
    }, 350);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [searchQuery]);

  // Keyboard shortcut '/' to search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && !(e.target instanceof HTMLInputElement)) {
        e.preventDefault();
        const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement;
        searchInput?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
  };

  const handleGenreClick = async (genre: string) => {
    setSelectedGenre(genre);
    if (genre === 'All') {
      setSearchQuery('');
      setSearchResults([]);
    } else {
      setSearchQuery(genre);
    }
  };

  const genres = ['All', 'Hip Hop', 'Pop', 'EDM', 'R&B', 'Rock', 'Indie', 'Chill'];
  const displayedTracks = searchQuery.trim() ? searchResults : trendingTracks;

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col pb-28 selection:bg-purple-600 selection:text-white">
      {/* Top Navbar */}
      <Navbar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onSearchSubmit={handleSearchSubmit}
        openSpotifyModal={() => setIsSpotifyModalOpen(true)}
        openRoomModal={() => setIsRoomModalOpen(true)}
        toggleQueue={() => setIsQueueOpen((prev) => !prev)}
        isQueueOpen={isQueueOpen}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-8 py-6 space-y-8">
        {/* Hero Banner (Only when not actively searching) */}
        {!searchQuery.trim() && (
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-purple-900/40 via-violet-950/40 to-zinc-900/60 border border-purple-500/20 p-6 md:p-10 shadow-2xl backdrop-blur-xl">
            <div className="absolute -top-24 -right-24 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-pink-600/15 rounded-full blur-3xl pointer-events-none"></div>

            <div className="relative z-10 max-w-2xl space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-bold uppercase tracking-wider">
                <Radio className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
                Listen in Lockstep
              </div>

              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white leading-tight">
                Stream in <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-400 bg-clip-text text-transparent">320kbps HIFI</span> with Friends.
              </h2>

              <p className="text-sm md:text-base text-zinc-300 font-medium leading-relaxed">
                Zero subscriptions. No audio compression. Start a synced party room with your friends (e.g. <span className="font-mono text-purple-300 bg-purple-950/60 px-1.5 py-0.5 rounded border border-purple-500/30">/room/fg2f</span>) or import entire Spotify playlists with one click.
              </p>

              <div className="pt-2 flex flex-wrap gap-3">
                <button
                  onClick={() => setIsRoomModalOpen(true)}
                  className="px-6 py-3 rounded-full bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm shadow-xl shadow-purple-600/40 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                >
                  <Radio className="w-4 h-4" />
                  {roomState.connected ? `Go to Room #${roomState.roomCode}` : 'Create or Join Room'}
                </button>
                <button
                  onClick={() => setIsSpotifyModalOpen(true)}
                  className="px-6 py-3 rounded-full bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 font-bold text-sm hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  Import Spotify
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Genre Filter Pills */}
        <div className="flex items-center justify-between gap-4 overflow-x-auto pb-1 scrollbar-none">
          <div className="flex items-center gap-2">
            {genres.map((g) => (
              <button
                key={g}
                onClick={() => handleGenreClick(g)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedGenre === g
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                    : 'bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800/80'
                }`}
              >
                {g}
              </button>
            ))}
          </div>

          <div className="hidden sm:flex items-center gap-1 bg-zinc-900/80 p-1 rounded-xl border border-zinc-800">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'grid' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Grid
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'list' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              List
            </button>
          </div>
        </div>

        {/* Tracks Section Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {searchQuery.trim() ? (
              <>
                <Search className="w-5 h-5 text-purple-400" />
                <h3 className="text-xl font-bold text-white">
                  Results for "{searchQuery}"
                </h3>
              </>
            ) : (
              <>
                <Flame className="w-5 h-5 text-pink-500 animate-pulse" />
                <h3 className="text-xl font-bold text-white">Trending Hits</h3>
              </>
            )}
            {isSearching && <Loader2 className="w-4 h-4 animate-spin text-purple-400 ml-2" />}
          </div>

          <span className="text-xs text-zinc-500 font-medium">
            {displayedTracks.length} studio-grade tracks
          </span>
        </div>

        {/* Tracks Grid or List View */}
        {isSearching || (isLoadingTrending && displayedTracks.length === 0) ? (
          <div className="py-20 flex flex-col items-center justify-center text-zinc-500 space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
            <p className="text-xs">Fetching 320kbps streams...</p>
          </div>
        ) : displayedTracks.length === 0 ? (
          <div className="py-20 text-center text-zinc-500 space-y-2">
            <Music2 className="w-12 h-12 mx-auto opacity-30 text-purple-400" />
            <p className="text-base font-semibold text-zinc-400">No tracks found</p>
            <p className="text-xs text-zinc-600">
              Try searching for an artist, song title, or album name.
            </p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {displayedTracks.map((track, idx) => (
              <TrackCard key={track.id} track={track} index={idx} />
            ))}
          </div>
        ) : (
          <div className="bg-zinc-950/60 rounded-2xl border border-zinc-800/80 p-2 divide-y divide-zinc-900">
            {displayedTracks.map((track, idx) => (
              <TrackRow key={track.id} track={track} index={idx} />
            ))}
          </div>
        )}
      </main>

      {/* Bottom Audio Player */}
      <AudioPlayer
        toggleQueue={() => setIsQueueOpen((prev) => !prev)}
        isQueueOpen={isQueueOpen}
        openFullscreen={() => setIsFullscreenOpen(true)}
        openRoomModal={() => setIsRoomModalOpen(true)}
      />

      {/* Slide-over Queue Drawer */}
      <QueueDrawer isOpen={isQueueOpen} onClose={() => setIsQueueOpen(false)} />

      {/* Spotify Import Modal */}
      <SpotifyImportModal
        isOpen={isSpotifyModalOpen}
        onClose={() => setIsSpotifyModalOpen(false)}
      />

      {/* Room Modal */}
      <RoomModal isOpen={isRoomModalOpen} onClose={() => setIsRoomModalOpen(false)} />

      {/* Fullscreen Player */}
      <FullscreenPlayer
        isOpen={isFullscreenOpen}
        onClose={() => setIsFullscreenOpen(false)}
      />

      {/* Floating Reactions across screen */}
      <FloatingReactions />
    </div>
  );
};
