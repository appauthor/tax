function addHouse() {
    houseCount++;
    const houseList = document.getElementById('houseList');
    const houseDiv = document.createElement('div');
    houseDiv.className = 'house-item';
    houseDiv.id = `house_${houseCount}`;
    houseDiv.innerHTML = `
        <div class="house-header"><span class="house-title"><i data-lucide="house" class="inline-icon" aria-hidden="true"></i>주택 ${houseCount} 자산 설정</span><button type="button" class="btn-remove" onclick="removeHouse(${houseCount})">삭제</button></div>
        <div class="form-group">
            <label for="addr_${houseCount}">주택 검색 주소</label>
            <div class="address-search-group">
                <input type="text" class="addr-input" id="addr_${houseCount}" placeholder="주소 검색을 진행해 주세요" readonly>
                <button type="button" class="btn-search" onclick="searchAddress(${houseCount})">주소 검색</button>
            </div>
        </div>
        <div class="lookup-grid">
            <div class="form-group">
                <label for="priceYear_${houseCount}">공시가격 기준연도</label>
                <input type="number" class="price-year-input" id="priceYear_${houseCount}" value="2026" min="2006" max="2030">
            </div>
            <div class="form-group">
                <label for="aptDong_${houseCount}">공동주택 동명 (선택)</label>
                <input type="text" class="apt-dong-input" id="aptDong_${houseCount}" placeholder="예: 101">
            </div>
            <div class="form-group">
                <label for="aptHo_${houseCount}">공동주택 호명 (선택)</label>
                <input type="text" class="apt-ho-input" id="aptHo_${houseCount}" placeholder="예: 1201">
            </div>
        </div>
        <div class="form-group">
            <label>소유 지분 형태 선택 (공동명의 환산용)</label>
            <div class="ownership-group">
                <label class="ownership-label"><input type="radio" name="owner_type_${houseCount}" value="single" checked onclick="toggleShareInput(${houseCount}, false)"> 단독 소유</label>
                <label class="ownership-label"><input type="radio" name="owner_type_${houseCount}" value="joint55" onclick="toggleShareInput(${houseCount}, false)"> 공동 명의 (5:5)</label>
                <label class="ownership-label"><input type="radio" name="owner_type_${houseCount}" value="custom" onclick="toggleShareInput(${houseCount}, true)"> 지분 직접입력</label>
            </div>
            <div class="share-input-box" id="shareBox_${houseCount}">
                <label for="share_${houseCount}" style="font-size: 0.85rem;">본인 소유 지분율:</label>
                <input type="number" class="share-input" id="share_${houseCount}" value="50" min="1" max="99"> %
            </div>
        </div>
        <div class="form-group">
            <label for="gongsi_${houseCount}">조회된 전체 주택 공시가격 (원)</label>
            <input type="text" class="gongsi-input money-input" id="gongsi_${houseCount}" inputmode="numeric" placeholder="가격을 직접 입력하거나 주소를 검색하세요">
            <div class="api-info" id="api_info_${houseCount}"></div>
            <div class="helper-box">
                <strong>아파트 보유세 계산 안내</strong>
                <p>아파트처럼 한 주소에 여러 세대가 있는 경우 동명·호명을 입력하면 공시가격을 더 정확하게 조회할 수 있습니다.</p>
                <p>공시가격 자동 조회는 서버 프록시가 연결된 환경에서 동작합니다. 조회가 되지 않거나 실제와 다르면 공시가격을 직접 입력해 주세요.</p>
            </div>
        </div>
    `;
    houseList.appendChild(houseDiv);
    bindMoneyInputs(houseDiv);
    bindPublicPriceLookupInputs(houseCount);
    initializePublicPriceLookupStatus();
    renderIcons();
}

function removeHouse(id) {
    document.getElementById(`house_${id}`).remove();
}

function setApiInfo(targetId, message, status = "") {
    const apiInfoDiv = document.getElementById('api_info_' + targetId);
    if (!apiInfoDiv) return;

    apiInfoDiv.innerText = message;
    apiInfoDiv.classList.toggle('error', status === true || status === 'error');
    apiInfoDiv.classList.toggle('notice', status === 'notice');
}

function hasPublicPriceLookupConfig() {
    return Boolean(PUBLIC_DATA_PROXY_URL);
}

