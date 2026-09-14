(function (global) {
    'use strict';
    function rank(products, options) {
        if (!['deposit', 'installment'].includes(options.kind) || !['base', 'maximum'].includes(options.rateMode)) throw new RangeError('상품 종류와 금리 기준을 선택하세요.');
        const months = Number(options.months), amount = Number(options.amount);
        if (![6, 12, 24].includes(months)) throw new RangeError('지원하는 가입기간은 6·12·24개월입니다.');
        if (!Number.isFinite(amount) || amount <= 0 || amount > 1e11) throw new RangeError('비교 금액은 0원 초과 1,000억 원 이하로 입력하세요.');
        if (!['all', 'bank', 'savings-bank'].includes(options.sector)) throw new RangeError('금융권을 선택하세요.');
        const query = String(options.query || '').trim().toLocaleLowerCase('ko-KR');
        const rows = products.filter(p => p.kind === options.kind && p.months === months && (options.sector === 'all' || p.sector === options.sector) && (!query || `${p.company} ${p.name}`.toLocaleLowerCase('ko-KR').includes(query)) && (p.maxLimit === null || p.maxLimit === 0 || amount <= p.maxLimit)).map(p => {
            const rate = options.rateMode === 'maximum' ? p.maxRate : p.baseRate;
            if (!Number.isFinite(rate) || rate < 0 || rate > 100 || !['simple', 'monthly-compound'].includes(p.method)) throw new RangeError('공시 금리 데이터를 확인할 수 없습니다.');
            const interest = global.InvestmentTaxMath.calculateSavingsInterest({ productType: options.kind, amount, annualRate: rate / 100, months, interestMethod: p.method });
            return { ...p, appliedRate: rate, ...interest };
        });
        rows.sort((a, b) => b.netInterest - a.netInterest || a.company.localeCompare(b.company, 'ko') || a.id.localeCompare(b.id));
        // Equal projected interest shares a rank; do not manufacture a preference between ties.
        let previous = null, position = 0;
        return rows.map((p, i) => {
            const key = Math.round(p.netInterest);
            if (key !== previous) position = i + 1;
            previous = key;
            return { ...p, rank: position };
        });
    }
    function freshness(collectedAt, now = Date.now()) {
        const time = Date.parse(collectedAt);
        if (!Number.isFinite(time) || time > now + 86400000) return 'invalid';
        return now - time > 7 * 86400000 ? 'stale' : 'current';
    }
    global.SavingsRankMath = Object.freeze({ rank, freshness });
})(typeof window !== 'undefined' ? window : globalThis);
