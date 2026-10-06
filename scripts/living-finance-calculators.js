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

    function updateFinanceFields() {
        const key = document.body.dataset.calculator;
        if (key === 'subscription-score') {
            const dates = value('subscriptionMode') === 'dates';
            ['subscriptionAnnouncementDate', 'subscriptionBirthDate', 'subscriptionMarriageDate', 'subscriptionNoHomeDate', 'subscriptionOwnJoinDate', 'subscriptionSpouseJoinDate'].forEach(id => laborField(id, dates));
            ['subscriptionHomelessYears', 'subscriptionHasNoHomeStart', 'subscriptionAccountMonths', 'subscriptionSpouseMonths'].forEach(id => laborField(id, !dates));
        } else if (key === 'severance-pay') {
            const dates = value('severanceMode') === 'dates';
            ['severanceHireDate', 'severanceSeparationDate'].forEach(id => laborField(id, dates));
            ['severanceServiceDays', 'severanceAverageDays'].forEach(id => laborField(id, !dates));
        } else if (key === 'net-salary') {
            const annual = value('salaryInputMode') === 'annual';
            const table = value('salaryIncomeTaxMode') === 'table';
            laborField('salaryGrossAnnual', annual);
            laborField('salaryGrossMonthly', !annual);
            ['salaryDependents', 'salaryChildren', 'salaryWithholdingRate'].forEach(id => laborField(id, table));
            laborField('salaryIncomeTax', !table);
        }
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
        } catch { alert('보증금·월세·전환율 입력값을 확인해 주세요.'); }
    }

    function subscription(event) {
        event.preventDefault();
        try {
            const dates = value('subscriptionMode') === 'dates';
            const periods = dates ? LivingFinanceMath.calculateSubscriptionPeriods({ announcementDate: value('subscriptionAnnouncementDate'), birthDate: value('subscriptionBirthDate'), marriageDate: value('subscriptionMarriageDate'), noHomeDate: value('subscriptionNoHomeDate'), ownJoinDate: value('subscriptionOwnJoinDate'), spouseJoinDate: value('subscriptionSpouseJoinDate') }) : { homelessYears: number('subscriptionHomelessYears'), hasNoHomeStart: value('subscriptionHasNoHomeStart') === 'yes', subscriptionMonths: number('subscriptionAccountMonths'), spouseMonths: number('subscriptionSpouseMonths') };
            const result = LivingFinanceMath.calculateSubscriptionScore({ ...periods, dependents: number('subscriptionDependents') });
            render({ badge: 'SUBSCRIPTION SCORE REPORT', title: '청약가점 계산 결과', rows: [
                ...(dates ? [{ label: '무주택기간 시작일', value: periods.homelessStartDate || '만 30세 전 미혼: 인정기간 없음' }, { label: '인정 무주택기간', value: `${periods.homelessYears}년` }, { label: '본인 통장 가입기간', value: `${periods.subscriptionMonths}개월` }, { label: '배우자 통장 인정기간(1/2)', value: `${result.spouseRecognizedMonths}개월` }] : []),
                { label: '무주택기간 점수', value: `${result.homelessScore}점 / 32점` }, { label: '부양가족 점수', value: `${result.dependentScore}점 / 35점` }, { label: '본인 청약통장 기본점수', value: `${result.accountScore}점` }, { label: '배우자 가입기간 가점', value: `${result.spouseAdditionalScore}점` }, { label: '청약통장 가입기간 점수', value: `${result.subscriptionScore}점 / 17점` }, { label: '예상 청약가점', value: `${result.totalScore}점 / 84점`, className: 'total-row' }
            ], notice: '※ 2026년 10월 6일 확인한 주택공급에 관한 규칙 별표 1 기준의 예상 점수입니다. 본인·배우자의 현재 무주택과 입력한 부양가족 인정을 전제하며 주택소유 예외·특별공급은 자동 판정하지 않습니다.', formula: '<p>무주택기간 최대 32점 + 부양가족 최대 35점 + 통장 가입기간 최대 17점. 배우자 통장 가입기간은 기간의 1/2을 점수표에 대입해 최대 3점만 더합니다.</p>' });
        } catch (error) { document.getElementById('resultBox').style.display = 'none'; alert(error.message || '청약 날짜와 인정인원을 확인해 주세요.'); }
    }

    function brokerage(event) {
        event.preventDefault();
        try {
            const result = LivingFinanceMath.calculateBrokerageFee({ propertyType: value('brokeragePropertyType'), transactionType: value('brokerageTransactionType'), price: number('brokeragePrice'), deposit: number('brokerageDeposit'), monthlyRent: number('brokerageMonthlyRent'), agreedRate: number('brokerageAgreedRate') / 100, vatRate: number('brokerageVatRate') / 100 });
            render({ badge: 'BROKERAGE FEE REPORT', title: '서울 부동산 중개보수 계산 결과', rows: [
                { label: '중개보수 산정 거래금액', value: won(result.transactionAmount) }, { label: '법정 상한요율', value: percent(result.maximumRate) }, { label: '적용 협의요율', value: percent(result.appliedRate) }, { label: '부가세 전 중개보수', value: won(result.feeBeforeVat) }, { label: '입력 부가세', value: won(result.vat) }, { label: '예상 지급액', value: won(result.total), className: 'total-row' }
            ], notice: '※ 2026년 10월 6일 확인한 서울특별시 주택 조례와 공인중개사법 시행규칙 기준의 상한액입니다. 서울 외 주택에는 적용하지 마세요. 실제 보수는 상한 이내에서 협의합니다.', formula: '<p>중개보수 = 산정 거래금액 × 적용요율(구간별 한도 적용). 월세 거래금액은 보증금 + 월세 × 100이며, 5천만원 미만이면 ×70으로 다시 계산했습니다.</p>' });
        } catch { alert('거래금액과 요율을 확인해 주세요.'); }
    }

    function severance(event) {
        event.preventDefault();
        try {
            const dates = value('severanceMode') === 'dates';
            const periods = dates ? LivingFinanceMath.calculateSeverancePeriods({ hireDate: value('severanceHireDate'), separationDate: value('severanceSeparationDate') }) : { serviceDays: number('severanceServiceDays'), averagePeriodDays: number('severanceAverageDays') };
            const result = LivingFinanceMath.calculateSeverance({ ...periods, threeMonthWages: number('severanceThreeMonthWages'), annualBonus: number('severanceAnnualBonus'), annualLeavePay: number('severanceAnnualLeavePay'), ordinaryDailyWage: number('severanceOrdinaryDailyWage'), weeklyHoursEligible: checked('severanceWeeklyHoursEligible') });
            render({ badge: 'SEVERANCE PAY REPORT', title: '퇴직금 계산 결과', rows: [
                ...(dates ? [{ label: '평균임금 산정기간', value: `${periods.periodStart} ~ ${periods.periodEnd}` }] : []),
                { label: '재직일수', value: `${result.serviceDays}일` }, { label: '평균임금 산정일수', value: `${result.averagePeriodDays}일` }, { label: '퇴직 전 3개월 임금', value: won(result.threeMonthWages) }, { label: '상여금 산입액(3/12)', value: won(result.includedBonus) }, { label: '연차수당 산입액(3/12)', value: won(result.includedLeavePay) }, { label: '1일 평균임금', value: won(result.averageDailyWage) }, { label: '입력한 1일 통상임금', value: won(result.ordinaryDailyWage) }, { label: '적용 1일 임금', value: won(result.appliedDailyWage) }, { label: '예상 법정 퇴직금', value: result.eligible ? won(result.severance) : '일반 지급요건 미충족', className: 'total-row' }
            ], notice: '※ 2026년 10월 6일 확인한 일반적인 법정 퇴직금 예상치입니다. 평균임금 제외기간, 임금성 여부, 퇴직연금·중간정산과 세금은 포함하지 않습니다.', formula: '<p>적용 1일 임금 × 30일 × 재직일수 ÷ 365. 평균임금보다 입력한 통상임금이 높으면 통상임금을 적용했습니다.</p>' });
        } catch (error) { document.getElementById('resultBox').style.display = 'none'; alert(error.message || '입사일·퇴직일을 확인해 주세요.'); }
    }

    function salary(event) {
        event.preventDefault();
        try {
            const annual = value('salaryInputMode') === 'annual';
            const table = value('salaryIncomeTaxMode') === 'table';
            const result = LivingFinanceMath.calculateNetSalary({ grossMonthly: annual ? number('salaryGrossAnnual') / 12 : number('salaryGrossMonthly'), nonTaxableMonthly: number('salaryNonTaxableMonthly'), incomeTaxMode: table ? 'table' : 'manual', dependents: number('salaryDependents'), eligibleChildren: number('salaryChildren'), withholdingRate: number('salaryWithholdingRate'), incomeTax: number('salaryIncomeTax'), otherDeduction: number('salaryOtherDeduction') });
            render({ badge: 'NET SALARY REPORT', title: '연봉 실수령액 계산 결과', rows: [
                { label: '세전 연봉(12개월 환산)', value: won(result.grossAnnual) }, { label: '월 세전 급여', value: won(result.grossMonthly) }, { label: '월 비과세 급여', value: won(result.nonTaxableMonthly) }, { label: '월 과세급여', value: won(result.taxableMonthly) },
                ...(table ? [{ label: '간이세액표 기준 세액(100%)', value: won(result.incomeTaxDetails.standardTax) }, { label: '선택한 원천징수 비율', value: percent(result.incomeTaxDetails.withholdingRate) }] : []),
                { label: '국민연금 근로자 부담', value: won(result.pension) }, { label: '건강보험 근로자 부담', value: won(result.health) }, { label: '장기요양보험', value: won(result.longTermCare) }, { label: '고용보험 근로자 부담', value: won(result.employment) }, { label: table ? '월 소득세(국세)' : '확인한 월 소득세(국세)', value: won(result.incomeTax) }, { label: '지방소득세', value: won(result.localIncomeTax) }, { label: '기타 회사 공제', value: won(result.otherDeduction) }, { label: '월 공제 합계', value: won(result.totalDeduction) }, { label: '예상 월 실수령액', value: won(result.netMonthly), className: 'total-row' }, { label: '예상 연 실수령액', value: won(result.netAnnual) }
            ], notice: `※ 2026년 10월 6일 확인한 보험료율과 ${table ? '2026년 2월 27일 개정 국세청 근로소득 간이세액표' : '사용자가 확인한 월 소득세'}를 적용했습니다. 연봉은 12개월 균등 지급으로 가정하며 회사별 비과세·기준보수·정산액과 실제 원 단위 처리는 다를 수 있습니다.`, formula: '<p>월 과세급여 = 월 세전 급여 − 비과세 급여. 월 실수령액 = 월 세전 급여 − 국민연금 − 건강보험 − 장기요양보험 − 고용보험 − 소득세 − 지방소득세 − 기타 공제.</p>' });
        } catch (error) { document.getElementById('resultBox').style.display = 'none'; alert(error.message || '연봉과 공제 입력값을 확인해 주세요.'); }
    }

    function rentTaxCredit(event) {
        event.preventDefault();
        const result = LivingFinanceMath.calculateRentTaxCredit({ grossSalary: number('rentCreditGrossSalary'), comprehensiveIncome: number('rentCreditComprehensiveIncome'), paidRent: number('rentCreditPaidRent'), availableTax: number('rentCreditAvailableTax'), noHome: checked('rentCreditNoHome'), addressMatched: checked('rentCreditAddressMatched'), qualifiedHousing: checked('rentCreditQualifiedHousing'), contractQualified: checked('rentCreditContractQualified') });
        render({ badge: 'RENT TAX CREDIT REPORT', title: '월세 세액공제 계산 결과', rows: [
            { label: '기본 요건 판정', value: result.eligible ? '입력 기준 충족' : '입력 기준 미충족' }, { label: '적용 공제율', value: percent(result.rate) }, { label: '지급한 월세', value: won(result.paidRent) }, { label: '공제대상 월세액', value: won(result.recognizedRent) }, { label: '한도 등 제외 월세액', value: won(result.excludedRent) }, { label: '산식상 세액공제액', value: won(result.calculatedCredit) }, { label: '예상 적용 가능액', value: won(result.usableCredit), className: 'total-row' }
        ], notice: '※ 2026년 7월 1일 시행 기준입니다. 실제 공제는 연말정산의 산출세액과 다른 공제, 제출서류에 따라 달라집니다.', formula: '<p>공제대상 월세액(연 1,000만원 한도) × 15%, 총급여 5,500만원 이하이면서 종합소득금액 4,500만원 이하이면 17%를 적용했습니다.</p>' });
    }

    const laborValue = id => value(id).trim().replace(/,/g, '');
    const decimal = n => Number(n.toFixed(2)).toLocaleString('ko-KR');
    const row = (label, value, total = false) => ({ label, value, className: total ? 'total-row' : '' });
    function laborField(id, visible) {
        const input = document.getElementById(id);
        if (!input) return;
        showField(id, visible);
        input.disabled = !visible;
    }
    function updateLaborFields() {
        const key = document.body.dataset.calculator;
        if (key === 'weekly-holiday-pay') {
            const fourWeeks = value('weeklyHoursMode') === 'four-weeks';
            laborField('weeklyHours', !fourWeeks);
            ['weeklyWeek1', 'weeklyWeek2', 'weeklyWeek3', 'weeklyWeek4'].forEach(id => laborField(id, fourWeeks));
        }
        if (key === 'annual-leave') {
            const automatic = value('leaveMode') === 'automatic';
            ['leaveHireDate', 'leaveAsOfDate', 'leaveAttendance', 'leaveEligible'].forEach(id => laborField(id, automatic));
            laborField('leaveAccruedDays', !automatic);
            laborField('leaveMonthlyHours', value('leaveWageMode') === 'monthly');
            const labels = { monthly: '월 통상임금 (원)', hourly: '통상시급 (원)', daily: '확인한 1일 통상임금 또는 평균임금 (원)' };
            document.querySelector('label[for="leaveWageAmount"]').textContent = labels[value('leaveWageMode')];
        }
        if (key === 'parental-leave-benefit') {
            const shared = value('parentalMode') === 'shared';
            ['parentalPartnerWage', 'parentalPartnerMonths', 'parentalSharedEligible'].forEach(id => laborField(id, shared));
            laborField('parentalSingleEligible', value('parentalMode') === 'single');
            laborField('parentalExtendedEligible', number('parentalMonths') > 12 || (shared && number('parentalPartnerMonths') > 12));
        }
        if (key === 'earned-income-credit') {
            laborField('creditPartnerPay', checked('creditHasSpouse'));
            laborField('creditHasDependent', !checked('creditHasSpouse'));
        }
    }
    function laborAction(event, calculate) {
        event.preventDefault();
        try {
            const config = calculate();
            render(config);
            const headings = document.querySelectorAll('#resultBox thead th');
            if (headings.length === 2) { headings[0].textContent = '계산 항목'; headings[1].textContent = '계산 결과'; }
            const formulaHeading = document.querySelector('#resultBox .report-formula-title');
            if (formulaHeading) formulaHeading.textContent = '계산 과정과 적용 기준';
        } catch (error) {
            const resultBox = document.getElementById('resultBox');
            if (resultBox) resultBox.style.display = 'none';
            alert(error.message || '입력값을 확인해 주세요.');
        }
    }
    function weeklyHolidayPay(event) {
        laborAction(event, () => {
            let weeklyHours = laborValue('weeklyHours');
            if (value('weeklyHoursMode') === 'four-weeks') {
                const hours = ['weeklyWeek1', 'weeklyWeek2', 'weeklyWeek3', 'weeklyWeek4'].map(id => {
                    const raw = laborValue(id), n = Number(raw);
                    if (raw === '' || !Number.isFinite(n) || n < 0 || n > 40) throw new Error('각 주의 소정근로시간을 0~40시간으로 입력해 주세요.');
                    return n;
                });
                weeklyHours = hours.reduce((sum, h) => sum + h, 0) / 4;
            }
            const r = LivingFinanceMath.calculateWeeklyHolidayPay({ weeklyHours, hourlyWage: laborValue('weeklyHourly'), wageMode: value('weeklyWageMode'), attended: checked('weeklyAttended'), employmentMaintained: checked('weeklyMaintained') });
            return { badge: 'WEEKLY HOLIDAY PAY REPORT', title: '주휴수당 계산 결과', rows: [
                row('입력 기준 주휴수당 요건', r.eligible ? '충족' : '미충족'), row('4주 평균 주 소정근로시간', `${decimal(r.weeklyHours)}시간`),
                row('기본 시급', won(r.hourlyWage)), row('주휴 유급시간', `${decimal(r.holidayHours)}시간`), row('1주 주휴수당', won(r.holidayPay), true),
                row('계약시간 기준 기본 주급', won(r.basicWeeklyPay)), row('주휴 포함 예상 주급', won(r.weeklyPay)), row('주휴 포함 환산 시급', won(r.inclusiveHourly)),
                row('동일 조건 월 환산액', won(r.monthlyPay)) ],
                notice: `※ 주 40시간·5일 통상근로자를 비교 기준으로 계산합니다. 월액은 365÷7÷12주 환산이며 결근 공제, 연장·야간수당, 세금은 제외합니다.${r.belowMinimum ? ' 입력 또는 역산한 기본 시급이 2026년 최저시급 10,320원보다 낮습니다.' : ''}`,
                formula: '<p>주휴 유급시간 = 4주 평균 주 소정근로시간 ÷ 5. 주휴수당 = 기본 시급 × 주휴 유급시간. 포함 시급 역산은 주휴 지급요건을 충족할 때만 적용합니다.</p>' };
        });
    }
    function unemploymentBenefit(event) {
        laborAction(event, () => {
            const r = LivingFinanceMath.calculateUnemploymentBenefit({ separationDate: value('unemploymentDate'), age: laborValue('unemploymentAge'), insuredMonths: laborValue('unemploymentMonths'), insuredDays: laborValue('unemploymentDays'), dailyHours: laborValue('unemploymentHours'), averagePeriodDays: laborValue('unemploymentAverageDays'), threeMonthWages: laborValue('unemploymentWages'), annualBonus: laborValue('unemploymentBonus'), annualLeavePay: laborValue('unemploymentLeavePay'), ordinaryDailyWage: laborValue('unemploymentOrdinary'), disabled: checked('unemploymentDisabled'), qualifyingReason: checked('unemploymentReason') });
            return { badge: 'UNEMPLOYMENT BENEFIT REPORT', title: '실업급여 모의계산 결과', rows: [
                row('입력한 기본요건', r.eligible ? '충족 가정 · 최종 심사 별도' : '미충족 · 수급요건 확인 필요'), row('상여금 산입액', won(r.includedBonus)), row('연차수당 산입액', won(r.includedLeavePay)),
                row('1일 평균임금', won(r.averageDailyWage)), row('평균·통상임금 중 큰 금액', won(r.appliedDailyWage)), row('임금의 60%', won(r.uncappedDaily)),
                row('2026년 적용 하한액', won(r.floor)), row('2026년 1일 상한액', won(68100)), row('수급자격 인정 시 1일 구직급여', won(r.dailyBenefit)),
                row('수급자격 인정 시 소정급여일수', `${r.benefitDays}일`), row('예상 실업급여 총액', r.eligible ? won(r.total) : '지급액 계산 보류', true),
                row('수급자격 인정 시 30일 환산액', won(r.monthlyEquivalent)) ],
                notice: '※ 2026년 이직한 일반 상용근로자 기준입니다. 가입개월과 피보험단위기간은 서로 다릅니다. 수급자격·실업인정은 고용센터에서 심사하며 대기기간, 취업일, 연장급여·조기재취업수당은 총액에 포함하지 않습니다.',
                formula: '<p>1일 구직급여 = 평균·통상임금 중 큰 금액의 60%에 2026년 상한·하한 적용. 예상 총액 = 1일 구직급여 × 연령·인정 가입기간별 소정급여일수. 30일 환산액은 실제 매월 입금액이 아닙니다.</p>' };
        });
    }
    function annualLeave(event) {
        laborAction(event, () => {
            const r = LivingFinanceMath.calculateAnnualLeave({ mode: value('leaveMode'), hireDate: value('leaveHireDate'), asOfDate: value('leaveAsOfDate'), attendanceConfirmed: checked('leaveAttendance'), statutoryEligible: checked('leaveEligible'), accruedDays: laborValue('leaveAccruedDays'), usedDays: laborValue('leaveUsedDays'), previousUnpaidDays: laborValue('leavePreviousDays'), dailyHours: laborValue('leaveDailyHours'), wageMode: value('leaveWageMode'), wageAmount: laborValue('leaveWageAmount'), monthlyHours: laborValue('leaveMonthlyHours'), payableConfirmed: checked('leavePayable') });
            return { badge: 'ANNUAL LEAVE REPORT', title: '연차 발생일수·연차수당 계산 결과', rows: [
                ...(r.mode === 'automatic' ? [row('현재 연차 부여기간', `${r.cycleStart} ~ ${r.cycleEnd}`), row('입사 후 누적 발생일수(사용·소멸 전)', `${r.totalAccrued}일`)] : []),
                row('해당 부여기간 발생·확인 연차', `${decimal(r.accrued)}일`), row('해당 부여기간 사용 연차', `${decimal(r.usedDays)}일`), row('해당 부여기간 잔여 연차', `${decimal(r.remainingDays)}일`, true),
                row('직접 확인한 과거 미정산 일수', `${decimal(r.previousUnpaidDays)}일`), row('적용 1일 임금', won(r.dailyWage)), row('수당 계산 대상 일수', `${decimal(r.payableDays)}일`), row('세전 예상 연차수당', won(r.allowance), true) ],
                notice: '※ 자동 계산은 주 40시간·5일 근무와 출근요건 충족을 전제로 합니다. 기준일은 근로관계가 있는 날로, 퇴사 계산 시 마지막 재직일을 넣으세요. 누적 발생일수는 현재 잔여일수가 아닙니다. 사용촉진에 따른 보상의무 면제·이미 정산한 일수·소멸시효는 별도 확인합니다.',
                formula: '<p>1년 미만: 매월 개근 시 1일(최대 11일). 1년을 마친 다음 날 재직하면 15일, 이후 2년마다 1일 가산(최대 25일). 세전 수당 = 확인한 지급 대상 일수 × 적용 1일 임금.</p>' };
        });
    }
    function parentalLeaveBenefit(event) {
        laborAction(event, () => {
            const r = LivingFinanceMath.calculateParentalLeaveBenefit({ mode: value('parentalMode'), wage: laborValue('parentalWage'), months: laborValue('parentalMonths'), usedMonths: laborValue('parentalUsedMonths'), partnerWage: laborValue('parentalPartnerWage'), partnerMonths: laborValue('parentalPartnerMonths'), sharedEligible: checked('parentalSharedEligible'), singleEligible: checked('parentalSingleEligible'), extendedEligible: checked('parentalExtendedEligible') });
            const labels = { general: '일반', shared: '부모 함께(6+6)', single: '한부모' };
            const rows = [row('적용 유형', labels[r.mode]), row('본인 전체 휴직기간', `${r.months}개월`), row('본인 육아휴직 급여 총액', won(r.total), true), row('본인 미사용 기간 예상액', won(r.remainingTotal))];
            if (r.mode === 'shared') rows.push(row('특례 적용 공통 사용기간', `${r.commonMonths}개월`), row('배우자 전체 급여', won(r.partnerTotal)), row('부부 합산 육아휴직 급여', won(r.householdTotal), true));
            r.rows.forEach(item => rows.push(row(`본인 ${item.month}개월째 · ${item.special} · ${item.rate * 100}% (상한 ${item.cap / 10000}만원)${item.month <= r.usedMonths ? ' · 사용분' : ''}`, won(item.amount))));
            r.partnerRows.forEach(item => rows.push(row(`배우자 ${item.month}개월째 · ${item.special}`, won(item.amount))));
            return { badge: 'PARENTAL LEAVE BENEFIT REPORT', title: '육아휴직 급여 금액 계산 결과', rows,
                notice: '※ 현행 규정이 적용되는 온전한 개월 단위 예상액입니다. 월 순서는 각자의 누적 휴직 개월이며 같은 달의 가계 입금표가 아닙니다. 분할휴직도 누적 개월을 적용합니다. 특례 차액의 실제 입금시점, 월 중 일부 기간의 일할 계산, 회사 지급금·취업에 따른 감액과 과거 규정은 제외합니다.',
                formula: '<p>일반: 1~3개월 통상임금 100%·상한 250만원, 4~6개월 100%·200만원, 이후 80%·160만원. 월 하한 70만원. 부모 함께 유형은 공통 사용기간(최대 6개월)의 상한을 250·250·300·350·400·450만원으로 적용합니다.</p>' };
        });
    }
    function earnedIncomeCredit(event) {
        laborAction(event, () => {
            const r = LivingFinanceMath.calculateEarnedIncomeCredit({ application: value('creditApplication'), ownPay: laborValue('creditOwnPay'), partnerPay: laborValue('creditPartnerPay'), otherIncome: laborValue('creditOtherIncome'), assets: laborValue('creditAssets'), hasSpouse: checked('creditHasSpouse'), hasDependent: checked('creditHasDependent'), otherEligible: checked('creditEligible') });
            const families = { single: '단독가구', one: '홑벌이가구', dual: '맞벌이가구' };
            return { badge: 'EARNED INCOME CREDIT REPORT', title: '근로장려금 예상금액', rows: [
                row('입력 기준 가구 유형', families[r.family]), row('2025년 부부합산 총급여액 등', won(r.totalPay)), row('소득요건 판정용 총소득', won(r.totalIncome)), row('총소득 기준금액', `${won(r.incomeLimit)} 미만`),
                row('입력 기준 신청요건', r.eligible ? '충족 가정' : r.reasons.join(' / ')), row('공식 산정표 소득 구간', r.tableLower === null ? '해당 구간 없음' : `${won(r.tableLower)} 이상 ~ ${won(r.tableUpper)} 미만`),
                row('감액 전 산정표 금액', won(r.tableAmount)), row('재산요건 50% 감액', won(r.assetReduction)), row('기한 후 신청 5% 감액', won(r.lateReduction)), row('최소 지급액 조정', won(r.minimumAdjustment)), row('예상 근로장려금', won(r.decision), true) ],
                notice: '※ 2025년 귀속·2026년 정기 또는 기한 후 신청 기준입니다. 공식 산정표에 재산 감액·기한 후 감액·최소 지급액을 순서대로 적용합니다. 체납 충당·기지급액 정산·자녀장려금·반기 선지급은 포함하지 않습니다. 실제 결정은 국세청 심사에 따릅니다.',
                formula: '<p>공식 별표 11의 총급여액 등 구간별 금액 → 재산 1억 7천만원 이상이면 50% 감액 → 기한 후 신청이면 5% 감액 → 1만 5천원 미만 지급 제외 및 점증·점감 구간 최소 지급액 적용.</p>' };
        });
    }

    document.addEventListener('DOMContentLoaded', () => {
        loadReportDependencies();
        const handlers = { 'weekly-holiday-pay': ['weeklyHolidayPayForm', weeklyHolidayPay], 'unemployment-benefit': ['unemploymentBenefitForm', unemploymentBenefit], 'annual-leave': ['annualLeaveForm', annualLeave], 'parental-leave-benefit': ['parentalLeaveBenefitForm', parentalLeaveBenefit], 'earned-income-credit': ['earnedIncomeCreditForm', earnedIncomeCredit], 'rent-conversion': ['rentConversionForm', rentConversion], 'subscription-score': ['subscriptionScoreForm', subscription], 'brokerage-fee': ['brokerageFeeForm', brokerage], 'severance-pay': ['severancePayForm', severance], 'net-salary': ['netSalaryForm', salary], 'rent-tax-credit': ['rentTaxCreditForm', rentTaxCredit] };
        const setup = handlers[document.body.dataset.calculator];
        if (setup) document.getElementById(setup[0])?.addEventListener('submit', setup[1]);
        document.getElementById('rentConversionMode')?.addEventListener('change', updateRentConversionFields);
        document.getElementById('brokerageTransactionType')?.addEventListener('change', updateBrokerageFields);
        ['weeklyHoursMode', 'leaveMode', 'leaveWageMode', 'parentalMode', 'parentalMonths', 'parentalPartnerMonths', 'creditHasSpouse'].forEach(id => document.getElementById(id)?.addEventListener('change', updateLaborFields));
        updateLaborFields();
        const newKeys = ['weekly-holiday-pay', 'unemployment-benefit', 'annual-leave', 'parental-leave-benefit', 'earned-income-credit'];
        if (newKeys.includes(document.body.dataset.calculator)) {
            document.getElementById(setup[0])?.addEventListener('input', () => {
                const box = document.getElementById('resultBox');
                if (box) box.style.display = 'none';
                updateLaborFields();
            });
        }
        updateRentConversionFields();
        updateBrokerageFields();
        ['subscriptionMode', 'severanceMode', 'salaryInputMode', 'salaryIncomeTaxMode'].forEach(id => document.getElementById(id)?.addEventListener('change', updateFinanceFields));
        updateFinanceFields();
        if (['subscription-score', 'severance-pay', 'net-salary', 'brokerage-fee'].includes(document.body.dataset.calculator)) {
            const hideOldResult = () => {
                const box = document.getElementById('resultBox');
                if (box) box.style.display = 'none';
            };
            document.getElementById(setup[0])?.addEventListener('input', hideOldResult);
            document.getElementById(setup[0])?.addEventListener('change', hideOldResult);
        }
        if (typeof bindMoneyInputs === 'function') bindMoneyInputs();
        renderIcons();
    });
}(window));
