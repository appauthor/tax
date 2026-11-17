// Optional integration: node tests/contribution-comparison-dom.test.js /absolute/path/to/jsdom
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM, VirtualConsole } = require(process.argv[2] || 'jsdom');
const root = path.resolve(__dirname, '..');
const settle = () => new Promise(resolve => setImmediate(resolve));
const cases = [
    ['hometown-donation-tax-credit-calculator', 'donation', { donation: 200000, gift: 60000, confirmed: true }, /144,000/],
    ['national-pension-buyback-calculator', 'buyback', { base: 2000000, months: 60 }, /11,400,000/],
    ['irp-fee-rank', 'irp', {}, /40,000/],
    ['regional-unsold-housing-rank', 'unsold', { region: '경기' }, /13,802/]
];
(async () => {
    for (const [slug, type, example, expected] of cases) {
        const errors = [], downloads = [], shares = [], alerts = [];
        const vc = new VirtualConsole(); vc.on('jsdomError', e => errors.push(e.message));
        const dom = new JSDOM(fs.readFileSync(path.join(root, slug + '.html'), 'utf8'), { url: 'https://www.taxyou.co.kr/' + slug + '.html', runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole: vc });
        const w = dom.window, d = w.document;
        const css = d.createElement('style'); css.textContent = fs.readFileSync(path.join(root, 'style.css'), 'utf8'); d.head.append(css);
        w.HTMLElement.prototype.scrollIntoView = () => {};
        w.alert = m => alerts.push(m);
        w.html2canvas = async element => {
            assert.equal(element.id, 'captureArea'); assert.match(element.querySelector('#resultTableBody').textContent, expected);
            if (['irp', 'unsold'].includes(type)) assert.ok(element.querySelector('[data-full-report-table]'));
            return { width: 900, height: 3000, toBlob: cb => cb(new w.Blob(['png'], { type: 'image/png' })), toDataURL: () => 'data:image/png;base64,cG5n' };
        };
        w.jspdf = { jsPDF: class { constructor() { this.internal = { pageSize: { getWidth: () => 210, getHeight: () => 297 } }; } addImage() {} addPage() {} output() { return new w.Blob(['pdf'], { type: 'application/pdf' }); } } };
        w.navigator.canShare = () => true; w.navigator.share = async data => shares.push(data);
        for (const script of d.querySelectorAll('script[src^="scripts/"]')) w.eval(fs.readFileSync(path.join(root, script.getAttribute('src').split('?')[0]), 'utf8'));
        w.downloadBlob = (blob, name) => downloads.push({ type: blob.type, name });
        await new Promise(resolve => d.addEventListener('DOMContentLoaded', resolve, { once: true })); await settle();
        const form = d.querySelector('form[data-contribution-tool]'), error = d.getElementById('toolError'), box = d.getElementById('resultBox');
        const get = name => form.elements.namedItem(name);
        const set = (name, value) => { const el = get(name); assert.ok(el, name); if (el.type === 'checkbox') el.checked = value; else el.value = String(value); el.dispatchEvent(new w.Event('input', { bubbles: true })); el.dispatchEvent(new w.Event('change', { bubbles: true })); };
        const submit = () => form.dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true }));
        const text = () => box.textContent;
        const isVisible = () => box.style.display === 'block';
        const checkError = hidden => { assert.equal(error.hidden, hidden); assert.equal(w.getComputedStyle(error).display === 'none', hidden); };
        checkError(true); assert.deepEqual(errors, []);
        assert.equal(d.querySelectorAll('#resultBox').length, 1);
        for (const el of form.querySelectorAll('input,select')) assert.ok(el.labels.length, el.id);
        for (const [name, value] of Object.entries(example)) set(name, value);
        assert.ok(form.checkValidity()); submit(); assert.ok(isVisible()); assert.match(text(), expected); assert.equal(d.activeElement, box); checkError(true);
        if (type === 'donation') {
            assert.equal(get('incomeLimit').disabled, true); assert.match(text(), /요건과 소득세/);
            set('useTaxLimit', true); assert.equal(get('incomeLimit').disabled, false); assert.equal(form.checkValidity(), false);
            set('incomeLimit', 50000); set('localLimit', 5000); submit(); assert.match(text(), /145,000/);
            set('gift', 60001); submit(); checkError(false); assert.equal(isVisible(), false); assert.match(error.textContent, /30%/);
            set('gift', 60000); checkError(true); set('scope', 'business'); submit(); checkError(false); assert.match(error.textContent, /사업소득/);
            set('scope', 'general'); set('useTaxLimit', false); submit(); assert.ok(isVisible());
        } else if (type === 'buyback') {
            assert.equal(get('quotedCost').disabled, true); assert.equal(get('beforePension').disabled, true);
            set('useRecovery', true); assert.equal(form.checkValidity(), false);
            set('beforePension', 700000); set('afterPension', 800000); set('startAge', 65); submit(); assert.match(text(), /74세 6개월/);
            set('deadlineYear', '2027'); submit(); assert.match(text(), /12,000,000/);
            set('months', 120); submit(); checkError(false); assert.equal(isVisible(), false);
            set('months', 60); checkError(true); set('mode', 'quote'); assert.equal(get('base').disabled, true); assert.equal(get('quotedCost').disabled, false);
            set('quotedCost', 11400000); submit(); assert.match(text(), /74세 6개월/);
        } else if (type === 'irp') {
            assert.equal(d.getElementById('baselineRank').hidden, true);
            set('channel', 'branch'); assert.equal(isVisible(), false); assert.equal(d.getElementById('baselineRank').hidden, false);
            set('balance', 200000000); submit(); assert.match(text(), /580,000/);
            set('balance', 'bad'); submit(); checkError(false); assert.equal(isVisible(), false);
            set('balance', 20000000); checkError(true); set('channel', 'online'); submit();
        } else {
            assert.match(text(), /-707/); assert.match(text(), /\+83/);
            assert.equal(box.querySelectorAll('[data-full-report-table] table')[0].tBodies[0].rows.length, 16);
            set('metric', 'completed'); set('region', '대구'); submit(); assert.match(text(), /대구 · 1위/);
            set('metric', 'share'); set('region', '세종'); submit(); assert.match(text(), /100%/);
            set('region', '경기'); set('metric', 'total'); submit();
        }
        if (['irp', 'unsold'].includes(type)) {
            const detail = box.querySelector('[data-full-report-table]');
            assert.equal(w.getComputedStyle(detail).overflowX, 'auto');
            assert.equal(w.getComputedStyle(detail.querySelector('table')).minWidth, '680px', 'ranking numbers must not collapse into digit-per-line columns on narrow screens');
        }
        for (const id of ['downloadImgBtn', 'downloadPdfBtn', 'sharePngBtn']) { d.getElementById(id).click(); await settle(); }
        assert.deepEqual(downloads.map(x => x.type), ['image/png', 'application/pdf']); assert.equal(shares.length, 1); assert.deepEqual(alerts, []);
        w.navigator.canShare = () => false; d.getElementById('sharePngBtn').click(); await settle(); assert.equal(downloads.length, 3); assert.match(alerts.pop(), /공유를 지원하지 않아/);
        // Empty errors collapse; native-invalid and all edits invalidate the old result.
        form.dispatchEvent(new w.Event('invalid', { bubbles: true })); assert.equal(isVisible(), false); checkError(true);
        await settle(); assert.deepEqual(errors, []); dom.window.close();
    }
    console.log('CONTRIBUTION_COMPARISON_DOM_VALID pages=4 conditions, hidden notices, result freshness, ranking tables, PNG/PDF/share');
})().catch(error => { console.error(error); process.exitCode = 1; });
