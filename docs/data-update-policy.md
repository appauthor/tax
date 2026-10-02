# 공시·통계 페이지 점검과 업데이트 승인

검토일: 2026-10-02 (한국시간). 이 문서는 향후 **다른 페이지를 추가하거나 사이트를 수정할 때** 함께 살펴봐야 할 시한성 데이터의 목록과 승인 절차다. 데이터 갱신 여부를 점검하는 행위는 읽기 작업이며, 다른 페이지의 수치·수집일·SEO 검토일·사이트맵을 바꾸는 것은 별도 변경으로 취급한다.

## 점검 대상

| 페이지 | 현재 기준 | 공식 원천과 소스 파일 | 다시 확인할 때 |
| --- | --- | --- | --- |
| `mortgage-rate-rank.html` | 2026-10-01 수집, 공시월 2026-09 | [금융감독원 주택담보대출 비교공시](https://finlife.fss.or.kr/finlife/ldng/houseMrtg/list.do?menuNo=700007), `scripts/mortgage-rate-data.js`, `tools/refresh-mortgage-rates.py` | 수집 7일 경과 또는 새 공시월. 7일 경과는 경고 기준이며 자동 갱신·실시간 조회를 뜻하지 않는다. |
| `regional-apartment-transaction-price-rank.html` | 2026-07 아파트 매매 실거래 중위가격, 2026-10-02 검토 | [한국부동산원 R-ONE 월별 지역별 매매 중위가격](https://www.reb.or.kr/r-one/portal/stat/easyStatPage/A_2024_00189.do), `scripts/apartment-transaction-region-data.js` | [공동주택 실거래가격지수 공표일정](https://www.reb.or.kr/r-one/portal/compose/scheduleStatsPage.do)의 매월 15일 이후, 16~20일 원표의 새 기준월을 확인한다. 시도 17개·단위 만원/㎡·전국값을 검증하고 승인 뒤 수동 갱신한다. |
| `savings-rate-rank.html` | 2026-10-01 수집, 최신 공시월 2026-09 | [금융감독원 정기예금](https://finlife.fss.or.kr/finlife/svings/fdrmDpst/list.do?menuNo=700002)·[적금](https://finlife.fss.or.kr/finlife/svings/fdrmEnty/list.do?menuNo=700003), `scripts/savings-rank-data.js`, `tools/refresh-savings-rates.py` | 수집 7일 경과 또는 새 공시월. |
| `national-pension-benefit-rank.html` | 금액 구간 2026-05, 지역 평균 2026-04 | [국민연금공단 금액 구간](https://www.nps.or.kr/pnsinfo/statistics/getOHAF0116M0.do)·[지역](https://www.nps.or.kr/pnsinfo/statistics/getOHAF0119M0.do), `scripts/niche-market-data.js` | 공단이 각 표의 새 기준월을 공개할 때. 두 표의 기준월을 구분한다. |
| `regional-health-insurance-premium-ranking.html` | 2024년 말 | [국민건강보험공단 지역별 의료이용 통계연보](https://www.nhis.or.kr/nhis/together/wbhaec06900m01.do), `scripts/niche-market-data.js` | 다음 연도 통계연보 공개 시. 지역가입자 **세대당 월평균**과 전국 평균을 같은 표·단위로 대조한다. |
| `lifestyle-business-ranking.html` | 2026-07-31 | [국세청 100대 생활업종 가동사업자](https://www.data.go.kr/data/15061118/fileData.do), `scripts/lifestyle-business-data.js`, `tools/build-lifestyle-business-data.rb` | 공공데이터포털에 새 월 파일이 등록될 때. 100업종·16시도·전년동월 수치와 행 수를 검증한다. |
| `median-income-calculator.html` | 기본 2026년, 선택 2027년 | [보건복지부 기준 중위소득](https://www.mohw.go.kr/menu.es?mid=a10708010900), `scripts/median-income-math.js` | 새 연도 기준 공표 또는 적용연도 전환 시. 미래 기준을 현행값으로 자동 교체하지 않는다. |
| `salary-rank.html` | 전국·지역 모두 2024년 귀속 | [국세청 근로소득 백분위 자료](https://www.data.go.kr/data/15082063/fileData.do)·[국세통계포털 4-2-15 주소지 표](https://tasis.nts.go.kr/websquare/websquare.html?nbsp=&w2xPath=/ui/ep/e/a/UTWEPEAA02.xml&sttPblYr=2025&sttsMtaInfrId=20250103D01202541132), `scripts/salary-rank-table.js`, `scripts/salary-region-table.js` | 전국 파일 또는 주소지별 17개 시도 원표의 새 귀속연도가 나오면 각각 확인한다. 원표의 단위·귀속연도·17개 시도와 전국 합계를 검증한다. |
| `net-worth-rank.html` | 2025년 가계금융복지조사 | [국가데이터처 조사 발표](https://mods.go.kr/board.es?bid=215&mid=a10301040300), `scripts/net-worth-rank-math.js` | 다음 조사 발표 시. 조사연도와 자산 기준일을 따로 표시한다. |

`tax-rank.html`은 공식 개인 순위가 아닌 내부 참고 추정표이므로 새 통계 하나만으로 자동 보정하지 않는다. 세금·급여·보험 계산기의 법정 기준도 새 연도 또는 제도 개정이 있을 때 해당 계산 노트와 공식 근거를 확인한다. 데이터가 그대로여도 검토일을 오늘 날짜로 임의 변경하지 않는다.

2026-10-02 읽기 전용 점검에서 국민연금공단 [금액별 급여수급자 현황](https://www.nps.or.kr/pnsinfo/statistics/getOHAF0116M0.do)의 새 2026년 6월 표를 확인했다. `national-pension-benefit-rank.html`은 아직 2026년 5월 금액 구간을 사용하며, 사용자 승인 전에는 해당 페이지의 데이터·본문·SEO 날짜를 바꾸지 않는다. 지역 평균 원표는 2026년 4월 기준으로 확인했다.

## 앞으로의 변경 절차

1. 페이지 추가·사이트 수정 시작 시 이 표의 기준월·수집일·공표 여부를 공식 원천에서 읽기 전용으로 확인한다. 새 자료가 없으면 본래 요청 작업만 진행한다.
2. **별도 페이지에 갱신이 필요하면**, 사용자에게 해당 페이지, 현재 기준과 새 기준, 공식 원천 링크, 바뀔 핵심 수치·표시·SEO/사이트맵 범위, 검증 방법을 묶어 구체적인 변경안을 먼저 제시한다. 승인 전에는 그 페이지의 데이터와 표시·메타데이터를 수정하지 않는다. 본래 요청과 무관한 갱신 때문에 이미 승인된 다른 작업을 중단하지 않는다.
3. 사용자가 갱신을 승인하면 원본 후보를 별도 파일에서 수집·검증한 뒤 소스 파일, 본문, 결과 안내, 메타데이터의 날짜·문구를 함께 갱신한다. 사용자가 그 페이지의 업데이트를 직접 지시한 경우 그 지시를 승인으로 본다. 수집 실패·스키마 변경·표본 누락 때는 기존 스냅샷을 보존한다.
4. 내용이 실제로 달라진 페이지에만 사이트맵 `lastmod`를 변경한다. `npm run build`, 관련 테스트, `npm test`, `xmllint --noout sitemap.xml rss.xml`, `git diff --check`를 통과시키고 변경 기준일과 미해결 항목을 보고한다. 배포·자동 수집은 별도 작업이다.

이번에 추가한 지역별 아파트 순위의 첫 스냅샷은 사용자 요청 범위에 포함된다. 향후 별개 작업에서 발견하는 갱신에는 위 승인 절차를 적용한다.
