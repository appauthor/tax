const reportCanvasSource = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
const reportPdfSource = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
const reportLibraryLoads = new Map();

function loadReportLibrary(globalName, source) {
    if (window[globalName]) return Promise.resolve(window[globalName]);
    if (!reportLibraryLoads.has(globalName)) {
        const load = new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = source;
            script.async = true;
            const fail = () => {
                script.remove();
                reject(new Error(`Could not load ${globalName} for report export.`));
            };
            script.addEventListener('error', fail, { once: true });
            script.addEventListener('load', () => {
                const library = window[globalName];
                if (library) resolve(library);
                else fail();
            }, { once: true });
            document.head.appendChild(script);
        }).catch(error => {
            reportLibraryLoads.delete(globalName);
            throw error;
        });
        reportLibraryLoads.set(globalName, load);
    }
    return reportLibraryLoads.get(globalName);
}

function warmReportSharing() {
    if (window.navigator?.share && window.navigator?.canShare) {
        // Start before the share click, whose user activation can expire.
        loadReportLibrary('html2canvas', reportCanvasSource).catch(() => {});
    }
}

function getDownloadFrame() {
    let frame = document.getElementById('downloadFrame');

    if (!frame) {
        frame = document.createElement('iframe');
        frame.id = 'downloadFrame';
        frame.name = 'downloadFrame';
        frame.style.display = 'none';
        document.body.appendChild(frame);
    }

    return frame;
}

function downloadBlob(blob, fileName) {
    if (window.navigator && window.navigator.msSaveOrOpenBlob) {
        window.navigator.msSaveOrOpenBlob(blob, fileName);
        return;
    }

    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.style.display = 'none';
    link.href = blobUrl;
    link.download = fileName;
    link.target = getDownloadFrame().name;

    document.body.appendChild(link);
    link.dispatchEvent(new MouseEvent('click', {
        view: window,
        bubbles: false,
        cancelable: true
    }));

    setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
    }, 1000);
}

function stopDownloadButtonEvent(e) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
}

function getCalculatorReportName() {
    const heading = document.querySelector('h1');
    const reportTitle = document.getElementById('repTitle');
    const rawName = heading?.textContent?.trim() || reportTitle?.textContent?.trim() || '계산기';
    const safeName = rawName
        .replace(/[^0-9A-Za-z가-힣]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .replace(/_+/g, '_');

    return safeName || '계산기';
}

function getCalculatorReportFileName(extension) {
    return `${getCalculatorReportName()}_계산_결과.${extension}`;
}

function getHighQualityCaptureOptions(scale = 4) {
    return {
        scale,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        imageTimeout: 15000,
        windowWidth: document.documentElement.scrollWidth,
        windowHeight: document.documentElement.scrollHeight
    };
}

async function captureReport(scale = 4) {
    const html2canvas = window.html2canvas || await loadReportLibrary('html2canvas', reportCanvasSource);
    const report = document.getElementById('captureArea');
    const fullTables = report.querySelectorAll('[data-full-report-table]');
    const options = getHighQualityCaptureOptions(scale);
    if (fullTables.length) {
        const width = Math.max(900, report.scrollWidth);
        let height = report.scrollHeight;
        fullTables.forEach(table => { height += Math.max(0, table.scrollHeight - table.clientHeight); });
        // Keep long rankings inside practical canvas memory/dimension limits.
        options.scale = Math.min(scale, Math.sqrt(16000000 / Math.max(1, width * height)), 30000 / Math.max(1, height));
        options.windowWidth = Math.max(options.windowWidth, width + 80);
        options.onclone = clonedDocument => {
            const clonedReport = clonedDocument.getElementById('captureArea');
            clonedReport.style.width = `${width}px`;
            clonedReport.style.maxWidth = 'none';
            clonedReport.querySelectorAll('[data-full-report-table]').forEach(table => {
                table.style.maxHeight = 'none';
                table.style.height = 'auto';
                table.style.overflow = 'visible';
            });
        };
    }
    return html2canvas(report, options);
}

function canvasToPngBlob(canvas) {
    return new Promise(resolve => {
        canvas.toBlob(blob => resolve(blob), 'image/png', 1);
    });
}

function downloadReportImage(e) {
    stopDownloadButtonEvent(e);

    return captureReport(4).then(canvasToPngBlob).then(blob => {
        if (blob) downloadBlob(blob, getCalculatorReportFileName('png'));
    }).catch(err => {
        console.error(err);
    });
}

function shareReportPng(e) {
    stopDownloadButtonEvent(e);

    return captureReport(4).then(canvasToPngBlob).then(async blob => {
        if (!blob) return;

        const reportName = getCalculatorReportName();
        const fileName = getCalculatorReportFileName('png');
        const file = new File([blob], fileName, { type: 'image/png' });
        const shareData = {
            title: `${reportName.replace(/_/g, ' ')} 계산 결과`,
            text: `${reportName.replace(/_/g, ' ')} 계산 결과 PNG 파일입니다.`,
            files: [file]
        };

        try {
            if (navigator.canShare && navigator.canShare({ files: [file] }) && navigator.share) {
                await navigator.share(shareData);
                return;
            }
            alert('이 브라우저에서는 파일 공유를 지원하지 않아 PNG 파일로 저장합니다.');
        } catch (err) {
            if (err?.name === 'AbortError') return;
            console.error(err);
            alert('공유를 완료하지 못했습니다. PNG 파일로 저장합니다.');
        }

        downloadBlob(blob, fileName);
    }).catch(err => {
        console.error(err);
    });
}

function downloadReportPdf(e) {
    stopDownloadButtonEvent(e);

    return Promise.all([
        captureReport(4),
        loadReportLibrary('jspdf', reportPdfSource)
    ]).then(([canvas, { jsPDF }]) => {
        const compression = document.getElementById('captureArea')?.dataset.pdfCompression === 'FAST' ? 'FAST' : 'NONE';
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
            orientation: 'p',
            unit: 'mm',
            format: 'a4',
            compress: compression !== 'NONE'
        });
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const margin = 10;
        const printableWidth = pageWidth - margin * 2;
        const printableHeight = pageHeight - margin * 2;
        const imageHeight = (canvas.height * printableWidth) / canvas.width;
        let remainingHeight = imageHeight;
        let positionY = margin;

        pdf.addImage(imgData, 'PNG', margin, positionY, printableWidth, imageHeight, undefined, compression);
        remainingHeight -= printableHeight;

        while (remainingHeight > 0) {
            pdf.addPage();
            positionY = margin - (imageHeight - remainingHeight);
            pdf.addImage(imgData, 'PNG', margin, positionY, printableWidth, imageHeight, undefined, compression);
            remainingHeight -= printableHeight;
        }

        const pdfBlob = pdf.output('blob');
        downloadBlob(pdfBlob, getCalculatorReportFileName('pdf'));
    }).catch(err => {
        console.error(err);
    });
}
