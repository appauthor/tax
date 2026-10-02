(function (global) {
    'use strict';
    function compare(data, options) {
        if (!data || !/^\d{4}-\d{2}$/.test(data.referenceMonth) || !Array.isArray(data.regions) || data.regions.length !== 17) throw new RangeError('공식 시도별 통계 자료를 확인할 수 없습니다.');
        const names = new Set();
        const rows = data.regions.map(row => {
            if (typeof row.name !== 'string' || names.has(row.name) || !Number.isFinite(row.medianPerSqm) || row.medianPerSqm <= 0) throw new RangeError('지역 통계가 올바르지 않습니다.');
            names.add(row.name);
            return { ...row };
        }).sort((a, b) => b.medianPerSqm - a.medianPerSqm || a.name.localeCompare(b.name, 'ko'));
        let previous = null, rank = 0;
        rows.forEach((row, index) => { if (row.medianPerSqm !== previous) rank = index + 1; row.rank = rank; previous = row.medianPerSqm; });
        const selected = rows.find(row => row.name === options.region);
        if (!selected) throw new RangeError('비교할 시도를 선택하세요.');
        const hasPrice = options.price !== '' && options.price !== null && options.price !== undefined;
        const hasArea = options.area !== '' && options.area !== null && options.area !== undefined;
        if (hasPrice !== hasArea) throw new RangeError('내 거래가격과 전용면적을 함께 입력하거나 모두 비워 주세요.');
        let personal = null;
        if (hasPrice) {
            const price = Number(options.price), area = Number(options.area);
            if (!Number.isSafeInteger(price) || price <= 0 || price > 1000000000000) throw new RangeError('거래가격은 0원 초과 1조 원 이하로 입력하세요.');
            if (!Number.isFinite(area) || area <= 0 || area > 1000) throw new RangeError('전용면적은 0㎡ 초과 1,000㎡ 이하로 입력하세요.');
            const perSqm = price / area / 10000;
            personal = { price, area, perSqm, difference: perSqm - selected.medianPerSqm, ratio: perSqm / selected.medianPerSqm };
        }
        return { rows, selected, national: data.national, personal };
    }
    global.ApartmentTransactionRegionRankMath = Object.freeze({ compare });
})(typeof window !== 'undefined' ? window : globalThis);
