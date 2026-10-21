import React, { useState, useMemo } from 'react';

/**
 * ExcelImportModal
 * Previews parsed Excel workbook sheets and detected columns before importing.
 * Allows switching sheets (if multiple sheets exist), reviewing auto-mapped columns,
 * and viewing summary of detected vendors and quantities.
 */
export default function ExcelImportModal({
    isOpen,
    onClose,
    fileName = '',
    workbook = null,
    sheetNames = [],
    parsedSheetsData = {},
    onConfirmImport
}) {
    if (!isOpen || !sheetNames.length) return null;

    const [selectedSheet, setSelectedSheet] = useState(sheetNames[0]);

    const activeSheetInfo = useMemo(() => {
        return parsedSheetsData[selectedSheet] || { rows: [], mappedItems: [], vendors: {} };
    }, [parsedSheetsData, selectedSheet]);

    const { mappedItems = [], vendors = {}, rawPreviewRows = [] } = activeSheetInfo;

    const vendorList = Object.entries(vendors);

    const totalLabelsCount = useMemo(() => {
        return mappedItems.reduce((acc, it) => {
            const qty = parseInt(it._copies || it.수량 || 1, 10);
            return acc + (isNaN(qty) || qty < 1 ? 1 : qty);
        }, 0);
    }, [mappedItems]);

    const handleImport = () => {
        if (!mappedItems.length) return;
        onConfirmImport(mappedItems, selectedSheet);
    };

    return (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-200 cursor-pointer"
            onClick={onClose}
        >
            <div 
                className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl border border-slate-100 overflow-hidden flex flex-col font-sans max-h-[90vh] cursor-default"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-6 py-4 bg-white border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-2xs text-lg font-black">
                            📊
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-[17px] font-black text-slate-800 tracking-tight">Excel 데이터 스마트 분석</h2>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200/60">
                                    자동 매핑 완료
                                </span>
                            </div>
                            <p className="text-[11px] text-slate-400 font-bold truncate max-w-md">
                                파일: <span className="text-slate-600">{fileName}</span>
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors text-lg font-bold cursor-pointer"
                    >
                        ✕
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-4 overflow-y-auto flex-1">
                    {/* Sheet Tabs if multiple */}
                    {sheetNames.length > 1 && (
                        <div className="bg-slate-50 p-1.5 rounded-xl border border-slate-200/70 flex gap-1 overflow-x-auto">
                            <span className="text-[11px] font-bold text-slate-400 px-2 py-1 flex items-center">시트 선택:</span>
                            {sheetNames.map(s => {
                                const count = (parsedSheetsData[s]?.mappedItems || []).length;
                                return (
                                    <button
                                        key={s}
                                        type="button"
                                        onClick={() => setSelectedSheet(s)}
                                        className={`px-3 py-1 rounded-lg text-[12px] font-bold transition-all whitespace-nowrap cursor-pointer ${
                                            selectedSheet === s
                                                ? 'bg-white text-blue-600 shadow-2xs border border-blue-200'
                                                : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
                                        }`}
                                    >
                                        {s} ({count}개 행)
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* Quick Stats Summary */}
                    <div className="grid grid-cols-3 gap-3">
                        <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80">
                            <span className="text-[11px] font-bold text-slate-400 block">가져올 품목 (행)</span>
                            <span className="text-[20px] font-black text-slate-800 leading-tight">
                                {mappedItems.length.toLocaleString()} <span className="text-[12px] font-bold text-slate-500">개</span>
                            </span>
                        </div>
                        <div className="bg-emerald-50/60 rounded-xl p-3 border border-emerald-100">
                            <span className="text-[11px] font-bold text-emerald-600 block">총 인쇄 예정 매수</span>
                            <span className="text-[20px] font-black text-emerald-700 leading-tight">
                                {totalLabelsCount.toLocaleString()} <span className="text-[12px] font-bold text-emerald-600">장</span>
                            </span>
                        </div>
                        <div className="bg-blue-50/60 rounded-xl p-3 border border-blue-100">
                            <span className="text-[11px] font-bold text-blue-600 block">감지된 거래처/업체</span>
                            <span className="text-[20px] font-black text-blue-700 leading-tight">
                                {vendorList.length} <span className="text-[12px] font-bold text-blue-600">곳</span>
                            </span>
                        </div>
                    </div>

                    {/* Detected Vendors Pill Bar */}
                    {vendorList.length > 0 && (
                        <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-200/70">
                            <span className="text-[11px] font-bold text-slate-500 mb-1.5 block">감지된 거래처별 수량:</span>
                            <div className="flex flex-wrap gap-1.5">
                                {vendorList.map(([vendor, info]) => (
                                    <span
                                        key={vendor}
                                        className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white border border-slate-200 text-slate-700 shadow-2xs flex items-center gap-1.5"
                                    >
                                        <span className="text-blue-600">{vendor || '기타'}</span>
                                        <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded-full">
                                            {info.count}종 • {info.qty}장
                                        </span>
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Table Preview */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-[12px] font-bold text-slate-700">
                                매핑 미리보기 (처음 5개 행)
                            </label>
                            <span className="text-[11px] text-slate-400 font-bold">
                                * 품번, 수량, 부자재코드, 부자재명, 업체명이 자동 배치되었습니다
                            </span>
                        </div>
                        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                            <table className="w-full text-left text-[12px] border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold text-[11px]">
                                        <th className="px-3 py-2 w-8 text-center">#</th>
                                        <th className="px-3 py-2">상품코드 (품번)</th>
                                        <th className="px-3 py-2">수량 (매수)</th>
                                        <th className="px-3 py-2">옵션 (부자재코드)</th>
                                        <th className="px-3 py-2">부자재명 (가격)</th>
                                        <th className="px-3 py-2">업체명 (추가1)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {mappedItems.slice(0, 5).map((item, idx) => (
                                        <tr key={item.id || idx} className="hover:bg-slate-50/60 transition-colors">
                                            <td className="px-3 py-2 text-center text-slate-400 font-bold text-[10px]">{idx + 1}</td>
                                            <td className="px-3 py-2 font-black text-slate-800">{item.productCode || '-'}</td>
                                            <td className="px-3 py-2 font-bold text-emerald-600">
                                                {item._copies || item.productName || item.수량 || '1'} 장
                                            </td>
                                            <td className="px-3 py-2 font-mono text-slate-600">{item.option || '-'}</td>
                                            <td className="px-3 py-2 font-medium text-slate-700 max-w-[200px] truncate" title={item.price}>
                                                {item.price || '-'}
                                            </td>
                                            <td className="px-3 py-2 font-bold text-blue-600">{item.extra1 || '-'}</td>
                                        </tr>
                                    ))}
                                    {mappedItems.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="px-4 py-8 text-center text-slate-400 font-bold">
                                                가져올 수 있는 데이터가 없습니다.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between">
                    <button
                        type="button"
                        onClick={onClose}
                        className="h-10 px-4 bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 rounded-xl text-[13px] font-bold transition-all cursor-pointer shadow-2xs"
                    >
                        취소
                    </button>
                    <button
                        type="button"
                        onClick={handleImport}
                        disabled={!mappedItems.length}
                        className="h-10 px-6 bg-[#00c896] hover:bg-[#00b085] text-white font-black rounded-xl text-[14px] shadow-md shadow-emerald-200/60 transition-all active:scale-[0.98] flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        총 {mappedItems.length.toLocaleString()}개 행 데이터 가져오기
                    </button>
                </div>
            </div>
        </div>
    );
}
