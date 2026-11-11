// Optional: node tests/real-estate-dom.test.js /absolute/path/to/jsdom
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM, VirtualConsole } = require(process.argv[2] || 'jsdom');
const root = path.resolve(__dirname, '..');
const settle = () => new Promise(resolve => setImmediate(resolve));

async function load(file) {
    const errors = [], alerts = [], downloads = [], shares = [];
    const virtualConsole = new VirtualConsole();
    virtualConsole.on('jsdomError', error => errors.push(error.message));
    const dom = new JSDOM(fs.readFileSync(path.join(root, file), 'utf8'), {
        url: `https://www.taxyou.co.kr/${file}`, runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole
    });
    const w = dom.window, d = w.document;
    w.HTMLElement.prototype.scrollIntoView = () => {};
    w.alert = text => alerts.push(text);
    w.fetch = async () => ({ ok: false, json: async () => ({}) });
    w.daum = { Postcode: function (config) { this.open = () => config.oncomplete({ address: '서울특별시 강서구 테스트로 1', sido: '서울', sigungu: '강서구' }); } };
    w.html2canvas = async element => {
        assert.equal(element.id, 'captureArea');
        assert.ok(element.querySelector('#resultTableBody').textContent.trim());
        return { width: 900, height: 1800, toBlob: cb => cb(new w.Blob(['png'], { type: 'image/png' })), toDataURL: () => 'data:image/png;base64,cG5n' };
    };
    w.jspdf = { jsPDF: class {
        constructor() { this.internal = { pageSize: { getWidth: () => 210, getHeight: () => 297 } }; }
        addImage() {} addPage() {}
        output() { return new w.Blob(['pdf'], { type: 'application/pdf' }); }
    } };
    w.navigator.canShare = () => true;
    w.navigator.share = async data => shares.push(data);
    for (const script of d.querySelectorAll('script[src^="scripts/"]')) {
        w.eval(fs.readFileSync(path.join(root, script.getAttribute('src').split('?')[0]), 'utf8'));
    }
    w.downloadBlob = (blob, name) => downloads.push({ type: blob.type, name });
    await new Promise(resolve => d.addEventListener('DOMContentLoaded', resolve, { once: true }));
    await settle();
    assert.deepEqual(errors, [], `${file}: initialization`);
    const get = id => d.getElementById(id);
    const set = (id, value) => {
        const el = get(id); assert.ok(el, id);
        if (el.type === 'checkbox') el.checked = value; else el.value = String(value);
        el.dispatchEvent(new w.Event('input', { bubbles: true }));
        el.dispatchEvent(new w.Event('change', { bubbles: true }));
    };
    const text = () => get('resultTableBody').textContent;
    const visible = () => get('resultBox').style.display === 'block';
    async function exports() {
        assert.ok(visible());
        for (const id of ['downloadImgBtn', 'downloadPdfBtn', 'sharePngBtn']) assert.ok(get(id));
        await w.downloadReportImage(new w.Event('click'));
        await settle();
        await w.downloadReportPdf(new w.Event('click'));
        await settle();
        await w.shareReportPng(new w.Event('click'));
        await settle();
        assert.deepEqual(downloads.map(x => x.type), ['image/png', 'application/pdf']);
        assert.equal(shares.length, 1);
        assert.equal(shares[0].files[0].type, 'image/png');
        assert.deepEqual(errors, [], `${file}: calculation/export`);
    }
    return { dom, w, get, set, text, visible, exports, alerts };
}

