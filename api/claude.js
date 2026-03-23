/**
 * B-Roll Planner — Claude API Proxy
 * Vercel Edge Function
 *
 * Environment variables required (set in Vercel dashboard):
 *   ANTHROPIC_API_KEY  — your Anthropic API key (never exposed to the browser)
 *   PROXY_TOKEN        — a shared secret your team enters in the app's Settings screen
 */

export const config = { runtime: 'edge' };

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-proxy-token',
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

export default async function handler(request) {
  /* Pre-flight CORS request from the browser */
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  if (request.method !== 'POST') {
    return json({ error: { message: 'Method not allowed' } }, 405);
  }

  /* ── Token check ── */
  const expectedToken = process.env.PROXY_TOKEN || '';
  const receivedToken = request.headers.get('x-proxy-token') || '';

  if (!expectedToken) {
    return json({ error: { message: 'Proxy is not configured — set PROXY_TOKEN in Vercel.' } }, 500);
  }
  if (receivedToken !== expectedToken) {
    return json({ error: { type: 'authentication_error', message: 'Invalid proxy token.' } }, 401);
  }

  /* ── API key check ── */
  const apiKey = process.env.ANTHROPIC_API_KEY || '';
  if (!apiKey) {
    return json({ error: { message: 'Proxy is not configured — set ANTHROPIC_API_KEY in Vercel.' } }, 500);
  }

  /* ── Forward to Anthropic ── */
  let body;
  try {
    body = await request.text();
  } catch {
    return json({ error: { message: 'Could not read request body.' } }, 400);
  }

  let upstream;
  try {
    upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         apiKey,
        'anthropic-version': '2023-06-01',
      },
      body,
    });
  } catch (err) {
    return json({ error: { message: 'Failed to reach Anthropic API: ' + err.message } }, 502);
  }

  const responseText = await upstream.text();

  return new Response(responseText, {
    status: upstream.status,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
    },
  });
}
