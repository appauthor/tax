(function (global) {
    'use strict';
    // R-ONE '(월) 지역별 매매 중위가격_아파트', 2026년 8월, 단위 만원/㎡.
    // 2026-10-29 원표 확인. 전국·권역·생활권·전남광주 통합행은 시도 순위에서 제외.
    global.ApartmentTransactionRegionData = Object.freeze({
        referenceMonth: '2026-08', reviewedAt: '2026-10-29', unit: '만원/㎡',
        sourceUrl: 'https://www.reb.or.kr/r-one/portal/stat/easyStatPage/A_2024_00189.do',
        national: 501.8,
        regions: Object.freeze([
            ['서울', 1280.1], ['전남', 241.3], ['광주', 375.4], ['부산', 492.4],
            ['대구', 416.0], ['인천', 531.0], ['대전', 466.9], ['울산', 391.8],
            ['세종', 688.9], ['경기', 649.0], ['강원', 271.0], ['충북', 293.2],
            ['충남', 262.6], ['전북', 247.3], ['경북', 239.4], ['경남', 306.8], ['제주', 417.5]
        ].map(row => Object.freeze({ name: row[0], medianPerSqm: row[1] })))
    });
})(typeof window !== 'undefined' ? window : globalThis);
