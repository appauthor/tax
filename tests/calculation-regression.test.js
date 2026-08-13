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

const investmentWindow = {};
loadScript('scripts/investment-tax-math.js', { window: investmentWindow });
const InvestmentTaxMath = investmentWindow.InvestmentTaxMath;

const businessVehicleWindow = {};
loadScript('scripts/business-vehicle-tax-math.js', { window: businessVehicleWindow });
const BusinessVehicleTaxMath = businessVehicleWindow.BusinessVehicleTaxMath;

const vatFromSupply = BusinessVehicleTaxMath.calculateVat({ mode: 'supply', amount: 1000000, rounding: 'floor' });
assert.equal(vatFromSupply.vat, 100000);
assert.equal(vatFromSupply.total, 1100000);

const vatFromTotal = BusinessVehicleTaxMath.calculateVat({ mode: 'total', amount: 10000, rounding: 'floor' });
assert.equal(vatFromTotal.supply, 9090);
assert.equal(vatFromTotal.vat, 910);
assert.equal(vatFromTotal.total, 10000);
assert.equal(BusinessVehicleTaxMath.calculateVat({ mode: 'supply', amount: 1, rounding: 'round' }).vat, 0);
assert.equal(BusinessVehicleTaxMath.calculateVat({ mode: 'supply', amount: 1, rounding: 'ceil' }).vat, 1);
assert.equal(BusinessVehicleTaxMath.calculateVat({ mode: 'supply', amount: 0, rounding: 'floor' }).total, 0);
assert.throws(() => BusinessVehicleTaxMath.calculateVat({ mode: 'total', amount: -1 }), /non-negative/);

const vehicleAcquisition = BusinessVehicleTaxMath.calculateVehicleAcquisition({
    purchasePrice: 30000000,
    taxBase: 30000000,
    vehicleType: 'non-business-passenger',
    registrationCosts: 50000,
    otherCosts: 150000
});
assert.equal(vehicleAcquisition.acquisitionTax, 2100000);
assert.equal(vehicleAcquisition.userEnteredCosts, 200000);
assert.equal(vehicleAcquisition.estimatedPurchaseTotal, 32300000);
assert.equal(BusinessVehicleTaxMath.calculateVehicleAcquisition({ purchasePrice: 1, taxBase: 1, vehicleType: 'light-vehicle' }).acquisitionTax, 0);
assert.equal(BusinessVehicleTaxMath.calculateVehicleAcquisition({ purchasePrice: 1000000, taxBase: 1000000, vehicleType: 'light-vehicle' }).acquisitionTax, 40000);
assert.equal(BusinessVehicleTaxMath.calculateVehicleAcquisition({ purchasePrice: 1000000, taxBase: 1000000, vehicleType: 'other-non-business' }).acquisitionTax, 50000);
assert.equal(BusinessVehicleTaxMath.calculateVehicleAcquisition({ purchasePrice: 1000000, taxBase: 1000000, vehicleType: 'business' }).acquisitionTax, 40000);
assert.equal(BusinessVehicleTaxMath.calculateVehicleAcquisition({ purchasePrice: 1000000, taxBase: 1000000, vehicleType: 'small-motorcycle' }).acquisitionTax, 20000);
assert.equal(BusinessVehicleTaxMath.calculateVehicleAcquisition({ purchasePrice: 1000000, taxBase: 1000000, vehicleType: 'other-vehicle' }).acquisitionTax, 20000);
assert.equal(BusinessVehicleTaxMath.truncateLocalTax(12349), 12340);

const twoChildCappedPassenger = BusinessVehicleTaxMath.calculateVehicleAcquisition({
    purchasePrice: 30000000,
    taxBase: 30000000,
    vehicleType: 'non-business-passenger',
    under18ChildCount: 2,
    multiChildVehicleCategory: 'other-passenger',
    multiChildEligibilityConfirmed: true
});
assert.equal(twoChildCappedPassenger.acquisitionTax, 2100000);
assert.equal(twoChildCappedPassenger.multiChildReduction, 700000);
assert.equal(twoChildCappedPassenger.payableAcquisitionTax, 1400000);
assert.equal(twoChildCappedPassenger.estimatedPurchaseTotal, 31400000);
assert.equal(twoChildCappedPassenger.multiChild.rule, 'two-children-700000-cap');

const twoChildHalfReduction = BusinessVehicleTaxMath.calculateMultiChildVehicleReduction({
    acquisitionTax: 2100000,
    under18ChildCount: 2,
    vehicleCategory: 'passenger-7-10',
    eligibilityConfirmed: true
});
assert.equal(twoChildHalfReduction.reduction, 1050000);
assert.equal(twoChildHalfReduction.payableAcquisitionTax, 1050000);

