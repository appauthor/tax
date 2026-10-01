(function (global) {
    'use strict';

    const supportedPercentages = Object.freeze([30, 32, 40, 48, 50, 60, 75, 80, 100, 120, 150, 180, 200, 250, 300]);
    const sourceUrl = 'https://www.mohw.go.kr/menu.es?mid=a10708010900';
    const STANDARDS = Object.freeze({
        2026: Object.freeze({ year: 2026, sourceName: '보건복지부 2026년 기준 중위소득', sourceUrl,
            monthlyByHouseholdSize: Object.freeze({ 1: 2564238, 2: 4199292, 3: 5359036, 4: 6494738, 5: 7556719, 6: 8555952, 7: 9515150 }), supportedPercentages }),
        2027: Object.freeze({ year: 2027, sourceName: '보건복지부 2027년 기준 중위소득', sourceUrl,
            monthlyByHouseholdSize: Object.freeze({ 1: 2736042, 2: 4480645, 3: 5718091, 4: 6929885, 5: 8063019, 6: 9129201, 7: 10152665 }), supportedPercentages })
    });
    const STANDARD = STANDARDS[2026];

    function calculateMedianIncomeComparison({ year = 2026, householdSize, monthlyIncome, targetPercent } = {}) {
        const standard = STANDARDS[Number(year)];
        if (!standard) throw new Error('unsupported standard year');
        const size = Number(householdSize);
        const income = Number(monthlyIncome);
        const target = Number(targetPercent);
        if (!Number.isInteger(size) || !standard.monthlyByHouseholdSize[size]) throw new Error('unsupported household size');
        if (!Number.isFinite(income) || income < 0) throw new Error('monthly income must be non-negative');
        if (!standard.supportedPercentages.includes(target)) throw new Error('unsupported target percentage');

        const baseAmount = standard.monthlyByHouseholdSize[size];
        const targetAmount = Math.round(baseAmount * target / 100);
        const incomePercent = income / baseAmount * 100;

        return {
            householdSize: size,
            monthlyIncome: income,
            baseAmount,
            targetPercent: target,
            targetAmount,
            annualTargetAmount: targetAmount * 12,
            incomePercent: Math.round(incomePercent * 10) / 10,
            difference: targetAmount - income,
            withinTarget: income <= targetAmount,
            source: standard
        };
    }

    global.MedianIncomeMath = Object.freeze({
        STANDARD,
        STANDARDS,
        calculateMedianIncomeComparison
    });
})(typeof window !== 'undefined' ? window : globalThis);
