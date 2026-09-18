(function () {
    'use strict';

    function formatWon(value) {
        return `${Math.round(value).toLocaleString()} 원`;
    }

    function hideResult() {
        const resultBox = document.getElementById('resultBox');
        if (resultBox) resultBox.style.display = 'none';
    }

    function calculateFamilyLoanGift(event) {
        event.preventDefault();
        try {
            const result = FamilyLoanGiftMath.calculateFamilyLoanGiftBenefit({
                principal: getMoneyValue('familyLoanPrincipal'),
                actualAnnualRate: document.getElementById('familyLoanActualRate').value,
                months: document.getElementById('familyLoanMonths').value
            });
            const noTaxableBenefit = result.taxableGiftBenefit === 0;
            updateReportHeaders('FAMILY LOAN', '가족 간 차용 이자·증여이익 리포트');
            document.getElementById('resultTableBody').innerHTML = `
                <tr><td>${icon('hand-coins')}차용 원금</td><td class="text-right">${formatWon(result.principal)}</td></tr>
                <tr><td>${icon('calendar-range')}차용 기간</td><td class="text-right">${result.months.toLocaleString()}개월</td></tr>
                <tr><td>${icon('landmark')}법정 적정이자율</td><td class="text-right">연 ${(result.appropriateAnnualRate * 100).toFixed(1)}%</td></tr>
                <tr><td>${icon('badge-percent')}실제 약정이자율</td><td class="text-right">연 ${(result.actualAnnualRate * 100).toFixed(2).replace(/\.00$/, '')}%</td></tr>
                <tr><td>${icon('receipt-text')}기간 전체 적정이자</td><td class="text-right">${formatWon(result.appropriateInterest)}</td></tr>
                <tr><td>${icon('circle-dollar-sign')}기간 전체 실제이자</td><td class="text-right">${formatWon(result.actualInterest)}</td></tr>
                <tr class="highlight-row"><td>${icon('gift')}이자 차액 합계</td><td class="text-right">${formatWon(result.totalBenefit)}</td></tr>
                <tr class="total-row"><td>${icon(noTaxableBenefit ? 'circle-check-big' : 'triangle-alert')}증여재산가액 해당 가능액</td><td class="text-right">${formatWon(result.taxableGiftBenefit)}</td></tr>`;
            document.getElementById('resultNotice').textContent = `※ 각 1년 단위(1년 미만 잔여기간 포함)의 이자 차액이 1,000만원 미만이면 계산상 증여이익에서 제외했습니다. ${result.taxableEventCount ? `${result.taxableEventCount}개 기간에서 기준금액 이상입니다.` : '입력 조건에서는 기준금액 이상인 기간이 없습니다.'} 실제 차용 여부는 계약서, 자금 이동, 이자·원금 상환 사실 등으로 판단됩니다.`;
            document.getElementById('formulaContent').innerHTML = '• 적정이자 = 차용 원금 × 연 4.6% × 기간<br>• 저리 대출 이익 = 적정이자 − 실제 지급이자<br>• 증여재산가액 해당 가능액 = 각 1년 단위 이익이 1,000만원 이상인 기간의 이익 합계<br>• 원금이 기간 중 변동하지 않는다고 가정하며 원리금 상환 일정은 반영하지 않습니다.';
            showResult();
        } catch {
            hideResult();
            alert('0원 이상의 차용 원금과 이자율, 1~600개월의 기간을 입력해 주세요.');
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        document.getElementById('familyLoanGiftForm').addEventListener('submit', calculateFamilyLoanGift);
    });
})();
