import fetch from 'node-fetch';

async function testFull() {
    const URL = 'https://strtabin-ai.onrender.com/api/chat';
    console.log('Testing full chat flow...');

    try {
        const response = await fetch(URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages: [{ role: 'user', content: 'Hello, say hi back in one word.' }]
            })
        });

        console.log(`Status: ${response.status}`);
        const text = await response.text();
        console.log(`Response: ${text}`);
    } catch (e) {
        console.log('Error:', e.message);
    }
}
testFull();
