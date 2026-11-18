# 직접 입력 계산기와 공표 자료 비교

검토일은 2026-11-18이다. 5개 계산기는 일반적인 입력 조건의 법정 산식·요율을 브라우저에서 적용한다. 3개 순위는 `src/data/`에 저장한 원표를 빌드 시 HTML과 필터 데이터에 함께 반영한다. 방문자 입력과 필터 동작에는 외부 데이터 요청이나 인증키가 필요 없다.

## 공식 계산 기준

| 계산기 | 검토 범위와 기준 | 공식 근거 |
| --- | --- | --- |
| 신용카드 소득공제 | 2026년 사용분, 2027년 초 정산. 공제대상 사용액만 입력하며 저율부터 최저사용금액을 차감한다. 총급여 7천만원 경계, 적격 자녀·손자녀 0·1·2명 이상 일반 한도, 지정 항목 추가 한도를 적용한다. 전체 환급 및 소득공제 종합한도는 연말정산 도구와 연결한다. | [조세특례제한법 제126조의2](https://www.law.go.kr/법령/조세특례제한법/제126조의2) · [시행령 제121조의2](https://www.law.go.kr/법령/조세특례제한법시행령/제121조의2) · [국회예산정책처 2026 대한민국 조세](https://korea.nabo.go.kr/board/file/down.do?fid=33319156) |
| 연장·야간·휴일근로수당 | 상시 5인 이상, 일반 성인, 단일 근무와 한 번의 휴게. 일 8시간과 주 40시간 기준으로 법정 연장을 찾되 같은 실근로에 일반 연장과 휴일 가산을 중복 적용하지 않는다. 휴일 8시간 경계, 22:00~06:00 가산, 자정을 넘는 근무를 구분한다. | [근로기준법 제50조](https://www.law.go.kr/법령/근로기준법/제50조) · [제56조](https://www.law.go.kr/법령/근로기준법/제56조) |
| 상가 환산보증금 | 보증금과 월 차임 100배를 합산하고 소재지의 9억·6.9억·5.4억·3.7억원 기준과 비교한다. 주소별 과밀억제권역과 광역시 군 지역 예외를 안내한다. 계약별 대항력과 우선변제 판정은 별도다. | [상가건물 임대차보호법 제2조](https://www.law.go.kr/법령/상가건물임대차보호법/제2조) · [시행령 제2조](https://www.law.go.kr/법령/상가건물임대차보호법시행령/제2조) |
| HUG 전세보증금 반환보증료 | 신규 일반 전세, 전액 보증. 주택가격에 90%를 적용한 주택가액을 분모로 하고, 보증금·주택유형·70% 및 80% 경계별 요율과 선순위채권 50% 초과 10% 할증을 적용한다. 선택한 할인 전후를 보여 준다. 권역별 보증금 상한·채권 비율은 가입의 일부 금액 요건이다. | [HUG 반환보증](https://khug.or.kr/hug/web/ig/dr/igdr000001.jsp?tabMenu=Y) · [2026 업무안내](https://www.khug.or.kr/ebook_2026/catImage/3/khug_2026.pdf) |
| DC형 퇴직연금 부담금 | 1년 일반 산정의 회사 최소 부담금, 입력 납입액 차이. 육아휴직 등 확인된 제외기간이 있으면 통상 근무기간 지급 임금을 근무 개월 수로 나누고, 연 1회 발생 기준 임금은 12로 나눠 합산한다. 임금성 판단과 기간 조정이 필요한 첫해·퇴사연도·전 기간 휴직은 별도 확인 대상이다. | [근로자퇴직급여 보장법 제20조](https://www.law.go.kr/법령/근로자퇴직급여보장법/제20조) · [고용노동부 임금 범위](https://1350.moel.go.kr/rtmview.do?id=1000308980) · [휴직·상여금 산식](https://1350.moel.go.kr/rtmview.do?id=1000285111) |

계산식은 `scripts/static-finance-math.js`, 화면 처리는 `scripts/static-finance-calculators.js`다. 순위 정렬·필터는 각각 `scripts/published-rank-math.js`와 `scripts/published-rank-pages.js`에 있다. 동점은 공동순위다. 등록금 학교명 검색은 표시 행만 필터링한다.

### HUG 주택가격 입력과 보증료 할인

2026-11-18 재검토. HUG가 실제 적용하는 시세·심사 기준 가격을 그대로 입력하거나, 공시가격·기준시가를 적용하는 주택에서 원본을 입력해 140%를 환산한다. 담보인정비율 90%는 두 경우 모두 그 이후 적용한다. 적용할 원천 가격은 주택 유형과 HUG의 산정 순서로 확인한다. [HUG 가격 기준](https://www.khug.or.kr/hug/web/ig/dr/igdr000001.jsp?tabMenu=Y)

사회배려계층 40% 또는 60%는 부부 무주택과 선택 기준을 충족한 항목 하나다. 전자계약 3%, 모바일 신청 3%, 일시납 3%는 별도 선택이다. 공식 안내는 개별 할인율과 사회배려계층 내부 중복 배제를 명시한다. 모든 채널의 조합과 최종 적용 방식까지 공개돼 있지 않아, 계산기는 할증을 포함한 보증료의 잔액에 하나씩 곱하는 방식으로 동시 선택을 추정하고 실제 적용은 HUG와 신청 채널에서 확인하도록 표시한다. 이미 납부한 보증료에 대한 국토교통부 지원사업은 예상 납부액에서 차감하지 않는다. [HUG 요율 공지](https://www.khug.or.kr/khmb/m/cc/nn/ccnn000002.jsp?idx=35430&tabIdx=1) · [제출서류](https://www.khug.or.kr/hug/web/ig/dr/igdr000002.jsp?tabMenu=Y) · [모바일HUG](https://onestop.khug.or.kr/webView/webBiz/apply/goods001)

기존 페이지의 제목·설명·본문과 결과 표기를 기능에 맞췄다. [네이버 콘텐츠 마크업](https://searchadvisor.naver.com/guide/markup-content)과 [Google 사용자 중심 콘텐츠](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)를 2026-11-18 재확인했다. 실제 채널 결제와 배포 뒤 색인은 별도 확인 대상이다.

## 저장 자료의 확인 범위

- 공용관리비는 [K-apt 지역별 평균](https://www.k-apt.go.kr/apiinfo/goApiInfoBySido.do)에서 2026년 9월 발생월·아파트 유형을 선택했다. 브라우저 원표의 공용관리비 행 17개 값을 추출값과 대조했다. 전국 1,422원/㎡는 순위에서 제외하고 전남·광주 합산 열을 그대로 둔다. 비교 대상은 16개 지역이며 서울은 1,714원/㎡로 전용 84㎡의 환산액은 143,976원이다.
- 전기차는 [무공해차 통합누리집](https://ev.or.kr/nportal/buySupprt/initPsLocalCarPirceAction.do)에서 아이오닉5 스탠다드 19인치와 모델 Y Premium RWD를 정확히 선택하고, 8개 지자체에서 국비·지방비·소계를 대조했다. 16행 모두 국비와 지방비의 합이 원표 소계와 같다. 보조금 신청 시점의 예산과 추가 지원금을 별도로 안내한다.
- 등록금은 [한국장학재단 2026-05-19 원본 CSV](https://www.data.go.kr/data/3071171/fileData.do) 총 382행 중 ‘대학’ 216행을 확인했다. 0원 공시 두 행을 제외한 214개 대학의 중복 없음과 최저·최고값을 확인했다. 원격대학 등 원표 ‘대학’ 유형이 함께 들어 있고, 공시는 4월 기준 연간 평균이다.

## 검색 최적화 적용과 검증

- 2026-11-18에 네이버 [콘텐츠 마크업](https://searchadvisor.naver.com/guide/markup-content), [콘텐츠 품질](https://searchadvisor.naver.com/guide/content-basic), [JavaScript](https://searchadvisor.naver.com/guide/seo-advanced-javascript), [이동경로](https://searchadvisor.naver.com/guide/structured-data-breadcrumb) 및 Google [SEO 기본 가이드](https://developers.google.com/search/docs/fundamentals/seo-starter-guide), [사용자 중심 콘텐츠](https://developers.google.com/search/docs/fundamentals/creating-helpful-content), [수집 가능한 링크](https://developers.google.com/search/docs/crawling-indexing/links-crawlable), [사이트맵](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)를 확인했다.
- 페이지별 제목·설명·H1과 고유 canonical, 웹도구 및 이동경로 구조화 데이터, 개별 OG/Twitter 이미지, 카테고리와 관련 도구 링크를 적용했다. 계산 예시, 공식 출처, 순위 기초 표를 생성 HTML에서 읽을 수 있다. 배포 후 수집·색인·게재순위 측정은 이번 검증에 포함되지 않는다.
- 계산 5종의 경계, 순위 세 집단·동점·학교 필터의 회귀 검사를 추가했다. Chrome 320px에서 8개 페이지의 HTTP 200, 키보드 계산·결과 포커스, 오류 숨김과 입력 변경 후 결과 무효화, 순위 표 좌우 스크롤을 검증했다. 1,360px에서 페이지 너비를 재확인했다. 카드 공제와 전기차 순위의 실제 PNG/PDF 파일 시그니처를 확인했으며, 공유는 브라우저의 호출과 파일 MIME을 대역으로 검사했다.
