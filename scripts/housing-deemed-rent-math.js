(function (global) {
    'use strict';

    const TAX_YEAR = 2026;
    const ANNUAL_RATE = 0.031;
    const TAXABLE_SHARE = 0.6;
    const DEPOSIT_DEDUCTION = 300000000;
    const HIGH_VALUE_PRICE = 1200000000;
    const HIGH_VALUE_DEPOSIT_THRESHOLD = 1200000000;
    const SMALL_HOME_PRICE = 200000000;
    const SMALL_HOME_AREA = 40;
    const YEAR_START = Date.UTC(TAX_YEAR, 0, 1);
    const YEAR_END = Date.UTC(TAX_YEAR + 1, 0, 1);
    const DAY_MS = 86400000;
    const YEAR_DAYS = (YEAR_END - YEAR_START) / DAY_MS;

    function numberInRange(value, name, min, max) {
        const number = Number(value);
        if (!Number.isFinite(number) || number < min || number > max) {
            throw new Error(`${name} 범위를 확인해 주세요.`);
        }
        return number;
    }

    function dateInYear(value, name) {
        const text = String(value || '');
        if (!/^2026-\d{2}-\d{2}$/.test(text)) throw new Error(`${name}은 2026년 날짜여야 합니다.`);
        const [year, month, day] = text.split('-').map(Number);
        const timestamp = Date.UTC(year, month - 1, day);
        if (timestamp < YEAR_START || timestamp >= YEAR_END ||
            new Date(timestamp).toISOString().slice(0, 10) !== text) {
            throw new Error(`${name}이 올바르지 않습니다.`);
        }
        return timestamp;
    }

    function calculateHousingDeemedRent({ houses, filingMethod = 'estimate', financialIncome = 0 }) {
        if (!Array.isArray(houses) || houses.length < 1 || houses.length > 10) {
            throw new Error('주택은 1~10채 입력해 주세요.');
        }
        if (!['estimate', 'books'].includes(filingMethod)) throw new Error('신고 방식을 확인해 주세요.');
        const claimedFinancialIncome = numberInRange(financialIncome, '금융수익', 0, 1000000000000);
        const normalized = houses.map((house, houseIndex) => {
            const publicPrice = numberInRange(house.publicPrice, `주택 ${houseIndex + 1} 기준시가`, 1, 1000000000000);
            const areaSqm = numberInRange(house.areaSqm, `주택 ${houseIndex + 1} 전용면적`, 0.01, 10000);
            if (!Array.isArray(house.periods) || house.periods.length < 1 || house.periods.length > 20) {
                throw new Error(`주택 ${houseIndex + 1} 보증금 기간은 1~20개 입력해 주세요.`);
            }
            const periods = house.periods.map((period, periodIndex) => {
                const start = dateInYear(period.start, `주택 ${houseIndex + 1} 기간 ${periodIndex + 1} 시작일`);
                const end = dateInYear(period.end, `주택 ${houseIndex + 1} 기간 ${periodIndex + 1} 종료일`) + DAY_MS;
                const deposit = numberInRange(period.deposit, `주택 ${houseIndex + 1} 기간 ${periodIndex + 1} 보증금`, 0, 1000000000000);
                if (end <= start) throw new Error(`주택 ${houseIndex + 1} 보증금 기간의 종료일을 확인해 주세요.`);
                return { start, end, deposit };
            }).sort((a, b) => a.start - b.start);
            for (let index = 1; index < periods.length; index++) {
                if (periods[index].start < periods[index - 1].end) {
                    throw new Error(`주택 ${houseIndex + 1}의 보증금 기간이 겹칩니다.`);
                }
            }
            return {
                publicPrice,
                areaSqm,
                periods,
                small: areaSqm <= SMALL_HOME_AREA && publicPrice <= SMALL_HOME_PRICE,
                highValue: publicPrice > HIGH_VALUE_PRICE
            };
        });

        const eligibleHouses = normalized.filter(house => !house.small);
        const highValueHouses = eligibleHouses.filter(house => house.highValue);
        const rule = eligibleHouses.length >= 3 ? 'three-or-more' :
            highValueHouses.length >= 2 ? 'high-value-two' : 'not-eligible';
        const countedHouses = rule === 'high-value-two' ? highValueHouses : eligibleHouses;
        const boundaries = new Set([YEAR_START, YEAR_END]);
        countedHouses.forEach(house => house.periods.forEach(period => {
            boundaries.add(period.start);
            boundaries.add(period.end);
        }));
        const sortedBoundaries = [...boundaries].sort((a, b) => a - b);
        const segments = [];
        let grossImputedRent = 0;
        let depositDayTotal = 0;
        let taxableBaseDays = 0;

        for (let index = 0; index < sortedBoundaries.length - 1; index++) {
            const start = sortedBoundaries[index];
            const end = sortedBoundaries[index + 1];
            const days = (end - start) / DAY_MS;
            const depositTotal = countedHouses.reduce((sum, house) => {
                const active = house.periods.find(period => period.start <= start && start < period.end);
                return sum + (active ? active.deposit : 0);
            }, 0);
            if (depositTotal === 0) continue;
            const threshold = rule === 'high-value-two' ? HIGH_VALUE_DEPOSIT_THRESHOLD : DEPOSIT_DEDUCTION;
            const taxableBase = rule !== 'not-eligible' && depositTotal > threshold
                ? depositTotal - DEPOSIT_DEDUCTION : 0;
            const imputedRent = Math.floor(taxableBase * days * TAXABLE_SHARE * ANNUAL_RATE / YEAR_DAYS);
            depositDayTotal += depositTotal * days;
            taxableBaseDays += taxableBase * days;
            grossImputedRent += imputedRent;
            segments.push({
                start: new Date(start).toISOString().slice(0, 10),
                end: new Date(end - DAY_MS).toISOString().slice(0, 10),
                days, depositTotal, taxableBase, imputedRent
            });
        }

        const appliedFinancialIncome = filingMethod === 'books'
            ? Math.min(grossImputedRent, claimedFinancialIncome) : 0;
        return {
            taxYear: TAX_YEAR,
            annualRate: ANNUAL_RATE,
            taxableShare: TAXABLE_SHARE,
            depositDeduction: DEPOSIT_DEDUCTION,
            highValuePrice: HIGH_VALUE_PRICE,
            highValueDepositThreshold: HIGH_VALUE_DEPOSIT_THRESHOLD,
            rule,
            totalHouses: normalized.length,
            eligibleHouseCount: eligibleHouses.length,
            highValueHouseCount: highValueHouses.length,
            smallHouseCount: normalized.length - eligibleHouses.length,
            depositDayTotal,
            taxableBaseDays,
            grossImputedRent,
            appliedFinancialIncome,
            deemedRent: Math.max(0, grossImputedRent - appliedFinancialIncome),
            filingMethod,
            segments
        };
    }

    global.HousingDeemedRentMath = Object.freeze({
        TAX_YEAR, ANNUAL_RATE, TAXABLE_SHARE, DEPOSIT_DEDUCTION,
        HIGH_VALUE_PRICE, HIGH_VALUE_DEPOSIT_THRESHOLD,
        SMALL_HOME_PRICE, SMALL_HOME_AREA,
        calculateHousingDeemedRent
    });
})(typeof window !== 'undefined' ? window : globalThis);
