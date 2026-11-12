// Optional: node tests/personal-finance-dom.test.js /absolute/path/to/jsdom
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM, VirtualConsole } = require(process.argv[2] || 'jsdom');
const root = path.resolve(__dirname, '..');
const settle = () => new Promise(resolve => setImmediate(resolve));
async function load(slug, formId, errorId, fetcher = async () => ({ ok: false })) {
    const errors = [], downloads = [], shares = [];
    const virtualConsole = new VirtualConsole(); virtualConsole.on('jsdomError', e => errors.push(e.message));
    const dom = new JSDOM(fs.readFileSync(path.join(root, slug + '.html'), 'utf8'), {
        runScripts: 'outside-only', url: `https://www.taxyou.co.kr/${slug}.html`, pretendToBeVisual: true, virtualConsole
    });
    const w = dom.window, d = w.document;
    w.fetch = fetcher;
    const style = d.createElement('style'); style.textContent = fs.readFileSync(path.join(root, 'style.css'), 'utf8'); d.head.append(style);
    w.HTMLElement.prototype.scrollIntoView = () => {};
    w.alert = message => { throw new Error('Unexpected alert: ' + message); };
    w.html2canvas = async element => {
        assert.equal(element.id, 'captureArea'); assert.ok(element.querySelector('#resultTableBody').textContent.trim());
        return { width: 900, height: 2400, toBlob: cb => cb(new w.Blob(['png'], { type: 'image/png' })), toDataURL: () => 'data:image/png;base64,cG5n' };
    };
    w.jspdf = { jsPDF: class {
        constructor() { this.internal = { pageSize: { getWidth: () => 210, getHeight: () => 297 } }; }
        addImage() {} addPage() {} output() { return new w.Blob(['pdf'], { type: 'application/pdf' }); }
    } };
    w.navigator.canShare = () => true; w.navigator.share = async data => shares.push(data);
    for (const script of d.querySelectorAll('script[src^="scripts/"]')) w.eval(fs.readFileSync(path.join(root, script.getAttribute('src').split('?')[0]), 'utf8'));
    w.downloadBlob = (blob, name) => downloads.push({ type: blob.type, name });
    await new Promise(resolve => d.addEventListener('DOMContentLoaded', resolve, { once: true })); await settle();
    const get = id => d.getElementById(id);
    const set = (id, v) => { const e = get(id); assert.ok(e, id); e.value = String(v); e.dispatchEvent(new w.Event('input', { bubbles: true })); e.dispatchEvent(new w.Event('change', { bubbles: true })); };
    const submit = () => get(formId).dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true }));
    const visible = () => get('resultBox').style.display === 'block';
    const text = () => get('resultTableBody').textContent;
    assert.deepEqual(errors, []); assert.equal(get(errorId).hidden, true);
    assert.equal(w.getComputedStyle(get(errorId)).display, 'none');
    for (const field of get(formId).querySelectorAll('input,select')) assert.ok(field.labels.length, field.id);
    async function exports() {
        assert.ok(visible()); assert.equal(d.activeElement, get('resultBox'));
        for (const id of ['downloadImgBtn', 'downloadPdfBtn', 'sharePngBtn']) { get(id).click(); await settle(); }
        assert.deepEqual(downloads.map(x => x.type), ['image/png', 'application/pdf']);
        assert.equal(shares.length, 1); assert.equal(shares[0].files[0].type, 'image/png'); assert.deepEqual(errors, []);
    }
    return { dom, w, get, set, submit, visible, text, exports, error: () => get(errorId).textContent };
}
(async () => {
    const fx = await load('currency-exchange-calculator', 'fxForm', 'fxError');
    assert.match(fx.get('fxRateStatus').textContent, /가져오지 못했습니다/);
    fx.set('fxBaseRate', 1400);
    fx.submit(); assert.ok(fx.visible()); assert.match(fx.text(), /1,402,450/);
    fx.set('fxPreferenceA', 101); fx.submit(); assert.equal(fx.visible(), false); assert.match(fx.error(), /우대율/);
    fx.set('fxPreferenceA', 90); fx.set('fxCurrency', 'JPY'); assert.equal(fx.get('fxQuoteUnit').value, '100');
    assert.equal(fx.get('fxBaseRate').value, '', 'changing currency clears a potentially incompatible old rate');
    fx.submit(); assert.equal(fx.visible(), false); assert.match(fx.error(), /계산 기준환율/);
    fx.set('fxBaseRate', 950); fx.set('fxAmount', 100000); fx.set('fxSpreadA', 0); fx.set('fxSpreadB', 0);
    fx.submit(); assert.match(fx.text(), /950,000/); assert.match(fx.text(), /같습니다/);
    fx.set('fxCurrency', 'OTHER'); assert.equal(fx.get('fxQuoteUnit').disabled, false);
    fx.set('fxCurrency', 'USD'); fx.set('fxBaseRate', 1400); fx.set('fxDirection', 'sell'); fx.set('fxAmountType', 'won');
    fx.set('fxAmount', 1400000); fx.submit(); assert.match(fx.text(), /1,000 외화|1,000 USD/);
    await fx.exports(); fx.dom.window.close();

    const today = () => {
        const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
        return ['year', 'month', 'day'].map(type => parts.find(p => p.type === type).value).join('-');
    };
    const quotation = (base = 'USD', rate = { USD: 1400, JPY: 9.5, EUR: 1500, CNY: 200 }[base], date = today()) => ({ base, quote: 'KRW', rate, date });
    const requests = [];
    const live = await load('currency-exchange-calculator', 'fxForm', 'fxError', (url, options) => new Promise(resolve => {
        assert.match(url, /^https:\/\/api\.frankfurter\.dev\/v2\/rate\/(USD|JPY|EUR|CNY)\/KRW$/);
        assert.equal(options.credentials, 'omit');
        requests.push({ resolve: data => resolve({ ok: true, json: async () => data }), options });
    }));
    assert.equal(live.get('fxFetchRate').disabled, true);
    requests[0].resolve(quotation()); await settle();
    assert.equal(live.get('fxBaseRate').value, '1400'); assert.match(live.get('fxRateProvenance').textContent, /Frankfurter 참고환율.*기준일/);
    live.submit(); assert.match(live.text(), /환율 출처.*Frankfurter/); assert.match(live.get('resultNotice').textContent, /추정액/);
    live.set('fxCurrency', 'JPY'); assert.equal(live.visible(), false); assert.equal(live.get('fxBaseRate').value, '');
    live.set('fxBaseRate', 955); assert.equal(requests[1].options.signal.aborted, true);
    requests[1].resolve(quotation('JPY')); await settle(); assert.equal(live.get('fxBaseRate').value, '955', 'late responses cannot overwrite manual edits');
    assert.equal(live.get('fxRateProvenance').textContent, ''); assert.match(live.get('fxRateStatus').textContent, /직접 입력/);
    live.submit(); assert.doesNotMatch(live.text(), /Frankfurter/); assert.doesNotMatch(live.get('resultNotice').textContent, /추정액/);
    live.set('fxCurrency', 'USD'); live.set('fxCurrency', 'EUR');
    requests[2].resolve(quotation()); await settle(); assert.equal(live.get('fxBaseRate').value, '', 'previous currency request must not apply');
    requests[3].resolve(quotation('EUR')); await settle(); assert.equal(live.get('fxBaseRate').value, '1500');
    live.get('fxFetchRate').click(); requests[4].resolve(quotation('EUR', 0)); await settle(); assert.equal(live.get('fxBaseRate').value, '1500');
    assert.match(live.get('fxRateStatus').textContent, /기존 입력값/); assert.match(live.get('fxRateProvenance').textContent, /Frankfurter/);
    live.set('fxCurrency', 'OTHER'); assert.equal(live.get('fxFetchRate').disabled, true); assert.equal(live.get('fxRateProvenance').textContent, '');
    assert.match(live.get('fxRateStatus').textContent, /직접 입력/); assert.equal(requests.length, 5);
    live.set('fxCurrency', 'JPY'); requests[5].resolve(quotation('USD')); await settle(); assert.equal(live.get('fxBaseRate').value, '');
    live.get('fxFetchRate').click(); requests[6].resolve(quotation('JPY')); await settle(); assert.equal(live.get('fxBaseRate').value, '950');
    const pastDate = days => new Date(Date.parse(today()) - days * 86400000).toISOString().slice(0, 10);
    live.get('fxFetchRate').click(); requests[7].resolve(quotation('JPY', 9.5, pastDate(4))); await settle(); assert.match(live.get('fxRateStatus').textContent, /3일/);
    live.set('fxCurrency', 'USD'); requests[8].resolve(quotation('USD', 1400, pastDate(8))); await settle(); assert.equal(live.get('fxBaseRate').value, '');
    assert.match(live.get('fxRateStatus').textContent, /7일/);
    live.set('fxBaseRate', 1420); live.get('fxFetchRate').click(); requests[9].resolve(quotation()); await settle();
    assert.equal(live.get('fxBaseRate').value, '1400'); live.submit(); await live.exports();
    live.dom.window.close();

    const travelRates = { USD: 1400, JPY: 9.5, CNY: 200, EUR: 1500, HKD: 170.6, AUD: 921.73, GBP: 1791.14,
        VND: 0.05217, THB: 39.917, TWD: 40.727, PHP: 21.225, SGD: 1046.07, MYR: 329.61,
        IDR: 0.0739, MOP: 165.63, CAD: 945.83, NZD: 751.12 };
    const travel = await load('currency-exchange-calculator', 'fxForm', 'fxError', async url => {
        const match = url.match(/^https:\/\/api\.frankfurter\.dev\/v2\/rate\/([A-Z]{3})\/KRW$/);
        assert.ok(match); assert.ok(Object.hasOwn(travelRates, match[1]));
        return { ok: true, json: async () => quotation(match[1], travelRates[match[1]]) };
    });
    const choices = [...travel.get('fxCurrency').options].map(o => o.value).filter(v => v !== 'OTHER');
    assert.deepEqual(choices.slice().sort(), Object.keys(travelRates).sort());
    assert.deepEqual(choices.slice().sort(), Object.keys(travel.w.PersonalFinanceMath.exchangeQuoteUnits).sort());
    for (const code of choices) {
        travel.set('fxCurrency', code); await settle();
        const unit = ['JPY', 'VND', 'IDR'].includes(code) ? 100 : 1;
        assert.equal(travel.get('fxQuoteUnit').value, String(unit));
        assert.equal(Number(travel.get('fxBaseRate').value), Number((travelRates[code] * unit).toFixed(6)));
        assert.match(travel.get('fxBaseRate').labels[0].textContent, new RegExp(`${unit} ${code}`));
        travel.submit(); assert.ok(travel.visible(), code); assert.match(travel.text(), new RegExp(code));
    }
    travel.set('fxCurrency', 'VND'); await settle(); travel.set('fxAmount', 1000000);
    travel.set('fxSpreadA', 0); travel.set('fxSpreadB', 0); travel.submit(); assert.match(travel.text(), /52,170/);
    travel.set('fxCurrency', 'IDR'); await settle(); travel.submit(); assert.match(travel.text(), /73,900/);
    travel.set('fxBaseRate', 8); assert.equal(travel.get('fxRateProvenance').textContent, '');
    travel.set('fxCurrency', 'OTHER'); assert.equal(travel.get('fxFetchRate').disabled, true);
    await settle(); travel.dom.window.close();

    const ret = await load('retirement-fund-calculator', 'retForm', 'retError');
    ret.submit(); assert.ok(ret.visible());
    for (const [id, v] of Object.entries({ retCurrentAge: 60, retAge: 60, retEndAge: 90, retPensionAge: 65,
        retAssets: 300000000, retSaving: 0, retExpense: 2000000, retPension: 1000000, retReturn: 0, retInflation: 0, retPensionGrowth: 0 })) ret.set(id, v);
    assert.equal(ret.visible(), false); ret.submit(); assert.match(ret.text(), /420,000,000/); assert.match(ret.text(), /80세 1개월/);
    assert.equal(ret.get('formulaContent').querySelectorAll('table').length, 2);
    ret.set('retEndAge', 59); ret.submit(); assert.equal(ret.visible(), false); assert.match(ret.error(), /계획 종료/);
    ret.set('retEndAge', 90); ret.set('retPensionAge', 59); ret.submit(); assert.equal(ret.visible(), false); assert.match(ret.error(), /연금 시작/);
    ret.set('retPensionAge', 65); ret.set('retAssets', 420000000); ret.submit(); assert.match(ret.text(), /계획 기간 내 생활비 부족 없음/);
    await ret.exports(); ret.dom.window.close();

    const reb = await load('portfolio-rebalancing-calculator', 'rebForm', 'rebError');
    reb.submit(); assert.ok(reb.visible()); assert.equal(reb.get('rebRows').children.length, 3);
    reb.set('rebName1', '<img src=x onerror=alert(1)>'); reb.submit();
    assert.equal(reb.get('formulaContent').querySelector('img'), null); assert.match(reb.get('formulaContent').textContent, /<img/);
    reb.set('rebWeight1', 49); reb.submit(); assert.equal(reb.visible(), false); assert.match(reb.error(), /99%/);
    reb.set('rebWeight1', 50); reb.get('rebAddRow').click(); assert.equal(reb.get('rebRows').children.length, 4);
    assert.equal(reb.dom.window.document.activeElement.id, 'rebName4');
    reb.set('rebName4', '기타'); reb.set('rebValue4', 0); reb.set('rebWeight4', 0); reb.submit(); assert.ok(reb.visible());
    reb.get('rebRows').lastElementChild.querySelector('button').click(); assert.equal(reb.visible(), false);
    reb.get('rebRows').lastElementChild.querySelector('button').click(); assert.equal(reb.get('rebRows').children.length, 2);
    reb.set('rebName1', '주식'); reb.set('rebValue1', 6000000); reb.set('rebWeight1', 50);
    reb.set('rebName2', '채권'); reb.set('rebValue2', 4000000); reb.set('rebWeight2', 50); reb.set('rebExtraCash', 0);
    reb.submit(); assert.match(reb.get('formulaContent').textContent, /매도 1,000,000/); assert.match(reb.get('formulaContent').textContent, /매수 1,000,000/);
    reb.set('rebMode', 'buy-only'); reb.set('rebExtraCash', 1000000); reb.submit(); assert.match(reb.get('formulaContent').textContent, /54.55%/);
    assert.doesNotMatch(reb.get('formulaContent').textContent, /매도 1,000,000/);
    reb.get('rebRows').lastElementChild.querySelector('button').click(); assert.equal(reb.get('rebRows').children.length, 2); assert.match(reb.error(), /최소 2개/);
    reb.submit(); await reb.exports(); reb.dom.window.close();
    console.log('PERSONAL_FINANCE_DOM_VALID pages=3 modes, validation, labels, stale results, row operations, escaping, PNG/PDF/share');
})().catch(e => { console.error(e); process.exitCode = 1; });
