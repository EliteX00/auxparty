import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Track, PlayMode } from '../types';

interface PlayerContextType {
  currentTrack: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  buffered: number;
  volume: number;
  isMuted: boolean;
  playMode: PlayMode;
  isShuffle: boolean;
  queue: Track[];
  history: Track[];
  analyserNode: AnalyserNode | null;
  isLoading: boolean;
  audioRef: React.RefObject<HTMLAudioElement>;
  playTrack: (track: Track, newQueue?: Track[]) => void;
  togglePlayPause: () => void;
  seekTo: (time: number) => void;
  setVolume: (val: number) => void;
  toggleMute: () => void;
  nextTrack: () => void;
  prevTrack: () => void;
  addToQueue: (track: Track) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  toggleShuffle: () => void;
  cyclePlayMode: () => void;
  syncFromHost: (
    track: Track | null,
    isPlaying: boolean,
    position: number,
    timestamp: number,
    queue?: Track[]
  ) => void;
  onStateChangeNotify?: (track: Track | null, isPlaying: boolean, pos: number, queue: Track[]) => void;
  setOnStateChangeNotify: (cb: (track: Track | null, isPlaying: boolean, pos: number, queue: Track[]) => void) => void;
}

const PlayerContext = createContext<PlayerContextType | null>(null);

