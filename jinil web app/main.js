import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, net, Notification, dialog, clipboard } from 'electron';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { execFile } from 'child_process';
import * as XLSX from 'xlsx';
import pkg from 'electron-updater';
const { autoUpdater } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow = null;
let miniWindow = null;
let tray = null;
let isQuitting = false;

const BARTENDER_CONFIG_NAME = 'bartender-config.json';
const KNOWN_BARTENDER_FILENAMES = ['bartend.exe', 'BarTend.exe'];
const DEFAULT_BARTENDER_CANDIDATES = [
    'C:\\Program Files\\Seagull\\BarTender Suite\\bartend.exe',
    'C:\\Program Files (x86)\\Seagull\\BarTender Suite\\bartend.exe',
    'C:\\Program Files\\Seagull\\BarTender 2022\\bartend.exe',
    'C:\\Program Files (x86)\\Seagull\\BarTender 2022\\bartend.exe',
    'C:\\Program Files\\Seagull\\BarTender 2021\\bartend.exe',
    'C:\\Program Files (x86)\\Seagull\\BarTender 2021\\bartend.exe',
];

function execFileAsync(command, args, options = {}) {
    return new Promise((resolve, reject) => {
        execFile(command, args, options, (error, stdout, stderr) => {
            if (error) {
                reject(new Error(stderr || stdout || error.message));
                return;
            }
            resolve({ stdout, stderr });
        });
    });
}

async function fileExists(targetPath) {
    try {
        await fs.access(targetPath);
        return true;
    } catch {
        return false;
    }
}

async function getBarTenderConfigPath() {
    return path.join(app.getPath('userData'), BARTENDER_CONFIG_NAME);
}

async function readBarTenderConfig() {
    const configPath = await getBarTenderConfigPath();
    try {
        const raw = await fs.readFile(configPath, 'utf8');
        return JSON.parse(raw);
    } catch {
        return {};
    }
}

async function writeBarTenderConfig(nextConfig) {
    const configPath = await getBarTenderConfigPath();
    const current = await readBarTenderConfig();
    const merged = { ...current, ...nextConfig };
    await fs.writeFile(configPath, JSON.stringify(merged, null, 2), 'utf8');
    return merged;
}

function xmlEscape(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
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

function parseExcelWorkbook(filePath) {
    const workbook = XLSX.readFile(filePath, { raw: false, cellDates: false });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
        throw new Error('Excel sheet not found.');
    }

    const worksheet = workbook.Sheets[sheetName];
    const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '', raw: false });
    const headerRow = rawRows[0] || [];
    const seenKeys = new Set();
    const columns = headerRow.map((header, index) => {
        const label = String(header ?? '').trim() || `Column ${columnLetter(index)}`;
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
        path: filePath,
        fileName: path.basename(filePath),
        sheetName,
        columns,
        rows,
    };
}

function extractTemplateFieldCandidates(buffer) {
    const textSources = [buffer.toString('utf16le'), buffer.toString('latin1')];
    const blacklist = new Set([
        'BarTender', 'Format', 'File', 'Edition', 'Version', 'Build', 'Print_Area',
        'DOUBLE', 'WCHAR', 'Arial', 'Courier', 'Input', 'Data', 'File', 'Common',
        'Functions', 'Subs', 'Group', 'Box', 'Control', 'Dialog', 'Background',
        'Printer', 'Templates', 'Picture', 'Light', 'UltraLight', 'ExtraBold',
        'PromptOptionsPage', 'OnProcessData', 'OnPostSerialize', 'RFID', 'Users',
        'Desktop', 'Administrator', 'Documents', 'TSC', 'TTP', 'ScreenDs',
        'DbOLEDBData', 'DbOLEDBTableData', 'DbOLEDBFieldData', 'InputFileDs',
        'TextData', 'LineData', 'CircleData', 'PictureData', 'BackgroundData',
        'BackgroundRFIDData', 'DropdownControlData', 'ListBoxControlData',
    ]);
    const knownKeywords = [
        '바코드', '제품명', '상품명', '사이즈', '옵션', '스타일', '스타일넘버', '가격', '단가', '수량',
        '품명', '품번', '코드', '색상', '컬러', '브랜드', '호수', '호칭', '규격',
        'barcode', 'product', 'name', 'size', 'option', 'style', 'code', 'price', 'qty', 'quantity',
    ];

    const results = [];
    const seen = new Set();

    for (const source of textSources) {
        const matches = source.match(/[A-Za-z가-힣][A-Za-z가-힣0-9_+\- ]{1,40}/g) || [];
        for (const match of matches) {
            const value = match.trim();
            if (
                value.length < 2 ||
                value.length > 30 ||
                blacklist.has(value) ||
                /^[0-9 ]+$/.test(value) ||
                !/[가-힣A-Za-z]/.test(value)
            ) {
                continue;
            }

            const normalized = value.toLowerCase().replace(/\s+/g, '');
            const looksUseful = knownKeywords.some((keyword) =>
                normalized.includes(keyword.toLowerCase().replace(/\s+/g, ''))
            );
            if (!looksUseful) {
                continue;
            }

            const dedupeKey = value.toLowerCase();
            if (!seen.has(dedupeKey)) {
                seen.add(dedupeKey);
                results.push(value);
            }
        }
    }

    return results.slice(0, 40);
}

