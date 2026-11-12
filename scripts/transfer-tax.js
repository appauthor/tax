function updateTransferConditions() {
    const type = document.getElementById('transferHouseType').value;
    const oneHome = type === 'oneHome';
    const multiHome = type === 'multi2' || type === 'multi3';
    document.getElementById('transferOneHomeFields').hidden = !oneHome;
    document.getElementById('transferOneHomeConfirmed').disabled = !oneHome;
    document.getElementById('transferSurchargeFields').hidden = !multiHome;
    document.getElementById('transferSurchargeExclusion').disabled = !multiHome;
}

function calculateTransferTax() {
    const houseType = document.getElementById('transferHouseType').value;
    let result;
    try {
        result = RealEstateTaxMath.calculateTransfer({
            salePrice: getMoneyValue('transferSalePrice'),
            purchasePrice: getMoneyValue('transferPurchasePrice'),
            expenses: getMoneyValue('transferExpenses'),
            holdYears: document.getElementById('transferHoldYears').value,
            residenceYears: document.getElementById('transferResidenceYears').value,
            houseType,
            basicDeduction: document.getElementById('transferBasicDeduction').value,
            transferDate: document.getElementById('transferDate').value,
            oneHomeConfirmed: document.getElementById('transferOneHomeConfirmed').checked,
            surchargeExcluded: document.getElementById('transferSurchargeExclusion').value === 'confirmed'
        });
    } catch (error) {
        document.getElementById('resultBox').style.display = 'none';
        alert(error.message);
        return;
    }
    const won = (v) => `${Math.floor(v).toLocaleString()} 원`;
    const typeLabel = document.getElementById('transferHouseType').selectedOptions[0].textContent;
    updateReportHeaders('REAL ESTATE TRANSFER TAX', '아파트 양도소득세 모의 계산 명세');
    document.getElementById('resultTableBody').innerHTML = `
        <tr><td>양도일 / 직접 선택한 과세 구분</td><td class="text-right">${result.transferDate} / ${typeLabel}</td></tr>
        <tr class="highlight-row"><td>양도가액</td><td class="text-right">${won(result.salePrice)}</td></tr>
        <tr><td>취득가액</td><td class="text-right">(-) ${won(result.purchasePrice)}</td></tr>
        <tr><td>필요경비</td><td class="text-right">(-) ${won(result.expenses)}</td></tr>
        <tr class="highlight-row"><td>양도차익</td><td class="text-right">${won(result.gain)}</td></tr>
        <tr><td>보유기간 / 거주기간</td><td class="text-right">${result.holdYears}년 / ${result.residenceYears}년</td></tr>
        <tr><td>1세대 1주택 비과세</td><td class="text-right">${result.isOneHomeExempt ? '요건 확인 · 12억 원 이하' : houseType === 'oneHome' ? '요건 확인 · 12억 원 초과분 과세' : '미적용'}</td></tr>
        <tr><td>과세대상 양도차익</td><td class="text-right">${won(result.taxableGain)}</td></tr>
        <tr><td>장기보유특별공제 (${(result.longTermDeductionRate * 100).toFixed(0)}%)</td><td class="text-right">(-) ${won(result.longTermDeduction)}</td></tr>
        <tr><td>양도소득금액</td><td class="text-right">${won(result.transferIncome)}</td></tr>
        <tr><td>기본공제</td><td class="text-right">(-) ${won(result.basicDeduction)}</td></tr>
        <tr class="highlight-row"><td>양도소득 과세표준</td><td class="text-right">${won(result.taxBase)}</td></tr>
        <tr><td>적용 세율</td><td class="text-right">${result.rateLabel}</td></tr>
        <tr><td>양도소득세 본세</td><td class="text-right">${won(result.incomeTax)}</td></tr>
        <tr><td>개인지방소득세 예상액</td><td class="text-right">${won(result.localIncomeTax)}</td></tr>
        <tr class="total-row"><td>${icon('target')}예상 양도 관련 세금 합계</td><td class="text-right">${won(result.total)}</td></tr>`;
    const surchargeNote = result.surchargeRate ? `다주택 중과 ${result.surchargeRate * 100}%p와 장기보유특별공제 배제를 반영했습니다.`
        : result.pauseApplied ? '2년 이상 보유하고 2026-05-09까지 양도한 다주택 주택의 한시적 중과 배제를 반영했습니다.'
        : result.exclusionApplied ? '사용자가 확인한 중과 배제·경과조치에 따라 중과를 적용하지 않았습니다. 요건을 자동 판정한 결과는 아닙니다.'
        : '다주택 중과를 적용하지 않은 구분입니다. 조정대상지역 다주택이면 해당 중과 구분을 선택해야 합니다.';
    document.getElementById('formulaContent').innerHTML = `• 양도차익 = 양도가액 − 취득가액 − 필요경비. 1주택 비과세 요건을 확인한 경우에만 12억 원 기준과 고가주택 안분을 적용합니다.<br>• 장기보유특별공제: 3년 이상 보유 시 일반 연 2%·최대 30%, 1주택은 2년 이상 거주 요건도 충족할 때 보유·거주 각각 연 4%·합계 최대 80%입니다.<br>• ${surchargeNote} 보유 1년 미만 70%, 1~2년 미만 60%와 중과 세액이 겹치면 큰 세액을 적용합니다.<br>• 기본공제는 입력한 ${won(result.basicDeduction)}만 반영했습니다. 2026년 단일 아파트 양도 예상액이며 다른 양도손익 합산, 미등기, 감면, 증여·상속 취득 특례, 2년 미만 보유 비과세 특례는 제외합니다. 세법 검토 2026-11-11.`;
    showResult();
}

if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
    document.addEventListener('DOMContentLoaded', function () {
        document.getElementById('transferHouseType').addEventListener('change', updateTransferConditions);
        updateTransferConditions();
    });
}
