(function (global) {
    'use strict';
    const RULES = Object.freeze({ reviewedAt: '2026-11-13', income: 20000000, businessException: 5000000, propertyLow: 540000000, propertyHigh: 900000000, propertyIncome: 10000000 });
    function amount(value, label) {
        if ((typeof value !== 'number' && typeof value !== 'string') || String(value).trim() === '') throw new RangeError(`${label}: 확인한 금액을 입력하세요.`);
        const n = Number(value);
        if (!Number.isSafeInteger(n) || n < 0 || n > 1e12) throw new RangeError(`${label}: 0 이상 1조원 이하의 원 단위 정수로 입력하세요.`);
        return n;
    }
    function choice(value, values) {
        if (!values.includes(value)) throw new RangeError('선택 항목을 확인하세요.');
        return value;
    }
    function businessCheck(business, kind, exemption, label, failures, pending) {
        choice(kind, ['none', 'registered', 'unregistered', 'rental', 'unknown']);
        choice(exemption, ['yes', 'no', 'unknown']);
        if (kind === 'none' && business > 0) throw new RangeError(`${label}: 사업소득이 없다는 선택과 입력 금액이 다릅니다.`);
        if (kind === 'unknown') pending.push(`${label} 사업자등록·주택임대 여부 확인 필요`);
        if (business === 0) return;
        if (kind === 'unregistered' || exemption === 'yes') {
            if (business > RULES.businessException) failures.push(`${label} 사업소득 예외 한도 500만원 초과`);
        } else if (['registered', 'rental'].includes(kind)) {
            if (exemption === 'unknown') pending.push(`${label} 등록 장애인·상이등급 예외 여부 확인 필요`);
            else failures.push(`${label} 등록사업·주택임대 소득 있음`);
        }
    }
    function calculate(input) {
        const failures = [], pending = [], incomes = {};
        for (const key of ['pension', 'financial', 'salary', 'business', 'other']) incomes[key] = amount(input[key], '부모님 연간 소득');
        const total = Object.values(incomes).reduce((a, b) => a + b, 0);
        const property = amount(input.property, '재산세 과세표준');
        const confirmed = choice(input.confirmed, ['yes', 'unknown']);
        if (confirmed === 'unknown') pending.push('공단에 적용되는 소득·재산 금액과 반영 시점 확인 필요');
        if (total > RULES.income) failures.push('부모님 소득 합계 연 2,000만원 초과');
        businessCheck(incomes.business, input.businessKind, input.exemption, '부모님', failures, pending);
        if (property > RULES.propertyHigh) failures.push('부모님 재산세 과세표준 9억원 초과');
        else if (property > RULES.propertyLow && total > RULES.propertyIncome) failures.push('재산 과표 5.4억원 초과~9억원 이하 구간의 소득 1,000만원 기준 초과');
        const support = choice(input.support, ['yes', 'no', 'unknown']);
        if (support === 'no') failures.push('부모님·배우자 부모님 관계 및 부양·가입 요건 미충족');
        if (support === 'unknown') pending.push('별표 1의 가족관계·동거/별거 부양요건 및 가입 상태 확인 필요');
        const married = choice(input.married, ['yes', 'no', 'unknown']);
        let spouseIncome = null;
        if (married === 'unknown') pending.push('혼인 및 배우자 소득요건 확인 필요');
        if (married === 'yes') {
            spouseIncome = amount(input.spouseIncome, '배우자 합산소득');
            const spouseBusiness = amount(input.spouseBusiness, '배우자 사업소득');
            if (spouseBusiness > spouseIncome) throw new RangeError('배우자 합산소득에는 배우자 사업소득도 포함해야 합니다.');
            if (spouseIncome > RULES.income) failures.push('부모님의 배우자 소득 합계 연 2,000만원 초과');
            businessCheck(spouseBusiness, input.spouseBusinessKind, input.spouseExemption, '부모님의 배우자', failures, pending);
        }
        if (input.specialCase === true) pending.push('소득 조정·폐업·재건축·해외·사적연금 등 개별 확인 사례');
        // Unconfirmed administrative amounts may differ from entered estimates: never issue a definitive rejection on those figures.
        const status = input.specialCase === true || confirmed === 'unknown' ? 'review' : failures.length ? 'ineligible' : pending.length ? 'review' : 'eligible';
        const incomeLimit = property > RULES.propertyHigh ? null : property > RULES.propertyLow ? RULES.propertyIncome : RULES.income;
        return { status, failures, pending, incomes, total, property, spouseIncome, incomeLimit, incomeRoom: incomeLimit === null ? null : Math.max(0, incomeLimit - total) };
    }
    global.HealthDependentMath = Object.freeze({ RULES, calculate });
})(typeof window !== 'undefined' ? window : globalThis);
