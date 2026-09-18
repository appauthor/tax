(function () {
    'use strict';

    const METRIC_LABELS = Object.freeze({
        growth: '전년 동월 증가율',
        density: '생활업종 1,000개당 밀도',
        count: '가동사업자 수'
    });

    function formatMetric(row, metric) {
        if (metric === 'growth') return row.growthRate === null ? '비교 불가' : `${row.growthRate > 0 ? '+' : ''}${row.growthRate.toFixed(1)}%`;
        if (metric === 'density') return `${row.densityPerThousand.toFixed(2)}개`;
        return `${row.current.toLocaleString()}개`;
    }

    function calculateRanking(event) {
        if (event) event.preventDefault();
        try {
            const industry = document.getElementById('lifestyleIndustry').value;
            const metric = document.getElementById('lifestyleMetric').value;
            const result = LifestyleBusinessRankMath.calculateIndustryRanking({ industry, metric });
            updateReportHeaders('BUSINESS RANK', `${industry} 지역 순위 리포트`);
            document.getElementById('resultTableBody').innerHTML = `
                <tr class="highlight-row"><td>${icon('store')}선택 업종</td><td class="text-right">${industry}</td></tr>
                <tr><td>${icon('map')}비교 지표</td><td class="text-right">${METRIC_LABELS[metric]}</td></tr>
                <tr><td>${icon('calendar-days')}데이터 기준</td><td class="text-right">2026년 6월 말</td></tr>
                <tr><td>${icon('building-2')}전국 공개값 합계</td><td class="text-right">${result.nationalCurrent.toLocaleString()}개</td></tr>
                <tr><td>${icon('chart-no-axes-combined')}전국 전년 동월 대비</td><td class="text-right">${result.nationalGrowthRate === null ? '비교 불가' : `${result.nationalGrowthRate > 0 ? '+' : ''}${result.nationalGrowthRate.toFixed(1)}%`}</td></tr>
                ${result.rows.map(row => `<tr${row.rank <= 3 ? ' class="total-row"' : ''}><td>${row.rank}위 · ${row.region}</td><td class="text-right">${formatMetric(row, metric)} · ${row.current.toLocaleString()}개</td></tr>`).join('')}`;
            document.getElementById('resultNotice').textContent = '※ 국세청 공개 파일의 시군구 값을 시도별로 합산한 참고 순위입니다. 3개 미만 셀은 공식 파일에서 0으로 변환되므로 실제 사업자 수와 증가율·밀도에 작은 차이가 날 수 있습니다.';
            document.getElementById('formulaContent').innerHTML = `• 증가율 = (2026년 6월 사업자 수 − 2025년 6월 사업자 수) ÷ 2025년 6월 사업자 수 × 100<br>• 밀도 = 선택 업종 사업자 수 ÷ 해당 시도의 100대 생활업종 전체 사업자 수 × 1,000<br>• 밀도는 인구당 수치가 아니라 생활업종 구성비입니다.<br>• 공식 출처: <a href="${result.source.sourceUrl}" target="_blank" rel="noopener noreferrer">${result.source.sourceName}</a>`;
            showResult();
        } catch {
            const resultBox = document.getElementById('resultBox');
            if (resultBox) resultBox.style.display = 'none';
            alert('업종과 순위 지표를 선택해 주세요.');
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        const select = document.getElementById('lifestyleIndustry');
        LifestyleBusinessData.industries.forEach(industry => {
            const option = document.createElement('option');
            option.value = industry;
            option.textContent = industry;
            option.selected = industry === '커피음료점';
            select.appendChild(option);
        });
        document.getElementById('lifestyleBusinessRankForm').addEventListener('submit', calculateRanking);
    });
})();
