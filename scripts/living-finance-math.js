(function initializeLivingFinanceMath(global) {
    "use strict";

    const finite = value => Number.isFinite(Number(value)) ? Number(value) : 0;
    const nonNegative = (value, name) => {
        const number = finite(value);
        if (number < 0) throw new Error(`${name} must be non-negative`);
        return number;
    };

    function calculateRentConversion(input) {
        const mode = input.mode || 'jeonse-to-rent';
        const annualRate = nonNegative(input.annualRate, 'annualRate');
        if (annualRate <= 0) throw new Error('annualRate must be positive');
        const deposit = nonNegative(input.deposit, 'deposit');
        const monthlyRent = nonNegative(input.monthlyRent, 'monthlyRent');
        const comparisonDeposit = nonNegative(input.comparisonDeposit, 'comparisonDeposit');
        let convertedDeposit = 0;
        let convertedMonthlyRent = 0;
        let impliedRate = null;
        if (mode === 'jeonse-to-rent') {
            if (deposit < comparisonDeposit) throw new Error('comparisonDeposit exceeds deposit');
            convertedMonthlyRent = (deposit - comparisonDeposit) * annualRate / 12;
            convertedDeposit = comparisonDeposit;
        } else if (mode === 'rent-to-jeonse') {
            convertedDeposit = deposit + monthlyRent * 12 / annualRate;
            convertedMonthlyRent = monthlyRent;
        } else {
            const depositGap = nonNegative(input.jeonseDeposit, 'jeonseDeposit') - deposit;
            impliedRate = depositGap > 0 ? monthlyRent * 12 / depositGap : null;
            convertedDeposit = deposit;
            convertedMonthlyRent = monthlyRent;
        }
        const periodMonths = Math.max(1, Math.trunc(finite(input.periodMonths) || 24));
        const jeonseLoan = nonNegative(input.jeonseLoan, 'jeonseLoan');
        const loanRate = nonNegative(input.loanRate, 'loanRate');
        const opportunityRate = nonNegative(input.opportunityRate, 'opportunityRate');
        const jeonseOwnFunds = Math.max(0, (mode === 'rent-to-jeonse' ? convertedDeposit : deposit) - jeonseLoan);
        const rentOwnFunds = mode === 'jeonse-to-rent' ? comparisonDeposit : deposit;
        const jeonseCost = jeonseLoan * loanRate * periodMonths / 12 + jeonseOwnFunds * opportunityRate * periodMonths / 12;
        const rentCost = convertedMonthlyRent * periodMonths + rentOwnFunds * opportunityRate * periodMonths / 12;
        return { mode, annualRate, convertedDeposit, convertedMonthlyRent, impliedRate, periodMonths, jeonseCost, rentCost, difference: rentCost - jeonseCost };
    }

    function calculateSubscriptionScore(input) {
        const homelessYears = Math.max(0, finite(input.homelessYears));
        const dependents = Math.max(0, Math.trunc(finite(input.dependents)));
        const subscriptionMonths = Math.max(0, Math.trunc(finite(input.subscriptionMonths)));
        const spouseMonths = Math.max(0, Math.trunc(finite(input.spouseMonths)));
        const homelessScore = homelessYears < 1 ? 2 : Math.min(32, 2 + Math.floor(homelessYears) * 2);
        const dependentScore = Math.min(35, 5 + dependents * 5);
        const accountScore = subscriptionMonths < 6 ? 1 : Math.min(17, 2 + Math.floor(subscriptionMonths / 12));
        const spouseBaseScore = spouseMonths < 6 ? 1 : Math.min(17, 2 + Math.floor(spouseMonths / 12));
        const spouseAdditionalScore = spouseMonths > 0 ? Math.min(3, spouseBaseScore * 0.5) : 0;
        const subscriptionScore = Math.min(17, accountScore + spouseAdditionalScore);
        return { homelessScore, dependentScore, accountScore, spouseAdditionalScore, subscriptionScore, totalScore: homelessScore + dependentScore + subscriptionScore };
    }

    const HOUSING_SALE = [[50000000, .006, 250000], [200000000, .005, 800000], [900000000, .004, null], [1200000000, .005, null], [1500000000, .006, null], [Infinity, .007, null]];
    const HOUSING_LEASE = [[50000000, .005, 200000], [100000000, .004, 300000], [600000000, .003, null], [1200000000, .004, null], [1500000000, .005, null], [Infinity, .006, null]];
    function calculateBrokerageFee(input) {
        const propertyType = input.propertyType || 'housing';
        const transactionType = input.transactionType || 'sale';
        const price = nonNegative(input.price, 'price');
        const deposit = nonNegative(input.deposit, 'deposit');
        const monthlyRent = nonNegative(input.monthlyRent, 'monthlyRent');
        let transactionAmount = transactionType === 'sale' ? price : deposit;
        if (transactionType === 'monthly') {
            transactionAmount = deposit + monthlyRent * 100;
            if (transactionAmount < 50000000) transactionAmount = deposit + monthlyRent * 70;
        }
        let maximumRate;
        let cap = null;
        if (propertyType === 'housing') {
            const bracket = (transactionType === 'sale' ? HOUSING_SALE : HOUSING_LEASE).find(row => transactionAmount < row[0]);
            [, maximumRate, cap] = bracket;
        } else if (propertyType === 'officetel-standard') maximumRate = transactionType === 'sale' ? .005 : .004;
        else maximumRate = .009;
        const agreedRate = nonNegative(input.agreedRate, 'agreedRate');
        const appliedRate = agreedRate > 0 ? Math.min(agreedRate, maximumRate) : maximumRate;
        const feeBeforeVat = Math.min(transactionAmount * appliedRate, cap ?? Infinity);
        const vatRate = nonNegative(input.vatRate, 'vatRate');
        const vat = feeBeforeVat * vatRate;
        return { transactionAmount, maximumRate, appliedRate, cap, feeBeforeVat, vat, total: feeBeforeVat + vat };
    }

    function calculateSeverance(input) {
        const serviceDays = Math.max(0, Math.trunc(finite(input.serviceDays)));
        const averagePeriodDays = Math.max(1, Math.trunc(finite(input.averagePeriodDays)));
        const threeMonthWages = nonNegative(input.threeMonthWages, 'threeMonthWages');
        const annualBonus = nonNegative(input.annualBonus, 'annualBonus');
        const annualLeavePay = nonNegative(input.annualLeavePay, 'annualLeavePay');
        const ordinaryDailyWage = nonNegative(input.ordinaryDailyWage, 'ordinaryDailyWage');
        const includedBonus = annualBonus * 3 / 12;
        const includedLeavePay = annualLeavePay * 3 / 12;
        const averageDailyWage = (threeMonthWages + includedBonus + includedLeavePay) / averagePeriodDays;
        const appliedDailyWage = Math.max(averageDailyWage, ordinaryDailyWage);
        const eligible = serviceDays >= 365 && input.weeklyHoursEligible !== false;
        const severance = eligible ? appliedDailyWage * 30 * serviceDays / 365 : 0;
        return { serviceDays, averagePeriodDays, threeMonthWages, includedBonus, includedLeavePay, averageDailyWage, ordinaryDailyWage, appliedDailyWage, eligible, severance };
    }

    function calculateNetSalary(input) {
        const grossMonthly = nonNegative(input.grossMonthly, 'grossMonthly');
        const nonTaxableMonthly = Math.min(grossMonthly, nonNegative(input.nonTaxableMonthly, 'nonTaxableMonthly'));
        const taxableMonthly = grossMonthly - nonTaxableMonthly;
        const pensionBase = Math.min(6590000, Math.max(410000, taxableMonthly));
        const pension = pensionBase * .0475;
        const health = taxableMonthly * .0719 / 2;
        const longTermCare = health * (.009448 / .0719);
        const employment = taxableMonthly * .009;
        const incomeTax = nonNegative(input.incomeTax, 'incomeTax');
        const localIncomeTax = incomeTax * .1;
        const otherDeduction = nonNegative(input.otherDeduction, 'otherDeduction');
        const totalDeduction = pension + health + longTermCare + employment + incomeTax + localIncomeTax + otherDeduction;
        return { grossMonthly, nonTaxableMonthly, taxableMonthly, pensionBase, pension, health, longTermCare, employment, incomeTax, localIncomeTax, otherDeduction, totalDeduction, netMonthly: grossMonthly - totalDeduction, netAnnual: (grossMonthly - totalDeduction) * 12 };
    }

    function calculateRentTaxCredit(input) {
        const grossSalary = nonNegative(input.grossSalary, 'grossSalary');
        const comprehensiveIncome = nonNegative(input.comprehensiveIncome, 'comprehensiveIncome');
        const paidRent = nonNegative(input.paidRent, 'paidRent');
        const availableTax = nonNegative(input.availableTax, 'availableTax');
        const eligible = grossSalary <= 80000000 && comprehensiveIncome <= 70000000 && input.noHome === true && input.addressMatched === true && input.qualifiedHousing === true && input.contractQualified === true;
        const rate = grossSalary <= 55000000 && comprehensiveIncome <= 45000000 ? .17 : .15;
        const recognizedRent = eligible ? Math.min(paidRent, 10000000) : 0;
        const calculatedCredit = recognizedRent * rate;
        const usableCredit = availableTax > 0 ? Math.min(calculatedCredit, availableTax) : calculatedCredit;
        return { eligible, rate, paidRent, recognizedRent, excludedRent: Math.max(0, paidRent - recognizedRent), calculatedCredit, usableCredit, limitedByTax: availableTax > 0 && calculatedCredit > availableTax };
    }

    // Official sources and effective dates: docs/labor-benefits-calculation-notes.md.
    const LABOR_RULES_2026 = Object.freeze({ minimumHourly: 10320, unemploymentDailyCap: 68100,
        unemploymentRate: .6, unemploymentFloorRate: .8, parentalFloor: 700000,
        parentalCaps: Object.freeze([2500000, 2500000, 2500000, 2000000, 2000000, 2000000]),
        sharedParentalCaps: Object.freeze([2500000, 2500000, 3000000, 3500000, 4000000, 4500000]) });

    function laborNumber(value, label, min = 0, max = 1e12, integer = false) {
        const n = Number(value);
        if ((typeof value === 'string' && value.trim() === '') || value === null || value === undefined || !Number.isFinite(n) || n < min || n > max || (integer && !Number.isInteger(n))) {
            throw new Error(`${label} 입력값을 확인해 주세요.`);
        }
        return n;
    }

    function laborDate(value, label) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) throw new Error(`${label}을 입력해 주세요.`);
        const d = new Date(`${value}T00:00:00Z`);
        if (!Number.isFinite(d.getTime()) || d.toISOString().slice(0, 10) !== value) throw new Error(`${label}이 올바르지 않습니다.`);
        return d;
    }

    // Calendar anniversaries, including month-end and leap-day starts; never 365-day approximations.
    function addLaborMonths(date, months) {
        const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months + 1, 0)).getUTCDate();
        // If the corresponding day does not exist, the period ends on that month's last day;
        // the entitlement begins the following day (Civil Act article 160).
        return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, date.getUTCDate() > lastDay ? lastDay + 1 : date.getUTCDate()));
    }

    function calculateWeeklyHolidayPay(input) {
        const weeklyHours = laborNumber(input.weeklyHours, '4주 평균 주 소정근로시간', 0, 40);
        const enteredHourly = laborNumber(input.hourlyWage, '시급', 0);
        if (!['base', 'inclusive'].includes(input.wageMode)) throw new Error('시급 입력 방식을 선택해 주세요.');
        const eligible = weeklyHours >= 15 && input.attended === true && input.employmentMaintained === true;
        const holidayHours = eligible ? weeklyHours / 5 : 0;
        if (input.wageMode === 'inclusive' && !eligible) throw new Error('주휴수당 지급요건을 충족할 때만 포함 시급을 역산할 수 있습니다.');
        const hourlyWage = input.wageMode === 'inclusive' ? enteredHourly / (1 + holidayHours / weeklyHours) : enteredHourly;
        const basicWeeklyPay = hourlyWage * weeklyHours;
        const holidayPay = hourlyWage * holidayHours;
        const weeklyPay = basicWeeklyPay + holidayPay;
        return { eligible, weeklyHours, hourlyWage, holidayHours, basicWeeklyPay, holidayPay, weeklyPay,
            inclusiveHourly: weeklyHours > 0 ? weeklyPay / weeklyHours : 0,
            monthlyPay: weeklyPay * (365 / 7 / 12), belowMinimum: hourlyWage < LABOR_RULES_2026.minimumHourly && weeklyHours > 0 };
    }

    function calculateUnemploymentBenefit(input) {
        const separation = laborDate(input.separationDate, '이직일');
        if (separation.getUTCFullYear() !== 2026) throw new Error('2026년 이직자만 지원합니다. 이직일을 확인해 주세요.');
        const age = laborNumber(input.age, '이직 당시 만 나이', 15, 100, true);
        const insuredMonths = laborNumber(input.insuredMonths, '고용보험 인정 가입개월', 0, 720, true);
        const insuredDays = laborNumber(input.insuredDays, '피보험단위기간', 0, 1000, true);
        const dailyHours = laborNumber(input.dailyHours, '인정 1일 소정근로시간', 4, 8, true);
        const averagePeriodDays = laborNumber(input.averagePeriodDays, '평균임금 산정일수', 1, 92, true);
        const threeMonthWages = laborNumber(input.threeMonthWages, '산정기간 임금');
        const annualBonus = laborNumber(input.annualBonus, '연간 상여금');
        const annualLeavePay = laborNumber(input.annualLeavePay, '산입대상 연차수당');
        const ordinaryDailyWage = laborNumber(input.ordinaryDailyWage, '1일 통상임금');
        if (threeMonthWages + ordinaryDailyWage <= 0) throw new Error('임금 또는 확인한 통상임금을 입력해 주세요.');
        const wage = calculateSeverance({ serviceDays: 0, averagePeriodDays, threeMonthWages, annualBonus, annualLeavePay, ordinaryDailyWage });
        const floor = LABOR_RULES_2026.minimumHourly * dailyHours * LABOR_RULES_2026.unemploymentFloorRate;
        const uncappedDaily = wage.appliedDailyWage * LABOR_RULES_2026.unemploymentRate;
        const dailyBenefit = Math.floor(Math.min(LABOR_RULES_2026.unemploymentDailyCap, Math.max(floor, uncappedDaily)));
        const bracket = insuredMonths < 12 ? 0 : insuredMonths < 36 ? 1 : insuredMonths < 60 ? 2 : insuredMonths < 120 ? 3 : 4;
        const benefitDays = (age >= 50 || input.disabled === true ? [120, 180, 210, 240, 270] : [120, 150, 180, 210, 240])[bracket];
        const eligible = insuredDays >= 180 && insuredMonths > 0 && input.qualifyingReason === true;
        return { ...wage, insuredMonths, insuredDays, dailyHours, floor, uncappedDaily, dailyBenefit,
            benefitDays, eligible, total: eligible ? dailyBenefit * benefitDays : 0,
            monthlyEquivalent: dailyBenefit * 30 };
    }

    function calculateAnnualLeave(input) {
        const mode = input.mode;
        if (!['automatic', 'manual'].includes(mode)) throw new Error('연차 계산 방식을 선택해 주세요.');
        let accrued = 0, totalAccrued = 0, cycleStart = '', cycleEnd = '', serviceYears = 0;
        if (mode === 'automatic') {
            const hire = laborDate(input.hireDate, '입사일');
            const asOf = laborDate(input.asOfDate, '기준일');
            if (hire < new Date('2017-05-30T00:00:00Z') || asOf < hire || asOf.getUTCFullYear() - hire.getUTCFullYear() > 80) {
                throw new Error('2017-05-30 이후 입사일과 입사일 이후 기준일을 입력해 주세요.');
            }
            if (input.attendanceConfirmed !== true) throw new Error('출근요건을 확인하거나 연차 직접 입력을 이용해 주세요.');
            if (input.statutoryEligible !== true) throw new Error('자동 계산 적용요건을 충족하지 않습니다. 회사에서 확인한 일수로 직접 입력해 주세요.');
            while (addLaborMonths(hire, (serviceYears + 1) * 12) <= asOf) serviceYears++;
            const monthlyAccrued = Array.from({ length: 11 }, (_, i) => addLaborMonths(hire, i + 1)).filter(d => d <= asOf).length;
            totalAccrued = monthlyAccrued;
            for (let year = 1; year <= serviceYears; year++) totalAccrued += Math.min(25, 15 + Math.floor((year - 1) / 2));
            accrued = serviceYears === 0 ? monthlyAccrued : Math.min(25, 15 + Math.floor((serviceYears - 1) / 2));
            cycleStart = addLaborMonths(hire, serviceYears * 12).toISOString().slice(0, 10);
            cycleEnd = new Date(addLaborMonths(hire, (serviceYears + 1) * 12).getTime() - 86400000).toISOString().slice(0, 10);
        } else {
            accrued = laborNumber(input.accruedDays, '확인한 연차일수', 0, 1000);
            totalAccrued = accrued;
        }
        const usedDays = laborNumber(input.usedDays, '해당 부여기간 사용 연차', 0, 1000);
        const previousUnpaidDays = laborNumber(input.previousUnpaidDays, '과거 미정산 수당 대상 일수', 0, 1000);
        if (usedDays > accrued) throw new Error('사용 연차가 해당 기간 발생 연차보다 많습니다. 선사용 연차는 직접 입력으로 정산해 주세요.');
        const dailyHours = laborNumber(input.dailyHours, '1일 소정근로시간', .01, 8);
        const wageMode = input.wageMode;
        if (!['monthly', 'hourly', 'daily'].includes(wageMode)) throw new Error('임금 입력 방식을 선택해 주세요.');
        const wageAmount = laborNumber(input.wageAmount, '임금');
        const monthlyHours = wageMode === 'monthly' ? laborNumber(input.monthlyHours, '월 통상임금 산정시간', .01, 744) : 1;
        const dailyWage = wageMode === 'daily' ? wageAmount : (wageMode === 'monthly' ? wageAmount / monthlyHours : wageAmount) * dailyHours;
        const remainingDays = accrued - usedDays;
        const payableDays = input.payableConfirmed === true ? remainingDays + previousUnpaidDays : 0;
        return { mode, accrued, totalAccrued, serviceYears, cycleStart, cycleEnd, usedDays, remainingDays,
            previousUnpaidDays, dailyWage, payableDays, allowance: dailyWage * payableDays };
    }

    function calculateParentalLeaveBenefit(input) {
        const mode = input.mode;
        if (!['general', 'shared', 'single'].includes(mode)) throw new Error('육아휴직 급여 유형을 선택해 주세요.');
        const wage = laborNumber(input.wage, '본인 월 통상임금', 1);
        const months = laborNumber(input.months, '본인 전체 휴직개월', 0, 18, true);
        const usedMonths = laborNumber(input.usedMonths, '본인 이미 사용한 개월', 0, months, true);
        const partnerWage = mode === 'shared' ? laborNumber(input.partnerWage, '배우자 월 통상임금', 1) : 0;
        const partnerMonths = mode === 'shared' ? laborNumber(input.partnerMonths, '배우자 전체 휴직개월', 1, 18, true) : 0;
        if (mode === 'shared' && input.sharedEligible !== true) throw new Error('부모 모두 생후 18개월 이내 개시 등 특례요건을 확인해 주세요.');
        if (mode === 'single' && input.singleEligible !== true) throw new Error('한부모가족지원법상 한부모 해당 여부를 확인해 주세요.');
        if ((months > 12 || partnerMonths > 12) && input.extendedEligible !== true) throw new Error('12개월 초과 사용은 1년 6개월 연장 요건을 확인해야 합니다.');
        const commonMonths = mode === 'shared' ? Math.min(months, partnerMonths, 6) : 0;
        function schedule(monthCount, monthlyWage, specialMode) {
            return Array.from({ length: monthCount }, (_, i) => {
                const month = i + 1;
                const shared = specialMode === 'shared' && month <= commonMonths;
                const cap = shared ? LABOR_RULES_2026.sharedParentalCaps[i] : specialMode === 'single' && month <= 3 ? 3000000 : LABOR_RULES_2026.parentalCaps[i] || 1600000;
                const rate = month <= 6 ? 1 : .8;
                const amount = Math.min(cap, Math.max(LABOR_RULES_2026.parentalFloor, monthlyWage * rate));
                return { month, rate, cap, amount, special: shared ? '부모 함께' : specialMode === 'single' && month <= 3 ? '한부모' : '일반' };
            });
        }
        const rows = schedule(months, wage, mode);
        const partnerRows = schedule(partnerMonths, partnerWage, 'shared');
        const total = rows.reduce((sum, row) => sum + row.amount, 0);
        const partnerTotal = partnerRows.reduce((sum, row) => sum + row.amount, 0);
        const remainingTotal = rows.filter(row => row.month > usedMonths).reduce((sum, row) => sum + row.amount, 0);
        return { mode, months, usedMonths, commonMonths, rows, partnerRows, total, partnerTotal,
            householdTotal: total + partnerTotal, remainingTotal };
    }

    const EITC_RULES_2025_INCOME = Object.freeze({ assetLimit: 240000000, assetReductionFrom: 170000000,
        spouseEarningsMinimum: 3000000, lateRate: .95, minimumDecision: 15000,
        families: Object.freeze({ single: Object.freeze({ column: 2, limit: 22000000, riseEnd: 4000000, fallStart: 9000000 }),
            one: Object.freeze({ column: 3, limit: 32000000, riseEnd: 7000000, fallStart: 14000000 }),
            dual: Object.freeze({ column: 4, limit: 44000000, riseEnd: 8000000, fallStart: 17000000 }) }) });

    function calculateEarnedIncomeCredit(input) {
        if (!['regular', 'late'].includes(input.application)) throw new Error('정기 또는 기한 후 신청을 선택해 주세요.');
        const ownPay = laborNumber(input.ownPay, '본인 총급여액 등');
        const partnerPay = input.hasSpouse === true ? laborNumber(input.partnerPay, '배우자 총급여액 등') : 0;
        const otherIncome = laborNumber(input.otherIncome, '소득요건에만 합산하는 소득');
        const assets = laborNumber(input.assets, '가구원 재산 합계');
        const family = input.hasSpouse === true ? ownPay >= 3000000 && partnerPay >= 3000000 ? 'dual' : 'one' : input.hasDependent === true ? 'one' : 'single';
        const rule = EITC_RULES_2025_INCOME.families[family];
        const totalPay = ownPay + partnerPay;
        const totalIncome = totalPay + otherIncome;
        const reasons = [];
        if (totalPay === 0) reasons.push('장려금 산정대상 총급여액 등 없음');
        if (totalIncome >= rule.limit) reasons.push('가구 유형별 총소득 기준금액 이상');
        if (assets >= EITC_RULES_2025_INCOME.assetLimit) reasons.push('가구원 재산 합계 2억 4천만원 이상');
        if (input.otherEligible !== true) reasons.push('국적·부양·전문직·상용근로자 등 기타 신청요건 미충족');
        if (!global.EarnedIncomeCreditTable) throw new Error('공식 산정표를 불러오지 못했습니다. 새로고침해 주세요.');
        const tableRow = global.EarnedIncomeCreditTable.find(row => totalPay >= row[0] && totalPay < row[1]);
        const tableAmount = tableRow?.[rule.column] || 0;
        const eligible = reasons.length === 0;
        const initial = eligible ? tableAmount : 0;
        const assetReduction = assets >= EITC_RULES_2025_INCOME.assetReductionFrom ? initial * .5 : 0;
        const afterAssets = initial - assetReduction;
        const lateReduction = input.application === 'late' ? afterAssets * (1 - EITC_RULES_2025_INCOME.lateRate) : 0;
        const afterReductions = Math.round((afterAssets - lateReduction) * 100) / 100;
        let decision = afterReductions;
        if (decision < EITC_RULES_2025_INCOME.minimumDecision) decision = 0;
        else if (totalPay < rule.riseEnd && decision < 100000) decision = 100000;
        else if (totalPay >= rule.fallStart && decision < 30000) decision = 30000;
        return { family, totalPay, totalIncome, incomeLimit: rule.limit, assets, eligible, reasons,
            tableLower: tableRow?.[0] ?? null, tableUpper: tableRow?.[1] ?? null, tableAmount,
            assetReduction, lateReduction, afterReductions, minimumAdjustment: decision - afterReductions, decision };
    }

    global.LivingFinanceMath = Object.freeze({ calculateRentConversion, calculateSubscriptionScore, calculateBrokerageFee, calculateSeverance, calculateNetSalary, calculateRentTaxCredit,
        LABOR_RULES_2026, EITC_RULES_2025_INCOME, calculateWeeklyHolidayPay, calculateUnemploymentBenefit, calculateAnnualLeave, calculateParentalLeaveBenefit, calculateEarnedIncomeCredit });
}(typeof window !== 'undefined' ? window : globalThis));
