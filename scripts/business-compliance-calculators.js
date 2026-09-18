(function () {
    'use strict';

    function formatWon(value) {
        return `${Math.round(value).toLocaleString()} 원`;
    }

    function formatRate(value) {
        return `${(value * 100).toFixed(2).replace(/\.00$/, '')}%`;
    }

    function hideResult() {
        const resultBox = document.getElementById('resultBox');
        if (resultBox) resultBox.style.display = 'none';
    }

    function calculateSincereFiling(event) {
        event.preventDefault();
        try {
            const result = BusinessComplianceMath.determineSincereFilingEligibility({
                industryGroup: document.getElementById('sincereIndustryGroup').value,
                revenue: getMoneyValue('sincereRevenue')
            });
            updateReportHeaders('FILING CHECK', '성실신고확인대상자 판정 리포트');
            document.getElementById('resultTableBody').innerHTML = `
                <tr><td>${icon('store')}선택한 업종군</td><td class="text-right">${result.industryLabel}</td></tr>
                <tr><td>${icon('wallet-cards')}해당 과세기간 수입금액</td><td class="text-right">${formatWon(result.revenue)}</td></tr>
                <tr><td>${icon('landmark')}업종별 판정 기준</td><td class="text-right">${formatWon(result.threshold)} 이상</td></tr>
                <tr class="total-row"><td>${icon(result.eligible ? 'badge-check' : 'circle-check-big')}판정 결과</td><td class="text-right">${result.eligible ? '성실신고확인대상 해당' : '기준 미달'}</td></tr>
                <tr class="highlight-row"><td>${icon('scale')}기준금액과의 차이</td><td class="text-right">${formatWon(result.difference)} ${result.eligible ? '초과·도달' : '부족'}</td></tr>`;
            document.getElementById('resultNotice').textContent = '※ 개인사업자 단일 업종의 기본 판정입니다. 공동사업장, 둘 이상의 업종·사업장, 현금영수증 의무발행 전문직, 사업용 유형자산 양도수입 등은 별도 검토가 필요합니다.';
            document.getElementById('formulaContent').innerHTML = `• 판정: 해당 과세기간 수입금액 ${result.revenue >= result.threshold ? '≥' : '<'} 업종별 기준금액<br>• 선택 업종 기준금액: ${formatWon(result.threshold)}<br>• 근거: 소득세법 시행령 제133조(2026년 9월 18일 확인)`;
            showResult();
        } catch {
            hideResult();
            alert('업종과 0원 이상의 해당 과세기간 수입금액을 입력해 주세요.');
        }
    }

    function updateExpenseNewBusinessState() {
        const isNew = document.getElementById('expenseIsNewBusiness').checked;
        const input = document.getElementById('expensePriorRevenue');
        input.disabled = isNew;
        input.closest('.form-group').classList.toggle('is-disabled', isNew);
    }

    function calculateExpenseRate(event) {
        event.preventDefault();
        try {
            const isNewBusiness = document.getElementById('expenseIsNewBusiness').checked;
            const result = BusinessComplianceMath.determineExpenseRate({
                industryGroup: document.getElementById('expenseIndustryGroup').value,
                isNewBusiness,
                priorRevenue: isNewBusiness ? 0 : getMoneyValue('expensePriorRevenue'),
                currentRevenue: getMoneyValue('expenseCurrentRevenue'),
                isProfessional: document.getElementById('expenseProfessional').checked
            });
            const simple = result.rateType === 'simple';
            updateReportHeaders('EXPENSE RATE', '단순·기준경비율 판정 리포트');
            document.getElementById('resultTableBody').innerHTML = `
                <tr><td>${icon('store')}선택한 업종군</td><td class="text-right">${result.industryLabel}</td></tr>
                <tr><td>${icon('calendar-minus')}사업자 구분</td><td class="text-right">${result.isNewBusiness ? '해당 과세기간 신규사업자' : '계속사업자'}</td></tr>
                ${result.isNewBusiness ? '' : `<tr><td>${icon('history')}직전 과세기간 수입금액</td><td class="text-right">${formatWon(result.priorRevenue)}</td></tr>`}
                <tr><td>${icon('wallet-cards')}해당 과세기간 수입금액</td><td class="text-right">${formatWon(result.currentRevenue)}</td></tr>
                <tr><td>${icon('list-checks')}단순경비율 기준</td><td class="text-right">직전 수입 ${formatWon(result.simpleExpenseThreshold)} 미만</td></tr>
                <tr><td>${icon('book-open-check')}복식부기의무 기준</td><td class="text-right">해당 수입 ${formatWon(result.bookkeepingThreshold)} 이상</td></tr>
                <tr class="total-row"><td>${icon(simple ? 'badge-check' : 'book-copy')}추계신고 적용 경비율</td><td class="text-right">${simple ? '단순경비율 적용대상' : '기준경비율 적용대상'}</td></tr>`;
            document.getElementById('resultNotice').textContent = `※ ${result.reason} 실제 신고에서는 업종코드별 경비율 수치, 겸업 환산, 장부 기장의무와 예외를 추가로 확인하세요.`;
            document.getElementById('formulaContent').innerHTML = '• 계속사업자: 직전 과세기간 수입금액이 단순경비율 기준 미만이고 해당 과세기간 수입금액이 복식부기의무 기준 미만인지 확인<br>• 신규사업자: 해당 과세기간 수입금액이 복식부기의무 기준 미만인지 확인<br>• 전문직사업자: 단순경비율 적용 제외';
            showResult();
        } catch {
            hideResult();
            alert('사업자 구분, 업종과 0원 이상의 수입금액을 확인해 주세요.');
        }
    }

    function calculateDeemedInputTax(event) {
        event.preventDefault();
        try {
            const result = BusinessComplianceMath.calculateDeemedInputTaxCredit({
                creditType: document.getElementById('deemedCreditType').value,
                taxableBase: getMoneyValue('deemedTaxableBase'),
                exemptPurchaseAmount: getMoneyValue('deemedPurchaseAmount')
            });
            updateReportHeaders('DEEMED INPUT VAT', '의제매입세액공제 예상 리포트');
            document.getElementById('resultTableBody').innerHTML = `
                <tr><td>${icon('store')}업종·사업자 유형</td><td class="text-right">${result.typeLabel}</td></tr>
                <tr><td>${icon('badge-percent')}적용 공제율</td><td class="text-right">${result.numerator}/${result.denominator} (${formatRate(result.rate)})</td></tr>
                <tr><td>${icon('receipt-text')}해당 과세기간 과세표준</td><td class="text-right">${formatWon(result.taxableBase)}</td></tr>
                <tr><td>${icon('wheat')}면세농산물 등 매입액</td><td class="text-right">${formatWon(result.exemptPurchaseAmount)}</td></tr>
                <tr><td>${icon('gauge')}매입가액 한도 (${formatRate(result.limitRate)})</td><td class="text-right">${formatWon(result.purchaseLimit)}</td></tr>
                <tr class="highlight-row"><td>${icon('circle-dollar-sign')}한도 적용 인정 매입액</td><td class="text-right">${formatWon(result.recognizedPurchaseAmount)}</td></tr>
                <tr class="total-row"><td>${icon('badge-check')}예상 의제매입세액공제</td><td class="text-right">${formatWon(result.credit)}</td></tr>`;
            document.getElementById('resultNotice').textContent = `※ ${result.limited ? '입력 매입액이 공제한도를 넘어 한도까지만 반영했습니다.' : '입력 매입액 전액을 한도 안에서 반영했습니다.'} 2026년 일반과세자 반기 기준의 단순 계산이며 적격 증빙, 실제 원재료 사용, 겸영 안분과 연간 정산은 포함하지 않습니다.`;
            document.getElementById('formulaContent').innerHTML = `• 매입가액 한도 = 과세표준 × ${formatRate(result.limitRate)}<br>• 인정 매입액 = 면세농산물 등 매입액과 매입가액 한도 중 작은 금액<br>• 예상 공제액 = 인정 매입액 × ${result.numerator}/${result.denominator}<br>• 9/109 특례와 확대 공제한도는 각각 법정 적용기한을 전제로 합니다.`;
            showResult();
        } catch {
            hideResult();
            alert('업종·사업자 유형과 0원 이상의 과세표준·매입액을 입력해 주세요.');
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        const sincereForm = document.getElementById('sincereFilingForm');
        if (sincereForm) sincereForm.addEventListener('submit', calculateSincereFiling);
        const expenseForm = document.getElementById('expenseRateForm');
        if (expenseForm) {
            expenseForm.addEventListener('submit', calculateExpenseRate);
            document.getElementById('expenseIsNewBusiness').addEventListener('change', updateExpenseNewBusinessState);
            updateExpenseNewBusinessState();
        }
        const deemedForm = document.getElementById('deemedInputTaxForm');
        if (deemedForm) deemedForm.addEventListener('submit', calculateDeemedInputTax);
    });
})();
