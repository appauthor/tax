// Public, read-only bank quotation lookup. No user amounts or credentials leave TaxYou.
const SOURCE_URL = 'https://www.kebhana.com/cont/mall/mall15/mall1501/index.jsp';
const LOOKUP_URL = 'https://www.kebhana.com/cms/rate/wpfxd651_01i_01.do';
const SUPPORTED = { USD: 1, JPY: 100, EUR: 1, CNY: 1 };
const CACHE_MS = 60000;
let cache, pending;

function text(html) {
    return html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;|&#160;/gi, ' ').replace(/\s+/g, ' ').trim();
}

export function parseHanaRates(input, now = new Date()) {
    // Never execute the upstream scripts; reject a changed table instead of guessing a column.
    const html = input.replace(/<!--[\s\S]*?-->/g, '').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
    const stamp = text(html.match(/<p\b[^>]*class=["'][^"']*\btxtRateBox\b[^"']*["'][^>]*>([\s\S]*?)<\/p>/i)?.[1] || '');
    const date = stamp.match(/고시일시\s*:\s*(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일\s*(\d{1,2})시\s*(\d{1,2})분\s*(\d{1,2})초\s*\((\d+)회차\)/);
    if (!date) throw new Error('Missing publication timestamp');
    const parts = date.slice(1, 7).map(n => n.padStart(2, '0'));
    const publishedAt = `${parts[0]}-${parts[1]}-${parts[2]}T${parts[3]}:${parts[4]}:${parts[5]}+09:00`;
    const timestamp = new Date(publishedAt);
    const reconstructed = new Date(timestamp.getTime() + 9 * 3600000).toISOString().slice(0, 19);
    if (reconstructed !== publishedAt.slice(0, 19) || timestamp - now > 300000 || now - timestamp > 14 * 86400000 || Number(date[7]) < 1) throw new Error('Invalid or outdated publication timestamp');
    const table = [...html.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)].map(m => m[1]).find(s => /매매\s*(?:<br\s*\/?>)?\s*기준율/.test(s));
    if (!table) throw new Error('Missing quotation table');
    const head = table.match(/<thead\b[^>]*>([\s\S]*?)<\/thead>/i)?.[1].match(/<tr\b[^>]*>([\s\S]*?)<\/tr>/i)?.[1] || '';
    const headers = [...head.matchAll(/<th\b([^>]*)>([\s\S]*?)<\/th>/gi)].map(m => ({
        name: text(m[2]).replace(/\s/g, ''), span: Number(m[1].match(/colspan=["'](\d+)["']/i)?.[1] || 1)
    }));
    const expected = [['통화', 1], ['현찰', 4], ['송금', 2], ['외화수표파실때', 1], ['매매기준율', 1], ['환가료율', 1], ['미화환산율', 1]];
    if (JSON.stringify(headers.map(h => [h.name, h.span])) !== JSON.stringify(expected)) throw new Error('Quotation columns changed');
    const rows = table.match(/<tbody\b[^>]*>([\s\S]*?)<\/tbody>/i)?.[1] || '';
    const rates = {};
    for (const row of rows.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
        const cells = [...row[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(m => text(m[1]));
        const code = cells[0]?.match(/\b(USD|JPY|EUR|CNY)\b/)?.[1];
        if (!code) continue;
        if (cells.length !== 11 || rates[code] || (code === 'JPY' && !/JPY\s*\(100\)/.test(cells[0])) || !/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?$/.test(cells[8])) throw new Error('Invalid quotation row');
        const baseRate = Number(cells[8].replaceAll(',', ''));
        if (!Number.isFinite(baseRate) || baseRate <= 0 || baseRate > 1e9) throw new Error('Invalid base rate');
        rates[code] = { baseRate, quoteUnit: SUPPORTED[code] };
    }
    if (Object.keys(rates).length !== Object.keys(SUPPORTED).length) throw new Error('Incomplete quotations');
    return { source: '하나은행', sourceUrl: SOURCE_URL, publishedAt, sequence: Number(date[7]), fetchedAt: now.toISOString(), rates };
}

async function lookup() {
    const now = new Date();
    if (cache && now.getTime() - cache.at < CACHE_MS) return cache.data;
    if (pending) return pending;
    pending = (async () => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        try {
            const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
            const date = ['year', 'month', 'day'].map(type => parts.find(p => p.type === type).value).join('');
            const response = await fetch(LOOKUP_URL, {
                method: 'POST', redirect: 'error', signal: controller.signal,
                headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'text/html' },
                body: new URLSearchParams({ ajax: 'true', curCd: '', inqStrDt: date, pbldDvCd: '3', pbldSqn: '', requestTarget: 'searchContentDiv' }).toString()
            });
            if (!response.ok || !/text\/html/i.test(response.headers.get('content-type') || '') || Number(response.headers.get('content-length')) > 500000) throw new Error('Upstream unavailable');
            const html = await response.text();
            if (html.length > 500000) throw new Error('Unexpected response size');
            const data = parseHanaRates(html, new Date());
            cache = { at: Date.now(), data };
            return data;
        } finally { clearTimeout(timeout); }
    })();
    try { return await pending; } finally { pending = null; }
}

export default async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET');
        return res.status(405).json({ error: 'Method not allowed' });
    }
    try {
        const data = await lookup();
        // A cached function response must not receive a fresh full CDN TTL (double caching).
        const remaining = Math.max(0, Math.min(60, Math.floor((CACHE_MS - (Date.now() - Date.parse(data.fetchedAt))) / 1000)));
        if (remaining > 0) res.setHeader('Vercel-CDN-Cache-Control', `public, s-maxage=${remaining}`);
        return res.status(200).json(data);
    } catch {
        // Never substitute examples or stale quotes when the lookup/shape check fails.
        return res.status(502).json({ error: '고시환율을 가져오지 못했습니다. 은행에서 확인한 매매기준율을 직접 입력해 주세요.' });
    }
}
