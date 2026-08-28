import QRCode from 'qrcode';
import fs from 'fs';
import path from 'path';

async function generate() {
    const wifi5g = 'WIFI:T:WPA;S:진일라벨_5G;P:GIH62@3185;;';
    const wifi24g = 'WIFI:T:WPA;S:진일라벨_2.4G;P:GIH62@3185;;';

    const svg5g = await QRCode.toString(wifi5g, {
        type: 'svg',
        margin: 1,
        color: {
            dark: '#0f172a',
            light: '#ffffff'
        },
        errorCorrectionLevel: 'M'
    });

    const svg24g = await QRCode.toString(wifi24g, {
        type: 'svg',
        margin: 1,
        color: {
            dark: '#0f172a',
            light: '#ffffff'
        },
        errorCorrectionLevel: 'M'
    });

    const dataUrl5g = await QRCode.toDataURL(wifi5g, {
        margin: 1,
        width: 800,
        color: { dark: '#0f172a', light: '#ffffff' },
        errorCorrectionLevel: 'M'
    });

    const dataUrl24g = await QRCode.toDataURL(wifi24g, {
        margin: 1,
        width: 800,
        color: { dark: '#0f172a', light: '#ffffff' },
        errorCorrectionLevel: 'M'
    });

    console.log("SVG 5G length:", svg5g.length);
    console.log("SVG 2.4G length:", svg24g.length);

    const outDir = 'C:/Users/junwi/.gemini/antigravity-ide/brain/62b6ea08-6193-4106-9ded-dc5e811e4c67/scratch';
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    fs.writeFileSync(path.join(outDir, 'qr_data.json'), JSON.stringify({
        svg5g,
        svg24g,
        dataUrl5g,
        dataUrl24g
    }, null, 2));

    console.log("WIFI QR Data saved successfully!");
}

generate().catch(console.error);
