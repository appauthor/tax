let houseCount = 1;
const VWORLD_API_KEY = "695950CB-0602-3BE2-9A32-72C89CCB88A2";
const VWORLD_API_DOMAIN = window.TAX_CALCULATOR_CONFIG?.vworldApiDomain || "https://taxyou.co.kr";
const IS_LOCAL_DEVELOPMENT_HOST = ["localhost", "127.0.0.1"].includes(window.location.hostname);
const DEFAULT_VWORLD_PROXY_URL = IS_LOCAL_DEVELOPMENT_HOST
    ? "http://127.0.0.1:8787/vworld-proxy"
    : "/api/vworld-proxy";
const VWORLD_PROXY_URL = window.TAX_CALCULATOR_CONFIG?.vworldProxyUrl || DEFAULT_VWORLD_PROXY_URL;
const VWORLD_SEARCH_API_URL = "https://api.vworld.kr/req/search";
const APART_HOUSING_PRICE_API_URL = "https://api.vworld.kr/ned/data/getApartHousingPriceAttr";
const addressSearchDataMap = {};
const publicPriceLookupRequests = {};
const ADJUSTMENT_AREA_STANDARD_DATE = "2026.06 기준 내장 목록";
const ADJUSTMENT_AREAS = [
    "서울특별시 강남구",
    "서울특별시 서초구",
    "서울특별시 송파구",
    "서울특별시 용산구"
];
const HEALTH_INSURANCE_STANDARD_DATE = "2026년 간이 기준";
const HEALTH_LOCAL_FINANCIAL_INCOME_THRESHOLD = 10000000;
const HEALTH_EMPLOYEE_EXTRA_INCOME_THRESHOLD = 20000000;
const HEALTH_DEPENDENT_INCOME_THRESHOLD = 20000000;
const HEALTH_INSURANCE_RATE = 0.0709;
const LONG_TERM_CARE_RATE = 0.1295;
const COMPREHENSIVE_TAX_BRACKETS = [
    { limit: 14000000, rate: 0.066, label: "6.6% 구간" },
    { limit: 50000000, rate: 0.165, label: "16.5% 구간" },
    { limit: 88000000, rate: 0.264, label: "26.4% 구간" },
    { limit: 150000000, rate: 0.385, label: "38.5% 구간" },
    { limit: 300000000, rate: 0.418, label: "41.8% 구간" },
    { limit: 500000000, rate: 0.44, label: "44.0% 구간" },
    { limit: 1000000000, rate: 0.462, label: "46.2% 구간" },
    { limit: Infinity, rate: 0.495, label: "49.5% 구간" }
];
let acquisitionAreaStatus = {
    address: "",
    regionName: "",
    isAdjustmentArea: null
};

function renderIcons() {
    if (window.lucide) {
        window.lucide.createIcons();
    }
}

function icon(name) {
    return `<i data-lucide="${name}" class="inline-icon" aria-hidden="true"></i>`;
}

function showProgressDialog(title, message, detail = "") {
    let dialog = document.getElementById('progressDialog');

    if (!dialog) {
        dialog = document.createElement('div');
        dialog.id = 'progressDialog';
        dialog.className = 'progress-dialog';
        dialog.setAttribute('role', 'status');
        dialog.setAttribute('aria-live', 'polite');
        dialog.innerHTML = `
            <div class="progress-dialog-card">
                <div class="progress-spinner" aria-hidden="true"></div>
                <div class="progress-dialog-content">
                    <strong id="progressDialogTitle"></strong>
                    <p id="progressDialogMessage"></p>
                    <span id="progressDialogDetail"></span>
                </div>
            </div>
        `;
        document.body.appendChild(dialog);
    }

    document.getElementById('progressDialogTitle').innerText = getDisplaySafeMessage(title);
    document.getElementById('progressDialogMessage').innerText = getDisplaySafeMessage(message);
    document.getElementById('progressDialogDetail').innerText = getDisplaySafeMessage(detail);
    dialog.classList.add('show');
}

function getDisplaySafeMessage(message) {
    const text = String(message || "");
    const looksLikeHtmlDocument = /<!doctype html|<html[\s>]|<head[\s>]|<body[\s>]/i.test(text);

    if (looksLikeHtmlDocument) {
        return '외부 조회 응답이 올바르지 않습니다. 잠시 후 다시 시도하거나 공시가격을 직접 입력해 주세요.';
    }

    return text;
}

function hideProgressDialog(delay = 0) {
    const dialog = document.getElementById('progressDialog');
    if (!dialog) return;

    window.setTimeout(() => {
        dialog.classList.remove('show');
    }, delay);
}

function getDigitsOnly(value) {
    return String(value || "").replace(/[^\d]/g, "");
}

function formatMoneyValue(value) {
    const digits = getDigitsOnly(value);
    return digits ? Number(digits).toLocaleString() : "";
}

function getMoneyValue(id) {
    const input = document.getElementById(id);
    if (!input) return 0;

    const digits = getDigitsOnly(input.value);
    return digits ? Number(digits) : 0;
}

function setMoneyValue(id, value) {
    const input = document.getElementById(id);
    if (!input) return;

    input.value = formatMoneyValue(value);
}

function formatMoneyInput(event) {
    const input = event.target;
    input.value = formatMoneyValue(input.value);
}

function bindMoneyInputs(scope = document) {
    scope.querySelectorAll('.money-input').forEach(input => {
        input.removeEventListener('input', formatMoneyInput);
        input.addEventListener('input', formatMoneyInput);
        input.value = formatMoneyValue(input.value);
    });
}

