// K-pop iTunes Proxy — Cloudflare Worker
// iOS Safari의 itunes.apple.com 도메인 차단 우회용
export default {
  async fetch(request) {
    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    const url = new URL(request.url);
    const q = url.searchParams.get('q');
    const country = url.searchParams.get('country') || 'us';

    if (!q) {
      return new Response(JSON.stringify({ error: 'q parameter required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    const itunesUrl =
      `https://itunes.apple.com/search?term=${encodeURIComponent(q)}` +
      `&media=music&entity=song&limit=50&country=${country}`;

    const itunesRes = await fetch(itunesUrl);
    const data = await itunesRes.text();

    return new Response(data, {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=300',
      },
    });
  },
};
