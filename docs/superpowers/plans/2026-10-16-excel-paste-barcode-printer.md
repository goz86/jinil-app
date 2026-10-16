# Excel Paste Feature for Barcode Printer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow users to copy data directly from Excel files and paste into the Barcode Print (바코드 인쇄) table cells, preserving each row and column structure and automatically expanding rows for rapid label generation and printing.

**Architecture:** 
1. Build a robust TSV clipboard parser (`parseClipboardTSV`) that cleanly extracts rows and columns from Excel clipboard data (handling tabs, newlines, quotes, and whitespace).
2. Wire up `onPaste` handlers on both the individual cell inputs and the table container so that pressing `Ctrl+V` into any cell pastes starting at that cell's row and column.
3. Automatically append new rows if the pasted dataset has more rows than currently present in the table.
4. Add a dedicated "엑셀 붙여넣기" (Paste from Excel) button with direct clipboard access (`navigator.clipboard.readText()`) and a quick paste fallback modal.
5. Provide sleek visual feedback (toast notification and subtle cell highlight) in accordance with the `taste-skill` design principles.

**Tech Stack:** React 19, Vite, Tailwind CSS v4, SweetAlert2.

---

### Task 1: TSV Clipboard Parsing Utility

**Files:**
- Create: `src/utils/clipboardExcelParser.js`
- Test: Verification via node test script

**Interfaces:**
- Produces: `parseClipboardTSV(text: string): string[][]`
  - Parses tab-separated values from Excel clipboard into a 2D array of string values `rows[rowIndex][colIndex]`.
  - Handles escaped quotes (`""`), quoted multi-line cells, CRLF (`\r\n`), LF (`\n`).
  - Trims trailing empty rows.
- Produces: `applyPastedDataToItems(pastedGrid, startRowIdx, startColKey, fieldOrder, existingItems, createItemFn): { updatedItems, affectedCount }`

- [ ] **Step 1: Create `src/utils/clipboardExcelParser.js`**
Write `parseClipboardTSV` and `applyPastedDataToItems`.

- [ ] **Step 2: Add mapping function `applyPastedDataToItems`**
Implements starting-row and starting-column placement, automatic creation of missing rows, and handling of `_copies` column.

- [ ] **Step 3: Verify parsing utility with node script**
Run a test script in node verifying:
- Single cell
- 1 column x 10 rows
- Multi-column x multi-row
- Trailing newlines
- Quoted cells with commas/tabs

---

### Task 2: Cell-Level and Table-Level Paste Integration in `LabelPrinter.jsx`

**Files:**
- Modify: `src/components/LabelPrinter.jsx`

**Interfaces:**
- Consumes: `parseClipboardTSV`, `applyPastedDataToItems` from `src/utils/clipboardExcelParser.js`
- Connects: `onPaste` on `DataTableRow` inputs, passing `(e, originalIdx, colKey)`
- State update: Updates `labelItems`, updates `activeItemIndex` to first pasted row, ensures pagination shows the pasted range, and displays a toast.

- [ ] **Step 1: Pass `onPasteCell` handler to `DataTableRow`**
Update `DataTableRow` to receive `onPasteCell`.
When `onPaste` fires on any cell input:
If text contains tabs or newlines, intercept with `e.preventDefault()` and delegate to `onPasteCell(originalIdx, colKey, text)`.

- [ ] **Step 2: Implement `handlePasteCell` in `LabelPrinter`**
Calculates column order `[...fieldOrder, '_copies']`, finds start column index, merges pasted rows starting at `originalIdx`, creates new items if row count exceeds current items, updates state, and shows a clean alert or toast.

- [ ] **Step 3: Verification of cell paste handling**
Verify that pasting 5 lines into `productCode` sets rows 0..4 `productCode`, while preserving any other existing fields or creating fresh items.

---

### Task 3: Dedicated "엑셀 붙여넣기" (Paste from Excel) Button & Fallback Modal

**Files:**
- Modify: `src/components/LabelPrinter.jsx`
- Modify: `src/contexts/LanguageContext.jsx` (for KO, VI, EN translations)

**Interfaces:**
- Produces: Action button in toolbar/table footer: `📋 엑셀 붙여넣기`
- Handles:
  1. Direct clipboard read using `navigator.clipboard?.readText()`
  2. If permission granted and valid data found: immediately applies starting from `activeItemIndex` (or row 0).
  3. If permission denied or empty or manual click: opens a sleek, compact paste dialog with a large textarea, quick instructions, and "적용 (Apply)" button.

- [ ] **Step 1: Add i18n keys to `LanguageContext.jsx`**
Add keys for `labelPasteExcel`, `labelPasteExcelDesc`, `labelPasteSuccess`.

- [ ] **Step 2: Add "엑셀 붙여넣기" button next to "+ 행 추가" and in toolbar**
Matches existing button design system (`taste-skill` standards: sleek borders, hover transitions, clear icons).

- [ ] **Step 3: Implement quick paste fallback modal**
If direct clipboard reading is blocked or user prefers pasting into a box, provide an instant clean modal with auto-focus textarea.

---

### Task 4: Visual Polish & Taste-Skill Standards

**Files:**
- Modify: `src/components/LabelPrinter.jsx`

- [ ] **Step 1: Visual feedback animation on pasted rows**
Add a brief subtle highlight animation (e.g. `bg-blue-50/60 transition-colors duration-1000`) so the user immediately sees which rows were filled.

- [ ] **Step 2: Ensure proper layout stability**
Ensure table controls and buttons fit cleanly without overflow or clashing button wraps.

---

### Task 5: Build Verification and End-to-End Testing

**Files:**
- Check: `npm run build`
- Browser test / manual verification test

- [ ] **Step 1: Run Vite build to ensure zero compilation or lint errors**
- [ ] **Step 2: Verify in browser (interactive testing via browser subagent or dev server)**
Verify:
1. Copying 1 column from Excel (e.g. 5 barcodes) and pasting into `productCode` cell.
2. Copying 4 columns from Excel (Code, Name, Option, Price) across 10 rows and pasting into Row 1 `productCode` cell.
3. Pasting when only 1 blank row exists -> automatically creates 10 rows.
4. Preview updates immediately to display the barcode and details of the pasted data.
5. Printing still generates clean labels for all pasted items.
