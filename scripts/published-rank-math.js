(function (root) {
    'use strict';

    function rank(rows, ascending = false) {
        const direction = ascending ? 1 : -1;
        let rankNumber = 0;
        let previous;
        return [...rows].sort((a, b) => direction * (a.value - b.value) || a.name.localeCompare(b.name, 'ko'))
            .map((row, index) => {
                if (row.value !== previous) rankNumber = index + 1;
                previous = row.value;
                return { ...row, rank: rankNumber };
            });
    }

    function apartment(input, data) {
        const area = Number(input.area);
        if (!Number.isFinite(area) || area <= 0 || area > 1000) throw new RangeError('전용면적은 0㎡ 초과 1,000㎡ 이하로 입력하세요.');
        const ownFee = input.ownFee;
        if (ownFee !== null && (!Number.isSafeInteger(ownFee) || ownFee < 0)) throw new RangeError('공용관리비는 0 이상의 원 단위로 입력하세요.');
        const rows = rank(data.regions.map(([name, value]) => ({ name, value, referenceFee: value * area })));
        const selected = rows.find(row => row.name === input.region);
        if (!selected) throw new RangeError('비교 지역을 선택하세요.');
        return { rows, selected, area, ownFee, difference: ownFee === null ? null : ownFee - selected.referenceFee };
    }

    function electricVehicle(input, data) {
        const model = data.models.find(item => item.id === input.model);
        if (!model) throw new RangeError('전기차 세부 모델을 선택하세요.');
        const rows = rank(model.amounts.map(([government, local, value], index) => ({
            name: data.regions[index], government, local, value
        })));
        const selected = rows.find(row => row.name === input.region);
        if (!selected) throw new RangeError('비교할 지자체를 선택하세요.');
        return { model, rows, selected, gapToHighest: rows[0].value - selected.value };
    }

    const schoolKey = name => name.replace(/\s/g, '').toLocaleLowerCase('ko-KR');
    function tuition(input, data) {
        const rows = rank(data.schools.filter(([, region, type]) =>
            (input.region === '' || region === input.region) && (input.type === '' || type === input.type))
            .map(([name, region, type, value]) => ({ name, region, type, value })), input.order === 'low');
        const query = schoolKey(input.school ?? '');
        const visible = query ? rows.filter(row => schoolKey(row.name).includes(query)) : rows;
        const pageSize = 25;
        const pageCount = Math.max(1, Math.ceil(visible.length / pageSize));
        const requestedPage = Number(input.page ?? 1);
        if (!Number.isInteger(requestedPage) || requestedPage < 1) throw new RangeError('결과 표 페이지는 1 이상 정수로 입력하세요.');
        const page = Math.min(requestedPage, pageCount);
        return {
            population: rows.length, matches: visible.length, page, pageCount,
            first: rows[0], visible: visible.slice((page - 1) * pageSize, page * pageSize)
        };
    }

    const api = { apartment, electricVehicle, tuition };
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.PublishedRankMath = api;
})(typeof globalThis === 'object' ? globalThis : this);
