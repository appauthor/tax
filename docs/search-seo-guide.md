# 네이버·구글 SEO 제작 기준

공식 문서 확인일: 2026-11-11 (한국시간). 새 계산기 제작과 SEO 변경 시 적용한다. 작업 시작 때 아래 양쪽 공식 문서와 변경하려는 항목의 세부 지침을 다시 확인하고, 달라진 규칙은 이 문서에 반영한다. 확인일만 갱신하지 말고 확인한 링크·적용 내용·검증 한계를 해당 계산 노트나 변경 내역에 기록한다.

## 공식 기준

| 구분 | 확인할 공식 문서 |
| --- | --- |
| 네이버 기본·고급 | [웹마스터 가이드](https://searchadvisor.naver.com/guide), [제목·설명·OG](https://searchadvisor.naver.com/guide/markup-content), [canonical·robots](https://searchadvisor.naver.com/guide/markup-structure) |
| 네이버 수집·콘텐츠 | [JavaScript](https://searchadvisor.naver.com/guide/seo-advanced-javascript), [색인·HTTP 상태](https://searchadvisor.naver.com/guide/seo-advanced-indexing), [콘텐츠 품질](https://searchadvisor.naver.com/guide/content-basic), [이동경로](https://searchadvisor.naver.com/guide/structured-data-breadcrumb) |
| 구글 기본·콘텐츠 | [Search Essentials](https://developers.google.com/search/docs/essentials?hl=ko), [SEO 기본 가이드](https://developers.google.com/search/docs/fundamentals/seo-starter-guide?hl=ko), [사용자 중심 콘텐츠](https://developers.google.com/search/docs/fundamentals/creating-helpful-content?hl=ko) |
| 구글 구현·변경 | [수집 가능한 링크](https://developers.google.com/search/docs/crawling-indexing/links-crawlable?hl=ko), [robots.txt](https://developers.google.com/search/docs/crawling-indexing/robots/intro?hl=ko), [구조화 데이터 정책](https://developers.google.com/search/docs/appearance/structured-data/sd-policies?hl=ko), [이미지](https://developers.google.com/search/docs/appearance/google-images?hl=ko), [Core Web Vitals](https://developers.google.com/search/docs/appearance/core-web-vitals?hl=ko), [문서 변경 기록](https://developers.google.com/search/updates?hl=ko) |

## 페이지 구현

다음은 공식 권장사항을 TaxYou의 정적 빌드 구조에 적용한 작업 기준이다. 파일 위치·단일 H1·512px OG 크기는 프로젝트 규칙이며 검색엔진의 보편적 의무 규격으로 설명하지 않는다.

| 항목 | 적용할 내용 |
| --- | --- |
| 계산 목적·콘텐츠 | 기존 도구와 다른 계산 목적·지원 범위가 있을 때 새 페이지를 만든다. 동의어별 복제 페이지, 숨긴 키워드, 검색어 나열을 만들지 않는다. 입력 단위, 적용 대상, 계산 과정, 실제 예시, 결과 해석과 제외 조건으로 사용자의 질문을 해결한다. 분량·키워드 횟수를 맞추기 위한 문단은 추가하지 않는다. |
| 제목·설명 | 고유하고 간결한 `<title>`, 페이지 주제를 설명하는 H1 하나, 내용에 맞는 description을 작성한다. TaxYou 브랜드 표기를 일관되게 유지하고, 주요 용어는 필요한 위치에 자연스럽게 쓴다. 정해진 글자 수나 모든 소제목에 같은 검색어를 넣는 규칙을 만들지 않는다. |
| 신뢰할 수 있는 기준 | 세금·금리·통계는 공식 원천, 시행·적용 기간, 실제 검토일, 작성 주체와 한계를 밝힌다. 계산을 검증한 예시를 제공하고, 확인하지 않은 자격·경험·최신성·수익률을 주장하지 않는다. 데이터 갱신은 [갱신 정책](data-update-policy.md), 계산 근거는 해당 도메인 노트에서 관리한다. |
| HTML·링크 | 제목·설명·폼 안내·공식 근거·FAQ·탐색 링크는 생성 HTML에서 읽을 수 있게 한다. 계산 결과는 사용자 입력 후 JS로 표시해도 된다. 페이지 이동은 실제 URL을 가진 `<a href>`와 의미 있는 링크 문구를 사용하고, 홈페이지·카테고리·관련 페이지에서 새 도구로 들어오는 경로를 연결한다. JS/CSS/필요 이미지의 수집을 막지 않는다. |
| URL·색인 | 기존 URL을 유지하고 실제 공개 URL의 절대 self-canonical을 지정한다. 내부 링크·registry·sitemap·RSS가 같은 URL을 가리키게 한다. 새 공개 페이지는 HTTP 200, 없는 URL은 실제 404여야 한다. 초안의 `noindex`는 공개 준비·검증이 끝난 뒤 제거한다. robots.txt 차단을 색인 제거 수단으로 대신 쓰지 않는다. |
| 구조화 데이터 | 계산기의 실제 기능을 설명하는 WebApplication과 화면과 일치하는 BreadcrumbList를 사용한다. 이동경로 루트는 `TaxYou`로 표시한다. 추가 타입은 해당 엔진의 현재 지원과 필수 속성을 확인해 선택하고, 숨긴 내용·가짜 평점·리뷰·공식 인증을 채우지 않는다. 문법 유효성과 검색 기능 지원 여부는 별도로 확인한다. |
| 이미지 | 새 페이지마다 고유한 OG 이미지를 만들고 아래 규칙으로 연결한다. 본문 설명을 이미지 속 글자로 대체하지 않는다. 본문에 필요한 이미지를 넣을 때는 용도에 맞는 alt, 크기, 압축과 레이아웃 공간을 확보한다. OG 지정이나 이미지 파일 메타데이터 제거가 검색 썸네일·순위를 보장한다고 설명하지 않는다. |
| 사용성·성능 | 공통 반응형 스타일·접근성·결과 내보내기를 재사용한다. 도움말·줄간격·여백을 확보하고 작은 화면·확대·키보드에서 입력과 결과를 확인한다. 필수 계산을 막는 팝업이나 불필요한 리소스를 추가하지 않는다. 로딩·입력 반응·레이아웃 이동을 함께 점검한다. |

### FAQ와 검색 기능

FAQ 본문은 실제 질문을 해결할 때 작성한다. Google은 2026-05-07부터 FAQ 리치 결과를 표시하지 않으며, 관련 문서도 삭제했다. 따라서 새 계산기에 **Google FAQ 리치 결과를 기대해 FAQPage를 의무 추가하지 않는다**. 이 변경만으로 기존의 유효한 FAQ 마크업이나 유용한 본문을 일괄 삭제하지 않는다. 다른 구조화 데이터도 현재 지원 기능과 페이지 적합성을 확인한다. [Google 공식 변경 기록](https://developers.google.com/search/updates?hl=ko)

### 개별 OG 이미지

- 새 페이지는 공개 전에 `images/og/<page-slug>.png`에 고유한 **512×512 PNG**를 생성·적용한다. 스타일, 최종 글자 검수, 비표시 메타데이터 제거와 별도 프롬프트 기록은 [이미지 준비 규칙](../images/og/README.md)을 따른다.
- `src/page-metadata.json`에 절대 `og:image`·`twitter:image` URL, `og:image:type=image/png`, 실제 width/height와 두 이미지의 설명 alt를 연결한다. 스캐폴드의 공통 이미지는 초안용이다.
- 512px는 현재 프로젝트의 OG 규격이다. Google 이미지 검색·Discover 등 다른 노출 기능을 목적으로 할 때는 해당 기능의 최신 이미지 요건을 따로 확인한다.

## 완료·운영 확인

1. [완료 체크리스트](calculator-completion-checklist.md)로 기능·SEO·UX를 점검한다. 좁은 화면, 확대, 긴 금액·설명, 조건 변경과 오류, PNG/PDF/공유 경로를 확인하고 실제로 검증한 범위를 기록한다.
2. 사용 가능한 도구로 성능을 점검한다. Google 권장 목표는 LCP 2.5초 이내, INP 200ms 미만, CLS 0.1 미만이다. 로컬 실험값과 실제 사용자 지표를 구분하고 측정하지 않은 달성 수치를 주장하지 않는다. [Core Web Vitals](https://developers.google.com/search/docs/appearance/core-web-vitals?hl=ko)
3. [구현 절차](calculator-implementation-guide.md)에 따라 생성물을 빌드하고 [AGENTS.md의 필수 검사](../AGENTS.md#required-verification)를 실행한다. URL·메타데이터 등 의도된 변경을 검토한 뒤 해당 계약 fixture만 갱신한다.
4. 명시적으로 승인된 배포 후 접근 가능한 네이버 서치어드바이저·Google Search Console에서 대표 URL의 수집·색인·canonical과 필요한 구조화 데이터를 확인한다. 계정·운영 접근이 없으면 미실행 항목과 후속 확인을 보고하고, 로컬에서 끝낼 수 있는 작업은 완료한다.
5. 검색 클릭·노출·CTR과 실제 방문을 구분해 관찰한다. 색인·검색 제목·리치 결과·순위 회복을 보장하지 않는다. [네이버 가이드](https://searchadvisor.naver.com/guide), [Google 기본 가이드](https://developers.google.com/search/docs/fundamentals/seo-starter-guide?hl=ko)

SEO 상세 기준은 이 문서, 개발 순서는 구현 가이드, 완료 여부는 체크리스트, 필수 명령은 AGENTS.md에서 관리한다. 과거 작업 기록인 `naver-seo-ux-review.md`와 이미지 생성 프롬프트·계산 근거는 검증 이력으로 보존하고 새 작업 지침처럼 복사하지 않는다.
