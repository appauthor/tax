(function () {
    'use strict';
    const $ = id => document.getElementById(id);
    const won = value => `${Math.round(value).toLocaleString('ko-KR')} 원`;
    function hideResult() { if ($('resultBox')) $('resultBox').style.display = 'none'; }
    function error(message) {
        hideResult();
        $('rentalTaxError').textContent = message;
        $('rentalTaxError').hidden = false;
        $('rentalTaxError').focus();
    }
    function submit(event) {
        event.preventDefault();
        $('rentalTaxError').hidden = true;
        try {
            if (!$('rentalTaxableConfirmed').checked) throw new RangeError('과세 대상 수입금액 확인란을 선택하세요.');
            const result = HousingRentalIncomeTaxMath.calculate({
                monthlyRent: getMoneyValue('rentalMonthlyRent'), deemedRent: getMoneyValue('rentalDeemedRent'),
                actualExpenses: getMoneyValue('rentalActualExpenses'),
                registration: $('rentalRegistration').value,
                otherIncomeAmount: getMoneyValue('rentalOtherIncomeAmount'),
                otherTaxBase: getMoneyValue('rentalOtherTaxBase')
            });
            updateReportHeaders('RENTAL TAX', '2025년 귀속 주택임대소득세 비교');
            const c = result.comprehensive, s = result.separate;
            $('resultTableBody').innerHTML = `
                <tr><td>${icon('house')}과세 대상 월세·간주임대료 합계</td><td class="text-right">${won(result.gross)}</td></tr>
                <tr><td>${icon('badge-minus')}종합과세 장부상 필요경비</td><td class="text-right">${won(result.gross - c.rentalIncome)}</td></tr>
                <tr><td>${icon('calculator')}종합과세 임대소득금액</td><td class="text-right">${won(c.rentalIncome)}</td></tr>
                <tr><td>${icon('receipt-text')}종합과세 국세 증가액</td><td class="text-right">${won(c.nationalIncrease)}</td></tr>
                <tr><td>${icon('building-2')}종합과세 지방소득세 증가액</td><td class="text-right">${won(c.localIncrease)}</td></tr>
                <tr class="highlight-row"><td>${icon('scale')}종합과세 예상 세액 증가</td><td class="text-right">${won(c.increase)}</td></tr>
                ${s ? `<tr><td>${icon('badge-minus')}분리과세 필요경비·공제</td><td class="text-right">${won(s.expense)} + ${won(s.deduction)}</td></tr>
                <tr><td>${icon('calculator')}분리과세 과세표준</td><td class="text-right">${won(s.base)}</td></tr>
                <tr><td>${icon('receipt-text')}분리과세 국세·지방소득세</td><td class="text-right">${won(s.national)} + ${won(s.local)}</td></tr>
                <tr class="highlight-row"><td>${icon('scale')}분리과세 예상 세액 증가</td><td class="text-right">${won(s.increase)}</td></tr>
                <tr class="total-row"><td>${icon('chart-no-axes-combined')}두 방식 차이</td><td class="text-right">${won(Math.abs(result.difference))} · ${result.difference < 0 ? '분리과세가 낮음' : result.difference > 0 ? '종합과세가 낮음' : '같음'}</td></tr>` : `<tr class="total-row"><td>${icon('info')}분리과세</td><td class="text-right">연 수입 2,000만 원 초과로 선택 불가</td></tr>`}`;
            $('resultNotice').textContent = `※ 2025년 귀속·2026년 신고 참고용 산출세액 비교입니다. ${s ? '분리과세 14%·1.4%와 종합과세 누진세율을 적용했습니다. ' : '임대수입 2,000만 원 초과로 종합과세만 표시합니다. '}세액공제·감면, 기납부세액, 추계경비율, 결손, 금융소득 비교과세와 혼합 등록 주택은 포함하지 않습니다.`;
            $('formulaContent').innerHTML = `<p>종합과세: (다른 소득 과세표준 ${won(result.otherTaxBase)} + 임대수입 ${won(result.gross)} − 장부상 필요경비 ${won(result.gross - c.rentalIncome)})의 국세·지방세 산출세액에서 다른 소득만 있을 때의 산출세액을 뺍니다.</p>${s ? `<p>분리과세: (임대수입 ${won(result.gross)} − 필요경비 ${won(s.expense)} − 공제 ${won(s.deduction)}) × 국세 14% 및 지방세 1.4%입니다. 다른 소득금액이 2,000만 원을 초과하면 공제는 0원입니다.</p>` : ''}<p>이 차이는 입력 조건 내 산출세액 차이이며 최종 신고세액의 유불리를 확정하지 않습니다.</p>`;
            showResult();
        } catch (cause) { error(cause instanceof Error ? cause.message : '입력값을 확인해 주세요.'); }
    }
    document.addEventListener('DOMContentLoaded', () => {
        const form = $('housingRentalIncomeTaxForm');
        if (!form) return;
        form.addEventListener('submit', submit);
        form.addEventListener('input', hideResult);
        form.addEventListener('change', hideResult);
    });
})();
