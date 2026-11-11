function getReportActionsMarkup() {
    return `
        <div class="download-group">
            <button type="button" id="downloadImgBtn" class="btn-download"><i data-lucide="image-down" class="btn-icon" aria-hidden="true"></i>이미지(PNG) 명세서 저장</button>
            <button type="button" id="downloadPdfBtn" class="btn-download pdf-btn"><i data-lucide="file-down" class="btn-icon" aria-hidden="true"></i>계산 결과 pdf 저장</button>
            <button type="button" id="sharePngBtn" class="btn-download share-btn"><i data-lucide="share-2" class="btn-icon" aria-hidden="true"></i>결과 공유하기</button>
        </div>`;
}

function enhanceCalculatorResultPanel(resultBox) {
    const reportCard = resultBox?.querySelector('.report-card');
    if (!reportCard) return;

    if (!reportCard.id) reportCard.id = 'captureArea';
    if (!resultBox.querySelector('.download-group')) {
        resultBox.insertAdjacentHTML('beforeend', getReportActionsMarkup());
    }
}

function createCalculatorResultPanel() {
    const calculatorSection = document.querySelector('.calculator-section');
    if (!calculatorSection) return;

    const existingResultBox = document.getElementById('resultBox');
    if (existingResultBox) {
        enhanceCalculatorResultPanel(existingResultBox);
        return;
    }

    const resultBox = document.createElement('article');
    resultBox.id = 'resultBox';
    resultBox.className = 'result-box';
    resultBox.setAttribute('aria-live', 'polite');
    resultBox.tabIndex = -1;
    resultBox.innerHTML = `
        <div id="captureArea" class="report-card">
            <div class="report-header">
                <span class="report-badge" id="repBadge">TAX REPORT</span>
                <div class="report-address" id="repTitle">계산 결과</div>
                <div class="report-date" id="repCurrentDate">산출 일시: -</div>
            </div>
            <div class="report-table-scroll">
                <table class="report-table">
                    <thead><tr><th scope="col">항목</th><th scope="col" class="text-right">계산 결과</th></tr></thead>
                    <tbody id="resultTableBody"></tbody>
                </table>
            </div>
            <div class="report-notice" id="resultNotice">※ 입력한 조건에 따른 참고용 계산 결과입니다. 적용 기준과 제외 항목을 확인하고 실제 신고·계약·금융회사 심사 결과와 구분해 주세요.</div>
            <div class="report-formula-title"><i data-lucide="file-text" class="inline-icon" aria-hidden="true"></i>계산 방식과 적용 기준</div>
            <div class="report-formula-box" id="formulaContent"></div>
        </div>
        ${getReportActionsMarkup()}
    `;
    calculatorSection.after(resultBox);
}

document.addEventListener('DOMContentLoaded', () => {
    createCalculatorResultPanel();
    bindMoneyInputs();

    if (typeof updateAcquisitionAreaInfo === 'function') updateAcquisitionAreaInfo();
    if (typeof initializePublicPriceLookupStatus === 'function') initializePublicPriceLookupStatus();
    if (typeof bindFinancialTaxRateAutoSelect === 'function') {
        bindFinancialTaxRateAutoSelect();
        updateMarginalTaxRateFromIncome();
    }

    const downloadImageButton = document.getElementById('downloadImgBtn');
    const downloadPdfButton = document.getElementById('downloadPdfBtn');
    const sharePngButton = document.getElementById('sharePngBtn');

    if (downloadImageButton) downloadImageButton.addEventListener('click', downloadReportImage, true);
    if (downloadPdfButton) downloadPdfButton.addEventListener('click', downloadReportPdf, true);
    if (sharePngButton) sharePngButton.addEventListener('click', shareReportPng, true);
    renderIcons();
});
