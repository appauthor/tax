(function (global) {
    'use strict';
    function rank(products, options) {
        if (!Array.isArray(products)) throw new RangeError('공시 자료를 확인할 수 없습니다.');
        const amount = Number(options.amount), years = Number(options.years);
        if (!Number.isFinite(amount) || amount <= 0 || amount > 1e11) throw new RangeError('대출금액은 0원 초과 1,000억 원 이하로 입력하세요.');
        if (!Number.isInteger(years) || years < 1 || years > 50) throw new RangeError('상환기간은 1~50년으로 입력하세요.');
        if (!['average', 'minimum', 'maximum'].includes(options.rateMode)) throw new RangeError('금리 비교 기준을 선택하세요.');
        if (!['all', 'bank', 'savings-bank', 'insurance'].includes(options.sector)) throw new RangeError('금융권을 선택하세요.');
        if (!['all', 'C', 'F'].includes(options.rateType) || !['all', 'D1', 'D2', 'S'].includes(options.repayment)) throw new RangeError('금리·상환 방식을 선택하세요.');
        const key = { average: 'avgRate', minimum: 'minRate', maximum: 'maxRate' }[options.rateMode];
        const query = String(options.query || '').trim().toLocaleLowerCase('ko-KR');
        const rows = products.filter(p =>
            (options.sector === 'all' || p.sector === options.sector) &&
            (options.rateType === 'all' || p.rateType === options.rateType) &&
            (options.repayment === 'all' || p.repayment === options.repayment) &&
            (!query || `${p.company} ${p.name}`.toLocaleLowerCase('ko-KR').includes(query)) &&
            p[key] !== null && p[key] !== undefined
        ).map(p => {
            const rate = Number(p[key]);
            if (!Number.isFinite(rate) || rate < 0 || rate > 100) throw new RangeError('공시 금리가 올바르지 않습니다.');
            const method = { D1: 'equal-principal', D2: 'equal-payment', S: 'bullet' }[p.repayment];
            if (!method) throw new RangeError('공시 상환방식이 올바르지 않습니다.');
            const schedule = global.LoanMath.createSchedule({ principal: amount, annualRate: rate, months: years * 12, method });
            return { ...p, appliedRate: rate, firstPayment: schedule.firstPayment,
                totalInterest: schedule.totalInterest, totalPayment: schedule.totalPayment };
        });
        rows.sort((a, b) => a.appliedRate - b.appliedRate || a.company.localeCompare(b.company, 'ko') || a.id.localeCompare(b.id));
        let previous = null, position = 0;
        return rows.map((row, index) => {
            if (row.appliedRate !== previous) position = index + 1;
            previous = row.appliedRate;
            return { ...row, rank: position };
        });
    }
    function freshness(collectedAt, now = Date.now()) {
        const time = Date.parse(collectedAt);
        if (!Number.isFinite(time) || time > now + 86400000) return 'invalid';
        return now - time > 7 * 86400000 ? 'stale' : 'current';
    }
    global.MortgageRateRankMath = Object.freeze({ rank, freshness });
})(typeof window !== 'undefined' ? window : globalThis);