function getPublicPriceLookupUnavailableMessage() {
    return '공시가격 자동 조회는 서버 프록시 연결 후 사용할 수 있습니다. 현재는 공시가격을 직접 입력해 주세요.';
}

function initializePublicPriceLookupStatus() {
    if (hasPublicPriceLookupConfig()) return;

    document.querySelectorAll('.house-item').forEach(item => {
        const id = item.id.split('_')[1];
        setApiInfo(id, getPublicPriceLookupUnavailableMessage(), 'notice');
    });
}

function getParcelParts(data) {
    const bcode = data.bcode || "";
    const jibunAddress = data.jibunAddress || data.autoJibunAddress || "";
    const parcelMatch = jibunAddress.match(/(\d+)(?:-(\d+))?(?!.*\d)/);

    if (bcode.length < 10 || !parcelMatch) return null;

    return {
        sigunguCd: bcode.slice(0, 5),
        bjdongCd: bcode.slice(5, 10),
        bun: parcelMatch[1].padStart(4, '0'),
        ji: (parcelMatch[2] || "0").padStart(4, '0')
    };
}

function normalizePriceValue(value) {
    if (value === undefined || value === null) return null;

    const price = Number(String(value).replace(/[^\d.-]/g, ""));
    return Number.isFinite(price) && price > 0 ? Math.floor(price) : null;
}

function findNestedValueByKeys(value, keys, depth = 0) {
    if (value === undefined || value === null || depth > 8) return null;

    if (typeof value !== 'object') return null;

    if (Array.isArray(value)) {
        for (const item of value) {
            const found = findNestedValueByKeys(item, keys, depth + 1);
            if (found !== null) return found;
        }

        return null;
    }

    const lowerKeyMap = Object.keys(value).reduce((map, key) => {
        map[key.toLowerCase()] = key;
        return map;
    }, {});

    for (const key of keys) {
        const actualKey = lowerKeyMap[key.toLowerCase()];
        if (!actualKey) continue;

        const price = normalizePriceValue(value[actualKey]);
        if (price) return price;
    }

    if (value.name && value.value && keys.some(key => String(value.name).toLowerCase() === key.toLowerCase())) {
        const price = normalizePriceValue(value.value);
        if (price) return price;
    }

    for (const child of Object.values(value)) {
        const found = findNestedValueByKeys(child, keys, depth + 1);
        if (found !== null) return found;
    }

    return null;
}

function findPublicPriceFromApiData(data) {
    const items = data?.response?.body?.items?.item
        || data?.response?.fields?.field
        || data?.fields?.field
        || data?.items
        || data?.item
        || [];

    const list = Array.isArray(items) ? items : [items];
    const priceKeys = ['pblntfPc', 'aphusPc', 'pblntfPclnd', 'pblntfPrice', 'pubLandPrice', 'price', '공시가격'];

    for (const item of list) {
        const price = findNestedValueByKeys(item, priceKeys);
        if (price) return price;
    }

    return findNestedValueByKeys(data, priceKeys);
}

function findPublicPriceFromXmlText(xmlText) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'application/xml');

    if (doc.querySelector('parsererror')) return null;

    const priceKeys = ['pblntfPc', 'aphusPc', 'pblntfPclnd', 'pblntfPrice', 'pubLandPrice', 'price'];
    for (const key of priceKeys) {
        const node = doc.querySelector(key);
        const price = normalizePriceValue(node?.textContent);
        if (price) return price;
    }

    return null;
}

function buildPublicDataRequestUrl(params) {
    const apiUrl = `${APART_HOUSING_PRICE_API_URL}?${params.toString()}`;

    if (!PUBLIC_DATA_PROXY_URL) return null;

    const proxyParams = new URLSearchParams({ url: apiUrl });
    return `${PUBLIC_DATA_PROXY_URL}?${proxyParams.toString()}`;
}

function schedulePublicPriceLookup(targetId) {
    clearTimeout(publicPriceLookupTimers[targetId]);

    publicPriceLookupTimers[targetId] = setTimeout(() => {
        const addressData = addressSearchDataMap[targetId];
        const addrInput = document.getElementById(`addr_${targetId}`);

        if (!addrInput || !addrInput.value) return;

        if (!addressData) {
            setApiInfo(targetId, '주소 검색 정보를 다시 확인해야 합니다. 주소 검색을 한 번 더 진행하면 동·호명 기준으로 재조회됩니다.', true);
            return;
        }

        document.getElementById(`gongsi_${targetId}`).value = "";
        fetchPublicHousePrice(targetId, addressData);
    }, 500);
}