const twoChildRoundingBoundary = BusinessVehicleTaxMath.calculateMultiChildVehicleReduction({
    acquisitionTax: 40010,
    under18ChildCount: 2,
    vehicleCategory: 'van-up-to-15',
    eligibilityConfirmed: true
});
assert.equal(twoChildRoundingBoundary.payableAcquisitionTax, 20000);
assert.equal(twoChildRoundingBoundary.reduction, 20010);

const threeChildCappedPassenger = BusinessVehicleTaxMath.calculateMultiChildVehicleReduction({
    acquisitionTax: 2100000,
    under18ChildCount: 3,
    vehicleCategory: 'other-passenger',
    eligibilityConfirmed: true
});
assert.equal(threeChildCappedPassenger.reduction, 1400000);
assert.equal(threeChildCappedPassenger.payableAcquisitionTax, 700000);

const threeChildExempt = BusinessVehicleTaxMath.calculateMultiChildVehicleReduction({
    acquisitionTax: 2000000,
    under18ChildCount: 3,
    vehicleCategory: 'truck-up-to-1-ton',
    eligibilityConfirmed: true
});
assert.equal(threeChildExempt.reduction, 2000000);
assert.equal(threeChildExempt.payableAcquisitionTax, 0);

const threeChildMinimumTax = BusinessVehicleTaxMath.calculateMultiChildVehicleReduction({
    acquisitionTax: 2100000,
    under18ChildCount: 3,
    vehicleCategory: 'passenger-7-10',
    eligibilityConfirmed: true
});
assert.equal(threeChildMinimumTax.reduction, 1785000);
assert.equal(threeChildMinimumTax.payableAcquisitionTax, 315000);
assert.equal(threeChildMinimumTax.rule, 'three-plus-85-percent-minimum-tax');

const unconfirmedMultiChild = BusinessVehicleTaxMath.calculateMultiChildVehicleReduction({
    acquisitionTax: 2100000,
    under18ChildCount: 3,
    vehicleCategory: 'passenger-7-10',
    eligibilityConfirmed: false
});
assert.equal(unconfirmedMultiChild.reduction, 0);
assert.equal(unconfirmedMultiChild.payableAcquisitionTax, 2100000);

const ineligibleMultiChildVehicle = BusinessVehicleTaxMath.calculateMultiChildVehicleReduction({
    acquisitionTax: 2100000,
    under18ChildCount: 3,
    vehicleCategory: 'ineligible',
    eligibilityConfirmed: true
});
assert.equal(ineligibleMultiChildVehicle.reduction, 0);
assert.throws(() => BusinessVehicleTaxMath.calculateMultiChildVehicleReduction({
    acquisitionTax: 1,
    under18ChildCount: -1
}), /non-negative integer/);

let acquisitionSubmitHandler;
let focusedAcquisitionControl = null;
function acquisitionControl(id, properties) {
    return {
        ...properties,
        attributes: {},
        setAttribute(name, value) { this.attributes[name] = value; },
        removeAttribute(name) { delete this.attributes[name]; },
        focus() { focusedAcquisitionControl = id; }
    };
}
const acquisitionUiElements = {
    vehicleAcquisitionCalculatorForm: { addEventListener: (_event, handler) => { acquisitionSubmitHandler = handler; } },
    vehiclePurchasePrice: { value: '30,000,000' },
    vehicleTaxBase: { value: '30,000,000' },
    vehicleAcquisitionType: acquisitionControl('vehicleAcquisitionType', { value: 'non-business-passenger', selectedOptions: [{ textContent: '비영업용 승용자동차 (7%)' }] }),
    under18ChildCount: acquisitionControl('under18ChildCount', { value: '2', selectedOptions: [{ textContent: '2명' }] }),
    multiChildVehicleCategory: acquisitionControl('multiChildVehicleCategory', { value: 'other-passenger' }),
    multiChildEligibility: acquisitionControl('multiChildEligibility', { value: 'confirmed' }),
    vehicleRegistrationCosts: { value: '0' },
    vehicleOtherCosts: { value: '0' },
    resultTableBody: { innerHTML: '' },
    formulaContent: { innerHTML: '' },
    multiChildValidationMessage: { textContent: '', hidden: true }
};
const acquisitionDocument = {
    getElementById: id => acquisitionUiElements[id] || null,
    addEventListener: (event, handler) => { if (event === 'DOMContentLoaded') handler(); }
};
loadScript('scripts/business-vehicle-tax-calculators.js', {
    window: { BusinessVehicleTaxMath },
    document: acquisitionDocument,
    getMoneyValue: id => Number(acquisitionUiElements[id].value.replaceAll(',', '')),
    icon: () => '',
    showResult: () => {},
    updateReportHeaders: () => {},
    alert: message => { throw new Error(message); }
});
assert.equal(typeof acquisitionSubmitHandler, 'function');
acquisitionSubmitHandler({ preventDefault: () => {} });
assert.match(acquisitionUiElements.resultTableBody.innerHTML, /다자녀 감면 \(2명\)/);
assert.match(acquisitionUiElements.resultTableBody.innerHTML, /\(-\) 700,000 원/);
assert.match(acquisitionUiElements.resultTableBody.innerHTML, /1,400,000 원/);
assert.match(acquisitionUiElements.formulaContent.innerHTML, /2자녀 일반 승용차 최대 70만원 공제/);

