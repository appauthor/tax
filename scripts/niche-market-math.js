(function (global) {
    'use strict';

    const RELATED_LIMIT_RATE = 0.3;
    const RELATED_LIMIT_AMOUNT = 300000000;
    const UNRELATED_DEDUCTION = 300000000;
    const GOODWILL_EXPENSE_RATE = 0.6;
    const OTHER_INCOME_TAX_RATE = 0.2;
    const LOCAL_INCOME_TAX_RATE = 0.1;
    const OTHER_INCOME_MINIMUM = 50000;
    const VAT_RATE = 0.1;
    const GIFT_DEDUCTIONS = Object.freeze({
        spouse: 600000000,
        adultChild: 50000000,
        minorChild: 20000000,
        parent: 50000000,
        otherRelative: 10000000,
        none: 0
    });

    function requireNonNegative(value, name) {
        const number = Number(value);
        if (!Number.isFinite(number) || number < 0) throw new Error(`${name} must be non-negative`);
        return number;
    }

    function progressiveGiftTax(taxBase) {
        if (taxBase <= 0) return 0;
        if (taxBase <= 100000000) return taxBase * 0.1;
        if (taxBase <= 500000000) return taxBase * 0.2 - 10000000;
        if (taxBase <= 1000000000) return taxBase * 0.3 - 60000000;
        if (taxBase <= 3000000000) return taxBase * 0.4 - 160000000;
        return taxBase * 0.5 - 460000000;
    }

    function calculateFamilyPropertyTransferGift({
        transactionType,
        marketValue,
        transactionPrice,
        related = true,
        noJustifiableReason = false,
        beneficiaryRelation = 'adultChild',
        priorGiftAmount = 0,
        priorGiftTaxPaid = 0
    }) {
        if (!['lowPurchase', 'highSale'].includes(transactionType)) throw new Error('unsupported transaction type');
        if (!Object.hasOwn(GIFT_DEDUCTIONS, beneficiaryRelation)) throw new Error('unsupported beneficiary relation');
        const market = requireNonNegative(marketValue, 'market value');
        const price = requireNonNegative(transactionPrice, 'transaction price');
        const previousGift = requireNonNegative(priorGiftAmount, 'prior gift amount');
        const previousTax = requireNonNegative(priorGiftTaxPaid, 'prior gift tax paid');
        if (market <= 0) throw new Error('market value must be positive');

        const economicBenefit = transactionType === 'lowPurchase'
            ? Math.max(0, market - price)
            : Math.max(0, price - market);
        const rateThreshold = market * RELATED_LIMIT_RATE;
        const relatedThreshold = Math.min(rateThreshold, RELATED_LIMIT_AMOUNT);
        const threshold = related ? relatedThreshold : rateThreshold;
        const taxableConditionMet = related
            ? economicBenefit > relatedThreshold
            : noJustifiableReason && economicBenefit > rateThreshold;
        const currentGiftValue = taxableConditionMet
            ? Math.max(0, economicBenefit - (related ? relatedThreshold : UNRELATED_DEDUCTION))
            : 0;
        const deduction = GIFT_DEDUCTIONS[beneficiaryRelation];
        const aggregateGiftAmount = previousGift + currentGiftValue;
        const aggregateTaxBase = Math.max(0, aggregateGiftAmount - deduction);
        const aggregateCalculatedTax = Math.floor(progressiveGiftTax(aggregateTaxBase));
        const currentEstimatedTax = Math.max(0, aggregateCalculatedTax - previousTax);

        return {
            transactionType,
            marketValue: market,
            transactionPrice: price,
            related: Boolean(related),
            noJustifiableReason: Boolean(noJustifiableReason),
            economicBenefit,
            rateThreshold,
            threshold,
            taxableConditionMet,
            currentGiftValue,
            deduction,
            priorGiftAmount: previousGift,
            aggregateGiftAmount,
            aggregateTaxBase,
            aggregateCalculatedTax,
            priorGiftTaxPaid: previousTax,
            currentEstimatedTax
        };
    }

    function calculateCommercialPremiumTax({
        amount,
        amountMode = 'vatExtra',
        vatApplicable = true,
        actualExpense = 0
    }) {
        if (!['vatExtra', 'vatIncluded'].includes(amountMode)) throw new Error('unsupported amount mode');
        const enteredAmount = requireNonNegative(amount, 'amount');
        const verifiedExpense = requireNonNegative(actualExpense, 'actual expense');
        if (enteredAmount <= 0) throw new Error('amount must be positive');

        const supplyValue = vatApplicable && amountMode === 'vatIncluded'
            ? enteredAmount / (1 + VAT_RATE)
            : enteredAmount;
        if (verifiedExpense > supplyValue) throw new Error('actual expense cannot exceed supply value');
        const vat = vatApplicable ? supplyValue * VAT_RATE : 0;
        const buyerTotalPayment = supplyValue + vat;
        const statutoryExpense = supplyValue * GOODWILL_EXPENSE_RATE;
        const deductibleExpense = Math.max(statutoryExpense, verifiedExpense);
        const otherIncome = Math.max(0, supplyValue - deductibleExpense);
        const minimumApplied = otherIncome <= OTHER_INCOME_MINIMUM;
        const incomeTaxWithholding = minimumApplied ? 0 : Math.floor(otherIncome * OTHER_INCOME_TAX_RATE);
        const localIncomeTaxWithholding = minimumApplied ? 0 : Math.floor(incomeTaxWithholding * LOCAL_INCOME_TAX_RATE);
        const totalWithholding = incomeTaxWithholding + localIncomeTaxWithholding;

        return {
            enteredAmount,
            amountMode,
            vatApplicable: Boolean(vatApplicable),
            supplyValue,
            vat,
            buyerTotalPayment,
            statutoryExpense,
            actualExpense: verifiedExpense,
            deductibleExpense,
            otherIncome,
            minimumApplied,
            incomeTaxWithholding,
            localIncomeTaxWithholding,
            totalWithholding,
            sellerCashReceipt: buyerTotalPayment - totalWithholding,
            effectiveWithholdingRate: totalWithholding / supplyValue
        };
    }

    function requireNicheData() {
        if (!global.NicheMarketData) throw new Error('niche market data is required');
        return global.NicheMarketData;
    }

    function calculateNationalPensionBenefitRank({ monthlyBenefit, region = '' }) {
        const amount = requireNonNegative(monthlyBenefit, 'monthly benefit');
        if (amount <= 0) throw new Error('monthly benefit must be positive');
        const data = requireNicheData().nationalPension;
        const bands = data.amountBands;
        const bandIndex = bands.findIndex(row => amount >= row.min && (row.max === null || amount < row.max));
        if (bandIndex < 0) throw new Error('benefit band not found');
        const band = bands[bandIndex];
        const totalRecipients = bands.reduce((sum, row) => sum + row.recipients, 0);
        const peopleAboveBand = bands.slice(bandIndex + 1).reduce((sum, row) => sum + row.recipients, 0);
        const topRangeStart = peopleAboveBand / totalRecipients * 100;
        const topRangeEnd = (peopleAboveBand + band.recipients) / totalRecipients * 100;
        const regionRow = region ? data.regions.find(row => row.region === region) : null;
        if (region && !regionRow) throw new Error('unsupported region');
        const regionRank = regionRow
            ? data.regions.filter(row => row.averageMonthlyBenefit > regionRow.averageMonthlyBenefit).length + 1
            : null;

        return {
            monthlyBenefit: amount,
            band,
            totalRecipients,
            peopleAboveBand,
            topRangeStart,
            topRangeEnd,
            bandShare: band.recipients / totalRecipients * 100,
            region: regionRow ? { ...regionRow, rank: regionRank, difference: amount - regionRow.averageMonthlyBenefit } : null,
            source: data
        };
    }

    function calculateRegionalHealthInsuranceRank({ monthlyPremium = 0, region }) {
        const data = requireNicheData().regionalHealthInsurance;
        const premium = requireNonNegative(monthlyPremium, 'monthly premium');
        const selected = data.rows.find(row => row.region === region);
        if (!selected) throw new Error('unsupported region');
        const sorted = [...data.rows].sort((a, b) => b.averageMonthlyPremium - a.averageMonthlyPremium || a.region.localeCompare(b.region, 'ko'));
        let previousValue = null;
        let previousRank = 0;
        const rows = sorted.map((row, index) => {
            const rank = row.averageMonthlyPremium === previousValue ? previousRank : index + 1;
            previousValue = row.averageMonthlyPremium;
            previousRank = rank;
            return { ...row, rank };
        });
        const selectedRow = rows.find(row => row.region === region);
        const inputPosition = premium > 0
            ? rows.filter(row => row.averageMonthlyPremium > premium).length + 1
            : null;

        return {
            monthlyPremium: premium,
            selected: selectedRow,
            rows,
            inputPosition,
            selectedDifferenceFromNational: selectedRow.averageMonthlyPremium - data.nationalAverage,
            inputDifferenceFromNational: premium > 0 ? premium - data.nationalAverage : null,
            source: data
        };
    }

    global.NicheMarketMath = Object.freeze({
        RELATED_LIMIT_RATE,
        RELATED_LIMIT_AMOUNT,
        UNRELATED_DEDUCTION,
        GIFT_DEDUCTIONS,
        GOODWILL_EXPENSE_RATE,
        OTHER_INCOME_TAX_RATE,
        OTHER_INCOME_MINIMUM,
        VAT_RATE,
        calculateFamilyPropertyTransferGift,
        calculateCommercialPremiumTax,
        calculateNationalPensionBenefitRank,
        calculateRegionalHealthInsuranceRank
    });
})(typeof window !== 'undefined' ? window : globalThis);
