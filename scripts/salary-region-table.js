(function (global) {
    'use strict';

    // 국세청 국세통계연보 4-2-15 시·군·구별 근로소득 연말정산 신고현황(주소지)
    // 평균 총급여는 시도별 과세대상근로소득(총급여) 금액을 해당 신고 인원으로 나눈 뒤 만원 단위로 반올림했다.
    const rows = [
        ['서울', 52530000], ['울산', 51500000], ['세종', 51490000], ['경기', 45670000],
        ['충남', 43920000], ['대전', 42530000], ['충북', 41620000], ['광주', 41390000],
        ['전남', 41220000], ['경남', 41200000], ['경북', 41090000], ['인천', 40630000],
        ['부산', 40530000], ['대구', 40490000], ['전북', 38760000], ['강원', 38710000],
        ['제주', 37570000]
    ].map(([region, averageGrossPay], index) => Object.freeze({
        region,
        averageGrossPay,
        rank: index + 1
    }));

    global.SalaryRegionTable = Object.freeze({
        sourceName: '국세청 국세통계연보 4-2-15 시·군·구별 근로소득 연말정산 신고현황(주소지)',
        incomeYear: 2024,
        checkedDate: '2026-10-01',
        sourceUrl: 'https://tasis.nts.go.kr/websquare/websquare.html?nbsp=&w2xPath=/ui/ep/e/a/UTWEPEAA02.xml&sttPblYr=2025&sttsMtaInfrId=20250103D01202541132',
        basis: '주소지 기준 과세대상근로소득(총급여) 금액 ÷ 해당 신고 인원',
        nationalAverage: 44870000,
        rows: Object.freeze(rows)
    });
})(typeof window !== 'undefined' ? window : globalThis);
