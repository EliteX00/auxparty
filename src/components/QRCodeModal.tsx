import React, { useState } from 'react';
import { X, Copy, Check, Smartphone, QrCode } from 'lucide-react';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomCode: string;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({ isOpen, onClose, roomCode }) => {
  const [copied, setCopied] = useState(false);
  if (!isOpen) return null;

  const roomUrl = `${window.location.origin}/room/${roomCode.toLowerCase()}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(
    roomUrl
  )}&bgcolor=18-18-27&color=a855f7&margin=10`;

  const handleCopy = () => {
    navigator.clipboard.writeText(roomUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center space-y-4">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon & Title */}
        <div className="w-12 h-12 rounded-2xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
          <Smartphone className="w-6 h-6" />
        </div>

        <div>
          <h3 className="text-lg font-black text-white">Scan to Join Room</h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Point your phone camera to stream in sync
          </p>
        </div>

        {/* QR Code Container */}
        <div className="p-3 bg-zinc-950 rounded-2xl border border-purple-500/30 shadow-inner flex items-center justify-center">
          <img
            src={qrUrl}
            alt={`QR Code for Room ${roomCode}`}
            className="w-56 h-56 rounded-xl object-contain"
            loading="eager"
          />
        </div>

        {/* Room Code Badge */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold tracking-wider text-purple-300 bg-purple-950/60 px-3 py-1 rounded-full border border-purple-500/30">
            #{roomCode.toUpperCase()}
          </span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors border border-zinc-700"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy Link'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
