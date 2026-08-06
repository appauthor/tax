function createCalculatorResultPanel() {
    const calculatorSection = document.querySelector('.calculator-section');
    if (!calculatorSection || document.getElementById('resultBox')) return;

    const resultBox = document.createElement('article');
    resultBox.id = 'resultBox';
    resultBox.className = 'result-box';
    resultBox.innerHTML = `
        <div id="captureArea" class="report-card">
            <div class="report-header">
                <span class="report-badge" id="repBadge">TAX REPORT</span>
                <div class="report-address" id="repTitle">세금 계산 리포트</div>
                <div class="report-date" id="repCurrentDate">산출 일시: -</div>
            </div>
            <table class="report-table">
                <thead><tr><th>세목 및 정산 구분 항목</th><th class="text-right">금액 명세</th></tr></thead>
                <tbody id="resultTableBody"></tbody>
            </table>
            <div class="report-notice">※ 본 리포트는 참고용 예상 세액입니다. 정확한 세액은 과세 기준일, 공제 요건, 보유 현황, 세법 개정 여부에 따라 달라질 수 있습니다.</div>
            <div class="report-formula-title"><i data-lucide="file-text" class="inline-icon" aria-hidden="true"></i>세액 도출 핵심 명세 공식</div>
            <div class="report-formula-box" id="formulaContent"></div>
        </div>
        <div class="download-group">
            <button type="button" id="downloadImgBtn" class="btn-download"><i data-lucide="image-down" class="btn-icon" aria-hidden="true"></i>이미지(PNG) 명세서 저장</button>
            <button type="button" id="downloadPdfBtn" class="btn-download pdf-btn"><i data-lucide="file-down" class="btn-icon" aria-hidden="true"></i>세무 리포트 PDF 저장</button>
            <button type="button" id="sharePngBtn" class="btn-download share-btn"><i data-lucide="share-2" class="btn-icon" aria-hidden="true"></i>결과 공유하기</button>
        </div>
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

    document.getElementById('downloadImgBtn').addEventListener('click', downloadReportImage, true);
    document.getElementById('downloadPdfBtn').addEventListener('click', downloadReportPdf, true);
    document.getElementById('sharePngBtn').addEventListener('click', shareReportPng, true);
    renderIcons();
});
