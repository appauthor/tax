(function () {
    'use strict';
    const $ = id => document.getElementById(id);
    const won = value => `${Math.round(value).toLocaleString('ko-KR')} 원`;
    const age = months => `${Math.floor(months / 12)}세 ${months % 12}개월`;
    const escape = value => String(value).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
    function number(id) {
        const raw = $(id).value.trim().replace(/,/g, '');
        if (!/^\d+(\.\d+)?$/.test(raw)) throw new RangeError('빈칸 없이 0 이상의 숫자를 입력하세요. 해당하지 않는 금액은 0으로 입력합니다.');
        return Number(raw);
    }
    function clear() {
        if ($('resultBox')) $('resultBox').style.display = 'none';
        if ($('planningError')) $('planningError').textContent = '';
    }
    function render(title, rows, notice, formula) {
        document.querySelector('#resultBox thead th').textContent = '계산 항목';
        document.querySelector('#resultBox .report-formula-title').textContent = '계산 기준과 상세 비교';
        updateReportHeaders('TAXYOU REPORT', title);
        $('resultTableBody').innerHTML = rows.map(([label, value, cls = '']) => `<tr class="${cls}"><td>${escape(label)}</td><td class="text-right">${escape(value)}</td></tr>`).join('');
        $('resultNotice').textContent = notice;
        $('formulaContent').innerHTML = formula;
        showResult();
    }
    function bind(form, action) {
        form.addEventListener('input', clear);
        form.addEventListener('change', clear);
        form.addEventListener('invalid', clear, true);
        form.addEventListener('submit', event => {
            event.preventDefault(); clear();
            try { action(); } catch (error) {
                $('planningError').textContent = error.message;
                $('planningError').focus();
            }
        });
    }
    function yearEnd() {
        const input = { mode: $('yearMode').value };
        ['gross', 'family', 'extraPersonal', 'publicPension', 'otherDeductions', 'specialDeductions', 'specialCredits', 'otherCredits', 'pensionSavings', 'irp', 'additionalIrp', 'paidIncomeTax', 'paidLocalTax'].forEach(key => { input[key] = number(`year_${key}`); });
        const r = YearEndTaxMath.calculate(input), c = r.current;
        const modes = { standard: '표준세액공제', special: '특별공제·월세 공제' };
        const label = value => value >= 0 ? '예상 환급액' : '예상 추가 납부액';
        render('2026 귀속 연말정산 환급액', [
            ['총급여(비과세 제외)', won(r.gross)], ['근로소득공제', won(r.earnedDeduction)], ['근로소득금액', won(r.earnedIncome)], ['인적공제', won(r.personal)], ['적용 공제 방식', modes[c.mode]], ['소득공제 합계', won(c.deductions)], ['과세표준', won(c.taxBase)], ['산출세액(국세)', won(c.calculatedTax)], ['근로소득세액공제', won(c.workCredit)], ['연금계좌 법정 세액공제', won(c.pensionCredit)], ['선택한 특별·표준세액공제', won(c.selectedCredit)], ['그 밖의 확인된 세액공제', won(r.otherCredits)], ['산출세액 안에서 사용한 공제 합계', won(c.usedCredits)], ['결정세액(국세)', won(c.incomeTax)], ['결정세액(지방소득세 추정)', won(c.localTax)], ['기납부 소득세 / 지방소득세', `${won(r.paidIncomeTax)} / ${won(r.paidLocalTax)}`], [`국세 ${label(c.incomeRefund)}`, won(Math.abs(c.incomeRefund))], [`지방세 ${label(c.localRefund)}`, won(Math.abs(c.localRefund))], [`합계 ${label(c.refund)}`, won(Math.abs(c.refund)), 'total-row'], ['IRP 추가 납입 가정', won(r.additionalIrp)], ['추가 납입 시 세금 감소액(지방세 포함)', won(r.additionalSaving), 'highlight-row'], [`추가 납입 후 ${label(r.after.refund)}`, won(Math.abs(r.after.refund))]
        ], '2026-09-13 확인 기준. 근로소득만 있는 거주자의 추정치입니다. 공제 요건·한도를 확인한 금액을 입력해야 하며 감면, ISA 전환, 외국납부세액과 농어촌특별세는 제외합니다.',
        `<p>환급액 = 기납부세액 − 결정세액. 결정세액이 더 크면 추가 납부로 표시합니다. 지방소득세는 국세 결정세액의 10%로 추정합니다.</p><p>동일 입력에서 특별공제 적용 세액은 ${won(c.specialTotalTax)}, 표준공제 적용 세액은 ${won(c.standardTotalTax)}입니다. 자동 비교는 두 결과 중 작은 세액을 선택합니다. 표준공제에서는 특별소득공제·특별세액공제·월세 공제를 제외합니다.</p><p>추가 IRP는 기존 ${won(r.irp)}에 ${won(r.additionalIrp)}을 더한 경우입니다. 산출세액을 넘는 공제는 환급되지 않습니다. 소수점은 계산 중 유지하고 화면에서 원 단위 반올림하므로 신고서 절사와 차이가 있을 수 있습니다.</p>`);
    }
    function pension() {
        const input = {};
        ['birthYear', 'insuredMonths', 'monthly', 'earlyMonths', 'deferredMonths', 'endAge'].forEach(key => { input[key] = number(`pension_${key}`); });
        input.noIncome = $('pension_noIncome').checked;
        const r = NationalPensionMath.calculate(input);
        const table = `<div class="loan-table-wrap" data-full-report-table tabindex="0" aria-label="나이별 누적 수령액"><table class="content-table"><thead><tr><th>도달 나이</th><th>조기</th><th>정상</th><th>연기</th></tr></thead><tbody>${r.timeline.map(t => `<tr><td>${t.age}세</td><td>${t.early === null ? '요건 미확인' : won(t.early)}</td><td>${won(t.normal)}</td><td>${won(t.deferred)}</td></tr>`).join('')}</tbody></table></div>`;
        render('국민연금 조기·정상·연기 수령 비교', [
            ['정상 지급개시 나이', `${r.normalAge}세`], ['정상 세전 월액(입력값)', won(r.monthly)], ['조기 수령 시작 가정', age(r.earlyStartMonths)], ['조기 월액', r.earlyEligible ? won(r.earlyAmount) : '소득 요건 미확인으로 계산 제외'], ['연기 수령 시작 가정', age(r.deferredStartMonths)], ['연기 세전 월액', won(r.deferredAmount)], [`${r.endAge}세 도달 시 조기 누적액`, r.earlyEligible ? won(r.totals.early) : '계산 제외'], [`${r.endAge}세 도달 시 정상 누적액`, won(r.totals.normal)], [`${r.endAge}세 도달 시 연기 누적액`, won(r.totals.deferred)], ['정상 누적액이 조기 누적액에 도달하는 나이', r.earlyEligible ? age(r.earlyBreakEvenMonths) : '계산 제외', 'highlight-row'], ['연기 누적액이 정상 누적액에 도달하는 나이', age(r.deferredBreakEvenMonths), 'highlight-row']
        ], '공단에서 확인한 정상 세전 예상월액(부양가족연금 제외)을 기준으로 한 전액 수령시기 비교입니다. 물가·할인율·세금·소득활동 감액·추가 가입은 반영하지 않습니다. 실제 지급일이나 수급자격 판정이 아닙니다.',
        `<p>조기 월액 = 정상 월액 × (1 − 0.5% × ${r.earlyMonths}개월), 연기 월액 = 정상 월액 × (1 + 0.6% × ${r.deferredMonths}개월). 월액은 같은 현재가치 기준으로 고정합니다.</p><p>수령 시작 나이부터 비교 나이까지 경과한 온전한 개월 수를 곱합니다. 예를 들어 65세 시작은 65세 도달 시 0회, 66세 도달 시 12회입니다. 역전 시점은 누적액이 같아지거나 처음 넘어서는 월로 올림합니다. 실제 생일·청구일·지급월은 계산하지 않습니다.</p>${table}`);
    }
    function savings() {
        const data = window.SavingsRankData;
        if (!data || !Array.isArray(data.products) || SavingsRankMath.freshness(data.collectedAt) === 'invalid') throw new RangeError('금리 자료를 불러오지 못했습니다. 잠시 후 다시 시도하거나 공식 공시를 확인하세요.');
        const options = { kind: $('savingsKind').value, months: number('savingsMonths'), amount: number('savingsAmount'), sector: $('savingsSector').value, rateMode: $('savingsRateMode').value, query: $('savingsQuery').value };
        if (options.rateMode === 'maximum' && !$('savingsConfirmMaximum').checked) throw new RangeError('최고금리는 모든 우대조건을 충족한다고 가정합니다. 확인란을 선택하세요.');
        const rows = SavingsRankMath.rank(data.products, options);
        if (!rows.length) throw new RangeError('선택한 조건에 맞는 공시 상품이 없습니다. 기간·금융권·검색어·금액을 바꿔 보세요.');
        const shown = rows.slice(0, 50);
        const table = `<div class="loan-table-wrap" data-full-report-table tabindex="0" aria-label="예금 적금 금리 순위"><table class="content-table"><thead><tr><th>순위</th><th>금융회사·상품</th><th>적용 연금리</th><th>세후 이자</th><th>만기 수령액</th></tr></thead><tbody>${shown.map(p => `<tr><td>${p.rank}</td><td><a href="${escape(p.sourceUrl)}" target="_blank" rel="noopener noreferrer">${escape(p.company)} · ${escape(p.name)}</a><br><small>${p.method === 'simple' ? '단리' : '월복리'} · 공시 ${escape(p.disclosureMonth)} · ${p.maxLimit ? `공시 한도 ${won(p.maxLimit)}` : '납입한도·가입조건 별도 확인'}</small></td><td>${p.appliedRate.toFixed(2)}%</td><td>${won(p.netInterest)}</td><td>${won(p.maturityAmount)}</td></tr>`).join('')}</tbody></table></div>`;
        const stale = SavingsRankMath.freshness(data.collectedAt) === 'stale';
        render('예금·적금 세후 이자 순위', [
            ['비교 종류', options.kind === 'deposit' ? '정기예금' : '정액적립식 적금'], ['가입기간', `${options.months}개월`], [options.kind === 'deposit' ? '예치금' : '월 납입액', won(options.amount)], ['납입 원금 합계', won(rows[0].principal)], ['금리 기준', options.rateMode === 'base' ? '기본금리' : '모든 우대조건 충족 가정'], ['비교 대상', `${rows.length}개 공시 옵션 / 상위 ${shown.length}개 표시`], ['수집 시각', new Date(data.collectedAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }) + ' KST'], ['자료 상태', stale ? '수집 후 7일 경과 — 과거 자료 비교' : '저장된 공시 자료 기준']
        ], '금융감독원 공개 목록 중 은행·저축은행, 가입대상 제한 없음, 6·12·24개월 자료입니다. 상품별 가입 경로·우대조건·최소납입액 등은 공식 공시에서 확인하세요. 동일 상품의 이자 방식별 옵션은 별도 행입니다. 전체 시장 또는 실시간 가입 가능 순위가 아닙니다.',
        `<p>${options.rateMode === 'maximum' ? '최고금리는 조건 충족을 자동 판정하지 않은 가정값입니다.' : '기본금리로 계산합니다.'} 일반과세 15.4%, 만기까지 유지, 적금은 매월 초 동일 금액 납입을 가정합니다. 공시된 금액 한도를 넘는 예금 옵션은 제외하며, 확인되지 않은 한도는 임의 적용하지 않습니다. 실제 날짜·원 단위 세금 처리에 따라 은행 지급액과 달라질 수 있습니다.</p>${stale ? '<p>자료가 오래되었습니다. 현재 가입 판단 전에 최신 공식 금리를 확인하세요.</p>' : ''}${table}`);
    }
    document.addEventListener('DOMContentLoaded', () => {
        if ($('yearEndForm')) bind($('yearEndForm'), yearEnd);
        if ($('nationalPensionForm')) bind($('nationalPensionForm'), pension);
        if ($('savingsRankForm')) {
            bind($('savingsRankForm'), savings);
            function update() {
                const installment = $('savingsKind').value === 'installment';
                $('savingsAmountLabel').textContent = installment ? '월 납입액' : '예치금';
                const maximum = $('savingsRateMode').value === 'maximum';
                $('savingsMaximumGroup').hidden = !maximum;
                $('savingsMaximumGroup').classList.toggle('is-hidden', !maximum);
                $('savingsConfirmMaximum').disabled = !maximum;
                if (!maximum) $('savingsConfirmMaximum').checked = false;
            }
            $('savingsKind').addEventListener('change', () => { $('savingsAmount').value = $('savingsKind').value === 'installment' ? '300,000' : '10,000,000'; update(); });
            $('savingsRateMode').addEventListener('change', update);
            update();
            const data = window.SavingsRankData;
            $('savingsDataStatus').textContent = data ? `금융감독원 공시 ${data.products.length.toLocaleString()}개 옵션 · 수집 ${new Date(data.collectedAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })} KST${SavingsRankMath.freshness(data.collectedAt) === 'stale' ? ' · 7일 이상 지난 자료입니다.' : ''}` : '금리 자료를 불러오지 못했습니다. 공식 공시에서 확인해 주세요.';
        }
    });
})();
