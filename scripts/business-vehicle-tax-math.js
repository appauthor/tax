(function (global) {
    'use strict';

    const VAT_RATE = 0.1;
    const VEHICLE_ACQUISITION_RATES = Object.freeze({
        'non-business-passenger': 0.07,
        'light-vehicle': 0.04,
        'other-non-business': 0.05,
        'business': 0.04,
        'small-motorcycle': 0.02,
        'other-vehicle': 0.02
    });
    const MULTI_CHILD_VEHICLE_CATEGORIES = Object.freeze({
        'other-passenger': { eligible: true, cappedPassenger: true },
        'passenger-7-10': { eligible: true, cappedPassenger: false },
        'van-up-to-15': { eligible: true, cappedPassenger: false },
        'truck-up-to-1-ton': { eligible: true, cappedPassenger: false },
        'motorcycle-up-to-250cc': { eligible: true, cappedPassenger: false },
        ineligible: { eligible: false, cappedPassenger: false }
    });
    const PREPAYMENT_RULES_2026 = Object.freeze({
        none: { label: '정기분 납부', rate: 0, basis: 'annual' },
        january: { label: '1월 연납', rate: 0.05, basis: 'annual-days', days: 334, yearDays: 365 },
        march: { label: '3월 연납', rate: 0.05, basis: 'annual-days', days: 275, yearDays: 365 },
        june: { label: '6월 연납', rate: 0.05, basis: 'second-half' },
        september: { label: '9월 연납', rate: 0.05, basis: 'second-half-days', days: 92, halfYearDays: 184 }
    });

    function requireNonNegative(value, name) {
        const number = Number(value);
        if (!Number.isFinite(number) || number < 0) throw new RangeError(`${name} must be a non-negative number`);
        return number;
    }

    function applyRounding(value, rounding) {
        if (rounding === 'ceil') return Math.ceil(value);
        if (rounding === 'round') return Math.round(value);
        return Math.floor(value);
    }

    function truncateLocalTax(value) {
        return Math.floor(value / 10) * 10;
    }

    function calculateVat({ mode, amount, rounding = 'floor' }) {
        const inputAmount = requireNonNegative(amount, 'amount');
        let exactSupply;
        let exactVat;
        let exactTotal;

        if (mode === 'supply') {
            exactSupply = inputAmount;
            exactVat = inputAmount * VAT_RATE;
            exactTotal = exactSupply + exactVat;
        } else if (mode === 'vat') {
            exactVat = inputAmount;
            exactSupply = inputAmount / VAT_RATE;
            exactTotal = exactSupply + exactVat;
        } else if (mode === 'total') {
            exactTotal = inputAmount;
            exactSupply = inputAmount * 100 / 110;
            exactVat = inputAmount - exactSupply;
        } else {
            throw new RangeError('Unsupported VAT calculation mode');
        }

        let supply = applyRounding(exactSupply, rounding);
        let vat = applyRounding(exactVat, rounding);
        let total = applyRounding(exactTotal, rounding);
        if (mode === 'total') vat = total - supply;
        if (mode === 'supply') total = supply + vat;
        if (mode === 'vat') total = supply + vat;

        return { mode, inputAmount, rate: VAT_RATE, exactSupply, exactVat, exactTotal, supply, vat, total, rounding };
    }

    function calculateMultiChildVehicleReduction({
        acquisitionTax,
        under18ChildCount = 0,
        vehicleCategory = 'ineligible',
        eligibilityConfirmed = false
    }) {
        const tax = requireNonNegative(acquisitionTax, 'acquisitionTax');
        const children = Number(under18ChildCount);
        const category = MULTI_CHILD_VEHICLE_CATEGORIES[vehicleCategory];
        if (!Number.isInteger(children) || children < 0) throw new RangeError('under18ChildCount must be a non-negative integer');
        if (!category) throw new RangeError('Unsupported multi-child vehicle category');

        let reduction = 0;
        let rule = 'not-applied';
        if (eligibilityConfirmed && children >= 2 && category.eligible) {
            if (children === 2) {
                if (category.cappedPassenger && tax > 1400000) {
                    reduction = Math.min(tax, 700000);
                    rule = 'two-children-700000-cap';
                } else {
                    const payableTax = truncateLocalTax(tax * 0.5);
                    reduction = tax - payableTax;
                    rule = 'two-children-50-percent';
                }
            } else if (category.cappedPassenger) {
                reduction = Math.min(tax, 1400000);
                rule = 'three-plus-1400000-cap';
            } else if (tax <= 2000000) {
                reduction = tax;
                rule = 'three-plus-exempt';
            } else {
                const payableTax = truncateLocalTax(tax * 0.15);
                reduction = tax - payableTax;
                rule = 'three-plus-85-percent-minimum-tax';
            }
        }

        return {
            under18ChildCount: children,
            vehicleCategory,
            eligibilityConfirmed: Boolean(eligibilityConfirmed),
            eligibleVehicleCategory: category.eligible,
            rule,
            reduction,
            payableAcquisitionTax: tax - reduction
        };
    }

    function calculateVehicleAcquisition({
        purchasePrice,
        taxBase,
        vehicleType,
        registrationCosts = 0,
        otherCosts = 0,
        under18ChildCount = 0,
        multiChildVehicleCategory = 'ineligible',
        multiChildEligibilityConfirmed = false
    }) {
        const price = requireNonNegative(purchasePrice, 'purchasePrice');
        const base = requireNonNegative(taxBase, 'taxBase');
        const userRegistrationCosts = requireNonNegative(registrationCosts, 'registrationCosts');
        const userOtherCosts = requireNonNegative(otherCosts, 'otherCosts');
        const rate = VEHICLE_ACQUISITION_RATES[vehicleType];
        if (rate === undefined) throw new RangeError('Unsupported vehicle type');

        const exactAcquisitionTax = base * rate;
        const acquisitionTax = truncateLocalTax(exactAcquisitionTax);
        const multiChild = calculateMultiChildVehicleReduction({
            acquisitionTax,
            under18ChildCount,
            vehicleCategory: multiChildVehicleCategory,
            eligibilityConfirmed: multiChildEligibilityConfirmed
        });
        const payableAcquisitionTax = multiChild.payableAcquisitionTax;
        const officialTaxAndRegistration = payableAcquisitionTax;
        const userEnteredCosts = userRegistrationCosts + userOtherCosts;
        const estimatedPurchaseTotal = price + officialTaxAndRegistration + userEnteredCosts;

        return {
            purchasePrice: price,
            taxBase: base,
            vehicleType,
            rate,
            exactAcquisitionTax,
            acquisitionTax,
            multiChildReduction: multiChild.reduction,
            payableAcquisitionTax,
            multiChild,
            officialTaxAndRegistration,
            registrationCosts: userRegistrationCosts,
            otherCosts: userOtherCosts,
            userEnteredCosts,
            estimatedPurchaseTotal
        };
    }

    function getPassengerRatePerCc(usage, displacement) {
        if (usage === 'business') {
            if (displacement <= 1600) return 18;
            if (displacement <= 2500) return 19;
            return 24;
        }
        if (usage === 'non-business') {
            if (displacement <= 1000) return 80;
            if (displacement <= 1600) return 140;
            return 200;
        }
        throw new RangeError('Unsupported vehicle usage');
    }

    function calculateVehicleAge(taxYear, baseYear, baseHalf, period) {
        const year = Number(taxYear);
        const startingYear = Number(baseYear);
        if (!Number.isInteger(year) || !Number.isInteger(startingYear) || startingYear > year) {
            throw new RangeError('Invalid vehicle age base year');
        }
        if (baseHalf === 'first') return year - startingYear + 1;
        if (baseHalf === 'second') return period === 'first' ? year - startingYear : year - startingYear + 1;
        throw new RangeError('Unsupported vehicle age base half');
    }

    function getAgeReductionRate(age) {
        if (age < 3) return 0;
        return Math.min(0.5, (Math.min(age, 12) - 2) * 0.05);
    }

    function calculatePrepaymentDiscount(firstHalfTax, secondHalfTax, timing, rules = PREPAYMENT_RULES_2026) {
        const rule = rules[timing];
        if (!rule) throw new RangeError('Unsupported prepayment timing');
        const annualTax = firstHalfTax + secondHalfTax;
        if (rule.basis === 'annual-days') return annualTax * rule.days / rule.yearDays * rule.rate;
        if (rule.basis === 'second-half') return secondHalfTax * rule.rate;
        if (rule.basis === 'second-half-days') return secondHalfTax * rule.days / rule.halfYearDays * rule.rate;
        return 0;
    }

    function calculateVehicleAnnualTax({
        taxYear = 2026,
        vehicleKind = 'engine',
        usage = 'non-business',
        displacement = 0,
        baseYear = taxYear,
        baseHalf = 'first',
        prepaymentTiming = 'none'
    }) {
        if (Number(taxYear) !== 2026) throw new RangeError('Only the verified 2026 rules are supported');
        let firstHalfBeforeReduction;
        let secondHalfBeforeReduction;
        let perCc = null;

        if (vehicleKind === 'other') {
            const annualFlatTax = usage === 'business' ? 20000 : 100000;
            firstHalfBeforeReduction = annualFlatTax / 2;
            secondHalfBeforeReduction = annualFlatTax / 2;
        } else if (vehicleKind === 'engine') {
            const cc = requireNonNegative(displacement, 'displacement');
            if (cc <= 0) throw new RangeError('displacement must be greater than zero');
            perCc = getPassengerRatePerCc(usage, cc);
            firstHalfBeforeReduction = cc * perCc / 2;
            secondHalfBeforeReduction = cc * perCc / 2;
        } else {
            throw new RangeError('Unsupported vehicle kind');
        }

        const firstHalfAge = calculateVehicleAge(taxYear, baseYear, baseHalf, 'first');
        const secondHalfAge = calculateVehicleAge(taxYear, baseYear, baseHalf, 'second');
        const ageReductionApplies = usage === 'non-business' && vehicleKind === 'engine';
        const firstHalfReductionRate = ageReductionApplies ? getAgeReductionRate(firstHalfAge) : 0;
        const secondHalfReductionRate = ageReductionApplies ? getAgeReductionRate(secondHalfAge) : 0;
        const firstHalfTax = firstHalfBeforeReduction * (1 - firstHalfReductionRate);
        const secondHalfTax = secondHalfBeforeReduction * (1 - secondHalfReductionRate);
        const assessedFirstHalfTax = truncateLocalTax(firstHalfTax);
        const assessedSecondHalfTax = truncateLocalTax(secondHalfTax);
        const annualVehicleTax = assessedFirstHalfTax + assessedSecondHalfTax;
        const prepaymentDiscount = truncateLocalTax(calculatePrepaymentDiscount(assessedFirstHalfTax, assessedSecondHalfTax, prepaymentTiming));
        const vehicleTaxAfterDiscount = annualVehicleTax - prepaymentDiscount;
        const educationTaxRate = usage === 'non-business' ? 0.3 : 0;
        const localEducationTax = truncateLocalTax(vehicleTaxAfterDiscount * educationTaxRate);
        const totalTax = vehicleTaxAfterDiscount + localEducationTax;

        return {
            taxYear: Number(taxYear), vehicleKind, usage, displacement: Number(displacement), perCc,
            baseYear: Number(baseYear), baseHalf, firstHalfAge, secondHalfAge,
            firstHalfReductionRate, secondHalfReductionRate,
            firstHalfTax: assessedFirstHalfTax, secondHalfTax: assessedSecondHalfTax,
            annualVehicleTax,
            prepaymentTiming, prepaymentDiscount,
            vehicleTaxAfterDiscount,
            educationTaxRate, localEducationTax,
            totalTax
        };
    }

    global.BusinessVehicleTaxMath = Object.freeze({
        VAT_RATE,
        VEHICLE_ACQUISITION_RATES,
        MULTI_CHILD_VEHICLE_CATEGORIES,
        PREPAYMENT_RULES_2026,
        applyRounding,
        truncateLocalTax,
        calculateVat,
        calculateMultiChildVehicleReduction,
        calculateVehicleAcquisition,
        getPassengerRatePerCc,
        calculateVehicleAge,
        getAgeReductionRate,
        calculatePrepaymentDiscount,
        calculateVehicleAnnualTax
    });
})(typeof window !== 'undefined' ? window : globalThis);
