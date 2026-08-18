(function initializeInvestmentTaxCalculators(global) {
    "use strict";

    function formatWon(value) {
        return `${Math.round(Number(value) || 0).toLocaleString()} 원`;
    }

    function formatSignedWon(value) {
        const amount = Math.round(Number(value) || 0);
        return `${amount > 0 ? "+" : ""}${amount.toLocaleString()} 원`;
    }

    function formatPercent(value, digits = 2) {
        return `${(Number(value) || 0).toFixed(digits)}%`;
    }

    function getNumber(id) {
        const input = document.getElementById(id);
        if (!input) return 0;
        return Number(String(input.value || "").replace(/[^\d.-]/g, "")) || 0;
    }

    function getValue(id) {
        return document.getElementById(id)?.value || "";
    }

    function requirePositive(value, message) {
        if (Number.isFinite(value) && value > 0) return true;
        alert(message);
        return false;
    }

    const CURRENCY_LABELS = Object.freeze({ KRW: '원', USD: 'USD', USDT: 'USDT' });

    function getAverageAssetType() {
        return getValue('averageAssetType') === 'coin' ? 'coin' : 'stock';
    }

    function getAverageCurrency() {
        const currency = getValue('averageCurrency');
        return CURRENCY_LABELS[currency] ? currency : 'KRW';
    }

    function formatDecimal(value, maximumFractionDigits = 4) {
        return Number(value).toLocaleString('ko-KR', {
            minimumFractionDigits: 0,
            maximumFractionDigits
        });
    }

    function formatAssetPrice(value) {
        const digits = getAverageAssetType() === 'coin' ? 8 : 4;
        return `${formatDecimal(value, digits)} ${CURRENCY_LABELS[getAverageCurrency()]}`;
    }

    function formatAssetAmount(value) {
        return `${formatDecimal(value, 2)} ${CURRENCY_LABELS[getAverageCurrency()]}`;
    }

    function formatAssetQuantity(value) {
        const assetType = getAverageAssetType();
        return `${formatDecimal(value, assetType === 'coin' ? 8 : 4)} ${assetType === 'coin' ? '코인' : '주'}`;
    }

    function formatRate(value) {
        const rate = Number(value) * 100;
        return `${rate > 0 ? '+' : ''}${formatDecimal(rate, 2)}%`;
    }

    function formatDecimalInputValue(value, maximumFractionDigits) {
        const raw = String(value ?? '').replace(/,/g, '').replace(/[^\d.]/g, '');
        if (!raw) return '';
        const hasPoint = raw.includes('.');
        const [rawInteger, ...rest] = raw.split('.');
        const integer = (rawInteger || '0').replace(/^0+(?=\d)/, '');
        const fraction = rest.join('').slice(0, maximumFractionDigits);
        const groupedInteger = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        return hasPoint ? `${groupedInteger}.${fraction}` : groupedInteger;
    }

    function bindDecimalInputs(scope = document) {
        scope.querySelectorAll('.decimal-number-input').forEach(input => {
            if (input.dataset.decimalBound === 'true') return;
            input.dataset.decimalBound = 'true';
            input.addEventListener('input', event => {
                const digits = Number(event.target.dataset.decimals || 8);
                event.target.value = formatDecimalInputValue(event.target.value, digits);
            });
            input.value = formatDecimalInputValue(input.value, Number(input.dataset.decimals || 8));
        });
    }

    function createResultPanel() {
        const calculator = document.querySelector('.calculator-section');
        if (!calculator || document.getElementById('resultBox')) return;

        const result = document.createElement('article');
        result.id = 'resultBox';
        result.className = 'result-box';
        result.setAttribute('aria-live', 'polite');
        result.tabIndex = -1;
        result.innerHTML = `
            <div class="report-card">
                <div class="report-header">
                    <span class="report-badge" id="repBadge">TAX REPORT</span>
                    <div class="report-address" id="repTitle">세금 계산 결과</div>
                    <div class="report-date" id="repCurrentDate">산출 일시: -</div>
                </div>
                <div class="report-table-scroll">
                    <table class="report-table">
                        <thead><tr><th>계산 단계</th><th class="text-right">예상 금액</th></tr></thead>
                        <tbody id="resultTableBody"></tbody>
                    </table>
                </div>
                <div class="report-notice" id="resultNotice">※ 입력값과 2026년 8월 10일 확인 기준으로 계산한 참고용 결과입니다.</div>
                <div class="report-formula-title">계산식과 적용 범위</div>
                <div class="report-formula-box" id="formulaContent"></div>
            </div>`;
        calculator.after(result);
    }

    function renderResult(config) {
        updateReportHeaders(config.badge, config.title);
        document.getElementById('resultTableBody').innerHTML = config.rows.map(row => `
            <tr class="${row.className || ""}"><td>${row.label}</td><td class="text-right">${row.value}</td></tr>
        `).join('');
        document.getElementById('resultNotice').textContent = config.notice;
        document.getElementById('formulaContent').innerHTML = config.formula;
        showResult();
    }

    function calculateOverseasStock(event) {
        event.preventDefault();
        const proceeds = getNumber('overseasProceeds');
        const acquisitionCost = getNumber('overseasAcquisitionCost');
        if (!requirePositive(proceeds, '연간 총 양도가액을 입력해 주세요.')) return;

        const result = InvestmentTaxMath.calculateOverseasStockTax({
            proceeds,
            acquisitionCost,
            expenses: getNumber('overseasExpenses'),
            otherStockIncome: getNumber('overseasOtherIncome'),
            deductionAlreadyUsed: getNumber('overseasDeductionUsed')
        });

        renderResult({
            badge: 'OVERSEAS STOCK TAX REPORT',
            title: '해외주식 양도소득세 계산 결과',
            rows: [
                { label: '연간 총 양도가액', value: formatWon(result.proceeds) },
                { label: '취득가액과 필요경비', value: `(-) ${formatWon(result.acquisitionCost + result.expenses)}` },
                { label: '다른 국내·국외 주식 양도손익', value: formatSignedWon(result.otherStockIncome) },
                { label: '주식 양도소득금액', value: formatSignedWon(result.netGain), className: 'highlight-row' },
                { label: '남은 양도소득 기본공제', value: `(-) ${formatWon(result.availableDeduction)}` },
                { label: '과세표준', value: formatWon(result.taxableBase), className: 'highlight-row' },
                { label: '양도소득세(20%)', value: formatWon(result.incomeTax) },
                { label: '지방소득세(양도소득세의 10%)', value: formatWon(result.localIncomeTax) },
                { label: '예상 세액 합계', value: formatWon(result.totalTax), className: 'total-row' }
            ],
            notice: '※ 거주자의 일반적인 국외주식 양도를 전제로 한 예상치입니다. 중소기업 주식, 환율 환산, 국내주식 손익통산 순서와 외국납부세액은 신고자료로 다시 확인하세요.',
            formula: '양도소득금액 = 원화 환산 양도가액 − 취득가액 − 직접 양도비용 ± 같은 해 주식 양도손익. 국내·국외 주식 통산 기본공제 중 남은 금액을 차감한 과세표준에 국세 20%와 지방소득세 2% 상당을 적용했습니다.'
        });
    }

    const MARKET_LABELS = {
        kospi: '유가증권시장(KOSPI)',
        kosdaq: '코스닥시장',
        konex: '코넥스시장',
        kotc: 'K-OTC',
        other: '그 밖의 주권 양도',
        custom: '직접 세율 입력'
    };

    function updateCustomRateFields() {
        const custom = getValue('securitiesMarket') === 'custom';
        document.querySelectorAll('[data-custom-rate]').forEach(element => {
            element.hidden = !custom;
        });
    }

    function calculateSecuritiesTransaction(event) {
        event.preventDefault();
        const saleAmount = getNumber('securitiesSaleAmount');
        const market = getValue('securitiesMarket');
        if (!requirePositive(saleAmount, '주식 매도금액을 입력해 주세요.')) return;
        const result = InvestmentTaxMath.calculateSecuritiesTransactionTax({
            saleAmount,
            fees: getNumber('securitiesFees'),
            market,
            transactionRate: getNumber('securitiesCustomRate'),
            agricultureRate: getNumber('securitiesCustomAgricultureRate')
        });

        renderResult({
            badge: 'SECURITIES TAX REPORT',
            title: '증권거래세 계산 결과',
            rows: [
                { label: '시장 구분', value: MARKET_LABELS[market] },
                { label: '주식 매도금액', value: formatWon(result.saleAmount), className: 'highlight-row' },
                { label: `증권거래세(${formatPercent(result.transactionRate * 100, 3)})`, value: formatWon(result.transactionTax) },
                { label: `농어촌특별세(${formatPercent(result.agricultureRate * 100, 3)})`, value: formatWon(result.agricultureTax) },
                { label: '거래세 합계', value: formatWon(result.totalTax), className: 'total-row' },
                { label: '수수료 차감 후 예상 정산금', value: formatWon(result.netProceeds) }
            ],
            notice: '※ 2026년 1월 1일 이후 국내 주권 양도 기준입니다. 증권사 수수료와 증권거래세의 실제 원 단위 처리 방식에 따라 소액 차이가 날 수 있습니다.',
            formula: '증권거래세는 매매차익이 아니라 주권 양도가액에 시장별 세율을 곱합니다. 유가증권시장은 증권거래세와 농어촌특별세를 구분해 표시합니다.'
        });
    }

    function calculateFinancialIncome(event) {
        event.preventDefault();
        const result = InvestmentTaxMath.calculateFinancialIncomeTax({
            interest: getNumber('financialInterest'),
            eligibleDividend: getNumber('financialEligibleDividend'),
            otherDividend: getNumber('financialOtherDividend'),
            privateLoanInterest: getNumber('financialPrivateLoanInterest'),
            otherComprehensiveIncome: getNumber('financialOtherIncome'),
            deductions: getNumber('financialDeductions'),
            prepaidNationalTax: getNumber('financialPrepaidTax')
        });
        if (!requirePositive(result.financialIncome, '연간 이자·배당소득을 하나 이상 입력해 주세요.')) return;

        const rows = [
            { label: '연간 금융소득 합계', value: formatWon(result.financialIncome), className: 'highlight-row' },
            { label: '종합과세 기준금액 초과 여부', value: result.exceedsThreshold ? '2,000만 원 초과' : '2,000만 원 이하' }
        ];
        if (result.exceedsThreshold) {
            rows.push(
                { label: '배당가산액(Gross-up)', value: formatWon(result.grossUp) },
                { label: '기본세율 방식 산출세액', value: formatWon(result.comparisonTaxA) },
                { label: '원천징수세율 비교세액', value: formatWon(result.comparisonTaxB) },
                { label: '배당세액공제', value: `(-) ${formatWon(result.dividendTaxCredit)}` }
            );
        }
        rows.push(
            { label: '예상 종합소득세', value: formatWon(result.nationalTax), className: 'highlight-row' },
            { label: '예상 지방소득세', value: formatWon(result.localIncomeTax) },
            { label: '예상 세액 합계', value: formatWon(result.totalTax), className: 'total-row' },
            { label: '입력한 기납부 국세 반영 차액', value: formatSignedWon(result.settlementNationalTax) }
        );

        renderResult({
            badge: 'FINANCIAL INCOME TAX REPORT',
            title: '금융소득 종합과세 계산 결과',
            rows,
            notice: '※ 일반 이자·배당과 비영업대금 이익을 대상으로 한 예상치입니다. 2026년 고배당기업 분리과세, 국외 원천소득, 결손금, 각종 세액공제·감면은 반영하지 않습니다.',
            formula: result.exceedsThreshold
                ? '금융소득 2,000만 원 초과분과 다른 종합소득에 기본세율을 적용한 금액에 2,000만 원×14%를 더한 세액과, 금융소득별 원천징수세율 및 다른 소득 기본세율을 적용한 비교세액 중 큰 금액을 사용했습니다. 배당가산 대상 배당은 법정 범위에서 10%를 가산하고 한도 내 배당세액공제를 반영했습니다.'
                : '금융소득 합계가 2,000만 원 이하인 일반 국내 원천징수 소득으로 보고 이자·배당 14%, 비영업대금 이익 25%의 국세와 그 10%인 지방소득세를 계산했습니다.'
        });
    }

    function calculateRetirementIncome(event) {
        event.preventDefault();
        const retirementPay = getNumber('retirementPay');
        const serviceYears = getNumber('retirementServiceYears');
        if (!requirePositive(retirementPay, '퇴직급여액을 입력해 주세요.')) return;
        if (!requirePositive(serviceYears, '근속연수를 입력해 주세요.')) return;
        if (serviceYears > 100) {
            alert('근속연수는 100년 이하로 입력해 주세요.');
            return;
        }

        const result = InvestmentTaxMath.calculateRetirementIncomeTax({
            retirementPay,
            nonTaxableIncome: getNumber('retirementNonTaxable'),
            serviceYears,
            prepaidNationalTax: getNumber('retirementPrepaidTax')
        });
        renderResult({
            badge: 'RETIREMENT INCOME TAX REPORT',
            title: '퇴직소득세 계산 결과',
            rows: [
                { label: '퇴직급여액', value: formatWon(result.retirementPay) },
                { label: '퇴직소득금액', value: formatWon(result.retirementIncome), className: 'highlight-row' },
                { label: `근속연수공제(${result.serviceYears}년)`, value: `(-) ${formatWon(result.serviceYearsDeduction)}` },
                { label: '환산급여', value: formatWon(result.convertedSalary) },
                { label: '환산급여공제', value: `(-) ${formatWon(result.convertedSalaryDeduction)}` },
                { label: '퇴직소득 과세표준', value: formatWon(result.taxBase), className: 'highlight-row' },
                { label: '환산산출세액', value: formatWon(result.convertedTax) },
                { label: '퇴직소득세', value: formatWon(result.incomeTax) },
                { label: '지방소득세', value: formatWon(result.localIncomeTax) },
                { label: '예상 세액 합계', value: formatWon(result.totalTax), className: 'total-row' },
                { label: '예상 퇴직금 실수령액', value: formatWon(result.estimatedNetPay), className: 'highlight-row' }
            ],
            notice: '※ 2020년 이후 퇴직의 현행 계산 구조를 적용한 예상치입니다. 중간정산 합산특례, 임원 퇴직소득 한도, 과거 근속기간 안분과 세액정산은 반영하지 않습니다.',
            formula: '퇴직소득금액에서 근속연수공제를 차감하고 12개월 기준 환산급여를 구한 뒤 환산급여공제와 기본세율을 적용했습니다. 환산산출세액을 12로 나누고 근속연수를 곱해 퇴직소득세를 계산합니다.'
        });
    }

    function updatePensionMode() {
        const deferred = getValue('pensionMode') === 'deferred-retirement';
        document.querySelectorAll('[data-pension-private]').forEach(element => { element.hidden = deferred; });
        document.querySelectorAll('[data-pension-deferred]').forEach(element => { element.hidden = !deferred; });
    }

    function calculatePensionIncome(event) {
        event.preventDefault();
        const mode = getValue('pensionMode');
        const amount = getNumber('pensionAmount');
        if (!requirePositive(amount, '연간 과세대상 연금수령액을 입력해 주세요.')) return;
        if (mode === 'deferred-retirement' && !requirePositive(getNumber('pensionLumpSumTax'), '해당 수령액에 대응하는 연금외수령 퇴직소득세를 입력해 주세요.')) return;
        const result = InvestmentTaxMath.calculatePensionIncomeTax({
            mode,
            amount,
            age: getNumber('pensionAge'),
            lifetime: document.getElementById('pensionLifetime')?.checked,
            lumpSumEquivalentTax: getNumber('pensionLumpSumTax'),
            pensionYear: getNumber('pensionYear')
        });

        if (result.mode === 'deferred-retirement') {
            renderResult({
                badge: 'IRP PENSION TAX REPORT',
                title: 'IRP 이연퇴직소득 연금세금 계산 결과',
                rows: [
                    { label: '해당 연금수령액', value: formatWon(result.amount), className: 'highlight-row' },
                    { label: '연금 실제 수령연차', value: `${result.pensionYear}년차` },
                    { label: '연금외수령 세액 대비 적용률', value: formatPercent(result.reductionFactor * 100, 0) },
                    { label: '예상 연금소득세', value: formatWon(result.nationalTax) },
                    { label: '지방소득세', value: formatWon(result.localIncomeTax) },
                    { label: '예상 세액 합계', value: formatWon(result.totalTax), className: 'total-row' },
                    { label: '예상 세후 수령액', value: formatWon(result.netAmount), className: 'highlight-row' }
                ],
                notice: '※ 금융회사가 관리하는 이연퇴직소득 원장과 실제 인출 순서에 따라 해당 회차의 배분세액이 달라질 수 있습니다.',
                formula: '해당 수령액에 대응하는 연금외수령 퇴직소득세에 연금 실제 수령연차 10년 이하 70%, 11~20년 60%, 21년차 이상 50%를 적용했습니다. 50% 구간은 2026년 1월 1일 이후 연금수령분부터 적용됩니다.'
            });
            return;
        }

        const rows = [
            { label: '연간 과세대상 사적연금', value: formatWon(result.amount), className: 'highlight-row' },
            { label: '원천징수 국세율', value: formatPercent(result.withholdingRate * 100, 0) },
            { label: '예상 연금소득세', value: formatWon(result.nationalTax) },
            { label: '지방소득세', value: formatWon(result.localIncomeTax) },
            { label: '원천징수 기준 세액 합계', value: formatWon(result.totalTax), className: 'total-row' },
            { label: '원천징수 후 예상 수령액', value: formatWon(result.netAmount) }
        ];
        if (result.exceedsPrivatePensionThreshold) {
            rows.push(
                { label: '연 1,500만 원 초과 시 선택 가능한 15% 분리과세(지방세 포함)', value: formatWon(result.separateTotalTax) },
                { label: '15% 분리과세 선택 시 예상 수령액', value: formatWon(result.separateNetAmount) }
            );
        }

        renderResult({
            badge: 'PRIVATE PENSION TAX REPORT',
            title: '연금저축·IRP 연금소득세 계산 결과',
            rows,
            notice: '※ 세액공제를 받은 납입액과 운용수익의 정상 연금수령을 전제로 합니다. 세액공제를 받지 않은 원금, 공적연금, 연금외수령과 부득이한 인출은 제외합니다.',
            formula: '일반 사적연금은 70세 미만 5%, 70세 이상 80세 미만 4%, 80세 이상 3%의 국세율을 적용합니다. 해지할 수 없는 종신계약은 2026년 수령분부터 3%입니다. 지방소득세는 국세의 10%로 계산했습니다.'
        });
    }

    function updateAverageLotLabels() {
        const assetType = getAverageAssetType();
        const unit = assetType === 'coin' ? '코인 수량' : '매수 수량(주)';
        const quantityDecimals = assetType === 'coin' ? 8 : 4;
        document.querySelectorAll('[data-average-quantity-label]').forEach(label => { label.textContent = unit; });
        document.querySelectorAll('[data-average-quantity-input]').forEach(input => {
            input.dataset.decimals = String(quantityDecimals);
            input.value = formatDecimalInputValue(input.value, quantityDecimals);
        });
    }

    function updateAverageCurrencyOptions() {
        const assetType = getAverageAssetType();
        const currency = document.getElementById('averageCurrency');
        const usdt = currency?.querySelector('option[value="USDT"]');
        if (!currency || !usdt) return;
        usdt.disabled = assetType !== 'coin';
        usdt.hidden = assetType !== 'coin';
        if (assetType !== 'coin' && currency.value === 'USDT') currency.value = 'KRW';
        document.querySelectorAll('[data-average-currency-text]').forEach(element => {
            element.textContent = CURRENCY_LABELS[getAverageCurrency()];
        });
    }

    function updateAverageCalculatorMode() {
        const simulation = getValue('averageCalculationMode') === 'simulation';
        document.querySelectorAll('[data-average-transactions]').forEach(element => { element.hidden = simulation; });
        document.querySelectorAll('[data-average-simulation]').forEach(element => { element.hidden = !simulation; });
        updateAverageSimulationMode();
    }

    function updateAverageSimulationMode() {
        const target = getValue('averageSimulationMode') === 'target';
        document.querySelectorAll('[data-average-quantity-mode]').forEach(element => { element.hidden = target; });
        document.querySelectorAll('[data-average-target-mode]').forEach(element => { element.hidden = !target; });
    }

    function renumberAverageLots() {
        const rows = [...document.querySelectorAll('.average-lot-row')];
        rows.forEach((row, index) => {
            const position = index + 1;
            row.dataset.lotIndex = String(position);
            row.querySelector('legend').textContent = `${position}차 매수`;
            ['Price', 'Quantity', 'Fee'].forEach(field => {
                const input = row.querySelector(`[data-lot-field="${field.toLowerCase()}"]`);
                const label = row.querySelector(`[data-lot-label="${field.toLowerCase()}"]`);
                if (!input || !label) return;
                input.id = `averageLot${field}${position}`;
                label.htmlFor = input.id;
            });
        });
        rows.forEach(row => {
            const remove = row.querySelector('.average-lot-remove');
            if (remove) remove.hidden = rows.length <= 2;
        });
    }

    function createAverageLotMarkup(index) {
        const assetType = getAverageAssetType();
        return `<fieldset class="average-lot-row" data-lot-index="${index}"><legend>${index}차 매수</legend><div class="form-group"><label data-lot-label="price" for="averageLotPrice${index}">매수가</label><input type="text" id="averageLotPrice${index}" class="decimal-number-input" data-lot-field="price" data-decimals="8" inputmode="decimal" placeholder="예: 40,000"></div><div class="form-group"><label data-lot-label="quantity" data-average-quantity-label for="averageLotQuantity${index}">${assetType === 'coin' ? '코인 수량' : '매수 수량(주)'}</label><input type="text" id="averageLotQuantity${index}" class="decimal-number-input" data-lot-field="quantity" data-average-quantity-input data-decimals="${assetType === 'coin' ? 8 : 4}" inputmode="decimal" placeholder="예: ${assetType === 'coin' ? '0.015' : '10'}"></div><div class="form-group"><label data-lot-label="fee" for="averageLotFee${index}">실제 매수 수수료</label><input type="text" id="averageLotFee${index}" class="decimal-number-input" data-lot-field="fee" data-decimals="8" inputmode="decimal" value="0"></div><button type="button" class="btn-remove average-lot-remove" aria-label="${index}차 매수 내역 삭제">삭제</button></fieldset>`;
    }

    function addAverageLot() {
        const list = document.getElementById('averageLotList');
        if (!list) return;
        const count = list.querySelectorAll('.average-lot-row').length;
        if (count >= 10) {
            alert('매수 내역은 최대 10회까지 추가할 수 있습니다.');
            return;
        }
        list.insertAdjacentHTML('beforeend', createAverageLotMarkup(count + 1));
        const added = list.lastElementChild;
        bindDecimalInputs(added);
        renumberAverageLots();
        added.querySelector('input')?.focus();
    }

    function removeAverageLot(event) {
        const button = event.target.closest('.average-lot-remove');
        if (!button) return;
        const rows = document.querySelectorAll('.average-lot-row');
        if (rows.length <= 2) return;
        button.closest('.average-lot-row')?.remove();
        renumberAverageLots();
    }

    function readAverageLots() {
        const lots = [];
        document.querySelectorAll('.average-lot-row').forEach((row, index) => {
            const price = getNumber(row.querySelector('[data-lot-field="price"]')?.id);
            const quantity = getNumber(row.querySelector('[data-lot-field="quantity"]')?.id);
            const fee = getNumber(row.querySelector('[data-lot-field="fee"]')?.id);
            if (price === 0 && quantity === 0 && fee === 0) return;
            if (price <= 0 || quantity <= 0) {
                throw new RangeError(`${index + 1}차 매수가와 수량을 모두 입력해 주세요.`);
            }
            lots.push({ price, quantity, fee });
        });
        if (lots.length === 0) throw new RangeError('매수 내역을 하나 이상 입력해 주세요.');
        return lots;
    }

    function calculateAverageTransactions() {
        const lots = readAverageLots();
        const result = InvestmentTaxMath.calculateAverageCost({
            lots,
            currentPrice: getNumber('averageTransactionsCurrentPrice')
        });
        const assetLabel = getAverageAssetType() === 'coin' ? '코인' : '주식';
        const rows = [
            { label: '입력한 매수 횟수', value: `${result.lots.length}회` },
            { label: `총 보유 ${assetLabel} 수량`, value: formatAssetQuantity(result.totalQuantity), className: 'highlight-row' },
            { label: '수수료 제외 매수금액', value: formatAssetAmount(result.totalPurchaseAmount) },
            { label: '입력한 매수 수수료 합계', value: formatAssetAmount(result.totalFees) },
            { label: '총 취득금액', value: formatAssetAmount(result.totalAcquisitionCost) },
            { label: '최종 평균단가', value: formatAssetPrice(result.averagePrice), className: 'total-row' }
        ];
        if (result.evaluationAmount !== null) {
            rows.push(
                { label: '입력 현재가', value: formatAssetPrice(result.currentPrice) },
                { label: '현재 평가금액', value: formatAssetAmount(result.evaluationAmount) },
                { label: '현재 평가손익', value: `${result.profitLoss > 0 ? '+' : ''}${formatAssetAmount(result.profitLoss)}`, className: 'highlight-row' },
                { label: '현재 수익률', value: formatRate(result.returnRate) },
                { label: '평단가 도달에 필요한 가격 변동률', value: formatRate(result.breakEvenChangeRate) }
            );
        }
        const lotFormula = result.lots.map((lot, index) => `<p><strong>${index + 1}차:</strong> ${formatAssetPrice(lot.price)} × ${formatAssetQuantity(lot.quantity)} + 수수료 ${formatAssetAmount(lot.fee)}</p>`).join('');
        renderResult({
            badge: 'AVERAGE COST REPORT',
            title: `${assetLabel} 평단가 계산 결과`,
            rows,
            notice: '※ 실제 체결 수량과 수수료를 입력한 가중평균 결과입니다. 증권사·거래소의 표시 정밀도와 수수료 차감 방식에 따라 화면 평단가와 차이가 날 수 있습니다.',
            formula: `${lotFormula}<p><strong>계산식:</strong> (각 회차 매수가 × 수량 + 매수 수수료의 합계) ÷ 총 보유수량 = ${formatAssetPrice(result.averagePrice)}</p><p>매도 수수료·세금, 환율 변동, 부분 매도 후 증권사별 장부 평단가는 포함하지 않습니다.</p>`
        });
    }

    function calculateAverageSimulation() {
        const mode = getValue('averageSimulationMode') === 'target' ? 'target' : 'quantity';
        const result = InvestmentTaxMath.calculateAdditionalPurchase({
            currentAveragePrice: getNumber('averageCurrentAveragePrice'),
            currentQuantity: getNumber('averageCurrentQuantity'),
            additionalPrice: getNumber('averageAdditionalPrice'),
            mode,
            additionalQuantity: getNumber('averageAdditionalQuantity'),
            targetAveragePrice: getNumber('averageTargetPrice'),
            additionalFee: getNumber('averageAdditionalFee'),
            currentPrice: getNumber('averageSimulationCurrentPrice')
        });
        const assetType = getAverageAssetType();
        const assetLabel = assetType === 'coin' ? '코인' : '주식';
        const rows = [
            { label: '현재 평단가', value: formatAssetPrice(result.currentAveragePrice) },
            { label: `현재 ${assetLabel} 수량`, value: formatAssetQuantity(result.currentQuantity) },
            { label: '추가 매수가', value: formatAssetPrice(result.additionalPrice) },
            { label: mode === 'target' ? '목표 평단가 달성 필요 수량' : '추가매수 수량', value: formatAssetQuantity(result.additionalQuantity), className: 'highlight-row' },
            { label: '추가매수 금액', value: formatAssetAmount(result.additionalPurchaseAmount) },
            { label: '추가 수수료 포함 필요 자금', value: formatAssetAmount(result.additionalAcquisitionCost) },
            { label: '추가매수 후 총수량', value: formatAssetQuantity(result.totalQuantity) },
            { label: '추가매수 후 총취득금액', value: formatAssetAmount(result.totalAcquisitionCost) },
            { label: '새로운 평균단가', value: formatAssetPrice(result.newAveragePrice), className: 'total-row' },
            { label: '기존 대비 평단가 변화', value: `${result.averagePriceChange > 0 ? '+' : ''}${formatAssetPrice(result.averagePriceChange)} (${formatRate(result.averagePriceChangeRate)})` }
        ];
        if (mode === 'target' && assetType === 'stock' && !Number.isInteger(result.additionalQuantity)) {
            rows.push({ label: '정수 주식 최소 매수량과 적용 평단가', value: `${result.wholeShareQuantity.toLocaleString()}주 · ${formatAssetPrice(result.wholeShareAveragePrice)}` });
        }
        if (result.evaluationAmount !== null) {
            rows.push(
                { label: '현재가 기준 추가매수 후 평가손익', value: `${result.profitLoss > 0 ? '+' : ''}${formatAssetAmount(result.profitLoss)}` },
                { label: '현재가 기준 추가매수 후 수익률', value: formatRate(result.returnRate) },
                { label: '새 평단가 도달에 필요한 가격 변동률', value: formatRate(result.breakEvenChangeRate) }
            );
        }
        const targetNote = mode === 'target'
            ? `<p><strong>목표 역산:</strong> 목표 평단가 ${formatAssetPrice(result.targetAveragePrice)}는 현재 평단가와 추가 매수가 사이의 값으로 계산했습니다.</p>`
            : '';
        renderResult({
            badge: 'AVERAGE DOWN REPORT',
            title: `${assetLabel} 추가매수·물타기 계산 결과`,
            rows,
            notice: '※ 추가매수 효과를 수학적으로 비교한 결과이며 매수를 권유하거나 손실 회복을 보장하지 않습니다.',
            formula: `<p><strong>현재 보유:</strong> ${formatAssetPrice(result.currentAveragePrice)} × ${formatAssetQuantity(result.currentQuantity)}</p><p><strong>추가매수:</strong> ${formatAssetPrice(result.additionalPrice)} × ${formatAssetQuantity(result.additionalQuantity)} + 수수료 ${formatAssetAmount(result.additionalFee)}</p>${targetNote}<p><strong>새 평단가:</strong> (현재 취득금액 + 추가 취득금액) ÷ 추가매수 후 총수량 = ${formatAssetPrice(result.newAveragePrice)}</p><p>주가가 내려간 상태에서 추가매수하면 투자원금과 손실 위험도 함께 커집니다.</p>`
        });
    }

    function calculateStockAveragePrice(event) {
        event.preventDefault();
        try {
            if (getValue('averageCalculationMode') === 'simulation') calculateAverageSimulation();
            else calculateAverageTransactions();
        } catch (error) {
            alert(error.message.includes('strictly between')
                ? '목표 평단가는 현재 평단가와 추가 매수가 사이의 값으로 입력해 주세요.'
                : error.message.includes('cannot be reached')
                    ? '입력한 수수료 조건으로는 해당 목표 평단가를 달성할 수 없습니다.'
                    : error.message.includes('greater than zero') || error.message.includes('non-negative')
                        ? '가격·수량·수수료 입력값을 확인해 주세요.'
                        : error.message);
        }
    }

    function initializeStockAveragePrice() {
        bindDecimalInputs();
        document.getElementById('averageAssetType')?.addEventListener('change', () => {
            updateAverageLotLabels();
            updateAverageCurrencyOptions();
        });
        document.getElementById('averageCurrency')?.addEventListener('change', updateAverageCurrencyOptions);
        document.getElementById('averageCalculationMode')?.addEventListener('change', updateAverageCalculatorMode);
        document.getElementById('averageSimulationMode')?.addEventListener('change', updateAverageSimulationMode);
        document.getElementById('addAverageLotButton')?.addEventListener('click', addAverageLot);
        document.getElementById('averageLotList')?.addEventListener('click', removeAverageLot);
        updateAverageLotLabels();
        updateAverageCurrencyOptions();
        updateAverageCalculatorMode();
        renumberAverageLots();
    }

    function initialize() {
        if (!global.InvestmentTaxMath) return;
        createResultPanel();
        bindMoneyInputs();
        const calculator = document.body.dataset.calculator;
        const handlers = {
            'overseas-stock-tax': ['overseasStockTaxForm', calculateOverseasStock],
            'securities-transaction-tax': ['securitiesTransactionTaxForm', calculateSecuritiesTransaction],
            'financial-income-tax': ['financialIncomeTaxForm', calculateFinancialIncome],
            'retirement-income-tax': ['retirementIncomeTaxForm', calculateRetirementIncome],
            'pension-income-tax': ['pensionIncomeTaxForm', calculatePensionIncome],
            'stock-average-price': ['stockAveragePriceForm', calculateStockAveragePrice]
        };
        const setup = handlers[calculator];
        if (setup) document.getElementById(setup[0])?.addEventListener('submit', setup[1]);
        document.getElementById('securitiesMarket')?.addEventListener('change', updateCustomRateFields);
        document.getElementById('pensionMode')?.addEventListener('change', updatePensionMode);
        updateCustomRateFields();
        updatePensionMode();
        if (calculator === 'stock-average-price') initializeStockAveragePrice();
        renderIcons();
    }

    document.addEventListener('DOMContentLoaded', initialize);
}(window));
