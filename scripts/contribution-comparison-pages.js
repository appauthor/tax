(function () {
    'use strict';
    const $ = id => document.getElementById(id);
    const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
    const number = (n, digits = 0) => Number(n).toLocaleString('ko-KR', { maximumFractionDigits: digits });
    const won = n => `${number(Math.round(n))} 원`;
    const signed = n => `${n > 0 ? '+' : ''}${number(n)}`;
    const row = (label, value, cls = '') => `<tr class="${cls}"><td>${escape(label)}</td><td class="text-right">${escape(value)}</td></tr>`;
    const table = (caption, headers, rows) => `<div class="${headers.length > 3 ? 'loan-table-wrap' : 'report-table-scroll'}" data-full-report-table tabindex="0" aria-label="${escape(caption)}"><table class="${headers.length > 3 ? 'content-table' : 'report-table'}"><caption>${escape(caption)}</caption><thead><tr>${headers.map(h => `<th scope="col">${escape(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(cells => `<tr>${cells.map(cell => `<td>${escape(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    function donation(input) {
        const r = HometownDonationMath.calculate(input);
        const rows = [row('계산 범위', r.confirmed ? '입력 기준 기부 요건 확인' : '기부 요건 추가 확인 필요'), row('세법상 공제액 · 소득세+지방소득세', won(r.nominal), 'highlight-row')];
        if (r.actual) rows.push(row('입력 세액 한도 반영 공제 가능액', won(r.actual.total), 'total-row'), row('기부 후 현금 부담 추정', won(r.actual.cashCost), 'highlight-row'), row('실제 가능액 중 소득세·지방소득세', `${won(r.actual.income)} · ${won(r.actual.local)}`), row('한도로 공제받지 못하는 금액', won(r.actual.unused)));
        else rows.push(row('실제 공제 가능액·현금 부담', '요건과 소득세·지방소득세 한도 확인 후 계산'));
        rows.push(row('2026년 기부금 합계', won(r.donation)), row('공제액 중 소득세', won(r.incomeCredit)), row('공제액 중 지방소득세', won(r.localCredit)), row('답례품 가치 · 현금 환급과 별도', won(r.gift)));
        if (r.actual) rows.push(row('답례품까지 고려한 체감 부담', `${won(r.actual.cashCost - r.gift)} · 현금 수익 아님`));
        return { title: '고향사랑기부금 세액공제 계산 결과', rows, formula: `<p>2026년 일반 기부의 구간별 공제액(지방소득세 포함): 처음 10만원까지 100%, 다음 10만원은 44%, 20만원 초과분은 16.5%입니다. 각 기부처가 아닌 1년 합계에 한 번 적용합니다.</p><p>소득세 = 첫 구간 × 100/110 + 둘째 구간 × 40% + 셋째 구간 × 15%. 지방소득세는 그 10%입니다. 실제 소득세 가능액에 소득세 한도를 적용하고, 그 금액의 10%에 지방소득세 한도를 적용한 뒤 합산합니다.</p><p>${r.confirmed ? '입력한 요건을 확인한 상태입니다.' : '본인 명의·거주자·주소지 외 기부 등 요건을 확인하지 않아 실제 공제액은 확정하지 않습니다.'} 세액 한도는 이 기부 공제에 사용할 수 있는 금액이며 기납부세액·환급 예상액과 다릅니다. 답례품은 지출을 줄여주는 비현금 가치입니다.</p>`, notice: '2026년 귀속 일반 기부, 사업소득 없는 거주자 기준. 사업자 필요경비·특별재난지역 우대·이월공제는 계산하지 않습니다. 실제 연말정산 환급액을 보장하지 않으며 표시 금액은 원 단위 반올림 참고값입니다.' };
    }
    function buyback(input) {
        const r = PensionBuybackMath.calculate(input);
        const rows = [row(r.mode === 'quote' ? '입력한 공단 고지 총액' : '추납보험료 추정 원금', won(r.principal), 'total-row')];
        if (r.monthly !== null) rows.push(row('적용 기준소득월액', won(r.base)), row('납부기한 연도 보험료율', `${number(r.rate * 100, 1)}% · 추납은 전액 본인 부담`), row('추납 월수·1개월 보험료', `${r.months}개월 · ${won(r.monthly)}`));
        if (r.recovery) {
            const a = r.recovery;
            rows.push(row('추납으로 증가하는 월 연금', won(a.increase), 'highlight-row'), row('추가 이자 포함 비교 비용', won(a.cost)));
            if (a.recoveryMonths === null) rows.push(row('단순 회수 시점', '월 증가액이 0원이므로 회수 시점 없음'));
            else rows.push(row('수령 시작 후 단순 회수기간', `${Math.floor(a.recoveryMonths / 12)}년 ${a.recoveryMonths % 12}개월 (${number(a.recoveryMonths)}개월)`), row('단순 손익분기 나이', `만 ${Math.floor(a.ageMonths / 12)}세 ${a.ageMonths % 12}개월 무렵`, 'highlight-row'));
        }
        return { title: '국민연금 추납 비용·단순 회수 비교', rows, formula: '<p>추정 원금 = 신청월 기준소득월액 × 납부기한이 속한 연도 보험료율 × 공단에서 확인한 추납 개월 수. 일반 가입자의 월급 공제율 4.75%가 아닌 전체 보험료율 9.5%(2026년)를 사용합니다. 분할납부 이자는 자동 산정하지 않습니다.</p><p>단순 회수 개월 = (추납 원금 또는 공단 고지액 + 따로 입력한 이자) ÷ (추납 후 월 연금 − 추납 전 월 연금), 올림. 수령 시작 나이에 이 기간을 더합니다. 추납 전·후 연금은 공단에서 같은 개시 연령과 같은 화폐가치 기준으로 확인한 값이어야 합니다.</p><p>보험료 절사·고지 조정으로 실제 고지액과 차이가 날 수 있습니다. 분할납부는 이자를 포함한 최종 총액을 고지액 방식으로 입력하고, 이미 포함된 이자를 다시 더하지 마세요. 소득공제 절세액·연금 과세·건강보험료·기초연금·물가·기회비용·지급시차는 반영하지 않은 단순 비교입니다.</p>', notice: '공단 확인 추납 대상 1~119개월. 추정 방식은 2026년 7~12월 신청, 2026년 또는 2027년 1월 법정 납부기한 기준입니다. 수급권과 추납 후 예상연금을 임의로 계산하지 않습니다. 입력값은 서버로 보내거나 저장하지 않습니다.' };
    }
    function irp(input) {
        const d = window.IrpFeeData, r = IrpFeeRankMath.compare(d, input);
        const channel = input.channel === 'online' ? '비대면·다이렉트 면제계약' : '대면 일반계약';
        const funding = input.funding === 'personal' ? '개인납입금' : '퇴직급여';
        return { title: 'IRP 조건별 관리수수료 비교', rows: [row('비교 조건', `${funding} · ${channel}`), row('1년간 일정하게 유지하는 적립금', won(r.balance)), ...r.rows.map(p => row(`${p.rank}위 · ${p.name}`, won(p.fee), p.rank === 1 ? 'highlight-row' : '')), row('비교군 내 최대 연 비용 차이', won(r.spread)), row('공식 수수료표 확인일', d.reviewedAt)], formula: '<p>적립금이 1년간 일정하다는 가정에서 운용관리·자산관리 비용을 합산해 낮은 순으로 정렬합니다. 체차식은 금액 구간을 나누어 계산하고, 국민은행은 해당 금액 구간의 단일률을 적용합니다. 같은 정확한 금액은 공동순위입니다. 상세 표는 표 안에서 상하·좌우로 이동할 수 있습니다.</p>' + table('입력 조건의 연 관리수수료 · 첫 계약연도 기준', ['순위', '금융회사', '운용관리', '자산관리', '연 합계', '환산 연율'], r.rows.map(p => [p.rank, p.name, won(p.operation), won(p.asset), won(p.fee), `${number(p.effectiveRate, 4)}%`])) + '<p>비대면 면제는 각 회사의 지정 계약을 충족한 경우입니다. 미래에셋은 다이렉트 관리점·전자매체 자기운용, 삼성증권은 다이렉트IRP 계약을 전제합니다. 국민은행 개인납입금은 자산관리 연 0.18% 선택 조건입니다. 특별 우대나 다른 자산관리 조건이면 순위가 달라질 수 있습니다.</p>', notice: `확인 ${d.reviewedAt}. 첫 계약연도·연금수령 전·만 40세 이상 일반 계약, 단일 재원 적립금 비교입니다. 펀드 보수·ETF 비용·매매비용, 디폴트옵션 성과수수료·장기·청년·기존 DB/DC 등 특별 면제는 제외합니다. 0원은 계좌 관리수수료 기준이며 수익률·투자 적합성 순위가 아닙니다.` };
    }
    function unsold(input) {
        const d = window.UnsoldHousingData, r = UnsoldHousingRankMath.compare(d, input), s = r.selected;
        const names = { total: '전체 미분양 많은 순', completed: '준공 후 미분양 많은 순', share: '준공 후 비중 높은 순', change: '전체 미분양 전월 증가 호수 순' };
        const history = d.periods.map((period, i) => [period, `${number(s.total[i])}호`, `${number(s.completed[i])}호`]);
        return { title: '지역별 미분양·준공 후 미분양 순위', rows: [row('통계 기준월·정렬 기준', `${d.referenceMonth} · ${names[input.metric]}`), row('선택 지역 순위', `${s.name} · ${s.rank}위 / ${r.rows.length}개 지역 묶음`, 'highlight-row'), row('선택 지역 전체 미분양', `${number(s.count)}호`, 'total-row'), row('선택 지역 준공 후 미분양', `${number(s.finished)}호 · 전체의 ${number(s.share, 1)}%`), row('선택 지역 전월 증감', `전체 ${signed(s.change)}호 · 준공 후 ${signed(s.completedChange)}호`), row('전국 전체·준공 후 미분양', `${number(d.national.total[5])}호 · ${number(d.national.completed[5])}호`)], formula: '<p>국토교통부 2026년 9월 말 전체 주택 통계입니다. 준공 후 미분양은 전체 미분양에 포함됩니다. 비중은 준공 후 미분양 ÷ 전체 미분양이며 지역 주택 전체의 미분양률이 아닙니다. 증가 순위는 증감률이 아닌 호수 차이를 사용합니다. 상세 표는 표 안에서 상하·좌우로 이동할 수 있습니다.</p>' + table(`${d.referenceMonth} · ${names[input.metric]}`, ['순위', '지역', '전체 미분양', '준공 후', '준공 후 비중', '전월 증감(전체)'], r.rows.map(p => [p.rank, p.name, `${number(p.count)}호`, `${number(p.finished)}호`, `${number(p.share, 1)}%`, `${signed(p.change)}호`])) + table(`${s.name} · 원표에 실린 기준시점 비교(매월 연속 추이 아님)`, ['기준시점', '전체 미분양', '준공 후'], history), notice: `국토교통부 ${d.referenceMonth} 말, 공표 ${d.publishedAt}, 검토 ${d.reviewedAt}의 저장본입니다. 원표의 전남광주 합산행을 유지한 16개 묶음 비교이며 전국·수도권·지방 합계는 순위에서 제외합니다. 아파트만의 통계나 현재 분양·계약 가능한 단지 목록, 투자 위험도 순위가 아닙니다.` };
    }
    document.addEventListener('DOMContentLoaded', () => {
        const form = document.querySelector('form[data-contribution-tool]');
        if (!form) return;
        const type = form.dataset.contributionTool, error = $('toolError');
        function clear() {
            if ($('resultBox')) $('resultBox').style.display = 'none';
            error.textContent = ''; error.hidden = true;
            if ($('baselineRank')) $('baselineRank').hidden = false;
        }
        function update() {
            form.querySelectorAll('[data-show-when]').forEach(group => {
                const [name, value] = group.dataset.showWhen.split(':');
                const control = form.elements.namedItem(name);
                const visible = control && (control.type === 'checkbox' ? String(control.checked) : control.value) === value;
                group.hidden = !visible; group.classList.toggle('is-hidden', !visible);
                group.querySelectorAll('input,select').forEach(el => { el.disabled = !visible; });
            });
        }
        form.addEventListener('input', () => { clear(); update(); });
        form.addEventListener('change', () => { clear(); update(); });
        form.addEventListener('invalid', clear, true);
        form.addEventListener('submit', event => {
            event.preventDefault(); clear();
            try {
                const input = {};
                for (const el of form.elements) {
                    if (!el.name || el.disabled) continue;
                    if (el.type === 'checkbox') input[el.name] = el.checked;
                    else if (el.classList.contains('money-input')) {
                        const raw = el.value.replace(/,/g, '').trim();
                        if (!/^\d+$/.test(raw)) throw new RangeError(`${el.labels[0]?.textContent || '금액'}: 빈칸 없이 0 이상의 원 단위 숫자로 입력하세요.`);
                        input[el.name] = Number(raw);
                    } else input[el.name] = el.value;
                }
                const r = ({ donation, buyback, irp, unsold })[type](input);
                updateReportHeaders('TAXYOU REPORT', r.title);
                $('resultTableBody').innerHTML = r.rows.join('');
                $('formulaContent').innerHTML = r.formula;
                $('resultNotice').textContent = r.notice;
                if ($('baselineRank')) $('baselineRank').hidden = true;
                showResult();
            } catch (cause) { error.textContent = cause.message; error.hidden = false; error.focus(); }
        });
        update();
    });
})();
