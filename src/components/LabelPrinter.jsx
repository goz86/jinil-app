import React, { useState, useRef, useCallback, useEffect, useEffectEvent, useMemo } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { db } from '../firebase';
import { collection, onSnapshot, addDoc, deleteDoc, doc, query, orderBy, serverTimestamp } from 'firebase/firestore';
import JsBarcode from 'jsbarcode';
import Swal from 'sweetalert2';
import BarTenderPrintPanel from './BarTenderPrintPanel';
import * as XLSX from 'xlsx';
const MM_TO_PX = 3.78; // 96 DPI standard conversion

/* ───────── Constants ───────── */
const PAPER_SIZES = [
    { key: 'custom_50x30', label: '50 × 30 mm', width: 50, height: 30 },
    { key: 'custom_50x25', label: '50 × 25 mm', width: 50, height: 25 },
    { key: 'custom_40x30', label: '40 × 30 mm', width: 40, height: 30 },
    { key: 'custom_40x20', label: '40 × 20 mm', width: 40, height: 20 },
    { key: 'custom_60x40', label: '60 × 40 mm', width: 60, height: 40 },
    { key: 'custom_60x30', label: '60 × 30 mm', width: 60, height: 30 },
    { key: 'custom_70x40', label: '70 × 40 mm', width: 70, height: 40 },
    { key: 'custom_100x50', label: '100 × 50 mm', width: 100, height: 50 },
    { key: 'custom', label: '사용자 정의', width: 50, height: 30 },
];

const CORE_FIELD_KEYS = ['productCode', 'productName', 'option', 'price'];

const DEFAULT_FIELD_POSITIONS = {
    productCode: { x: 50, y: 25 },
    productName: { x: 50, y: 40 },
    option: { x: 50, y: 55 },
    price: { x: 50, y: 70 },
    extra1: { x: 50, y: 85 },
    extra2: { x: 50, y: 92 },
};

const DEFAULT_FIELD_STYLES = {
    productCode: { fontWeight: 800, sizeOffset: 2, textAlign: 'center', fontFamily: 'Nanum Gothic' },
    productName: { fontWeight: 600, sizeOffset: 0, textAlign: 'center', fontFamily: 'Nanum Gothic' },
    option: { fontWeight: 400, sizeOffset: 0, textAlign: 'center', fontFamily: 'Nanum Gothic' },
    price: { fontWeight: 900, sizeOffset: 3, textAlign: 'center', fontFamily: 'Nanum Gothic' },
    extra1: { fontWeight: 500, sizeOffset: 0, textAlign: 'center', fontFamily: 'Nanum Gothic' },
    extra2: { fontWeight: 500, sizeOffset: 0, textAlign: 'center', fontFamily: 'Nanum Gothic' },
};

const CORE_FIELD_LABELS = {
    productCode: '상품코드',
    productName: '상품명',
    option: '옵션',
    price: '가격',
};

const WEIGHT_CYCLE = [400, 600, 800, 900];

function ls(key, fallback) {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
    catch { return fallback; }
}

function createStableId(prefix) {
    return `${prefix}${crypto.randomUUID().replace(/-/g, '')}`;
}

function createLabelItem(fieldKeys) {
    const item = { id: createStableId('row_') };
    fieldKeys.forEach((key) => {
        item[key] = '';
    });
    return item;
}

const barcodeCache = new Map();
function generateBarcodeBase64(text, heightPt, displayValue = true) {
    if (!text) return '';
    const cacheKey = `${text}_${heightPt}_${displayValue}`;
    if (barcodeCache.has(cacheKey)) return barcodeCache.get(cacheKey);
    try {
        const canvas = document.createElement('canvas');
        JsBarcode(canvas, String(text), {
            format: "CODE128",
            displayValue: displayValue,
            fontSize: Math.max(12, heightPt * 1.5),
            height: Math.max(30, heightPt * 4),
            margin: 0,
            background: "transparent"
        });
        const base64 = canvas.toDataURL('image/png');
        if (barcodeCache.size > 1000) barcodeCache.clear(); // simple memory limit
        barcodeCache.set(cacheKey, base64);
        return base64;
    } catch {
        return '';
    }
}

/** A, B, … Z, AA, … for fallback column labels */
function excelColumnLetters(zeroBasedIndex) {
    let n = zeroBasedIndex + 1;
    let s = '';
    while (n > 0) {
        const m = (n - 1) % 26;
        s = String.fromCharCode(65 + m) + s;
        n = Math.floor((n - 1) / 26);
    }
    return s;
}

function inferMaxColIndex(rows, maxRows = 1000) {
    let max = 0;
    const lim = Math.min(rows.length, maxRows);
    for (let r = 0; r < lim; r++) {
        const row = rows[r];
        if (!row) continue;
        max = Math.max(max, row.length);
        for (let c = 0; c < row.length; c++) {
            if (row[c] !== undefined && row[c] !== null && String(row[c]).trim()) {
                max = Math.max(max, c + 1);
            }
        }
    }
    return max;
}

/** Max data rows + preamble scan rows — avoids loading huge sheets into one array (browser freeze). */
const EXCEL_IMPORT_MAX_DATA_ROWS = 20000;
const DATA_TABLE_PAGE_SIZE = 100;
const EXCEL_IMPORT_PREAMBLE_ROWS = 500;

function capSheetRange(ws) {
    if (!ws?.['!ref']) return { range: null, sheetTruncated: false };
    const d = XLSX.utils.decode_range(ws['!ref']);
    const span = EXCEL_IMPORT_PREAMBLE_ROWS + EXCEL_IMPORT_MAX_DATA_ROWS;
    const endR = Math.min(d.e.r, d.s.r + span - 1);
    const sheetTruncated = d.e.r > endR;
    const range = { s: { r: d.s.r, c: d.s.c }, e: { r: endR, c: d.e.c } };
    return { range, sheetTruncated };
}

