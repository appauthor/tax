(function () {
    'use strict';
    document.addEventListener('DOMContentLoaded', () => {
        const get = id => document.getElementById(id);
        const currency = get('fxCurrency'), rate = get('fxBaseRate'), button = get('fxFetchRate');
        if (!currency || !rate || !button) return;
        const status = get('fxRateStatus'), provenance = get('fxRateProvenance');
        const units = { USD: 1, JPY: 100, EUR: 1, CNY: 1 };
        let revision = 0, controller, applying = false;
        function cancel() {
            revision++;
            controller?.abort(); controller = null;
            button.disabled = !units[currency.value];
            button.removeAttribute('aria-busy'); button.textContent = '최신 고시환율 가져오기';
        }
        function manual() {
            if (applying) return;
            cancel();
            delete rate.dataset.sourceDescription;
            provenance.textContent = '';
            status.textContent = rate.value ? '직접 입력한 매매기준율을 사용합니다.' : '최신 고시환율을 가져오거나 매매기준율을 직접 입력하세요.';
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
            button.disabled = true; button.setAttribute('aria-busy', 'true'); button.textContent = '고시환율 조회 중…';
            status.textContent = '하나은행의 최신 고시환율을 확인하고 있습니다. 직접 입력해도 됩니다.';
            try {
                const response = await fetch('/api/exchange-rates', { signal: requestController.signal, cache: 'no-store', headers: { Accept: 'application/json' } });
                if (!response.ok) throw new Error('Lookup failed');
                const data = await response.json(), quote = data.rates?.[code];
                if (data.source !== '하나은행' || !quote || typeof quote.baseRate !== 'number' || !Number.isFinite(quote.baseRate) || quote.baseRate <= 0 || quote.baseRate > 1e9 || quote.quoteUnit !== units[code] || !Number.isInteger(data.sequence) || data.sequence < 1) throw new Error('Invalid quotation');
                const published = dateLabel(data.publishedAt), fetched = dateLabel(data.fetchedAt);
                const age = Date.now() - Date.parse(data.publishedAt), fetchAge = Date.now() - Date.parse(data.fetchedAt);
                if (age < -300000 || age > 14 * 86400000 || fetchAge < -300000 || fetchAge > 300000) throw new Error('Outdated quotation');
                if (ticket !== revision || code !== currency.value || rate.value !== initial) return;
                applying = true;
                rate.value = String(quote.baseRate);
                rate.dataset.sourceDescription = `하나은행 · ${published} KST · ${data.sequence}회차 · ${quote.quoteUnit} ${code} 기준`;
                rate.dispatchEvent(new Event('input', { bubbles: true }));
                applying = false;
                provenance.textContent = `${rate.dataset.sourceDescription} · 조회 ${fetched} KST`;
                status.textContent = '고시환율을 적용했습니다. 거래할 금융회사의 기준율로 직접 수정할 수 있습니다.';
            } catch {
                if (ticket === revision) status.textContent = rate.value ? '새 고시환율을 가져오지 못했습니다. 기존 입력값을 유지합니다. 은행에서 확인한 값으로 직접 수정할 수 있습니다.' : '고시환율을 가져오지 못했습니다. 하나은행에서 확인하거나 매매기준율을 직접 입력해 주세요.';
            } finally {
                clearTimeout(timeout);
                if (ticket === revision) {
                    controller = null; button.disabled = false;
                    button.removeAttribute('aria-busy'); button.textContent = '최신 고시환율 가져오기';
                }
            }
        }
        rate.addEventListener('input', manual);
        rate.addEventListener('change', manual);
        get('fxQuoteUnit').addEventListener('change', manual);
        currency.addEventListener('change', () => {
            delete rate.dataset.sourceDescription; provenance.textContent = '';
            load();
        });
        button.addEventListener('click', load);
        load();
    });
})();
