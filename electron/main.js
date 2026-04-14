import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, net, Notification, dialog, clipboard } from 'electron';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import pkg from 'electron-updater';
const { autoUpdater } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow = null;
let miniWindow = null;
let tray = null;
let isQuitting = false;

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