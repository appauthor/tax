(function () {
    'use strict';
    const groupNames = ['일반 부양가족', '본인·한도 없는 대상', '미숙아·선천성이상아', '난임시술비'];
    const groupKeys = ['general', 'unlimited', 'premature', 'fertility'];
    const won = n => n === null || n === undefined ? '확인 전 · 확정하지 않음' : `${n.toLocaleString('ko-KR', { maximumFractionDigits: 2 })} 원`;
    const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    function medical(input) {
        input.groups = groupKeys.map(key => ({ paid: input[key + 'Paid'], refunded: input[key + 'Refunded'] }));
        input.groups.forEach((g, i) => {
            if (g.refunded > g.paid) throw new RangeError(`${groupNames[i]}: 보험금·환급금이 해당 지출액보다 큽니다. 같은 구분·연도의 금액을 확인하세요.`);
        });
        const r = YearEndTaxMath.calculateMedical(input);
        const rows = [['입력 기준 의료비 세액공제 · 국세', r.status === 'ineligible' ? '대상 아닌 금액 제외 후 재계산' : won(r.statutoryCredit), 'total-row']];
        if (input.useTaxLimit) rows.push(['남은 소득세 한도 반영 가능액', won(r.usableCredit), 'highlight-row']);
        rows.push(['총급여', won(r.salary)], ['총급여 3% 차감 기준', won(r.threshold)], ['의료비 지출 합계', won(r.totalPaid)], ['실손보험금·환급금 합계', won(r.totalRefunded)], ['본인 부담 의료비 합계', won(r.totalNet)]);
        r.groups.forEach((g, i) => {
            if (g.paid === 0 && g.refunded === 0) return;
            rows.push([`${groupNames[i]} · 환급금 차감 후`, won(g.net)], [`${groupNames[i]} · 3% 기준 차감분`, won(g.thresholdUsed)], [`${groupNames[i]} · 한도 반영 공제대상액`, won(g.base)]);
        });
        if (r.status !== 'eligible') rows.push(['요건 충족을 가정한 국세 계산액', won(r.calculatedCredit)]);
        const explanation = r.totalNet === 0 ? '보험금·환급금 차감 후 실제 부담액이 없어 계산액이 0원입니다.' : r.calculatedCredit === 0 ? '실제 부담 의료비가 총급여의 3% 이하라 계산액이 0원입니다.' : '';
        const zeroNote = explanation ? `<p>${explanation}</p>` : '';
        return { ...r, title: '의료비 세액공제 계산 결과', rows, formula: zeroNote + '<p>실제 부담액 = 공제 대상 지출 − 실손보험금·본인부담상한제 환급금 등 보전액. 총급여의 3%는 일반 부양가족 → 본인 등 한도 없는 대상 → 미숙아·선천성이상아 → 난임시술비 순서로 차감합니다.</p><p>일반 부양가족은 차감 후 700만원 한도, 나머지는 해당 구분의 한도를 따릅니다. 세액공제율은 앞의 두 구분 15%, 미숙아·선천성이상아 20%, 난임시술비 30%입니다. 실제 환급액은 기납부세액·다른 공제·표준세액공제 선택에 따라 달라집니다.</p>', notice: '2026년 귀속 · 2027년 초 연말정산. 원 단위 표시와 국세청 신고서 절사에 차이가 있을 수 있습니다. 공제 계산액은 현금 환급액이 아닙니다. 총급여 3%와 한도 계산 결과를 보여주며, 요건 미확인 상태에서는 확정 공제액을 제시하지 않습니다.' };
    }
    function mortgage(input) {
        const r = YearEndTaxMath.calculateMortgageDeduction(input);
        return { ...r, title: '주담대 이자 소득공제 확인 결과', rows: [
            ['입력 기준 주담대 이자 소득공제액', won(r.deduction), 'total-row'], ['취득 당시 주택 기준시가', won(r.value)], ['취득연도에 따른 기준시가 한도', won(r.valueLimit)], ['신규 차입 기한 · 등기일부터 3개월', r.dateLimit || '날짜 확인 필요'], ['약정 상환기간', `${r.term}년`], ['상환 조건별 주택자금 합산 한도', won(r.cap)], ['다른 주택자금 공제액', won(r.otherDeductions)], ['한도에서 남은 금액', won(r.available)], ['올해 실제 이자상환액', won(r.interest)], ...(r.status === 'eligible' ? [] : [['요건 충족을 가정한 계산액', won(r.calculatedDeduction)]])
        ], formula: '<p>주담대 공제 여지 = 상환 조건별 합산 한도 − 이미 적용하는 청약저축·전세대출 소득공제액. 이자 공제액은 실제 이자와 남은 한도 중 작은 금액입니다. 다른 주택자금 칸에는 납입액이 아닌 해당 제도의 요건·자체 한도를 적용한 공제액을 넣습니다.</p><p>결과가 공제 가능이면 <a href="year-end-tax-calculator.html">연말정산 환급액 계산기</a>의 특별소득공제액에 다른 공제와 중복 없이 반영하세요. 최종 소득공제는 공제받는 사람의 소득금액 범위에서 적용되며, 이 금액 자체가 환급액은 아닙니다.</p>', notice: '2026년 귀속 · 2027년 초 연말정산. 2015년 이후 취득·신규 차입의 일반적인 금융기관 대출을 지원합니다. 과거 경과규정, 대환·승계·공동채무·분양권 등은 별도 확인합니다. 미래 개정안은 반영하지 않습니다.' };
    }
    function health(input) {
        const r = HealthDependentMath.calculate(input);
        return { ...r, title: '부모님 건강보험 피부양자 확인 결과', rows: [
            ['부모님 소득 합계', won(r.total), 'highlight-row'], ['부모님 재산세 과세표준 합계', won(r.property)], ['재산 구간을 함께 고려한 소득 상한', won(r.incomeLimit)], r.incomeLimit !== null && r.total > r.incomeLimit ? ['소득 상한 초과액', won(r.total - r.incomeLimit)] : ['소득 상한까지 남은 금액', won(r.incomeRoom)], ['공적연금소득 · 공제 전 연간 금액', won(r.incomes.pension)], ['공단 반영 이자·배당소득', won(r.incomes.financial)], ['근로소득 · 근로소득공제 전', won(r.incomes.salary)], ['사업소득금액', won(r.incomes.business)], ['그 밖의 반영 소득금액', won(r.incomes.other)], ['기혼인 부모님의 배우자 소득 합계', input.married === 'no' ? '배우자 없음' : won(r.spouseIncome)]
        ], formula: '<p>소득 상한까지 남은 금액은 소득 합계만 비교한 값이며 피부양자 자격을 보장하는 여유액이 아닙니다. 부모님 본인의 소득요건·사업소득 예외·재산요건을 확인하고, 기혼이면 배우자의 소득·사업소득 요건도 별도로 확인합니다. 부부 소득을 합쳐 하나의 2,000만원 한도와 비교하는 방식이 아닙니다. 배우자의 재산을 부모님의 과표에 무조건 더하지 않습니다.</p><p>공적연금·근로소득은 피부양자 판정에서 공제 전 금액을 사용합니다. 소득세 인적공제의 연금소득공제나 지역보험료의 소득평가율을 적용하지 않습니다. 이자·배당은 공단 자료에 반영되는 금액을 확인하고, 적은 금융소득을 임의로 0원 처리하지 마세요.</p><p>입력 기준 요건을 충족해도 공단의 자료 반영 연도·갱신 시점·자격 확인에 따라 실제 결정이 달라질 수 있습니다. 이 도구는 상실일·취득일이나 탈락 후 보험료를 확정하지 않습니다.</p>', notice: '2026-11-13 현행 기준. 부모님 한 분과 필요한 경우 그 배우자의 요건 확인용입니다. 국민건강보험공단의 자격 결정을 대신하지 않습니다. 재산 입력은 시가·공시가격이 아닌 재산세 과세표준입니다. 입력은 서버로 전송하거나 저장하지 않습니다.' };
    }
    document.addEventListener('DOMContentLoaded', () => {
        const form = document.querySelector('form[data-deduction-tool]');
        if (!form) return;
        const type = form.dataset.deductionTool;
        const error = document.getElementById(type + 'Error');
        const clear = () => {
            const box = document.getElementById('resultBox');
            if (box) box.style.display = 'none';
            error.textContent = ''; error.hidden = true;
        };
        function toggle(group, visible) {
            group.hidden = !visible; group.classList.toggle('is-hidden', !visible);
            group.querySelectorAll('input, select').forEach(el => { el.disabled = !visible; });
        }
        function update() {
            form.querySelectorAll('[data-spouse]').forEach(group => toggle(group, form.elements.married?.value === 'yes'));
            form.querySelectorAll('[data-tax-limit]').forEach(group => toggle(group, form.elements.useTaxLimit?.checked === true));
        }
        form.addEventListener('input', clear);
        form.addEventListener('invalid', clear, true);
        form.addEventListener('change', event => { clear(); if (['married', 'useTaxLimit'].includes(event.target.name)) update(); });
        form.addEventListener('submit', event => {
            event.preventDefault(); clear();
            try {
                const input = {};
                for (const el of form.elements) {
                    if (!el.name || el.disabled) continue;
                    if (el.type === 'checkbox') input[el.name] = el.checked;
                    else if (el.dataset.money !== undefined) {
                        const raw = el.value.replace(/,/g, '').trim();
                        if (!/^\d+$/.test(raw)) throw new RangeError(`${el.labels[0]?.textContent || '금액'}: 빈칸 없이 0 이상의 원 단위 숫자로 입력하세요.`);
                        input[el.name] = Number(raw);
                    } else input[el.name] = el.value;
                }
                const r = ({ medical, mortgage, health })[type](input);
                const statuses = { eligible: '입력 기준 요건 충족', ineligible: '입력 기준 요건 미충족', review: '추가 확인 필요' };
                updateReportHeaders('TAXYOU REPORT', r.title);
                const rows = [['확인 결과', statuses[r.status], 'highlight-row'], ...r.rows];
                const firstReason = r.failures[0] || r.pending[0];
                if (firstReason) rows.splice(1, 0, ['우선 확인할 사항', firstReason]);
                document.querySelector('#resultBox thead th').textContent = '확인·계산 항목';
                document.querySelector('#resultBox .report-formula-title').textContent = '판정 근거와 다음 단계';
                document.getElementById('resultTableBody').innerHTML = rows.map(([label, value, cls = '']) => `<tr class="${cls}"><td>${escape(label)}</td><td class="text-right">${escape(value)}</td></tr>`).join('');
                const reasons = [...r.failures, ...r.pending];
                document.getElementById('formulaContent').innerHTML = (reasons.length ? `<ul>${reasons.map(reason => `<li>${escape(reason)}</li>`).join('')}</ul>` : '<p>선택한 요건과 입력 금액 기준으로 확인 항목을 충족했습니다. 실제 제출 전 증빙을 대조하세요.</p>') + r.formula;
                document.getElementById('resultNotice').textContent = r.notice;
                showResult();
            } catch (e) {
                error.textContent = e.message; error.hidden = false; error.focus();
            }
        });
        update();
    });
})();