function switchTab(mode) {
    const tabOrder = ['acquisition', 'holding', 'gift', 'inheritance', 'financial'];

    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.calculator-section').forEach(sec => sec.classList.remove('active'));
    document.getElementById('resultBox').style.display = 'none';

    const activeIndex = tabOrder.includes(mode) ? tabOrder.indexOf(mode) : 0;
    const activeMode = tabOrder[activeIndex];

    document.querySelectorAll('.tab-btn')[activeIndex].classList.add('active');
    document.getElementById(`${activeMode}Section`).classList.add('active');
}

function toggleShareInput(id, show) {
    document.getElementById(`shareBox_${id}`).style.display = show ? 'flex' : 'none';
}

function getProgressiveTax(taxBase) {
    if (taxBase <= 0) return 0;
    if (taxBase <= 100000000) return taxBase * 0.1;
    if (taxBase <= 500000000) return taxBase * 0.2 - 10000000;
    if (taxBase <= 1000000000) return taxBase * 0.3 - 60000000;
    if (taxBase <= 3000000000) return taxBase * 0.4 - 160000000;
    return taxBase * 0.5 - 460000000;
}
function updateReportHeaders(badgeText, titleText) {
    document.getElementById('repBadge').innerText = badgeText;
    document.getElementById('repTitle').innerText = titleText;
    const now = new Date();
    document.getElementById('repCurrentDate').innerText = `산출 일시: ${now.getFullYear()}.${String(now.getMonth()+1).padStart(2,'0')}.${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
}

function showResult() {
    const rb = document.getElementById('resultBox');
    rb.style.display = 'block';
    renderIcons();
    rb.scrollIntoView({ behavior: 'smooth' });
}

function getActiveMode() {
    if (document.getElementById('acquisitionSection').classList.contains('active')) return 'acquisition';
    if (document.getElementById('financialSection').classList.contains('active')) return 'financial';
    if (document.getElementById('giftSection').classList.contains('active')) return 'gift';
    if (document.getElementById('inheritanceSection').classList.contains('active')) return 'inheritance';
    return 'holding';
}

function saveAppState() {
    const houseList = document.getElementById('houseList');
    const resultBox = document.getElementById('resultBox');
    const repBadge = document.getElementById('repBadge');
    const repTitle = document.getElementById('repTitle');
    const repCurrentDate = document.getElementById('repCurrentDate');
    const resultTableBody = document.getElementById('resultTableBody');
    const formulaContent = document.getElementById('formulaContent');
    const state = {
        savedAt: Date.now(),
        houseCount,
        activeMode: document.getElementById('calculatorMenu') ? getActiveMode() : "",
        houseListHtml: houseList ? houseList.innerHTML : "",
        resultDisplay: resultBox ? resultBox.style.display : "",
        repBadge: repBadge ? repBadge.innerText : "",
        repTitle: repTitle ? repTitle.innerText : "",
        repCurrentDate: repCurrentDate ? repCurrentDate.innerText : "",
        resultTableBody: resultTableBody ? resultTableBody.innerHTML : "",
        formulaContent: formulaContent ? formulaContent.innerHTML : "",
        acquisitionAreaStatus,
        controls: []
    };

    document.querySelectorAll('input, select, textarea').forEach(control => {
        if (!control.id && !control.name) return;

        state.controls.push({
            id: control.id,
            name: control.name,
            type: control.type,
            checked: control.checked,
            value: control.value
        });
    });

    try {
        sessionStorage.setItem('taxCalculatorState', JSON.stringify(state));
    } catch (err) {
        console.error(err);
    }
}

function restoreAppState() {
    let rawState;

    try {
        rawState = sessionStorage.getItem('taxCalculatorState');
    } catch (err) {
        console.error(err);
        return;
    }

    if (!rawState) return;

    let state;

    try {
        state = JSON.parse(rawState);
    } catch (err) {
        try {
            sessionStorage.removeItem('taxCalculatorState');
        } catch (storageErr) {
            console.error(storageErr);
        }
        return;
    }

    if (!state.savedAt || Date.now() - state.savedAt > 60000) {
        try {
            sessionStorage.removeItem('taxCalculatorState');
        } catch (err) {
            console.error(err);
        }
        return;
    }

    houseCount = state.houseCount || 1;
    document.getElementById('houseList').innerHTML = state.houseListHtml || document.getElementById('houseList').innerHTML;

    (state.controls || []).forEach(savedControl => {
        const control = savedControl.id
            ? document.getElementById(savedControl.id)
            : Array.from(document.getElementsByName(savedControl.name)).find(item => item.value === savedControl.value);

        if (!control) return;

        if (control.type === 'checkbox' || control.type === 'radio') {
            control.checked = savedControl.checked;
        } else {
            control.value = savedControl.value;
        }
    });

    if (state.acquisitionAreaStatus) {
        acquisitionAreaStatus = state.acquisitionAreaStatus;
    }
    updateAcquisitionAreaInfo();

    document.querySelectorAll('.share-input-box').forEach(box => {
        const id = box.id.replace('shareBox_', '');
        const customRadio = document.querySelector(`input[name="owner_type_${id}"][value="custom"]`);
        box.style.display = customRadio && customRadio.checked ? 'flex' : 'none';
    });

    if (state.repBadge) document.getElementById('repBadge').innerText = state.repBadge;
    if (state.repTitle) document.getElementById('repTitle').innerText = state.repTitle;
    if (state.repCurrentDate) document.getElementById('repCurrentDate').innerText = state.repCurrentDate;
    if (state.resultTableBody) document.getElementById('resultTableBody').innerHTML = state.resultTableBody;
    if (state.formulaContent) document.getElementById('formulaContent').innerHTML = state.formulaContent;

    switchTab(state.activeMode || 'holding');
    document.getElementById('resultBox').style.display = state.resultDisplay || 'none';
}
