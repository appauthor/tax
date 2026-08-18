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

const propertyTaxWindow = {};
loadScript('scripts/property-tax-math.js', { window: propertyTaxWindow });
const PropertyTaxMath = propertyTaxWindow.PropertyTaxMath;

const oneHomePropertyTax = PropertyTaxMath.calculateApartmentPropertyTax({
    publicPrice: 600000000,
    oneHouseholdOneHome: true,
    urbanArea: true
});
assert.equal(oneHomePropertyTax.fairMarketRatio, 0.44);
assert.equal(oneHomePropertyTax.taxBase, 264000000);
assert.equal(oneHomePropertyTax.propertyTax, 348000);
assert.equal(oneHomePropertyTax.localEducationTax, 69600);
assert.equal(oneHomePropertyTax.urbanAreaTax, 369600);
assert.equal(oneHomePropertyTax.total, 787200);

const fiveHundredMillionPropertyTax = PropertyTaxMath.calculateApartmentPropertyTax({
    publicPrice: 500000000,
    oneHouseholdOneHome: true,
    urbanArea: true
});
assert.equal(fiveHundredMillionPropertyTax.taxBase, 220000000);
assert.equal(fiveHundredMillionPropertyTax.propertyTax, 260000);
assert.equal(fiveHundredMillionPropertyTax.total, 620000);

const threeBillionPropertyTax = PropertyTaxMath.calculateApartmentPropertyTax({
    publicPrice: 3000000000,
    oneHouseholdOneHome: true,
    urbanArea: true
});
assert.equal(threeBillionPropertyTax.specialRateApplied, false);
assert.equal(threeBillionPropertyTax.taxBase, 1350000000);
assert.equal(threeBillionPropertyTax.propertyTax, 4770000);
assert.equal(threeBillionPropertyTax.total, 7614000);

const generalPropertyTax = PropertyTaxMath.calculateApartmentPropertyTax({
    publicPrice: 600000000,
    oneHouseholdOneHome: false,
    urbanArea: true
});
assert.equal(generalPropertyTax.taxBase, 360000000);
assert.equal(generalPropertyTax.propertyTax, 810000);
assert.equal(generalPropertyTax.total, 1476000);
assert.equal(PropertyTaxMath.calculateApartmentPropertyTax({ publicPrice: 0 }).total, 0);
assert.throws(() => PropertyTaxMath.calculateApartmentPropertyTax({ publicPrice: -1 }), /non-negative/);

const cappedPropertyTax = PropertyTaxMath.calculateApartmentPropertyTax({
    publicPrice: 600000000,
    oneHouseholdOneHome: true,
    urbanArea: false,
    previousTaxBase: 200000000
});
assert.equal(cappedPropertyTax.taxBase, 213200000);
assert.equal(cappedPropertyTax.taxBaseLimitApplied, true);
assert.equal(cappedPropertyTax.propertyTax, 246400);

const generalComprehensiveTax = PropertyTaxMath.calculateComprehensiveHousingTax({
    publicPrice: 1500000000,
    homeCount: 1
});
assert.equal(generalComprehensiveTax.deduction, 900000000);
assert.equal(generalComprehensiveTax.taxBase, 360000000);
assert.equal(generalComprehensiveTax.comprehensiveTax, 1920000);
assert.equal(generalComprehensiveTax.ruralSpecialTax, 384000);
assert.equal(generalComprehensiveTax.total, 2304000);

const oneHomeComprehensiveTax = PropertyTaxMath.calculateComprehensiveHousingTax({
    publicPrice: 1500000000,
    homeCount: 1,
    oneHouseholdOneHome: true,
    age: 65,
    holdingYears: 10
});
assert.equal(oneHomeComprehensiveTax.deduction, 1200000000);
assert.equal(oneHomeComprehensiveTax.combinedCreditRate, 0.7);
assert.equal(oneHomeComprehensiveTax.oneHomeCredit, 630000);
assert.equal(oneHomeComprehensiveTax.comprehensiveTax, 270000);
assert.equal(oneHomeComprehensiveTax.total, 324000);

