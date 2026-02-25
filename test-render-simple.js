import fetch from 'node-fetch';

async function testSimple() {
    try {
        const resp = await fetch('https://crm-2b00.onrender.com/');
        console.log('Root Status:', resp.status);
        console.log('Root Text:', await resp.text());

        const api = await fetch('https://crm-2b00.onrender.com/api/chat', {
            method: 'POST',
            body: JSON.stringify({ messages: [] })
        });
        console.log('API Status:', api.status);
    } catch (e) {
        console.log('Fetch Error:', e.code || e.message);
    }
}
testSimple();
