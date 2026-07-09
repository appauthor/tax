const TRANSFER_ONE_HOME_EXEMPTION_LIMIT = 1200000000;
const TRANSFER_BASIC_DEDUCTION_DEFAULT = 2500000;
const TRANSFER_TAX_BRACKETS = [
    { limit: 14000000, rate: 0.06, deduction: 0 },
    { limit: 50000000, rate: 0.15, deduction: 1260000 },
    { limit: 88000000, rate: 0.24, deduction: 5760000 },
    { limit: 150000000, rate: 0.35, deduction: 15440000 },
    { limit: 300000000, rate: 0.38, deduction: 19940000 },
    { limit: 500000000, rate: 0.40, deduction: 25940000 },
    { limit: 1000000000, rate: 0.42, deduction: 35940000 },
    { limit: Infinity, rate: 0.45, deduction: 65940000 }
];

function getTransferProgressiveTax(taxBase) {
    if (taxBase <= 0) return 0;

    const bracket = TRANSFER_TAX_BRACKETS.find(item => taxBase <= item.limit);
    return Math.max(0, taxBase * bracket.rate - bracket.deduction);
}

function getTransferTaxRateLabel(taxBase, houseType, holdYears) {
    if (taxBase <= 0) return "과세표준 없음";
    if (houseType === "shortTerm" && holdYears < 1) return "단기 보유 70% 가정";
    if (houseType === "shortTerm" && holdYears < 2) return "단기 보유 60% 가정";

    const bracket = TRANSFER_TAX_BRACKETS.find(item => taxBase <= item.limit);
    return `기본세율 ${(bracket.rate * 100).toFixed(0)}% 구간`;
}

function getLongTermDeductionRate(houseType, holdYears, residenceYears) {
    const cappedHoldYears = Math.min(Math.max(Math.floor(holdYears), 0), 10);
    const cappedResidenceYears = Math.min(Math.max(Math.floor(residenceYears), 0), 10);

    if (holdYears < 3) return 0;

    if (houseType === "oneHome") {
        return Math.min(0.8, cappedHoldYears * 0.04 + cappedResidenceYears * 0.04);
    }

    return Math.min(0.3, Math.max(0, Math.floor(holdYears)) * 0.02);
}

function getTransferIncomeTax(taxBase, houseType, holdYears) {
    if (taxBase <= 0) return 0;

    if (houseType === "shortTerm" && holdYears < 1) {
        return taxBase * 0.7;
    }

    if (houseType === "shortTerm" && holdYears < 2) {
        return taxBase * 0.6;
    }

    return getTransferProgressiveTax(taxBase);
}

