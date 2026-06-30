function addHouse() {
    houseCount++;
    const houseList = document.getElementById('houseList');
    const houseDiv = document.createElement('div');
    houseDiv.className = 'house-item';
    houseDiv.id = `house_${houseCount}`;
    houseDiv.innerHTML = `
        <div class="house-header"><span class="house-title"><i data-lucide="house" class="inline-icon" aria-hidden="true"></i>주택 ${houseCount} 자산 설정</span><button type="button" class="btn-remove" onclick="removeHouse(${houseCount})">삭제</button></div>
        <div class="form-group">
            <label for="addr_${houseCount}">주택 지번주소</label>
            <div class="address-search-group">
                <input type="text" class="addr-input" id="addr_${houseCount}" placeholder="주소 검색으로 지번주소를 입력해 주세요" readonly>
                <button type="button" class="btn-search" onclick="searchAddress(${houseCount})">주소 검색</button>
            </div>
        </div>
        <div class="lookup-grid">
            <div class="form-group">
                <label for="priceYear_${houseCount}">공시가격 기준연도</label>
                <input type="number" class="price-year-input" id="priceYear_${houseCount}" value="2026" min="2006" max="2030" onchange="loadPublicHouseOptions(${houseCount})">
            </div>
            <div class="form-group">
                <label for="aptDong_${houseCount}">공동주택 동명</label>
                <select class="apt-dong-input" id="aptDong_${houseCount}" onchange="updateHoOptions(${houseCount})">
                    <option value="">주소 검색 후 선택</option>
                </select>
            </div>
            <div class="form-group">
                <label for="aptHo_${houseCount}">공동주택 호명</label>
                <select class="apt-ho-input" id="aptHo_${houseCount}" onchange="lookupPublicHousePrice(${houseCount})">
                    <option value="">동명 선택 후 선택</option>
                </select>
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
                <p>공시가격 조회는 VWorld 공동주택가격 API 기준으로 동작합니다. 주소 검색 후 기준연도와 동명을 선택하고 호명을 선택하면 공시가격이 자동으로 입력됩니다.</p>
            </div>
        </div>
    `;
    houseList.appendChild(houseDiv);
    bindMoneyInputs(houseDiv);
    initializePublicPriceLookupStatus();
    renderIcons();
}

function removeHouse(id) {
    document.getElementById(`house_${id}`).remove();
}

function setApiInfo(targetId, message, status = "") {
    const apiInfoDiv = document.getElementById('api_info_' + targetId);
    if (!apiInfoDiv) return;

    apiInfoDiv.innerText = getDisplaySafeMessage(message);
    apiInfoDiv.classList.toggle('error', status === true || status === 'error');
    apiInfoDiv.classList.toggle('notice', status === 'notice');
}

function hasPublicPriceLookupConfig() {
    return Boolean(VWORLD_API_KEY && VWORLD_API_DOMAIN);
}

function getPublicPriceLookupUnavailableMessage() {
    return '공시가격 조회 설정을 확인할 수 없습니다. 현재는 공시가격을 직접 입력해 주세요.';
}

function initializePublicPriceLookupStatus() {
    if (hasPublicPriceLookupConfig()) return;

    document.querySelectorAll('.house-item').forEach(item => {
        const id = item.id.split('_')[1];
        setApiInfo(id, getPublicPriceLookupUnavailableMessage(), 'notice');
    });
}

