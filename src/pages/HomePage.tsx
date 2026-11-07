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
  Headphones,
} from 'lucide-react';
import { YoutubeIcon as Youtube } from '../components/YoutubeIcon';
import { Track } from '../types';
import { searchTracks, getTrendingTracks } from '../services/api';
import { Navbar } from '../components/Navbar';
import { TrackCard } from '../components/TrackCard';
import { TrackRow } from '../components/TrackRow';
import { AudioPlayer } from '../components/AudioPlayer';
import { SpotifyImportModal } from '../components/SpotifyImportModal';
import { YouTubeModal } from '../components/YouTubeModal';
import { RoomModal } from '../components/RoomModal';
import { QueueDrawer } from '../components/QueueDrawer';
import { FullscreenPlayer } from '../components/FullscreenPlayer';
import { FloatingReactions } from '../components/FloatingReactions';
import { AmbientBackground } from '../components/AmbientBackground';
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
  const [isYouTubeModalOpen, setIsYouTubeModalOpen] = useState(false);
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

  // Handle Search Input with Debounce (Automatically detects direct YouTube links!)
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
    <div className="min-h-screen text-zinc-100 flex flex-col pb-28 selection:bg-purple-600 selection:text-white relative">
      {/* Top Glass Navbar */}
      <Navbar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onSearchSubmit={handleSearchSubmit}
        openSpotifyModal={() => setIsSpotifyModalOpen(true)}
        openYouTubeModal={() => setIsYouTubeModalOpen(true)}
        openRoomModal={() => setIsRoomModalOpen(true)}
        toggleQueue={() => setIsQueueOpen((prev) => !prev)}
        isQueueOpen={isQueueOpen}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-8 py-6 space-y-8">
        {/* Hero Glass Banner (Only when not actively searching) */}
        {!searchQuery.trim() && (
          <div className="relative overflow-hidden rounded-3xl glass-panel p-6 sm:p-10 shadow-2xl border border-white/10">
            {/* Native GPU radial glow blobs (Zero filter/blur overhead) */}
            <div
              className="absolute -top-24 -right-24 w-96 h-96 rounded-full pointer-events-none"
              style={{ background: 'radial-gradient(circle, rgba(147, 51, 234, 0.25) 0%, transparent 70%)' }}
            />
            <div
              className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full pointer-events-none"
              style={{ background: 'radial-gradient(circle, rgba(219, 39, 119, 0.2) 0%, transparent 70%)' }}
            />
            <div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full pointer-events-none"
              style={{ background: 'radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%)' }}
            />

            <div className="relative z-10 max-w-2xl space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/15 text-purple-300 text-xs font-bold uppercase tracking-wider">
                <Radio className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
                Synchronized Lossless Listening
              </div>

              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white leading-tight">
                Stream in <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-300 bg-clip-text text-transparent">320kbps HIFI</span> & Direct YouTube.
              </h2>

              <p className="text-sm md:text-base text-zinc-300 font-medium leading-relaxed">
                Zero subscriptions. No ads. Start a synced party room with friends, drop direct YouTube links, or import entire Spotify playlists with YouTube-style continuous autoplay.
              </p>

              <div className="pt-2 flex flex-wrap gap-3">
                <button
                  onClick={() => setIsRoomModalOpen(true)}
                  className="px-6 py-3 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm shadow-xl shadow-purple-600/40 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 border border-white/20"
                >
                  <Radio className="w-4 h-4" />
                  {roomState.connected ? `Room #${roomState.roomCode}` : 'Create Party Room'}
                </button>

                <button
                  onClick={() => setIsYouTubeModalOpen(true)}
                  className="px-6 py-3 rounded-full bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/40 font-bold text-sm hover:scale-105 active:scale-95 transition-all flex items-center gap-2 shadow-lg shadow-red-600/20"
                >
                  <Youtube className="w-4 h-4 text-red-400 fill-current" />
                  Paste YouTube Link
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
                className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                  selectedGenre === g
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/40 border border-purple-400/40'
                    : 'glass-button text-zinc-400 hover:text-white'
                }`}
              >
                {g}
              </button>
            ))}
          </div>

          <div className="hidden sm:flex items-center gap-1 glass-panel p-1 rounded-2xl border border-white/10">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                viewMode === 'grid' ? 'bg-white/15 text-white shadow-sm' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Grid
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                viewMode === 'list' ? 'bg-white/15 text-white shadow-sm' : 'text-zinc-400 hover:text-white'
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
                <h3 className="text-xl font-black text-white">
                  Results for "{searchQuery}"
                </h3>
              </>
            ) : (
              <>
                <Flame className="w-5 h-5 text-pink-500 animate-pulse" />
                <h3 className="text-xl font-black text-white">Trending Hits & Discovered Beats</h3>
              </>
            )}
            {isSearching && <Loader2 className="w-4 h-4 animate-spin text-purple-400 ml-2" />}
          </div>

          <span className="text-xs text-zinc-400 font-semibold">
            {displayedTracks.length} high-fidelity tracks
          </span>
        </div>

        {/* Tracks Grid or List View */}
        {isSearching || (isLoadingTrending && displayedTracks.length === 0) ? (
          <div className="py-20 flex flex-col items-center justify-center text-zinc-400 space-y-3">
            <Loader2 className="w-9 h-9 animate-spin text-purple-400" />
            <p className="text-xs font-semibold">Fetching 320kbps streams & video links...</p>
          </div>
        ) : displayedTracks.length === 0 ? (
          <div className="py-20 text-center text-zinc-500 space-y-3 glass-panel rounded-3xl p-8">
            <Music2 className="w-12 h-12 mx-auto opacity-30 text-purple-400" />
            <p className="text-base font-bold text-zinc-300">No tracks found</p>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto">
              Try searching for an artist, song title, or paste any direct YouTube link!
            </p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {displayedTracks.map((track, idx) => (
              <TrackCard key={track.id} track={track} index={idx} />
            ))}
          </div>
        ) : (
          <div className="glass-panel rounded-3xl border border-white/10 p-3 divide-y divide-white/5">
            {displayedTracks.map((track, idx) => (
              <TrackRow key={track.id} track={track} index={idx} />
            ))}
          </div>
        )}
      </main>

      {/* Bottom Audio Player with Glassmorphism and Autoplay */}
      <AudioPlayer
        toggleQueue={() => setIsQueueOpen((prev) => !prev)}
        isQueueOpen={isQueueOpen}
        openFullscreen={() => setIsFullscreenOpen(true)}
        openRoomModal={() => setIsRoomModalOpen(true)}
      />

      {/* Slide-over Queue Drawer */}
      <QueueDrawer isOpen={isQueueOpen} onClose={() => setIsQueueOpen(false)} />

      {/* Direct YouTube Modal */}
      <YouTubeModal
        isOpen={isYouTubeModalOpen}
        onClose={() => setIsYouTubeModalOpen(false)}
      />

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
    </div>
  );
};
