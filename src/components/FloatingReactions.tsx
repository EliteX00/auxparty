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
          <span className="text-4xl select-none">
            {r.emoji}
          </span>
          <span className="text-[10px] font-bold text-zinc-200 bg-zinc-950/80 border border-white/10 px-1.5 py-0.5 rounded-full shadow-md mt-1">
            {r.sender}
          </span>
        </div>
      ))}
    </div>
  );
};
