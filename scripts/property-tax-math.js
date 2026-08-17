(function (global) {
    "use strict";

    const WON = 1;

    function toNonNegativeNumber(value, name) {
        const number = Number(value);
        if (!Number.isFinite(number) || number < 0) {
            throw new RangeError(`${name} must be a non-negative number`);
        }
        return number;
    }

    function floorWon(value) {
        return Math.floor(value / WON) * WON;
    }

    function progressiveTax(base, brackets) {
        const selected = brackets.find((bracket) => base <= bracket.limit) || brackets[brackets.length - 1];
        return Math.max(0, floorWon(base * selected.rate - selected.deduction));
    }

    const STANDARD_PROPERTY_RATES = [
        { limit: 60000000, rate: 0.001, deduction: 0 },
        { limit: 150000000, rate: 0.0015, deduction: 30000 },
        { limit: 300000000, rate: 0.0025, deduction: 180000 },
        { limit: Infinity, rate: 0.004, deduction: 630000 }
    ];

    const ONE_HOME_PROPERTY_RATES = [
        { limit: 60000000, rate: 0.0005, deduction: 0 },
        { limit: 150000000, rate: 0.001, deduction: 30000 },
        { limit: 300000000, rate: 0.002, deduction: 180000 },
        { limit: Infinity, rate: 0.0035, deduction: 630000 }
    ];

    const COMPREHENSIVE_RATES = {
        upToTwo: [
            { limit: 300000000, rate: 0.005, deduction: 0 },
            { limit: 600000000, rate: 0.007, deduction: 600000 },
            { limit: 1200000000, rate: 0.01, deduction: 2400000 },
            { limit: 2500000000, rate: 0.013, deduction: 6000000 },
            { limit: 5000000000, rate: 0.015, deduction: 11000000 },
            { limit: 9400000000, rate: 0.02, deduction: 36000000 },
            { limit: Infinity, rate: 0.027, deduction: 101800000 }
        ],
        threeOrMore: [
            { limit: 300000000, rate: 0.005, deduction: 0 },
            { limit: 600000000, rate: 0.007, deduction: 600000 },
            { limit: 1200000000, rate: 0.01, deduction: 2400000 },
            { limit: 2500000000, rate: 0.02, deduction: 14400000 },
            { limit: 5000000000, rate: 0.03, deduction: 39400000 },
            { limit: 9400000000, rate: 0.04, deduction: 89400000 },
            { limit: Infinity, rate: 0.05, deduction: 183400000 }
        ]
    };

    function getPropertyFairMarketRatio(publicPrice, oneHouseholdOneHome) {
        if (!oneHouseholdOneHome) return 0.6;
        if (publicPrice <= 300000000) return 0.43;
        if (publicPrice <= 600000000) return 0.44;
        return 0.45;
    }

    function calculateStandardPropertyTaxFromPrice(publicPrice) {
        const base = publicPrice * 0.6;
        return progressiveTax(base, STANDARD_PROPERTY_RATES);
    }

    function calculateApartmentPropertyTax(input) {
        const publicPrice = toNonNegativeNumber(input.publicPrice, "publicPrice");
        const oneHouseholdOneHome = Boolean(input.oneHouseholdOneHome);
        const urbanArea = input.urbanArea !== false;
        const previousTaxBase = input.previousTaxBase === "" || input.previousTaxBase == null
            ? null
            : toNonNegativeNumber(input.previousTaxBase, "previousTaxBase");
        const fairMarketRatio = getPropertyFairMarketRatio(publicPrice, oneHouseholdOneHome);
        const calculatedTaxBase = floorWon(publicPrice * fairMarketRatio);
        const taxBaseLimit = previousTaxBase == null
            ? null
            : floorWon(previousTaxBase + calculatedTaxBase * 0.05);
        const taxBase = taxBaseLimit == null ? calculatedTaxBase : Math.min(calculatedTaxBase, taxBaseLimit);
        const specialRateApplied = oneHouseholdOneHome && publicPrice <= 900000000;
        const propertyTax = progressiveTax(taxBase, specialRateApplied ? ONE_HOME_PROPERTY_RATES : STANDARD_PROPERTY_RATES);
        const localEducationTax = floorWon(propertyTax * 0.2);
        const urbanAreaTax = urbanArea ? floorWon(taxBase * 0.0014) : 0;

        return {
            publicPrice,
            fairMarketRatio,
            calculatedTaxBase,
            taxBaseLimit,
            taxBase,
            taxBaseLimitApplied: taxBaseLimit != null && taxBaseLimit < calculatedTaxBase,
            specialRateApplied,
            propertyTax,
            localEducationTax,
            urbanAreaTax,
            total: propertyTax + localEducationTax + urbanAreaTax
        };
    }

    function ageCreditRate(age) {
        if (age >= 70) return 0.4;
        if (age >= 65) return 0.3;
        if (age >= 60) return 0.2;
        return 0;
    }

    function holdingCreditRate(years) {
        if (years >= 15) return 0.5;
        if (years >= 10) return 0.4;
        if (years >= 5) return 0.2;
        return 0;
    }

    function calculateComprehensiveHousingTax(input) {
        const publicPrice = toNonNegativeNumber(input.publicPrice, "publicPrice");
        const homeCount = Math.max(1, Math.floor(toNonNegativeNumber(input.homeCount || 1, "homeCount")));
        const oneHouseholdOneHome = Boolean(input.oneHouseholdOneHome);
        const currentPropertyTax = toNonNegativeNumber(input.currentPropertyTax || 0, "currentPropertyTax");
        const age = toNonNegativeNumber(input.age || 0, "age");
        const holdingYears = toNonNegativeNumber(input.holdingYears || 0, "holdingYears");
        const deduction = oneHouseholdOneHome ? 1200000000 : 900000000;
        const fairMarketRatio = 0.6;
        const taxBase = floorWon(Math.max(0, publicPrice - deduction) * fairMarketRatio);
        const rateGroup = homeCount >= 3 ? "threeOrMore" : "upToTwo";
        const taxBeforePropertyCredit = progressiveTax(taxBase, COMPREHENSIVE_RATES[rateGroup]);

        const propertyTaxOnTaxBase = floorWon(taxBase * 0.6 * 0.004);
        const totalStandardPropertyTax = calculateStandardPropertyTaxFromPrice(publicPrice);
        const confirmedPropertyTaxCredit = input.confirmedPropertyTaxCredit === "" || input.confirmedPropertyTaxCredit == null
            ? null
            : toNonNegativeNumber(input.confirmedPropertyTaxCredit, "confirmedPropertyTaxCredit");
        const estimatedPropertyTaxCredit = totalStandardPropertyTax > 0
            ? floorWon(currentPropertyTax * propertyTaxOnTaxBase / totalStandardPropertyTax)
            : 0;
        const propertyTaxCredit = Math.min(
            taxBeforePropertyCredit,
            confirmedPropertyTaxCredit == null ? estimatedPropertyTaxCredit : confirmedPropertyTaxCredit
        );
        const taxAfterPropertyCredit = Math.max(0, taxBeforePropertyCredit - propertyTaxCredit);
        const combinedCreditRate = oneHouseholdOneHome
            ? Math.min(0.8, ageCreditRate(age) + holdingCreditRate(holdingYears))
            : 0;
        const oneHomeCredit = floorWon(taxAfterPropertyCredit * combinedCreditRate);
        const taxBeforeBurdenCap = Math.max(0, taxAfterPropertyCredit - oneHomeCredit);

        const previousPropertyTax = input.previousPropertyTax === "" || input.previousPropertyTax == null
            ? null
            : toNonNegativeNumber(input.previousPropertyTax, "previousPropertyTax");
        const previousComprehensiveTax = input.previousComprehensiveTax === "" || input.previousComprehensiveTax == null
            ? null
            : toNonNegativeNumber(input.previousComprehensiveTax, "previousComprehensiveTax");
        const burdenCapAvailable = previousPropertyTax != null && previousComprehensiveTax != null;
        const burdenCap = burdenCapAvailable ? floorWon((previousPropertyTax + previousComprehensiveTax) * 1.5) : null;
        const burdenCapCredit = burdenCapAvailable
            ? Math.min(taxBeforeBurdenCap, Math.max(0, currentPropertyTax + taxBeforeBurdenCap - burdenCap))
            : 0;
        const comprehensiveTax = Math.max(0, taxBeforeBurdenCap - burdenCapCredit);
        const ruralSpecialTax = floorWon(comprehensiveTax * 0.2);

        return {
            publicPrice,
            homeCount,
            deduction,
            fairMarketRatio,
            taxBase,
            rateGroup,
            taxBeforePropertyCredit,
            propertyTaxOnTaxBase,
            totalStandardPropertyTax,
            propertyTaxCreditConfirmed: confirmedPropertyTaxCredit != null,
            propertyTaxCredit,
            taxAfterPropertyCredit,
            ageCreditRate: oneHouseholdOneHome ? ageCreditRate(age) : 0,
            holdingCreditRate: oneHouseholdOneHome ? holdingCreditRate(holdingYears) : 0,
            combinedCreditRate,
            oneHomeCredit,
            taxBeforeBurdenCap,
            burdenCapAvailable,
            burdenCap,
            burdenCapCredit,
            comprehensiveTax,
            ruralSpecialTax,
            total: comprehensiveTax + ruralSpecialTax
        };
    }

    global.PropertyTaxMath = {
        calculateApartmentPropertyTax,
        calculateComprehensiveHousingTax,
        calculateStandardPropertyTaxFromPrice
    };
})(typeof window !== "undefined" ? window : globalThis);
