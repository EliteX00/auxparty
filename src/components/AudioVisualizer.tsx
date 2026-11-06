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

    const render = () => {
      animationFrameRef.current = requestAnimationFrame(render);

      if (analyserNode && isPlaying) {
        analyserNode.getByteFrequencyData(dataArray);
      } else {
        // Fallback idle wave or zeroes
        for (let i = 0; i < dataArray.length; i++) {
          if (isPlaying) {
            dataArray[i] = Math.sin(Date.now() / 200 + i) * 20 + 30;
          } else {
            dataArray[i] = 4;
          }
        }
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const numBars = Math.floor(canvas.width / (barWidth + gap));
      const step = Math.max(1, Math.floor(dataArray.length / numBars));

      for (let i = 0; i < numBars; i++) {
        const val = dataArray[i * step] || 0;
        const percent = val / 255;
        const bHeight = Math.max(2, percent * canvas.height);
        const x = i * (barWidth + gap);
        const y = canvas.height - bHeight;

        // Gradient color for bars
        const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
        gradient.addColorStop(0, '#7c3aed'); // purple
        gradient.addColorStop(0.5, '#a855f7'); // lighter purple
        gradient.addColorStop(1, '#ec4899'); // pink accent

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, bHeight, [2, 2, 0, 0]);
        ctx.fill();
      }
    };

    render();

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
