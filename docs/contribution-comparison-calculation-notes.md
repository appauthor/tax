# 기부·추납 계산기와 IRP·미분양 비교

검토일: 2026-11-17 (Asia/Seoul). 새 URL 네 개는 기존 연말정산 종합 계산, 연금 수령 시점 비교, IRP 세액공제, 아파트 거래가격 순위와 목적·입력이 다르다. 순위 진입이나 검색 유입을 보장하지 않는다.

## 고향사랑기부금

- `scripts/hometown-donation-math.js`, `hometown-donation-tax-credit-calculator.html`.
- 근거: [조세특례제한법 제58조](https://www.law.go.kr/법령/조세특례제한법/제58조), [지방세특례제한법 제167조의2](https://www.law.go.kr/법령/지방세특례제한법/제167조의2), [곡성군 현행 공식 안내](https://www.gokseong.go.kr/kr/subPage.do?menuNo=106005002000), [답례품 한도 시행령 제5조](https://www.law.go.kr/법령/고향사랑기부금에관한법률시행령/제5조).
- 2026-01-01 이후 일반 기부, 사업소득 없는 거주자만 지원. 한 사람의 1년 총액 2천만원 한도. 본인·거주자·주소지 외 적격 기부 요건 확인 전에는 실제 가능액을 계산하지 않는다.
- 국세: 첫 10만원 × 100/110 + 다음 10만원 × 40% + 20만원 초과 × 15%. 지방세는 국세 명목액의 10%. 지자체 안내의 지방세 포함 100%/44%/16.5%와 대조했다. 20만원→144,000원, 100만원→276,000원.
- 두 세목별 공제에 배정 가능한 한도를 사용자가 확인해 입력한다. 소득세는 min(명목국세, 국세한도), 지방세는 min(실제 국세공제×10%, 지방세한도). 국세 여력이 0이면 지방세만 공제하지 않는다. [현행 조문정보](https://law.go.kr/lsLinkCommonInfo.do?lsJoLnkSeq=1021964939)로 연동 기준을 대조했다. 기납부세액·환급액을 이 한도로 대체하지 않는다. 공제 적용 순서를 자동 결정하지 않는다. 답례품은 실제 가치 입력, 30% 상한, 현금 환급과 구분. 표시만 원 단위 반올림하므로 법정 고지 절사와 차이가 날 수 있다.
- 사업자 필요경비·특별재난지역 우대/혼합 기부·이월·2027년 귀속 개정은 제외. 이 예외 선택 시 일반 결과를 내지 않고 공식 확인을 안내한다.

## 국민연금 추납

- `scripts/pension-buyback-math.js`, `national-pension-buyback-calculator.html`.
- 근거: [추후납부](https://www.nps.or.kr/pnsinfo/ntpsklg/getOHAF0047M0.do?menuId=MN24001116), [기준소득월액](https://www.nps.or.kr/pnsinfo/ntpsklg/getOHAF0038M0.do?menuId=MN24001113&tab=tab5), [연도별 보험료율](https://www.nps.or.kr/pnsinfo/ntpsklg/getOHAF0016M0.do?menuId=MN24001108).
- 추정 범위는 2026-07~12 신청, 법정 납부기한 2026년 또는 2027년 1월. 신청월 결정 기준소득월액 41만~659만원, 최대 119개월. 일반 기준소득월액은 공단 결정 천원 단위 입력. 임의가입자 상한은 2026 신청월 A값 3,193,511원 적용.
- 원금 = 신청월 기준소득월액 × 납부기한월의 총 보험료율 × 개월. 2026년 9.5%, 2027년 10%. 사업장 기여금 절반을 추납 총 보험료율로 사용하지 않는다.
- 고지 총액 입력은 실제 절사·조정 및 다른 신청 시점의 고지에 사용. 최대 60회 분할납부는 공단 안내로 설명하되 미래 이자율·연금 증가액을 추정하지 않는다. 최종 고지액에 이미 포함된 이자를 다시 더하지 않게 안내한다.
- 공단 확인 전·후 동일 수령 조건의 월 연금 차이로 ceil(총비용/월 증가액). 200만원×9.5%×60=1,140만원, 월 증가 10만원이면 114개월. 65세 개시→74세 6개월. 차이 0이면 회수 시점 없음. 자격·수급권·실제 첫 지급일, 절세·세금·건보·기초연금·물가·할인율 제외.

## IRP 관리수수료

- `scripts/irp-fee-data.js`, `scripts/irp-fee-rank-math.js`, `irp-fee-rank.html`.
- 공식 원천은 데이터 파일의 각 회사 `source`. 국민은행 [수수료 공시](https://okbfex.kbstar.com/quics?page=C027737)와 [개인형IRP 공식 가이드](https://obank.kbstar.com/products/kb-irp-guide.html), 삼성증권 [현행 수수료표](https://www.samsungpop.com/ux/kor/pension/center/public/commission.pop)와 [다이렉트 조건 개정](https://www.samsungpop.com/mbw/customer/noticeEvent.do?MenuSeqNo=20829&af_auto_index=start&cmd=noticeView&currentPage=1&listRow=10&ntcSect=3&rowsPerPage=10&searchType=0&siteGubun=H24&sortColumn=ProcDTime2&sortType=DESC), 미래에셋 [설명서](https://securities.miraeasset.com/hki/hki3031/n81.do), KB증권 [2026-04-28 기준 수수료표](https://www.kbsec.com/go.able?linkcd=m08050019)를 대조했다. 삼성 표 재조회에서 502가 있었으나 검색 원문 표와 공식 계약 변경 공지를 함께 대조했다.
- 4개 회사만의 비교. 첫 계약연도, 만 40세 이상·연금수령 전 일반 상품, 단일 재원, 일정 평가액 1년 가정. 상품 비용은 별도이며 수익률을 수집·순위화하지 않는다.
- 삼성·미래에셋·KB증권의 운용/자산 체차 금액 구간, 국민은행 단일률 구간을 구분. 국민은행 개인납입금은 자산관리 연0.18% 선택 조건을 폼·본문·결과에 명시한다. 다른 신탁 계약 조건을 일반화하지 않는다.
- ‘비대면’ 선택은 삼성 다이렉트IRP, 미래에셋 다이렉트 관리점·전자매체 자기운용, KB증권 비대면 면제 계약을 전제한다. 온라인으로 영업점 관리 계약에 접속하는 것과 구분한다. 일반 대면 개인납입금은 삼성·KB증권 면제, 미래에셋 일반 요율. 특별 우대는 별도 확인한다.
- 동률은 1,1,1,4 방식 공동순위. 연 비용은 정확한 계산값으로 비교하고 표시 때 반올림. 디폴트옵션 성과 수수료, 장기·청년·수익/투자비중·기존 DB/DC 할인, 일별 잔액 변동, 과거 경과규정·혼합 재원 제외.

## 지역별 미분양

- `scripts/unsold-housing-data.js`, `scripts/unsold-housing-rank-math.js`, `regional-unsold-housing-rank.html`.
- [국토교통부 2026년 9월 주택통계(KDI 공식 재게재)](https://eiec.kdi.re.kr/policy/materialView.do?num=288812&pg=1&pp=20&topic=L), PDF 참고9·10(20·21쪽). 공표 2026-10-30, 검토 2026-11-17. 원본 PDF SHA-256은 데이터의 `sourceSha256`에 기록. 원표 2쪽을 렌더링해 열 제목·지역 합산·단위·각 숫자를 눈으로 대조했다.
- 전체 주택 월말 재고, 아파트만/상가/오피스텔 통계가 아님. 전체 65,941호, 준공 후 27,549호. 전월 69,134호/28,080호. 준공 후는 전체의 부분집합이며 더하지 않는다.
- 원표 전남광주 합산 유지, 총16개 지역 묶음. 각 표 6개 기준시점(2022~2025 각12월·2026년8/9월)에서 지역 합계=전국, 준공후≤전체 검증. 비연속 시점을 월별 추이나 전년동월로 표현하지 않는다.
- 순위 선택: 전체 호수·준공 후 호수·준공 후/전체 비중·전체 전월 증가 호수 내림차순. 정밀값 동률 공동순위. 규모 보정 위험도, 지역 전체 주택 대비 비율, 투자 판단·단지 구매 가능성으로 해석하지 않는다.

## SEO·이미지·사용성 검증

- 2026-11-17 [Naver 제목·설명·OG](https://searchadvisor.naver.com/guide/markup-content), [canonical·robots](https://searchadvisor.naver.com/guide/markup-structure), [콘텐츠](https://searchadvisor.naver.com/guide/content-basic), [JS](https://searchadvisor.naver.com/guide/seo-advanced-javascript), [이동경로](https://searchadvisor.naver.com/guide/structured-data-breadcrumb)를 확인했다.
- 같은 날 Google [Search Essentials](https://developers.google.com/search/docs/essentials?hl=ko), [SEO 기본](https://developers.google.com/search/docs/fundamentals/seo-starter-guide?hl=ko), [사용자 중심 콘텐츠](https://developers.google.com/search/docs/fundamentals/creating-helpful-content?hl=ko), [수집 가능한 링크](https://developers.google.com/search/docs/crawling-indexing/links-crawlable?hl=ko), [구조화 데이터 정책](https://developers.google.com/search/docs/appearance/structured-data/sd-policies?hl=ko), [이미지](https://developers.google.com/search/docs/appearance/google-images?hl=ko)를 확인했다.
- 고유 title/H1/description, self-canonical, WebApplication·BreadcrumbList, index/follow, 정적 본문·FAQ·공식 근거·예시·기본 순위표, 허브·이용 안내 내부 링크, sitemap/RSS 일치. FAQ 리치 결과를 전제한 새 FAQPage는 추가하지 않았다.
- 새 512×512 PNG 4개는 `images/og/`의 각 페이지 slug. built-in image_gen으로 생성, sips 축소 후 비표시 메타데이터 제거. CRC·크기·IDAT 불변 검증, 최종 제목 검수. [별도 프롬프트](contribution-rank-og-prompts.md). 메타데이터 제거가 순위·썸네일을 보장하지 않는다.
- 기존 폼·여백·결과 패널·PNG/PDF/공유 유틸리티 재사용. 오류는 최초/해제 시 hidden, 조건 필드는 숨길 때 disabled, 수정/네이티브 invalid는 이전 결과 숨김. 순위 기본표는 정적 HTML로 제공하고 새 결과 표시 중 중복표를 숨긴다.
- Chrome 로컬 실화면에서 기부금·추납의 입력/결과, IRP 회사별 요약, 미분양 결과를 확인했다. 390px·320px 및 데스크톱에서 검토했고, 좁은 화면에서 순위 숫자가 과도하게 줄바꿈되는 것을 발견해 기존 `.loan-table-wrap .content-table` 패턴으로 보완했다. 실제 좌우 스와이프로 마지막 열을 확인했다. 200% 브라우저 확대·실물 모바일 기기는 별도 검증하지 않았다.
- 회귀: `tests/contribution-comparison.test.js`를 전체 npm test의 계산 회귀에 연결. DOM 통합은 `tests/contribution-comparison-dom.test.js`로 조건 분기·오류 computed style·결과 최신성·기본/변경 순위·PNG/PDF/공유와 비지원 다운로드 대체를 검증한다. 내보내기 라이브러리는 DOM 시험에서 스텁을 사용해 연결을 검증한다.
- 운영 배포·실제 색인·Naver/Google 계정 URL 검사·실사용 Core Web Vitals는 이번 로컬 제작 범위에서 실행하지 않았다. 도구가 측정하지 않은 성능 달성값을 주장하지 않는다.

### 완료 검증 기록

- `npm run build`, `npm run docs:sync` 완료. 계산기 69개·순위 12개·HTML/sitemap 98개.
- `npm test` 전체 통과: context, 재빌드 일치, URL/SEO 계약, 기존·신규 계산 회귀, 공시 데이터 시험, 정적 사이트 검사.
- `node tests/contribution-comparison-dom.test.js /tmp/taxyou-dom-qa/node_modules/jsdom` 통과. 임시 시험 의존성만 사용하고 운영 라이브러리는 추가하지 않았다.
- `xmllint --noout sitemap.xml rss.xml`, `git diff --check` 통과. 로컬 새 URL 4개 HTTP 200.
- 계약 변경은 새 URL 4개와 메인/순위/이용 안내 허브 3개만 검토·승인했다. 기존 계산기 URL·계산·데이터 계약은 바꾸지 않았다. 커밋·푸시·배포는 실행하지 않았다.
