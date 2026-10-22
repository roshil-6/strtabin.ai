# Personal AI workflow

Dashboard → AI workspace opens `/ai`, an independent searchable project chooser. Selecting a project opens `/ai/:id`. Each project AI workspace also has an accessible project switcher and an All projects link. Project AI → Use my AI opens the current project directly.

Users select a provider, review a project capsule, and download a `.txt` file or copy its text. Full project capsule is the default; turn it off to choose individual sections. Provider links open an ordinary new tab; they contain no project data or credentials. The user signs in and attaches/pastes the package in the provider's own interface.

The full capsule includes the request, all stored project fields (including full code files, writing, board geometry/data/edges, tasks, goals, comments and saved reports), project-specific calendar events, calendar pins, linked timeline data, project diagrams, and project execution logs. It exports only context available in the current browser. Unrelated global calendars, chats and projects are excluded. Linked projects remain references rather than recursive exports. Binary data/blob resources are replaced with an omission notice; original images and uploaded documents require separate attachment. Selective briefs retain their previous opt-in code behavior.

Copy writes plain text, not a guaranteed clipboard file. Download produces the same content as the preview/copy and is the supported way to obtain a file for manual upload. Provider websites control how pasted text appears; there is no promised automatic file attachment on opening a provider link.

Users can paste a response or import `.md` / `.txt`, save it with a provider label, edit it, download it, and archive/restore it. Report saves have an in-session undo/redo. Reports persist under `CanvasData.externalAiReports`; the team save queue sends them through the existing authorized project-canvas endpoint. Deploy the updated workspace backend before relying on cross-device report sync. Older clients omitting this field preserve existing server reports, and older servers omitting it do not erase local reports on hydration.

Reports are capped at 30 per project and 40,000 characters each. The existing server-wide canvas size limit still applies. Markdown is rendered through the existing ReactMarkdown renderer without raw HTML.

This implementation does not connect personal accounts, embed provider chats, automatically attach project data, or call a model API. Built-in STRAB screens and the code debugger are hidden behind BUILT_IN_AI_ENABLED=false. Legacy STRAB project URLs redirect to personal AI. Live ChatGPT/Claude connectors need a separately hosted, authenticated MCP service, provider configuration, per-project authorization, and appropriate account availability; Gemini currently uses the manual attachment workflow here.
