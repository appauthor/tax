const assert = require('node:assert/strict');
const math = require('../scripts/practical-finance-math.js');

const daily = math.dailyWorkerTax(180000, 5);
assert.deepEqual(daily.daily, { national: 0, local: 0, net: 900000 });
assert.deepEqual(daily.grouped, { national: 4050, local: 400, net: 895550 });
assert.equal(math.dailyWorkerTax(187000, 1).grouped.national, 0);
assert.equal(math.dailyWorkerTax(187038, 1).grouped.national, 1000);
assert.equal(math.dailyWorkerTax(149000, 30).grouped.national, 0);

const prorated = { month: '2028-02', salary: 2900000, start: '2028-01-05', end: '2028-02-15', paidDays: 20, paidDaysWorked: 10 };
assert.deepEqual(math.proratedSalary(prorated),
    { monthDays: 29, calendarDays: 15, calendarPay: 1500000, paidDayPay: 1450000 });
assert.equal(math.proratedSalary({ ...prorated, paidDays: null, paidDaysWorked: null }).paidDayPay, null);
assert.throws(() => math.proratedSalary({ ...prorated, paidDays: null }), /두 유급일수/);
assert.throws(() => math.proratedSalary({ ...prorated, paidDaysWorked: null }), /두 유급일수/);
assert.throws(() => math.proratedSalary({ ...prorated, end: '2028-02-30' }), /기준 월/);
assert.throws(() => math.proratedSalary({ ...prorated, paidDaysWorked: 20 }), /유급일수/);
assert.throws(() => math.proratedSalary({ ...prorated, month: '2028-03' }), /해당하는 급여/);
assert.deepEqual(math.shutdownAllowance({ average: 120000, ordinary: 80000, days: 5, paidPerDay: 60000 }),
    { usual: 84000, minimum: 80000, total: 400000, supplement: 100000 });
assert.equal(math.shutdownAllowance({ average: 100000, ordinary: 80000, days: 2, paidPerDay: 90000 }).supplement, 0);
assert.throws(() => math.shutdownAllowance({ average: 100000, ordinary: 0, days: 2, paidPerDay: 0 }), /0원보다/);

const revolving = { carried: 500000, newPurchases: 500000, excluded: 100000, rate: 18, days: 30, dayBasis: 365, floor: 50000, payRatio: 1, compareRatio: 100 };
const cardBill = math.revolvingInterest(revolving);
assert.deepEqual(cardBill.current, { ratio: 1, paidPrincipal: 50000, bill: 157397, remaining: 950000 });
assert.deepEqual(cardBill.compared, { ratio: 100, paidPrincipal: 1000000, bill: 1107397, remaining: 0 });
assert.equal(math.revolvingInterest({ ...revolving, carried: 0 }).interest, 0);
assert.equal(math.revolvingInterest({ ...revolving, dayBasis: 366 }).interest, 7377);
assert.deepEqual(math.jeonseRenewal({ previous: 300000000, proposed: 318000000, capRate: 5 }),
    { increase: 18000000, rate: 6, limit: 315000000, excess: 3000000 });
assert.equal(math.jeonseRenewal({ previous: 1000001, proposed: 1000000, capRate: 3 }).limit, 1030001);
assert.throws(() => math.jeonseRenewal({ previous: 10000, proposed: 10000, capRate: 5.01 }), /5%/);

assert.deepEqual(math.mvnoCosts({ offer: 3000, regular: 19000, months: 7, oneTime: 7700 }, 12),
    { total: 123700, discounted: 7, after: 5 });
assert.equal(math.mvnoCosts({ offer: 0, regular: 19000, months: 12, oneTime: 7700 }, 5).total, 7700);
assert.deepEqual(math.chargingCosts({ firstRate: 300, secondRate: 290, fee: 1000 }, 60, 40),
    { firstCost: 18000, secondCost: 11600, fee: 1000, total: 30600 });
const rental = { monthly: 390000, prepaid: 3000000, deposit: 2000000, refund: 2000000, returnFee: 0, buyout: 12000000, transfer: 800000 };
assert.deepEqual(math.rentalCosts(rental, 48), { initial: 5000000, returning: 21720000, buying: 34520000 });
assert.throws(() => math.rentalCosts({ ...rental, refund: 2000001 }, 48), /보증금/);
const card = { firstRate: 3, secondRate: 7, thirdRate: 2, threshold: 400000, eligibleSpend: 430000, cap: 15000, annualFee: 20000 };
assert.deepEqual(math.cardRewards(card, 250000, 120000, 80000, 50000),
    { qualified: true, monthly: 15000, annual: 160000, effective: 160000 / 6000000 * 100 });
assert.equal(math.cardRewards({ ...card, eligibleSpend: 200000 }, 250000, 120000, 80000, 50000).annual, -20000);
assert.deepEqual(math.rankOptions([{ name: 'A', cost: 5 }, { name: 'B', cost: 4 }, { name: 'C', cost: 4 }], ({ cost }) => ({ cost }), 'cost')
    .map(({ name, rank }) => [name, rank]), [['B', 1], ['C', 1], ['A', 3]]);

const codes = Object.keys(math.currencies);
function rates(date, usd, list = codes) {
    return list.map(quote => ({ base: 'KRW', quote, date, rate: quote === 'USD' ? usd : 0.001 }));
}
const observations = [
    ...rates('2026-09-30', 0.001), ...rates('2026-10-23', 0.001),
    ...rates('2026-10-30', 0.0008), ...rates('2026-10-31', 0.0007, ['USD'])
];
const week = math.currencyChanges(observations, 'week');
assert.equal(week.latest, '2026-10-30');
assert.equal(week.start, '2026-10-23');
assert.equal(week.rows[0].code, 'USD');
assert.equal(week.rows[0].change, 25);
assert.deepEqual(week.rows.map(row => row.rank), [1, 2, 2, 2, 2, 2]);
assert.equal(math.currencyChanges(observations, 'month').start, '2026-09-30');
assert.throws(() => math.currencyChanges(rates('2026-10-31', 0.0007, ['USD']), 'week'), /공통 기준일/);
assert.equal(math.currencyChanges([...rates('2026-04-30', 0.001), ...rates('2026-05-31', 0.001)], 'month').start, '2026-04-30');

console.log('PRACTICAL_FINANCE_VALID ten calculator and ranking workflows');
