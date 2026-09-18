(function (global) {
    'use strict';

    const INDUSTRY_GROUPS = Object.freeze({
        group1: Object.freeze({
            label: '농림어업·광업·도소매업·부동산매매업·그 밖의 업종',
            sincereThreshold: 1500000000,
            simpleExpenseThreshold: 60000000,
            bookkeepingThreshold: 300000000
        }),
        group2: Object.freeze({
            label: '제조업·숙박음식점업·건설업·운수업·정보통신업 등',
            sincereThreshold: 750000000,
            simpleExpenseThreshold: 36000000,
            bookkeepingThreshold: 150000000
        }),
        group3: Object.freeze({
            label: '부동산임대업·전문서비스업·교육·보건·개인서비스업 등',
            sincereThreshold: 500000000,
            simpleExpenseThreshold: 24000000,
            bookkeepingThreshold: 75000000
        })
    });

    const DEEMED_CREDIT_TYPES = Object.freeze({
        restaurantIndividual: Object.freeze({ label: '일반 음식점 · 개인사업자', numerator: 8, denominator: 108, entity: 'individual', limitGroup: 'restaurant', temporaryRate: true }),
        restaurantCorporate: Object.freeze({ label: '일반 음식점 · 법인사업자', numerator: 6, denominator: 106, entity: 'corporate', limitGroup: 'restaurant' }),
        entertainmentIndividual: Object.freeze({ label: '과세유흥장소 · 개인사업자', numerator: 2, denominator: 102, entity: 'individual', limitGroup: 'restaurant' }),
        entertainmentCorporate: Object.freeze({ label: '과세유흥장소 · 법인사업자', numerator: 2, denominator: 102, entity: 'corporate', limitGroup: 'restaurant' }),
        specialManufacturingIndividual: Object.freeze({ label: '과자점·도정·제분·떡방앗간 · 개인', numerator: 6, denominator: 106, entity: 'individual', limitGroup: 'other' }),
        eligibleManufacturingIndividual: Object.freeze({ label: '그 밖의 제조업 · 개인사업자', numerator: 4, denominator: 104, entity: 'individual', limitGroup: 'other' }),
        eligibleManufacturingCorporate: Object.freeze({ label: '그 밖의 제조업 · 중소기업 법인', numerator: 4, denominator: 104, entity: 'corporate', limitGroup: 'other' }),
        otherManufacturingCorporate: Object.freeze({ label: '그 밖의 제조업 · 비중소 법인', numerator: 2, denominator: 102, entity: 'corporate', limitGroup: 'other' }),
        otherIndividual: Object.freeze({ label: '음식점·제조업 외 대상 업종 · 개인', numerator: 2, denominator: 102, entity: 'individual', limitGroup: 'other' }),
        otherCorporate: Object.freeze({ label: '음식점·제조업 외 대상 업종 · 법인', numerator: 2, denominator: 102, entity: 'corporate', limitGroup: 'other' })
    });

    function requireNonNegative(value, name) {
        const number = Number(value);
        if (!Number.isFinite(number) || number < 0) throw new Error(`${name} must be non-negative`);
        return number;
    }

    function requireIndustryGroup(group) {
        const rule = INDUSTRY_GROUPS[group];
        if (!rule) throw new Error('unsupported industry group');
        return rule;
    }

    function determineSincereFilingEligibility({ industryGroup, revenue }) {
        const rule = requireIndustryGroup(industryGroup);
        const currentRevenue = requireNonNegative(revenue, 'revenue');
        const eligible = currentRevenue >= rule.sincereThreshold;
        return {
            industryGroup,
            industryLabel: rule.label,
            revenue: currentRevenue,
            threshold: rule.sincereThreshold,
            eligible,
            difference: Math.abs(currentRevenue - rule.sincereThreshold)
        };
    }

    function determineExpenseRate({ industryGroup, isNewBusiness, priorRevenue = 0, currentRevenue, isProfessional = false }) {
        const rule = requireIndustryGroup(industryGroup);
        const prior = requireNonNegative(priorRevenue, 'prior revenue');
        const current = requireNonNegative(currentRevenue, 'current revenue');
        const newBusiness = Boolean(isNewBusiness);
        const professional = Boolean(isProfessional);
        let rateType = 'simple';
        let reason = newBusiness ? '신규사업자이며 해당 과세기간 수입금액이 복식부기의무 기준 미만입니다.' : '직전 과세기간 수입금액과 해당 과세기간 수입금액이 모두 기준 미만입니다.';

        if (professional) {
            rateType = 'standard';
            reason = '전문직사업자는 수입금액과 관계없이 단순경비율 적용에서 제외됩니다.';
        } else if (current >= rule.bookkeepingThreshold) {
            rateType = 'standard';
            reason = '해당 과세기간 수입금액이 업종별 복식부기의무 기준 이상입니다.';
        } else if (!newBusiness && prior >= rule.simpleExpenseThreshold) {
            rateType = 'standard';
            reason = '직전 과세기간 수입금액이 업종별 단순경비율 기준 이상입니다.';
        }

        return {
            industryGroup,
            industryLabel: rule.label,
            isNewBusiness: newBusiness,
            isProfessional: professional,
            priorRevenue: prior,
            currentRevenue: current,
            simpleExpenseThreshold: rule.simpleExpenseThreshold,
            bookkeepingThreshold: rule.bookkeepingThreshold,
            rateType,
            reason
        };
    }

    function getLimitRate(type, taxableBase) {
        if (type.entity === 'corporate') return 0.5;
        if (type.limitGroup === 'restaurant') {
            if (taxableBase <= 100000000) return 0.75;
            if (taxableBase <= 200000000) return 0.7;
            return 0.6;
        }
        return taxableBase <= 200000000 ? 0.65 : 0.55;
    }

    function calculateDeemedInputTaxCredit({ creditType, taxableBase, exemptPurchaseAmount }) {
        const baseType = DEEMED_CREDIT_TYPES[creditType];
        if (!baseType) throw new Error('unsupported deemed credit type');
        const salesBase = requireNonNegative(taxableBase, 'taxable base');
        const purchases = requireNonNegative(exemptPurchaseAmount, 'purchase amount');
        const type = { ...baseType };
        if (creditType === 'restaurantIndividual' && salesBase <= 200000000) {
            type.numerator = 9;
            type.denominator = 109;
        }
        const rate = type.numerator / type.denominator;
        const limitRate = getLimitRate(type, salesBase);
        const purchaseLimit = salesBase * limitRate;
        const recognizedPurchaseAmount = Math.min(purchases, purchaseLimit);
        const uncappedCredit = purchases * rate;
        const creditLimit = purchaseLimit * rate;
        const credit = recognizedPurchaseAmount * rate;
        return {
            creditType,
            typeLabel: type.label,
            taxableBase: salesBase,
            exemptPurchaseAmount: purchases,
            numerator: type.numerator,
            denominator: type.denominator,
            rate,
            limitRate,
            purchaseLimit,
            recognizedPurchaseAmount,
            uncappedCredit,
            creditLimit,
            credit,
            limited: purchases > purchaseLimit
        };
    }

    global.BusinessComplianceMath = Object.freeze({
        INDUSTRY_GROUPS,
        DEEMED_CREDIT_TYPES,
        determineSincereFilingEligibility,
        determineExpenseRate,
        calculateDeemedInputTaxCredit
    });
})(typeof window !== 'undefined' ? window : globalThis);