async function findExecutableInDirectory(rootDir, depth = 3) {
    if (!rootDir || depth < 0 || !(await fileExists(rootDir))) {
        return null;
    }

    const entries = await fs.readdir(rootDir, { withFileTypes: true });
    for (const entry of entries) {
        const entryPath = path.join(rootDir, entry.name);
        if (entry.isFile() && KNOWN_BARTENDER_FILENAMES.includes(entry.name)) {
            return entryPath;
        }
    }

    if (depth === 0) {
        return null;
    }

    for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const result = await findExecutableInDirectory(path.join(rootDir, entry.name), depth - 1);
        if (result) return result;
    }

    return null;
}

async function resolveBarTenderExecutable(preferredPath) {
    if (preferredPath && await fileExists(preferredPath)) {
        await writeBarTenderConfig({ executablePath: preferredPath });
        return preferredPath;
    }

    const config = await readBarTenderConfig();
    if (config.executablePath && await fileExists(config.executablePath)) {
        return config.executablePath;
    }

    for (const candidate of DEFAULT_BARTENDER_CANDIDATES) {
        if (await fileExists(candidate)) {
            await writeBarTenderConfig({ executablePath: candidate });
            return candidate;
        }
    }

    const roots = [
        'C:\\Program Files\\Seagull',
        'C:\\Program Files (x86)\\Seagull',
    ];

    for (const root of roots) {
        const found = await findExecutableInDirectory(root, 4);
        if (found) {
            await writeBarTenderConfig({ executablePath: found });
            return found;
        }
    }

    return null;
}

function buildBarTenderXml({ templatePath, rows, mappings, copies }) {
    const commands = rows.map((row, index) => {
        const namedFields = mappings.map((mapping) => {
            const value = row.values?.[mapping.excelColumnKey] ?? '';
            return [
                `      <NamedSubString Name="${xmlEscape(mapping.btField)}">`,
                `        <Value>${xmlEscape(value)}</Value>`,
                '      </NamedSubString>',
            ].join('\n');
        }).join('\n');

        return [
            `  <Command Name="Job${index + 1}">`,
            '    <Print>',
            `      <Format>${xmlEscape(templatePath)}</Format>`,
            '      <PrintSetup>',
            `        <IdenticalCopiesOfLabel>${Math.max(1, copies || 1)}</IdenticalCopiesOfLabel>`,
            '      </PrintSetup>',
            namedFields,
            '    </Print>',
            '  </Command>',
        ].join('\n');
    }).join('\n');

    return [
        '<?xml version="1.0" encoding="utf-8"?>',
        '<XMLScript Version="2.0" Name="JinilBarTenderJob">',
        commands,
        '</XMLScript>',
    ].join('\n');
}

app.setName("진일 라벨");
if (process.platform === 'win32') {
    app.setAppUserModelId("com.jinil.todos");
}

