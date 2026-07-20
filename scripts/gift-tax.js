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
        <tr class="total-row"><td>${icon('target')}간이 예상 증여세액</td><td class="text-right">${tax.toLocaleString()} 원</td></tr>
    `;
    document.getElementById('formulaContent').innerHTML = `• 입력한 재산가액에서 선택한 관계별 증여재산공제를 차감한 뒤 5단계 누진세율을 적용한 간이 예상액입니다.<br>• 10년 이내 동일인 증여 합산, 재산 평가, 신고세액공제, 부담부증여 등은 반영하지 않습니다.`;
    showResult();
}
