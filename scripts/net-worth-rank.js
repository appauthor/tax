(function () {
    'use strict';

    const QUICK_ASSET_IDS = ['netWorthQuickAssets'];
    const QUICK_DEBT_IDS = ['netWorthQuickDebts'];
    const DETAIL_ASSET_IDS = [
        'netWorthRealEstate',
        'netWorthLeaseDeposit',
        'netWorthCashSavings',
        'netWorthInvestments',
        'netWorthOtherAssets'
    ];
    const DETAIL_DEBT_IDS = [
        'netWorthFinancialDebt',
        'netWorthRentalDepositDebt',
        'netWorthOtherDebt'
    ];

    function setModeGroup(id, visible) {
        const group = document.getElementById(id);
        if (!group) return;
        group.classList.toggle('is-hidden', !visible);
        group.setAttribute('aria-hidden', visible ? 'false' : 'true');
        group.querySelectorAll('input').forEach(input => {
            input.disabled = !visible;
        });
    }

    function updateNetWorthInputMode() {
        const detailed = document.getElementById('netWorthInputMode').value === 'detailed';
        setModeGroup('netWorthQuickFields', !detailed);
        setModeGroup('netWorthDetailedFields', detailed);
    }

    function amountsFrom(ids) {
        return ids.reduce((amounts, id) => {
            amounts[id] = getMoneyValue(id);
            return amounts;
        }, {});
    }

    function formatWon(value) {
        const sign = value < 0 ? '-' : '';
        return `${sign}${Math.abs(Math.round(value)).toLocaleString()} 원`;
    }

    function formatRatio(value) {
        if (value === null) return '총자산 0원으로 산출하지 않음';
        return `${value.toFixed(1)}%`;
    }

    function formatComparison(difference, ratio) {
        if (difference === 0) return `동일 (${ratio.toFixed(1)}%)`;
        return `${formatWon(Math.abs(difference))} ${difference > 0 ? '높음' : '낮음'} (${ratio.toFixed(1)}%)`;
    }

    function formatTopRange(result) {
        if (result.bracketIndex === NetWorthRankMath.SURVEY.brackets.length - 1) {
            return `상위 약 ${result.topRangeEnd.toFixed(1)}% 이내`;
        }
        return `상위 약 ${result.topRangeStart.toFixed(1)}%~${result.topRangeEnd.toFixed(1)}% 범위`;
    }

    function calculateNetWorthRank(event) {
        if (event) event.preventDefault();
        const detailed = document.getElementById('netWorthInputMode').value === 'detailed';
        const assets = amountsFrom(detailed ? DETAIL_ASSET_IDS : QUICK_ASSET_IDS);
        const debts = amountsFrom(detailed ? DETAIL_DEBT_IDS : QUICK_DEBT_IDS);

        try {
            const result = NetWorthRankMath.calculateNetWorthRank({ assets, debts });
            const survey = NetWorthRankMath.SURVEY;
            const inputModeLabel = detailed ? '상세 항목 합산' : '총자산·총부채 빠른 입력';

            updateReportHeaders('NET WORTH RANGE', '2025 가구 순자산 위치 리포트');
            document.getElementById('resultTableBody').innerHTML = `
                <tr><td>${icon('list-checks')}입력 방식</td><td class="text-right">${inputModeLabel}</td></tr>
                <tr><td>${icon('landmark')}가구 총자산</td><td class="text-right">${formatWon(result.totalAssets)}</td></tr>
                <tr><td>${icon('credit-card')}가구 총부채</td><td class="text-right">(-) ${formatWon(result.totalDebts)}</td></tr>
                <tr class="total-row"><td>${icon('wallet-cards')}계산된 순자산</td><td class="text-right">${formatWon(result.netWorth)}</td></tr>
                <tr class="highlight-row"><td>${icon('layers-3')}공식 통계 분포 구간</td><td class="text-right">${result.bracketLabel}</td></tr>
                <tr class="highlight-row"><td>${icon('trophy')}공식표로 확인 가능한 위치</td><td class="text-right">${formatTopRange(result)}</td></tr>
                <tr><td>${icon('separator-horizontal')}순자산 중앙값 대비</td><td class="text-right">${formatComparison(result.medianDifference, result.medianRatio)}</td></tr>
                <tr><td>${icon('chart-no-axes-combined')}순자산 평균 대비</td><td class="text-right">${formatComparison(result.averageDifference, result.averageRatio)}</td></tr>
                <tr><td>${icon('percent')}총자산 대비 부채</td><td class="text-right">${formatRatio(result.debtRatio)}</td></tr>
                <tr><td>${icon('calendar-days')}통계 기준</td><td class="text-right">2025년 3월 말 가구 기준</td></tr>
            `;
            document.getElementById('resultNotice').textContent = '※ 국가데이터처·한국은행·금융감독원 2025년 가계금융복지조사의 공개 구간표를 사용한 가구 기준 참고 결과입니다. 개인 순위가 아니며 구간 내부의 정확한 백분위를 뜻하지 않습니다.';
            document.getElementById('formulaContent').innerHTML = `• 순자산 = 가구 총자산 − 가구 총부채<br>• 공식 통계는 ${survey.name}의 ${survey.referenceDate} 기준 자산·부채 자료입니다.<br>• 평균 순자산 ${survey.averageNetWorth.toLocaleString()}원, 중앙값 ${survey.medianNetWorth.toLocaleString()}원과 비교합니다.<br>• 공개표는 1억원 단위 구간과 10억원 이상 묶음을 제공하므로 구간별 가구 비중을 누적한 상위 범위만 표시하며, 구간 안을 임의 보간하지 않습니다.<br>• 각 구간 비중은 소수점 첫째 자리로 공표되어 누적값에 약 0.1%p 차이가 생길 수 있습니다.<br>• 공식 출처: <a href="https://mods.go.kr/board.es?act=view&amp;bid=215&amp;list_no=439535&amp;mid=b80501010000" target="_blank" rel="noopener noreferrer">2025년 가계금융복지조사 결과</a> (2025-12-04 공표)`;
            showResult();
        } catch (error) {
            console.error(error);
            alert('입력값을 확인해 주세요. 자산과 부채 항목에는 0원 이상의 금액을 입력할 수 있습니다.');
        }
    }

    function applyNetWorthPreset(amount) {
        const mode = document.getElementById('netWorthInputMode');
        mode.value = 'quick';
        updateNetWorthInputMode();
        document.getElementById('netWorthQuickAssets').value = formatMoneyValue(amount);
        document.getElementById('netWorthQuickDebts').value = '0';
        document.getElementById('netWorthQuickAssets').focus();
    }

    document.addEventListener('DOMContentLoaded', () => {
        const mode = document.getElementById('netWorthInputMode');
        const form = document.getElementById('netWorthRankForm');
        mode.addEventListener('change', updateNetWorthInputMode);
        form.addEventListener('submit', calculateNetWorthRank);
        document.querySelectorAll('[data-net-worth-preset]').forEach(button => {
            button.addEventListener('click', () => applyNetWorthPreset(Number(button.dataset.netWorthPreset)));
        });
        updateNetWorthInputMode();
    });
})();
