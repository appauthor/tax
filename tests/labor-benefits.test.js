/* Reused by the Node regression suite and by JavaScriptCore when Node is unavailable. */
(function (global) {
    'use strict';
    function runLaborBenefitsTests(math, table) {
        let checks = 0;
        function eq(actual, expected, label) {
            checks++;
            if (actual !== expected) throw new Error(`${label}: expected ${expected}, received ${actual}`);
        }
        function near(actual, expected, label) {
            checks++;
            if (Math.abs(actual - expected) > .001) throw new Error(`${label}: expected ${expected}, received ${actual}`);
        }
        function throws(action, label) {
            checks++;
            let threw = false;
            try { action(); } catch (_) { threw = true; }
            if (!threw) throw new Error(`${label}: expected validation error`);
        }
        const weekly = { wageMode: 'base', hourlyWage: 10320, weeklyHours: 20, attended: true, employmentMaintained: true };
        eq(math.calculateWeeklyHolidayPay(weekly).holidayPay, 41280, 'MOEL 20-hour weekly pay');
        eq(math.calculateWeeklyHolidayPay({ ...weekly, weeklyHours: 15 }).holidayPay, 30960, '15-hour boundary');
        eq(math.calculateWeeklyHolidayPay({ ...weekly, weeklyHours: 14.99 }).holidayPay, 0, 'under 15 hours');
        eq(math.calculateWeeklyHolidayPay({ ...weekly, weeklyHours: 40 }).holidayPay, 82560, '40-hour weekly pay');
        eq(math.calculateWeeklyHolidayPay({ ...weekly, weeklyHours: 0 }).inclusiveHourly, 0, 'zero hours');
        eq(math.calculateWeeklyHolidayPay({ ...weekly, hourlyWage: 0 }).weeklyPay, 0, 'zero wage');
        eq(math.calculateWeeklyHolidayPay({ ...weekly, attended: false }).holidayPay, 0, 'absence');
        eq(math.calculateWeeklyHolidayPay({ ...weekly, employmentMaintained: false }).holidayPay, 0, 'employment ended before weekly holiday');
        near(math.calculateWeeklyHolidayPay({ ...weekly, wageMode: 'inclusive', hourlyWage: 12384 }).hourlyWage, 10320, 'inclusive hourly inverse');
        eq(math.calculateWeeklyHolidayPay({ ...weekly, hourlyWage: 10000 }).belowMinimum, true, 'minimum wage warning');
        for (const invalid of ['', '   ', null, undefined, -1, 41, Infinity, NaN]) throws(() => math.calculateWeeklyHolidayPay({ ...weekly, weeklyHours: invalid }), 'invalid hours');
        throws(() => math.calculateWeeklyHolidayPay({ ...weekly, wageMode: 'inclusive', attended: false }), 'inverse requires eligibility');
        throws(() => math.calculateWeeklyHolidayPay({ ...weekly, wageMode: 'unknown' }), 'invalid wage mode');

        const unemp = { separationDate: '2026-09-09', age: 35, insuredMonths: 36, insuredDays: 180, dailyHours: 8,
            averagePeriodDays: 92, threeMonthWages: 9000000, annualBonus: 0, annualLeavePay: 0, ordinaryDailyWage: 0, qualifyingReason: true };
        const u = math.calculateUnemploymentBenefit(unemp);
        eq(u.dailyBenefit, 66048, '2026 statutory floor'); eq(u.total, 11888640, '180-day total');
        eq(math.calculateUnemploymentBenefit({ ...unemp, threeMonthWages: 20000000 }).dailyBenefit, 68100, '2026 cap');
        eq(math.calculateUnemploymentBenefit({ ...unemp, threeMonthWages: 1000000, dailyHours: 4 }).dailyBenefit, 33024, '4-hour floor');
        eq(math.calculateUnemploymentBenefit({ ...unemp, threeMonthWages: 1000000, dailyHours: 5 }).dailyBenefit, 41280, '5-hour floor');
        eq(math.calculateUnemploymentBenefit({ ...unemp, ordinaryDailyWage: 113000 }).dailyBenefit, 67800, 'higher ordinary wage');
        near(math.calculateUnemploymentBenefit({ ...unemp, annualBonus: 4000000, annualLeavePay: 400000 }).averageDailyWage, 10100000 / 92, 'bonus and leave inclusion');
        for (const [months, younger, older] of [[11,120,120],[12,150,180],[35,150,180],[36,180,210],[59,180,210],[60,210,240],[119,210,240],[120,240,270]]) {
            eq(math.calculateUnemploymentBenefit({ ...unemp, insuredMonths: months, age: 49 }).benefitDays, younger, 'under-50 duration');
            eq(math.calculateUnemploymentBenefit({ ...unemp, insuredMonths: months, age: 50 }).benefitDays, older, '50+ duration');
            eq(math.calculateUnemploymentBenefit({ ...unemp, insuredMonths: months, disabled: true }).benefitDays, older, 'disabled duration');
        }
        eq(math.calculateUnemploymentBenefit({ ...unemp, insuredDays: 179 }).total, 0, '179 qualifying days');
        eq(math.calculateUnemploymentBenefit({ ...unemp, insuredMonths: 0 }).total, 0, 'no insurance history');
        eq(math.calculateUnemploymentBenefit({ ...unemp, qualifyingReason: false }).total, 0, 'qualifying reason not confirmed');
        for (const separationDate of ['', '2025-12-31', '2027-01-01', '2026-02-30']) throws(() => math.calculateUnemploymentBenefit({ ...unemp, separationDate }), 'unsupported separation date');
        for (const dailyHours of [0, 3, 4.5, 9]) throws(() => math.calculateUnemploymentBenefit({ ...unemp, dailyHours }), 'unsupported recognized hours');
        throws(() => math.calculateUnemploymentBenefit({ ...unemp, averagePeriodDays: 0 }), 'zero average days');
        throws(() => math.calculateUnemploymentBenefit({ ...unemp, threeMonthWages: 0 }), 'missing wages');

        const leave = { mode: 'automatic', hireDate: '2025-01-01', asOfDate: '2025-12-31', attendanceConfirmed: true, statutoryEligible: true,
            usedDays: 0, previousUnpaidDays: 0, dailyHours: 8, wageMode: 'monthly', wageAmount: 3000000, monthlyHours: 209, payableConfirmed: true };
        eq(math.calculateAnnualLeave(leave).accrued, 11, 'MOEL one-year fixed term: 11');
        const anniversary = math.calculateAnnualLeave({ ...leave, asOfDate: '2026-01-01' });
        eq(anniversary.accrued, 15, 'annual leave after anniversary');
        eq(anniversary.totalAccrued, 26, 'MOEL year plus one day: cumulative 26');
        eq(anniversary.remainingDays, 15, 'expired leave not counted as current leave');
        eq(math.calculateAnnualLeave({ ...leave, asOfDate: '2025-01-31' }).accrued, 0, 'one month ends without next-day employment');
        eq(math.calculateAnnualLeave({ ...leave, asOfDate: '2025-02-01' }).accrued, 1, 'first monthly entitlement');
        eq(math.calculateAnnualLeave({ ...leave, asOfDate: '2027-01-01' }).accrued, 15, '2 years');
        eq(math.calculateAnnualLeave({ ...leave, asOfDate: '2028-01-01' }).accrued, 16, '3 years');
        eq(math.calculateAnnualLeave({ ...leave, asOfDate: '2046-01-01' }).accrued, 25, 'maximum leave');
        eq(math.calculateAnnualLeave({ ...leave, hireDate: '2024-02-29', asOfDate: '2025-02-28' }).totalAccrued, 11, 'leap-day year ends February 28');
        eq(math.calculateAnnualLeave({ ...leave, hireDate: '2024-02-29', asOfDate: '2025-03-01' }).accrued, 15, 'leap-day next-day entitlement');
        eq(math.calculateAnnualLeave({ ...leave, hireDate: '2025-01-31', asOfDate: '2025-02-28' }).accrued, 0, 'month-end period');
        eq(math.calculateAnnualLeave({ ...leave, hireDate: '2025-01-31', asOfDate: '2025-03-01' }).accrued, 1, 'month-end entitlement');
        const manual = { ...leave, mode: 'manual', accruedDays: 15, usedDays: 5 };
        near(math.calculateAnnualLeave(manual).allowance, 3000000 / 209 * 8 * 10, '10 days pay');
        eq(math.calculateAnnualLeave({ ...manual, wageMode: 'hourly', wageAmount: 12000 }).allowance, 960000, 'hourly wage');
        eq(math.calculateAnnualLeave({ ...manual, wageMode: 'daily', wageAmount: 100000 }).allowance, 1000000, 'confirmed average daily wage');
        eq(math.calculateAnnualLeave({ ...manual, previousUnpaidDays: 11, wageMode: 'daily', wageAmount: 100000 }).allowance, 2100000, 'previous unpaid leave separate');
        eq(math.calculateAnnualLeave({ ...manual, payableConfirmed: false }).allowance, 0, 'pay obligation not confirmed');
        eq(math.calculateAnnualLeave({ ...manual, wageAmount: 0 }).allowance, 0, 'zero wage');
        eq(math.calculateAnnualLeave({ ...manual, accruedDays: 0, usedDays: 0 }).remainingDays, 0, 'zero leave');
        for (const patch of [{usedDays:16},{usedDays:-1},{monthlyHours:0},{dailyHours:0},{wageMode:'x'},{accruedDays:''}]) throws(() => math.calculateAnnualLeave({ ...manual, ...patch }), 'invalid manual leave');
        for (const patch of [{hireDate:'2025-02-30'},{asOfDate:'2024-01-01'},{attendanceConfirmed:false},{statutoryEligible:false}]) throws(() => math.calculateAnnualLeave({ ...leave, ...patch }), 'unsupported accrual');

        const parental = { mode: 'general', wage: 3000000, months: 12, usedMonths: 0 };
        const p = math.calculateParentalLeaveBenefit(parental);
        eq(p.total, 23100000, 'general 12 months');
        eq(p.rows[2].amount, 2500000, 'third month'); eq(p.rows[3].amount, 2000000, 'fourth month');
        eq(p.rows[5].amount, 2000000, 'sixth month'); eq(p.rows[6].amount, 1600000, 'seventh month');
        eq(math.calculateParentalLeaveBenefit({ ...parental, months: 18, extendedEligible: true }).total, 32700000, '18-month total');
        eq(math.calculateParentalLeaveBenefit({ ...parental, usedMonths: 6 }).remainingTotal, 9600000, 'split leave keeps cumulative bands');
        eq(math.calculateParentalLeaveBenefit({ ...parental, wage: 500000, months: 1 }).total, 700000, 'parental floor');
        eq(math.calculateParentalLeaveBenefit({ ...parental, wage: 1000000 }).rows[6].amount, 800000, '80% without cap');
        eq(math.calculateParentalLeaveBenefit({ ...parental, months: 0 }).total, 0, 'zero duration');
        eq(math.calculateParentalLeaveBenefit({ ...parental, mode:'single', singleEligible:true }).total, 24600000, 'single-parent cap');
        const shared = { ...parental, mode:'shared', wage:5000000, months:6, partnerWage:5000000, partnerMonths:6, sharedEligible:true };
        const both = math.calculateParentalLeaveBenefit(shared);
        eq(both.total, 20000000, 'shared parent total'); eq(both.householdTotal, 40000000, 'shared couple total');
        eq(both.rows[0].amount, 2500000, 'current first-month shared cap');
        const unequal = math.calculateParentalLeaveBenefit({ ...shared, months:12, partnerMonths:3 });
        eq(unequal.commonMonths, 3, 'common months, not calendar overlap');
        eq(unequal.rows[3].amount, 2000000, 'general pay after common months');
        eq(unequal.partnerTotal, 8000000, 'shorter partner total');
        for (const patch of [{months:19},{months:1.5},{wage:0},{wage:''},{usedMonths:13},{months:18},{mode:'shared',partnerWage:3000000,partnerMonths:6},{mode:'single'}]) throws(() => math.calculateParentalLeaveBenefit({ ...parental, ...patch }), 'invalid parental conditions');
        throws(() => math.calculateParentalLeaveBenefit({ ...shared, partnerMonths:18 }), 'partner extension eligibility');

        const credit = { application:'regular', ownPay:10000000, partnerPay:0, otherIncome:0, assets:100000000, hasSpouse:false, hasDependent:false, otherEligible:true };
        eq(table.length, 447, 'official table length');
        for (let i=1; i<table.length; i++) eq(table[i-1][1], table[i][0], 'official table continuity');
        eq(math.calculateEarnedIncomeCredit(credit).decision, 1524000, 'official 10m single row, not linear estimate');
        eq(math.calculateEarnedIncomeCredit({ ...credit, assets:180000000 }).decision, 762000, 'asset reduction');
        eq(math.calculateEarnedIncomeCredit({ ...credit, assets:180000000, application:'late' }).decision, 723900, 'late reduction after assets');
        eq(math.calculateEarnedIncomeCredit({ ...credit, assets:169999999 }).decision, 1524000, 'below asset reduction threshold');
        eq(math.calculateEarnedIncomeCredit({ ...credit, assets:170000000 }).decision, 762000, 'at asset reduction threshold');
        eq(math.calculateEarnedIncomeCredit({ ...credit, assets:240000000 }).decision, 0, 'at exclusion threshold');
        eq(math.calculateEarnedIncomeCredit({ ...credit, otherIncome:12000000 }).decision, 0, 'total income threshold includes other income');
        eq(math.calculateEarnedIncomeCredit({ ...credit, ownPay:3900000 }).decision, 1650000, 'table maximum starts below formula plateau');
        eq(math.calculateEarnedIncomeCredit({ ...credit, ownPay:0 }).decision, 0, 'no qualifying income');
        eq(math.calculateEarnedIncomeCredit({ ...credit, ownPay:39999 }).decision, 0, 'below table range');
        eq(math.calculateEarnedIncomeCredit({ ...credit, ownPay:40000 }).decision, 100000, 'rising minimum decision');
        eq(math.calculateEarnedIncomeCredit({ ...credit, ownPay:40000, assets:170000000 }).decision, 0, 'minimum exclusion after asset reduction');
        eq(math.calculateEarnedIncomeCredit({ ...credit, hasSpouse:true, partnerPay:2999999 }).family, 'one', 'spouse below 3m');
        eq(math.calculateEarnedIncomeCredit({ ...credit, hasSpouse:true, partnerPay:3000000 }).family, 'dual', 'spouse reaches 3m');
        eq(math.calculateEarnedIncomeCredit({ ...credit, ownPay:2999999, hasSpouse:true, partnerPay:10000000 }).family, 'one', 'applicant below 3m');
        eq(math.calculateEarnedIncomeCredit({ ...credit, hasDependent:true }).family, 'one', 'dependent without spouse');
        eq(math.calculateEarnedIncomeCredit({ ...credit, hasSpouse:true, ownPay:20000000, partnerPay:23800000 }).decision, 30000, 'dual-earner decreasing minimum');
        eq(math.calculateEarnedIncomeCredit({ ...credit, hasSpouse:true, ownPay:20000000, partnerPay:23877300 }).decision, 0, 'last payable table boundary');
        eq(math.calculateEarnedIncomeCredit({ ...credit, otherEligible:false }).decision, 0, 'other eligibility');
        for (const patch of [{ownPay:''},{assets:-1},{otherIncome:Infinity},{application:'half-year'}]) throws(() => math.calculateEarnedIncomeCredit({ ...credit, ...patch }), 'invalid EITC input');
        // Every statutory row is used directly for eligible families, then statutory minimums apply.
        for (const t of table) for (const [family,col] of [['single',2],['one',3],['dual',4]]) {
            if (family === 'dual' && t[0] < 6000000) continue;
            const value = t[0];
            const result = math.calculateEarnedIncomeCredit({ ...credit, ownPay:family==='dual'?3000000:value, partnerPay:family==='dual'?value-3000000:0, hasSpouse:family==='dual', hasDependent:family==='one' });
            eq(result.tableAmount, t[col] || 0, `table ${family} ${value}`);
        }
        return checks;
    }
    global.runLaborBenefitsTests = runLaborBenefitsTests;
    if (typeof module !== 'undefined') module.exports = runLaborBenefitsTests;
}(typeof globalThis !== 'undefined' ? globalThis : this));
