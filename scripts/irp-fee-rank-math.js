(function (global) {
    'use strict';
    function tierFee(amount, tiers) {
        let lower = 0, fee = 0;
        for (const [upperValue, rate] of tiers) {
            const upper = upperValue === null ? Infinity : upperValue;
            fee += Math.max(0, Math.min(amount, upper) - lower) * rate / 100;
            lower = upper;
        }
        return fee;
    }
    function compare(data, input) {
        const balance = Number(input.balance);
        if (input.balance === '' || !Number.isSafeInteger(balance) || balance <= 0 || balance > 100000000000) throw new RangeError('적립금은 0원 초과 1,000억원 이하로 입력하세요.');
        if (!['online', 'branch'].includes(input.channel) || !['personal', 'retirement'].includes(input.funding)) throw new RangeError('가입 경로와 적립금 종류를 선택하세요.');
        if (!data || !Array.isArray(data.providers) || data.providers.length !== 4 || new Set(data.providers.map(p => p.id)).size !== 4) throw new RangeError('공식 수수료 자료를 확인할 수 없습니다.');
        const rows = data.providers.map(provider => {
            let operation = 0, asset = 0;
            if (provider.kind === 'bank') {
                const rules = data.bankRules;
                if (input.funding === 'personal') {
                    operation = balance * rules.personalOperation[input.channel][balance < rules.personalThreshold ? 0 : 1] / 100;
                    asset = balance * rules.personalAsset / 100;
                } else {
                    const index = balance < rules.retirementThreshold ? 0 : 1;
                    operation = balance * rules.retirementOperation[input.channel][index] / 100;
                    asset = balance * rules.retirementAsset[input.channel][index] / 100;
                }
            } else {
                const exempt = input.channel === 'online' || (input.funding === 'personal' && ['samsung', 'kb-securities'].includes(provider.kind));
                if (!exempt) { operation = tierFee(balance, provider.operation); asset = tierFee(balance, provider.asset); }
            }
            return { ...provider, operation, asset, fee: operation + asset, effectiveRate: (operation + asset) / balance * 100 };
        }).sort((a, b) => a.fee - b.fee || a.name.localeCompare(b.name, 'ko'));
        rows.forEach((row, index) => { row.rank = index && Math.abs(row.fee - rows[index - 1].fee) < 0.000001 ? rows[index - 1].rank : index + 1; });
        return { rows, balance, spread: rows.at(-1).fee - rows[0].fee, channel: input.channel, funding: input.funding };
    }
    global.IrpFeeRankMath = Object.freeze({ compare });
})(typeof window !== 'undefined' ? window : globalThis);
