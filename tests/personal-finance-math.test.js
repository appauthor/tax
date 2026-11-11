const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const context = {};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../scripts/personal-finance-math.js'), 'utf8'), context);
const M = context.PersonalFinanceMath;
const near = (actual, expected, tolerance = 1e-5) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);
const fx = { amount: 1000, baseRate: 1400, quoteUnit: 1, direction: 'buy', amountType: 'foreign',
    conditions: [{ spread: 1.75, preference: 90, fixedFee: 0 }, { spread: 1.75, preference: 50, fixedFee: 0 }] };
let r = M.calculateExchange(fx);
near(r.results[0].krw, 1402450); near(r.results[0].spreadCost, 2450); near(r.results[0].preferenceSaving, 22050);
near(r.results[1].krw, 1412250); near(r.difference, 9800); assert.equal(r.winner, 0);
r = M.calculateExchange({ ...fx, direction: 'sell' }); near(r.results[0].krw, 1397550); assert.equal(r.winner, 0);
for (const direction of ['buy', 'sell']) {
    for (const fixedFee of [0, 2000]) {
        const conditions = fx.conditions.map(c => ({ ...c, fixedFee }));
        const forward = M.calculateExchange({ ...fx, direction, conditions });
        const reverse = M.calculateExchange({ ...fx, direction, conditions, amountType: 'won', amount: forward.results[0].krw });
        near(reverse.results[0].foreignAmount, 1000); assert.equal(reverse.winner, 0);
    }
}
const free = [{ spread: 1.75, preference: 100, fixedFee: 0 }, { spread: 0, preference: 0, fixedFee: 0 }];
r = M.calculateExchange({ ...fx, amount: 100000, baseRate: 950, quoteUnit: 100, conditions: free });
near(r.results[0].krw, 950000); assert.equal(r.winner, null);
assert.throws(() => M.calculateExchange({ ...fx, amountType: 'won', amount: 10, conditions: fx.conditions.map(c => ({ ...c, fixedFee: 10 })) }), /원화 예산/);
assert.throws(() => M.calculateExchange({ ...fx, direction: 'sell', conditions: fx.conditions.map(c => ({ ...c, fixedFee: 2000000 })) }), /수령액/);
for (const update of [{ amount: 0 }, { baseRate: 0 }, { quoteUnit: 0.5 }, { direction: 'bad' }, { amount: Infinity }, { conditions: [] },
    { conditions: [{ spread: -1, preference: 90, fixedFee: 0 }, fx.conditions[1]] }, { conditions: [{ spread: 1, preference: 101, fixedFee: 0 }, fx.conditions[1]] }]) {
    assert.throws(() => M.calculateExchange({ ...fx, ...update }));
}
const retirement = { currentAge: 60, retirementAge: 60, endAge: 90, pensionAge: 65,
    assets: 300000000, monthlySaving: 0, monthlyExpense: 2000000, monthlyPension: 1000000, annualReturn: 0, inflation: 0, pensionGrowth: 0 };
r = M.calculateRetirement(retirement);
near(r.requiredFund, 420000000); assert.equal(r.firstShortfallMonth, 241); near(r.endBalance, 0);
near(r.yearly[4].balance, 180000000); near(r.yearly[19].balance, 0); near(r.shortfall, 120000000);
r = M.retirementPlan({ ...retirement, assets: 420000000 }); assert.equal(r.firstShortfallMonth, null); near(r.endBalance, 0);
r = M.retirementPlan({ ...retirement, pensionAge: 60, monthlyPension: 2000000, assets: 0 });
near(r.requiredFund, 0); assert.equal(r.firstShortfallMonth, null);
r = M.retirementPlan({ ...retirement, pensionAge: 120 }); near(r.requiredFund, 720000000);
r = M.retirementPlan({ ...retirement, currentAge: 40, retirementAge: 60, endAge: 61, pensionAge: 65, monthlySaving: 1000000, assets: 100000000 });
near(r.retirementAssets, 340000000); near(r.requiredFund, 24000000);
const yieldInput = { ...retirement, endAge: 61, pensionAge: 60, monthlyPension: 0, monthlyExpense: 100, annualReturn: 12, inflation: 0 };
r = M.retirementPlan(yieldInput);
const monthly = Math.pow(1.12, 1 / 12) - 1;
near(r.requiredFund, 100 * (1 - Math.pow(1 + monthly, -12)) / monthly);
r = M.retirementPlan({ ...yieldInput, annualReturn: 0, inflation: (Math.pow(1.01, 12) - 1) * 100 });
near(r.requiredFund, 100 * (Math.pow(1.01, 12) - 1) / 0.01);
r = M.retirementPlan({ ...retirement, assets: 0, pensionAge: 65, monthlyPension: 4000000 });
assert.equal(r.firstShortfallMonth, 1); assert.ok(r.endBalance > 0, 'later pension surplus can rebuild assets after earlier shortfall');
for (const update of [{ endAge: 60 }, { pensionAge: 59 }, { retirementAge: 59 }, { currentAge: 60.5 }, { assets: -1 },
    { monthlyExpense: NaN }, { annualReturn: -100 }, { inflation: 30 }, { pensionGrowth: '' }]) assert.throws(() => M.retirementPlan({ ...retirement, ...update }));
