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
    const PARENT_RULES = Object.freeze({ year: 2026, incomeLimit: 1000000, salaryOnlyLimit: 5000000, age: 60, seniorAge: 70, basic: 1500000, senior: 1000000, disability: 2000000 });
    function pensionDeduction(total) {
        const p = amount(total, '과세대상 연금액');
        return Math.min(9000000, p <= 3500000 ? p : p <= 7000000 ? 3500000 + (p - 3500000) * 0.4 : p <= 14000000 ? 4900000 + (p - 7000000) * 0.2 : 6300000 + (p - 14000000) * 0.1);
    }
    function calculateParent(input) {
        const r = PARENT_RULES;
        const choose = (key, choices) => {
            if (!choices.includes(input[key])) throw new RangeError('선택 항목을 다시 확인하세요.');
            return input[key];
        };
        const pensionMode = choose('pensionMode', ['taxable', 'net', 'exempt', 'none', 'unknown']);
        const incomeMode = choose('incomeMode', ['none', 'salary', 'mixed', 'unknown']);
        const support = choose('support', ['yes', 'no', 'unknown']);
        const duplicate = choose('duplicate', ['no', 'yes', 'unknown']);
        const disability = choose('disability', ['no', 'yes', 'unknown']);
        const birthYear = Number(input.birthYear);
        if (!Number.isInteger(birthYear) || birthYear < 1900 || birthYear > r.year) throw new RangeError('출생연도를 1900~2026년으로 입력하세요.');
        const money = (key, label) => {
            if (typeof input[key] !== 'number' && (typeof input[key] !== 'string' || input[key].trim() === '')) throw new RangeError(`${label}: 금액을 입력하세요.`);
            const n = amount(input[key], label);
            if (!Number.isSafeInteger(n)) throw new RangeError(`${label}: 원 단위 정수로 입력하세요.`);
            return n;
        };
        const pensionKnown = pensionMode !== 'unknown';
        const pensionAmount = ['taxable', 'net'].includes(pensionMode) ? money('pensionAmount', '연금 금액') : 0;
        const deduction = pensionMode === 'taxable' ? Math.round(pensionDeduction(pensionAmount) * 100) / 100 : null;
        const pensionIncome = pensionKnown ? (pensionMode === 'taxable' ? (pensionAmount * 100 - Math.round(deduction * 100)) / 100 : pensionMode === 'net' ? pensionAmount : 0) : null;
        const salary = ['salary', 'mixed'].includes(incomeMode) ? money('salary', '연간 총급여') : 0;
        const salaryIncome = (salary * 100 - Math.round(salaryDeduction(salary) * 100)) / 100;
        const other = incomeMode === 'mixed' ? money('other', '그 밖의 종합소득금액') : 0;
        const retirement = incomeMode === 'mixed' ? money('retirement', '퇴직소득금액') : 0;
        const capital = incomeMode === 'mixed' ? money('capital', '양도소득금액') : 0;
        const incomeKnown = pensionKnown && incomeMode !== 'unknown';
        const totalIncome = incomeKnown ? Math.round((pensionIncome + salaryIncome + other + retirement + capital) * 100) / 100 : null;
        const salaryOnly = incomeMode === 'salary' && (['none', 'exempt'].includes(pensionMode) || (pensionMode === 'taxable' && pensionAmount === 0));
        const incomePass = incomeKnown ? (salaryOnly ? salary <= r.salaryOnlyLimit : totalIncome <= r.incomeLimit) : null;
        const zeroOtherIncome = incomeKnown && !incomePass && salary <= r.salaryOnlyLimit && salary > 0 && pensionIncome + other + retirement + capital === 0;
        const age = r.year - birthYear;
        const agePass = age >= r.age || disability === 'yes';
        const failures = [], pending = [];
        if (!agePass) (disability === 'unknown' ? pending : failures).push(disability === 'unknown' ? '60세 미만: 세법상 장애인 해당 여부 확인 필요' : '60세 미만이며 세법상 장애인 예외에 해당하지 않음');
        if (incomePass === false && !zeroOtherIncome) failures.push(salaryOnly ? '근로소득만 있는 경우의 총급여 500만원 기준 초과' : '소득금액 합계 100만원 기준 초과');
        if (!incomeKnown) pending.push('연금 및 다른 소득의 연간 금액 확인 필요');
        if (zeroOtherIncome) pending.push('다른 소득금액이 0원인 혼합 소득: 근로소득만 있는 경우에 해당하는지 확인 필요');
        if (support === 'no') failures.push('생계를 같이 하거나 실제 부양하는 요건 미충족');
        if (support === 'unknown') pending.push('실제 부양·생계 요건 확인 필요');
        if (duplicate === 'yes') failures.push('다른 가족과 같은 부모님을 중복 공제할 수 없음');
        if (duplicate === 'unknown') pending.push('다른 가족의 중복 공제 여부 확인 필요');
        if (disability === 'unknown' && agePass) pending.push('장애인 추가공제 해당 여부 확인 필요');
        if (input.specialCase === true) pending.push('사망·해외거주·다른 연금·소득 조정 등 별도 검토가 필요한 사례');
        const status = input.specialCase === true ? 'review' : failures.length ? 'ineligible' : pending.length ? 'review' : 'eligible';
        const basic = status === 'eligible' ? r.basic : null;
        const senior = status === 'eligible' ? (age >= r.seniorAge ? r.senior : 0) : null;
        const disabled = status === 'eligible' ? (disability === 'yes' ? r.disability : 0) : null;
        return { status, age, agePass, incomePass, pensionMode, pensionAmount, deduction, pensionIncome, salary, salaryIncome, other, retirement, capital, totalIncome, salaryOnly, failures, pending, basic, senior, disabled, totalDeduction: basic === null ? null : basic + senior + disabled };
    }
    global.YearEndTaxMath = Object.freeze({ RULES, PARENT_RULES, salaryDeduction, employmentCredit, calculate, pensionDeduction, calculateParent });
})(typeof window !== 'undefined' ? window : globalThis);
