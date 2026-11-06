import React from 'react';
import { useRoom } from '../context/RoomContext';

export const FloatingReactions: React.FC = () => {
  const { reactions } = useRoom();

  if (reactions.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {reactions.map((r) => (
        <div
          key={r.id}
          className="absolute bottom-24 flex flex-col items-center animate-reaction"
          style={{
            left: `${r.x}%`,
          }}
        >
          <span className="text-4xl drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)] filter">
            {r.emoji}
          </span>
          <span className="text-[10px] font-bold text-zinc-300 bg-black/60 px-1.5 py-0.5 rounded-full backdrop-blur-sm mt-1">
            {r.sender}
          </span>
        </div>
      ))}
    </div>
  );
};
