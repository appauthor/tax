(function (global) {
    'use strict';
    const MAX_MONEY = 1e12;
    // Input display units shared by reference-rate validation and both UI controllers.
    const exchangeQuoteUnits = Object.freeze({ USD: 1, JPY: 100, CNY: 1, EUR: 1,
        VND: 100, THB: 1, TWD: 1, PHP: 1, HKD: 1, SGD: 1, MYR: 1,
        IDR: 100, MOP: 1, AUD: 1, GBP: 1, CAD: 1, NZD: 1 });
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
    function normalizeReferenceRate(data, currency, today) {
        const units = exchangeQuoteUnits;
        const validDate = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) &&
            Number.isFinite(Date.parse(s)) && new Date(s).toISOString().slice(0, 10) === s;
        if (!Object.hasOwn(units, currency) || !data || data.base !== currency || data.quote !== 'KRW' ||
            typeof data.rate !== 'number' || !Number.isFinite(data.rate) || data.rate <= 0 ||
            !validDate(data.date) || !validDate(today)) throw new RangeError('Invalid reference rate');
        const ageDays = (Date.parse(today) - Date.parse(data.date)) / 86400000;
        if (ageDays < 0 || ageDays > 7) throw new RangeError('Outdated reference rate');
        // Only the displayed editable input is rounded; subsequent calculations use that shown rate.
        const baseRate = Number((data.rate * units[currency]).toFixed(6));
        if (baseRate < 0.000001 || baseRate > 1e9) throw new RangeError('Invalid reference rate');
        return { baseRate, quoteUnit: units[currency], date: data.date, ageDays };
    }
    function calculateBondYield(input) {
        const principal = won(input.principal, '만기 상환 액면금액');
        const purchase = won(input.purchase, '매수 결제금액');
        const fee = won(input.fee, '매수 수수료');
        if (!principal || !purchase) throw new RangeError('액면금액과 매수 결제금액은 0원보다 커야 합니다.');
        const couponRate = value(input.couponRate, '연 표면금리', 0, 100) / 100;
        const frequency = Number(input.frequency);
        if (![1, 2, 4, 12].includes(frequency)) throw new RangeError('이자 지급 주기를 선택해 주세요.');
        const { settlement, maturity } = input;
        const { singleOutflowRate, dateDay, MAX_ROWS } = global.XirrMath;
        const startDay = dateDay(settlement);
        const duration = dateDay(maturity) - startDay;
        if (duration <= 0) throw new RangeError('만기일은 매수 결제일보다 늦어야 합니다.');
        if (duration > 36525) throw new RangeError('남은 만기는 100년 이내로 입력해 주세요.');

        const [year, month, day] = maturity.split('-').map(Number);
        const monthEnd = day === new Date(Date.UTC(year, month, 0)).getUTCDate();
        const coupon = principal * couponRate / frequency;
        const schedule = [{ date: maturity, interest: coupon, principal }];
        if (coupon) {
            const monthsPerCoupon = 12 / frequency;
            for (let offset = monthsPerCoupon; ; offset += monthsPerCoupon) {
                const lastDay = new Date(Date.UTC(year, month - offset, 0)).getUTCDate();
                const paymentDay = monthEnd ? lastDay : Math.min(lastDay, day);
                const date = new Date(Date.UTC(year, month - 1 - offset, paymentDay)).toISOString().slice(0, 10);
                if (date <= settlement) break;
                if (schedule.length >= MAX_ROWS - 1) throw new RangeError('이자·원금 지급일이 199개를 넘습니다. 기간과 지급 주기를 확인해 주세요.');
                schedule.push({ date, interest: coupon, principal: 0 });
            }
        }
        schedule.reverse();
        const payments = schedule.map(payment => ({
            years: (dateDay(payment.date) - startDay) / 365,
            value: payment.interest + payment.principal
        }));
        const yieldAt = amount => singleOutflowRate([{ years: 0, value: -amount }, ...payments]);
        const cost = purchase + fee;
        const grossYield = yieldAt(purchase);
        const netYield = fee ? yieldAt(cost) : grossYield;
        const interest = coupon * schedule.length;
        return { grossYield, netYield, cost, interest, principal, profit: principal + interest - cost, schedule };
    }

    function calculateUsStockKrwReturn(input) {
        const shares = value(input.shares, '보유 주식 수', 0.000001, 1e9);
        const entryPrice = value(input.entryPrice, '매수 주가', 0.000001, 1e9);
        const endPrice = value(input.endPrice, '평가·매도 주가', 0, 1e9);
        const entryRate = value(input.entryRate, '매수 때 적용한 환율', 0.000001, 1e7);
        const endRate = value(input.endRate, '평가·매도 때 적용한 환율', 0.000001, 1e7);
        const entryFee = value(input.entryFee, '매수 수수료', 0, 1e9);
        const endFee = value(input.endFee, '평가·매도 수수료', 0, 1e9);
        const tradeCost = entryPrice * shares;
        const tradeValue = endPrice * shares;
        if (endFee > tradeValue) throw new RangeError('평가·매도 수수료는 매도대금 이내로 입력해 주세요.');
        const costUsd = tradeCost + entryFee;
        const proceedsUsd = tradeValue - endFee;
        const costKrw = checked(costUsd * entryRate);
        const proceedsKrw = checked(proceedsUsd * endRate);
        const priceEffect = checked((tradeValue - tradeCost) * entryRate);
        const exchangeEffect = checked(tradeValue * (endRate - entryRate));
        const feeEffect = checked(entryFee * entryRate + endFee * endRate);
        return { costUsd, proceedsUsd, costKrw, proceedsKrw, priceEffect, exchangeEffect, feeEffect,
            profitKrw: proceedsKrw - costKrw, usdReturn: proceedsUsd / costUsd - 1, krwReturn: proceedsKrw / costKrw - 1,
            fxReturn: endRate / entryRate - 1, breakEvenRate: proceedsUsd > 0 ? costKrw / proceedsUsd : null };
    }

    function calculateEtfCostComparison(input) {
        const initial = won(input.initial, '초기 투자금');
        const contribution = won(input.contribution, '월말 추가 투자금');
        if (initial + contribution <= 0) throw new RangeError('초기 투자금이나 월말 추가 투자금을 입력해 주세요.');
        const years = value(input.years, '보유기간', 1, 50);
        if (!Number.isInteger(years)) throw new RangeError('보유기간은 1~50년의 정수로 입력해 주세요.');
        const annualReturn = value(input.annualReturn, '비용 차감 전 연수익률', -99, 100) / 100;
        if (!Array.isArray(input.funds) || input.funds.length !== 2) throw new RangeError('ETF 비용 조건 A와 B를 입력해 주세요.');
        const monthlyGrowth = Math.pow(1 + annualReturn, 1 / 12);
        const months = years * 12;
        function project(annualCost) {
            const monthlyCost = -Math.expm1(Math.log1p(-annualCost) / 12);
            let balance = initial;
            let fees = 0;
            for (let month = 0; month < months; month++) {
                const beforeFee = balance * monthlyGrowth;
                const fee = beforeFee * monthlyCost;
                fees += fee;
                balance = beforeFee - fee + contribution;
            }
            return { balance: checked(balance), fees: checked(fees) };
        }
        const baseline = project(0).balance;
        const results = input.funds.map(fund => {
            const management = value(fund.management, '총보수 또는 TER', 0, 99);
            const other = value(fund.other, '기타비용률', 0, 99);
            const trading = value(fund.trading, '펀드 매매·중개수수료율', 0, 99);
            const annualCost = (management + other + trading) / 100;
            if (annualCost >= 1) throw new RangeError('각 ETF의 연간 비용률 합계는 100% 미만이어야 합니다.');
            const { balance, fees } = project(annualCost);
            return { annualCost, balance, fees, totalImpact: Math.max(0, baseline - balance) };
        });
        return { baseline, invested: initial + contribution * months, results,
            difference: Math.abs(results[0].balance - results[1].balance) };
    }

    function whole(raw, label, min, max) {
        const result = value(raw, label, min, max);
        if (!Number.isInteger(result)) throw new RangeError(`${label}은(는) 정수로 입력해 주세요.`);
        return result;
    }

    function calculateCardInstallment(input) {
        const amount = won(input.amount, '카드 결제금액');
        const months = whole(input.months, '할부 개월 수', 2, 60);
        if (amount < months) throw new RangeError('결제금액은 분할할 개월 수 이상이어야 합니다.');
        if (!['standard', 'free', 'partial'].includes(input.mode)) throw new RangeError('할부 구분을 선택해 주세요.');
        const rate = input.mode === 'free' ? 0 : value(input.rate, '연 할부수수료율', 0, 100) / 100;
        const paidRounds = new Set();
        if (input.mode === 'partial') {
            if (!Array.isArray(input.rounds) || !input.rounds.length) throw new RangeError('부분무이자에서 직접 수수료를 내는 회차를 입력하세요.');
            input.rounds.forEach(round => paidRounds.add(whole(round, '고객 부담 회차', 1, months)));
        }
        const days = input.days || [];
        if (days.length && days.length !== months) throw new RangeError('이용일수는 할부 개월 수와 같은 개수로 입력하세요.');
        const principalPerRound = Math.floor(amount / months);
        let balance = amount;
        let fees = 0;
        const rows = Array.from({ length: months }, (_, index) => {
            const round = index + 1;
            const principal = round === months ? balance : principalPerRound;
            const period = days.length ? whole(days[index], '회차별 이용일수', 1, 90) / 365 : 1 / 12;
            const charged = input.mode === 'standard' || paidRounds.has(round);
            const fee = charged ? Math.round(balance * rate * period) : 0;
            fees += fee;
            balance -= principal;
            return { round, principal, fee, payment: principal + fee, balance };
        });
        return { rows, estimatedMonthly: !days.length, fees, total: amount + fees };
    }

    function calculateDepositBreakComparison(input) {
        const principal = won(input.principal, '예금 원금');
        const needed = won(input.needed, '필요한 자금');
        if (!needed || needed > principal) throw new RangeError('필요한 자금은 0원보다 크고 예금 원금 이내여야 합니다.');
        const maturityInterest = won(input.maturityInterest, '만기 세후 이자');
        const earlyInterest = won(input.earlyInterest, '중도해지 세후 이자');
        const remainingDays = whole(input.remainingDays, '만기까지 남은 일수', 1, 3650);
        const loanDays = whole(input.loanDays, '대출을 사용할 일수', 1, remainingDays);
        const loanRate = value(input.loanRate, '예금담보대출 연이율', 0, 100) / 100;
        const fees = won(input.fees, '대출 부대비용');
        const loanInterest = needed * loanRate * loanDays / 365;
        const breakCost = maturityInterest - earlyInterest;
        const loanCost = loanInterest + fees;
        return { breakCost, loanInterest, loanCost, difference: breakCost - loanCost,
            breakEvenRate: breakCost >= fees ? (breakCost - fees) * 365 / (needed * loanDays) : null };
    }

    function calculateRefinance(input) {
        const principal = won(input.principal, '대환할 대출잔액');
        if (!principal) throw new RangeError('대출잔액은 0원보다 커야 합니다.');
        const fees = won(input.exitFee, '기존 대출 중도상환수수료') + won(input.newFees, '새 대출 부대비용');
        const schedules = [input.current, input.replacement].map(loan => {
            const months = whole(loan.months, '대출기간', 1, 600);
            const annualRate = value(loan.annualRate, '연 대출금리', 0, 100);
            if (!['equal-payment', 'equal-principal', 'bullet'].includes(loan.method)) throw new RangeError('상환방식을 선택해 주세요.');
            return global.LoanMath.createSchedule({ principal, months, annualRate, method: loan.method });
        });
        const horizon = whole(input.horizon, '비교기간', 1, Math.max(...schedules.map(schedule => schedule.months)));
        const summary = schedules.map((schedule, index) => {
            const rows = schedule.rows.slice(0, horizon);
            const interest = rows.reduce((sum, row) => sum + row.interest, 0);
            return { firstPayment: schedule.firstPayment, paid: rows.reduce((sum, row) => sum + row.payment, 0),
                balance: rows.at(-1).balance, cost: interest + (index === 1 ? fees : 0) };
        });
        let breakEvenMonth = null;
        let difference = -fees;
        for (let month = 0; month < horizon; month++) {
            difference += (schedules[0].rows[month]?.interest || 0) - (schedules[1].rows[month]?.interest || 0);
            if (breakEvenMonth === null && difference >= -0.000001) breakEvenMonth = month + 1;
        }
        return { horizon, fees, summary, difference, breakEvenMonth };
    }

    const DEPOSIT_PROTECTION_LIMIT = 100000000;
    function calculateDepositProtection(deposits) {
        if (!Array.isArray(deposits) || !deposits.length || deposits.length > 20) throw new RangeError('예·적금을 1~20개 입력해 주세요.');
        const groups = new Map();
        deposits.forEach(deposit => {
            const name = String(deposit.name ?? '').normalize('NFKC').trim().replace(/\s+/g, ' ');
            if (!name || name.length > 60) throw new RangeError('각 예·적금의 금융회사명을 입력해 주세요.');
            const key = name.toLocaleLowerCase('ko-KR');
            const group = groups.get(key) || { name, eligible: 0 };
            group.eligible += won(deposit.principal, '해당 계좌의 보호 대상 원금') + won(deposit.interest, '소정의 이자');
            groups.set(key, group);
        });
        const rows = [...groups.values()].map(group => ({
            ...group, protected: Math.min(group.eligible, DEPOSIT_PROTECTION_LIMIT),
            excess: Math.max(0, group.eligible - DEPOSIT_PROTECTION_LIMIT),
            headroom: Math.max(0, DEPOSIT_PROTECTION_LIMIT - group.eligible)
        }));
        return { rows, limit: DEPOSIT_PROTECTION_LIMIT, excess: rows.reduce((sum, group) => sum + group.excess, 0) };
    }

    function calculateMileageRefund(input) {
        const initial = whole(input.initial, '최초 계기판 주행거리', 0, 10000000);
        const latest = whole(input.latest, '최종 계기판 주행거리', initial, 10000000);
        const dateDay = global.XirrMath.dateDay;
        const days = dateDay(input.endDate) - dateDay(input.startDate);
        if (days <= 0) throw new RangeError('최종 측정일은 최초 측정일보다 늦어야 합니다.');
        const distance = latest - initial;
        const annualDistance = distance * 365 / days;
        const refund = input.premium == null && input.rate == null ? null :
            won(input.premium, '환급 대상 보험료') * value(input.rate, '가입 계약의 환급률', 0, 100) / 100;
        return { days, distance, annualDistance, refund };
    }

    global.PersonalFinanceMath = {
        calculateExchange, retirementPlan, calculateRetirement, calculateRebalancing, normalizeReferenceRate, exchangeQuoteUnits,
        calculateBondYield, calculateUsStockKrwReturn, calculateEtfCostComparison, calculateCardInstallment,
        calculateDepositBreakComparison, calculateRefinance, calculateDepositProtection, calculateMileageRefund
    };
})(typeof window !== 'undefined' ? window : globalThis);
