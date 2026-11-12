# GitHub Pages와 참고환율

2026-11-12 검토. 운영 호스팅인 GitHub Pages를 유지한다. 기존 파일 배포 방식을
그대로 사용하며, 환율을 위해 Pages 배포 소스를 GitHub Actions로 바꿀 필요가 없다.
앞서 제안했던 환율 전용 예약 배포 워크플로는 제거했다. 이 작업에서는 저장소 설정을
바꾸거나 커밋·푸시·배포하지 않았다.

앞선 안내를 따라 Pages의 Source를 이미 GitHub Actions로 변경했다면, 기존에 사용하던
**Deploy from a branch**와 원래 배포 브랜치·폴더로 되돌린다. 별도로 유지하는 일반
Pages 배포 워크플로가 있다면 그것을 사용해도 된다. 참고환율은 배포 방식과 독립적이다.

## 조회 방식

브라우저는 `https://api.frankfurter.dev/v2/rate/USD/KRW`를 직접 조회한다.
지원하는 17개 통화는 base 코드만 바꾼다. JPY·VND·IDR는 100단위, 나머지는 1단위로 표시한다.
API 키·중계 서버·저장 JSON·정기 수집·별도 라이브러리가 필요 없다.
Frankfurter가 공개하는 CORS 헤더를 사용하고 보안 제한을 우회하지 않는다.

자동 입력은 특정 은행의 매매기준율이 아닌 참고환율이다. 실제 거래 은행의 기준율로
직접 수정할 수 있고 늦게 도착한 응답은 수동 입력을 덮어쓰지 않는다. 공급자 장애·
네트워크 오류·호출 제한 때에는 직접 입력 안내를 표시한다. 기준일과 조회 시각은
구분하고 오래된 자료의 적용 제한은 계산 노트에서 관리한다.

## 로컬·배포 확인

- 로컬은 `python3 -m http.server 8000` 등 일반 HTTP 서버로 연다. `file://`는 사용하지 않는다.
- `currency-exchange-calculator.html`을 열어 자동 참고환율·기준일·조회 시각을 확인한다.
- 통화 변경 시 새 원화 통화쌍, JPY·VND·IDR의 100단위, 직접 입력 후 출처 변경과 이전 결과 숨김을 확인한다.
- 기존 절차로 배포한 뒤 운영 도메인에서 실제 외부 요청·참고환율 표시·수동 입력을 다시 확인한다.
- 네트워크 정책이 Frankfurter 연결을 차단하면 자동 입력은 실패할 수 있고 수동 계산은 유지된다.

공식 근거: [Frankfurter API·갱신·상업 이용](https://frankfurter.dev/),
[GitHub Pages 정적 호스팅](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages).
