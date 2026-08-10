(function initializeInvestmentTaxMath(global) {
    "use strict";

    const BASIC_STOCK_DEDUCTION = 2500000;
    const FINANCIAL_INCOME_THRESHOLD = 20000000;

    function nonNegative(value) {
        const number = Number(value);
        return Number.isFinite(number) ? Math.max(0, number) : 0;
    }

    function progressiveIncomeTax(taxBase) {
        const base = nonNegative(taxBase);
        if (base <= 14000000) return base * 0.06;
        if (base <= 50000000) return base * 0.15 - 1260000;
        if (base <= 88000000) return base * 0.24 - 5760000;
        if (base <= 150000000) return base * 0.35 - 15440000;
        if (base <= 300000000) return base * 0.38 - 19940000;
        if (base <= 500000000) return base * 0.40 - 25940000;
        if (base <= 1000000000) return base * 0.42 - 35940000;
        return base * 0.45 - 65940000;
    }

    function calculateOverseasStockTax(options) {
        const proceeds = nonNegative(options.proceeds);
        const acquisitionCost = nonNegative(options.acquisitionCost);
        const expenses = nonNegative(options.expenses);
        const otherStockIncome = Number(options.otherStockIncome) || 0;
        const deductionAlreadyUsed = Math.min(BASIC_STOCK_DEDUCTION, nonNegative(options.deductionAlreadyUsed));
        const netGain = proceeds - acquisitionCost - expenses + otherStockIncome;
        const availableDeduction = BASIC_STOCK_DEDUCTION - deductionAlreadyUsed;
        const taxableBase = Math.max(0, netGain - availableDeduction);
        const incomeTax = taxableBase * 0.20;
        const localIncomeTax = incomeTax * 0.10;

        return {
            proceeds,
            acquisitionCost,
            expenses,
            otherStockIncome,
            netGain,
            availableDeduction,
            taxableBase,
            incomeTax,
            localIncomeTax,
            totalTax: incomeTax + localIncomeTax,
            afterTaxGain: netGain - incomeTax - localIncomeTax
        };
    }

    const SECURITIES_RATES = Object.freeze({
        kospi: { transaction: 0.0005, agriculture: 0.0015 },
        kosdaq: { transaction: 0.002, agriculture: 0 },
        konex: { transaction: 0.001, agriculture: 0 },
        kotc: { transaction: 0.002, agriculture: 0 },
        other: { transaction: 0.0035, agriculture: 0 }
    });

    function calculateSecuritiesTransactionTax(options) {
        const saleAmount = nonNegative(options.saleAmount);
        const fees = nonNegative(options.fees);
        const preset = SECURITIES_RATES[options.market];
        const transactionRate = preset
            ? preset.transaction
            : nonNegative(options.transactionRate) / 100;
        const agricultureRate = preset
            ? preset.agriculture
            : nonNegative(options.agricultureRate) / 100;
        const transactionTax = saleAmount * transactionRate;
        const agricultureTax = saleAmount * agricultureRate;

        return {
            saleAmount,
            fees,
            transactionRate,
            agricultureRate,
            transactionTax,
            agricultureTax,
            totalTax: transactionTax + agricultureTax,
            netProceeds: saleAmount - fees - transactionTax - agricultureTax
        };
    }

    function calculateFinancialIncomeTax(options) {
        const interest = nonNegative(options.interest);
        const eligibleDividend = nonNegative(options.eligibleDividend);
        const otherDividend = nonNegative(options.otherDividend);
        const privateLoanInterest = nonNegative(options.privateLoanInterest);
        const otherComprehensiveIncome = nonNegative(options.otherComprehensiveIncome);
        const deductions = nonNegative(options.deductions);
        const prepaidNationalTax = nonNegative(options.prepaidNationalTax);
        const regularFinancialIncome = interest + eligibleDividend + otherDividend;
        const financialIncome = regularFinancialIncome + privateLoanInterest;
        const exceedsThreshold = financialIncome > FINANCIAL_INCOME_THRESHOLD;

        if (!exceedsThreshold) {
            const nationalTax = regularFinancialIncome * 0.14 + privateLoanInterest * 0.25;
            const localIncomeTax = nationalTax * 0.10;
            return {
                interest,
                eligibleDividend,
                otherDividend,
                privateLoanInterest,
                financialIncome,
                exceedsThreshold,
                grossUp: 0,
                dividendTaxCredit: 0,
                comparisonTaxA: nationalTax,
                comparisonTaxB: nationalTax,
                nationalTax,
                localIncomeTax,
                totalTax: nationalTax + localIncomeTax,
                settlementNationalTax: nationalTax - prepaidNationalTax
            };
        }

        const thresholdExcess = financialIncome - FINANCIAL_INCOME_THRESHOLD;
        const grossUpEligibleDividend = Math.min(eligibleDividend, thresholdExcess);
        const grossUp = grossUpEligibleDividend * 0.10;
        const progressiveBase = Math.max(0, thresholdExcess + otherComprehensiveIncome + grossUp - deductions);
        const comparisonTaxA = progressiveIncomeTax(progressiveBase) + FINANCIAL_INCOME_THRESHOLD * 0.14;
        const otherIncomeBase = Math.max(0, otherComprehensiveIncome - deductions);
        const comparisonTaxB = regularFinancialIncome * 0.14
            + privateLoanInterest * 0.25
            + progressiveIncomeTax(otherIncomeBase);
        const beforeDividendCredit = Math.max(comparisonTaxA, comparisonTaxB);
        const dividendTaxCredit = Math.min(grossUp, Math.max(0, beforeDividendCredit - comparisonTaxB));
        const nationalTax = Math.max(0, beforeDividendCredit - dividendTaxCredit);
        const localIncomeTax = nationalTax * 0.10;

        return {
            interest,
            eligibleDividend,
            otherDividend,
            privateLoanInterest,
            financialIncome,
            exceedsThreshold,
            thresholdExcess,
            grossUp,
            dividendTaxCredit,
            progressiveBase,
            comparisonTaxA,
            comparisonTaxB,
            nationalTax,
            localIncomeTax,
            totalTax: nationalTax + localIncomeTax,
            settlementNationalTax: nationalTax - prepaidNationalTax
        };
    }

    function getServiceYearsDeduction(years) {
        const serviceYears = Math.max(1, Math.ceil(Number(years) || 0));
        if (serviceYears <= 5) return serviceYears * 1000000;
        if (serviceYears <= 10) return 5000000 + (serviceYears - 5) * 2000000;
        if (serviceYears <= 20) return 15000000 + (serviceYears - 10) * 2500000;
        return 40000000 + (serviceYears - 20) * 3000000;
    }

    function getConvertedSalaryDeduction(convertedSalary) {
        const salary = nonNegative(convertedSalary);
        if (salary <= 8000000) return salary;
        if (salary <= 70000000) return 8000000 + (salary - 8000000) * 0.60;
        if (salary <= 100000000) return 45200000 + (salary - 70000000) * 0.55;
        if (salary <= 300000000) return 61700000 + (salary - 100000000) * 0.45;
        return 151700000 + (salary - 300000000) * 0.35;
    }

    function calculateRetirementIncomeTax(options) {
        const retirementPay = nonNegative(options.retirementPay);
        const nonTaxableIncome = nonNegative(options.nonTaxableIncome);
        const serviceYears = Math.max(1, Math.ceil(Number(options.serviceYears) || 0));
        const prepaidNationalTax = nonNegative(options.prepaidNationalTax);
        const retirementIncome = Math.max(0, retirementPay - nonTaxableIncome);
        const serviceYearsDeduction = Math.min(retirementIncome, getServiceYearsDeduction(serviceYears));
        const convertedSalary = Math.max(0, retirementIncome - serviceYearsDeduction) * 12 / serviceYears;
        const convertedSalaryDeduction = Math.min(convertedSalary, getConvertedSalaryDeduction(convertedSalary));
        const taxBase = Math.max(0, convertedSalary - convertedSalaryDeduction);
        const convertedTax = progressiveIncomeTax(taxBase);
        const incomeTax = convertedTax / 12 * serviceYears;
        const localIncomeTax = incomeTax * 0.10;

        return {
            retirementPay,
            nonTaxableIncome,
            serviceYears,
            retirementIncome,
            serviceYearsDeduction,
            convertedSalary,
            convertedSalaryDeduction,
            taxBase,
            convertedTax,
            incomeTax,
            localIncomeTax,
            totalTax: incomeTax + localIncomeTax,
            prepaidNationalTax,
            settlementNationalTax: incomeTax - prepaidNationalTax,
            estimatedNetPay: retirementPay - incomeTax - localIncomeTax
        };
    }

    function calculatePensionIncomeTax(options) {
        const amount = nonNegative(options.amount);
        const mode = options.mode === "deferred-retirement" ? "deferred-retirement" : "private-pension";

        if (mode === "deferred-retirement") {
            const lumpSumEquivalentTax = nonNegative(options.lumpSumEquivalentTax);
            const pensionYear = Math.max(1, Math.ceil(Number(options.pensionYear) || 1));
            const reductionFactor = pensionYear <= 10 ? 0.70 : pensionYear <= 20 ? 0.60 : 0.50;
            const nationalTax = lumpSumEquivalentTax * reductionFactor;
            const localIncomeTax = nationalTax * 0.10;
            return {
                mode,
                amount,
                pensionYear,
                reductionFactor,
                nationalTax,
                localIncomeTax,
                totalTax: nationalTax + localIncomeTax,
                netAmount: amount - nationalTax - localIncomeTax
            };
        }

        const age = Math.max(0, Math.floor(Number(options.age) || 0));
        const lifetime = Boolean(options.lifetime);
        const withholdingRate = lifetime ? 0.03 : age >= 80 ? 0.03 : age >= 70 ? 0.04 : 0.05;
        const nationalTax = amount * withholdingRate;
        const localIncomeTax = nationalTax * 0.10;
        const separateNationalTax = amount * 0.15;
        const separateLocalTax = separateNationalTax * 0.10;

        return {
            mode,
            amount,
            age,
            lifetime,
            withholdingRate,
            nationalTax,
            localIncomeTax,
            totalTax: nationalTax + localIncomeTax,
            netAmount: amount - nationalTax - localIncomeTax,
            exceedsPrivatePensionThreshold: amount > 15000000,
            separateNationalTax,
            separateLocalTax,
            separateTotalTax: separateNationalTax + separateLocalTax,
            separateNetAmount: amount - separateNationalTax - separateLocalTax
        };
    }

    global.InvestmentTaxMath = Object.freeze({
        BASIC_STOCK_DEDUCTION,
        FINANCIAL_INCOME_THRESHOLD,
        SECURITIES_RATES,
        progressiveIncomeTax,
        calculateOverseasStockTax,
        calculateSecuritiesTransactionTax,
        calculateFinancialIncomeTax,
        getServiceYearsDeduction,
        getConvertedSalaryDeduction,
        calculateRetirementIncomeTax,
        calculatePensionIncomeTax
    });
}(typeof window !== "undefined" ? window : globalThis));
