(function (global) {
    'use strict';

    const STANDARD = Object.freeze({
        year: 2026,
        sourceName: '보건복지부 2026년 기준 중위소득',
        sourceUrl: 'https://www.mohw.go.kr/menu.es?mid=a10708010900',
        monthlyByHouseholdSize: Object.freeze({
            1: 2564238,
            2: 4199292,
            3: 5359036,
            4: 6494738,
            5: 7556719,
            6: 8555952,
            7: 9515150
        }),
        supportedPercentages: Object.freeze([30, 32, 40, 48, 50, 60, 75, 80, 100, 120, 150, 180, 200, 250, 300])
    });

    function calculateMedianIncomeComparison({ householdSize, monthlyIncome, targetPercent } = {}) {
        const size = Number(householdSize);
        const income = Number(monthlyIncome);
        const target = Number(targetPercent);
        if (!Number.isInteger(size) || !STANDARD.monthlyByHouseholdSize[size]) throw new Error('unsupported household size');
        if (!Number.isFinite(income) || income < 0) throw new Error('monthly income must be non-negative');
        if (!STANDARD.supportedPercentages.includes(target)) throw new Error('unsupported target percentage');

        const baseAmount = STANDARD.monthlyByHouseholdSize[size];
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
            source: STANDARD
        };
    }

    global.MedianIncomeMath = Object.freeze({
        STANDARD,
        calculateMedianIncomeComparison
    });
})(typeof window !== 'undefined' ? window : globalThis);
