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

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const nextChar = text[i + 1];

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
            if (char === '"') {
                inQuotes = true;
            } else if (char === '\t') {
                currentRow.push(currentCell.trim());
                currentCell = '';
            } else if (char === '\r') {
                if (nextChar === '\n') i++;
                currentRow.push(currentCell.trim());
                currentCell = '';
                rows.push(currentRow);
                currentRow = [];
            } else if (char === '\n') {
                currentRow.push(currentCell.trim());
                currentCell = '';
                rows.push(currentRow);
                currentRow = [];
            } else {
                currentCell += char;
            }
        }
    }

    if (currentCell !== '' || currentRow.length > 0) {
        currentRow.push(currentCell.trim());
        rows.push(currentRow);
    }

    // Strip trailing completely-empty rows (Excel often adds an extra \r\n at the end of selection)
    while (rows.length > 0 && rows[rows.length - 1].every(cell => !cell)) {
        rows.pop();
    }

    return rows;
}

/**
 * Applies parsed Excel grid data to the labelItems list starting from a given row and column.
 * If the pasted data exceeds existing rows, new items are automatically created.
 * 
 * @param {Object} options
 * @param {string[][]} options.pastedGrid - 2D array of cell values
 * @param {number} [options.startRowIdx=0] - 0-based index of the target row to start pasting
 * @param {string} [options.startColKey='productCode'] - Field key to start pasting into
 * @param {string[]} options.fieldOrder - Ordered list of field keys (e.g. ['productCode', 'productName', ...])
 * @param {Array} options.existingItems - Current labelItems array
 * @param {Function} options.createItemFn - Factory function for creating a new empty label item
 * @returns {{ updatedItems: Array, affectedCount: number, startRowIdx: number, endRowIdx: number }}
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

    for (let r = 0; r < pastedGrid.length; r++) {
        const targetIdx = safeStartRowIdx + r;
        const rowData = pastedGrid[r] || [];

        let item;
        if (targetIdx < updatedItems.length) {
            item = { ...updatedItems[targetIdx] };
        } else {
            item = typeof createItemFn === 'function' ? createItemFn(fieldOrder) : { id: `row_${Date.now()}_${r}` };
        }

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
                // If price contains formatted currency e.g. "₩15,000" or "15,000", clean it to numeric string
                const cleanPrice = val.replace(/[^\d.]/g, '');
                item.price = cleanPrice || val;
            } else {
                item[colKey] = val;
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
