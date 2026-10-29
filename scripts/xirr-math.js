(function (global) {
    'use strict';

    const MAX_ROWS = 200;
    const MIN_RATE = -0.999999;
    const MAX_RATE = 1000000;
    const DAY = 86400000;

    function dateDay(value) {
        if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new RangeError('날짜는 YYYY-MM-DD 형식으로 입력하세요.');
        const [year, month, day] = value.split('-').map(Number);
        const time = Date.UTC(year, month - 1, day);
        if (year < 1900 || year > 2199 || new Date(time).toISOString().slice(0, 10) !== value) throw new RangeError('1900~2199년의 실제 달력 날짜를 입력하세요.');
        return time / DAY;
    }

    function amount(value) {
        if (typeof value !== 'number' || !Number.isFinite(value) || Math.abs(value) > 1e12) throw new RangeError('각 금액은 절댓값 1조 이하의 숫자로 입력하세요.');
        const cents = Math.round(value * 100);
        if (Number(value.toFixed(2)) !== value) throw new RangeError('금액은 소수 둘째 자리까지 입력하세요.');
        return cents;
    }

    function prepare(flows, terminal) {
        if (!Array.isArray(flows) || flows.length < 1 || flows.length > MAX_ROWS) throw new RangeError(`현금흐름은 1~${MAX_ROWS}행으로 입력하세요.`);
        const entries = flows.map(row => ({ date: row.date, day: dateDay(row.date), cents: amount(row.amount), terminal: false }));
        if (!entries.some(row => row.cents < 0)) throw new RangeError('투자금(음수)을 한 건 이상 입력하세요.');
        if (terminal) {
            const day = dateDay(terminal.date), cents = amount(terminal.amount);
            if (cents < 0) throw new RangeError('잔여 평가금액은 0 이상이어야 합니다.');
            if (entries.some(row => row.day > day)) throw new RangeError('평가일은 모든 입출금 날짜와 같거나 이후여야 합니다.');
            entries.push({ date: terminal.date, day, cents, terminal: true });
        }
        entries.sort((a, b) => a.day - b.day);
        const first = entries[0], last = entries.at(-1);
        if (last.day - first.day > 36525) throw new RangeError('계산 기간은 100년(36,525일) 이내로 입력하세요.');
        const absolute = entries.reduce((sum, row) => sum + Math.abs(row.cents), 0);
        if (absolute > 1e15) throw new RangeError('입출금과 평가금액의 절댓값 합계는 10조 이하로 입력하세요.');
        const groups = new Map();
        entries.forEach(row => groups.set(row.day, (groups.get(row.day) || 0) + row.cents));
        const terms = Array.from(groups, ([day, cents]) => ({ years: (day - first.day) / 365, value: cents / 100 })).filter(row => row.value !== 0);
        let signChanges = 0;
        terms.forEach((row, i) => { if (i && Math.sign(row.value) !== Math.sign(terms[i - 1].value)) signChanges++; });
        const invested = -entries.filter(row => row.cents < 0).reduce((sum, row) => sum + row.cents, 0) / 100;
        const recovered = entries.filter(row => row.cents > 0 && !row.terminal).reduce((sum, row) => sum + row.cents, 0) / 100;
        const terminalValue = terminal ? entries.find(row => row.terminal).cents / 100 : 0;
        return { terms, signChanges, invested, recovered, terminalValue, entries, firstDate: first.date, lastDate: last.date, days: last.day - first.day };
    }

    // Scaling preserves the sign and avoids exponent overflow near -100%.
    function scaledValue(terms, x) {
        const shift = Math.max(...terms.map(row => -row.years * x));
        let sum = 0, size = 0, compensation = 0;
        terms.forEach(row => {
            const value = row.value * Math.exp(-row.years * x - shift);
            const corrected = value - compensation, next = sum + corrected;
            compensation = (next - sum) - corrected;
            sum = next;
            size += Math.abs(value);
        });
        return { sum, relative: size ? Math.abs(sum) / size : 0 };
    }

    function bisect(terms, left, right) {
        let a = scaledValue(terms, left).sum;
        for (let i = 0; i < 180; i++) {
            const mid = (left + right) / 2, value = scaledValue(terms, mid);
            if (value.relative < 1e-13 || right - left < 1e-13) return mid;
            if (Math.sign(value.sum) === Math.sign(a)) { left = mid; a = value.sum; } else right = mid;
        }
        return (left + right) / 2;
    }

    function findCandidates(terms, signChanges) {
        if (!terms.length || !signChanges) return [];
        const low = Math.log1p(MIN_RATE), high = Math.log1p(MAX_RATE);
        const roots = [];
        const add = x => { if (!roots.some(old => Math.abs(old - x) < 1e-6)) roots.push(x); };
        if (scaledValue(terms, 0).relative < 1e-13) add(0);
        // One sign change implies at most one root; use the entire bracket.
        const points = signChanges === 1 ? [low, 0, high] : Array.from({ length: 4097 }, (_, i) => low + (high - low) * i / 4096).concat(0).sort((a, b) => a - b);
        let previous = points[0], previousValue = scaledValue(terms, previous);
        if (previousValue.relative < 1e-13) add(previous);
        for (const x of points.slice(1)) {
            const value = scaledValue(terms, x);
            if (value.relative < 1e-13) add(x);
            else if (previousValue.sum && Math.sign(value.sum) !== Math.sign(previousValue.sum)) add(bisect(terms, previous, x));
            previous = x;
            previousValue = value;
        }
        return roots.sort((a, b) => a - b).map(x => Math.expm1(x));
    }

    function npv(terms, rate) {
        if (!Number.isFinite(rate) || rate <= -1) throw new RangeError('할인율은 -100%보다 커야 합니다.');
        const x = Math.log1p(rate);
        const value = terms.reduce((sum, row) => sum + row.value * Math.exp(-row.years * x), 0);
        return Number.isFinite(value) ? value : null;
    }

    function calculate({ flows, terminal = null, targetRate = 0 }) {
        if (typeof targetRate !== 'number' || !Number.isFinite(targetRate) || targetRate < -0.99 || targetRate > 10) throw new RangeError('비교할 목표 연수익률은 -99~1,000%로 입력하세요.');
        const data = prepare(flows, terminal);
        const candidates = findCandidates(data.terms, data.signChanges);
        const status = !data.terms.length ? 'indeterminate' : data.days === 0 ? 'same-day' : data.signChanges === 0 ? 'no-root' : data.signChanges > 1 ? 'non-conventional' : candidates.length === 1 ? 'unique' : 'outside-range';
        const rate = status === 'unique' ? candidates[0] : null;
        const profit = data.recovered + data.terminalValue - data.invested;
        return { ...data, status, rate, candidates, profit, simpleReturn: profit / data.invested,
            targetRate, targetNpv: npv(data.terms, targetRate), residual: rate === null ? null : npv(data.terms, rate), minRate: MIN_RATE, maxRate: MAX_RATE };
    }

    function parseText(text) {
        if (typeof text !== 'string' || text.length > 50000) throw new RangeError('붙여넣기는 50,000자 이내로 입력하세요.');
        const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).map(line => line.trim()).filter(Boolean);
        if (!lines.length) throw new RangeError('날짜와 금액 2열을 붙여넣으세요.');
        const rows = [];
        lines.forEach((line, i) => {
            const cells = line.includes('\t') ? line.split('\t') : line.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/);
            if (cells.length !== 2) throw new RangeError(`${i + 1}행은 날짜·금액 2열이어야 합니다. 금액의 천 단위 쉼표는 탭 구분 또는 따옴표를 사용하세요.`);
            const [rawDate, rawAmount] = cells.map(cell => cell.trim().replace(/^"(.*)"$/, '$1').trim());
            if (i === 0 && /^(date|날짜|거래일)$/i.test(rawDate) && /^(amount|금액|현금흐름)$/i.test(rawAmount)) return;
            const date = rawDate.replace(/[/.]/g, '-');
            const match = date.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
            const normalized = match ? `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}` : date;
            try { dateDay(normalized); } catch { throw new RangeError(`${i + 1}행의 날짜를 확인하세요. YYYY-MM-DD 형식을 사용하세요.`); }
            if (!/^[+-]?(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?$/.test(rawAmount)) throw new RangeError(`${i + 1}행의 금액을 확인하세요. 투자금은 음수, 회수금은 양수로 입력하세요.`);
            const value = Number(rawAmount.replace(/,/g, ''));
            amount(value);
            rows.push({ date: normalized, amount: value });
        });
        if (!rows.length || rows.length > MAX_ROWS) throw new RangeError(`붙여넣기 데이터는 1~${MAX_ROWS}행이어야 합니다.`);
        return rows;
    }

    global.XirrMath = Object.freeze({ calculate, parseText, dateDay, MAX_ROWS });
})(typeof window !== 'undefined' ? window : globalThis);
