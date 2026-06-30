document.addEventListener("DOMContentLoaded", function() {
    restoreAppState();
    updateAcquisitionAreaInfo();
    bindMoneyInputs();

    document.querySelectorAll('.house-item').forEach(item => {
        bindPublicPriceLookupInputs(item.id.split('_')[1]);
    });
    initializePublicPriceLookupStatus();
    bindFinancialTaxRateAutoSelect();
    updateMarginalTaxRateFromIncome();

    document.getElementById('downloadImgBtn').addEventListener('click', downloadReportImage, true);
    document.getElementById('downloadPdfBtn').addEventListener('click', downloadReportPdf, true);
    document.getElementById('sharePngBtn').addEventListener('click', shareReportPng, true);
    renderIcons();
});
