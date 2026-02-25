import fetch from 'node-fetch';

async function testFinal() {
    const URL = 'https://strtabin-ai.onrender.com';
    console.log(`Checking ${URL}...`);
    try {
        const resp = await fetch(URL);
        const text = await resp.text();
        console.log(`Root Status: ${resp.status}`);
        console.log(`Root Content: "${text.substring(0, 100)}..."`); // Show first 100 chars

        if (text.includes("STRAB Server")) {
            console.log("✅ CORRECT CODE IS LIVE.");
        } else {
            console.log("❌ OLD CODE IS RUNNING.");
        }
    } catch (e) {
        console.log('Error:', e.message);
    }
}
testFinal();
