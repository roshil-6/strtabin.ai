import fetch from 'node-fetch';

async function testRender() {
    const RENDER_URL = 'https://crm-2b00.onrender.com';
    console.log(`Testing connection to: ${RENDER_URL}`);
    try {
        console.log("1. Pinging Root...");
        const root = await fetch(`${RENDER_URL}/`);
        console.log(`   Status: ${root.status}`);
        console.log(`   Response: ${await root.text()}`);

        console.log("\n2. Pinging Chat API (Options/Post)...");
        const chat = await fetch(`${RENDER_URL}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: [{ role: 'user', content: 'Ping' }] })
        });

        console.log(`   Status: ${chat.status}`);
        if (!chat.ok) {
            console.log(`   Error: ${await chat.text()}`);
        } else {
            console.log("   Success! Backend is reachable and working.");
        }
    } catch (e) {
        console.error("\n❌ CONNECTION FAILED:", e.message);
        console.log("Possible causes: Render is sleeping (free tier), Proxy issues, or URL is wrong.");
    }
}

testRender();
