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
        <tr class="total-row"><td>${icon('target')}간이 예상 상속세액</td><td class="text-right">${tax.toLocaleString()} 원</td></tr>
    `;
    document.getElementById('formulaContent').innerHTML = `• 입력한 상속재산에서 선택한 대표 공제액을 차감하고 5단계 누진세율을 적용한 간이 예상액입니다.<br>• 실제 배우자 상속분, 채무·장례비, 금융재산공제, 사전증여재산과 신고세액공제는 반영하지 않습니다.`;
    showResult();
}
