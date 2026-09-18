(function (global) {
    'use strict';

    const APPROPRIATE_INTEREST_RATE = 0.046;
    const MINIMUM_GIFT_BENEFIT = 10000000;

    function requireNonNegative(value, name) {
        const number = Number(value);
        if (!Number.isFinite(number) || number < 0) throw new Error(`${name} must be non-negative`);
        return number;
    }

    function calculateFamilyLoanGiftBenefit({ principal, actualAnnualRate = 0, months = 12 }) {
        const loanPrincipal = requireNonNegative(principal, 'principal');
        const actualRatePercent = requireNonNegative(actualAnnualRate, 'actual annual rate');
        const loanMonths = Number(months);
        if (!Number.isInteger(loanMonths) || loanMonths < 1 || loanMonths > 600) throw new Error('months must be an integer from 1 to 600');
        if (actualRatePercent > 100) throw new Error('actual annual rate must not exceed 100');

        const actualRate = actualRatePercent / 100;
        const rateGap = Math.max(0, APPROPRIATE_INTEREST_RATE - actualRate);
        const periods = [];
        let remainingMonths = loanMonths;
        while (remainingMonths > 0) {
            const periodMonths = Math.min(12, remainingMonths);
            const appropriateInterest = loanPrincipal * APPROPRIATE_INTEREST_RATE * periodMonths / 12;
            const actualInterest = loanPrincipal * actualRate * periodMonths / 12;
            const benefit = Math.max(0, appropriateInterest - actualInterest);
            periods.push({
                months: periodMonths,
                appropriateInterest,
                actualInterest,
                benefit,
                taxableGiftBenefit: benefit >= MINIMUM_GIFT_BENEFIT ? benefit : 0
            });
            remainingMonths -= periodMonths;
        }

        return {
            principal: loanPrincipal,
            actualAnnualRate: actualRate,
            months: loanMonths,
            appropriateAnnualRate: APPROPRIATE_INTEREST_RATE,
            rateGap,
            appropriateInterest: periods.reduce((sum, period) => sum + period.appropriateInterest, 0),
            actualInterest: periods.reduce((sum, period) => sum + period.actualInterest, 0),
            totalBenefit: periods.reduce((sum, period) => sum + period.benefit, 0),
            taxableGiftBenefit: periods.reduce((sum, period) => sum + period.taxableGiftBenefit, 0),
            taxableEventCount: periods.filter(period => period.taxableGiftBenefit > 0).length,
            periods,
            minimumGiftBenefit: MINIMUM_GIFT_BENEFIT
        };
    }

    global.FamilyLoanGiftMath = Object.freeze({
        APPROPRIATE_INTEREST_RATE,
        MINIMUM_GIFT_BENEFIT,
        calculateFamilyLoanGiftBenefit
    });
})(typeof window !== 'undefined' ? window : globalThis);