/** Heuristic: short text that looks like a column title (Korean/English), not a full product name sentence. */
function cellLooksLikeColumnHeaderText(val) {
    const t = String(val ?? '').trim();
    if (!t || t.length > 48) return false;
    if (/^(code|name|opt|pric|size|sku|item|bar|qty|amt|no\.?|#)$/i.test(t)) return true;
    if (t.length <= 20) {
        if (/^[\d#]+$/g.test(t)) return false;
        if (/[a-zA-Z](?:\s*[-–]\s*|\s*\/\s*)[a-zA-Z]/.test(t) && t.length > 6) return false;
    }
    if (/상품|품번|스타일|자재|코드|이름|품명|가격|단가|옵션|수량|규격|색상|사이즈|구분|바코드|원산지|브랜드|styl|name|code|item|opt|pric|size|barcode|bar|unit|style|type|date|reg|no\.?|#/gi.test(t)) return true;
    return /^(no|sku|id|upc|ref)\.?$/i.test(t);
}

/**
 * Picks a header row: if any cell looks like a “column title”, those rows are preferred; then more filled cells, then a smaller row index.
 * Avoids mistaking the first data line (more values than a thin title row) for a header.
 */
function pickHeaderRowIndex(rows, maxCol, maxScan = EXCEL_IMPORT_PREAMBLE_ROWS) {
    if (!rows?.length || maxCol <= 0) return 0;
    const lim = Math.min(rows.length, maxScan);
    const scored = [];
    for (let r = 0; r < lim; r++) {
        const row = rows[r];
        if (!row) continue;
        let n = 0;
        let h = 0;
        for (let c = 0; c < maxCol; c++) {
            const cell = row[c];
            if (cell !== undefined && cell !== null && String(cell).trim()) {
                n++;
                if (cellLooksLikeColumnHeaderText(cell)) h++;
            }
        }
        if (n > 0) scored.push({ r, n, h });
    }
    if (scored.length === 0) return 0;
    const withHeader = scored.filter((s) => s.h > 0);
    const pool = withHeader.length > 0 ? withHeader : scored;
    pool.sort((a, b) => {
        if (a.h !== b.h) return b.h - a.h;
        if (a.n !== b.n) return b.n - a.n;
        return a.r - b.r;
    });
    return pool[0].r;
}

function buildExcelColumnLabels(rows) {
    const maxCol = inferMaxColIndex(rows);
    if (maxCol <= 0) return { headerRowIndex: 0, labels: [], dataStartIndex: 1, maxCol: 0 };
    const headerRowIndex = pickHeaderRowIndex(rows, maxCol);
    const hdr = rows[headerRowIndex] || [];
    const labels = [];
    for (let c = 0; c < maxCol; c++) {
        const raw = hdr[c];
        const t = raw !== undefined && raw !== null ? String(raw).trim() : '';
        labels.push(t || `열 ${excelColumnLetters(c)}`);
    }
    return { headerRowIndex, labels, dataStartIndex: headerRowIndex + 1, maxCol };
}

function formatExcelHeaderLabel(headers, index) {
    if (index == null || index < 0) return '';
    const h = headers?.[index];
    if (h != null && String(h).trim()) return String(h);
    return `열 ${excelColumnLetters(index)}`;
}

/** True when this column label is our synthetic fallback (no header text in Excel). */
function isExcelPlaceholderLabel(labels, colIndex) {
    if (!labels || colIndex < 0 || colIndex >= labels.length) return true;
    const expected = `열 ${excelColumnLetters(colIndex)}`;
    return String(labels[colIndex] ?? '').trim() === expected;
}

const EXCEL_DATA_PROBE_ROWS = 3000;

function columnHasDataInImport(rows, colIdx) {
    if (!rows?.length) return false;
    const lim = Math.min(rows.length, EXCEL_DATA_PROBE_ROWS);
    for (let r = 0; r < lim; r++) {
        const row = rows[r];
        if (!row) continue;
        const v = row[colIdx];
        if (v !== undefined && v !== null && String(v).trim() !== '') return true;
    }
    return false;
}

/**
 * Drop empty synthetic columns; keep mapped indices. Sort: real headers first, then placeholders (by index).
 */
function getExcelMappingColumnIndices(labels, rawRows, fieldToExcelMap) {
    const n = labels?.length || 0;
    if (n === 0) return [];
    const keepMapped = new Set();
    if (fieldToExcelMap && typeof fieldToExcelMap === 'object') {
        for (const v of Object.values(fieldToExcelMap)) {
            if (typeof v === 'number' && v >= 0 && v < n) keepMapped.add(v);
        }
    }
    const out = [];
    for (let c = 0; c < n; c++) {
        const ph = isExcelPlaceholderLabel(labels, c);
        const has = columnHasDataInImport(rawRows, c);
        const forced = keepMapped.has(c);
        if (!ph || has || forced) out.push(c);
    }
    out.sort((a, b) => {
        const ra = isExcelPlaceholderLabel(labels, a) ? 1 : 0;
        const rb = isExcelPlaceholderLabel(labels, b) ? 1 : 0;
        if (ra !== rb) return ra - rb;
        return a - b;
    });
    return out;
}

function cloneDataRowsForFill(rows) {
    return (rows || []).map((row) => {
        if (!row) return [];
        if (Array.isArray(row)) return row.slice();
        return Object.assign([], row);
    });
}

function applyItemForwardFill(items) {
    // Disabled forward fill: Do not automatically inject data into empty rows.
    // This resolves the issue where trailing/garbage excel rows get flooded with the last valid product code.
}

/* ───────── Sub-Components ───────── */
const DataTableRow = React.memo(({
    item, originalIdx, isActive, isSelected, fieldOrder, selectedField,
    globalCopies, getFieldLabel, onRowClick, onToggleSelection,
    onFocusField, onChangeField, onDuplicate, onRemove
}) => {
    return (
        <tr onClick={() => onRowClick(originalIdx)} className={`group transition-colors ${isActive ? 'bg-blue-50/30' : 'hover:bg-slate-50/40'}`}>
            <td className="px-3 py-1.5 text-center">
                <input type="checkbox" checked={isSelected} onChange={() => onToggleSelection(item.id)} onClick={e => e.stopPropagation()} className="w-4 h-4 rounded accent-blue-600 cursor-pointer" />
            </td>
            <td className="px-2 py-1.5 text-center">
                <span className={`text-[11px] font-bold ${isActive ? 'text-blue-500' : 'text-slate-300'}`}>{originalIdx + 1}</span>
            </td>
            {fieldOrder.map(k => (
                <td key={k} className="px-1 py-1.5">
                    <input type="text" value={item[k] || ''} onFocus={() => onFocusField(k)} onChange={e => onChangeField(item.id, k, e.target.value)}
                        className={`w-full h-8 px-2.5 bg-white border rounded-md text-[13px] font-bold text-slate-800 outline-none transition-all placeholder:text-slate-300 ${selectedField === k ? 'ring-2 ring-blue-400/20 border-blue-300' : 'border-slate-200 group-hover:border-slate-300'}`} placeholder={getFieldLabel(k)} />
                </td>
            ))}
            <td className="px-2 py-1.5">
                <input type="number" min="1" value={item._copies || ''} onChange={e => onChangeField(item.id, '_copies', parseInt(e.target.value) || '')}
                    className="w-full h-8 px-3 bg-white border border-slate-200 rounded-md text-[13px] font-bold text-center text-slate-800 outline-none group-hover:border-slate-300" placeholder={String(globalCopies)} />
            </td>
            <td className="px-2 py-1.5">
                <div className="flex gap-1 justify-end items-center opacity-50 group-hover:opacity-100 transition-opacity">
                    <button onClick={e => { e.stopPropagation(); onDuplicate(item.id); }} className="w-6 h-6 flex justify-center items-center text-blue-500 hover:bg-blue-50 rounded transition-all">
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                    </button>
                    <button onClick={e => { e.stopPropagation(); onRemove(item.id); }} className="w-6 h-6 flex justify-center items-center text-red-400 hover:bg-red-50 rounded transition-all">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                </div>
            </td>
        </tr>
    );
});

/* ───────── Component ───────── */
export default function LabelPrinter({ user }) {
    const { t: _t } = useLanguage();

    /* ── Print mode ── */
    const [printMode, setPrintMode] = useState('manual');

    /* ── Paper & layout ── */
    const [paperSize, setPaperSize] = useState(PAPER_SIZES[0]);
    const [customWidth, setCustomWidth] = useState(50);
    const [customHeight, setCustomHeight] = useState(30);
    const [fontSize, setFontSize] = useState('auto');
    const [copies, setCopies] = useState(1);
    const [orientation, setOrientation] = useState('portrait');
    const [showPriceUnit, setShowPriceUnit] = useState(false);
    const [showBarcodeText, setShowBarcodeText] = useState(false);
    const [showExtra1Prefix, setShowExtra1Prefix] = useState(() => ls('label_printer_show_extra1_prefix', false));
    const [showExtra2Prefix, setShowExtra2Prefix] = useState(() => ls('label_printer_show_extra2_prefix', false));
    const [isImporting, setIsImporting] = useState(false);
    const [showGrid, setShowGrid] = useState(false);

    /* ── Print offset (compensate for printer hardware margins) ── */
    const [printOffsetX, setPrintOffsetX] = useState(() => parseFloat(localStorage.getItem('label_printer_offset_x') || '0'));
    const [printOffsetY, setPrintOffsetY] = useState(() => parseFloat(localStorage.getItem('label_printer_offset_y') || '0'));
    useEffect(() => { localStorage.setItem('label_printer_offset_x', String(printOffsetX)); }, [printOffsetX]);
    useEffect(() => { localStorage.setItem('label_printer_offset_y', String(printOffsetY)); }, [printOffsetY]);
    useEffect(() => { localStorage.setItem('label_printer_show_extra1_prefix', JSON.stringify(showExtra1Prefix)); }, [showExtra1Prefix]);
    useEffect(() => { localStorage.setItem('label_printer_show_extra2_prefix', JSON.stringify(showExtra2Prefix)); }, [showExtra2Prefix]);

    /* ── Custom columns ── */
    const [customFields, setCustomFields] = useState(() => ls('label_printer_custom_fields', [
        { key: 'extra1', label: '추가1' },
        { key: 'extra2', label: '추가2' },
    ]));
    useEffect(() => { localStorage.setItem('label_printer_custom_fields', JSON.stringify(customFields)); }, [customFields]);
    const fieldOrder = useMemo(() => [...CORE_FIELD_KEYS, ...customFields.map(f => f.key)], [customFields]);

    const getFieldLabel = useCallback((key) => CORE_FIELD_LABELS[key] || (customFields || []).find(f => f.key === key)?.label || key, [customFields]);

    /* ── Inventory ── */
    const [showInventoryPicker, setShowInventoryPicker] = useState(false);
    const [inventoryItems, setInventoryItems] = useState([]);
    const [inventoryLoaded, setInventoryLoaded] = useState(false);
    const [inventorySearch, setInventorySearch] = useState('');

    /* ── Excel ── */
    const [detectedHeaders, setDetectedHeaders] = useState(() => ls('label_printer_detected_headers', []));
    const [fieldToExcelMap, setFieldToExcelMap] = useState(() => ls('label_printer_field_to_excel_map', {}));
    const [showMappingMenu, setShowMappingMenu] = useState(null);
    const [rawExcelRows, setRawExcelRows] = useState([]);

    useEffect(() => {
        localStorage.setItem('label_printer_detected_headers', JSON.stringify(detectedHeaders));
    }, [detectedHeaders]);

    useEffect(() => {
        localStorage.setItem('label_printer_field_to_excel_map', JSON.stringify(fieldToExcelMap));
    }, [fieldToExcelMap]);

    const excelMappingColumnIndices = useMemo(
        () => getExcelMappingColumnIndices(detectedHeaders, rawExcelRows, fieldToExcelMap),
        [detectedHeaders, rawExcelRows, fieldToExcelMap]
    );

    /* ── Label items ── */
    const [labelItems, setLabelItems] = useState(() => {
        const saved = ls('label_printer_draft_items', null);
        if (saved) return saved;
        return [createLabelItem([...CORE_FIELD_KEYS, 'extra1', 'extra2'])];
    });
    const [activeItemIndex, setActiveItemIndex] = useState(0);
    const [selectedRows, setSelectedRows] = useState({});

    /* ── Pagination ── */
    const [currentPage, setCurrentPage] = useState(1);
    const totalPages = useMemo(() => Math.ceil(labelItems.length / DATA_TABLE_PAGE_SIZE), [labelItems.length]);
    const paginatedItems = useMemo(() => {
        const start = (currentPage - 1) * DATA_TABLE_PAGE_SIZE;
        return labelItems.slice(start, start + DATA_TABLE_PAGE_SIZE);
    }, [labelItems, currentPage]);

    // Reset to page 1 when data changes significantly (like import)
    useEffect(() => {
        if (labelItems.length > 0 && currentPage > totalPages) {
            setCurrentPage(Math.max(1, totalPages));
        }
    }, [labelItems.length, totalPages, currentPage]);

    const mountedRef = useRef(false);
    const saveTimerRef = useRef(null);

    useEffect(() => {
        if (!mountedRef.current) { mountedRef.current = true; return; }

        // Debounce saving to localStorage to prevent UI freeze with large datasets
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => {
            localStorage.setItem('label_printer_draft_items', JSON.stringify(labelItems));
            console.log('Saved labelItems to localStorage (debounced)');
        }, 1000);

        return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
    }, [labelItems]);

    /* ── Field positions & styles ── */
    const [fieldPositions, setFieldPositions] = useState(() => ls('label_printer_field_positions', { ...DEFAULT_FIELD_POSITIONS }));
    useEffect(() => { localStorage.setItem('label_printer_field_positions', JSON.stringify(fieldPositions)); }, [fieldPositions]);

    const [fieldStyles, setFieldStyles] = useState(() => ls('label_printer_field_styles', JSON.parse(JSON.stringify(DEFAULT_FIELD_STYLES))));
    useEffect(() => { localStorage.setItem('label_printer_field_styles', JSON.stringify(fieldStyles)); }, [fieldStyles]);

    /* ── Templates (Cloud Synced) ── */
    const [templates, setTemplates] = useState([]);
    const [activeTemplateId, setActiveTemplateId] = useState(null);

    // Sync templates from Firestore
    useEffect(() => {
        const q = query(collection(db, 'label_printer_templates'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snap) => {
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setTemplates(list);
            console.log('Synchronized templates from Firestore:', list.length);
        });
        return () => unsubscribe();
    }, []);

    const nudgeField = (direction) => {
        if (!selectedField || isLayoutLocked) return;
        const w = getWidth() * MM_TO_PX;
        const h = getHeight() * MM_TO_PX;
        const stepX = 100 / w;
        const stepY = 100 / h;

        setFieldPositions(prev => {
            const pos = prev[selectedField] || { x: 50, y: 50 };
            const next = { ...prev };
            let newX = pos.x, newY = pos.y;
            if (direction === 'left') newX = Math.max(0, pos.x - stepX);
            if (direction === 'right') newX = Math.min(100, pos.x + stepX);
            if (direction === 'up') newY = Math.max(0, pos.y - stepY);
            if (direction === 'down') newY = Math.min(100, pos.y + stepY);
            next[selectedField] = { ...pos, x: newX, y: newY };
            return next;
        });
    };

    const alignField = (axis) => {
        if (!selectedField || isLayoutLocked) return;
        setFieldPositions(prev => {
            const pos = prev[selectedField] || { x: 50, y: 50 };
            const next = { ...prev };
            if (axis === 'h') next[selectedField] = { ...pos, x: 50 };
            if (axis === 'v') next[selectedField] = { ...pos, y: 50 };
            return next;
        });
    };

    const saveTemplate = async () => {
        const { value: name } = await Swal.fire({
            title: '서식 저장', input: 'text', inputLabel: '서식 이름을 입력하세요',
            showCancelButton: true, confirmButtonText: '저장', cancelButtonText: '취소'
        });
        if (!name) return;

        Swal.fire({ title: '저장 중...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

        try {
            const previewData = labelItems[activeItemIndex] || labelItems[0] || {};
            const data = {
                name, paperSize, customWidth, customHeight, orientation, fontSize,
                fieldPositions, fieldStyles, fieldToExcelMap, customFields,
                previewData,
                createdAt: serverTimestamp(),
                createdBy: user?.uid || 'anonymous'
            };
            await addDoc(collection(db, 'label_printer_templates'), data);
            Swal.fire({ icon: 'success', title: '저장됨', timer: 1200, showConfirmButton: false });
        } catch (err) {
            console.error(err);
            Swal.fire({ icon: 'error', title: '저장 실패', text: err.message });
        }
    };

    const applyTemplate = (tpl) => {
        setActiveTemplateId(tpl.id);
        if (tpl.paperSize) setPaperSize(tpl.paperSize);
        if (tpl.customWidth) setCustomWidth(tpl.customWidth);
        if (tpl.customHeight) setCustomHeight(tpl.customHeight);
        if (tpl.orientation) setOrientation(tpl.orientation);
        if (tpl.fontSize) setFontSize(tpl.fontSize);
        if (tpl.fieldPositions) setFieldPositions(tpl.fieldPositions);
        if (tpl.fieldStyles) setFieldStyles(tpl.fieldStyles);
        if (tpl.fieldToExcelMap) {
            setFieldToExcelMap(tpl.fieldToExcelMap);
            // Kích hoạt tính toán lại dữ liệu bảng nếu đã tải file excel
            if (rawExcelRows.length > 0) {
                setTimeout(() => {
                    try {
                        let items = rawExcelRows.map(row => {
                            const item = { id: createStableId('row_') };
                            Object.entries(tpl.fieldToExcelMap).forEach(([k, ci]) => { item[k] = String(row[ci] ?? '').trim(); });
                            return item;
                        }).filter(i => Object.keys(tpl.fieldToExcelMap).some(k => i[k] !== ''));

                        applyItemForwardFill(items);

                        if (items.length) {
                            setLabelItems(items);
                            setSelectedRows({});
                        }
                    } catch (err) {
                        console.error('Apply template excel mapping error:', err);
                    }
                }, 50);
            }
        }
        if (tpl.customFields) setCustomFields(tpl.customFields);

        // Clear focus from any inputs to prevent focus-driven state overrides
        if (document.activeElement && document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
        }

        // Hard Clear: Reset selection to null so the preview starts in a clean "View Mode"
        // This ensures hidden fields from the previous session don't "stick" to the new template.
        setSelectedField(null);
    };

    const deleteTemplate = async (id, e) => {
        e.stopPropagation();
        const r = await Swal.fire({
            title: '서식 삭제', text: '이 서식은 모든 사용자의 목록에서 삭제됩니다. 계속하시겠습니까?',
            icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444', confirmButtonText: '삭제', cancelButtonText: '취소'
        });
        if (!r.isConfirmed) return;

        try {
            await deleteDoc(doc(db, 'label_printer_templates', id));
            if (activeTemplateId === id) setActiveTemplateId(null);
        } catch (err) {
            console.error(err);
            Swal.fire({ icon: 'error', title: '삭제 실패', text: err.message });
        }
    };

    /* ── UI states ── */
    const [selectedField, setSelectedField] = useState('productCode');
    const [isLayoutLocked, setIsLayoutLocked] = useState(true);
    const [draggingField, setDraggingField] = useState(null);
    const previewContainerRef = useRef(null);

    /* ── Computed ── */
    const getBaseWidth = () => paperSize.key === 'custom' ? customWidth : paperSize.width;
    const getBaseHeight = () => paperSize.key === 'custom' ? customHeight : paperSize.height;

    const getWidth = () => orientation === 'landscape' ? getBaseHeight() : getBaseWidth();
    const getHeight = () => orientation === 'landscape' ? getBaseWidth() : getBaseHeight();

    const getPrintWidth = () => getWidth();
    const getPrintHeight = () => getHeight();

    const calculateFontSize = (w, h) => {
        if (fontSize !== 'auto') return parseInt(fontSize);
        const d = Math.min(w, h);
        return d <= 25 ? 6 : d <= 30 ? 7 : d <= 40 ? 8 : d <= 50 ? 9 : 10;
    };

    const activeItem = useMemo(() => labelItems[activeItemIndex] || labelItems[0], [labelItems, activeItemIndex]);
    const curStyle = useMemo(() => fieldStyles[selectedField] || DEFAULT_FIELD_STYLES.productName, [fieldStyles, selectedField]);
    const curFontSize = useMemo(() => calculateFontSize(getWidth(), getHeight()) + (curStyle.sizeOffset || 0), [fontSize, paperSize, customWidth, customHeight, orientation, curStyle.sizeOffset]);

    /* ────────────── Actions ────────────── */

    const addLabelItem = useCallback(() => {
        setLabelItems(prev => [...prev, createLabelItem(fieldOrder)]);
    }, [fieldOrder]);

    const removeLabelItem = (id) => {
        if (labelItems.length <= 1) {
            setLabelItems([createLabelItem(fieldOrder)]); setActiveItemIndex(0);
            setSelectedRows({});
            return;
        }
        setLabelItems(prev => prev.filter(i => i.id !== id));
        setSelectedRows(prev => {
            const next = { ...prev };
            delete next[id];
            return next;
        });
        if (activeItemIndex >= labelItems.length - 1) setActiveItemIndex(Math.max(0, labelItems.length - 2));
    };

    const updateLabelItem = useCallback((id, field, value) =>
        setLabelItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item)), []);

    const duplicateLabelItem = useCallback((id) => {
        setLabelItems(prev => {
            const item = prev.find(i => i.id === id);
            if (item) return [...prev, { ...item, id: createStableId('row_') }];
            return prev;
        });
    }, []);

    const clearAllItems = () => {
        Swal.fire({ title: '전체 초기화', text: '모든 데이터가 삭제됩니다.', icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444', confirmButtonText: '삭제', cancelButtonText: '취소' })
            .then(r => {
                if (!r.isConfirmed) return;
                setCustomFields([{ key: 'extra1', label: '추가1' }, { key: 'extra2', label: '추가2' }]);
                setLabelItems([createLabelItem([...CORE_FIELD_KEYS, 'extra1', 'extra2'])]); setActiveItemIndex(0);
                setSelectedRows({});
                setFieldPositions({ ...DEFAULT_FIELD_POSITIONS });
                setFieldStyles(JSON.parse(JSON.stringify(DEFAULT_FIELD_STYLES)));
                setShowPriceUnit(false); setDetectedHeaders([]); setFieldToExcelMap({});
            });
    };

    const addCustomColumn = async () => {
        const { value: label } = await Swal.fire({ title: '새 컬럼 추가', input: 'text', inputLabel: '컬럼 이름 입력', showCancelButton: true, confirmButtonText: '추가', cancelButtonText: '취소' });
        if (!label) return;
        const key = createStableId('custom_');
        setCustomFields(prev => [...prev, { key, label }]);
        setFieldPositions(prev => ({ ...prev, [key]: { x: 50, y: 50 } }));
        setFieldStyles(prev => ({ ...prev, [key]: { fontWeight: 500, sizeOffset: 0, textAlign: 'center', fontFamily: 'Nanum Gothic' } }));
        setLabelItems(prev => prev.map(item => ({ ...item, [key]: '' })));
    };

    const removeCustomColumn = (key) => {
        setCustomFields(prev => prev.filter(f => f.key !== key));
        setFieldPositions(prev => { const n = { ...prev }; delete n[key]; return n; });
        setFieldStyles(prev => { const n = { ...prev }; delete n[key]; return n; });
        setLabelItems(prev => prev.map(item => { const n = { ...item }; delete n[key]; return n; }));
    };

    /* ── Inventory ── */
    const loadInventory = () => {
        if (inventoryLoaded) { setShowInventoryPicker(true); return; }
        onSnapshot(collection(db, 'inventory'), snap => {
            setInventoryItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            setInventoryLoaded(true); setShowInventoryPicker(true);
        });
    };

    const importFromInventory = (inv) => {
        setLabelItems(prev => [...prev, { id: createStableId('row_'), productCode: inv.productCode || '', productName: inv.productName || '', option: inv.category || '', price: '', extra1: '', extra2: '' }]);
        setShowInventoryPicker(false);
    };

    /* ── Excel ── */

    const handleFileUpload = async (e) => {
        const input = e.target;
        const file = input?.files?.[0];
        if (!file) return;

        Swal.fire({
            title: '데이터를 읽는 중...',
            text: '잠시만 기다려 주세요.',
            allowOutsideClick: false,
            didOpen: () => { Swal.showLoading(); }
        });
        setIsImporting(true);

        try {
            const data = await file.arrayBuffer();
            const wb = XLSX.read(data, { type: 'array' });
            const ws = wb.Sheets[wb.SheetNames[0]];
            if (!ws) {
                Swal.close();
                await Swal.fire('알림', '시트를 찾을 수 없습니다.', 'info');
                return;
            }

            const { range: cappedRange, sheetTruncated } = capSheetRange(ws);
            if (!cappedRange) {
                Swal.close();
                await Swal.fire('알림', '시트 범위가 비어 있습니다.', 'info');
                return;
            }

            const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', range: cappedRange });
            Swal.close();
            await new Promise((r) => setTimeout(r, 0));

            const { headerRowIndex, labels, dataStartIndex, maxCol } = buildExcelColumnLabels(rows);
            setDetectedHeaders(labels);

            const dataRowsAll = rows.slice(dataStartIndex);
            const isSummaryRow = (row) => row.some(cell => {
                const txt = String(cell ?? '').replace(/\s+/g, '').toLowerCase();
                return txt === '합계' || txt === '총계' || txt === '총합' || txt === '총합계' || txt === 'total' || txt === '소계';
            });

            const validDataRows = cloneDataRowsForFill(dataRowsAll).filter(row => {
                if (isSummaryRow(row)) return false;
                return row.some(cell => String(cell ?? '').trim() !== '');
            });

            const capped = validDataRows.length > EXCEL_IMPORT_MAX_DATA_ROWS;
            const cappedRows = capped ? validDataRows.slice(0, EXCEL_IMPORT_MAX_DATA_ROWS) : validDataRows;

            const hdrRow = rows[headerRowIndex] || [];
            const map = { ...fieldToExcelMap };
            Object.keys(map).forEach(k => { if (map[k] >= maxCol) delete map[k]; });

            for (let i = 0; i < maxCol; i++) {
                const v = String(hdrRow[i] ?? '').trim().toLowerCase();
                if (!('productCode' in map) && (v.includes('스타일') || v.includes('상품코드') || v.includes('코드') || v.includes('code') || v.includes('sku') || v.includes('품번') || v.includes('자재') || v.includes('재고') || v.includes('바코드'))) map.productCode = i;
                if (!('productName' in map) && (v.includes('상품명') || v.includes('제품명') || v.includes('품목') || v.includes('명칭') || v.includes('명') || v.includes('name') || v.includes('product') || v.includes('item') || v.includes('품명'))) map.productName = i;
                if (!('option' in map) && (v.includes('옵션') || v.includes('사이즈') || v.includes('규격') || v.includes('option') || v.includes('size'))) map.option = i;
                if (!('price' in map) && (v.includes('가격') || v.includes('단가') || v.includes('price') || v.includes('amt') || v.includes('cost'))) map.price = i;
                if (!('_copies' in map) && (v.includes('매수') || v.includes('인쇄') || v.includes('qty') || v.includes('count') || v.includes('copy') || v.includes('copies'))) map._copies = i;
            }
            setFieldToExcelMap(map);

            setRawExcelRows(cappedRows);

            let items = cappedRows.map((row) => {
                const item = { id: createStableId('row_') };
                Object.entries(map).forEach(([k, ci]) => { item[k] = String(row[ci] ?? '').trim(); });
                return item;
            }).filter(i => Object.keys(map).some(k => i[k] !== ''));

            applyItemForwardFill(items);

            if (items.length === 0 && rows.length > dataStartIndex) {
                items = cappedRows.slice(0, 100).map((row) => ({
                    id: createStableId('row_'),
                    productCode: String(row[0] || '').trim(),
                    productName: String(row[1] || '').trim(),
                    option: String(row[2] || '').trim(),
                    price: String(row[3] || '').trim(),
                    extra1: String(row[4] || '').trim(),
                    extra2: String(row[5] || '').trim()
                })).filter(i => i.productCode || i.productName || i.option || i.price || i.extra1 || i.extra2);
                await Swal.fire('알림', '헤더를 인식하지 못했습니다. 아래 매핑 도구로 직접 연결해 주세요.', 'info');
            } else if (items.length) {
                const isNearingLimits = items.length >= EXCEL_IMPORT_MAX_DATA_ROWS * 0.8;
                const tailNote = (sheetTruncated && isNearingLimits) ? `시트가 너무 커서 처음 ${(EXCEL_IMPORT_PREAMBLE_ROWS + EXCEL_IMPORT_MAX_DATA_ROWS).toLocaleString()}행만 분석했습니다.` : null;
                const capNote = capped ? `처음 ${EXCEL_IMPORT_MAX_DATA_ROWS.toLocaleString()}개 데이터 행만 불러왔습니다.` : null;
                const subtitle = [capNote, tailNote].filter(Boolean).join(' ');

                await Swal.fire({
                    icon: 'success',
                    title: `${items.length}개 행 가져옴`,
                    text: subtitle || undefined,
                    timer: subtitle ? 3000 : 1500,
                    showConfirmButton: false
                });
            } else {
                await Swal.fire('알림', '가져올 데이터가 없습니다.', 'info');
            }

            if (items.length) {
                setLabelItems(items);
                setSelectedRows({});
                setCurrentPage(1); // Reset to first page on new import
            }
        } catch (err) {
            console.error(err);
            Swal.close();
            await Swal.fire({ icon: 'error', title: '오류', text: err?.message ? String(err.message) : 'Excel 파일 읽기 실패' });
        } finally {
            setIsImporting(false);
            input.value = '';
        }
    };

    const updateExcelMapping = (fieldKey, colIdx) => {
        const newMap = { ...fieldToExcelMap };
        if (colIdx === undefined) delete newMap[fieldKey];
        else newMap[fieldKey] = colIdx;
        setFieldToExcelMap(newMap);

        if (rawExcelRows.length > 0) {
            Swal.fire({
                title: '매핑 업데이트 중...',
                allowOutsideClick: false,
                didOpen: () => { Swal.showLoading(); }
            });

            setTimeout(() => {
                try {
                    let items = rawExcelRows.map(row => {
                        const item = { id: createStableId('row_') };
                        Object.entries(newMap).forEach(([k, ci]) => { item[k] = String(row[ci] ?? '').trim(); });
                        return item;
                    }).filter(i => Object.keys(newMap).some(k => i[k] !== ''));

                    applyItemForwardFill(items);

                    if (items.length) {
                        setLabelItems(items);
                        setSelectedRows({});
                    }
                } catch (err) {
                    console.error(err);
                    Swal.fire({ icon: 'error', title: '오류', text: '매핑 처리 실패' });
                } finally {
                    Swal.close();
                }
            }, 50);
        }
        setShowMappingMenu(null);
    };

    /* ── Style actions ── */
    const toggleFieldWeight = (key) => {
        setFieldStyles(prev => {
            const cur = prev[key]?.fontWeight || 400;
            const next = WEIGHT_CYCLE[(WEIGHT_CYCLE.indexOf(cur) + 1) % WEIGHT_CYCLE.length];
            return { ...prev, [key]: { ...prev[key], fontWeight: next } };
        });
    };

    const adjustFieldSize = (key, delta) => {
        setFieldStyles(prev => ({ ...prev, [key]: { ...prev[key], sizeOffset: Math.max(-4, Math.min(8, (prev[key]?.sizeOffset || 0) + delta)) } }));
    };

    const toggleTextAlign = (key) => {
        setFieldStyles(prev => {
            const aligns = ['left', 'center', 'right'];
            const next = aligns[(aligns.indexOf(prev[key]?.textAlign || 'center') + 1) % aligns.length];
            return { ...prev, [key]: { ...prev[key], textAlign: next } };
        });
    };

    const updateFieldFont = (key, fontFamily) => {
        setFieldStyles(prev => ({ ...prev, [key]: { ...prev[key], fontFamily } }));
    };

    /* ── Drag & Drop ── */
    const handleMouseDown = useCallback((e, fieldKey) => {
        if (isLayoutLocked) return;
        e.preventDefault(); setDraggingField(fieldKey); setSelectedField(fieldKey);
    }, [isLayoutLocked]);

    const handleMouseMove = useCallback((e) => {
        if (!draggingField || !previewContainerRef.current) return;
        const rect = previewContainerRef.current.getBoundingClientRect();
        let x = ((e.clientX - rect.left) / rect.width) * 100;
        let y = ((e.clientY - rect.top) / rect.height) * 100;
        x = Math.max(2, Math.min(98, x)); y = Math.max(2, Math.min(98, y));
        if (Math.abs(x - 50) < 2.5) x = 50;
        if (Math.abs(y - 50) < 2.5) y = 50;
        setFieldPositions(prev => ({ ...prev, [draggingField]: { x, y } }));
    }, [draggingField]);

    const handleMouseUp = useCallback(() => setDraggingField(null), []);

    useEffect(() => {
        if (!draggingField) return;
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp); };
    }, [draggingField, handleMouseMove, handleMouseUp]);

    /* ── Row selection helpers ── */
    const toggleRowSelection = useCallback((id) => {
        setSelectedRows(prev => {
            const next = { ...prev };
            if (next[id]) delete next[id]; else next[id] = true;
            return next;
        });
    }, []);
    const allSelected = useMemo(() => labelItems.length > 0 && labelItems.every(i => selectedRows[i.id]), [labelItems, selectedRows]);

    const toggleAllRows = useCallback(() => {
        setSelectedRows(prev => {
            const all = labelItems.length > 0 && labelItems.every(i => prev[i.id]);
            if (all) return {};
            const next = {};
            labelItems.forEach(i => { next[i.id] = true; });
            return next;
        });
    }, [labelItems]);

    /* ── Keyboard shortcuts ── */

    /* ── Print ── */
    const handlePrint = () => {
        const pw = getPrintWidth(), ph = getPrintHeight(), fs = calculateFontSize(getWidth(), getHeight());
        const hasSelection = Object.keys(selectedRows).length > 0;
        const itemsToPrint = hasSelection ? labelItems.filter(i => selectedRows[i.id]) : labelItems;
        if (itemsToPrint.length === 0) { Swal.fire({ icon: 'warning', title: '인쇄할 항목 없음', text: '행을 선택하세요', timer: 1500, showConfirmButton: false }); return; }

        let html = '';
        itemsToPrint.forEach(item => {
            const rowCopies = item._copies || copies;
            for (let c = 0; c < rowCopies; c++) {
                let fields = '';
                fieldOrder.forEach(key => {
                    let val = item[key]; if (key === 'price' && showPriceUnit && val) val += ' 원';
                    if (key === 'extra1' && showExtra1Prefix && val) val = 'NO.' + val;
                    if (key === 'extra2' && showExtra2Prefix && val) val = '수량:' + val;
                    if (!val) return;

                    const pos = fieldPositions[key];
                    if (!pos || pos.hidden) return;

                    const st = fieldStyles[key] || DEFAULT_FIELD_STYLES.productName;
                    const ffs = fs + (st.sizeOffset || 0);
                    const tr = st.textAlign === 'left' ? '0,-50%' : st.textAlign === 'right' ? '-100%,-50%' : '-50%,-50%';

                    if (st.fontFamily === 'Barcode') {
                        const b64 = generateBarcodeBase64(val, ffs, showBarcodeText);
                        if (b64) {
                            fields += `<div style="position:absolute;left:${pos.x}%;top:${pos.y}%;transform:translate(${tr});font-family:sans-serif;font-size:${ffs}pt;font-weight:${st.fontWeight};text-align:${st.textAlign};white-space:nowrap;line-height:1.25;"><img src="${b64}" style="height:${ffs * 5.2}pt;max-width:100%;" /></div>`;
                        } else {
                            fields += `<div style="position:absolute;left:${pos.x}%;top:${pos.y}%;transform:translate(${tr});font-family:sans-serif;font-size:${ffs}pt;font-weight:${st.fontWeight};text-align:${st.textAlign};white-space:nowrap;line-height:1.25;">${val}</div>`;
                        }
                    } else {
                        fields += `<div style="position:absolute;left:${pos.x}%;top:${pos.y}%;transform:translate(${tr});font-family:'${st.fontFamily}',sans-serif;font-size:${ffs}pt;font-weight:${st.fontWeight};text-align:${st.textAlign};white-space:nowrap;line-height:1.25;">${val}</div>`;
                    }
                });
                html += `<div style="width:${pw}mm;height:${ph}mm;position:relative;page-break-after:always;overflow:hidden">${fields}</div>`;
            }
        });
        const ox = printOffsetX || 0;
        const oy = printOffsetY || 0;
        const win = window.open('', '_blank');
        const pageOrientation = orientation === 'landscape' ? 'landscape' : 'portrait';
        win.document.write(`<html><head><title>진일 라벨 인쇄</title><link href="https://fonts.googleapis.com/css2?family=Nanum+Gothic:wght@400;700;800&display=swap" rel="stylesheet"><style>@page{size:${pw}mm ${ph}mm ${pageOrientation};margin:0}@media print{@page{size:${pw}mm ${ph}mm ${pageOrientation};margin:0}}body{margin:0;padding:0;box-sizing:border-box;transform:translate(${ox}mm,${oy}mm)}*{box-sizing:inherit}</style></head><body>${html}<script>document.fonts.ready.then(() => { setTimeout(() => { window.print(); setTimeout(() => window.close(), 500); }, 800); });</script></body></html>`);
        win.document.close();
    };

    /* ────────── RENDER ────────── */
    const handleKeyboardShortcuts = useEffectEvent((e) => {
        if (e.ctrlKey && e.key === 'p') { e.preventDefault(); handlePrint(); }
        if (e.ctrlKey && e.key === 's') { e.preventDefault(); saveTemplate(); }
    });

    useEffect(() => {
        const handler = (e) => handleKeyboardShortcuts(e);
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []);

    return (
        <div className="min-h-screen bg-white px-5 py-4">
            {printMode === 'manual' ?
                <>
                <div className="flex lg:flex-row flex-col gap-8 items-start animate-in fade-in duration-300">
                    {/* ═══ Left Column: All Controls & Data ═══ */}
                    <div className="flex-1 min-w-0 w-full flex flex-col gap-5">
                        {/* ═══ ROW 1: Templates ═══ */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-3">
                                <span className="text-[14px] font-extrabold text-slate-700">저장된 서식</span>
                                <span className="text-[13px] text-slate-400 font-bold">{templates.length}개</span>
                            </div>
                            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                                {templates.map(tpl => {
                                    const tW = tpl.paperSize?.key === 'custom' ? (tpl.customWidth ?? tpl.paperSize?.width) : tpl.paperSize?.width || 50;
                                    const tH = tpl.paperSize?.key === 'custom' ? (tpl.customHeight ?? tpl.paperSize?.height) : tpl.paperSize?.height || 30;

                                    const paperW = tpl.orientation === 'landscape' ? tH : tW;
                                    const paperH = tpl.orientation === 'landscape' ? tW : tH;
                                    const pW = paperW * MM_TO_PX;
                                    const pH = paperH * MM_TO_PX;
                                    const scale = Math.min(130 / pW, 100 / pH);

                                    const dummy = tpl.previewData || labelItems?.[0] || { productCode: '1025110029', productName: '상품명', option: '옵션: 네이비', price: '50000', extra1: '추가1', extra2: '추가2' };
                                    const baseFs = Math.min(paperW, paperH) <= 20 ? 5 : Math.min(paperW, paperH) <= 30 ? 6 : Math.min(paperW, paperH) <= 40 ? 7 : 8;

                                    return (
                                        <div key={tpl.id} onClick={() => applyTemplate(tpl)}
                                            className={`group relative w-[170px] shrink-0 bg-white border rounded-xl p-3.5 cursor-pointer transition-all ${activeTemplateId === tpl.id ? 'border-blue-500 shadow-[0_0_0_1.5px_#3b82f6]' : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'}`}>
                                            <div className={`text-[13px] font-bold mb-2 truncate ${activeTemplateId === tpl.id ? 'text-blue-600' : 'text-slate-800'}`}>{tpl.name}</div>
                                            <div className="h-[120px] w-full bg-slate-50/50 rounded-lg border border-slate-100 flex items-center justify-center overflow-hidden mb-2 relative">
                                                <div className="bg-white border border-slate-200 relative overflow-hidden shadow-sm"
                                                    style={{ width: `${pW}px`, height: `${pH}px`, transform: `scale(${scale})`, transformOrigin: 'center center' }}>
                                                    {Object.entries(tpl.fieldPositions || {}).map(([fk, pos]) => {
                                                        if (pos.hidden) return null;
                                                        const val = (dummy || {})[fk];
                                                        if (!val) return null; // 100% sync with main preview: hide if no data

                                                        const st = (tpl.fieldStyles || {})[fk] || DEFAULT_FIELD_STYLES.productName;
                                                        const isBc = st.fontFamily === 'Barcode';
                                                        const tr = st.textAlign === 'left' ? '0,-50%' : st.textAlign === 'right' ? '-100%,-50%' : '-50%,-50%';
                                                        const fs = (baseFs + (st.sizeOffset || 0)) * 1.33;

                                                        return (
                                                            <div key={fk} style={{
                                                                position: 'absolute', left: `${pos.x}%`, top: `${pos.y}%`, transform: `translate(${tr})`,
                                                                fontWeight: st.fontWeight, fontSize: `${fs}px`, fontFamily: st.fontFamily, textAlign: st.textAlign, whiteSpace: 'nowrap',
                                                                color: '#334155'
                                                            }}>
                                                                {isBc ? (
                                                                    <img src={generateBarcodeBase64(val || '12345678', fs, showBarcodeText) || ''} style={{ height: `${fs * 5.2}px`, pointerEvents: 'none', maxWidth: '100%' }} />
                                                                ) : (fk === 'price' && showPriceUnit && dummy[fk]) ? `₩${Number(dummy[fk]).toLocaleString()} 원` : (fk === 'extra1' && showExtra1Prefix && val) ? `NO.${val}` : (fk === 'extra2' && showExtra2Prefix && val) ? `수량:${val}` : val}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-[10px] font-bold text-slate-400">{(() => { return (tW && tH) ? `${tW} x ${tH} mm` : tpl.paperSize?.label || 'Custom'; })()}</span>
                                                <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">{tpl.orientation === 'landscape' ? '가로' : '세로'} {tpl.fontSize === 'auto' ? '자동' : `${tpl.fontSize}pt`}</span>
                                            </div>
                                            <button type="button" onClick={(e) => deleteTemplate(tpl.id, e)} className={`absolute top-2.5 right-2.5 w-6 h-6 bg-white border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-300 rounded-full flex items-center justify-center text-sm transition-all ${activeTemplateId === tpl.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>×</button>
                                        </div>
                                    );
                                })}
                                {templates.length === 0 && (
                                    <div className="w-full py-8 border border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-slate-300">
                                        <svg className="w-6 h-6 mb-2 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                                        <span className="text-[11px] font-bold">저장된 서식이 없습니다</span>
                                    </div>
                                )}
                            </div>
                        </div>


                        {/* ═══ ROW 2: Tabs + Actions ═══ */}
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                            <div className="flex items-center gap-2">
                                <button onClick={() => setPrintMode('manual')} className={`h-10 px-5 rounded-xl text-[13px] font-bold transition-all ${printMode === 'manual' ? 'bg-blue-600 text-white shadow-md shadow-blue-200/60' : 'border border-slate-200 bg-white text-slate-500 hover:border-slate-300'}`}>기본 바코드 인쇄</button>
                                <button onClick={() => setPrintMode('bartender')} className={`h-10 px-5 rounded-xl text-[13px] font-bold transition-all ${printMode === 'bartender' ? 'bg-blue-600 text-white shadow-md shadow-blue-200/60' : 'border border-slate-200 bg-white text-slate-500 hover:border-slate-300'}`}>BarTender 연동</button>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={handlePrint} className="h-10 px-6 bg-[#00c896] hover:bg-[#00b085] text-white font-bold rounded-xl text-[14px] shadow-md shadow-emerald-200/60 transition-all active:scale-[0.98] flex items-center gap-2">
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 4v3H4a2 2 0 00-2 2v3a2 2 0 002 2h1v2a2 2 0 002 2h6a2 2 0 002-2v-2h1a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0H7v3h6V4zm-1 10H8v3h4v-3z" clipRule="evenodd" /></svg>
                                    인쇄
                                </button>
                                <div className="w-px h-6 bg-slate-200 mx-1" />
                                <button onClick={saveTemplate} className="h-10 px-4 bg-slate-700 hover:bg-slate-800 text-white rounded-xl text-[13px] font-bold flex items-center gap-1.5 transition-colors shadow-sm">
                                    <svg className="w-4 h-4 opacity-80" fill="currentColor" viewBox="0 0 20 20"><path d="M7.707 10.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V6h5a2 2 0 012 2v7a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2h5v5.586l-1.293-1.293z" /></svg>
                                    서식 저장
                                </button>
                                <label className={`h-10 px-4 rounded-xl text-[13px] font-bold flex items-center gap-1.5 cursor-pointer transition-colors text-white shadow-sm ${isImporting ? 'pointer-events-none bg-blue-400' : 'bg-blue-500 hover:bg-blue-600'}`}>
                                    <svg className="w-4 h-4 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                    {isImporting ? '불러오는 중...' : 'Excel'}
                                    <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} className="hidden" />
                                </label>
                                <button onClick={loadInventory} className="h-10 px-4 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-[13px] font-bold flex items-center gap-1.5 transition-colors shadow-sm">
                                    <svg className="w-4 h-4 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                                    재고
                                </button>
                            </div>
                        </div>

                        {/* ═══ ROW 3: Paper config ═══ */}
                        <div className="flex flex-wrap gap-2.5 items-end">
                            <div className="flex flex-col gap-1">
                                <span className="text-[11px] font-bold text-slate-400 pl-0.5">용지 크기</span>
                                <select value={paperSize.key} onChange={e => { const f = (PAPER_SIZES || []).find(p => p.key === e.target.value); if (f) setPaperSize(f); }}
                                    className="h-9 px-2.5 bg-white border border-slate-300 rounded-lg text-[13px] font-bold text-slate-800 outline-none hover:border-blue-400 transition-all min-w-[130px]">
                                    {PAPER_SIZES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                                </select>
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-[11px] font-bold text-slate-400 pl-0.5">방향</span>
                                <div className="flex h-9 rounded-lg border border-slate-300 overflow-hidden bg-white p-0.5 gap-0.5">
                                    <button onClick={() => setOrientation('portrait')} className={`flex-1 px-3 rounded-md text-[12px] font-bold transition-all flex items-center justify-center gap-1 ${orientation === 'portrait' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-50'}`}>
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><rect width="14" height="18" x="5" y="3" rx="2" /></svg>세로
                                    </button>
                                    <button onClick={() => setOrientation('landscape')} className={`flex-1 px-3 rounded-md text-[12px] font-bold transition-all flex items-center justify-center gap-1 ${orientation === 'landscape' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-50'}`}>
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><rect width="18" height="14" x="3" y="5" rx="2" /></svg>가로
                                    </button>
                                </div>
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-[11px] font-bold text-slate-400 pl-0.5">글자 크기</span>
                                <select value={fontSize} onChange={e => setFontSize(e.target.value)} className="h-9 px-2.5 bg-white border border-slate-300 rounded-lg text-[13px] font-bold text-slate-800 outline-none hover:border-blue-400 min-w-[75px]">
                                    <option value="auto">자동</option>
                                    {[6, 7, 8, 9, 10, 11, 12, 14, 16].map(s => <option key={s} value={String(s)}>{s}pt</option>)}
                                </select>
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-[11px] font-bold text-slate-400 pl-0.5">매수</span>
                                <input type="number" min="1" value={copies} onChange={e => setCopies(parseInt(e.target.value) || 1)}
                                    className="h-9 w-14 px-2 bg-white border border-slate-300 rounded-lg text-[13px] font-bold text-center text-slate-800 outline-none hover:border-blue-400" />
                            </div>

                            {/* Field Style Toolbar (Moved here) */}
                            <div className="flex flex-col gap-1">
                                <span className="text-[11px] font-bold text-slate-400 pl-1 flex items-center gap-1.5 leading-none">
                                    <svg className="w-2.5 h-2.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                    {getFieldLabel(selectedField || 'productCode')}
                                </span>
                                <div className="flex items-center gap-0.5 p-0.5 bg-slate-100 rounded-lg border border-slate-300 h-9 box-border">
                                    <button onClick={() => toggleFieldWeight(selectedField)} className={`h-full aspect-square rounded-md font-black text-[14px] transition-all flex items-center justify-center ${curStyle.fontWeight >= 800 ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-white'}`}>B</button>
                                    <div className="w-px h-5 bg-slate-200 mx-0.5" />
                                    <button onClick={() => adjustFieldSize(selectedField, -1)} className="h-full aspect-square text-slate-400 font-bold hover:bg-white rounded-md transition-all flex items-center justify-center">−</button>
                                    <span className="text-[13px] font-bold px-1.5 min-w-[45px] text-center text-slate-800">{curFontSize}pt</span>
                                    <button onClick={() => adjustFieldSize(selectedField, 1)} className="h-full aspect-square text-slate-400 font-bold hover:bg-white rounded-md transition-all flex items-center justify-center">+</button>
                                    <div className="w-px h-5 bg-slate-200 mx-0.5" />
                                    <select value={curStyle.fontFamily} onChange={e => updateFieldFont(selectedField, e.target.value)}
                                        className="h-full px-2 bg-white border-none rounded-md text-[12px] font-bold text-slate-800 outline-none cursor-pointer hover:bg-slate-50 min-w-[140px]">
                                        <option value="Nanum Gothic">나눔고딕 (Default)</option><option value="Gulim">굴림체</option><option value="Arial">Arial</option><option value="Barcode">바코드</option>
                                    </select>
                                    <button onClick={() => toggleTextAlign(selectedField)} className="h-full aspect-square text-slate-500 hover:bg-white rounded-md flex items-center justify-center transition-all">
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path d="M4 6h16M4 12h10M4 18h16" /></svg>
                                    </button>
                                </div>
                            </div>
                        </div>



                        {/* ═══ Excel Mapping Tool ═══ */}
                        {(detectedHeaders || []).length > 0 && (
                            <div className="p-4 bg-blue-50/40 rounded-xl border border-blue-100 animate-in slide-in-from-top-2 duration-300">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="p-1.5 bg-blue-600 rounded-md text-white">
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                    </div>
                                    <span className="text-[12px] font-bold text-blue-600 uppercase tracking-wider">Excel 데이터 컬럼 매핑</span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {fieldOrder.map(k => {
                                        const isVisible = fieldPositions[k] !== undefined && fieldPositions[k].hidden !== true;
                                        return (
                                            <div key={k} className="relative flex items-center border border-slate-200/80 rounded-lg focus-within:border-blue-400 bg-white shadow-sm transition-all">
                                                <button onClick={() => {
                                                    setFieldPositions(prev => {
                                                        const next = { ...prev };
                                                        if (next[k]) { next[k] = { ...next[k], hidden: !next[k].hidden }; }
                                                        else { next[k] = { x: 50, y: 50, hidden: false }; }
                                                        return next;
                                                    });
                                                }} className={`h-9 px-2.5 flex items-center justify-center transition-colors rounded-l-lg border-r border-slate-100 ${isVisible ? 'bg-blue-50/50 text-blue-600 hover:bg-blue-100' : 'bg-slate-50 text-slate-300 hover:text-slate-500 hover:bg-slate-100'}`} title={isVisible ? "라벨에서 숨기기 (Hide)" : "라벨에 추가하기 (Show)"}>
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                                                        {isVisible ? (
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                        ) : (
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                                        )}
                                                    </svg>
                                                </button>
                                                <button onClick={() => setShowMappingMenu(showMappingMenu === k ? null : k)}
                                                    className={`h-9 px-3 text-[12px] font-bold rounded-r-lg transition-all flex items-center gap-1.5 outline-none ${fieldToExcelMap[k] !== undefined ? 'bg-blue-600 text-white' : 'bg-transparent text-slate-500 hover:bg-slate-50'}`}>
                                                    <span className="truncate max-w-[130px]">{getFieldLabel(k)} {fieldToExcelMap[k] !== undefined ? `← ${formatExcelHeaderLabel(detectedHeaders, fieldToExcelMap[k])}` : ''}</span>
                                                    <svg className={`w-3 h-3 transition-transform ${showMappingMenu === k ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path d="M19 9l-7 7-7-7" /></svg>
                                                </button>
                                                {showMappingMenu === k && (
                                                    <div className="absolute top-full left-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-[150] min-w-[180px] py-1.5 animate-in fade-in zoom-in-95">
                                                        <button onClick={() => updateExcelMapping(k, undefined)} className="w-full px-4 py-2 text-left text-[12px] font-bold text-red-500 hover:bg-red-50 transition-colors">매핑 해제</button>
                                                        <div className="h-px bg-slate-100 mx-3 my-1" />
                                                        <div className="max-h-[250px] overflow-y-auto scrollbar-hide">
                                                            {excelMappingColumnIndices.length === 0 ? (
                                                                <p className="px-4 py-2 text-[11px] text-slate-400">표시할 열이 없습니다.</p>
                                                            ) : (
                                                                excelMappingColumnIndices.map((i) => (
                                                                    <button key={`excel-col-${i}`} type="button" onClick={() => updateExcelMapping(k, i)}
                                                                        className={`w-full px-4 py-2 text-left text-[12px] font-bold rounded-lg transition-all ${fieldToExcelMap[k] === i ? 'text-blue-600 bg-blue-50' : 'text-slate-600 hover:bg-slate-50'}`}>
                                                                        {formatExcelHeaderLabel(detectedHeaders, i)}
                                                                    </button>
                                                                ))
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                    <div className="relative flex items-center border border-amber-200 rounded-lg focus-within:border-amber-400 bg-white shadow-sm transition-all">
                                        <div className="h-9 px-2.5 flex items-center justify-center bg-amber-50 text-amber-600 border-r border-amber-100">
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                                        </div>
                                        <button onClick={() => setShowMappingMenu(showMappingMenu === '_copies' ? null : '_copies')}
                                            className={`h-9 px-3 text-[12px] font-bold rounded-r-lg transition-all flex items-center gap-1.5 outline-none ${fieldToExcelMap['_copies'] !== undefined ? 'bg-amber-500 text-white' : 'bg-transparent text-slate-500 hover:bg-slate-50'}`}>
                                            <span className="truncate max-w-[150px]">매수 (인쇄 수량) {fieldToExcelMap['_copies'] !== undefined ? `← ${formatExcelHeaderLabel(detectedHeaders, fieldToExcelMap['_copies'])}` : ''}</span>
                                            <svg className={`w-3 h-3 transition-transform ${showMappingMenu === '_copies' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path d="M19 9l-7 7-7-7" /></svg>
                                        </button>
                                        {showMappingMenu === '_copies' && (
                                            <div className="absolute top-full left-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-[150] min-w-[180px] py-1.5 animate-in fade-in zoom-in-95">
                                                <button onClick={() => updateExcelMapping('_copies', undefined)} className="w-full px-4 py-2 text-left text-[12px] font-bold text-red-500 hover:bg-red-50 transition-colors">매핑 해제</button>
                                                <div className="h-px bg-slate-100 mx-3 my-1" />
                                                <div className="max-h-[250px] overflow-y-auto scrollbar-hide">
                                                    {excelMappingColumnIndices.length === 0 ? (
                                                        <p className="px-4 py-2 text-[11px] text-slate-400">표시할 열이 없습니다.</p>
                                                    ) : (
                                                        excelMappingColumnIndices.map((i) => (
                                                            <button key={`excel-col-copies-${i}`} type="button" onClick={() => updateExcelMapping('_copies', i)}
                                                                className={`w-full px-4 py-2 text-left text-[12px] font-bold rounded-lg transition-all ${fieldToExcelMap['_copies'] === i ? 'text-amber-600 bg-amber-50' : 'text-slate-600 hover:bg-slate-50'}`}>
                                                                {formatExcelHeaderLabel(detectedHeaders, i)}
                                                            </button>
                                                        ))
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                    </div>
                    {/* ═══ Right Column: Sticky Preview ═══ */}
                    <div className="w-[300px] shrink-0 sticky top-4 z-30 self-start">
                        {/* Right: Preview */}
                        <div className="w-[300px] shrink-0">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <span className="text-[14px] font-extrabold text-slate-700">미리 보기</span>
                                    <button onClick={() => setIsLayoutLocked(!isLayoutLocked)} className={`h-6 px-2.5 rounded-full flex items-center justify-center gap-1.5 transition-all outline-none ${isLayoutLocked ? 'bg-amber-50 text-amber-600 border border-amber-200 hover:bg-amber-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100'}`}>
                                        {isLayoutLocked ? (
                                            <>
                                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>
                                                <span className="text-[10px] font-bold">위치 고정됨</span>
                                            </>
                                        ) : (
                                            <>
                                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a5 5 0 00-5 5v2a2 2 0 00-2 2v5a2 2 0 002 2h10a2 2 0 002-2v-5a2 2 0 00-2-2H7V7a3 3 0 015.905-.75 1 1 0 001.937-.5A5.002 5.002 0 0010 2z" /></svg>
                                                <span className="text-[10px] font-bold">이동 가능</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                                <button onClick={() => setFieldPositions({ ...DEFAULT_FIELD_POSITIONS })} className="text-[11px] font-bold text-blue-600 hover:text-blue-700">위치 초기화</button>
                            </div>
                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 flex flex-col items-center gap-2">
                                {/* ── Positioning Toolbar ── */}
                                <div className="w-full flex items-center justify-between bg-white border border-slate-200 rounded-lg p-1.5 shadow-sm mb-1">
                                    <div className="flex items-center gap-1">
                                        <button onClick={() => setShowGrid(!showGrid)} className={`w-8 h-8 rounded-md flex items-center justify-center transition-all ${showGrid ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:bg-slate-50'}`} title="그리드 표시/숨기기">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path d="M3 3h7v7H3V3zm11 0h7v7h-7V3zm0 11h7v7h-7v-7zm-11 0h7v7H3v-7z" /></svg>
                                        </button>
                                        <div className="w-px h-4 bg-slate-100 mx-1" />
                                        <button onClick={() => alignField('h')} disabled={!selectedField || isLayoutLocked} className="w-8 h-8 rounded-md text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center" title="가로 중앙 정렬">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path d="M12 3v18M8 12h8" /></svg>
                                        </button>
                                        <button onClick={() => alignField('v')} disabled={!selectedField || isLayoutLocked} className="w-8 h-8 rounded-md text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center" title="세로 중앙 정렬">
                                            <svg className="w-4 h-4 rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path d="M12 3v18M8 12h8" /></svg>
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-0.5 bg-slate-50 rounded-md p-0.5 border border-slate-100">
                                        <div className="grid grid-cols-3 gap-0.5">
                                            <div />
                                            <button onClick={() => nudgeField('up')} disabled={!selectedField || isLayoutLocked} className="w-6 h-6 rounded flex items-center justify-center hover:bg-white text-slate-400 disabled:opacity-30"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path d="M5 15l7-7 7 7" /></svg></button>
                                            <div />
                                            <button onClick={() => nudgeField('left')} disabled={!selectedField || isLayoutLocked} className="w-6 h-6 rounded flex items-center justify-center hover:bg-white text-slate-400 disabled:opacity-30"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path d="M15 19l-7-7 7-7" /></svg></button>
                                            <button onClick={() => nudgeField('down')} disabled={!selectedField || isLayoutLocked} className="w-6 h-6 rounded flex items-center justify-center hover:bg-white text-slate-400 disabled:opacity-30"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path d="M19 9l-7 7-7-7" /></svg></button>
                                            <button onClick={() => nudgeField('right')} disabled={!selectedField || isLayoutLocked} className="w-6 h-6 rounded flex items-center justify-center hover:bg-white text-slate-400 disabled:opacity-30"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path d="M9 5l7 7-7 7" /></svg></button>
                                        </div>
                                    </div>
                                </div>
                                <div className="w-full aspect-[1.15/1] bg-white rounded-lg flex items-center justify-center relative overflow-hidden border border-slate-200 group">
                                    <div className="absolute top-3 left-1/2 -translate-x-1/2 text-[9px] font-bold text-slate-300 tracking-wider">{getWidth()} × {getHeight()} mm</div>
                                    <div className="bg-white shadow border border-slate-200 relative overflow-hidden" ref={previewContainerRef}
                                        style={{
                                            width: `${getWidth() * MM_TO_PX}px`,
                                            height: `${getHeight() * MM_TO_PX}px`,
                                            transform: `scale(${Math.min(1.3, 260 / (getWidth() * MM_TO_PX))})`,
                                            transformOrigin: 'center center',
                                            backgroundImage: showGrid ? 'linear-gradient(rgba(59,130,246,0.18) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.18) 1px, transparent 1px)' : 'none',
                                            backgroundSize: `${5 * MM_TO_PX}px ${5 * MM_TO_PX}px`
                                        }}>
                                        {fieldOrder.map(k => {
                                            const val = activeItem[k];
                                            if (!val && selectedField !== k) return null;

                                            const pos = fieldPositions[k];
                                            if (!pos || pos.hidden) {
                                                if (selectedField !== k) return null;
                                            }
                                            const actualPos = pos || { x: 50, y: 50 };

                                            const st = fieldStyles[k] || DEFAULT_FIELD_STYLES.productName;
                                            const fs = (calculateFontSize(getWidth(), getHeight()) + (st.sizeOffset || 0)) * (MM_TO_PX / 3.78) * 1.33;
                                            const tr = st.textAlign === 'left' ? '0,-50%' : st.textAlign === 'right' ? '-100%,-50%' : '-50%,-50%';
                                            return (
                                                <div key={k} onMouseDown={e => { e.stopPropagation(); setSelectedField(k); handleMouseDown(e, k); }}
                                                    className={`absolute cursor-move select-none rounded transition-all ${selectedField === k ? 'ring-2 ring-blue-400/30 bg-blue-50/80 z-10 px-0.5' : 'hover:ring-1 hover:ring-blue-200'}`}
                                                    style={{ left: `${actualPos.x}%`, top: `${actualPos.y}%`, transform: `translate(${tr})`, fontWeight: st.fontWeight, fontSize: `${fs}px`, fontFamily: st.fontFamily, textAlign: st.textAlign, whiteSpace: 'nowrap' }}>
                                                    {st.fontFamily === 'Barcode' ? (
                                                        <img src={generateBarcodeBase64(val || '123456789', fs, showBarcodeText) || ''} style={{ height: `${fs * 5.2}px`, pointerEvents: 'none', maxWidth: '100%' }} />
                                                    ) : (k === 'price' && showPriceUnit && val) ? `₩${Number(val).toLocaleString()} 원` : (k === 'extra1' && showExtra1Prefix && val) ? `NO.${val}` : (k === 'extra2' && showExtra2Prefix && val) ? `수량:${val}` : val || <span className="bg-blue-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full">데이터 입력...</span>}
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div className={`absolute bottom-3 left-1/2 -translate-x-1/2 text-[10px] font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-sm transition-all shadow-sm whitespace-nowrap z-20 ${isLayoutLocked ? 'bg-amber-500/10 text-amber-600 opacity-0 group-hover:opacity-100' : 'bg-emerald-500/10 text-emerald-600'}`}>
                                        {isLayoutLocked ? (
                                            <>
                                                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>
                                                <span>위치 잠금 해제 필요</span>
                                            </>
                                        ) : (
                                            <>
                                                <span>드래그하여 위치 조정</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                                {/* 바코드 텍스트 표시 설정 숨김 처리 */}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ═══ Full-Width Data Table ═══ */}
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col mt-5">
                            <div className="overflow-x-auto max-h-[600px] scrollbar-thin">
                                <table className="w-full">
                                    <thead className="sticky top-0 z-10">
                                        <tr className="bg-slate-50 border-b border-slate-200">
                                            <th className="px-3 py-2.5 text-center w-10">
                                                <input type="checkbox" checked={allSelected} onChange={toggleAllRows} className="w-4 h-4 rounded accent-blue-600 cursor-pointer" />
                                            </th>
                                            <th className="px-2 py-2.5 text-center text-[10px] font-bold text-slate-300 w-8">#</th>
                                            {fieldOrder.map(k => (
                                                <th key={k} className="px-2 py-2.5 text-left">
                                                    <div className="flex items-center gap-1.5 whitespace-nowrap">
                                                        <span className={`text-[11px] font-bold ${selectedField === k ? 'text-blue-600' : 'text-slate-400'}`}>{getFieldLabel(k)}</span>
                                                        {customFields.some(f => f.key === k) && (
                                                            <button onClick={() => removeCustomColumn(k)} className="w-4 h-4 rounded-full text-slate-300 hover:text-red-500 flex items-center justify-center" title="컬럼 삭제">
                                                                <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path d="M18 6L6 18M6 6l12 12" /></svg>
                                                            </button>
                                                        )}
                                                        {k === 'price' && (
                                                            <label className="flex items-center gap-1 cursor-pointer ml-auto bg-white px-1.5 py-0.5 rounded border border-slate-200 hover:border-blue-300 transition-all">
                                                                <input type="checkbox" checked={showPriceUnit} onChange={e => setShowPriceUnit(e.target.checked)} className="w-3 h-3 rounded accent-blue-600" />
                                                                <span className="text-[9px] font-bold text-slate-500">₩</span>
                                                            </label>
                                                        )}
                                                        {k === 'extra1' && (
                                                            <label className="flex items-center gap-1 cursor-pointer ml-auto bg-white px-1.5 py-0.5 rounded border border-slate-200 hover:border-blue-300 transition-all">
                                                                <input type="checkbox" checked={showExtra1Prefix} onChange={e => setShowExtra1Prefix(e.target.checked)} className="w-3 h-3 rounded accent-blue-600" />
                                                                <span className="text-[9px] font-bold text-slate-500">NO.</span>
                                                            </label>
                                                        )}
                                                        {k === 'extra2' && (
                                                            <label className="flex items-center gap-1 cursor-pointer ml-auto bg-white px-1.5 py-0.5 rounded border border-slate-200 hover:border-blue-300 transition-all">
                                                                <input type="checkbox" checked={showExtra2Prefix} onChange={e => setShowExtra2Prefix(e.target.checked)} className="w-3 h-3 rounded accent-blue-600" />
                                                                <span className="text-[9px] font-bold text-slate-500">수량</span>
                                                            </label>
                                                        )}
                                                    </div>
                                                </th>
                                            ))}
                                            <th className="px-3 py-2.5 text-center text-[10px] font-bold text-slate-400 w-24">매수</th>
                                            <th className="px-3 py-2.5 w-24">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button onClick={addCustomColumn} className="w-6 h-6 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all">
                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path d="M12 4v16m8-8H4" /></svg>
                                                    </button>
                                                    <button onClick={clearAllItems} className="w-6 h-6 rounded-md bg-red-50 text-red-400 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all">
                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                    </button>
                                                </div>
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {paginatedItems.map((item, idxInPage) => (
                                            <DataTableRow
                                                key={item.id}
                                                item={item}
                                                idxInPage={idxInPage}
                                                originalIdx={(currentPage - 1) * DATA_TABLE_PAGE_SIZE + idxInPage}
                                                isActive={activeItemIndex === ((currentPage - 1) * DATA_TABLE_PAGE_SIZE + idxInPage)}
                                                isSelected={!!selectedRows[item.id]}
                                                fieldOrder={fieldOrder}
                                                selectedField={selectedField}
                                                globalCopies={copies}
                                                getFieldLabel={getFieldLabel}
                                                onRowClick={setActiveItemIndex}
                                                onToggleSelection={toggleRowSelection}
                                                onFocusField={setSelectedField}
                                                onChangeField={updateLabelItem}
                                                onDuplicate={duplicateLabelItem}
                                                onRemove={removeLabelItem}
                                            />
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {/* Pagination */}
                            <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
                                <div className="flex items-center gap-1.5">
                                    <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed text-[12px] font-bold transition-all">«</button>
                                    <button onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1} className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed text-[12px] transition-all">‹</button>
                                    <div className="flex items-center gap-1 px-2 h-8 bg-white border border-slate-200 rounded-lg">
                                        <input type="number" min="1" max={totalPages} value={currentPage} onChange={e => { const v = parseInt(e.target.value); if (v >= 1 && v <= totalPages) setCurrentPage(v); }} className="w-10 bg-transparent text-center text-[12px] font-bold text-slate-800 outline-none" />
                                        <span className="text-slate-300 text-[11px]">/</span>
                                        <span className="text-slate-500 text-[11px] font-bold">{totalPages || 1}</span>
                                    </div>
                                    <button onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage >= totalPages} className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed text-[12px] transition-all">›</button>
                                    <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage >= totalPages} className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed text-[12px] font-bold transition-all">»</button>
                                </div>
                                <div className="text-[11px] font-bold text-slate-400">
                                    <span className="text-slate-700">{Math.min(labelItems.length, (currentPage - 1) * DATA_TABLE_PAGE_SIZE + 1).toLocaleString()}</span>
                                    <span className="mx-0.5">~</span>
                                    <span className="text-slate-700">{Math.min(labelItems.length, currentPage * DATA_TABLE_PAGE_SIZE).toLocaleString()}</span>
                                    <span className="mx-1">/</span>
                                    <span className="text-blue-600">{labelItems.length.toLocaleString()}</span>
                                </div>
                                <button onClick={addLabelItem} className="h-8 px-4 bg-white border border-slate-200 hover:border-blue-400 hover:text-blue-600 text-slate-500 rounded-lg font-bold text-[12px] transition-all flex items-center gap-1.5">
                                    <span>+</span> 행 추가
                                </button>
                            </div>
                        </div>


                {/* ═══ Inventory Modal ═══ */}
                {showInventoryPicker && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-6 animate-in fade-in duration-200">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                            <div className="p-5 border-b flex justify-between items-center">
                                <h3 className="text-lg font-bold text-slate-800">재고 데이터 가져오기</h3>
                                <button onClick={() => setShowInventoryPicker(false)} className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-800 transition-all text-xl">×</button>
                            </div>
                            <div className="px-5 py-3 border-b">
                                <input type="text" placeholder="상품명 또는 바코드..." value={inventorySearch} onChange={e => setInventorySearch(e.target.value)}
                                    className="w-full h-10 px-4 bg-slate-50 rounded-lg border border-slate-200 text-[14px] font-bold outline-none focus:ring-2 focus:ring-blue-400/20 focus:border-blue-300 placeholder:text-slate-300" />
                            </div>
                            <div className="flex-1 overflow-y-auto p-3">
                                {inventoryItems.filter(i => (i.productName + i.productCode).includes(inventorySearch)).map(inv => (
                                    <button key={inv.id} onClick={() => importFromInventory(inv)} className="w-full text-left p-3.5 hover:bg-blue-50 rounded-xl mb-1 transition-all flex justify-between items-center group">
                                        <div>
                                            <div className="font-bold text-[14px] text-slate-800 group-hover:text-blue-600 transition-colors">{inv.productName}</div>
                                            <div className="text-[11px] font-bold text-slate-400 group-hover:text-blue-500">{inv.productCode}</div>
                                        </div>
                                        <svg className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path d="M9 5l7 7-7 7" /></svg>
                                    </button>
                                ))}
                                {inventoryItems.filter(i => (i.productName + i.productCode).includes(inventorySearch)).length === 0 && (
                                    <div className="py-8 text-center text-slate-300 text-xs font-bold">검색 결과 없음</div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
                </>
                :
                <BarTenderPrintPanel user={user} />
            }
        </div>
    );
}
