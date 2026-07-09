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
let latestTaxRankShareData = null;

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

function drawRoundedRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}

function fillRoundedRect(ctx, x, y, width, height, radius, fillStyle) {
    drawRoundedRect(ctx, x, y, width, height, radius);
    ctx.fillStyle = fillStyle;
    ctx.fill();
}

function strokeRoundedRect(ctx, x, y, width, height, radius, strokeStyle, lineWidth = 2) {
    drawRoundedRect(ctx, x, y, width, height, radius);
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
}

function setCanvasText(ctx, size, weight = 800, color = "#0f172a") {
    ctx.font = `${weight} ${size}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif`;
    ctx.fillStyle = color;
    ctx.textBaseline = "top";
}

function wrapCanvasText(ctx, text, maxWidth) {
    const words = String(text).split(/\s+/);
    const lines = [];
    let line = "";

    words.forEach(word => {
        if (ctx.measureText(word).width > maxWidth) {
            if (line) {
                lines.push(line);
                line = "";
            }

            let chunk = "";
            Array.from(word).forEach(char => {
                const testChunk = `${chunk}${char}`;
                if (ctx.measureText(testChunk).width <= maxWidth) {
                    chunk = testChunk;
                    return;
                }

                if (chunk) lines.push(chunk);
                chunk = char;
            });

            if (chunk) line = chunk;
            return;
        }

        const testLine = line ? `${line} ${word}` : word;

        if (ctx.measureText(testLine).width <= maxWidth) {
            line = testLine;
            return;
        }

        if (line) lines.push(line);
        line = word;
    });

    if (line) lines.push(line);
    return lines;
}

function drawCanvasTextBlock(ctx, text, x, y, maxWidth, lineHeight, maxLines = 3) {
    const lines = wrapCanvasText(ctx, text, maxWidth).slice(0, maxLines);
    lines.forEach((line, index) => {
        ctx.fillText(line, x, y + index * lineHeight);
    });
}

function drawCanvasLinePattern(ctx, width, height) {
    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.strokeStyle = "#f8fafc";
    ctx.lineWidth = 1.5;

    for (let x = -height; x < width; x += 58) {
        ctx.beginPath();
        ctx.moveTo(x, height);
        ctx.lineTo(x + height, 0);
        ctx.stroke();
    }

    ctx.restore();
}

function drawCanvasPill(ctx, text, x, y, paddingX, height, fillStyle, strokeStyle, textColor) {
    setCanvasText(ctx, 25, 900, textColor);
    const width = ctx.measureText(text).width + paddingX * 2;
    fillRoundedRect(ctx, x, y, width, height, 999, fillStyle);
    strokeRoundedRect(ctx, x, y, width, height, 999, strokeStyle, 2);
    ctx.fillText(text, x + paddingX, y + Math.round((height - 25) / 2) - 2);
    return width;
}

function drawModernMetric(ctx, x, y, width, label, value, accentColor) {
    fillRoundedRect(ctx, x, y, width, 154, 24, "rgba(255, 255, 255, 0.92)");
    strokeRoundedRect(ctx, x, y, width, 154, 24, "rgba(226, 232, 240, 0.88)", 2);

    ctx.fillStyle = accentColor;
    ctx.fillRect(x + 24, y + 24, 44, 6);

    setCanvasText(ctx, 22, 900, "#64748b");
    ctx.fillText(label, x + 24, y + 48);

    setCanvasText(ctx, 31, 950, "#111827");
    drawCanvasTextBlock(ctx, value, x + 24, y + 91, width - 48, 38, 2);
}

