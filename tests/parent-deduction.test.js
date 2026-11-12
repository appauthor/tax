const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const context = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(__dirname, '../scripts/year-end-tax-math.js'), 'utf8'), context);
const { calculateParent: calculate, pensionDeduction: deduct } = context.YearEndTaxMath;
const base = { birthYear: 1960, pensionMode: 'taxable', pensionAmount: 5000000, incomeMode: 'none', support: 'yes', duplicate: 'no', disability: 'no', specialCase: false };
const run = changes => calculate({ ...base, ...changes });
// Statutory pension deduction bands, continuity, cap and source-based worked examples.
for (const [gross, deduction] of [[0,0],[3500000,3500000],[3500010,3500004],[5000000,4100000],[5200000,4180000],[7000000,4900000],[7000010,4900002],[14000000,6300000],[14000010,6300001],[41000000,9000000],[100000000,9000000]]) assert.equal(deduct(gross), deduction);
assert.equal(run({}).pensionIncome, 900000);
assert.equal(run({}).status, 'eligible');
assert.equal(run({}).totalDeduction, 1500000);
assert.equal(run({ pensionAmount: 5200000 }).pensionIncome, 1020000);
assert.equal(run({ pensionAmount: 5200000 }).status, 'ineligible');
assert.equal(run({ pensionAmount: 5166666 }).status, 'eligible');
assert.equal(run({ pensionAmount: 5166667 }).pensionIncome, 1000000.2);
assert.equal(run({ pensionAmount: 5166667 }).status, 'ineligible', 'display rounding must not change eligibility');
assert.equal(run({ pensionMode: 'net', pensionAmount: 1000000 }).status, 'eligible');
assert.equal(run({ pensionMode: 'net', pensionAmount: 1000000 }).deduction, null, 'never deduct twice');
assert.equal(run({ pensionMode: 'net', pensionAmount: 1000001 }).status, 'ineligible');
// Each parent is assessed independently; no household income aggregation.
assert.equal(run({ incomeMode: 'mixed', salary: 0, other: 100000, retirement: 0, capital: 0 }).status, 'eligible');
for (const key of ['other', 'retirement', 'capital']) {
    const input = { incomeMode: 'mixed', salary: 0, other: 0, retirement: 0, capital: 0, [key]: 100001 };
    assert.equal(run(input).status, 'ineligible', `${key} must be counted before personal/basic deductions`);
}
assert.equal(run({ incomeMode: 'mixed', salary: 0, other: 200000, retirement: 0, capital: 0 }).totalIncome, 1100000);
for (const pensionMode of ['none', 'exempt']) {
    assert.equal(run({ pensionMode, incomeMode: 'salary', salary: 5000000 }).status, 'eligible');
    assert.equal(run({ pensionMode, incomeMode: 'salary', salary: 5000001 }).status, 'ineligible');
}
assert.equal(run({ incomeMode: 'salary', salary: 5000000 }).status, 'ineligible', 'salary-only exception does not cover taxable pension plus salary');
assert.equal(run({ pensionAmount: 3000000, incomeMode: 'salary', salary: 5000000 }).status, 'review', 'zero-net mixed-income exception requires confirmation');
assert.equal(run({ pensionAmount: 3000000, incomeMode: 'salary', salary: 3000000 }).status, 'eligible');
assert.equal(run({ pensionMode: 'none', incomeMode: 'none' }).totalIncome, 0);
assert.equal(run({ birthYear: 1966 }).status, 'eligible');
assert.equal(run({ birthYear: 1967 }).status, 'ineligible');
assert.equal(run({ birthYear: 1967, disability: 'unknown' }).status, 'review');
assert.equal(run({ birthYear: 1967, disability: 'yes' }).totalDeduction, 3500000);
assert.equal(run({ birthYear: 1956 }).totalDeduction, 2500000);
assert.equal(run({ birthYear: 1957 }).totalDeduction, 1500000);
assert.equal(run({ birthYear: 1956, disability: 'yes' }).totalDeduction, 4500000);
assert.equal(run({ birthYear: 1956, pensionAmount: 6000000, disability: 'yes' }).basic, null, 'age/disability never overrides income');
for (const key of ['pensionMode', 'incomeMode', 'support', 'duplicate', 'disability']) {
    assert.equal(run({ [key]: 'unknown' }).status, 'review', key);
    assert.equal(run({ [key]: 'unknown' }).totalDeduction, null);
    assert.throws(() => run({ [key]: 'wrong' }), /선택/);
}
assert.equal(run({ pensionMode: 'unknown' }).pensionIncome, null);
assert.equal(run({ incomeMode: 'unknown' }).totalIncome, null);
assert.equal(run({ support: 'no' }).status, 'ineligible');
assert.equal(run({ duplicate: 'yes' }).status, 'ineligible');
assert.equal(run({ specialCase: true }).status, 'review');
assert.equal(run({ specialCase: true, pensionAmount: 10000000 }).status, 'review', 'unsupported adjustments must not produce a definitive ruling');
for (const pensionAmount of ['', ' ', false, [], null, undefined, -1, NaN, Infinity, 1e12+1, 5.5]) assert.throws(() => run({ pensionAmount }));
for (const birthYear of ['', null, 1899, 2027, 1960.5, 'bad']) assert.throws(() => run({ birthYear }));
// Increasing known pension income cannot restore an already failed income condition.
let failed = false;
for (let gross = 0; gross <= 20000000; gross += 10000) {
    const result = run({ pensionAmount: gross });
    assert.ok(result.deduction >= 0 && result.deduction <= gross && result.deduction <= 9000000);
    if (result.status === 'ineligible') failed = true;
    if (failed) assert.equal(result.status, 'ineligible');
}
console.log('PARENT_DEDUCTION_MATH_VALID pension bands, exact boundary, mixed income, age, evidence and exclusions');
