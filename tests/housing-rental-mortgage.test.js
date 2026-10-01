const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
function load(context, file) {
    vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, { filename: file });
}

const taxWindow = {};
const taxContext = vm.createContext({ window: taxWindow });
load(taxContext, 'scripts/comprehensive-income-tax-math.js');
load(taxContext, 'scripts/housing-rental-income-tax-math.js');
const tax = taxWindow.HousingRentalIncomeTaxMath.calculate;
const ordinary = { monthlyRent: 20000000, deemedRent: 0, actualExpenses: 12000000,
    registration: 'unregistered', otherIncomeAmount: 0, otherTaxBase: 0 };
const officialExample = tax(ordinary);
assert.equal(officialExample.separate.base, 8000000);
assert.equal(officialExample.separate.national, 1120000);
assert.equal(officialExample.separate.local, 112000);
assert.equal(officialExample.comprehensive.increase, 528000);
assert.equal(officialExample.difference, 704000);
const registered = tax({ ...ordinary, registration: 'registered' });
assert.equal(registered.separate.expense, 12000000);
assert.equal(registered.separate.deduction, 4000000);
assert.equal(registered.separate.national, 560000);
assert.equal(tax({ ...ordinary, monthlyRent: 20000001 }).separate, null);
assert.equal(tax({ ...ordinary, otherIncomeAmount: 20000000, otherTaxBase: 14000000 }).separate.deduction, 2000000);
assert.equal(tax({ ...ordinary, otherIncomeAmount: 20000001, otherTaxBase: 14000000 }).separate.deduction, 0);
assert.throws(() => tax({ ...ordinary, actualExpenses: 20000001 }), /결손/);
assert.throws(() => tax({ ...ordinary, otherTaxBase: 1 }), /과세표준/);

const loanWindow = {};
const loanContext = vm.createContext({ window: loanWindow, Date });
load(loanContext, 'scripts/loan-math.js');
load(loanContext, 'scripts/mortgage-rate-data.js');
load(loanContext, 'scripts/mortgage-rate-rank-math.js');
const data = loanWindow.MortgageRateData;
assert.equal(data.products.length, data.sourceRows);
assert.ok(data.products.length > 100);
assert.ok(data.products.every(item => item.sourceUrl.startsWith('https://finlife.fss.or.kr/')));
const options = { amount: 100000000, years: 30, rateMode: 'average', sector: 'all', rateType: 'all', repayment: 'all', query: '' };
const ranked = loanWindow.MortgageRateRankMath.rank(data.products, options);
assert.ok(ranked.length > 0);
assert.ok(ranked.every(item => item.avgRate !== null));
assert.ok(ranked.every((item, index) => index === 0 || item.appliedRate >= ranked[index - 1].appliedRate));
assert.ok(ranked[0].firstPayment > 0 && ranked[0].totalInterest >= 0);
const fixed = loanWindow.MortgageRateRankMath.rank(data.products, { ...options, rateType: 'F', repayment: 'D2', sector: 'bank' });
assert.ok(fixed.length > 0 && fixed.every(item => item.rateType === 'F' && item.repayment === 'D2' && item.sector === 'bank'));
const mortgageExample = loanWindow.MortgageRateRankMath.rank([
    { id: 'a', company: '가은행', name: 'A', sector: 'bank', rateType: 'F', repayment: 'D2', minRate: 4, maxRate: 5, avgRate: 4.5 },
    { id: 'b', company: '나은행', name: 'B', sector: 'bank', rateType: 'F', repayment: 'D2', minRate: 4, maxRate: 5, avgRate: 4.5 },
    { id: 'c', company: '다은행', name: 'C', sector: 'bank', rateType: 'F', repayment: 'D2', minRate: 4.2, maxRate: 5, avgRate: null }
], options);
assert.equal(mortgageExample.length, 2);
assert.deepEqual(Array.from(mortgageExample, item => item.rank), [1, 1]);
assert.throws(() => loanWindow.MortgageRateRankMath.rank(data.products, { ...options, years: 0 }), /1~50년/);

console.log('HOUSING_RENTAL_MORTGAGE_VALID');
