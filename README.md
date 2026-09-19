# TaxYou

정적 HTML·CSS·바닐라 JavaScript로 운영하는 세금·금융 계산기입니다. 소스에서 루트 배포 파일을 생성하므로 서버 런타임 없이 기존 독립 URL을 그대로 유지합니다.

## 30초 안에 구조 파악하기

1. [저장소 작업 규칙](AGENTS.md)에서 수정 위치와 필수 검사를 확인합니다.
2. [자동 생성 프로젝트 맵](docs/project-map.md)에서 현재 카테고리와 코드 위치를 확인합니다.
3. 특정 카테고리만 필요하면 전체 페이지를 읽지 말고 아래 명령을 사용합니다.

```sh
ruby tools/taxyou-context.rb --category CATEGORY_ID --pretty
ruby tools/taxyou-context.rb --page PAGE.html --pretty
```

## 문서 선택

| 작업 | 문서 |
|---|---|
| 구조·공통 모듈 변경 | [아키텍처](docs/taxyou-architecture.md) |
| 계산기 신규·계산 방식 변경 | [구현 가이드](docs/calculator-implementation-guide.md) |
| 완료 전 점검 | [완료 체크리스트](docs/calculator-completion-checklist.md) |
| 임금·노동·근로장려금 규칙 변경 | [도메인 계산 기준](docs/labor-benefits-calculation-notes.md) |
| 연말정산·국민연금·예금 순위 규칙 변경 | [도메인 계산 기준](docs/planning-calculation-notes.md) |

## 수정 위치

| 변경 대상 | 수정할 곳 |
|---|---|
| 페이지·카테고리 목록 | `calculator-registry.json` |
| 제목·메타·canonical·구조화 데이터·의존성 | `src/page-metadata.json` |
| 페이지별 폼·설명·FAQ | `src/pages/*.html.erb` |
| 공통 문서 구조 | `src/partials/` |
| 사이트맵·RSS 정보 | `src/site-discovery.json` |
| 계산 | `scripts/*-math.js` |
| 입력·결과 화면 | 해당 컨트롤러 |

루트 HTML/XML과 `docs/project-map.md`는 생성물이므로 직접 수정하지 않습니다.

## 기본 작업 흐름

```sh
npm run build
npm test
```

구조나 파일 목록을 추가·삭제·이름 변경한 경우에만 `npm run docs:sync`도 실행합니다. 전체 필수 검사와 계약 스냅샷 규칙은 [AGENTS.md](AGENTS.md)를 단일 기준으로 사용합니다.
