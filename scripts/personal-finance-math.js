(function (global) {
    'use strict';
    const MAX_MONEY = 1e12;
    function value(raw, label, min = 0, max = MAX_MONEY) {
        if (raw == null || typeof raw === 'boolean' || String(raw).trim() === '') throw new RangeError(`${label}을(를) 입력해 주세요.`);
        const n = Number(raw);
        if (!Number.isFinite(n) || n < min || n > max) throw new RangeError(`${label}은(는) ${min.toLocaleString()}~${max.toLocaleString()} 범위로 입력해 주세요.`);
        return n;
    }
    function won(raw, label) {
        const n = value(raw, label);
        if (!Number.isSafeInteger(n)) throw new RangeError(`${label}은(는) 원 단위 정수로 입력해 주세요.`);
        return n;
    }
    function checked(n) {
        if (!Number.isFinite(n) || Math.abs(n) > 1e15) throw new RangeError('결과가 계산 지원 범위를 넘습니다. 금액·기간·수익률을 줄여 주세요.');
        return n;
    }
    function calculateExchange(input) {
        const amount = value(input.amount, '환전 금액', Number.MIN_VALUE);
        const baseRate = value(input.baseRate, '매매기준율', 0.000001, 1e9);
        const quoteUnit = value(input.quoteUnit, '고시 기준 단위', 1, 1000000);
        if (!Number.isInteger(quoteUnit)) throw new RangeError('고시 기준 단위는 정수로 입력하세요.');
        if (!['buy', 'sell'].includes(input.direction) || !['foreign', 'won'].includes(input.amountType)) throw new RangeError('환전 방향과 금액 기준을 선택해 주세요.');
        if (!Array.isArray(input.conditions) || input.conditions.length !== 2) throw new RangeError('비교 조건 두 개를 입력하세요.');
        const results = input.conditions.map((condition, i) => {
            const spread = value(condition.spread, `조건 ${i + 1} 기본 수수료율`, 0, 50) / 100;
            const preference = value(condition.preference, `조건 ${i + 1} 우대율`, 0, 100) / 100;
            const fixedFee = won(condition.fixedFee, `조건 ${i + 1} 추가 수수료`);
            const ratePerUnit = baseRate * (1 + (input.direction === 'buy' ? 1 : -1) * spread * (1 - preference));
            const perCurrency = ratePerUnit / quoteUnit;
            let foreignAmount, krw;
            if (input.amountType === 'foreign') {
                foreignAmount = amount;
                krw = foreignAmount * perCurrency + (input.direction === 'buy' ? fixedFee : -fixedFee);
            } else {
                if (input.direction === 'buy' && amount <= fixedFee) throw new RangeError(`조건 ${i + 1}: 원화 예산은 추가 수수료보다 커야 합니다.`);
                krw = amount;
                foreignAmount = (amount + (input.direction === 'buy' ? -fixedFee : fixedFee)) / perCurrency;
            }
            if (krw < 0) throw new RangeError(`조건 ${i + 1}: 수령액보다 추가 수수료가 큽니다.`);
            const spreadCost = foreignAmount * baseRate / quoteUnit * spread * (1 - preference);
            const undiscountedCost = foreignAmount * baseRate / quoteUnit * spread;
            return { foreignAmount: checked(foreignAmount), krw: checked(krw), ratePerUnit,
                spreadCost, fixedFee, totalCost: spreadCost + fixedFee, preferenceSaving: undiscountedCost - spreadCost };
        });
        // Compare the same requested amount, not fees on unequal foreign amounts in reverse mode.
        const scores = results.map(r => input.amountType === 'foreign' ? (input.direction === 'buy' ? -r.krw : r.krw) : (input.direction === 'buy' ? r.foreignAmount : -r.foreignAmount));
        const difference = Math.abs(scores[0] - scores[1]);
        return { results, quoteUnit, baseRate, amountType: input.amountType, direction: input.direction,
            winner: difference < 1e-8 ? null : scores[0] > scores[1] ? 0 : 1, difference,
            differenceUnit: input.amountType === 'foreign' ? 'KRW' : 'foreign' };
    }

    function retirementPlan(input) {
        const currentAge = value(input.currentAge, '현재 나이', 18, 100);
        const retirementAge = value(input.retirementAge, '은퇴 나이', currentAge, 100);
        const endAge = value(input.endAge, '계획 종료 나이', retirementAge, 120);
        const pensionAge = value(input.pensionAge, '연금 시작 나이', retirementAge, 120);
        if (![currentAge, retirementAge, endAge, pensionAge].every(Number.isInteger) || endAge <= retirementAge) throw new RangeError('나이는 정수로, 계획 종료 나이는 은퇴 나이보다 크게 입력하세요.');
        const assets = won(input.assets, '현재 금융자산'), saving = won(input.monthlySaving, '은퇴 전 월 저축액');
        const expense = won(input.monthlyExpense, '현재 가치의 월 생활비'), pension = won(input.monthlyPension, '첫 수령 시점의 월 연금');
        const annualReturn = value(input.annualReturn, '세후 연수익률', -50, 50) / 100;
        const inflation = value(input.inflation, '연 물가상승률', -5, 20) / 100;
        const pensionGrowth = value(input.pensionGrowth, '연금 연 증가율', -5, 20) / 100;
        const rate = Math.pow(1 + annualReturn, 1 / 12) - 1;
        const priceFactor = Math.pow(1 + inflation, 1 / 12);
        const pensionFactor = Math.pow(1 + pensionGrowth, 1 / 12);
        const beforeMonths = (retirementAge - currentAge) * 12;
        const months = (endAge - retirementAge) * 12;
        const pensionOffset = (pensionAge - retirementAge) * 12;
        let retirementAssets = assets;
        for (let i = 0; i < beforeMonths; i++) retirementAssets = checked(retirementAssets * (1 + rate) + saving);
        const flows = Array.from({ length: months }, (_, i) => ({
            expense: checked(expense * Math.pow(priceFactor, beforeMonths + i)),
            pension: i >= pensionOffset ? checked(pension * Math.pow(pensionFactor, i - pensionOffset)) : 0
        }));
        // Minimum initial fund with no borrowing against later pension receipts.
        let requiredFund = 0;
        for (let i = months - 1; i >= 0; i--) requiredFund = checked(Math.max(0, (requiredFund + flows[i].expense - flows[i].pension) / (1 + rate)));
        let balance = retirementAssets, firstShortfallMonth = null, shortfall = 0;
        const yearly = [];
        let yearlyExpense = 0, yearlyPension = 0, yearlyShortfall = 0;
        flows.forEach((flow, i) => {
            const available = checked(balance * (1 + rate) + flow.pension);
            const missing = Math.max(0, flow.expense - available);
            if (missing > 0.01 && firstShortfallMonth === null) firstShortfallMonth = i + 1;
            shortfall += missing;
            balance = Math.max(0, available - flow.expense);
            yearlyExpense += flow.expense; yearlyPension += flow.pension; yearlyShortfall += missing;
            if ((i + 1) % 12 === 0) {
                yearly.push({ age: retirementAge + (i + 1) / 12, balance, expense: yearlyExpense, pension: yearlyPension, shortfall: yearlyShortfall });
                yearlyExpense = 0; yearlyPension = 0; yearlyShortfall = 0;
            }
        });
        return { currentAge, retirementAge, endAge, retirementAssets, requiredFund,
            gap: requiredFund - retirementAssets, retirementMonthlyExpense: flows[0].expense,
            firstShortfallMonth, shortfall, endBalance: balance, yearly, months };
    }
    function calculateRetirement(input) {
        const result = retirementPlan(input);
        const rate = Number(input.annualReturn);
        return { ...result, scenarios: [-2, 0, 2].map(change => {
            const annualReturn = Math.max(-50, Math.min(50, rate + change));
            const scenario = retirementPlan({ ...input, annualReturn });
            return { annualReturn, requiredFund: scenario.requiredFund, retirementAssets: scenario.retirementAssets,
                firstShortfallMonth: scenario.firstShortfallMonth, endBalance: scenario.endBalance };
        }) };
    }

    function distribute(total, weights) {
        const sum = weights.reduce((a, b) => a + b, 0);
        if (total === 0) return weights.map(() => 0);
        if (sum <= 0) throw new RangeError('추가 자금을 배분할 대상이 없습니다.');
        const raw = weights.map(w => total * w / sum), amounts = raw.map(Math.floor);
        let left = total - amounts.reduce((a, b) => a + b, 0);
        const order = raw.map((n, i) => ({ i, remainder: n - amounts[i] })).sort((a, b) => b.remainder - a.remainder || a.i - b.i);
        for (let j = 0; j < left; j++) amounts[order[j % order.length].i]++;
        return amounts;
    }
    function calculateRebalancing(input) {
        if (!Array.isArray(input.rows) || input.rows.length < 2 || input.rows.length > 20) throw new RangeError('자산은 2~20개로 입력해 주세요.');
        if (!['full', 'buy-only'].includes(input.mode)) throw new RangeError('리밸런싱 방식을 선택해 주세요.');
        const extraCash = won(input.extraCash, '추가 투자금');
        const rows = input.rows.map((row, i) => ({ name: String(row.name || `자산 ${i + 1}`).trim().slice(0, 32) || `자산 ${i + 1}`,
            current: won(row.current, `자산 ${i + 1} 평가액`), targetWeight: value(row.targetWeight, `자산 ${i + 1} 목표 비중`, 0, 100) }));
        const weightSum = rows.reduce((sum, r) => sum + r.targetWeight, 0);
        if (rows.some(r => Number(r.targetWeight.toFixed(2)) !== r.targetWeight)) throw new RangeError('목표 비중은 소수 둘째 자리까지 입력해 주세요.');
        if (Math.abs(weightSum - 100) > 1e-7) throw new RangeError(`목표 비중 합계를 100%로 맞춰 주세요. 현재 ${Number(weightSum.toFixed(6))}%입니다.`);
        const currentTotal = rows.reduce((sum, r) => sum + r.current, 0), total = currentTotal + extraCash;
        if (total <= 0 || total > MAX_MONEY) throw new RangeError('현재 자산과 추가 투자금 합계는 0원 초과~1조원으로 입력하세요.');
        const targets = distribute(total, rows.map(r => r.targetWeight));
        const deficits = rows.map((r, i) => Math.max(0, targets[i] - r.current));
        const buys = input.mode === 'buy-only' ? distribute(extraCash, deficits) : null;
        const results = rows.map((r, i) => {
            const trade = buys ? buys[i] : targets[i] - r.current;
            const finalValue = r.current + trade;
            return { ...r, target: targets[i], trade, finalValue, currentWeight: currentTotal ? r.current / currentTotal * 100 : 0,
                finalWeight: finalValue / total * 100, deviation: finalValue / total * 100 - r.targetWeight };
        });
        const impossibleWithoutSale = rows.some(r => r.targetWeight === 0 && r.current > 0);
        const minimum = impossibleWithoutSale ? null : Math.max(0, Math.ceil(Math.max(...rows.filter(r => r.targetWeight > 0).map(r => r.current * 100 / r.targetWeight - currentTotal)) - 1e-6));
        const minimumAdditionalExceedsLimit = minimum != null && (!Number.isFinite(minimum) || minimum > MAX_MONEY);
        const minimumAdditionalCash = minimumAdditionalExceedsLimit ? null : minimum;
        return { rows: results, currentTotal, extraCash, total, minimumAdditionalCash, impossibleWithoutSale, minimumAdditionalExceedsLimit,
            totalBuy: results.reduce((s, r) => s + Math.max(0, r.trade), 0), totalSell: results.reduce((s, r) => s + Math.max(0, -r.trade), 0),
            maximumDeviation: Math.max(...results.map(r => Math.abs(r.deviation))) };
    }
    global.PersonalFinanceMath = { calculateExchange, retirementPlan, calculateRetirement, calculateRebalancing };
})(typeof window !== 'undefined' ? window : globalThis);
