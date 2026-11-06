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
    leaveRoom,
    sendMessage,
    sendReaction,
    clearError,
  } = useRoom();

  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');
  const [hostNameInput, setHostNameInput] = useState('');
  const [guestNameInput, setGuestNameInput] = useState('');
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

  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomState.roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-zinc-100">
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
            className="p-2 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        {roomState.connected ? (
          /* Active Room State */
          <div className="p-6 flex flex-col flex-1 overflow-hidden space-y-4">
            {/* Room Code Card */}
            <div className="p-4 rounded-2xl bg-zinc-950 border border-purple-500/30 flex items-center justify-between shadow-lg">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-purple-400 block">
                  Room Invite Code
                </span>
                <span className="text-2xl font-black font-mono tracking-widest text-white">
                  {roomState.roomCode}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCopyLink}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 text-xs font-semibold transition-all"
                  title="Copy shareable link"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy Link'}</span>
                </button>
                <button
                  onClick={handleGoToRoom}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-md shadow-purple-600/30"
                >
                  <span>Open Room Page</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Connected Peers */}
            <div>
              <div className="flex items-center justify-between text-xs text-zinc-400 mb-2 font-medium">
                <span className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-purple-400" />
                  Party Members ({roomState.peers.length})
                </span>
                <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                  P2P In-Sync
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {roomState.peers.map((peer) => (
                  <div
                    key={peer.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-800/80 border border-zinc-700/60 text-xs text-zinc-200"
                  >
                    {peer.isHost && <Crown className="w-3.5 h-3.5 text-amber-400" />}
                    <span className="font-medium">{peer.name}</span>
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
              <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block mb-1.5">
                Send Live Reaction:
              </span>
              <div className="flex gap-2">
                {emojis.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => sendReaction(emoji)}
                    className="flex-1 py-2 rounded-xl bg-zinc-800/60 hover:bg-zinc-700/80 text-xl hover:scale-110 active:scale-95 transition-all flex items-center justify-center border border-zinc-700/40"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Room Chat */}
            <div className="flex-1 flex flex-col min-h-[140px] max-h-[200px] bg-zinc-950 rounded-2xl border border-zinc-800/80 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-3 space-y-2 text-xs">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex flex-col ${
                      m.isSystem ? 'items-center text-zinc-500 italic py-1' : 'items-start'
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
                          : 'bg-zinc-900 border border-zinc-800 text-zinc-200 px-2.5 py-1.5 rounded-lg mt-0.5 max-w-[85%]'
                      }`}
                    >
                      {m.text}
                    </span>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input */}
              <form onSubmit={handleSendChat} className="p-2 border-t border-zinc-800 flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Drop a message to everyone..."
                  className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-purple-500"
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
                className="text-xs text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1"
              >
                Go to Dedicated Room Page →
              </button>
              <button
                onClick={() => {
                  leaveRoom();
                  onClose();
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-red-400 hover:bg-red-500/10 border border-red-500/20 transition-all"
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
            <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-800">
              <button
                onClick={() => setActiveTab('create')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                  activeTab === 'create'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Create Room
              </button>
              <button
                onClick={() => setActiveTab('join')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
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
              <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-red-950/40 border border-red-500/30 text-red-400 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Tab: Host */}
            {activeTab === 'create' && (
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-zinc-400 mb-1.5 block">
                    Your DJ / Host Name
                  </label>
                  <input
                    type="text"
                    value={hostNameInput}
                    onChange={(e) => setHostNameInput(e.target.value)}
                    placeholder="e.g. Alex (DJ)"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-purple-500 transition-all"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-400 mb-1.5 block">
                    Custom Room Code (Optional, e.g. <span className="text-purple-400 font-mono">fg2f</span>)
                  </label>
                  <input
                    type="text"
                    value={customRoomCode}
                    onChange={(e) => setCustomRoomCode(e.target.value.toUpperCase())}
                    maxLength={8}
                    placeholder="Leave empty for random code"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-xs font-mono text-purple-300 placeholder-zinc-700 focus:outline-none focus:border-purple-500 transition-all uppercase"
                  />
                </div>

                <div className="p-3.5 rounded-xl bg-purple-950/30 border border-purple-500/20 text-xs text-purple-300 leading-relaxed">
                  🎧 <strong>Dedicated Room:</strong> You will get a dedicated URL like <code className="bg-purple-900/60 px-1 py-0.5 rounded text-white">/room/fg2f</code> to share with your friends. You can queue songs, import Spotify playlists, and chat live.
                </div>

                <button
                  type="submit"
                  disabled={isConnecting}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-purple-600/30 active:scale-98 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
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
              </form>
            )}

            {/* Tab: Join */}
            {activeTab === 'join' && (
              <form onSubmit={handleJoin} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-zinc-400 mb-1.5 block">
                    Room Code (e.g. <span className="text-purple-400 font-mono">FG2F</span>)
                  </label>
                  <input
                    type="text"
                    value={roomCodeInput}
                    onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                    maxLength={8}
                    placeholder="e.g. FG2F"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-lg font-mono font-bold tracking-widest text-center text-purple-300 placeholder-zinc-700 focus:outline-none focus:border-purple-500 transition-all uppercase"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-400 mb-1.5 block">
                    Your Nickname
                  </label>
                  <input
                    type="text"
                    value={guestNameInput}
                    onChange={(e) => setGuestNameInput(e.target.value)}
                    placeholder="e.g. Sam"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-purple-500 transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isConnecting || !roomCodeInput.trim()}
                  className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm shadow-lg shadow-purple-600/30 active:scale-98 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
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
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
