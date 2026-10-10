// Vercel Serverless Function: /api/vocab?query=haus&limit=5
// Tarayıcı bu adrese istek atar; API anahtarı yalnızca burada, ortam değişkeninde durur.
const UPSTREAM = process.env.GERMAN_API_URL || 'https://german-language.onrender.com/vocab';

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Yalnızca GET desteklenir' });
  }

  const query = String(req.query.query || '').trim().slice(0, 60);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 5, 1), 10);
  if (!query) return res.status(400).json({ error: 'query gerekli' });

  const key = process.env.GERMAN_API_KEY;
  if (!key) return res.status(500).json({ error: 'GERMAN_API_KEY tanımlı değil' });

  const url = new URL(UPSTREAM);
  url.searchParams.set('query', query);
  url.searchParams.set('limit', String(limit));

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const r = await fetch(url, {
      headers: { 'X-API-Key': key, Accept: 'application/json' },
      signal: ctrl.signal,
    });
    const body = await r.text();
    if (!r.ok) return res.status(502).json({ error: 'Sözlük servisi hata verdi', status: r.status });

    // Aynı aramayı 1 gün Vercel önbelleğinden sun: hem hızlı hem API limitini korur.
    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=604800');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.status(200).send(body);
  } catch (e) {
    return res.status(504).json({ error: 'Sözlük servisine ulaşılamadı' });
  } finally {
    clearTimeout(timer);
  }
};
