# 공시·통계 페이지 점검과 업데이트 승인

검토일: 2026-10-29 (한국시간). 이 문서는 향후 **다른 페이지를 추가하거나 사이트를 수정할 때** 함께 살펴봐야 할 시한성 데이터의 목록과 승인 절차다. 데이터 갱신 여부를 점검하는 행위는 읽기 작업이며, 다른 페이지의 수치·수집일·SEO 검토일·사이트맵을 바꾸는 것은 별도 변경으로 취급한다.

## 점검 대상

| 페이지 | 현재 기준 | 공식 원천과 소스 파일 | 다시 확인할 때 |
| --- | --- | --- | --- |
| `mortgage-rate-rank.html` | 2026-10-29 수집, 공시월 2026-10 | [금융감독원 주택담보대출 비교공시](https://finlife.fss.or.kr/finlife/ldng/houseMrtg/list.do?menuNo=700007), `scripts/mortgage-rate-data.js`, `tools/refresh-mortgage-rates.py` | 수집 7일 경과 또는 새 공시월. 7일 경과는 경고 기준이며 자동 갱신·실시간 조회를 뜻하지 않는다. |
| `regional-apartment-transaction-price-rank.html` | 2026-08 아파트 매매 실거래 중위가격, 2026-10-29 검토 | [한국부동산원 R-ONE 월별 지역별 매매 중위가격](https://www.reb.or.kr/r-one/portal/stat/easyStatPage/A_2024_00189.do), `scripts/apartment-transaction-region-data.js` | [공동주택 실거래가격지수 공표일정](https://www.reb.or.kr/r-one/portal/compose/scheduleStatsPage.do)의 매월 15일 이후, 16~20일 원표의 새 기준월을 확인한다. 시도 17개·단위 만원/㎡·전국값을 검증하고 승인 뒤 수동 갱신한다. |
| `savings-rate-rank.html` | 2026-10-29 수집, 최신 공시월 2026-10 | [금융감독원 정기예금](https://finlife.fss.or.kr/finlife/svings/fdrmDpst/list.do?menuNo=700002)·[적금](https://finlife.fss.or.kr/finlife/svings/fdrmEnty/list.do?menuNo=700003), `scripts/savings-rank-data.js`, `tools/refresh-savings-rates.py` | 수집 7일 경과 또는 새 공시월. |
| `national-pension-benefit-rank.html` | 금액 구간 2026-06, 지역 평균 2026-04 | [국민연금공단 금액 구간](https://www.nps.or.kr/pnsinfo/statistics/getOHAF0116M0.do)·[지역](https://www.nps.or.kr/pnsinfo/statistics/getOHAF0119M0.do), `scripts/niche-market-data.js` | 공단이 각 표의 새 기준월을 공개할 때. 두 표의 기준월을 구분한다. |
| `regional-health-insurance-premium-ranking.html` | 2024년 말 | [국민건강보험공단 지역별 의료이용 통계연보](https://www.nhis.or.kr/nhis/together/wbhaec06900m01.do), `scripts/niche-market-data.js` | 다음 연도 통계연보 공개 시. 지역가입자 **세대당 월평균**과 전국 평균을 같은 표·단위로 대조한다. |
| `lifestyle-business-ranking.html` | 2026-08-31 | [국세청 100대 생활업종 가동사업자](https://www.data.go.kr/data/15061118/fileData.do), `scripts/lifestyle-business-data.js`, `tools/build-lifestyle-business-data.rb` | 공공데이터포털에 새 월 파일이 등록될 때. 100업종·16시도·전년동월 수치와 행 수를 검증한다. |
| `median-income-calculator.html` | 기본 2026년, 선택 2027년 | [보건복지부 기준 중위소득](https://www.mohw.go.kr/menu.es?mid=a10708010900), `scripts/median-income-math.js` | 새 연도 기준 공표 또는 적용연도 전환 시. 미래 기준을 현행값으로 자동 교체하지 않는다. |
| `salary-rank.html` | 전국·지역 모두 2024년 귀속 | [국세청 근로소득 백분위 자료](https://www.data.go.kr/data/15082063/fileData.do)·[국세통계포털 4-2-15 주소지 표](https://tasis.nts.go.kr/websquare/websquare.html?nbsp=&w2xPath=/ui/ep/e/a/UTWEPEAA02.xml&sttPblYr=2025&sttsMtaInfrId=20250103D01202541132), `scripts/salary-rank-table.js`, `scripts/salary-region-table.js` | 전국 파일 또는 주소지별 17개 시도 원표의 새 귀속연도가 나오면 각각 확인한다. 원표의 단위·귀속연도·17개 시도와 전국 합계를 검증한다. |
| `net-worth-rank.html` | 2025년 가계금융복지조사 | [국가데이터처 조사 발표](https://mods.go.kr/board.es?bid=215&mid=a10301040300), `scripts/net-worth-rank-math.js` | 다음 조사 발표 시. 조사연도와 자산 기준일을 따로 표시한다. |

`tax-rank.html`은 공식 개인 순위가 아닌 내부 참고 추정표이므로 새 통계 하나만으로 자동 보정하지 않는다. 세금·급여·보험 계산기의 법정 기준도 새 연도 또는 제도 개정이 있을 때 해당 계산 노트와 공식 근거를 확인한다. 데이터가 그대로여도 검토일을 오늘 날짜로 임의 변경하지 않는다.

2026-10-29 사용자 직접 요청으로 순위 데이터 갱신을 승인받아 다음 원자료를 후보 파일에서 검증한 뒤 반영했다. 공표 기준월과 확인일은 서로 다르며, 새 자료가 없는 페이지의 표시·검토일은 변경하지 않았다.

- 예금·적금: 금융감독원 2026-10 공시 2,470개 옵션. 예금 6/12/24개월 각각 517/666/445행, 적금 각각 233/323/286행으로 전체 공시 행 수·기간·금리 범위·중복 ID를 검증했다. 수집 시각은 데이터 파일의 UTC 값이며 한국시간 2026-10-29 수집이다.
- 주담대: 같은 금융감독원 원천의 2026-10 공시 281개 옵션. 원표 총 건수와 행 수, 아파트 유형, 금리·상환방식, 최저·최고 범위와 ID 중복을 검증했다.
- 국민연금: [금액별 원표](https://www.nps.or.kr/pnsinfo/statistics/getOHAF0116M0.do)의 2026-06 노령연금 수급자 수는 낮은 구간부터 500,627 / 2,232,289 / 1,403,909 / 843,966 / 506,712 / 1,151,101명, 합계 6,638,604명이다. 100만원 이상 비중은 약 17.3%, 80만원 구간 상위 범위는 약 17.3~25.0%다. 지역 원표의 `baseYYYYMM`은 여전히 `2026-04`이고 17개 지역 평균은 기존값과 같아 보존했다.
- 생활업종: [공공데이터포털](https://www.data.go.kr/data/15061118/fileData.do)에 2026-10-20 등록된 `국세청_사업자현황_100대 생활업종_20260831.csv`의 24,615개 데이터 행을 확인했다. 100개 업종·16개 시도·1,600개 집계 조합, 당월·전월·전년동월을 검증했으며 당월 공개값 합계는 3,135,116개다. 결과·내보내기의 기준월과 전년동월 안내는 `asOf`에서 생성하도록 수정했다.
- 아파트: [R-ONE 원표](https://www.reb.or.kr/r-one/portal/stat/easyStatPage/A_2024_00189.do)의 조회기간 정보 `dtaEnd=202608`, 열 머리글 `2026년 8월`·`만원/㎡`·`원자료`, 최신 열 `COL_202608100001OD`를 대조했다. 전체 26행 중 시도 17개를 추출했으며 전국 501.8, 서울 1,280.1, 세종 688.9, 경기 649.0만원/㎡다. 전국·권역·서울 생활권·전남광주 통합행은 순위에서 제외했다.
- 유지: 연봉 전국 분포 공식 CSV 109개 구간의 인원·총급여가 저장값과 일치했다. 주소지 표의 상세 조회는 접근 오류로 최신 여부를 확정하지 못했으며 기존 2024년 귀속값을 유지했다. 국가데이터처의 최신 가계금융복지조사 결과는 2025년 조사, 건강보험공단의 최신 지역별 의료이용 통계연보는 2024년 자료였다. 기준 중위소득은 적용연도 전환 시점이 아니므로 기존 2026년 기본 선택을 유지했다. 내부 추정 세금 순위는 자동 보정 대상이 아니다.

변경 범위는 위 5개 순위 페이지의 데이터·본문·결과 기준·검토일·구조화 데이터·캐시 버전과 관련 순위 허브의 아파트 기준월 설명이다. 해당 6개 URL의 sitemap `lastmod`만 갱신하고 RSS 발행 기록과 공개 URL은 유지했다. SEO·공개 계약 fixture는 이 의도된 표시 및 sitemap 변경을 검토한 뒤 갱신한다.

## 앞으로의 변경 절차

1. 페이지 추가·사이트 수정 시작 시 이 표의 기준월·수집일·공표 여부를 공식 원천에서 읽기 전용으로 확인한다. 새 자료가 없으면 본래 요청 작업만 진행한다.
2. **별도 페이지에 갱신이 필요하면**, 사용자에게 해당 페이지, 현재 기준과 새 기준, 공식 원천 링크, 바뀔 핵심 수치·표시·SEO/사이트맵 범위, 검증 방법을 묶어 구체적인 변경안을 먼저 제시한다. 승인 전에는 그 페이지의 데이터와 표시·메타데이터를 수정하지 않는다. 본래 요청과 무관한 갱신 때문에 이미 승인된 다른 작업을 중단하지 않는다.
3. 사용자가 갱신을 승인하면 원본 후보를 별도 파일에서 수집·검증한 뒤 소스 파일, 본문, 결과 안내, 메타데이터의 날짜·문구를 함께 갱신한다. 사용자가 그 페이지의 업데이트를 직접 지시한 경우 그 지시를 승인으로 본다. 수집 실패·스키마 변경·표본 누락 때는 기존 스냅샷을 보존한다.
4. 내용이 실제로 달라진 페이지에만 사이트맵 `lastmod`를 변경한다. `npm run build`, 관련 테스트, `npm test`, `xmllint --noout sitemap.xml rss.xml`, `git diff --check`를 통과시키고 변경 기준일과 미해결 항목을 보고한다. 배포·자동 수집은 별도 작업이다.

이번에 추가한 지역별 아파트 순위의 첫 스냅샷은 사용자 요청 범위에 포함된다. 향후 별개 작업에서 발견하는 갱신에는 위 승인 절차를 적용한다.
