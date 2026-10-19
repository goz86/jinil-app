/**
 * Utility for parsing and mapping Excel clipboard data (TSV) into label item rows.
 */

/**
 * Parses tab-delimited text copied from Excel or spreadsheets into a 2D array of string values.
 * Handles quoted fields, embedded newlines/quotes, tabs, and trims empty trailing rows.
 * 
 * @param {string} text - Raw clipboard text (usually text/plain from Excel)
 * @returns {string[][]} 2D array representing rows and columns
 */
export function parseClipboardTSV(text) {
    if (!text || typeof text !== 'string') return [];

    const hasTabs = text.includes('\t');
    const hasNewlines = text.includes('\n') || text.includes('\r');
    if (!hasTabs && !hasNewlines) {
        const trimmed = text.trim();
        return trimmed ? [[trimmed]] : [];
    }

    const rows = [];
    let currentRow = [];
    let currentCell = '';
    let inQuotes = false;
    const len = text.length;

    for (let i = 0; i < len; i++) {
        const char = text[i];
        const nextChar = i + 1 < len ? text[i + 1] : '';

        if (inQuotes) {
            if (char === '"' && nextChar === '"') {
                currentCell += '"';
                i++; // skip next escaped quote
            } else if (char === '"') {
                inQuotes = false;
            } else {
                currentCell += char;
            }
        } else {
            if (char === '"' && currentCell.length === 0) {
                // Only enter quote mode if quote is at the beginning of cell
                inQuotes = true;
            } else if (char === '\t') {
                currentRow.push(currentCell.trim());
                currentCell = '';
            } else if (char === '\r') {
                if (nextChar === '\n') i++;
                currentRow.push(currentCell.trim());
                currentCell = '';
                if (currentRow.some(c => c.length > 0)) {
                    rows.push(currentRow);
                }
                currentRow = [];
            } else if (char === '\n') {
                currentRow.push(currentCell.trim());
                currentCell = '';
                if (currentRow.some(c => c.length > 0)) {
                    rows.push(currentRow);
                }
                currentRow = [];
            } else {
                currentCell += char;
            }
        }
    }

    if (currentCell.length > 0 || currentRow.length > 0) {
        currentRow.push(currentCell.trim());
        if (currentRow.some(c => c.length > 0)) {
            rows.push(currentRow);
        }
    }

    return rows;
}

/**
 * Applies a 2D grid of pasted values to the existing labelItems array starting at a specific cell.
 * Features smart Jinil Apparel sub-material layout recognition:
 * - 5 columns: [품번, 수량, 부자재코드, 부자재명, 업체명]
 * - 6 columns: [발주일, 품번, 수량, 부자재코드, 부자재명, 업체명]
 * Preserves full Korean strings in price/description fields without stripping!
 */
