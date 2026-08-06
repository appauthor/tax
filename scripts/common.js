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

function formatMoneyInput(event) {
    event.target.value = formatMoneyValue(event.target.value);
}

function bindMoneyInputs(scope = document) {
    scope.querySelectorAll('.money-input').forEach(input => {
        input.removeEventListener('input', formatMoneyInput);
        input.addEventListener('input', formatMoneyInput);
        input.value = formatMoneyValue(input.value);
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
    resultBox.style.display = 'block';
    renderIcons();
    resultBox.scrollIntoView({ behavior: 'smooth' });
}
