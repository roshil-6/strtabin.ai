import fetch from 'node-fetch';

async function testCORS() {
    const URL = 'https://strtabin-ai.onrender.com/api/chat';
    console.log(`Testing CORS headers on: ${URL}`);

    try {
        // Simulate a browser preflight OPTIONS request
        const preflight = await fetch(URL, {
            method: 'OPTIONS',
            headers: {
                'Origin': 'https://strtabin-ai.vercel.app',
                'Access-Control-Request-Method': 'POST',
                'Access-Control-Request-Headers': 'Content-Type'
            }
        });

        console.log(`Preflight Status: ${preflight.status}`);
        console.log(`Access-Control-Allow-Origin: ${preflight.headers.get('access-control-allow-origin')}`);
        console.log(`Access-Control-Allow-Methods: ${preflight.headers.get('access-control-allow-methods')}`);

        // Now test actual POST
        const resp = await fetch(URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Origin': 'https://strtabin-ai.vercel.app'
            },
            body: JSON.stringify({ messages: [{ role: 'user', content: 'Ping' }] })
        });

        console.log(`\nPOST Status: ${resp.status}`);
        console.log(`CORS Header: ${resp.headers.get('access-control-allow-origin')}`);

        if (resp.ok) {
            console.log("✅ SUCCESS! CORS is working.");
        } else {
            console.log(`❌ Error: ${await resp.text()}`);
        }
    } catch (e) {
        console.log('Error:', e.message);
    }
}
testCORS();
