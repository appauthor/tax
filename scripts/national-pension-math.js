(function (global) {
    'use strict';
    const RULES = Object.freeze({ maxShiftMonths: 60, earlyMonthlyReduction: 0.005, deferredMonthlyIncrease: 0.006, minInsuredMonths: 120 });
    function integer(value, min, max, name) {
        if (value === '' || value === null || value === undefined || !Number.isInteger(Number(value)) || value < min || value > max) throw new RangeError(`${name}: ${min}~${max} 범위의 정수를 입력하세요.`);
        return Number(value);
    }
    function normalAge(year) {
        const y = integer(year, 1900, 2026, '출생연도');
        return y <= 1952 ? 60 : y <= 1956 ? 61 : y <= 1960 ? 62 : y <= 1964 ? 63 : y <= 1968 ? 64 : 65;
    }
    function calculate(input) {
        const age = normalAge(input.birthYear);
        const insuredMonths = integer(input.insuredMonths, 0, 720, '가입 인정 개월');
        const earlyMonths = integer(input.earlyMonths, 1, RULES.maxShiftMonths, '조기 개월');
        const deferredMonths = integer(input.deferredMonths, 1, RULES.maxShiftMonths, '연기 개월');
        const endAge = integer(input.endAge, age, 120, '누적 비교 나이');
        const monthly = Number(input.monthly);
        if (input.monthly === '' || !Number.isFinite(monthly) || monthly <= 0 || monthly > 100000000) throw new RangeError('정상 수령 시 세전 월 연금액을 입력하세요.');
        if (insuredMonths < RULES.minInsuredMonths) throw new RangeError('노령연금은 가입 인정기간 120개월 이상이 필요합니다. 반환일시금은 지원하지 않습니다.');
        const earlyEligible = input.noIncome === true;
        const earlyAmount = monthly * (1 - earlyMonths * RULES.earlyMonthlyReduction);
        const deferredAmount = monthly * (1 + deferredMonths * RULES.deferredMonthlyIncrease);
        const start = age * 12;
        // Compare complete monthly periods beginning at each modeled claim age.
        const total = (endMonths, startMonths, payment) => Math.max(0, endMonths - startMonths) * payment;
        const earlyBreakEvenMonths = start + Math.ceil(earlyMonths * earlyAmount / (monthly - earlyAmount) - 1e-9);
        const deferredBreakEvenMonths = start + deferredMonths + Math.ceil(deferredMonths * monthly / (deferredAmount - monthly) - 1e-9);
        const timeline = [];
        for (let y = age; y <= endAge; y++) timeline.push({ age: y, early: earlyEligible ? total(y * 12, start - earlyMonths, earlyAmount) : null, normal: total(y * 12, start, monthly), deferred: total(y * 12, start + deferredMonths, deferredAmount) });
        return { normalAge: age, earlyMonths, deferredMonths, endAge, monthly, earlyEligible, earlyAmount, deferredAmount, earlyStartMonths: start - earlyMonths, deferredStartMonths: start + deferredMonths, earlyBreakEvenMonths: earlyEligible ? earlyBreakEvenMonths : null, deferredBreakEvenMonths, timeline, totals: timeline[timeline.length - 1] };
    }
    global.NationalPensionMath = Object.freeze({ RULES, normalAge, calculate });
})(typeof window !== 'undefined' ? window : globalThis);
