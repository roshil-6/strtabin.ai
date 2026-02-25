import fetch from 'node-fetch';

async function testFixFinal() {
    const URL = 'https://strtabin-ai.onrender.com/api/chat';
    console.log(`Testing Chat API (Claude 3.0 Fix): ${URL}`);

    try {
        const response = await fetch(URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages: [{ role: 'user', content: 'If you are Claude 3.0, say "Compatible".' }]
            })
        });

        console.log(`Status: ${response.status}`);
        if (response.ok) {
            const data = await response.json();
            console.log("\n✅ SUCCESS! The Fix Worked.");
            console.log("Response:", JSON.stringify(data, null, 2));
        } else {
            console.log(`\n❌ FAILED. Status: ${response.status}`);
            const text = await response.text();
            console.log(`Error Body: ${text}`);
        }
    } catch (e) {
        console.log('Network Error:', e.message);
    }
}

testFixFinal();