function createMiniWindow() {
    if (miniWindow) {
        if (miniWindow.isMinimized()) miniWindow.restore();
        miniWindow.show();
        miniWindow.focus();
        return;
    }
    const isDev = !app.isPackaged;
    const iconPath = isDev ? path.join(__dirname, '../public/logo.png') : path.join(__dirname, '../dist/logo.png');
    miniWindow = new BrowserWindow({
        width: 300, height: 480, title: "Jinil Mini",
        icon: nativeImage.createFromPath(iconPath),
        frame: false, transparent: true, alwaysOnTop: true, resizable: true, skipTaskbar: true,
        minWidth: 200, minHeight: 300,
        maxWidth: 800, maxHeight: 1200,
        hasShadow: true,
        webPreferences: { nodeIntegration: false, contextIsolation: true, webSecurity: false, preload: path.join(__dirname, 'preload.js') }
    });
    if (isDev) {
        miniWindow.loadURL('http://localhost:5173/#/mini');
    } else {
        miniWindow.loadURL(`file://${path.join(__dirname, '../dist/index.html')}#/mini`);
    }
    miniWindow.on('closed', () => { miniWindow = null; });
}

function createWindow() {
    const isDev = !app.isPackaged;
    const iconPath = isDev ? path.join(__dirname, '../public/logo.png') : path.join(__dirname, '../dist/logo.png');
    mainWindow = new BrowserWindow({
        width: 1400, height: 900, title: "진일 라벨",
        icon: nativeImage.createFromPath(iconPath),
        autoHideMenuBar: true, show: false,
        webPreferences: { nodeIntegration: false, contextIsolation: true, webSecurity: false, devTools: true, preload: path.join(__dirname, 'preload.js') }
    });
    if (isDev) { mainWindow.loadURL('http://localhost:5173'); }
    else { mainWindow.loadFile(path.join(__dirname, '../dist/index.html')); }

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });
    mainWindow.on('closed', () => { console.log('[Main] mainWindow closed'); mainWindow = null; });
    mainWindow.on('close', (event) => {
        console.log('[Main] close event triggered, isQuitting:', isQuitting);
        if (!isQuitting) { event.preventDefault(); mainWindow.hide(); }
        return false;
    });

    ipcMain.handle('get-auto-start', async () => {
        if (isDev) return false;
        const configPath = path.join(app.getPath('userData'), 'preferences.json');
        try {
            const data = await fs.readFile(configPath, 'utf8');
            const prefs = JSON.parse(data);
            if (prefs.autostartSet) return true;
        } catch (e) {}
        return app.getLoginItemSettings().openAtLogin;
    });

    ipcMain.handle('toggle-auto-start', async (event, enable) => {
        if (!isDev) {
            app.setLoginItemSettings({ openAtLogin: enable, path: app.getPath('exe'), args: [] });
            
            // Update the preferences.json so get-auto-start doesn't read stale 'true' forever
            const configPath = path.join(app.getPath('userData'), 'preferences.json');
            try {
                const data = await fs.readFile(configPath, 'utf8').catch(() => '{}');
                const prefs = JSON.parse(data);
                prefs.autostartSet = enable;
                await fs.writeFile(configPath, JSON.stringify(prefs));
            } catch (e) { console.error('Failed to update preferences:', e); }
        }
        return enable;
    });

    ipcMain.on('set-progress', (event, progress) => { if (mainWindow) mainWindow.setProgressBar(progress); });
    ipcMain.on('flash-frame', (event, flash) => { if (mainWindow) mainWindow.flashFrame(flash); });

    ipcMain.handle('fetch-news', async () => {
        try {
            const url = 'https://news.google.com/rss?hl=ko&gl=KR&ceid=KR:ko';
            const response = await net.fetch(url);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return await response.text();
        } catch (error) { console.error('Failed to fetch news:', error); throw error; }
    });

    ipcMain.on('toggle-mini-widget', () => {
        console.log('[Main] IPC: toggle-mini-widget');
        if (miniWindow) {
            if (miniWindow.isVisible()) { miniWindow.hide(); }
            else { if (miniWindow.isMinimized()) miniWindow.restore(); miniWindow.show(); miniWindow.focus(); }
        } else { createMiniWindow(); }
    });
    ipcMain.on('close-mini-widget', () => { if (miniWindow) { miniWindow.close(); miniWindow = null; } });
    ipcMain.on('hide-mini-widget', () => { if (miniWindow) miniWindow.hide(); });

    ipcMain.on('show-notification', (event, title, body) => {
        if (Notification.isSupported()) {
            const iconPath = app.isPackaged ? path.join(__dirname, '../dist/logo.png') : path.join(__dirname, '../public/logo.png');
            let notificationIcon;
            try { notificationIcon = nativeImage.createFromPath(iconPath); } catch (e) { console.error(e); }
            new Notification({ title, body, icon: notificationIcon, silent: false }).show();
        }
    });

    const fetchImage = async (url) => {
        const response = await net.fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const buffer = await response.arrayBuffer();
        return nativeImage.createFromBuffer(Buffer.from(buffer));
    };

    ipcMain.handle('copy-image', async (event, imageUrl) => {
        try { const image = await fetchImage(imageUrl); clipboard.writeImage(image); return true; }
        catch (error) { console.error('Failed to copy image:', error); return false; }
    });

    ipcMain.handle('save-image', async (event, imageUrl, filename) => {
        try {
            const { filePath } = await dialog.showSaveDialog({
                defaultPath: filename || 'delivery_image.jpg',
                filters: [{ name: 'Images', extensions: ['jpg', 'png', 'jpeg'] }]
            });
            if (filePath) {
                const image = await fetchImage(imageUrl);
                await fs.writeFile(filePath, image.toJPEG(90));
                return true;
            }
            return false;
        } catch (error) { console.error('Failed to save image:', error); return false; }
    });

    ipcMain.handle('print-image', async (event, imageUrl) => {
        let printWindow = new BrowserWindow({ show: false });
        printWindow.loadURL(`data:text/html,<html><body><img src="${imageUrl}" style="width:100%"/></body></html>`);
        printWindow.webContents.on('did-finish-load', () => {
            printWindow.webContents.print({}, (success, errorType) => {
                if (!success) console.error(errorType);
                printWindow.close(); printWindow = null;
            });
        });
        return true;
    });

    ipcMain.handle('bartender-get-config', async () => {
        const executablePath = await resolveBarTenderExecutable();
        return {
            executablePath,
            configured: Boolean(executablePath),
        };
    });

    ipcMain.handle('bartender-pick-executable', async () => {
        const result = await dialog.showOpenDialog({
            title: 'Select BarTender executable',
            properties: ['openFile'],
            filters: [{ name: 'Executable', extensions: ['exe'] }],
        });
        if (result.canceled || !result.filePaths[0]) {
            return null;
        }

        const executablePath = result.filePaths[0];
        await writeBarTenderConfig({ executablePath });
        return {
            executablePath,
            configured: true,
        };
    });

    ipcMain.handle('bartender-pick-template', async () => {
        const result = await dialog.showOpenDialog({
            title: 'Select BarTender template',
            properties: ['openFile'],
            filters: [{ name: 'BarTender Template', extensions: ['btw'] }],
        });
        if (result.canceled || !result.filePaths[0]) {
            return null;
        }

        const templatePath = result.filePaths[0];
        const buffer = await fs.readFile(templatePath);
        return {
            path: templatePath,
            fileName: path.basename(templatePath),
            detectedFields: extractTemplateFieldCandidates(buffer),
        };
    });

    ipcMain.handle('bartender-pick-excel', async () => {
        const result = await dialog.showOpenDialog({
            title: 'Select Excel file',
            properties: ['openFile'],
            filters: [{ name: 'Excel', extensions: ['xls', 'xlsx', 'csv'] }],
        });
        if (result.canceled || !result.filePaths[0]) {
            return null;
        }

        return parseExcelWorkbook(result.filePaths[0]);
    });

    ipcMain.handle('bartender-print', async (event, payload) => {
        const templatePath = payload?.templatePath;
        const mappings = Array.isArray(payload?.mappings) ? payload.mappings.filter((item) => item.btField && item.excelColumnKey) : [];
        const rows = Array.isArray(payload?.rows) ? payload.rows : [];
        const copies = Math.max(1, Number(payload?.copies || 1));

        if (!templatePath) {
            throw new Error('BarTender template path is required.');
        }
        if (!await fileExists(templatePath)) {
            throw new Error('Selected .btw template no longer exists.');
        }
        if (mappings.length === 0) {
            throw new Error('Please configure at least one BarTender field mapping.');
        }
        if (rows.length === 0) {
            throw new Error('No Excel rows available to print.');
        }

        const executablePath = await resolveBarTenderExecutable(payload?.executablePath);
        if (!executablePath) {
            throw new Error('BarTender executable not found. Please select bartend.exe first.');
        }

        const xml = buildBarTenderXml({ templatePath, rows, mappings, copies });
        const tempDir = path.join(app.getPath('userData'), 'bartender-jobs');
        await fs.mkdir(tempDir, { recursive: true });
        const xmlPath = path.join(tempDir, `job-${Date.now()}.btxml`);
        await fs.writeFile(xmlPath, xml, 'utf8');

        await execFileAsync(executablePath, [
            `/XMLScript=${xmlPath}`,
            '/XMLScriptFileDelete',
            '/NOSPLASH',
            '/MIN=SystemTray',
            '/X',
        ], {
            windowsHide: true,
        });

        return {
            success: true,
            executablePath,
            printedRows: rows.length,
            copies,
        };
    });
}

