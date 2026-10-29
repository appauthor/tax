// Optional browser-DOM QA with a temporary jsdom installation.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require(process.argv[2] || 'jsdom');
const root = path.resolve(__dirname, '..');
const settle = () => new Promise(resolve => setImmediate(resolve));

async function run() {
    const dom = new JSDOM(fs.readFileSync(path.join(root, 'xirr-calculator.html'), 'utf8'), { runScripts: 'outside-only', url: 'https://www.taxyou.co.kr/xirr-calculator.html' });
    const w = dom.window, d = w.document, downloads = [], shares = [], pdfSettings = [], imageCompressions = [];
    const stylesheet = d.createElement('style');
    stylesheet.textContent = fs.readFileSync(path.join(root, 'style.css'), 'utf8');
    d.head.appendChild(stylesheet);
    w.HTMLElement.prototype.scrollIntoView = function () {};
    w.alert = message => assert.match(message, /이 브라우저에서는 파일 공유를 지원하지 않아 PNG 파일로 저장합니다/);
    w.html2canvas = async element => {
        assert.equal(element.id, 'captureArea');
        assert.match(element.textContent, /XIRR/);
        assert.match(element.textContent, /37.3363%/);
        return { width: 900, height: 3600, toBlob: cb => cb(new w.Blob(['png'], { type: 'image/png' })), toDataURL: () => 'data:image/png;base64,cG5n' };
    };
    w.jspdf = { jsPDF: class {
        constructor(options) { pdfSettings.push(options); this.pages = 1; this.internal = { pageSize: { getWidth: () => 210, getHeight: () => 297 } }; }
        addImage(...args) { imageCompressions.push(args[7]); }
        addPage() { this.pages++; }
        output() { assert.ok(this.pages > 1); return new w.Blob(['pdf'], { type: 'application/pdf' }); }
    } };
    w.navigator.canShare = () => true;
    w.navigator.share = async data => shares.push(data);
    for (const script of d.querySelectorAll('script[src^="scripts/"]')) w.eval(fs.readFileSync(path.join(root, script.getAttribute('src').split('?')[0]), 'utf8'));
    w.downloadBlob = (blob, name) => downloads.push({ blob, name });
    await new Promise(resolve => d.addEventListener('DOMContentLoaded', resolve, { once: true }));
    const get = id => d.getElementById(id);
    const set = (id, value) => {
        const element = get(id);
        if (element.type === 'checkbox') element.checked = value; else element.value = value;
        element.dispatchEvent(new w.Event('input', { bubbles: true }));
        element.dispatchEvent(new w.Event('change', { bubbles: true }));
    };
    const submit = () => get('xirrForm').dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true }));
    assert.equal(d.querySelectorAll('#resultBox').length, 1);
    assert.equal(get('xirrFlows').children.length, 2);
    assert.equal(get('xirrTerminalDate').disabled, true);
    assert.equal(get('xirrError').hidden, true);
    assert.equal(w.getComputedStyle(get('xirrError')).display, 'none');
    submit();
    assert.equal(get('xirrError').textContent, '');
    assert.equal(get('xirrError').hidden, true);
    assert.match(get('resultTableBody').textContent, /10%/);
    assert.equal(get('resultBox').style.display, 'block');
    assert.equal(d.activeElement, get('resultBox'));
    set('xirrAmount1', '');
    assert.equal(get('resultBox').style.display, 'none');
    assert.equal(get('xirrForm').checkValidity(), false);
    assert.equal(get('xirrError').hidden, false, 'native validation reveals the notice');
    submit();
    assert.match(get('xirrError').textContent, /금액/);
    assert.equal(get('xirrError').hidden, false);
    assert.equal(w.getComputedStyle(get('xirrError')).display, 'inline-flex');
    assert.equal(d.activeElement, get('xirrError'));
    set('xirrAmount1', '1000000');
    assert.equal(get('xirrError').hidden, true, 'editing clears and hides the notice');
    assert.equal(w.getComputedStyle(get('xirrError')).display, 'none');
    get('xirrAddRow').click();
    assert.equal(get('xirrFlows').children.length, 3);
    assert.equal(d.activeElement.id, 'xirrDate3');
    get('xirrFlows').lastElementChild.querySelector('button').click();
    assert.equal(get('xirrFlows').children.length, 2);
    set('xirrUseTerminal', true);
    assert.equal(get('xirrTerminalDate').disabled, false);
    assert.equal(get('xirrTerminalConfirmed').required, true);
    set('xirrTerminalDate', '2025-12-31'); set('xirrTerminalAmount', '100');
    submit(); assert.match(get('xirrError').textContent, /중복/);
    set('xirrTerminalConfirmed', true);
    submit(); assert.match(get('xirrError').textContent, /평가일/);
    set('xirrTerminalDate', '2026-01-01'); set('xirrTerminalAmount', '100000');
    submit(); assert.equal(get('xirrError').textContent, '');
    assert.match(get('resultTableBody').textContent, /20%/);
    set('xirrUseTerminal', false);
    assert.equal(get('xirrTerminalFields').hidden, true);
    assert.equal(get('xirrTerminalDate').disabled, true);
    submit(); assert.match(get('resultTableBody').textContent, /10%/);
    const before = get('xirrFlows').innerHTML;
    set('xirrPaste', '2025-02-29,-100'); get('xirrApplyPaste').click();
    assert.equal(get('xirrFlows').innerHTML, before, 'invalid paste preserves current rows');
    assert.equal(get('resultBox').style.display, 'none');
    set('xirrPaste', '2021-01-01\t-100\n2022-01-01\t230\n2023-01-01\t-132');
    get('xirrApplyPaste').click(); submit();
    assert.equal(get('xirrFlows').children.length, 3);
    assert.match(get('resultTableBody').textContent, /단일 수익률 확정 불가/);
    assert.match(get('resultTableBody').textContent, /10% \/ 20%/);
    assert.match(get('resultNotice').textContent, /모든 해를 보장하지/);
    assert.match(get('xirrAudit').textContent, /2021-01-01/);
    assert.equal(get('captureArea').querySelector('details'), null, 'collapsed audit is outside the exported report');
    get('xirrExample').click(); submit();
    assert.equal(get('xirrFlows').children.length, 5);
    assert.equal(get('xirrCurrency').value, 'USD');
    assert.match(get('resultTableBody').textContent, /37.3363%/);
    assert.match(get('resultTableBody').textContent, /2,086.65 달러/);
    for (const button of ['downloadImgBtn', 'downloadPdfBtn', 'sharePngBtn']) { get(button).click(); await settle(); }
    assert.deepEqual(downloads.map(row => row.blob.type), ['image/png', 'application/pdf']);
    assert.equal(pdfSettings[0].compress, true);
    assert.ok(imageCompressions.every(mode => mode === 'FAST'));
    delete get('captureArea').dataset.pdfCompression;
    get('downloadPdfBtn').click(); await settle();
    assert.equal(pdfSettings[1].compress, false, 'other reports preserve the default PDF behavior');
    assert.equal(imageCompressions.at(-1), 'NONE');
    assert.equal(shares.length, 1);
    assert.equal(shares[0].files[0].type, 'image/png');
    w.navigator.canShare = () => false;
    get('sharePngBtn').click(); await settle();
    assert.equal(downloads.length, 4);
    get('xirrClear').click();
    assert.equal(get('xirrFlows').children.length, 1);
    assert.equal(get('xirrUseTerminal').checked, false);
    assert.equal(get('resultBox').style.display, 'none');
    assert.equal(get('xirrPasteStatus').textContent, '');
    assert.equal(get('xirrPaste').value, '');
    const faq = Array.from(d.querySelectorAll('.faq-list details'), detail => [detail.querySelector('summary').textContent, detail.querySelector('p').textContent]);
    const schema = Array.from(d.querySelectorAll('script[type="application/ld+json"]'), tag => JSON.parse(tag.textContent)).find(row => row['@type'] === 'FAQPage');
    assert.deepEqual(schema.mainEntity.map(row => [row.name, row.acceptedAnswer.text]), faq);
    for (const control of d.querySelectorAll('input[id], select[id], textarea[id]')) assert.ok(d.querySelector(`label[for="${control.id}"]`) || control.closest('label'), control.id);
    dom.window.close();
    console.log('XIRR_DOM_EXPORT_VALID');
}
run().catch(error => { console.error(error); process.exitCode = 1; });
