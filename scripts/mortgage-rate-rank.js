(function () {
    'use strict';
    const $ = id => document.getElementById(id);
    const won = value => `${Math.round(value).toLocaleString('ko-KR')} 원`;
    const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
    const repaymentLabel = { D1: '원금분할', D2: '원리금분할', S: '만기일시' };
    function hideResult() { if ($('resultBox')) $('resultBox').style.display = 'none'; }
    function error(message) {
        hideResult();
        $('mortgageRankError').textContent = message;
        $('mortgageRankError').hidden = false;
        $('mortgageRankError').focus();
    }
    function submit(event) {
        event.preventDefault();
        $('mortgageRankError').hidden = true;
        try {
            const data = window.MortgageRateData;
            if (!data || !Array.isArray(data.products) || MortgageRateRankMath.freshness(data.collectedAt) === 'invalid') throw new RangeError('금리 자료를 불러오지 못했습니다. 공식 공시를 확인해 주세요.');
            const options = {
                amount: getMoneyValue('mortgageRankAmount'), years: Number($('mortgageRankYears').value),
                rateMode: $('mortgageRankRateMode').value, sector: $('mortgageRankSector').value,
                rateType: $('mortgageRankRateType').value, repayment: $('mortgageRankRepayment').value,
                query: $('mortgageRankQuery').value
            };
            if (options.rateMode === 'minimum' && !$('mortgageAssumptionConfirmed').checked) throw new RangeError('최저 공시금리 적용 가정을 확인해 주세요.');
            const rows = MortgageRateRankMath.rank(data.products, options);
            if (!rows.length) throw new RangeError('선택한 조건에서 공시 금리가 있는 옵션이 없습니다. 필터를 바꿔 보세요.');
            const shown = rows.slice(0, 50);
            const modeLabel = { average: '전월 취급 평균금리', minimum: '공시 최저금리', maximum: '공시 최고금리' }[options.rateMode];
            const stale = MortgageRateRankMath.freshness(data.collectedAt) === 'stale';
            const table = `<div class="loan-table-wrap" data-full-report-table tabindex="0" aria-label="주택담보대출 금리 순위"><table class="content-table"><thead><tr><th>순위</th><th>금융회사·상품</th><th>금리·상환방식</th><th>${modeLabel}</th><th>첫 달 상환액</th><th>총이자 가정</th></tr></thead><tbody>${shown.map(p => `<tr><td>${p.rank}</td><td><a href="${escapeHtml(p.sourceUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(p.company)} · ${escapeHtml(p.name)}</a><br><small>공시 ${escapeHtml(p.disclosureMonth)}${p.productUrl ? ` · <a href="${escapeHtml(p.productUrl)}" target="_blank" rel="noopener noreferrer">상품 안내</a>` : ''}</small></td><td>${p.rateType === 'F' ? '고정' : '변동'} · ${repaymentLabel[p.repayment]}</td><td>${p.appliedRate.toFixed(2)}%</td><td>${won(p.firstPayment)}</td><td>${won(p.totalInterest)}</td></tr>`).join('')}</tbody></table></div>`;
            document.querySelector('#resultBox thead th:first-child').textContent = '비교 항목';
            document.querySelector('#resultBox thead th:last-child').textContent = '공시·계산 결과';
            document.querySelector('#resultBox .report-formula-title').textContent = '계산 기준과 상품별 순위';
            updateReportHeaders('MORTGAGE RATES', '주택담보대출 공시금리 순위');
            $('resultTableBody').innerHTML = `
                <tr><td>${icon('landmark')}공시 출처</td><td class="text-right">금융감독원 금융상품한눈에</td></tr>
                <tr><td>${icon('list-filter')}금리 정렬 기준</td><td class="text-right">${modeLabel}</td></tr>
                <tr><td>${icon('wallet-cards')}비교 대출금액·기간</td><td class="text-right">${won(options.amount)} · ${options.years}년</td></tr>
                <tr><td>${icon('table')}조건 일치 공시 옵션</td><td class="text-right">${rows.length.toLocaleString('ko-KR')}개 · 상위 ${shown.length}개 표시</td></tr>
                <tr><td>${icon('calendar-days')}자료 수집 시각</td><td class="text-right">${new Date(data.collectedAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })} KST</td></tr>
                <tr class="total-row"><td>${icon('chart-no-axes-combined')}표시된 1위 금리</td><td class="text-right">${rows[0].appliedRate.toFixed(2)}% · ${escapeHtml(rows[0].company)}</td></tr>`;
            $('resultNotice').textContent = `※ 저장된 아파트 담보대출 공시 ${data.sourceRows}개 옵션 중 선택한 금리 기준으로 비교합니다. ${stale ? '수집 후 7일이 지난 자료입니다. ' : ''}공시 조회조건은 주택 3억 원·대출 1억 원·30년입니다. 실제 승인금리·한도·가입 가능 여부는 다를 수 있습니다.`;
            $('formulaContent').innerHTML = `<p>${modeLabel} 오름차순입니다. 같은 금리는 공동순위이며 상품·금리·상환방식 옵션은 별도 행입니다.</p><p>첫 달 상환액과 총이자는 입력한 ${won(options.amount)}·${options.years}년에 공시금리 ${options.rateMode === 'average' ? '평균값' : '범위값'}을 기간 내내 적용한 참고 계산입니다. 변동금리 조정, 수수료, 보증료, 개인별 우대조건은 포함하지 않습니다.</p>${stale ? '<p>공시 자료가 오래되었습니다. 금융감독원과 금융회사에서 현재 조건을 확인하세요.</p>' : ''}${table}`;
            showResult();
        } catch (cause) { error(cause instanceof Error ? cause.message : '입력값을 확인해 주세요.'); }
    }
    document.addEventListener('DOMContentLoaded', () => {
        const form = $('mortgageRateRankForm');
        if (!form) return;
        form.addEventListener('submit', submit);
        form.addEventListener('input', hideResult);
        form.addEventListener('change', hideResult);
        function updateMode() {
            const minimum = $('mortgageRankRateMode').value === 'minimum';
            $('mortgageAssumptionGroup').hidden = !minimum;
            $('mortgageAssumptionGroup').classList.toggle('is-hidden', !minimum);
            $('mortgageAssumptionConfirmed').disabled = !minimum;
            if (!minimum) $('mortgageAssumptionConfirmed').checked = false;
        }
        $('mortgageRankRateMode').addEventListener('change', updateMode);
        updateMode();
        const data = window.MortgageRateData;
        $('mortgageDataStatus').textContent = data && Array.isArray(data.products)
            ? `금융감독원 공시 ${data.products.length.toLocaleString('ko-KR')}개 옵션 · 수집 ${new Date(data.collectedAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })} KST${MortgageRateRankMath.freshness(data.collectedAt) === 'stale' ? ' · 7일 이상 지난 자료입니다.' : ''}`
            : '저장된 공시 자료를 불러오지 못했습니다. 공식 공시를 확인해 주세요.';
    });
})();
