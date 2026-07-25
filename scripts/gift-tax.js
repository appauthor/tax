function calculateFamilyTax(config) {
    const amount = getMoneyValue(config.amountId);
    const deduction = Number(document.getElementById(config.deductionId).value);

    if (amount <= 0) {
        alert(config.validationMessage);
        return;
    }

    const taxBase = Math.max(0, amount - deduction);
    const tax = Math.floor(getProgressiveTax(taxBase));

    updateReportHeaders(config.badge, config.reportTitle);
    document.getElementById('resultTableBody').innerHTML = `
        <tr class="highlight-row"><td>${icon(config.icon)}${config.amountLabel}</td><td class="text-right">${amount.toLocaleString()} 원</td></tr>
        <tr><td>${icon('scale')}${config.deductionLabel}</td><td class="text-right">(-) ${deduction.toLocaleString()} 원</td></tr>
        <tr class="highlight-row"><td>${icon('trending-down')}${config.taxBaseLabel}</td><td class="text-right">${taxBase.toLocaleString()} 원</td></tr>
        <tr class="total-row"><td>${icon('target')}${config.taxLabel}</td><td class="text-right">${tax.toLocaleString()} 원</td></tr>
    `;
    document.getElementById('formulaContent').innerHTML = config.formula;
    showResult();
}

function calculateGiftTax() {
    calculateFamilyTax({
        amountId: 'giftAmount',
        deductionId: 'giftRelation',
        validationMessage: '증여재산 가액을 정확히 입력해주세요.',
        badge: 'GIFT TAX REPORT',
        reportTitle: '증여세 모의 시뮬레이션 명세',
        icon: 'gift',
        amountLabel: '증여 자산평가 가액',
        deductionLabel: '증여재산 공제 (관계별 면세한도)',
        taxBaseLabel: '증여과세표준 과표 금액',
        taxLabel: '간이 예상 증여세액',
        formula: '• 입력한 재산가액에서 선택한 관계별 증여재산공제를 차감한 뒤 5단계 누진세율을 적용한 간이 예상액입니다.<br>• 10년 이내 동일인 증여 합산, 재산 평가, 신고세액공제, 부담부증여 등은 반영하지 않습니다.'
    });
}