export function applyPastedDataToItems({
    pastedGrid,
    startRowIdx = 0,
    startColKey = 'productCode',
    fieldOrder = [],
    existingItems = [],
    createItemFn
}) {
    if (!pastedGrid || pastedGrid.length === 0) {
        return { updatedItems: existingItems, affectedCount: 0, startRowIdx, endRowIdx: startRowIdx };
    }

    const allCols = [...fieldOrder, '_copies'];
    let startColIdx = allCols.indexOf(startColKey);
    if (startColIdx === -1) startColIdx = 0;

    const safeStartRowIdx = Math.max(0, startRowIdx);
    const updatedItems = [...existingItems];

    // Helper functions for Jinil pattern detection
    const isDateStr = (s) => /^\d{4}[-./]\d{1,2}[-./]\d{1,2}$/.test(String(s || '').trim());
    const isPositiveInt = (s) => /^\d+$/.test(String(s || '').trim()) && parseInt(s, 10) > 0;

    const sampleRow = pastedGrid[0] || [];
    const isJinilPattern5 = sampleRow.length >= 5 && isPositiveInt(sampleRow[1]) && !isDateStr(sampleRow[0]);
    const isJinilPattern6 = sampleRow.length >= 6 && isDateStr(sampleRow[0]) && isPositiveInt(sampleRow[2]);

    for (let r = 0; r < pastedGrid.length; r++) {
        const targetIdx = safeStartRowIdx + r;
        const rowData = pastedGrid[r] || [];

        let item;
        if (targetIdx < updatedItems.length) {
            item = { ...updatedItems[targetIdx] };
        } else {
            item = typeof createItemFn === 'function' ? createItemFn(fieldOrder) : { id: `row_${Date.now()}_${r}` };
        }

        if (startColIdx === 0 && (isJinilPattern5 || isJinilPattern6)) {
            // Smart Jinil Sub-materials auto-mapping
            let dateVal = '';
            let styleCode = '';
            let qtyVal = '';
            let trimCode = '';
            let trimName = '';
            let vendor = '';

            if (isJinilPattern6) {
                dateVal = String(rowData[0] || '').trim();
                styleCode = String(rowData[1] || '').trim();
                qtyVal = String(rowData[2] || '').trim();
                trimCode = String(rowData[3] || '').trim();
                trimName = String(rowData[4] || '').trim();
                vendor = String(rowData[5] || '').trim();
            } else {
                styleCode = String(rowData[0] || '').trim();
                qtyVal = String(rowData[1] || '').trim();
                trimCode = String(rowData[2] || '').trim();
                trimName = String(rowData[3] || '').trim();
                vendor = String(rowData[4] || '').trim();
            }

            if (styleCode) item.productCode = styleCode;
            if (qtyVal) {
                item.productName = qtyVal; // Display quantity beside trimCode on template
                const num = parseInt(qtyVal, 10);
                if (!isNaN(num) && num > 0) {
                    item._copies = num; // Set print copies
                    item.수량 = num;
                }
            }
            if (trimCode) item.option = trimCode;
            if (trimName) item.price = trimName; // Preserve 100% of Korean trim name
            if (vendor) item.extra1 = vendor;
            if (dateVal) item.extra2 = dateVal;
        } else {
            // General sequential paste
            for (let c = 0; c < rowData.length; c++) {
                const targetColIdx = startColIdx + c;
                if (targetColIdx >= allCols.length) break;

                const colKey = allCols[targetColIdx];
                let val = rowData[c];
                if (val === undefined || val === null) val = '';
                val = String(val).trim();

                if (colKey === '_copies') {
                    const num = parseInt(val.replace(/[^\d]/g, ''), 10);
                    item._copies = !isNaN(num) && num > 0 ? num : '';
                } else if (colKey === 'price') {
                    // Only clean if it is strictly a numeric currency string (e.g. ₩15,000, 15,000, 15000원)
                    const isNumericCurrency = /^[₩$]?\s*[\d,]+(\.\d+)?\s*(원)?$/.test(val);
                    if (isNumericCurrency) {
                        const cleanPrice = val.replace(/[^\d.]/g, '');
                        item.price = cleanPrice || val;
                    } else {
                        // Preserve full text intact (e.g. Korean sub-material description)
                        item.price = val;
                    }
                } else {
                    item[colKey] = val;
                }
            }
        }

        updatedItems[targetIdx] = item;
    }

    return {
        updatedItems,
        affectedCount: pastedGrid.length,
        startRowIdx: safeStartRowIdx,
        endRowIdx: safeStartRowIdx + pastedGrid.length - 1
    };
}


/**
 * Smart detection of headers in pasted grid data.
 * If row 0 contains recognized column titles (e.g. 품번, 부자재코드, 부자재명, 수량, 업체명...),
 * maps columns automatically to correct keys.
 */
