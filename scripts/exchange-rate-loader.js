(function () {
    'use strict';
    document.addEventListener('DOMContentLoaded', () => {
        const get = id => document.getElementById(id);
        const currency = get('fxCurrency'), rate = get('fxBaseRate'), button = get('fxFetchRate');
        if (!currency || !rate || !button) return;
        const status = get('fxRateStatus'), provenance = get('fxRateProvenance');
        const units = PersonalFinanceMath.exchangeQuoteUnits;
        let revision = 0, controller, applying = false;
        function cancel() {
            revision++;
            controller?.abort(); controller = null;
            button.disabled = !units[currency.value];
            button.removeAttribute('aria-busy'); button.textContent = '참고환율 불러오기';
        }
        function manual() {
            if (applying) return;
            cancel();
            delete rate.dataset.sourceDescription;
            delete rate.dataset.referenceRate;
            provenance.textContent = '';
            status.textContent = rate.value ? '직접 입력한 환율을 사용합니다. 거래 은행의 매매기준율을 입력할 수 있습니다.' : '참고환율을 불러오거나 거래 은행의 매매기준율을 직접 입력하세요.';
        }
        function dateLabel(value) {
            const d = new Date(value);
            if (!Number.isFinite(d.getTime())) throw new Error('Invalid date');
            return new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).format(d);
        }
        async function load() {
            cancel();
            const code = currency.value, ticket = revision, initial = rate.value;
            if (!units[code]) {
                delete rate.dataset.sourceDescription; provenance.textContent = '';
                status.textContent = '기타 통화는 고시 단위와 매매기준율을 직접 입력하세요.';
                return;
            }
            controller = new AbortController();
            const requestController = controller;
            const timeout = setTimeout(() => requestController.abort(), 10000);
            button.disabled = true; button.setAttribute('aria-busy', 'true'); button.textContent = '참고환율 조회 중…';
            status.textContent = 'Frankfurter 참고환율을 확인하고 있습니다. 거래 은행의 매매기준율을 직접 입력해도 됩니다.';
            try {
                const response = await fetch(`https://api.frankfurter.dev/v2/rate/${code}/KRW`, {
                    signal: requestController.signal, mode: 'cors', credentials: 'omit', referrerPolicy: 'no-referrer',
                    headers: { Accept: 'application/json' }
                });
                if (!response.ok) throw new Error('Lookup failed');
                const data = await response.json();
                const now = new Date(), parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
                const today = ['year', 'month', 'day'].map(type => parts.find(p => p.type === type).value).join('-');
                const quote = PersonalFinanceMath.normalizeReferenceRate(data, code, today);
                if (ticket !== revision || code !== currency.value || rate.value !== initial) return;
                applying = true;
                rate.value = String(quote.baseRate);
                rate.dataset.referenceRate = 'true';
                rate.dataset.sourceDescription = `Frankfurter 참고환율 · 기준일 ${quote.date} · ${quote.quoteUnit} ${code} 기준 · 조회 ${dateLabel(now)} KST`;
                rate.dispatchEvent(new Event('input', { bubbles: true }));
                applying = false;
                provenance.textContent = rate.dataset.sourceDescription;
                status.textContent = `${quote.ageDays > 3 ? '기준일이 3일 넘게 지난 참고환율입니다.' : '참고환율을 적용했습니다.'} 은행 고시 매매기준율과 다를 수 있으므로 실제 거래 은행의 값으로 직접 수정하세요.`;
            } catch (error) {
                if (ticket === revision) status.textContent = error.message === 'Outdated reference rate'
                    ? '참고환율 기준일이 7일을 넘었거나 미래 날짜여서 적용하지 않았습니다. 기존 값은 유지되며 직접 입력할 수 있습니다.'
                    : rate.value ? '참고환율을 가져오지 못했습니다. 기존 입력값을 유지합니다. 거래 은행의 매매기준율로 직접 수정할 수 있습니다.' : '참고환율을 가져오지 못했습니다. 거래 은행의 매매기준율을 직접 입력해 주세요.';
            } finally {
                clearTimeout(timeout);
                if (ticket === revision) {
                    controller = null; button.disabled = false;
                    button.removeAttribute('aria-busy'); button.textContent = '참고환율 불러오기';
                }
            }
        }
        rate.addEventListener('input', manual);
        rate.addEventListener('change', manual);
        get('fxQuoteUnit').addEventListener('change', manual);
        currency.addEventListener('change', () => {
            delete rate.dataset.sourceDescription; provenance.textContent = '';
            delete rate.dataset.referenceRate;
            load();
        });
        button.addEventListener('click', load);
        load();
    });
})();
