(function () {
    'use strict';

    const math = PracticalFinanceMath;
    const el = id => document.getElementById(id);
    const dec = (n, max = 2) => n.toLocaleString('ko-KR', { maximumFractionDigits: max });
    const won = n => `${dec(Math.round(n), 0)} 원`;
    const pct = n => `${dec(n, 4)}%`;
    const diffPercent = n => `${n > 0 ? '+' : n < 0 ? '−' : ''}${pct(Math.abs(n))}`;
    const escapeText = value => String(value).replace(/[&<>"']/g, char => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[char]);

    function fieldName(field) {
        const label = field.labels?.[0]?.textContent || '입력값';
        const option = field.closest('[data-compare-option]')?.querySelector('[data-option-heading]');
        return option ? `${option.textContent}의 ${label}` : label;
    }

    function number(field) {
        const raw = field.value.trim();
        if (field.classList.contains('money-input')) {
            const result = Number(raw.replaceAll(',', ''));
            if (!/^(?:\d+|\d{1,3}(?:,\d{3})+)$/.test(raw) || !Number.isSafeInteger(result) || result > 1e12) {
                throw new RangeError(`${fieldName(field)}에 0원부터 1조 원까지 입력해 주세요.`);
            }
            return result;
        }
        return field.valueAsNumber;
    }

    function read(container) {
        return Object.fromEntries([...container.querySelectorAll('input[name], select[name]')]
            .filter(field => !field.disabled)
            .map(field => [field.name, field.type === 'number' || field.classList.contains('money-input')
                ? (field.value === '' && !field.required ? null : number(field))
                : field.value.trim()]));
    }

    function report(title, summary, formula, note, detail = null, focus = true) {
        updateReportHeaders('TAXYOU REPORT', title);
        el('resultTableBody').innerHTML = summary.map(([label, value], index) =>
            `<tr${index === 0 ? ' class="total-row"' : ''}><th scope="row">${escapeText(label)}</th><td class="text-right">${escapeText(value)}</td></tr>`).join('');
        el('resultNotice').textContent = note;
        el('formulaContent').innerHTML = `<p>${escapeText(formula)}</p>`;
        if (detail) {
            const [headers, rows] = detail;
            el('formulaContent').insertAdjacentHTML('beforeend', `<p class="review-note">화면이 좁으면 상세표를 좌우로 밀어 나머지 항목을 확인하세요.</p>
                <div class="loan-table-wrap" tabindex="0" aria-label="비교 결과 상세표" data-full-report-table>
                <table class="content-table"><thead><tr>${headers.map(header => `<th scope="col">${escapeText(header)}</th>`).join('')}</tr></thead>
                <tbody>${rows.map(cells => `<tr>${cells.map((cell, index) => index === 0 ? `<th scope="row">${escapeText(cell)}</th>` : `<td>${escapeText(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table>
            </div>`);
        }
        if (focus) showResult();
        else {
            el('resultBox').style.display = 'block';
            if (el('resultUpdateStatus')) el('resultUpdateStatus').hidden = true;
            renderIcons();
        }
    }

    const calculators = {
        daily(data) {
            const result = math.dailyWorkerTax(data.dailyPay, data.days);
            report('일용근로소득 지급 방식별 원천징수',
                [['일괄 지급 때 늘어나는 세금', won(result.grouped.national + result.grouped.local - result.daily.national - result.daily.local)],
                    ['과세 일당 × 근무일수', won(result.gross)], ['1일 소득세 산식 결과', `${dec(result.dailyTax, 3)} 원`]],
                '일당에서 15만 원을 공제한 뒤 유효세율 2.7%를 적용합니다. 일용근로소득의 소액부징수 판정은 실제 지급 단위로 합니다.',
                '일용근로소득으로 분류되고 매일 같은 과세 일당을 받는 경우입니다. 차감 후 금액은 이 계산의 세금만 뺀 금액이며, 비과세 수당과 4대보험 등은 별도입니다.',
                [['지급 방식', '소득세 합계', '지방소득세 합계', '두 세금 차감 후'],
                    [['매일 지급', won(result.daily.national), won(result.daily.local), won(result.daily.net)],
                        ['한 번에 지급', won(result.grouped.national), won(result.grouped.local), won(result.grouped.net)]]]);
        },
        proration(data) {
            const result = math.proratedSalary({ ...data, month: `${data.year}-${data.month}` });
            report('기준 월의 세전 일할급여',
                [['달력 일수 기준', won(result.calendarPay)], ['기준 월 달력 일수', `${result.monthDays}일`],
                    ['기준 월에 포함되는 재직기간', `${result.calendarDays}일`],
                    ['유급일수 기준', result.paidDayPay === null ? '유급일수 두 칸을 입력하면 표시됩니다.' : won(result.paidDayPay)]],
                '월 고정급에 기준 월 전체 일수 중 재직기간이 차지하는 비율을 곱합니다. 유급일수 기준은 같은 방식으로 회사가 정한 유급일수를 사용합니다.',
                '회사 급여규정과 실제 급여명세서를 확인하세요. 세금·사회보험, 변동 수당, 연차 정산과 퇴직금은 포함하지 않습니다.');
        },
        shutdown(data) {
            const result = math.shutdownAllowance(data);
            report('휴업일 전체 기준 예상 수당',
                [['휴업수당 기준액 합계', won(result.total)], ['1일 평균임금의 70%', won(result.usual)],
                    ['1일 기준액', won(result.minimum)], ['이미 받은 수당과의 차액', won(result.supplement)]],
                '평균임금의 70%와 통상임금을 비교합니다. 평균임금의 70%가 통상임금을 넘는 때에는 통상임금으로 지급할 수 있는 기준을 적용합니다.',
                '근로기준법 제46조 적용 사업장의 종일 휴업을 가정합니다. 부분휴업, 사용자 귀책 판단, 노동위원회 승인 감액과 더 유리한 사내 규정은 별도 확인이 필요합니다.');
        },
        revolving(data) {
            const result = math.revolvingInterest(data);
            report('리볼빙 결제비율별 다음 청구액',
                [['기본 비율의 예상 청구액', won(result.current.bill)], ['비교 비율의 예상 청구액', won(result.compared.bill)],
                    ['직전 이월분의 이용 수수료', won(result.interest)], ['청구 대상 원금', won(result.principal)]],
                '직전 이월잔액에 연 수수료율과 경과일수를 적용합니다. 결제비율을 반영한 원금과 수수료, 리볼빙 제외 청구액을 더합니다.',
                '명세서의 리볼빙 대상과 최소 청구원금을 기준으로 비교하세요. 카드별 원금·수수료 끝수 처리, 기간 중 선결제, 연체는 별도로 반영될 수 있습니다.',
                [['조건', '원금 납부', '총 청구액', '새 이월잔액'],
                    [result.current, result.compared].map(item => [pct(item.ratio), won(item.paidPrincipal), won(item.bill), won(item.remaining)])]);
        },
        jeonse(data) {
            const result = math.jeonseRenewal(data);
            report('전세보증금 갱신 제안 비교',
                [['제안 인상률', pct(result.rate)], ['제안 금액 변화', won(result.increase)],
                    [`${pct(data.capRate)} 기준 갱신 상한액`, won(result.limit)], ['입력 상한 대비 초과액', won(result.excess)]],
                '제안 금액에서 기존 보증금을 뺀 값을 기존 보증금으로 나눕니다. 상한 비교액은 기존 보증금에 입력한 상한율을 더해 원 미만을 버립니다.',
                '보증금만 바뀌는 주택 전세 계약의 금액 비교입니다. 갱신요구권 행사 여부, 증액 간격, 지역 조례와 당사자 합의의 법적 효력은 별도로 확인하세요.');
        }
    };

    const comparisons = {
        mvno(data, options) {
            const ranked = math.rankOptions(options, option => math.mvnoCosts(option, data.period), 'total');
            return ['알뜰폰 이용 총비용 순위', ranked, 'total', '낮은 비용',
                `할인가로 낸 달과 정상가로 낸 달을 나눠 합산하고 일회성 비용을 더합니다. 비교 기간은 ${data.period}개월입니다.`,
                '입력한 후보만 비교합니다. 통화·데이터 조건을 먼저 맞추고, 일할 청구와 중도 해지비가 있으면 별도로 확인하세요.',
                ['할인 적용', '정상요금 적용', '총비용'], option => [`${option.discounted}개월`, `${option.after}개월`, won(option.total)]];
        },
        charging(data, options) {
            if (data.firstKwh + data.secondKwh === 0) throw new RangeError('비교할 월 충전량을 한 곳 이상 입력해 주세요.');
            const ranked = math.rankOptions(options, option => math.chargingCosts(option, data.firstKwh, data.secondKwh), 'total');
            return ['충전카드별 월 충전비 순위', ranked, 'total', '낮은 비용',
                `같은 월 충전량 ${dec(data.firstKwh)}kWh와 ${dec(data.secondKwh)}kWh에 결제수단별 단가를 적용하고 월 고정비를 더합니다.`,
                '입력한 충전기와 결제수단만 비교합니다. 요금이 표시되지 않거나 해당 카드로 이용할 수 없는 곳은 후보에 넣지 마세요. 주차료와 시간대별 차이는 별도로 확인하세요.',
                ['충전기 1', '충전기 2', '월 고정비', '월 합계'], option => [won(option.firstCost), won(option.secondCost), won(option.fee), won(option.total)]];
        },
        rental(data, options) {
            const key = data.order === 'buying' ? 'buying' : 'returning';
            const ranked = math.rankOptions(options, option => math.rentalCosts(option, data.period), key);
            return [`장기렌트 ${key === 'buying' ? '인수' : '반납'} 비용 순위`, ranked, key, '낮은 비용',
                `월 실납부액을 ${data.period}개월 합산하고 초기 납부금과 만기 비용을 반영한 뒤 반환 보증금을 뺍니다.`,
                '동일 차량·계약기간·약정거리 기준의 입력 견적을 비교합니다. 인수와 반납의 현금 지출을 각각 표시합니다. 인수 후 차량 가치, 운행비, 확정되지 않은 위약금은 포함하지 않습니다.',
                ['초기 납부액', '만기 반납 총비용', '만기 인수 총비용'], option => [won(option.initial), won(option.returning), won(option.buying)]];
        },
        card(data, options) {
            const spend = data.firstSpend + data.secondSpend + data.thirdSpend + data.otherSpend;
            if (spend === 0) throw new RangeError('비교할 월 결제액을 한 항목 이상 입력해 주세요.');
            const ranked = math.rankOptions(options, option => math.cardRewards(option, data.firstSpend, data.secondSpend, data.thirdSpend, data.otherSpend), 'annual', true);
            return ['같은 소비의 카드 순혜택 순위', ranked, 'annual', '높은 혜택',
                '전월실적을 충족한 카드만 입력한 할인율과 월 통합 한도를 적용합니다. 월 혜택의 12배에서 연회비를 빼고 연간 총 결제액과 비교합니다.',
                '같은 소비가 12개월 유지된다고 가정합니다. 카드별 실적 제외 항목을 직접 반영하세요. 업종별 한도, 건당 조건, 신규 발급 우대와 포인트 환산 차이는 포함하지 않습니다.',
                ['실적 충족', '월 혜택', '연 순혜택', '실질 혜택률'], option => [option.qualified ? '충족' : '미충족', won(option.monthly), won(option.annual), pct(option.effective)]];
        }
    };

    function hideError(error) {
        error.hidden = true;
        error.textContent = '';
    }

    function showError(error, message, focus = true) {
        el('resultBox').style.display = 'none';
        error.textContent = message;
        error.hidden = false;
        if (focus) error.focus();
    }

    function bindInputs(form, error, calculate) {
        form.addEventListener('input', () => hideError(error));
        form.addEventListener('change', () => hideError(error));
        form.addEventListener('invalid', event => {
            event.preventDefault();
            if (event.target === form.querySelector('input:invalid, select:invalid')) {
                showError(error, `${fieldName(event.target)}의 값과 허용 범위를 확인해 주세요.`);
            }
        }, true);
        form.addEventListener('submit', event => {
            event.preventDefault();
            hideError(error);
            if (!form.checkValidity()) return;
            try { calculate(); }
            catch (problem) { showError(error, problem.message); }
        });
    }

    function bindComparison(form, error, kind) {
        const pane = form.querySelector('[data-options]');
        const template = form.querySelector('template');
        const add = form.querySelector('[data-add-option]');
        let nextId = pane.children.length;
        function updateActions() {
            add.disabled = pane.children.length >= 6;
            [...pane.querySelectorAll('[data-remove-option]')].forEach(button => {
                button.disabled = pane.children.length <= 2;
            });
        }
        function invalidate() {
            form.dispatchEvent(new Event('input', { bubbles: true }));
            const result = el('resultBox');
            if (result?.style.display === 'block') result.style.display = 'none';
        }
        updateActions();
        add.addEventListener('click', () => {
            if (pane.children.length >= 6) return;
            const option = template.content.firstElementChild.cloneNode(true);
            const id = ++nextId;
            option.querySelector('[data-option-number]').textContent = id;
            option.querySelector('[data-option-heading]').textContent = `비교 조건 ${id}`;
            option.querySelectorAll('input').forEach(input => {
                const label = option.querySelector(`label[for="${input.id}"]`);
                input.id = `${input.id}-${id}`;
                label.htmlFor = input.id;
            });
            pane.append(option);
            bindMoneyInputs();
            updateActions();
            invalidate();
            option.querySelector('input').focus();
        });
        pane.addEventListener('click', event => {
            const button = event.target.closest('[data-remove-option]');
            if (!button || pane.children.length <= 2) return;
            button.closest('[data-compare-option]').remove();
            updateActions();
            invalidate();
            add.focus();
        });
        bindInputs(form, error, () => {
            const options = [...pane.children].map((option, index) => {
                const data = read(option);
                return { ...data, name: data.name || `조건 ${index + 1}` };
            });
            const [title, ranked, key, label, formula, note, columns, cells] =
                comparisons[kind](read(form.querySelector('[data-common]')), options);
            const leaders = ranked.filter(option => option.rank === 1);
            report(title, [[`가장 ${label}`, won(leaders[0][key])],
                ['1위 조건', leaders.map(option => option.name).join(' · ')], ['비교한 조건', `${ranked.length}개`]],
                formula, note, [['조건', '순위', ...columns], ranked.map(option => [option.name, `${option.rank}위`, ...cells(option)])]);
        });
    }

    const currencyApi = 'https://api.frankfurter.dev/v2/rates';
    function bindCurrency(form, error) {
        const status = el('currencyChangeStatus');
        const period = form.elements.period;
        const refresh = form.querySelector('button');
        let observations = null;
        let busy = false;
        function render(focus) {
            const result = math.currencyChanges(observations, period.value);
            report('주요 통화의 원화 기준 변동률 순위',
                [['비교 기간', period.value === 'week' ? '최근 1주' : '최근 1개월'],
                    ['이전 공통 관측일', result.start], ['최근 공통 관측일', result.latest]],
                '외화 1단위당 원화 가격의 변화를 비교합니다. 엔화 가격은 100엔 기준으로 표시하되 변동률은 단위에 영향을 받지 않습니다.',
                '자료는 Frankfurter를 통해 조회한 ECB 영업일 참고환율입니다. 공통 영업일 기준으로 비교하며 은행 고시환율·실시간 체결 시세와 다를 수 있습니다.',
                [['통화', '순위', '이전 참고환율', '최근 참고환율', '변동률'], result.rows.map(option => {
                    const factor = option.code === 'JPY' ? 100 : 1;
                    return [`${option.name} (${option.code})`, `${option.rank}위`, `${dec(option.previous * factor, 4)}원`,
                        `${dec(option.current * factor, 4)}원`, diffPercent(option.change)];
                })], focus);
            status.textContent = `${result.latest} 공통 관측일 자료를 표시하고 있습니다.`;
        }
        async function refreshRates(focus) {
            if (busy) return;
            busy = true;
            period.disabled = refresh.disabled = true;
            hideError(error);
            el('resultBox').style.display = 'none';
            status.textContent = '공통 기준일의 참고환율을 불러오고 있습니다.';
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 7000);
            try {
                const query = new URLSearchParams({
                    base: 'KRW', quotes: Object.keys(math.currencies).join(','), providers: 'ECB',
                    from: math.dateString(Date.now() - 55 * 86400000)
                });
                const response = await fetch(`${currencyApi}?${query}`, { signal: controller.signal, credentials: 'omit' });
                if (!response.ok) throw new Error('API unavailable');
                const data = await response.json();
                if (!Array.isArray(data)) throw new Error('Invalid rates');
                observations = data;
                render(focus);
            } catch (problem) {
                observations = null;
                status.textContent = '';
                showError(error, problem instanceof RangeError ? problem.message :
                    '참고환율을 불러오지 못했습니다. 다시 조회하거나 ECB 공식 표를 확인해 주세요.', focus);
            } finally {
                clearTimeout(timeout);
                busy = false;
                period.disabled = refresh.disabled = false;
            }
        }
        form.addEventListener('submit', event => {
            event.preventDefault();
            refreshRates(true);
        });
        period.addEventListener('change', () => {
            if (!observations) return;
            try { render(true); }
            catch (problem) { showError(error, problem.message); status.textContent = ''; }
        });
        refreshRates(false);
    }

    document.addEventListener('DOMContentLoaded', () => {
        const form = document.querySelector('[data-practical-tool]');
        if (!form) return;
        const error = el('practicalError');
        const kind = form.dataset.practicalTool;
        if (kind === 'currency') bindCurrency(form, error);
        else if (Object.hasOwn(comparisons, kind)) bindComparison(form, error, kind);
        else bindInputs(form, error, () => {
            const data = read(form);
            if (kind === 'jeonse' && data.previous === 0) throw new RangeError('기존 보증금을 0원보다 크게 입력해 주세요.');
            calculators[kind](data);
        });
    });
})();
