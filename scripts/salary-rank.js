(function () {
    'use strict';

    function formatWon(value) {
        return `${Math.round(value).toLocaleString()} 원`;
    }

    function formatPercent(value) {
        return value < 1 ? `${value.toFixed(1)}%` : `${Number(value.toFixed(1))}%`;
    }

    function formatComparison(value) {
        if (value === 0) return '해당 구간 평균과 같음';
        return `${formatWon(Math.abs(value))} ${value > 0 ? '높음' : '낮음'}`;
    }

    function formatReferenceRange(result) {
        if (result.lowerPercent === result.upperPercent) {
            return `상위 ${formatPercent(result.lowerPercent)} 구간 평균 기준`;
        }
        return `상위 ${formatPercent(result.lowerPercent)}~${formatPercent(result.upperPercent)} 구간 평균 사이`;
    }

    function calculateSalaryRank(event) {
        if (event) event.preventDefault();
        const annualSalary = getMoneyValue('salaryRankAnnualPay');
        const resultBox = document.getElementById('resultBox');

        try {
            const result = SalaryRankMath.estimateSalaryRank(annualSalary);
            updateReportHeaders('SALARY RANK', '2024년 귀속 연봉 순위 참고 리포트');
            document.getElementById('resultTableBody').innerHTML = `
                <tr><td>${icon('wallet-cards')}입력한 세전 연봉</td><td class="text-right">${formatWon(result.annualSalary)}</td></tr>
                <tr><td>${icon('calendar-range')}월평균 세전 급여</td><td class="text-right">${formatWon(result.monthlyGrossPay)}</td></tr>
                <tr class="total-row"><td>${icon('trophy')}추정 연봉 상위 비율</td><td class="text-right">약 상위 ${formatPercent(result.estimatedTopPercent)}</td></tr>
                <tr class="highlight-row"><td>${icon('chart-no-axes-combined')}공식 분위 평균 비교</td><td class="text-right">${formatReferenceRange(result)}</td></tr>
                <tr><td>${icon('locate-fixed')}가장 가까운 분위 평균</td><td class="text-right">상위 ${formatPercent(result.closestRow.topPercent)} · ${formatWon(result.closestRow.averageGrossPay)}</td></tr>
                <tr><td>${icon('medal')}상위 10% 구간 평균 대비</td><td class="text-right">${formatComparison(result.topTenGap)}</td></tr>
                <tr><td>${icon('award')}상위 1% 구간 평균 대비</td><td class="text-right">${formatComparison(result.topOneGap)}</td></tr>
                <tr><td>${icon('users')}비교 대상</td><td class="text-right">근로소득자 ${result.totalWorkers.toLocaleString()}명</td></tr>
                <tr><td>${icon('calendar-days')}소득·신고 기준</td><td class="text-right">2024년 근로소득 · 2025년 신고</td></tr>
            `;
            document.getElementById('resultNotice').textContent = '※ 국세청이 공개한 각 분위의 인원과 총급여 합계로 계산한 구간 평균을 선형 비교한 참고 추정입니다. 개인별 연봉 커트라인이나 공식 백분위가 아닙니다.';
            document.getElementById('formulaContent').innerHTML = `• 분위 평균 총급여 = 해당 분위 총급여 합계(억원) × 1억원 ÷ 해당 분위 인원<br>• 입력 연봉이 이웃한 두 분위 평균 사이에 있으면 평균값 사이를 선형 비교해 참고 상위 비율을 표시합니다.<br>• 국세청 자료는 상위 1% 이내를 0.1% 단위, 나머지를 1% 단위로 제공합니다.<br>• 총급여는 비과세소득을 제외한 연간 근로소득이며 실수령액·근로소득금액과 다릅니다.<br>• 공식 출처: <a href="${result.source.sourceUrl}" target="_blank" rel="noopener noreferrer">${result.source.sourceName}</a>`;
            showResult();
        } catch (error) {
            if (resultBox) resultBox.style.display = 'none';
            alert('0원보다 큰 세전 연봉을 입력해 주세요.');
        }
    }

    function applySalaryPreset(amount) {
        const input = document.getElementById('salaryRankAnnualPay');
        input.value = formatMoneyValue(amount);
        input.focus();
    }

    document.addEventListener('DOMContentLoaded', () => {
        document.getElementById('salaryRankForm').addEventListener('submit', calculateSalaryRank);
        document.querySelectorAll('[data-salary-preset]').forEach(button => {
            button.addEventListener('click', () => applySalaryPreset(Number(button.dataset.salaryPreset)));
        });
    });
})();
