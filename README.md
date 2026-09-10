# TaxYou

정적 HTML·CSS·바닐라 JavaScript로 운영하는 세금·금융 계산기입니다. 빌드 없이 루트의 `.html` 파일이 각각 독립 URL이 됩니다.

## 30초 안에 구조 파악하기

1. [자동 생성 프로젝트 맵](docs/project-map.md)에서 현재 카테고리·페이지·공유 모듈을 확인합니다.
2. [저장소 작업 규칙](AGENTS.md)에서 작업별 최소 탐색 범위와 필수 검사를 확인합니다.
3. 정확한 페이지 목록은 `calculator-registry.json`, 특정 카테고리만 필요하면 아래 명령을 사용합니다.

```sh
ruby tools/taxyou-context.rb --category CATEGORY_ID --pretty
```

`index.html` 전체나 모든 계산기 페이지를 출력해 구조를 재구성하지 않습니다.

## 문서는 필요한 것만 읽기

| 작업 | 문서 |
|---|---|
| 구조·공통 모듈 변경 | [아키텍처](docs/taxyou-architecture.md) |
| 계산기 신규·계산 방식 변경 | [구현 가이드](docs/calculator-implementation-guide.md) |
| 완료 전 점검 | [완료 체크리스트](docs/calculator-completion-checklist.md) |
| 임금·노동·근로장려금 규칙 변경 | [도메인 계산 기준](docs/labor-benefits-calculation-notes.md) |

## 변경과 문서 동기화

`calculator-registry.json`이 페이지·카테고리 목록의 단일 기준입니다. 페이지, 카테고리, 공유 스크립트, 테스트, 도구 또는 최상위 디렉터리를 변경한 뒤 프로젝트 맵을 갱신합니다.

```sh
npm run docs:sync
npm test
```

프로젝트 맵을 직접 편집하지 않습니다. 맵이 현재 레지스트리·파일 구조와 다르면 컨텍스트 검사와 정적 사이트 검사가 실패합니다.

## 자주 쓰는 명령

```sh
ruby tools/taxyou-context.rb --check
npm test
xmllint --noout sitemap.xml rss.xml
git diff --check
```