function getJibunAddressFromPostcodeData(data) {
    if (data.userSelectedType === 'J') {
        return (data.jibunAddress || data.address || "").trim();
    }

    return (data.jibunAddress || data.autoJibunAddress || "").trim();
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

function getPublicPriceItemsFromApiData(data) {
    const items = data?.apartHousingPrices?.field
        || data?.apartHousingPrice?.field
        || data?.response?.body?.items?.item
        || data?.response?.fields?.field
        || data?.fields?.field
        || data?.items
        || data?.item
        || [];

    return Array.isArray(items) ? items : [items];
}

function getPublicPriceTotalCount(data) {
    return Number(data?.apartHousingPrices?.totalCount
        || data?.response?.totalCount
        || data?.response?.body?.totalCount
        || 0);
}

function findPublicPriceFromItems(items, dongNm, hoNm) {
    for (const item of items) {
        const itemDongNm = String(item?.dongNm || "").trim();
        const itemHoNm = String(item?.hoNm || "").trim();

        if (itemDongNm !== dongNm || itemHoNm !== hoNm) continue;

        const publicPrice = findNestedValueByKeys(item, ['pblntfPc', 'aphusPc', 'pblntfPrice', 'price', '공시가격']);
        if (!publicPrice) continue;

        return {
            publicPrice,
            matchedDongNm: itemDongNm,
            matchedHoNm: itemHoNm
        };
    }

    return null;
}

function setSelectOptions(select, values, placeholder) {
    if (!select) return;

    select.innerHTML = "";
    const placeholderOption = document.createElement('option');
    placeholderOption.value = "";
    placeholderOption.textContent = placeholder;
    select.appendChild(placeholderOption);

    values.forEach(value => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = value;
        select.appendChild(option);
    });
}

function getSortedUniqueValues(values) {
    return Array.from(new Set(values.map(value => String(value || "").trim()).filter(Boolean)))
        .sort((a, b) => a.localeCompare(b, 'ko-KR', { numeric: true }));
}

function getVworldApartHousingPriceError(data) {
    const resultCode = data?.apartHousingPrices?.resultCode;
    const resultMsg = data?.apartHousingPrices?.resultMsg;

    if (resultCode || resultMsg) {
        return [resultCode, resultMsg].filter(Boolean).join(' / ');
    }

    return "";
}

function canRequestVworldJsonp(url) {
    try {
        const parsedUrl = new URL(url);
        return parsedUrl.protocol === 'https:' && parsedUrl.hostname === 'api.vworld.kr';
    } catch (err) {
        return false;
    }
}

function shouldFallbackToVworldJsonp(response, contentType, context) {
    if (!canRequestVworldJsonp(context?.requestUrl || "")) return false;

    const isRelativeProxy = String(VWORLD_PROXY_URL || "").startsWith("/");
    const isHtmlResponse = contentType.includes('text/html') || String(context?.body || "").trim().startsWith('<!DOCTYPE html>');

    return isRelativeProxy && (response.status === 404 || isHtmlResponse);
}

