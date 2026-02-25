import fetch from 'node-fetch';

async function testLocal() {
    try {
        console.log("Testing Root...");
        const root = await fetch('http://localhost:3001/');
        console.log(`Root: ${root.status} - ${await root.text()}`);

        console.log("\nTesting Chat API...");
        const chat = await fetch('http://localhost:3001/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: [{ role: 'user', content: 'Ping' }] })
        });

        console.log(`Chat: ${chat.status}`);
        if (!chat.ok) {
            console.log(`Error: ${await chat.text()}`);
        } else {
            const data = await chat.json();
            console.log("Success. Response length:", JSON.stringify(data).length);
        }
    } catch (e) {
        console.error("Connection Failed:", e.message);
    }
}

testLocal();
