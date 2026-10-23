import webpush from 'web-push';
const { generateVAPIDKeys } = webpush;
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const path = resolve('.env');
let text = existsSync(path) ? readFileSync(path, 'utf8') : '';
if (/^WEB_PUSH_(PUBLIC|PRIVATE)_KEY=\S+/m.test(text)) {
    console.log('Existing push keys were preserved. Copy the matching pair from .env to your backend environment.');
    process.exit(0);
}
const keys = generateVAPIDKeys();
for (const [name, value] of Object.entries({ WEB_PUSH_PUBLIC_KEY: keys.publicKey, WEB_PUSH_PRIVATE_KEY: keys.privateKey, WEB_PUSH_SUBJECT: 'https://stratabin.com' })) {
    if (new RegExp(`^${name}=`, 'm').test(text)) text = text.replace(new RegExp(`^${name}=.*$`, 'm'), `${name}=${value}`);
    else text += `\n${name}=${value}\n`;
}
writeFileSync(path, text, { mode: 0o600 });
console.log('Push keys saved in .env without printing secrets. Copy all three WEB_PUSH values to your backend environment. Keep the private key secret.');
