// Run with a temporary jsdom installation; no production dependency is needed.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require(process.argv[2] || 'jsdom');
const root = path.resolve(__dirname, '..');
const settle = () => new Promise(resolve => setImmediate(resolve));
async function open(file) {
    const dom = new JSDOM(fs.readFileSync(path.join(root, file), 'utf8'), { runScripts: 'outside-only', url: `https://www.taxyou.co.kr/${file}` });
    const w = dom.window, d = w.document, downloads = [], shares = [], errors = [];
    w.HTMLElement.prototype.scrollIntoView = function () {};
    w.alert = () => {};
    w.console.error = error => errors.push(error);
    w.html2canvas = async (element, options) => {
        assert.equal(element.id, 'captureArea');
        assert.ok(element.querySelector('tbody tr'));
        if (element.querySelector('[data-full-report-table]')) {
            assert.ok(options.scale > 0 && options.scale <= 4);
            assert.equal(typeof options.onclone, 'function');
            const cloned = d.cloneNode(true);
            options.onclone(cloned);
            assert.equal(cloned.querySelector('[data-full-report-table]').style.maxHeight, 'none');
            assert.equal(cloned.querySelector('#captureArea').style.width, '900px');
            assert.equal(element.querySelector('[data-full-report-table]').style.maxHeight, '', 'export must not change visible layout');
        }
        return { width: 900, height: 3600, toBlob: cb => cb(new w.Blob(['png'], { type: 'image/png' })), toDataURL: () => 'data:image/png;base64,cG5n' };
    };
    w.jspdf = { jsPDF: class {
        constructor() { this.pages = 1; this.internal = { pageSize: { getWidth: () => 210, getHeight: () => 297 } }; }
        addImage() {}
        addPage() { this.pages++; }
        output() { assert.ok(this.pages > 1); return new w.Blob(['pdf'], { type: 'application/pdf' }); }
    } };
    w.navigator.canShare = () => true;
    w.navigator.share = async data => shares.push(data);
    for (const script of d.querySelectorAll('script[src^="scripts/"]')) w.eval(fs.readFileSync(path.join(root, script.getAttribute('src')), 'utf8'));
    w.downloadBlob = (blob, name) => downloads.push({ blob, name });
    await new Promise(resolve => d.addEventListener('DOMContentLoaded', resolve, { once: true }));
    const get = id => d.getElementById(id);
    const set = (id, value) => {
        const el = get(id);
        if (el.type === 'checkbox') el.checked = value; else el.value = value;
        el.dispatchEvent(new w.Event('input', { bubbles: true }));
        el.dispatchEvent(new w.Event('change', { bubbles: true }));
    };
    const submit = () => d.querySelector('form').dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true }));
    return { dom, w, d, get, set, submit, downloads, shares, errors };
}
async function run() {
    for (const [file, field] of [['year-end-tax-calculator.html', 'year_gross'], ['national-pension-calculator.html', 'pension_monthly'], ['savings-rate-rank.html', 'savingsAmount']]) {
        const a = await open(file), { get, set, submit, d, w } = a;
        assert.equal(d.querySelectorAll('#resultBox').length, 1);
        submit();
        assert.equal(get('planningError').textContent, '');
        assert.equal(get('resultBox').style.display, 'block');
        assert.equal(d.activeElement, get('resultBox'));
        assert.ok(get('resultNotice').textContent.length > 30);
        for (const button of ['downloadImgBtn', 'downloadPdfBtn', 'sharePngBtn']) { get(button).click(); await settle(); }
        assert.deepEqual(a.downloads.map(x => x.blob.type), ['image/png', 'application/pdf']);
        assert.equal(a.shares.length, 1);
        assert.equal(a.shares[0].files[0].type, 'image/png');
        w.navigator.canShare = () => false;
        get('sharePngBtn').click(); await settle();
        assert.equal(a.downloads.length, 3);
        const initial = get(field).value;
        set(field, '');
        assert.equal(get('resultBox').style.display, 'none');
        assert.equal(d.querySelector('form').checkValidity(), false);
        submit();
        assert.ok(get('planningError').textContent.length);
        assert.equal(d.activeElement, get('planningError'));
        set(field, initial);
        if (file.startsWith('year')) {
            submit(); assert.match(get('resultTableBody').textContent, /90,750/);
            set('yearMode', 'standard'); submit();
            assert.match(get('resultTableBody').textContent, /표준세액공제/);
            set('year_gross', '0'); submit();
            assert.match(get('resultTableBody').textContent, /3,300,000/);
        } else if (file.startsWith('national')) {
            submit(); assert.match(get('resultTableBody').textContent, /요건 미확인/);
            set('pension_noIncome', true); submit();
            assert.match(get('resultTableBody').textContent, /76세 8개월/);
            assert.equal(get('formulaContent').querySelectorAll('tbody tr').length, 21);
            set('pension_insuredMonths', '119'); submit();
            assert.match(get('planningError').textContent, /120개월/);
        } else {
            assert.equal(get('savingsConfirmMaximum').disabled, true);
            assert.equal(w.getComputedStyle(get('savingsMaximumGroup')).display, 'none');
            set('savingsRateMode', 'maximum');
            assert.equal(get('savingsConfirmMaximum').disabled, false);
            submit(); assert.match(get('planningError').textContent, /우대조건/);
            set('savingsConfirmMaximum', true); submit();
            assert.equal(get('planningError').textContent, '');
            set('savingsRateMode', 'base');
            assert.equal(get('savingsConfirmMaximum').checked, false);
            set('savingsKind', 'installment');
            assert.equal(get('savingsAmount').value, '300,000');
            assert.equal(get('savingsAmountLabel').textContent, '월 납입액');
            submit(); assert.equal(get('planningError').textContent, '');
            for (const months of ['6', '24']) { set('savingsMonths', months); submit(); assert.equal(get('planningError').textContent, ''); }
            set('savingsQuery', '<img src=x onerror=alert(1)>'); submit();
            assert.match(get('planningError').textContent, /상품이 없습니다/);
            assert.equal(get('resultBox').style.display, 'none');
            set('savingsQuery', '');
            const snapshot = w.SavingsRankData;
            w.SavingsRankData = { ...snapshot, collectedAt: '2020-01-01T00:00:00Z' };
            submit(); assert.match(get('resultTableBody').textContent, /과거 자료/);
            w.SavingsRankData = undefined;
            submit(); assert.match(get('planningError').textContent, /불러오지 못했습니다/);
        }
        assert.deepEqual(a.errors, []);
        a.dom.window.close();
    }
    console.log('PLANNING_DOM_VALID forms exports stale-data errors');
}
run().catch(error => { console.error(error); process.exitCode = 1; });
