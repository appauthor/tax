(function (global) {
    'use strict';
    const RULES = Object.freeze({ year: 2026, basicDeduction: 1500000, salaryDeductionCap: 20000000, standardCredit: 130000, localRate: 0.1 });
    function amount(value, name) {
        if (value === '' || value === null || value === undefined || !Number.isFinite(Number(value)) || Number(value) < 0 || Number(value) > 1e12) throw new RangeError(`${name}: 0 이상의 금액을 입력하세요.`);
        return Number(value);
    }
    function salaryDeduction(gross) {
        const g = amount(gross, '총급여');
        const value = g <= 5000000 ? g * 0.7 : g <= 15000000 ? 3500000 + (g - 5000000) * 0.4 : g <= 45000000 ? 7500000 + (g - 15000000) * 0.15 : g <= 100000000 ? 12000000 + (g - 45000000) * 0.05 : 14750000 + (g - 100000000) * 0.02;
        return Math.min(value, RULES.salaryDeductionCap);
    }
    function employmentCredit(gross, tax) {
        let cap = 740000;
        if (gross > 120000000) cap = Math.max(200000, 500000 - (gross - 120000000) * 0.5);
        else if (gross > 70000000) cap = Math.max(500000, 660000 - (gross - 70000000) * 0.5);
        else if (gross > 33000000) cap = Math.max(660000, 740000 - (gross - 33000000) * 0.008);
        return Math.min(cap, tax <= 1300000 ? tax * 0.55 : 715000 + (tax - 1300000) * 0.3);
    }
    function calculate(input) {
        const v = {};
        const labels = { gross: '총급여', extraPersonal: '추가 인적공제', publicPension: '공적연금 보험료', otherDeductions: '그 밖의 소득공제', specialDeductions: '특별소득공제', specialCredits: '특별세액·월세 공제', otherCredits: '그 밖의 세액공제', pensionSavings: '연금저축 납입액', irp: 'IRP 납입액', additionalIrp: 'IRP 추가 납입액', paidIncomeTax: '기납부 소득세', paidLocalTax: '기납부 지방소득세' };
        Object.keys(labels).forEach(key => { v[key] = amount(input[key], labels[key]); });
        const family = Number(input.family);
        if (!Number.isInteger(family) || family < 1 || family > 30) throw new RangeError('기본공제 인원은 본인 포함 1~30명입니다.');
        if (!['auto', 'special', 'standard'].includes(input.mode)) throw new RangeError('공제 방식을 선택하세요.');
        if (v.pensionSavings + v.irp + v.additionalIrp > 18000000) throw new RangeError('이 계산기는 ISA 전환을 제외한 연금계좌 본인 납입액 합계 1,800만 원까지 지원합니다.');
        const earnedDeduction = salaryDeduction(v.gross);
        const earnedIncome = v.gross - earnedDeduction;
        const personal = family * RULES.basicDeduction + v.extraPersonal;
        function branch(mode, extraIrp) {
            const special = mode === 'special';
            const deductions = personal + v.publicPension + v.otherDeductions + (special ? v.specialDeductions : 0);
            const taxBase = Math.max(0, earnedIncome - deductions);
            const calculatedTax = global.InvestmentTaxMath.progressiveIncomeTax(taxBase);
            const workCredit = employmentCredit(v.gross, calculatedTax);
            const pension = v.pensionSavings + v.irp + extraIrp > 0
                ? global.InvestmentTaxMath.calculatePensionTaxCredit({ incomeType: 'salary', incomeAmount: v.gross, pensionSavingsContribution: v.pensionSavings, irpContribution: v.irp + extraIrp })
                : { eligibleContribution: 0, statutoryIncomeTaxCredit: 0 };
            const pensionEligible = pension.eligibleContribution;
            const pensionCredit = pension.statutoryIncomeTaxCredit;
            const selectedCredit = special ? v.specialCredits : RULES.standardCredit;
            const requestedCredits = workCredit + pensionCredit + v.otherCredits + selectedCredit;
            const usedCredits = Math.min(calculatedTax, requestedCredits);
            const incomeTax = Math.max(0, calculatedTax - usedCredits);
            const localTax = incomeTax * RULES.localRate;
            const incomeRefund = v.paidIncomeTax - incomeTax;
            const localRefund = v.paidLocalTax - localTax;
            return { mode, taxBase, deductions, calculatedTax, workCredit, pensionEligible, pensionCredit, selectedCredit, usedCredits, unusedCredits: requestedCredits - usedCredits, incomeTax, localTax, totalTax: incomeTax + localTax, incomeRefund, localRefund, refund: incomeRefund + localRefund };
        }
        function choose(extraIrp) {
            const special = branch('special', extraIrp), standard = branch('standard', extraIrp);
            const selected = input.mode === 'auto' ? (special.totalTax < standard.totalTax ? special : standard) : input.mode === 'special' ? special : standard;
            return { ...selected, specialTotalTax: special.totalTax, standardTotalTax: standard.totalTax };
        }
        const current = choose(0), after = choose(v.additionalIrp);
        return { ...v, family, earnedDeduction, earnedIncome, personal, current, after, additionalSaving: current.totalTax - after.totalTax };
    }
    global.YearEndTaxMath = Object.freeze({ RULES, salaryDeduction, employmentCredit, calculate });
})(typeof window !== 'undefined' ? window : globalThis);
