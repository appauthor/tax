# TaxYou

정적 HTML, CSS와 바닐라 JavaScript로 구성된 세금·금융 계산기입니다.

## 구조

- `*.html`: 검색 의도별 독립 페이지
- `scripts/common.js`: 공통 입력 포맷과 결과 UI 유틸리티
- `scripts/loan-math.js`: DOM과 분리된 대출 계산 엔진
- `scripts/loan-calculators.js`: 대출 계산기 입력 검증과 결과 렌더링
- `scripts/investment-tax-math.js`: DOM과 분리된 금융·투자·연금 세금 계산 엔진
- `scripts/investment-tax-calculators.js`: 금융·투자·연금 계산기 입력 검증과 결과 렌더링
- `scripts/*-tax.js`: 세목별 계산 및 페이지 연결 로직
- `tests/`: 계산 회귀 및 정적 SEO·링크 검사

## 검사

```sh
npm test
```

테스트는 외부 패키지 없이 Node.js와 Ruby 표준 라이브러리만 사용합니다.
