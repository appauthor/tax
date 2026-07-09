const TAX_RANK_SOURCE_NOTE = "국세청 국세통계포털, KOSIS 국가통계포털, 위택스 등 공개 통계를 참고해 사이트 내부에서 보정한 추정 기준입니다.";
const TAX_RANK_SOURCE_LINKS = [
    "국세통계포털(TASIS): https://tasis.nts.go.kr/",
    "KOSIS 국가통계포털: https://kosis.kr/",
    "위택스: https://www.wetax.go.kr/main/"
];

const TAX_RANK_BENCHMARKS = {
    general: {
        label: "전체 세금 추정 기준",
        population: 1000,
        brackets: [
            { amount: 70000000, topPercent: 1 },
            { amount: 35000000, topPercent: 3 },
            { amount: 20000000, topPercent: 6 },
            { amount: 12000000, topPercent: 10 },
            { amount: 6000000, topPercent: 20 },
            { amount: 2500000, topPercent: 35 },
            { amount: 900000, topPercent: 55 },
            { amount: 250000, topPercent: 75 },
            { amount: 0, topPercent: 100 }
        ]
    },
    income: {
        label: "근로·사업소득세 중심 추정 기준",
        population: 1000,
        brackets: [
            { amount: 45000000, topPercent: 1 },
            { amount: 22000000, topPercent: 3 },
            { amount: 12000000, topPercent: 7 },
            { amount: 7000000, topPercent: 12 },
            { amount: 3000000, topPercent: 25 },
            { amount: 1200000, topPercent: 42 },
            { amount: 350000, topPercent: 65 },
            { amount: 70000, topPercent: 82 },
            { amount: 0, topPercent: 100 }
        ]
    },
    asset: {
        label: "부동산·자산세 포함 추정 기준",
        population: 1000,
        brackets: [
            { amount: 120000000, topPercent: 1 },
            { amount: 60000000, topPercent: 3 },
            { amount: 35000000, topPercent: 6 },
            { amount: 20000000, topPercent: 10 },
            { amount: 9000000, topPercent: 20 },
            { amount: 3500000, topPercent: 35 },
            { amount: 1200000, topPercent: 55 },
            { amount: 300000, topPercent: 75 },
            { amount: 0, topPercent: 100 }
        ]
    }
};

function interpolateTaxRankPercent(amount, brackets) {
    if (amount >= brackets[0].amount) return brackets[0].topPercent;

    for (let i = 0; i < brackets.length - 1; i++) {
        const upper = brackets[i];
        const lower = brackets[i + 1];

        if (amount <= upper.amount && amount >= lower.amount) {
            const range = upper.amount - lower.amount;
            if (range <= 0) return upper.topPercent;

            const ratio = (upper.amount - amount) / range;
            return upper.topPercent + ratio * (lower.topPercent - upper.topPercent);
        }
    }

    return 100;
}

function formatTopPercent(percent) {
    if (percent <= 1) return "1% 이내";
    if (percent < 10) return `${percent.toFixed(1)}%`;
    return `${Math.round(percent)}%`;
}

function getTaxRankLevel(topPercent) {
    if (topPercent <= 1) {
        return {
            title: "전설의 납세자",
            badgeClass: "status-badge danger",
            comment: "공개 통계 참고 기준에서는 최상위권에 가까운 납세 구간입니다."
        };
    }

    if (topPercent <= 5) {
        return {
            title: "상위권 납세자",
            badgeClass: "status-badge danger",
            comment: "공개 통계 참고 기준에서는 세금 납부액이 상당히 높은 편입니다."
        };
    }

    if (topPercent <= 20) {
        return {
            title: "든든한 납세자",
            badgeClass: "status-badge neutral",
            comment: "공개 통계 참고 기준에서는 평균보다 꽤 앞쪽에 있는 납세자입니다."
        };
    }

    if (topPercent <= 50) {
        return {
            title: "성실 납세자",
            badgeClass: "status-badge neutral",
            comment: "공개 통계 참고 기준에서는 중상위권에 가까운 납세자입니다."
        };
    }

    return {
        title: "생활형 납세자",
        badgeClass: "status-badge neutral",
        comment: "공개 통계 참고 기준에서는 일상적인 납세 구간에 가까운 결과입니다."
    };
}

