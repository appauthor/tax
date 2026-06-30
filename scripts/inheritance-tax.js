function calculateInheritTax() {
    const amount = getMoneyValue('inheritAmount');
    const gongje = parseFloat(document.getElementById('inheritGongje').value);
    if (isNaN(amount) || amount <= 0) {
        alert('상속재산 총 가액을 입력해 주세요.');
        return;
    }

    const taxBase = Math.max(0, amount - gongje);
    const tax = Math.floor(getProgressiveTax(taxBase));

    updateReportHeaders("INHERITANCE TAX REPORT", "상속세 모의 시뮬레이션 명세");

    document.getElementById('resultTableBody').innerHTML = `
        <tr class="highlight-row"><td>${icon('hourglass')}상속 자산평가 총 가액</td><td class="text-right">${amount.toLocaleString()} 원</td></tr>
        <tr><td>${icon('scale')}상속 일괄 공제 및 배우자공제 한도</td><td class="text-right">(-) ${gongje.toLocaleString()} 원</td></tr>
        <tr class="highlight-row"><td>${icon('trending-down')}상속과세표준 과표 금액</td><td class="text-right">${taxBase.toLocaleString()} 원</td></tr>
        <tr class="total-row"><td>${icon('target')}최종 산출 상속세 총액</td><td class="text-right">${tax.toLocaleString()} 원</td></tr>
    `;
    document.getElementById('formulaContent').innerHTML = `• 피상속인의 총 자산총액에서 최소 보장형 법정 일괄공제액을 매칭 조정한 뒤, 초과 가산 누진 과세율을 적용해 유도된 시뮬레이션입니다.`;
    showResult();
}