[
    [2000000000, 480000000, 2760000],
    [3000000000, 1080000000, 8400000],
    [4000000000, 1680000000, 15840000],
    [5000000000, 2280000000, 23640000]
].forEach(([publicPrice, expectedBase, expectedTax]) => {
    const example = PropertyTaxMath.calculateComprehensiveHousingTax({
        publicPrice,
        homeCount: 1,
        oneHouseholdOneHome: true
    });
    assert.equal(example.taxBase, expectedBase);
    assert.equal(example.taxBeforePropertyCredit, expectedTax);
});

const threeHomeComprehensiveTax = PropertyTaxMath.calculateComprehensiveHousingTax({
    publicPrice: 4000000000,
    homeCount: 3
});
assert.equal(threeHomeComprehensiveTax.rateGroup, 'threeOrMore');
assert.equal(threeHomeComprehensiveTax.comprehensiveTax, 22800000);
assert.equal(PropertyTaxMath.calculateComprehensiveHousingTax({ publicPrice: 900000000 }).total, 0);

const burdenCappedComprehensiveTax = PropertyTaxMath.calculateComprehensiveHousingTax({
    publicPrice: 1500000000,
    homeCount: 1,
    currentPropertyTax: 1000000,
    confirmedPropertyTaxCredit: 0,
    previousPropertyTax: 500000,
    previousComprehensiveTax: 500000
});
assert.equal(burdenCappedComprehensiveTax.burdenCap, 1500000);
assert.equal(burdenCappedComprehensiveTax.burdenCapCredit, 1420000);
assert.equal(burdenCappedComprehensiveTax.comprehensiveTax, 500000);

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

const businessWithholding = BusinessVehicleTaxMath.calculateBusinessIncomeWithholding(3000000);
assert.equal(businessWithholding.incomeTax, 90000);
assert.equal(businessWithholding.localIncomeTax, 9000);
assert.equal(businessWithholding.totalWithholding, 99000);
assert.equal(businessWithholding.netPayment, 2901000);

const vatExtraBusinessComparison = BusinessVehicleTaxMath.calculateFreelancerBusinessTaxComparison({
    contractAmount: 3000000,
    pricingMode: 'vat-extra',
    expenseSupply: 500000,
    deductibleInputVat: 50000
});
assert.equal(vatExtraBusinessComparison.freelancer.cashAfterExpenses, 2351000);
assert.equal(vatExtraBusinessComparison.business.supply, 3000000);
assert.equal(vatExtraBusinessComparison.business.outputVat, 300000);
assert.equal(vatExtraBusinessComparison.business.invoiceTotal, 3300000);
assert.equal(vatExtraBusinessComparison.business.vatPayable, 250000);
assert.equal(vatExtraBusinessComparison.business.vatRefund, 0);
assert.equal(vatExtraBusinessComparison.business.cashAfterExpenses, 2500000);
assert.equal(vatExtraBusinessComparison.cashDifference, 149000);

const fixedBudgetBusinessComparison = BusinessVehicleTaxMath.calculateFreelancerBusinessTaxComparison({
    contractAmount: 3000000,
    pricingMode: 'fixed-total',
    expenseSupply: 500000,
    deductibleInputVat: 50000
});
assert.equal(fixedBudgetBusinessComparison.business.supply, 2727272);
assert.equal(fixedBudgetBusinessComparison.business.outputVat, 272728);
assert.equal(fixedBudgetBusinessComparison.business.invoiceTotal, 3000000);
assert.equal(fixedBudgetBusinessComparison.business.vatPayable, 222728);
assert.equal(fixedBudgetBusinessComparison.business.cashAfterExpenses, 2227272);
assert.equal(fixedBudgetBusinessComparison.cashDifference, -123728);

const inputVatRefundComparison = BusinessVehicleTaxMath.calculateFreelancerBusinessTaxComparison({
    contractAmount: 1000000,
    pricingMode: 'vat-extra',
    expenseSupply: 2000000,
    deductibleInputVat: 200000
});
assert.equal(inputVatRefundComparison.business.vatPayable, 0);
assert.equal(inputVatRefundComparison.business.vatRefund, 100000);
assert.equal(inputVatRefundComparison.business.cashAfterExpenses, -1000000);

