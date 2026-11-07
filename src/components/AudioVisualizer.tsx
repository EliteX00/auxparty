import React, { useEffect, useRef } from 'react';
import { usePlayer } from '../context/PlayerContext';

interface VisualizerProps {
  height?: number;
  barColor?: string;
  barWidth?: number;
  gap?: number;
  className?: string;
}

export const AudioVisualizer: React.FC<VisualizerProps> = ({
  height = 36,
  barWidth = 3,
  gap = 2,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { analyserNode, isPlaying } = usePlayer();
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyserNode ? analyserNode.frequencyBinCount : 32;
    const dataArray = new Uint8Array(bufferLength);

    // Create gradient once per canvas dimensions (never allocate in the loop!)
    const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
    gradient.addColorStop(0, '#7c3aed');
    gradient.addColorStop(0.5, '#a855f7');
    gradient.addColorStop(1, '#ec4899');

    const drawIdle = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const numBars = Math.floor(canvas.width / (barWidth + gap));
      ctx.fillStyle = 'rgba(168, 85, 247, 0.25)';
      for (let i = 0; i < numBars; i++) {
        const x = i * (barWidth + gap);
        const bHeight = 3;
        const y = canvas.height - bHeight;
        ctx.fillRect(x, y, barWidth, bHeight);
      }
    };

    // When paused, draw idle once and DO NOT run requestAnimationFrame loop!
    if (!isPlaying) {
      drawIdle();
      return;
    }

    let lastFrameTime = 0;
    const render = (time: number) => {
      animationFrameRef.current = requestAnimationFrame(render);

      // Throttle canvas draw calls to ~35-40 fps to leave GPU free for UI
      if (time - lastFrameTime < 24) return;
      lastFrameTime = time;

      if (analyserNode) {
        analyserNode.getByteFrequencyData(dataArray);
      } else {
        const now = Date.now() / 200;
        for (let i = 0; i < dataArray.length; i++) {
          dataArray[i] = Math.sin(now + i) * 20 + 30;
        }
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const numBars = Math.floor(canvas.width / (barWidth + gap));
      const step = Math.max(1, Math.floor(dataArray.length / numBars));
      ctx.fillStyle = gradient;

      for (let i = 0; i < numBars; i++) {
        const val = dataArray[i * step] || 0;
        const percent = val / 255;
        const bHeight = Math.max(2, percent * canvas.height);
        const x = i * (barWidth + gap);
        const y = canvas.height - bHeight;

        ctx.fillRect(x, y, barWidth, bHeight);
      }
    };

    animationFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [analyserNode, isPlaying, barWidth, gap]);

  return (
    <canvas
      ref={canvasRef}
      width={120}
      height={height}
      className={`rounded ${className}`}
    />
  );
};
