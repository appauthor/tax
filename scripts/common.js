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