const oneWonBusinessComparison = BusinessVehicleTaxMath.calculateFreelancerBusinessTaxComparison({
    contractAmount: 1,
    pricingMode: 'vat-extra'
});
assert.equal(oneWonBusinessComparison.freelancer.totalWithholding, 0);
assert.equal(oneWonBusinessComparison.business.outputVat, 0);
assert.equal(oneWonBusinessComparison.cashDifference, 0);
assert.throws(() => BusinessVehicleTaxMath.calculateFreelancerBusinessTaxComparison({ contractAmount: 0 }), /greater than zero/);
assert.throws(() => BusinessVehicleTaxMath.calculateFreelancerBusinessTaxComparison({ contractAmount: 1, pricingMode: 'unknown' }), /pricing mode/);
assert.throws(() => BusinessVehicleTaxMath.calculateFreelancerBusinessTaxComparison({ contractAmount: 1, expenseSupply: -1 }), /non-negative/);

const vatTypeComparison = BusinessVehicleTaxMath.calculateSimplifiedGeneralVatComparison({
    annualSalesConsideration: 60000000,
    priorYearSalesConsideration: 60000000,
    industryRate: 0.15,
    eligiblePurchaseConsideration: 22000000,
    generalDeductibleInputVat: 2000000
});
assert.equal(vatTypeComparison.basicEligibility, true);
assert.equal(vatTypeComparison.eligibilityThreshold, 104000000);
assert.equal(vatTypeComparison.general.supply, 54545454);
assert.equal(vatTypeComparison.general.outputVat, 5454546);
assert.equal(vatTypeComparison.general.vatPayable, 3454546);
assert.equal(vatTypeComparison.simplified.baseTax, 900000);
assert.equal(vatTypeComparison.simplified.purchaseCredit, 110000);
assert.equal(vatTypeComparison.simplified.vatPayable, 790000);
assert.equal(vatTypeComparison.cashDifference, 2664546);

const belowPaymentExemption = BusinessVehicleTaxMath.calculateSimplifiedGeneralVatComparison({
    annualSalesConsideration: 47999999,
    priorYearSalesConsideration: 103999999,
    industryRate: 0.3
});
assert.equal(belowPaymentExemption.simplified.paymentExemptionApplies, true);
assert.equal(belowPaymentExemption.simplified.vatPayable, 0);
assert.equal(belowPaymentExemption.basicEligibility, true);

const atPaymentExemptionBoundary = BusinessVehicleTaxMath.calculateSimplifiedGeneralVatComparison({
    annualSalesConsideration: 48000000,
    priorYearSalesConsideration: 104000000,
    industryRate: 0.15
});
assert.equal(atPaymentExemptionBoundary.simplified.paymentExemptionApplies, false);
assert.equal(atPaymentExemptionBoundary.simplified.vatPayable, 720000);

assert.equal(
    BusinessVehicleTaxMath.calculateProgressiveTax(20000000, BusinessVehicleTaxMath.SOLE_CORPORATION_RULES_2026.personalIncomeTaxBrackets),
    1740000
);
assert.equal(BusinessVehicleTaxMath.calculateEarnedIncomeDeduction(5000000), 3500000);
assert.equal(BusinessVehicleTaxMath.calculateEarnedIncomeDeduction(60000000), 12750000);
assert.equal(BusinessVehicleTaxMath.calculateEarnedIncomeDeduction(500000000), 20000000);

const soleCorporationComparison = BusinessVehicleTaxMath.calculateSoleProprietorCorporationComparison({
    annualRevenue: 200000000,
    businessExpenses: 80000000,
    otherComprehensiveIncome: 0,
    personalDeductions: 15000000,
    soleProprietorInsurance: 8000000,
    representativeSalary: 60000000,
    corporationAdminCost: 5000000,
    employerSocialInsurance: 6000000,
    employeeSocialInsurance: 6000000
});
assert.equal(soleCorporationComparison.businessProfit, 120000000);
assert.equal(soleCorporationComparison.sole.taxBase, 97000000);
assert.equal(soleCorporationComparison.sole.incomeTax, 18510000);
assert.equal(soleCorporationComparison.sole.localIncomeTax, 1851000);
assert.equal(soleCorporationComparison.sole.availableCash, 91639000);
assert.equal(soleCorporationComparison.corporation.taxBase, 49000000);
assert.equal(soleCorporationComparison.corporation.incomeTax, 4900000);
assert.equal(soleCorporationComparison.corporation.localIncomeTax, 490000);
assert.equal(soleCorporationComparison.owner.earnedIncomeDeduction, 12750000);
assert.equal(soleCorporationComparison.owner.taxBase, 26250000);
assert.equal(soleCorporationComparison.owner.incomeTax, 2677500);
assert.equal(soleCorporationComparison.owner.localIncomeTax, 267750);
assert.equal(soleCorporationComparison.corporation.retainedEarnings, 43610000);
assert.equal(soleCorporationComparison.corporateEconomicValue, 94664750);
assert.equal(soleCorporationComparison.economicValueDifference, 3025750);
assert.equal(soleCorporationComparison.comparisonFinal, true);
assert.ok(soleCorporationComparison.breakEvenBusinessProfit !== null);

