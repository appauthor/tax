function renderIcons() {
    if (window.lucide) {
        window.lucide.createIcons();
    }
}

function icon(name) {
    return `<i data-lucide="${name}" class="inline-icon" aria-hidden="true"></i>`;
}

function getDigitsOnly(value) {
    return String(value || "").replace(/[^\d]/g, "");
}

const moneyFormatter = new Intl.NumberFormat();
const moneyPreviewFormatter = new Intl.NumberFormat('ko-KR');
const moneyPreviewUnits = [['조', 1e12], ['억', 1e8], ['만', 1e4], ['', 1]];
const moneyPreviewStates = new WeakMap();

function formatMoneyValue(value) {
    const digits = getDigitsOnly(value);
    return digits ? moneyFormatter.format(Number(digits)) : "";
}

function getMoneyValue(id) {
    const input = document.getElementById(id);
    if (!input) return 0;

    const digits = getDigitsOnly(input.value);
    return digits ? Number(digits) : 0;
}

function formatMoneyInput(event) {
    event.target.value = formatMoneyValue(event.target.value);
    updateMoneyPreview(event.target);
}

function updateMoneyPreview(input) {
    const preview = document.getElementById(`${input.id}MoneyPreview`);
    if (!preview) return;
    const previous = moneyPreviewStates.get(input);
    if (previous?.preview === preview && previous.raw === input.value) return;
    moneyPreviewStates.set(input, { preview, raw: input.value });
    const value = Number(getDigitsOnly(input.value));
    const show = Number.isSafeInteger(value) && value >= 10000;
    if (preview.hidden !== !show) preview.hidden = !show;
    if (!show) {
        if (preview.textContent) preview.textContent = '';
        return;
    }
    let remaining = value;
    const parts = [];
    for (const [unit, size] of moneyPreviewUnits) {
        const amount = Math.floor(remaining / size);
        if (amount) parts.push(`${moneyPreviewFormatter.format(amount)}${unit}`);
        remaining %= size;
    }
    const text = `입력 금액: ${parts.join(' ')}원`;
    if (preview.textContent !== text) preview.textContent = text;
}

function bindMoneyInputs(scope = document) {
    scope.querySelectorAll('.money-input').forEach(input => {
        if (input.id && !document.getElementById(`${input.id}MoneyPreview`)) {
            const preview = document.createElement('small');
            preview.id = `${input.id}MoneyPreview`;
            preview.className = 'money-preview';
            preview.hidden = true;
            input.after(preview);
            const descriptions = new Set((input.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean));
            descriptions.add(preview.id);
            input.setAttribute('aria-describedby', [...descriptions].join(' '));
        }
        input.removeEventListener('input', formatMoneyInput);
        input.addEventListener('input', formatMoneyInput);
        input.value = formatMoneyValue(input.value);
        updateMoneyPreview(input);
    });
}

function getProgressiveTax(taxBase) {
    if (taxBase <= 0) return 0;
    if (taxBase <= 100000000) return taxBase * 0.1;
    if (taxBase <= 500000000) return taxBase * 0.2 - 10000000;
    if (taxBase <= 1000000000) return taxBase * 0.3 - 60000000;
    if (taxBase <= 3000000000) return taxBase * 0.4 - 160000000;
    return taxBase * 0.5 - 460000000;
}

function calculateFamilyTax(config) {
    const amount = getMoneyValue(config.amountId);
    const deduction = Number(document.getElementById(config.deductionId).value);

    if (amount <= 0) {
        alert(config.validationMessage);
        return;
    }

    const taxBase = Math.max(0, amount - deduction);
    const tax = Math.floor(getProgressiveTax(taxBase));

    updateReportHeaders(config.badge, config.reportTitle);
    document.getElementById('resultTableBody').innerHTML = `
        <tr class="highlight-row"><td>${icon(config.icon)}${config.amountLabel}</td><td class="text-right">${amount.toLocaleString()} 원</td></tr>
        <tr><td>${icon('scale')}${config.deductionLabel}</td><td class="text-right">(-) ${deduction.toLocaleString()} 원</td></tr>
        <tr class="highlight-row"><td>${icon('trending-down')}${config.taxBaseLabel}</td><td class="text-right">${taxBase.toLocaleString()} 원</td></tr>
        <tr class="total-row"><td>${icon('target')}${config.taxLabel}</td><td class="text-right">${tax.toLocaleString()} 원</td></tr>
    `;
    document.getElementById('formulaContent').innerHTML = config.formula;
    showResult();
}

