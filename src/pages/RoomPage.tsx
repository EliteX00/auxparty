import React, { useState, useEffect, useRef } from 'react';
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
} from 'lucide-react';
import { useRoom } from '../context/RoomContext';
import { usePlayer } from '../context/PlayerContext';
import { AudioVisualizer } from '../components/AudioVisualizer';
import { SpotifyImportModal } from '../components/SpotifyImportModal';
import { QRCodeModal } from '../components/QRCodeModal';
import { searchTracks } from '../services/api';
import { Track, SoundEffectType } from '../types';

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
    volume,
    isMuted,
    isLoading,
    togglePlayPause,
    seekTo,
    setVolume,
    toggleMute,
    nextTrack,
    prevTrack,
    queue,
    removeFromQueue,
    clearQueue,
    playTrack,
  } = usePlayer();

  const targetCode = (roomCode || '').toUpperCase();

  // Local State
  const [userNameInput, setUserNameInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'queue' | 'chat'>('queue');
  const [chatInput, setChatInput] = useState('');
  const [isSpotifyModalOpen, setIsSpotifyModalOpen] = useState(false);
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
  const emojis = ['🔥', '❤️', '⚡', '🎧', '🚀', '🎉'];
  const totalPeers = Math.max(1, roomState.peers.length);
  const skipThreshold = Math.ceil(totalPeers / 2);
  const hasVotedSkip = roomState.skipVotes.includes(roomState.userName);

  // NOT CONNECTED VIEW: Join Screen
  if (!roomState.connected || roomState.roomCode !== targetCode) {
    return (
      <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col justify-center items-center p-4 selection:bg-purple-600">
        <div className="absolute w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 w-full max-w-md bg-zinc-900/90 border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 backdrop-blur-xl">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-white transition-colors mb-2"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Discover
          </Link>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-purple-600/30">
              <Radio className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-white">Room #{targetCode}</h2>
                <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  320k Sync
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Join this synchronized party room to stream in 320kbps
              </p>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-red-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-zinc-400 mb-1.5 block">
                Your Nickname
              </label>
              <input
                type="text"
                value={userNameInput}
                onChange={(e) => setUserNameInput(e.target.value)}
                placeholder="e.g. Alex"
                autoFocus
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-purple-500 transition-all font-medium"
              />
            </div>

            <button
              type="submit"
              disabled={isConnecting}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm shadow-xl shadow-purple-600/40 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
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
            <span className="text-xs text-zinc-500 block mb-2">Want to start this room as the Host / DJ?</span>
            <button
              onClick={handleCreateThisRoom}
              disabled={isConnecting}
              className="text-xs font-semibold text-purple-400 hover:text-purple-300 underline underline-offset-4"
            >
              Start Room #{targetCode} as Host (DJ)
            </button>
          </div>
        </div>
      </div>
    );
  }

  // CONNECTED VIEW: The Full Upgraded Room Experience
  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col pb-24 selection:bg-purple-600 selection:text-white">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-30 w-full backdrop-blur-xl bg-zinc-950/85 border-b border-zinc-800/80 px-4 md:px-8 py-3 flex items-center justify-between gap-4">
        {/* Left: Brand & Room Tag */}
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
            title="Home"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>

          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
              <span className="font-extrabold text-base text-white tracking-wide">
                Room #{roomState.roomCode}
              </span>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                {roomState.isHost ? 'Host' : roomState.isDJ ? 'DJ' : 'Listener'}
              </span>
              {roomState.auxMode === 'open-aux' && (
                <span className="hidden sm:inline text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
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
        <div className="hidden lg:flex items-center gap-2 bg-zinc-900/60 px-4 py-1.5 rounded-full border border-zinc-800">
          <Users className="w-3.5 h-3.5 text-purple-400" />
          <span className="text-xs font-semibold text-zinc-400">
            {roomState.peers.length} Friends:
          </span>
          <div className="flex items-center gap-1.5">
            {roomState.peers.map((p) => (
              <span
                key={p.id}
                className="flex items-center gap-1 text-[11px] font-bold bg-zinc-800/90 px-2.5 py-0.5 rounded-full text-zinc-200 border border-zinc-700/80 shadow-sm"
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

        {/* Right Action Bar */}
        <div className="flex items-center gap-2">
          {/* Soundboard Triggers (Airhorn, Scratch, Bassdrop, Cheer) */}
          <div className="hidden sm:flex items-center gap-1 bg-zinc-900/80 p-1 rounded-full border border-zinc-800">
            <button
              onClick={() => triggerSound('airhorn')}
              className="px-2.5 py-1 text-xs hover:bg-zinc-800 rounded-full transition-all active:scale-90"
              title="Airhorn sound effect"
            >
              📢 Airhorn
            </button>
            <button
              onClick={() => triggerSound('scratch')}
              className="px-2.5 py-1 text-xs hover:bg-zinc-800 rounded-full transition-all active:scale-90"
              title="Vinyl scratch effect"
            >
              💽 Scratch
            </button>
            <button
              onClick={() => triggerSound('bassdrop')}
              className="px-2.5 py-1 text-xs hover:bg-zinc-800 rounded-full transition-all active:scale-90"
              title="Bass drop 808"
            >
              💣 Drop
            </button>
            <button
              onClick={() => triggerSound('cheer')}
              className="px-2.5 py-1 text-xs hover:bg-zinc-800 rounded-full transition-all active:scale-90"
              title="Applause / Cheer"
            >
              👏 Cheer
            </button>
          </div>

          {/* Pass the Aux (Host only controls) */}
          {roomState.isHost && (
            <div className="relative">
              <button
                onClick={() => setIsAuxMenuOpen(!isAuxMenuOpen)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition-all"
                title="Pass the Aux cord / DJ controls"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Pass Aux</span>
              </button>

              {isAuxMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-zinc-900 border border-zinc-800 rounded-2xl p-2 shadow-2xl z-50 space-y-1">
                  <div className="px-3 py-1.5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                    Aux Cord Mode
                  </div>
                  <button
                    onClick={() => {
                      setAuxMode('host-only');
                      setIsAuxMenuOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-between ${
                      roomState.auxMode === 'host-only'
                        ? 'bg-purple-600 text-white'
                        : 'text-zinc-300 hover:bg-zinc-800'
                    }`}
                  >
                    <span>Host Only (Strict DJ)</span>
                    {roomState.auxMode === 'host-only' && <Check className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => {
                      setAuxMode('open-aux');
                      setIsAuxMenuOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-between ${
                      roomState.auxMode === 'open-aux'
                        ? 'bg-purple-600 text-white'
                        : 'text-zinc-300 hover:bg-zinc-800'
                    }`}
                  >
                    <span>Open Aux (Anyone DJs)</span>
                    {roomState.auxMode === 'open-aux' && <Check className="w-3.5 h-3.5" />}
                  </button>

                  <div className="px-3 py-1.5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider pt-2 border-t border-zinc-800">
                    Pass Aux To Friend
                  </div>
                  {roomState.peers.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        transferAux(p.name);
                        setIsAuxMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-1.5 rounded-xl text-xs font-medium text-zinc-300 hover:bg-zinc-800 flex items-center justify-between"
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

          {/* QR Code Button */}
          <button
            onClick={() => setIsQRModalOpen(true)}
            className="p-2 rounded-full text-zinc-400 hover:text-white bg-zinc-900/80 border border-zinc-800 transition-colors"
            title="Scan QR Code to join on phone"
          >
            <QrCode className="w-4 h-4" />
          </button>

          {/* Share Link */}
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 transition-all"
            title="Copy shareable link"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{copied ? 'Copied' : 'Share'}</span>
          </button>

          {/* Queue Spotify */}
          <button
            onClick={() => setIsSpotifyModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-all"
            title="Import Spotify playlist to room"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span className="hidden sm:inline">Spotify</span>
          </button>

          {/* Exit */}
          <button
            onClick={handleExit}
            className="p-2 rounded-full text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            title="Leave room"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Room Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT / CENTER: The Main Stage (7 cols) */}
        <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
          {/* Main Stage Card */}
          <div className="relative overflow-hidden rounded-3xl bg-zinc-900/60 border border-zinc-800/80 p-6 sm:p-10 shadow-2xl backdrop-blur-xl flex flex-col items-center justify-center min-h-[480px]">
            {/* Ambient Dynamic Background Blur */}
            {currentTrack && (
              <div
                className="absolute inset-0 bg-cover bg-center blur-3xl opacity-25 scale-150 pointer-events-none transition-all duration-1000"
                style={{ backgroundImage: `url(${currentTrack.image})` }}
              ></div>
            )}

            {currentTrack ? (
              <div className="relative z-10 flex flex-col items-center text-center max-w-md w-full space-y-5">
                {/* Spinning Vinyl Record Container */}
                <div className="relative group flex items-center justify-center">
                  <div
                    className={`w-60 h-60 sm:w-68 sm:h-68 rounded-full bg-zinc-950 p-2 shadow-2xl border-4 border-zinc-800/80 flex items-center justify-center ${
                      isPlaying ? 'animate-[spin_12s_linear_infinite]' : ''
                    }`}
                  >
                    {/* Vinyl Grooves */}
                    <div className="w-full h-full rounded-full border border-zinc-800 flex items-center justify-center p-3 relative overflow-hidden">
                      <div className="absolute inset-0 rounded-full border border-zinc-800/60 scale-90"></div>
                      <div className="absolute inset-0 rounded-full border border-zinc-800/40 scale-75"></div>

                      {/* Center Album Art */}
                      <img
                        src={currentTrack.image}
                        alt={currentTrack.title}
                        className="w-32 h-32 sm:w-36 sm:h-36 rounded-full object-cover shadow-2xl border-2 border-white/20"
                      />
                      {/* Spindle hole */}
                      <div className="absolute w-5 h-5 rounded-full bg-zinc-950 border-2 border-zinc-700"></div>
                    </div>
                  </div>

                  {isPlaying && (
                    <div className="absolute -inset-4 bg-purple-500/20 rounded-full blur-2xl -z-10 animate-pulse"></div>
                  )}
                </div>

                {/* Real-time Spectrum visualizer */}
                <div className="w-full flex justify-center">
                  <AudioVisualizer height={32} barWidth={3} gap={2} className="w-60 opacity-90" />
                </div>

                {/* Track Details */}
                <div>
                  <div className="flex items-center justify-center gap-2">
                    <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight truncate">
                      {currentTrack.title}
                    </h2>
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 uppercase shrink-0">
                      320k
                    </span>
                  </div>
                  <p className="text-sm text-zinc-400 font-medium truncate mt-1">
                    {currentTrack.artist}
                  </p>
                </div>

                {/* Scrubber & Timers */}
                <div className="w-full space-y-1">
                  <div className="relative group py-1 cursor-pointer">
                    <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all"
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
                  <div className="flex justify-between text-[11px] font-mono text-zinc-400">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>

                {/* Controls & Democratic Vote Skip */}
                <div className="flex items-center justify-center gap-4 pt-1 w-full">
                  {/* Vote to Skip Button */}
                  <button
                    onClick={voteSkip}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                      hasVotedSkip
                        ? 'bg-purple-600/30 text-purple-300 border-purple-500/50'
                        : 'bg-zinc-800/80 text-zinc-400 hover:text-white border-zinc-700/60'
                    }`}
                    title="Vote to skip current track"
                  >
                    <span>Vote Skip</span>
                    <span className="text-[10px] bg-black/40 px-1.5 py-0.2 rounded-full font-mono">
                      {roomState.skipVotes.length}/{skipThreshold}
                    </span>
                  </button>

                  {/* DJ Playback Buttons (Host or active DJ or open aux) */}
                  {(roomState.isHost || roomState.isDJ) ? (
                    <div className="flex items-center gap-4">
                      <button
                        onClick={prevTrack}
                        className="p-2 text-zinc-400 hover:text-white transition-colors active:scale-95"
                      >
                        <SkipBack className="w-5 h-5 fill-current" />
                      </button>
                      <button
                        onClick={togglePlayPause}
                        disabled={isLoading}
                        className="w-13 h-13 rounded-full bg-gradient-to-tr from-purple-600 to-pink-500 text-white flex items-center justify-center shadow-xl shadow-purple-600/40 hover:scale-105 active:scale-95 transition-all"
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
                        className="p-2 text-zinc-400 hover:text-white transition-colors active:scale-95"
                      >
                        <SkipForward className="w-5 h-5 fill-current" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-xs text-purple-300 font-semibold bg-purple-950/40 px-3 py-1.5 rounded-full border border-purple-500/30">
                      <Radio className="w-3.5 h-3.5 animate-pulse text-purple-400" />
                      <span>DJ: {roomState.activeDjName}</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="relative z-10 text-center space-y-3 py-16">
                <Music className="w-12 h-12 text-purple-400/40 mx-auto" />
                <h3 className="text-lg font-bold text-zinc-200">No Song Playing Right Now</h3>
                <p className="text-xs text-zinc-500 max-w-xs mx-auto">
                  {roomState.isHost || roomState.isDJ
                    ? 'Search for any song or import a Spotify playlist below to drop the first beat!'
                    : 'Waiting for the DJ to queue a track...'}
                </p>
              </div>
            )}
          </div>

          {/* Live Floating Reaction Buttons Dock */}
          <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider hidden sm:block">
              Send Live Reaction:
            </span>
            <div className="flex items-center gap-2 flex-1 justify-around">
              {emojis.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => sendReaction(emoji)}
                  className="flex-1 py-2 rounded-xl bg-zinc-800/60 hover:bg-zinc-700/80 text-2xl hover:scale-125 active:scale-95 transition-all flex items-center justify-center border border-zinc-700/40"
                  title={`React ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT: Shared Democratic Queue & Live Party Chat (5 cols) */}
        <div className="lg:col-span-5 flex flex-col bg-zinc-900/60 border border-zinc-800/80 rounded-3xl overflow-hidden shadow-2xl h-[560px] lg:h-auto">
          {/* Tab Switcher */}
          <div className="flex border-b border-zinc-800/80 p-2 bg-zinc-950/40">
            <button
              onClick={() => setActiveTab('queue')}
              className={`flex-1 py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all ${
                activeTab === 'queue'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <ListMusic className="w-4 h-4" />
              Shared Queue ({queue.length})
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex-1 py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all ${
                activeTab === 'chat'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              Party Chat ({messages.length})
            </button>
          </div>

          {/* TAB 1: SHARED QUEUE */}
          {activeTab === 'queue' && (
            <div className="flex-1 flex flex-col p-4 overflow-hidden space-y-3">
              {/* Quick Search inside room to queue */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                <input
                  type="text"
                  value={roomSearchQuery}
                  onChange={(e) => setRoomSearchQuery(e.target.value)}
                  placeholder="Add any song to the shared queue..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-purple-500 transition-all font-medium"
                />
                {isRoomSearching && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin text-purple-400" />
                )}
              </div>

              {/* Search dropdown results */}
              {roomSearchResults.length > 0 && (
                <div className="max-h-48 overflow-y-auto bg-zinc-950 border border-purple-500/30 rounded-xl p-1.5 space-y-1 shadow-xl">
                  {roomSearchResults.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => {
                        addToRoomQueue(t);
                        setRoomSearchQuery('');
                        setRoomSearchResults([]);
                      }}
                      className="flex items-center justify-between p-1.5 rounded-lg hover:bg-zinc-800/80 cursor-pointer transition-colors text-xs"
                    >
                      <div className="flex items-center gap-2 truncate flex-1">
                        <img src={t.image} alt={t.title} className="w-7 h-7 rounded object-cover" />
                        <div className="truncate">
                          <p className="font-semibold text-zinc-200 truncate">{t.title}</p>
                          <p className="text-[10px] text-zinc-400 truncate">{t.artist}</p>
                        </div>
                      </div>
                      <button className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded bg-purple-600/30 text-purple-300 border border-purple-500/30 hover:bg-purple-600 hover:text-white transition-all">
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
                    <p className="text-xs">The room queue is empty.</p>
                    <p className="text-[11px] text-zinc-600">
                      Search above or import Spotify to queue songs for everyone!
                    </p>
                  </div>
                ) : (
                  queue.map((track, idx) => (
                    <div
                      key={`${track.id}-${idx}`}
                      className="group flex items-center justify-between p-2 rounded-xl bg-zinc-950/60 hover:bg-zinc-800/60 border border-zinc-800/40 transition-all text-xs"
                    >
                      <div
                        className="flex items-center gap-2.5 truncate flex-1 cursor-pointer"
                        onClick={() => {
                          if (roomState.isHost || roomState.isDJ) {
                            playTrack(track, queue.filter((_, i) => i !== idx));
                          }
                        }}
                      >
                        <span className="text-zinc-500 w-4 text-center font-mono">{idx + 1}</span>
                        <img src={track.image} alt={track.title} className="w-8 h-8 rounded object-cover" />
                        <div className="truncate">
                          <p className="font-semibold text-zinc-200 truncate group-hover:text-purple-400">
                            {track.title}
                          </p>
                          <p className="text-[10px] text-zinc-500 truncate">
                            {track.artist} {track.addedBy && `• added by ${track.addedBy}`}
                          </p>
                        </div>
                      </div>

                      {/* Right: Upvote button & Remove button */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => upvoteTrack(track.id)}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-zinc-800 hover:bg-purple-600/30 text-zinc-300 hover:text-purple-300 border border-zinc-700/60 transition-all text-[11px]"
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
                  ))
                )}
              </div>

              {/* Queue Footer */}
              {queue.length > 0 && (roomState.isHost || roomState.isDJ) && (
                <div className="pt-2 border-t border-zinc-800 flex justify-end">
                  <button
                    onClick={clearQueue}
                    className="text-[11px] text-zinc-500 hover:text-red-400 transition-colors flex items-center gap-1"
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
                      m.isSystem ? 'items-center text-zinc-500 italic py-1 text-center' : 'items-start'
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
                          ? 'text-[11px] bg-zinc-950/60 px-3 py-1 rounded-full border border-zinc-800'
                          : 'bg-zinc-950 border border-zinc-800 text-zinc-200 px-3 py-1.5 rounded-xl mt-0.5 max-w-[85%]'
                      }`}
                    >
                      {m.text}
                    </span>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              {/* Chat input */}
              <form onSubmit={handleSendChat} className="p-3 border-t border-zinc-800 bg-zinc-950 flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Chat with everyone in this room..."
                  className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-purple-500"
                />
                <button
                  type="submit"
                  className="p-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          )}
        </div>
      </main>

      {/* Spotify Import Modal wired to Room */}
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
