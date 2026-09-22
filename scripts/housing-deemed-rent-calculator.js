(function () {
    'use strict';

    let nextHouseId = 0;
    let nextPeriodId = 0;
    const money = value => `${Math.round(value).toLocaleString('ko-KR')}원`;
    const digits = input => Number(input.value.replace(/[^\d]/g, ''));
    const list = () => document.getElementById('housingHouseList');

    function hideResult() {
        document.getElementById('resultBox').style.display = 'none';
        document.getElementById('housingFormError').hidden = true;
    }

    function periodMarkup(period = {}) {
        const id = ++nextPeriodId;
        return `<div class="housing-period tax-form-card" data-period>
            <div class="house-header"><strong>보증금 기간</strong><button type="button" class="btn-remove" data-remove-period aria-label="보증금 기간 삭제">기간 삭제</button></div>
            <div class="form-grid">
                <div class="form-group"><label for="housingPeriodStart${id}">시작일</label><input type="date" id="housingPeriodStart${id}" data-period-start min="2026-01-01" max="2026-12-31" value="${period.start || '2026-01-01'}" required></div>
                <div class="form-group"><label for="housingPeriodEnd${id}">종료일</label><input type="date" id="housingPeriodEnd${id}" data-period-end min="2026-01-01" max="2026-12-31" value="${period.end || '2026-12-31'}" required></div>
                <div class="form-group form-span-full"><label for="housingDeposit${id}">해당 기간 전세·임대보증금 (원)</label><input type="text" class="money-input" id="housingDeposit${id}" data-deposit inputmode="numeric" value="${period.deposit ?? ''}" placeholder="보증금이 없으면 0" required></div>
            </div></div>`;
    }

    function addHouse(house = {}) {
        if (list().querySelectorAll('[data-house]').length >= 10) throw new Error('주택은 최대 10채까지 입력할 수 있습니다.');
        const id = ++nextHouseId;
        const card = document.createElement('div');
        card.className = 'house-item';
        card.dataset.house = '';
        card.innerHTML = `<div class="house-header"><span class="house-title">주택 ${id}</span><button type="button" class="btn-remove" data-remove-house aria-label="주택 ${id} 삭제">주택 삭제</button></div>
            <div class="form-grid"><div class="form-group"><label for="housingPrice${id}">2026년 주택 기준시가 (원)</label><input type="text" class="money-input" id="housingPrice${id}" data-price inputmode="numeric" value="${house.publicPrice ?? ''}" placeholder="예: 1,300,000,000" required><small>매매가격이 아닌 주택 기준시가를 입력하세요.</small></div>
            <div class="form-group"><label for="housingArea${id}">전용면적 (㎡)</label><input type="number" id="housingArea${id}" data-area min="0.01" max="10000" step="any" value="${house.areaSqm ?? ''}" placeholder="예: 84" required></div></div>
            <div data-period-list></div><button type="button" class="btn-add" data-add-period>+ 보증금 기간 추가</button>`;
        list().appendChild(card);
        (house.periods || [{}]).forEach(period => card.querySelector('[data-period-list]').insertAdjacentHTML('beforeend', periodMarkup(period)));
        bindMoneyInputs(card);
        return card;
    }

    function readMoney(input, name) {
        if (!input.value.trim()) throw new Error(`${name}을 입력해 주세요. 보증금이 없으면 0을 입력하세요.`);
        return digits(input);
    }

    function collectHouses() {
        return [...list().querySelectorAll('[data-house]')].map((card, index) => ({
            publicPrice: readMoney(card.querySelector('[data-price]'), `주택 ${index + 1} 기준시가`),
            areaSqm: card.querySelector('[data-area]').value,
            periods: [...card.querySelectorAll('[data-period]')].map((period, periodIndex) => ({
                start: period.querySelector('[data-period-start]').value,
                end: period.querySelector('[data-period-end]').value,
                deposit: readMoney(period.querySelector('[data-deposit]'), `주택 ${index + 1} 기간 ${periodIndex + 1} 보증금`)
            }))
        }));
    }

    function applyPreset(type) {
        list().replaceChildren();
        const fullYear = deposit => [{ start: '2026-01-01', end: '2026-12-31', deposit }];
        if (type === 'high-two') {
            addHouse({ publicPrice: 1300000000, areaSqm: 84, periods: fullYear(700000000) });
            addHouse({ publicPrice: 1500000000, areaSqm: 84, periods: fullYear(600000000) });
        } else {
            addHouse({ publicPrice: 500000000, areaSqm: 84, periods: fullYear(200000000) });
            addHouse({ publicPrice: 500000000, areaSqm: 84, periods: fullYear(200000000) });
            addHouse({ publicPrice: 500000000, areaSqm: 84, periods: fullYear(100000000) });
        }
        hideResult();
    }

    function renderResult(result) {
        const ruleName = { 'three-or-more': '비소형 3주택 이상', 'high-value-two': '고가 2주택', 'not-eligible': '과세요건 미충족' }[result.rule];
        updateReportHeaders('HOUSING RENT', '2026 주택 간주임대료 리포트');
        document.getElementById('resultTableBody').innerHTML = `
            <tr><td>${icon('house')}입력 주택 / 소형주택 제외</td><td class="text-right">${result.totalHouses}채 / ${result.smallHouseCount}채</td></tr>
            <tr><td>${icon('list-checks')}적용 과세요건</td><td class="text-right">${ruleName}</td></tr>
            <tr><td>${icon('percent')}2026년 정기예금이자율</td><td class="text-right">연 3.1%</td></tr>
            <tr class="highlight-row"><td>${icon('wallet')}기간별 간주임대료 합계</td><td class="text-right">${money(result.grossImputedRent)}</td></tr>
            <tr><td>${icon('minus')}보증금 운용 금융수익 차감</td><td class="text-right">(-) ${money(result.appliedFinancialIncome)}</td></tr>
            <tr class="total-row"><td>${icon('receipt-text')}예상 간주임대료 수입금액</td><td class="text-right">${money(result.deemedRent)}</td></tr>`;
        document.getElementById('resultNotice').textContent = '※ 이 금액은 소득세가 아닌 2026년 주택임대소득 총수입금액에 더할 간주임대료 추정치입니다. 본인 단독 소유 국내 주택을 연중 보유한 경우만 계산하며, 공동소유·부부합산·연중 소유 변동 등은 별도 검토가 필요합니다.';
        const periodLines = result.segments.filter(segment => segment.taxableBase > 0).map(segment =>
            `${segment.start}~${segment.end} (${segment.days}일): (${money(segment.depositTotal)} − 3억원) × 60% × 3.1% × ${segment.days}/365 = ${money(segment.imputedRent)}`);
        document.getElementById('formulaContent').innerHTML = [
            `• 과세요건: ${ruleName}${result.rule === 'high-value-two' ? ' · 보증금 합계 12억원 초과 기간만 계산' : ''}`,
            '• 각 기간의 과세대상 보증금 합계에서 3억원을 공제하고 원 미만을 버린 뒤 합산',
            ...periodLines.map(line => `• ${line}`),
            result.rule === 'not-eligible' || !periodLines.length ? '• 입력 조건에서는 간주임대료 과세요건을 충족한 기간이 없습니다.' : '',
            result.filingMethod === 'books' ? `• 장부신고 금융수익 차감: ${money(result.appliedFinancialIncome)}` : '• 추계신고: 보증금 운용 금융수익을 차감하지 않음'
        ].filter(Boolean).join('<br>');
        showResult();
    }

    document.addEventListener('DOMContentLoaded', () => {
        const form = document.getElementById('housingDeemedRentForm');
        addHouse();
        addHouse();
        bindMoneyInputs(form);
        document.querySelectorAll('[data-housing-preset]').forEach(button => button.addEventListener('click', () => applyPreset(button.dataset.housingPreset)));
        document.getElementById('housingAddHouse').addEventListener('click', () => {
            try { addHouse(); hideResult(); } catch (error) { showError(error.message); }
        });
        list().addEventListener('click', event => {
            const house = event.target.closest('[data-house]');
            if (!house) return;
            if (event.target.closest('[data-add-period]')) {
                if (house.querySelectorAll('[data-period]').length >= 20) return showError('한 주택의 보증금 기간은 최대 20개입니다.');
                house.querySelector('[data-period-list]').insertAdjacentHTML('beforeend', periodMarkup());
                bindMoneyInputs(house);
                hideResult();
            } else if (event.target.closest('[data-remove-period]')) {
                if (house.querySelectorAll('[data-period]').length <= 1) return showError('주택마다 보증금 기간이 하나 이상 필요합니다.');
                event.target.closest('[data-period]').remove();
                hideResult();
            } else if (event.target.closest('[data-remove-house]')) {
                if (list().querySelectorAll('[data-house]').length <= 1) return showError('주택을 하나 이상 입력해 주세요.');
                house.remove();
                hideResult();
            }
        });
        form.addEventListener('input', hideResult);
        form.addEventListener('change', hideResult);
        document.getElementById('housingFilingMethod').addEventListener('change', event => {
            const books = event.target.value === 'books';
            document.getElementById('housingFinancialIncomeGroup').hidden = !books;
            document.getElementById('housingFinancialIncome').disabled = !books;
        });
        form.addEventListener('submit', event => {
            event.preventDefault();
            hideResult();
            try {
                if (!document.getElementById('housingSingleOwner').checked) throw new Error('계산 범위 확인란을 선택해 주세요.');
                const filingMethod = document.getElementById('housingFilingMethod').value;
                const result = HousingDeemedRentMath.calculateHousingDeemedRent({
                    houses: collectHouses(), filingMethod,
                    financialIncome: filingMethod === 'books' ? readMoney(document.getElementById('housingFinancialIncome'), '보증금 운용 금융수익') : 0
                });
                renderResult(result);
            } catch (error) { showError(error.message); }
        });
    });

    function showError(message) {
        hideResult();
        const error = document.getElementById('housingFormError');
        error.textContent = message;
        error.hidden = false;
        error.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
})();