function updateReportHeaders(badgeText, titleText) {
    document.getElementById('repBadge').innerText = badgeText;
    document.getElementById('repTitle').innerText = titleText;

    const now = new Date();
    const date = [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, '0'),
        String(now.getDate()).padStart(2, '0')
    ].join('.');
    const time = [
        String(now.getHours()).padStart(2, '0'),
        String(now.getMinutes()).padStart(2, '0')
    ].join(':');

    document.getElementById('repCurrentDate').innerText = `산출 일시: ${date} ${time}`;
}

function showResult() {
    const resultBox = document.getElementById('resultBox');
    if (!resultBox) return;

    const headings = resultBox.querySelectorAll('.report-table thead th');
    for (const heading of headings) {
        const text = heading.textContent.trim();
        if (text === '세목 및 정산 구분 항목') heading.textContent = '항목';
        if (text === '금액 명세') heading.textContent = '계산 결과';
        if (heading.getAttribute('scope') !== 'col') heading.setAttribute('scope', 'col');
    }
    const formulaHeading = resultBox.querySelector('.report-formula-title');
    if (formulaHeading?.textContent.trim() === '세액 도출 핵심 명세 공식') {
        formulaHeading.textContent = '계산 방식과 적용 기준';
    }
    resultBox.style.display = 'block';
    const updateStatus = document.getElementById('resultUpdateStatus');
    if (updateStatus) updateStatus.hidden = true;
    renderIcons();
    resultBox.focus({ preventScroll: true });
    resultBox.scrollIntoView({ behavior: 'smooth' });
}

function bindResultFreshness() {
    const section = document.querySelector('.calculator-section');
    if (!section || document.getElementById('resultUpdateStatus')) return;
    const status = document.createElement('p');
    status.className = 'result-update-status';
    status.id = 'resultUpdateStatus';
    status.setAttribute('role', 'status');
    status.hidden = true;
    section.after(status);
    const clearResult = () => {
        const result = document.getElementById('resultBox');
        if (!result || result.style.display !== 'block') return;
        result.style.display = 'none';
        status.textContent = '입력 조건이 바뀌었습니다. 계산 또는 비교 버튼을 눌러 결과를 다시 확인해 주세요.';
        status.hidden = false;
    };
    // Capture runs before controllers that immediately recalculate a ranking.
    section.addEventListener('input', clearResult, true);
    section.addEventListener('change', clearResult, true);
    section.addEventListener('invalid', clearResult, true);
    // Derived/read-only amounts may be assigned by a controller without an input event.
    let previewRefreshVersion = 0;
    const refreshPreviews = () => {
        const version = ++previewRefreshVersion;
        queueMicrotask(() => {
            // Keep the last event's ordering relative to controllers' derived-value microtasks.
            if (version === previewRefreshVersion) section.querySelectorAll('.money-input').forEach(updateMoneyPreview);
        });
    };
    section.addEventListener('input', refreshPreviews);
    section.addEventListener('change', refreshPreviews);
    section.addEventListener('click', refreshPreviews);
    const observer = new MutationObserver(() => {
        const result = document.getElementById('resultBox');
        if (result?.style.display === 'block') status.hidden = true;
    });
    observer.observe(section.parentElement, { subtree: true, attributes: true, attributeFilter: ['style'] });
}

if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
    document.addEventListener('DOMContentLoaded', bindResultFreshness);
}