const reb = { rows: [{ name: '주식', current: 6000000, targetWeight: 50 }, { name: '채권', current: 4000000, targetWeight: 50 }], extraCash: 0, mode: 'full' };
r = M.calculateRebalancing(reb); assert.equal(r.rows[0].trade, -1000000); assert.equal(r.rows[1].trade, 1000000); assert.equal(r.minimumAdditionalCash, 2000000);
r = M.calculateRebalancing({ ...reb, mode: 'buy-only', extraCash: 1000000 });
assert.equal(r.rows[0].trade, 0); assert.equal(r.rows[1].trade, 1000000); near(r.rows[0].finalWeight, 600 / 11);
r = M.calculateRebalancing({ ...reb, mode: 'buy-only', extraCash: 2000000 }); near(r.maximumDeviation, 0);
r = M.calculateRebalancing({ ...reb, mode: 'buy-only' }); assert.equal(r.totalBuy, 0); assert.equal(r.totalSell, 0);
r = M.calculateRebalancing({ ...reb, rows: [{ name: '목표0', current: 10, targetWeight: 0 }, { name: '목표100', current: 0, targetWeight: 100 }] });
assert.equal(r.minimumAdditionalCash, null); assert.equal(r.rows[0].finalValue, 0);
r = M.calculateRebalancing({ ...reb, rows: [{ current: 1000000000000, targetWeight: 0.01 }, { current: 0, targetWeight: 99.99 }] });
assert.equal(r.minimumAdditionalExceedsLimit, true); assert.equal(r.minimumAdditionalCash, null);
assert.throws(() => M.calculateRebalancing({ ...reb, rows: [{ current: 10, targetWeight: 0.001 }, { current: 10, targetWeight: 99.999 }] }), /소수 둘째/);
for (const update of [{ rows: reb.rows.slice(0, 1) }, { extraCash: -1 }, { mode: 'other' },
    { rows: reb.rows.map(x => ({ ...x, targetWeight: 49 })) }, { rows: reb.rows.map(x => ({ ...x, current: 0 })) }]) {
    assert.throws(() => M.calculateRebalancing({ ...reb, ...update }));
}
// Deterministic budget conservation over varied amounts/weights and both modes.
let seed = 1729;
const random = n => { seed = (seed * 48271) % 2147483647; return seed % n; };
for (let i = 0; i < 100; i++) {
    const a = random(101), b = random(101 - a);
    const rows = [a, b, 100 - a - b].map((targetWeight, index) => ({ name: String(index), targetWeight, current: random(1000000) }));
    const extraCash = random(1000000);
    for (const mode of ['full', 'buy-only']) {
        const x = M.calculateRebalancing({ rows, extraCash, mode });
        assert.equal(x.rows.reduce((s, row) => s + row.finalValue, 0), x.total);
        assert.equal(x.totalBuy - x.totalSell, extraCash);
        assert.ok(x.rows.every(row => row.finalValue >= 0 && Number.isSafeInteger(row.finalValue)));
        if (mode === 'buy-only') assert.equal(x.totalSell, 0);
    }
}
console.log('PERSONAL_FINANCE_MATH_VALID exchange, retirement cash flow and rebalancing conservation');
