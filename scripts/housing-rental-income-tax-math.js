(function (global) {
    'use strict';

    const RULES = Object.freeze({ incomeYear: 2025, filingYear: 2026, separateLimit: 20000000,
        otherIncomeDeductionLimit: 20000000, registeredExpenseRate: 0.60,
        unregisteredExpenseRate: 0.50, registeredDeduction: 4000000,
        unregisteredDeduction: 2000000, nationalSeparateRate: 0.14, localSeparateRate: 0.014 });

    function money(value, name) {
        const number = Number(value);
        if (!Number.isFinite(number) || number < 0 || number > 1e12) throw new RangeError(`${name}은 0원 이상 1조 원 이하로 입력하세요.`);
        return number;
    }

    function calculate(input) {
        const monthlyRent = money(input.monthlyRent, '월세 수입');
        const deemedRent = money(input.deemedRent, '간주임대료');
        const actualExpenses = money(input.actualExpenses, '장부상 필요경비');
        const otherIncomeAmount = money(input.otherIncomeAmount, '다른 종합소득금액');
        const otherTaxBase = money(input.otherTaxBase, '다른 소득의 과세표준');
        if (!['registered', 'unregistered'].includes(input.registration)) throw new RangeError('등록 요건을 선택하세요.');
        if (otherTaxBase > otherIncomeAmount) throw new RangeError('다른 소득의 과세표준은 해당 소득금액을 넘을 수 없습니다.');
        const gross = monthlyRent + deemedRent;
        if (gross <= 0) throw new RangeError('과세 대상 월세 또는 간주임대료를 입력하세요.');
        if (actualExpenses > gross) throw new RangeError('이 계산기는 필요경비가 임대수입을 넘는 결손 사례를 지원하지 않습니다.');
        const registered = input.registration === 'registered';
        const eligibleSeparate = gross <= RULES.separateLimit;
        const rentalIncome = gross - actualExpenses;
        const taxMath = global.ComprehensiveIncomeTaxMath;
        if (!taxMath) throw new Error('종합소득세 계산 모듈을 불러오지 못했습니다.');
        const nationalBefore = taxMath.calculateProgressiveTax(otherTaxBase, taxMath.NATIONAL_TAX_BRACKETS).tax;
        const localBefore = taxMath.calculateProgressiveTax(otherTaxBase, taxMath.LOCAL_TAX_BRACKETS).tax;
        const combinedBase = otherTaxBase + rentalIncome;
        const nationalCombined = taxMath.calculateProgressiveTax(combinedBase, taxMath.NATIONAL_TAX_BRACKETS).tax;
        const localCombined = taxMath.calculateProgressiveTax(combinedBase, taxMath.LOCAL_TAX_BRACKETS).tax;
        const comprehensive = {
            rentalIncome, combinedBase, nationalTotal: nationalCombined, localTotal: localCombined,
            nationalIncrease: nationalCombined - nationalBefore,
            localIncrease: localCombined - localBefore,
            increase: nationalCombined + localCombined - nationalBefore - localBefore
        };
        let separate = null;
        if (eligibleSeparate) {
            const expenseRate = registered ? RULES.registeredExpenseRate : RULES.unregisteredExpenseRate;
            const expense = gross * expenseRate;
            const deduction = otherIncomeAmount <= RULES.otherIncomeDeductionLimit
                ? (registered ? RULES.registeredDeduction : RULES.unregisteredDeduction) : 0;
            const base = Math.max(0, gross - expense - deduction);
            const national = Math.floor(base * RULES.nationalSeparateRate);
            const local = Math.floor(base * RULES.localSeparateRate);
            separate = { expenseRate, expense, deduction, base, national, local,
                increase: national + local, nationalTotal: nationalBefore + national,
                localTotal: localBefore + local };
        }
        return { gross, registered, eligibleSeparate, otherIncomeAmount, otherTaxBase,
            baselineNational: nationalBefore, baselineLocal: localBefore,
            comprehensive, separate,
            difference: separate ? separate.increase - comprehensive.increase : null };
    }

    global.HousingRentalIncomeTaxMath = Object.freeze({ RULES, calculate });
})(typeof window !== 'undefined' ? window : globalThis);
