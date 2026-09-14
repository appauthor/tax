const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const context = vm.createContext({ console });
context.window = context;
for (const file of ['investment-tax-math.js', 'year-end-tax-math.js', 'national-pension-math.js', 'savings-rank-math.js', 'savings-rank-data.js']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../scripts', file), 'utf8'), context);
}
const { YearEndTaxMath: tax, NationalPensionMath: pension, SavingsRankMath: savings, SavingsRankData: data } = context;
const near = (a, b) => assert.ok(Math.abs(a - b) < 0.0001, `${a} != ${b}`);
const input = { gross: 50000000, family: 1, extraPersonal: 0, publicPension: 2000000, otherDeductions: 0, specialDeductions: 2000000, specialCredits: 0, otherCredits: 0, pensionSavings: 0, irp: 0, additionalIrp: 3000000, paidIncomeTax: 3000000, paidLocalTax: 300000, mode: 'auto' };
const result = tax.calculate(input);
assert.equal(result.earnedDeduction, 12250000);
assert.equal(result.current.taxBase, 32250000);
assert.equal(result.current.incomeTax, 2917500);
assert.equal(result.current.refund, 90750);
assert.equal(result.after.refund, 585750);
assert.equal(result.additionalSaving, 495000);
assert.equal(result.current.mode, 'special');
// Official NTS salary-deduction worked example: 33.8m salary => 10.32m deduction.
assert.equal(tax.salaryDeduction(33800000), 10320000);
for (const [gross, expected] of [[0, 0], [5000000, 3500000], [15000000, 7500000], [45000000, 12000000], [100000000, 14750000], [362500000, 20000000], [1e12, 20000000]]) {
    near(tax.salaryDeduction(gross), expected);
    if (gross > 0 && gross < 1e12) {
        assert.ok(tax.salaryDeduction(gross - 1) <= expected);
        assert.ok(tax.salaryDeduction(gross + 1) >= expected);
    }
}
for (const [gross, expected] of [[33000000, 740000], [43000000, 660000], [70000000, 660000], [70320000, 500000], [120000000, 500000], [120600000, 200000]]) near(tax.employmentCredit(gross, 5000000), expected);
near(tax.employmentCredit(10000000, 1300000), 715000);
near(tax.employmentCredit(10000000, 1300001), 715000.3);
const standard = tax.calculate({ ...input, specialDeductions: 0, specialCredits: 0 });
assert.equal(standard.current.mode, 'standard');
const forcedStandard = tax.calculate({ ...input, mode: 'standard', specialDeductions: 99999999, specialCredits: 99999999 });
assert.equal(forcedStandard.current.totalTax, standard.current.totalTax, 'standard mode must discard special deductions AND special credits');
const zero = tax.calculate({ ...input, gross: 0 });
assert.equal(zero.current.totalTax, 0);
assert.equal(zero.current.refund, 3300000, 'refund cannot exceed actual taxes paid');
assert.equal(zero.additionalSaving, 0);
assert.equal(tax.calculate({ ...input, paidIncomeTax: 0, paidLocalTax: 0 }).current.refund, -3209250);
assert.equal(tax.calculate({ ...input, pensionSavings: 6000000, irp: 3000000 }).additionalSaving, 0, 'no additional benefit after 9m eligible limit');
near(tax.calculate({ ...input, gross: 55000000 }).additionalSaving, 495000);
near(tax.calculate({ ...input, gross: 55000001 }).additionalSaving, 396000);
assert.equal(tax.calculate({ ...input, specialCredits: 10000000 }).current.totalTax, 0);
for (const value of ['', null, undefined, NaN, Infinity, -1, 1e13]) assert.throws(() => tax.calculate({ ...input, gross: value }));
for (const family of [0, 1.5, 31]) assert.throws(() => tax.calculate({ ...input, family }));
assert.throws(() => tax.calculate({ ...input, irp: 18000000 }));
assert.throws(() => tax.calculate({ ...input, mode: 'other' }));