function requestVworldJsonpData(url) {
    if (!canRequestVworldJsonp(url)) {
        return Promise.reject(new Error('VWorld JSONP 요청에 사용할 수 없는 주소입니다.'));
    }

    return new Promise((resolve, reject) => {
        const parsedUrl = new URL(url);
        const callbackName = `vworldJsonp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        const script = document.createElement('script');
        let timeoutId;

        function cleanup() {
            window[callbackName] = undefined;
            delete window[callbackName];
            script.remove();
            window.clearTimeout(timeoutId);
        }

        window[callbackName] = data => {
            cleanup();
            resolve(data);
        };

        script.onerror = () => {
            cleanup();
            reject(new Error('VWorld JSONP 요청에 실패했습니다. 잠시 후 다시 시도하거나 공시가격을 직접 입력해 주세요.'));
        };

        timeoutId = window.setTimeout(() => {
            cleanup();
            reject(new Error('VWorld JSONP 요청 시간이 초과되었습니다. 잠시 후 다시 시도하거나 공시가격을 직접 입력해 주세요.'));
        }, 15000);

        parsedUrl.searchParams.set('format', 'json');
        parsedUrl.searchParams.set('callback', callbackName);
        script.src = parsedUrl.toString();
        document.head.appendChild(script);
    });
}

async function requestVworldData(url) {
    if (!VWORLD_PROXY_URL) {
        throw new Error('VWorld 프록시 주소가 설정되어 있지 않습니다.');
    }

    try {
        const proxyParams = new URLSearchParams({ url });
        const response = await fetch(`${VWORLD_PROXY_URL}?${proxyParams.toString()}`);
        const contentType = response.headers.get('content-type') || "";

        if (!response.ok) {
            const message = await response.text();
            if (shouldFallbackToVworldJsonp(response, contentType, { body: message, requestUrl: url })) {
                return requestVworldJsonpData(url);
            }

            throw new Error(`VWorld 프록시 응답 오류: ${response.status}`);
        }

        if (!contentType.includes('application/json')) {
            if (shouldFallbackToVworldJsonp(response, contentType, { requestUrl: url })) {
                return requestVworldJsonpData(url);
            }

            throw new Error('VWorld 프록시가 JSON 형식이 아닌 응답을 반환했습니다.');
        }

        return response.json();
    } catch (err) {
        const isNetworkFailure = err instanceof TypeError;

        if (isNetworkFailure && IS_LOCAL_DEVELOPMENT_HOST && VWORLD_PROXY_URL.includes("127.0.0.1:8787")) {
            throw new Error('로컬 VWorld 프록시가 실행 중이 아닙니다. 터미널에서 "python3 tools/vworld-proxy.py"를 실행한 뒤 다시 시도해 주세요.');
        }

        throw err;
    }
}

function buildPnuSearchRequestUrl(address) {
    const params = new URLSearchParams({
        key: VWORLD_API_KEY,
        domain: VWORLD_API_DOMAIN,
        service: 'search',
        request: 'search',
        version: '2.0',
        crs: 'EPSG:4326',
        query: address,
        type: 'address',
        category: 'parcel',
        format: 'json',
        size: '10',
        page: '1'
    });

    return `${VWORLD_SEARCH_API_URL}?${params.toString()}`;
}

function buildApartHousingPriceRequestUrl(params) {
    return `${APART_HOUSING_PRICE_API_URL}?${params.toString()}`;
}

async function fetchPnuFromSearchApi(address) {
    const requestUrl = buildPnuSearchRequestUrl(address);
    const data = await requestVworldData(requestUrl);
    const status = data?.response?.status;

    if (status === 'NOT_FOUND') return null;
    if (status !== 'OK') {
        const errorMessage = data?.response?.error?.text || 'PNU 검색 API 오류';
        throw new Error(errorMessage);
    }

    const items = data?.response?.result?.items || [];
    if (!items.length) return null;

    const bestMatch = items[0];
    const pnu = bestMatch?.address?.pnu || bestMatch?.id || "";

    return pnu ? {
        pnu,
        matchedAddress: bestMatch.title || ""
    } : null;
}

async function ensurePnuForAddressData(targetId, data) {
    if (data.pnu) return data.pnu;

    const jibunAddress = data.jibunAddress || data.address || "";

    if (!jibunAddress) {
        throw new Error('PNU 조회에 사용할 지번주소가 없습니다.');
    }

    const pnuResult = await fetchPnuFromSearchApi(jibunAddress);
    if (!pnuResult?.pnu) {
        throw new Error('VWorld 검색 API에서 PNU를 찾지 못했습니다.');
    }

    data.pnu = pnuResult.pnu;
    data.pnuMatchedAddress = pnuResult.matchedAddress;
    return data.pnu;
}

async function fetchPublicPriceItemsByPnu(pnu, searchYear, onProgress) {
    const numOfRows = 100;
    const firstParams = new URLSearchParams({
        key: VWORLD_API_KEY,
        domain: VWORLD_API_DOMAIN,
        pnu,
        stdrYear: searchYear,
        format: 'json',
        numOfRows: String(numOfRows),
        pageNo: '1'
    });
    const firstData = await requestVworldData(buildApartHousingPriceRequestUrl(firstParams));
    const firstError = getVworldApartHousingPriceError(firstData);

    if (firstError) throw new Error(`VWorld 공시가격 API 오류: ${firstError}`);

    const items = getPublicPriceItemsFromApiData(firstData);
    const totalCount = getPublicPriceTotalCount(firstData) || items.length;
    const totalPages = Math.ceil(totalCount / numOfRows);

    if (typeof onProgress === 'function') {
        onProgress(1, totalPages, totalCount);
    }

    for (let pageNo = 2; pageNo <= totalPages; pageNo++) {
        const params = new URLSearchParams(firstParams);
        params.set('pageNo', String(pageNo));

        const pageData = await requestVworldData(buildApartHousingPriceRequestUrl(params));
        const pageError = getVworldApartHousingPriceError(pageData);
        if (pageError) throw new Error(`VWorld 공시가격 API 오류: ${pageError}`);

        items.push(...getPublicPriceItemsFromApiData(pageData));

        if (typeof onProgress === 'function') {
            onProgress(pageNo, totalPages, totalCount);
        }
    }

    return items;
}

async function loadPublicHouseOptions(targetId) {
    const addressData = addressSearchDataMap[targetId];
    const addrInput = document.getElementById(`addr_${targetId}`);
    const searchYearInput = document.getElementById(`priceYear_${targetId}`);
    const searchYear = String(searchYearInput?.value || new Date().getFullYear()).trim();

    if (!addrInput || !addrInput.value || !addressData) {
        resetPublicHouseOptions(targetId);
        return;
    }

    const requestToken = Date.now();
    publicPriceLookupRequests[targetId] = requestToken;
    setApiInfo(targetId, `${searchYear}년 공동주택 동·호 목록을 불러오는 중입니다...`);
    showProgressDialog(
        '공동주택 동·호 목록 조회 중',
        `${searchYear}년 공시가격 자료를 확인하고 있습니다.`,
        '주소의 PNU 정보를 확인하는 중입니다.'
    );

    try {
        const pnu = await ensurePnuForAddressData(targetId, addressData);
        if (publicPriceLookupRequests[targetId] !== requestToken) {
            hideProgressDialog();
            return;
        }

        showProgressDialog(
            '공동주택 동·호 목록 조회 중',
            `${searchYear}년 공동주택 자료를 불러오고 있습니다.`,
            '동명과 호명 목록을 정리하는 중입니다.'
        );

        const items = await fetchPublicPriceItemsByPnu(pnu, searchYear, (pageNo, totalPages, totalCount) => {
            if (publicPriceLookupRequests[targetId] !== requestToken) return;
            setApiInfo(targetId, `${searchYear}년 공동주택 동·호 목록을 불러오는 중입니다... (${pageNo}/${totalPages}, ${totalCount.toLocaleString()}건)`);
            showProgressDialog(
                '공동주택 동·호 목록 조회 중',
                `${searchYear}년 공동주택 자료를 불러오고 있습니다.`,
                `${pageNo}/${totalPages}페이지 확인 중 · 총 ${totalCount.toLocaleString()}건`
            );
        });
        if (publicPriceLookupRequests[targetId] !== requestToken) {
            hideProgressDialog();
            return;
        }

        addressData.publicPriceItems = items;
        addressData.publicPriceYear = searchYear;
        populatePublicHouseOptions(targetId, items);

        if (!items.length) {
            setApiInfo(targetId, `${searchYear}년 공동주택 동·호 목록을 찾지 못했습니다. 기준연도를 확인하거나 공시가격을 직접 입력해 주세요.`, true);
            showProgressDialog(
                '동·호 목록을 찾지 못했습니다',
                `${searchYear}년 자료에서 해당 주소의 공동주택 목록을 찾지 못했습니다.`,
                '기준연도를 바꾸거나 공시가격을 직접 입력해 주세요.'
            );
            hideProgressDialog(1600);
            return;
        }

        setApiInfo(targetId, `${searchYear}년 공동주택 동·호 목록을 불러왔습니다. 동명과 호명을 선택하면 공시가격이 자동으로 입력됩니다.`, 'notice');
        showProgressDialog(
            '동·호 목록 조회 완료',
            `${searchYear}년 공동주택 동명과 호명 목록을 불러왔습니다.`,
            '이제 동명과 호명을 선택해 주세요.'
        );
        hideProgressDialog(1200);
    } catch (err) {
        console.error(err);
        resetPublicHouseOptions(targetId);
        setApiInfo(targetId, `동·호 목록 조회에 실패했습니다: ${err.message || '알 수 없는 오류'}`, true);
        showProgressDialog(
            '동·호 목록 조회 실패',
            '공동주택 동·호 목록을 불러오지 못했습니다.',
            err.message || '잠시 후 다시 시도하거나 공시가격을 직접 입력해 주세요.'
        );
        hideProgressDialog(2200);
    }
}

function resetPublicHouseOptions(targetId) {
    setSelectOptions(document.getElementById(`aptDong_${targetId}`), [], '주소 검색 후 선택');
    setSelectOptions(document.getElementById(`aptHo_${targetId}`), [], '동명 선택 후 선택');
}

function populatePublicHouseOptions(targetId, items) {
    const dongSelect = document.getElementById(`aptDong_${targetId}`);
    const selectedDong = dongSelect?.value || "";
    const dongValues = getSortedUniqueValues(items.map(item => item?.dongNm));

    setSelectOptions(dongSelect, dongValues, dongValues.length ? '동명 선택' : '등록된 동 없음');

    if (dongValues.includes(selectedDong)) {
        dongSelect.value = selectedDong;
    }

    updateHoOptions(targetId);
}

function updateHoOptions(targetId) {
    const addressData = addressSearchDataMap[targetId];
    const dongSelect = document.getElementById(`aptDong_${targetId}`);
    const hoSelect = document.getElementById(`aptHo_${targetId}`);
    const selectedDong = dongSelect?.value || "";
    const selectedHo = hoSelect?.value || "";
    const items = addressData?.publicPriceItems || [];
    const hoValues = selectedDong
        ? getSortedUniqueValues(items.filter(item => String(item?.dongNm || "").trim() === selectedDong).map(item => item?.hoNm))
        : [];

    setSelectOptions(hoSelect, hoValues, selectedDong ? '호명 선택' : '동명 선택 후 선택');

    if (hoValues.includes(selectedHo)) {
        hoSelect.value = selectedHo;
    }

    const gongsiInput = document.getElementById(`gongsi_${targetId}`);
    if (gongsiInput) gongsiInput.value = "";
}

function lookupPublicHousePrice(targetId) {
    const addressData = addressSearchDataMap[targetId];
    const addrInput = document.getElementById(`addr_${targetId}`);
    const searchYear = String(document.getElementById(`priceYear_${targetId}`)?.value || new Date().getFullYear()).trim();

    if (!addrInput || !addrInput.value || !addressData) {
        setApiInfo(targetId, '주소 검색을 먼저 진행한 뒤 공시가격을 조회해 주세요.', true);
        return;
    }

    if (!addressData.publicPriceItems || addressData.publicPriceYear !== searchYear) {
        setApiInfo(targetId, '동·호 목록을 먼저 불러와야 합니다. 주소 검색을 다시 하거나 기준연도를 확인해 주세요.', true);
        return;
    }

    fetchPublicHousePrice(targetId, addressData);
}

async function fetchPublicHousePrice(targetId, data) {
    if (!hasPublicPriceLookupConfig()) {
        setApiInfo(targetId, getPublicPriceLookupUnavailableMessage(), 'notice');
        return;
    }

    if (!VWORLD_API_KEY) {
        setApiInfo(targetId, 'VWorld 인증키가 설정되지 않았습니다. 공시가격을 직접 입력해 주세요.', true);
        return;
    }

    const searchYearInput = document.getElementById(`priceYear_${targetId}`);
    const searchYear = String(searchYearInput.value || new Date().getFullYear()).trim();
    const dongNm = document.getElementById(`aptDong_${targetId}`).value.trim();
    const hoNm = document.getElementById(`aptHo_${targetId}`).value.trim();

    if (!dongNm || !hoNm) {
        setApiInfo(targetId, '공동주택 동명과 호명을 선택하면 공시가격이 자동으로 조회됩니다.', true);
        return;
    }

    setApiInfo(targetId, '선택한 동·호의 공시가격을 확인하는 중입니다...');

    try {
        const match = findPublicPriceFromItems(data.publicPriceItems || [], dongNm, hoNm);

        if (!match?.publicPrice) {
            setApiInfo(targetId, `${searchYear}년 ${dongNm} ${hoNm}의 공시가격을 찾지 못했습니다.`, true);
            return;
        }

        setMoneyValue(`gongsi_${targetId}`, match.publicPrice);
        setApiInfo(targetId, `✓ ${searchYear}년 공동주택 공시가격 조회 완료: ${match.publicPrice.toLocaleString()}원 (${match.matchedDongNm} / ${match.matchedHoNm})`);
    } catch (err) {
        console.error(err);
        setApiInfo(targetId, `공시가격 조회에 실패했습니다: ${err.message || '알 수 없는 오류'}`, true);
    }
}

function searchAddress(targetId) {
    const addrInput = document.getElementById(`addr_${targetId}`);
    new daum.Postcode({
        oncomplete: function(data) {
            const jibunAddress = getJibunAddressFromPostcodeData(data);

            if (!jibunAddress) {
                addressSearchDataMap[targetId] = null;
                addrInput.value = "";
                document.getElementById(`gongsi_${targetId}`).value = "";
                setApiInfo(targetId, '지번주소를 확인할 수 없습니다. 지번주소가 있는 검색 결과를 다시 선택해 주세요.', true);
                return;
            }

            addressSearchDataMap[targetId] = {
                ...data,
                address: jibunAddress,
                jibunAddress
            };
            addrInput.value = jibunAddress;
            document.getElementById(`gongsi_${targetId}`).value = "";
            resetPublicHouseOptions(targetId);

            if (!hasPublicPriceLookupConfig()) {
                setApiInfo(targetId, '지번주소가 입력되었습니다. ' + getPublicPriceLookupUnavailableMessage(), 'notice');
                return;
            }

            loadPublicHouseOptions(targetId);
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

function appendKoreanUnit(value, unit) {
    const text = String(value || "").trim();
    if (!text) return "";

    return text.endsWith(unit) ? text : `${text}${unit}`;
}

function getApartmentNameFromAddressData(data) {
    const buildingName = String(data?.buildingName || "").trim();
    if (buildingName) return buildingName;

    const roadAddress = String(data?.roadAddress || data?.autoRoadAddress || "").trim();
    const parenthesized = roadAddress.match(/\(([^)]+)\)\s*$/);
    if (!parenthesized) return "";

    return parenthesized[1]
        .split(',')
        .map(part => part.trim())
        .find(part => part && !part.endsWith('동')) || "";
}

function getHoldingReportTitle(targetId) {
    const addressData = addressSearchDataMap[targetId];
    const addrInput = document.getElementById(`addr_${targetId}`);
    const dongNm = document.getElementById(`aptDong_${targetId}`)?.value || "";
    const hoNm = document.getElementById(`aptHo_${targetId}`)?.value || "";
    const apartmentName = getApartmentNameFromAddressData(addressData);

    if (apartmentName && dongNm && hoNm) {
        return `${apartmentName} ${appendKoreanUnit(dongNm, '동')} ${appendKoreanUnit(hoNm, '호')}`;
    }

    if (apartmentName) return apartmentName;

    return addrInput?.value || "";
}

function calculateHoldingTax() {
    const items = document.querySelectorAll('.house-item');
    let totalMyGongsi = 0, totalPropertyBase = 0, totalPropertySub = 0, validCount = 0;
    let isJoint = false, representativeTitle = "";

    items.forEach((item) => {
        const id = item.id.split('_')[1];
        const gongsiVal = getMoneyValue(`gongsi_${id}`);
        if (!isNaN(gongsiVal) && gongsiVal > 0) {
            validCount++;
            if (!representativeTitle) {
                representativeTitle = getHoldingReportTitle(id);
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
    const reportTitle = validCount > 1 && representativeTitle
        ? `${representativeTitle} 외 ${validCount - 1}개 주택`
        : representativeTitle;

    updateReportHeaders("PROPERTY HOLDING TAX", reportTitle || "등록된 부동산 자산");

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
