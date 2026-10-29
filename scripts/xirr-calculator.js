(function () {
    'use strict';
    const byId = id => document.getElementById(id);
    let sequence = 0;
    const examples = {
        simple: [{ date: '2025-01-01', amount: -1000000 }, { date: '2026-01-01', amount: 1100000 }],
        microsoft: [{ date: '2008-01-01', amount: -10000 }, { date: '2008-03-01', amount: 2750 }, { date: '2008-10-30', amount: 4250 }, { date: '2009-02-15', amount: 3250 }, { date: '2009-04-01', amount: 2750 }]
    };

    function invalidate() {
        if (byId('resultBox')) byId('resultBox').style.display = 'none';
        byId('xirrError').textContent = '';
        byId('xirrError').hidden = true;
    }

    function fail(error) {
        invalidate();
        byId('xirrError').hidden = false;
        byId('xirrError').textContent = error.message;
        byId('xirrError').focus();
    }

    function addRow(flow = { date: '', amount: '' }) {
        if (byId('xirrFlows').children.length >= XirrMath.MAX_ROWS) throw new RangeError('현금흐름은 최대 200행까지 입력할 수 있습니다.');
        const id = ++sequence;
        const row = document.createElement('fieldset');
        row.className = 'average-lot-row';
        row.dataset.xirrRow = String(id);
        // Only generated IDs go into markup; pasted data is assigned through .value.
        row.innerHTML = `<legend>현금흐름 ${id}</legend>
            <div class="form-group"><label for="xirrDate${id}">날짜</label><input id="xirrDate${id}" data-field="date" type="date" min="1900-01-01" max="2199-12-31" required></div>
            <div class="form-group"><label for="xirrType${id}">방향</label><select id="xirrType${id}" data-field="type"><option value="investment">투자 · 납입 (−)</option><option value="recovery">회수 · 인출 (+)</option></select></div>
            <div class="form-group"><label for="xirrAmount${id}">금액 (절댓값)</label><input id="xirrAmount${id}" data-field="amount" class="decimal-number-input" inputmode="decimal" type="text" placeholder="예: 1,000,000" required></div>
            <button type="button" class="btn-remove average-lot-remove" aria-label="현금흐름 ${id} 삭제">삭제</button>`;
        row.querySelector('[data-field="date"]').value = flow.date;
        row.querySelector('[data-field="type"]').value = flow.amount === '' || flow.amount < 0 ? 'investment' : 'recovery';
        row.querySelector('[data-field="amount"]').value = flow.amount === '' ? '' : Math.abs(flow.amount).toLocaleString('en-US', { maximumFractionDigits: 2 });
        row.querySelector('button').addEventListener('click', () => {
            if (byId('xirrFlows').children.length === 1) { fail(new Error('입력할 현금흐름을 한 행 이상 남겨 주세요.')); return; }
            const next = row.nextElementSibling || row.previousElementSibling;
            row.remove(); invalidate(); next.querySelector('input').focus();
        });
        byId('xirrFlows').appendChild(row);
        return row;
    }

    function setRows(flows) {
        byId('xirrFlows').replaceChildren(); sequence = 0;
        flows.forEach(addRow);
        byId('xirrTerminalConfirmed').checked = false;
        byId('xirrPasteStatus').textContent = '';
        invalidate();
    }

    function readAmount(value, label) {
        const raw = value.trim();
        if (!/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?$/.test(raw)) throw new RangeError(`${label}은 0 이상의 금액을 소수 둘째 자리까지 입력하세요.`);
        return Number(raw.replace(/,/g, ''));
    }

    function terminalState() {
        const enabled = byId('xirrUseTerminal').checked;
        byId('xirrTerminalFields').hidden = !enabled;
        ['xirrTerminalDate', 'xirrTerminalAmount', 'xirrTerminalConfirmed'].forEach(id => { byId(id).disabled = !enabled; byId(id).required = enabled; });
    }

    function render(result) {
        const unit = byId('xirrCurrency').value === 'USD' ? '달러' : '원';
        const money = number => number === null ? '수치 범위 초과' : `${(Math.abs(number) < 0.005 ? 0 : number).toLocaleString('ko-KR', { maximumFractionDigits: 2 })} ${unit}`;
        const percent = number => `${(Math.abs(number) < 0.0000005 ? 0 : number * 100).toLocaleString('ko-KR', { maximumFractionDigits: 4 })}%`;
        const messages = {
            unique: '날짜별 합산 현금흐름의 부호가 한 번 바뀌며, 지원 범위에서 유일한 XIRR을 찾았습니다.',
            'non-conventional': '현금흐름 부호가 여러 번 바뀌어 해가 없거나 여러 개일 수 있습니다. 발견된 후보가 하나여도 유일한 수익률로 확정하지 않습니다. 후보 탐색은 모든 해를 보장하지 않으며 접점 해나 매우 가까운 해를 놓칠 수 있습니다.',
            'no-root': '날짜별 합산 후 양수와 음수가 함께 남지 않아 유한한 XIRR을 계산할 수 없습니다. 회수금이나 잔여 평가금액의 누락을 확인하세요.',
            indeterminate: '날짜별 입출금이 모두 상쇄되어 어떤 할인율에서도 XNPV가 0입니다. 하나의 XIRR로 정할 수 없습니다.',
            'same-day': '모든 현금흐름이 같은 날에 있어 연환산 수익률을 정할 수 없습니다.',
            'outside-range': '지원하는 연수익률 범위 안에서 해를 찾지 못했습니다. 0%로 대체하지 않습니다.'
        };
        const rows = [
            ['연환산 투자수익률 · XIRR', result.rate === null ? '단일 수익률 확정 불가' : percent(result.rate), 'total-row'],
            ['계산 기간', `${result.firstDate} ~ ${result.lastDate} · ${result.days.toLocaleString()}일`],
            ['총 투자금 · 납입 합계', money(result.invested)],
            ['실제 회수금 · 인출 합계', money(result.recovered)],
            ['잔여 보유자산 평가금액', money(result.terminalValue)],
            ['평가금액 포함 총 손익', money(result.profit), 'highlight-row'],
            ['단순 누적 수익률 · 투자 시점 미반영', percent(result.simpleReturn)],
            [`목표 연수익률 ${percent(result.targetRate)} 기준 XNPV`, money(result.targetNpv)]
        ];
        if (result.rate !== null) rows.push(['계산된 XIRR로 검산한 XNPV', money(result.residual)]);
        if (result.status === 'non-conventional') rows.push(['탐색에서 발견한 참고 후보', result.candidates.length ? result.candidates.map(percent).join(' / ') : '발견하지 못함']);
        updateReportHeaders('XIRR REPORT', '현금흐름 기반 투자수익률');
        byId('captureArea').dataset.pdfCompression = 'FAST';
        byId('resultBox').querySelector('thead').innerHTML = '<tr><th>투자 성과 항목</th><th class="text-right">계산 결과</th></tr>';
        byId('resultBox').querySelector('.report-formula-title').textContent = '투자수익률 계산 기준';
        byId('resultTableBody').innerHTML = rows.map(([label, value, cls = '']) => `<tr class="${cls}"><td>${label}</td><td class="text-right">${value}</td></tr>`).join('');
        byId('resultNotice').textContent = `${messages[result.status]} 잔여 평가금액은 평가일의 가상 회수금입니다. 모든 금액은 ${unit} 기준이며 환율·세금·수수료는 자동 적용하지 않습니다. ${result.days < 365 ? '1년 미만 성과를 연환산한 값은 크게 보일 수 있으며 같은 수익의 지속을 뜻하지 않습니다.' : ''}`;
        byId('formulaContent').innerHTML = `<p>XNPV = Σ [현금흐름 ÷ (1 + 연수익률)<sup>첫 날짜부터 실제 경과일수 ÷ 365</sup>]. 이 값이 0이 되는 연수익률이 XIRR입니다.</p><p>목표 수익률의 XNPV는 첫 현금흐름 날짜 기준의 현재가치입니다. 투자금이 먼저 나가고 회수금이 뒤에 들어오는 일반적인 흐름에서 양수는 목표 수익률보다 유리한 현금흐름을 뜻합니다. 재투자가 반복되는 경우에는 이 해석을 그대로 적용하지 마세요.</p><p>연율 탐색 범위: −99.9999%~100,000,000%. 같은 날짜는 합산하고 실제 일수와 고정 365일 분모를 사용합니다.</p><p>입력 현금흐름 ${result.entries.length}건을 날짜별로 정렬해 반영했습니다.</p>`;
        let audit = byId('xirrAudit');
        if (!audit) {
            audit = document.createElement('details');
            audit.id = 'xirrAudit';
            audit.className = 'helper-box';
            byId('captureArea').after(audit);
        }
        audit.innerHTML = `<summary>계산에 반영한 현금흐름 ${result.entries.length}건 확인</summary><div class="report-table-scroll" data-full-report-table><table class="report-table"><thead><tr><th>날짜·구분</th><th>금액</th></tr></thead><tbody>${result.entries.map(row => `<tr><td>${row.date} · ${row.terminal ? '잔여 평가금액' : row.cents < 0 ? '투자' : '회수'}</td><td>${money(row.cents / 100)}</td></tr>`).join('')}</tbody></table></div>`;
        showResult();
    }

    document.addEventListener('DOMContentLoaded', () => {
        const form = byId('xirrForm');
        if (!form) return;
        setRows(examples.simple);
        terminalState();
        form.addEventListener('input', invalidate);
        form.addEventListener('change', invalidate);
        form.addEventListener('invalid', () => {
            invalidate();
            byId('xirrError').hidden = false;
            byId('xirrError').textContent = '날짜·금액과 평가금액 확인 항목을 모두 입력하세요.';
        }, true);
        byId('xirrUseTerminal').addEventListener('change', terminalState);
        byId('xirrAddRow').addEventListener('click', () => { try { invalidate(); addRow().querySelector('input').focus(); } catch (error) { fail(error); } });
        byId('xirrClear').addEventListener('click', () => { setRows([{ date: '', amount: '' }]); byId('xirrUseTerminal').checked = false; byId('xirrTerminalConfirmed').checked = false; terminalState(); byId('xirrPaste').value = ''; });
        byId('xirrExample').addEventListener('click', () => { setRows(examples.microsoft); byId('xirrCurrency').value = 'USD'; byId('xirrTargetRate').value = '9'; byId('xirrUseTerminal').checked = false; byId('xirrTerminalConfirmed').checked = false; terminalState(); });
        byId('xirrApplyPaste').addEventListener('click', () => {
            try { const rows = XirrMath.parseText(byId('xirrPaste').value); setRows(rows); byId('xirrPasteStatus').textContent = `${rows.length}행을 표에 반영했습니다. 잔여 평가금액을 별도로 사용할 경우 중복 여부를 확인하세요.`; byId('xirrFlows').querySelector('input').focus(); }
            catch (error) { fail(error); }
        });
        form.addEventListener('submit', event => {
            event.preventDefault(); invalidate();
            try {
                const flows = Array.from(byId('xirrFlows').children, row => {
                    const date = row.querySelector('[data-field="date"]').value;
                    const value = readAmount(row.querySelector('[data-field="amount"]').value, '입출금 금액');
                    return { date, amount: row.querySelector('[data-field="type"]').value === 'investment' ? -value : value };
                });
                const terminal = byId('xirrUseTerminal').checked ? { date: byId('xirrTerminalDate').value, amount: readAmount(byId('xirrTerminalAmount').value, '잔여 평가금액') } : null;
                if (terminal && !byId('xirrTerminalConfirmed').checked) throw new RangeError('잔여 평가금액을 회수 내역에 중복 입력하지 않았는지 확인해 주세요.');
                if (byId('xirrTargetRate').value.trim() === '') throw new RangeError('비교할 목표 연수익률을 입력하세요. 비교하지 않으려면 0%를 입력하세요.');
                render(XirrMath.calculate({ flows, terminal, targetRate: Number(byId('xirrTargetRate').value) / 100 }));
            } catch (error) { fail(error); }
        });
    });
})();
