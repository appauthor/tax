(function () {
    'use strict';
    document.addEventListener('DOMContentLoaded', () => {
        const $ = id => document.getElementById(id);
        const form = $('parentDeductionForm');
        if (!form) return;
        const won = value => value === null ? '미확인' : `${value.toLocaleString('ko-KR', { maximumFractionDigits: 2 })} 원`;
        const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
        function toggle(id, visible) {
            const group = $(id);
            group.hidden = !visible;
            group.classList.toggle('is-hidden', !visible);
            group.querySelectorAll('input, select').forEach(el => { el.disabled = !visible; });
        }
        function clear() {
            if ($('resultBox')) $('resultBox').style.display = 'none';
            $('parentError').textContent = '';
            $('parentError').hidden = true;
        }
        function update() {
            const mode = $('parentPensionMode').value;
            toggle('parentPensionGroup', ['taxable', 'net'].includes(mode));
            $('parentPensionAmountLabel').textContent = mode === 'net' ? '영수증의 연금소득금액 · 연간' : '국민연금 과세대상 연금액 · 연간';
            $('parentPensionHelp').textContent = mode === 'net' ? '연금소득공제가 이미 반영된 금액입니다. 공제를 다시 빼지 않습니다.' : '공단의 과세대상 연금액(총연금액·과세기준금액)을 입력하세요. 월 입금액 × 12가 아닙니다.';
            toggle('parentSalaryGroup', ['salary', 'mixed'].includes($('parentIncomeMode').value));
            ['parentOtherGroup', 'parentRetirementGroup', 'parentCapitalGroup', 'parentMixedHelp'].forEach(id => toggle(id, $('parentIncomeMode').value === 'mixed'));
        }
        function amount(id) {
            const raw = $(id).value.trim().replace(/,/g, '');
            if (!/^\d+$/.test(raw)) throw new RangeError('금액은 빈칸 없이 0 이상의 원 단위 숫자로 입력하세요.');
            return Number(raw);
        }
        form.addEventListener('input', clear);
        form.addEventListener('change', event => {
            clear();
            if (['parentPensionMode', 'parentIncomeMode'].includes(event.target.id)) update();
        });
        form.addEventListener('invalid', clear, true);
        form.addEventListener('submit', event => {
            event.preventDefault(); clear();
            try {
                const input = { birthYear: $('parentBirthYear').value, specialCase: $('parentSpecialCase').checked };
                for (const [key, id] of Object.entries({ pensionMode: 'parentPensionMode', incomeMode: 'parentIncomeMode', support: 'parentSupport', duplicate: 'parentDuplicate', disability: 'parentDisability' })) input[key] = $(id).value;
                for (const [key, id] of Object.entries({ pensionAmount: 'parentPensionAmount', salary: 'parentSalary', other: 'parentOther', retirement: 'parentRetirement', capital: 'parentCapital' })) input[key] = $(id).disabled ? 0 : amount(id);
                const r = YearEndTaxMath.calculateParent(input);
                const states = { eligible: '입력 기준 공제 가능', ineligible: '입력 기준 공제 불가', review: '추가 확인 필요' };
                const rows = [
                    ['판정 결과', states[r.status], 'total-row'], ['적용 기준', '2026년 귀속 · 2027년 초 연말정산'], ['2026년 말 나이', `${r.age}세`],
                    ['연금 입력 방식', $('parentPensionMode').selectedOptions[0].textContent],
                    ...(r.pensionMode === 'taxable' ? [['과세대상 총연금액', won(r.pensionAmount)], ['연금소득공제', won(r.deduction)]] : []),
                    ['판정용 연금소득금액', won(r.pensionIncome)], ['근로소득금액 · 총급여에서 공제 후', won(input.incomeMode === 'unknown' ? null : r.salaryIncome)],
                    ['그 밖의 종합소득금액', won(input.incomeMode === 'unknown' ? null : r.other)], ['퇴직소득금액', won(input.incomeMode === 'unknown' ? null : r.retirement)], ['양도소득금액', won(input.incomeMode === 'unknown' ? null : r.capital)],
                    ['소득금액 합계', won(r.totalIncome)], ['적용 소득 기준', r.salaryOnly ? '근로소득만 있음: 총급여 500만원 이하' : '소득금액 합계 100만원 이하'],
                    ['부모님 기본공제', r.status === 'ineligible' ? '적용 불가' : won(r.basic)], ['경로우대 추가공제', r.status === 'ineligible' ? '적용 불가' : won(r.senior)],
                    ['장애인 추가공제', r.status === 'ineligible' ? '적용 불가' : won(r.disabled)], ['해당 부모님 공제액 합계', r.status === 'ineligible' ? '적용 불가' : won(r.totalDeduction), 'highlight-row']
                ];
                updateReportHeaders('TAXYOU REPORT', '부모님 인적공제 확인 결과');
                document.querySelector('#resultBox thead th').textContent = '확인 항목';
                document.querySelector('#resultBox .report-formula-title').textContent = '판정 근거와 다음 단계';
                $('resultTableBody').innerHTML = rows.map(([label, value, cls = '']) => `<tr class="${cls}"><td>${escape(label)}</td><td class="text-right">${escape(value)}</td></tr>`).join('');
                const reasons = [...r.failures, ...r.pending];
                $('formulaContent').innerHTML = (reasons.length ? `<ul>${reasons.map(reason => `<li>${escape(reason)}</li>`).join('')}</ul>` : '<p>나이·소득·실제 부양·중복 공제 확인 항목이 입력 기준으로 충족되었습니다.</p>') +
                    `<p>연금소득금액 = 과세대상 총연금액 − 연금소득공제. 연금소득금액을 직접 입력했다면 다시 공제하지 않습니다. 근로소득금액은 총급여 − 근로소득공제입니다. 비과세·분리과세 소득은 합산하지 않습니다.</p><p>${r.status === 'eligible' ? `연말정산 환급액 계산기에 이 부모님을 기본공제 인원 1명으로 더하고, 추가 인적공제액에 ${won(r.senior + r.disabled)}을 더해 확인하세요. 본인·배우자·다른 가족의 기존 공제와 중복하지 않습니다.` : '자료를 확인한 뒤 다시 계산하세요. 확인되지 않은 공제액을 환급액 계산기에 옮기지 마세요.'}</p>`;
                $('resultNotice').textContent = '2026-11-12 확인 기준. 부모님 한 분의 소득공제 자격 확인용이며 환급액이 아닙니다. 소득공제 총액은 공제받는 사람의 종합소득금액 한도 내에서 적용됩니다. 원 미만 값도 유지해 비교하며, 경계값은 실제 원천징수영수증의 소득금액과 함께 확인하세요. 입력한 자료는 서버로 전송하지 않습니다.';
                showResult();
            } catch (error) {
                $('parentError').textContent = error.message;
                $('parentError').hidden = false;
                $('parentError').focus();
            }
        });
        update();
    });
})();