function bindPublicPriceLookupInputs(targetId) {
    [`priceYear_${targetId}`, `aptDong_${targetId}`, `aptHo_${targetId}`].forEach(id => {
        const input = document.getElementById(id);
        if (!input) return;

        input.addEventListener('change', () => schedulePublicPriceLookup(targetId));
        input.addEventListener('blur', () => schedulePublicPriceLookup(targetId));
        input.addEventListener('keydown', event => {
            if (event.key !== 'Enter') return;

            event.preventDefault();
            schedulePublicPriceLookup(targetId);
        });
    });
}

async function fetchPublicHousePrice(targetId, data) {
    if (!hasPublicPriceLookupConfig()) {
        setApiInfo(targetId, getPublicPriceLookupUnavailableMessage(), 'notice');
        return;
    }

    if (!PUBLIC_DATA_SERVICE_KEY) {
        setApiInfo(targetId, '공공데이터 서비스키가 설정되지 않았습니다. 공시가격을 직접 입력해 주세요.', true);
        return;
    }

    const parcel = getParcelParts(data);
    if (!parcel) {
        setApiInfo(targetId, '지번 정보를 확인할 수 없어 자동 조회에 실패했습니다. 공시가격을 직접 입력해주세요.', true);
        return;
    }

    const searchYearInput = document.getElementById(`priceYear_${targetId}`);
    const searchYear = String(searchYearInput.value || new Date().getFullYear()).trim();
    const dongNm = document.getElementById(`aptDong_${targetId}`).value.trim();
    const hoNm = document.getElementById(`aptHo_${targetId}`).value.trim();
    const requestToken = Date.now();

    publicPriceLookupRequests[targetId] = requestToken;

    const params = new URLSearchParams({
        serviceKey: PUBLIC_DATA_SERVICE_KEY,
        format: 'json',
        numOfRows: '10',
        pageNo: '1',
        searchYear,
        sigunguCd: parcel.sigunguCd,
        bjdongCd: parcel.bjdongCd,
        bun: parcel.bun,
        ji: parcel.ji
    });

    if (dongNm) params.set('dongNm', dongNm);
    if (hoNm) params.set('hoNm', hoNm);

    const requestUrl = buildPublicDataRequestUrl(params);
    if (!requestUrl) {
        setApiInfo(targetId, '공시가격 자동 조회를 사용할 수 없습니다. 공시가격을 직접 입력해주세요.', true);
        return;
    }

    setApiInfo(targetId, '공시가격을 조회하는 중입니다...');

    try {
        const response = await fetch(requestUrl);
        if (!response.ok) throw new Error(`API 응답 오류: ${response.status}`);

        const responseText = await response.text();
        let publicPrice = null;

        if (publicPriceLookupRequests[targetId] !== requestToken) return;

        try {
            publicPrice = findPublicPriceFromApiData(JSON.parse(responseText));
        } catch (jsonErr) {
            publicPrice = findPublicPriceFromXmlText(responseText);
        }

        if (!publicPrice) {
            setApiInfo(targetId, '공시가격을 찾지 못했습니다. 동·호명 또는 기준연도를 확인하고 직접 입력해주세요.', true);
            return;
        }

        setMoneyValue(`gongsi_${targetId}`, publicPrice);
        setApiInfo(targetId, `✓ ${searchYear}년 공동주택 공시가격 조회 완료: ${publicPrice.toLocaleString()}원`);
    } catch (err) {
        console.error(err);
        setApiInfo(targetId, '공시가격 자동 조회에 실패했습니다. 동·호명 또는 기준연도를 확인하거나 직접 입력해주세요.', true);
    }
}

function searchAddress(targetId) {
    const addrInput = document.getElementById(`addr_${targetId}`);
    new daum.Postcode({
        oncomplete: function(data) {
            const fullAddress = data.address;
            addressSearchDataMap[targetId] = data;
            addrInput.value = fullAddress;
            document.getElementById(`gongsi_${targetId}`).value = "";

            if (!hasPublicPriceLookupConfig()) {
                setApiInfo(targetId, '주소가 입력되었습니다. ' + getPublicPriceLookupUnavailableMessage(), 'notice');
                return;
            }

            fetchPublicHousePrice(targetId, data);
        }
    }).open();
}

