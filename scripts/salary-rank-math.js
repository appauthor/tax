(function (global) {
    'use strict';

    function requireTable() {
        if (!global.SalaryRankTable || !Array.isArray(global.SalaryRankTable.rows)) {
            throw new Error('salary rank table is required');
        }
        return global.SalaryRankTable;
    }

    function toAnnualSalary(value) {
        const amount = Number(value);
        if (!Number.isFinite(amount) || amount <= 0) throw new Error('annual salary must be positive');
        return amount;
    }

    function findReference(topPercent) {
        return requireTable().rows.find(row => row.topPercent === topPercent);
    }

    function estimateSalaryRank(annualSalaryValue) {
        const annualSalary = toAnnualSalary(annualSalaryValue);
        const table = requireTable();
        const rows = table.rows;
        const first = rows[0];
        const last = rows[rows.length - 1];
        let lowerPercent = first.topPercent;
        let upperPercent = first.topPercent;
        let estimatedTopPercent = first.topPercent;

        if (annualSalary < last.averageGrossPay) {
            lowerPercent = last.topPercent;
            upperPercent = last.topPercent;
            estimatedTopPercent = last.topPercent;
        } else if (annualSalary < first.averageGrossPay) {
            for (let index = 0; index < rows.length - 1; index += 1) {
                const higherIncomeRow = rows[index];
                const lowerIncomeRow = rows[index + 1];
                if (annualSalary <= higherIncomeRow.averageGrossPay && annualSalary >= lowerIncomeRow.averageGrossPay) {
                    const salaryRange = higherIncomeRow.averageGrossPay - lowerIncomeRow.averageGrossPay;
                    const position = salaryRange === 0 ? 0 : (higherIncomeRow.averageGrossPay - annualSalary) / salaryRange;
                    estimatedTopPercent = higherIncomeRow.topPercent + position * (lowerIncomeRow.topPercent - higherIncomeRow.topPercent);
                    lowerPercent = higherIncomeRow.topPercent;
                    upperPercent = lowerIncomeRow.topPercent;
                    break;
                }
            }
        }

        const closestRow = rows.reduce((closest, row) => (
            Math.abs(row.averageGrossPay - annualSalary) < Math.abs(closest.averageGrossPay - annualSalary) ? row : closest
        ));
        const topOne = findReference(1);
        const topTen = findReference(10);
        const medianBand = findReference(50);

        return {
            annualSalary,
            monthlyGrossPay: annualSalary / 12,
            estimatedTopPercent: Math.round(estimatedTopPercent * 10) / 10,
            lowerPercent,
            upperPercent,
            closestRow,
            topOneAverage: topOne.averageGrossPay,
            topTenAverage: topTen.averageGrossPay,
            medianBandAverage: medianBand.averageGrossPay,
            topOneGap: annualSalary - topOne.averageGrossPay,
            topTenGap: annualSalary - topTen.averageGrossPay,
            overallAverageGrossPay: Math.round(
                rows.reduce((sum, row) => sum + row.grossPayHundredMillion, 0) * 100000000 /
                rows.reduce((sum, row) => sum + row.people, 0)
            ),
            totalWorkers: rows.reduce((sum, row) => sum + row.people, 0),
            source: table
        };
    }

    global.SalaryRankMath = Object.freeze({ estimateSalaryRank });
})(typeof window !== 'undefined' ? window : globalThis);
