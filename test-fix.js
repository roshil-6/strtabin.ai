import fetch from 'node-fetch';

async function testFix() {
    const URL = 'https://strtabin-ai.onrender.com/api/chat';
    console.log(`Checking ${URL}...`);
    try {
        const resp = await fetch(URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: [{ role: 'user', content: 'Ping' }] })
        });

        console.log(`Status: ${resp.status}`);
        if (resp.status === 200) {
            console.log("✅ SUCCESS! The API Key is now being read correctly.");
        } else {
            console.log("❌ STILL FAILING. Response:", await resp.text());
        }
    } catch (e) {
        console.log('Error:', e.message);
    }
}
testFix();
