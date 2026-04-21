import React, { useEffect, useRef, useState } from 'react';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';

const PRESET_STORAGE_KEY = 'bartender_template_presets_v1';

const DEFAULT_MAPPING_CANDIDATES = [
    ['바코드', ['바코드', 'barcode', 'bar code']],
    ['제품명', ['제품명', '상품명', 'productname', 'product name', 'item', 'name']],
    ['사이즈', ['사이즈', '옵션', 'size', 'option']],
    ['스타일넘버', ['스타일넘버', '스타일 번호', '상품코드', 'productcode', 'product code', 'style number', 'style']],
    ['가격', ['가격', '단가', 'price']],
    ['수량', ['수량', 'qty', 'quantity']],
];

function normalizeText(value) {
    return String(value ?? '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '')
        .replace(/[_-]+/g, '');
}

function extractTemplateFieldCandidatesFromText(content) {
    const matches = content.match(/[A-Za-z가-힣][A-Za-z가-힣0-9_+\- ]{1,40}/g) || [];
    const blacklist = new Set([
        'BarTender', 'Format', 'File', 'Edition', 'Version', 'Build', 'Print_Area',
        'DOUBLE', 'WCHAR', 'Arial', 'Courier', 'Input', 'Data', 'Common', 'Functions',
        'Subs', 'Group', 'Box', 'Control', 'Dialog', 'Background', 'Printer', 'Templates',
        'Picture', 'Light', 'UltraLight', 'ExtraBold', 'PromptOptionsPage', 'OnProcessData',
        'OnPostSerialize', 'RFID', 'Users', 'Desktop', 'Administrator', 'Documents',
        'TSC', 'TTP', 'ScreenDs', 'DbOLEDBData', 'DbOLEDBTableData', 'DbOLEDBFieldData',
        'InputFileDs', 'TextData', 'LineData', 'CircleData', 'PictureData',
    ]);
    const knownKeywords = [
        '바코드', '제품명', '상품명', '사이즈', '옵션', '스타일', '스타일넘버', '가격', '단가', '수량',
        '품명', '품번', '코드', '색상', '컬러', '브랜드', '호수', '호칭', '규격',
        'barcode', 'productname', 'product name', 'size', 'option', 'stylenumber', 'style number', 'price', 'qty', 'quantity',
    ];

    const seen = new Set();
    const results = [];

    matches.forEach((match) => {
        const value = match.trim();
        if (
            value.length < 2 ||
            value.length > 30 ||
            blacklist.has(value) ||
            /^[0-9 ]+$/.test(value) ||
            !/[가-힣A-Za-z]/.test(value)
        ) {
            return;
        }

        const normalized = value.toLowerCase().replace(/\s+/g, '');
        const looksUseful = knownKeywords.some((keyword) =>
            normalized === keyword.toLowerCase().replace(/\s+/g, '')
        );
        if (!looksUseful) {
            return;
        }

        const dedupeKey = value.toLowerCase();
        if (!seen.has(dedupeKey)) {
            seen.add(dedupeKey);
            results.push(value);
        }
    });

    return results.slice(0, 40);
}

function buildSafeDetectedFields(templateFields, excelColumns) {
    const cleanTemplateFields = (templateFields || []).filter((field) => {
        const normalized = normalizeText(field);
        return DEFAULT_MAPPING_CANDIDATES.some(([, aliases]) => aliases.includes(normalized))
            || ['바코드', '제품명', '상품명', '사이즈', '옵션', '스타일넘버', '가격', '수량'].includes(field);
    });

    if (cleanTemplateFields.length > 0) {
        return [...new Set(cleanTemplateFields)];
    }

    const excelDrivenFallback = (excelColumns || [])
        .map((column) => column.label)
        .filter((label) => {
            const normalized = normalizeText(label);
            return DEFAULT_MAPPING_CANDIDATES.some(([, aliases]) => aliases.includes(normalized));
        });

    return [...new Set(excelDrivenFallback)];
}

function buildAutoMappings(templateFields, columns) {
    const normalizedColumns = columns.map((column) => ({
        ...column,
        normalized: normalizeText(column.label),
    }));

    const results = [];
    const usedColumns = new Set();

    for (const field of templateFields) {
        const normalizedField = normalizeText(field);
        const exactColumn = normalizedColumns.find((column) => column.normalized === normalizedField);
        if (exactColumn && !usedColumns.has(exactColumn.key)) {
            results.push({ id: `${field}-${exactColumn.key}`, btField: field, excelColumnKey: exactColumn.key });
            usedColumns.add(exactColumn.key);
        }
    }

    DEFAULT_MAPPING_CANDIDATES.forEach(([, aliases]) => {
        const existing = templateFields.find((field) => aliases.includes(normalizeText(field)));
        if (!existing) return;
        if (results.some((item) => normalizeText(item.btField) === normalizeText(existing))) return;

        const matchedColumn = normalizedColumns.find((column) => aliases.includes(column.normalized));
        if (matchedColumn && !usedColumns.has(matchedColumn.key)) {
            results.push({
                id: `${existing}-${matchedColumn.key}`,
                btField: existing,
                excelColumnKey: matchedColumn.key,
            });
            usedColumns.add(matchedColumn.key);
        }
    });

    return results;
}

function loadSavedPresets() {
    try {
        return JSON.parse(localStorage.getItem(PRESET_STORAGE_KEY) || '{}');
    } catch {
        return {};
    }
}

function savePreset(templatePath, payload) {
    const presets = loadSavedPresets();
    presets[templatePath] = payload;
    localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(presets));
}

