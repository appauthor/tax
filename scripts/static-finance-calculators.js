(function () {
    'use strict';

    const money = value => `${Math.round(value).toLocaleString('ko-KR')}원`;
    const percent = (value, digits = 2) => `${Number(value.toFixed(digits))}%`;
    const time = minutes => `${Math.floor(minutes / 60)}시간 ${Number((minutes % 60).toFixed(2))}분`;
    const line = (label, value, className = '') => ({ label, value, className });

    function card(input) {
        const r = StaticFinanceMath.cardDeduction(input);
        return {
            rows: [
                line('예상 카드 소득공제액', money(r.deduction), 'total-row'),
                line('일반 한도에서 남은 공제액', money(r.baseRemaining), 'highlight-row'),
                line('최저사용금액까지 부족한 지출', money(r.toThreshold)),
                line('적격 사용액 합계 / 총급여의 25%', `${money(r.total)} / ${money(r.threshold)}`),
                line('25% 구간의 공제 제외액', money(r.offset)),
                line('한도 적용 전 공제액', money(r.uncapped)),
                line('일반 공제액 / 일반 한도', `${money(r.base)} / ${money(r.baseLimit)}`),
                line('추가 공제액 / 추가 한도', `${money(r.additional)} / ${money(r.specialLimit)}`),
                line('추가 한도 잔액 · 지정 항목만', money(r.specialRemaining))
            ],
            formula: '사용액에 항목별 공제율을 곱한 뒤 총급여 25%에 해당하는 공제 제외액을 뺍니다. 최저사용금액은 일반 신용카드 15%, 체크카드·현금영수증과 적격 문화비 30%, 전통시장·대중교통 40% 순으로 차감합니다. 추가 공제는 일반 한도 초과액, 지정 항목 공제액 합계, 추가 한도 중 가장 작은 금액입니다.',
            notice: '2026년 귀속 · 2027년 초 연말정산 · 공제 대상 사용분 기준입니다. 표시 금액은 소득공제액이며 최종 세금은 전체 공제와 세율을 반영해 계산합니다.'
        };
    }

    function overtime(input) {
        const r = StaticFinanceMath.overtimePay(input);
        const hours = input.day === 'holiday'
            ? line('휴일 8시간 이내 / 초과', `${time(r.holidayFirst)} / ${time(r.holidayExtra)}`)
            : line('법정 연장근로 시간', time(r.overtime));
        return {
            rows: [
                line('해당 근무 임금 · 기본과 가산 합계', money(r.total), 'total-row'),
                line('가산수당만 합계', money(r.premiums), 'highlight-row'),
                line('휴게를 뺀 실근로 시간', time(r.worked)),
                hours,
                line('야간근로 시간', time(r.night)),
                line('실근로 기본임금', money(r.base)),
                line('연장 가산 50%', money(r.overtimeAmount)),
                line('휴일 가산 50%·100%', money(r.holidayAmount)),
                line('야간 가산 50%', money(r.nightAmount))
            ],
            formula: '통상시급에 실근로 시간을 곱해 기본임금을 계산합니다. 소정의 근로 기준에 따라 법정 연장은 50%, 휴일 8시간 이하는 50%, 초과분은 100%를 가산합니다. 밤 10시부터 다음 날 오전 6시까지 일한 시간에는 적용되는 가산에 야간 가산 50%를 더합니다.',
            notice: '상시 5명 이상 사업장의 일반 성인 근로자와 입력한 한 근무 구간을 기준으로 합니다. 별도 유급휴일 임금, 이미 지급한 임금, 회사 약정이나 특례는 별도로 확인하세요.'
        };
    }

    function lease(input) {
        const r = StaticFinanceMath.commercialLease(input);
        return {
            rows: [
                line('환산보증금', money(r.converted), 'total-row'),
                line('소재지 기준 비교', r.eligible ? '기준 이내' : '기준 초과', 'highlight-row'),
                line('지역별 환산보증금 기준', money(r.limit)),
                line('기준까지 여유 / 초과 금액', r.gap >= 0 ? `${money(r.gap)} 여유` : `${money(-r.gap)} 초과`),
                line('현재 보증금에서 기준 이내 최대 월 차임', r.maxMonthly === null ? '보증금만으로 기준 초과' : money(r.maxMonthly))
            ],
            formula: '환산보증금 = 보증금 + 월 차임 × 100. 현재 보증금을 고정하면 기준 이내 최대 월 차임은 (지역 기준 − 보증금) ÷ 100의 원 단위 내림입니다. 기준과 정확히 같으면 이내에 해당합니다.',
            notice: '현행 일반 기준의 금액 비교입니다. 기준을 넘겨도 대항력·계약갱신요구권·권리금 회수기회 보호 등 적용되는 조항이 있습니다. 개별 계약의 권리, 우선변제 요건과 경과규정은 별도 확인이 필요합니다.'
        };
    }

    function guarantee(input) {
        const r = StaticFinanceMath.guaranteeFee(input);
        const meetsAmountRequirements = r.issues.length === 0;
        const feeValue = value => meetsAmountRequirements ? value : '—';
        const discountLabels = [
            [r.discounts.welfare, '사회배려계층'],
            [r.discounts.electronic, '전자계약'],
            [r.discounts.mobile, '모바일 신청'],
            [r.discounts.lumpSum, '일시납']
        ].filter(([rate]) => rate > 0).map(([rate, label]) => `${label} ${rate}%`);
        const rows = [
            line('예상 반환보증료 · 할인 반영', meetsAmountRequirements ? money(r.fee) : '입력 요건 초과로 예상료 표시 생략', 'total-row'),
            line('입력값으로 확인한 금액 요건', meetsAmountRequirements ? '입력 금액 기준의 한도 이내' : r.issues.join(' '), 'highlight-row'),
            line('보증 심사용 주택가격', `${money(r.property)}${r.publishedPrice ? ' · 공시가격·기준시가의 140%' : ''}`),
            line('담보인정비율 90% 적용 후 주택가액', money(r.adjustedValue)),
            line('보증료율 산정 부채비율', percent(r.ratio * 100)),
            line('권역 전세보증금 상한', money(r.depositLimit)),
            line('연 보증료율 / 입력 계약기간', feeValue(`${percent(r.rate * 100, 3)} / ${r.days}일`)),
            line('할증 전 기본 보증료', feeValue(money(r.base))),
            line('선순위채권 할증', feeValue(r.surcharge ? '10% 적용' : '0%')),
            line('할증 반영 후 · 할인 전 보증료', feeValue(money(r.beforeDiscount))),
            line('선택한 할인', feeValue(discountLabels.join(' · ') || '미적용')),
            line('예상 할인액', feeValue(money(r.discountAmount)))
        ];
        return {
            rows,
            formula: '보증금액 × 연 보증료율 × 계약일수 ÷ 365로 기본 보증료를 구합니다. 선순위채권 할증이 해당하면 먼저 반영하고, 선택한 할인율을 각각 남은 보증료에 차례로 곱해 예상 납부액을 계산합니다.',
            notice: 'HUG 일반 신규 반환보증, 보증금 전액 기준입니다. 선택 조건으로 계산한 예상액이며, 시세 인정, 할인 증빙, 동시 적용 및 실제 납부액은 HUG와 신청 채널에서 확인하세요.'
        };
    }

    function dc(input) {
        const r = StaticFinanceMath.retirementContribution(input);
        const rows = [
            line('법정 최소 회사 부담금 · 원 단위 올림', money(r.minimum), 'total-row'),
            line('통상 근무기간 임금 기준 부담금', money(r.regularContribution)),
            line('연 단위 지급 임금 기준 부담금', money(r.annualContribution)),
            line('통상 근무기간 임금을 나눈 기간', `${12 - r.leave}개월`)
        ];
        if (r.paid !== null) {
            rows.push(line('입력한 회사 납입액', money(r.paid)));
            rows.push(line('최소 기준 대비', r.difference > 0 ? `${money(r.difference)} 부족`
                : r.difference === 0 ? '최소 산정액과 같음' : `${money(-r.difference)} 높음`, 'highlight-row'));
        }
        return {
            rows,
            formula: r.leave ? '육아휴직 등 해당 제외기간을 뺀 임금 합계를 12개월에서 제외기간을 뺀 개월 수로 나눕니다. 연 1회 발생 기준이 있는 임금은 연 단위 지급액을 12로 나눠 별도로 더합니다.' : '해당 1년의 임금 합계와 연 단위 지급 임금을 합산해 12로 나눕니다. 연 단위로 발생한 임금과 통상 근무기간 지급액을 중복 입력하지 않습니다.',
            notice: '일반적인 1년 산정기간의 법정 최저 기준입니다. 사업장 규약의 상향 적립, 입·퇴사 첫해의 산정기간, 전 기간 휴직, 미납 지연이자는 별도 확인이 필요합니다.'
        };
    }

    const renderers = { card, overtime, lease, guarantee, dc };

    document.addEventListener('DOMContentLoaded', () => {
        const form = document.querySelector('form[data-static-finance]');
        if (!form) return;
        const error = form.querySelector('[role="alert"]');
        const clear = () => {
            const result = document.getElementById('resultBox');
            if (result) result.style.display = 'none';
            error.textContent = '';
            error.hidden = true;
        };
        const update = () => {
            form.querySelectorAll('[data-requires]').forEach(group => {
                const [name, choice] = group.dataset.requires.split(':');
                const visible = form.elements.namedItem(name).value === choice;
                group.hidden = !visible;
                group.classList.toggle('is-hidden', !visible);
                group.querySelectorAll('input').forEach(field => { field.disabled = !visible; });
            });
        };
        form.addEventListener('input', clear);
        form.addEventListener('change', () => { clear(); update(); });
        form.addEventListener('invalid', clear, true);
        form.addEventListener('submit', event => {
            event.preventDefault();
            clear();
            try {
                const input = Object.fromEntries(Array.from(form.elements).filter(field => field.name && !field.disabled).map(field => {
                    if (!field.classList.contains('money-input')) return [field.name, field.value];
                    const digits = field.value.replace(/,/g, '').trim();
                    if (!/^\d*$/.test(digits)) throw new RangeError('금액은 원 단위 숫자로 입력하세요.');
                    return [field.name, digits ? Number(digits) : null];
                }));
                const report = renderers[form.dataset.staticFinance](input);
                updateReportHeaders('TAXYOU REPORT', form.dataset.reportTitle);
                const body = document.getElementById('resultTableBody');
                body.replaceChildren();
                for (const item of report.rows) {
                    const row = body.insertRow();
                    row.className = item.className;
                    row.insertCell().textContent = item.label;
                    const value = row.insertCell();
                    value.className = 'text-right';
                    value.textContent = item.value;
                }
                const formula = document.createElement('p');
                formula.textContent = report.formula;
                document.getElementById('formulaContent').replaceChildren(formula);
                document.getElementById('resultNotice').textContent = report.notice;
                showResult();
            } catch (cause) {
                error.textContent = cause.message;
                error.hidden = false;
                error.focus();
            }
        });
        update();
    });
})();
