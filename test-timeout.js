import fetch from 'node-fetch';

async function testWithTimeout() {
    const URL = 'https://strtabin-ai.onrender.com/api/chat';
    console.log('Testing with 30s timeout...');
    const start = Date.now();

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000);

        const response = await fetch(URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages: [{ role: 'user', content: 'Say "OK" and nothing else.' }]
            }),
            signal: controller.signal
        });

        clearTimeout(timeout);
        const elapsed = Date.now() - start;
        console.log(`Status: ${response.status} (took ${elapsed}ms)`);

        const text = await response.text();
        console.log(`Response: ${text.substring(0, 500)}`);
    } catch (e) {
        const elapsed = Date.now() - start;
        console.log(`Error after ${elapsed}ms: ${e.message}`);
    }
}
testWithTimeout();