(async () => {
    const acq = await load('acquisition-tax.html');
    acq.set('acquisitionPrice', 800000000); acq.set('acquisitionType', 'standard');
    acq.w.calculateAcquisitionTax();
    assert.match(acq.text(), /20,504,000/);
    acq.w.searchAcquisitionAddress();
    assert.match(acq.get('acquisitionAddress').value, /강서구/);
    assert.doesNotMatch(acq.get('acquisition_area_info').textContent, /지역 아님|비조정대상지역/);
    acq.set('acquisitionType', 'second'); acq.set('acquisitionArea', 'over85');
    assert.equal(acq.visible(), false, 'edited rates hide the previous result');
    acq.w.calculateAcquisitionTax(); assert.match(acq.text(), /72,000,000/);
    acq.set('acquisitionType', 'third'); acq.w.calculateAcquisitionTax(); assert.match(acq.text(), /107,200,000/);
    acq.set('acquisitionPrice', ''); acq.w.calculateAcquisitionTax(); assert.equal(acq.visible(), false);
    assert.match(acq.alerts.pop(), /취득가액/);
    acq.set('acquisitionPrice', 800000000); acq.w.calculateAcquisitionTax(); await acq.exports(); acq.dom.window.close();

    const sale = await load('transfer-tax.html');
    for (const [id, v] of Object.entries({ transferSalePrice: 2000000000, transferPurchasePrice: 1000000000,
        transferHoldYears: 15, transferResidenceYears: 0, transferHouseType: 'multi2', transferDate: '2026-11-11' })) sale.set(id, v);
    assert.equal(sale.get('transferSurchargeFields').hidden, false);
    sale.w.calculateTransferTax(); assert.match(sale.text(), /582,510,000/);
    sale.set('transferDate', '2026-05-09'); sale.w.calculateTransferTax(); assert.match(sale.text(), /257,010,000/);
    sale.set('transferDate', '2026-05-10'); sale.w.calculateTransferTax(); assert.match(sale.text(), /582,510,000/);
    sale.set('transferSurchargeExclusion', 'confirmed'); sale.w.calculateTransferTax(); assert.match(sale.text(), /257,010,000/);
    sale.set('transferHouseType', 'general'); sale.set('transferBasicDeduction', 0); sale.w.calculateTransferTax();
    assert.match(sale.text(), /258,060,000/);
    sale.set('transferHouseType', 'oneHome');
    assert.equal(sale.get('transferSurchargeExclusion').disabled, true);
    assert.equal(sale.get('transferOneHomeFields').hidden, false);
    sale.w.calculateTransferTax(); assert.equal(sale.visible(), false); assert.match(sale.alerts.pop(), /요건 확인/);
    sale.set('transferOneHomeConfirmed', true); sale.set('transferHoldYears', 10); sale.w.calculateTransferTax();
    assert.match(sale.text(), /장기보유특별공제 \(20%\)/);
    sale.set('transferResidenceYears', 10); sale.w.calculateTransferTax(); assert.match(sale.text(), /장기보유특별공제 \(80%\)/);
    sale.set('transferResidenceYears', 11); sale.w.calculateTransferTax(); assert.equal(sale.visible(), false);
    assert.match(sale.alerts.pop(), /보유기간/);
    sale.set('transferResidenceYears', 0); sale.set('transferHouseType', 'general'); sale.set('transferHoldYears', 0.5);
    sale.w.calculateTransferTax(); assert.match(sale.text(), /단기 보유 70%/);
    sale.set('transferDate', '2027-01-01'); sale.w.calculateTransferTax(); assert.equal(sale.visible(), false);
    assert.match(sale.alerts.pop(), /2026/);
    sale.set('transferDate', '2026-11-11'); sale.w.calculateTransferTax(); await sale.exports(); sale.dom.window.close();

    const property = await load('holding-tax.html');
    property.set('gongsi_1', 600000000); property.set('propertyTaxOneHome', 'yes');
    property.set('propertyTaxUrbanArea', 'yes'); property.w.calculateHoldingTax(); assert.match(property.text(), /787,200/);
    property.set('previousTaxBase_1', 200000000); property.w.calculateHoldingTax(); assert.match(property.text(), /246,400/);
    property.w.addHouse(); property.set('gongsi_2', 600000000); property.w.calculateHoldingTax();
    assert.match(property.get('formulaContent').textContent, /일반 주택/);
    property.w.removeHouse(2); property.set('previousTaxBase_1', '');
    const joint = property.dom.window.document.querySelector('input[name="owner_type_1"][value="joint55"]');
    joint.checked = true; property.w.calculateHoldingTax(); assert.match(property.text(), /393,600/);
    await property.exports(); property.dom.window.close();

    const comp = await load('comprehensive-real-estate-tax-calculator.html');
    comp.set('comprehensiveTaxType', 'one-home'); comp.set('comprehensivePublicPrice', 1500000000);
    comp.w.calculateComprehensiveRealEstateTax(); assert.equal(comp.visible(), false); assert.match(comp.alerts.pop(), /재산세 본세/);
    comp.set('comprehensiveCurrentPropertyTax', 2070000); comp.w.calculateComprehensiveRealEstateTax();
    assert.match(comp.text(), /324,000/); assert.match(comp.get('formulaContent').textContent, /45%/);
    comp.set('comprehensiveAge', -1); comp.w.calculateComprehensiveRealEstateTax();
    assert.equal(comp.visible(), false); assert.match(comp.alerts.pop(), /0~120세/);
    comp.set('comprehensiveAge', 0);
    comp.set('confirmedPropertyTaxCredit', 100000); comp.w.calculateComprehensiveRealEstateTax(); assert.match(comp.text(), /100,000/);
    comp.set('comprehensiveTaxType', 'general'); comp.set('comprehensiveHomeCount', 2); comp.set('confirmedPropertyTaxCredit', '');
    comp.w.calculateComprehensiveRealEstateTax(); assert.equal(comp.visible(), false); assert.match(comp.alerts.pop(), /여러 주택/);
    comp.set('confirmedPropertyTaxCredit', 0); comp.w.calculateComprehensiveRealEstateTax(); assert.ok(comp.visible());
    comp.set('comprehensiveCurrentPropertyTax', ''); comp.set('previousPropertyTaxEquivalent', 1000000);
    comp.w.calculateComprehensiveRealEstateTax(); assert.equal(comp.visible(), false); assert.match(comp.alerts.pop(), /당해 연도/);
    comp.set('previousPropertyTaxEquivalent', ''); comp.set('comprehensivePublicPrice', 900000000); comp.set('confirmedPropertyTaxCredit', '');
    comp.w.calculateComprehensiveRealEstateTax(); assert.ok(comp.visible(), 'no tax needs no property credit inputs');
    comp.set('comprehensivePublicPrice', 1500000000); comp.set('confirmedPropertyTaxCredit', 0);
    comp.w.calculateComprehensiveRealEstateTax(); await comp.exports(); comp.dom.window.close();
    console.log('REAL_ESTATE_DOM_VALID pages=4 official examples, conditions, validation, property shares and PNG/PDF/share paths');
})().catch(error => { console.error(error); process.exitCode = 1; });
