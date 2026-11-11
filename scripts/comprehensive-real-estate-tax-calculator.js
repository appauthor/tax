(function () {
    "use strict";

    function money(id) {
        return getMoneyValue(id) || 0;
    }

    function optionalMoney(id) {
        const element = document.getElementById(id);
        return element && element.value.trim() !== "" ? money(id) : null;
    }

    function formatWon(value) {
        return `${Math.floor(value).toLocaleString()} 원`;
    }

    function toggleOneHomeFields() {
        const oneHome = document.getElementById('comprehensiveTaxType').value !== 'general';
        document.getElementById('oneHomeCreditFields').hidden = !oneHome;
        document.getElementById('comprehensiveHomeCount').disabled = oneHome;
        if (oneHome) document.getElementById('comprehensiveHomeCount').value = '1';
    }

    window.applyComprehensiveTaxPreset = function (publicPrice) {
        document.getElementById('comprehensiveTaxType').value = 'one-home';
        document.getElementById('comprehensiveHomeCount').value = '1';
        document.getElementById('comprehensivePublicPrice').value = formatMoneyValue(publicPrice);
        document.getElementById('comprehensiveCurrentPropertyTax').value = '';
        document.getElementById('confirmedPropertyTaxCredit').value = '';
        document.getElementById('comprehensiveAge').value = '0';
        document.getElementById('comprehensiveHoldingYears').value = '0';
        document.getElementById('previousPropertyTaxEquivalent').value = '';
        document.getElementById('previousComprehensiveTaxEquivalent').value = '';
        toggleOneHomeFields();
        document.getElementById('comprehensivePresetStatus').innerText = `공시가격 ${(publicPrice / 100000000).toLocaleString()}억 원과 1세대 1주택 조건을 입력했습니다. 실제 재산세 본세와 공제 조건을 추가로 확인하세요.`;
        document.getElementById('comprehensivePublicPrice').focus();
    };

    window.calculateComprehensiveRealEstateTax = function () {
        const publicPrice = money('comprehensivePublicPrice');
        if (publicPrice <= 0) {
            alert('인별 합산 공시가격을 입력해 주세요.');
            return;
        }

        const taxType = document.getElementById('comprehensiveTaxType').value;
        const oneHouseholdOneHome = taxType !== 'general';
        const homeCount = Number(document.getElementById('comprehensiveHomeCount').value);
        const creditInput = document.getElementById('confirmedPropertyTaxCredit').value.trim();
        const propertyInput = document.getElementById('comprehensiveCurrentPropertyTax').value.trim();
        const deduction = oneHouseholdOneHome ? 1200000000 : 900000000;
        if (publicPrice > deduction && ((!oneHouseholdOneHome && creditInput === '') || (creditInput === '' && propertyInput === ''))) {
            document.getElementById('resultBox').style.display = 'none';
            alert(!oneHouseholdOneHome ? '일반 개인(여러 주택·일반 공동명의 포함)은 종부세 계산서에서 확인한 공제할 재산세액을 직접 입력해 주세요. 공제액이 없으면 0을 입력하세요.' : '재산세 본세 또는 확인한 공제할 재산세액을 입력해 주세요. 해당 세액이 없으면 0을 입력하세요.');
            return;
        }
        if ((optionalMoney('previousPropertyTaxEquivalent') != null || optionalMoney('previousComprehensiveTaxEquivalent') != null) && propertyInput === '') {
            document.getElementById('resultBox').style.display = 'none';
            alert('세부담상한을 계산하려면 당해 연도 재산세 본세도 입력해 주세요.');
            return;
        }
        const age = oneHouseholdOneHome ? Number(document.getElementById('comprehensiveAge').value || 0) : 0;
        const holdingYears = oneHouseholdOneHome ? Number(document.getElementById('comprehensiveHoldingYears').value || 0) : 0;
        if (!Number.isFinite(age) || age < 0 || age > 120 || !Number.isFinite(holdingYears) || holdingYears < 0 || holdingYears > 100) {
            document.getElementById('resultBox').style.display = 'none';
            alert('만 나이는 0~120세, 보유기간은 0~100년 범위로 입력해 주세요.');
            return;
        }
        let result;
        try {
            result = PropertyTaxMath.calculateComprehensiveHousingTax({
                publicPrice,
                homeCount,
                oneHouseholdOneHome,
                currentPropertyTax: money('comprehensiveCurrentPropertyTax'),
                confirmedPropertyTaxCredit: optionalMoney('confirmedPropertyTaxCredit'),
                age,
                holdingYears,
                previousPropertyTax: optionalMoney('previousPropertyTaxEquivalent'),
                previousComprehensiveTax: optionalMoney('previousComprehensiveTaxEquivalent')
            });
        } catch (error) {
            document.getElementById('resultBox').style.display = 'none';
            alert('금액을 0 이상의 유효한 숫자로 입력해 주세요.');
            return;
        }

        updateReportHeaders('COMPREHENSIVE REAL ESTATE TAX', taxType === 'joint-special' ? '공동명의 1주택 특례' : (oneHouseholdOneHome ? '1세대 1주택자' : `${result.homeCount}주택 개인`));
        document.getElementById('resultTableBody').innerHTML = `
            <tr><td>${icon('house')}인별 합산 공시가격</td><td class="text-right">${formatWon(result.publicPrice)}</td></tr>
            <tr><td>${icon('badge-minus')}기본공제</td><td class="text-right">${formatWon(result.deduction)}</td></tr>
            <tr class="highlight-row"><td>${icon('calculator')}종부세 과세표준</td><td class="text-right">${formatWon(result.taxBase)}</td></tr>
            <tr><td>&nbsp;&nbsp;▪︎ 재산세 공제 전 종부세</td><td class="text-right">${formatWon(result.taxBeforePropertyCredit)}</td></tr>
            <tr><td>&nbsp;&nbsp;▪︎ 공제할 재산세액</td><td class="text-right">- ${formatWon(result.propertyTaxCredit)}</td></tr>
            <tr><td>&nbsp;&nbsp;▪︎ 1세대 1주택 세액공제 (${Math.round(result.combinedCreditRate * 100)}%)</td><td class="text-right">- ${formatWon(result.oneHomeCredit)}</td></tr>
            <tr><td>&nbsp;&nbsp;▪︎ 세부담상한 초과 공제</td><td class="text-right">- ${formatWon(result.burdenCapCredit)}</td></tr>
            <tr class="highlight-row"><td>${icon('landmark')}예상 종합부동산세</td><td class="text-right">${formatWon(result.comprehensiveTax)}</td></tr>
            <tr><td>&nbsp;&nbsp;▪︎ 농어촌특별세 (20%)</td><td class="text-right">${formatWon(result.ruralSpecialTax)}</td></tr>
            <tr class="total-row"><td>${icon('target')}예상 납부세액 합계</td><td class="text-right">${formatWon(result.total)}</td></tr>
        `;

        const propertyCreditNote = result.propertyTaxCreditConfirmed
            ? '확인한 공제할 재산세액을 사용했습니다.'
            : `재산세 공정시장가액비율 ${Math.round(result.propertyFairMarketRatio * 100)}%와 표준세율로 공제액을 추정했습니다. 여러 주택은 계산서의 공제액 직접 입력이 필요합니다.`;
        const capNote = result.burdenCapAvailable
            ? `직전연도 총세액의 150% 세부담상한을 반영했습니다.`
            : '직전연도 재산세·종부세 상당액을 모두 입력하지 않아 세부담상한은 반영하지 않았습니다.';
        document.getElementById('formulaContent').innerHTML = `• 공시가격 합계에서 ${formatWon(result.deduction)}을 공제하고 공정시장가액비율 60%와 ${result.rateGroup === 'threeOrMore' ? '3주택 이상' : '2주택 이하'} 세율을 적용했습니다. ${propertyCreditNote} ${capNote} 적용연도 2026년 · 과세기준일 2026년 6월 1일.`;
        showResult();
    };

    document.addEventListener('DOMContentLoaded', function () {
        bindMoneyInputs(document);
        document.getElementById('comprehensiveTaxType').addEventListener('change', toggleOneHomeFields);
        toggleOneHomeFields();
    });
})();
