(function (global) {
    'use strict';
    const RULES = Object.freeze({ year: 2026, donationLimit: 20000000, firstBand: 100000, secondBand: 200000, secondRate: 0.4, generalRate: 0.15, giftRate: 0.3 });
    function money(value, label, max = 1000000000000) {
        if (value === '' || value === null || value === undefined || !Number.isSafeInteger(Number(value)) || Number(value) < 0) throw new RangeError(`${label}: 빈칸 없이 0 이상의 원 단위 숫자를 입력하세요.`);
        if (Number(value) > max) throw new RangeError(`${label}: ${max.toLocaleString('ko-KR')}원 이하로 입력하세요.`);
        return Number(value);
    }
    function calculate(input) {
        const donation = money(input.donation, '올해 기부금 합계', RULES.donationLimit);
        if (!['general', 'business', 'disaster'].includes(input.scope)) throw new RangeError('기부·소득 유형을 선택하세요.');
        if (input.scope !== 'general') throw new RangeError(input.scope === 'business' ? '사업소득이 있으면 10만원 초과분의 필요경비 처리 등을 별도로 확인해야 합니다. 이 도구는 사업소득 없는 거주자의 일반 기부만 계산합니다.' : '특별재난지역 기부는 선포일·기부일·혼합 기부에 따라 달라 일반 기부 계산에서 제외합니다.');
        const gift = money(input.gift, '답례품 금액');
        if (gift > donation * RULES.giftRate) throw new RangeError('답례품 금액은 기부금의 30% 이내로 입력하세요. 추가 이벤트 경품은 이 계산에서 제외합니다.');
        const bands = [Math.min(donation, RULES.firstBand), Math.min(Math.max(0, donation - RULES.firstBand), RULES.secondBand - RULES.firstBand), Math.max(0, donation - RULES.secondBand)];
        const incomeCredit = bands[0] * 100 / 110 + bands[1] * RULES.secondRate + bands[2] * RULES.generalRate;
        const localCredit = incomeCredit * 0.1;
        let actual = null;
        if (input.useTaxLimit && input.confirmed) {
            const income = Math.min(incomeCredit, money(input.incomeLimit, '공제에 사용할 소득세 한도'));
            // 지방세특례제한법 167조의2: 실제 소득세 공제액의 10%에 지방세 한도 적용.
            const local = Math.min(income * 0.1, money(input.localLimit, '공제에 사용할 지방소득세 한도'));
            actual = { income, local, total: income + local, unused: incomeCredit + localCredit - income - local, cashCost: donation - income - local };
        }
        return { donation, gift, bands, incomeCredit, localCredit, nominal: incomeCredit + localCredit, actual, confirmed: !!input.confirmed, nominalCashCost: donation - incomeCredit - localCredit };
    }
    global.HometownDonationMath = Object.freeze({ RULES, calculate });
})(typeof window !== 'undefined' ? window : globalThis);
