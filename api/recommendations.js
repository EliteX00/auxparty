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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const artist = req.query.artist || '';
  const title = req.query.title || '';
  const currentId = req.query.currentId || '';

  try {
    const query = artist ? artist.split(',')[0].trim() : title;
    const saavnUrl = `https://www.jiosaavn.com/api.php?__call=search.getResults&_format=json&_marker=0&cc=in&n=20&p=1&q=${encodeURIComponent(query || 'Top Hits')}`;
    const saavnRes = await fetch(saavnUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    const data = await saavnRes.json();
    const results = (data.results || []).map((item) => {
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
        source: 'saavn',
      };
    }).filter((t) => Boolean(t.streamUrl) && t.id !== currentId);

    return res.status(200).json({ success: true, count: results.length, tracks: results });
  } catch (err) {
    return res.status(500).json({ error: err.message, tracks: [] });
  }
}
