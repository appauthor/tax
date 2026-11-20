const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const context = {};
context.window = context;
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../scripts/loan-math.js'), 'utf8'), context);
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../scripts/xirr-math.js'), 'utf8'), context);
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

const ref = { base: 'JPY', quote: 'KRW', rate: 8.4389, date: '2026-11-11' };
let q = M.normalizeReferenceRate(ref, 'JPY', '2026-11-12');
near(q.baseRate, 843.89); assert.equal(q.quoteUnit, 100); assert.equal(q.ageDays, 1);
assert.equal(M.normalizeReferenceRate({ ...ref, base: 'USD', rate: 1339.29 }, 'USD', '2026-11-12').quoteUnit, 1);
for (const update of [{ base: 'USD' }, { quote: 'USD' }, { rate: 0 }, { rate: -1 }, { rate: Infinity }, { rate: '8.4' },
    { date: '2026-02-30' }, { date: '2026-11-13' }, { date: '2026-11-03' }, { date: '' }, { rate: 1e10 }]) {
    assert.throws(() => M.normalizeReferenceRate({ ...ref, ...update }, 'JPY', '2026-11-12'));
}
console.log('REFERENCE_RATE_VALID direct KRW pair, JPY scaling, dates, range and malformed responses');

for (const [code, raw, unit] of [['HKD', 170.6, 1], ['AUD', 921.73, 1], ['GBP', 1791.14, 1],
    ['VND', 0.05217, 100], ['IDR', 0.0739, 100], ['THB', 39.917, 1], ['TWD', 40.727, 1],
    ['PHP', 21.225, 1], ['SGD', 1046.07, 1], ['MYR', 329.61, 1], ['MOP', 165.63, 1], ['CAD', 945.83, 1], ['NZD', 751.12, 1]]) {
    const quote = M.normalizeReferenceRate({ base: code, quote: 'KRW', rate: raw, date: '2026-11-11' }, code, '2026-11-12');
    assert.equal(quote.quoteUnit, unit); near(quote.baseRate, raw * unit);
    const result = M.calculateExchange({ ...fx, amount: 1000000, baseRate: quote.baseRate, quoteUnit: quote.quoteUnit, conditions: free });
    near(result.results[0].krw, raw * 1000000, 0.001);
}
assert.throws(() => M.normalizeReferenceRate({ ...ref, base: 'toString' }, 'toString', '2026-11-12'));
console.log('TRAVEL_CURRENCIES_VALID 13 additional currencies, 100-unit scaling and gross conversion');

const bond = { principal: 1000000, purchase: 980000, fee: 1000, couponRate: 4, frequency: 1,
    settlement: '2026-11-19', maturity: '2027-11-19' };
r = M.calculateBondYield(bond);
near(r.grossYield, 1040000 / 980000 - 1);
near(r.netYield, 1040000 / 981000 - 1);
near(r.profit, 59000);
assert.equal(r.schedule.length, 1);
r = M.calculateBondYield({ ...bond, couponRate: 0, fee: 0, frequency: 12 });
near(r.grossYield, 1000000 / 980000 - 1);
assert.equal(r.schedule[0].interest, 0);
assert.equal(r.schedule.length, 1);
r = M.calculateBondYield({ ...bond, settlement: '2027-12-31', maturity: '2028-04-30', frequency: 12 });
assert.equal(Array.from(r.schedule, row => row.date).join(','), '2028-01-31,2028-02-29,2028-03-31,2028-04-30');
near(r.interest, 1000000 * .04 * 4 / 12);
assert.equal(r.schedule[3].principal, 1000000);
assert.throws(() => M.calculateBondYield({ ...bond, maturity: bond.settlement }), /만기일/);
assert.throws(() => M.calculateBondYield({ ...bond, frequency: 12, maturity: '2050-11-19' }), /199/);

const usStock = { shares: 10, entryPrice: 100, endPrice: 110, entryRate: 1400, endRate: 1260, entryFee: 0, endFee: 0 };
r = M.calculateUsStockKrwReturn(usStock);
near(r.usdReturn, .1);
near(r.krwReturn, -.01);
near(r.priceEffect, 140000);
near(r.exchangeEffect, -154000);
near(r.profitKrw, -14000);
near(r.breakEvenRate, 1400000 / 1100);
r = M.calculateUsStockKrwReturn({ ...usStock, shares: 0.5, entryFee: 1, endFee: 2 });
near(r.profitKrw, r.priceEffect + r.exchangeEffect - r.feeEffect);
near(r.breakEvenRate, r.costKrw / r.proceedsUsd);
assert.equal(M.calculateUsStockKrwReturn({ ...usStock, endPrice: 0 }).breakEvenRate, null);
assert.throws(() => M.calculateUsStockKrwReturn({ ...usStock, endPrice: 0, endFee: 1 }), /매도대금/);

const noFees = { management: 0, other: 0, trading: 0 };
const etf = { initial: 10000000, contribution: 0, years: 10, annualReturn: 0,
    funds: [{ management: .10, other: .05, trading: .05 }, { management: .30, other: .10, trading: .10 }] };
