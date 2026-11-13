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
    const DEDUCTION_RULES = Object.freeze({ year: 2026, medicalThreshold: 0.03, medicalCap: 7000000, medicalRates: Object.freeze([0.15, 0.15, 0.2, 0.3]), mortgageCaps: Object.freeze({ ordinary: 8000000, oneCondition: 18000000, bothConditions: 20000000, shortTerm: 6000000 }) });
    function deductionAmount(value, name) {
        if ((typeof value !== 'number' && typeof value !== 'string') || String(value).trim() === '') throw new RangeError(`${name}: 금액을 입력하세요.`);
        const n = Number(value);
        if (!Number.isSafeInteger(n) || n < 0 || n > 1e12) throw new RangeError(`${name}: 0 이상 1조원 이하의 원 단위 정수를 입력하세요.`);
        return n;
    }
    function choice(value, allowed) {
        if (!allowed.includes(value)) throw new RangeError('선택 항목을 확인하세요.');
        return value;
    }
    function decision(failures, pending, special) {
        if (special) pending.push('일반 계산 범위 밖의 예외 사례: 증빙과 공식 기준 추가 확인 필요');
        return special ? 'review' : failures.length ? 'ineligible' : pending.length ? 'review' : 'eligible';
    }
    function calculateMedical(input) {
        const salary = deductionAmount(input.salary, '연간 총급여');
        if (salary === 0) throw new RangeError('총급여가 0원인 경우 이 근로자용 계산기를 적용할 수 없습니다.');
        const eligibility = choice(input.eligibility, ['yes', 'no', 'unknown']);
        if (!Array.isArray(input.groups) || input.groups.length !== 4) throw new RangeError('의료비 네 구분을 확인하세요.');
        let remaining = salary * 3; // Hundredths of a won, preserving statutory threshold precision.
        const groups = input.groups.map((g, i) => {
            const paid = deductionAmount(g.paid, '의료비 지출액');
            const refunded = deductionAmount(g.refunded, '보험금·환급금');
            if (refunded > paid) throw new RangeError('같은 구분의 보험금·환급금은 해당 연도 의료비 지출액을 넘을 수 없습니다.');
            const net = paid - refunded;
            const thresholdUsed = Math.min(net * 100, remaining);
            remaining -= thresholdUsed;
            const beforeCap = (net * 100 - thresholdUsed) / 100;
            const base = i === 0 ? Math.min(beforeCap, DEDUCTION_RULES.medicalCap) : beforeCap;
            return { paid, refunded, net, thresholdUsed: thresholdUsed / 100, beforeCap, base, excess: beforeCap - base, rate: DEDUCTION_RULES.medicalRates[i], credit: base * DEDUCTION_RULES.medicalRates[i] };
        });
        const failures = eligibility === 'no' ? ['근로자 본인 지출·부양·중복 공제 등의 대상 요건 미충족'] : [];
        const pending = eligibility === 'unknown' ? ['근로기간 지출·실제 부담·가족의 공제 요건 확인 필요'] : [];
        const status = decision(failures, pending, input.specialCase === true);
        const calculatedCredit = Math.round(groups.reduce((sum, g) => sum + g.credit, 0) * 100) / 100;
        const statutoryCredit = status === 'eligible' ? calculatedCredit : status === 'ineligible' ? 0 : null;
        const taxRemaining = input.useTaxLimit === true ? deductionAmount(input.taxRemaining, '의료비 공제 전 남은 소득세') : null;
        const usableCredit = statutoryCredit === null || taxRemaining === null ? null : Math.min(statutoryCredit, taxRemaining);
        return { status, failures, pending, salary, threshold: salary * 0.03, groups, totalPaid: groups.reduce((s, g) => s + g.paid, 0), totalRefunded: groups.reduce((s, g) => s + g.refunded, 0), totalNet: groups.reduce((s, g) => s + g.net, 0), calculatedCredit, statutoryCredit, taxRemaining, usableCredit };
    }
    function isoDate(value) {
        if (value === '' || value === undefined || value === null) return null;
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new RangeError('날짜를 YYYY-MM-DD 형식으로 입력하세요.');
        const date = new Date(value + 'T00:00:00Z');
        if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value || value < '1900-01-01' || value > '2026-12-31') throw new RangeError('2026년 귀속에 해당하는 실제 날짜를 확인하세요.');
        return date;
    }
    function threeMonthsAfter(date) {
        const first = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 3, 1));
        const lastDay = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
        first.setUTCDate(Math.min(date.getUTCDate(), lastDay));
        return first;
    }
    function calculateMortgageDeduction(input) {
        const failures = [], pending = [];
        for (const [key, label] of [['worker', '근로소득 있는 거주자'], ['house', '공제 대상 주택'], ['owner', '소유자·채무자 일치 및 본인 부담'], ['lender', '적격 금융기관 차입 및 주택 저당 설정'], ['household', '세대주 또는 적격 세대원']]) {
            const value = choice(input[key], ['yes', 'no', 'unknown']);
            if (value === 'no') failures.push(`${label} 요건 미충족`);
            if (value === 'unknown') pending.push(`${label} 요건 확인 필요`);
        }
        const houses = choice(input.houses, ['one', 'multiple', 'unknown']);
        if (houses === 'multiple') failures.push('연말 세대 전체 2주택 이상');
        if (houses === 'unknown') pending.push('연말 세대 전체 주택 수 확인 필요');
        const acquired = isoDate(input.acquired), registered = isoDate(input.registered), loan = isoDate(input.loan);
        if (!acquired || !registered || !loan) pending.push('취득일·등기일·차입일 확인 필요');
        if ((acquired && acquired.getUTCFullYear() < 2015) || (loan && loan.getUTCFullYear() < 2015)) pending.push('2015년 전 취득·차입: 과거 법령 및 경과규정 별도 확인');
        if (acquired && registered && acquired > registered) pending.push('취득일이 등기일보다 늦음: 실제 취득일과 증빙 확인');
        if (loan && registered) {
            if (loan < registered) pending.push('등기 전 차입: 대금 지급·저당 설정 등 개별 요건 확인');
            else if (loan > threeMonthsAfter(registered)) failures.push('등기일부터 3개월을 넘겨 신규 차입');
        }
        const value = deductionAmount(input.value, '취득 당시 기준시가');
        if (value === 0) throw new RangeError('취득 당시 주택 기준시가를 0원보다 크게 입력하세요.');
        const valueLimit = acquired ? (acquired.getUTCFullYear() >= 2024 ? 600000000 : acquired.getUTCFullYear() >= 2019 ? 500000000 : 400000000) : null;
        if (acquired && acquired.getUTCFullYear() >= 2015 && value > valueLimit) failures.push('취득연도별 주택 기준시가 한도 초과');
        const term = Number(input.term);
        if (!Number.isInteger(term) || term < 1 || term > 60) throw new RangeError('약정 상환기간을 1~60년 정수로 입력하세요.');
        const fixed = choice(input.fixed, ['yes', 'no', 'unknown']);
        const amortizing = choice(input.amortizing, ['yes', 'no', 'unknown']);
        let cap = null;
        if (fixed === 'unknown' || amortizing === 'unknown') pending.push('세법상 고정금리·비거치식 분할상환 여부 확인 필요');
        else if (term >= 15) cap = fixed === 'yes' && amortizing === 'yes' ? DEDUCTION_RULES.mortgageCaps.bothConditions : fixed === 'yes' || amortizing === 'yes' ? DEDUCTION_RULES.mortgageCaps.oneCondition : DEDUCTION_RULES.mortgageCaps.ordinary;
        else if (term >= 10 && (fixed === 'yes' || amortizing === 'yes')) cap = DEDUCTION_RULES.mortgageCaps.shortTerm;
        else failures.push('일반 신규 차입의 상환기간·상환방식 요건 미충족');
        const interest = deductionAmount(input.interest, '연간 이자상환액');
        const otherDeductions = deductionAmount(input.otherDeductions, '다른 주택자금 소득공제액');
        const status = decision(failures, pending, input.specialCase === true);
        const available = cap === null ? null : Math.max(0, cap - otherDeductions);
        const calculatedDeduction = available === null ? null : Math.min(interest, available);
        const deduction = status === 'eligible' ? calculatedDeduction : status === 'ineligible' ? 0 : null;
        return { status, failures, pending, value, valueLimit, term, cap, interest, otherDeductions, available, calculatedDeduction, deduction, dateLimit: registered ? threeMonthsAfter(registered).toISOString().slice(0, 10) : null };
    }
    global.YearEndTaxMath = Object.freeze({ RULES, PARENT_RULES, salaryDeduction, employmentCredit, calculate, pensionDeduction, calculateParent, DEDUCTION_RULES, calculateMedical, calculateMortgageDeduction });
})(typeof window !== 'undefined' ? window : globalThis);
