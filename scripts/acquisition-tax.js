function normalizeSidoName(sido) {
    const aliases = {
        서울: "서울특별시",
        부산: "부산광역시",
        대구: "대구광역시",
        인천: "인천광역시",
        광주: "광주광역시",
        대전: "대전광역시",
        울산: "울산광역시",
        세종: "세종특별자치시",
        경기: "경기도",
        강원: "강원특별자치도",
        충북: "충청북도",
        충남: "충청남도",
        전북: "전북특별자치도",
        전남: "전라남도",
        경북: "경상북도",
        경남: "경상남도",
        제주: "제주특별자치도"
    };

    return aliases[sido] || sido || "";
}

function getRegionNameFromAddressData(data) {
    const sido = normalizeSidoName(data.sido);
    const sigungu = data.sigungu || "";
    return `${sido} ${sigungu}`.trim();
}

function getAdjustmentAreaStatusText() {
    if (acquisitionAreaStatus.isAdjustmentArea === true) return `${acquisitionAreaStatus.regionName} / 조정대상지역 가능성 있음`;
    if (acquisitionAreaStatus.isAdjustmentArea === false) return `${acquisitionAreaStatus.regionName} / 내장 목록 기준 조정대상지역 아님`;
    return "주소 검색 후 조정대상지역 여부가 표시됩니다.";
}

function updateAcquisitionAreaInfo() {
    const info = document.getElementById('acquisition_area_info');
    if (!info) return;

    info.classList.toggle('error', acquisitionAreaStatus.isAdjustmentArea === true);
    info.innerText = getAdjustmentAreaStatusText();
}

function searchAcquisitionAddress() {
    new daum.Postcode({
        oncomplete: function(data) {
            const address = data.address;
            const regionName = getRegionNameFromAddressData(data);
            const isAdjustmentArea = ADJUSTMENT_AREAS.includes(regionName);

            document.getElementById('acquisitionAddress').value = address;
            acquisitionAreaStatus = {
                address,
                regionName,
                isAdjustmentArea
            };
            updateAcquisitionAreaInfo();
        }
    }).open();
}

function getStandardAcquisitionRate(price) {
    if (price <= 600000000) return 0.01;
    if (price <= 900000000) return ((price / 100000000) * 2 / 3 - 3) / 100;
    return 0.03;
}

function getAcquisitionTaxRate(price, type) {
    if (type === 'second') return 0.08;
    if (type === 'third') return 0.12;
    return getStandardAcquisitionRate(price);
}

function calculateAcquisitionTax() {
    const price = getMoneyValue('acquisitionPrice');
    const type = document.getElementById('acquisitionType').value;
    const area = document.getElementById('acquisitionArea').value;

    if (isNaN(price) || price <= 0) {
        alert('취득가액을 정확히 입력해주세요.');
        return;
    }

    const acquisitionRate = getAcquisitionTaxRate(price, type);
    const acquisitionTax = Math.floor(price * acquisitionRate);
    const localEducationTax = Math.floor(acquisitionTax * 0.1);
    const specialRuralTax = area === 'over85' ? Math.floor(price * 0.002) : 0;
    const totalTax = acquisitionTax + localEducationTax + specialRuralTax;
    const typeLabel = document.getElementById('acquisitionType').selectedOptions[0].textContent;
    const areaLabel = document.getElementById('acquisitionArea').selectedOptions[0].textContent;
    const adjustmentAreaText = getAdjustmentAreaStatusText();
    const acquisitionAddress = acquisitionAreaStatus.address || document.getElementById('acquisitionAddress').value || "주소 미입력";

    updateReportHeaders("REAL ESTATE ACQUISITION TAX", "부동산 취득세 모의 계산 명세");

    document.getElementById('resultTableBody').innerHTML = `
        <tr class="highlight-row"><td>${icon('badge-dollar-sign')}취득가액</td><td class="text-right">${Math.floor(price).toLocaleString()} 원</td></tr>
        <tr><td>${icon('map-pin')}취득 주택 주소</td><td class="text-right">${acquisitionAddress}</td></tr>
        <tr><td>${icon('map')}조정대상지역 확인</td><td class="text-right">${adjustmentAreaText}</td></tr>
        <tr><td>${icon('pin')}취득 상황</td><td class="text-right">${typeLabel}</td></tr>
        <tr><td>${icon('ruler')}전용면적 구분</td><td class="text-right">${areaLabel}</td></tr>
        <tr class="highlight-row"><td>${icon('receipt-text')}적용 취득세율</td><td class="text-right">${(acquisitionRate * 100).toFixed(2)}%</td></tr>
        <tr><td>▪︎ 취득세 본세</td><td class="text-right">${acquisitionTax.toLocaleString()} 원</td></tr>
        <tr><td>▪︎ 지방교육세 추정</td><td class="text-right">${localEducationTax.toLocaleString()} 원</td></tr>
        <tr><td>▪︎ 농어촌특별세 추정</td><td class="text-right">${specialRuralTax.toLocaleString()} 원</td></tr>
        <tr class="total-row"><td>${icon('target')}예상 취득 관련 세금 합계</td><td class="text-right">${totalTax.toLocaleString()} 원</td></tr>
    `;

    document.getElementById('formulaContent').innerHTML = `• 일반 주택 유상취득은 취득가액 6억 원 이하 1%, 6억 초과~9억 원 이하 구간은 간이 누진 산식, 9억 원 초과는 3%를 적용했습니다.<br>• 조정대상지역 여부는 ${ADJUSTMENT_AREA_STANDARD_DATE}입니다. 고시 변경이 있을 수 있으므로 실제 신고 전에는 최신 지정 현황을 확인해야 합니다.<br>• 중과 선택 시 8% 또는 12%를 단순 적용했습니다. 실제 세액은 주택 수 산정, 조정대상지역, 감면 요건, 취득 원인, 지방자치단체 신고 기준에 따라 달라질 수 있습니다.`;
    showResult();
}