r = M.calculateEtfCostComparison(etf);
near(r.results[0].annualCost, .002);
near(r.results[1].annualCost, .005);
near(r.results[0].balance, etf.initial * .998 ** 10);
near(r.results[1].balance, etf.initial * .995 ** 10);
near(r.results[0].fees, r.results[0].totalImpact);
near(r.difference, r.results[0].balance - r.results[1].balance);
r = M.calculateEtfCostComparison({ ...etf, initial: 0, contribution: 100000, years: 1, annualReturn: -5, funds: [noFees, noFees] });
near(r.baseline, 100000 * Array.from({ length: 12 }, (_, month) => .95 ** (month / 12)).reduce((a, b) => a + b));
assert.equal(r.invested, 1200000);
assert.equal(r.results[0].fees, 0);
assert.equal(r.difference, 0);
assert.throws(() => M.calculateEtfCostComparison({ ...etf, initial: 0 }), /투자금/);
assert.throws(() => M.calculateEtfCostComparison({ ...etf, funds: [{ management: 95, other: 5, trading: 0 }, noFees] }), /합계/);
console.log('INVESTMENT_CALCULATORS_VALID maturity cash flows, currency decomposition and projected ETF costs');

const card = { amount: 1200000, months: 12, mode: 'partial', rate: 18, rounds: [1, 2, 3] };
r = M.calculateCardInstallment(card);
assert.equal(r.fees, 49500);
assert.equal(r.rows[0].payment, 118000);
assert.equal(r.rows[3].fee, 0);
r = M.calculateCardInstallment({ amount: 100000, months: 3, mode: 'free' });
assert.equal(r.rows[2].principal, 33334);
assert.equal(r.rows[2].balance, 0);
assert.equal(r.total, 100000);
r = M.calculateCardInstallment({ ...card, months: 2, mode: 'standard', days: [31, 28] });
assert.equal(r.fees, Math.round(1200000 * .18 * 31 / 365) + Math.round(600000 * .18 * 28 / 365));
assert.throws(() => M.calculateCardInstallment({ ...card, rounds: [13] }), /회차/);
assert.throws(() => M.calculateCardInstallment({ ...card, days: [29] }), /개월 수/);

const deposit = { principal: 20000000, needed: 5000000, maturityInterest: 400000, earlyInterest: 150000,
    remainingDays: 90, loanDays: 60, loanRate: 5, fees: 0 };
r = M.calculateDepositBreakComparison(deposit);
near(r.loanInterest, 5000000 * .05 * 60 / 365);
near(r.difference, 250000 - r.loanCost);
near(r.breakEvenRate, 250000 * 365 / (5000000 * 60));
assert.equal(M.calculateDepositBreakComparison({ ...deposit, fees: 300000 }).breakEvenRate, null);
assert.throws(() => M.calculateDepositBreakComparison({ ...deposit, loanDays: 91 }), /사용할 일수/);

const refinance = { principal: 100000000, horizon: 12, current: { annualRate: 5, months: 120, method: 'bullet' },
    replacement: { annualRate: 4, months: 120, method: 'bullet' }, exitFee: 300000, newFees: 200000 };
r = M.calculateRefinance(refinance);
near(r.difference, 500000);
assert.equal(r.breakEvenMonth, 6);
assert.equal(r.summary[0].balance, 100000000);
assert.equal(M.calculateRefinance({ ...refinance, horizon: 5 }).breakEvenMonth, null);
r = M.calculateRefinance({ ...refinance, current: { annualRate: 0, months: 6, method: 'equal-principal' },
    replacement: { annualRate: 0, months: 24, method: 'equal-payment' }, exitFee: 0, newFees: 0 });
near(r.summary[0].balance, 0);
near(r.summary[1].balance, 50000000);
near(r.summary[0].paid, 100000000);
near(r.difference, 0);

r = M.calculateDepositProtection([{ name: ' 은행 A ', principal: 70000000, interest: 1200000 },
    { name: '은행  A', principal: 35000000, interest: 800000 }, { name: '은행 B', principal: 20000000, interest: 0 }]);
assert.equal(r.rows.length, 2);
assert.equal(r.rows[0].eligible, 107000000);
assert.equal(r.rows[0].protected, 100000000);
assert.equal(r.excess, 7000000);
assert.equal(r.rows[1].headroom, 80000000);
assert.throws(() => M.calculateDepositProtection([{ name: '', principal: 100000, interest: 0 }]), /금융회사명/);

const mileage = { initial: 10000, latest: 17000, startDate: '2025-11-20', endDate: '2026-11-20' };
r = M.calculateMileageRefund(mileage);
assert.equal(r.annualDistance, 7000);
assert.equal(r.refund, null);
assert.equal(M.calculateMileageRefund({ ...mileage, premium: 600000, rate: 10 }).refund, 60000);
assert.equal(M.calculateMileageRefund({ ...mileage, premium: 600000, rate: 0 }).refund, 0);
assert.throws(() => M.calculateMileageRefund({ ...mileage, endDate: mileage.startDate }), /측정일/);
assert.throws(() => M.calculateMileageRefund({ ...mileage, latest: 5000 }), /최종 계기판/);
console.log('CONSUMER_FINANCE_VALID installment schedules, deposit financing, refinancing, deposit protection and mileage');
