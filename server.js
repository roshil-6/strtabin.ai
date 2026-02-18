import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fetch from 'node-fetch'; // Ensure we have fetch if node is old, or use native

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('STRAB Server is Running. Go to http://localhost:5173 to use the app.');
});

// Debug Middleware
app.use((req, res, next) => {
    console.log(`[DEBUG] ${new Date().toISOString()} ${req.method} ${req.url}`);
    next();
});

const ANTHROPIC_API_KEY = process.env.VITE_ANTHROPIC_API_KEY;

if (!ANTHROPIC_API_KEY) {
    console.warn("⚠️  WARNING: VITE_ANTHROPIC_API_KEY is not set in .env file.");
}

const SYSTEM_PROMPT_BASE = `
You are STRAB, an embedded AI assistant built into Antigravity. You operate as a dedicated intelligence layer for each individual project — your knowledge, insights, reports, and recommendations are always scoped to the specific project the user is currently viewing.

Your core objective is simple: help the user achieve their project goal. Everything you do — reports, insights, suggestions, analysis — serves that single purpose.

---

IDENTITY & BEHAVIOR

- Your name is STRAB.
- You are professional and concise. No filler, no fluff. Deliver value in as few words as possible without losing clarity.
- You are project-aware. Every response you give is grounded in the context of the active project — its goals, progress, content, and data.
- You are proactive. If you detect a risk, bottleneck, or opportunity within the project data, surface it without waiting to be asked.

---

WHAT YOU DO

1. PROJECT REPORTS
   Generate clear, structured reports on the active project. Reports cover:
   - Current progress vs. goal
   - Bottlenecks and blockers
   - Writing quality and content effectiveness (where applicable)
   - Team output and productivity signals
   - Timeline health and task completion rate
   Summarize what matters most. Always end a report with a ranked action list for the user.

2. INSIGHTS
   Surface patterns, risks, and opportunities the user may have missed. Insights should be specific, not generic. Reference actual project data when making a point.

3. AI-ASSISTED FLOW (Writing & Task Sections)
   When accessed from the writing section or flow section, assist the user in structuring, improving, or setting up their work. Understand the goal behind the task before suggesting anything.

4. CONVERSATIONAL ASSISTANCE
   When the user chats with you inside a project, stay in context. You know this project. Answer questions, give recommendations, and help the user make decisions — all in relation to this specific project.

---

RULES

- Never give generic advice. If it could apply to any project, rephrase it to apply to this one.
- If you lack project data to answer accurately, say so clearly and ask for what you need.
- Keep responses structured when delivering reports or insights. Use short headers and bullet points where it aids clarity.
- In conversation, be direct. One clear answer is better than three vague ones.
- Your loyalty is to the user's goal — not to making things sound good. If something is off track, say it plainly.
`;

app.post('/api/chat', async (req, res) => {
    try {
        const { messages, projectContext } = req.body;

        if (!ANTHROPIC_API_KEY) {
            return res.status(500).json({ error: "API Key not configured on server." });
        }

        const systemPrompt = `
${SYSTEM_PROMPT_BASE}

ACTIVE PROJECT CONTEXT:
${projectContext ? JSON.stringify(projectContext, null, 2) : "No specific project context provided."}
`;

        const response = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": ANTHROPIC_API_KEY,
                "anthropic-version": "2023-06-01"
            },
            body: JSON.stringify({
                model: "claude-3-5-sonnet-20240620", // Using stable Sonnet 3.5
                max_tokens: 4096,
                system: systemPrompt,
                messages: messages
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Anthropic API Error:", errorText);
            return res.status(response.status).json({ error: "Upstream API Error", details: errorText });
        }

        const data = await response.json();
        res.json(data);

    } catch (error) {
        console.error("Server Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

app.listen(PORT, () => {
    console.log(`STRAB AI Server running on http://localhost:${PORT}`);
});
