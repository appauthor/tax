// Optional DOM integration check. Pass a temporary jsdom installation path as argv[2].
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require(process.argv[2] || 'jsdom');
const root = path.resolve(__dirname, '..');
const settle = () => new Promise(resolve => setImmediate(resolve));

async function openCalculator(key) {
    const html = fs.readFileSync(path.join(root, `${key}-calculator.html`), 'utf8');
    const dom = new JSDOM(html, { runScripts: 'outside-only', url: `https://www.taxyou.co.kr/${key}-calculator.html` });
    const w = dom.window, d = w.document, alerts = [], downloads = [], shares = [], captures = [];
    w.HTMLElement.prototype.scrollIntoView = function () {};
    w.alert = message => alerts.push(message);
    w.console.error = error => { throw error; };
    w.html2canvas = async element => {
        assert.equal(element.id, 'captureArea');
        assert.ok(element.querySelectorAll('tbody tr').length > 0);
        captures.push(element.textContent);
        return { width: 800, height: 2200, toBlob: callback => callback(new w.Blob(['png'], { type: 'image/png' })), toDataURL: () => 'data:image/png;base64,cG5n' };
    };
    w.jspdf = { jsPDF: class {
        constructor() { this.pages = 1; this.internal = { pageSize: { getWidth: () => 210, getHeight: () => 297 } }; }
        addImage() {}
        addPage() { this.pages++; }
        output() { assert.ok(this.pages > 1, 'long reports continue on multiple PDF pages'); return new w.Blob(['pdf'], { type: 'application/pdf' }); }
    } };
    w.navigator.canShare = () => true;
    w.navigator.share = async data => shares.push(data);
    for (const script of d.querySelectorAll('script[src^="scripts/"]')) {
        w.eval(fs.readFileSync(path.join(root, script.getAttribute('src')), 'utf8'));
    }
    w.downloadBlob = (blob, name) => downloads.push({ type: blob.type, name });
    await new Promise(resolve => d.addEventListener('DOMContentLoaded', resolve, { once: true }));
    const get = id => { const node = d.getElementById(id); assert.ok(node, `${key}: missing #${id}`); return node; };
    const form = d.querySelector('form');
    function set(id, val) {
        const input = get(id);
        if (input.type === 'checkbox') input.checked = val;
        else input.value = val;
        input.dispatchEvent(new w.Event('input', { bubbles: true }));
        input.dispatchEvent(new w.Event('change', { bubbles: true }));
    }
    function submit() { assert.ok(form.checkValidity(), `${key}: native form validity`); form.dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true })); }
    function visible(id, expected) {
        assert.equal(get(id).disabled, !expected, `${key}: ${id} native validation eligibility`);
        assert.equal(get(id).closest('.form-group').classList.contains('is-hidden'), !expected, `${key}: ${id} visibility`);
    }
    return { dom, w, d, get, set, submit, visible, alerts, downloads, shares, captures };
}