const confirmedDividendComparison = BusinessVehicleTaxMath.calculateSoleProprietorCorporationComparison({
    annualRevenue: 200000000,
    businessExpenses: 80000000,
    personalDeductions: 15000000,
    soleProprietorInsurance: 8000000,
    representativeSalary: 60000000,
    corporationAdminCost: 5000000,
    employerSocialInsurance: 6000000,
    employeeSocialInsurance: 6000000,
    plannedDividend: 10000000,
    dividendFinalTaxConfirmed: true
});
assert.equal(confirmedDividendComparison.owner.dividendIncomeTax, 1400000);
assert.equal(confirmedDividendComparison.owner.dividendLocalIncomeTax, 140000);
assert.equal(confirmedDividendComparison.corporation.retainedEarnings, 33610000);
assert.equal(confirmedDividendComparison.comparisonFinal, true);

const provisionalDividendComparison = BusinessVehicleTaxMath.calculateSoleProprietorCorporationComparison({
    annualRevenue: 100000000,
    businessExpenses: 20000000,
    representativeSalary: 30000000,
    plannedDividend: 10000000
});
assert.equal(provisionalDividendComparison.comparisonFinal, false);
assert.throws(() => BusinessVehicleTaxMath.calculateSoleProprietorCorporationComparison({
    annualRevenue: 200000000,
    businessExpenses: 0,
    plannedDividend: 20000001,
    dividendFinalTaxConfirmed: true
}), /financial income threshold/);
assert.throws(() => BusinessVehicleTaxMath.calculateSoleProprietorCorporationComparison({
    annualRevenue: 10000000,
    businessExpenses: 0,
    representativeSalary: 10000000,
    plannedDividend: 1
}), /plannedDividend/);
const zeroSoleCorporationComparison = BusinessVehicleTaxMath.calculateSoleProprietorCorporationComparison({
    annualRevenue: 0,
    businessExpenses: 0
});
assert.equal(zeroSoleCorporationComparison.sole.totalTax, 0);
assert.equal(zeroSoleCorporationComparison.corporateEconomicValue, 0);
const corporateLossComparison = BusinessVehicleTaxMath.calculateSoleProprietorCorporationComparison({
    annualRevenue: 10000000,
    businessExpenses: 0,
    representativeSalary: 20000000
});
assert.equal(corporateLossComparison.corporation.taxBase, 0);
assert.equal(corporateLossComparison.corporation.retainedEarnings, -10000000);
assert.equal(corporateLossComparison.corporateEconomicValue, 9224500);
assert.throws(() => BusinessVehicleTaxMath.calculateSoleProprietorCorporationComparison({
    annualRevenue: 1000000,
    businessExpenses: 1000001
}), /cannot exceed/);
assert.equal(atPaymentExemptionBoundary.basicEligibility, false);

const specialBusinessThreshold = BusinessVehicleTaxMath.calculateSimplifiedGeneralVatComparison({
    annualSalesConsideration: 50000000,
    priorYearSalesConsideration: 48000000,
    industryRate: 0.4,
    specialEligibilityBusiness: true
});
assert.equal(specialBusinessThreshold.eligibilityThreshold, 48000000);
assert.equal(specialBusinessThreshold.basicEligibility, false);

