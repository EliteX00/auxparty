import { Track, SpotifyPlaylistResponse } from '../types';

export async function searchTracks(query: string): Promise<Track[]> {
  if (!query.trim()) return [];
  try {
    const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`);
    if (!res.ok) throw new Error('Search failed');
    const data = await res.json();
    return data.tracks || [];
  } catch (err) {
    console.error('Search error:', err);
    return [];
  }
}

export async function getTrendingTracks(): Promise<Track[]> {
  try {
    const res = await fetch('/api/trending');
    if (!res.ok) throw new Error('Failed to fetch trending tracks');
    const data = await res.json();
    return data.tracks || [];
  } catch (err) {
    console.error('Trending fetch error:', err);
    return [];
  }
}

export async function fetchSpotifyPlaylist(url: string): Promise<SpotifyPlaylistResponse | null> {
  try {
    const res = await fetch(`/api/spotify/playlist?url=${encodeURIComponent(url.trim())}`);
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to fetch playlist');
    }
    const data = await res.json();
    return data;
  } catch (err) {
    console.error('Spotify import error:', err);
    throw err;
  }
}

export async function matchSpotifyTrack(title: string, artist: string): Promise<Track | null> {
  try {
    const query = `${title} ${artist}`;
    const results = await searchTracks(query);
    if (results.length > 0) {
      return results[0];
    }
    // Fallback search with title only
    const fallbackResults = await searchTracks(title);
    return fallbackResults[0] || null;
  } catch (err) {
    return null;
  }
}
