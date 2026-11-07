import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  Radio,
  Users,
  Copy,
  Check,
  Send,
  Sparkles,
  Flame,
  Heart,
  Zap,
  Headphones,
  PartyPopper,
  Crown,
  LogOut,
  Loader2,
  AlertCircle,
  Share2,
  ExternalLink,
} from 'lucide-react';
import { useRoom } from '../context/RoomContext';

interface RoomModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RoomModal: React.FC<RoomModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const {
    roomState,
    messages,
    error,
    isConnecting,
    createRoom,
    joinRoom,
    cancelConnecting,
    leaveRoom,
    sendMessage,
    sendReaction,
    clearError,
  } = useRoom();

  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');
  const [hostNameInput, setHostNameInput] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('auxparty_nickname') || '';
    return '';
  });
  const [guestNameInput, setGuestNameInput] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('auxparty_nickname') || '';
    return '';
  });
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [customRoomCode, setCustomRoomCode] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [copied, setCopied] = useState(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!isOpen) return null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    const code = await createRoom(hostNameInput.trim() || 'DJ Host', customRoomCode.trim() || undefined);
    if (code) {
      onClose();
      navigate(`/room/${code.toLowerCase()}`);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomCodeInput.trim()) return;
    clearError();
    const clean = roomCodeInput.trim().toUpperCase();
    const success = await joinRoom(clean, guestNameInput.trim() || 'Friend');
    if (success) {
      onClose();
      navigate(`/room/${clean.toLowerCase()}`);
    }
  };

  const handleCopyLink = () => {
    const inviteUrl = `${window.location.origin}/room/${roomState.roomCode.toLowerCase()}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGoToRoom = () => {
    onClose();
    navigate(`/room/${roomState.roomCode.toLowerCase()}`);
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    sendMessage(chatInput);
    setChatInput('');
  };

  const emojis = ['🔥', '❤️', '⚡', '🎧', '🚀', '🎉'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xl animate-fade-in">
      <div className="relative w-full max-w-lg glass-panel rounded-3xl overflow-hidden flex flex-col max-h-[90vh] shadow-2xl border border-white/10">
        {/* Glow Header Accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-indigo-500 to-pink-500" />

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400 shadow-lg shadow-purple-600/20">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-lg font-black text-zinc-100">
                {roomState.connected ? `Aux Room: #${roomState.roomCode}` : 'Listen With Friends'}
              </h3>
              <p className="text-xs text-zinc-400">
                {roomState.connected
                  ? 'Real-time synchronized audio across all devices'
                  : 'Start or join a synchronized music party'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-zinc-400 hover:text-white glass-button transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        {roomState.connected ? (
          /* Active Room State */
          <div className="p-6 flex flex-col flex-1 overflow-hidden space-y-4">
            {/* Room Code Card */}
            <div className="p-4 rounded-2xl glass-card border border-purple-500/30 flex items-center justify-between shadow-lg">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-purple-300 block">
                  Room Invite Code
                </span>
                <span className="text-2xl font-black font-mono tracking-widest text-white">
                  {roomState.roomCode}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCopyLink}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl glass-button text-purple-300 text-xs font-bold"
                  title="Copy shareable link"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy Link'}</span>
                </button>
                <button
                  onClick={handleGoToRoom}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-md shadow-purple-600/30"
                >
                  <span>Open Room</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Connected Peers */}
            <div>
              <div className="flex items-center justify-between text-xs text-zinc-300 mb-2 font-semibold">
                <span className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-purple-400" />
                  Party Members ({roomState.peers.length})
                </span>
                <span className="text-[11px] text-emerald-400 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                  P2P In-Sync
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {roomState.peers.map((peer) => (
                  <div
                    key={peer.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full glass-button text-xs text-zinc-200 border-white/10"
                  >
                    {peer.isHost && <Crown className="w-3.5 h-3.5 text-amber-400" />}
                    <span className="font-semibold">{peer.name}</span>
                    {peer.id === 'host' && (
                      <span className="text-[9px] uppercase px-1 rounded bg-amber-500/20 text-amber-300 font-bold">
                        DJ Host
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Floating Reaction Bar */}
            <div className="pt-2">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">
                Send Live Reaction:
              </span>
              <div className="flex gap-2">
                {emojis.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => sendReaction(emoji)}
                    className="flex-1 py-2 rounded-xl glass-button text-xl hover:scale-110 active:scale-95 transition-all flex items-center justify-center"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Room Chat */}
            <div className="flex-1 flex flex-col min-h-[140px] max-h-[200px] glass-panel-subtle rounded-2xl border border-white/10 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-3 space-y-2 text-xs">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex flex-col ${
                      m.isSystem ? 'items-center text-zinc-400 italic py-1' : 'items-start'
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
                          ? 'text-[11px]'
                          : 'glass-card border-white/10 text-zinc-200 px-2.5 py-1.5 rounded-xl mt-0.5 max-w-[85%]'
                      }`}
                    >
                      {m.text}
                    </span>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input */}
              <form onSubmit={handleSendChat} className="p-2 border-t border-white/10 flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Drop a message to everyone..."
                  className="flex-1 glass-input rounded-xl px-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none"
                />
                <button
                  type="submit"
                  className="p-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>

            {/* Leave Room Button */}
            <div className="pt-2 flex justify-between items-center">
              <button
                onClick={handleGoToRoom}
                className="text-xs text-purple-400 hover:text-purple-300 font-bold flex items-center gap-1"
              >
                Go to Dedicated Room Page →
              </button>
              <button
                onClick={() => {
                  leaveRoom();
                  onClose();
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-red-400 hover:bg-red-500/10 border border-red-500/20 transition-all"
              >
                <LogOut className="w-3.5 h-3.5" />
                Leave Room
              </button>
            </div>
          </div>
        ) : (
          /* Join / Host State */
          <div className="p-6 space-y-5">
            {/* Tabs */}
            <div className="flex glass-panel-subtle p-1 rounded-2xl border border-white/10">
              <button
                onClick={() => setActiveTab('create')}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                  activeTab === 'create'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Create Room
              </button>
              <button
                onClick={() => setActiveTab('join')}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                  activeTab === 'join'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Join with Code
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Tab: Host */}
            {activeTab === 'create' && (
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-zinc-300 mb-1.5 block uppercase tracking-wider">
                    Your DJ / Host Name
                  </label>
                  <input
                    type="text"
                    value={hostNameInput}
                    onChange={(e) => setHostNameInput(e.target.value)}
                    placeholder="e.g. Alex (DJ)"
                    className="w-full glass-input rounded-xl px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none transition-all font-medium"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-zinc-300 mb-1.5 block uppercase tracking-wider">
                    Custom Room Code (Optional, e.g. <span className="text-purple-400 font-mono">fg2f</span>)
                  </label>
                  <input
                    type="text"
                    value={customRoomCode}
                    onChange={(e) => setCustomRoomCode(e.target.value.toUpperCase())}
                    maxLength={8}
                    placeholder="Leave empty for random code"
                    className="w-full glass-input rounded-xl px-4 py-2 text-xs font-mono text-purple-300 placeholder-zinc-600 focus:outline-none transition-all uppercase font-bold"
                  />
                </div>

                <div className="p-3.5 rounded-2xl glass-card border-purple-500/20 text-xs text-purple-200 leading-relaxed font-medium">
                  🎧 <strong>Dedicated Room:</strong> You will get a dedicated URL like <code className="bg-purple-900/60 px-1 py-0.5 rounded text-white">/room/fg2f</code> to share with your friends. You can queue songs, drop YouTube links, import Spotify playlists, and chat live.
                </div>

                <button
                  type="submit"
                  disabled={isConnecting}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-sm shadow-xl shadow-purple-600/40 active:scale-98 transition-all flex items-center justify-center gap-2 disabled:opacity-50 border border-white/20"
                >
                  {isConnecting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating Room...
                    </>
                  ) : (
                    <>
                      <Radio className="w-4 h-4" />
                      Start Room & Open Dashboard
                    </>
                  )}
                </button>

                {isConnecting && (
                  <button
                    type="button"
                    onClick={cancelConnecting}
                    className="w-full py-1 text-xs text-zinc-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                )}
              </form>
            )}

            {/* Tab: Join */}
            {activeTab === 'join' && (
              <form onSubmit={handleJoin} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-zinc-300 mb-1.5 block uppercase tracking-wider">
                    Room Code (e.g. <span className="text-purple-400 font-mono">FG2F</span>)
                  </label>
                  <input
                    type="text"
                    value={roomCodeInput}
                    onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                    maxLength={8}
                    placeholder="e.g. FG2F"
                    className="w-full glass-input rounded-xl px-4 py-2.5 text-lg font-mono font-black tracking-widest text-center text-purple-300 placeholder-zinc-600 focus:outline-none transition-all uppercase"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-zinc-300 mb-1.5 block uppercase tracking-wider">
                    Your Nickname
                  </label>
                  <input
                    type="text"
                    value={guestNameInput}
                    onChange={(e) => setGuestNameInput(e.target.value)}
                    placeholder="e.g. Sam"
                    className="w-full glass-input rounded-xl px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none transition-all font-medium"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isConnecting || !roomCodeInput.trim()}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm shadow-xl shadow-purple-600/40 active:scale-98 transition-all flex items-center justify-center gap-2 disabled:opacity-50 border border-white/20"
                >
                  {isConnecting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Connecting to Room...
                    </>
                  ) : (
                    <>
                      <Headphones className="w-4 h-4" />
                      Join Room & Sync
                    </>
                  )}
                </button>

                {isConnecting && (
                  <button
                    type="button"
                    onClick={cancelConnecting}
                    className="w-full py-1 text-xs text-zinc-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                )}
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
