document.addEventListener("DOMContentLoaded", function() {
    restoreAppState();
    updateAcquisitionAreaInfo();
    bindMoneyInputs();

    initializePublicPriceLookupStatus();
    bindFinancialTaxRateAutoSelect();
    updateMarginalTaxRateFromIncome();

    document.getElementById('downloadImgBtn').addEventListener('click', downloadReportImage, true);
    document.getElementById('downloadPdfBtn').addEventListener('click', downloadReportPdf, true);
    document.getElementById('sharePngBtn').addEventListener('click', shareReportPng, true);
    renderIcons();
});
