(function () {
    'use strict';

    function formatWon(value) {
        return `${Math.round(value).toLocaleString()} 원`;
    }

    function formatSignedBalance(value) {
        if (value === 0) return '추가 납부·환급 없음';
        return `${formatWon(Math.abs(value))} ${value > 0 ? '납부 예상' : '환급 예상'}`;
    }

    function formatRate(value) {
        return `${(value * 100).toFixed(1).replace(/\.0$/, '')}%`;
    }

    function hideResult() {
        const resultBox = document.getElementById('resultBox');
        if (resultBox) resultBox.style.display = 'none';
    }

    function calculateIncomeTax(event) {
        event.preventDefault();
        try {
            const result = ComprehensiveIncomeTaxMath.calculateComprehensiveIncomeTax({
                businessIncome: getMoneyValue('comprehensiveBusinessIncome'),
                employmentIncome: getMoneyValue('comprehensiveEmploymentIncome'),
                financialIncome: getMoneyValue('comprehensiveFinancialIncome'),
                pensionIncome: getMoneyValue('comprehensivePensionIncome'),
                otherIncome: getMoneyValue('comprehensiveOtherIncome'),
                incomeDeduction: getMoneyValue('comprehensiveIncomeDeduction'),
                nationalTaxCredits: getMoneyValue('comprehensiveTaxCredits'),
                prepaidNationalTax: getMoneyValue('comprehensivePrepaidNationalTax'),
                prepaidLocalTax: getMoneyValue('comprehensivePrepaidLocalTax')
            });
            if (result.totalIncome <= 0) throw new Error('income is required');

            const balanceClass = result.totalBalance === 0 ? '' : ' total-row';
            updateReportHeaders('INCOME TAX', '2025년 귀속 종합소득세 예상 리포트');
            document.getElementById('resultTableBody').innerHTML = `
                <tr><td>${icon('circle-dollar-sign')}종합소득금액 합계</td><td class="text-right">${formatWon(result.totalIncome)}</td></tr>
                <tr><td>${icon('badge-minus')}반영 소득공제</td><td class="text-right">${formatWon(result.recognizedIncomeDeduction)}</td></tr>
                <tr class="highlight-row"><td>${icon('calculator')}종합소득 과세표준</td><td class="text-right">${formatWon(result.taxableBase)}</td></tr>
                <tr><td>${icon('percent')}적용 최고세율</td><td class="text-right">소득세 ${formatRate(result.nationalMarginalRate)} · 지방소득세 ${formatRate(result.localMarginalRate)}</td></tr>
                <tr><td>${icon('receipt-text')}종합소득세 산출세액</td><td class="text-right">${formatWon(result.nationalCalculatedTax)}</td></tr>
                <tr><td>${icon('badge-check')}반영 세액공제·감면</td><td class="text-right">${formatWon(result.recognizedNationalCredits)}</td></tr>
                <tr><td>${icon('landmark')}종합소득세 결정세액</td><td class="text-right">${formatWon(result.determinedNationalTax)}</td></tr>
                <tr><td>${icon('building-2')}개인지방소득세 결정세액</td><td class="text-right">${formatWon(result.determinedLocalTax)}</td></tr>
                <tr><td>${icon('circle-check-big')}국세·지방세 기납부 합계</td><td class="text-right">${formatWon(result.totalPrepaidTax)}</td></tr>
                <tr class="${balanceClass.trim()}"><td>${icon(result.totalBalance > 0 ? 'wallet-cards' : result.totalBalance < 0 ? 'hand-coins' : 'badge-check')}최종 예상 결과</td><td class="text-right">${formatSignedBalance(result.totalBalance)}</td></tr>
            `;
            document.getElementById('resultNotice').textContent = `※ 2025년 귀속·2026년 신고 기준의 단순 예상입니다. 입력한 소득금액·공제·기납부세액만 반영했으며 ${result.deductionLimited ? '소득공제는 종합소득금액까지만 반영했습니다. ' : ''}가산세, 최저한세, 배당세액공제, 외국납부세액공제의 한도 계산, 특별한 분리과세·감면 요건은 포함하지 않습니다.`;
            document.getElementById('formulaContent').innerHTML = `• 종합소득금액 = 사업 + 근로 + 금융 + 연금 + 기타소득금액<br>• 과세표준 = 종합소득금액 − 소득공제<br>• 종합소득세 산출세액 = 과세표준 × ${formatRate(result.nationalMarginalRate)} − 누진공제 ${formatWon(result.nationalQuickDeduction)}<br>• 개인지방소득세 산출세액 = 과세표준 × ${formatRate(result.localMarginalRate)} − 누진공제 ${formatWon(result.localQuickDeduction)}<br>• 납부·환급 예상액 = 국세·지방세 결정세액 − 각각의 기납부세액`;
            showResult();
        } catch {
            hideResult();
            alert('소득금액을 하나 이상 입력하고 모든 항목에 0원 이상의 금액을 입력해 주세요.');
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        const form = document.getElementById('comprehensiveIncomeTaxForm');
        if (form) form.addEventListener('submit', calculateIncomeTax);
    });
})();
