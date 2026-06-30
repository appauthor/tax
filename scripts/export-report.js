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

function captureReport(scale = 4) {
    return html2canvas(document.getElementById('captureArea'), getHighQualityCaptureOptions(scale));
}

function canvasToPngBlob(canvas) {
    return new Promise(resolve => {
        canvas.toBlob(blob => resolve(blob), 'image/png', 1);
    });
}

function downloadReportImage(e) {
    stopDownloadButtonEvent(e);
    saveAppState();

    captureReport(4).then(canvas => {
        canvasToPngBlob(canvas).then(blob => {
            if (!blob) return;
            downloadBlob(blob, '세무_정산_명세서.png');
        });
    }).catch(err => {
        console.error(err);
    });
}

function shareReportPng(e) {
    stopDownloadButtonEvent(e);
    saveAppState();

    captureReport(4).then(canvas => canvasToPngBlob(canvas)).then(blob => {
        if (!blob) return;

        const file = new File([blob], '세무_정산_명세서.png', { type: 'image/png' });
        const shareData = {
            title: '세금 계산 결과',
            text: '세금 계산 결과 PNG 파일입니다.',
            files: [file]
        };

        if (navigator.canShare && navigator.canShare({ files: [file] }) && navigator.share) {
            return navigator.share(shareData);
        }

        alert('이 브라우저에서는 파일 공유를 지원하지 않아 PNG 파일로 저장합니다.');
        downloadBlob(blob, '세무_정산_명세서.png');
    }).catch(err => {
        if (err && err.name === 'AbortError') return;

        console.error(err);
        alert('공유를 완료하지 못했습니다. PNG 파일로 저장합니다.');
        downloadReportImage(e);
    });
}

function downloadReportPdf(e) {
    stopDownloadButtonEvent(e);
    saveAppState();

    captureReport(4).then(canvas => {
        const imgData = canvas.toDataURL('image/png');
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({
            orientation: 'p',
            unit: 'mm',
            format: 'a4',
            compress: false
        });
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const margin = 10;
        const printableWidth = pageWidth - margin * 2;
        const printableHeight = pageHeight - margin * 2;
        const imageHeight = (canvas.height * printableWidth) / canvas.width;
        let remainingHeight = imageHeight;
        let positionY = margin;

        pdf.addImage(imgData, 'PNG', margin, positionY, printableWidth, imageHeight, undefined, 'NONE');
        remainingHeight -= printableHeight;

        while (remainingHeight > 0) {
            pdf.addPage();
            positionY = margin - (imageHeight - remainingHeight);
            pdf.addImage(imgData, 'PNG', margin, positionY, printableWidth, imageHeight, undefined, 'NONE');
            remainingHeight -= printableHeight;
        }

        const pdfBlob = pdf.output('blob');
        downloadBlob(pdfBlob, '세무_정산_명세서.pdf');
    }).catch(err => {
        console.error(err);
    });
}
