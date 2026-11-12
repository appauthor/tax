(function () {
    'use strict';
    const el = id => document.getElementById(id);
    const money = n => `${Math.round(Math.abs(n) < 0.5 ? 0 : n).toLocaleString('ko-KR')} 원`;
    const decimal = (n, places = 2) => n.toLocaleString('ko-KR', { maximumFractionDigits: places });
    const escape = text => String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
    function read(id) {
        const raw = el(id).value.trim();
        if (!/^-?(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?$/.test(raw)) throw new RangeError(`${el(id).labels?.[0]?.textContent || '입력값'}을(를) 숫자로 입력해 주세요.`);
        return Number(raw.replaceAll(',', ''));
    }
    function row(label, content, style = '') { return `<tr${style ? ` class="${style}"` : ''}><td>${label}</td><td class="text-right">${content}</td></tr>`; }
    function table(label, headings, rows) {
        return `<div class="loan-table-wrap" tabindex="0" aria-label="${label}" data-full-report-table><table class="content-table"><thead><tr>${headings.map(h => `<th scope="col">${h}</th>`).join('')}</tr></thead><tbody>${rows.map(cells => `<tr>${cells.map((cell, i) => `<${i === 0 ? 'th scope="row"' : 'td'}>${cell}</${i === 0 ? 'th' : 'td'}>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    }
    function bind(formId, errorId, calculate) {
        const form = el(formId);
        if (!form) return;
        const error = el(errorId);
        function invalidate() {
            const box = el('resultBox'); if (box) box.style.display = 'none';
            error.hidden = true; error.textContent = '';
        }
        function fail(message) {
            const box = el('resultBox'); if (box) box.style.display = 'none';
            error.hidden = false; error.textContent = message; error.focus();
        }
        form.addEventListener('input', invalidate);
        form.addEventListener('change', invalidate);
        form.addEventListener('invalid', event => {
            event.preventDefault();
            fail(`${event.target.labels?.[0]?.textContent || '입력값'}의 값과 허용 범위를 확인해 주세요.`);
        }, true);
        form.addEventListener('submit', event => {
            event.preventDefault();
            invalidate();
            if (!form.checkValidity()) return;
            try { calculate(); } catch (e) { fail(e.message); }
        });
        return { invalidate, fail };
    }
    function exchangeState() {
        const currency = el('fxCurrency').value;
        el('fxQuoteUnit').value = String(PersonalFinanceMath.exchangeQuoteUnits[currency] || 1);
        el('fxQuoteUnit').disabled = currency !== 'OTHER';
        exchangeLabel();
    }
    function exchangeLabel() {
        const currency = el('fxCurrency').value;
        const unit = el('fxQuoteUnit').value;
        el('fxBaseRate').labels[0].textContent = `계산 기준환율 (원 / ${unit} ${currency === 'OTHER' ? '외화 단위' : currency})`;
        el('fxAmount').labels[0].textContent = el('fxAmountType').value === 'foreign' ? '비교할 외화 금액' : el('fxDirection').value === 'buy' ? '총 원화 예산 (추가 수수료 포함)' : '목표 원화 수령액 (추가 수수료 차감 후)';
    }
    function calculateExchange() {
        const input = { amount: read('fxAmount'), baseRate: read('fxBaseRate'), quoteUnit: read('fxQuoteUnit'),
            direction: el('fxDirection').value, amountType: el('fxAmountType').value,
            conditions: ['A', 'B'].map(suffix => ({ spread: read(`fxSpread${suffix}`), preference: read(`fxPreference${suffix}`), fixedFee: read(`fxFixed${suffix}`) })) };
        const r = PersonalFinanceMath.calculateExchange(input);
        const currency = el('fxCurrency').value === 'OTHER' ? '외화' : el('fxCurrency').value;
        const foreign = n => `${decimal(n, 4)} ${currency}`;
        const comparison = r.winner === null ? '두 조건의 계산 결과가 같습니다.' : `같은 입력 기준에서 조건 ${r.winner === 0 ? 'A' : 'B'}가 ${r.differenceUnit === 'KRW' ? money(r.difference) : foreign(r.difference)} 유리합니다.`;
        updateReportHeaders('CURRENCY EXCHANGE', '환전수수료·환율우대 비교');
        el('resultTableBody').innerHTML = row('환전 방향', input.direction === 'buy' ? '원화로 외화 사기' : '외화를 원화로 팔기') +
            row('환율 출처', escape(el('fxBaseRate').dataset.sourceDescription || '직접 입력')) +
            row('계산 기준환율', `${decimal(input.baseRate, 6)} 원 / ${input.quoteUnit} ${currency}`) +
            row('비교 기준', input.amountType === 'foreign' ? foreign(input.amount) : money(input.amount)) +
            row('유리한 조건', escape(comparison), 'total-row') + r.results.map((x, i) =>
                row(`조건 ${i === 0 ? 'A' : 'B'} 적용 환율`, `${decimal(x.ratePerUnit, 6)} 원 / ${input.quoteUnit} ${currency}`) +
                row(`조건 ${i === 0 ? 'A' : 'B'} 외화 금액`, foreign(x.foreignAmount)) +
                row(`조건 ${i === 0 ? 'A' : 'B'} 원화 ${input.direction === 'buy' ? '결제액' : '수령액'}`, money(x.krw), 'highlight-row') +
                row(`조건 ${i === 0 ? 'A' : 'B'} 우대 후 스프레드 비용`, money(x.spreadCost)) +
                row(`조건 ${i === 0 ? 'A' : 'B'} 추가 수수료 / 총 비용`, `${money(x.fixedFee)} / ${money(x.totalCost)}`) +
                row(`조건 ${i === 0 ? 'A' : 'B'} 우대로 절약한 금액`, money(x.preferenceSaving))).join('');
        el('resultNotice').textContent = (el('fxBaseRate').dataset.referenceRate ? 'Frankfurter 참고환율로 계산한 추정액이며 실제 거래 은행의 고시환율과 다를 수 있습니다. ' : '') + '입력 환율과 조건에 따른 예상액입니다. 원화는 표시 단계에서 반올림하며 실제 은행의 끝수 처리·현찰 권종·수령 및 송금 비용에 따라 달라질 수 있습니다.';
        el('formulaContent').textContent = '기준환율 × 기본 수수료율 × (1 − 우대율)이 우대 후 스프레드입니다. 외화 매수는 기준환율에 더하고, 매도는 뺍니다. 고시 단위로 나눈 뒤 외화 금액을 곱하고 추가 수수료를 반영합니다. 원화 기준이면 같은 식을 역산합니다. 우대율은 환율 전체의 할인율이 아닙니다. 자동 입력은 Frankfurter의 참고환율이며 은행 고시 매매기준율이나 실시간 시장 시세가 아닙니다. 표시된 기준일을 확인하고 실제 거래 은행의 매매기준율로 수정하세요. 다른 금융회사의 기준율·수수료·우대 조건은 직접 확인하세요.';
        showResult();
    }
    function retirementInput() {
        const fields = { currentAge: 'retCurrentAge', retirementAge: 'retAge', endAge: 'retEndAge', pensionAge: 'retPensionAge', assets: 'retAssets', monthlySaving: 'retSaving', monthlyExpense: 'retExpense', monthlyPension: 'retPension', annualReturn: 'retReturn', inflation: 'retInflation', pensionGrowth: 'retPensionGrowth' };
        return Object.fromEntries(Object.entries(fields).map(([key, id]) => [key, read(id)]));
    }
    function shortage(months, age) {
        if (months == null) return '계획 기간 내 생활비 부족 없음';
        const years = Math.floor(months / 12), remaining = months % 12;
        return `은퇴 후 ${years ? `${years}년 ` : ''}${remaining ? `${remaining}개월` : ''}째 (약 ${age + Math.floor(months / 12)}세${remaining ? ` ${remaining}개월` : ''})`;
    }
    function calculateRetirement() {
        const input = retirementInput(), r = PersonalFinanceMath.calculateRetirement(input);
        updateReportHeaders('RETIREMENT CASH FLOW', '은퇴자금·인출 가능 기간');
        el('resultTableBody').innerHTML = row('계획 기간', `${r.retirementAge}세 은퇴 → ${r.endAge}세까지`) +
            row('은퇴 시점 예상 금융자산', money(r.retirementAssets), 'highlight-row') +
            row('은퇴 시점 필요 금융자산', money(r.requiredFund), 'highlight-row') +
            row(r.gap > 0.5 ? '은퇴 시점 부족자금' : '은퇴 시점 여유자금', money(Math.abs(r.gap)), 'total-row') +
            row('은퇴 첫 달 예상 생활비', money(r.retirementMonthlyExpense)) +
            row('처음 생활비가 부족해지는 시점', shortage(r.firstShortfallMonth, r.retirementAge)) +
            row('계획 종료 시 남는 금융자산', money(r.endBalance)) +
            row('계획 기간 누적 미충당 생활비', money(r.shortfall));
        const scenarios = r.scenarios.map(s => [`${decimal(s.annualReturn)}%`, money(s.retirementAssets), money(s.requiredFund), shortage(s.firstShortfallMonth, r.retirementAge)]);
        const years = r.yearly.map(y => [`${y.age}세 도달`, money(y.expense), money(y.pension), money(y.balance), money(y.shortfall)]);
        el('formulaContent').innerHTML = `<p>은퇴 전에는 월말 저축, 은퇴 후에는 월 수익 반영 → 연금 수령 → 생활비 지출 순서로 계산합니다. 연 수익률은 월 유효수익률로 환산합니다. 생활비는 현재 가치에서 물가를 반영하고 연금은 입력한 첫 수령액과 증가율을 사용합니다.</p><p>부족 시점은 첫 월 생활비를 전액 충당하지 못한 시점입니다. 연금이 나중에 시작되면 이후 잔액이 다시 늘 수도 있습니다. 나이 표시는 각 연도 말입니다.</p><h3>수익률 가정 민감도 (입력값 ±2%p)</h3>${table('수익률 가정별 은퇴자금 비교', ['세후 연수익률', '예상 자산', '필요 자산', '첫 생활비 부족'], scenarios)}<details><summary>연도별 생활비·연금·잔액 펼치기</summary>${table('은퇴 후 연도별 자금 흐름', ['연도 말 나이', '연간 생활비', '연간 연금', '남은 자산', '미충당 생활비'], years)}</details>`;
        el('resultNotice').textContent = `예시·사용자 가정에 따른 시뮬레이션입니다. 세후 연수익률 ${input.annualReturn}%, 물가 ${input.inflation}%, 연금 증가율 ${input.pensionGrowth}%가 일정하다고 가정하며 수익률 순서 위험·세금 자동 계산·큰 일시 지출은 포함하지 않습니다. 실제 소진 시점을 보장하지 않습니다.`;
        showResult();
    }
    let sequence = 0;
    function addAsset(data = { name: '', current: 0, targetWeight: 0 }) {
        const list = el('rebRows');
        if (list.children.length >= 20) throw new RangeError('자산은 최대 20개까지 입력할 수 있습니다.');
        const id = ++sequence, fieldset = document.createElement('fieldset');
        fieldset.className = 'average-lot-row'; fieldset.dataset.rebalanceRow = String(id);
        fieldset.innerHTML = `<legend>자산 ${id}</legend><div class="form-group"><label for="rebName${id}">자산 이름</label><input id="rebName${id}" data-field="name" type="text" maxlength="32" placeholder="예: 국내주식"></div><div class="form-group"><label for="rebValue${id}">현재 평가액 (원)</label><input id="rebValue${id}" data-field="current" class="money-input" type="text" inputmode="numeric" required></div><div class="form-group"><label for="rebWeight${id}">목표 비중 (%)</label><input id="rebWeight${id}" data-field="weight" type="number" min="0" max="100" step="0.01" required></div><button class="btn-remove average-lot-remove" type="button" aria-label="자산 ${id} 삭제">삭제</button>`;
        fieldset.querySelector('[data-field="name"]').value = data.name;
        fieldset.querySelector('[data-field="current"]').value = formatMoneyValue(data.current);
        fieldset.querySelector('[data-field="weight"]').value = data.targetWeight;
        fieldset.querySelector('button').addEventListener('click', () => {
            if (list.children.length <= 2) { el('rebError').hidden = false; el('rebError').textContent = '자산은 최소 2개를 남겨 주세요.'; el('rebError').focus(); return; }
            const next = fieldset.nextElementSibling || fieldset.previousElementSibling;
            fieldset.remove(); el('rebForm').dispatchEvent(new Event('input', { bubbles: true }));
            updateWeightSum(); next.querySelector('input').focus();
        });
        list.append(fieldset); bindMoneyInputs(fieldset); updateWeightSum();
        return fieldset;
    }
    function updateWeightSum() {
        const total = [...el('rebRows').querySelectorAll('[data-field="weight"]')].reduce((sum, field) => sum + Number(field.value || 0), 0);
        el('rebWeightSum').textContent = `목표 비중 합계: ${decimal(total, 4)}% / 100%`;
    }
    function calculateRebalancing() {
        const rows = [...el('rebRows').children].map(fieldset => ({ name: fieldset.querySelector('[data-field="name"]').value,
            current: read(fieldset.querySelector('[data-field="current"]').id), targetWeight: read(fieldset.querySelector('[data-field="weight"]').id) }));
        const input = { rows, extraCash: read('rebExtraCash'), mode: el('rebMode').value }, r = PersonalFinanceMath.calculateRebalancing(input);
        updateReportHeaders('PORTFOLIO REBALANCING', '목표 비중에 따른 자산 조정');
        el('resultTableBody').innerHTML = row('조정 방식', input.mode === 'full' ? '매수·매도 전체 조정' : '매도 없이 추가 투자') +
            row('현재 총 평가액', money(r.currentTotal)) + row('추가 투자금', money(r.extraCash)) +
            row('조정 후 총 평가액', money(r.total), 'highlight-row') + row('매수액 / 매도액 합계', `${money(r.totalBuy)} / ${money(r.totalSell)}`) +
            row('조정 후 최대 목표 비중 차이', `${decimal(r.maximumDeviation, 4)}%p`, 'total-row') +
            row('매도 없이 정확한 비중에 필요한 최소 추가금', r.impossibleWithoutSale ? '목표 0%인 보유자산이 있어 유한 금액으로 불가' : r.minimumAdditionalExceedsLimit ? '1조원 초과 · 추가금 입력 지원 범위 밖' : money(r.minimumAdditionalCash));
        const output = r.rows.map(x => [escape(x.name), money(x.current), `${decimal(x.currentWeight)}%`, `${decimal(x.targetWeight)}%`, `${x.trade > 0 ? '매수 ' : x.trade < 0 ? '매도 ' : '유지 '}${money(Math.abs(x.trade))}`, money(x.finalValue), `${decimal(x.finalWeight)}%`]);
        el('formulaContent').innerHTML = `<p>목표 평가액 = (현재 총 평가액 + 추가 투자금) × 목표 비중. 전체 조정은 목표 평가액과 현재 평가액의 차이를 거래합니다. 매도 없는 방식은 목표보다 부족한 원화 금액에 비례해 추가금을 배분하며, 목표 비중에 완전히 도달하지 않을 수 있습니다.</p><p>배분은 원 단위로 합계를 보존합니다. 최소 추가금은 현재 자산을 팔지 않고 입력한 목표 비중에 도달하기 위한 이론값이며 이번 추가금과 별개입니다.</p>${table('자산별 리밸런싱 계산 결과', ['자산', '현재 평가액', '현재 비중', '목표 비중', '계산상 조정액', '조정 후 평가액', '조정 후 비중'], output)}`;
        el('resultNotice').textContent = '사용자가 정한 목표 비중을 계산한 결과이며 추천 포트폴리오나 매매 지시가 아닙니다. 모든 자산은 같은 시점의 원화 평가액으로 입력합니다. 세금·수수료·환율 변동·최소 주문 단위·체결 가격은 제외하므로 실제 주문 전에 확인하세요.';
        showResult();
    }
    document.addEventListener('DOMContentLoaded', () => {
        if (el('fxForm')) {
            bind('fxForm', 'fxError', calculateExchange);
            el('fxCurrency').addEventListener('change', () => { exchangeState(); el('fxBaseRate').value = ''; });
            ['fxDirection', 'fxAmountType'].forEach(id => el(id).addEventListener('change', exchangeLabel));
            el('fxQuoteUnit').addEventListener('change', () => { exchangeLabel(); el('fxBaseRate').value = ''; });
            exchangeState();
        }
        if (el('retForm')) bind('retForm', 'retError', calculateRetirement);
        if (el('rebForm')) {
            const state = bind('rebForm', 'rebError', calculateRebalancing);
            [{ name: '주식 (예시)', current: 6000000, targetWeight: 50 }, { name: '채권 (예시)', current: 3000000, targetWeight: 40 }, { name: '현금 (예시)', current: 1000000, targetWeight: 10 }].forEach(addAsset);
            el('rebAddRow').addEventListener('click', () => { state.invalidate(); try { addAsset().querySelector('input').focus(); } catch (e) { state.fail(e.message); } });
            el('rebForm').addEventListener('input', updateWeightSum);
            el('rebForm').addEventListener('change', updateWeightSum);
        }
    });
})();