function calculateTransferTax() {
    const salePrice = getMoneyValue('transferSalePrice');
    const purchasePrice = getMoneyValue('transferPurchasePrice');
    const expenses = getMoneyValue('transferExpenses');
    const holdYears = Number(document.getElementById('transferHoldYears').value || 0);
    const residenceYears = Number(document.getElementById('transferResidenceYears').value || 0);
    const houseType = document.getElementById('transferHouseType').value;
    const basicDeduction = Number(document.getElementById('transferBasicDeduction').value || TRANSFER_BASIC_DEDUCTION_DEFAULT);

    if (isNaN(salePrice) || salePrice <= 0) {
        alert('양도가액을 정확히 입력해주세요.');
        return;
    }

    if (isNaN(purchasePrice) || purchasePrice <= 0) {
        alert('취득가액을 정확히 입력해주세요.');
        return;
    }

    if (isNaN(holdYears) || holdYears < 0 || isNaN(residenceYears) || residenceYears < 0) {
        alert('보유기간과 거주기간을 0 이상의 숫자로 입력해주세요.');
        return;
    }

    const gain = Math.max(0, salePrice - purchasePrice - expenses);
    const oneHomeTaxableGain = houseType === "oneHome" && salePrice > TRANSFER_ONE_HOME_EXEMPTION_LIMIT
        ? gain * ((salePrice - TRANSFER_ONE_HOME_EXEMPTION_LIMIT) / salePrice)
        : gain;
    const taxableGainBeforeDeduction = houseType === "oneHome" && salePrice <= TRANSFER_ONE_HOME_EXEMPTION_LIMIT ? 0 : oneHomeTaxableGain;
    const longTermDeductionRate = getLongTermDeductionRate(houseType, holdYears, residenceYears);
    const longTermDeduction = Math.floor(taxableGainBeforeDeduction * longTermDeductionRate);
    const transferIncome = Math.max(0, taxableGainBeforeDeduction - longTermDeduction);
    const taxBase = Math.max(0, transferIncome - basicDeduction);
    const incomeTax = Math.floor(getTransferIncomeTax(taxBase, houseType, holdYears));
    const localIncomeTax = Math.floor(incomeTax * 0.1);
    const totalTax = incomeTax + localIncomeTax;
    const houseTypeLabel = document.getElementById('transferHouseType').selectedOptions[0].textContent;
    const deductionLabel = document.getElementById('transferBasicDeduction').selectedOptions[0].textContent;
    const rateLabel = getTransferTaxRateLabel(taxBase, houseType, holdYears);
    const isOneHomeExempt = houseType === "oneHome" && salePrice <= TRANSFER_ONE_HOME_EXEMPTION_LIMIT;

    updateReportHeaders("REAL ESTATE TRANSFER TAX", "아파트 양도세 모의 계산 명세");

    document.getElementById('resultTableBody').innerHTML = `
        <tr class="highlight-row"><td>${icon('badge-dollar-sign')}양도가액</td><td class="text-right">${Math.floor(salePrice).toLocaleString()} 원</td></tr>
        <tr><td>${icon('home')}취득가액</td><td class="text-right">(-) ${Math.floor(purchasePrice).toLocaleString()} 원</td></tr>
        <tr><td>${icon('receipt-text')}필요경비</td><td class="text-right">(-) ${Math.floor(expenses).toLocaleString()} 원</td></tr>
        <tr class="highlight-row"><td>${icon('trending-up')}양도차익</td><td class="text-right">${Math.floor(gain).toLocaleString()} 원</td></tr>
        <tr><td>${icon('pin')}양도 주택 유형</td><td class="text-right">${houseTypeLabel}</td></tr>
        <tr><td>${icon('calendar-days')}보유기간 / 거주기간</td><td class="text-right">${holdYears.toLocaleString()}년 / ${residenceYears.toLocaleString()}년</td></tr>
        <tr><td>${icon('shield-check')}1세대 1주택 비과세 반영</td><td class="text-right">${isOneHomeExempt ? "12억 원 이하 비과세 가정" : "과세대상 금액 계산"}</td></tr>
        <tr><td>${icon('percent')}장기보유특별공제율</td><td class="text-right">${(longTermDeductionRate * 100).toFixed(1)}%</td></tr>
        <tr><td>▪︎ 과세대상 양도차익</td><td class="text-right">${Math.floor(taxableGainBeforeDeduction).toLocaleString()} 원</td></tr>
        <tr><td>▪︎ 장기보유특별공제</td><td class="text-right">(-) ${longTermDeduction.toLocaleString()} 원</td></tr>
        <tr><td>▪︎ 양도소득금액</td><td class="text-right">${Math.floor(transferIncome).toLocaleString()} 원</td></tr>
        <tr><td>${icon('scale')}기본공제</td><td class="text-right">${deductionLabel}</td></tr>
        <tr class="highlight-row"><td>${icon('landmark')}양도소득 과세표준</td><td class="text-right">${Math.floor(taxBase).toLocaleString()} 원</td></tr>
        <tr><td>${icon('receipt')}적용 세율</td><td class="text-right">${rateLabel}</td></tr>
        <tr><td>▪︎ 양도소득세 본세</td><td class="text-right">${incomeTax.toLocaleString()} 원</td></tr>
        <tr><td>▪︎ 지방소득세 추정</td><td class="text-right">${localIncomeTax.toLocaleString()} 원</td></tr>
        <tr class="total-row"><td>${icon('target')}예상 양도 관련 세금 합계</td><td class="text-right">${totalTax.toLocaleString()} 원</td></tr>
    `;

    document.getElementById('formulaContent').innerHTML = `• 양도차익 = 양도가액 - 취득가액 - 필요경비입니다.<br>• 1세대 1주택 가정은 양도가액 12억 원 이하를 비과세로 보고, 12억 원 초과분은 양도차익 × (양도가액 - 12억 원) ÷ 양도가액으로 과세대상 양도차익을 계산했습니다.<br>• 장기보유특별공제는 일반 주택은 보유 3년 이상부터 연 2%, 최대 30%, 1세대 1주택은 보유·거주기간을 각각 연 4%로 보아 최대 80%까지 간이 반영했습니다.<br>• 단기 보유 선택 시 보유 1년 미만 70%, 1년 이상 2년 미만 60%를 단순 적용했습니다. 실제 세액은 주택 수, 조정대상지역, 비과세 요건, 감면, 취득 원인, 신고 시점의 세법에 따라 달라질 수 있습니다.`;
    showResult();
}
