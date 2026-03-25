/**
 * B-Roll Planner — Claude API Proxy
 * Vercel Serverless Function (Node.js)
 *
 * Environment variables (set in Vercel dashboard):
 *   ANTHROPIC_API_KEY  — your Anthropic API key
 *   PROXY_TOKEN        — shared secret your team enters in the app
 */

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-proxy-token');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: { message: 'Method not allowed' } });

  /* ── API key check ── */
  const apiKey = process.env.ANTHROPIC_API_KEY || '';
  if (!apiKey) return res.status(500).json({ error: { message: 'Proxy not configured — set ANTHROPIC_API_KEY in Vercel.' } });

  /* ── Forward to Anthropic ── */
  try {
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(req.body),
    });

    const data = await upstream.json();
    return res.status(upstream.status).json(data);
  } catch (err) {
    return res.status(502).json({ error: { message: 'Failed to reach Anthropic: ' + err.message } });
  }
};
