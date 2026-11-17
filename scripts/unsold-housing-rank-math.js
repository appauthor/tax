(function (global) {
    'use strict';
    function compare(data, input) {
        if (!data || !Array.isArray(data.regions) || data.regions.length !== 16 || new Set(data.regions.map(r => r.name)).size !== 16) throw new RangeError('공식 지역별 미분양 자료를 확인할 수 없습니다.');
        if (!['total', 'completed', 'share', 'change'].includes(input.metric)) throw new RangeError('정렬 기준을 선택하세요.');
        for (const key of ['total', 'completed']) {
            if (!Array.isArray(data.national[key]) || data.national[key].length !== 6 || !data.national[key].every(n => Number.isSafeInteger(n) && n >= 0)) throw new RangeError('전국 통계가 올바르지 않습니다.');
            for (let i = 0; i < 6; i++) {
                if (!data.regions.every(r => Array.isArray(r[key]) && r[key].length === 6 && Number.isSafeInteger(r[key][i]) && r[key][i] >= 0) || data.regions.reduce((sum, r) => sum + r[key][i], 0) !== data.national[key][i]) throw new RangeError('지역별 미분양 합계가 공식 전국값과 다릅니다.');
            }
        }
        const rows = data.regions.map(row => {
            if (row.completed.some((n, i) => n > row.total[i])) throw new RangeError('준공 후 미분양은 전체 미분양을 넘을 수 없습니다.');
            return { ...row, count: row.total[5], finished: row.completed[5], share: row.total[5] ? row.completed[5] / row.total[5] * 100 : 0, change: row.total[5] - row.total[4], completedChange: row.completed[5] - row.completed[4] };
        });
        const metricValue = r => ({ total: r.count, completed: r.finished, share: r.share, change: r.change })[input.metric];
        rows.sort((a, b) => metricValue(b) - metricValue(a) || a.name.localeCompare(b.name, 'ko'));
        rows.forEach((row, i) => { row.rank = i && metricValue(row) === metricValue(rows[i - 1]) ? rows[i - 1].rank : i + 1; });
        const selected = rows.find(r => r.name === input.region);
        if (!selected) throw new RangeError('확인할 지역을 선택하세요.');
        return { rows, selected, metric: input.metric };
    }
    global.UnsoldHousingRankMath = Object.freeze({ compare });
})(typeof window !== 'undefined' ? window : globalThis);
