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

    function calculateMortgage(event) {
        event.preventDefault();
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
        const stressedSchedule = LoanMath.createSchedule({ principal: requestedLoan, annualRate: annualRate + stressRate, months, method });
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

    const calculators = {
        loan: { formId: 'loanCalculatorForm', calculate: calculateLoanInterest },
        mortgage: { formId: 'mortgageCalculatorForm', calculate: calculateMortgage },
        dsr: { formId: 'dsrCalculatorForm', calculate: calculateDsr },
        jeonse: { formId: 'jeonseCalculatorForm', calculate: calculateJeonse },
        repayment: { formId: 'repaymentCalculatorForm', calculate: calculateEarlyRepayment }
    };

    document.addEventListener('DOMContentLoaded', () => {
        createResultPanel();
        bindMoneyInputs();
        const calculator = calculators[document.body.dataset.calculator];
        const form = calculator ? document.getElementById(calculator.formId) : null;
        if (form) form.addEventListener('submit', calculator.calculate);
        renderIcons();
    });
})(window);