export function smartApplyPastedGrid({
    pastedGrid,
    fieldOrder = [],
    existingItems = [],
    createItemFn
}) {
    if (!pastedGrid || pastedGrid.length === 0) {
        return { updatedItems: existingItems, affectedCount: 0, matchedHeaders: false };
    }

    const row0 = pastedGrid[0] || [];
    const headerMapping = {};
    let matchedHeaderCount = 0;

    const aliasMap = {
        productCode: ['상품코드', '품번', '스타일', '스타일번호', '코드', 'code', 'style', 'itemcode', 'sku'],
        option: ['부자재코드', '옵션', '사이즈', '컬러', '색상', '호칭', '규격', 'size', 'color', 'option', 'opt'],
        productName: ['상품명', '품명', '제품명', '이름', 'name', 'title', 'item'],
        price: ['부자재명', '가격', '단가', '판매가', '금액', 'price', 'amt', 'unitprice'],
        _copies: ['수량', '발주수량', '스티커수량', '인쇄수량', '매수', 'qty', 'count', 'quantity'],
        extra1: ['업체명', '거래처', '업체', '공급처', '추가1', 'no', '순번', '번호'],
        extra2: ['발주일', '발주일자', '일자', '날짜', 'date', '추가2', '메모', '비고']
    };

    row0.forEach((cell, colIdx) => {
        const text = String(cell || '').trim().toLowerCase().replace(/[\s_\-#]+/g, '');
        if (!text) return;

        for (const [key, aliases] of Object.entries(aliasMap)) {
            if (aliases.some(a => text === a || text.includes(a))) {
                if (!headerMapping[key]) {
                    headerMapping[key] = colIdx;
                    matchedHeaderCount++;
                    break;
                }
            }
        }
    });

    const hasHeaderRow = matchedHeaderCount >= 2;
    const dataRows = hasHeaderRow ? pastedGrid.slice(1) : pastedGrid;

    if (!hasHeaderRow) {
        return {
            ...applyPastedDataToItems({
                pastedGrid,
                startRowIdx: 0,
                startColKey: 'productCode',
                fieldOrder,
                existingItems,
                createItemFn
            }),
            matchedHeaders: false
        };
    }

    // Apply using smart matched headers
    const updatedItems = [];
    dataRows.forEach((row, r) => {
        const item = typeof createItemFn === 'function' ? createItemFn(fieldOrder) : { id: `row_${Date.now()}_${r}` };
        
        for (const [key, colIdx] of Object.entries(headerMapping)) {
            let val = row[colIdx];
            if (val === undefined || val === null) val = '';
            val = String(val).trim();

            if (key === '_copies') {
                const num = parseInt(val.replace(/[^\d]/g, ''), 10);
                item._copies = !isNaN(num) && num > 0 ? num : 1;
                item.수량 = item._copies;
            } else if (key === 'price') {
                const isNumericCurrency = /^[₩$]?\s*[\d,]+(\.\d+)?\s*(원)?$/.test(val);
                if (isNumericCurrency) {
                    const cleanPrice = val.replace(/[^\d.]/g, '');
                    item.price = cleanPrice || val;
                } else {
                    item.price = val;
                }
            } else {
                item[key] = val;
            }
        }

        // If productName is empty and _copies exists, also provide _copies to productName for template display
        if (!item.productName && item._copies) {
            item.productName = String(item._copies);
        }

        updatedItems.push(item);
    });

    return {
        updatedItems: updatedItems.length > 0 ? updatedItems : existingItems,
        affectedCount: dataRows.length,
        matchedHeaders: true,
        headerMapping
    };
}

/**
 * Parses a .btw file ArrayBuffer / Uint8Array in browser or electron client
 */
export function parseBtwBufferClient(uint8Array, fileName = '') {
    const result = {
        fileName,
        previewImage: null,
        targetPrinter: '',
        fields: [],
        paperSize: { width: 50, height: 30, label: '50 × 30 mm' },
    };

    // PNG search
    let pngStart = -1;
    for (let i = 0; i < Math.min(1000, uint8Array.length - 4); i++) {
        if (uint8Array[i] === 0x89 && uint8Array[i + 1] === 0x50 && uint8Array[i + 2] === 0x4E && uint8Array[i + 3] === 0x47) {
            pngStart = i;
            break;
        }
    }
    if (pngStart !== -1) {
        for (let i = pngStart; i < uint8Array.length - 8; i++) {
            if (uint8Array[i] === 0x49 && uint8Array[i + 1] === 0x45 && uint8Array[i + 2] === 0x4E && uint8Array[i + 3] === 0x44) {
                const pngEnd = i + 8;
                const pngSlice = uint8Array.slice(pngStart, pngEnd);
                let binary = '';
                const len = pngSlice.byteLength;
                for (let b = 0; b < len; b++) {
                    binary += String.fromCharCode(pngSlice[b]);
                }
                result.previewImage = `data:image/png;base64,${btoa(binary)}`;
                break;
            }
        }
    }

    try {
        const decoder = new TextDecoder('utf-16le');
        const str = decoder.decode(uint8Array);
        const printerMatch = str.match(/(TSC\s+TTP-[0-9]+|BIXOLON\s+[A-Za-z0-9-]+|PS100|NOVEXX[^\x00]+)/i);
        if (printerMatch) result.targetPrinter = printerMatch[1].trim();

        const bindingRegex = /[A-Za-z0-9가-힣_]+\$\.([A-Za-z0-9가-힣_]+)/g;
        const fieldSet = new Set();
        let m;
        while ((m = bindingRegex.exec(str)) !== null) {
            const f = m[1].trim();
            if (f && f !== 'Print_Area' && !f.startsWith('_')) {
                fieldSet.add(f);
            }
        }
        result.fields = Array.from(fieldSet);
    } catch {
        // Ignore decoding errors
    }

    const norm = fileName.toLowerCase().replace(/\s+/g, '');
    if (norm.includes('5x2.5') || norm.includes('50x25')) {
        result.paperSize = { key: 'custom_50x25', label: '50 × 25 mm', width: 50, height: 25 };
    } else if (norm.includes('40x30')) {
        result.paperSize = { key: 'custom_40x30', label: '40 × 30 mm', width: 40, height: 30 };
    } else if (norm.includes('40x20')) {
        result.paperSize = { key: 'custom_40x20', label: '40 × 20 mm', width: 40, height: 20 };
    } else if (norm.includes('60x40')) {
        result.paperSize = { key: 'custom_60x40', label: '60 × 40 mm', width: 60, height: 40 };
    } else {
        result.paperSize = { key: 'custom_50x30', label: '50 × 30 mm', width: 50, height: 30 };
    }

    return result;
}
