(function (global) {
    'use strict';
    const RULES = Object.freeze({ rate2026: 0.095, rate2027: 0.10, minimumBase: 410000, maximumBase: 6590000, voluntaryBaseCap2026: 3193511, maximumMonths: 119 });
    function amount(value, label, min = 0, max = 1000000000, integer = true) {
        const n = Number(value);
        if (value === '' || value === null || value === undefined || !Number.isFinite(n) || n < min || n > max || (integer && !Number.isSafeInteger(n))) throw new RangeError(`${label}: ${min.toLocaleString('ko-KR')}~${max.toLocaleString('ko-KR')} 범위로 입력하세요.`);
        return n;
    }
    function calculate(input) {
        if (!['estimate', 'quote'].includes(input.mode)) throw new RangeError('보험료 계산 방식을 선택하세요.');
        let principal, monthly = null, rate = null, base = null, months = null;
        if (input.mode === 'estimate') {
            if (!['standard', 'voluntary'].includes(input.membership)) throw new RangeError('가입 유형을 선택하세요.');
            if (!['2026', '2027'].includes(String(input.deadlineYear))) throw new RangeError('납부기한 연도를 선택하세요.');
            const enteredBase = amount(input.base, '신청월 기준소득월액', RULES.minimumBase, RULES.maximumBase);
            if (input.membership === 'standard' && enteredBase % 1000 !== 0) throw new RangeError('기준소득월액은 공단에서 결정한 천원 단위 금액을 입력하세요. 실제 고지액은 고지 총액 방식으로 입력할 수 있습니다.');
            base = input.membership === 'voluntary' ? Math.min(enteredBase, RULES.voluntaryBaseCap2026) : enteredBase;
            months = amount(input.months, '공단에서 확인한 추납 개월 수', 1, RULES.maximumMonths);
            rate = String(input.deadlineYear) === '2026' ? RULES.rate2026 : RULES.rate2027;
            monthly = base * rate;
            principal = monthly * months;
        } else principal = amount(input.quotedCost, '공단 고지 추납 총액', 1);
        let recovery = null;
        if (input.useRecovery) {
            const before = amount(input.beforePension, '추납 전 예상 월 연금액');
            const after = amount(input.afterPension, '추납 후 예상 월 연금액');
            if (after < before) throw new RangeError('추납 후 예상 월 연금액은 추납 전 금액 이상이어야 합니다. 동일한 수령 개시 조건인지 확인하세요.');
            const startAge = amount(input.startAge, '연금 수령 시작 나이', 60, 70);
            const extraCost = amount(input.extraCost, '별도로 더할 분할납부 이자');
            const cost = principal + extraCost, increase = after - before;
            const recoveryMonths = increase > 0 ? Math.ceil(cost / increase) : null;
            recovery = { before, after, startAge, extraCost, cost, increase, recoveryMonths, ageMonths: recoveryMonths === null ? null : startAge * 12 + recoveryMonths };
        }
        return { principal, monthly, rate, base, months, recovery, mode: input.mode };
    }
    global.PensionBuybackMath = Object.freeze({ RULES, calculate });
})(typeof window !== 'undefined' ? window : globalThis);