export const PlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);

  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [buffered, setBuffered] = useState<number>(0);
  const [volume, setVolumeState] = useState<number>(0.8);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [playMode, setPlayMode] = useState<PlayMode>('repeat-all');
  const [isShuffle, setIsShuffle] = useState<boolean>(false);
  const [queue, setQueue] = useState<Track[]>([]);
  const [history, setHistory] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Callback to inform RoomSync when host performs an action
  const stateNotifierRef = useRef<((t: Track | null, playing: boolean, pos: number, q: Track[]) => void) | null>(null);

  const setOnStateChangeNotify = (cb: (t: Track | null, playing: boolean, pos: number, q: Track[]) => void) => {
    stateNotifierRef.current = cb;
  };

  const notifyHostStateChange = (t: Track | null, p: boolean, pos: number, q: Track[]) => {
    stateNotifierRef.current?.(t, p, pos, q);
  };

  // Initialize Audio element and Web Audio API Analyser
  useEffect(() => {
    const audio = new Audio();
    audio.crossOrigin = 'anonymous';
    audio.preload = 'auto';
    audio.volume = volume;
    audioRef.current = audio;

    const setupAudioGraph = () => {
      if (!audioContextRef.current) {
        try {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          const ctx = new AudioContextClass();
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 64;
          analyser.smoothingTimeConstant = 0.8;

          const source = ctx.createMediaElementSource(audio);
          source.connect(analyser);
          analyser.connect(ctx.destination);

          audioContextRef.current = ctx;
          analyserRef.current = analyser;
          sourceNodeRef.current = source;
        } catch (e) {
          console.warn('AudioContext setup skipped or restricted:', e);
        }
      } else if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      if (audio.buffered.length > 0) {
        setBuffered(audio.buffered.end(audio.buffered.length - 1));
      }
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration || 0);
      setIsLoading(false);
    };

    const handleWaiting = () => setIsLoading(true);
    const handleCanPlay = () => setIsLoading(false);
    const handlePlaying = () => {
      setIsPlaying(true);
      setIsLoading(false);
    };
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('waiting', handleWaiting);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('playing', handlePlaying);
    audio.addEventListener('pause', handlePause);

    // Click anywhere to wake AudioContext
    window.addEventListener('click', setupAudioGraph, { once: true });

    return () => {
      audio.pause();
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('waiting', handleWaiting);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('playing', handlePlaying);
      audio.removeEventListener('pause', handlePause);
      window.removeEventListener('click', setupAudioGraph);
    };
  }, []);

  // Handle Track End (auto play next or loop)
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleEnded = () => {
      if (playMode === 'repeat-one') {
        audio.currentTime = 0;
        audio.play().catch(() => {});
        return;
      }
      nextTrack();
    };

    audio.addEventListener('ended', handleEnded);
    return () => audio.removeEventListener('ended', handleEnded);
  }, [playMode, queue, currentTrack]);

  // MediaSession API Integration
  useEffect(() => {
    if ('mediaSession' in navigator && currentTrack) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.title,
        artist: currentTrack.artist,
        album: currentTrack.album,
        artwork: [
          { src: currentTrack.image, sizes: '500x500', type: 'image/jpeg' },
          { src: currentTrack.image, sizes: '150x150', type: 'image/jpeg' },
        ],
      });

      navigator.mediaSession.setActionHandler('play', () => togglePlayPause());
      navigator.mediaSession.setActionHandler('pause', () => togglePlayPause());
      navigator.mediaSession.setActionHandler('previoustrack', () => prevTrack());
      navigator.mediaSession.setActionHandler('nexttrack', () => nextTrack());
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined) seekTo(details.seekTime);
      });
    }
  }, [currentTrack]);

  // Play a specific track
  const playTrack = (track: Track, newQueue?: Track[]) => {
    if (!audioRef.current) return;
    const audio = audioRef.current;

    if (currentTrack) {
      setHistory((prev) => [currentTrack, ...prev.slice(0, 19)]);
    }

    setCurrentTrack(track);
    setIsLoading(true);

    if (newQueue) {
      setQueue(newQueue);
    }

    audio.src = track.streamUrl;
    audio.currentTime = 0;
    audio
      .play()
      .then(() => {
        setIsPlaying(true);
        notifyHostStateChange(track, true, 0, newQueue || queue);
      })
      .catch((e) => {
        console.error('Playback trigger error:', e);
        setIsLoading(false);
      });
  };

  // Toggle Play / Pause
  const togglePlayPause = () => {
    if (!audioRef.current || !currentTrack) return;
    const audio = audioRef.current;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      notifyHostStateChange(currentTrack, false, audio.currentTime, queue);
    } else {
      audio
        .play()
        .then(() => {
          setIsPlaying(true);
          notifyHostStateChange(currentTrack, true, audio.currentTime, queue);
        })
        .catch(console.error);
    }
  };

  // Seek
  const seekTo = (time: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = time;
    setCurrentTime(time);
    notifyHostStateChange(currentTrack, isPlaying, time, queue);
  };

  // Next Track
  const nextTrack = () => {
    if (queue.length === 0) {
      if (playMode === 'repeat-all' && history.length > 0) {
        // restart from first in history
        const first = history[history.length - 1];
        playTrack(first);
      }
      return;
    }

    let nextIndex = 0;
    if (isShuffle) {
      nextIndex = Math.floor(Math.random() * queue.length);
    }

    const next = queue[nextIndex];
    const newQueue = queue.filter((_, idx) => idx !== nextIndex);
    setQueue(newQueue);
    playTrack(next, newQueue);
  };

  // Prev Track
  const prevTrack = () => {
    if (!audioRef.current) return;
    // If > 3 seconds in, restart track
    if (audioRef.current.currentTime > 3) {
      seekTo(0);
      return;
    }

    if (history.length > 0) {
      const prev = history[0];
      setHistory((prevList) => prevList.slice(1));
      if (currentTrack) {
        setQueue((prevQ) => [currentTrack, ...prevQ]);
      }
      playTrack(prev);
    } else {
      seekTo(0);
    }
  };

  // Volume
  const setVolume = (val: number) => {
    const clamped = Math.max(0, Math.min(1, val));
    setVolumeState(clamped);
    if (audioRef.current) {
      audioRef.current.volume = clamped;
    }
    if (clamped > 0 && isMuted) {
      setIsMuted(false);
    }
  };

  // Mute
  const toggleMute = () => {
    if (!audioRef.current) return;
    if (isMuted) {
      audioRef.current.volume = volume;
      setIsMuted(false);
    } else {
      audioRef.current.volume = 0;
      setIsMuted(true);
    }
  };

  // Queue actions
  const addToQueue = (track: Track) => {
    setQueue((prev) => {
      const updated = [...prev, track];
      notifyHostStateChange(currentTrack, isPlaying, currentTime, updated);
      return updated;
    });
  };

  const removeFromQueue = (index: number) => {
    setQueue((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      notifyHostStateChange(currentTrack, isPlaying, currentTime, updated);
      return updated;
    });
  };

  const clearQueue = () => {
    setQueue([]);
    notifyHostStateChange(currentTrack, isPlaying, currentTime, []);
  };

  const toggleShuffle = () => setIsShuffle((prev) => !prev);

  const cyclePlayMode = () => {
    setPlayMode((prev) => {
      if (prev === 'none') return 'repeat-all';
      if (prev === 'repeat-all') return 'repeat-one';
      return 'none';
    });
  };

  // Sync from Room Host (as a guest)
  const syncFromHost = (
    track: Track | null,
    hostPlaying: boolean,
    position: number,
    timestamp: number,
    hostQueue?: Track[]
  ) => {
    if (!audioRef.current) return;
    const audio = audioRef.current;

    if (hostQueue !== undefined) {
      setQueue(hostQueue);
    }

    if (!track) {
      audio.pause();
      setIsPlaying(false);
      setCurrentTrack(null);
      return;
    }

    const latencySeconds = Math.max(0, (Date.now() - timestamp) / 1000);
    const targetTime = position + (hostPlaying ? latencySeconds : 0);

    const isDifferentTrack = !currentTrack || currentTrack.id !== track.id;

    if (isDifferentTrack) {
      setCurrentTrack(track);
      audio.src = track.streamUrl;
      audio.currentTime = targetTime;
      if (hostPlaying) {
        audio.play().catch(console.error);
        setIsPlaying(true);
      } else {
        audio.pause();
        setIsPlaying(false);
      }
    } else {
      // Same track: check drift
      const drift = Math.abs(audio.currentTime - targetTime);
      if (drift > 0.4) {
        audio.currentTime = targetTime;
      }
      if (hostPlaying && audio.paused) {
        audio.play().catch(console.error);
        setIsPlaying(true);
      } else if (!hostPlaying && !audio.paused) {
        audio.pause();
        setIsPlaying(false);
      }
    }
  };

  return (
    <PlayerContext.Provider
      value={{
        currentTrack,
        isPlaying,
        currentTime,
        duration,
        buffered,
        volume,
        isMuted,
        playMode,
        isShuffle,
        queue,
        history,
        analyserNode: analyserRef.current,
        isLoading,
        audioRef,
        playTrack,
        togglePlayPause,
        seekTo,
        setVolume,
        toggleMute,
        nextTrack,
        prevTrack,
        addToQueue,
        removeFromQueue,
        clearQueue,
        toggleShuffle,
        cyclePlayMode,
        syncFromHost,
        setOnStateChangeNotify,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
};

export const usePlayer = () => {
  const context = useContext(PlayerContext);
  if (!context) throw new Error('usePlayer must be used within PlayerProvider');
  return context;
};