function columnLetter(index) {
    let value = index + 1;
    let result = '';
    while (value > 0) {
        const mod = (value - 1) % 26;
        result = String.fromCharCode(65 + mod) + result;
        value = Math.floor((value - mod) / 26);
    }
    return result;
}

function sanitizeHeaderKey(header, index, seenKeys) {
    const normalized = String(header ?? '')
        .trim()
        .replace(/\s+/g, '_')
        .replace(/[^\p{L}\p{N}_-]+/gu, '')
        || `column_${index + 1}`;

    let candidate = normalized;
    let suffix = 2;
    while (seenKeys.has(candidate)) {
        candidate = `${normalized}_${suffix}`;
        suffix += 1;
    }
    seenKeys.add(candidate);
    return candidate;
}

function parseWorkbook(workbook, fileName, sourcePath = '') {
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
        throw new Error('엑셀 시트를 찾을 수 없습니다.');
    }

    const worksheet = workbook.Sheets[sheetName];
    const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '', raw: false });
    const headerRow = rawRows[0] || [];
    const seenKeys = new Set();

    const columns = headerRow.map((header, index) => {
        const label = String(header ?? '').trim() || `열 ${columnLetter(index)}`;
        return {
            key: sanitizeHeaderKey(header, index, seenKeys),
            label,
            originalHeader: String(header ?? '').trim(),
            excelColumn: columnLetter(index),
            index,
        };
    });

    const rows = rawRows
        .slice(1)
        .map((row, rowIndex) => {
            const values = {};
            columns.forEach((column) => {
                values[column.key] = String(row[column.index] ?? '').trim();
            });
            return {
                id: `excel-${rowIndex + 2}`,
                rowNumber: rowIndex + 2,
                values,
            };
        })
        .filter((row) => Object.values(row.values).some(Boolean));

    return {
        path: sourcePath,
        fileName,
        sheetName,
        columns,
        rows,
    };
}

function formatPreviewPrice(value) {
    const text = String(value ?? '').trim();
    if (!text) return '-';

    const digits = text.replace(/[^\d]/g, '');
    if (!digits) return text;

    return `${Number(digits).toLocaleString('ko-KR')} 원`;
}

const LABEL_LAYOUT_PRESETS = {
    '5x3cm': {
        key: '5x3cm',
        title: '5 x 3 cm',
        aspectRatio: '5 / 3',
        maxWidth: '320px',
        minHeight: '192px',
        paddingX: '24px',
        paddingY: '18px',
        barcodeHeight: '72px',
        barcodeWidth: '240px',
        barcodeNumberSize: '22px',
        styleSize: '30px',
        nameSize: '24px',
        optionSize: '24px',
        priceSize: '34px',
    },
    '5x2.5cm': {
        key: '5x2.5cm',
        title: '5 x 2.5 cm',
        aspectRatio: '2 / 1',
        maxWidth: '320px',
        minHeight: '160px',
        paddingX: '22px',
        paddingY: '14px',
        barcodeHeight: '60px',
        barcodeWidth: '232px',
        barcodeNumberSize: '18px',
        styleSize: '26px',
        nameSize: '21px',
        optionSize: '21px',
        priceSize: '30px',
    },
};

const DEFAULT_PREVIEW_ADJUSTMENTS = {
    zoom: 100,
    density: 100,
    barcodeScale: 100,
    textScale: 100,
};

function detectLayoutPreset(templateInfo, excelInfo) {
    const sources = [
        templateInfo?.fileName,
        templateInfo?.path,
        excelInfo?.fileName,
        excelInfo?.sheetName,
    ]
        .filter(Boolean)
        .map((value) => normalizeText(value));

    if (sources.some((value) => value.includes('5x2.5cm') || value.includes('50x25') || value.includes('5x25cm'))) {
        return LABEL_LAYOUT_PRESETS['5x2.5cm'];
    }

    return LABEL_LAYOUT_PRESETS['5x3cm'];
}

