(function (global) {
    'use strict';

    function requireData() {
        const data = global.LifestyleBusinessData;
        if (!data || !Array.isArray(data.rows)) throw new Error('lifestyle business data is required');
        return data;
    }

    function round(value, digits = 1) {
        const scale = 10 ** digits;
        return Math.round(value * scale) / scale;
    }

    function calculateIndustryRanking({ industry, metric = 'growth' }) {
        const data = requireData();
        if (!data.industries.includes(industry)) throw new Error('unsupported industry');
        if (!['growth', 'density', 'count'].includes(metric)) throw new Error('unsupported metric');

        const rows = data.rows.filter(row => row.industry === industry).map(row => {
            const regionTotal = data.regionTotals[row.region];
            const growthRate = row.previousYear > 0 ? (row.current - row.previousYear) / row.previousYear * 100 : null;
            const densityPerThousand = regionTotal.current > 0 ? row.current / regionTotal.current * 1000 : null;
            return {
                ...row,
                change: row.current - row.previousYear,
                growthRate: growthRate === null ? null : round(growthRate),
                densityPerThousand: densityPerThousand === null ? null : round(densityPerThousand, 2)
            };
        });

        rows.sort((a, b) => {
            const aValue = metric === 'growth' ? a.growthRate : metric === 'density' ? a.densityPerThousand : a.current;
            const bValue = metric === 'growth' ? b.growthRate : metric === 'density' ? b.densityPerThousand : b.current;
            if (aValue === null) return 1;
            if (bValue === null) return -1;
            return bValue - aValue || b.current - a.current || a.region.localeCompare(b.region, 'ko');
        });

        const nationalCurrent = rows.reduce((sum, row) => sum + row.current, 0);
        const nationalPreviousYear = rows.reduce((sum, row) => sum + row.previousYear, 0);
        return {
            industry,
            metric,
            rows: rows.map((row, index) => ({ ...row, rank: index + 1 })),
            nationalCurrent,
            nationalPreviousYear,
            nationalGrowthRate: nationalPreviousYear > 0 ? round((nationalCurrent - nationalPreviousYear) / nationalPreviousYear * 100) : null,
            source: data
        };
    }

    global.LifestyleBusinessRankMath = Object.freeze({ calculateIndustryRanking });
})(typeof window !== 'undefined' ? window : globalThis);
