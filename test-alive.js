import fetch from 'node-fetch';

async function checkAlive() {
    const BASE = 'https://strtabin-ai.onrender.com';
    console.log(`Checking if server is alive: ${BASE}`);

    try {
        const r = await fetch(BASE);
        console.log(`Root Status: ${r.status}`);
        console.log(`Body: ${await r.text()}`);

        // Also check CORS header
        const chat = await fetch(`${BASE}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: [{ role: 'user', content: 'ping' }] })
        });
        console.log(`\nChat Status: ${chat.status}`);
        console.log(`CORS Header: ${chat.headers.get('access-control-allow-origin')}`);
        if (chat.ok) {
            const d = await chat.json();
            console.log('✅ AI responded:', d.content?.[0]?.text?.substring(0, 100));
        } else {
            console.log('Error:', await chat.text());
        }
    } catch (e) {
        console.log('❌ Server is DOWN or unreachable:', e.message);
    }
}
checkAlive();
