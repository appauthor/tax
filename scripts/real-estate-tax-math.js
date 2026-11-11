(function (global) {
    'use strict';

    // Reviewed 2026-11-11. Enacted 2026 rules only; see real-estate-calculation-notes.md.
    const ONE_HOME_LIMIT = 1200000000;
    const BASIC_DEDUCTION = 2500000;
    const SURCHARGE_PAUSE_END = '2026-05-09';
    const BRACKETS = [
        { limit: 14000000, rate: 0.06, deduction: 0 },
        { limit: 50000000, rate: 0.15, deduction: 1260000 },
        { limit: 88000000, rate: 0.24, deduction: 5760000 },
        { limit: 150000000, rate: 0.35, deduction: 15440000 },
        { limit: 300000000, rate: 0.38, deduction: 19940000 },
        { limit: 500000000, rate: 0.40, deduction: 25940000 },
        { limit: 1000000000, rate: 0.42, deduction: 35940000 },
        { limit: Infinity, rate: 0.45, deduction: 65940000 }
    ];

    function number(value, label, positive = false) {
        const result = Number(value);
        if (value == null || String(value).trim() === '' || !Number.isFinite(result) || result < 0 || result > Number.MAX_SAFE_INTEGER || (positive && result === 0)) {
            throw new RangeError(`${label}을(를) ${positive ? '0보다 큰' : '0 이상의'} 숫자로 입력해 주세요.`);
        }
        return result;
    }

    function standardAcquisitionRate(price) {
        number(price, '취득가액');
        if (price <= 600000000) return 0.01;
        if (price > 900000000) return 0.03;
        // Local Tax Act 11(1)8: round the calculated decimal rate at its fifth place.
        // Algebraically equivalent integer-won form avoids a floating-point tie at x.xxx05.
        return Math.round((price - 450000000) / 1500000) / 10000;
    }

    function acquisitionRate(price, type) {
        if (type === 'second') return 0.08;
        if (type === 'third') return 0.12;
        if (type !== 'standard') throw new RangeError('취득 상황에 맞는 세율 구분을 선택해 주세요.');
        return standardAcquisitionRate(price);
    }

    function calculateAcquisition(input) {
        const price = number(input.price, '취득가액', true);
        const rate = acquisitionRate(price, input.type);
        const educationRate = input.type === 'standard' ? rate / 10 : 0.004;
        const ruralRate = input.overNationalHousingSize ? (rate === 0.12 ? 0.01 : rate === 0.08 ? 0.006 : 0.002) : 0;
        const amount = (r) => Math.floor(price * Math.round(r * 1000000) / 1000000);
        const acquisitionTax = amount(rate);
        const localEducationTax = amount(educationRate);
        const specialRuralTax = amount(ruralRate);
        return { price, acquisitionRate: rate, educationRate, ruralRate, acquisitionTax, localEducationTax, specialRuralTax,
            total: acquisitionTax + localEducationTax + specialRuralTax };
    }

    function progressiveTax(base) {
        number(base, '과세표준');
        const bracket = BRACKETS.find((item) => base <= item.limit);
        return Math.max(0, base * bracket.rate - bracket.deduction);
    }

    function longTermDeductionRate(type, holdYears, residenceYears, surchargeRate = 0) {
        if (holdYears < 3 || surchargeRate > 0) return 0;
        if (type === 'oneHome' && residenceYears >= 2) {
            return Math.min(0.8, Math.min(10, Math.floor(holdYears)) * 0.04 + Math.min(10, Math.floor(residenceYears)) * 0.04);
        }
        return Math.min(0.3, Math.floor(holdYears) * 0.02);
    }

    function transferIncomeTax(base, holdYears, surchargeRate = 0) {
        const regular = progressiveTax(base) + base * surchargeRate;
        const shortRate = holdYears < 1 ? 0.7 : holdYears < 2 ? 0.6 : 0;
        return Math.max(regular, base * shortRate);
    }

    function calculateTransfer(input) {
        const salePrice = number(input.salePrice, '양도가액', true);
        const purchasePrice = number(input.purchasePrice, '취득가액', true);
        const expenses = number(input.expenses ?? 0, '필요경비');
        const holdYears = number(input.holdYears, '보유기간');
        const residenceYears = number(input.residenceYears, '거주기간');
        if (holdYears > 100 || residenceYears > holdYears) throw new RangeError('보유기간은 100년 이하, 거주기간은 보유기간 이하로 입력해 주세요.');
        const type = input.houseType;
        if (!['general', 'shortTerm', 'oneHome', 'multi2', 'multi3'].includes(type)) throw new RangeError('양도 주택의 과세 구분을 선택해 주세요.');
        const date = input.transferDate;
        if (!/^2026-\d{2}-\d{2}$/.test(date || '') || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) {
            throw new RangeError('양도일을 2026년의 실제 날짜로 입력해 주세요. 다른 연도는 지원하지 않습니다.');
        }
        if (type === 'oneHome' && (!input.oneHomeConfirmed || holdYears < 2)) {
            throw new RangeError('일반 1세대 1주택 비과세는 2년 이상 보유와 세대·거주 요건 확인이 필요합니다. 2년 미만 특례는 이 계산기에서 제외합니다.');
        }
        const basicDeduction = number(input.basicDeduction ?? BASIC_DEDUCTION, '기본공제');
        if (![0, BASIC_DEDUCTION].includes(basicDeduction)) throw new RangeError('기본공제는 250만원 또는 미적용 중 선택해 주세요.');
        const multiHome = type === 'multi2' || type === 'multi3';
        const pauseApplied = multiHome && holdYears >= 2 && date <= SURCHARGE_PAUSE_END;
        const exclusionApplied = multiHome && input.surchargeExcluded === true;
        const surchargeRate = multiHome && !pauseApplied && !exclusionApplied ? (type === 'multi2' ? 0.2 : 0.3) : 0;
        const gain = Math.max(0, salePrice - purchasePrice - expenses);
        const taxableGain = type === 'oneHome' ? gain * Math.max(0, salePrice - ONE_HOME_LIMIT) / salePrice : gain;
        const deductionRate = longTermDeductionRate(type, holdYears, residenceYears, surchargeRate);
        const longTermDeduction = Math.floor(taxableGain * deductionRate);
        const transferIncome = Math.max(0, Math.floor(taxableGain - longTermDeduction));
        const taxBase = Math.max(0, transferIncome - basicDeduction);
        const incomeTax = Math.floor(transferIncomeTax(taxBase, holdYears, surchargeRate));
        const localIncomeTax = Math.floor(incomeTax * 0.1);
        const shortRate = holdYears < 1 ? 0.7 : holdYears < 2 ? 0.6 : 0;
        const shortApplied = shortRate > 0 && taxBase * shortRate >= progressiveTax(taxBase) + taxBase * surchargeRate;
        const bracket = BRACKETS.find((item) => taxBase <= item.limit);
        const rateLabel = taxBase === 0 ? '과세표준 없음' : shortApplied ? `단기 보유 ${shortRate * 100}%` : `기본세율 ${Math.round(bracket.rate * 100)}%${surchargeRate ? ` + 중과 ${surchargeRate * 100}%p` : ''} 구간`;
        return { salePrice, purchasePrice, expenses, holdYears, residenceYears, transferDate: date, gain, taxableGain,
            longTermDeductionRate: deductionRate, longTermDeduction, transferIncome, basicDeduction, taxBase, incomeTax,
            localIncomeTax, total: incomeTax + localIncomeTax, surchargeRate, pauseApplied, exclusionApplied,
            isOneHomeExempt: type === 'oneHome' && salePrice <= ONE_HOME_LIMIT, rateLabel };
    }

    global.RealEstateTaxMath = { standardAcquisitionRate, acquisitionRate, calculateAcquisition, progressiveTax,
        longTermDeductionRate, transferIncomeTax, calculateTransfer };
})(typeof window !== 'undefined' ? window : globalThis);
