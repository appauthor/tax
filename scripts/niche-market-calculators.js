(function () {
    'use strict';

    function money(value) {
        return `${Math.round(value).toLocaleString()} 원`;
    }

    function percent(value, digits = 1) {
        return `${Number(value.toFixed(digits))}%`;
    }

    function hideResult() {
        const resultBox = document.getElementById('resultBox');
        if (resultBox) resultBox.style.display = 'none';
    }

    function renderRows(rows, notice, formula) {
        document.getElementById('resultTableBody').innerHTML = rows.map(row => `
            <tr${row.className ? ` class="${row.className}"` : ''}>
                <td>${icon(row.icon || 'circle-dot')}${row.label}</td>
                <td class="text-right">${row.value}</td>
            </tr>`).join('');
        document.getElementById('resultNotice').innerHTML = notice;
        document.getElementById('formulaContent').innerHTML = formula;
        showResult();
    }

    function toggleUnrelatedConfirmation() {
        const relationship = document.getElementById('propertyTransferRelationship');
        const group = document.getElementById('propertyTransferNoReasonGroup');
        const checkbox = document.getElementById('propertyTransferNoReason');
        const beneficiaryRelation = document.getElementById('propertyTransferBeneficiaryRelation');
        if (!relationship || !group || !checkbox || !beneficiaryRelation) return;
        const unrelated = relationship.value === 'unrelated';
        group.hidden = !unrelated;
        checkbox.disabled = !unrelated;
        if (unrelated) {
            beneficiaryRelation.dataset.relatedValue = beneficiaryRelation.value;
            beneficiaryRelation.value = 'none';
            beneficiaryRelation.disabled = true;
        } else {
            checkbox.checked = false;
            beneficiaryRelation.disabled = false;
            beneficiaryRelation.value = beneficiaryRelation.dataset.relatedValue || 'adultChild';
        }
    }

    function calculatePropertyTransfer(event) {
        event.preventDefault();
        hideResult();
        const transactionType = document.getElementById('propertyTransferType').value;
        const marketValue = getMoneyValue('propertyTransferMarketValue');
        const transactionPrice = getMoneyValue('propertyTransferPrice');
        const related = document.getElementById('propertyTransferRelationship').value === 'related';
        const noReason = document.getElementById('propertyTransferNoReason');
        const validation = document.getElementById('propertyTransferValidation');
        validation.hidden = true;

        if ((transactionType === 'lowPurchase' && transactionPrice >= marketValue) ||
            (transactionType === 'highSale' && transactionPrice <= marketValue)) {
            validation.textContent = transactionType === 'lowPurchase'
                ? '저가양수는 거래가액이 시가보다 낮아야 합니다.'
                : '고가양도는 거래가액이 시가보다 높아야 합니다.';
            validation.hidden = false;
            return;
        }
        if (!related && !noReason.checked) {
            validation.textContent = '특수관계가 없는 거래는 거래 관행상 정당한 사유가 없다는 전제를 확인해야 계산할 수 있습니다.';
            validation.hidden = false;
            noReason.focus();
            return;
        }

        try {
            const result = NicheMarketMath.calculateFamilyPropertyTransferGift({
                transactionType,
                marketValue,
                transactionPrice,
                related,
                noJustifiableReason: noReason.checked,
                beneficiaryRelation: related
                    ? document.getElementById('propertyTransferBeneficiaryRelation').value
                    : 'none',
                priorGiftAmount: getMoneyValue('propertyTransferPriorGift'),
                priorGiftTaxPaid: getMoneyValue('propertyTransferPriorTax')
            });
            const typeLabel = transactionType === 'lowPurchase' ? '저가양수' : '고가양도';
            const thresholdLabel = related
                ? `시가의 30%와 3억원 중 작은 금액`
                : '시가의 30% 초과 여부와 3억원 차감';
            updateReportHeaders('FAMILY PROPERTY GIFT', `가족 간 ${typeLabel} 증여이익·세금 결과`);
            renderRows([
                { icon: 'landmark', label: '확인한 시가', value: money(result.marketValue) },
                { icon: 'handshake', label: '실제 거래가액', value: money(result.transactionPrice) },
                { icon: 'badge-percent', label: `${typeLabel} 경제적 이익`, value: money(result.economicBenefit), className: 'highlight-row' },
                { icon: 'scale', label: '과세요건 비교 기준', value: money(result.threshold) },
                { icon: result.taxableConditionMet ? 'triangle-alert' : 'circle-check-big', label: '과세요건 판정', value: result.taxableConditionMet ? '기준 초과' : '기준 이내' },
                { icon: 'gift', label: '이번 거래 증여재산가액', value: money(result.currentGiftValue), className: 'highlight-row' },
                { icon: 'history', label: '10년 합산 증여재산가액', value: money(result.aggregateGiftAmount) },
                { icon: 'badge-minus', label: '관계별 증여재산공제', value: `(-) ${money(result.deduction)}` },
                { icon: 'calculator', label: '합산 증여세 과세표준', value: money(result.aggregateTaxBase) },
                { icon: 'receipt-text', label: '합산 산출세액', value: money(result.aggregateCalculatedTax) },
                { icon: 'circle-dollar-sign', label: '기납부 증여세 입력액', value: `(-) ${money(result.priorGiftTaxPaid)}` },
                { icon: 'target', label: '이번 거래 예상 증여세', value: money(result.currentEstimatedTax), className: 'total-row' }
            ], `※ ${related ? '특수관계인' : '특수관계가 없는 사람'} 사이 ${typeLabel}로 계산했습니다. ${thresholdLabel}을 적용한 간이 결과입니다. 시가 인정 여부, 정당한 사유, 같은 증여자의 10년 합산, 기납부세액과 세대생략 할증은 신고 전에 별도로 확인하세요.`, `• 경제적 이익 = ${transactionType === 'lowPurchase' ? '시가 − 거래가액' : '거래가액 − 시가'}<br>• 특수관계인 증여재산가액 = 경제적 이익 − min(시가 × 30%, 3억원)<br>• 비특수관계인은 거래 관행상 정당한 사유가 없고 차액이 시가의 30%를 초과한다는 전제에서 경제적 이익 − 3억원<br>• 합산 과세표준 = max(0, 10년 합산 증여재산가액 − 관계별 공제)<br>• 이번 예상세액 = 5단계 누진 산출세액 − 입력한 기납부 증여세`);
        } catch {
            alert('시가, 거래가액과 과거 증여 입력값을 확인해 주세요.');
        }
    }

    function togglePremiumVatFields() {
        const vat = document.getElementById('commercialPremiumVat');
        const mode = document.getElementById('commercialPremiumAmountMode');
        if (!vat || !mode) return;
        const applicable = vat.value === 'taxable';
        mode.disabled = !applicable;
        if (!applicable) mode.value = 'vatExtra';
    }

    function calculateCommercialPremium(event) {
        event.preventDefault();
        hideResult();
        const incomeConfirmation = document.getElementById('commercialPremiumIncomeConfirmation');
        const withholdingConfirmation = document.getElementById('commercialPremiumWithholdingConfirmation');
        const validation = document.getElementById('commercialPremiumValidation');
        validation.hidden = true;
        if (incomeConfirmation.value !== 'confirmed' || withholdingConfirmation.value !== 'confirmed') {
            validation.textContent = incomeConfirmation.value !== 'confirmed'
                ? '권리금이 영업권·점포임차권 양도대가인 기타소득인지 먼저 확인해 주세요.'
                : '양수자가 기타소득 원천징수의무자라는 전제를 확인해 주세요.';
            validation.hidden = false;
            (incomeConfirmation.value !== 'confirmed' ? incomeConfirmation : withholdingConfirmation).focus();
            return;
        }

        try {
            const result = NicheMarketMath.calculateCommercialPremiumTax({
                amount: getMoneyValue('commercialPremiumAmount'),
                amountMode: document.getElementById('commercialPremiumAmountMode').value,
                vatApplicable: document.getElementById('commercialPremiumVat').value === 'taxable',
                actualExpense: getMoneyValue('commercialPremiumActualExpense')
            });
            updateReportHeaders('COMMERCIAL PREMIUM TAX', '상가 권리금 세금·원천징수 결과');
            renderRows([
                { icon: 'store', label: '권리금 공급가액', value: money(result.supplyValue), className: 'highlight-row' },
                { icon: 'receipt-text', label: '부가가치세', value: money(result.vat) },
                { icon: 'wallet-cards', label: '양수자 계약상 총 지급액', value: money(result.buyerTotalPayment) },
                { icon: 'badge-minus', label: '법정 필요경비 60%', value: money(result.statutoryExpense) },
                { icon: 'file-check-2', label: '적용 필요경비', value: money(result.deductibleExpense) },
                { icon: 'calculator', label: '기타소득금액', value: money(result.otherIncome), className: 'highlight-row' },
                { icon: 'landmark', label: '기타소득세 원천징수', value: money(result.incomeTaxWithholding) },
                { icon: 'map-pinned', label: '개인지방소득세 원천징수', value: money(result.localIncomeTaxWithholding) },
                { icon: 'circle-dollar-sign', label: '원천징수 합계', value: money(result.totalWithholding) },
                { icon: 'hand-coins', label: '양도자 입금액', value: money(result.sellerCashReceipt), className: 'total-row' }
            ], `※ 영업권·점포임차권 양도대가가 기타소득이고 양수자가 원천징수의무자라는 확인값을 사용했습니다. 양도자 입금액에는 받은 부가세가 포함될 수 있으며, 부가세 신고·납부 전 현금액입니다. 최종 종합소득세, 포괄양수도, 시설·재고 분리와 세금계산서 발급 여부는 포함하지 않습니다.`, `• 공급가액 = 부가세 별도 금액 또는 부가세 포함 총액 ÷ 1.1<br>• 필요경비 = 공급가액의 60%와 입력한 실제 확인 경비 중 큰 금액<br>• 기타소득금액 = 공급가액 − 적용 필요경비<br>• 소득세 원천징수 = 기타소득금액 × 20%, 지방소득세 = 소득세의 10%<br>• 건별 기타소득금액이 5만원 이하이면 과세최저한으로 원천징수 0원`);
        } catch (error) {
            alert(error.message.includes('actual expense')
                ? '실제 확인 필요경비는 권리금 공급가액을 초과할 수 없습니다.'
                : '0원보다 큰 권리금과 올바른 필요경비를 입력해 주세요.');
        }
    }

    function populateRegionSelect(selectId, rows, defaultRegion) {
        const select = document.getElementById(selectId);
        if (!select) return;
        rows.forEach(row => {
            const option = document.createElement('option');
            option.value = row.region;
            option.textContent = row.region;
            option.selected = row.region === defaultRegion;
            select.appendChild(option);
        });
    }

    function calculatePensionRank(event) {
        event.preventDefault();
        hideResult();
        try {
            const result = NicheMarketMath.calculateNationalPensionBenefitRank({
                monthlyBenefit: getMoneyValue('nationalPensionBenefitAmount'),
                region: document.getElementById('nationalPensionBenefitRegion').value
            });
            const lower = percent(result.topRangeStart);
            const upper = percent(result.topRangeEnd);
            const region = result.region;
            updateReportHeaders('NATIONAL PENSION RANK', '국민연금 수령액 공식 구간 비교');
            renderRows([
                { icon: 'wallet', label: '입력 월 수령액', value: money(result.monthlyBenefit), className: 'highlight-row' },
                { icon: 'layers-3', label: '공식 금액 구간', value: result.band.label },
                { icon: 'users', label: '해당 구간 노령연금 수급자', value: `${result.band.recipients.toLocaleString()}명 · ${percent(result.bandShare)}` },
                { icon: 'trophy', label: '상위 위치 범위', value: `상위 ${lower}~${upper}`, className: 'total-row' },
                { icon: 'map-pinned', label: `${region.region} 월평균 지급액`, value: money(region.averageMonthlyBenefit) },
                { icon: 'list-ordered', label: `${region.region} 지역 평균 순위`, value: `17개 시도 중 ${region.rank}위` },
                { icon: region.difference >= 0 ? 'trending-up' : 'trending-down', label: `${region.region} 평균 대비`, value: `${money(Math.abs(region.difference))} ${region.difference >= 0 ? '높음' : '낮음'}` },
                { icon: 'database', label: '비교 대상 노령연금 수급자', value: `${result.totalRecipients.toLocaleString()}명` }
            ], `※ 공단이 공개한 20만원 단위 금액 구간 안에서 개인별 분포는 알 수 없어 정확한 백분위가 아니라 가능한 상위 범위를 표시합니다. 금액 구간은 ${result.source.amountBandsAsOf}, 지역 평균은 ${result.source.regionsAsOf} 기준이며 급여 종류와 집계 범위가 다를 수 있습니다.`, `• 상위 범위 시작 = 더 높은 금액 구간 수급자 ÷ 전체 노령연금 수급자<br>• 상위 범위 끝 = (더 높은 구간 + 현재 구간 수급자) ÷ 전체 수급자<br>• 같은 공식 구간 안의 개인 순서는 추정하지 않습니다.<br>• 지역 평균은 국민연금 전체 급여지급 통계의 1인당 월 지급액 평균입니다.`);
        } catch {
            alert('0원보다 큰 국민연금 월 수령액과 지역을 입력해 주세요.');
        }
    }

    function calculateHealthRank(event) {
        event.preventDefault();
        hideResult();
        try {
            const result = NicheMarketMath.calculateRegionalHealthInsuranceRank({
                monthlyPremium: getMoneyValue('regionalHealthPremiumAmount'),
                region: document.getElementById('regionalHealthPremiumRegion').value
            });
            const ownRows = result.monthlyPremium > 0 ? [
                { icon: 'wallet', label: '입력한 월 지역보험료', value: money(result.monthlyPremium), className: 'highlight-row' },
                { icon: 'scale', label: '전국 평균 대비 입력 보험료', value: `${money(Math.abs(result.inputDifferenceFromNational))} ${result.inputDifferenceFromNational >= 0 ? '높음' : '낮음'}` },
                { icon: 'locate-fixed', label: '시도 평균 사이 참고 위치', value: `17개 시도 평균 기준 약 ${Math.min(result.inputPosition, 18)}번째 위치` }
            ] : [];
            updateReportHeaders('REGIONAL HEALTH PREMIUM RANK', '지역가입자 건강보험료 시도 순위');
            renderRows([
                ...ownRows,
                { icon: 'map-pinned', label: `선택 지역`, value: result.selected.region },
                { icon: 'receipt-text', label: `${result.selected.region} 세대당 월평균`, value: `약 ${money(result.selected.averageMonthlyPremium)}`, className: 'highlight-row' },
                { icon: 'trophy', label: '지역 평균보험료 순위', value: `17개 시도 중 ${result.selected.rank}위`, className: 'total-row' },
                { icon: 'landmark', label: '전국 지역가입자 평균', value: money(result.source.nationalAverage) },
                { icon: 'chart-no-axes-combined', label: `${result.selected.region}의 전국 평균 대비`, value: `${money(Math.abs(result.selectedDifferenceFromNational))} ${result.selectedDifferenceFromNational >= 0 ? '높음' : '낮음'}` },
                ...result.rows.map(row => ({
                    icon: row.rank <= 3 ? 'medal' : 'map',
                    label: `${row.rank}위 · ${row.region}`,
                    value: `약 ${money(row.averageMonthlyPremium)}`
                }))
            ], `※ ${result.source.asOf} 지역가입자 세대당 건강보험료 평균을 비교한 지역 순위입니다. 시도 값은 공단 발표 그래프의 천원 단위 표시값이며, 개인 보험료 순위나 현재 고지액을 뜻하지 않습니다. 장기요양보험료는 포함하지 않습니다.`, `• 지역 순위 = 시도별 지역가입자 세대당 월평균 건강보험료의 내림차순<br>• 같은 표시값은 공동순위로 처리합니다.<br>• 입력 보험료의 참고 위치는 17개 시도 평균 사이의 위치일 뿐 가입자 백분위가 아닙니다.<br>• 전국 평균 ${money(result.source.nationalAverage)}은 공단 발표의 2023년 12월 기준값입니다.`);
        } catch {
            alert('지역을 선택하고 월 보험료는 0원 이상으로 입력해 주세요.');
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        const calculator = document.body.dataset.calculator;
        if (calculator === 'family-property-transfer-gift') {
            toggleUnrelatedConfirmation();
            document.getElementById('propertyTransferRelationship').addEventListener('change', toggleUnrelatedConfirmation);
            document.getElementById('familyPropertyTransferGiftForm').addEventListener('submit', calculatePropertyTransfer);
        } else if (calculator === 'commercial-lease-premium-tax') {
            togglePremiumVatFields();
            document.getElementById('commercialPremiumVat').addEventListener('change', togglePremiumVatFields);
            document.getElementById('commercialLeasePremiumTaxForm').addEventListener('submit', calculateCommercialPremium);
        } else if (calculator === 'national-pension-benefit-rank') {
            populateRegionSelect('nationalPensionBenefitRegion', NicheMarketData.nationalPension.regions, '서울');
            document.getElementById('nationalPensionBenefitRankForm').addEventListener('submit', calculatePensionRank);
        } else if (calculator === 'regional-health-insurance-ranking') {
            populateRegionSelect('regionalHealthPremiumRegion', NicheMarketData.regionalHealthInsurance.rows, '서울');
            document.getElementById('regionalHealthInsuranceRankForm').addEventListener('submit', calculateHealthRank);
        }
    });
})();
