function calculateInheritTax() {
    calculateFamilyTax({
        amountId: 'inheritAmount',
        deductionId: 'inheritGongje',
        validationMessage: '상속재산 총 가액을 입력해 주세요.',
        badge: 'INHERITANCE TAX REPORT',
        reportTitle: '상속세 모의 시뮬레이션 명세',
        icon: 'hourglass',
        amountLabel: '상속 자산평가 총 가액',
        deductionLabel: '상속 일괄 공제 및 배우자공제 한도',
        taxBaseLabel: '상속과세표준 과표 금액',
        taxLabel: '간이 예상 상속세액',
        formula: '• 입력한 상속재산에서 선택한 대표 공제액을 차감하고 5단계 누진세율을 적용한 간이 예상액입니다.<br>• 실제 배우자 상속분, 채무·장례비, 금융재산공제, 사전증여재산과 신고세액공제는 반영하지 않습니다.'
    });
}
