(function initializeLivingFinanceMath(global) {
    "use strict";

    const finite = value => Number.isFinite(Number(value)) ? Number(value) : 0;
    const nonNegative = (value, name) => {
        const number = finite(value);
        if (number < 0) throw new Error(`${name} must be non-negative`);
        return number;
    };

    function calculateRentConversion(input) {
        const mode = input.mode || 'jeonse-to-rent';
        const annualRate = nonNegative(input.annualRate, 'annualRate');
        if (annualRate <= 0) throw new Error('annualRate must be positive');
        const deposit = nonNegative(input.deposit, 'deposit');
        const monthlyRent = nonNegative(input.monthlyRent, 'monthlyRent');
        const comparisonDeposit = nonNegative(input.comparisonDeposit, 'comparisonDeposit');
        let convertedDeposit = 0;
        let convertedMonthlyRent = 0;
        let impliedRate = null;
        if (mode === 'jeonse-to-rent') {
            if (deposit < comparisonDeposit) throw new Error('comparisonDeposit exceeds deposit');
            convertedMonthlyRent = (deposit - comparisonDeposit) * annualRate / 12;
            convertedDeposit = comparisonDeposit;
        } else if (mode === 'rent-to-jeonse') {
            convertedDeposit = deposit + monthlyRent * 12 / annualRate;
            convertedMonthlyRent = monthlyRent;
        } else {
            const depositGap = nonNegative(input.jeonseDeposit, 'jeonseDeposit') - deposit;
            impliedRate = depositGap > 0 ? monthlyRent * 12 / depositGap : null;
            convertedDeposit = deposit;
            convertedMonthlyRent = monthlyRent;
        }
        const periodMonths = Math.max(1, Math.trunc(finite(input.periodMonths) || 24));
        const jeonseLoan = nonNegative(input.jeonseLoan, 'jeonseLoan');
        const loanRate = nonNegative(input.loanRate, 'loanRate');
        const opportunityRate = nonNegative(input.opportunityRate, 'opportunityRate');
        const jeonseOwnFunds = Math.max(0, (mode === 'rent-to-jeonse' ? convertedDeposit : deposit) - jeonseLoan);
        const rentOwnFunds = mode === 'jeonse-to-rent' ? comparisonDeposit : deposit;
        const jeonseCost = jeonseLoan * loanRate * periodMonths / 12 + jeonseOwnFunds * opportunityRate * periodMonths / 12;
        const rentCost = convertedMonthlyRent * periodMonths + rentOwnFunds * opportunityRate * periodMonths / 12;
        return { mode, annualRate, convertedDeposit, convertedMonthlyRent, impliedRate, periodMonths, jeonseCost, rentCost, difference: rentCost - jeonseCost };
    }

    function calculateSubscriptionScore(input) {
        const homelessYears = Math.max(0, finite(input.homelessYears));
        const dependents = Math.max(0, Math.trunc(finite(input.dependents)));
        const subscriptionMonths = Math.max(0, Math.trunc(finite(input.subscriptionMonths)));
        const spouseMonths = Math.max(0, Math.trunc(finite(input.spouseMonths)));
        const homelessScore = homelessYears < 1 ? 2 : Math.min(32, 2 + Math.floor(homelessYears) * 2);
        const dependentScore = Math.min(35, 5 + dependents * 5);
        const accountScore = subscriptionMonths < 6 ? 1 : Math.min(17, 2 + Math.floor(subscriptionMonths / 12));
        const spouseBaseScore = spouseMonths < 6 ? 1 : Math.min(17, 2 + Math.floor(spouseMonths / 12));
        const spouseAdditionalScore = spouseMonths > 0 ? Math.min(3, spouseBaseScore * 0.5) : 0;
        const subscriptionScore = Math.min(17, accountScore + spouseAdditionalScore);
        return { homelessScore, dependentScore, accountScore, spouseAdditionalScore, subscriptionScore, totalScore: homelessScore + dependentScore + subscriptionScore };
    }

    const HOUSING_SALE = [[50000000, .006, 250000], [200000000, .005, 800000], [900000000, .004, null], [1200000000, .005, null], [1500000000, .006, null], [Infinity, .007, null]];
    const HOUSING_LEASE = [[50000000, .005, 200000], [100000000, .004, 300000], [600000000, .003, null], [1200000000, .004, null], [1500000000, .005, null], [Infinity, .006, null]];
    function calculateBrokerageFee(input) {
        const propertyType = input.propertyType || 'housing';
        const transactionType = input.transactionType || 'sale';
        const price = nonNegative(input.price, 'price');
        const deposit = nonNegative(input.deposit, 'deposit');
        const monthlyRent = nonNegative(input.monthlyRent, 'monthlyRent');
        let transactionAmount = transactionType === 'sale' ? price : deposit;
        if (transactionType === 'monthly') {
            transactionAmount = deposit + monthlyRent * 100;
            if (transactionAmount < 50000000) transactionAmount = deposit + monthlyRent * 70;
        }
        let maximumRate;
        let cap = null;
        if (propertyType === 'housing') {
            const bracket = (transactionType === 'sale' ? HOUSING_SALE : HOUSING_LEASE).find(row => transactionAmount < row[0]);
            [, maximumRate, cap] = bracket;
        } else if (propertyType === 'officetel-standard') maximumRate = transactionType === 'sale' ? .005 : .004;
        else maximumRate = .009;
        const agreedRate = nonNegative(input.agreedRate, 'agreedRate');
        const appliedRate = agreedRate > 0 ? Math.min(agreedRate, maximumRate) : maximumRate;
        const feeBeforeVat = Math.min(transactionAmount * appliedRate, cap ?? Infinity);
        const vatRate = nonNegative(input.vatRate, 'vatRate');
        const vat = feeBeforeVat * vatRate;
        return { transactionAmount, maximumRate, appliedRate, cap, feeBeforeVat, vat, total: feeBeforeVat + vat };
    }

    function calculateSeverance(input) {
        const serviceDays = Math.max(0, Math.trunc(finite(input.serviceDays)));
        const averagePeriodDays = Math.max(1, Math.trunc(finite(input.averagePeriodDays)));
        const threeMonthWages = nonNegative(input.threeMonthWages, 'threeMonthWages');
        const annualBonus = nonNegative(input.annualBonus, 'annualBonus');
        const annualLeavePay = nonNegative(input.annualLeavePay, 'annualLeavePay');
        const ordinaryDailyWage = nonNegative(input.ordinaryDailyWage, 'ordinaryDailyWage');
        const includedBonus = annualBonus * 3 / 12;
        const includedLeavePay = annualLeavePay * 3 / 12;
        const averageDailyWage = (threeMonthWages + includedBonus + includedLeavePay) / averagePeriodDays;
        const appliedDailyWage = Math.max(averageDailyWage, ordinaryDailyWage);
        const eligible = serviceDays >= 365 && input.weeklyHoursEligible !== false;
        const severance = eligible ? appliedDailyWage * 30 * serviceDays / 365 : 0;
        return { serviceDays, averagePeriodDays, threeMonthWages, includedBonus, includedLeavePay, averageDailyWage, ordinaryDailyWage, appliedDailyWage, eligible, severance };
    }

    function calculateNetSalary(input) {
        const grossMonthly = nonNegative(input.grossMonthly, 'grossMonthly');
        const nonTaxableMonthly = Math.min(grossMonthly, nonNegative(input.nonTaxableMonthly, 'nonTaxableMonthly'));
        const taxableMonthly = grossMonthly - nonTaxableMonthly;
        const pensionBase = Math.min(6590000, Math.max(410000, taxableMonthly));
        const pension = pensionBase * .0475;
        const health = taxableMonthly * .0719 / 2;
        const longTermCare = health * (.009448 / .0719);
        const employment = taxableMonthly * .009;
        const incomeTax = nonNegative(input.incomeTax, 'incomeTax');
        const localIncomeTax = incomeTax * .1;
        const otherDeduction = nonNegative(input.otherDeduction, 'otherDeduction');
        const totalDeduction = pension + health + longTermCare + employment + incomeTax + localIncomeTax + otherDeduction;
        return { grossMonthly, nonTaxableMonthly, taxableMonthly, pensionBase, pension, health, longTermCare, employment, incomeTax, localIncomeTax, otherDeduction, totalDeduction, netMonthly: grossMonthly - totalDeduction, netAnnual: (grossMonthly - totalDeduction) * 12 };
    }

    function calculateRentTaxCredit(input) {
        const grossSalary = nonNegative(input.grossSalary, 'grossSalary');
        const comprehensiveIncome = nonNegative(input.comprehensiveIncome, 'comprehensiveIncome');
        const paidRent = nonNegative(input.paidRent, 'paidRent');
        const availableTax = nonNegative(input.availableTax, 'availableTax');
        const eligible = grossSalary <= 80000000 && comprehensiveIncome <= 70000000 && input.noHome === true && input.addressMatched === true && input.qualifiedHousing === true && input.contractQualified === true;
        const rate = grossSalary <= 55000000 && comprehensiveIncome <= 45000000 ? .17 : .15;
        const recognizedRent = eligible ? Math.min(paidRent, 10000000) : 0;
        const calculatedCredit = recognizedRent * rate;
        const usableCredit = availableTax > 0 ? Math.min(calculatedCredit, availableTax) : calculatedCredit;
        return { eligible, rate, paidRent, recognizedRent, excludedRent: Math.max(0, paidRent - recognizedRent), calculatedCredit, usableCredit, limitedByTax: availableTax > 0 && calculatedCredit > availableTax };
    }

    global.LivingFinanceMath = Object.freeze({ calculateRentConversion, calculateSubscriptionScore, calculateBrokerageFee, calculateSeverance, calculateNetSalary, calculateRentTaxCredit });
}(typeof window !== 'undefined' ? window : globalThis));