const generalRefundComparison = BusinessVehicleTaxMath.calculateSimplifiedGeneralVatComparison({
    annualSalesConsideration: 11000000,
    priorYearSalesConsideration: 0,
    industryRate: 0.2,
    eligiblePurchaseConsideration: 22000000,
    generalDeductibleInputVat: 2000000
});
assert.equal(generalRefundComparison.general.vatRefund, 1000000);
assert.equal(generalRefundComparison.simplified.vatRefund, 0);
assert.equal(generalRefundComparison.simplified.vatPayable, 0);

const zeroVatTypeComparison = BusinessVehicleTaxMath.calculateSimplifiedGeneralVatComparison({
    annualSalesConsideration: 0,
    priorYearSalesConsideration: 0,
    industryRate: 0.15
});
assert.equal(zeroVatTypeComparison.general.vatPayable, 0);
assert.equal(zeroVatTypeComparison.simplified.vatPayable, 0);
assert.throws(() => BusinessVehicleTaxMath.calculateSimplifiedGeneralVatComparison({ annualSalesConsideration: -1, priorYearSalesConsideration: 0, industryRate: 0.15 }), /non-negative/);
assert.throws(() => BusinessVehicleTaxMath.calculateSimplifiedGeneralVatComparison({ annualSalesConsideration: 1, priorYearSalesConsideration: 0, industryRate: 0.1 }), /industry rate/);
assert.throws(() => BusinessVehicleTaxMath.calculateSimplifiedGeneralVatComparison({ annualSalesConsideration: 1, priorYearSalesConsideration: 0, industryRate: 0.15, eligiblePurchaseConsideration: 10, generalDeductibleInputVat: 11 }), /cannot exceed/);

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
        listeners: {},
        setAttribute(name, value) { this.attributes[name] = value; },
        removeAttribute(name) { delete this.attributes[name]; },
        addEventListener(event, handler) { this.listeners[event] = handler; },
        focus() { focusedAcquisitionControl = id; }
    };
}
const acquisitionUiElements = {
    vehicleAcquisitionCalculatorForm: { addEventListener: (_event, handler) => { acquisitionSubmitHandler = handler; } },
    vehiclePurchasePrice: acquisitionControl('vehiclePurchasePrice', { value: '30,000,000' }),
    vehicleTaxBase: acquisitionControl('vehicleTaxBase', { value: '30,000,000', disabled: false }),
    vehicleTaxBaseSame: acquisitionControl('vehicleTaxBaseSame', { checked: true }),
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
    formatMoneyValue: value => Number(String(value).replaceAll(',', '')).toLocaleString(),
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
assert.equal(acquisitionUiElements.vehicleTaxBase.disabled, true);
assert.equal(acquisitionUiElements.vehicleTaxBase.attributes['aria-disabled'], 'true');

acquisitionUiElements.vehiclePurchasePrice.value = '32,000,000';
acquisitionUiElements.vehiclePurchasePrice.listeners.input();
assert.equal(acquisitionUiElements.vehicleTaxBase.value, '32,000,000');

acquisitionUiElements.vehicleTaxBaseSame.checked = false;
acquisitionUiElements.vehicleTaxBaseSame.listeners.change();
assert.equal(acquisitionUiElements.vehicleTaxBase.disabled, false);
assert.equal(focusedAcquisitionControl, 'vehicleTaxBase');
acquisitionUiElements.vehicleTaxBase.value = '31,000,000';
acquisitionUiElements.vehiclePurchasePrice.value = '33,000,000';
acquisitionUiElements.vehiclePurchasePrice.listeners.input();
assert.equal(acquisitionUiElements.vehicleTaxBase.value, '31,000,000');

acquisitionUiElements.vehiclePurchasePrice.value = '30,000,000';
acquisitionUiElements.vehicleTaxBaseSame.checked = true;
acquisitionUiElements.vehicleTaxBaseSame.listeners.change();
assert.equal(acquisitionUiElements.vehicleTaxBase.value, '30,000,000');
assert.equal(acquisitionUiElements.vehicleTaxBase.disabled, true);

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

let comparisonSubmitHandler;
let focusedComparisonControl = null;
function comparisonControl(id, properties) {
    return {
        ...properties,
        attributes: {},
        listeners: {},
        setAttribute(name, value) { this.attributes[name] = value; },
        removeAttribute(name) { delete this.attributes[name]; },
        addEventListener(event, handler) { this.listeners[event] = handler; },
        focus() { focusedComparisonControl = id; }
    };
}
const comparisonUiElements = {
    freelancerBusinessComparisonForm: { addEventListener: (_event, handler) => { comparisonSubmitHandler = handler; } },
    comparisonContractAmount: comparisonControl('comparisonContractAmount', { value: '3,000,000' }),
    comparisonPricingMode: comparisonControl('comparisonPricingMode', { value: 'vat-extra', selectedOptions: [{ textContent: '같은 용역대가·부가세 별도' }] }),
    comparisonExpenseSupply: comparisonControl('comparisonExpenseSupply', { value: '500,000' }),
    comparisonInputVat: comparisonControl('comparisonInputVat', { value: '50,000' }),
    comparisonWithholdingType: comparisonControl('comparisonWithholdingType', { value: 'unknown' }),
    comparisonVatType: comparisonControl('comparisonVatType', { value: 'unknown' }),
    comparisonValidationMessage: { textContent: '', hidden: true },
    comparisonPricingHelp: { textContent: '' },
    resultTableBody: { innerHTML: '' },
    formulaContent: { innerHTML: '' }
};
const comparisonDocument = {
    getElementById: id => comparisonUiElements[id] || null,
    addEventListener: (event, handler) => { if (event === 'DOMContentLoaded') handler(); }
};
loadScript('scripts/business-vehicle-tax-calculators.js', {
    window: { BusinessVehicleTaxMath },
    document: comparisonDocument,
    getMoneyValue: id => Number(comparisonUiElements[id].value.replaceAll(',', '')),
    icon: () => '',
    showResult: () => {},
    updateReportHeaders: () => {},
    alert: message => { throw new Error(message); }
});
assert.equal(typeof comparisonSubmitHandler, 'function');
assert.match(comparisonUiElements.comparisonPricingHelp.textContent, /부가세 10%를 거래처 지급액에 더합니다/);
comparisonSubmitHandler({ preventDefault: () => {} });
assert.equal(comparisonUiElements.resultTableBody.innerHTML, '');
assert.equal(focusedComparisonControl, 'comparisonWithholdingType');
assert.match(comparisonUiElements.comparisonValidationMessage.textContent, /3.3% 원천징수 대상/);

comparisonUiElements.comparisonWithholdingType.value = 'confirmed';
comparisonUiElements.comparisonVatType.value = 'confirmed';
comparisonSubmitHandler({ preventDefault: () => {} });
assert.match(comparisonUiElements.resultTableBody.innerHTML, /2,351,000 원/);
assert.match(comparisonUiElements.resultTableBody.innerHTML, /2,500,000 원/);
assert.match(comparisonUiElements.resultTableBody.innerHTML, /149,000 원/);
assert.match(comparisonUiElements.formulaContent.innerHTML, /최종 절세액이 아니라 종합소득세 정산 전 현금흐름 차이/);

comparisonUiElements.comparisonPricingMode.value = 'fixed-total';
comparisonUiElements.comparisonPricingMode.selectedOptions = [{ textContent: '거래처 총예산 고정·부가세 포함' }];
comparisonUiElements.comparisonPricingMode.listeners.change();
assert.match(comparisonUiElements.comparisonPricingHelp.textContent, /110분의 100/);
comparisonSubmitHandler({ preventDefault: () => {} });
assert.match(comparisonUiElements.resultTableBody.innerHTML, /2,227,272 원/);
assert.match(comparisonUiElements.resultTableBody.innerHTML, /123,728 원/);

let vatTypeComparisonSubmitHandler;
let focusedVatTypeControl = null;
const vatTypeAlerts = [];
function vatTypeControl(id, properties) {
    return {
        ...properties,
        attributes: {},
        listeners: {},
        setAttribute(name, value) { this.attributes[name] = value; },
        removeAttribute(name) { delete this.attributes[name]; },
        addEventListener(event, handler) { this.listeners[event] = handler; },
        focus() { focusedVatTypeControl = id; }
    };
}
const vatTypeUiElements = {
    simplifiedGeneralVatForm: { addEventListener: (_event, handler) => { vatTypeComparisonSubmitHandler = handler; } },
    vatComparisonAnnualSales: vatTypeControl('vatComparisonAnnualSales', { value: '60,000,000' }),
    vatComparisonPriorYearSales: vatTypeControl('vatComparisonPriorYearSales', { value: '60,000,000' }),
    vatComparisonIndustryRate: vatTypeControl('vatComparisonIndustryRate', { value: '0.15', selectedOptions: [{ textContent: '음식점업 (15%)' }] }),
    vatComparisonPurchases: vatTypeControl('vatComparisonPurchases', { value: '22,000,000' }),
    vatComparisonInputVat: vatTypeControl('vatComparisonInputVat', { value: '2,000,000' }),
    vatComparisonSpecialBusiness: vatTypeControl('vatComparisonSpecialBusiness', { value: 'no' }),
    vatComparisonExclusionCheck: vatTypeControl('vatComparisonExclusionCheck', { value: 'unknown' }),
    vatComparisonCustomerType: vatTypeControl('vatComparisonCustomerType', { value: 'b2c' }),
    vatComparisonCurrentType: vatTypeControl('vatComparisonCurrentType', { value: 'simplified', selectedOptions: [{ textContent: '간이과세자' }] }),
    vatComparisonValidationMessage: { textContent: '', hidden: true },
    resultTableBody: { innerHTML: '' },
    formulaContent: { innerHTML: '' }
};
const vatTypeDocument = {
    getElementById: id => vatTypeUiElements[id] || null,
    addEventListener: (event, handler) => { if (event === 'DOMContentLoaded') handler(); }
};
loadScript('scripts/business-vehicle-tax-calculators.js', {
    window: { BusinessVehicleTaxMath },
    document: vatTypeDocument,
    getMoneyValue: id => Number(vatTypeUiElements[id].value.replaceAll(',', '')),
    icon: () => '',
    showResult: () => {},
    updateReportHeaders: () => {},
    alert: message => { vatTypeAlerts.push(message); }
});
assert.equal(typeof vatTypeComparisonSubmitHandler, 'function');
vatTypeComparisonSubmitHandler({ preventDefault: () => {} });
assert.equal(vatTypeUiElements.resultTableBody.innerHTML, '');
assert.equal(focusedVatTypeControl, 'vatComparisonExclusionCheck');
assert.match(vatTypeUiElements.vatComparisonValidationMessage.textContent, /적용 배제 업종·사업장/);

vatTypeUiElements.vatComparisonExclusionCheck.value = 'confirmed';
vatTypeComparisonSubmitHandler({ preventDefault: () => {} });
assert.match(vatTypeUiElements.resultTableBody.innerHTML, /3,454,546 원/);
assert.match(vatTypeUiElements.resultTableBody.innerHTML, /790,000 원/);
assert.match(vatTypeUiElements.resultTableBody.innerHTML, /2,664,546 원/);
assert.match(vatTypeUiElements.formulaContent.innerHTML, /종합소득세/);

vatTypeUiElements.vatComparisonAnnualSales.value = '47,999,999';
vatTypeComparisonSubmitHandler({ preventDefault: () => {} });
assert.match(vatTypeUiElements.resultTableBody.innerHTML, /납부의무 면제/);
vatTypeUiElements.vatComparisonAnnualSales.value = '0';
vatTypeComparisonSubmitHandler({ preventDefault: () => {} });
assert.match(vatTypeAlerts.at(-1), /연간 공급대가/);

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

const loanFromOwnFunds = LoanMath.calculateFundingCounterpart({
    homePrice: 800000000,
    knownAmount: 300000000
});
assert.equal(loanFromOwnFunds.amount, 500000000);
assert.equal(loanFromOwnFunds.exceedsHomePrice, false);
const zeroFundingBalance = LoanMath.calculateFundingCounterpart({ homePrice: 800000000, knownAmount: 800000000 });
assert.equal(zeroFundingBalance.amount, 0);
assert.equal(zeroFundingBalance.exceedsHomePrice, false);
const excessiveFundingSource = LoanMath.calculateFundingCounterpart({ homePrice: 800000000, knownAmount: 900000000 });
assert.equal(excessiveFundingSource.amount, 0);
assert.equal(excessiveFundingSource.exceedsHomePrice, true);
assert.throws(() => LoanMath.calculateFundingCounterpart({ homePrice: -1, knownAmount: 0 }), /non-negative/);

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
