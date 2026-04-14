
async function test() {
    try {
        console.log('Testing ER-API (USD)');
        const res = await fetch('https://open.er-api.com/v6/latest/USD');
        const data = await res.json();
        console.log('USD to KRW:', data.rates.KRW);
        console.log('USD to VND:', data.rates.VND);
        console.log('KRW to VND:', data.rates.VND / data.rates.KRW);

        console.log('\nTesting Yahoo Finance (Gold: GC=F)');
        const goldRes = await fetch('https://query2.finance.yahoo.com/v8/finance/chart/GC=F?range=7d&interval=1d', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        const goldData = await goldRes.json();
        const goldMeta = goldData.chart.result[0].meta;
        const currentPrice = goldMeta.regularMarketPrice;
        const g1Price = currentPrice / 31.1034768 * data.rates.KRW;
        console.log('Gold Price (GC=F):', currentPrice);
        console.log('Gold 1g (KRW):', g1Price);

    } catch (err) {
        console.error('Error:', err);
    }
}
test();

