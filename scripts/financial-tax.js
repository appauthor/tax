function estimateMonthlyHealthInsurance(annualIncome) {
    const monthlyHealthInsurance = Math.floor((annualIncome / 12) * HEALTH_INSURANCE_RATE);
    const monthlyLongTermCare = Math.floor(monthlyHealthInsurance * LONG_TERM_CARE_RATE);
    return monthlyHealthInsurance + monthlyLongTermCare;
}

function getHealthInsuranceTypeLabel(type) {
    const labels = {
        unknown: "잘 모르겠음",
        local: "지역가입자",
        employee: "직장가입자",
        dependent: "피부양자"
    };
    return labels[type] || labels.unknown;
}

function getHealthInsuranceEstimate(totalFinancialIncome, healthInsuranceType) {
    if (healthInsuranceType === 'local') {
        const isReflected = totalFinancialIncome > HEALTH_LOCAL_FINANCIAL_INCOME_THRESHOLD;
        const reflectedIncome = isReflected ? totalFinancialIncome : 0;
        return {
            thresholdText: `지역가입자는 금융소득이 연 ${HEALTH_LOCAL_FINANCIAL_INCOME_THRESHOLD.toLocaleString()}원 초과이면 산정 반영 가능성이 있습니다.`,
            statusText: isReflected ? "반영 가능성 있음" : "현재 입력값 기준 반영 가능성 낮음",
            hasAdditionalPremiumRisk: isReflected,
            reflectedIncome,
            monthlyIncrease: estimateMonthlyHealthInsurance(reflectedIncome),
            note: isReflected ? "입력한 금융소득 전체가 지역보험료 소득 산정에 반영될 수 있다는 가정입니다." : "다른 소득·재산 조건에 따라 실제 보험료는 달라질 수 있습니다."
        };
    }

    if (healthInsuranceType === 'employee') {
        const isReflected = totalFinancialIncome > HEALTH_EMPLOYEE_EXTRA_INCOME_THRESHOLD;
        const reflectedIncome = Math.max(0, totalFinancialIncome - HEALTH_EMPLOYEE_EXTRA_INCOME_THRESHOLD);
        return {
            thresholdText: `직장가입자는 보수 외 소득이 연 ${HEALTH_EMPLOYEE_EXTRA_INCOME_THRESHOLD.toLocaleString()}원 초과이면 소득월액보험료가 추가될 수 있습니다.`,
            statusText: isReflected ? "추가 보험료 가능성 있음" : "현재 입력값 기준 추가 가능성 낮음",
            hasAdditionalPremiumRisk: isReflected,
            reflectedIncome,
            monthlyIncrease: estimateMonthlyHealthInsurance(reflectedIncome),
            note: "근로소득 외 다른 소득까지 합산해 판단하므로, 이 계산은 금융소득만 입력한 간이 추정입니다."
        };
    }

    if (healthInsuranceType === 'dependent') {
        const isReflected = totalFinancialIncome > HEALTH_DEPENDENT_INCOME_THRESHOLD;
        const reflectedIncome = isReflected ? totalFinancialIncome : 0;
        return {
            thresholdText: `피부양자는 소득 기준 초과 시 자격 변동 및 지역가입자 전환 가능성이 있습니다. 금융소득은 연 ${HEALTH_DEPENDENT_INCOME_THRESHOLD.toLocaleString()}원 초과 여부를 함께 확인하세요.`,
            statusText: isReflected ? "피부양자 자격 변동 가능성 있음" : "현재 입력값 기준 자격 변동 가능성 낮음",
            hasAdditionalPremiumRisk: isReflected,
            reflectedIncome,
            monthlyIncrease: estimateMonthlyHealthInsurance(reflectedIncome),
            note: isReflected ? "지역가입자로 전환된다는 가정에서 금융소득만 반영한 월 보험료 증가 추정입니다." : "사업·연금·기타소득과 재산 요건에 따라 실제 피부양자 판단은 달라질 수 있습니다."
        };
    }

    return {
        thresholdText: `일반적으로 지역가입자는 금융소득 연 ${HEALTH_LOCAL_FINANCIAL_INCOME_THRESHOLD.toLocaleString()}원 초과, 직장가입자는 보수 외 소득 연 ${HEALTH_EMPLOYEE_EXTRA_INCOME_THRESHOLD.toLocaleString()}원 초과 여부를 확인합니다.`,
        statusText: "가입 유형 선택 필요",
        hasAdditionalPremiumRisk: false,
        reflectedIncome: 0,
        monthlyIncrease: 0,
        note: "건강보험 가입 유형을 선택하면 반영 가능성과 월 증가액을 더 구체적으로 추정합니다."
    };
}