function createTray() {
    const isDev = !app.isPackaged;
    const iconPath = isDev ? path.join(__dirname, '../public/logo.png') : path.join(__dirname, '../dist/logo.png');
    let trayIcon;
    try {
        trayIcon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
    } catch (e) {
        console.error('Failed to load tray icon:', e);
        trayIcon = nativeImage.createFromPath(app.getAppPath());
    }
    tray = new Tray(trayIcon);
    tray.setToolTip('진일 라벨');
    const contextMenu = Menu.buildFromTemplate([
        { label: '메인 창 열기', click: () => { if (mainWindow) { mainWindow.show(); mainWindow.focus(); } } },
        { label: '미니 창 (항상 위에)', click: () => { if (miniWindow) { miniWindow.close(); } else { createMiniWindow(); } } },
        { type: 'separator' },
        { label: '종료', click: () => { isQuitting = true; if (miniWindow) miniWindow.close(); app.quit(); } }
    ]);
    tray.setContextMenu(contextMenu);
    tray.on('double-click', () => { if (mainWindow) { mainWindow.show(); mainWindow.focus(); } });
}

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', () => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            if (!mainWindow.isVisible()) mainWindow.show();
            mainWindow.focus();
        }
    });

    app.on('before-quit', () => { console.log('[App] before-quit'); isQuitting = true; });

    app.on('will-quit', (event) => {
        console.log('[App] will-quit, isQuitting:', isQuitting);
        if (!isQuitting) { event.preventDefault(); }
    });

    app.whenReady().then(async () => {
        try {
            createWindow();
            createTray();
            const isDev = !app.isPackaged;
            if (!isDev) {
                try {
                    const configPath = path.join(app.getPath('userData'), 'preferences.json');
                    try {
                        await fs.access(configPath);
                    } catch {
                        app.setLoginItemSettings({ openAtLogin: true, path: app.getPath('exe'), args: [] });
                        await fs.writeFile(configPath, JSON.stringify({ autostartSet: true }));
                    }
                    autoUpdater.autoDownload = true;
                    autoUpdater.autoInstallOnAppQuit = true;

                    autoUpdater.on('checking-for-update', () => {
                        console.log('Checking for update...');
                    });

                    autoUpdater.on('update-available', (info) => {
                        console.log('Update available:', info.version);
                        new Notification({ 
                            title: '프로그램 업데이트', 
                            body: `새로운 버전(${info.version})을 찾았습니다. 다운로드 중...` 
                        }).show();
                    });

                    autoUpdater.on('update-not-available', (info) => {
                        console.log('Update not available.');
                    });

                    autoUpdater.on('error', (err) => {
                        console.error('Update error:', err);
                    });

                    autoUpdater.on('update-downloaded', (info) => {
                        console.log('Update downloaded:', info.version);
                        dialog.showMessageBox({
                            type: 'info',
                            title: '프로그램 업데이트',
                            message: `새 버전(${info.version})이 다운로드되었습니다!`,
                            detail: '지금 업데이트를 설치하고 앱을 다시 시작하시겠습니까?',
                            buttons: ['지금 다시 시작', '나중에']
                        }).then((result) => {
                            if (result.response === 0) {
                                isQuitting = true;
                                autoUpdater.quitAndInstall();
                            }
                        });
                    });

                    autoUpdater.checkForUpdatesAndNotify();
                } catch (err) { console.error('Non-critical init error:', err); }
            }
            app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
        } catch (fatalError) {
            console.error('Fatal initialization error:', fatalError);
            createWindow();
        }
    });

    app.on('window-all-closed', () => {
        console.log('[App] window-all-closed, isQuitting:', isQuitting);
        if (process.platform !== 'darwin' && isQuitting) { app.quit(); }
    });
}
