const assert = require('node:assert/strict');
const { cardDeduction, overtimePay, commercialLease, guaranteeFee, retirementContribution } = require('../scripts/static-finance-math');
const ranks = require('../scripts/published-rank-math');
const management = require('../src/data/apartment-management-fees.json');
const ev = require('../src/data/ev-subsidies.json');
const tuition = require('../src/data/university-tuition.json');

const card = { salary: 50000000, children: '0', card: 15000000, debit: 5000000 };
assert.equal(cardDeduction(card).deduction, 1875000);
assert.equal(cardDeduction(card).baseRemaining, 1125000);
assert.equal(cardDeduction({ ...card, card: 12500000, debit: 0 }).deduction, 0);
assert.equal(cardDeduction({ ...card, card: 10000000, debit: 0 }).toThreshold, 2500000);
assert.equal(cardDeduction({ ...card, card: 50000000, market: 3000000 }).additional, 1200000);
assert.equal(cardDeduction({ ...card, card: 50000000, market: 15000000 }).deduction, 6000000);
assert.equal(cardDeduction({ ...card, salary: 70000000, children: '2' }).baseLimit, 4000000);
assert.equal(cardDeduction({ ...card, salary: 70000001, children: '1' }).baseLimit, 2750000);
assert.throws(() => cardDeduction({ ...card, salary: 70000001, culture: 1 }), /일반 사용액/);

const holiday = { wage: 12000, day: 'holiday', start: '13:00', end: '23:00', breakStart: '18:00', breakEnd: '19:00' };
assert.equal(overtimePay(holiday).total, 174000);
assert.equal(overtimePay(holiday).holidayExtra, 60);
assert.equal(overtimePay(holiday).overtime, 0);
const overnight = { wage: 12000, day: 'workday', start: '21:00', end: '06:00', breakStart: '23:50', breakEnd: '00:50', prior: 39 };
assert.equal(overtimePay(overnight).night, 420);
assert.equal(overtimePay(overnight).overtime, 420);
assert.equal(overtimePay(overnight).total, 180000);
assert.throws(() => overtimePay({ ...overnight, breakStart: '15:00' }), /실제로 쉰/);

const lease = { deposit: 100000000, monthly: 4400000, zone: 'metro' };
assert.equal(commercialLease(lease).eligible, true);
assert.equal(commercialLease({ ...lease, monthly: 4400001 }).gap, -100);
assert.equal(commercialLease({ ...lease, deposit: 550000000, monthly: 0 }).maxMonthly, null);

const hug = { deposit: 300000000, property: 400000000, senior: 0, days: 730, dwelling: 'apartment', region: 'capital' };
assert.equal(guaranteeFee(hug).fee, 924000);
assert.equal(guaranteeFee(hug).issues.length, 0);
assert.equal(guaranteeFee({ ...hug, deposit: 252000000 }).rate, 0.00107);
assert.equal(guaranteeFee({ ...hug, deposit: 252000001 }).rate, 0.00131);
assert.equal(guaranteeFee({ ...hug, deposit: 100000000, senior: 180000000 }).surcharge, false);
assert.equal(guaranteeFee({ ...hug, deposit: 100000000, senior: 180000001 }).surcharge, true);
assert.equal(guaranteeFee({ ...hug, deposit: 360000001 }).issues.length, 1);
assert.throws(() => guaranteeFee({ ...hug, days: 364 }), /1년 이상/);
const published = { ...hug, deposit: 180000000, property: 200000000, propertySource: 'published' };
const converted = guaranteeFee(published);
assert.equal(converted.property, 280000000);
assert.equal(converted.adjustedValue, 252000000);
assert.equal(converted.fee, guaranteeFee({ ...published, property: 280000000, propertySource: 'assessed' }).fee);
assert.equal(guaranteeFee({ ...hug, welfare: 'lowIncome' }).fee, 369600);
assert.equal(guaranteeFee({ ...hug, welfare: 'newlywed' }).fee, 554400);
for (const type of ['electronic', 'mobile', 'lumpSum']) {
    assert.equal(guaranteeFee({ ...hug, [type]: 'yes' }).fee, 896280);
}
const combined = guaranteeFee({ ...hug, welfare: 'lowIncome', electronic: 'yes', mobile: 'yes', lumpSum: 'yes' });
assert.deepEqual(combined.discounts, { welfare: 60, electronic: 3, mobile: 3, lumpSum: 3 });
assert.equal(Math.round(combined.fee), 337324);
assert.equal(Math.round(combined.discountAmount), 586676);
const surcharged = guaranteeFee({ ...hug, deposit: 100000000, senior: 190000000, welfare: 'singleParent', electronic: 'yes' });
assert.equal(surcharged.surcharge, true);
assert.equal(Math.round(surcharged.fee), Math.round(surcharged.base * 1.1 * .4 * .97));
assert.throws(() => guaranteeFee({ ...hug, welfare: 'lowIncome,newlywed' }), /하나만/);

const dc = { regular: 36000000, annual: 2400000, mode: 'standard', paid: 3000000 };
assert.equal(retirementContribution(dc).minimum, 3200000);
assert.equal(retirementContribution(dc).difference, 200000);
assert.equal(retirementContribution({ ...dc, regular: 27000000, mode: 'leave', leave: 3 }).minimum, 3200000);
assert.throws(() => retirementContribution({ ...dc, mode: 'leave', leave: 12 }), /12개월 미만/);

const rent = ranks.apartment({ area: 84, ownFee: 150000, region: '서울' }, management);
assert.equal(rent.rows.length, 16);
assert.equal(management.national, 1422);
assert.equal(rent.selected.referenceFee, 143976);
assert.equal(rent.difference, 6024);
assert.ok(rent.rows.some(row => row.name === '전남·광주'));
for (const model of ev.models) {
    assert.equal(model.amounts.length, ev.regions.length);
    for (const [government, local, total] of model.amounts) assert.equal(government + local, total);
}
const modelY = ranks.electricVehicle({ model: 'model-y', region: '수원시' }, ev);
assert.equal(modelY.selected.value, 240);
assert.equal(modelY.selected.rank, 1);
assert.ok(modelY.rows.slice(1).every(row => row.rank === 2));

const school = { order: 'high', region: '', type: '', school: '', page: 1 };
const all = ranks.tuition(school, tuition);
assert.equal(all.population, 214);
assert.equal(all.first.value, 9898886);
assert.equal(all.pageCount, 9);
assert.equal(all.visible.length, 25);
assert.ok(tuition.schools.every(row => row[3] > 0));
assert.equal(new Set(tuition.schools.map(row => row[0])).size, 214);
assert.equal(ranks.tuition({ ...school, page: 9 }, tuition).visible.length, 14);
const filtered = ranks.tuition({ ...school, region: '서울', type: '사립', school: '연세대' }, tuition);
assert.equal(filtered.population > 1, true);
assert.equal(filtered.matches, 1);
assert.equal(filtered.visible[0].name, '연세대학교');
assert.equal(ranks.tuition({ ...school, order: 'low' }, tuition).first.value, 762435.9);

console.log('STATIC_FINANCE_AND_PUBLISHED_RANKS_VALID tools=8');
