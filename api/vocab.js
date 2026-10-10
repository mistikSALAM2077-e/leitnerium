// Vercel Serverless Function: /api/vocab?query=haus&limit=5
// Kendi sözlük verimizi (data/words.json) arar. API anahtarı / dış servis yok.
const WORDS = require('../data/words.json');

const fold = (s) =>
  String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/ß/g, 'ss').replace(/ı/g, 'i');

const INDEX = WORDS.map((w) => ({ w, de: fold(w.german), tr: fold(w.turkish) }));

function score(key, q) {
  if (key === q) return 0;
  if (key.startsWith(q)) return 1;
  if (key.split(/[\s,;\/()]+/).some((p) => p.startsWith(q))) return 2;
  if (key.includes(q)) return 3;
  return -1;
}

function search(query, limit) {
  const q = fold(query).trim();
  if (!q) return [];
  const hits = [];
  for (const e of INDEX) {
    const a = score(e.de, q), b = score(e.tr, q);
    const s = a < 0 ? b : b < 0 ? a : Math.min(a, b);
    if (s >= 0) hits.push([s, Math.min(e.de.length, e.tr.length || 99), e.w]);
  }
  hits.sort((x, y) => x[0] - y[0] || x[1] - y[1]);
  return hits.slice(0, limit).map((h) => h[2]);
}

module.exports = function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Yalnızca GET desteklenir' });
  }
  const query = String(req.query.query || '').trim().slice(0, 60);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 5, 1), 10);
  if (!query) return res.status(400).json({ error: 'query gerekli' });
  res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=604800');
  return res.status(200).json({ results: search(query, limit) });
};
module.exports.search = search;
