import fetch from 'node-fetch';

async function testChatRender() {
    const URL = 'https://strtabin-ai.onrender.com/api/chat';
    console.log(`Testing Chat API: ${URL}`);

    try {
        const response = await fetch(URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages: [{ role: 'user', content: 'Hello, are you online?' }]
            })
        });

        console.log(`Status: ${response.status}`);
        if (!response.ok) {
            const text = await response.text();
            console.log(`Error Body: ${text}`);
        } else {
            const data = await response.json();
            console.log(`Success! Response: ${JSON.stringify(data).substring(0, 100)}...`);
        }
    } catch (e) {
        console.log('Network Error:', e.message);
    }
}

testChatRender();
