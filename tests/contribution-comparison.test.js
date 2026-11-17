const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const w = {};
const context = vm.createContext({ window: w, console });
for (const file of ['hometown-donation-math', 'pension-buyback-math', 'irp-fee-data', 'irp-fee-rank-math', 'unsold-housing-data', 'unsold-housing-rank-math']) vm.runInContext(fs.readFileSync(path.join(__dirname, '../scripts/' + file + '.js'), 'utf8'), context);
const near = (a, b) => assert.ok(Math.abs(a - b) < 0.00001, `${a} != ${b}`);
const donation = { scope: 'general', donation: 200000, gift: 60000, confirmed: true };
for (const [amount, credit] of [[0, 0], [100000, 100000], [200000, 144000], [1000000, 276000], [20000000, 3411000]]) near(w.HometownDonationMath.calculate({ ...donation, donation: amount, gift: 0 }).nominal, credit);
for (const amount of [99999, 100001, 199999, 200001]) {
    const a = w.HometownDonationMath.calculate({ ...donation, donation: amount, gift: 0 });
    assert.ok(a.nominal <= amount && a.nominal >= 0);
}
const capped = w.HometownDonationMath.calculate({ ...donation, useTaxLimit: true, incomeLimit: 50000, localLimit: 5000 });
near(capped.actual.total, 55000); near(capped.actual.cashCost, 145000);
const asymmetric = w.HometownDonationMath.calculate({ ...donation, useTaxLimit: true, incomeLimit: 0, localLimit: 1000000 });
near(asymmetric.actual.total, 0); // No local credit without an actual national credit.
near(w.HometownDonationMath.calculate({ ...donation, useTaxLimit: true, incomeLimit: 50000, localLimit: 1000 }).actual.total, 51000);
assert.equal(w.HometownDonationMath.calculate({ ...donation, confirmed: false, useTaxLimit: true }).actual, null);
assert.equal(w.HometownDonationMath.calculate(donation).actual, null);
for (const bad of [{ donation: '' }, { donation: 20000001 }, { donation: -1 }, { gift: 60001 }, { scope: 'business' }, { scope: 'disaster' }, { useTaxLimit: true, incomeLimit: '', localLimit: 0 }]) assert.throws(() => w.HometownDonationMath.calculate({ ...donation, ...bad }));
const buyback = { mode: 'estimate', membership: 'standard', deadlineYear: '2026', base: 2000000, months: 60, useRecovery: true, beforePension: 700000, afterPension: 800000, startAge: 65, extraCost: 0 };
let r = w.PensionBuybackMath.calculate(buyback);
near(r.principal, 11400000); assert.equal(r.recovery.recoveryMonths, 114); assert.equal(r.recovery.ageMonths, 74 * 12 + 6);
near(w.PensionBuybackMath.calculate({ ...buyback, deadlineYear: '2027' }).principal, 12000000);
r = w.PensionBuybackMath.calculate({ ...buyback, membership: 'voluntary', base: 6590000, months: 119 });
near(r.base, 3193511); near(r.principal, 3193511 * 0.095 * 119);
assert.equal(w.PensionBuybackMath.calculate({ ...buyback, afterPension: 700000 }).recovery.recoveryMonths, null);
assert.equal(w.PensionBuybackMath.calculate({ ...buyback, useRecovery: false }).recovery, null);
r = w.PensionBuybackMath.calculate({ ...buyback, mode: 'quote', quotedCost: 100, extraCost: 1, beforePension: 0, afterPension: 10 });
assert.equal(r.recovery.recoveryMonths, 11); // Whole-month recovery rounds up, never down.
for (const bad of [{ base: '' }, { base: 2000001 }, { months: 0 }, { months: 120 }, { months: 1.5 }, { afterPension: 699999 }, { startAge: '' }, { mode: 'quote', quotedCost: 0 }]) assert.throws(() => w.PensionBuybackMath.calculate({ ...buyback, ...bad }));
const irp = { balance: 20000000, funding: 'retirement', channel: 'online' };
r = w.IrpFeeRankMath.compare(w.IrpFeeData, irp);
assert.equal(r.rows.filter(p => p.rank === 1).length, 3); near(r.spread, 40000);
assert.equal(w.IrpFeeRankMath.compare(w.IrpFeeData, { ...irp, balance: 50000000 }).rows.every(p => p.rank === 1 && p.fee === 0), true);
near(w.IrpFeeRankMath.compare(w.IrpFeeData, { ...irp, balance: 49999999 }).rows.find(p => p.id === 'kb-bank').fee, 99999.998);
r = w.IrpFeeRankMath.compare(w.IrpFeeData, { ...irp, channel: 'branch', balance: 200000000 });
near(r.rows.find(p => p.id === 'samsung').fee, 580000); // Tiered fees, not lowest rate applied to entire balance.
near(r.rows.find(p => p.id === 'mirae').fee, 580000);
near(r.rows.find(p => p.id === 'kb-securities').fee, 475000);
for (const balance of [99999999, 100000000]) {
    r = w.IrpFeeRankMath.compare(w.IrpFeeData, { ...irp, funding: 'personal', balance });
    near(r.rows.find(p => p.id === 'kb-bank').fee, balance * (balance < 100000000 ? 0.0023 : 0.0021));
}
assert.throws(() => w.IrpFeeRankMath.compare(w.IrpFeeData, { ...irp, balance: '' }));
assert.throws(() => w.IrpFeeRankMath.compare(w.IrpFeeData, { ...irp, channel: 'invalid' }));
r = w.UnsoldHousingRankMath.compare(w.UnsoldHousingData, { region: '경기', metric: 'total' });
assert.equal(r.rows.length, 16); assert.equal(r.selected.rank, 1); assert.equal(r.selected.count, 13802); assert.equal(r.selected.change, -707); assert.equal(r.selected.completedChange, 83);
assert.equal(w.UnsoldHousingRankMath.compare(w.UnsoldHousingData, { region: '대구', metric: 'completed' }).selected.rank, 1);
assert.equal(w.UnsoldHousingRankMath.compare(w.UnsoldHousingData, { region: '세종', metric: 'share' }).selected.rank, 1);
assert.equal(w.UnsoldHousingRankMath.compare(w.UnsoldHousingData, { region: '울산', metric: 'change' }).selected.rank, 1);
const damaged = JSON.parse(JSON.stringify(w.UnsoldHousingData)); damaged.regions[0].total[5]++;
assert.throws(() => w.UnsoldHousingRankMath.compare(damaged, { region: '서울', metric: 'total' }));
assert.throws(() => w.UnsoldHousingRankMath.compare(w.UnsoldHousingData, { region: '광주', metric: 'total' }));
console.log('CONTRIBUTION_COMPARISON_VALID tax bands/caps, pension cost/recovery, fee tiers/ties, official housing sums and metrics');
