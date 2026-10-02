(function (global) {
    'use strict';

    // 2025년 귀속·2026년 신청. 시행령 별표 11의2의 50만원 소득 구간과 천원 단위 표 금액.
    const RULES = Object.freeze({ incomeLimit: 70000000, assetLimit: 240000000,
        assetReductionFrom: 170000000, spouseEarningsMinimum: 3000000,
        oneMinimumPay: 40000, dualMinimumPay: 6000000, bracketSize: 500000,
        maximumPerChild: 1000000, lateRate: .95 });

    function amount(value, label) {
        const number = Number(value);
        if (!Number.isSafeInteger(number) || number < 0 || number > 1000000000000) throw new RangeError(`${label}은 0원 이상 1조 원 이하의 정수로 입력하세요.`);
        return number;
    }

    function calculate(input) {
        if (!['regular', 'late'].includes(input.application)) throw new RangeError('신청 구분을 선택하세요.');
        const ownPay = amount(input.ownPay, '본인 총급여액 등');
        const spousePay = input.hasSpouse ? amount(input.spousePay, '배우자 총급여액 등') : 0;
        const otherIncome = amount(input.otherIncome, '추가 총소득');
        const assets = amount(input.assets, '가구원 재산 합계');
        const childTaxCredit = amount(input.childTaxCredit, '이미 적용받은 자녀세액공제');
        const children = Number(input.children);
        if (!Number.isSafeInteger(children) || children < 0 || children > Number.MAX_SAFE_INTEGER / RULES.maximumPerChild) throw new RangeError('요건을 충족하는 자녀 수는 0명 이상의 정수로 입력하세요.');
        const family = input.hasSpouse && ownPay >= RULES.spouseEarningsMinimum && spousePay >= RULES.spouseEarningsMinimum ? 'dual' : 'one';
        const totalPay = ownPay + spousePay;
        const totalIncome = totalPay + otherIncome;
        const reasons = [];
        if (children === 0) reasons.push('요건을 충족하는 부양자녀 없음');
        if (totalPay < (family === 'dual' ? RULES.dualMinimumPay : RULES.oneMinimumPay)) reasons.push('산정표 최저 총급여액 등 미만');
        if (totalIncome >= RULES.incomeLimit) reasons.push('부부합산 총소득 7천만원 이상');
        if (assets >= RULES.assetLimit) reasons.push('가구원 재산 2억 4천만원 이상');
        if (input.otherEligible !== true) reasons.push('기타 신청요건 미확인');
        const eligible = reasons.length === 0;
        const plateau = family === 'dual' ? 25000000 : 21000000;
        const span = RULES.incomeLimit - plateau;
        const bracketLower = totalPay < plateau ? null : plateau + Math.floor((totalPay - plateau) / RULES.bracketSize) * RULES.bracketSize;
        const bracketUpper = bracketLower === null ? null : Math.min(RULES.incomeLimit, bracketLower + RULES.bracketSize);
        // 표의 금액은 구간 하한의 법정 산식을 1천원 단위로 올린 값이다.
        const perChild = !eligible ? 0 : bracketLower === null ? RULES.maximumPerChild
            : Math.ceil((RULES.maximumPerChild - (bracketLower - plateau) * 500000 / span) / 1000) * 1000;
        const tableAmount = perChild * children;
        const assetReduction = assets >= RULES.assetReductionFrom ? tableAmount / 2 : 0;
        const afterAssets = tableAmount - assetReduction;
        const lateReduction = input.application === 'late' ? afterAssets * (1 - RULES.lateRate) : 0;
        const beforeTaxCredit = afterAssets - lateReduction;
        const taxCreditReduction = Math.min(beforeTaxCredit, childTaxCredit);
        const afterReductions = Math.max(0, beforeTaxCredit - taxCreditReduction);
        const decision = afterReductions > 0 && afterReductions < 30000 ? 30000 : afterReductions;
        return { family, children, totalPay, totalIncome, assets, eligible, reasons, bracketLower, bracketUpper,
            perChild, tableAmount, assetReduction, lateReduction, taxCreditReduction, afterReductions,
            minimumAdjustment: decision - afterReductions, decision };
    }

    global.ChildTaxCreditMath = Object.freeze({ RULES, calculate });
})(typeof window !== 'undefined' ? window : globalThis);
