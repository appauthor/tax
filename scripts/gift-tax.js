function calculateGiftTax() {
    const amount = getMoneyValue('giftAmount');
    const gongje = parseFloat(document.getElementById('giftRelation').value);
    if (isNaN(amount) || amount <= 0) {
        alert('증여재산 가액을 정확히 입력해주세요.');
        return;
    }

    const taxBase = Math.max(0, amount - gongje);
    const tax = Math.floor(getProgressiveTax(taxBase));

    updateReportHeaders("GIFT TAX REPORT", "증여세 모의 시뮬레이션 명세");

    document.getElementById('resultTableBody').innerHTML = `
        <tr class="highlight-row"><td>${icon('gift')}증여 자산평가 가액</td><td class="text-right">${amount.toLocaleString()} 원</td></tr>
        <tr><td>${icon('scale')}증여재산 공제 (관계별 면세한도)</td><td class="text-right">(-) ${gongje.toLocaleString()} 원</td></tr>
        <tr class="highlight-row"><td>${icon('trending-down')}증여과세표준 과표 금액</td><td class="text-right">${taxBase.toLocaleString()} 원</td></tr>
        <tr class="total-row"><td>${icon('target')}최종 산출 증여세 총액</td><td class="text-right">${tax.toLocaleString()} 원</td></tr>
    `;
    document.getElementById('formulaContent').innerHTML = `• 수증자가 적용받는 법정 증여공제 한도를 선차감한 후, 과세 구간별 5단계 점증 누진세율을 정확하게 대입하여 도출되었습니다.`;
    showResult();
}
