import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import CryptoJS from 'crypto-js';

function decryptMediaUrl(encUrl: string): string {
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

function cleanHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'auxparty-api-server',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          const url = new URL(req.url || '', `http://${req.headers.host}`);

          // Search Endpoint
          if (url.pathname === '/api/search') {
            const query = url.searchParams.get('q');
            if (!query) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Missing query parameter q' }));
              return;
            }

            try {
              const saavnUrl = `https://www.jiosaavn.com/api.php?__call=search.getResults&_format=json&_marker=0&cc=in&n=30&p=1&q=${encodeURIComponent(query)}`;
              const saavnRes = await fetch(saavnUrl, {
                headers: { 'User-Agent': 'Mozilla/5.0' },
              });
              const data = await saavnRes.json();
              const results = (data.results || []).map((item: any) => {
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
                };
              }).filter((t: any) => Boolean(t.streamUrl));

              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true, count: results.length, tracks: results }));
            } catch (err: any) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err.message }));
            }
            return;
          }

          // Trending / Charts Endpoint
          if (url.pathname === '/api/trending') {
            try {
              const queries = ['Top Hits 2026', 'Viral Hits', 'Billboard Hot 100'];
              const randomQ = queries[Math.floor(Math.random() * queries.length)];
              const saavnUrl = `https://www.jiosaavn.com/api.php?__call=search.getResults&_format=json&_marker=0&cc=in&n=30&p=1&q=${encodeURIComponent(randomQ)}`;
              const saavnRes = await fetch(saavnUrl, {
                headers: { 'User-Agent': 'Mozilla/5.0' },
              });
              const data = await saavnRes.json();
              const results = (data.results || []).map((item: any) => {
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
                };
              }).filter((t: any) => Boolean(t.streamUrl));

              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true, count: results.length, tracks: results }));
            } catch (err: any) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err.message }));
            }
            return;
          }

          // Spotify Playlist Import Endpoint
          if (url.pathname === '/api/spotify/playlist') {
            const rawUrl = url.searchParams.get('url');
            if (!rawUrl) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Missing Spotify URL' }));
              return;
            }

            try {
              // Extract Spotify ID
              const match = rawUrl.match(/playlist\/([a-zA-Z0-9]+)/);
              if (!match) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Invalid Spotify playlist URL. Must contain /playlist/<id>' }));
                return;
              }
              const playlistId = match[1];

              const embedUrl = `https://open.spotify.com/embed/playlist/${playlistId}`;
              const spotifyRes = await fetch(embedUrl, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
              });
              const html = await spotifyRes.text();
              const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/);

              if (!nextDataMatch) {
                res.statusCode = 502;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Could not parse Spotify playlist data' }));
                return;
              }

              const parsed = JSON.parse(nextDataMatch[1]);
              const entity = parsed?.props?.pageProps?.state?.data?.entity;

              if (!entity) {
                res.statusCode = 404;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Playlist entity not found or playlist is private' }));
                return;
              }

              const tracks = (entity.trackList || []).map((t: any, index: number) => ({
                id: t.uri || `spotify-${index}`,
                title: t.title,
                artist: t.subtitle || '',
                duration: Math.round((t.duration || 0) / 1000),
              }));

              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                success: true,
                name: entity.name || 'Spotify Playlist',
                cover: entity.coverArt?.sources?.[0]?.url || '',
                trackCount: tracks.length,
                tracks: tracks,
              }));
            } catch (err: any) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err.message }));
            }
            return;
          }

          next();
        });
      },
    },
  ],
  server: {
    port: 5173,
    host: true,
  },
});
