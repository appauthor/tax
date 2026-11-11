let acquisitionAreaStatus = {
    address: "",
    regionName: ""
};

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
    const value = document.getElementById('acquisitionAdjustmentArea')?.value;
    const region = value === 'yes' ? '조정대상지역으로 직접 확인' : value === 'no' ? '비조정대상지역으로 직접 확인' : '조정대상지역 여부 미확인';
    return `${region} · 주소 검색은 세율을 자동 판정하지 않습니다.`;
}

function updateAcquisitionAreaInfo() {
    const info = document.getElementById('acquisition_area_info');
    if (!info) return;

    info.classList.remove('error');
    info.innerText = getAdjustmentAreaStatusText();
}

function searchAcquisitionAddress() {
    new daum.Postcode({
        oncomplete: function(data) {
            const address = data.address;
            const regionName = getRegionNameFromAddressData(data);

            document.getElementById('acquisitionAddress').value = address;
            acquisitionAreaStatus = {
                address,
                regionName
            };
            updateAcquisitionAreaInfo();
        }
    }).open();
}

function getStandardAcquisitionRate(price) {
    return RealEstateTaxMath.standardAcquisitionRate(price);
}

function getAcquisitionTaxRate(price, type) {
    return RealEstateTaxMath.acquisitionRate(price, type);
}

function calculateAcquisitionTax() {
    const type = document.getElementById('acquisitionType').value;
    const area = document.getElementById('acquisitionArea').value;
    let result;
    try {
        result = RealEstateTaxMath.calculateAcquisition({
            price: getMoneyValue('acquisitionPrice'), type, overNationalHousingSize: area === 'over85'
        });
    } catch (error) {
        document.getElementById('resultBox').style.display = 'none';
        alert(error.message);
        return;
    }
    const { price, acquisitionRate, acquisitionTax, localEducationTax, specialRuralTax, total } = result;
    const typeLabel = document.getElementById('acquisitionType').selectedOptions[0].textContent;
    const areaLabel = document.getElementById('acquisitionArea').selectedOptions[0].textContent;
    const address = acquisitionAreaStatus.address || document.getElementById('acquisitionAddress').value || '주소 미입력';
    const safeAddress = address.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
    updateReportHeaders('REAL ESTATE ACQUISITION TAX', '부동산 취득세 모의 계산 명세');
    document.getElementById('resultTableBody').innerHTML = `
        <tr class="highlight-row"><td>${icon('badge-dollar-sign')}취득가액</td><td class="text-right">${price.toLocaleString()} 원</td></tr>
        <tr><td>${icon('map-pin')}취득 주택 주소</td><td class="text-right">${safeAddress}</td></tr>
        <tr><td>조정대상지역 확인</td><td class="text-right">${getAdjustmentAreaStatusText()}</td></tr>
        <tr><td>직접 선택한 세율 구분</td><td class="text-right">${typeLabel}</td></tr>
        <tr><td>국민주택규모 구분</td><td class="text-right">${areaLabel}</td></tr>
        <tr class="highlight-row"><td>적용 취득세율</td><td class="text-right">${(acquisitionRate * 100).toFixed(2)}%</td></tr>
        <tr><td>취득세 본세</td><td class="text-right">${acquisitionTax.toLocaleString()} 원</td></tr>
        <tr><td>지방교육세 (${(result.educationRate * 100).toFixed(3)}%)</td><td class="text-right">${localEducationTax.toLocaleString()} 원</td></tr>
        <tr><td>농어촌특별세 (${(result.ruralRate * 100).toFixed(1)}%)</td><td class="text-right">${specialRuralTax.toLocaleString()} 원</td></tr>
        <tr class="total-row"><td>${icon('target')}예상 취득 관련 세금 합계</td><td class="text-right">${total.toLocaleString()} 원</td></tr>`;
    document.getElementById('formulaContent').innerHTML = '• 일반 유상취득은 6억 원 이하 1%, 6억 초과~9억 원 이하 법정 산식(산출 세율 소수점 다섯째 자리 반올림), 9억 원 초과 3%입니다.<br>• 8%·12% 중과의 지방교육세는 취득가액의 0.4%입니다. 국민주택규모 초과 시 농어촌특별세는 일반 0.2%, 8% 중과 0.6%, 12% 중과 1.0%입니다.<br>• 주소와 지역 확인값은 세율 구분을 자동 변경하지 않습니다. 취득일 기준 고시와 주택 수·중과 제외 요건을 확인해 선택하세요. 생애최초 등 감면, 일시적 2주택 판정, 상속·증여·법인·고급주택은 제외합니다. 2026년 시행 법령 · 검토 2026-11-11. 원 단위 미만은 버린 예상액입니다.';
    showResult();
}
