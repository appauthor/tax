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

    function requireFiniteNonNegative(value, name) {
        const number = Number(value);
        if (!Number.isFinite(number) || number < 0) {
            throw new RangeError(`${name} must be a non-negative number`);
        }
        return number;
    }

    function requireFinitePositive(value, name) {
        const number = requireFiniteNonNegative(value, name);
        if (number <= 0) throw new RangeError(`${name} must be greater than zero`);
        return number;
    }

    function calculateAverageCost({ lots, currentPrice = 0 }) {
        if (!Array.isArray(lots) || lots.length === 0) {
            throw new RangeError('lots must contain at least one purchase');
        }
        const normalizedLots = lots.map((lot, index) => {
            const price = requireFinitePositive(lot.price, `lots[${index}].price`);
            const quantity = requireFinitePositive(lot.quantity, `lots[${index}].quantity`);
            const fee = requireFiniteNonNegative(lot.fee || 0, `lots[${index}].fee`);
            const purchaseAmount = price * quantity;
            return { price, quantity, fee, purchaseAmount, acquisitionCost: purchaseAmount + fee };
        });
        const marketPrice = requireFiniteNonNegative(currentPrice, 'currentPrice');
        const totalQuantity = normalizedLots.reduce((sum, lot) => sum + lot.quantity, 0);
        const totalPurchaseAmount = normalizedLots.reduce((sum, lot) => sum + lot.purchaseAmount, 0);
        const totalFees = normalizedLots.reduce((sum, lot) => sum + lot.fee, 0);
        const totalAcquisitionCost = totalPurchaseAmount + totalFees;
        const averagePrice = totalAcquisitionCost / totalQuantity;
        const evaluationAmount = marketPrice > 0 ? marketPrice * totalQuantity : null;
        const profitLoss = evaluationAmount === null ? null : evaluationAmount - totalAcquisitionCost;
        const returnRate = profitLoss === null ? null : profitLoss / totalAcquisitionCost;
        const breakEvenChangeRate = marketPrice > 0 ? averagePrice / marketPrice - 1 : null;

        return {
            lots: normalizedLots,
            currentPrice: marketPrice,
            totalQuantity,
            totalPurchaseAmount,
            totalFees,
            totalAcquisitionCost,
            averagePrice,
            evaluationAmount,
            profitLoss,
            returnRate,
            breakEvenChangeRate
        };
    }

    function calculateAdditionalPurchase({
        currentAveragePrice,
        currentQuantity,
        additionalPrice,
        mode = 'quantity',
        additionalQuantity = 0,
        targetAveragePrice = 0,
        additionalFee = 0,
        currentPrice = 0
    }) {
        const averagePrice = requireFinitePositive(currentAveragePrice, 'currentAveragePrice');
        const quantity = requireFinitePositive(currentQuantity, 'currentQuantity');
        const purchasePrice = requireFinitePositive(additionalPrice, 'additionalPrice');
        const fee = requireFiniteNonNegative(additionalFee, 'additionalFee');
        const marketPrice = requireFiniteNonNegative(currentPrice, 'currentPrice');
        if (mode !== 'quantity' && mode !== 'target') throw new RangeError('Unsupported additional purchase mode');

        const currentAcquisitionCost = averagePrice * quantity;
        let calculatedAdditionalQuantity;
        let target = null;
        if (mode === 'target') {
            target = requireFinitePositive(targetAveragePrice, 'targetAveragePrice');
            const lowerBound = Math.min(averagePrice, purchasePrice);
            const upperBound = Math.max(averagePrice, purchasePrice);
            if (target <= lowerBound || target >= upperBound) {
                throw new RangeError('targetAveragePrice must be strictly between currentAveragePrice and additionalPrice');
            }
            calculatedAdditionalQuantity = (currentAcquisitionCost + fee - target * quantity) / (target - purchasePrice);
            if (!Number.isFinite(calculatedAdditionalQuantity) || calculatedAdditionalQuantity <= 0) {
                throw new RangeError('targetAveragePrice cannot be reached with the entered fee');
            }
        } else {
            calculatedAdditionalQuantity = requireFinitePositive(additionalQuantity, 'additionalQuantity');
        }

        const additionalPurchaseAmount = purchasePrice * calculatedAdditionalQuantity;
        const additionalAcquisitionCost = additionalPurchaseAmount + fee;
        const totalQuantity = quantity + calculatedAdditionalQuantity;
        const totalAcquisitionCost = currentAcquisitionCost + additionalAcquisitionCost;
        const newAveragePrice = totalAcquisitionCost / totalQuantity;
        const averagePriceChange = newAveragePrice - averagePrice;
        const averagePriceChangeRate = averagePriceChange / averagePrice;
        const evaluationAmount = marketPrice > 0 ? marketPrice * totalQuantity : null;
        const profitLoss = evaluationAmount === null ? null : evaluationAmount - totalAcquisitionCost;
        const returnRate = profitLoss === null ? null : profitLoss / totalAcquisitionCost;
        const breakEvenChangeRate = marketPrice > 0 ? newAveragePrice / marketPrice - 1 : null;
        const wholeShareQuantity = Math.ceil(calculatedAdditionalQuantity);
        const wholeShareAveragePrice = (
            currentAcquisitionCost + purchasePrice * wholeShareQuantity + fee
        ) / (quantity + wholeShareQuantity);

        return {
            mode,
            currentAveragePrice: averagePrice,
            currentQuantity: quantity,
            currentAcquisitionCost,
            additionalPrice: purchasePrice,
            additionalQuantity: calculatedAdditionalQuantity,
            additionalFee: fee,
            additionalPurchaseAmount,
            additionalAcquisitionCost,
            targetAveragePrice: target,
            totalQuantity,
            totalAcquisitionCost,
            newAveragePrice,
            averagePriceChange,
            averagePriceChangeRate,
            currentPrice: marketPrice,
            evaluationAmount,
            profitLoss,
            returnRate,
            breakEvenChangeRate,
            wholeShareQuantity,
            wholeShareAveragePrice
        };
    }

    function requireRate(value, name, minimumExclusive = -1, maximumInclusive = 10) {
        const rate = Number(value);
        if (!Number.isFinite(rate) || rate <= minimumExclusive || rate > maximumInclusive) {
            throw new RangeError(`${name} is outside the supported range`);
        }
        return rate;
    }

    function getContributionTimes(durationYears, contributionFrequency, contributionTiming) {
        const rawCount = durationYears * contributionFrequency;
        const count = contributionTiming === 'beginning'
            ? Math.ceil(rawCount - 1e-10)
            : Math.floor(rawCount + 1e-10);
        return Array.from({ length: Math.max(0, count) }, (_, index) => (
            contributionTiming === 'beginning' ? index / contributionFrequency : (index + 1) / contributionFrequency
        ));
    }

    function projectCompoundAtYears({
        initialPrincipal,
        regularContribution,
        periodicRate,
        durationYears,
        compoundingFrequency,
        contributionFrequency,
        contributionTiming,
        annualFeeRate,
        inflationRate
    }) {
        const contributionTimes = regularContribution > 0
            ? getContributionTimes(durationYears, contributionFrequency, contributionTiming)
            : [];
        const cashFlows = initialPrincipal > 0 ? [{ amount: initialPrincipal, timeYears: 0 }] : [];
        contributionTimes.forEach(timeYears => cashFlows.push({ amount: regularContribution, timeYears }));

        let grossFinalAmount = 0;
        let finalAmount = 0;
        let simpleFinalAmount = 0;
        cashFlows.forEach(cashFlow => {
            const remainingYears = Math.max(0, durationYears - cashFlow.timeYears);
            const periods = compoundingFrequency * remainingYears;
            const grossGrowthFactor = Math.pow(1 + periodicRate, periods);
            const feeFactor = Math.pow(1 - annualFeeRate, remainingYears);
            grossFinalAmount += cashFlow.amount * grossGrowthFactor;
            finalAmount += cashFlow.amount * grossGrowthFactor * feeFactor;
            simpleFinalAmount += cashFlow.amount
                * (1 + periodicRate * periods)
                * feeFactor;
        });

        const contributedPrincipal = cashFlows.reduce((sum, cashFlow) => sum + cashFlow.amount, 0);
        const effectiveAnnualRate = Math.pow(1 + periodicRate, compoundingFrequency) - 1;
        const netEffectiveAnnualRate = (1 + effectiveAnnualRate) * (1 - annualFeeRate) - 1;
        const inflationAdjustedAmount = finalAmount / Math.pow(1 + inflationRate, durationYears);
        if (![grossFinalAmount, finalAmount, simpleFinalAmount, inflationAdjustedAmount, effectiveAnnualRate].every(Number.isFinite)) {
            throw new RangeError('compound result exceeds supported range');
        }

        return {
            compoundingFrequency,
            contributionFrequency,
            contributionTiming,
            contributionCount: contributionTimes.length,
            contributedPrincipal,
            grossFinalAmount,
            finalAmount,
            compoundEarnings: finalAmount - contributedPrincipal,
            feeImpact: grossFinalAmount - finalAmount,
            simpleFinalAmount,
            compoundAdvantage: finalAmount - simpleFinalAmount,
            effectiveAnnualRate,
            netEffectiveAnnualRate,
            inflationAdjustedAmount
        };
    }

    function createCompoundSchedule(options, durationValue) {
        const frequency = options.compoundingFrequency;
        const maxPoints = frequency === 1 ? 20 : 12;
        const step = Math.max(1, Math.ceil(durationValue / maxPoints));
        const periodValues = [];
        for (let period = step; period < durationValue; period += step) periodValues.push(period);
        periodValues.push(durationValue);
        return periodValues.map(periodValue => {
            const point = projectCompoundAtYears({
                ...options,
                durationYears: periodValue / frequency
            });
            return {
                periodValue,
                contributedPrincipal: point.contributedPrincipal,
                netBalance: point.finalAmount,
                compoundEarnings: point.compoundEarnings
            };
        });
    }

    function calculateCompoundGrowth({
        initialPrincipal = 0,
        regularContribution = 0,
        periodicRate = 0,
        durationValue,
        compoundingFrequency = 12,
        contributionFrequency = 12,
        contributionTiming = 'end',
        annualFeeRate = 0,
        inflationRate = 0
    }) {
        const initial = requireFiniteNonNegative(initialPrincipal, 'initialPrincipal');
        const contribution = requireFiniteNonNegative(regularContribution, 'regularContribution');
        if (initial === 0 && contribution === 0) {
            throw new RangeError('initialPrincipal or regularContribution must be greater than zero');
        }
        if (![1, 12, 365].includes(compoundingFrequency)) {
            throw new RangeError('compoundingFrequency must be 1, 12, or 365');
        }
        const periods = Number(durationValue);
        const durationYears = periods / compoundingFrequency;
        if (!Number.isInteger(periods) || periods <= 0 || durationYears > 100) {
            throw new RangeError('durationValue must be a positive integer within 100 years');
        }
        const rate = requireRate(periodicRate, 'periodicRate');
        const feeRate = requireFiniteNonNegative(annualFeeRate, 'annualFeeRate');
        if (feeRate >= 1) throw new RangeError('annualFeeRate is outside the supported range');
        const priceInflationRate = requireRate(inflationRate, 'inflationRate');
        if (![1, 12].includes(contributionFrequency)) {
            throw new RangeError('contributionFrequency must be 1 or 12');
        }
        if (!['beginning', 'end'].includes(contributionTiming)) {
            throw new RangeError('Unsupported contributionTiming');
        }

        const baseOptions = {
            initialPrincipal: initial,
            regularContribution: contribution,
            periodicRate: rate,
            durationYears,
            contributionFrequency,
            contributionTiming,
            annualFeeRate: feeRate,
            inflationRate: priceInflationRate
        };
        const selected = projectCompoundAtYears({ ...baseOptions, compoundingFrequency });
        selected.schedule = createCompoundSchedule({ ...baseOptions, compoundingFrequency }, periods);

        return {
            initialPrincipal: initial,
            regularContribution: contribution,
            periodicRate: rate,
            durationValue: periods,
            durationYears,
            compoundingFrequency,
            annualFeeRate: feeRate,
            inflationRate: priceInflationRate,
            selected
        };
    }

    const PENSION_TAX_CREDIT_RULES_2026 = Object.freeze({
        pensionSavingsLimit: 6000000,
        combinedLimit: 9000000,
        isaTransferAdditionalRate: 0.10,
        isaTransferAdditionalLimit: 3000000,
        lowerIncomeRate: 0.15,
        standardRate: 0.12,
        salaryThreshold: 55000000,
        comprehensiveIncomeThreshold: 45000000,
        localIncomeTaxFactor: 0.10
    });

    function calculatePensionTaxCredit({
        incomeType = 'salary',
        incomeAmount = 0,
        pensionSavingsContribution = 0,
        irpContribution = 0,
        isaTransferAmount = 0,
        availableIncomeTax = null
    }) {
        if (!['salary', 'comprehensive'].includes(incomeType)) {
            throw new RangeError('Unsupported income type');
        }
        const income = requireFiniteNonNegative(incomeAmount, 'incomeAmount');
        const pensionSavings = requireFiniteNonNegative(pensionSavingsContribution, 'pensionSavingsContribution');
        const irp = requireFiniteNonNegative(irpContribution, 'irpContribution');
        const isaTransfer = requireFiniteNonNegative(isaTransferAmount, 'isaTransferAmount');
        if (pensionSavings + irp + isaTransfer <= 0) {
            throw new RangeError('At least one contribution must be greater than zero');
        }
        const rules = PENSION_TAX_CREDIT_RULES_2026;
        const pensionSavingsEligible = Math.min(pensionSavings, rules.pensionSavingsLimit);
        const isaAdditionalLimit = Math.min(
            isaTransfer * rules.isaTransferAdditionalRate,
            rules.isaTransferAdditionalLimit
        );
        const combinedLimit = rules.combinedLimit + isaAdditionalLimit;
        const eligibleContribution = Math.min(
            pensionSavingsEligible + irp + isaTransfer,
            combinedLimit
        );
        const incomeThreshold = incomeType === 'salary'
            ? rules.salaryThreshold
            : rules.comprehensiveIncomeThreshold;
        const creditRate = income <= incomeThreshold ? rules.lowerIncomeRate : rules.standardRate;
        const statutoryIncomeTaxCredit = eligibleContribution * creditRate;
        const hasTaxCap = availableIncomeTax !== null && availableIncomeTax !== '';
        const taxCap = hasTaxCap
            ? requireFiniteNonNegative(availableIncomeTax, 'availableIncomeTax')
            : null;
        const usableIncomeTaxCredit = hasTaxCap
            ? Math.min(statutoryIncomeTaxCredit, taxCap)
            : statutoryIncomeTaxCredit;
        const localIncomeTaxReduction = usableIncomeTaxCredit * rules.localIncomeTaxFactor;

        return {
            incomeType,
            incomeAmount: income,
            incomeThreshold,
            pensionSavingsContribution: pensionSavings,
            irpContribution: irp,
            isaTransferAmount: isaTransfer,
            pensionSavingsEligible,
            isaAdditionalLimit,
            combinedLimit,
            eligibleContribution,
            excessContribution: Math.max(0, pensionSavings + irp + isaTransfer - eligibleContribution),
            creditRate,
            statutoryIncomeTaxCredit,
            availableIncomeTax: taxCap,
            usableIncomeTaxCredit,
            localIncomeTaxReduction,
            estimatedTotalTaxReduction: usableIncomeTaxCredit + localIncomeTaxReduction
        };
    }

    const ISA_TAX_RULES_2026 = Object.freeze({
        exemptionLimits: Object.freeze({ general: 2000000, supported: 4000000 }),
        nationalSeparateTaxRate: 0.09,
        localIncomeTaxFactor: 0.10,
        standardAccountTaxRate: 0.154
    });

    function calculateIsaTaxSavings({
        accountType = 'general',
        taxableIncome = 0,
        recognizedLoss = 0,
        generalAccountTaxRate = ISA_TAX_RULES_2026.standardAccountTaxRate
    }) {
        if (!Object.prototype.hasOwnProperty.call(ISA_TAX_RULES_2026.exemptionLimits, accountType)) {
            throw new RangeError('Unsupported ISA account type');
        }
        const income = requireFiniteNonNegative(taxableIncome, 'taxableIncome');
        const loss = requireFiniteNonNegative(recognizedLoss, 'recognizedLoss');
        const comparisonRate = requireFiniteNonNegative(generalAccountTaxRate, 'generalAccountTaxRate');
        if (comparisonRate > 1) throw new RangeError('generalAccountTaxRate is outside the supported range');
        const netIncome = Math.max(0, income - loss);
        const exemptionLimit = ISA_TAX_RULES_2026.exemptionLimits[accountType];
        const exemptIncome = Math.min(netIncome, exemptionLimit);
        const isaTaxableIncome = Math.max(0, netIncome - exemptionLimit);
        const isaNationalTax = isaTaxableIncome * ISA_TAX_RULES_2026.nationalSeparateTaxRate;
        const isaLocalIncomeTax = isaNationalTax * ISA_TAX_RULES_2026.localIncomeTaxFactor;
        const isaTotalTax = isaNationalTax + isaLocalIncomeTax;
        const generalAccountTax = income * comparisonRate;

        return {
            accountType,
            taxableIncome: income,
            recognizedLoss: loss,
            netIncome,
            exemptionLimit,
            exemptIncome,
            isaTaxableIncome,
            isaNationalTax,
            isaLocalIncomeTax,
            isaTotalTax,
            generalAccountTaxRate: comparisonRate,
            generalAccountTax,
            estimatedTaxSavings: generalAccountTax - isaTotalTax,
            isaAfterTaxIncome: netIncome - isaTotalTax,
            generalAfterTaxIncome: income - loss - generalAccountTax
        };
    }

    function calculateStockReturn({
        purchasePrice,
        quantity,
        currentPrice,
        purchaseFee = 0,
        saleFeeRate = 0,
        transactionTaxRate = 0,
        otherSaleCosts = 0,
        holdingDays = 0
    }) {
        const buyPrice = requireFinitePositive(purchasePrice, 'purchasePrice');
        const units = requireFinitePositive(quantity, 'quantity');
        const sellPrice = requireFiniteNonNegative(currentPrice, 'currentPrice');
        const buyFee = requireFiniteNonNegative(purchaseFee, 'purchaseFee');
        const feeRate = requireFiniteNonNegative(saleFeeRate, 'saleFeeRate');
        const taxRate = requireFiniteNonNegative(transactionTaxRate, 'transactionTaxRate');
        if (feeRate > 1 || taxRate > 1 || feeRate + taxRate >= 1) {
            throw new RangeError('sale rates are outside the supported range');
        }
        const saleCosts = requireFiniteNonNegative(otherSaleCosts, 'otherSaleCosts');
        const days = requireFiniteNonNegative(holdingDays, 'holdingDays');
        const purchaseAmount = buyPrice * units;
        const acquisitionCost = purchaseAmount + buyFee;
        const grossSaleAmount = sellPrice * units;
        const saleFee = grossSaleAmount * feeRate;
        const transactionTax = grossSaleAmount * taxRate;
        const totalSaleCosts = saleFee + transactionTax + saleCosts;
        const netSaleAmount = grossSaleAmount - totalSaleCosts;
        const profitLoss = netSaleAmount - acquisitionCost;
        const returnRate = acquisitionCost > 0 ? profitLoss / acquisitionCost : 0;
        const breakEvenPrice = (acquisitionCost + saleCosts) / (units * (1 - feeRate - taxRate));
        const growthRatio = netSaleAmount / acquisitionCost;
        const annualizedReturnRate = days > 0 && growthRatio > 0
            ? Math.pow(growthRatio, 365 / days) - 1
            : null;

        return {
            purchasePrice: buyPrice,
            quantity: units,
            currentPrice: sellPrice,
            purchaseAmount,
            purchaseFee: buyFee,
            acquisitionCost,
            grossSaleAmount,
            saleFeeRate: feeRate,
            saleFee,
            transactionTaxRate: taxRate,
            transactionTax,
            otherSaleCosts: saleCosts,
            totalSaleCosts,
            netSaleAmount,
            profitLoss,
            returnRate,
            breakEvenPrice,
            holdingDays: days,
            annualizedReturnRate
        };
    }

    function calculateDividend({
        quantity,
        dividendPerShare,
        paymentsPerYear = 4,
        currentPrice = 0,
        averagePurchasePrice = 0,
        withholdingTaxRate = 0,
        targetMonthlyNetDividend = 0
    }) {
        const units = requireFinitePositive(quantity, 'quantity');
        const dividend = requireFiniteNonNegative(dividendPerShare, 'dividendPerShare');
        const frequency = Number(paymentsPerYear);
        if (![1, 2, 4, 12].includes(frequency)) throw new RangeError('Unsupported dividend frequency');
        const marketPrice = requireFiniteNonNegative(currentPrice, 'currentPrice');
        const costPrice = requireFiniteNonNegative(averagePurchasePrice, 'averagePurchasePrice');
        const taxRate = requireFiniteNonNegative(withholdingTaxRate, 'withholdingTaxRate');
        if (taxRate > 1) throw new RangeError('withholdingTaxRate is outside the supported range');
        const targetMonthly = requireFiniteNonNegative(targetMonthlyNetDividend, 'targetMonthlyNetDividend');
        const grossPerPayment = units * dividend;
        const annualGrossDividend = grossPerPayment * frequency;
        const annualTax = annualGrossDividend * taxRate;
        const annualNetDividend = annualGrossDividend - annualTax;
        const monthlyNetDividend = annualNetDividend / 12;
        const grossDividendYield = marketPrice > 0 ? annualGrossDividend / (marketPrice * units) : null;
        const netDividendYield = marketPrice > 0 ? annualNetDividend / (marketPrice * units) : null;
        const yieldOnCost = costPrice > 0 ? annualNetDividend / (costPrice * units) : null;
        const annualNetPerShare = dividend * frequency * (1 - taxRate);
        const targetQuantity = targetMonthly > 0 && annualNetPerShare > 0
            ? Math.ceil(targetMonthly * 12 / annualNetPerShare)
            : null;

        return {
            quantity: units,
            dividendPerShare: dividend,
            paymentsPerYear: frequency,
            currentPrice: marketPrice,
            averagePurchasePrice: costPrice,
            withholdingTaxRate: taxRate,
            grossPerPayment,
            annualGrossDividend,
            annualTax,
            annualNetDividend,
            monthlyNetDividend,
            grossDividendYield,
            netDividendYield,
            yieldOnCost,
            targetMonthlyNetDividend: targetMonthly,
            targetQuantity,
            targetInvestment: targetQuantity !== null && marketPrice > 0 ? targetQuantity * marketPrice : null
        };
    }

    const SAVINGS_INTEREST_RULES_2026 = Object.freeze({ standardTaxRate: 0.154 });

    function calculateSavingsInterest({
        productType = 'deposit',
        amount,
        annualRate,
        months,
        interestMethod = 'simple',
        contributionTiming = 'beginning',
        taxRate = SAVINGS_INTEREST_RULES_2026.standardTaxRate
    }) {
        if (!['deposit', 'installment'].includes(productType)) throw new RangeError('Unsupported savings product type');
        if (!['simple', 'monthly-compound'].includes(interestMethod)) throw new RangeError('Unsupported interest method');
        if (!['beginning', 'end'].includes(contributionTiming)) throw new RangeError('Unsupported contribution timing');
        const payment = requireFinitePositive(amount, 'amount');
        const rate = requireFiniteNonNegative(annualRate, 'annualRate');
        if (rate > 10) throw new RangeError('annualRate is outside the supported range');
        const duration = Number(months);
        if (!Number.isInteger(duration) || duration <= 0 || duration > 1200) {
            throw new RangeError('months must be a positive integer within 100 years');
        }
        const withholdingRate = requireFiniteNonNegative(taxRate, 'taxRate');
        if (withholdingRate > 1) throw new RangeError('taxRate is outside the supported range');
        const monthlyRate = rate / 12;
        let principal;
        let grossInterest;
        if (productType === 'deposit') {
            principal = payment;
            grossInterest = interestMethod === 'simple'
                ? payment * rate * duration / 12
                : payment * (Math.pow(1 + monthlyRate, duration) - 1);
        } else {
            principal = payment * duration;
            grossInterest = 0;
            for (let index = 0; index < duration; index += 1) {
                const earningMonths = contributionTiming === 'beginning'
                    ? duration - index
                    : duration - index - 1;
                grossInterest += interestMethod === 'simple'
                    ? payment * rate * earningMonths / 12
                    : payment * (Math.pow(1 + monthlyRate, earningMonths) - 1);
            }
        }
        const tax = grossInterest * withholdingRate;
        const netInterest = grossInterest - tax;
        const maturityAmount = principal + netInterest;

        return {
            productType,
            amount: payment,
            annualRate: rate,
            months: duration,
            interestMethod,
            contributionTiming,
            taxRate: withholdingRate,
            principal,
            grossInterest,
            tax,
            netInterest,
            maturityAmount,
            netReturnRate: principal > 0 ? netInterest / principal : 0
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
        calculatePensionIncomeTax,
        calculateAverageCost,
        calculateAdditionalPurchase,
        calculateCompoundGrowth,
        PENSION_TAX_CREDIT_RULES_2026,
        calculatePensionTaxCredit,
        ISA_TAX_RULES_2026,
        calculateIsaTaxSavings,
        calculateStockReturn,
        calculateDividend,
        SAVINGS_INTEREST_RULES_2026,
        calculateSavingsInterest
    });
}(typeof window !== "undefined" ? window : globalThis));
