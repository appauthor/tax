(function (global) {
    'use strict';

    const VAT_RATE = 0.1;
    const BUSINESS_INCOME_WITHHOLDING_RATE = 0.03;
    const LOCAL_INCOME_TAX_RATE_ON_WITHHOLDING = 0.1;
    const SIMPLIFIED_VAT_RULES_2026 = Object.freeze({
        generalEligibilityThreshold: 104000000,
        specialEligibilityThreshold: 48000000,
        paymentExemptionThreshold: 48000000,
        purchaseCreditRate: 0.005,
        vatRate: VAT_RATE,
        industryValueAddedRates: Object.freeze({
            retailFood: 0.15,
            manufacturingPrimaryParcel: 0.2,
            lodging: 0.25,
            constructionTransportInformation: 0.3,
            professionalBusinessRealEstate: 0.4,
            otherServices: 0.3
        })
    });
    const SOLE_CORPORATION_RULES_2026 = Object.freeze({
        personalIncomeTaxBrackets: Object.freeze([
            Object.freeze({ limit: 14000000, rate: 0.06, deduction: 0 }),
            Object.freeze({ limit: 50000000, rate: 0.15, deduction: 1260000 }),
            Object.freeze({ limit: 88000000, rate: 0.24, deduction: 5760000 }),
            Object.freeze({ limit: 150000000, rate: 0.35, deduction: 15440000 }),
            Object.freeze({ limit: 300000000, rate: 0.38, deduction: 19940000 }),
            Object.freeze({ limit: 500000000, rate: 0.40, deduction: 25940000 }),
            Object.freeze({ limit: 1000000000, rate: 0.42, deduction: 35940000 }),
            Object.freeze({ limit: Infinity, rate: 0.45, deduction: 65940000 })
        ]),
        personalLocalIncomeTaxBrackets: Object.freeze([
            Object.freeze({ limit: 14000000, rate: 0.006, deduction: 0 }),
            Object.freeze({ limit: 50000000, rate: 0.015, deduction: 126000 }),
            Object.freeze({ limit: 88000000, rate: 0.024, deduction: 576000 }),
            Object.freeze({ limit: 150000000, rate: 0.035, deduction: 1544000 }),
            Object.freeze({ limit: 300000000, rate: 0.038, deduction: 1994000 }),
            Object.freeze({ limit: 500000000, rate: 0.04, deduction: 2594000 }),
            Object.freeze({ limit: 1000000000, rate: 0.042, deduction: 3594000 }),
            Object.freeze({ limit: Infinity, rate: 0.045, deduction: 6594000 })
        ]),
        corporateIncomeTaxBrackets: Object.freeze([
            Object.freeze({ limit: 200000000, rate: 0.10, deduction: 0 }),
            Object.freeze({ limit: 20000000000, rate: 0.20, deduction: 20000000 }),
            Object.freeze({ limit: 300000000000, rate: 0.22, deduction: 420000000 }),
            Object.freeze({ limit: Infinity, rate: 0.25, deduction: 9420000000 })
        ]),
        corporateLocalIncomeTaxBrackets: Object.freeze([
            Object.freeze({ limit: 200000000, rate: 0.01, deduction: 0 }),
            Object.freeze({ limit: 20000000000, rate: 0.02, deduction: 2000000 }),
            Object.freeze({ limit: 300000000000, rate: 0.022, deduction: 42000000 }),
            Object.freeze({ limit: Infinity, rate: 0.025, deduction: 942000000 })
        ]),
        dividendIncomeTaxRate: 0.14,
        dividendLocalIncomeTaxRate: 0.014,
        financialIncomeThreshold: 20000000
    });
    const SOLE_PROPRIETOR_HEALTH_RULES_2026 = Object.freeze({
        healthRate: 0.0719,
        longTermCareIncomeRate: 0.009448,
        regionalPropertyPointValue: 211.5,
        regionalPropertyDeduction: 100000000,
        workplaceOtherIncomeDeduction: 20000000,
        workplaceSalaryPremiumMinimum: 20160,
        workplaceSalaryPremiumMaximum: 9183480,
        regionalAndOtherIncomePremiumMinimum: 20160,
        regionalAndOtherIncomePremiumMaximum: 4591740,
        propertyPointBrackets: Object.freeze([
            [4500000, 22], [9000000, 44], [13500000, 66], [18000000, 97], [22500000, 122],
            [27000000, 146], [31500000, 171], [36000000, 195], [40500000, 219], [45000000, 244],
            [50200000, 268], [55900000, 294], [62200000, 320], [69300000, 344], [77100000, 365],
            [85900000, 386], [95700000, 412], [107000000, 439], [119000000, 465], [133000000, 490],
            [148000000, 516], [164000000, 535], [183000000, 559], [204000000, 586], [227000000, 611],
            [253000000, 637], [281000000, 659], [313000000, 681], [349000000, 706], [388000000, 731],
            [432000000, 757], [481000000, 785], [536000000, 812], [597000000, 841], [665000000, 881],
            [740000000, 921], [824000000, 961], [918000000, 1001], [1030000000, 1041], [1140000000, 1091],
            [1270000000, 1141], [1420000000, 1191], [1580000000, 1241], [1760000000, 1291], [1960000000, 1341],
            [2180000000, 1391], [2420000000, 1451], [2700000000, 1511], [3000000000, 1571], [3300000000, 1641],
            [3630000000, 1711], [3993000000, 1781], [4392300000, 1851], [4831530000, 1921], [5314680000, 1991],
            [5846150000, 2061], [6430770000, 2131], [7073850000, 2201], [7781240000, 2271], [Infinity, 2341]
        ].map(([limit, points]) => Object.freeze({ limit, points })))
    });
    const VEHICLE_ACQUISITION_RATES = Object.freeze({
        'non-business-passenger': 0.07,
        'light-vehicle': 0.04,
        'other-non-business': 0.05,
        'business': 0.04,
        'small-motorcycle': 0.02,
        'other-vehicle': 0.02
    });
    const MULTI_CHILD_VEHICLE_CATEGORIES = Object.freeze({
        'other-passenger': { eligible: true, cappedPassenger: true },
        'passenger-7-10': { eligible: true, cappedPassenger: false },
        'van-up-to-15': { eligible: true, cappedPassenger: false },
        'truck-up-to-1-ton': { eligible: true, cappedPassenger: false },
        'motorcycle-up-to-250cc': { eligible: true, cappedPassenger: false },
        ineligible: { eligible: false, cappedPassenger: false }
    });
    const PREPAYMENT_RULES_2026 = Object.freeze({
        none: { label: '정기분 납부', rate: 0, basis: 'annual' },
        january: { label: '1월 연납', rate: 0.05, basis: 'annual-days', days: 334, yearDays: 365 },
        march: { label: '3월 연납', rate: 0.05, basis: 'annual-days', days: 275, yearDays: 365 },
        june: { label: '6월 연납', rate: 0.05, basis: 'second-half' },
        september: { label: '9월 연납', rate: 0.05, basis: 'second-half-days', days: 92, halfYearDays: 184 }
    });

    function requireNonNegative(value, name) {
        const number = Number(value);
        if (!Number.isFinite(number) || number < 0) throw new RangeError(`${name} must be a non-negative number`);
        return number;
    }

    function applyRounding(value, rounding) {
        if (rounding === 'ceil') return Math.ceil(value);
        if (rounding === 'round') return Math.round(value);
        return Math.floor(value);
    }

    function truncateLocalTax(value) {
        return Math.floor(value / 10) * 10;
    }

    function calculateVat({ mode, amount, rounding = 'floor' }) {
        const inputAmount = requireNonNegative(amount, 'amount');
        let exactSupply;
        let exactVat;
        let exactTotal;

        if (mode === 'supply') {
            exactSupply = inputAmount;
            exactVat = inputAmount * VAT_RATE;
            exactTotal = exactSupply + exactVat;
        } else if (mode === 'vat') {
            exactVat = inputAmount;
            exactSupply = inputAmount / VAT_RATE;
            exactTotal = exactSupply + exactVat;
        } else if (mode === 'total') {
            exactTotal = inputAmount;
            exactSupply = inputAmount * 100 / 110;
            exactVat = inputAmount - exactSupply;
        } else {
            throw new RangeError('Unsupported VAT calculation mode');
        }

        let supply = applyRounding(exactSupply, rounding);
        let vat = applyRounding(exactVat, rounding);
        let total = applyRounding(exactTotal, rounding);
        if (mode === 'total') vat = total - supply;
        if (mode === 'supply') total = supply + vat;
        if (mode === 'vat') total = supply + vat;

        return { mode, inputAmount, rate: VAT_RATE, exactSupply, exactVat, exactTotal, supply, vat, total, rounding };
    }

    function calculateBusinessIncomeWithholding(amount) {
        const grossPayment = requireNonNegative(amount, 'amount');
        const incomeTax = truncateLocalTax(grossPayment * BUSINESS_INCOME_WITHHOLDING_RATE);
        const localIncomeTax = truncateLocalTax(incomeTax * LOCAL_INCOME_TAX_RATE_ON_WITHHOLDING);
        const totalWithholding = incomeTax + localIncomeTax;

        return {
            grossPayment,
            incomeTax,
            localIncomeTax,
            totalWithholding,
            netPayment: grossPayment - totalWithholding
        };
    }

    function calculateFreelancerBusinessTaxComparison({
        contractAmount,
        pricingMode = 'vat-extra',
        expenseSupply = 0,
        deductibleInputVat = 0
    }) {
        const amount = requireNonNegative(contractAmount, 'contractAmount');
        const expenses = requireNonNegative(expenseSupply, 'expenseSupply');
        const inputVat = requireNonNegative(deductibleInputVat, 'deductibleInputVat');
        if (amount <= 0) throw new RangeError('contractAmount must be greater than zero');
        if (pricingMode !== 'vat-extra' && pricingMode !== 'fixed-total') {
            throw new RangeError('Unsupported pricing mode');
        }

        const freelancer = calculateBusinessIncomeWithholding(amount);
        const businessVat = pricingMode === 'vat-extra'
            ? calculateVat({ mode: 'supply', amount, rounding: 'floor' })
            : calculateVat({ mode: 'total', amount, rounding: 'floor' });
        const expenseCashPaid = expenses + inputVat;
        const vatBalance = businessVat.vat - inputVat;
        const vatPayable = Math.max(0, vatBalance);
        const vatRefund = Math.max(0, -vatBalance);
        const freelancerCashAfterExpenses = freelancer.netPayment - expenseCashPaid;
        const businessCashAfterExpenses = businessVat.total - expenseCashPaid - vatPayable + vatRefund;

        return {
            contractAmount: amount,
            pricingMode,
            expenseSupply: expenses,
            deductibleInputVat: inputVat,
            expenseCashPaid,
            freelancer: {
                ...freelancer,
                cashAfterExpenses: freelancerCashAfterExpenses
            },
            business: {
                supply: businessVat.supply,
                outputVat: businessVat.vat,
                invoiceTotal: businessVat.total,
                vatBalance,
                vatPayable,
                vatRefund,
                cashAfterExpenses: businessCashAfterExpenses
            },
            cashDifference: businessCashAfterExpenses - freelancerCashAfterExpenses
        };
    }

    function calculateSimplifiedGeneralVatComparison({
        annualSalesConsideration,
        priorYearSalesConsideration,
        industryRate,
        eligiblePurchaseConsideration = 0,
        generalDeductibleInputVat = 0,
        specialEligibilityBusiness = false
    }) {
        const sales = requireNonNegative(annualSalesConsideration, 'annualSalesConsideration');
        const priorYearSales = requireNonNegative(priorYearSalesConsideration, 'priorYearSalesConsideration');
        const purchases = requireNonNegative(eligiblePurchaseConsideration, 'eligiblePurchaseConsideration');
        const inputVat = requireNonNegative(generalDeductibleInputVat, 'generalDeductibleInputVat');
        const rate = Number(industryRate);
        const allowedRates = Object.values(SIMPLIFIED_VAT_RULES_2026.industryValueAddedRates);
        if (!allowedRates.includes(rate)) throw new RangeError('Unsupported simplified VAT industry rate');
        if (inputVat > purchases) throw new RangeError('generalDeductibleInputVat cannot exceed eligiblePurchaseConsideration');

        const exactGeneralSupply = sales * 100 / 110;
        const generalSupply = Math.floor(exactGeneralSupply);
        const generalOutputVat = sales - generalSupply;
        const generalVatBalance = generalOutputVat - inputVat;
        const generalVatPayable = Math.max(0, generalVatBalance);
        const generalVatRefund = Math.max(0, -generalVatBalance);

        const simplifiedBaseTax = Math.floor(sales * rate * VAT_RATE);
        const simplifiedPurchaseCredit = Math.floor(purchases * SIMPLIFIED_VAT_RULES_2026.purchaseCreditRate);
        const simplifiedTaxBeforeExemption = Math.max(0, simplifiedBaseTax - simplifiedPurchaseCredit);
        const paymentExemptionApplies = sales < SIMPLIFIED_VAT_RULES_2026.paymentExemptionThreshold;
        const simplifiedVatPayable = paymentExemptionApplies ? 0 : simplifiedTaxBeforeExemption;
        const eligibilityThreshold = specialEligibilityBusiness
            ? SIMPLIFIED_VAT_RULES_2026.specialEligibilityThreshold
            : SIMPLIFIED_VAT_RULES_2026.generalEligibilityThreshold;
        const basicEligibility = priorYearSales < eligibilityThreshold;

        const generalCashAfterVat = sales - purchases - generalVatPayable + generalVatRefund;
        const simplifiedCashAfterVat = sales - purchases - simplifiedVatPayable;

        return {
            annualSalesConsideration: sales,
            priorYearSalesConsideration: priorYearSales,
            industryRate: rate,
            eligiblePurchaseConsideration: purchases,
            generalDeductibleInputVat: inputVat,
            specialEligibilityBusiness: Boolean(specialEligibilityBusiness),
            eligibilityThreshold,
            basicEligibility,
            effectivePeriod: '2026-07-01~2027-06-30',
            general: {
                supply: generalSupply,
                outputVat: generalOutputVat,
                vatBalance: generalVatBalance,
                vatPayable: generalVatPayable,
                vatRefund: generalVatRefund,
                cashAfterVat: generalCashAfterVat
            },
            simplified: {
                baseTax: simplifiedBaseTax,
                purchaseCredit: simplifiedPurchaseCredit,
                taxBeforeExemption: simplifiedTaxBeforeExemption,
                paymentExemptionApplies,
                vatPayable: simplifiedVatPayable,
                vatRefund: 0,
                cashAfterVat: simplifiedCashAfterVat
            },
            vatBurdenDifference: generalVatPayable - generalVatRefund - simplifiedVatPayable,
            cashDifference: simplifiedCashAfterVat - generalCashAfterVat
        };
    }

    function calculateProgressiveTax(taxBase, brackets) {
        const base = requireNonNegative(taxBase, 'taxBase');
        const bracket = brackets.find(item => base <= item.limit);
        return Math.floor(Math.max(0, base * bracket.rate - bracket.deduction));
    }

    function calculateEarnedIncomeDeduction(grossSalary) {
        const salary = requireNonNegative(grossSalary, 'grossSalary');
        let deduction;
        if (salary <= 5000000) deduction = salary * 0.7;
        else if (salary <= 15000000) deduction = 3500000 + (salary - 5000000) * 0.4;
        else if (salary <= 45000000) deduction = 7500000 + (salary - 15000000) * 0.15;
        else if (salary <= 100000000) deduction = 12000000 + (salary - 45000000) * 0.05;
        else deduction = 14750000 + (salary - 100000000) * 0.02;
        return Math.floor(Math.min(20000000, deduction));
    }

    function calculateSoleCorporationScenario({
        businessProfit,
        otherComprehensiveIncome = 0,
        personalDeductions = 0,
        soleProprietorInsurance = 0,
        solePersonalTaxCredits = 0,
        representativeSalary = 0,
        corporationAdminCost = 0,
        employerSocialInsurance = 0,
        employeeSocialInsurance = 0,
        corporationTaxCredits = 0,
        ownerPersonalTaxCredits = 0,
        plannedDividend = 0,
        dividendFinalTaxConfirmed = false
    }) {
        const profit = requireNonNegative(businessProfit, 'businessProfit');
        const otherIncome = requireNonNegative(otherComprehensiveIncome, 'otherComprehensiveIncome');
        const deductions = requireNonNegative(personalDeductions, 'personalDeductions');
        const soleInsurance = requireNonNegative(soleProprietorInsurance, 'soleProprietorInsurance');
        const soleCredits = requireNonNegative(solePersonalTaxCredits, 'solePersonalTaxCredits');
        const salary = requireNonNegative(representativeSalary, 'representativeSalary');
        const adminCost = requireNonNegative(corporationAdminCost, 'corporationAdminCost');
        const employerInsurance = requireNonNegative(employerSocialInsurance, 'employerSocialInsurance');
        const employeeInsurance = requireNonNegative(employeeSocialInsurance, 'employeeSocialInsurance');
        const corporateCredits = requireNonNegative(corporationTaxCredits, 'corporationTaxCredits');
        const ownerCredits = requireNonNegative(ownerPersonalTaxCredits, 'ownerPersonalTaxCredits');
        const dividend = requireNonNegative(plannedDividend, 'plannedDividend');
        if (dividendFinalTaxConfirmed && dividend > SOLE_CORPORATION_RULES_2026.financialIncomeThreshold) {
            throw new RangeError('confirmed dividend cannot exceed financial income threshold');
        }

        const soleTaxBase = Math.max(0, profit + otherIncome - deductions - soleInsurance);
        const soleIncomeTaxBeforeCredits = calculateProgressiveTax(soleTaxBase, SOLE_CORPORATION_RULES_2026.personalIncomeTaxBrackets);
        const soleIncomeTax = Math.max(0, soleIncomeTaxBeforeCredits - soleCredits);
        const soleLocalIncomeTax = calculateProgressiveTax(soleTaxBase, SOLE_CORPORATION_RULES_2026.personalLocalIncomeTaxBrackets);
        const soleAvailableCash = profit - soleIncomeTax - soleLocalIncomeTax - soleInsurance;

        const corporateOperatingResult = profit - adminCost - employerInsurance - salary;
        const corporateTaxBase = Math.max(0, corporateOperatingResult);
        const corporateIncomeTaxBeforeCredits = calculateProgressiveTax(corporateTaxBase, SOLE_CORPORATION_RULES_2026.corporateIncomeTaxBrackets);
        const corporateIncomeTax = Math.max(0, corporateIncomeTaxBeforeCredits - corporateCredits);
        const corporateLocalIncomeTax = calculateProgressiveTax(corporateTaxBase, SOLE_CORPORATION_RULES_2026.corporateLocalIncomeTaxBrackets);
        const afterTaxCorporateProfit = corporateOperatingResult - corporateIncomeTax - corporateLocalIncomeTax;
        const distributableCurrentProfit = Math.max(0, afterTaxCorporateProfit);
        const dividendIsFeasible = dividend <= distributableCurrentProfit;

        const earnedIncomeDeduction = calculateEarnedIncomeDeduction(salary);
        const ownerTaxBase = Math.max(0, salary - earnedIncomeDeduction + otherIncome - deductions - employeeInsurance);
        const ownerIncomeTaxBeforeCredits = calculateProgressiveTax(ownerTaxBase, SOLE_CORPORATION_RULES_2026.personalIncomeTaxBrackets);
        const ownerIncomeTax = Math.max(0, ownerIncomeTaxBeforeCredits - ownerCredits);
        const ownerLocalIncomeTax = calculateProgressiveTax(ownerTaxBase, SOLE_CORPORATION_RULES_2026.personalLocalIncomeTaxBrackets);
        const dividendIncomeTax = Math.floor(dividend * SOLE_CORPORATION_RULES_2026.dividendIncomeTaxRate);
        const dividendLocalIncomeTax = Math.floor(dividend * SOLE_CORPORATION_RULES_2026.dividendLocalIncomeTaxRate);
        const retainedEarnings = dividendIsFeasible ? afterTaxCorporateProfit - dividend : null;
        const ownerCash = dividendIsFeasible
            ? salary - employeeInsurance - ownerIncomeTax - ownerLocalIncomeTax + dividend - dividendIncomeTax - dividendLocalIncomeTax
            : null;
        const corporateEconomicValue = dividendIsFeasible ? ownerCash + retainedEarnings : null;
        const dividendComparisonConfirmed = dividend === 0 || Boolean(dividendFinalTaxConfirmed);

        return {
            businessProfit: profit,
            sole: {
                taxBase: soleTaxBase,
                incomeTaxBeforeCredits: soleIncomeTaxBeforeCredits,
                incomeTax: soleIncomeTax,
                localIncomeTax: soleLocalIncomeTax,
                socialInsurance: soleInsurance,
                availableCash: soleAvailableCash,
                totalTax: soleIncomeTax + soleLocalIncomeTax
            },
            corporation: {
                taxBase: corporateTaxBase,
                incomeTaxBeforeCredits: corporateIncomeTaxBeforeCredits,
                incomeTax: corporateIncomeTax,
                localIncomeTax: corporateLocalIncomeTax,
                adminCost,
                employerSocialInsurance: employerInsurance,
                operatingResult: corporateOperatingResult,
                afterTaxProfit: afterTaxCorporateProfit,
                distributableCurrentProfit,
                retainedEarnings
            },
            owner: {
                salary,
                earnedIncomeDeduction,
                taxBase: ownerTaxBase,
                incomeTaxBeforeCredits: ownerIncomeTaxBeforeCredits,
                incomeTax: ownerIncomeTax,
                localIncomeTax: ownerLocalIncomeTax,
                employeeSocialInsurance: employeeInsurance,
                dividend,
                dividendIncomeTax,
                dividendLocalIncomeTax,
                cash: ownerCash
            },
            dividendIsFeasible,
            dividendComparisonConfirmed,
            corporateEconomicValue,
            economicValueDifference: dividendIsFeasible ? corporateEconomicValue - soleAvailableCash : null
        };
    }

    function calculateSoleProprietorCorporationComparison({
        annualRevenue,
        businessExpenses,
        ...scenarioInputs
    }) {
        const revenue = requireNonNegative(annualRevenue, 'annualRevenue');
        const expenses = requireNonNegative(businessExpenses, 'businessExpenses');
        if (expenses > revenue) throw new RangeError('businessExpenses cannot exceed annualRevenue');
        const businessProfit = revenue - expenses;
        const current = calculateSoleCorporationScenario({ businessProfit, ...scenarioInputs });
        if (!current.dividendIsFeasible) throw new RangeError('plannedDividend cannot exceed after-tax corporate profit');

        const maximumProfit = Math.max(2000000000, businessProfit * 2);
        const step = 100000;
        let breakEvenBusinessProfit = null;
        let priorValidDifference = null;
        for (let candidate = 0; candidate <= maximumProfit; candidate += step) {
            const scenario = calculateSoleCorporationScenario({ businessProfit: candidate, ...scenarioInputs });
            if (!scenario.dividendIsFeasible) continue;
            if (scenario.economicValueDifference >= 0 && (priorValidDifference === null || priorValidDifference < 0)) {
                breakEvenBusinessProfit = candidate;
                break;
            }
            priorValidDifference = scenario.economicValueDifference;
        }

        return {
            taxYear: 2026,
            annualRevenue: revenue,
            businessExpenses: expenses,
            businessProfit,
            ...current,
            breakEvenBusinessProfit,
            breakEvenStep: step,
            comparisonFinal: current.dividendComparisonConfirmed
        };
    }

    function getRegionalPropertyPoints(adjustedPropertyAmount, rules = SOLE_PROPRIETOR_HEALTH_RULES_2026) {
        const amount = requireNonNegative(adjustedPropertyAmount, 'adjustedPropertyAmount');
        if (amount === 0) return 0;
        return rules.propertyPointBrackets.find(bracket => amount <= bracket.limit).points;
    }

    function calculateLongTermCarePremium(healthPremium, rules = SOLE_PROPRIETOR_HEALTH_RULES_2026) {
        const health = requireNonNegative(healthPremium, 'healthPremium');
        return Math.floor(health * rules.longTermCareIncomeRate / rules.healthRate);
    }

    function clampPremium(value, minimum, maximum) {
        return Math.min(maximum, Math.max(minimum, Math.floor(value)));
    }

    function calculateSoleProprietorHealthInsuranceComparison({
        annualRegionalAssessedIncome,
        regionalPropertyAmount = 0,
        qualifiedHousingDebt = 0,
        ownerMonthlyRemuneration,
        ownerAnnualOtherAssessedIncome = 0,
        employeeMonthlySalary,
        remainingFamilyRegionalPremium = 0
    }) {
        const annualIncome = requireNonNegative(annualRegionalAssessedIncome, 'annualRegionalAssessedIncome');
        const propertyAmount = requireNonNegative(regionalPropertyAmount, 'regionalPropertyAmount');
        const housingDebt = requireNonNegative(qualifiedHousingDebt, 'qualifiedHousingDebt');
        const ownerRemuneration = requireNonNegative(ownerMonthlyRemuneration, 'ownerMonthlyRemuneration');
        const ownerOtherIncome = requireNonNegative(ownerAnnualOtherAssessedIncome, 'ownerAnnualOtherAssessedIncome');
        const employeeSalary = requireNonNegative(employeeMonthlySalary, 'employeeMonthlySalary');
        const familyPremium = requireNonNegative(remainingFamilyRegionalPremium, 'remainingFamilyRegionalPremium');
        if (employeeSalary <= 0) throw new RangeError('employeeMonthlySalary must be greater than zero');

        const rules = SOLE_PROPRIETOR_HEALTH_RULES_2026;
        const adjustedPropertyAmount = Math.max(0, propertyAmount - rules.regionalPropertyDeduction - housingDebt);
        const propertyPoints = getRegionalPropertyPoints(adjustedPropertyAmount, rules);
        const regionalIncomePremium = annualIncome / 12 * rules.healthRate;
        const regionalPropertyPremium = propertyPoints * rules.regionalPropertyPointValue;
        const regionalHealthPremium = clampPremium(
            regionalIncomePremium + regionalPropertyPremium,
            rules.regionalAndOtherIncomePremiumMinimum,
            rules.regionalAndOtherIncomePremiumMaximum
        );
        const regionalLongTermCarePremium = calculateLongTermCarePremium(regionalHealthPremium, rules);
        const regionalTotalPremium = regionalHealthPremium + regionalLongTermCarePremium;

        const appliedOwnerMonthlyRemuneration = Math.max(ownerRemuneration, employeeSalary);
        const ownerSalaryHealthPremium = clampPremium(
            appliedOwnerMonthlyRemuneration * rules.healthRate,
            rules.workplaceSalaryPremiumMinimum,
            rules.workplaceSalaryPremiumMaximum
        );
        const ownerOtherIncomeBase = Math.max(0, ownerOtherIncome - rules.workplaceOtherIncomeDeduction);
        const ownerOtherIncomeHealthPremium = ownerOtherIncomeBase === 0
            ? 0
            : Math.min(
                rules.regionalAndOtherIncomePremiumMaximum,
                Math.floor(ownerOtherIncomeBase / 12 * rules.healthRate)
            );
        const ownerHealthPremium = ownerSalaryHealthPremium + ownerOtherIncomeHealthPremium;
        const ownerLongTermCarePremium = calculateLongTermCarePremium(ownerHealthPremium, rules);
        const ownerTotalPremium = ownerHealthPremium + ownerLongTermCarePremium;

        const employeeFullHealthPremium = clampPremium(
            employeeSalary * rules.healthRate,
            rules.workplaceSalaryPremiumMinimum,
            rules.workplaceSalaryPremiumMaximum
        );
        const employeeFullLongTermCarePremium = calculateLongTermCarePremium(employeeFullHealthPremium, rules);
        const employeeHealthShare = Math.floor(employeeFullHealthPremium / 2);
        const employeeLongTermCareShare = Math.floor(employeeFullLongTermCarePremium / 2);
        const employerHealthShare = employeeFullHealthPremium - employeeHealthShare;
        const employerLongTermCareShare = employeeFullLongTermCarePremium - employeeLongTermCareShare;
        const employeeWithholding = employeeHealthShare + employeeLongTermCareShare;
        const employerEmployeeContribution = employerHealthShare + employerLongTermCareShare;
        const businessMonthlyOutflow = ownerTotalPremium + employerEmployeeContribution;
        const postHireHouseholdMonthlyOutflow = ownerTotalPremium + familyPremium;

        return {
            taxYear: 2026,
            rules,
            regional: {
                annualAssessedIncome: annualIncome,
                propertyAmount,
                qualifiedHousingDebt: housingDebt,
                adjustedPropertyAmount,
                propertyPoints,
                incomeHealthPremium: Math.floor(regionalIncomePremium),
                propertyHealthPremium: Math.floor(regionalPropertyPremium),
                healthPremium: regionalHealthPremium,
                longTermCarePremium: regionalLongTermCarePremium,
                totalPremium: regionalTotalPremium
            },
            ownerWorkplace: {
                enteredMonthlyRemuneration: ownerRemuneration,
                appliedMonthlyRemuneration: appliedOwnerMonthlyRemuneration,
                employeeSalaryFloorApplied: ownerRemuneration < employeeSalary,
                salaryHealthPremium: ownerSalaryHealthPremium,
                otherAnnualAssessedIncome: ownerOtherIncome,
                otherIncomeBase: ownerOtherIncomeBase,
                otherIncomeHealthPremium: ownerOtherIncomeHealthPremium,
                healthPremium: ownerHealthPremium,
                longTermCarePremium: ownerLongTermCarePremium,
                totalPremium: ownerTotalPremium
            },
            employee: {
                monthlySalary: employeeSalary,
                fullHealthPremium: employeeFullHealthPremium,
                fullLongTermCarePremium: employeeFullLongTermCarePremium,
                withholding: employeeWithholding,
                employerContribution: employerEmployeeContribution
            },
            remainingFamilyRegionalPremium: familyPremium,
            businessMonthlyOutflow,
            postHireHouseholdMonthlyOutflow,
            householdMonthlyDifference: postHireHouseholdMonthlyOutflow - regionalTotalPremium,
            annual: {
                regionalTotalPremium: regionalTotalPremium * 12,
                ownerWorkplacePremium: ownerTotalPremium * 12,
                employeeWithholding: employeeWithholding * 12,
                employerEmployeeContribution: employerEmployeeContribution * 12,
                businessOutflow: businessMonthlyOutflow * 12,
                householdOutflow: postHireHouseholdMonthlyOutflow * 12
            }
        };
    }

    function calculateMultiChildVehicleReduction({
        acquisitionTax,
        under18ChildCount = 0,
        vehicleCategory = 'ineligible',
        eligibilityConfirmed = false
    }) {
        const tax = requireNonNegative(acquisitionTax, 'acquisitionTax');
        const children = Number(under18ChildCount);
        const category = MULTI_CHILD_VEHICLE_CATEGORIES[vehicleCategory];
        if (!Number.isInteger(children) || children < 0) throw new RangeError('under18ChildCount must be a non-negative integer');
        if (!category) throw new RangeError('Unsupported multi-child vehicle category');

        let reduction = 0;
        let rule = 'not-applied';
        if (eligibilityConfirmed && children >= 2 && category.eligible) {
            if (children === 2) {
                if (category.cappedPassenger && tax > 1400000) {
                    reduction = Math.min(tax, 700000);
                    rule = 'two-children-700000-cap';
                } else {
                    const payableTax = truncateLocalTax(tax * 0.5);
                    reduction = tax - payableTax;
                    rule = 'two-children-50-percent';
                }
            } else if (category.cappedPassenger) {
                reduction = Math.min(tax, 1400000);
                rule = 'three-plus-1400000-cap';
            } else if (tax <= 2000000) {
                reduction = tax;
                rule = 'three-plus-exempt';
            } else {
                const payableTax = truncateLocalTax(tax * 0.15);
                reduction = tax - payableTax;
                rule = 'three-plus-85-percent-minimum-tax';
            }
        }

        return {
            under18ChildCount: children,
            vehicleCategory,
            eligibilityConfirmed: Boolean(eligibilityConfirmed),
            eligibleVehicleCategory: category.eligible,
            rule,
            reduction,
            payableAcquisitionTax: tax - reduction
        };
    }

    function calculateVehicleAcquisition({
        purchasePrice,
        taxBase,
        vehicleType,
        registrationCosts = 0,
        otherCosts = 0,
        under18ChildCount = 0,
        multiChildVehicleCategory = 'ineligible',
        multiChildEligibilityConfirmed = false
    }) {
        const price = requireNonNegative(purchasePrice, 'purchasePrice');
        const base = requireNonNegative(taxBase, 'taxBase');
        const userRegistrationCosts = requireNonNegative(registrationCosts, 'registrationCosts');
        const userOtherCosts = requireNonNegative(otherCosts, 'otherCosts');
        const rate = VEHICLE_ACQUISITION_RATES[vehicleType];
        if (rate === undefined) throw new RangeError('Unsupported vehicle type');

        const exactAcquisitionTax = base * rate;
        const acquisitionTax = truncateLocalTax(exactAcquisitionTax);
        const multiChild = calculateMultiChildVehicleReduction({
            acquisitionTax,
            under18ChildCount,
            vehicleCategory: multiChildVehicleCategory,
            eligibilityConfirmed: multiChildEligibilityConfirmed
        });
        const payableAcquisitionTax = multiChild.payableAcquisitionTax;
        const officialTaxAndRegistration = payableAcquisitionTax;
        const userEnteredCosts = userRegistrationCosts + userOtherCosts;
        const estimatedPurchaseTotal = price + officialTaxAndRegistration + userEnteredCosts;

        return {
            purchasePrice: price,
            taxBase: base,
            vehicleType,
            rate,
            exactAcquisitionTax,
            acquisitionTax,
            multiChildReduction: multiChild.reduction,
            payableAcquisitionTax,
            multiChild,
            officialTaxAndRegistration,
            registrationCosts: userRegistrationCosts,
            otherCosts: userOtherCosts,
            userEnteredCosts,
            estimatedPurchaseTotal
        };
    }

    function getPassengerRatePerCc(usage, displacement) {
        if (usage === 'business') {
            if (displacement <= 1600) return 18;
            if (displacement <= 2500) return 19;
            return 24;
        }
        if (usage === 'non-business') {
            if (displacement <= 1000) return 80;
            if (displacement <= 1600) return 140;
            return 200;
        }
        throw new RangeError('Unsupported vehicle usage');
    }

    function calculateVehicleAge(taxYear, baseYear, baseHalf, period) {
        const year = Number(taxYear);
        const startingYear = Number(baseYear);
        if (!Number.isInteger(year) || !Number.isInteger(startingYear) || startingYear > year) {
            throw new RangeError('Invalid vehicle age base year');
        }
        if (baseHalf === 'first') return year - startingYear + 1;
        if (baseHalf === 'second') return period === 'first' ? year - startingYear : year - startingYear + 1;
        throw new RangeError('Unsupported vehicle age base half');
    }

    function getAgeReductionRate(age) {
        if (age < 3) return 0;
        return Math.min(0.5, (Math.min(age, 12) - 2) * 0.05);
    }

    function calculatePrepaymentDiscount(firstHalfTax, secondHalfTax, timing, rules = PREPAYMENT_RULES_2026) {
        const rule = rules[timing];
        if (!rule) throw new RangeError('Unsupported prepayment timing');
        const annualTax = firstHalfTax + secondHalfTax;
        if (rule.basis === 'annual-days') return annualTax * rule.days / rule.yearDays * rule.rate;
        if (rule.basis === 'second-half') return secondHalfTax * rule.rate;
        if (rule.basis === 'second-half-days') return secondHalfTax * rule.days / rule.halfYearDays * rule.rate;
        return 0;
    }

    function calculateVehicleAnnualTax({
        taxYear = 2026,
        vehicleKind = 'engine',
        usage = 'non-business',
        displacement = 0,
        baseYear = taxYear,
        baseHalf = 'first',
        prepaymentTiming = 'none'
    }) {
        if (Number(taxYear) !== 2026) throw new RangeError('Only the verified 2026 rules are supported');
        let firstHalfBeforeReduction;
        let secondHalfBeforeReduction;
        let perCc = null;

        if (vehicleKind === 'other') {
            const annualFlatTax = usage === 'business' ? 20000 : 100000;
            firstHalfBeforeReduction = annualFlatTax / 2;
            secondHalfBeforeReduction = annualFlatTax / 2;
        } else if (vehicleKind === 'engine') {
            const cc = requireNonNegative(displacement, 'displacement');
            if (cc <= 0) throw new RangeError('displacement must be greater than zero');
            perCc = getPassengerRatePerCc(usage, cc);
            firstHalfBeforeReduction = cc * perCc / 2;
            secondHalfBeforeReduction = cc * perCc / 2;
        } else {
            throw new RangeError('Unsupported vehicle kind');
        }

        const firstHalfAge = calculateVehicleAge(taxYear, baseYear, baseHalf, 'first');
        const secondHalfAge = calculateVehicleAge(taxYear, baseYear, baseHalf, 'second');
        const ageReductionApplies = usage === 'non-business' && vehicleKind === 'engine';
        const firstHalfReductionRate = ageReductionApplies ? getAgeReductionRate(firstHalfAge) : 0;
        const secondHalfReductionRate = ageReductionApplies ? getAgeReductionRate(secondHalfAge) : 0;
        const firstHalfTax = firstHalfBeforeReduction * (1 - firstHalfReductionRate);
        const secondHalfTax = secondHalfBeforeReduction * (1 - secondHalfReductionRate);
        const assessedFirstHalfTax = truncateLocalTax(firstHalfTax);
        const assessedSecondHalfTax = truncateLocalTax(secondHalfTax);
        const annualVehicleTax = assessedFirstHalfTax + assessedSecondHalfTax;
        const prepaymentDiscount = truncateLocalTax(calculatePrepaymentDiscount(assessedFirstHalfTax, assessedSecondHalfTax, prepaymentTiming));
        const vehicleTaxAfterDiscount = annualVehicleTax - prepaymentDiscount;
        const educationTaxRate = usage === 'non-business' ? 0.3 : 0;
        const localEducationTax = truncateLocalTax(vehicleTaxAfterDiscount * educationTaxRate);
        const totalTax = vehicleTaxAfterDiscount + localEducationTax;

        return {
            taxYear: Number(taxYear), vehicleKind, usage, displacement: Number(displacement), perCc,
            baseYear: Number(baseYear), baseHalf, firstHalfAge, secondHalfAge,
            firstHalfReductionRate, secondHalfReductionRate,
            firstHalfTax: assessedFirstHalfTax, secondHalfTax: assessedSecondHalfTax,
            annualVehicleTax,
            prepaymentTiming, prepaymentDiscount,
            vehicleTaxAfterDiscount,
            educationTaxRate, localEducationTax,
            totalTax
        };
    }

    global.BusinessVehicleTaxMath = Object.freeze({
        VAT_RATE,
        BUSINESS_INCOME_WITHHOLDING_RATE,
        LOCAL_INCOME_TAX_RATE_ON_WITHHOLDING,
        SIMPLIFIED_VAT_RULES_2026,
        SOLE_CORPORATION_RULES_2026,
        SOLE_PROPRIETOR_HEALTH_RULES_2026,
        VEHICLE_ACQUISITION_RATES,
        MULTI_CHILD_VEHICLE_CATEGORIES,
        PREPAYMENT_RULES_2026,
        applyRounding,
        truncateLocalTax,
        calculateVat,
        calculateBusinessIncomeWithholding,
        calculateFreelancerBusinessTaxComparison,
        calculateSimplifiedGeneralVatComparison,
        calculateProgressiveTax,
        calculateEarnedIncomeDeduction,
        calculateSoleCorporationScenario,
        calculateSoleProprietorCorporationComparison,
        getRegionalPropertyPoints,
        calculateLongTermCarePremium,
        calculateSoleProprietorHealthInsuranceComparison,
        calculateMultiChildVehicleReduction,
        calculateVehicleAcquisition,
        getPassengerRatePerCc,
        calculateVehicleAge,
        getAgeReductionRate,
        calculatePrepaymentDiscount,
        calculateVehicleAnnualTax
    });
})(typeof window !== 'undefined' ? window : globalThis);
