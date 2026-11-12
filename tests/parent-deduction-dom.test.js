// Optional integration: node tests/parent-deduction-dom.test.js /absolute/path/to/jsdom
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM, VirtualConsole } = require(process.argv[2] || 'jsdom');
const root = path.resolve(__dirname, '..');
const settle = () => new Promise(resolve => setImmediate(resolve));
(async () => {
    const errors = [], downloads = [], shares = [], alerts = [];
    const virtualConsole = new VirtualConsole();
    virtualConsole.on('jsdomError', e => errors.push(e.message));
    const dom = new JSDOM(fs.readFileSync(path.join(root, 'parent-deduction-calculator.html'), 'utf8'), {
        runScripts: 'outside-only', url: 'https://www.taxyou.co.kr/parent-deduction-calculator.html', pretendToBeVisual: true, virtualConsole
    });
    const w = dom.window, d = w.document;
    const style = d.createElement('style'); style.textContent = fs.readFileSync(path.join(root, 'style.css'), 'utf8'); d.head.append(style);
    w.HTMLElement.prototype.scrollIntoView = () => {};
    w.alert = message => alerts.push(message);
    w.console.error = error => errors.push(error.message);
    w.html2canvas = async element => {
        assert.equal(element.id, 'captureArea');
        assert.equal(element.querySelector('#repTitle').innerText, '부모님 인적공제 확인 결과');
        assert.match(element.textContent, /판정/);
        assert.ok(element.querySelectorAll('tbody tr').length > 10);
        return { width: 900, height: 2600, toBlob: cb => cb(new w.Blob(['png'], { type: 'image/png' })), toDataURL: () => 'data:image/png;base64,cG5n' };
    };
    w.jspdf = { jsPDF: class {
        constructor() { this.internal = { pageSize: { getWidth: () => 210, getHeight: () => 297 } }; }
        addImage() {} addPage() {} output() { return new w.Blob(['pdf'], { type: 'application/pdf' }); }
    } };
    w.navigator.canShare = () => true; w.navigator.share = async data => shares.push(data);
    for (const script of d.querySelectorAll('script[src^="scripts/"]')) w.eval(fs.readFileSync(path.join(root, script.getAttribute('src').split('?')[0]), 'utf8'));
    w.downloadBlob = (blob, name) => downloads.push({ type: blob.type, name });
    await new Promise(resolve => d.addEventListener('DOMContentLoaded', resolve, { once: true })); await settle();
    const get = id => d.getElementById(id), form = get('parentDeductionForm');
    const set = (id, value) => {
        const e = get(id);
        if (e.type === 'checkbox') e.checked = value; else e.value = String(value);
        e.dispatchEvent(new w.Event('input', { bubbles: true })); e.dispatchEvent(new w.Event('change', { bubbles: true }));
    };
    const submit = () => form.dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true }));
    const text = () => get('resultTableBody').textContent;
    const shown = () => get('resultBox').style.display === 'block';
    const errorHidden = hidden => {
        assert.equal(get('parentError').hidden, hidden);
        assert.equal(w.getComputedStyle(get('parentError')).display === 'none', hidden, 'empty notices must not occupy layout space');
    };
    errorHidden(true);
    for (const field of form.querySelectorAll('input, select')) assert.ok(field.labels.length, field.id);
    for (const id of ['parentPensionAmount', 'parentSalary', 'parentOther', 'parentRetirement', 'parentCapital']) assert.equal(get(id).disabled, true);
    assert.equal(d.querySelectorAll('#resultBox').length, 1);
    set('parentBirthYear', 1960); assert.ok(form.checkValidity(), 'hidden required fields must not block submission');
    submit(); assert.ok(shown()); assert.match(text(), /추가 확인 필요/); assert.match(text(), /미확인/);
    set('parentPensionMode', 'taxable'); assert.equal(shown(), false); assert.equal(form.checkValidity(), false);
    assert.equal(get('parentPensionAmount').disabled, false); assert.notEqual(w.getComputedStyle(get('parentPensionGroup')).display, 'none');
    set('parentPensionAmount', 5000000); set('parentIncomeMode', 'none'); set('parentSupport', 'yes'); set('parentDuplicate', 'no');
    submit(); assert.equal(get('parentError').textContent, ''); errorHidden(true); assert.ok(shown()); assert.equal(d.activeElement, get('resultBox'));
    assert.match(text(), /입력 기준 공제 가능/); assert.match(text(), /900,000 원/); assert.match(text(), /1,500,000 원/);
    for (const id of ['downloadImgBtn', 'downloadPdfBtn', 'sharePngBtn']) { get(id).click(); await settle(); }
    assert.deepEqual(downloads.map(x => x.type), ['image/png', 'application/pdf']); assert.equal(shares.length, 1);
    assert.equal(shares[0].files[0].type, 'image/png'); assert.deepEqual(alerts, []);
    w.navigator.canShare = () => false; get('sharePngBtn').click(); await settle(); assert.equal(downloads.length, 3); assert.match(alerts.pop(), /공유를 지원하지 않아/); assert.deepEqual(alerts, []);
    set('parentPensionAmount', 5166667); submit(); assert.match(text(), /입력 기준 공제 불가/); assert.match(text(), /1,000,000.2 원/);
    set('parentPensionMode', 'net'); assert.match(get('parentPensionAmountLabel').textContent, /연금소득금액/);
    set('parentPensionAmount', 900000); submit(); assert.match(text(), /입력 기준 공제 가능/); assert.doesNotMatch(text(), /과세대상 총연금액/);
    set('parentPensionMode', 'exempt'); set('parentIncomeMode', 'salary'); set('parentSalary', 5000000); submit(); assert.match(text(), /입력 기준 공제 가능/);
    set('parentPensionMode', 'taxable'); set('parentPensionAmount', 5000000); submit(); assert.match(text(), /입력 기준 공제 불가/);
    set('parentIncomeMode', 'mixed');
    for (const id of ['parentOther', 'parentRetirement', 'parentCapital']) assert.equal(get(id).disabled, false);
    set('parentSalary', 0); set('parentRetirement', 200000); submit(); assert.match(text(), /1,100,000 원/);
    set('parentIncomeMode', 'none'); assert.equal(get('parentRetirement').disabled, true); submit(); assert.match(text(), /입력 기준 공제 가능/);
    set('parentBirthYear', 1956); set('parentDisability', 'yes'); submit(); assert.match(text(), /4,500,000 원/);
    set('parentDuplicate', 'yes'); submit(); assert.match(text(), /입력 기준 공제 불가/); assert.match(get('formulaContent').textContent, /중복/);
    set('parentDuplicate', 'no'); set('parentSpecialCase', true); submit(); assert.match(text(), /추가 확인 필요/);
    set('parentSpecialCase', false); set('parentPensionMode', 'unknown'); submit(); assert.match(text(), /추가 확인 필요/);
    set('parentIncomeMode', 'unknown'); submit(); assert.match(text(), /근로소득금액 · 총급여에서 공제 후미확인/);
    set('parentPensionMode', 'taxable'); get('parentPensionAmount').value = '-1'; submit(); assert.equal(shown(), false); assert.match(get('parentError').textContent, /숫자/); assert.equal(d.activeElement, get('parentError'));
    errorHidden(false);
    set('parentPensionAmount', 5000000); errorHidden(true);
    submit(); errorHidden(true); assert.ok(shown());
    set('parentPensionAmount', ''); submit(); assert.equal(shown(), false); assert.match(get('parentError').textContent, /빈칸/);
    set('parentPensionAmount', 5000000); set('parentIncomeMode', 'none'); submit(); assert.ok(shown());
    set('parentBirthYear', ''); assert.equal(shown(), false); assert.equal(form.checkValidity(), false); submit(); assert.match(get('parentError').textContent, /출생연도/);
    await settle(); assert.deepEqual(errors, []); dom.window.close();
    console.log('PARENT_DEDUCTION_DOM_VALID conditional inputs, evidence, eligibility, validation, stale results and PNG/PDF/share');
})().catch(error => { console.error(error); process.exitCode = 1; });
