// 2026-11-17 공식 수수료표 대조. 연 수수료율 단위 %. 첫 계약연도·일반상품 기준.
window.IrpFeeData = {
    reviewedAt: '2026-11-17',
    bankRules: { personalThreshold: 100000000, retirementThreshold: 50000000, personalOperation: { online: [0.05, 0.03], branch: [0.10, 0.07] }, personalAsset: 0.18, retirementOperation: { online: [0.10, 0], branch: [0.25, 0.20] }, retirementAsset: { online: [0.10, 0], branch: [0.20, 0.18] } },
    providers: [
        { id: 'kb-bank', name: 'KB국민은행', source: 'https://okbfex.kbstar.com/quics?page=C027737', note: '개인부담금은 자산관리 연 0.18% 선택 조건. 장기·청년·연금수령 할인 제외.', kind: 'bank' },
        { id: 'samsung', name: '삼성증권', source: 'https://www.samsungpop.com/ux/kor/pension/center/public/commission.pop', note: '비대면은 다이렉트IRP 계약 기준. 개인납입분은 일반 계약도 관리수수료 면제.', kind: 'samsung', operation: [[100000000, 0.18], [300000000, 0.17], [null, 0.14]], asset: [[100000000, 0.12], [300000000, 0.11], [null, 0.10]] },
        { id: 'mirae', name: '미래에셋증권', source: 'https://securities.miraeasset.com/hki/hki3031/n81.do', note: '비대면은 다이렉트 관리점·전자매체 자기운용 조건. 일반 영업점 관리 계약과 다름.', kind: 'mirae', operation: [[100000000, 0.20], [300000000, 0.18], [null, 0.15]], asset: [[null, 0.10]] },
        { id: 'kb-securities', name: 'KB증권', source: 'https://www.kbsec.com/go.able?linkcd=m08050019', note: '비대면·개인납입분 면제. 대면 퇴직금의 투자비중·기존 DB/DC 등 조건부 면제는 별도 확인.', kind: 'kb-securities', operation: [[null, 0.10]], asset: [[150000000, 0.15], [null, 0.10]] }
    ]
};
