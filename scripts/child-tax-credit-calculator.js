(function () {
    'use strict';
    const $ = id => document.getElementById(id);
    const won = value => `${Math.round(value).toLocaleString('ko-KR')} 원`;
    const digits = id => $(id).value.trim().replace(/,/g, '');
    function hideResult() { if ($('resultBox')) $('resultBox').style.display = 'none'; }
    function error(message) { hideResult(); $('childCreditError').textContent = message; $('childCreditError').hidden = false; $('childCreditError').focus(); }
    function spouseFields() {
        const visible = $('childCreditHasSpouse').checked;
        $('childCreditSpousePay').disabled = !visible;
        $('childCreditSpousePay').closest('.form-group').classList.toggle('is-hidden', !visible);
    }
    function submit(event) {
        event.preventDefault();
        $('childCreditError').hidden = true;
        try {
            const result = ChildTaxCreditMath.calculate({ application: $('childCreditApplication').value,
                ownPay: digits('childCreditOwnPay'), spousePay: digits('childCreditSpousePay'),
                hasSpouse: $('childCreditHasSpouse').checked, children: $('childCreditChildren').value,
                otherIncome: digits('childCreditOtherIncome'), assets: digits('childCreditAssets'),
                childTaxCredit: digits('childCreditTaxOffset'), otherEligible: $('childCreditEligible').checked });
            const line = (label, value, className = '') => `<tr class="${className}"><td>${label}</td><td class="text-right">${value}</td></tr>`;
            updateReportHeaders('CHILD TAX CREDIT REPORT', '자녀장려금 예상금액');
            $('resultTableBody').innerHTML = [
                line('입력 기준 가구 유형', result.family === 'dual' ? '맞벌이가구' : '홑벌이가구'),
                line('요건을 충족하는 부양자녀', `${result.children}명`),
                line('부부합산 총급여액 등', won(result.totalPay)),
                line('소득요건 판정용 총소득', won(result.totalIncome)),
                line('신청요건', result.eligible ? '입력 기준 충족 가정' : result.reasons.join(' / ')),
                line('공식 산정표 소득 구간', !result.eligible ? '신청요건 미충족' : result.bracketLower === null ? `${result.family === 'dual' ? '600만원' : '4만원'} 이상 ~ ${result.family === 'dual' ? '2,500만원' : '2,100만원'} 미만` : `${won(result.bracketLower)} 이상 ~ ${won(result.bracketUpper)} 미만`),
                line('자녀 1인당 산정표 금액', won(result.perChild)),
                line('부양자녀 수 반영 산정액', won(result.tableAmount)),
                line('재산요건 50% 감액', won(result.assetReduction)),
                line('기한 후 신청 5% 감액', won(result.lateReduction)),
                line('이미 받은 자녀세액공제 차감', won(result.taxCreditReduction)),
                line('최소 지급액 조정', won(result.minimumAdjustment)),
                line('예상 자녀장려금', won(result.decision), 'total-row')
            ].join('');
            $('resultNotice').textContent = '※ 2025년 귀속·2026년 신청 기준의 참고 계산입니다. 자녀의 나이·연간 소득금액, 국적·전문직 등 기타 요건은 입력한 확인값을 전제로 합니다. 체납 충당, 종합소득세 신고 여부, 국세청의 최종 소득·재산 심사는 별도입니다.';
            $('formulaContent').innerHTML = '<p>시행령 별표 11의2의 총급여액 등 구간별 자녀 1인당 금액 × 요건을 충족하는 자녀 수 → 재산 1억 7천만원 이상이면 50% 감액 → 기한 후 신청이면 남은 금액의 5% 감액 → 이미 적용받은 자녀세액공제액 차감 → 잔액이 0원 초과 3만원 미만이면 3만원으로 결정합니다.</p>';
            showResult();
        } catch (cause) { error(cause instanceof Error ? cause.message : '입력값을 확인해 주세요.'); }
    }
    document.addEventListener('DOMContentLoaded', () => {
        const form = $('childTaxCreditForm');
        if (!form) return;
        form.addEventListener('submit', submit);
        form.addEventListener('input', hideResult);
        form.addEventListener('change', hideResult);
        $('childCreditHasSpouse').addEventListener('change', spouseFields);
        spouseFields();
    });
})();