function drawTaxRankSocialCanvas(data) {
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1080;

    const ctx = canvas.getContext('2d');
    const bg = ctx.createLinearGradient(0, 0, 1080, 1080);
    bg.addColorStop(0, "#111827");
    bg.addColorStop(0.48, "#164e63");
    bg.addColorStop(1, "#f97316");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 1080, 1080);
    drawCanvasLinePattern(ctx, 1080, 1080);

    ctx.fillStyle = "rgba(15, 23, 42, 0.18)";
    ctx.fillRect(0, 0, 1080, 1080);

    setCanvasText(ctx, 28, 950, "rgba(255, 255, 255, 0.82)");
    ctx.fillText("TAXYOU", 72, 70);
    setCanvasText(ctx, 25, 850, "rgba(255, 255, 255, 0.72)");
    const urlText = "www.taxyou.co.kr";
    ctx.fillText(urlText, 1008 - ctx.measureText(urlText).width, 73);

    fillRoundedRect(ctx, 56, 136, 968, 826, 44, "rgba(248, 250, 252, 0.96)");
    strokeRoundedRect(ctx, 56, 136, 968, 826, 44, "rgba(255, 255, 255, 0.64)", 3);

    const accent = ctx.createLinearGradient(96, 176, 984, 176);
    accent.addColorStop(0, "#14b8a6");
    accent.addColorStop(0.45, "#6366f1");
    accent.addColorStop(1, "#f59e0b");
    ctx.fillStyle = accent;
    ctx.fillRect(96, 176, 888, 8);

    drawCanvasPill(ctx, "공개 통계 참고 추정", 96, 218, 24, 52, "#ecfeff", "#99f6e4", "#0f766e");

    setCanvasText(ctx, 40, 900, "#475569");
    drawCanvasTextBlock(ctx, `${data.nicknamePlain}님의 세금 납부 위치`, 96, 304, 760, 48, 2);

    setCanvasText(ctx, 58, 950, "#0f172a");
    ctx.fillText("상위 약", 96, 410);

    const percentFontSize = data.topPercentText.length > 5 ? 148 : 184;
    setCanvasText(ctx, percentFontSize, 950, "#111827");
    ctx.fillText(data.topPercentText, 96, 474);

    fillRoundedRect(ctx, 96, 676, 888, 2, 1, "#e2e8f0");

    const cardWidth = 272;
    drawModernMetric(ctx, 96, 720, cardWidth, "비교 기준", data.benchmarkLabel, "#14b8a6");
    drawModernMetric(ctx, 404, 720, cardWidth, "1,000명 중", `약 ${data.rankNumberText}등`, "#6366f1");
    drawModernMetric(ctx, 712, 720, cardWidth, "납세자 레벨", data.levelTitle, "#f59e0b");

    setCanvasText(ctx, 23, 850, "#64748b");
    drawCanvasTextBlock(ctx, "세금 납부액은 공개하지 않은 공유용 결과입니다.", 96, 910, 590, 32, 2);

    setCanvasText(ctx, 28, 950, "#0f172a");
    const bottomBrand = "무료 세금 계산기 · TAXYOU";
    ctx.fillText(bottomBrand, 984 - ctx.measureText(bottomBrand).width, 912);

    setCanvasText(ctx, 21, 750, "rgba(255, 255, 255, 0.76)");
    ctx.fillText("공식 개인별 납세자 순위가 아닌 참고용 추정 결과입니다.", 72, 1008);

    return canvas;
}

function shareTaxRankPng(e) {
    stopDownloadButtonEvent(e);
    refreshTaxRankReportIfVisible();

    const amountVisibility = document.getElementById('rankAmountVisibility').value;
    if (amountVisibility === "visible" || !latestTaxRankShareData) {
        shareReportPng(e);
        return;
    }

    const canvas = drawTaxRankSocialCanvas(latestTaxRankShareData);

    canvasToPngBlob(canvas)
        .then(blob => {
            if (!blob) return;

            const file = new File([blob], '세금_납부_순위_공유.png', { type: 'image/png' });
            const shareData = {
                title: '세금 납부 순위',
                text: `${latestTaxRankShareData.nicknamePlain}님의 세금 납부 위치는 상위 약 ${latestTaxRankShareData.topPercentText}입니다.`,
                files: [file]
            };

            if (navigator.canShare && navigator.canShare({ files: [file] }) && navigator.share) {
                return navigator.share(shareData);
            }

            alert('이 브라우저에서는 파일 공유를 지원하지 않아 정방형 PNG 파일로 저장합니다.');
            downloadBlob(blob, '세금_납부_순위_공유.png');
        })
        .catch(err => {
            if (err && err.name === 'AbortError') return;

            console.error(err);
            alert('공유를 완료하지 못했습니다. PNG 파일로 저장합니다.');
            shareReportPng(e);
        });
}

function calculateTaxRank() {
    const taxAmount = getMoneyValue('rankTaxAmount');
    const groupKey = document.getElementById('rankCompareGroup').value;
    const nicknameInput = document.getElementById('rankNickname');
    const nicknamePlain = nicknameInput.value.trim() || "나";
    const nickname = escapeRankText(nicknamePlain);
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
    latestTaxRankShareData = {
        nickname,
        nicknamePlain,
        benchmarkLabel: benchmark.label,
        topPercentText,
        rankNumberText: rankNumber.toLocaleString(),
        levelTitle: level.title
    };

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