function getComprehensiveTaxBracket(estimatedTaxBase) {
    return COMPREHENSIVE_TAX_BRACKETS.find(bracket => estimatedTaxBase <= bracket.limit) || COMPREHENSIVE_TAX_BRACKETS[0];
}

function updateMarginalTaxRateFromIncome() {
    const rateSelect = document.getElementById('marginalTaxRate');
    const rateInfo = document.getElementById('marginalTaxRateInfo');
    if (!rateSelect) return;

    const dividendIncome = getMoneyValue('dividendIncome');
    const interestIncome = getMoneyValue('interestIncome');
    const otherTaxableIncome = getMoneyValue('otherTaxableIncome');
    const totalFinancialIncome = dividendIncome + interestIncome;
    const comprehensiveTarget = Math.max(0, totalFinancialIncome - 20000000);
    const estimatedTaxBase = otherTaxableIncome + comprehensiveTarget;

    if (estimatedTaxBase <= 0) {
        rateSelect.value = "0.154";
        if (rateInfo) {
            rateInfo.innerText = "다른 종합소득 예상액을 입력하면 세율 구간을 자동으로 맞춥니다.";
        }
        return;
    }

    const bracket = getComprehensiveTaxBracket(estimatedTaxBase);
    rateSelect.value = String(bracket.rate);

    if (rateInfo) {
        rateInfo.innerText = `다른 종합소득과 2천만 원 초과 금융소득 합계 약 ${Math.floor(estimatedTaxBase).toLocaleString()}원 기준으로 ${bracket.label}을 자동 선택했습니다.`;
    }
}

function bindFinancialTaxRateAutoSelect() {
    ['dividendIncome', 'interestIncome', 'otherTaxableIncome'].forEach(id => {
        const input = document.getElementById(id);
        if (!input) return;

        input.addEventListener('input', updateMarginalTaxRateFromIncome);
        input.addEventListener('change', updateMarginalTaxRateFromIncome);
    });
}

