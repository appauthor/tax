(function (global) {
    'use strict';

    // 국세청 국세통계연보 4-2-15 시·군·구별 근로소득 연말정산 신고현황(주소지)
    // 평균 총급여는 시도별 과세대상 근로소득 급여총계를 신고 인원으로 나눈 뒤 만원 단위로 반올림했다.
    const rows = [
        ['서울', 50490000], ['세종', 49970000], ['울산', 49510000], ['경기', 44110000],
        ['충남', 42620000], ['대전', 41200000], ['충북', 40510000], ['광주', 40110000],
        ['전남', 40050000], ['경북', 39860000], ['경남', 39550000], ['대구', 39200000],
        ['부산', 39140000], ['인천', 39050000], ['전북', 37720000], ['강원', 37600000],
        ['제주', 36480000]
    ].map(([region, averageGrossPay], index) => Object.freeze({
        region,
        averageGrossPay,
        rank: index + 1
    }));

    global.SalaryRegionTable = Object.freeze({
        sourceName: '국세청 국세통계연보 4-2-15 시·군·구별 근로소득 연말정산 신고현황(주소지)',
        incomeYear: 2023,
        checkedDate: '2026-09-28',
        sourceUrl: 'https://tasis.nts.go.kr/',
        basis: '주소지 기준 과세대상 근로소득 신고자의 급여총계 ÷ 신고 인원',
        nationalAverage: 43320000,
        rows: Object.freeze(rows)
    });
})(typeof window !== 'undefined' ? window : globalThis);
