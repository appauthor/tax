(function () {
    'use strict';

    function formatWon(value) {
        return `${Math.round(value).toLocaleString()} 원`;
    }

    function calculateMedianIncome(event) {
        if (event) event.preventDefault();
        const householdSize = Number(document.getElementById('medianIncomeHouseholdSize').value);
        const incomeInput = document.getElementById('medianIncomeMonthlyAmount');
        const monthlyIncome = getMoneyValue('medianIncomeMonthlyAmount');
        const targetPercent = Number(document.getElementById('medianIncomeTargetPercent').value);
        const resultBox = document.getElementById('resultBox');

        try {
            if (!getDigitsOnly(incomeInput.value)) throw new Error('monthly income is required');
            const result = MedianIncomeMath.calculateMedianIncomeComparison({ householdSize, monthlyIncome, targetPercent });
            const statusText = result.withinTarget ? '선택 기준 이하' : '선택 기준 초과';
            const differenceText = result.difference === 0
                ? '기준 금액과 같음'
                : `${formatWon(Math.abs(result.difference))} ${result.difference > 0 ? '여유' : '초과'}`;

            updateReportHeaders('MEDIAN INCOME', '2026년 기준 중위소득 비교 리포트');
            document.getElementById('resultTableBody').innerHTML = `
                <tr><td>${icon('users')}가구원 수</td><td class="text-right">${result.householdSize}인 가구</td></tr>
                <tr><td>${icon('landmark')}2026 기준 중위소득 100%</td><td class="text-right">월 ${formatWon(result.baseAmount)}</td></tr>
                <tr><td>${icon('wallet-cards')}입력한 월소득·소득인정액</td><td class="text-right">월 ${formatWon(result.monthlyIncome)}</td></tr>
                <tr class="total-row"><td>${icon('percent')}중위소득 대비 비율</td><td class="text-right">${result.incomePercent.toFixed(1)}%</td></tr>
                <tr class="highlight-row"><td>${icon('target')}기준 중위소득 ${result.targetPercent}% 금액</td><td class="text-right">월 ${formatWon(result.targetAmount)}</td></tr>
                <tr class="highlight-row"><td>${icon(result.withinTarget ? 'circle-check' : 'circle-alert')}선택 기준 비교</td><td class="text-right">${statusText}</td></tr>
                <tr><td>${icon('scale')}기준 금액과 차이</td><td class="text-right">${differenceText}</td></tr>
                <tr><td>${icon('calendar-range')}선택 기준 연간 환산</td><td class="text-right">연 ${formatWon(result.annualTargetAmount)}</td></tr>
                <tr><td>${icon('calendar-days')}적용 연도</td><td class="text-right">2026년</td></tr>
            `;
            document.getElementById('resultNotice').textContent = '※ 입력액을 2026년 가구원 수별 기준 중위소득과 단순 비교한 참고 결과입니다. 실제 복지사업은 소득인정액 산정, 재산·부양의무자·연령 등 별도 요건과 사업별 반올림 기준을 적용할 수 있습니다.';
            document.getElementById('formulaContent').innerHTML = `• 중위소득 대비 비율 = 입력한 월소득 ÷ ${result.householdSize}인 가구 기준 중위소득 100% × 100<br>• 선택 기준 금액 = ${result.householdSize}인 가구 기준 중위소득 100% × ${result.targetPercent}% (원 단위 반올림)<br>• 기준과 차이 = 선택 기준 금액 − 입력한 월소득<br>• 기준 중위소득은 복지급여 기준 등에 쓰이는 고시 금액이며 통계상 가구소득 중앙값과 같은 개념으로 직접 사용하면 안 됩니다.<br>• 공식 출처: <a href="${result.source.sourceUrl}" target="_blank" rel="noopener noreferrer">${result.source.sourceName}</a>`;
            showResult();
        } catch (error) {
            if (resultBox) resultBox.style.display = 'none';
            alert('가구원 수, 월소득과 비교 비율을 확인해 주세요.');
        }
    }

    function applyTargetPreset(percent) {
        const select = document.getElementById('medianIncomeTargetPercent');
        select.value = String(percent);
        select.focus();
    }

    document.addEventListener('DOMContentLoaded', () => {
        document.getElementById('medianIncomeForm').addEventListener('submit', calculateMedianIncome);
        document.querySelectorAll('[data-median-target]').forEach(button => {
            button.addEventListener('click', () => applyTargetPreset(Number(button.dataset.medianTarget)));
        });
    });
})();
