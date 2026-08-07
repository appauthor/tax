const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const projectRoot = path.resolve(__dirname, '..');

function loadScript(relativePath, globals = {}) {
    const context = vm.createContext({
        console,
        Math,
        Number,
        String,
        Array,
        Object,
        Date,
        Infinity,
        URL,
        URLSearchParams,
        ...globals
    });
    const source = fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
    vm.runInContext(source, context, { filename: relativePath });
    return context;
}

function assertNear(actual, expected, tolerance, label) {
    assert.ok(
        Math.abs(actual - expected) <= tolerance,
        `${label}: expected ${expected}, received ${actual}`
    );
}

const loanWindow = {};
loadScript('scripts/loan-math.js', { window: loanWindow });
const LoanMath = loanWindow.LoanMath;

const equalPayment = LoanMath.createSchedule({
    principal: 100000000,
    annualRate: 4,
    months: 360,
    method: 'equal-payment'
});
assert.equal(equalPayment.rows.length, 360);
assertNear(equalPayment.rows.at(-1).balance, 0, 0.01, '원리금균등 최종 잔액');
assertNear(equalPayment.totalPayment - equalPayment.totalInterest, 100000000, 0.01, '원리금균등 원금 합계');

const equalPrincipal = LoanMath.createSchedule({
    principal: 12000000,
    annualRate: 6,
    months: 12,
    method: 'equal-principal'
});
assert.ok(equalPrincipal.firstPayment > equalPrincipal.lastPayment);
assertNear(equalPrincipal.totalPayment - equalPrincipal.totalInterest, 12000000, 0.01, '원금균등 원금 합계');

const bullet = LoanMath.createSchedule({
    principal: 12000000,
    annualRate: 6,
    months: 12,
    method: 'bullet'
});
assertNear(bullet.firstPayment, 60000, 0.01, '만기일시상환 월 이자');
assertNear(bullet.lastPayment, 12060000, 0.01, '만기일시상환 마지막 납입액');

const ltv = LoanMath.calculateLtv({
    collateralValue: 1000000000,
    existingSecuredDebt: 200000000,
    priorityDeductions: 50000000,
    requestedLoan: 500000000,
    limitRatio: 70
});
assert.equal(ltv.grossLimit, 700000000);
assert.equal(ltv.availableAdditionalLoan, 450000000);
assert.equal(ltv.shortfall, 50000000);
assertNear(ltv.adjustedRequestedLtv, 75, 0.0001, '선순위 차감 반영 LTV');

const dtiInputs = {
    annualIncome: 70000000,
    existingMortgagePrincipal: 10000000,
    existingMortgageInterest: 4000000,
    otherLoanInterest: 1000000,
    limitRatio: 40,
    principal: 300000000,
    annualRate: 4,
    months: 360,
    method: 'equal-payment'
};
const newDti = LoanMath.calculateDti({ ...dtiInputs, mode: 'new-dti' });
const legacyDti = LoanMath.calculateDti({ ...dtiInputs, mode: 'legacy' });
assert.equal(newDti.existingBurden, 15000000);
assert.equal(legacyDti.existingBurden, 5000000);
assert.ok(newDti.totalDti > legacyDti.totalDti);

const overdraft = LoanMath.calculateSimpleInterest({
    balance: 10000000,
    annualRate: 6,
    days: 10,
    dayBasis: 365
});
assertNear(overdraft.periodInterest, 16438.356164, 0.01, '마이너스통장 기간 이자');

const autoInstallment = LoanMath.createBalloonSchedule({
    principal: 30000000,
    annualRate: 5.5,
    months: 60,
    balloon: 10000000
});
assertNear(autoInstallment.totalPayment - autoInstallment.totalInterest, 30000000, 0.01, '자동차 할부 원금 합계');
assertNear(autoInstallment.rows.at(-1).balance, 0, 0.01, '자동차 할부 최종 잔액');
assert.ok(autoInstallment.finalPayment > autoInstallment.regularPayment);

const common = loadScript('scripts/common.js', {
    window: {},
    document: {},
    alert() {}
});
assert.equal(common.getProgressiveTax(100000000), 10000000);
assert.equal(common.getProgressiveTax(500000000), 90000000);
assert.equal(common.getProgressiveTax(1000000000), 240000000);

const acquisition = loadScript('scripts/acquisition-tax.js', {
    document: {},
    daum: {},
    getMoneyValue() {},
    updateReportHeaders() {},
    icon() {},
    showResult() {},
    alert() {}
});
assertNear(acquisition.getStandardAcquisitionRate(600000000), 0.01, 0.000001, '6억 원 취득세율');
assertNear(acquisition.getStandardAcquisitionRate(900000000), 0.03, 0.000001, '9억 원 취득세율');
assert.equal(acquisition.getAcquisitionTaxRate(500000000, 'second'), 0.08);
assert.equal(acquisition.getAcquisitionTaxRate(500000000, 'third'), 0.12);

const transfer = loadScript('scripts/transfer-tax.js', {
    document: {},
    getMoneyValue() {},
    updateReportHeaders() {},
    icon() {},
    showResult() {},
    alert() {}
});
assert.equal(transfer.getTransferProgressiveTax(14000000), 840000);
assertNear(transfer.getLongTermDeductionRate('oneHome', 10, 10), 0.8, 0.000001, '1주택 장기보유 공제율');
assertNear(transfer.getLongTermDeductionRate('general', 20, 0), 0.3, 0.000001, '일반주택 장기보유 공제율 상한');
assert.equal(transfer.getTransferIncomeTax(10000000, 'shortTerm', 0.5), 7000000);

console.log('CALCULATION_REGRESSION_VALID');
