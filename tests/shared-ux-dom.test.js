// Optional integration check: node tests/shared-ux-dom.test.js /absolute/path/to/jsdom
// Reuses the production HTML and scripts; no production dependency is added.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM, VirtualConsole } = require(process.argv[2] || 'jsdom');
const root = path.resolve(__dirname, '..');
const registry = JSON.parse(fs.readFileSync(path.join(root, 'calculator-registry.json')));
const pages = [...registry.categories.flatMap(c => c.calculators), ...registry.rankingCategories.flatMap(c => c.pages)];
const settle = () => new Promise(resolve => setImmediate(resolve));

(async () => {
    for (const { file } of pages) {
        const errors = [];
        const console = new VirtualConsole();
        console.on('jsdomError', error => errors.push(error.message));
        const dom = new JSDOM(fs.readFileSync(path.join(root, file), 'utf8'), {
            url: `https://www.taxyou.co.kr/${file}`, runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole: console
        });
        const w = dom.window, d = w.document;
        w.HTMLElement.prototype.scrollIntoView = () => {};
        w.alert = () => {};
        w.fetch = async () => ({ ok: false, json: async () => ({}) });
        for (const script of d.querySelectorAll('script[src^="scripts/"]')) {
            w.eval(fs.readFileSync(path.join(root, script.getAttribute('src').split('?')[0]), 'utf8'));
        }
        await new Promise(resolve => d.addEventListener('DOMContentLoaded', resolve, { once: true }));
        await settle();
        assert.deepEqual(errors, [], `${file}: initialization error`);
        const section = d.querySelector('.calculator-section');
        const box = d.getElementById('resultBox');
        const status = d.getElementById('resultUpdateStatus');
        w.bindResultFreshness();
        assert.equal(d.querySelectorAll('#resultUpdateStatus').length, 1, 'freshness binding must be idempotent');
        assert.ok(box && status, `${file}: missing shared result state`);
        assert.equal(d.querySelectorAll('#resultBox').length, 1);
        const probe = d.createElement('input');
        probe.id = 'qaMoney';
        probe.className = 'money-input';
        probe.setAttribute('aria-describedby', 'existingHelp');
        section.append(probe);
        w.bindMoneyInputs(section);
        w.bindMoneyInputs(section);
        assert.equal(d.querySelectorAll('#qaMoneyMoneyPreview').length, 1, 'binding must be idempotent');
        assert.equal(probe.getAttribute('aria-describedby'), 'existingHelp qaMoneyMoneyPreview');
        for (const [value, expected] of [['350000000', '입력 금액: 3억 5,000만원'], ['100000001', '입력 금액: 1억 1원'], ['1000000000000', '입력 금액: 1조원']]) {
            box.style.display = 'block';
            probe.value = value;
            probe.dispatchEvent(new w.Event('input', { bubbles: true }));
            assert.equal(d.getElementById('qaMoneyMoneyPreview').textContent, expected);
            assert.equal(probe.value.replaceAll(',', ''), value, 'preview must not alter the amount');
            assert.equal(box.style.display, 'none', 'edited input must invalidate previous results');
            assert.equal(status.hidden, false);
            w.showResult();
            assert.equal(box.style.display, 'block');
            assert.equal(status.hidden, true);
        }
        for (const value of ['', '0', '9999', '9007199254740992']) {
            probe.value = value;
            probe.dispatchEvent(new w.Event('input', { bubbles: true }));
            assert.equal(d.getElementById('qaMoneyMoneyPreview').hidden, true);
        }
        // Controllers can calculate a linked amount without dispatching another input.
        probe.value = '200000000';
        section.dispatchEvent(new w.Event('change', { bubbles: true }));
        await settle();
        assert.equal(d.getElementById('qaMoneyMoneyPreview').textContent, '입력 금액: 2억원');
        w.showResult();
        probe.dispatchEvent(new w.Event('invalid', { bubbles: false }));
        assert.equal(box.style.display, 'none', 'native validation failure must not leave a valid-looking result');
        dom.window.close();
    }
    console.log(`SHARED_UX_DOM_VALID pages=${pages.length} money previews, stale results, native validation`);
})().catch(error => { console.error(error); process.exitCode = 1; });
