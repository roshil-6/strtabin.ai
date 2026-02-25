import fetch from 'node-fetch';

async function testNewRender() {
    const URL = 'https://strtabin-ai.onrender.com';
    console.log(`Checking ${URL}...`);
    try {
        const resp = await fetch(URL);
        const text = await resp.text();
        console.log(`Status: ${resp.status}`);
        console.log(`Response: "${text}"`);

        if (text.includes("STRAB Server is Running")) {
            console.log("\n✅ SUCCESS: This is the correct server!");
        } else {
            console.log("\n❌ WARNING: Response doesn't match expected STRAB server message.");
        }
    } catch (e) {
        console.log('Error:', e.message);
    }
}
testNewRender();
