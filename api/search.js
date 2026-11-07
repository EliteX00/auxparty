import CryptoJS from 'crypto-js';

function decryptMediaUrl(encUrl) {
  if (!encUrl) return '';
  try {
    const key = CryptoJS.enc.Utf8.parse('38346591');
    const decrypted = CryptoJS.DES.decrypt(
      { ciphertext: CryptoJS.enc.Base64.parse(encUrl) },
      key,
      { mode: CryptoJS.mode.ECB, padding: CryptoJS.pad.Pkcs7 }
    );
    const url = decrypted.toString(CryptoJS.enc.Utf8);
    if (!url) return '';
    return url.replace('_96.mp4', '_320.mp4');
  } catch (err) {
    return '';
  }
}

function cleanHtml(str) {
  if (!str) return '';
  return str
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

let cachedSpotifyToken = null;
let cachedSpotifyExpiresAt = 0;

async function getSpotifyAccessToken() {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  if (cachedSpotifyToken && Date.now() < cachedSpotifyExpiresAt - 60000) {
    return cachedSpotifyToken;
  }

  try {
    const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const res = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${authHeader}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    if (!res.ok) return null;
    const data = await res.json();
    if (data.access_token) {
      cachedSpotifyToken = data.access_token;
      cachedSpotifyExpiresAt = Date.now() + (data.expires_in || 3600) * 1000;
      return cachedSpotifyToken;
    }
  } catch (e) {
    console.error('Spotify token fetch error:', e);
  }
  return null;
}

// Fetch tracks from Spotify Search API
async function searchSpotify(query, token) {
  try {
    const res = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=15`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.tracks?.items || []).map((t) => ({
      id: `sp-${t.id}`,
      title: t.name,
      artist: t.artists.map((a) => a.name).join(', '),
      album: t.album?.name || '',
      year: t.album?.release_date ? t.album.release_date.substring(0, 4) : '',
      duration: Math.round(t.duration_ms / 1000) || 0,
      image: t.album?.images?.[0]?.url || '',
      popularity: t.popularity || 0,
    }));
  } catch (e) {
    console.error('Spotify search failed:', e);
    return [];
  }
}

// Zero-config global catalog search fallback (iTunes Search API)
async function searchGlobalCatalog(query) {
  try {
    const res = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=15`
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.results || []).map((item) => ({
      id: `it-${item.trackId}`,
      title: item.trackName,
      artist: item.artistName,
      album: item.collectionName || '',
      year: item.releaseDate ? item.releaseDate.substring(0, 4) : '',
      duration: Math.round(item.trackTimeMillis / 1000) || 0,
      image: (item.artworkUrl100 || '').replace('100x100bb', '600x600bb'),
    }));
  } catch (e) {
    console.error('Global catalog search failed:', e);
    return [];
  }
}

// Search direct JioSaavn results (for Indian / regional tracks)
async function searchJioSaavn(query) {
  try {
    const saavnUrl = `https://www.jiosaavn.com/api.php?__call=search.getResults&_format=json&_marker=0&cc=in&n=15&p=1&q=${encodeURIComponent(query)}`;
    const saavnRes = await fetch(saavnUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    if (!saavnRes.ok) return [];
    const data = await saavnRes.json();
    return (data.results || []).map((item) => {
      const streamUrl = decryptMediaUrl(item.encrypted_media_url);
      const rawImg = item.image || '';
      const highResImg = rawImg.replace('150x150', '500x500').replace('50x50', '500x500');
      return {
        id: item.id,
        title: cleanHtml(item.song),
        artist: cleanHtml(item.primary_artists || item.singers || 'Unknown Artist'),
        album: cleanHtml(item.album || ''),
        year: item.year || '',
        duration: parseInt(item.duration, 10) || 0,
        image: highResImg,
        streamUrl: streamUrl,
        has320: item['320kbps'] === 'true',
        source: 'jiosaavn',
      };
    }).filter((t) => Boolean(t.streamUrl));
  } catch (e) {
    console.error('JioSaavn search failed:', e);
    return [];
  }
}

// Resolve 320kbps audio stream from JioSaavn for an external track title + artist
async function resolveAudioStream(title, artist) {
  try {
    const q = `${title} ${artist || ''}`.trim();
    const url = `https://www.jiosaavn.com/api.php?__call=search.getResults&_format=json&_marker=0&cc=in&n=3&p=1&q=${encodeURIComponent(q)}`;
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) return null;
    const data = await res.json();
    const firstMatch = (data.results || [])[0];
    if (firstMatch && firstMatch.encrypted_media_url) {
      const streamUrl = decryptMediaUrl(firstMatch.encrypted_media_url);
      if (streamUrl) {
        return {
          streamUrl,
          has320: firstMatch['320kbps'] === 'true',
          duration: parseInt(firstMatch.duration, 10) || 0,
          saavnId: firstMatch.id,
        };
      }
    }
  } catch (e) {}
  return null;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { q } = req.query;
  if (!q || !q.trim()) {
    return res.status(400).json({ error: 'Missing query parameter q' });
  }

  const query = q.trim();

  try {
    // 1. Check if Spotify credentials are available
    const spotifyToken = await getSpotifyAccessToken();
    let primaryCatalogTracks = [];

    if (spotifyToken) {
      primaryCatalogTracks = await searchSpotify(query, spotifyToken);
    }

    // 2. If Spotify returns no results or token unavailable, use global Apple/Billboard catalog
    if (!primaryCatalogTracks || primaryCatalogTracks.length === 0) {
      primaryCatalogTracks = await searchGlobalCatalog(query);
    }

    // 3. Concurrently search JioSaavn direct results
    const jioSaavnDirectPromise = searchJioSaavn(query);

    // 4. Resolve audio streams for top catalog tracks in parallel
    const catalogResolutionPromises = primaryCatalogTracks.slice(0, 12).map(async (track) => {
      const audio = await resolveAudioStream(track.title, track.artist);
      if (audio && audio.streamUrl) {
        return {
          id: audio.saavnId || track.id,
          title: track.title,
          artist: track.artist,
          album: track.album,
          year: track.year,
          duration: audio.duration || track.duration,
          image: track.image,
          streamUrl: audio.streamUrl,
          has320: audio.has320,
          source: 'jiosaavn',
        };
      }
      return null;
    });

    const [resolvedCatalog, jioSaavnDirect] = await Promise.all([
      Promise.all(catalogResolutionPromises),
      jioSaavnDirectPromise,
    ]);

    const validCatalogTracks = resolvedCatalog.filter(Boolean);

    // 5. Merge catalog tracks and direct JioSaavn results, deduplicating by normalized title + artist
    const seen = new Set();
    const finalTracks = [];

    const normalize = (str) =>
      (str || '')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .slice(0, 20);

    for (const track of [...validCatalogTracks, ...jioSaavnDirect]) {
      const key = `${normalize(track.title)}_${normalize(track.artist)}`;
      if (!seen.has(key) && track.streamUrl) {
        seen.add(key);
        finalTracks.push(track);
      }
    }

    return res.status(200).json({
      success: true,
      count: finalTracks.length,
      tracks: finalTracks,
    });
  } catch (err) {
    console.error('Search handler error:', err);
    return res.status(500).json({ error: err.message });
  }
}