function escapeRankText(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function getTaxRankAmountVisibilityLabel(visibility) {
    if (visibility === "visible") return "세금 납부액 표시";
    if (visibility === "masked") return "세금 납부액 가림";
    return "세금 납부액 행 제외";
}

function getTaxRankAmountRow(taxAmount, visibility) {
    if (visibility === "hidden") return "";

    const amountText = visibility === "masked"
        ? "비공개 (순위 계산에만 사용)"
        : `${Math.floor(taxAmount).toLocaleString()} 원`;

    return `<tr><td>${icon('receipt-text')}입력한 연간 세금 납부액</td><td class="text-right">${amountText}</td></tr>`;
}

function getTaxRankNextGoalRow(nextGoalGap, visibility) {
    if (visibility === "hidden") return "";

    const gapText = visibility === "visible"
        ? (nextGoalGap > 0 ? `약 ${nextGoalGap.toLocaleString()} 원` : '이미 최상위 기준 도달')
        : "비공개 (납부액 보호)";

    return `<tr><td>${icon('target')}다음 상위 구간까지</td><td class="text-right">${gapText}</td></tr>`;
}

function isTaxRankResultVisible() {
    const resultBox = document.getElementById('resultBox');
    return resultBox && resultBox.style.display === 'block';
}

function refreshTaxRankReportIfVisible() {
    if (!isTaxRankResultVisible()) return;
    calculateTaxRank();
}

function calculateTaxRank() {
    const taxAmount = getMoneyValue('rankTaxAmount');
    const groupKey = document.getElementById('rankCompareGroup').value;
    const nicknameInput = document.getElementById('rankNickname');
    const nickname = escapeRankText(nicknameInput.value.trim() || "나");
    const amountVisibility = document.getElementById('rankAmountVisibility').value;
    const benchmark = TAX_RANK_BENCHMARKS[groupKey] || TAX_RANK_BENCHMARKS.general;

    if (taxAmount <= 0) {
        alert('세금 납부액을 입력해주세요.');
        return;
    }

    const topPercent = interpolateTaxRankPercent(taxAmount, benchmark.brackets);
    const topPercentText = formatTopPercent(topPercent);
    const rankNumber = Math.max(1, Math.ceil((topPercent / 100) * benchmark.population));
    const level = getTaxRankLevel(topPercent);
    const nextBracket = [...benchmark.brackets].reverse().find(bracket => taxAmount < bracket.amount);
    const nextGoalAmount = nextBracket ? nextBracket.amount : benchmark.brackets[0].amount;
    const nextGoalGap = Math.max(0, nextGoalAmount - taxAmount);
    const shareLine = `${nickname}님의 세금 납부액은 공개 통계 참고 기준 상위 약 ${topPercentText}!`;

    updateReportHeaders("TAX RANK ESTIMATE", "공개 통계 참고 세금 납부 순위 리포트");

    document.getElementById('resultTableBody').innerHTML = `
        <tr class="highlight-row"><td>${icon('user-round')}공유용 이름</td><td class="text-right">${nickname}</td></tr>
        ${getTaxRankAmountRow(taxAmount, amountVisibility)}
        <tr><td>${icon('list-checks')}비교 기준</td><td class="text-right">${benchmark.label}</td></tr>
        <tr class="total-row"><td>${icon('trophy')}예상 세금 납부 위치</td><td class="text-right">상위 약 ${topPercentText}</td></tr>
        <tr><td>${icon('medal')}1,000명 중 추정 순위</td><td class="text-right">약 ${rankNumber.toLocaleString()}등</td></tr>
        <tr class="highlight-row"><td>${icon('badge-check')}납세자 레벨</td><td class="text-right"><span class="${level.badgeClass}">${level.title}</span></td></tr>
        <tr><td>${icon('message-circle')}한 줄 평가</td><td class="text-right">${level.comment}</td></tr>
        <tr><td>${icon('share-2')}공유 문구</td><td class="text-right">${shareLine}</td></tr>
        ${getTaxRankNextGoalRow(nextGoalGap, amountVisibility)}
    `;

    document.getElementById('formulaContent').innerHTML = `• 이 결과는 공식 개인별 납세자 순위가 아니라, 사용자가 입력한 세금 납부액을 공개 통계 참고형 내부 추정표에 대입한 결과입니다.<br>• 공유 금액 표시 방식은 "${getTaxRankAmountVisibilityLabel(amountVisibility)}"입니다. 금액을 제외하거나 가려도 순위 계산에는 입력 금액이 사용됩니다.<br>• 비교 기준은 ${benchmark.label}이며, 세목 구성·소득공제·세액공제·자산 구조·가족 상황·납부 시점에 따라 실제 위치와 다를 수 있습니다.<br>• 참고 기준: ${TAX_RANK_SOURCE_NOTE}<br>• 참고 출처: ${TAX_RANK_SOURCE_LINKS.join(' / ')}<br>• 이미지 저장 또는 결과 공유하기 버튼을 누르면 이 리포트를 공유용 이미지로 저장하거나 보낼 수 있습니다.`;
    showResult();
}