function calculatePropertyTax(gongsiPrice) {
    const taxBase = gongsiPrice * 0.6;
    let baseTax = 0;
    if (taxBase <= 60000000) baseTax = taxBase * 0.001;
    else if (taxBase <= 150000000) baseTax = 60000 + (taxBase - 60000000) * 0.0015;
    else if (taxBase <= 300000000) baseTax = 195000 + (taxBase - 150000000) * 0.0025;
    else baseTax = 570000 + (taxBase - 300000000) * 0.004;
    return { base: Math.floor(baseTax), sub: Math.floor(baseTax * 0.2 + taxBase * 0.0014) };
}

function calculateHoldingTax() {
    const items = document.querySelectorAll('.house-item');
    let totalMyGongsi = 0, totalPropertyBase = 0, totalPropertySub = 0, validCount = 0;
    let isJoint = false, representativeAddr = "";

    items.forEach((item) => {
        const id = item.id.split('_')[1];
        const gongsiVal = getMoneyValue(`gongsi_${id}`);
        if (!isNaN(gongsiVal) && gongsiVal > 0) {
            validCount++;
            if (!representativeAddr) {
                representativeAddr = document.getElementById(`addr_${id}`).value;
            }
            const type = item.querySelector(`input[name="owner_type_${id}"]:checked`).value;
            let share = type === 'single' ? 100 : (type === 'joint55' ? 50 : parseFloat(document.getElementById(`share_${id}`).value) || 50);
            if (share < 100) isJoint = true;

            const pTax = calculatePropertyTax(gongsiVal);
            totalMyGongsi += gongsiVal * (share / 100);
            totalPropertyBase += pTax.base * (share / 100);
            totalPropertySub += pTax.sub * (share / 100);
        }
    });

    if (validCount === 0) {
        alert('공시가격을 입력해주세요.');
        return;
    }

    const gongje = (validCount === 1 && !isJoint) ? 1200000000 : 900000000;
    const jongbuBase = Math.max(0, (totalMyGongsi - gongje) * 0.6);
    let jongbuTax = jongbuBase > 0 ? (jongbuBase <= 300000000 ? jongbuBase * 0.005 : jongbuBase * 0.007) : 0;
    jongbuTax = Math.floor(jongbuTax);

    const totalTax = totalPropertyBase + totalPropertySub + jongbuTax;

    updateReportHeaders("PROPERTY HOLDING TAX", representativeAddr || "등록된 부동산 자산");

    document.getElementById('resultTableBody').innerHTML = `
        <tr><td>${icon('house')}대상 부동산 주택 수</td><td class="text-right">${validCount}개 주택</td></tr>
        <tr class="highlight-row"><td>${icon('wallet')}본인 환산 소유 자산액</td><td class="text-right">${Math.floor(totalMyGongsi).toLocaleString()} 원</td></tr>
        <tr><td>&nbsp;&nbsp;▪︎ 지분율 비례 재산세 본세</td><td class="text-right">${Math.floor(totalPropertyBase).toLocaleString()} 원</td></tr>
        <tr><td>&nbsp;&nbsp;▪︎ 지방교육세 및 도시지역분 합계</td><td class="text-right">${Math.floor(totalPropertySub).toLocaleString()} 원</td></tr>
        <tr class="highlight-row"><td>${icon('trending-up')}종합부동산세 인별 과세표준</td><td class="text-right">${Math.floor(jongbuBase).toLocaleString()} 원</td></tr>
        <tr><td>&nbsp;&nbsp;▪︎ 종합부동산세 산출 본세액</td><td class="text-right">${jongbuTax.toLocaleString()} 원</td></tr>
        <tr class="total-row"><td>${icon('target')}최종 예상 보유세 합계</td><td class="text-right">${Math.floor(totalTax).toLocaleString()} 원</td></tr>
    `;
    document.getElementById('formulaContent').innerHTML = `• 인별 주택 재산세 지분율 안분 정산과 종합부동산세 기본 공제한도(${gongje.toLocaleString()}원)를 정밀하게 연동한 총 보유세 결과서입니다.`;
    showResult();
}
