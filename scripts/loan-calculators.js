(function initializeLoanCalculators(global) {
    "use strict";

    const METHOD_LABELS = {
        "equal-payment": "원리금균등상환",
        "equal-principal": "원금균등상환",
        bullet: "만기일시상환"
    };

    function formatWon(value) {
        return `${Math.round(Number(value) || 0).toLocaleString()} 원`;
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

    function validatePositive(value, message) {
        if (Number.isFinite(value) && value > 0) return true;
        alert(message);
        return false;
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
                    <span class="report-badge" id="repBadge">FINANCE REPORT</span>
                    <div class="report-address" id="repTitle">금융 계산 결과</div>
                    <div class="report-date" id="repCurrentDate">산출 일시: -</div>
                </div>
                <div class="report-table-scroll">
                    <table class="report-table">
                        <thead><tr><th>계산 항목</th><th class="text-right">예상 결과</th></tr></thead>
                        <tbody id="resultTableBody"></tbody>
                    </table>
                </div>
                <div class="report-notice">※ 입력 조건에 따른 참고용 예상 결과입니다. 금융회사 심사, 상품 약관과 최신 규제에 따라 실제 금액은 달라질 수 있습니다.</div>
                <div class="report-formula-title">계산식과 적용 가정</div>
                <div class="report-formula-box" id="formulaContent"></div>
            </div>
            <div id="loanDetailResult" class="loan-detail-result"></div>
        `;
        calculator.after(result);
    }

    function renderResult(config) {
        updateReportHeaders(config.badge, config.title);
        document.getElementById('resultTableBody').innerHTML = config.rows.map(row => `
            <tr class="${row.className || ""}">
                <td>${row.label}</td>
                <td class="text-right">${row.value}</td>
            </tr>
        `).join('');
        document.getElementById('formulaContent').innerHTML = config.formula;
        document.getElementById('loanDetailResult').innerHTML = config.detailHtml || "";
        showResult();
        document.getElementById('resultBox').focus({ preventScroll: true });
    }

    function renderSchedule(schedule) {
        return `
            <section class="loan-result-section" aria-labelledby="scheduleTitle">
                <h2 id="scheduleTitle">회차별 상환표</h2>
                <p class="review-note">원 단위 반올림 전 내부 계산값을 기준으로 합계를 산출하므로 표시된 회차별 금액의 합과 소액 차이가 날 수 있습니다.</p>
                <div class="loan-table-wrap" tabindex="0" aria-label="회차별 상환표 가로 스크롤 영역">
                    <table class="content-table loan-schedule-table">
                        <thead><tr><th>회차</th><th>상환액</th><th>원금</th><th>이자</th><th>남은 원금</th></tr></thead>
                        <tbody>${schedule.rows.map(row => `
                            <tr><td>${row.month}회</td><td>${formatWon(row.payment)}</td><td>${formatWon(row.principal)}</td><td>${formatWon(row.interest)}</td><td>${formatWon(row.balance)}</td></tr>
                        `).join('')}</tbody>
                    </table>
                </div>
            </section>
        `;
    }

    function calculateLoanInterest(event) {
        event.preventDefault();
        const principal = getNumber('loanAmount');
        const annualRate = getNumber('loanAnnualRate');
        const years = getNumber('loanYears');
        const extraMonths = getNumber('loanExtraMonths');
        const months = Math.round(years * 12 + extraMonths);
        const method = getValue('loanRepaymentMethod');

        if (!validatePositive(principal, '대출금액을 입력해 주세요.')) return;
        if (!validatePositive(months, '대출기간을 1개월 이상 입력해 주세요.')) return;
        if (annualRate < 0 || months > 600) {
            alert('금리는 0 이상, 대출기간은 최대 50년까지 입력해 주세요.');
            return;
        }

        const schedule = LoanMath.createSchedule({ principal, annualRate, months, method });
        const paymentLabel = method === 'equal-principal' ? '첫 달 / 마지막 달 상환액' : '월 상환액';
        const paymentValue = method === 'equal-principal'
            ? `${formatWon(schedule.firstPayment)} / ${formatWon(schedule.lastPayment)}`
            : formatWon(schedule.firstPayment);

        renderResult({
            badge: 'LOAN PAYMENT REPORT',
            title: '대출 이자와 상환금액 계산 결과',
            rows: [
                { label: '대출원금', value: formatWon(principal), className: 'highlight-row' },
                { label: '상환방식', value: METHOD_LABELS[method] },
                { label: '금리 / 기간', value: `연 ${formatPercent(annualRate)} / ${months.toLocaleString()}개월` },
                { label: paymentLabel, value: paymentValue, className: 'highlight-row' },
                { label: '월평균 상환액', value: formatWon(schedule.averagePayment) },
                { label: '총이자', value: formatWon(schedule.totalInterest) },
                { label: '총 상환금액', value: formatWon(schedule.totalPayment), className: 'total-row' }
            ],
            formula: `원리금균등상환은 매월 같은 상환액이 되도록 계산하고, 원금균등상환은 원금을 매월 동일하게 나눈 뒤 남은 원금에 이자를 적용합니다. 만기일시상환은 매월 이자를 납부하고 마지막 회차에 원금을 상환하는 것으로 가정했습니다.`,
            detailHtml: renderSchedule(schedule)
        });
    }

    function renderMortgageComparison(principal, annualRate, stressRate, method) {
        const terms = [20, 30, 40];
        return `
            <section class="loan-result-section" aria-labelledby="mortgageCompareTitle">
                <h2 id="mortgageCompareTitle">금리 및 기간별 비교</h2>
                <div class="loan-table-wrap" tabindex="0" aria-label="주택담보대출 금리 및 기간 비교표">
                    <table class="content-table">
                        <thead><tr><th>기간</th><th>현재 금리 월 상환액</th><th>현재 금리 총이자</th><th>스트레스 금리 월 상환액</th></tr></thead>
                        <tbody>${terms.map(years => {
                            const current = LoanMath.createSchedule({ principal, annualRate, months: years * 12, method });
                            const stressed = LoanMath.createSchedule({ principal, annualRate: annualRate + stressRate, months: years * 12, method });
                            return `<tr><td>${years}년</td><td>${formatWon(current.firstPayment)}</td><td>${formatWon(current.totalInterest)}</td><td>${formatWon(stressed.firstPayment)}</td></tr>`;
                        }).join('')}</tbody>
                    </table>
                </div>
            </section>
        `;
    }

    function updateMortgageFundingAmounts() {
        const mode = getValue('mortgageFundingMode');
        const homePriceInput = document.getElementById('mortgageHomePrice');
        const ownFundsInput = document.getElementById('mortgageOwnFunds');
        const loanAmountInput = document.getElementById('mortgageLoanAmount');
        const status = document.getElementById('mortgageFundingStatus');
        if (mode === 'manual') {
            ownFundsInput.removeAttribute('aria-invalid');
            loanAmountInput.removeAttribute('aria-invalid');
            status.classList.remove('error');
            status.textContent = '보유자금과 대출금액을 직접 입력합니다.';
            return true;
        }

        const sourceInput = mode === 'loan' ? ownFundsInput : loanAmountInput;
        const targetInput = mode === 'loan' ? loanAmountInput : ownFundsInput;
        const targetLabel = mode === 'loan' ? '대출금액' : '보유자금';

        sourceInput.removeAttribute('aria-invalid');
        status.classList.remove('error');
        if (!homePriceInput.value.trim() || !sourceInput.value.trim()) {
            targetInput.value = '';
            status.textContent = `${targetLabel}은 두 금액을 입력하면 자동으로 계산됩니다.`;
            return true;
        }

        const result = LoanMath.calculateFundingCounterpart({
            homePrice: getNumber('mortgageHomePrice'),
            knownAmount: getNumber(sourceInput.id)
        });
        if (result.exceedsHomePrice) {
            targetInput.value = '';
            sourceInput.setAttribute('aria-invalid', 'true');
            status.classList.add('error');
            status.textContent = `${mode === 'loan' ? '보유자금' : '대출금액'}은 주택가격보다 클 수 없습니다.`;
            return false;
        }

        targetInput.value = Math.round(result.amount).toLocaleString();
        status.textContent = `${targetLabel} ${targetInput.value}원이 자동 입력되었습니다.`;
        return true;
    }

    function setMortgageFundingMode() {
        const mode = getValue('mortgageFundingMode');
        const ownFundsInput = document.getElementById('mortgageOwnFunds');
        const loanAmountInput = document.getElementById('mortgageLoanAmount');
        const automaticLoan = mode === 'loan';
        const automaticOwnFunds = mode === 'own-funds';

        ownFundsInput.readOnly = automaticOwnFunds;
        loanAmountInput.readOnly = automaticLoan;
        ownFundsInput.required = automaticLoan;
        loanAmountInput.required = !automaticLoan;
        ownFundsInput.placeholder = automaticOwnFunds ? '자동 계산' : '계약금·예금 등';
        loanAmountInput.placeholder = automaticLoan ? '자동 계산' : '예: 400,000,000';
        ownFundsInput.removeAttribute('aria-invalid');
        loanAmountInput.removeAttribute('aria-invalid');
        updateMortgageFundingAmounts();
    }

    function initializeMortgageFundingInputs() {
        const modeInput = document.getElementById('mortgageFundingMode');
        if (!modeInput) return;

        modeInput.addEventListener('change', setMortgageFundingMode);
        ['mortgageHomePrice', 'mortgageOwnFunds', 'mortgageLoanAmount'].forEach(id => {
            document.getElementById(id).addEventListener('input', updateMortgageFundingAmounts);
        });
        setMortgageFundingMode();
    }

    function calculateMortgage(event) {
        event.preventDefault();
        if (!updateMortgageFundingAmounts()) return;
        const homePrice = getNumber('mortgageHomePrice');
        const ownFunds = getNumber('mortgageOwnFunds');
        const requestedLoan = getNumber('mortgageLoanAmount');
        const annualRate = getNumber('mortgageAnnualRate');
        const years = getNumber('mortgageYears');
        const method = getValue('mortgageRepaymentMethod');
        const ltvRatio = getNumber('mortgageLtvRatio');
        const annualIncome = getNumber('mortgageAnnualIncome');
        const existingAnnualDebt = getNumber('mortgageExistingAnnualDebt');
        const dsrLimit = getNumber('mortgageDsrLimit');
        const stressRate = getNumber('mortgageStressRate');
        const months = Math.round(years * 12);

        if (!validatePositive(homePrice, '주택가격을 입력해 주세요.')) return;
        if (!validatePositive(requestedLoan, '예상 대출금액을 입력해 주세요.')) return;
        if (!validatePositive(annualIncome, '연소득을 입력해 주세요.')) return;
        if (!validatePositive(months, '대출기간을 입력해 주세요.')) return;
        if (ltvRatio <= 0 || ltvRatio > 100 || dsrLimit <= 0 || dsrLimit > 100 || stressRate < 0) {
            alert('LTV·DSR 비율과 스트레스 금리를 확인해 주세요.');
            return;
        }

        const schedule = LoanMath.createSchedule({ principal: requestedLoan, annualRate, months, method });
        const neededFunds = Math.max(0, homePrice - ownFunds);
        const cashShortfall = Math.max(0, homePrice - ownFunds - requestedLoan);
        const ltvLimit = homePrice * ltvRatio / 100;
        const annualCapacity = Math.max(0, annualIncome * dsrLimit / 100 - existingAnnualDebt);
        const dsrLoanLimit = LoanMath.findPrincipalForAnnualDebt({ annualCapacity, annualRate: annualRate + stressRate, months, method });
        const estimatedLimit = Math.min(ltvLimit, dsrLoanLimit);
        const fundingLimit = Math.min(neededFunds, estimatedLimit);
        const currentDsr = LoanMath.getDsr(existingAnnualDebt + LoanMath.getAnnualDebtService({ principal: requestedLoan, annualRate, months, method }), annualIncome);
        const stressedDsr = LoanMath.getDsr(existingAnnualDebt + LoanMath.getAnnualDebtService({ principal: requestedLoan, annualRate: annualRate + stressRate, months, method }), annualIncome);

        renderResult({
            badge: 'MORTGAGE REPORT',
            title: '주택담보대출 한도와 상환부담 계산 결과',
            rows: [
                { label: '주택가격 / 보유자금', value: `${formatWon(homePrice)} / ${formatWon(ownFunds)}` },
                { label: '주택 구입에 필요한 자금', value: formatWon(neededFunds), className: 'highlight-row' },
                { label: `LTV ${formatPercent(ltvRatio, 1)} 입력 기준 한도`, value: formatWon(ltvLimit) },
                { label: `스트레스 금리 ${formatPercent(stressRate)} 반영 DSR 한도`, value: formatWon(dsrLoanLimit) },
                { label: 'LTV·DSR 중 낮은 예상 한도', value: formatWon(estimatedLimit), className: 'highlight-row' },
                { label: '필요자금까지 고려한 예상 가능액', value: formatWon(fundingLimit) },
                { label: '신청금액 기준 월 상환액', value: formatWon(schedule.firstPayment) },
                { label: '신청금액 기준 총이자', value: formatWon(schedule.totalInterest) },
                { label: '현재 금리 / 스트레스 반영 DSR', value: `${formatPercent(currentDsr)} / ${formatPercent(stressedDsr)}` },
                { label: '대출 후 추가로 필요한 자기자금', value: formatWon(cashShortfall), className: 'total-row' }
            ],
            formula: `LTV 예상 한도는 주택가격 × 입력 LTV 비율로 계산했습니다. DSR 예상 한도는 연소득 × 입력 DSR 한도에서 기존 연간 원리금 상환액을 뺀 뒤, 입력 금리에 스트레스 금리를 더한 원리금 상환액을 감당할 수 있는 원금을 역산했습니다. 금융회사별 인정소득·만기 산정과 지역·주택·차주별 규제는 별도 확인이 필요합니다.`,
            detailHtml: renderMortgageComparison(requestedLoan, annualRate, stressRate, method)
        });
    }

    function calculateDsr(event) {
        event.preventDefault();
        const annualIncome = getNumber('dsrAnnualIncome');
        const mortgageAnnual = getNumber('dsrExistingMortgageAnnual');
        const creditAnnual = getNumber('dsrExistingCreditAnnual');
        const otherAnnual = getNumber('dsrExistingOtherAnnual');
        const newLoan = getNumber('dsrNewLoanAmount');
        const annualRate = getNumber('dsrNewLoanRate');
        const years = getNumber('dsrNewLoanYears');
        const method = getValue('dsrNewLoanMethod');
        const stressRate = getNumber('dsrStressRate');
        const dsrLimit = getNumber('dsrLimit');
        const months = Math.round(years * 12);

        if (!validatePositive(annualIncome, '연소득을 입력해 주세요.')) return;
        if (!validatePositive(months, '신규 대출기간을 입력해 주세요.')) return;
        if (dsrLimit <= 0 || dsrLimit > 100 || stressRate < 0) {
            alert('DSR 한도와 스트레스 금리를 확인해 주세요.');
            return;
        }

        const existingAnnual = mortgageAnnual + creditAnnual + otherAnnual;
        const newAnnual = LoanMath.getAnnualDebtService({ principal: newLoan, annualRate, months, method });
        const stressedNewAnnual = LoanMath.getAnnualDebtService({ principal: newLoan, annualRate: annualRate + stressRate, months, method });
        const annualCapacity = Math.max(0, annualIncome * dsrLimit / 100 - existingAnnual);
        const availableLoan = LoanMath.findPrincipalForAnnualDebt({ annualCapacity, annualRate: annualRate + stressRate, months, method });
        const currentDsr = LoanMath.getDsr(existingAnnual, annualIncome);
        const newDsr = LoanMath.getDsr(existingAnnual + newAnnual, annualIncome);
        const stressDsr = LoanMath.getDsr(existingAnnual + stressedNewAnnual, annualIncome);
        const contributionRows = [
            ['기존 주택담보대출', mortgageAnnual],
            ['기존 신용대출', creditAnnual],
            ['기타 기존 대출', otherAnnual],
            ['신규 대출(스트레스 금리)', stressedNewAnnual]
        ];

        renderResult({
            badge: 'DSR REPORT',
            title: '현재·신규·스트레스 DSR 계산 결과',
            rows: [
                { label: '연소득', value: formatWon(annualIncome) },
                { label: '기존 대출 연간 원리금 합계', value: formatWon(existingAnnual) },
                { label: '현재 DSR', value: formatPercent(currentDsr), className: 'highlight-row' },
                { label: '신규 대출 포함 DSR', value: formatPercent(newDsr) },
                { label: `스트레스 금리 ${formatPercent(stressRate)} 반영 DSR`, value: formatPercent(stressDsr), className: 'highlight-row' },
                { label: `입력 DSR 한도 ${formatPercent(dsrLimit, 1)} 기준 연간 여력`, value: formatWon(annualCapacity) },
                { label: '예상 신규 대출 가능 금액', value: formatWon(availableLoan), className: 'total-row' }
            ],
            formula: `DSR = 모든 대출의 연간 원리금 상환액 ÷ 연소득 × 100입니다. 기존 대출은 사용자가 입력한 실제 연간 원리금 상환액을 사용하고, 신규 대출은 선택한 상환방식의 첫 12개월 상환액을 합산했습니다. 스트레스 DSR은 실제 적용금리가 아니라 한도 심사를 위한 가산금리를 반영한 결과입니다.`,
            detailHtml: `
                <section class="loan-result-section" aria-labelledby="dsrContributionTitle">
                    <h2 id="dsrContributionTitle">대출별 DSR 기여도</h2>
                    <div class="loan-table-wrap" tabindex="0" aria-label="대출별 DSR 기여도 표">
                        <table class="content-table"><thead><tr><th>대출 구분</th><th>연간 원리금</th><th>DSR 기여도</th></tr></thead><tbody>
                            ${contributionRows.map(([label, amount]) => `<tr><td>${label}</td><td>${formatWon(amount)}</td><td>${formatPercent(LoanMath.getDsr(amount, annualIncome))}</td></tr>`).join('')}
                        </tbody></table>
                    </div>
                </section>
            `
        });
    }

    function calculateJeonse(event) {
        event.preventDefault();
        const deposit = getNumber('jeonseDeposit');
        const loan = getNumber('jeonseLoanAmount');
        const annualRate = getNumber('jeonseAnnualRate');
        const months = Math.round(getNumber('jeonseMonths'));
        const monthlyRent = getNumber('jeonseMonthlyRent');
        const guaranteeAmount = getNumber('jeonseGuaranteeAmount');
        const guaranteeRate = getNumber('jeonseGuaranteeRate');

        if (!validatePositive(deposit, '전세보증금을 입력해 주세요.')) return;
        if (!validatePositive(loan, '전세대출금액을 입력해 주세요.')) return;
        if (!validatePositive(months, '대출기간을 1개월 이상 입력해 주세요.')) return;
        if (loan > deposit || annualRate < 0 || guaranteeRate < 0) {
            alert('대출금액과 금리·보증료율을 확인해 주세요.');
            return;
        }

        const monthlyInterest = loan * annualRate / 1200;
        const annualInterest = monthlyInterest * 12;
        const totalInterest = monthlyInterest * months;
        const loanRatio = loan / deposit * 100;
        const guaranteeFee = guaranteeAmount * guaranteeRate / 100 * months / 12;
        const monthlyGuaranteeFee = months > 0 ? guaranteeFee / months : 0;
        const monthlyHousingCost = monthlyInterest + monthlyGuaranteeFee;
        const rentDifference = monthlyRent > 0 ? monthlyRent - monthlyHousingCost : null;

        renderResult({
            badge: 'JEONSE LOAN REPORT',
            title: '전세대출 이자와 주거비용 계산 결과',
            rows: [
                { label: '전세보증금 / 대출금액', value: `${formatWon(deposit)} / ${formatWon(loan)}` },
                { label: '보증금 대비 대출 비율', value: formatPercent(loanRatio), className: 'highlight-row' },
                { label: '월 이자', value: formatWon(monthlyInterest), className: 'highlight-row' },
                { label: '연간 이자', value: formatWon(annualInterest) },
                { label: `${months.toLocaleString()}개월 총이자`, value: formatWon(totalInterest) },
                { label: '선택 입력 기준 예상 보증료', value: formatWon(guaranteeFee) },
                { label: '월평균 이자+보증료', value: formatWon(monthlyHousingCost) },
                { label: '입력 월세와의 월 비용 차이', value: rentDifference === null ? '월세 미입력' : `${rentDifference >= 0 ? '전세대출이 약 ' : '월세가 약 '}${formatWon(Math.abs(rentDifference))} 낮음`, className: 'total-row' }
            ],
            formula: `월 이자는 전세대출금액 × 연이율 ÷ 12로 계산하고, 대출기간 동안 원금이 유지되는 만기일시상환을 가정했습니다. 보증료는 입력한 보증금액 × 연 보증료율 × 이용연수로 단순 계산했습니다. 실제 보증료는 보증기관, 보증비율, 할인·할증과 계약기간에 따라 달라집니다.`,
            detailHtml: `
                <section class="loan-result-section"><h2>비용 비교 해석</h2><div class="policy-box"><p>전세대출의 월 현금 유출은 이자와 월평균 보증료를 합산해 보았습니다. 월세 비교 시에는 전세에 투입하는 자기자금의 예금이자·투자수익 기회비용과 관리비 차이도 별도로 고려해야 합니다.</p></div></section>
            `
        });
    }

    function calculateEarlyRepayment(event) {
        event.preventDefault();
        const balance = getNumber('repaymentBalance');
        const prepayment = getNumber('repaymentAmount');
        const annualRate = getNumber('repaymentAnnualRate');
        const months = Math.round(getNumber('repaymentRemainingMonths'));
        const method = getValue('repaymentMethod');
        const feeRate = getNumber('repaymentFeeRate');
        const feePeriodMonths = getNumber('repaymentFeePeriodMonths');
        const elapsedMonths = getNumber('repaymentElapsedMonths');

        if (!validatePositive(balance, '현재 대출잔액을 입력해 주세요.')) return;
        if (!validatePositive(prepayment, '중도상환 예정금액을 입력해 주세요.')) return;
        if (!validatePositive(months, '남은 대출기간을 입력해 주세요.')) return;
        if (prepayment > balance || annualRate < 0 || feeRate < 0 || elapsedMonths < 0) {
            alert('상환금액과 금리·수수료 조건을 확인해 주세요.');
            return;
        }

        const result = LoanMath.calculateEarlyRepayment({
            balance,
            prepayment,
            annualRate,
            months,
            method,
            feeRate,
            feePeriodMonths,
            elapsedMonths
        });
        const breakEvenText = result.breakEvenMonth === 0
            ? '즉시(수수료 없음)'
            : result.breakEvenMonth === null
                ? '남은 기간 내 미도달'
                : `약 ${result.breakEvenMonth.toLocaleString()}개월`;

        renderResult({
            badge: 'EARLY REPAYMENT REPORT',
            title: '중도상환수수료와 이자 절감 계산 결과',
            rows: [
                { label: '현재 대출잔액 / 조기상환액', value: `${formatWon(balance)} / ${formatWon(prepayment)}` },
                { label: '수수료 부과기간 잔여 비율', value: formatPercent(result.remainingFeeRatio * 100) },
                { label: '예상 중도상환수수료', value: formatWon(result.fee), className: 'highlight-row' },
                { label: '조기상환 전 남은 총이자', value: formatWon(result.before.totalInterest) },
                { label: '조기상환 후 남은 총이자', value: formatWon(result.after.totalInterest) },
                { label: '조기상환으로 절감되는 이자', value: formatWon(result.interestSaved), className: 'highlight-row' },
                { label: '수수료 차감 후 순절감액', value: formatWon(result.netSaving), className: 'total-row' },
                { label: '이자 절감액 기준 손익분기 시점', value: breakEvenText }
            ],
            formula: `예상 수수료 = 중도상환액 × 입력 수수료율 × (수수료 부과기간 - 경과기간) ÷ 수수료 부과기간입니다. 이자 절감액은 남은 기간과 상환방식을 동일하게 둔 상태에서 조기상환 전·후 상환표의 총이자 차이로 계산했습니다. 조기상환 후 월 납입액을 다시 산정하고 만기는 유지하는 것으로 가정했습니다.`,
            detailHtml: `
                <section class="loan-result-section"><h2>조기상환 판단</h2><div class="policy-box"><p>${result.netSaving > 0 ? `입력 조건에서는 수수료를 차감한 뒤에도 약 ${formatWon(result.netSaving)}의 이자비용 감소가 예상됩니다.` : `입력 조건에서는 남은 기간의 이자 절감액이 수수료보다 약 ${formatWon(Math.abs(result.netSaving))} 적습니다.`} 비상자금 감소, 다른 투자·예금 수익, 대출 약정의 면제 한도를 함께 비교해 결정하세요.</p></div></section>
            `
        });
    }

    function calculateLtv(event) {
        event.preventDefault();
        const collateralValue = getNumber('ltvCollateralValue');
        const existingSecuredDebt = getNumber('ltvExistingDebt');
        const priorityDeductions = getNumber('ltvPriorityDeductions');
        const requestedLoan = getNumber('ltvRequestedLoan');
        const limitRatio = getNumber('ltvLimitRatio');

        if (!validatePositive(collateralValue, '주택가격 또는 담보가치를 입력해 주세요.')) return;
        if (!validatePositive(requestedLoan, '신규 대출 희망금액을 입력해 주세요.')) return;
        if (limitRatio <= 0 || limitRatio > 100 || existingSecuredDebt < 0 || priorityDeductions < 0) {
            alert('LTV 비율과 기존 담보대출·차감액을 확인해 주세요.');
            return;
        }

        const result = LoanMath.calculateLtv({
            collateralValue,
            existingSecuredDebt,
            priorityDeductions,
            requestedLoan,
            limitRatio
        });

        renderResult({
            badge: 'LTV REPORT',
            title: '주택담보대출 LTV와 추가 한도 계산 결과',
            rows: [
                { label: '주택가격·담보가치', value: formatWon(collateralValue) },
                { label: '현재 담보대출 기준 LTV', value: formatPercent(result.currentLtv), className: 'highlight-row' },
                { label: `입력 LTV ${formatPercent(limitRatio, 1)} 기준 총한도`, value: formatWon(result.grossLimit) },
                { label: '기존 담보대출·선순위 차감 후 추가 가능액', value: formatWon(result.availableAdditionalLoan), className: 'highlight-row' },
                { label: '희망금액 포함 단순 LTV', value: formatPercent(result.requestedLtv) },
                { label: '선순위 차감액까지 고려한 보수적 비율', value: formatPercent(result.adjustedRequestedLtv) },
                { label: '희망금액 중 LTV 범위 내 금액', value: formatWon(result.estimatedLoan), className: 'total-row' },
                { label: 'LTV 기준 부족액', value: formatWon(result.shortfall) }
            ],
            formula: `LTV = 담보대출금액 ÷ 주택가격 또는 담보가치 × 100입니다. 입력 LTV 기준 총한도에서 기존 담보대출과 선순위채권·임차보증금 등 사용자가 입력한 차감액을 빼 추가 가능액을 계산했습니다. 실제 담보가치, 소액임차보증금 공제, 방공제와 적용 비율은 금융회사·지역·주택·대출 목적에 따라 달라집니다.`,
            detailHtml: `
                <section class="loan-result-section"><h2>주택담보대출 한도 해석</h2><div class="policy-box"><p>LTV 범위 안에 들어와도 DSR·DTI, 소득과 신용도, 담보평가, 대출 총액 제한과 금융회사 심사로 실제 승인금액은 더 낮아질 수 있습니다. <a href="mortgage-loan-calculator.html">주택담보대출 계산기</a>에서 필요자금과 DSR 한도를 함께 비교하세요.</p></div></section>
            `
        });
    }

    function calculateDti(event) {
        event.preventDefault();
        const annualIncome = getNumber('dtiAnnualIncome');
        const existingMortgagePrincipal = getNumber('dtiExistingMortgagePrincipal');
        const existingMortgageInterest = getNumber('dtiExistingMortgageInterest');
        const otherLoanInterest = getNumber('dtiOtherLoanInterest');
        const principal = getNumber('dtiNewLoanAmount');
        const annualRate = getNumber('dtiNewLoanRate');
        const years = getNumber('dtiNewLoanYears');
        const method = getValue('dtiRepaymentMethod');
        const mode = getValue('dtiMode');
        const limitRatio = getNumber('dtiLimitRatio');
        const months = Math.round(years * 12);

        if (!validatePositive(annualIncome, '연소득을 입력해 주세요.')) return;
        if (!validatePositive(principal, '신규 주택담보대출 금액을 입력해 주세요.')) return;
        if (!validatePositive(months, '신규 대출기간을 입력해 주세요.')) return;
        if (limitRatio <= 0 || limitRatio > 100 || annualRate < 0 || months > 600) {
            alert('DTI 비율, 금리와 대출기간을 확인해 주세요.');
            return;
        }

        const result = LoanMath.calculateDti({
            annualIncome,
            existingMortgagePrincipal,
            existingMortgageInterest,
            otherLoanInterest,
            principal,
            annualRate,
            months,
            method,
            mode,
            limitRatio
        });
        const modeLabel = mode === 'legacy' ? '과거 DTI 비교식' : '신DTI 산식';

        renderResult({
            badge: 'DTI REPORT',
            title: '주택담보대출 DTI와 예상 한도 계산 결과',
            rows: [
                { label: '적용 비교 방식', value: modeLabel },
                { label: '연소득', value: formatWon(annualIncome) },
                { label: '기존 부채의 연간 DTI 반영액', value: formatWon(result.existingBurden) },
                { label: '신규 주담대 첫 12개월 원리금', value: formatWon(result.newAnnualDebtService) },
                { label: '신규 대출 전 DTI', value: formatPercent(result.currentDti) },
                { label: '신규 대출 포함 DTI', value: formatPercent(result.totalDti), className: 'highlight-row' },
                { label: `입력 DTI ${formatPercent(limitRatio, 1)} 기준 연간 여력`, value: formatWon(result.annualCapacity) },
                { label: 'DTI 기준 예상 신규 대출 가능액', value: formatWon(result.availableLoan), className: 'total-row' },
                { label: '입력 DTI 기준 충족 여부', value: result.withinLimit ? '범위 이내' : '입력 기준 초과' }
            ],
            formula: mode === 'legacy'
                ? `과거 DTI 비교식은 신규 주택담보대출 원리금과 기존 주택담보대출·기타대출의 연이자를 연소득으로 나누어 계산했습니다. 이 모드는 과거 산식 비교용이며 현재 규정 적용을 의미하지 않습니다.`
                : `신DTI = 모든 주택담보대출의 연간 원리금 + 기타대출 연이자를 연소득으로 나눈 비율입니다. 기존 주담대의 연간 원금과 이자를 모두 반영하고, 신규 주담대는 선택한 상환방식의 첫 12개월 원리금을 계산했습니다.`,
            detailHtml: `
                <section class="loan-result-section"><h2>DTI 결과를 현재 대출 심사에 적용할 때</h2><div class="policy-box"><p>신DTI는 2018년 도입된 용어이며 주택담보대출 상환능력을 보는 산식입니다. 현재 가계대출 심사에서는 모든 가계대출 원리금을 보는 DSR과 스트레스 DSR이 함께 중요하므로, 이 결과만으로 승인 한도를 판단하지 마세요. <a href="dsr-calculator.html">DSR 계산기</a>에서 전체 부채도 확인할 수 있습니다.</p></div></section>
            `
        });
    }

    function calculateOverdraft(event) {
        event.preventDefault();
        const creditLimit = getNumber('overdraftCreditLimit');
        const usedBalance = getNumber('overdraftUsedBalance');
        const annualRate = getNumber('overdraftAnnualRate');
        const days = Math.round(getNumber('overdraftDays'));
        const dayBasis = getNumber('overdraftDayBasis');

        if (!validatePositive(creditLimit, '마이너스통장 한도를 입력해 주세요.')) return;
        if (!validatePositive(usedBalance, '평균 사용금액을 입력해 주세요.')) return;
        if (!validatePositive(days, '사용일수를 입력해 주세요.')) return;
        if (usedBalance > creditLimit || annualRate < 0 || ![365, 366].includes(dayBasis)) {
            alert('한도, 사용금액, 금리와 일수 계산 기준을 확인해 주세요.');
            return;
        }

        const result = LoanMath.calculateSimpleInterest({ balance: usedBalance, annualRate, days, dayBasis });
        const utilization = usedBalance / creditLimit * 100;
        const fullLimitInterest = LoanMath.calculateSimpleInterest({ balance: creditLimit, annualRate, days, dayBasis });

        renderResult({
            badge: 'OVERDRAFT REPORT',
            title: '마이너스통장 하루·월 이자 계산 결과',
            rows: [
                { label: '약정 한도 / 평균 사용금액', value: `${formatWon(creditLimit)} / ${formatWon(usedBalance)}` },
                { label: '한도 사용률', value: formatPercent(utilization), className: 'highlight-row' },
                { label: '하루 예상 이자', value: formatWon(result.dailyInterest), className: 'highlight-row' },
                { label: `${days.toLocaleString()}일 예상 이자`, value: formatWon(result.periodInterest), className: 'total-row' },
                { label: '30일 / 31일 예상 이자', value: `${formatWon(result.thirtyDayInterest)} / ${formatWon(result.thirtyOneDayInterest)}` },
                { label: '같은 잔액 1년 유지 시 단순 이자', value: formatWon(result.annualInterest) },
                { label: '한도를 모두 사용한 경우 같은 기간 이자', value: formatWon(fullLimitInterest.periodInterest) },
                { label: '사용잔액 100만 원 감축 시 기간 절감액', value: formatWon(result.savingPerMillion) }
            ],
            formula: `기간 이자 = 평균 사용금액 × 연이율 ÷ ${dayBasis}일 × 사용일수로 단순 계산했습니다. 마이너스통장은 약정 한도 전체가 아니라 실제 사용잔액과 사용일수에 따라 이자가 발생하는 상품이 일반적입니다. 실제 은행은 매일의 마감 잔액, 결산일, 윤년과 약관상 계산방법을 적용합니다.`,
            detailHtml: `
                <section class="loan-result-section"><h2>잔액이 매일 달라지는 경우</h2><div class="policy-box"><p>이 계산기는 기간 중 평균 사용금액이 일정하다고 가정합니다. 입출금으로 잔액이 자주 달라지면 구간별로 평균 잔액과 사용일수를 나누어 계산한 뒤 합산해야 실제 청구이자에 가까워집니다.</p></div></section>
            `
        });
    }

    function calculateCreditLoan(event) {
        event.preventDefault();
        const principal = getNumber('creditLoanAmount');
        const annualRate = getNumber('creditLoanAnnualRate');
        const years = getNumber('creditLoanYears');
        const extraMonths = getNumber('creditLoanExtraMonths');
        const method = getValue('creditLoanMethod');
        const annualIncome = getNumber('creditLoanAnnualIncome');
        const existingAnnualDebt = getNumber('creditLoanExistingAnnualDebt');
        const months = Math.round(years * 12 + extraMonths);

        if (!validatePositive(principal, '신용대출 금액을 입력해 주세요.')) return;
        if (!validatePositive(months, '대출기간을 입력해 주세요.')) return;
        if (annualRate < 0 || months > 600 || existingAnnualDebt < 0) {
            alert('금리, 기간과 기존 연간 원리금을 확인해 주세요.');
            return;
        }

        const schedule = LoanMath.createSchedule({ principal, annualRate, months, method });
        const higherRateSchedule = LoanMath.createSchedule({ principal, annualRate: annualRate + 1, months, method });
        const annualDebtService = LoanMath.getAnnualDebtService({ principal, annualRate, months, method });
        const newDsr = annualIncome > 0 ? LoanMath.getDsr(existingAnnualDebt + annualDebtService, annualIncome) : null;

        renderResult({
            badge: 'CREDIT LOAN REPORT',
            title: '신용대출 월 상환액과 총이자 계산 결과',
            rows: [
                { label: '신용대출 원금', value: formatWon(principal) },
                { label: '상환방식 / 기간', value: `${METHOD_LABELS[method]} / ${months.toLocaleString()}개월` },
                { label: method === 'equal-principal' ? '첫 달 상환액' : '월 상환액', value: formatWon(schedule.firstPayment), className: 'highlight-row' },
                { label: '총이자', value: formatWon(schedule.totalInterest) },
                { label: '총 상환금액', value: formatWon(schedule.totalPayment), className: 'total-row' },
                { label: '첫 12개월 원리금', value: formatWon(annualDebtService) },
                { label: '연소득 입력 기준 신규 대출 포함 DSR', value: newDsr === null ? '연소득 미입력' : formatPercent(newDsr) },
                { label: '금리 1%p 상승 시 월 상환액', value: formatWon(higherRateSchedule.firstPayment) },
                { label: '금리 1%p 상승 시 총이자 증가', value: formatWon(higherRateSchedule.totalInterest - schedule.totalInterest) }
            ],
            formula: `선택한 원리금균등·원금균등·만기일시상환 방식으로 월 원금과 이자를 계산했습니다. 선택 입력한 연소득과 기존 연간 원리금이 있으면 신규 신용대출의 첫 12개월 상환액을 더해 단순 DSR도 표시합니다. 금융회사의 신용평가, 한도대출 환산만기와 스트레스 DSR은 별도입니다.`,
            detailHtml: renderSchedule(schedule)
        });
    }

    function renderAutoComparison(principal, annualRate, balloon) {
        const terms = [36, 48, 60];
        return `
            <section class="loan-result-section" aria-labelledby="autoCompareTitle">
                <h2 id="autoCompareTitle">할부기간별 월 납입액 비교</h2>
                <div class="loan-table-wrap" tabindex="0" aria-label="자동차 할부기간별 비교표">
                    <table class="content-table"><thead><tr><th>기간</th><th>월 납입액</th><th>마지막 회차</th><th>총이자</th></tr></thead><tbody>
                        ${terms.map(months => {
                            const schedule = LoanMath.createBalloonSchedule({ principal, annualRate, months, balloon });
                            return `<tr><td>${months}개월</td><td>${formatWon(schedule.regularPayment)}</td><td>${formatWon(schedule.finalPayment)}</td><td>${formatWon(schedule.totalInterest)}</td></tr>`;
                        }).join('')}
                    </tbody></table>
                </div>
            </section>
        `;
    }

    function calculateAutoInstallment(event) {
        event.preventDefault();
        const vehiclePrice = getNumber('autoVehiclePrice');
        const downPayment = getNumber('autoDownPayment');
        const tradeInValue = getNumber('autoTradeInValue');
        const financedFees = getNumber('autoFinancedFees');
        const annualRate = getNumber('autoAnnualRate');
        const months = Math.round(getNumber('autoMonths'));
        const balloon = getNumber('autoBalloonPayment');

        if (!validatePositive(vehiclePrice, '차량가격을 입력해 주세요.')) return;
        if (!validatePositive(months, '할부기간을 입력해 주세요.')) return;
        if (downPayment < 0 || tradeInValue < 0 || financedFees < 0 || annualRate < 0 || downPayment + tradeInValue > vehiclePrice) {
            alert('선수금, 보상판매 금액, 비용과 금리를 확인해 주세요.');
            return;
        }

        const principal = vehiclePrice - downPayment - tradeInValue + financedFees;
        if (!validatePositive(principal, '실제 할부원금이 0원보다 커야 합니다.')) return;
        if (balloon < 0 || balloon > principal) {
            alert('유예원금은 할부원금 이하로 입력해 주세요.');
            return;
        }

        const schedule = LoanMath.createBalloonSchedule({ principal, annualRate, months, balloon });
        const totalAcquisitionCost = downPayment + tradeInValue + schedule.totalPayment;
        const balloonRatio = principal > 0 ? balloon / principal * 100 : 0;

        renderResult({
            badge: 'AUTO FINANCE REPORT',
            title: '자동차 할부금과 총이자 계산 결과',
            rows: [
                { label: '차량가격', value: formatWon(vehiclePrice) },
                { label: '선수금 / 보상판매', value: `${formatWon(downPayment)} / ${formatWon(tradeInValue)}` },
                { label: '할부원금(포함 비용 반영)', value: formatWon(principal), className: 'highlight-row' },
                { label: '일반 월 납입액', value: formatWon(schedule.regularPayment), className: 'highlight-row' },
                { label: '마지막 회차 납입액', value: formatWon(schedule.finalPayment) },
                { label: `유예원금 비율`, value: formatPercent(balloonRatio) },
                { label: '총이자', value: formatWon(schedule.totalInterest) },
                { label: '할부 총 상환금액', value: formatWon(schedule.totalPayment), className: 'total-row' },
                { label: '선수금·보상판매 포함 총 부담', value: formatWon(totalAcquisitionCost) }
            ],
            formula: `할부원금 = 차량가격 - 선수금 - 보상판매 금액 + 할부에 포함할 비용입니다. 유예원금이 있으면 만기 유예액의 현재가치를 제외한 금액을 매월 원리금균등 방식으로 상환하고 마지막 회차에 남은 유예원금을 함께 납부하는 것으로 계산했습니다. 취득세, 등록비, 보험료와 상품별 취급수수료는 입력한 포함 비용 외에는 반영하지 않습니다.`,
            detailHtml: renderAutoComparison(principal, annualRate, balloon)
        });
    }

    const calculators = {
        loan: { formId: 'loanCalculatorForm', calculate: calculateLoanInterest },
        mortgage: { formId: 'mortgageCalculatorForm', calculate: calculateMortgage },
        dsr: { formId: 'dsrCalculatorForm', calculate: calculateDsr },
        jeonse: { formId: 'jeonseCalculatorForm', calculate: calculateJeonse },
        repayment: { formId: 'repaymentCalculatorForm', calculate: calculateEarlyRepayment },
        ltv: { formId: 'ltvCalculatorForm', calculate: calculateLtv },
        dti: { formId: 'dtiCalculatorForm', calculate: calculateDti },
        overdraft: { formId: 'overdraftCalculatorForm', calculate: calculateOverdraft },
        credit: { formId: 'creditLoanCalculatorForm', calculate: calculateCreditLoan },
        auto: { formId: 'autoInstallmentCalculatorForm', calculate: calculateAutoInstallment }
    };

    document.addEventListener('DOMContentLoaded', () => {
        createResultPanel();
        bindMoneyInputs();
        if (document.body.dataset.calculator === 'mortgage') initializeMortgageFundingInputs();
        const calculator = calculators[document.body.dataset.calculator];
        const form = calculator ? document.getElementById(calculator.formId) : null;
        if (form) form.addEventListener('submit', calculator.calculate);
        renderIcons();
    });
})(window);
