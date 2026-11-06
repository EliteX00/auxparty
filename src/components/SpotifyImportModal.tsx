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

      // Match tracks to 320kbps streams (batch match initial 15 for instant gratification)
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-xl bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-zinc-100">Import Spotify Playlist</h3>
              <p className="text-xs text-zinc-400">
                Converts any Spotify playlist to 320kbps direct streams
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

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Input field */}
          <div>
            <label className="text-xs font-semibold text-zinc-400 mb-1.5 block">
              Spotify Playlist Link
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M"
                className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-mono"
              />
              <button
                onClick={() => handleFetch()}
                disabled={loading || !url.trim()}
                className="px-5 py-2.5 rounded-xl bg-emerald-500 text-black font-bold text-sm hover:bg-emerald-400 active:scale-95 disabled:opacity-50 transition-all flex items-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Fetch'}
              </button>
            </div>
          </div>

          {/* Quick presets */}
          <div>
            <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
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
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-300 hover:text-white transition-colors border border-zinc-700/50"
                >
                  ⚡ {p.name}
                </button>
              ))}
            </div>
          </div>

          {/* Error notice */}
          {error && (
            <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-red-950/40 border border-red-500/30 text-red-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Progress / Status */}
          {matchingProgress && (
            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
              <div className="flex justify-between text-xs font-medium text-zinc-300">
                <span className="flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" />
                  Matching tracks to 320kbps audio engine...
                </span>
                <span className="font-mono text-purple-400">
                  {matchingProgress.current} / {matchingProgress.total}
                </span>
              </div>
              <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-purple-500 transition-all duration-200"
                  style={{ width: `${(matchingProgress.current / matchingProgress.total) * 100}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Preview of Imported Tracks */}
          {importedPlaylist && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {importedPlaylist.cover && (
                    <img
                      src={importedPlaylist.cover}
                      alt={importedPlaylist.name}
                      className="w-12 h-12 rounded-lg object-cover shadow"
                    />
                  )}
                  <div>
                    <h4 className="font-bold text-sm text-zinc-100">{importedPlaylist.name}</h4>
                    <p className="text-xs text-zinc-400">
                      {resolvedTracks.length} high-fidelity streams ready
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handlePlayAll}
                    disabled={resolvedTracks.length === 0}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md shadow-purple-600/30 transition-all disabled:opacity-40"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    Play All
                  </button>
                  <button
                    onClick={handleQueueAll}
                    disabled={resolvedTracks.length === 0}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition-all disabled:opacity-40"
                    title="Add all to current queue"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Queue
                  </button>
                </div>
              </div>

              {/* Track list preview */}
              <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1 divide-y divide-zinc-800/40">
                {resolvedTracks.map((t, idx) => (
                  <div key={t.id} className="flex items-center justify-between py-2 text-xs">
                    <div className="flex items-center gap-2.5 truncate">
                      <span className="text-zinc-500 w-4 text-center font-mono">{idx + 1}</span>
                      <img src={t.image} alt={t.title} className="w-7 h-7 rounded object-cover" />
                      <div className="truncate">
                        <span className="font-semibold text-zinc-200 truncate block">{t.title}</span>
                        <span className="text-[11px] text-zinc-400 truncate block">{t.artist}</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 shrink-0">
                      320kbps
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
