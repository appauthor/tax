(function (global) {
    'use strict';

    global.NicheMarketData = Object.freeze({
        nationalPension: Object.freeze({
            amountBandsAsOf: '2026-03-31',
            amountBands: Object.freeze([
                Object.freeze({ min: 0, max: 200000, label: '20만원 미만', recipients: 505245 }),
                Object.freeze({ min: 200000, max: 400000, label: '20만원 이상 40만원 미만', recipients: 2202670 }),
                Object.freeze({ min: 400000, max: 600000, label: '40만원 이상 60만원 미만', recipients: 1376798 }),
                Object.freeze({ min: 600000, max: 800000, label: '60만원 이상 80만원 미만', recipients: 824300 }),
                Object.freeze({ min: 800000, max: 1000000, label: '80만원 이상 100만원 미만', recipients: 492349 }),
                Object.freeze({ min: 1000000, max: null, label: '100만원 이상', recipients: 1114491 })
            ]),
            regionsAsOf: '2026-04-30',
            regions: Object.freeze([
                Object.freeze({ region: '울산', averageMonthlyBenefit: 853333 }),
                Object.freeze({ region: '세종', averageMonthlyBenefit: 701737 }),
                Object.freeze({ region: '서울', averageMonthlyBenefit: 688639 }),
                Object.freeze({ region: '경기', averageMonthlyBenefit: 680601 }),
                Object.freeze({ region: '인천', averageMonthlyBenefit: 657325 }),
                Object.freeze({ region: '경남', averageMonthlyBenefit: 646741 }),
                Object.freeze({ region: '대전', averageMonthlyBenefit: 642483 }),
                Object.freeze({ region: '부산', averageMonthlyBenefit: 630017 }),
                Object.freeze({ region: '경북', averageMonthlyBenefit: 613899 }),
                Object.freeze({ region: '광주', averageMonthlyBenefit: 613395 }),
                Object.freeze({ region: '충북', averageMonthlyBenefit: 611340 }),
                Object.freeze({ region: '대구', averageMonthlyBenefit: 602110 }),
                Object.freeze({ region: '강원', averageMonthlyBenefit: 597482 }),
                Object.freeze({ region: '제주', averageMonthlyBenefit: 596049 }),
                Object.freeze({ region: '충남', averageMonthlyBenefit: 592632 }),
                Object.freeze({ region: '전남', averageMonthlyBenefit: 558735 }),
                Object.freeze({ region: '전북', averageMonthlyBenefit: 557867 })
            ]),
            sourceName: '국민연금공단 급여지급 통계',
            amountSourceUrl: 'https://www.nps.or.kr/pnsinfo/statistics/getOHAF0116M0.do',
            regionSourceUrl: 'https://www.nps.or.kr/pnsinfo/statistics/getOHAF0119M0.do'
        }),
        regionalHealthInsurance: Object.freeze({
            asOf: '2023-12-31',
            releasedAt: '2024-12-12',
            nationalAverage: 92144,
            rows: Object.freeze([
                Object.freeze({ region: '서울', averageMonthlyPremium: 121000 }),
                Object.freeze({ region: '경기', averageMonthlyPremium: 105000 }),
                Object.freeze({ region: '세종', averageMonthlyPremium: 104000 }),
                Object.freeze({ region: '인천', averageMonthlyPremium: 90000 }),
                Object.freeze({ region: '제주', averageMonthlyPremium: 89000 }),
                Object.freeze({ region: '대구', averageMonthlyPremium: 86000 }),
                Object.freeze({ region: '부산', averageMonthlyPremium: 86000 }),
                Object.freeze({ region: '울산', averageMonthlyPremium: 85000 }),
                Object.freeze({ region: '대전', averageMonthlyPremium: 84000 }),
                Object.freeze({ region: '광주', averageMonthlyPremium: 79000 }),
                Object.freeze({ region: '충남', averageMonthlyPremium: 75000 }),
                Object.freeze({ region: '충북', averageMonthlyPremium: 74000 }),
                Object.freeze({ region: '강원', averageMonthlyPremium: 73000 }),
                Object.freeze({ region: '경남', averageMonthlyPremium: 72000 }),
                Object.freeze({ region: '경북', averageMonthlyPremium: 66000 }),
                Object.freeze({ region: '전북', averageMonthlyPremium: 64000 }),
                Object.freeze({ region: '전남', averageMonthlyPremium: 57000 })
            ]),
            valuesRoundedTo: 1000,
            sourceName: '국민건강보험공단 2023년 지역별 의료이용 통계연보',
            sourceUrl: 'https://kiri.or.kr/PDF/weeklytrend/20241223/trend20241223_1.pdf'
        })
    });
})(typeof window !== 'undefined' ? window : globalThis);
