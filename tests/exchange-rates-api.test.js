const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../api/exchange-rates.js'), 'utf8');
let serial = 0;
const load = () => import('data:text/javascript;base64,' + Buffer.from(source).toString('base64') + '#' + (++serial));
// Reduced synthetic bank markup; distinct column values catch accidental use of cash/remittance quotes.
const fixture = `<p class="txtRateBox"><em>기준일</em>: <strong>2026년11월12일</strong>
<em>고시일시</em>: <strong>2026년11월12일</strong> <strong>08시28분00초</strong><strong>(3회차)</strong></p>
<table><thead><tr><th rowspan="3">통화</th><th colspan="4">현찰</th><th colspan="2">송금</th>
<th>외화<br/>수표<br/>파실때</th><th>매매<br/>기준율</th><th>환가<br/>료율</th><th>미화<br/>환산율</th></tr></thead><tbody>
${[['USD', '1,336.50'], ['JPY (100)', '837.20'], ['EUR', '1,482.98'], ['CNY', '200.32']].map(([code, value]) => `<tr><td>${code}</td>${['9999', '1.75', '8888', '1.75', '7777', '6666', '5555', value, '5.77072', '1.0000'].map(n => `<td>${n}</td>`).join('')}</tr>`).join('')}
</tbody></table>`;
const now = new Date('2026-11-12T08:31:19+09:00');
const response = () => ({ headers: {}, code: 0, body: null, setHeader(k, v) { this.headers[k] = v; }, status(n) { this.code = n; return this; }, json(data) { this.body = data; return this; } });
const upstream = html => ({ ok: true, headers: new Headers({ 'content-type': 'text/html; charset=UTF-8' }), text: async () => html });
function currentFixture() {
    const date = new Date(Date.now() + 9 * 3600000).toISOString();
    return fixture.replaceAll('2026년11월12일', `${date.slice(0, 4)}년${date.slice(5, 7)}월${date.slice(8, 10)}일`).replace('08시28분00초', `${date.slice(11, 13)}시${date.slice(14, 16)}분${date.slice(17, 19)}초`);
}
(async () => {
    const { parseHanaRates } = await load();
    const data = parseHanaRates(fixture, now);
    assert.equal(data.rates.USD.baseRate, 1336.5); assert.equal(data.rates.JPY.baseRate, 837.2);
    assert.equal(data.rates.JPY.quoteUnit, 100); assert.equal(data.rates.EUR.quoteUnit, 1);
    assert.equal(data.publishedAt, '2026-11-12T08:28:00+09:00'); assert.equal(data.sequence, 3);
    for (const invalid of [fixture.replace('매매<br/>기준율', '고객환율'), fixture.replace('colspan="4"', 'colspan="5"'),
        fixture.replace('JPY (100)', 'JPY'), fixture.replace('<td>USD</td>', '<td>XXX</td>'), fixture.replace('1,336.50', 'NaN'),
        fixture.replace('1,336.50', '0'), fixture.replace('1,336.50', '1,33.50'), fixture.replace('08시28분00초', '99시28분00초'),
        fixture.replaceAll('2026년11월12일', '2026년02월30일'), fixture.replace('(3회차)', '(0회차)'), '<html>점검 중</html>']) {
        assert.throws(() => parseHanaRates(invalid, now));
    }
    assert.throws(() => parseHanaRates(fixture, new Date('2026-11-11T00:00:00Z')));
    assert.throws(() => parseHanaRates(fixture, new Date('2026-12-01T00:00:00Z')));
    // Previous-business-day quotes are allowed with their original timestamp, never relabelled as today.
    assert.equal(parseHanaRates(fixture, new Date('2026-11-14T00:00:00Z')).publishedAt, data.publishedAt);
    const originalFetch = global.fetch;
    try {
        let calls = 0, release;
        global.fetch = async (url, opts) => {
            calls++;
            assert.equal(url, 'https://www.kebhana.com/cms/rate/wpfxd651_01i_01.do');
            assert.equal(opts.redirect, 'error'); assert.equal(opts.method, 'POST');
            const params = new URLSearchParams(opts.body);
            assert.equal(params.get('pbldDvCd'), '3'); assert.match(params.get('inqStrDt'), /^\d{8}$/);
            await new Promise(resolve => { release = resolve; });
            return upstream(currentFixture());
        };
        const { default: handler } = await load();
        const a = response(), b = response();
        const first = handler({ method: 'GET', query: { url: 'https://invalid.example' } }, a);
        const second = handler({ method: 'GET' }, b);
        assert.equal(calls, 1, 'concurrent requests share one upstream lookup'); release(); await Promise.all([first, second]);
        assert.equal(a.code, 200); assert.deepEqual(a.body, b.body); assert.equal(a.headers['Cache-Control'], 'no-store');
        const cached = response(); await handler({ method: 'GET' }, cached); assert.equal(calls, 1); assert.equal(cached.code, 200);
        const actualNow = Date.now;
        try {
            Date.now = () => actualNow() + 30000;
            const older = response(); await handler({ method: 'GET' }, older);
            const ttl = Number(older.headers['Vercel-CDN-Cache-Control'].match(/s-maxage=(\d+)/)[1]);
            assert.ok(ttl > 0 && ttl <= 30, 'CDN TTL must shrink with the age of the in-memory quote');
        } finally { Date.now = actualNow; }
        const method = response(); await handler({ method: 'POST' }, method); assert.equal(method.code, 405); assert.equal(method.headers.Allow, 'GET');
        for (const fake of [async () => ({ ok: false }), async () => upstream('<html>점검 중</html>'), async () => { throw new Error('private upstream failure'); }]) {
            global.fetch = fake; const { default: fail } = await load(); const res = response();
            await fail({ method: 'GET' }, res); assert.equal(res.code, 502); assert.ok(!JSON.stringify(res.body).includes('private'));
            assert.equal(res.headers['Vercel-CDN-Cache-Control'], undefined);
        }
    } finally { global.fetch = originalFetch; }
    console.log('EXCHANGE_RATES_API_VALID base column, JPY unit, timestamps, shape failures, coalescing, cache and manual fallback');
})().catch(e => { console.error(e); process.exitCode = 1; });
