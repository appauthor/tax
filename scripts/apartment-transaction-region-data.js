(function (global) {
    'use strict';
    // R-ONE '(월) 지역별 매매 중위가격_아파트', 2026년 7월, 단위 만원/㎡.
    // 2026-10-02 원표 확인. 전국·권역·생활권·전남광주 통합행은 시도 순위에서 제외.
    global.ApartmentTransactionRegionData = Object.freeze({
        referenceMonth: '2026-07', reviewedAt: '2026-10-02', unit: '만원/㎡',
        sourceUrl: 'https://www.reb.or.kr/r-one/portal/stat/easyStatPage/A_2024_00189.do',
        national: 541.9,
        regions: Object.freeze([
            ['서울', 1341.6], ['전남', 250.4], ['광주', 365.5], ['부산', 493.0],
            ['대구', 416.1], ['인천', 538.7], ['대전', 467.7], ['울산', 426.8],
            ['세종', 671.0], ['경기', 691.2], ['강원', 275.2], ['충북', 302.8],
            ['충남', 270.6], ['전북', 268.1], ['경북', 244.1], ['경남', 321.4], ['제주', 423.8]
        ].map(row => Object.freeze({ name: row[0], medianPerSqm: row[1] })))
    });
})(typeof window !== 'undefined' ? window : globalThis);
