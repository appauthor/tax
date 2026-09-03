(function (global) {
    'use strict';

    const SURVEY = Object.freeze({
        name: '2025년 가계금융복지조사',
        referenceDate: '2025-03-31',
        publishedDate: '2025-12-04',
        averageNetWorth: 471440000,
        medianNetWorth: 238600000,
        brackets: Object.freeze([
            Object.freeze({ min: Number.NEGATIVE_INFINITY, max: -100000000, share: 0.2, label: '-1억원 미만' }),
            Object.freeze({ min: -100000000, max: 0, share: 2.8, label: '-1억원 이상 0원 미만' }),
            Object.freeze({ min: 0, max: 100000000, share: 26.4, label: '0원 이상 1억원 미만' }),
            Object.freeze({ min: 100000000, max: 200000000, share: 15.4, label: '1억원 이상 2억원 미만' }),
            Object.freeze({ min: 200000000, max: 300000000, share: 12.1, label: '2억원 이상 3억원 미만' }),
            Object.freeze({ min: 300000000, max: 400000000, share: 8.9, label: '3억원 이상 4억원 미만' }),
            Object.freeze({ min: 400000000, max: 500000000, share: 6.2, label: '4억원 이상 5억원 미만' }),
            Object.freeze({ min: 500000000, max: 600000000, share: 4.6, label: '5억원 이상 6억원 미만' }),
            Object.freeze({ min: 600000000, max: 700000000, share: 3.5, label: '6억원 이상 7억원 미만' }),
            Object.freeze({ min: 700000000, max: 800000000, share: 3.3, label: '7억원 이상 8억원 미만' }),
            Object.freeze({ min: 800000000, max: 900000000, share: 2.4, label: '8억원 이상 9억원 미만' }),
            Object.freeze({ min: 900000000, max: 1000000000, share: 2.3, label: '9억원 이상 10억원 미만' }),
            Object.freeze({ min: 1000000000, max: Number.POSITIVE_INFINITY, share: 11.8, label: '10억원 이상' })
        ])
    });

    function toNonNegativeAmount(value, label) {
        const amount = Number(value);
        if (!Number.isFinite(amount)) throw new Error(`${label} must be finite`);
        if (amount < 0) throw new Error(`${label} must be non-negative`);
        return amount;
    }

    function sumAmounts(values, label) {
        return Object.values(values || {}).reduce((sum, value) => sum + toNonNegativeAmount(value, label), 0);
    }

    function roundOne(value) {
        return Math.round((value + Number.EPSILON) * 10) / 10;
    }

    function findBracketIndex(netWorth) {
        return SURVEY.brackets.findIndex(bracket => netWorth >= bracket.min && netWorth < bracket.max);
    }

    function calculateNetWorthRank({ assets = {}, debts = {} } = {}) {
        const totalAssets = sumAmounts(assets, 'asset');
        const totalDebts = sumAmounts(debts, 'debt');
        const netWorth = totalAssets - totalDebts;
        const bracketIndex = findBracketIndex(netWorth);
        if (bracketIndex < 0) throw new Error('net worth bracket not found');

        const bracket = SURVEY.brackets[bracketIndex];
        const wealthierShare = SURVEY.brackets
            .slice(bracketIndex + 1)
            .reduce((sum, item) => sum + item.share, 0);
        const topRangeStart = roundOne(wealthierShare);
        const topRangeEnd = roundOne(Math.min(100, wealthierShare + bracket.share));

        return {
            totalAssets,
            totalDebts,
            netWorth,
            bracketIndex,
            bracketLabel: bracket.label,
            bracketShare: bracket.share,
            topRangeStart,
            topRangeEnd,
            averageDifference: netWorth - SURVEY.averageNetWorth,
            medianDifference: netWorth - SURVEY.medianNetWorth,
            averageRatio: (netWorth / SURVEY.averageNetWorth) * 100,
            medianRatio: (netWorth / SURVEY.medianNetWorth) * 100,
            debtRatio: totalAssets > 0 ? (totalDebts / totalAssets) * 100 : null
        };
    }

    global.NetWorthRankMath = Object.freeze({
        SURVEY,
        calculateNetWorthRank
    });
})(typeof window !== 'undefined' ? window : globalThis);