export default function BarTenderPrintPanel() {
    const [bartenderConfig, setBartenderConfig] = useState({ executablePath: '', configured: false });
    const [templateInfo, setTemplateInfo] = useState(null);
    const [excelInfo, setExcelInfo] = useState(null);
    const [mappings, setMappings] = useState([]);
    const [copies, setCopies] = useState(1);
    const [isPrinting, setIsPrinting] = useState(false);
    const [isJinilLabelBridgeReady, setIsJinilLabelBridgeReady] = useState(false);
    const [previewRowIndex, setPreviewRowIndex] = useState(0);
    const [selectedLayoutKey, setSelectedLayoutKey] = useState('auto');
    const [previewAdjustments, setPreviewAdjustments] = useState(DEFAULT_PREVIEW_ADJUSTMENTS);
    const templateInputRef = useRef(null);
    const excelInputRef = useRef(null);

    useEffect(() => {
        const hasBridge = Boolean(window.electronAPI);
        setIsJinilLabelBridgeReady(hasBridge);

        if (!window.electronAPI?.getBarTenderConfig) return;
        window.electronAPI.getBarTenderConfig()
            .then((config) => {
                if (config) setBartenderConfig(config);
            })
            .catch((error) => console.error('Failed to load BarTender config:', error));
    }, []);

    useEffect(() => {
        if (!templateInfo?.path) return;
        const preset = loadSavedPresets()[templateInfo.path];
        if (preset) {
            setMappings(Array.isArray(preset.mappings) ? preset.mappings : []);
            setCopies(preset.copies || 1);
        }
    }, [templateInfo?.path]);

    useEffect(() => {
        if (!templateInfo || !excelInfo) return;
        const preset = templateInfo.path ? loadSavedPresets()[templateInfo.path] : null;
        if (preset?.mappings?.length) return;

        const autoMappings = buildAutoMappings(templateInfo.detectedFields || [], excelInfo.columns || []);
        if (autoMappings.length > 0) {
            setMappings(autoMappings);
        }
    }, [templateInfo, excelInfo]);

    useEffect(() => {
        if (!templateInfo || !excelInfo) return;
        const safeFields = buildSafeDetectedFields(templateInfo.detectedFields || [], excelInfo.columns || []);
        if (safeFields.length > 0) {
            setTemplateInfo((prev) => prev ? { ...prev, detectedFields: safeFields } : prev);
        }
    }, [templateInfo?.fileName, templateInfo?.path, excelInfo?.fileName]);

    useEffect(() => {
        setPreviewRowIndex(0);
    }, [excelInfo?.fileName, templateInfo?.fileName, templateInfo?.path]);

    useEffect(() => {
        setSelectedLayoutKey('auto');
        setPreviewAdjustments(DEFAULT_PREVIEW_ADJUSTMENTS);
    }, [templateInfo?.fileName, templateInfo?.path, excelInfo?.fileName]);

    const handlePickExecutable = async () => {
        if (!window.electronAPI?.pickBarTenderExecutable) {
            Swal.fire({
                icon: 'info',
                title: '진일 라벨 앱에서 실행해 주세요',
                text: 'BarTender 실행 파일 선택은 진일 라벨 앱에서만 가능합니다.',
            });
            return;
        }

        const result = await window.electronAPI.pickBarTenderExecutable();
        if (result) {
            setBartenderConfig(result);
        }
    };

    const handleTemplateFileSelected = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            const buffer = await file.arrayBuffer();
            const decoderUtf16 = new TextDecoder('utf-16le');
            const decoderLatin1 = new TextDecoder('latin1');
            const detectedFields = extractTemplateFieldCandidatesFromText(
                `${decoderUtf16.decode(buffer)}\n${decoderLatin1.decode(buffer)}`
            );

            setTemplateInfo({
                path: '',
                fileName: file.name,
                detectedFields,
                fromBrowserUpload: true,
            });
        } catch (error) {
            console.error(error);
            Swal.fire({ icon: 'error', title: 'BTW 파일 읽기 실패', text: error.message });
        } finally {
            event.target.value = '';
        }
    };

    const handleExcelFileSelected = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            const buffer = await file.arrayBuffer();
            const workbook = XLSX.read(buffer, { type: 'array', raw: false });
            setExcelInfo(parseWorkbook(workbook, file.name, ''));
        } catch (error) {
            console.error(error);
            Swal.fire({ icon: 'error', title: 'Excel 파일 읽기 실패', text: error.message });
        } finally {
            event.target.value = '';
        }
    };

    const handlePickTemplate = async () => {
        if (window.electronAPI?.pickBarTenderTemplate) {
            try {
                const result = await window.electronAPI.pickBarTenderTemplate();
                if (result) {
                    setTemplateInfo(result);
                }
                return;
            } catch (error) {
                console.error(error);
                Swal.fire({ icon: 'error', title: 'BTW 파일 불러오기 실패', text: error.message });
                return;
            }
        }

        templateInputRef.current?.click();
    };

    const handlePickExcel = async () => {
        if (window.electronAPI?.pickBarTenderExcel) {
            try {
                const result = await window.electronAPI.pickBarTenderExcel();
                if (result) {
                    setExcelInfo(result);
                }
                return;
            } catch (error) {
                console.error(error);
                Swal.fire({ icon: 'error', title: 'Excel 파일 불러오기 실패', text: error.message });
                return;
            }
        }

        excelInputRef.current?.click();
    };

    const clearExcelData = () => {
        Swal.fire({
            title: '엑셀 데이터 삭제',
            text: '불러온 모든 엑셀 데이터를 삭제하시겠습니까?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: '삭제',
            cancelButtonText: '취소'
        }).then((result) => {
            if (result.isConfirmed) {
                setExcelInfo(null);
                setMappings([]);
            }
        });
    };

    const handleAddMapping = () => {
        setMappings((prev) => [...prev, { id: `mapping-${Date.now()}`, btField: '', excelColumnKey: '' }]);
    };

    const handleUpdateMapping = (id, patch) => {
        setMappings((prev) => prev.map((mapping) => (
            mapping.id === id ? { ...mapping, ...patch } : mapping
        )));
    };

    const handleRemoveMapping = (id) => {
        setMappings((prev) => prev.filter((mapping) => mapping.id !== id));
    };

    const handleSavePreset = () => {
        if (!templateInfo?.path) {
            Swal.fire({
                icon: 'warning',
                title: '템플릿 경로가 필요합니다',
                text: '매핑 저장과 실제 인쇄는 진일 라벨 앱에서 선택한 .btw 템플릿에만 연결됩니다.',
            });
            return;
        }

        savePreset(templateInfo.path, { mappings, copies });
        Swal.fire({ icon: 'success', title: '매핑 저장 완료', text: '다음부터 이 템플릿은 같은 매핑을 사용합니다.', timer: 1500 });
    };

    const handlePrint = async () => {
        if (!window.electronAPI?.printWithBarTender) {
            Swal.fire({
                icon: 'warning',
                title: '진일 라벨 앱에서 실행해 주세요',
                text: 'BarTender 실제 인쇄는 진일 라벨 앱에서만 가능합니다.',
            });
            return;
        }
        if (!templateInfo?.path) {
            Swal.fire({ icon: 'warning', title: '.btw 템플릿을 먼저 선택해 주세요.' });
            return;
        }
        if (!excelInfo?.rows?.length) {
            Swal.fire({ icon: 'warning', title: 'Excel 데이터를 먼저 불러와 주세요.' });
            return;
        }

        const readyMappings = mappings.filter((mapping) => mapping.btField && mapping.excelColumnKey);
        if (readyMappings.length === 0) {
            Swal.fire({ icon: 'warning', title: '최소 1개 이상의 필드 매핑이 필요합니다.' });
            return;
        }

        setIsPrinting(true);
        try {
            const result = await window.electronAPI.printWithBarTender({
                executablePath: bartenderConfig.executablePath,
                templatePath: templateInfo.path,
                mappings: readyMappings,
                rows: excelInfo.rows,
                copies,
            });

            savePreset(templateInfo.path, { mappings: readyMappings, copies });
            Swal.fire({
                icon: 'success',
                title: 'BarTender 인쇄 전송 완료',
                text: `${result.printedRows}개 행을 ${result.copies}부씩 전송했습니다.`,
            });
        } catch (error) {
            console.error(error);
            Swal.fire({ icon: 'error', title: 'BarTender 인쇄 실패', text: error.message });
        } finally {
            setIsPrinting(false);
        }
    };

    const readyMappings = mappings.filter((mapping) => mapping.btField && mapping.excelColumnKey);
    const previewRows = excelInfo?.rows || [];
    const columns = excelInfo?.columns || [];
    const detectedFields = templateInfo?.detectedFields || [];
    const selectedPreviewRow = excelInfo?.rows?.[previewRowIndex] || excelInfo?.rows?.[0] || null;
    const previewMappedFields = readyMappings.map((mapping) => {
        const column = columns.find((item) => item.key === mapping.excelColumnKey);
        return {
            ...mapping,
            excelColumnLabel: column ? `${column.label} (${column.excelColumn})` : mapping.excelColumnKey,
            value: selectedPreviewRow?.values?.[mapping.excelColumnKey] ?? '',
        };
    });
    const autoDetectedPreset = detectLayoutPreset(templateInfo, excelInfo);
    const layoutPreset = selectedLayoutKey === 'auto'
        ? autoDetectedPreset
        : (LABEL_LAYOUT_PRESETS[selectedLayoutKey] || autoDetectedPreset);

    const renderLabelPreview = () => {
        if (!(selectedPreviewRow && previewMappedFields.length > 0)) {
            return (
                <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-600 p-8 text-sm text-gray-500 dark:text-gray-400 text-center">
                    선택한 Excel 행과 매핑 정보를 바탕으로 라벨 모양 미리보기가 표시됩니다.
                </div>
            );
        }

        const getFieldValue = (...aliases) => {
            const match = previewMappedFields.find((item) => aliases.includes(normalizeText(item.btField)));
            return match?.value ? String(match.value).trim() : '';
        };

        const barcodeValue = getFieldValue('바코드', 'barcode');
        const styleValue = getFieldValue('스타일넘버', '스타일번호', 'style number', 'stylenumber', '상품코드', 'productcode', 'product code', 'style');
        const productNameValue = getFieldValue('제품명', '상품명', 'productname', 'product name', 'item', 'name');
        const optionValue = getFieldValue('사이즈', '옵션', 'size', 'option');
        const priceValue = getFieldValue('가격', '단가', 'price');
        const otherFields = previewMappedFields.filter((item) => {
            const normalized = normalizeText(item.btField);
            return ![
                '바코드', 'barcode',
                '스타일넘버', '스타일번호', 'style number', 'stylenumber', '상품코드', 'productcode', 'product code', 'style',
                '제품명', '상품명', 'productname', 'product name', 'item', 'name',
                '사이즈', '옵션', 'size', 'option',
                '가격', '단가', 'price',
            ].includes(normalized);
        });

        const zoomScale = previewAdjustments.zoom / 100;
        const densityScale = previewAdjustments.density / 100;
        const barcodeScale = previewAdjustments.barcodeScale / 100;
        const textScale = previewAdjustments.textScale / 100;

        return (
            <div className="space-y-3">
                <div className="mx-auto w-full rounded-[24px] border border-gray-700 bg-white shadow-sm relative overflow-hidden"
                    style={{
                        maxWidth: `calc(${layoutPreset.maxWidth} * ${zoomScale})`,
                        minHeight: `calc(${layoutPreset.minHeight} * ${zoomScale})`,
                        aspectRatio: layoutPreset.aspectRatio,
                        paddingLeft: `calc(${layoutPreset.paddingX} * ${zoomScale})`,
                        paddingRight: `calc(${layoutPreset.paddingX} * ${zoomScale})`,
                        paddingTop: `calc(${layoutPreset.paddingY} * ${zoomScale})`,
                        paddingBottom: `calc(${layoutPreset.paddingY} * ${zoomScale})`,
                    }}
                >
                    <div className="flex flex-col items-center text-center" style={{ gap: `${12 * densityScale * zoomScale}px` }}>
                        <div className="w-full pt-1" style={{ maxWidth: `calc(${layoutPreset.barcodeWidth} * ${zoomScale})` }}>
                            <div
                                className="rounded-sm bg-[repeating-linear-gradient(90deg,#111_0,#111_4px,transparent_4px,transparent_10px,#111_10px,#111_14px,transparent_14px,transparent_18px)]"
                                style={{ height: `calc(${layoutPreset.barcodeHeight} * ${zoomScale} * ${barcodeScale})` }}
                            ></div>
                            <div
                                className="mt-3 leading-none tracking-[0.04em] font-medium text-black"
                                style={{ fontSize: `calc(${layoutPreset.barcodeNumberSize} * ${zoomScale} * ${textScale})` }}
                            >
                                {barcodeValue || '1025110018'}
                            </div>
                        </div>

                        <div className="leading-none font-semibold tracking-[0.08em] text-black" style={{ fontSize: `calc(${layoutPreset.styleSize} * ${zoomScale} * ${textScale})` }}>
                            {styleValue || 'SBE4DW01M'}
                        </div>

                        <div className="leading-tight font-semibold text-black break-words" style={{ fontSize: `calc(${layoutPreset.nameSize} * ${zoomScale} * ${textScale})` }}>
                            {productNameValue || '라이트 시어쉘 패딩 점퍼'}
                        </div>

                        <div className="leading-tight font-semibold text-black break-words" style={{ fontSize: `calc(${layoutPreset.optionSize} * ${zoomScale} * ${textScale})` }}>
                            {optionValue || '네이비(NAVY):XL'}
                        </div>

                        <div className="mt-1 leading-none font-semibold tracking-[0.03em] text-black" style={{ fontSize: `calc(${layoutPreset.priceSize} * ${zoomScale} * ${textScale})` }}>
                            {formatPreviewPrice(priceValue || '165000')}
                        </div>

                        {otherFields.length > 0 && (
                            <div className="w-full pt-2 border-t border-dashed border-gray-200 space-y-1">
                                {otherFields.slice(0, 3).map((item, index) => (
                                    <div key={`${item.btField}-${index}`} className="flex items-center justify-between gap-3 text-left">
                                        <div className="text-[11px] text-gray-400 font-semibold">{item.btField}</div>
                                        <div className="text-[12px] text-gray-700 break-all">{item.value || '-'}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 p-3 text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                    현재 미리보기는 제공해 주신 BarTender 샘플처럼
                    바코드, 바코드번호, 스타일넘버, 제품명, 사이즈, 가격 순서로 최대한 비슷하게 보여줍니다.
                    현재 적용 프리셋: <b>{layoutPreset.title}</b>
                </div>
            </div>
        );
    };

    const previewControl = (label, value, min, max, step, keyName) => (
        <div>
            <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">{label}</label>
                <span className="text-[11px] font-mono text-gray-400">{value}%</span>
            </div>
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(e) => setPreviewAdjustments((prev) => ({ ...prev, [keyName]: Number(e.target.value) }))}
                className="w-full accent-blue-600"
            />
        </div>
    );

    return (
        <div className="flex flex-col gap-5 min-h-full bg-white dark:bg-gray-800 rounded-xl pb-6">
            <input ref={templateInputRef} type="file" accept=".btw" className="hidden" onChange={handleTemplateFileSelected} />
            <input ref={excelInputRef} type="file" accept=".xls,.xlsx,.csv" className="hidden" onChange={handleExcelFileSelected} />

            {!isJinilLabelBridgeReady && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
                    현재는 브라우저 모드로 보입니다. 파일 선택은 가능하지만 실제 BarTender 인쇄는 진일 라벨 앱에서만 동작합니다.
                </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_1fr] gap-5">
                <div className="rounded-2xl border border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900/40">
                    <div className="flex items-center justify-between gap-3 mb-3">
                        <div>
                            <h3 className="text-sm font-bold text-gray-800 dark:text-white">BarTender 빠른 인쇄</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">.btw 템플릿을 유지한 채 Excel 데이터만 연결해서 빠르게 인쇄합니다.</p>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-[11px] font-bold ${bartenderConfig.configured ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'}`}>
                            {bartenderConfig.configured ? 'BarTender 준비 완료' : 'bartend.exe 필요'}
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3">
                            <div className="flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                    <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400">BARTENDER EXE</div>
                                    <div className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">
                                        {bartenderConfig.executablePath || '아직 실행 파일을 선택하지 않았습니다.'}
                                    </div>
                                </div>
                                <button
                                    onClick={handlePickExecutable}
                                    className="px-3 py-2 rounded-xl bg-gray-700 hover:bg-gray-800 text-white text-xs font-bold"
                                >
                                    경로 선택
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <button
                                onClick={handlePickTemplate}
                                className="rounded-2xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-4 text-left hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                            >
                                <div className="text-[11px] font-bold uppercase tracking-wider text-blue-500">1단계</div>
                                <div className="text-sm font-bold text-gray-800 dark:text-white mt-1">.btw 템플릿 선택</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                                    {templateInfo?.path || templateInfo?.fileName || 'BarTender 라벨 파일을 선택해 주세요.'}
                                </div>
                            </button>

                            <button
                                onClick={handlePickExcel}
                                className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 p-4 text-left hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors"
                            >
                                <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-500">2단계</div>
                                <div className="text-sm font-bold text-gray-800 dark:text-white mt-1">Excel 파일 선택</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                                    {excelInfo?.path || excelInfo?.fileName || '.xls / .xlsx / .csv 파일을 선택해 주세요.'}
                                </div>
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-3 items-end">
                            <div>
                                <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400">복사 수량</label>
                                <input
                                    type="number"
                                    min={1}
                                    max={999}
                                    value={copies}
                                    onChange={(e) => setCopies(Math.max(1, Number(e.target.value) || 1))}
                                    className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white text-sm"
                                />
                            </div>
                            <button
                                onClick={handleSavePreset}
                                className="px-4 py-2.5 rounded-xl bg-gray-600 hover:bg-gray-700 text-white text-sm font-bold"
                            >
                                매핑 저장
                            </button>
                            <button
                                onClick={handlePrint}
                                disabled={isPrinting}
                                className="px-5 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white text-sm font-bold"
                            >
                                {isPrinting ? '전송 중...' : '바로 인쇄'}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="rounded-2xl border border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-900/40 flex flex-col">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">.BTW에서 감지된 필드</div>
                    {detectedFields.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                            {detectedFields.map((field) => (
                                <button
                                    key={field}
                                    onClick={() => setMappings((prev) => [...prev, { id: `mapping-${Date.now()}-${field}`, btField: field, excelColumnKey: '' }])}
                                    className="px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 text-xs font-bold border border-blue-200 dark:border-blue-800"
                                >
                                    {field}
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                            템플릿에서 뚜렷한 필드명을 찾지 못했습니다. 아래에서 수동으로 매핑을 추가해 주세요.
                        </div>
                    )}
                    <div className="mt-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 p-3 text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
                        권장 방식: BarTender 안의 가변 데이터 소스 이름을
                        <b> 바코드, 제품명, 사이즈, 스타일넘버, 가격 </b>
                        처럼 명확하게 지정하면 매핑이 훨씬 안정적입니다.
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                        <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-bold text-gray-800 dark:text-white">라벨 형태 미리보기</h4>
                            <div className="text-[11px] text-gray-400">
                                {templateInfo?.fileName || '템플릿 미선택'}
                            </div>
                        </div>
                        <div className="mb-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-3 space-y-3">
                            <div>
                                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">레이아웃 프리셋</label>
                                <select
                                    value={selectedLayoutKey}
                                    onChange={(e) => setSelectedLayoutKey(e.target.value)}
                                    className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white text-sm"
                                >
                                    <option value="auto">자동 감지 ({autoDetectedPreset.title})</option>
                                    {Object.values(LABEL_LAYOUT_PRESETS).map((preset) => (
                                        <option key={preset.key} value={preset.key}>{preset.title}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid grid-cols-1 gap-3">
                                {previewControl('전체 크기', previewAdjustments.zoom, 70, 120, 1, 'zoom')}
                                {previewControl('줄 간격', previewAdjustments.density, 70, 120, 1, 'density')}
                                {previewControl('바코드 높이', previewAdjustments.barcodeScale, 70, 120, 1, 'barcodeScale')}
                                {previewControl('글자 크기', previewAdjustments.textScale, 70, 120, 1, 'textScale')}
                            </div>
                            <button
                                onClick={() => setPreviewAdjustments(DEFAULT_PREVIEW_ADJUSTMENTS)}
                                className="w-full px-3 py-2 rounded-xl bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-sm font-bold text-gray-700 dark:text-gray-200"
                            >
                                미리보기 조정 초기화
                            </button>
                        </div>
                        {renderLabelPreview()}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_1fr] gap-5">
                <div className="rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">
                    <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 flex items-center justify-between">
                        <div>
                            <h3 className="text-sm font-bold text-gray-800 dark:text-white">필드 매핑</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">BarTender 필드명과 Excel 열을 1:1로 연결해 주세요.</p>
                        </div>
                        <button
                            onClick={handleAddMapping}
                            className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
                        >
                            필드 추가
                        </button>
                    </div>

                    <div className="overflow-y-auto overflow-x-hidden p-4 space-y-3 max-h-[420px] xl:max-h-[520px]">
                        {mappings.length === 0 && (
                            <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-600 p-6 text-sm text-gray-500 dark:text-gray-400 text-center">
                                템플릿과 Excel을 선택하면 자동 매핑을 먼저 시도합니다. 부족하면 직접 행을 추가해 주세요.
                            </div>
                        )}

                        {mappings.map((mapping, index) => (
                            <div key={mapping.id} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3 items-center rounded-xl border border-gray-200 dark:border-gray-700 p-3">
                                <div>
                                    <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400">BARTENDER 필드 {index + 1}</label>
                                    <input
                                        type="text"
                                        value={mapping.btField}
                                        onChange={(e) => handleUpdateMapping(mapping.id, { btField: e.target.value })}
                                        placeholder="예: 바코드"
                                        className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400">EXCEL 열</label>
                                    <select
                                        value={mapping.excelColumnKey}
                                        onChange={(e) => handleUpdateMapping(mapping.id, { excelColumnKey: e.target.value })}
                                        className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white text-sm"
                                    >
                                        <option value="">열 선택</option>
                                        {columns.map((column) => (
                                            <option key={column.key} value={column.key}>
                                                {column.label} ({column.excelColumn})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <button
                                    onClick={() => handleRemoveMapping(mapping.id)}
                                    className="md:mt-5 px-3 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-300 text-xs font-bold"
                                >
                                    삭제
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">
                    <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40">
                        <h3 className="text-sm font-bold text-gray-800 dark:text-white">Excel 미리보기</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            {excelInfo ? `${excelInfo.fileName} | ${excelInfo.sheetName} | ${excelInfo.rows.length}행` : 'Excel 파일을 선택하면 데이터 미리보기가 표시됩니다.'}
                        </p>
                    </div>

                    <div className="overflow-y-auto overflow-x-auto p-4 max-h-[420px] xl:max-h-[520px]">
                        {previewRows.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-600 p-6 text-sm text-gray-500 dark:text-gray-400 text-center">
                                아직 불러온 Excel 데이터가 없습니다.
                            </div>
                        ) : (
                            <table className="min-w-max w-full text-sm border-collapse">
                                <thead>
                                    <tr className="bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-xs uppercase">
                                        <th className="px-3 py-2 text-left">행</th>
                                        {columns.map((column) => (
                                            <th key={column.key} className="px-3 py-2 text-left whitespace-nowrap">
                                                {column.label}
                                            </th>
                                        ))}
                                        <th className="px-3 py-2 text-right">
                                            <button onClick={clearExcelData} className="p-1 text-gray-400 hover:text-red-500 transition-colors" title="엑셀 데이터 초기화">
                                                <svg className="w-4 h-4 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                            </button>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {previewRows.map((row) => (
                                        <tr
                                            key={row.id}
                                            onClick={() => setPreviewRowIndex(Math.max(0, row.rowNumber - 2))}
                                            className={`cursor-pointer ${selectedPreviewRow?.id === row.id ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}
                                        >
                                            <td className="px-3 py-2 text-xs font-mono text-gray-400 whitespace-nowrap">{row.rowNumber}</td>
                                            {columns.map((column) => (
                                                <td key={column.key} className="px-3 py-2 text-xs text-gray-700 dark:text-gray-200 whitespace-nowrap">
                                                    {row.values[column.key]}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>

            <div className="rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">
                <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 flex items-center justify-between gap-3">
                    <div>
                        <h3 className="text-sm font-bold text-gray-800 dark:text-white">인쇄 전 미리보기</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            선택한 Excel 행이 현재 매핑대로 BarTender에 어떻게 전달되는지 먼저 확인하세요.
                        </p>
                    </div>
                    <div className="text-xs font-mono text-gray-400">
                        {selectedPreviewRow ? `선택 행: ${selectedPreviewRow.rowNumber}` : '선택 행 없음'}
                    </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-[320px_minmax(0,1fr)] gap-0">
                    <div className="border-b lg:border-b-0 lg:border-r border-gray-200 dark:border-gray-700 p-4 bg-gray-50/70 dark:bg-gray-900/20">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-3">체크 포인트</div>
                        <div className="space-y-2 text-sm">
                            <div className={`rounded-xl px-3 py-2 border ${templateInfo ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300' : 'border-gray-200 bg-white text-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-500'}`}>
                                1. BTW 템플릿: {templateInfo ? '선택됨' : '없음'}
                            </div>
                            <div className={`rounded-xl px-3 py-2 border ${excelInfo?.rows?.length ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300' : 'border-gray-200 bg-white text-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-500'}`}>
                                2. Excel 데이터: {excelInfo?.rows?.length ? `${excelInfo.rows.length}행` : '없음'}
                            </div>
                            <div className={`rounded-xl px-3 py-2 border ${readyMappings.length ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300' : 'border-gray-200 bg-white text-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-500'}`}>
                                3. 매핑 완료: {readyMappings.length}개
                            </div>
                        </div>
                        <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                            값이 비어 있거나 잘못 연결되면 여기서 바로 확인한 뒤 수정하세요.
                        </div>
                    </div>

                    <div className="p-4 overflow-x-auto">
                        {selectedPreviewRow && previewMappedFields.length > 0 ? (
                            <table className="min-w-full text-sm border-collapse">
                                <thead>
                                    <tr className="bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-xs uppercase">
                                        <th className="px-3 py-2 text-left whitespace-nowrap">BarTender 필드</th>
                                        <th className="px-3 py-2 text-left whitespace-nowrap">연결된 Excel 열</th>
                                        <th className="px-3 py-2 text-left whitespace-nowrap">전달될 값</th>
                                        <th className="px-3 py-2 text-left whitespace-nowrap">상태</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {previewMappedFields.map((item) => {
                                        const isEmpty = !String(item.value ?? '').trim();
                                        return (
                                            <tr key={`${item.btField}-${item.excelColumnKey}`}>
                                                <td className="px-3 py-2 font-semibold text-gray-800 dark:text-white whitespace-nowrap">{item.btField}</td>
                                                <td className="px-3 py-2 text-gray-600 dark:text-gray-300 whitespace-nowrap">{item.excelColumnLabel}</td>
                                                <td className="px-3 py-2 text-gray-700 dark:text-gray-200 break-all">{item.value || '-'}</td>
                                                <td className="px-3 py-2 whitespace-nowrap">
                                                    <span className={`px-2 py-1 rounded-full text-[11px] font-bold ${isEmpty ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300'}`}>
                                                        {isEmpty ? '값 없음' : '정상'}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        ) : (
                            <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-600 p-8 text-sm text-gray-500 dark:text-gray-400 text-center">
                                Excel 행과 매핑을 선택하면 인쇄 전 미리보기가 표시됩니다.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
