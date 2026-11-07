import React, { useEffect, useState, useMemo } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { extractPalette, DEFAULT_PALETTE, TrackPalette } from '../utils/colorExtractor';

export const AmbientBackground: React.FC = () => {
  const { currentTrack, isPlaying } = usePlayer();
  const [palette, setPalette] = useState<TrackPalette>(DEFAULT_PALETTE);

  useEffect(() => {
    let isCancelled = false;

    if (currentTrack?.image) {
      extractPalette(currentTrack.image, `${currentTrack.title}-${currentTrack.artist}`).then(
        (extracted) => {
          if (!isCancelled) {
            setPalette(extracted);
          }
        }
      );
    } else {
      setPalette(DEFAULT_PALETTE);
    }

    return () => {
      isCancelled = true;
    };
  }, [currentTrack?.image, currentTrack?.title, currentTrack?.artist]);

  // Memoize static gradient background styles so React doesn't recreate strings/objects
  const meshStyle = useMemo(
    () => ({
      background: `
        radial-gradient(ellipse 50% 45% at 24% 28%, ${palette.primaryGlow} 0%, transparent 68%),
        radial-gradient(ellipse 48% 42% at 76% 72%, ${palette.secondaryGlow} 0%, transparent 64%)
      `,
      transform: 'translateZ(0)',
    }),
    [palette.primaryGlow, palette.secondaryGlow]
  );

  const flareStyle = useMemo(
    () => ({
      background: `radial-gradient(ellipse at center, ${palette.primary} 0%, ${palette.secondary} 45%, transparent 70%)`,
      transform: 'translate(-50%, -50%) translateZ(0)',
    }),
    [palette.primary, palette.secondary]
  );

  return (
    <div
      className="fixed inset-0 pointer-events-none -z-10 overflow-hidden select-none bg-[#0c0c12]"
      style={{ contain: 'strict' }}
      aria-hidden="true"
    >
      {/* 1. Deep Midnight Base Foundation */}
      <div className="absolute inset-0 bg-[#0c0c12]" />

      {/* 2. High-Contrast Duo-Tone Static Ambient Mesh (Hardware-accelerated, zero per-frame blur invalidation) */}
      <div
        className={`absolute inset-0 transition-opacity duration-1000 ease-out ${
          isPlaying ? 'opacity-90' : 'opacity-70'
        }`}
        style={meshStyle}
      />

      {/* 3. Central Ambient Flare Behind Now-Playing Stage */}
      <div
        className="absolute top-1/2 left-1/2 w-[600px] h-[500px] opacity-25 transition-all duration-1000 pointer-events-none"
        style={flareStyle}
      />

      {/* 4. Deep Vignette Border Mask to Preserve High Edge Contrast */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 75% 70% at 50% 50%, rgba(12, 12, 18, 0.1) 0%, rgba(12, 12, 18, 0.75) 75%, #0c0c12 100%)',
        }}
      />
    </div>
  );
};
