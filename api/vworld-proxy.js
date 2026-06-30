export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Cache-Control', 'no-store');

    if (req.method === 'OPTIONS') {
        res.status(204).end();
        return;
    }

    if (req.method !== 'GET') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    const targetUrl = req.query?.url;

    if (!targetUrl || Array.isArray(targetUrl)) {
        res.status(400).json({ error: 'Missing url parameter' });
        return;
    }

    let parsedUrl;

    try {
        parsedUrl = new URL(targetUrl);
    } catch (err) {
        res.status(400).json({ error: 'Invalid url parameter' });
        return;
    }

    if (parsedUrl.protocol !== 'https:' || parsedUrl.hostname !== 'api.vworld.kr') {
        res.status(400).json({ error: 'Only VWorld API URLs are allowed' });
        return;
    }

    parsedUrl.searchParams.delete('callback');

    try {
        const response = await fetch(parsedUrl.toString());
        const responseText = await response.text();
        const contentType = response.headers.get('content-type') || 'application/json; charset=utf-8';

        res.status(response.status);
        res.setHeader('Content-Type', contentType);
        res.send(responseText);
    } catch (err) {
        res.status(502).json({ error: err.message || 'VWorld proxy request failed' });
    }
}
