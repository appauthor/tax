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

    function calculateFundingCounterpart(options) {
        const homePrice = Number(options.homePrice);
        const knownAmount = Number(options.knownAmount);
        if (!Number.isFinite(homePrice) || !Number.isFinite(knownAmount) || homePrice < 0 || knownAmount < 0) {
            throw new RangeError('homePrice and knownAmount must be non-negative finite numbers');
        }

        return {
            homePrice,
            knownAmount,
            amount: Math.max(0, homePrice - knownAmount),
            exceedsHomePrice: knownAmount > homePrice
        };
    }

    function calculateLtv(options) {
        const collateralValue = Math.max(0, Number(options.collateralValue) || 0);
        const existingSecuredDebt = Math.max(0, Number(options.existingSecuredDebt) || 0);
        const priorityDeductions = Math.max(0, Number(options.priorityDeductions) || 0);
        const requestedLoan = Math.max(0, Number(options.requestedLoan) || 0);
        const limitRatio = clampNumber(options.limitRatio, 0, 100);
        const grossLimit = collateralValue * limitRatio / 100;
        const availableAdditionalLoan = Math.max(0, grossLimit - existingSecuredDebt - priorityDeductions);
        const estimatedLoan = Math.min(requestedLoan, availableAdditionalLoan);
        const totalSecuredDebt = existingSecuredDebt + requestedLoan;
        const currentLtv = collateralValue > 0 ? existingSecuredDebt / collateralValue * 100 : 0;
        const requestedLtv = collateralValue > 0 ? totalSecuredDebt / collateralValue * 100 : 0;
        const adjustedRequestedLtv = collateralValue > 0
            ? (totalSecuredDebt + priorityDeductions) / collateralValue * 100
            : 0;

        return {
            collateralValue,
            existingSecuredDebt,
            priorityDeductions,
            requestedLoan,
            limitRatio,
            grossLimit,
            availableAdditionalLoan,
            estimatedLoan,
            currentLtv,
            requestedLtv,
            adjustedRequestedLtv,
            shortfall: Math.max(0, requestedLoan - availableAdditionalLoan)
        };
    }

    function calculateDti(options) {
        const annualIncome = Math.max(0, Number(options.annualIncome) || 0);
        const existingMortgagePrincipal = Math.max(0, Number(options.existingMortgagePrincipal) || 0);
        const existingMortgageInterest = Math.max(0, Number(options.existingMortgageInterest) || 0);
        const otherLoanInterest = Math.max(0, Number(options.otherLoanInterest) || 0);
        const mode = options.mode === "legacy" ? "legacy" : "new-dti";
        const limitRatio = clampNumber(options.limitRatio, 0, 100);
        const principal = Math.max(0, Number(options.principal) || 0);
        const annualRate = Math.max(0, Number(options.annualRate) || 0);
        const months = Math.round(clampNumber(options.months, 1, MAX_LOAN_MONTHS));
        const method = options.method || "equal-payment";
        const existingBurden = existingMortgageInterest
            + otherLoanInterest
            + (mode === "new-dti" ? existingMortgagePrincipal : 0);
        const newAnnualDebtService = getAnnualDebtService({ principal, annualRate, months, method });
        const currentDti = getDsr(existingBurden, annualIncome);
        const totalDti = getDsr(existingBurden + newAnnualDebtService, annualIncome);
        const annualCapacity = Math.max(0, annualIncome * limitRatio / 100 - existingBurden);
        const availableLoan = findPrincipalForAnnualDebt({ annualCapacity, annualRate, months, method });

        return {
            mode,
            annualIncome,
            existingBurden,
            newAnnualDebtService,
            currentDti,
            totalDti,
            annualCapacity,
            availableLoan,
            withinLimit: totalDti <= limitRatio
        };
    }

    function calculateSimpleInterest(options) {
        const balance = Math.max(0, Number(options.balance) || 0);
        const annualRate = Math.max(0, Number(options.annualRate) || 0);
        const days = Math.round(clampNumber(options.days, 1, 3660));
        const dayBasis = Number(options.dayBasis) === 366 ? 366 : 365;
        const dailyInterest = balance * annualRate / 100 / dayBasis;

        return {
            balance,
            annualRate,
            days,
            dayBasis,
            dailyInterest,
            periodInterest: dailyInterest * days,
            thirtyDayInterest: dailyInterest * 30,
            thirtyOneDayInterest: dailyInterest * 31,
            annualInterest: balance * annualRate / 100,
            savingPerMillion: 1000000 * annualRate / 100 / dayBasis * days
        };
    }

    function createBalloonSchedule(options) {
        const principal = Math.max(0, Number(options.principal) || 0);
        const annualRate = Math.max(0, Number(options.annualRate) || 0);
        const months = Math.round(clampNumber(options.months, 1, MAX_LOAN_MONTHS));
        const balloon = Math.min(principal, Math.max(0, Number(options.balloon) || 0));
        const monthlyRate = getMonthlyRate(annualRate);
        const discountFactor = Math.pow(1 + monthlyRate, months);
        const amortizingPresentValue = monthlyRate === 0
            ? principal - balloon
            : principal - balloon / discountFactor;
        const regularPayment = monthlyRate === 0
            ? (principal - balloon) / months
            : amortizingPresentValue * monthlyRate / (1 - Math.pow(1 + monthlyRate, -months));
        const rows = [];
        let balance = principal;
        let totalInterest = 0;
        let totalPayment = 0;

        for (let month = 1; month <= months; month += 1) {
            const interest = balance * monthlyRate;
            const scheduledPrincipal = Math.max(0, regularPayment - interest);
            const principalPayment = month === months ? balance : Math.min(scheduledPrincipal, balance);
            const payment = principalPayment + interest;
            balance = Math.max(0, balance - principalPayment);
            totalInterest += interest;
            totalPayment += payment;
            rows.push({ month, payment, principal: principalPayment, interest, balance });
        }

        return {
            principal,
            annualRate,
            months,
            balloon,
            regularPayment,
            finalPayment: rows[rows.length - 1]?.payment || 0,
            totalInterest,
            totalPayment,
            rows
        };
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
        calculateFundingCounterpart,
        calculateLtv,
        calculateDti,
        calculateSimpleInterest,
        createBalloonSchedule,
        calculateEarlyRepayment
    });
})(window);
