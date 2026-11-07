import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Radio,
  Users,
  Copy,
  Check,
  Share2,
  Sparkles,
  ListMusic,
  MessageSquare,
  Send,
  Plus,
  Search,
  LogOut,
  Crown,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  RotateCcw,
  RotateCw,
  Headphones,
  Music,
  Trash2,
  Loader2,
  ArrowLeft,
  Flame,
  AlertCircle,
  QrCode,
  Volume2,
  VolumeX,
  Volume1,
  ThumbsUp,
  Disc3,
  SlidersHorizontal,
  Zap,
} from 'lucide-react';
import { YoutubeIcon as Youtube } from '../components/YoutubeIcon';
import { useRoom } from '../context/RoomContext';
import { usePlayer } from '../context/PlayerContext';
import { AudioVisualizer } from '../components/AudioVisualizer';
import { SpotifyImportModal } from '../components/SpotifyImportModal';
import { YouTubeModal } from '../components/YouTubeModal';
import { QRCodeModal } from '../components/QRCodeModal';
import { searchTracks, fetchYouTubeTrack, extractYouTubeId } from '../services/api';
import { Track, SoundEffectType } from '../types';
import { extractPalette, DEFAULT_PALETTE, TrackPalette } from '../utils/colorExtractor';

export const RoomPage: React.FC = () => {
  const { roomCode } = useParams<{ roomCode: string }>();
  const navigate = useNavigate();

  const {
    roomState,
    messages,
    error,
    isConnecting,
    joinRoom,
    createRoom,
    leaveRoom,
    sendMessage,
    sendReaction,
    triggerSound,
    voteSkip,
    setAuxMode,
    transferAux,
    addToRoomQueue,
    upvoteTrack,
    clearError,
  } = useRoom();

  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    isLoading,
    isAutoplay,
    autoplayTrack,
    toggleAutoplay,
    togglePlayPause,
    seekTo,
    seekRelative,
    nextTrack,
    prevTrack,
    queue,
    removeFromQueue,
    clearQueue,
    playTrack,
  } = usePlayer();

  const targetCode = (roomCode || '').toUpperCase();

  // Local State
  const [palette, setPalette] = useState<TrackPalette>(DEFAULT_PALETTE);
  const [userNameInput, setUserNameInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'queue' | 'chat'>('queue');
  const [chatInput, setChatInput] = useState('');
  const [isSpotifyModalOpen, setIsSpotifyModalOpen] = useState(false);
  const [isYouTubeModalOpen, setIsYouTubeModalOpen] = useState(false);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [isAuxMenuOpen, setIsAuxMenuOpen] = useState(false);

  // In-Room Search
  const [roomSearchQuery, setRoomSearchQuery] = useState('');
  const [roomSearchResults, setRoomSearchResults] = useState<Track[]>([]);
  const [isRoomSearching, setIsRoomSearching] = useState(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Memoize main stage background style to avoid CSS re-parsing on time updates
  const stageGradientStyle = useMemo(
    () => ({
      background: `
        radial-gradient(ellipse 65% 55% at 20% 24%, ${palette.primaryGlow} 0%, transparent 68%),
        radial-gradient(ellipse 58% 52% at 84% 76%, ${palette.secondaryGlow} 0%, transparent 64%),
        #101017
      `,
    }),
    [palette.primaryGlow, palette.secondaryGlow]
  );

  useEffect(() => {
    if (currentTrack?.image) {
      extractPalette(currentTrack.image, `${currentTrack.title}-${currentTrack.artist}`).then(setPalette);
    } else {
      setPalette(DEFAULT_PALETTE);
    }
  }, [currentTrack?.image, currentTrack?.title, currentTrack?.artist]);

  useEffect(() => {
    if (!roomSearchQuery.trim()) {
      setRoomSearchResults([]);
      setIsRoomSearching(false);
      return;
    }
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    setIsRoomSearching(true);
    searchDebounceRef.current = setTimeout(async () => {
      const res = await searchTracks(roomSearchQuery);
      setRoomSearchResults(res);
      setIsRoomSearching(false);
    }, 300);
  }, [roomSearchQuery]);

  const handleExit = () => {
    leaveRoom();
    navigate('/');
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetCode) return;
    clearError();
    await joinRoom(targetCode, userNameInput.trim() || 'Friend');
  };

  const handleCreateThisRoom = async () => {
    clearError();
    await createRoom(userNameInput.trim() || 'DJ Host', targetCode);
  };

  const handleCopyLink = () => {
    const fullUrl = window.location.href;
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    sendMessage(chatInput);
    setChatInput('');
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const emojis = ['❤️', '🔥', '✨', '⚡', '🎵', '🎉'];
  const totalPeers = Math.max(1, roomState.peers.length);
  const skipThreshold = Math.ceil(totalPeers / 2);
  const hasVotedSkip = roomState.skipVotes.includes(roomState.userName);
  const isYT = currentTrack?.source === 'youtube' || Boolean(currentTrack?.youtubeId);

  // NOT CONNECTED VIEW: Join Screen
  if (!roomState.connected || roomState.roomCode !== targetCode) {
    return (
      <div className="min-h-screen text-zinc-100 flex flex-col justify-center items-center p-4 selection:bg-purple-600 relative overflow-hidden">
        <div className="relative z-10 w-full max-w-md glass-panel rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 border border-white/10">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs font-bold text-zinc-400 hover:text-white transition-colors mb-2"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Discover
          </Link>

          <div className="flex items-center gap-3.5">
            <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-pink-500 flex items-center justify-center text-white shadow-xl shadow-purple-600/30 border border-white/20">
              <Radio className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-white">Room #{targetCode}</h2>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  HIFI Sync
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5 font-medium">
                Join this synchronized party room to stream together
              </p>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3.5 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-zinc-300 mb-1.5 block uppercase tracking-wider">
                Your Nickname
              </label>
              <input
                type="text"
                value={userNameInput}
                onChange={(e) => setUserNameInput(e.target.value)}
                placeholder="e.g. Alex"
                autoFocus
                className="w-full glass-input rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none transition-all font-medium"
              />
            </div>

            <button
              type="submit"
              disabled={isConnecting}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-sm shadow-xl shadow-purple-600/40 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 border border-white/20"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Connecting to #{targetCode}...
                </>
              ) : (
                <>
                  <Headphones className="w-4 h-4" />
                  Join Room Now
                </>
              )}
            </button>
          </form>

          <div className="pt-2 text-center">
            <span className="text-xs text-zinc-500 block mb-2">Want to start this room as Host / DJ?</span>
            <button
              onClick={handleCreateThisRoom}
              disabled={isConnecting}
              className="text-xs font-bold text-purple-400 hover:text-purple-300 underline underline-offset-4"
            >
              Start Room #{targetCode} as DJ (Host)
            </button>
          </div>
        </div>
      </div>
    );
  }

  // CONNECTED VIEW: The Full Glassmorphic Room Experience
  return (
    <div className="min-h-screen text-zinc-100 flex flex-col pb-24 selection:bg-purple-600 selection:text-white relative overflow-x-hidden">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-30 w-full glass-panel border-b border-white/10 px-4 md:px-8 py-3 flex items-center justify-between gap-4">
        {/* Left: Brand & Room Tag */}
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="w-9 h-9 rounded-xl glass-button flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
            title="Home"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>

          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
              <span className="font-black text-base text-white tracking-wide">
                Room #{roomState.roomCode}
              </span>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                {roomState.isHost ? 'Host' : roomState.isDJ ? 'DJ' : 'Listener'}
              </span>
              {roomState.auxMode === 'open-aux' && (
                <span className="hidden sm:inline text-[9px] uppercase font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Open Aux
                </span>
              )}
            </div>
            <p className="text-[11px] text-zinc-400 font-mono">
              /room/{roomState.roomCode.toLowerCase()}
            </p>
          </div>
        </div>

        {/* Center: Connected Friends Avatars */}
        <div className="hidden lg:flex items-center gap-2 glass-panel-subtle px-4 py-1.5 rounded-full border border-white/10">
          <Users className="w-3.5 h-3.5 text-purple-400" />
          <span className="text-xs font-bold text-zinc-300">
            {roomState.peers.length} Friends:
          </span>
          <div className="flex items-center gap-1.5">
            {roomState.peers.map((p) => (
              <span
                key={p.id}
                className="flex items-center gap-1 text-[11px] font-bold glass-button px-2.5 py-0.5 rounded-full text-zinc-200 border border-white/10 shadow-sm"
              >
                {p.isHost ? (
                  <Crown className="w-3 h-3 text-amber-400" />
                ) : p.name === roomState.activeDjName ? (
                  <Disc3 className="w-3 h-3 text-purple-400 animate-spin" />
                ) : null}
                <span>{p.name}</span>
              </span>
            ))}
          </div>
        </div>

        {/* Right Action Bar - Minimalist Symbols & Emojis with Frosted Glassmorphism */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Minimalist Soundboard Dock (Emojis with frosted glass) */}
          <div className="flex items-center gap-0.5 sm:gap-1 glass-panel-subtle px-1.5 py-1 rounded-full border border-white/10 shadow-inner backdrop-blur-md">
            <button
              onClick={() => triggerSound('airhorn')}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm hover:bg-white/15 transition-all active:scale-90 hover:scale-110"
              title="Airhorn (📢)"
              aria-label="Airhorn"
            >
              📢
            </button>
            <button
              onClick={() => triggerSound('scratch')}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm hover:bg-white/15 transition-all active:scale-90 hover:scale-110"
              title="Vinyl Scratch (💽)"
              aria-label="Scratch"
            >
              💽
            </button>
            <button
              onClick={() => triggerSound('bassdrop')}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm hover:bg-white/15 transition-all active:scale-90 hover:scale-110"
              title="Bass Drop (💣)"
              aria-label="Bass Drop"
            >
              💣
            </button>
            <button
              onClick={() => triggerSound('cheer')}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm hover:bg-white/15 transition-all active:scale-90 hover:scale-110"
              title="Applause & Cheer (👏)"
              aria-label="Cheer"
            >
              👏
            </button>
          </div>

          {/* Minimalist YouTube Button */}
          <button
            onClick={() => setIsYouTubeModalOpen(true)}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full glass-button flex items-center justify-center text-red-500 hover:text-white hover:bg-red-500/20 border border-white/10 hover:border-red-500/40 transition-all active:scale-95 shadow-sm"
            title="Add YouTube Track"
            aria-label="Add YouTube Track"
          >
            <Youtube className="w-4 h-4 fill-current text-red-500" />
          </button>

          {/* Pass Aux (Host Controls) - Minimalist Glass */}
          {roomState.isHost && (
            <div className="relative">
              <button
                onClick={() => setIsAuxMenuOpen(!isAuxMenuOpen)}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full glass-button flex items-center justify-center text-amber-300 hover:text-amber-200 hover:bg-amber-500/20 border border-white/10 hover:border-amber-500/40 transition-all active:scale-95 shadow-sm"
                title="DJ Controls & Pass Aux Cord"
                aria-label="Pass Aux"
              >
                <SlidersHorizontal className="w-4 h-4" />
              </button>

              {isAuxMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 glass-panel rounded-2xl p-2 shadow-2xl z-50 space-y-1 border border-white/15 backdrop-blur-xl">
                  <div className="px-3 py-1.5 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                    Aux Cord Mode
                  </div>
                  <button
                    onClick={() => {
                      setAuxMode('host-only');
                      setIsAuxMenuOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 rounded-xl text-xs font-bold flex items-center justify-between transition-colors ${
                      roomState.auxMode === 'host-only'
                        ? 'bg-white/15 text-white border border-white/20'
                        : 'text-zinc-300 hover:bg-white/10'
                    }`}
                  >
                    <span>Host Only (Strict DJ)</span>
                    {roomState.auxMode === 'host-only' && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                  </button>
                  <button
                    onClick={() => {
                      setAuxMode('open-aux');
                      setIsAuxMenuOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 rounded-xl text-xs font-bold flex items-center justify-between transition-colors ${
                      roomState.auxMode === 'open-aux'
                        ? 'bg-white/15 text-white border border-white/20'
                        : 'text-zinc-300 hover:bg-white/10'
                    }`}
                  >
                    <span>Open Aux (Anyone DJs)</span>
                    {roomState.auxMode === 'open-aux' && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                  </button>

                  <div className="px-3 py-1.5 text-[10px] font-bold text-zinc-400 uppercase tracking-wider pt-2 border-t border-white/10">
                    Pass Aux To Friend
                  </div>
                  {roomState.peers.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        transferAux(p.name);
                        setIsAuxMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-1.5 rounded-xl text-xs font-medium text-zinc-300 hover:bg-white/10 flex items-center justify-between transition-colors"
                    >
                      <span>{p.name}</span>
                      {p.name === roomState.activeDjName && (
                        <Crown className="w-3.5 h-3.5 text-amber-400" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* QR Code - Minimalist Glass Button */}
          <button
            onClick={() => setIsQRModalOpen(true)}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full glass-button flex items-center justify-center text-zinc-300 hover:text-white border border-white/10 hover:bg-white/10 transition-all active:scale-95 shadow-sm"
            title="Scan QR Code to join on phone"
            aria-label="Scan QR Code"
          >
            <QrCode className="w-4 h-4" />
          </button>

          {/* Share / Invite Pill with Minimalist Symbol */}
          <button
            onClick={handleCopyLink}
            className="glass-button h-8 sm:h-9 px-3 rounded-full flex items-center gap-1.5 text-xs font-semibold text-zinc-300 border border-white/10 hover:border-white/25 hover:text-white hover:bg-white/10 transition-all active:scale-95 shadow-sm"
            title="Copy Invite Link"
            aria-label="Invite"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-[11px] text-emerald-300 font-medium">Copied</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5 text-purple-300" />
                <span className="hidden sm:inline text-[11px] tracking-wide">Invite</span>
              </>
            )}
          </button>

          {/* Spotify Import - Minimalist Glass Button */}
          <button
            onClick={() => setIsSpotifyModalOpen(true)}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full glass-button flex items-center justify-center text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/20 border border-white/10 hover:border-emerald-500/40 transition-all active:scale-95 shadow-sm"
            title="Import Spotify Playlist"
            aria-label="Spotify Import"
          >
            <Sparkles className="w-4 h-4" />
          </button>

          {/* Leave Room - Minimalist Glass Button */}
          <button
            onClick={handleExit}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full glass-button flex items-center justify-center text-zinc-400 hover:text-rose-400 hover:bg-rose-500/15 border border-white/10 hover:border-rose-500/30 transition-all active:scale-95 shadow-sm"
            title="Leave room"
            aria-label="Leave room"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Room Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6">
        {/* LEFT / CENTER: The Main DJ Stage (7 cols) */}
        <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
          {/* Main Stage Card with Exact High-Contrast Dual Glow (Reference Matched) */}
          <div
            className="relative overflow-hidden rounded-3xl p-5 sm:p-7 shadow-2xl flex flex-col items-center justify-between min-h-[480px] border border-white/10 transition-all duration-700"
            style={stageGradientStyle}
          >
            {/* Stage Top Bar (Matching hideout reference) */}
            <div className="w-full flex items-center justify-between text-xs text-zinc-400 z-10 px-1 mb-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="font-bold text-emerald-400 text-[11px] tracking-wider uppercase">Now playing</span>
              </div>
              <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-400">
                <span className="px-2.5 py-0.5 rounded-full bg-black/40 border border-white/10 text-zinc-300">
                  Sync 42 ms
                </span>
                {isYT ? (
                  <span className="px-2 py-0.5 rounded-full bg-red-600/20 text-red-300 border border-red-500/30 flex items-center gap-1 font-sans font-bold">
                    <Youtube className="w-3 h-3 fill-current text-red-500" /> YT
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-sans font-bold">
                    320k
                  </span>
                )}
              </div>
            </div>

            {/* Vertical Floating Reactions Dock (Matching Image 1 Reference) */}
            <div className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 hidden sm:flex flex-col gap-2 p-1.5 rounded-full glass-panel-subtle border border-white/15 z-20 shadow-2xl">
              {emojis.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => sendReaction(emoji)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-base hover:scale-130 active:scale-95 hover:bg-white/15 transition-all"
                  title={`React ${emoji}`}
                  aria-label={`React ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>

            {currentTrack ? (
              <div className="relative z-10 flex flex-col items-center text-center max-w-md w-full space-y-4 my-auto">
                {/* Spinning Vinyl Record Container */}
                <div className="relative group flex items-center justify-center">
                  <div
                    className={`w-44 h-44 sm:w-56 sm:h-56 md:w-64 md:h-64 rounded-full bg-zinc-950 p-2 shadow-2xl border-4 border-white/15 flex items-center justify-center ${
                      isPlaying ? 'animate-[spin_12s_linear_infinite]' : ''
                    }`}
                    style={{ willChange: isPlaying ? 'transform' : 'auto' }}
                  >
                    {/* Vinyl Grooves with Glass Reflections */}
                    <div className="w-full h-full rounded-full border border-white/10 flex items-center justify-center p-2.5 relative overflow-hidden">
                      <div className="absolute inset-0 rounded-full border border-white/5 scale-90"></div>
                      <div className="absolute inset-0 rounded-full border border-white/5 scale-75"></div>

                      {/* Center Album Art */}
                      <img
                        src={currentTrack.image}
                        alt={currentTrack.title}
                        className="w-24 h-24 sm:w-32 sm:h-32 md:w-36 md:h-36 rounded-full object-cover shadow-2xl border-2 border-white/30"
                      />
                      {/* Spindle hole */}
                      <div className="absolute w-4 h-4 rounded-full bg-zinc-950 border-2 border-zinc-600"></div>
                    </div>
                  </div>

                  {isPlaying && (
                    <div
                      className="absolute -inset-6 rounded-full -z-10 pointer-events-none opacity-40 transition-opacity"
                      style={{
                        background: `radial-gradient(circle, ${palette.primary} 0%, transparent 70%)`,
                        transform: 'translateZ(0)',
                      }}
                    />
                  )}
                </div>

                {/* Real-time Spectrum visualizer */}
                <div className="w-full flex justify-center">
                  <AudioVisualizer height={32} barWidth={3} gap={2} className="w-64 opacity-90" />
                </div>

                {/* Track Details */}
                <div>
                  <div className="flex items-center justify-center gap-2">
                    <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight truncate">
                      {currentTrack.title}
                    </h2>
                    {isYT ? (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-red-600/30 text-red-300 border border-red-500/40 uppercase shrink-0 flex items-center gap-1">
                        <Youtube className="w-3 h-3 fill-current" />
                        YouTube
                      </span>
                    ) : (
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 uppercase shrink-0">
                        320k
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-zinc-300 font-semibold truncate mt-1">
                    {currentTrack.artist}
                  </p>
                </div>

                {/* Scrubber & Timers */}
                <div className="w-full space-y-1">
                  <div className="relative group py-1 cursor-pointer">
                    <div className="h-1.5 w-full bg-zinc-800/80 rounded-full overflow-hidden border border-white/5">
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 via-indigo-500 to-pink-500 rounded-full transition-all shadow-sm shadow-purple-500/50"
                        style={{ width: `${progressPercent}%` }}
                      ></div>
                    </div>
                    {(roomState.isHost || roomState.isDJ) && (
                      <input
                        type="range"
                        min="0"
                        max={duration || 100}
                        step="0.1"
                        value={currentTime}
                        onChange={(e) => seekTo(parseFloat(e.target.value))}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                    )}
                  </div>
                  <div className="flex justify-between text-[11px] font-mono text-zinc-400 font-semibold">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>

                {/* DJ Playback Controls & Skip Forward / Vote Skip */}
                <div className="flex items-center justify-center gap-4 pt-1 w-full">
                  {/* Vote to Skip Button (for Everyone) */}
                  <button
                    onClick={voteSkip}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                      hasVotedSkip
                        ? 'bg-purple-600/30 text-purple-300 border-purple-500/50'
                        : 'glass-button text-zinc-300 hover:text-white'
                    }`}
                    title="Vote to skip current track"
                  >
                    <span>Vote Skip</span>
                    <span className="text-[10px] bg-black/40 px-1.5 py-0.2 rounded-full font-mono">
                      {roomState.skipVotes.length}/{skipThreshold}
                    </span>
                  </button>

                  {/* DJ Playback Controls */}
                  {roomState.isHost || roomState.isDJ ? (
                    <div className="flex items-center gap-3">
                      {/* Rewind 10s */}
                      <button
                        onClick={() => seekRelative(-10)}
                        className="p-2 text-zinc-400 hover:text-white glass-button rounded-xl transition-all active:scale-95"
                        title="Rewind 10s"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>

                      {/* Prev Track */}
                      <button
                        onClick={prevTrack}
                        className="p-2 text-zinc-300 hover:text-white glass-button rounded-xl transition-colors active:scale-95"
                        title="Previous Track"
                      >
                        <SkipBack className="w-5 h-5 fill-current" />
                      </button>

                      {/* Play / Pause */}
                      <button
                        onClick={togglePlayPause}
                        disabled={isLoading}
                        className="w-13 h-13 rounded-full bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 text-white flex items-center justify-center shadow-xl shadow-purple-600/40 hover:scale-105 active:scale-95 transition-all border border-white/20"
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

                      {/* Skip Forward Button (Guaranteed to work + Autoplay Next) */}
                      <button
                        onClick={nextTrack}
                        className="p-2 text-zinc-300 hover:text-white glass-button rounded-xl transition-colors active:scale-95"
                        title="Next Track (Skip Forward)"
                      >
                        <SkipForward className="w-5 h-5 fill-current" />
                      </button>

                      {/* Fast-forward 10s */}
                      <button
                        onClick={() => seekRelative(10)}
                        className="p-2 text-zinc-400 hover:text-white glass-button rounded-xl transition-all active:scale-95"
                        title="Skip forward 10s"
                      >
                        <RotateCw className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-xs text-purple-300 font-bold glass-panel px-3 py-1.5 rounded-full border-purple-500/30">
                      <Radio className="w-3.5 h-3.5 animate-pulse text-purple-400" />
                      <span>DJ: {roomState.activeDjName}</span>
                    </div>
                  )}

                  {/* Autoplay Toggle on Stage */}
                  {(roomState.isHost || roomState.isDJ) && (
                    <button
                      onClick={toggleAutoplay}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                        isAutoplay
                          ? 'bg-red-500/20 text-red-300 border-red-500/40'
                          : 'glass-button text-zinc-400 hover:text-zinc-200'
                      }`}
                      title={isAutoplay ? 'Autoplay Next is ON' : 'Autoplay Next is OFF'}
                    >
                      <div className={`w-2 h-2 rounded-full ${isAutoplay ? 'bg-red-400 animate-pulse' : 'bg-zinc-600'}`} />
                      <span>Autoplay</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="relative z-10 text-center space-y-3 py-16">
                <Music className="w-12 h-12 text-purple-400/50 mx-auto" />
                <h3 className="text-lg font-black text-zinc-200">No Song Playing Right Now</h3>
                <p className="text-xs text-zinc-400 max-w-xs mx-auto">
                  {roomState.isHost || roomState.isDJ
                    ? 'Search for any song, paste a direct YouTube link, or import Spotify below to start the party!'
                    : 'Waiting for the DJ to queue a track...'}
                </p>
                <div className="pt-2 flex justify-center gap-3">
                  <button
                    onClick={() => setIsYouTubeModalOpen(true)}
                    className="px-4 py-2 rounded-full bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/40 text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-red-600/20"
                  >
                    <Youtube className="w-3.5 h-3.5 fill-current" />
                    Paste YouTube Link
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Live Floating Reaction Buttons Dock (Mobile) */}
          <div className="p-3 rounded-2xl glass-panel flex items-center justify-between gap-2 border border-white/10 sm:hidden">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
              React:
            </span>
            <div className="flex items-center gap-1.5 flex-1 justify-around">
              {emojis.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => sendReaction(emoji)}
                  className="flex-1 py-1.5 rounded-xl glass-button text-xl hover:scale-125 active:scale-95 transition-all flex items-center justify-center"
                  title={`React ${emoji}`}
                  aria-label={`React ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT: Shared Democratic Queue & Live Party Chat (5 cols) */}
        <div className="lg:col-span-5 flex flex-col glass-panel rounded-3xl overflow-hidden shadow-2xl h-[580px] lg:h-auto border border-white/10">
          {/* Frosted Glassmorphism Tab Switcher with Minimalist Symbols & Emojis */}
          <div className="p-2.5 border-b border-white/10 bg-black/30">
            <div className="p-1 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center gap-1.5 shadow-inner">
              <button
                onClick={() => setActiveTab('queue')}
                className={`flex-1 py-2 px-3 text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-all duration-200 ${
                  activeTab === 'queue'
                    ? 'bg-white/15 text-white border border-white/20 shadow-md'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5 border border-transparent'
                }`}
              >
                <span className="text-sm">🎵</span>
                <span>Queue</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-white/10 border border-white/10 text-zinc-300">
                  {queue.length}
                </span>
              </button>
              <button
                onClick={() => setActiveTab('chat')}
                className={`flex-1 py-2 px-3 text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-all duration-200 ${
                  activeTab === 'chat'
                    ? 'bg-white/15 text-white border border-white/20 shadow-md'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5 border border-transparent'
                }`}
              >
                <span className="text-sm">💬</span>
                <span>Chat</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-white/10 border border-white/10 text-zinc-300">
                  {messages.length}
                </span>
              </button>
            </div>
          </div>

          {/* TAB 1: SHARED QUEUE */}
          {activeTab === 'queue' && (
            <div className="flex-1 flex flex-col p-4 overflow-hidden space-y-3">
              {/* Quick Search & Direct YouTube input inside room */}
              <div className="relative flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                  <input
                    type="text"
                    value={roomSearchQuery}
                    onChange={(e) => setRoomSearchQuery(e.target.value)}
                    placeholder="Search song or paste YouTube link..."
                    className="w-full glass-input rounded-xl pl-9 pr-4 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none transition-all font-medium"
                  />
                  {isRoomSearching && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin text-purple-400" />
                  )}
                </div>

                <button
                  onClick={() => setIsYouTubeModalOpen(true)}
                  className="p-2 rounded-xl bg-red-600/20 text-red-300 border border-red-500/40 hover:bg-red-600/30 transition-all shrink-0"
                  title="Direct YouTube input modal"
                >
                  <Youtube className="w-4 h-4 fill-current text-red-400" />
                </button>
              </div>

              {/* Search dropdown results */}
              {roomSearchResults.length > 0 && (
                <div className="max-h-48 overflow-y-auto glass-panel border-purple-500/30 rounded-2xl p-1.5 space-y-1 shadow-2xl">
                  {roomSearchResults.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => {
                        addToRoomQueue(t);
                        setRoomSearchQuery('');
                        setRoomSearchResults([]);
                      }}
                      className="flex items-center justify-between p-2 rounded-xl hover:bg-white/10 cursor-pointer transition-colors text-xs"
                    >
                      <div className="flex items-center gap-2 truncate flex-1">
                        <img src={t.image} alt={t.title} className="w-8 h-8 rounded-lg object-cover" />
                        <div className="truncate">
                          <p className="font-bold text-zinc-200 truncate">{t.title}</p>
                          <p className="text-[10px] text-zinc-400 truncate">{t.artist}</p>
                        </div>
                      </div>
                      <button className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-lg bg-purple-600/30 text-purple-300 border border-purple-500/30 hover:bg-purple-600 hover:text-white transition-all">
                        <Plus className="w-3 h-3" /> Queue
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Queue List */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {queue.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center text-zinc-500 space-y-2 py-12">
                    <ListMusic className="w-8 h-8 opacity-30 text-purple-400" />
                    <p className="text-xs font-semibold text-zinc-400">The room queue is empty.</p>
                    <p className="text-[11px] text-zinc-500">
                      Search above, paste a YouTube link, or import Spotify!
                    </p>
                    {isAutoplay && autoplayTrack && (
                      <div className="mt-3 p-2.5 rounded-xl glass-card border-red-500/20 max-w-xs text-left">
                        <span className="text-[9px] uppercase font-bold text-red-400 block mb-1">
                          Up Next (Autoplay Continuous):
                        </span>
                        <p className="text-xs font-bold text-zinc-200 truncate">{autoplayTrack.title}</p>
                        <p className="text-[10px] text-zinc-400 truncate">{autoplayTrack.artist}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  queue.map((track, idx) => {
                    const trackIsYT = track.source === 'youtube' || Boolean(track.youtubeId);
                    return (
                      <div
                        key={`${track.id}-${idx}`}
                        className="group flex items-center justify-between p-2 rounded-2xl glass-card border-white/5 hover:border-white/15 transition-all text-xs"
                      >
                        <div
                          className="flex items-center gap-2.5 truncate flex-1 cursor-pointer"
                          onClick={() => {
                            if (roomState.isHost || roomState.isDJ) {
                              playTrack(track, queue.filter((_, i) => i !== idx));
                            }
                          }}
                        >
                          <span className="text-zinc-500 w-4 text-center font-mono font-bold">{idx + 1}</span>
                          <img src={track.image} alt={track.title} className="w-8 h-8 rounded-lg object-cover" />
                          <div className="truncate">
                            <div className="flex items-center gap-1">
                              <p className="font-bold text-zinc-200 truncate group-hover:text-purple-300">
                                {track.title}
                              </p>
                              {trackIsYT && (
                                <Youtube className="w-3 h-3 text-red-400 fill-current shrink-0" />
                              )}
                            </div>
                            <p className="text-[10px] text-zinc-400 truncate">
                              {track.artist} {track.addedBy && `• added by ${track.addedBy}`}
                            </p>
                          </div>
                        </div>

                        {/* Right: Upvote button & Remove button */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => upvoteTrack(track.id)}
                            className="flex items-center gap-1 px-2 py-1 rounded-xl glass-button hover:bg-purple-600/30 text-zinc-300 hover:text-purple-300 border-white/10 transition-all text-[11px]"
                            title="Upvote song to move it up in queue"
                          >
                            <Flame className="w-3 h-3 text-pink-500" />
                            <span>{track.votes || 0}</span>
                          </button>

                          {(roomState.isHost || roomState.isDJ) && (
                            <button
                              onClick={() => removeFromQueue(idx)}
                              className="p-1 text-zinc-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Queue Footer */}
              {queue.length > 0 && (roomState.isHost || roomState.isDJ) && (
                <div className="pt-2 border-t border-white/10 flex justify-end">
                  <button
                    onClick={clearQueue}
                    className="text-[11px] text-zinc-500 hover:text-red-400 transition-colors flex items-center gap-1 font-semibold"
                  >
                    <Trash2 className="w-3 h-3" /> Clear Queue
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: PARTY CHAT */}
          {activeTab === 'chat' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4 space-y-2 text-xs">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex flex-col ${
                      m.isSystem ? 'items-center text-zinc-400 italic py-1 text-center' : 'items-start'
                    }`}
                  >
                    {!m.isSystem && (
                      <span className="text-[10px] font-bold text-purple-400">
                        {m.sender}
                      </span>
                    )}
                    <span
                      className={`${
                        m.isSystem
                          ? 'text-[11px] glass-panel-subtle px-3 py-1 rounded-full border border-white/10'
                          : 'glass-card border-white/10 text-zinc-100 px-3 py-1.5 rounded-2xl mt-0.5 max-w-[85%]'
                      }`}
                    >
                      {m.text}
                    </span>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              {/* Chat input */}
              <form onSubmit={handleSendChat} className="p-3 border-t border-white/10 bg-black/30 flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Drop a message to everyone in this room..."
                  className="flex-1 glass-input rounded-xl px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none"
                />
                <button
                  type="submit"
                  className="p-2.5 glass-button rounded-xl text-purple-300 hover:text-white hover:bg-purple-600/30 border border-white/10 hover:border-purple-500/30 transition-all shadow-md active:scale-95"
                  title="Send message"
                  aria-label="Send"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          )}
        </div>
      </main>

      {/* Direct YouTube Modal in Room */}
      <YouTubeModal
        isOpen={isYouTubeModalOpen}
        onClose={() => setIsYouTubeModalOpen(false)}
      />

      {/* Spotify Import Modal */}
      <SpotifyImportModal
        isOpen={isSpotifyModalOpen}
        onClose={() => setIsSpotifyModalOpen(false)}
      />

      {/* Scan QR Code Modal */}
      <QRCodeModal
        isOpen={isQRModalOpen}
        onClose={() => setIsQRModalOpen(false)}
        roomCode={roomState.roomCode}
      />
    </div>
  );
};
