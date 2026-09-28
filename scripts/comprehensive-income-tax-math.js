(function (global) {
    'use strict';

    const NATIONAL_TAX_BRACKETS = Object.freeze([
        Object.freeze({ limit: 14000000, rate: 0.06, deduction: 0 }),
        Object.freeze({ limit: 50000000, rate: 0.15, deduction: 1260000 }),
        Object.freeze({ limit: 88000000, rate: 0.24, deduction: 5760000 }),
        Object.freeze({ limit: 150000000, rate: 0.35, deduction: 15440000 }),
        Object.freeze({ limit: 300000000, rate: 0.38, deduction: 19940000 }),
        Object.freeze({ limit: 500000000, rate: 0.40, deduction: 25940000 }),
        Object.freeze({ limit: 1000000000, rate: 0.42, deduction: 35940000 }),
        Object.freeze({ limit: Infinity, rate: 0.45, deduction: 65940000 })
    ]);

    const LOCAL_TAX_BRACKETS = Object.freeze([
        Object.freeze({ limit: 14000000, rate: 0.006, deduction: 0 }),
        Object.freeze({ limit: 50000000, rate: 0.015, deduction: 126000 }),
        Object.freeze({ limit: 88000000, rate: 0.024, deduction: 576000 }),
        Object.freeze({ limit: 150000000, rate: 0.035, deduction: 1544000 }),
        Object.freeze({ limit: 300000000, rate: 0.038, deduction: 1994000 }),
        Object.freeze({ limit: 500000000, rate: 0.040, deduction: 2594000 }),
        Object.freeze({ limit: 1000000000, rate: 0.042, deduction: 3594000 }),
        Object.freeze({ limit: Infinity, rate: 0.045, deduction: 6594000 })
    ]);

    function requireNonNegative(value, name) {
        const number = Number(value ?? 0);
        if (!Number.isFinite(number) || number < 0) throw new Error(`${name} must be non-negative`);
        return number;
    }

    function calculateProgressiveTax(taxBaseValue, brackets) {
        const taxBase = requireNonNegative(taxBaseValue, 'tax base');
        const bracket = brackets.find(item => taxBase <= item.limit);
        return {
            tax: Math.floor(Math.max(taxBase * bracket.rate - bracket.deduction, 0)),
            rate: bracket.rate,
            deduction: bracket.deduction,
            limit: bracket.limit
        };
    }

    function calculateComprehensiveIncomeTax(input = {}) {
        const incomeAmounts = {
            business: requireNonNegative(input.businessIncome, 'business income'),
            employment: requireNonNegative(input.employmentIncome, 'employment income'),
            financial: requireNonNegative(input.financialIncome, 'financial income'),
            pension: requireNonNegative(input.pensionIncome, 'pension income'),
            other: requireNonNegative(input.otherIncome, 'other income')
        };
        const incomeDeduction = requireNonNegative(input.incomeDeduction, 'income deduction');
        const nationalTaxCredits = requireNonNegative(input.nationalTaxCredits, 'national tax credits');
        const prepaidNationalTax = requireNonNegative(input.prepaidNationalTax, 'prepaid national tax');
        const prepaidLocalTax = requireNonNegative(input.prepaidLocalTax, 'prepaid local tax');
        const totalIncome = Object.values(incomeAmounts).reduce((sum, value) => sum + value, 0);
        const recognizedIncomeDeduction = Math.min(incomeDeduction, totalIncome);
        const taxableBase = Math.max(totalIncome - recognizedIncomeDeduction, 0);
        const national = calculateProgressiveTax(taxableBase, NATIONAL_TAX_BRACKETS);
        const recognizedNationalCredits = Math.min(nationalTaxCredits, national.tax);
        const determinedNationalTax = Math.max(national.tax - recognizedNationalCredits, 0);
        const local = calculateProgressiveTax(taxableBase, LOCAL_TAX_BRACKETS);
        const localTaxCredits = Math.min(Math.floor(recognizedNationalCredits * 0.1), local.tax);
        const determinedLocalTax = Math.max(local.tax - localTaxCredits, 0);
        const nationalBalance = determinedNationalTax - prepaidNationalTax;
        const localBalance = determinedLocalTax - prepaidLocalTax;
        const totalDeterminedTax = determinedNationalTax + determinedLocalTax;
        const totalPrepaidTax = prepaidNationalTax + prepaidLocalTax;
        const totalBalance = nationalBalance + localBalance;

        return {
            incomeAmounts,
            totalIncome,
            incomeDeduction,
            recognizedIncomeDeduction,
            taxableBase,
            nationalCalculatedTax: national.tax,
            nationalMarginalRate: national.rate,
            nationalQuickDeduction: national.deduction,
            nationalTaxCredits,
            recognizedNationalCredits,
            determinedNationalTax,
            prepaidNationalTax,
            nationalBalance,
            localCalculatedTax: local.tax,
            localMarginalRate: local.rate,
            localQuickDeduction: local.deduction,
            localTaxCredits,
            determinedLocalTax,
            prepaidLocalTax,
            localBalance,
            totalDeterminedTax,
            totalPrepaidTax,
            totalBalance,
            effectiveTaxRate: totalIncome > 0 ? totalDeterminedTax / totalIncome : 0,
            deductionLimited: incomeDeduction > totalIncome
        };
    }

    global.ComprehensiveIncomeTaxMath = Object.freeze({
        NATIONAL_TAX_BRACKETS,
        LOCAL_TAX_BRACKETS,
        calculateProgressiveTax,
        calculateComprehensiveIncomeTax
    });
})(typeof window !== 'undefined' ? window : globalThis);
