import React, { useState } from 'react';
import { X, Sparkles, Music, Loader2, Play, Plus, CheckCircle2, AlertCircle } from 'lucide-react';
import { fetchSpotifyPlaylist, matchSpotifyTrack } from '../services/api';
import { Track, SpotifyTrack } from '../types';
import { usePlayer } from '../context/PlayerContext';

interface SpotifyImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SpotifyImportModal: React.FC<SpotifyImportModalProps> = ({ isOpen, onClose }) => {
  const { playTrack, addToQueue } = usePlayer();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [matchingProgress, setMatchingProgress] = useState<{ current: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importedPlaylist, setImportedPlaylist] = useState<{
    name: string;
    cover: string;
    tracks: SpotifyTrack[];
  } | null>(null);
  const [resolvedTracks, setResolvedTracks] = useState<Track[]>([]);

  if (!isOpen) return null;

  const handleFetch = async (targetUrl?: string) => {
    const inputUrl = targetUrl || url;
    if (!inputUrl.trim()) return;

    setLoading(true);
    setError(null);
    setImportedPlaylist(null);
    setResolvedTracks([]);
    setMatchingProgress(null);

    try {
      const data = await fetchSpotifyPlaylist(inputUrl);
      if (!data || !data.tracks || data.tracks.length === 0) {
        throw new Error('No tracks found in this playlist');
      }

      setImportedPlaylist({
        name: data.name,
        cover: data.cover,
        tracks: data.tracks,
      });

      // Match tracks to 320kbps streams (batch match initial 20)
      const toMatch = data.tracks.slice(0, 20);
      setMatchingProgress({ current: 0, total: toMatch.length });

      const resolved: Track[] = [];
      for (let i = 0; i < toMatch.length; i++) {
        const item = toMatch[i];
        const match = await matchSpotifyTrack(item.title, item.artist);
        if (match) {
          resolved.push(match);
        }
        setMatchingProgress({ current: i + 1, total: toMatch.length });
      }

      setResolvedTracks(resolved);
    } catch (err: any) {
      setError(err.message || 'Failed to import Spotify playlist');
    } finally {
      setLoading(false);
    }
  };

  const handlePlayAll = () => {
    if (resolvedTracks.length > 0) {
      playTrack(resolvedTracks[0], resolvedTracks.slice(1));
      onClose();
    }
  };

  const handleQueueAll = () => {
    resolvedTracks.forEach((t) => addToQueue(t));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xl animate-fade-in">
      <div className="relative w-full max-w-xl glass-panel rounded-3xl overflow-hidden flex flex-col max-h-[90vh] shadow-2xl border border-white/10">
        {/* Glow Header Accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/20">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-lg font-black text-zinc-100">Import Spotify Playlist</h3>
              <p className="text-xs text-zinc-400">
                Converts Spotify playlists to 320kbps lossless streams
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

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Input field */}
          <div>
            <label className="text-xs font-bold text-zinc-300 mb-1.5 block uppercase tracking-wider">
              Spotify Playlist Link
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M"
                className="flex-1 glass-input rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none transition-all font-mono"
              />
              <button
                onClick={() => handleFetch()}
                disabled={loading || !url.trim()}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-black font-extrabold text-sm hover:from-emerald-400 hover:to-teal-400 active:scale-95 disabled:opacity-50 transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/30"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Fetch'}
              </button>
            </div>
          </div>

          {/* Quick presets */}
          <div>
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-2">
              Quick Test Presets:
            </span>
            <div className="flex flex-wrap gap-2">
              {[
                { name: "Today's Top Hits", url: 'https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M' },
                { name: 'RapCaviar', url: 'https://open.spotify.com/playlist/37i9dQZF1DX0XUsuxWHRQd' },
                { name: 'All Out 2010s', url: 'https://open.spotify.com/playlist/37i9dQZF1DX5Ejj0EkURtP' },
              ].map((p) => (
                <button
                  key={p.name}
                  onClick={() => {
                    setUrl(p.url);
                    handleFetch(p.url);
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold glass-button text-zinc-300 hover:text-white transition-all"
                >
                  ⚡ {p.name}
                </button>
              ))}
            </div>
          </div>

          {/* Error notice */}
          {error && (
            <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Matching Progress Indicator */}
          {matchingProgress && (
            <div className="p-4 rounded-2xl glass-card border-emerald-500/30 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-300">
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                  Matching to high-quality audio streams...
                </span>
                <span className="font-mono">
                  {matchingProgress.current} / {matchingProgress.total}
                </span>
              </div>
              <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-200"
                  style={{ width: `${(matchingProgress.current / matchingProgress.total) * 100}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Parsed Playlist View */}
          {importedPlaylist && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 rounded-2xl glass-panel-subtle border border-white/10">
                {importedPlaylist.cover ? (
                  <img
                    src={importedPlaylist.cover}
                    alt={importedPlaylist.name}
                    className="w-16 h-16 rounded-xl object-cover shadow-lg border border-white/10"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <Music className="w-8 h-8" />
                  </div>
                )}
                <div>
                  <h4 className="text-base font-black text-white">{importedPlaylist.name}</h4>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {importedPlaylist.tracks.length} tracks detected • {resolvedTracks.length} streams ready
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              {resolvedTracks.length > 0 && (
                <div className="flex gap-3">
                  <button
                    onClick={handlePlayAll}
                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-black font-extrabold text-xs shadow-lg shadow-emerald-500/30 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    Play Playlist Now
                  </button>
                  <button
                    onClick={handleQueueAll}
                    className="flex-1 py-3 rounded-xl glass-button text-white font-bold text-xs border border-white/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Queue All {resolvedTracks.length} Tracks
                  </button>
                </div>
              )}

              {/* Tracks Preview */}
              <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                {resolvedTracks.map((t, i) => (
                  <div
                    key={`${t.id}-${i}`}
                    className="flex items-center justify-between p-2 rounded-xl glass-card text-xs"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <div className="truncate">
                        <p className="font-bold text-zinc-200 truncate">{t.title}</p>
                        <p className="text-[11px] text-zinc-400 truncate">{t.artist}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/10 text-emerald-300">
                      320k
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
