const APP_STATE_KEY = 'taxCalculatorState';
const APP_STATE_MAX_AGE_MS = 60000;
const TAB_ORDER = ['acquisition', 'holding', 'transfer', 'gift', 'inheritance', 'financial'];

function switchTab(mode) {
    const activeIndex = Math.max(0, TAB_ORDER.indexOf(mode));
    const activeMode = TAB_ORDER[activeIndex];

    document.querySelectorAll('.tab-btn').forEach((button, index) => {
        button.classList.toggle('active', index === activeIndex);
    });
    document.querySelectorAll('.calculator-section').forEach(section => {
        section.classList.toggle('active', section.id === `${activeMode}Section`);
    });
    document.getElementById('resultBox').style.display = 'none';
}

function getActiveMode() {
    const activeSection = document.querySelector('.calculator-section.active');
    return activeSection?.id.replace(/Section$/, '') || TAB_ORDER[0];
}

function openCalculatorFromHash() {
    const requestedMode = window.location.hash.match(/^#(acquisition|holding|transfer|gift|inheritance|financial)Section$/)?.[1];
    if (!requestedMode) return;

    switchTab(requestedMode);
    window.requestAnimationFrame(() => {
        document.getElementById(`${requestedMode}Section`).scrollIntoView({ behavior: 'smooth' });
    });
}

function clearAppState() {
    try {
        sessionStorage.removeItem(APP_STATE_KEY);
    } catch (error) {
        console.error(error);
    }
}

function saveAppState() {
    const getText = id => document.getElementById(id)?.innerText || "";
    const getHtml = id => document.getElementById(id)?.innerHTML || "";
    const state = {
        savedAt: Date.now(),
        houseCount,
        activeMode: getActiveMode(),
        houseListHtml: getHtml('houseList'),
        resultDisplay: document.getElementById('resultBox').style.display,
        repBadge: getText('repBadge'),
        repTitle: getText('repTitle'),
        repCurrentDate: getText('repCurrentDate'),
        resultTableBody: getHtml('resultTableBody'),
        formulaContent: getHtml('formulaContent'),
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
        sessionStorage.setItem(APP_STATE_KEY, JSON.stringify(state));
    } catch (error) {
        console.error(error);
    }
}

function restoreAppState() {
    let state;

    try {
        const rawState = sessionStorage.getItem(APP_STATE_KEY);
        if (!rawState) return;
        state = JSON.parse(rawState);
    } catch (error) {
        console.error(error);
        clearAppState();
        return;
    }

    if (!state.savedAt || Date.now() - state.savedAt > APP_STATE_MAX_AGE_MS) {
        clearAppState();
        return;
    }

    const houseList = document.getElementById('houseList');
    houseCount = state.houseCount || 1;
    if (state.houseListHtml) houseList.innerHTML = state.houseListHtml;

    (state.controls || []).forEach(savedControl => {
        const control = savedControl.id
            ? document.getElementById(savedControl.id)
            : Array.from(document.getElementsByName(savedControl.name))
                .find(item => item.value === savedControl.value);

        if (!control) return;

        if (control.type === 'checkbox' || control.type === 'radio') {
            control.checked = savedControl.checked;
        } else {
            control.value = savedControl.value;
        }
    });

    if (state.acquisitionAreaStatus) acquisitionAreaStatus = state.acquisitionAreaStatus;
    updateAcquisitionAreaInfo();

    document.querySelectorAll('.share-input-box').forEach(box => {
        const id = box.id.replace('shareBox_', '');
        const customRadio = document.querySelector(`input[name="owner_type_${id}"][value="custom"]`);
        box.style.display = customRadio?.checked ? 'flex' : 'none';
    });

    const restoredContent = {
        repBadge: state.repBadge,
        repTitle: state.repTitle,
        repCurrentDate: state.repCurrentDate,
        resultTableBody: state.resultTableBody,
        formulaContent: state.formulaContent
    };
    Object.entries(restoredContent).forEach(([id, content]) => {
        if (content) document.getElementById(id).innerHTML = content;
    });

    switchTab(state.activeMode || TAB_ORDER[0]);
    document.getElementById('resultBox').style.display = state.resultDisplay || 'none';
}

document.addEventListener("DOMContentLoaded", () => {
    restoreAppState();
    openCalculatorFromHash();
    updateAcquisitionAreaInfo();
    bindMoneyInputs();
    initializePublicPriceLookupStatus();
    bindFinancialTaxRateAutoSelect();
    updateMarginalTaxRateFromIncome();

    document.getElementById('downloadImgBtn').addEventListener('click', downloadReportImage, true);
    document.getElementById('downloadPdfBtn').addEventListener('click', downloadReportPdf, true);
    document.getElementById('sharePngBtn').addEventListener('click', shareReportPng, true);
    window.addEventListener('hashchange', openCalculatorFromHash);
    renderIcons();
});