const p = { birthYear: 1969, insuredMonths: 240, monthly: 1000000, earlyMonths: 60, deferredMonths: 60, endAge: 85, noIncome: true };
const pr = pension.calculate(p);
near(pr.earlyAmount, 700000); near(pr.deferredAmount, 1360000);
assert.equal(pr.earlyBreakEvenMonths, 76 * 12 + 8);
assert.equal(pr.deferredBreakEvenMonths, 83 * 12 + 11);
assert.equal(pr.totals.normal, 240000000);
near(pr.totals.early, 210000000); near(pr.totals.deferred, 244800000);
assert.equal(pr.timeline[0].normal, 0); assert.equal(pr.timeline[1].normal, 12000000);
for (const [year, expected] of [[1952, 60], [1953, 61], [1956, 61], [1957, 62], [1960, 62], [1961, 63], [1964, 63], [1965, 64], [1968, 64], [1969, 65]]) assert.equal(pension.normalAge(year), expected);
for (let shift = 1; shift <= 60; shift++) {
    const r = pension.calculate({ ...p, earlyMonths: shift, deferredMonths: shift });
    const start = r.normalAge * 12;
    const earlyDifference = end => (end - start) * r.monthly - (end - start + shift) * r.earlyAmount;
    const lateDifference = end => (end - start - shift) * r.deferredAmount - (end - start) * r.monthly;
    assert.ok(earlyDifference(r.earlyBreakEvenMonths) >= -0.001);
    assert.ok(earlyDifference(r.earlyBreakEvenMonths - 1) < 0);
    assert.ok(lateDifference(r.deferredBreakEvenMonths) >= -0.001);
    assert.ok(lateDifference(r.deferredBreakEvenMonths - 1) < 0);
}
const ineligible = pension.calculate({ ...p, noIncome: false });
assert.equal(ineligible.totals.early, null); assert.equal(ineligible.earlyBreakEvenMonths, null);
assert.throws(() => pension.calculate({ ...p, insuredMonths: 119 }));
assert.doesNotThrow(() => pension.calculate({ ...p, insuredMonths: 120 }));
for (const patch of [{ birthYear: '' }, { birthYear: 2027 }, { monthly: 0 }, { monthly: Infinity }, { earlyMonths: 0 }, { deferredMonths: 61 }, { endAge: 64 }]) assert.throws(() => pension.calculate({ ...p, ...patch }));

const product = { id: 'a', kind: 'deposit', company: '테스트은행', name: '검증 전용 상품', sector: 'bank', months: 12, method: 'simple', baseRate: 3, maxRate: 4, maxLimit: null };
const opts = { kind: 'deposit', months: 12, amount: 10000000, sector: 'all', rateMode: 'base' };
const r = savings.rank([product], opts)[0];
near(r.netInterest, 253800); near(r.maturityAmount, 10253800);
near(savings.rank([{ ...product, kind: 'installment' }], { ...opts, kind: 'installment', amount: 300000 })[0].netInterest, 49491);
assert.equal(savings.rank([product, { ...product, id: 'b' }], opts)[1].rank, 1);
assert.equal(savings.rank([{ ...product, maxLimit: 9999999 }], opts).length, 0);
assert.equal(savings.rank([{ ...product, maxLimit: 10000000 }], opts).length, 1);
assert.equal(savings.rank([product], { ...opts, sector: 'savings-bank' }).length, 0);
assert.equal(savings.rank([product], { ...opts, query: '존재하지않음' }).length, 0);
assert.ok(savings.rank([{ ...product, id: 'compound', method: 'monthly-compound' }, product], opts)[0].id === 'compound');
assert.ok(savings.rank([product], { ...opts, rateMode: 'maximum' })[0].netInterest > r.netInterest);
assert.equal(savings.freshness('2026-09-01T00:00:00Z', Date.parse('2026-09-08T00:00:00Z')), 'current');
assert.equal(savings.freshness('2026-09-01T00:00:00Z', Date.parse('2026-09-08T00:00:01Z')), 'stale');
assert.equal(savings.freshness('invalid'), 'invalid');
for (const patch of [{ amount: '' }, { amount: Infinity }, { amount: -1 }, { months: 0 }, { months: 13 }, { sector: 'unknown' }]) assert.throws(() => savings.rank([product], { ...opts, ...patch }));
assert.equal(data.schemaVersion, 1);
assert.equal(new Set(data.products.map(p => p.id)).size, data.products.length);
for (const coverage of data.coverage) {
    assert.equal(data.products.filter(p => p.kind === coverage.kind && p.months === coverage.months).length, coverage.includedOptions);
    assert.ok(coverage.includedOptions > 0 && coverage.sourceRows >= coverage.includedOptions);
    const rows = savings.rank(data.products, { ...opts, kind: coverage.kind, months: coverage.months });
    assert.ok(rows.length);
    rows.forEach((row, i) => {
        assert.ok(Number.isFinite(row.netInterest));
        assert.equal(new URL(row.sourceUrl).hostname, 'finlife.fss.or.kr');
        if (i) assert.ok(rows[i - 1].netInterest >= row.netInterest);
    });
}
console.log('PLANNING_CALCULATIONS_VALID');
