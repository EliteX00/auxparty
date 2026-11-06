export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const rawUrl = req.query.url;
  if (!rawUrl) {
    return res.status(400).json({ error: 'Missing Spotify playlist URL' });
  }

  try {
    const match = rawUrl.match(/playlist\/([a-zA-Z0-9]+)/);
    if (!match) {
      return res.status(400).json({ error: 'Invalid Spotify URL. Must contain /playlist/<id>' });
    }
    const playlistId = match[1];

    const embedUrl = `https://open.spotify.com/embed/playlist/${playlistId}`;
    const spotifyRes = await fetch(embedUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    });
    const html = await spotifyRes.text();
    const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/);

    if (!nextDataMatch) {
      return res.status(502).json({ error: 'Could not parse Spotify playlist data' });
    }

    const parsed = JSON.parse(nextDataMatch[1]);
    const entity = parsed?.props?.pageProps?.state?.data?.entity;

    if (!entity) {
      return res.status(404).json({ error: 'Playlist entity not found or playlist is private' });
    }

    const tracks = (entity.trackList || []).map((t, index) => ({
      id: t.uri || `spotify-${index}`,
      title: t.title,
      artist: t.subtitle || '',
      duration: Math.round((t.duration || 0) / 1000),
    }));

    return res.status(200).json({
      success: true,
      name: entity.name || 'Spotify Playlist',
      cover: entity.coverArt?.sources?.[0]?.url || '',
      trackCount: tracks.length,
      tracks: tracks,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
