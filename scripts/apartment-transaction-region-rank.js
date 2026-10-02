(function () {
    'use strict';
    const $ = id => document.getElementById(id);
    const number = value => Number(value).toLocaleString('ko-KR', { maximumFractionDigits: 1 });
    const won = value => `${Math.round(value).toLocaleString('ko-KR')} 원`;
    const monthLabel = value => { const [year, month] = value.split('-'); return `${year}년 ${Number(month)}월`; };
    function hideResult() { if ($('resultBox')) $('resultBox').style.display = 'none'; }
    function error(message) { hideResult(); $('apartmentRegionError').textContent = message; $('apartmentRegionError').hidden = false; $('apartmentRegionError').focus(); }
    function submit(event) {
        event.preventDefault();
        $('apartmentRegionError').hidden = true;
        try {
            const data = window.ApartmentTransactionRegionData;
            const result = ApartmentTransactionRegionRankMath.compare(data, {
                region: $('apartmentRegion').value,
                price: $('apartmentPrice').value.trim().replace(/,/g, ''),
                area: $('apartmentArea').value.trim()
            });
            const line = (label, value, className = '') => `<tr class="${className}"><td>${label}</td><td class="text-right">${value}</td></tr>`;
            const table = `<div class="loan-table-wrap" data-full-report-table tabindex="0" aria-label="시도별 아파트 매매 실거래 중위가격 순위"><table class="content-table"><thead><tr><th>순위</th><th>시도</th><th>매매 중위가격</th></tr></thead><tbody>${result.rows.map(row => `<tr${row.name === result.selected.name ? ' class="highlight-row"' : ''}><td>${row.rank}</td><td>${row.name}</td><td>${number(row.medianPerSqm)}만원/㎡</td></tr>`).join('')}</tbody></table></div>`;
            updateReportHeaders('APARTMENT TRANSACTION REPORT', '지역별 아파트 실거래가 순위');
            $('resultTableBody').innerHTML = [
                line('공식 통계 기준월', monthLabel(data.referenceMonth)),
                line('선택한 시도 순위', `${result.selected.name} · ${result.selected.rank}위 / ${result.rows.length}개 시도`),
                line('해당 시도 매매 중위가격', `${number(result.selected.medianPerSqm)}만원/㎡`, 'total-row'),
                line('전국 매매 중위가격', `${number(result.national)}만원/㎡`),
                ...(result.personal ? [
                    line('입력 거래가격·전용면적', `${won(result.personal.price)} · ${number(result.personal.area)}㎡`),
                    line('내 거래의 ㎡당 가격', `${number(result.personal.perSqm)}만원/㎡`),
                    line('시도 중위가격과 차이', `${result.personal.difference >= 0 ? '+' : ''}${number(result.personal.difference)}만원/㎡`)
                ] : [])
            ].join('');
            $('resultNotice').textContent = `※ 한국부동산원 R-ONE ${monthLabel(data.referenceMonth)} 아파트 매매 실거래 기반 중위가격의 저장본입니다. ㎡당 중위가격 순위이며 개별 아파트 단지·동일 면적 실거래 순위나 내 거래의 상위 백분위가 아닙니다. 새 공표 후 수동 검증·갱신합니다.`;
            $('formulaContent').innerHTML = `<p>한국부동산원 ‘(월) 지역별 매매 중위가격_아파트’ 원표의 17개 시도 값을 만원/㎡ 단위로 높은 순서로 정렬했습니다. 전국·수도권·지방, 서울 생활권, 전남광주 통합행은 시도 순위에서 제외했습니다. 같은 값은 공동순위입니다.</p>${result.personal ? '<p>입력한 거래의 ㎡당 가격 = 거래가격 ÷ 전용면적 ÷ 1만원. 지역 중위가격과의 차이는 단순 참고이며 면적·단지·층·계약시점이 다른 거래를 보정하지 않습니다.</p>' : ''}${table}`;
            showResult();
        } catch (cause) { error(cause instanceof Error ? cause.message : '입력값을 확인해 주세요.'); }
    }
    document.addEventListener('DOMContentLoaded', () => {
        const form = $('apartmentRegionRankForm');
        if (!form) return;
        const data = window.ApartmentTransactionRegionData;
        if (data && Array.isArray(data.regions)) {
            data.regions.slice().sort((a, b) => b.medianPerSqm - a.medianPerSqm).forEach(row => { const option = document.createElement('option'); option.value = row.name; option.textContent = row.name; $('apartmentRegion').appendChild(option); });
            $('apartmentRegion').value = '서울';
            $('apartmentRegionStatus').textContent = `${monthLabel(data.referenceMonth)} 공식 통계 · 17개 시도 · 검토 ${data.reviewedAt}`;
        } else $('apartmentRegionStatus').textContent = '통계 자료를 불러오지 못했습니다.';
        form.addEventListener('submit', submit);
        form.addEventListener('input', hideResult);
        form.addEventListener('change', hideResult);
    });
})();
