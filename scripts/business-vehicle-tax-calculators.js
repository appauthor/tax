(function () {
    'use strict';

    const MathEngine = window.BusinessVehicleTaxMath;

    function money(value) {
        return `${Math.floor(value).toLocaleString()} 원`;
    }

    function percent(value) {
        return `${(value * 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}%`;
    }

    function renderRows(rows, formula) {
        document.getElementById('resultTableBody').innerHTML = rows.map(row => {
            const className = row.className ? ` class="${row.className}"` : '';
            return `<tr${className}><td>${icon(row.icon)}${row.label}</td><td class="text-right">${row.value}</td></tr>`;
        }).join('');
        document.getElementById('formulaContent').innerHTML = formula;
        showResult();
    }

    function calculateVatPage() {
        const mode = document.getElementById('vatMode').value;
        const amount = getMoneyValue('vatAmount');
        const rounding = document.getElementById('vatRounding').value;
        if (amount <= 0) return alert('계산할 금액을 입력해 주세요.');
        const result = MathEngine.calculateVat({ mode, amount, rounding });
        const modeLabel = document.getElementById('vatMode').selectedOptions[0].textContent;
        const roundingLabel = document.getElementById('vatRounding').selectedOptions[0].textContent;
        updateReportHeaders('2026 VAT REPORT', '부가세 계산기 결과');
        renderRows([
            { icon: 'pencil-line', label: `입력 기준 (${modeLabel})`, value: money(result.inputAmount) },
            { icon: 'package-open', label: '공급가액', value: money(result.supply), className: 'highlight-row' },
            { icon: 'percent', label: '부가세 (10%)', value: money(result.vat) },
            { icon: 'badge-check', label: '합계금액', value: money(result.total), className: 'total-row' },
            { icon: 'between-horizontal-end', label: '원 미만 표시 처리', value: roundingLabel }
        ], `<p><strong>공급가액 입력:</strong> 부가세 = 공급가액 × 10%</p><p><strong>합계금액 입력:</strong> 공급가액 = 합계금액 × 100 / 110</p><p>정밀 계산값은 공급가액 ${result.exactSupply.toLocaleString(undefined, { maximumFractionDigits: 4 })}원, 부가세 ${result.exactVat.toLocaleString(undefined, { maximumFractionDigits: 4 })}원입니다. 결과표에는 선택한 표시 처리를 적용했습니다.</p>`);
    }

    function validateFreelancerBusinessComparison({ focusInvalid = false } = {}) {
        const withholdingType = document.getElementById('comparisonWithholdingType');
        const vatType = document.getElementById('comparisonVatType');
        const message = document.getElementById('comparisonValidationMessage');
        if (!withholdingType || !vatType || !message) return true;

        withholdingType.removeAttribute('aria-invalid');
        vatType.removeAttribute('aria-invalid');
        let invalidInput = null;
        let text = '';
        if (withholdingType.value !== 'confirmed') {
            invalidInput = withholdingType;
            text = '현재 계약이 3.3% 원천징수 대상 인적용역인지 먼저 확인해 주세요.';
        } else if (vatType.value !== 'confirmed') {
            invalidInput = vatType;
            text = '비교할 사업자 계약이 일반과세자의 10% 과세용역인지 먼저 확인해 주세요.';
        }

        message.textContent = text;
        message.hidden = !text;
        if (invalidInput) {
            invalidInput.setAttribute('aria-invalid', 'true');
            if (focusInvalid) invalidInput.focus();
            return false;
        }
        return true;
    }

    function updateComparisonPricingHelp() {
        const mode = document.getElementById('comparisonPricingMode')?.value;
        const help = document.getElementById('comparisonPricingHelp');
        if (!help) return;
        help.textContent = mode === 'fixed-total'
            ? '입력액을 거래처가 지급할 총예산으로 보고, 사업자 계약의 공급가액과 부가세를 110분의 100으로 나눕니다.'
            : '입력액을 두 계약의 동일한 용역대가로 보고, 사업자 계약에서는 부가세 10%를 거래처 지급액에 더합니다.';
    }

    function calculateFreelancerBusinessComparisonPage() {
        const contractAmount = getMoneyValue('comparisonContractAmount');
        if (contractAmount <= 0) return alert('비교할 계약·정산 금액을 입력해 주세요.');
        if (!validateFreelancerBusinessComparison({ focusInvalid: true })) return;

        const pricingMode = document.getElementById('comparisonPricingMode').value;
        const result = MathEngine.calculateFreelancerBusinessTaxComparison({
            contractAmount,
            pricingMode,
            expenseSupply: getMoneyValue('comparisonExpenseSupply'),
            deductibleInputVat: getMoneyValue('comparisonInputVat')
        });
        const pricingLabel = document.getElementById('comparisonPricingMode').selectedOptions[0].textContent;
        const vatSettlementLabel = result.business.vatBalance >= 0 ? '예상 부가세 납부액' : '예상 부가세 환급액';
        const vatSettlementValue = result.business.vatBalance >= 0 ? result.business.vatPayable : result.business.vatRefund;
        const differenceDirection = result.cashDifference > 0
            ? '일반과세 계약 쪽이 큼'
            : result.cashDifference < 0 ? '3.3% 계약 쪽이 큼' : '차이 없음';

        updateReportHeaders('2026 BUSINESS TAX COMPARISON', '프리랜서·개인사업자 세금 비교 결과');
        renderRows([
            { icon: 'file-pen-line', label: `계약금액 기준 (${pricingLabel})`, value: money(result.contractAmount) },
            { icon: 'receipt-text', label: '[3.3% 계약] 원천징수 전 지급액', value: money(result.freelancer.grossPayment) },
            { icon: 'badge-minus', label: '[3.3% 계약] 소득세 (3%)', value: `(-) ${money(result.freelancer.incomeTax)}` },
            { icon: 'badge-minus', label: '[3.3% 계약] 지방소득세', value: `(-) ${money(result.freelancer.localIncomeTax)}` },
            { icon: 'wallet', label: '[3.3% 계약] 경비·원천징수 후 현금', value: money(result.freelancer.cashAfterExpenses), className: 'highlight-row' },
            { icon: 'store', label: '[일반과세 계약] 공급가액', value: money(result.business.supply) },
            { icon: 'percent', label: '[일반과세 계약] 매출 부가세', value: money(result.business.outputVat) },
            { icon: 'receipt', label: '[일반과세 계약] 거래처 지급 총액', value: money(result.business.invoiceTotal) },
            { icon: 'badge-check', label: '[일반과세 계약] 공제 가능 매입세액', value: money(result.deductibleInputVat) },
            { icon: result.business.vatBalance >= 0 ? 'landmark' : 'rotate-ccw', label: `[일반과세 계약] ${vatSettlementLabel}`, value: money(vatSettlementValue) },
            { icon: 'wallet-cards', label: '[일반과세 계약] 경비·부가세 정산 후 현금', value: money(result.business.cashAfterExpenses), className: 'highlight-row' },
            { icon: 'scale', label: `현재 현금흐름 차액 (${differenceDirection})`, value: money(Math.abs(result.cashDifference)), className: 'total-row' }
        ], `<p><strong>적용 기준:</strong> 2026년 8월 17일 확인 · 원천징수 대상 사업소득 소득세 3%, 그 소득세의 10%인 개인지방소득세, 일반과세자 부가세 10%</p><p><strong>공통 경비 지출:</strong> 공급가액 ${money(result.expenseSupply)} + 입력한 매입세액 ${money(result.deductibleInputVat)}</p><p><strong>3.3% 계약:</strong> ${money(result.freelancer.grossPayment)} - 원천징수 ${money(result.freelancer.totalWithholding)} - 경비 지급액 ${money(result.expenseCashPaid)}</p><p><strong>일반과세 계약:</strong> 거래처 지급액 ${money(result.business.invoiceTotal)} - 경비 지급액 ${money(result.expenseCashPaid)} - 부가세 납부액 ${money(result.business.vatPayable)} + 부가세 환급액 ${money(result.business.vatRefund)}</p><p>이 차액은 최종 절세액이 아니라 종합소득세 정산 전 현금흐름 차이입니다. 3.3%는 기납부세액이며, 실제 부가세 공제·환급과 최종 종합소득세는 신고 결과에 따라 달라집니다.</p>`);
    }

    function validateMultiChildSelection({ focusInvalid = false } = {}) {
        const childInput = document.getElementById('under18ChildCount');
        const categoryInput = document.getElementById('multiChildVehicleCategory');
        const eligibilityInput = document.getElementById('multiChildEligibility');
        const message = document.getElementById('multiChildValidationMessage');
        if (!childInput || !categoryInput || !eligibilityInput || !message) return true;

        childInput.removeAttribute('aria-invalid');
        categoryInput.removeAttribute('aria-invalid');
        let invalidInput = null;
        let text = '';
        if (eligibilityInput.value === 'confirmed' && Number(childInput.value) < 2) {
            invalidInput = childInput;
            text = '다자녀 감면을 적용하려면 18세 미만 자녀 수를 2명 이상으로 선택해 주세요.';
        } else if (eligibilityInput.value === 'confirmed' && categoryInput.value === 'ineligible') {
            invalidInput = categoryInput;
            text = '다자녀 감면 대상 차량을 확인해 차량 구분을 선택해 주세요. “감면 대상 외 또는 확인 전” 상태에서는 감면할 수 없습니다.';
        }

        message.textContent = text;
        message.hidden = !text;
        if (invalidInput) {
            invalidInput.setAttribute('aria-invalid', 'true');
            if (focusInvalid) invalidInput.focus();
            return false;
        }
        return true;
    }

    function syncVehicleTaxBase({ focusEditable = false } = {}) {
        const sameAsPurchase = document.getElementById('vehicleTaxBaseSame');
        const purchaseInput = document.getElementById('vehiclePurchasePrice');
        const taxBaseInput = document.getElementById('vehicleTaxBase');
        if (!sameAsPurchase || !purchaseInput || !taxBaseInput) return;

        taxBaseInput.disabled = sameAsPurchase.checked;
        if (sameAsPurchase.checked) {
            taxBaseInput.value = typeof formatMoneyValue === 'function'
                ? formatMoneyValue(purchaseInput.value)
                : purchaseInput.value;
            taxBaseInput.setAttribute('aria-disabled', 'true');
        } else {
            taxBaseInput.removeAttribute('aria-disabled');
            if (focusEditable) taxBaseInput.focus();
        }
    }

    function calculateVehicleAcquisitionPage() {
        const purchasePrice = getMoneyValue('vehiclePurchasePrice');
        const taxBase = getMoneyValue('vehicleTaxBase');
        if (purchasePrice <= 0 || taxBase <= 0) return alert('차량가격과 취득세 과세표준을 모두 입력해 주세요.');
        const vehicleType = document.getElementById('vehicleAcquisitionType').value;
        const under18ChildCount = Number(document.getElementById('under18ChildCount').value);
        const multiChildVehicleCategory = document.getElementById('multiChildVehicleCategory').value;
        const multiChildEligibilityConfirmed = document.getElementById('multiChildEligibility').value === 'confirmed';
        if (!validateMultiChildSelection({ focusInvalid: true })) return;
        const result = MathEngine.calculateVehicleAcquisition({
            purchasePrice,
            taxBase,
            vehicleType,
            registrationCosts: getMoneyValue('vehicleRegistrationCosts'),
            otherCosts: getMoneyValue('vehicleOtherCosts'),
            under18ChildCount,
            multiChildVehicleCategory,
            multiChildEligibilityConfirmed
        });
        const typeLabel = document.getElementById('vehicleAcquisitionType').selectedOptions[0].textContent;
        const childLabel = document.getElementById('under18ChildCount').selectedOptions[0].textContent;
        const reductionRuleLabels = {
            'not-applied': '감면 미적용',
            'two-children-700000-cap': '2자녀 일반 승용차 최대 70만원 공제',
            'two-children-50-percent': '2자녀 50% 경감',
            'three-plus-1400000-cap': '3자녀 이상 일반 승용차 최대 140만원 공제',
            'three-plus-exempt': '3자녀 이상 면제',
            'three-plus-85-percent-minimum-tax': '3자녀 이상 85% 감면(최소납부세제)'
        };
        updateReportHeaders('2026 VEHICLE TAX REPORT', '자동차 취득·등록비용 결과');
        renderRows([
            { icon: 'car-front', label: '차량 구매가격', value: money(result.purchasePrice) },
            { icon: 'scale', label: '취득세 과세표준', value: money(result.taxBase) },
            { icon: 'percent', label: `산출 취득세 (${percent(result.rate)})`, value: money(result.acquisitionTax) },
            { icon: 'badge-minus', label: `다자녀 감면 (${childLabel})`, value: `(-) ${money(result.multiChildReduction)}` },
            { icon: 'landmark', label: '예상 납부 취득세', value: money(result.payableAcquisitionTax), className: 'highlight-row' },
            { icon: 'file-input', label: '사용자 입력 등록 관련 비용', value: money(result.registrationCosts) },
            { icon: 'wallet-cards', label: '사용자 입력 기타 구매비용', value: money(result.otherCosts) },
            { icon: 'badge-check', label: '예상 실구매가', value: money(result.estimatedPurchaseTotal), className: 'total-row' }
        ], `<p><strong>적용 구분:</strong> ${typeLabel}</p><p><strong>산출 취득세:</strong> ${money(result.taxBase)} × ${percent(result.rate)} = ${money(result.acquisitionTax)} (10원 미만 버림)</p><p><strong>다자녀 감면:</strong> ${reductionRuleLabels[result.multiChild.rule]} · ${money(result.multiChildReduction)}</p><p><strong>예상 실구매가:</strong> 차량 구매가격 + 감면 후 취득세 + 사용자가 직접 입력한 비용</p><p>적용 기준일은 2026년 8월 13일이며 감면은 2027년 12월 31일까지 취득·등록하는 요건을 전제로 합니다. 등록면허세를 별도 취득 세목으로 더하지 않았고 공채·보험료·탁송료는 자동 추정하지 않습니다.</p>`);
    }

    function toggleVehicleAnnualFields() {
        const isEngine = document.getElementById('annualVehicleKind')?.value === 'engine';
        const group = document.getElementById('annualDisplacementGroup');
        const input = document.getElementById('annualDisplacement');
        group?.classList.toggle('is-hidden', !isEngine);
        if (input) {
            input.disabled = !isEngine;
            input.required = isEngine;
        }
    }

    function calculateVehicleAnnualPage() {
        const vehicleKind = document.getElementById('annualVehicleKind').value;
        const displacement = Number(document.getElementById('annualDisplacement').value || 0);
        if (vehicleKind === 'engine' && displacement <= 0) return alert('배기량을 1cc 이상으로 입력해 주세요.');
        try {
            const result = MathEngine.calculateVehicleAnnualTax({
                taxYear: Number(document.getElementById('annualTaxYear').value),
                vehicleKind,
                usage: document.getElementById('annualUsage').value,
                displacement,
                baseYear: Number(document.getElementById('annualBaseYear').value),
                baseHalf: document.getElementById('annualBaseHalf').value,
                prepaymentTiming: document.getElementById('annualPrepaymentTiming').value
            });
            const timingLabel = document.getElementById('annualPrepaymentTiming').selectedOptions[0].textContent;
            updateReportHeaders('2026 VEHICLE ANNUAL TAX', '자동차세·연납 계산 결과');
            renderRows([
                { icon: 'calendar-range', label: `상반기 자동차세 (차령 ${result.firstHalfAge}년)`, value: money(result.firstHalfTax) },
                { icon: 'calendar-range', label: `하반기 자동차세 (차령 ${result.secondHalfAge}년)`, value: money(result.secondHalfTax) },
                { icon: 'car-front', label: '연간 자동차세 본세', value: money(result.annualVehicleTax), className: 'highlight-row' },
                { icon: 'badge-minus', label: `연납 공제 (${timingLabel})`, value: `(-) ${money(result.prepaymentDiscount)}` },
                { icon: 'landmark', label: '공제 후 자동차세', value: money(result.vehicleTaxAfterDiscount) },
                { icon: 'school', label: `지방교육세 (${percent(result.educationTaxRate)})`, value: money(result.localEducationTax) },
                { icon: 'badge-check', label: '예상 납부세액', value: money(result.totalTax), className: 'total-row' }
            ], `<p><strong>적용 연도:</strong> 2026년</p><p><strong>차령 경감:</strong> 상반기 ${percent(result.firstHalfReductionRate)}, 하반기 ${percent(result.secondHalfReductionRate)}</p><p><strong>본세:</strong> ${result.perCc === null ? '배기량이 없는 승용차 연세액' : `${result.displacement.toLocaleString()}cc × cc당 ${result.perCc.toLocaleString()}원`}</p><p>2026년 연납 이자율 5%를 선택한 납부 시기 이후 기간의 세액에 적용했고, 각 세액과 공제액은 10원 미만을 버렸습니다.</p>`);
        } catch (error) {
            alert('입력값을 확인해 주세요. 차령기산연도는 2026년보다 늦을 수 없습니다.');
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        document.getElementById('vatCalculatorForm')?.addEventListener('submit', event => { event.preventDefault(); calculateVatPage(); });
        document.getElementById('freelancerBusinessComparisonForm')?.addEventListener('submit', event => { event.preventDefault(); calculateFreelancerBusinessComparisonPage(); });
        document.getElementById('vehicleAcquisitionCalculatorForm')?.addEventListener('submit', event => { event.preventDefault(); calculateVehicleAcquisitionPage(); });
        document.getElementById('vehicleAnnualCalculatorForm')?.addEventListener('submit', event => { event.preventDefault(); calculateVehicleAnnualPage(); });
        document.getElementById('annualVehicleKind')?.addEventListener('change', toggleVehicleAnnualFields);
        ['under18ChildCount', 'multiChildVehicleCategory', 'multiChildEligibility'].forEach(id => {
            document.getElementById(id)?.addEventListener?.('change', () => validateMultiChildSelection());
        });
        ['comparisonWithholdingType', 'comparisonVatType'].forEach(id => {
            document.getElementById(id)?.addEventListener?.('change', () => validateFreelancerBusinessComparison());
        });
        document.getElementById('comparisonPricingMode')?.addEventListener?.('change', updateComparisonPricingHelp);
        document.getElementById('vehicleTaxBaseSame')?.addEventListener?.('change', () => syncVehicleTaxBase({ focusEditable: true }));
        document.getElementById('vehiclePurchasePrice')?.addEventListener?.('input', () => syncVehicleTaxBase());
        syncVehicleTaxBase();
        validateMultiChildSelection();
        updateComparisonPricingHelp();
        toggleVehicleAnnualFields();
    });
})();
