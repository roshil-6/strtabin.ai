/**
 * Scans git-tracked source for accidental hardcoded API keys / secrets.
 * Run: node scripts/check-secrets.mjs  (or npm run security:check)
 */
import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { join } from 'path';

const EXCLUDE_FILES = /package-lock\.json$/;
/** Lines that look like documentation / placeholders — not reported */
const EXCLUDE_LINE =
    /YOUR_|PLACEHOLDER|REPLACEME|EXAMPLE|pk_live_YOUR|sk-ant-YOUR|xxxxxxxx|\.{3,}|example\.com\/|KEY_HERE/i;

const PATTERNS = [
    [/sk-ant-api\d{2}-[A-Za-z0-9_-]{15,}/, 'Possible Anthropic API key (sk-ant-...)'],
    [/\bAIza[0-9A-Za-z_-]{30,}/, 'Possible Google API key'],
    [/whsec_[0-9a-zA-Z]{10,}/, 'Possible webhook signing secret (whsec_)'],
    [/\bsk_live_[0-9a-zA-Z]{20,}/, 'Possible Stripe/Clerk live secret (sk_live_)'],
    [/\bsk_test_[0-9a-zA-Z]{20,}/, 'Possible Stripe test secret (sk_test_)'],
    [/\bpk_live_[0-9a-zA-Z]{20,}/, 'Possible publishable key embedded as secret (pk_live_)'],
];

function getTrackedFiles() {
    try {
        return execSync('git ls-files', { encoding: 'utf8', cwd: process.cwd() })
            .split(/\r?\n/)
            .filter(Boolean)
            .filter((f) => /\.(ts|tsx|js|jsx|mjs|cjs|json|md|dart|sql|yml|yaml|html)$/.test(f))
            .filter((f) => !EXCLUDE_FILES.test(f))
            .filter((f) => !f.startsWith('dist/'));
    } catch {
        console.error('Not a git repo or git unavailable — skipping file list.');
        return [];
    }
}

const findings = [];
for (const file of getTrackedFiles()) {
    let content;
    try {
        content = readFileSync(join(process.cwd(), file), 'utf8');
    } catch {
        continue;
    }
    const lines = content.split(/\r?\n/);
    lines.forEach((line, idx) => {
        if (EXCLUDE_LINE.test(line)) return;
        // Allow env var *names* without values: process.env.FOO
        if (/process\.env\.[A-Z0-9_]+\s*[,;)]?\s*$/.test(line.trim())) return;
        for (const [re, label] of PATTERNS) {
            if (re.test(line)) {
                findings.push({
                    file,
                    line: idx + 1,
                    label,
                    snippet: line.trim().slice(0, 100),
                });
            }
        }
    });
}

if (findings.length) {
    console.error('security:check FAILED — possible secret material in tracked files:\n');
    for (const f of findings) {
        console.error(`  ${f.file}:${f.line} — ${f.label}`);
        console.error(`    ${f.snippet}\n`);
    }
    process.exit(1);
}

console.log('security:check OK — no obvious hardcoded secrets in tracked source files.');