acquisitionUiElements.resultTableBody.innerHTML = '';
acquisitionUiElements.multiChildVehicleCategory.value = 'ineligible';
acquisitionSubmitHandler({ preventDefault: () => {} });
assert.equal(acquisitionUiElements.resultTableBody.innerHTML, '');
assert.equal(acquisitionUiElements.multiChildValidationMessage.hidden, false);
assert.match(acquisitionUiElements.multiChildValidationMessage.textContent, /대상 차량을 확인해 차량 구분을 선택/);
assert.equal(acquisitionUiElements.multiChildVehicleCategory.attributes['aria-invalid'], 'true');
assert.equal(focusedAcquisitionControl, 'multiChildVehicleCategory');

acquisitionUiElements.multiChildVehicleCategory.value = 'other-passenger';
acquisitionUiElements.under18ChildCount.value = '1';
acquisitionSubmitHandler({ preventDefault: () => {} });
assert.match(acquisitionUiElements.multiChildValidationMessage.textContent, /자녀 수를 2명 이상/);
assert.equal(focusedAcquisitionControl, 'under18ChildCount');

assert.equal(BusinessVehicleTaxMath.calculateVehicleAge(2026, 2024, 'first', 'first'), 3);
assert.equal(BusinessVehicleTaxMath.calculateVehicleAge(2026, 2024, 'second', 'first'), 2);
assert.equal(BusinessVehicleTaxMath.calculateVehicleAge(2026, 2024, 'second', 'second'), 3);
assert.equal(BusinessVehicleTaxMath.getAgeReductionRate(3), 0.05);
assert.equal(BusinessVehicleTaxMath.getAgeReductionRate(20), 0.5);
assert.equal(BusinessVehicleTaxMath.getPassengerRatePerCc('non-business', 1000), 80);
assert.equal(BusinessVehicleTaxMath.getPassengerRatePerCc('non-business', 1001), 140);
assert.equal(BusinessVehicleTaxMath.getPassengerRatePerCc('non-business', 1600), 140);
assert.equal(BusinessVehicleTaxMath.getPassengerRatePerCc('non-business', 1601), 200);
assert.equal(BusinessVehicleTaxMath.getPassengerRatePerCc('business', 1600), 18);
assert.equal(BusinessVehicleTaxMath.getPassengerRatePerCc('business', 1601), 19);
assert.equal(BusinessVehicleTaxMath.getPassengerRatePerCc('business', 2500), 19);
assert.equal(BusinessVehicleTaxMath.getPassengerRatePerCc('business', 2501), 24);

const annualVehicleTax = BusinessVehicleTaxMath.calculateVehicleAnnualTax({
    taxYear: 2026,
    vehicleKind: 'engine',
    usage: 'non-business',
    displacement: 1998,
    baseYear: 2026,
    baseHalf: 'first',
    prepaymentTiming: 'none'
});
assert.equal(annualVehicleTax.annualVehicleTax, 399600);
assert.equal(annualVehicleTax.localEducationTax, 119880);
assert.equal(annualVehicleTax.totalTax, 519480);

const agedVehicleTax = BusinessVehicleTaxMath.calculateVehicleAnnualTax({
    taxYear: 2026,
    vehicleKind: 'engine',
    usage: 'non-business',
    displacement: 1600,
    baseYear: 2024,
    baseHalf: 'second',
    prepaymentTiming: 'none'
});
assert.equal(agedVehicleTax.firstHalfReductionRate, 0);
assert.equal(agedVehicleTax.secondHalfReductionRate, 0.05);
assert.equal(agedVehicleTax.annualVehicleTax, 218400);

