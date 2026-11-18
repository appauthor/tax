(function (root) {
    'use strict';

    const CARD_RATES = { card: 15, debit: 30, culture: 30, market: 40, transit: 40 };
    const LEASE_LIMITS = { seoul: 900000000, congested: 690000000, metro: 540000000, other: 370000000 };
    // HUG annual rates in thousandths of a percent, by guarantee amount and debt ratio.
    const HUG_RATES = [
        { max: 100000000, apartment: [97, 117, 137], other: [111, 142, 172] },
        { max: 200000000, apartment: [102, 124, 146], other: [117, 151, 184] },
        { max: 500000000, apartment: [107, 131, 154], other: [124, 161, 197] },
        { max: Infinity, apartment: [113, 138, 164], other: [132, 172, 211] }
    ];
    const HUG_PUBLISHED_PRICE_MULTIPLIER = 140;
    const HUG_WELFARE_DISCOUNTS = {
        lowIncome: 60, singleParent: 60, seniorAlone: 60,
        children: 40, disability: 40, senior: 40, seniorSupport: 40, newlywed: 40,
        multicultural: 40, veteran: 40, meritorious: 40, distributionDispute: 40
    };
    const HUG_CONTRACT_DISCOUNT = 3;
    const HUG_MOBILE_DISCOUNT = 3;
    const HUG_LUMP_SUM_DISCOUNT = 3;

    function amount(value, label, min = 0, max = 100000000000) {
        if (!Number.isSafeInteger(value) || value < min || value > max) {
            throw new RangeError(`${label}은 ${min.toLocaleString('ko-KR')}~${max.toLocaleString('ko-KR')}원 사이로 입력하세요.`);
        }
        return value;
    }

    function cardDeduction(input) {
        const salary = amount(input.salary, '총급여', 1);
        const eligibleCulture = salary <= 70000000;
        const children = Number(input.children);
        if (![0, 1, 2].includes(children)) throw new RangeError('적격 자녀 수를 선택하세요.');
        const spend = Object.fromEntries(Object.keys(CARD_RATES).map(key => [key, amount(input[key] ?? 0, '사용액')]));
        if (!eligibleCulture && spend.culture) {
            throw new RangeError('총급여 7천만원 초과자는 문화비를 실제 결제수단의 일반 사용액에 포함하세요.');
        }
        const total = Object.values(spend).reduce((sum, value) => sum + value, 0);
        const threshold = salary / 4;
        const baseLimit = (eligibleCulture ? 3000000 : 2500000) + children * (eligibleCulture ? 500000 : 250000);
        const specialLimit = eligibleCulture ? 3000000 : 2000000;
        const gross = Object.fromEntries(Object.entries(CARD_RATES).map(([key, rate]) => [key, spend[key] * rate / 100]));
        const offset15 = Math.min(threshold, spend.card);
        const offset30 = Math.min(threshold - offset15, spend.debit + spend.culture);
        const offset40 = Math.min(threshold - offset15 - offset30, spend.market + spend.transit);
        const offset = (offset15 * 15 + offset30 * 30 + offset40 * 40) / 100;
        const uncapped = Math.max(0, Object.values(gross).reduce((sum, value) => sum + value, 0) - offset);
        const base = Math.min(baseLimit, uncapped);
        const additional = Math.min(uncapped - base, specialLimit, gross.market + gross.transit + gross.culture);
        return {
            total, threshold, toThreshold: Math.max(0, threshold - total), offset, uncapped, baseLimit,
            base, specialLimit, additional, baseRemaining: baseLimit - base,
            specialRemaining: specialLimit - additional, deduction: base + additional
        };
    }

    function clock(value) {
        if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value ?? '')) throw new RangeError('시각을 24시간 형식으로 입력하세요.');
        const [hour, minute] = value.split(':').map(Number);
        return hour * 60 + minute;
    }

    function overtimePay(input) {
        const wage = amount(input.wage, '통상시급', 1, 10000000);
        if (!['workday', 'holiday'].includes(input.day)) throw new RangeError('근무 유형을 선택하세요.');
        const start = clock(input.start);
        const endClock = clock(input.end);
        if (start === endClock) throw new RangeError('출근과 퇴근 시각은 다르게 입력하세요.');
        const end = endClock + (endClock < start ? 1440 : 0);
        let breaks = null;
        if (input.breakStart || input.breakEnd) {
            const first = clock(input.breakStart);
            const last = clock(input.breakEnd);
            const breakStart = first + (first < start ? 1440 : 0);
            const breakEnd = last + (last < start ? 1440 : 0);
            if (breakStart >= breakEnd || breakEnd > end || breakEnd - breakStart >= end - start) {
                throw new RangeError('휴게 시작과 끝을 근무 중 실제로 쉰 시각으로 입력하세요.');
            }
            breaks = [breakStart, breakEnd];
        }

        const holiday = input.day === 'holiday';
        const priorHours = holiday || input.prior === '' || input.prior === undefined ? 0 : Number(input.prior);
        if (!Number.isFinite(priorHours) || priorHours < 0 || priorHours > 40) {
            throw new RangeError('이번 주 앞선 법정근로 시간은 0~40시간 사이로 입력하세요.');
        }
        const regularLimit = Math.min(8, 40 - priorHours) * 60;
        let worked = 0;
        let night = 0;
        for (let minute = start; minute < end; minute += 1) {
            if (breaks && minute >= breaks[0] && minute < breaks[1]) continue;
            worked += 1;
            const local = minute % 1440;
            if (local < 360 || local >= 1320) night += 1;
        }
        const overtime = holiday ? 0 : Math.max(0, worked - regularLimit);
        const holidayFirst = holiday ? Math.min(480, worked) : 0;
        const holidayExtra = holiday ? Math.max(0, worked - 480) : 0;
        const base = worked * wage / 60;
        const overtimeAmount = overtime * wage / 120;
        const nightAmount = night * wage / 120;
        const holidayAmount = (holidayFirst / 2 + holidayExtra) * wage / 60;
        return { worked, night, overtime, holidayFirst, holidayExtra, base, overtimeAmount, nightAmount, holidayAmount,
            premiums: overtimeAmount + nightAmount + holidayAmount,
            total: base + overtimeAmount + nightAmount + holidayAmount };
    }

    function commercialLease(input) {
        const deposit = amount(input.deposit, '보증금');
        const monthly = amount(input.monthly, '월 차임');
        if (!Object.hasOwn(LEASE_LIMITS, input.zone)) throw new RangeError('상가 소재지 기준 구간을 선택하세요.');
        const limit = LEASE_LIMITS[input.zone];
        const converted = deposit + monthly * 100;
        return { converted, limit, eligible: converted <= limit, gap: limit - converted,
            maxMonthly: deposit <= limit ? Math.floor((limit - deposit) / 100) : null };
    }

    function guaranteeFee(input) {
        const deposit = amount(input.deposit, '전세보증금', 1);
        const propertySource = input.propertySource ?? 'assessed';
        if (!['assessed', 'published'].includes(propertySource)) throw new RangeError('주택가격 입력 기준을 선택하세요.');
        const publishedPrice = propertySource === 'published';
        const enteredPrice = amount(input.property, publishedPrice ? '공시가격·기준시가' : '보증 심사에 쓰는 주택가격', 1);
        const property = publishedPrice ? enteredPrice * HUG_PUBLISHED_PRICE_MULTIPLIER / 100 : enteredPrice;
        const senior = amount(input.senior, '선순위채권 등');
        const days = Number(input.days);
        if (!Number.isInteger(days) || days < 365 || days > 36525) throw new RangeError('일반 신규보증 대상인 1년 이상 계약의 일수를 입력하세요.');
        if (!['capital', 'other'].includes(input.region)) throw new RangeError('주택 소재 권역을 선택하세요.');
        if (!['apartment', 'other'].includes(input.dwelling)) throw new RangeError('주택 유형을 선택하세요.');
        const debt = senior + deposit;
        const adjustedValue = property * 0.9;
        const ratio = debt / adjustedValue;
        const depositLimit = input.region === 'capital' ? 700000000 : 500000000;
        const issues = [];
        if (deposit > depositLimit) issues.push('해당 권역 전세보증금 상한을 초과합니다.');
        if (debt * 100 > property * 90) issues.push('전세보증금과 선순위채권 합계가 주택가격의 90%를 초과합니다.');
        if (senior * 100 > property * 54) issues.push('선순위채권이 주택가액(주택가격의 90%)의 60%를 초과합니다.');
        const bracket = debt * 1000 <= property * 630 ? 0 : debt * 1000 <= property * 720 ? 1 : 2;
        const rate = HUG_RATES.find(tier => deposit <= tier.max)[input.dwelling][bracket] / 100000;
        // HUG uses the adjusted housing value (price × 90%) for the surcharge threshold.
        const surcharge = senior * 100 > property * 45;
        const base = deposit * rate * days / 365;
        const beforeDiscount = base * (surcharge ? 1.1 : 1);
        const welfare = input.welfare ?? 'none';
        if (welfare !== 'none' && !Object.hasOwn(HUG_WELFARE_DISCOUNTS, welfare)) {
            throw new RangeError('사회배려계층 할인 항목을 하나만 선택하세요.');
        }
        const discounts = {
            welfare: HUG_WELFARE_DISCOUNTS[welfare] ?? 0,
            electronic: input.electronic === 'yes' ? HUG_CONTRACT_DISCOUNT : 0,
            mobile: input.mobile === 'yes' ? HUG_MOBILE_DISCOUNT : 0,
            lumpSum: input.lumpSum === 'yes' ? HUG_LUMP_SUM_DISCOUNT : 0
        };
        // Estimate simultaneous discounts by applying each rate to the remaining fee.
        const fee = Object.values(discounts).reduce((remaining, discount) => remaining * (100 - discount) / 100, beforeDiscount);
        return { property, publishedPrice, adjustedValue, ratio, days, rate, depositLimit, surcharge, issues,
            base, beforeDiscount, discounts, discountAmount: beforeDiscount - fee, fee };
    }

    function retirementContribution(input) {
        const regular = amount(input.regular, '통상 근무기간 임금 합계');
        const annual = amount(input.annual, '연 단위 지급 임금 합계');
        const paid = input.paid == null ? null : amount(input.paid, '회사 실제 부담금');
        if (!['standard', 'leave'].includes(input.mode)) throw new RangeError('산정 유형을 선택하세요.');
        const leave = input.mode === 'leave' ? Number(input.leave) : 0;
        if (input.mode === 'leave' && (!Number.isFinite(leave) || leave <= 0 || leave >= 12)) {
            throw new RangeError('제외 기간은 0개월 초과 12개월 미만으로 입력하세요.');
        }
        if (regular + annual <= 0) throw new RangeError('산정 대상 임금을 입력하세요. 전 기간 휴직 등은 사업장에 별도 확인이 필요합니다.');
        const annualContribution = annual / 12;
        const regularContribution = regular / (12 - leave);
        const minimum = Math.ceil(regularContribution + annualContribution);
        return { regularContribution, annualContribution, minimum, leave, paid, difference: paid === null ? null : minimum - paid };
    }

    const api = { cardDeduction, overtimePay, commercialLease, guaranteeFee, retirementContribution, LEASE_LIMITS };
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.StaticFinanceMath = api;
})(typeof globalThis === 'object' ? globalThis : this);
