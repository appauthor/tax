(function () {
    'use strict';

    const format = (value, digits = 0) => value.toLocaleString('ko-KR', { maximumFractionDigits: digits });
    const won = (value, digits = 0) => `${format(value, digits)}원`;
    const rankText = value => `${value}위`;
    const man = value => `${format(value)}만원`;

    function apartment(input, data) {
        const r = PublishedRankMath.apartment({
            ...input, ownFee: input.ownFee === '' ? null : Number(input.ownFee.replace(/,/g, ''))
        }, data);
        const main = [
            ['공표 기준월', data.month],
            ['선택 지역과 비교집단 내 순위', `${r.selected.name} · ${r.selected.rank}위 / ${r.rows.length}개 묶음`, 'highlight-row'],
            ['선택 지역 공용관리비', `${won(r.selected.value)}/㎡`],
            [`전용 ${format(r.area, 2)}㎡ 환산 월 공용관리비`, won(r.selected.referenceFee), 'total-row'],
            ['전국 공표 평균', `${won(data.national)}/㎡`]
        ];
        if (r.ownFee !== null) {
            main.push(['우리 집 월 공용관리비', won(r.ownFee)]);
            main.push(['선택 지역 환산액과 비교', r.difference === 0 ? '같음' :
                `${won(Math.abs(r.difference))} ${r.difference > 0 ? '높음' : '낮음'}`]);
        }
        return {
            main, headers: ['순위', '시도·지역 묶음', '공용관리비 (원/㎡)', `${format(r.area, 2)}㎡ 환산 월액`],
            rows: r.rows.map(row => [rankText(row.rank), row.name, format(row.value), won(row.referenceFee)]),
            formula: '공표 원표의 원 단위 값을 많은 순으로 비교합니다. 환산 월액은 원/㎡ 값에 입력한 전용면적을 곱한 참고액입니다. 전국 평균은 순위에 포함하지 않습니다.',
            notice: `K-apt ${data.month} 발생분, 아파트 단지 유형, 데이터 확인 ${data.reviewedAt}. 전남과 광주를 원표대로 합산했습니다. 개별사용료와 장기수선충당금은 공용관리비에서 제외합니다.`
        };
    }

    function electric(input, data) {
        const r = PublishedRankMath.electricVehicle(input, data);
        return {
            main: [
                ['선택 차종과 기준', `${r.model.name} · ${data.year}년`],
                ['선택 지자체와 비교집단 내 순위', `${r.selected.name} · ${r.selected.rank}위 / ${r.rows.length}곳`, 'highlight-row'],
                ['기본 보조금 합계', man(r.selected.value), 'total-row'],
                ['국비 / 지방비', `${man(r.selected.government)} / ${man(r.selected.local)}`],
                ['비교한 지자체 최고 금액과 차이', man(r.gapToHighest)]
            ],
            headers: ['순위', '지자체', '국비', '지방비', '합계'],
            rows: r.rows.map(row => [rankText(row.rank), row.name, man(row.government), man(row.local), man(row.value)]),
            formula: '같은 세부 모델의 국비와 지방비를 합산해 높은 금액부터 정렬합니다. 값이 같으면 공동순위로 표시합니다.',
            notice: `무공해차 통합누리집의 ${data.year}년 공표액 중 확인한 ${r.rows.length}곳, 자료 확인 ${data.reviewedAt}. 전환지원금과 추가 지원, 접수·잔여대수는 별도입니다.`
        };
    }

    function university(input, data) {
        const r = PublishedRankMath.tuition(input, data);
        const direction = input.order === 'low' ? '낮은 금액부터' : '높은 금액부터';
        const main = [
            ['공시 연도·표시 기준', `${data.year}년 · ${direction}`],
            ['선택 지역 / 설립 유형', `${input.region || '전국'} / ${input.type || '전체'}`],
            ['비교 대학 수', `${format(r.population)}곳`],
            ['검색 결과와 표 페이지', `${format(r.matches)}곳 · ${r.page}/${r.pageCount}페이지`]
        ];
        if (r.first) main.push(['선택 조건 1위', `${r.first.name} · 연 ${won(r.first.value, 1)}`, 'highlight-row']);
        if (!r.visible.length) main.push(['표시할 대학', input.school ? '학교명 검색어를 확인하거나 조건을 넓혀 보세요.' : '비교 대학이 없는 지역·설립 유형입니다.']);
        return {
            main, headers: ['순위', '대학', '지역', '설립', '연평균 등록금'],
            rows: r.visible.map(row => [rankText(row.rank), row.name, row.region, row.type, won(row.value, 1)]),
            formula: '지역·설립 유형으로 비교 집단을 만든 뒤 연평균 등록금을 정렬합니다. 학교명은 표에서 찾을 때만 사용하므로 순위를 바꾸지 않습니다. 표는 페이지당 최대 25곳입니다.',
            notice: `한국장학재단 ${data.year}년 4월 공시, 파일 기준 ${data.publishedAt}. 양수인 대학 등록금 기준이며 캠퍼스는 본교에 합산합니다. 학과별 실납부액과 장학금은 별도로 확인하세요.`
        };
    }

    const renderers = { apartment, electric, university };

    function appendTable(container, rows, headers) {
        if (!rows.length) return;
        const wrap = document.createElement('div');
        wrap.className = 'loan-table-wrap';
        wrap.dataset.fullReportTable = '';
        wrap.tabIndex = 0;
        wrap.setAttribute('aria-label', '상세 순위 표');
        const table = document.createElement('table');
        table.className = 'content-table';
        table.createCaption().textContent = '선택 조건의 상세 순위';
        const heading = table.createTHead().insertRow();
        for (const label of headers) {
            const header = document.createElement('th');
            header.scope = 'col';
            header.textContent = label;
            heading.append(header);
        }
        const body = table.createTBody();
        for (const values of rows) {
            const row = body.insertRow();
            for (const value of values) row.insertCell().textContent = value;
        }
        wrap.append(table);
        container.append(wrap);
    }

    document.addEventListener('DOMContentLoaded', () => {
        const form = document.querySelector('form[data-published-rank]');
        if (!form) return;
        const data = JSON.parse(document.getElementById('publishedRankData').textContent);
        const error = form.querySelector('[role="alert"]');
        const baseline = document.getElementById('publishedBaseline');
        const clear = () => {
            const result = document.getElementById('resultBox');
            if (result) result.style.display = 'none';
            baseline.hidden = false;
            error.hidden = true;
            error.textContent = '';
        };
        form.addEventListener('input', event => {
            clear();
            if (form.elements.page && event.target !== form.elements.page) form.elements.page.value = 1;
        });
        form.addEventListener('change', clear);
        form.addEventListener('invalid', clear, true);
        form.addEventListener('submit', event => {
            event.preventDefault();
            clear();
            try {
                const input = Object.fromEntries(new FormData(form));
                const report = renderers[form.dataset.publishedRank](input, data);
                updateReportHeaders('TAXYOU REPORT', form.dataset.reportTitle);
                const body = document.getElementById('resultTableBody');
                body.replaceChildren();
                for (const [label, value, className = ''] of report.main) {
                    const tr = body.insertRow();
                    tr.className = className;
                    tr.insertCell().textContent = label;
                    const detail = tr.insertCell();
                    detail.className = 'text-right';
                    detail.textContent = value;
                }
                const formula = document.createElement('p');
                formula.textContent = report.formula;
                const explanation = document.getElementById('formulaContent');
                explanation.replaceChildren(formula);
                appendTable(explanation, report.rows, report.headers);
                document.getElementById('resultNotice').textContent = report.notice;
                baseline.hidden = true;
                showResult();
            } catch (cause) {
                error.textContent = cause.message;
                error.hidden = false;
                error.focus();
            }
        });
    });
})();
