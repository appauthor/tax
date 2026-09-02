(function initializeLivingFinanceCalculators(global) {
    "use strict";
    const won = value => `${Math.round(Number(value) || 0).toLocaleString()} 원`;
    const percent = value => `${((Number(value) || 0) * 100).toFixed(2)}%`;
    const number = id => Number(String(document.getElementById(id)?.value || '').replace(/[^\d.-]/g, '')) || 0;
    const value = id => document.getElementById(id)?.value || '';
    const checked = id => Boolean(document.getElementById(id)?.checked);

    function loadReportDependencies() {
        [
            ['html2canvas', 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'],
            ['jspdf', 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js']
        ].forEach(([globalName, source]) => {
            if (global[globalName] || document.querySelector(`script[src="${source}"]`)) return;
            const script = document.createElement('script');
            script.src = source;
            script.defer = true;
            document.head.appendChild(script);
        });
    }

    function showField(id, visible) {
        document.getElementById(id)?.closest('.form-group')?.classList.toggle('is-hidden', !visible);
    }

    function updateRentConversionFields() {
        const mode = value('rentConversionMode');
        showField('rentAnnualRate', mode !== 'actual-rate');
        showField('rentComparisonDeposit', mode === 'jeonse-to-rent');
        showField('rentMonthly', mode !== 'jeonse-to-rent');
        showField('rentJeonseDeposit', mode === 'actual-rate');
    }

    function updateBrokerageFields() {
        const transactionType = value('brokerageTransactionType');
        showField('brokeragePrice', transactionType === 'sale');
        showField('brokerageDeposit', transactionType !== 'sale');
        showField('brokerageMonthlyRent', transactionType === 'monthly');
    }

    function render(config) {
        const body = document.getElementById('resultTableBody');
        document.getElementById('repBadge').textContent = config.badge;
        document.getElementById('repTitle').textContent = config.title;
        document.getElementById('repCurrentDate').textContent = `산출 일시: ${new Date().toLocaleString('ko-KR')}`;
        body.innerHTML = config.rows.map(row => `<tr class="${row.className || ''}"><td>${row.label}</td><td class="text-right">${row.value}</td></tr>`).join('');
        document.getElementById('resultNotice').textContent = config.notice;
        document.getElementById('formulaContent').innerHTML = config.formula;
        showResult();
    }

    function rentConversion(event) {
        event.preventDefault();
        try {
            const result = LivingFinanceMath.calculateRentConversion({ mode: value('rentConversionMode'), deposit: number('rentDeposit'), comparisonDeposit: number('rentComparisonDeposit'), monthlyRent: number('rentMonthly'), jeonseDeposit: number('rentJeonseDeposit'), annualRate: number('rentAnnualRate') / 100, periodMonths: number('rentPeriodMonths'), jeonseLoan: number('rentJeonseLoan'), loanRate: number('rentLoanRate') / 100, opportunityRate: number('rentOpportunityRate') / 100 });
            render({ badge: 'RENT CONVERSION REPORT', title: '전월세 전환율 계산 결과', rows: [
                { label: '적용 연 전환율', value: percent(result.annualRate) },
                { label: '환산 보증금', value: won(result.convertedDeposit) },
                { label: '환산 월세', value: won(result.convertedMonthlyRent), className: 'total-row' },
                ...(result.impliedRate === null ? [] : [{ label: '실제 계약 전환율', value: percent(result.impliedRate) }]),
                { label: `${result.periodMonths}개월 전세 비용`, value: won(result.jeonseCost) },
                { label: `${result.periodMonths}개월 월세 비용`, value: won(result.rentCost) },
                { label: '월세 비용 − 전세 비용', value: won(result.difference), className: 'highlight-row' }
            ], notice: '※ 입력 전환율에 따른 비교입니다. 법정 상한은 기준금리 변동일과 계약의 전환 방향에 따라 직접 확인하세요.', formula: '<p>월세 환산액 = 보증금 차액 × 연 전환율 ÷ 12. 총비용 비교에는 입력한 대출이자와 자기자금 기회비용만 반영했습니다.</p>' });
        } catch (error) { alert('보증금·월세·전환율 입력값을 확인해 주세요.'); }
    }

    function subscription(event) {
        event.preventDefault();
        const result = LivingFinanceMath.calculateSubscriptionScore({ homelessYears: number('subscriptionHomelessYears'), dependents: number('subscriptionDependents'), subscriptionMonths: number('subscriptionAccountMonths'), spouseMonths: number('subscriptionSpouseMonths') });
        render({ badge: 'SUBSCRIPTION SCORE REPORT', title: '청약가점 계산 결과', rows: [
            { label: '무주택기간 점수', value: `${result.homelessScore}점 / 32점` }, { label: '부양가족 점수', value: `${result.dependentScore}점 / 35점` }, { label: '본인 청약통장 기본점수', value: `${result.accountScore}점` }, { label: '배우자 가입기간 가점', value: `${result.spouseAdditionalScore}점` }, { label: '청약통장 가입기간 점수', value: `${result.subscriptionScore}점 / 17점` }, { label: '예상 청약가점', value: `${result.totalScore}점 / 84점`, className: 'total-row' }
        ], notice: '※ 입력한 인정기간·인원으로 점수만 계산합니다. 주택소유 예외와 실제 부양가족 인정 여부는 청약Home·입주자모집공고에서 확인하세요.', formula: '<p>주택공급에 관한 규칙 별표 1의 무주택기간 32점, 부양가족 35점, 가입기간 17점 기준을 적용했습니다.</p>' });
    }

    function brokerage(event) {
        event.preventDefault();
        try {
            const result = LivingFinanceMath.calculateBrokerageFee({ propertyType: value('brokeragePropertyType'), transactionType: value('brokerageTransactionType'), price: number('brokeragePrice'), deposit: number('brokerageDeposit'), monthlyRent: number('brokerageMonthlyRent'), agreedRate: number('brokerageAgreedRate') / 100, vatRate: number('brokerageVatRate') / 100 });
            render({ badge: 'BROKERAGE FEE REPORT', title: '부동산 중개보수 계산 결과', rows: [
                { label: '중개보수 산정 거래금액', value: won(result.transactionAmount) }, { label: '법정 상한요율', value: percent(result.maximumRate) }, { label: '적용 협의요율', value: percent(result.appliedRate) }, { label: '부가세 전 중개보수', value: won(result.feeBeforeVat) }, { label: '입력 부가세', value: won(result.vat) }, { label: '예상 지급액', value: won(result.total), className: 'total-row' }
            ], notice: '※ 서울특별시 주택 조례와 공인중개사법 시행규칙 기준의 상한액입니다. 실제 보수는 상한 이내에서 협의합니다.', formula: '<p>중개보수 = 산정 거래금액 × 적용요율(구간별 한도 적용). 월세 거래금액은 보증금 + 월세 × 100이며, 5천만원 미만이면 ×70으로 다시 계산했습니다.</p>' });
        } catch (error) { alert('거래금액과 요율을 확인해 주세요.'); }
    }

    function severance(event) {
        event.preventDefault();
        const result = LivingFinanceMath.calculateSeverance({ serviceDays: number('severanceServiceDays'), averagePeriodDays: number('severanceAverageDays'), threeMonthWages: number('severanceThreeMonthWages'), annualBonus: number('severanceAnnualBonus'), annualLeavePay: number('severanceAnnualLeavePay'), ordinaryDailyWage: number('severanceOrdinaryDailyWage'), weeklyHoursEligible: checked('severanceWeeklyHoursEligible') });
        render({ badge: 'SEVERANCE PAY REPORT', title: '퇴직금 계산 결과', rows: [
            { label: '퇴직 전 3개월 임금', value: won(result.threeMonthWages) }, { label: '상여금 산입액(3/12)', value: won(result.includedBonus) }, { label: '연차수당 산입액(3/12)', value: won(result.includedLeavePay) }, { label: '1일 평균임금', value: won(result.averageDailyWage) }, { label: '입력한 1일 통상임금', value: won(result.ordinaryDailyWage) }, { label: '적용 1일 임금', value: won(result.appliedDailyWage) }, { label: '예상 법정 퇴직금', value: result.eligible ? won(result.severance) : '일반 지급요건 미충족', className: 'total-row' }
        ], notice: '※ 일반적인 법정 퇴직금 예상치이며 평균임금 제외기간, 임금성 여부, 퇴직연금과 세금은 포함하지 않습니다.', formula: '<p>적용 1일 임금 × 30일 × 재직일수 ÷ 365. 평균임금보다 입력한 통상임금이 높으면 통상임금을 적용했습니다.</p>' });
    }

    function salary(event) {
        event.preventDefault();
        const result = LivingFinanceMath.calculateNetSalary({ grossMonthly: number('salaryGrossMonthly'), nonTaxableMonthly: number('salaryNonTaxableMonthly'), incomeTax: number('salaryIncomeTax'), otherDeduction: number('salaryOtherDeduction') });
        render({ badge: 'NET SALARY REPORT', title: '연봉 실수령액 계산 결과', rows: [
            { label: '월 세전 급여', value: won(result.grossMonthly) }, { label: '비과세 급여', value: won(result.nonTaxableMonthly) }, { label: '국민연금 근로자 부담', value: won(result.pension) }, { label: '건강보험 근로자 부담', value: won(result.health) }, { label: '장기요양보험', value: won(result.longTermCare) }, { label: '고용보험 근로자 부담', value: won(result.employment) }, { label: '확인한 월 소득세', value: won(result.incomeTax) }, { label: '지방소득세', value: won(result.localIncomeTax) }, { label: '월 공제 합계', value: won(result.totalDeduction) }, { label: '예상 월 실수령액', value: won(result.netMonthly), className: 'total-row' }, { label: '예상 연 실수령액', value: won(result.netAnnual) }
        ], notice: '※ 2026년 9월 기준 보험료율과 사용자가 국세청에서 확인한 월 소득세를 합산합니다. 회사별 비과세·기준보수·정산액은 다를 수 있습니다.', formula: '<p>월 실수령액 = 세전 급여 − 국민연금 − 건강보험 − 장기요양보험 − 고용보험 − 입력 소득세 − 지방소득세 − 기타 공제.</p>' });
    }

    function rentTaxCredit(event) {
        event.preventDefault();
        const result = LivingFinanceMath.calculateRentTaxCredit({ grossSalary: number('rentCreditGrossSalary'), comprehensiveIncome: number('rentCreditComprehensiveIncome'), paidRent: number('rentCreditPaidRent'), availableTax: number('rentCreditAvailableTax'), noHome: checked('rentCreditNoHome'), addressMatched: checked('rentCreditAddressMatched'), qualifiedHousing: checked('rentCreditQualifiedHousing'), contractQualified: checked('rentCreditContractQualified') });
        render({ badge: 'RENT TAX CREDIT REPORT', title: '월세 세액공제 계산 결과', rows: [
            { label: '기본 요건 판정', value: result.eligible ? '입력 기준 충족' : '입력 기준 미충족' }, { label: '적용 공제율', value: percent(result.rate) }, { label: '지급한 월세', value: won(result.paidRent) }, { label: '공제대상 월세액', value: won(result.recognizedRent) }, { label: '한도 등 제외 월세액', value: won(result.excludedRent) }, { label: '산식상 세액공제액', value: won(result.calculatedCredit) }, { label: '예상 적용 가능액', value: won(result.usableCredit), className: 'total-row' }
        ], notice: '※ 2026년 7월 1일 시행 기준입니다. 실제 공제는 연말정산의 산출세액과 다른 공제, 제출서류에 따라 달라집니다.', formula: '<p>공제대상 월세액(연 1,000만원 한도) × 15%, 총급여 5,500만원 이하이면서 종합소득금액 4,500만원 이하이면 17%를 적용했습니다.</p>' });
    }

    document.addEventListener('DOMContentLoaded', () => {
        loadReportDependencies();
        const handlers = { 'rent-conversion': ['rentConversionForm', rentConversion], 'subscription-score': ['subscriptionScoreForm', subscription], 'brokerage-fee': ['brokerageFeeForm', brokerage], 'severance-pay': ['severancePayForm', severance], 'net-salary': ['netSalaryForm', salary], 'rent-tax-credit': ['rentTaxCreditForm', rentTaxCredit] };
        const setup = handlers[document.body.dataset.calculator];
        if (setup) document.getElementById(setup[0])?.addEventListener('submit', setup[1]);
        document.getElementById('rentConversionMode')?.addEventListener('change', updateRentConversionFields);
        document.getElementById('brokerageTransactionType')?.addEventListener('change', updateBrokerageFields);
        updateRentConversionFields();
        updateBrokerageFields();
        if (typeof bindMoneyInputs === 'function') bindMoneyInputs();
        renderIcons();
    });
}(window));