const januaryPrepayment = BusinessVehicleTaxMath.calculateVehicleAnnualTax({
    taxYear: 2026,
    vehicleKind: 'other',
    usage: 'non-business',
    displacement: 0,
    baseYear: 2026,
    baseHalf: 'first',
    prepaymentTiming: 'january'
});
assert.equal(januaryPrepayment.prepaymentDiscount, 4570);
assert.equal(januaryPrepayment.vehicleTaxAfterDiscount, 95430);
assert.equal(januaryPrepayment.localEducationTax, 28620);

const businessPassenger = BusinessVehicleTaxMath.calculateVehicleAnnualTax({
    taxYear: 2026,
    vehicleKind: 'engine',
    usage: 'business',
    displacement: 2501,
    baseYear: 2010,
    baseHalf: 'first',
    prepaymentTiming: 'none'
});
assert.equal(businessPassenger.annualVehicleTax, 60020);
assert.equal(businessPassenger.localEducationTax, 0);
assert.throws(() => BusinessVehicleTaxMath.calculateVehicleAnnualTax({ taxYear: 2027 }), /2026/);

assert.equal(InvestmentTaxMath.progressiveIncomeTax(100000000), 19560000);

const overseasStock = InvestmentTaxMath.calculateOverseasStockTax({
    proceeds: 80000000,
    acquisitionCost: 60000000,
    expenses: 1000000,
    otherStockIncome: -2000000,
    deductionAlreadyUsed: 0
});
assert.equal(overseasStock.netGain, 17000000);
assert.equal(overseasStock.taxableBase, 14500000);
assert.equal(overseasStock.totalTax, 3190000);

const securitiesTax = InvestmentTaxMath.calculateSecuritiesTransactionTax({
    saleAmount: 50000000,
    market: 'kospi',
    fees: 10000
});
assert.equal(securitiesTax.transactionTax, 25000);
assert.equal(securitiesTax.agricultureTax, 75000);
assert.equal(securitiesTax.totalTax, 100000);

const financialIncomeTax = InvestmentTaxMath.calculateFinancialIncomeTax({
    interest: 15000000,
    eligibleDividend: 10000000,
    otherDividend: 0,
    privateLoanInterest: 0,
    otherComprehensiveIncome: 50000000,
    deductions: 10000000,
    prepaidNationalTax: 3500000
});
assert.equal(financialIncomeTax.exceedsThreshold, true);
assert.equal(financialIncomeTax.grossUp, 500000);
assert.equal(financialIncomeTax.comparisonTaxA, 8365000);
assert.equal(financialIncomeTax.comparisonTaxB, 8240000);
assert.equal(financialIncomeTax.dividendTaxCredit, 125000);
assert.equal(financialIncomeTax.nationalTax, 8240000);

const retirementIncomeTax = InvestmentTaxMath.calculateRetirementIncomeTax({
    retirementPay: 100000000,
    nonTaxableIncome: 0,
    serviceYears: 20,
    prepaidNationalTax: 0
});
assert.equal(retirementIncomeTax.serviceYearsDeduction, 40000000);
assert.equal(retirementIncomeTax.convertedSalary, 36000000);
assert.equal(retirementIncomeTax.convertedSalaryDeduction, 24800000);
assert.equal(retirementIncomeTax.taxBase, 11200000);
assertNear(retirementIncomeTax.totalTax, 1232000, 0.01, '퇴직소득세 합계');

const privatePensionTax = InvestmentTaxMath.calculatePensionIncomeTax({
    mode: 'private-pension',
    amount: 12000000,
    age: 65,
    lifetime: false
});
assert.equal(privatePensionTax.nationalTax, 600000);
assert.equal(privatePensionTax.totalTax, 660000);

const deferredPensionTax = InvestmentTaxMath.calculatePensionIncomeTax({
    mode: 'deferred-retirement',
    amount: 10000000,
    lumpSumEquivalentTax: 1000000,
    pensionYear: 21
});
assert.equal(deferredPensionTax.reductionFactor, 0.5);
assert.equal(deferredPensionTax.totalTax, 550000);

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

let reportHeading = '해외주식 양도소득세 계산기';
const exportReport = loadScript('scripts/export-report.js', {
    window: { navigator: {} },
    document: {
        querySelector(selector) {
            return selector === 'h1' ? { textContent: reportHeading } : null;
        },
        getElementById() {
            return null;
        }
    },
    URL: { createObjectURL() {}, revokeObjectURL() {} },
    setTimeout() {}
});
assert.equal(
    exportReport.getCalculatorReportFileName('png'),
    '해외주식_양도소득세_계산기_계산_결과.png'
);
reportHeading = 'LTV·DSR 계산기';
assert.equal(
    exportReport.getCalculatorReportFileName('pdf'),
    'LTV_DSR_계산기_계산_결과.pdf'
);

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
