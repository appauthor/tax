(function (root, factory) {
    'use strict';
    const math = factory();
    if (typeof module === 'object' && module.exports) module.exports = math;
    else root.PracticalFinanceMath = math;
})(typeof globalThis === 'object' ? globalThis : this, function () {
    'use strict';

    const DAY = 86400000;
    const DAILY_DEDUCTION = 150000;
    const MINIMUM_WITHHOLDING = 1000;
    const JEONSE_CAP_RATE = 5;
    const currencies = Object.freeze({ USD: '미국 달러', JPY: '일본 엔', EUR: '유로', CNY: '중국 위안', GBP: '영국 파운드', AUD: '호주 달러' });

    function dateTime(value) {
        if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return NaN;
        const ms = Date.parse(value + 'T00:00:00Z');
        return Number.isFinite(ms) && new Date(ms).toISOString().slice(0, 10) === value ? ms : NaN;
    }
    function dateString(ms) { return new Date(ms).toISOString().slice(0, 10); }

    function dailyWorkerTax(dailyPay, days) {
        // 6% less the 55% employee credit. Keep fractions until the payment event.
        const dailyTax = Math.max(0, dailyPay - DAILY_DEDUCTION) * 27 / 1000;
        function payment(computed, count) {
            const national = computed < MINIMUM_WITHHOLDING ? 0 : Math.floor(computed / 10) * 10;
            const local = Math.floor(national / 100) * 10;
            return { national: national * count, local: local * count, net: dailyPay * days - (national + local) * count };
        }
        return {
            gross: dailyPay * days, dailyTax,
            daily: payment(dailyTax, days), grouped: payment(dailyTax * days, 1)
        };
    }

    function proratedSalary({ month, salary, start, end, paidDays, paidDaysWorked }) {
        const from = dateTime(start);
        const through = dateTime(end);
        const monthStart = dateTime(month + '-01');
        if (!Number.isFinite(monthStart) || !Number.isFinite(from) || !Number.isFinite(through)) {
            throw new RangeError('급여 기준 월과 재직 시작·종료일을 확인해 주세요.');
        }
        if (through < from) throw new RangeError('재직 종료일을 재직 시작일 이후로 입력해 주세요.');
        const first = new Date(monthStart);
        first.setUTCMonth(first.getUTCMonth() + 1);
        const monthDays = (first.getTime() - monthStart) / DAY;
        const calendarDays = Math.max(0, (Math.min(through, first.getTime() - DAY) - Math.max(from, monthStart)) / DAY + 1);
        if (!calendarDays) throw new RangeError('입력한 재직기간에 해당하는 급여 기준 월을 선택해 주세요.');
        if ((paidDays === null) !== (paidDaysWorked === null)) {
            throw new RangeError('유급일수 기준으로 비교하려면 두 유급일수를 모두 입력해 주세요.');
        }
        if (paidDays !== null && (paidDays > monthDays || paidDaysWorked > calendarDays || paidDaysWorked > paidDays)) {
            throw new RangeError('월 전체 유급일수는 그달 일수 이하여야 합니다. 재직기간 유급일수는 재직일수와 월 전체 유급일수 이하로 입력해 주세요.');
        }
        return {
            monthDays, calendarDays,
            calendarPay: Math.round(salary * calendarDays / monthDays),
            paidDayPay: paidDays === null ? null : Math.round(salary * paidDaysWorked / paidDays)
        };
    }

    function shutdownAllowance({ average, ordinary, days, paidPerDay }) {
        if (average <= 0 || ordinary <= 0) throw new RangeError('1일 평균임금과 통상임금을 각각 0원보다 큰 금액으로 입력해 주세요.');
        const usual = average * 0.7;
        const minimum = Math.min(usual, ordinary);
        return {
            usual, minimum, total: minimum * days,
            supplement: Math.max(0, minimum - paidPerDay) * days
        };
    }

    function revolvingInterest({ carried, newPurchases, excluded, rate, days, dayBasis, payRatio, compareRatio, floor }) {
        const principal = carried + newPurchases;
        const interest = Math.floor(carried * rate * days / (dayBasis * 100));
        const project = ratio => {
            const paidPrincipal = Math.min(principal, Math.max(floor, Math.floor(principal * ratio / 100)));
            return { ratio, paidPrincipal, bill: paidPrincipal + interest + excluded, remaining: principal - paidPrincipal };
        };
        return { principal, interest, current: project(payRatio), compared: project(compareRatio) };
    }

    function jeonseRenewal({ previous, proposed, capRate }) {
        if (capRate > JEONSE_CAP_RATE) throw new RangeError('비교 상한은 5% 이하로 입력해 주세요.');
        const limit = previous + Math.floor(previous * capRate / 100);
        return { increase: proposed - previous, rate: (proposed - previous) / previous * 100, limit, excess: Math.max(0, proposed - limit) };
    }

    function rankOptions(options, getMetrics, compareBy, descending = false) {
        const ranked = options.map(option => ({ name: option.name, ...getMetrics(option) }));
        ranked.sort((a, b) => (a[compareBy] - b[compareBy]) * (descending ? -1 : 1));
        let rank = 0;
        return ranked.map((option, index) => {
            if (!index || option[compareBy] !== ranked[index - 1][compareBy]) rank = index + 1;
            return { ...option, rank };
        });
    }

    function mvnoCosts({ offer, regular, months, oneTime }, period) {
        const discounted = Math.min(months, period);
        const after = period - discounted;
        return { total: discounted * offer + after * regular + oneTime, discounted, after };
    }

    function chargingCosts({ firstRate, secondRate, fee }, firstKwh, secondKwh) {
        const firstCost = Math.round(firstKwh * firstRate);
        const secondCost = Math.round(secondKwh * secondRate);
        return { firstCost, secondCost, fee, total: firstCost + secondCost + fee };
    }

    function rentalCosts({ monthly, prepaid, deposit, refund, returnFee, buyout, transfer }, period) {
        if (refund > deposit) throw new RangeError('돌려받을 보증금이 처음 낸 보증금보다 클 수 없습니다.');
        const initial = prepaid + deposit;
        const base = monthly * period + initial - refund;
        return { initial, returning: base + returnFee, buying: base + buyout + transfer };
    }

    function cardRewards({ firstRate, secondRate, thirdRate, threshold, eligibleSpend, cap, annualFee }, firstSpend, secondSpend, thirdSpend, otherSpend) {
        const spend = firstSpend + secondSpend + thirdSpend + otherSpend;
        if (eligibleSpend > spend) throw new RangeError('실적 인정액을 한 달 결제액 이하로 입력해 주세요.');
        const qualified = eligibleSpend >= threshold;
        const raw = Math.floor((firstSpend * firstRate + secondSpend * secondRate + thirdSpend * thirdRate) / 100);
        const monthly = qualified ? Math.min(raw, cap) : 0;
        const annual = monthly * 12 - annualFee;
        return { qualified, monthly, annual, effective: annual / (spend * 12) * 100 };
    }

    function currencyChanges(series, period) {
        const observations = new Map();
        for (const point of series) {
            if (point.base !== 'KRW' || !Object.hasOwn(currencies, point.quote) ||
                typeof point.rate !== 'number' || !Number.isFinite(point.rate) || point.rate <= 0 ||
                !Number.isFinite(dateTime(point.date))) continue;
            if (!observations.has(point.date)) observations.set(point.date, new Map());
            observations.get(point.date).set(point.quote, 1 / point.rate);
        }
        const codes = Object.keys(currencies);
        const dates = [...observations.keys()].filter(date => observations.get(date).size === codes.length).sort();
        const latest = dates[dates.length - 1];
        if (!latest) throw new RangeError('6개 통화의 공통 기준일을 확인하지 못했습니다.');
        const end = dateTime(latest);
        let boundary = end - 7 * DAY;
        if (period === 'month') {
            const shifted = new Date(end);
            const day = shifted.getUTCDate();
            shifted.setUTCDate(1);
            const last = new Date(shifted);
            last.setUTCDate(0);
            last.setUTCDate(Math.min(day, last.getUTCDate()));
            boundary = last.getTime();
        }
        const start = dates.findLast(date => dateTime(date) <= boundary);
        if (!start || boundary - dateTime(start) > 7 * DAY) throw new RangeError('비교 시작일의 공통 환율이 부족합니다.');
        const rows = rankOptions(codes.map(code => ({ code, name: currencies[code] })), option => {
            const previous = observations.get(start).get(option.code);
            const current = observations.get(latest).get(option.code);
            return { code: option.code, previous, current, change: (current / previous - 1) * 100 };
        }, 'change', true);
        return { start, latest, rows };
    }

    return {
        dailyWorkerTax, proratedSalary, shutdownAllowance, revolvingInterest, jeonseRenewal,
        rankOptions, mvnoCosts, chargingCosts, rentalCosts, cardRewards, currencyChanges, dateString, currencies
    };
});
