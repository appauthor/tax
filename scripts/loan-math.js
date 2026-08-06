(function initializeLoanMath(global) {
    "use strict";

    const MAX_LOAN_MONTHS = 600;

    function clampNumber(value, min, max) {
        const number = Number(value);
        if (!Number.isFinite(number)) return min;
        return Math.min(Math.max(number, min), max);
    }

    function getMonthlyRate(annualRate) {
        return Math.max(0, Number(annualRate) || 0) / 1200;
    }

    function getEqualPayment(principal, monthlyRate, months) {
        if (monthlyRate === 0) return principal / months;
        const factor = Math.pow(1 + monthlyRate, months);
        return principal * monthlyRate * factor / (factor - 1);
    }

    function createSchedule(options) {
        const principal = Math.max(0, Number(options.principal) || 0);
        const annualRate = Math.max(0, Number(options.annualRate) || 0);
        const months = Math.round(clampNumber(options.months, 1, MAX_LOAN_MONTHS));
        const method = ["equal-payment", "equal-principal", "bullet"].includes(options.method)
            ? options.method
            : "equal-payment";
        const monthlyRate = getMonthlyRate(annualRate);
        const equalPayment = getEqualPayment(principal, monthlyRate, months);
        const fixedPrincipal = principal / months;
        const rows = [];
        let balance = principal;
        let totalInterest = 0;
        let totalPayment = 0;

        for (let month = 1; month <= months; month += 1) {
            const interest = balance * monthlyRate;
            let principalPayment;

            if (method === "bullet") {
                principalPayment = month === months ? balance : 0;
            } else if (method === "equal-principal") {
                principalPayment = month === months ? balance : Math.min(fixedPrincipal, balance);
            } else {
                principalPayment = month === months
                    ? balance
                    : Math.min(Math.max(equalPayment - interest, 0), balance);
            }

            const payment = principalPayment + interest;
            balance = Math.max(0, balance - principalPayment);
            totalInterest += interest;
            totalPayment += payment;
            rows.push({
                month,
                payment,
                principal: principalPayment,
                interest,
                balance
            });
        }

        return {
            principal,
            annualRate,
            months,
            method,
            rows,
            firstPayment: rows[0]?.payment || 0,
            lastPayment: rows[rows.length - 1]?.payment || 0,
            averagePayment: totalPayment / months,
            totalInterest,
            totalPayment
        };
    }

    function getAnnualDebtService(options) {
        const schedule = createSchedule(options);
        return schedule.rows
            .slice(0, Math.min(12, schedule.rows.length))
            .reduce((sum, row) => sum + row.payment, 0);
    }

    function findPrincipalForAnnualDebt(options) {
        const annualCapacity = Math.max(0, Number(options.annualCapacity) || 0);
        if (annualCapacity <= 0) return 0;

        const annualRate = Math.max(0, Number(options.annualRate) || 0);
        const months = Math.round(clampNumber(options.months, 1, MAX_LOAN_MONTHS));
        const method = options.method || "equal-payment";
        let low = 0;
        let high = Math.max(1000000, annualCapacity * Math.max(months / 12, 1) * 2);

        while (getAnnualDebtService({ principal: high, annualRate, months, method }) < annualCapacity && high < 10000000000000) {
            high *= 2;
        }

        for (let index = 0; index < 80; index += 1) {
            const middle = (low + high) / 2;
            const debtService = getAnnualDebtService({ principal: middle, annualRate, months, method });
            if (debtService <= annualCapacity) low = middle;
            else high = middle;
        }

        return Math.floor(low);
    }

    function getDsr(annualDebtService, annualIncome) {
        const income = Math.max(0, Number(annualIncome) || 0);
        if (income === 0) return 0;
        return Math.max(0, Number(annualDebtService) || 0) / income * 100;
    }

    function calculateEarlyRepayment(options) {
        const balance = Math.max(0, Number(options.balance) || 0);
        const prepayment = Math.min(balance, Math.max(0, Number(options.prepayment) || 0));
        const annualRate = Math.max(0, Number(options.annualRate) || 0);
        const months = Math.round(clampNumber(options.months, 1, MAX_LOAN_MONTHS));
        const method = options.method || "equal-payment";
        const feeRate = Math.max(0, Number(options.feeRate) || 0) / 100;
        const feePeriodMonths = Math.max(0, Number(options.feePeriodMonths) || 0);
        const elapsedMonths = Math.max(0, Number(options.elapsedMonths) || 0);
        const remainingFeeRatio = feePeriodMonths > 0
            ? Math.max(0, feePeriodMonths - elapsedMonths) / feePeriodMonths
            : 0;
        const fee = prepayment * feeRate * remainingFeeRatio;
        const before = createSchedule({ principal: balance, annualRate, months, method });
        const after = createSchedule({ principal: balance - prepayment, annualRate, months, method });
        const interestSaved = Math.max(0, before.totalInterest - after.totalInterest);
        const netSaving = interestSaved - fee;
        let breakEvenMonth = fee <= 0 ? 0 : null;
        let cumulativeInterestSaving = 0;

        if (breakEvenMonth === null) {
            for (let index = 0; index < months; index += 1) {
                cumulativeInterestSaving += (before.rows[index]?.interest || 0) - (after.rows[index]?.interest || 0);
                if (cumulativeInterestSaving >= fee) {
                    breakEvenMonth = index + 1;
                    break;
                }
            }
        }

        return {
            balance,
            prepayment,
            fee,
            remainingFeeRatio,
            before,
            after,
            interestSaved,
            netSaving,
            breakEvenMonth
        };
    }

    global.LoanMath = Object.freeze({
        createSchedule,
        getAnnualDebtService,
        findPrincipalForAnnualDebt,
        getDsr,
        calculateEarlyRepayment
    });
})(window);