async function run() {
    const defaults = {
        'weekly-holiday-pay': ['41,280', 'weeklyHourly'],
        'unemployment-benefit': ['11,888,640', 'unemploymentWages'],
        'annual-leave': ['1,148,325', 'leaveWageAmount'],
        'parental-leave-benefit': ['23,100,000', 'parentalWage'],
        'earned-income-credit': ['1,524,000', 'creditOwnPay']
    };
    for (const [key, [expected, moneyId]] of Object.entries(defaults)) {
        const app = await openCalculator(key);
        const { dom, w, d, get, set, submit, visible, alerts, downloads, shares, captures } = app;
        assert.equal(d.querySelectorAll('#resultBox').length, 1);
        submit();
        assert.deepEqual(alerts, [], `${key}: default submission`);
        assert.equal(get('resultBox').style.display, 'block');
        assert.match(get('resultTableBody').textContent, new RegExp(expected));
        assert.ok(get('resultNotice').textContent.length > 30);
        assert.ok(get('formulaContent').textContent.length > 30);
        assert.equal(d.activeElement, get('resultBox'), 'results receive keyboard focus');
        assert.equal(d.querySelector('#resultBox th').textContent, '계산 항목');

        get('downloadImgBtn').click(); await settle();
        get('downloadPdfBtn').click(); await settle();
        get('sharePngBtn').click(); await settle();
        assert.deepEqual(downloads.map(item => item.type), ['image/png', 'application/pdf']);
        assert.ok(downloads[0].name.endsWith('.png') && downloads[1].name.endsWith('.pdf'));
        assert.equal(shares.length, 1);
        assert.equal(shares[0].files[0].type, 'image/png');
        assert.equal(captures.length, 3);
        w.navigator.canShare = () => false;
        get('sharePngBtn').click(); await settle();
        assert.equal(downloads.length, 3, 'unsupported sharing falls back to PNG');
        assert.match(alerts.pop(), /PNG/);

        const originalMoney = get(moneyId).value;
        set(moneyId, '');
        assert.equal(get('resultBox').style.display, 'none', 'edited input hides stale result');
        assert.equal(d.querySelector('form').checkValidity(), false, 'blank money blocked by native validation');
        d.querySelector('form').dispatchEvent(new w.Event('submit', { cancelable: true }));
        assert.equal(alerts.length, 1, 'engine also rejects blank money');
        alerts.length = 0;
        set(moneyId, originalMoney);

        if (key === 'weekly-holiday-pay') {
            visible('weeklyWeek1', false); visible('weeklyHours', true);
            set('weeklyHoursMode', 'four-weeks'); visible('weeklyWeek1', true); visible('weeklyHours', false);
            [10,20,10,20].forEach((hours, i) => set(`weeklyWeek${i+1}`, hours));
            submit(); assert.match(get('resultTableBody').textContent, /30,960/);
            set('weeklyWageMode', 'inclusive'); set('weeklyHourly', '12384');
            submit(); assert.match(get('resultTableBody').textContent, /10,320/);
            set('weeklyAttended', false); submit(); assert.match(alerts.pop(), /지급요건/);
        }
        if (key === 'unemployment-benefit') {
            set('unemploymentHours', '4'); set('unemploymentWages', '1000000');
            submit(); assert.match(get('resultTableBody').textContent, /33,024/);
            set('unemploymentDate', '2025-12-31'); submit(); assert.match(alerts.pop(), /2026/);
            set('unemploymentDate', '2026-09-09'); set('unemploymentReason', false);
            submit(); assert.match(get('resultTableBody').textContent, /계산 보류/);
        }
        if (key === 'annual-leave') {
            visible('leaveAccruedDays', false);
            set('leaveMode', 'manual'); visible('leaveHireDate', false); visible('leaveAccruedDays', true);
            set('leaveAccruedDays', 15); set('leaveWageMode', 'hourly');
            visible('leaveMonthlyHours', false); set('leaveWageAmount', '12000');
            submit(); assert.match(get('resultTableBody').textContent, /960,000/);
            set('leaveWageMode', 'daily'); set('leaveWageAmount', '100000');
            submit(); assert.match(get('resultTableBody').textContent, /1,000,000/);
            set('leaveUsedDays', 16); submit(); assert.match(alerts.pop(), /사용 연차/);
        }
        if (key === 'parental-leave-benefit') {
            visible('parentalPartnerWage', false); visible('parentalExtendedEligible', false);
            set('parentalMode', 'shared'); visible('parentalPartnerWage', true); visible('parentalSingleEligible', false);
            set('parentalMonths', 6); set('parentalWage', '5000000'); set('parentalPartnerWage', '5000000');
            submit(); assert.match(alerts.pop(), /특례요건/);
            set('parentalSharedEligible', true); submit(); assert.match(get('resultTableBody').textContent, /40,000,000/);
            set('parentalMonths', 18); visible('parentalExtendedEligible', true);
            submit(); assert.match(alerts.pop(), /연장 요건/);
            set('parentalExtendedEligible', true); submit();
            assert.equal(get('resultTableBody').querySelectorAll('tr').length, 31);
            set('parentalMode', 'single'); visible('parentalPartnerWage', false); visible('parentalSingleEligible', true);
            set('parentalSingleEligible', true); submit(); assert.deepEqual(alerts, []);
        }
        if (key === 'earned-income-credit') {
            visible('creditPartnerPay', false); visible('creditHasDependent', true);
            set('creditHasSpouse', true); visible('creditPartnerPay', true); visible('creditHasDependent', false);
            set('creditPartnerPay', '3000000'); submit(); assert.match(get('resultTableBody').textContent, /맞벌이가구/);
            set('creditHasSpouse', false); set('creditAssets', '180000000'); set('creditApplication', 'late');
            submit(); assert.match(get('resultTableBody').textContent, /723,900/);
            set('creditAssets', '240000000'); submit(); assert.match(get('resultTableBody').textContent, /신청요건.*2억 4천만원/);
        }
        assert.deepEqual(alerts, [], `${key}: no unhandled errors`);
        dom.window.close();
        console.log(`LABOR_DOM_VALID ${key}`);
    }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