function calculateFinancialTax() {
    const interestIncome = getMoneyValue('interestIncome');
    const dividendIncome = getMoneyValue('dividendIncome');
    const otherTaxableIncome = getMoneyValue('otherTaxableIncome');
    const marginalTaxRate = parseFloat(document.getElementById('marginalTaxRate').value);
    const healthInsuranceType = document.getElementById('healthInsuranceType').value;

    if (interestIncome < 0 || dividendIncome < 0 || otherTaxableIncome < 0) {
        alert('금액은 0원 이상으로 입력해주세요.');
        return;
    }

    const totalFinancialIncome = interestIncome + dividendIncome;

    if (totalFinancialIncome <= 0) {
        alert('배당소득 또는 이자소득을 입력해주세요.');
        return;
    }

    const withholdingRate = 0.154;
    const comprehensiveThreshold = 20000000;
    const withholdingTax = Math.floor(totalFinancialIncome * withholdingRate);
    const comprehensiveTarget = Math.max(0, totalFinancialIncome - comprehensiveThreshold);
    const additionalTax = Math.max(0, Math.floor(comprehensiveTarget * (marginalTaxRate - withholdingRate)));
    const estimatedTotalTax = withholdingTax + additionalTax;
    const afterTaxIncome = totalFinancialIncome - estimatedTotalTax;
    const isComprehensiveTarget = totalFinancialIncome > comprehensiveThreshold;
    const healthInsuranceEstimate = getHealthInsuranceEstimate(totalFinancialIncome, healthInsuranceType);
    const healthStatusClass = healthInsuranceEstimate.hasAdditionalPremiumRisk ? 'status-badge danger' : 'status-badge neutral';
    const healthIncreaseClass = healthInsuranceEstimate.hasAdditionalPremiumRisk ? 'text-right emphasis-amount' : 'text-right';

    updateReportHeaders("DIVIDEND TAX REPORT", "배당 세금 모의 계산 명세");

    document.getElementById('resultTableBody').innerHTML = `
        <tr class="highlight-row"><td>${icon('trending-up')}연간 배당소득 합계</td><td class="text-right">${Math.floor(dividendIncome).toLocaleString()} 원</td></tr>
        <tr><td>${icon('coins')}연간 이자소득 합계</td><td class="text-right">${Math.floor(interestIncome).toLocaleString()} 원</td></tr>
        <tr><td>${icon('receipt-text')}금융소득 총액</td><td class="text-right">${Math.floor(totalFinancialIncome).toLocaleString()} 원</td></tr>
        <tr><td>${icon('landmark')}원천징수 예상세액 (15.4%)</td><td class="text-right">${withholdingTax.toLocaleString()} 원</td></tr>
        <tr><td>${icon('paperclip')}다른 종합소득 입력액</td><td class="text-right">${Math.floor(otherTaxableIncome).toLocaleString()} 원</td></tr>
        <tr class="highlight-row"><td>${icon('pin')}금융소득 종합과세 검토 여부</td><td class="text-right">${isComprehensiveTarget ? '검토 대상' : '일반 원천징수 범위'}</td></tr>
        <tr><td>${icon('plus')}2천만 원 초과 금융소득</td><td class="text-right">${Math.floor(comprehensiveTarget).toLocaleString()} 원</td></tr>
        <tr><td>${icon('plus')}선택 세율 기준 추가 부담 추정</td><td class="text-right">${additionalTax.toLocaleString()} 원</td></tr>
        <tr class="total-row"><td>${icon('target')}예상 금융소득 관련 세금 합계</td><td class="text-right">${estimatedTotalTax.toLocaleString()} 원</td></tr>
        <tr><td>${icon('wallet')}세후 금융소득 예상액</td><td class="text-right">${Math.floor(afterTaxIncome).toLocaleString()} 원</td></tr>
        <tr class="section-row"><td colspan="2">${icon('heart-pulse')}건강보험료 간이 추정</td></tr>
        <tr class="highlight-row"><td>${icon('heart-pulse')}건강보험 가입 유형</td><td class="text-right">${getHealthInsuranceTypeLabel(healthInsuranceType)}</td></tr>
        <tr><td>${icon('list-checks')}건강보험료 반영 기준</td><td class="text-right">${healthInsuranceEstimate.thresholdText}</td></tr>
        <tr><td>${icon('activity')}건강보험료 산정 반영 여부</td><td class="text-right"><span class="${healthStatusClass}">${healthInsuranceEstimate.statusText}</span></td></tr>
        <tr><td>${icon('badge-dollar-sign')}건보료 반영 추정 금융소득</td><td class="text-right">${Math.floor(healthInsuranceEstimate.reflectedIncome).toLocaleString()} 원</td></tr>
        <tr class="highlight-row"><td>${icon('calendar-plus')}예상 월 건강보험료 증가액</td><td class="${healthIncreaseClass}">약 ${healthInsuranceEstimate.monthlyIncrease.toLocaleString()} 원</td></tr>
    `;

    document.getElementById('formulaContent').innerHTML = `• 배당소득과 이자소득 합계에 원천징수세율 15.4%를 적용하고, 금융소득이 2천만 원을 초과하는 경우 선택한 예상 종합소득세율을 기준으로 초과분 추가 부담 가능성을 단순 추정했습니다.<br>• 건강보험료는 ${HEALTH_INSURANCE_STANDARD_DATE}으로 건강보험료율 ${(HEALTH_INSURANCE_RATE * 100).toFixed(2)}%와 장기요양보험료율 ${(LONG_TERM_CARE_RATE * 100).toFixed(2)}%를 적용한 간이 추정입니다. ${healthInsuranceEstimate.note}<br>• 다른 종합소득 입력액(${Math.floor(otherTaxableIncome).toLocaleString()}원)은 세율 선택 판단용 참고값이며, 실제 종합소득세와 건강보험료 계산에는 공제·세액공제·배당가산·가입자 유형·재산 조건 등 세부 요건이 추가로 반영됩니다.`;
    showResult();
}
